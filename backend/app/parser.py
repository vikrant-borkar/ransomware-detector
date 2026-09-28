"""Turn pasted text or a strace log into a normalized call sequence."""

from __future__ import annotations

import re

from app.vocab import normalize

SYSCALL_RE = re.compile(r"^(?:\d+\s+)?([A-Za-z_][A-Za-z0-9_]*)\(")
PATH_RE = re.compile(r'"((?:\\.|[^"\\])*)"')
FD_RE = re.compile(r"\((\d+)\b")
RESULT_FD_RE = re.compile(r"=\s+(\d+)\s*$")

SYSTEM_MARKERS = (
    "/usr/",
    "/lib/",
    "/lib64/",
    "/etc/",
    "/proc/",
    "/dev/",
    "/sys/",
    "/run/",
    "/bin/",
    "/sbin/",
    "site-packages",
    "python3.",
    "/pyvenv.cfg",
)


def is_system_path(path: str) -> bool:
    lowered = path.replace("\\", "/")
    return any(marker in lowered for marker in SYSTEM_MARKERS)


class FdState:
    def __init__(self) -> None:
        self.keep: set[int] = set()
        self.ignore: set[int] = set()


def _result_fd(line: str) -> int | None:
    match = RESULT_FD_RE.search(line.strip())
    if not match:
        return None
    return int(match.group(1))


def _arg_fd(line: str) -> int | None:
    match = FD_RE.search(line)
    if not match:
        return None
    return int(match.group(1))


def _first_path(line: str) -> str | None:
    match = PATH_RE.search(line)
    if not match:
        return None
    return match.group(1).replace('\\"', '"')


def parse_strace_lines(lines: list[str], state: FdState | None = None, sandbox_only: bool = False) -> list[str]:
    """Parse strace lines.

    When sandbox_only is set, file activity outside /tmp/brd-sandbox is dropped.
    That keeps interpreter startup noise out of a live demo workload.
    """
    fd_state = state or FdState()
    calls: list[str] = []
    for raw in lines:
        line = raw.strip()
        if not line or line.startswith("+++") or line.startswith("---") or line.startswith("strace:"):
            continue
        if "<unfinished" in line or "resumed>" in line:
            continue
        match = SYSCALL_RE.match(line)
        if not match:
            continue
        name = normalize(match.group(1))
        if not name:
            continue
        path = _first_path(line)
        failed = "= -1" in line
        result_fd = _result_fd(line)
        arg_fd = _arg_fd(line)

        if name == "open":
            system = path is not None and is_system_path(path)
            in_sandbox = path is not None and "/tmp/brd-sandbox/" in path
            if failed or system or (sandbox_only and not in_sandbox):
                if result_fd is not None and not failed:
                    fd_state.ignore.add(result_fd)
                    fd_state.keep.discard(result_fd)
                continue
            if result_fd is not None:
                fd_state.keep.add(result_fd)
                fd_state.ignore.discard(result_fd)
            calls.append("open")
            continue

        if name in {"read", "write", "pread", "pwrite", "writev", "fsync", "lseek", "close"}:
            if arg_fd in fd_state.ignore:
                if name == "close":
                    fd_state.ignore.discard(arg_fd)
                continue
            if sandbox_only and arg_fd not in fd_state.keep:
                continue
            if arg_fd in fd_state.keep or not sandbox_only:
                calls.append(name)
                if name == "close" and arg_fd is not None:
                    fd_state.keep.discard(arg_fd)
            continue

        if name == "getdents":
            if sandbox_only and arg_fd not in fd_state.keep:
                continue
            calls.append("getdents")
            continue

        if name in {"rename", "unlink", "link", "mkdir", "chmod", "stat", "access", "execve"}:
            if path and is_system_path(path):
                continue
            if sandbox_only and name != "stat":
                if not path or "/tmp/brd-sandbox/" not in path:
                    if name == "stat" or arg_fd not in fd_state.keep:
                        continue
            if sandbox_only and name == "stat":
                if path and "/tmp/brd-sandbox/" in path:
                    calls.append("stat")
                elif arg_fd in fd_state.keep:
                    calls.append("stat")
                continue
            if failed and name in {"rename", "unlink", "mkdir", "chmod", "execve"}:
                continue
            calls.append(name)
            continue

        if not sandbox_only:
            calls.append(name)
    return calls


STRACE_LINE_RE = re.compile(r"^(?:\d+\s+)?[A-Za-z_]\w*\(.*\)\s*=\s*(?:-?\d+|\?|0x[0-9a-f]+)")

CODE_PATTERNS = [
    (
        "getdents",
        r"\bos\.(?:listdir|scandir|walk)\s*\(|\bglob\.i?glob\s*\(|\.(?:iterdir|r?glob)\s*\("
        r"|\b(?:readdirSync|readdir|opendir|FindFirstFile\w*|FindNextFile\w*)\s*\("
        r"|\bDirectory\.(?:GetFiles|EnumerateFiles)\s*\(|\bFiles\.(?:list|walk)\s*\(",
    ),
    (
        "rename",
        r"\bos\.(?:rename|replace)\s*\(|\bshutil\.move\s*\(|\.rename\s*\(|\bfs\.(?:rename|renameSync)\s*\("
        r"|(?<![.\w])(?:rename|MoveFile\w*)\s*\(|\bFile\.Move\s*\(|\bFiles\.move\s*\(",
    ),
    (
        "unlink",
        r"\bos\.(?:remove|unlink)\s*\(|\bshutil\.rmtree\s*\(|\.unlink\s*\(|\bfs\.(?:unlink|unlinkSync|rm|rmSync)\s*\("
        r"|(?<![.\w])(?:unlink|remove|DeleteFile\w*)\s*\(|\bFile\.Delete\s*\(|\bFiles\.delete\w*\s*\(",
    ),
    (
        "open",
        r"(?<![.\w])(?:open|fopen|fopen_s|CreateFile\w*)\s*\(|\b(?:io|os|codecs)\.open\s*\("
        r"|\bfs\.(?:open|openSync|createReadStream|createWriteStream)\s*\("
        r"|\bFile\.Open\w*\s*\(|\bnew\s+File(?:Input|Output)Stream\s*\(|\bnew\s+FileStream\s*\(",
    ),
    (
        "write",
        r"\.(?:write|writelines|write_bytes|write_text)\s*\("
        r"|\b(?:fwrite|fputs|fprintf|WriteFile|writeFileSync|writeFile|appendFileSync)\s*\("
        r"|\bFile\.WriteAll\w*\s*\(|\bFiles\.write\w*\s*\(",
    ),
    (
        "read",
        r"\.(?:read|readline|readlines|read_bytes|read_text)\s*\("
        r"|\b(?:fread|fgets|ReadFile|readFileSync|readFile)\s*\("
        r"|\bFile\.ReadAll\w*\s*\(|\bFiles\.read\w*\s*\(",
    ),
    ("close", r"\.close\s*\(|\b(?:fclose|CloseHandle|closeSync)\s*\("),
    ("stat", r"\bos\.(?:stat|path\.exists|path\.isfile)\s*\(|\.(?:exists|is_file|stat)\s*\(|(?<![.\w])stat\s*\(|\bexistsSync\s*\("),
    ("execve", r"\bsubprocess\.\w+\s*\(|\bos\.(?:system|exec\w*|popen)\s*\(|\b(?:execve|execvp|CreateProcess\w*)\s*\("),
]

CODE_RE = re.compile("|".join(f"(?P<c{i}>{pattern})" for i, (_, pattern) in enumerate(CODE_PATTERNS)))
LOOP_RE = re.compile(r"\b(?:for|while|foreach|forEach)\b")
COMMENT_RE = re.compile(r"(?m)(?:^\s*(?:#|//).*$)|/\*[\s\S]*?\*/")


def parse_source_code(text: str) -> list[str]:
    """Read the file operations a program performs, in the order they appear.

    A `with open(...)` block closes the file after its first operation. The first
    loop's body is unrolled over three files, since it runs once per file.
    """
    body = COMMENT_RE.sub("", text)
    loop = LOOP_RE.search(body)
    loop_body = -1
    if loop:
        line_end = body.find("\n", loop.start())
        loop_body = len(body) if line_end == -1 else line_end
    prefix: list[str] = []
    looped: list[str] = []
    pending_close = False
    for match in CODE_RE.finditer(body):
        name = CODE_PATTERNS[int(match.lastgroup[1:])][0]
        target = looped if loop and match.start() > loop_body else prefix
        target.append(name)
        if name == "open":
            pending_close = bool(re.search(r"\bwith\s+$", body[max(0, match.start() - 12) : match.start()]))
        elif pending_close:
            target.append("close")
            pending_close = False
    return prefix + looped * 3


def _parse_call_list(text: str) -> tuple[list[str], int]:
    normalized_blob = text.replace("→", ",").replace("->", ",")
    chunks = re.split(r"[\n,;|]+", normalized_blob)
    calls: list[str] = []
    pieces = 0
    for chunk in chunks:
        piece = chunk.strip()
        if not piece:
            continue
        pieces += 1
        direct = normalize(piece)
        if direct:
            calls.append(direct)
            continue
        for token in piece.split():
            name = normalize(token)
            if name:
                calls.append(name)
    return calls, pieces


def parse_user_trace(text: str) -> list[str]:
    """Accept a call list, arrow notation, a strace excerpt, or program source code."""
    stripped = text.strip()
    if not stripped:
        return []
    lines = [line.strip() for line in stripped.splitlines() if line.strip()]
    strace_lines = sum(1 for line in lines if STRACE_LINE_RE.match(line))
    if strace_lines and strace_lines >= len(lines) / 2:
        return parse_strace_lines(lines, sandbox_only=False)

    calls, pieces = _parse_call_list(stripped)
    if calls and len(calls) >= 0.6 * pieces:
        return calls
    code_calls = parse_source_code(stripped)
    return code_calls if len(code_calls) > len(calls) else calls
