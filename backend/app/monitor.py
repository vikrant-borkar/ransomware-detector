"""Live strace sessions and recorded-trace replay.

Live workloads are ordinary file activity launched by this console inside
/tmp/brd-sandbox. Ransomware-shaped traces are replayed as call names. Nothing
here encrypts a file.
"""

from __future__ import annotations

import os
import signal
import subprocess
import threading
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone

from app.dataset import demo_catalog
from app.engine import get_engine
from app.parser import FdState, parse_strace_lines

SANDBOX = "/tmp/brd-sandbox"

EDITOR_SCRIPT = r"""
import pathlib, time
root = pathlib.Path("/tmp/brd-sandbox/editor")
root.mkdir(parents=True, exist_ok=True)
for i in range(8):
    path = root / f"note_{i}.txt"
    path.write_text("Lab notes for the detection study. " * 6)
    body = path.read_text()
    path.write_text(body + "\nAddendum: reviewed.\n")
    time.sleep(0.22)
"""

BACKUP_SCRIPT = r"""
import pathlib, time
root = pathlib.Path("/tmp/brd-sandbox/backup")
docs = root / "docs"
docs.mkdir(parents=True, exist_ok=True)
for i in range(12):
    (docs / f"report_{i}.txt").write_text(("section %d " % i) * 24)
    time.sleep(0.12)
archive = root / "archive.bin"
with archive.open("wb") as handle:
    for path in sorted(docs.iterdir()):
        handle.write(path.read_bytes())
"""

LIVE_SCENARIOS = {
    "live-editor": {
        "title": "Live text editor",
        "kind": "benign",
        "mode": "live",
        "summary": "A text editor opens, reads, and writes notes. The monitor records those system calls.",
        "script": EDITOR_SCRIPT,
    },
    "live-backup": {
        "title": "Live backup job",
        "kind": "benign",
        "mode": "live",
        "summary": "Reads reports and writes them into one archive. Normal file activity.",
        "script": BACKUP_SCRIPT,
    },
}


@dataclass
class Session:
    id: str
    title: str
    kind: str
    mode: str
    summary: str
    full: list[str] = field(default_factory=list)
    sequence: list[str] = field(default_factory=list)
    status: str = "running"
    stage: str = "capture"
    lit: list[str] = field(default_factory=lambda: ["start", "monitor", "capture"])
    result: dict | None = None
    contained: bool = False
    message: str = "Capturing system calls."
    pid: int | None = None
    error: str | None = None
    stop_requested: bool = False
    alerted: bool = False
    lock: threading.Lock = field(default_factory=threading.Lock)


class AlertLog:
    def __init__(self) -> None:
        self._rows: list[dict] = []
        self._lock = threading.Lock()

    def add(self, row: dict) -> None:
        with self._lock:
            self._rows.insert(0, row)
            del self._rows[40:]

    def list(self) -> list[dict]:
        with self._lock:
            return list(self._rows)

    def clear(self) -> None:
        with self._lock:
            self._rows.clear()


ALERTS = AlertLog()
_SESSIONS: dict[str, Session] = {}
_SESSIONS_LOCK = threading.Lock()


def scenario_catalog() -> list[dict]:
    rows = []
    for key, spec in LIVE_SCENARIOS.items():
        rows.append(
            {
                "id": key,
                "title": spec["title"],
                "kind": spec["kind"],
                "mode": "live",
                "summary": spec["summary"],
            }
        )
    for demo in demo_catalog():
        rows.append(
            {
                "id": demo["id"],
                "title": demo["title"],
                "kind": demo["kind"],
                "mode": "replay",
                "summary": demo["summary"],
                "length": len(demo["sequence"]),
            }
        )
    return rows


def get_session(session_id: str) -> Session | None:
    with _SESSIONS_LOCK:
        return _SESSIONS.get(session_id)


def start_session(scenario_id: str) -> Session:
    if scenario_id in LIVE_SCENARIOS:
        spec = LIVE_SCENARIOS[scenario_id]
        session = Session(
            id=uuid.uuid4().hex[:12],
            title=spec["title"],
            kind=spec["kind"],
            mode="live",
            summary=spec["summary"],
        )
        with _SESSIONS_LOCK:
            _SESSIONS[session.id] = session
        threading.Thread(
            target=_live_worker, args=(session, spec["script"]), daemon=True
        ).start()
        return session

    demo = next((item for item in demo_catalog() if item["id"] == scenario_id), None)
    if demo is None:
        raise KeyError(scenario_id)
    session = Session(
        id=uuid.uuid4().hex[:12],
        title=demo["title"],
        kind=demo["kind"],
        mode="replay",
        summary=demo["summary"],
        full=list(demo["sequence"]),
    )
    with _SESSIONS_LOCK:
        _SESSIONS[session.id] = session
    threading.Thread(target=_replay_worker, args=(session,), daemon=True).start()
    return session


def stop_session(session_id: str) -> Session | None:
    session = get_session(session_id)
    if session is None:
        return None
    session.stop_requested = True
    return session


def public_view(session: Session) -> dict:
    with session.lock:
        result = session.result
        sequence = list(session.sequence)
        return {
            "id": session.id,
            "title": session.title,
            "kind": session.kind,
            "mode": session.mode,
            "summary": session.summary,
            "status": session.status,
            "stage": session.stage,
            "lit": list(session.lit),
            "sequence": sequence[-80:],
            "shown": min(80, len(sequence)),
            "cursor": len(sequence),
            "total": len(session.full) if session.mode == "replay" else len(sequence),
            "result": result,
            "contained": session.contained,
            "message": session.message,
            "pid": session.pid,
            "error": session.error,
        }


def _record_alert(session: Session) -> None:
    if session.alerted or not session.result or not session.result.get("alert"):
        return
    session.alerted = True
    result = session.result
    ALERTS.add(
        {
            "id": uuid.uuid4().hex[:12],
            "time": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "source": session.title,
            "mode": session.mode,
            "label": result["label"],
            "score": result["score"],
            "confidence": result["confidence"],
            "early_call": result.get("early_call"),
            "length": result["length"],
            "contained": session.contained,
            "summary": result["response"],
            "reasons": result.get("reasons", []),
        }
    )


def _apply_score(session: Session, sequence: list[str]) -> None:
    if len(sequence) < 8:
        session.stage = "sequence"
        session.lit = ["start", "monitor", "capture", "sequence"]
        session.message = f"Building the sequence · {len(sequence)} calls so far."
        return
    result = get_engine().score(sequence)
    session.result = result
    if result.get("alert"):
        session.stage = "alert"
        session.lit = ["start", "monitor", "capture", "sequence", "decision", "detect", "alert"]
        session.status = "alert"
        session.message = result["response"]
        _record_alert(session)
        return
    session.stage = "continue"
    session.lit = ["start", "monitor", "capture", "sequence", "decision", "continue"]
    session.status = "running"
    session.message = "Suspicious behavior? No. Monitoring continues."


def _replay_worker(session: Session) -> None:
    cursor = 0
    while cursor < len(session.full):
        if session.stop_requested:
            with session.lock:
                session.status = "stopped"
                session.contained = True
                session.stage = "stop"
                session.lit = ["start", "monitor", "capture", "sequence", "decision", "detect", "alert", "end"]
                session.message = "Operator stopped the monitored process."
                if session.alerted:
                    _mark_contained(session)
            return
        cursor = min(len(session.full), cursor + 8)
        with session.lock:
            session.sequence = session.full[:cursor]
            _apply_score(session, session.sequence)
            should_cut = session.result is not None and session.result.get("alert") and session.kind == "ransomware"
        if should_cut:
            time.sleep(1.15)
            with session.lock:
                session.contained = True
                session.status = "contained"
                session.stage = "stop"
                session.lit = ["start", "monitor", "capture", "sequence", "decision", "detect", "alert", "end"]
                early = session.result.get("early_call") if session.result else cursor
                session.message = (
                    f"Alert issued at call {early} of {len(session.full)}. "
                    "The remaining calls were cut off, which is the stop-process step in the flowchart."
                )
                _mark_contained(session)
            return
        time.sleep(0.32)

    with session.lock:
        if session.status == "running":
            session.status = "benign"
            session.stage = "done"
            session.lit = ["start", "monitor", "capture", "sequence", "decision", "continue"]
            session.message = "Trace finished without an alert. The process was left running."


def _mark_contained(session: Session) -> None:
    """Refresh the stored alert so the log shows that containment happened."""
    if not session.alerted:
        return
    with ALERTS._lock:
        for row in ALERTS._rows:
            if row["source"] == session.title and row["mode"] == session.mode and not row["contained"]:
                row["contained"] = True
                row["summary"] = session.message
                break


def _kill(proc: subprocess.Popen) -> None:
    if proc.poll() is not None:
        return
    try:
        os.killpg(proc.pid, signal.SIGTERM)
    except ProcessLookupError:
        return
    try:
        proc.wait(timeout=1.5)
    except subprocess.TimeoutExpired:
        try:
            os.killpg(proc.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass


def _read_new(path: str, offset: int, partial: str) -> tuple[list[str], int, str]:
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as handle:
            handle.seek(offset)
            chunk = handle.read()
            new_offset = handle.tell()
    except FileNotFoundError:
        return [], offset, partial
    if not chunk:
        return [], offset, partial
    blob = partial + chunk
    pieces = blob.splitlines(keepends=True)
    if pieces and not pieces[-1].endswith("\n"):
        partial = pieces[-1]
        pieces = pieces[:-1]
    else:
        partial = ""
    return pieces, new_offset, partial


def _live_worker(session: Session, script: str) -> None:
    os.makedirs(SANDBOX, exist_ok=True)
    log_path = os.path.join(SANDBOX, f"{session.id}.strace")
    try:
        proc = subprocess.Popen(
            [
                "strace",
                "-f",
                "-s",
                "80",
                "-e",
                "trace=file,desc",
                "-o",
                log_path,
                "python3",
                "-c",
                script,
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
        )
    except FileNotFoundError:
        with session.lock:
            session.status = "error"
            session.error = "strace is not installed, so live capture is unavailable."
            session.message = session.error
        return

    session.pid = proc.pid
    state = FdState()
    offset = 0
    partial = ""
    while True:
        if session.stop_requested:
            _kill(proc)
            with session.lock:
                session.contained = True
                session.status = "stopped"
                session.stage = "stop"
                session.lit = ["start", "monitor", "capture", "sequence", "decision", "alert", "end"]
                session.message = "Operator stopped the monitored process."
            return
        lines, offset, partial = _read_new(log_path, offset, partial)
        if lines:
            calls = parse_strace_lines(lines, state=state, sandbox_only=True)
            if calls:
                with session.lock:
                    session.sequence.extend(calls)
                    _apply_score(session, session.sequence)
        if proc.poll() is not None:
            time.sleep(0.15)
            lines, offset, partial = _read_new(log_path, offset, partial)
            if partial:
                lines = lines + [partial]
                partial = ""
            if lines:
                calls = parse_strace_lines(lines, state=state, sandbox_only=True)
                if calls:
                    with session.lock:
                        session.sequence.extend(calls)
                        _apply_score(session, session.sequence)
            with session.lock:
                if len(session.sequence) < 8:
                    session.status = "error"
                    session.error = "The workload finished before 8 file calls were captured."
                    session.message = session.error
                elif session.status == "running":
                    session.status = "benign"
                    session.stage = "done"
                    session.message = "Live process exited without an alert."
                elif session.status == "alert":
                    session.message = session.result["response"] if session.result else session.message
            return
        time.sleep(0.25)


def record_manual_alert(source: str, result: dict) -> None:
    if not result.get("alert"):
        return
    ALERTS.add(
        {
            "id": uuid.uuid4().hex[:12],
            "time": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "source": source,
            "mode": "analyze",
            "label": result["label"],
            "score": result["score"],
            "confidence": result["confidence"],
            "early_call": result.get("early_call"),
            "length": result["length"],
            "contained": False,
            "summary": result["response"],
            "reasons": result.get("reasons", []),
        }
    )
