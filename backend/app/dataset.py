"""Synthetic behavioral traces.

These are sequences of system-call names only. They imitate the file-activity
shapes described in the methodology (ordinary programs versus repeated write,
rename, and delete). They are not ransomware and they do not touch files.
"""

from __future__ import annotations

import numpy as np

NOISE = ["brk", "mmap", "fcntl", "ioctl", "dup", "access", "stat", "close"]

BENIGN_FAMILIES = (
    "editor",
    "compiler",
    "service",
    "backup",
    "temp-cleanup",
    "installer",
    "sync-client",
)
RANSOM_FAMILIES = (
    "crypto-loop",
    "fsync-locker",
    "shadow-link",
    "slow-start",
    "low-and-slow",
)
UNSEEN_FAMILY = "writev-swap"


def render(
    rng: np.random.Generator,
    pattern: list[str],
    loops: int,
    noise: float = 0.1,
    prefix: list[str] | None = None,
) -> list[str]:
    calls: list[str] = list(prefix or [])
    for _ in range(loops):
        for call in pattern:
            calls.append(call)
            if rng.random() < noise:
                calls.append(str(rng.choice(NOISE)))
    return calls


def _editor(rng: np.random.Generator, loops: int | None = None, noise: float = 0.12) -> list[str]:
    n = int(loops if loops is not None else rng.integers(6, 14))
    return render(rng, ["open", "read", "read", "write", "close", "stat"], n, noise)


def _compiler(rng: np.random.Generator, loops: int | None = None, noise: float = 0.1) -> list[str]:
    n = int(loops if loops is not None else rng.integers(5, 12))
    return render(
        rng,
        ["stat", "open", "read", "read", "close", "open", "write", "close", "execve", "wait"],
        n,
        noise,
    )


def _service(rng: np.random.Generator, loops: int | None = None, noise: float = 0.1) -> list[str]:
    n = int(loops if loops is not None else rng.integers(8, 16))
    return render(rng, ["open", "read", "write", "close", "fcntl", "dup"], n, noise)


def _backup(rng: np.random.Generator, loops: int | None = None, noise: float = 0.08) -> list[str]:
    n = int(loops if loops is not None else rng.integers(6, 12))
    return render(rng, ["open", "read", "read", "read", "lseek", "write", "close"], n, noise)


def _temp_cleanup(rng: np.random.Generator, loops: int | None = None, noise: float = 0.08) -> list[str]:
    n = int(loops if loops is not None else rng.integers(6, 12))
    return render(
        rng,
        ["open", "write", "close", "unlink", "open", "read", "write", "close", "stat"],
        n,
        noise,
    )


def _installer(rng: np.random.Generator, loops: int | None = None, noise: float = 0.08) -> list[str]:
    n = int(loops if loops is not None else rng.integers(5, 10))
    calls = render(
        rng,
        ["open", "read", "read", "close", "execve", "wait", "stat", "mmap"],
        n,
        noise,
    )
    # A package install renames a few files. It does not cycle write/rename/delete.
    for _ in range(max(1, n // 4)):
        calls.extend(["open", "read", "rename", "close"])
    return calls


def _crypto_loop(rng: np.random.Generator, loops: int | None = None, noise: float = 0.08) -> list[str]:
    n = int(loops if loops is not None else rng.integers(7, 13))
    return render(
        rng,
        ["getdents", "open", "read", "write", "write", "rename", "unlink", "close"],
        n,
        noise,
    )


def _fsync_locker(rng: np.random.Generator, loops: int | None = None, noise: float = 0.08) -> list[str]:
    n = int(loops if loops is not None else rng.integers(7, 13))
    return render(
        rng,
        ["open", "read", "pwrite", "pwrite", "fsync", "rename", "unlink", "close"],
        n,
        noise,
    )


def _shadow(rng: np.random.Generator, loops: int | None = None, noise: float = 0.08) -> list[str]:
    n = int(loops if loops is not None else rng.integers(7, 13))
    return render(
        rng,
        ["stat", "open", "read", "write", "link", "unlink", "rename", "close"],
        n,
        noise,
    )


def _slow_start(rng: np.random.Generator) -> list[str]:
    head = _editor(rng, loops=int(rng.integers(4, 7)), noise=0.08)
    tail = _crypto_loop(rng, loops=int(rng.integers(6, 10)), noise=0.06)
    return head + tail


def _mixed_file_ops(rng: np.random.Generator, bad_prob: float) -> list[str]:
    """Shared shape for sync clients and diluted ransomware.

    bad_prob is the chance a loop is a write–rename–delete cycle. The two
    classes use different probabilities, so some traces overlap.
    """
    calls: list[str] = []
    for _ in range(int(rng.integers(8, 14))):
        if rng.random() < bad_prob:
            calls.extend(["open", "read", "write", "rename", "unlink", "close"])
        else:
            calls.extend(["open", "read", "read", "write", "close", "stat"])
        if rng.random() < 0.2:
            calls.append(str(rng.choice(NOISE)))
    return calls


def _sync_client(rng: np.random.Generator, loops: int | None = None, noise: float = 0.18) -> list[str]:
    """Benign sync. Occasional replace-and-delete, mostly ordinary reads and writes."""
    del loops, noise
    return _mixed_file_ops(rng, bad_prob=0.22)


def _low_and_slow(rng: np.random.Generator, loops: int | None = None, noise: float = 0.18) -> list[str]:
    """Ransomware-shaped activity diluted with ordinary reads, near the sync client."""
    del loops, noise
    return _mixed_file_ops(rng, bad_prob=0.62)


def _writev_swap(rng: np.random.Generator, loops: int | None = None, noise: float = 0.08) -> list[str]:
    n = int(loops if loops is not None else rng.integers(7, 13))
    return render(
        rng,
        ["getdents", "open", "read", "writev", "writev", "link", "unlink", "rename"],
        n,
        noise,
    )


BUILDERS = {
    "editor": _editor,
    "compiler": _compiler,
    "service": _service,
    "backup": _backup,
    "temp-cleanup": _temp_cleanup,
    "installer": _installer,
    "crypto-loop": _crypto_loop,
    "fsync-locker": _fsync_locker,
    "shadow-link": _shadow,
    "slow-start": _slow_start,
    "sync-client": _sync_client,
    "low-and-slow": _low_and_slow,
    "writev-swap": _writev_swap,
}


def generate_corpus(seed: int = 5) -> tuple[list[dict], list[dict]]:
    """Return (known samples, unseen-family samples)."""
    rng = np.random.default_rng(seed)
    known: list[dict] = []
    plan = {
        "editor": 130,
        "compiler": 130,
        "service": 120,
        "backup": 120,
        "temp-cleanup": 100,
        "installer": 80,
        "sync-client": 110,
        "crypto-loop": 140,
        "fsync-locker": 130,
        "shadow-link": 120,
        "slow-start": 120,
        "low-and-slow": 110,
    }
    for family, count in plan.items():
        label = 0 if family in BENIGN_FAMILIES else 1
        builder = BUILDERS[family]
        for _ in range(count):
            known.append({"sequence": builder(rng), "label": label, "family": family})

    unseen = [
        {"sequence": _writev_swap(rng), "label": 1, "family": UNSEEN_FAMILY}
        for _ in range(160)
    ]
    return known, unseen


def demo_catalog() -> list[dict]:
    """Fixed exemplars used by the console. Seeds are stable across runs."""
    specs = [
        {
            "id": "editor",
            "title": "Text editor",
            "kind": "benign",
            "family": "editor",
            "summary": "Opens a note, reads it, writes a short revision, and closes the file.",
            "sequence": _editor(np.random.default_rng(11), loops=8, noise=0.04),
        },
        {
            "id": "backup",
            "title": "Backup job",
            "kind": "benign",
            "family": "backup",
            "summary": "Reads many documents and appends them into a single archive write stream.",
            "sequence": _backup(np.random.default_rng(12), loops=8, noise=0.04),
        },
        {
            "id": "compiler",
            "title": "Compiler",
            "kind": "benign",
            "family": "compiler",
            "summary": "Reads sources, writes object files, and launches the next build step.",
            "sequence": _compiler(np.random.default_rng(13), loops=6, noise=0.04),
        },
        {
            "id": "crypto-loop",
            "title": "Repeated write and rename",
            "kind": "ransomware",
            "family": "crypto-loop",
            "summary": "Lists a directory, then repeats read, write, rename, and delete across many files.",
            "sequence": _crypto_loop(np.random.default_rng(21), loops=9, noise=0.04),
        },
        {
            "id": "slow-start",
            "title": "Slow-start locker",
            "kind": "ransomware",
            "family": "slow-start",
            "summary": "Begins like an editor, then switches to a write–rename–delete cycle.",
            "sequence": _editor(np.random.default_rng(31), loops=5, noise=0.02)
            + _crypto_loop(np.random.default_rng(32), loops=8, noise=0.03),
        },
        {
            "id": "writev-swap",
            "title": "Unseen ransomware",
            "kind": "ransomware",
            "family": UNSEEN_FAMILY,
            "summary": "A previously unseen pattern: writes, deletes, then renames.",
            "sequence": _writev_swap(np.random.default_rng(41), loops=9, noise=0.04),
        },
    ]
    return specs
