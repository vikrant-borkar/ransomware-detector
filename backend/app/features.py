"""Fixed-length behavior features from a system-call sequence.

The vector mixes ideas from the survey in the group report:
n-gram rates and transition structure, file-modification ratios, and the
write / rename / delete cycle described in the methodology.
"""

from __future__ import annotations

import math

import numpy as np

from app.vocab import WRITE_LIKE

READ_LIKE = {"read", "pread"}

UNIGRAMS = [
    "open",
    "read",
    "write",
    "close",
    "stat",
    "getdents",
    "rename",
    "unlink",
    "fsync",
    "pwrite",
    "writev",
    "link",
    "execve",
    "lseek",
    "mmap",
]

BIGRAMS = [
    ("write", "rename"),
    ("write", "unlink"),
    ("rename", "unlink"),
    ("read", "write"),
    ("getdents", "open"),
    ("write", "fsync"),
    ("write", "write"),
    ("open", "read"),
    ("link", "unlink"),
    ("pwrite", "rename"),
    ("writev", "link"),
    ("read", "writev"),
    ("writev", "unlink"),
    ("fsync", "rename"),
]

FEATURE_NAMES = (
    [f"rate_{name}" for name in UNIGRAMS]
    + [f"bigram_{a}_{b}" for a, b in BIGRAMS]
    + [
        "write_read_ratio",
        "modify_rate",
        "max_write_run",
        "call_entropy",
        "cycle_rate",
        "early_modify_rate",
    ]
)

FEATURE_COPY = {
    "rate_getdents": "Directory listing before file opens",
    "rate_rename": "Rename activity",
    "rate_unlink": "File deletion",
    "rate_write": "Write activity",
    "rate_writev": "Gathered writes",
    "rate_pwrite": "Positioned writes",
    "rate_fsync": "Forced flushes to disk",
    "rate_link": "Hard-link activity",
    "rate_execve": "Program launches",
    "rate_read": "Read activity",
    "bigram_write_rename": "Write followed immediately by rename",
    "bigram_write_unlink": "Write followed immediately by delete",
    "bigram_rename_unlink": "Rename followed immediately by delete",
    "bigram_getdents_open": "Directory listing followed by open",
    "bigram_write_fsync": "Write followed by a disk flush",
    "bigram_link_unlink": "Link followed by delete",
    "bigram_pwrite_rename": "Positioned write followed by rename",
    "bigram_writev_link": "Gathered write followed by a link",
    "bigram_writev_unlink": "Gathered write followed by delete",
    "bigram_fsync_rename": "Disk flush followed by rename",
    "bigram_read_write": "Read followed by write",
    "bigram_write_write": "Back-to-back writes",
    "bigram_open_read": "Open followed by read",
    "write_read_ratio": "Writes relative to reads",
    "modify_rate": "Share of calls that modify files",
    "max_write_run": "Longest uninterrupted write burst",
    "call_entropy": "How concentrated the call mix is",
    "cycle_rate": "Windows that contain write, rename, and delete together",
    "early_modify_rate": "Modification rate in the first third of the window",
}


def _cycle_rate(seq: list[str]) -> float:
    if len(seq) < 8:
        return 0.0
    hits = 0
    total = len(seq) - 7
    for i in range(total):
        window = seq[i : i + 8]
        has_write = any(call in WRITE_LIKE for call in window)
        if has_write and "rename" in window and "unlink" in window:
            hits += 1
    return hits / total


def _max_write_run(seq: list[str]) -> float:
    longest = 0
    current = 0
    for call in seq:
        if call in WRITE_LIKE:
            current += 1
            longest = max(longest, current)
        else:
            current = 0
    return longest / max(len(seq), 1)


def _entropy(seq: list[str]) -> float:
    if not seq:
        return 0.0
    counts: dict[str, int] = {}
    for call in seq:
        counts[call] = counts.get(call, 0) + 1
    total = float(len(seq))
    entropy = 0.0
    for count in counts.values():
        p = count / total
        entropy -= p * math.log(p + 1e-12)
    return entropy / math.log(len(UNIGRAMS) + 1)


def vectorize(seq: list[str]) -> np.ndarray:
    length = max(len(seq), 1)
    counts = {name: 0 for name in UNIGRAMS}
    for call in seq:
        if call in counts:
            counts[call] += 1

    bigram_counts = {pair: 0 for pair in BIGRAMS}
    for left, right in zip(seq, seq[1:]):
        pair = (left, right)
        if pair in bigram_counts:
            bigram_counts[pair] += 1
    transitions = max(len(seq) - 1, 1)

    writes = sum(1 for call in seq if call in WRITE_LIKE)
    reads = sum(1 for call in seq if call in READ_LIKE)
    modifies = writes + counts["rename"] + counts["unlink"] + counts["link"]
    head = seq[: max(1, length // 3)]
    head_modifies = sum(1 for call in head if call in WRITE_LIKE or call in {"rename", "unlink", "link"})

    values = [counts[name] / length for name in UNIGRAMS]
    values += [bigram_counts[pair] / transitions for pair in BIGRAMS]
    values += [
        writes / (reads + 1.0),
        modifies / length,
        _max_write_run(seq),
        _entropy(seq),
        _cycle_rate(seq),
        head_modifies / max(len(head), 1),
    ]
    return np.asarray(values, dtype=np.float64)


def matrix(sequences: list[list[str]]) -> np.ndarray:
    return np.vstack([vectorize(seq) for seq in sequences])
