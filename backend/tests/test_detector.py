"""Detector behavior against the methodology's own examples."""

from app.engine import get_engine
from app.parser import parse_strace_lines, parse_user_trace
from app.dataset import demo_catalog


def _score(sequence: list[str]) -> dict:
    return get_engine().score(sequence)


def test_editor_pattern_is_benign_and_crypto_loop_alerts():
    engine = get_engine()
    benign = _score((["open", "read", "write", "close"] * 8))
    ransom = _score((["getdents", "open", "read", "write", "rename", "unlink", "close"] * 8))
    assert benign["ok"] and benign["label"] == "benign"
    assert ransom["ok"] and ransom["label"] == "ransomware"
    assert ransom["score"] > benign["score"]
    assert engine.metrics["models"][-1]["id"] == "ensemble"
    assert engine.metrics["models"][-1]["f1"] > 0.85


def test_slow_start_alerts_before_the_trace_ends():
    demo = next(item for item in demo_catalog() if item["id"] == "slow-start")
    result = _score(demo["sequence"])
    assert result["label"] == "ransomware"
    assert result["early_call"] is not None
    assert result["early_call"] < len(demo["sequence"])


def test_unseen_family_is_not_a_signature_of_a_trained_loop():
    demo = next(item for item in demo_catalog() if item["id"] == "writev-swap")
    result = _score(demo["sequence"])
    assert result["label"] == "ransomware"
    assert get_engine().metrics["unseen"]["recall"] > 0.75


def test_demos_match_their_labels():
    for demo in demo_catalog():
        result = _score(demo["sequence"])
        assert result["label"] == demo["kind"], demo["id"]


def test_plain_language_and_arrow_traces_parse():
    calls = parse_user_trace("Open File → Read File → Write File → Close File")
    assert calls == ["open", "read", "write", "close"]
    repeated = parse_user_trace(", ".join(["Open File", "Read File", "Write File", "Rename File", "Delete File"] * 4))
    assert "unlink" in repeated and "rename" in repeated


def test_strace_keeps_sandbox_files_and_drops_loader_noise():
    lines = [
        'openat(AT_FDCWD, "/lib/x86_64-linux-gnu/libc.so.6", O_RDONLY) = 5',
        'openat(AT_FDCWD, "/tmp/brd-sandbox/editor/note_0.txt", O_WRONLY|O_CREAT) = 3',
        'write(3, "Lab notes", 9) = 9',
        'close(3) = 0',
        'write(1, "ignored stdout", 15) = 15',
        'unlinkat(AT_FDCWD, "/tmp/brd-sandbox/editor/note_0.txt", 0) = 0',
    ]
    calls = parse_strace_lines(lines, sandbox_only=True)
    assert calls == ["open", "write", "close", "unlink"]


def test_methodology_trace_round_trip():
    lines = [
        'openat(AT_FDCWD, "/tmp/brd-sandbox/editor/note.txt", O_RDWR) = 4',
        'read(4, "notes", 64) = 5',
        'write(4, "notes\\n", 6) = 6',
        "close(4) = 0",
    ] * 3
    calls = parse_strace_lines(lines, sandbox_only=True)
    assert calls[0:4] == ["open", "read", "write", "close"]
