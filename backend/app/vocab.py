"""System-call vocabulary shared by the collector, features, and models."""

from __future__ import annotations
CANON = [
    "open",
    "read",
    "write",
    "close",
    "stat",
    "lseek",
    "mmap",
    "brk",
    "fcntl",
    "getdents",
    "rename",
    "unlink",
    "mkdir",
    "execve",
    "fsync",
    "pwrite",
    "writev",
    "link",
    "dup",
    "access",
    "chmod",
    "pread",
    "wait",
    "clone",
    "pipe",
    "ioctl",
]

RAW_TO_CANON = {
    "open": "open",
    "openat": "open",
    "creat": "open",
    "read": "read",
    "readv": "read",
    "pread": "pread",
    "pread64": "pread",
    "write": "write",
    "writev": "writev",
    "pwritev": "writev",
    "pwritev2": "writev",
    "pwrite": "pwrite",
    "pwrite64": "pwrite",
    "close": "close",
    "stat": "stat",
    "fstat": "stat",
    "lstat": "stat",
    "newfstatat": "stat",
    "statx": "stat",
    "lseek": "lseek",
    "mmap": "mmap",
    "brk": "brk",
    "fcntl": "fcntl",
    "getdents": "getdents",
    "getdents64": "getdents",
    "rename": "rename",
    "renameat": "rename",
    "renameat2": "rename",
    "unlink": "unlink",
    "unlinkat": "unlink",
    "mkdir": "mkdir",
    "mkdirat": "mkdir",
    "execve": "execve",
    "execveat": "execve",
    "fsync": "fsync",
    "fdatasync": "fsync",
    "link": "link",
    "linkat": "link",
    "dup": "dup",
    "dup2": "dup",
    "dup3": "dup",
    "access": "access",
    "faccessat": "access",
    "faccessat2": "access",
    "chmod": "chmod",
    "fchmod": "chmod",
    "fchmodat": "chmod",
    "ioctl": "ioctl",
    "wait4": "wait",
    "waitpid": "wait",
    "clone": "clone",
    "clone3": "clone",
    "pipe": "pipe",
    "pipe2": "pipe",
}

PHRASES = {
    "open file": "open",
    "read file": "read",
    "write file": "write",
    "delete file": "unlink",
    "delete": "unlink",
    "close file": "close",
    "rename file": "rename",
    "list directory": "getdents",
    "list files": "getdents",
}

WRITE_LIKE = {"write", "pwrite", "writev"}


def normalize(token: str) -> str | None:
    raw = token.strip().lower()
    if not raw:
        return None
    phrase = PHRASES.get(raw)
    if phrase:
        return phrase
    compact = raw.replace(" ", "")
    return RAW_TO_CANON.get(compact)
