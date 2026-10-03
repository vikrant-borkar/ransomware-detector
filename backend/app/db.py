"""SQLite database layer for persistent user authentication and scan history."""

from __future__ import annotations

import hashlib
import json
import os
import secrets
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DB_PATH = Path(__file__).resolve().parent / "detector.db"


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def hash_password(password: str, salt: str | None = None) -> str:
    if salt is None:
        salt = secrets.token_hex(16)
    hashed = hashlib.sha256((salt + password).encode("utf-8")).hexdigest()
    return f"{salt}:{hashed}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt, _ = stored_hash.split(":", 1)
        expected = hash_password(password, salt)
        return secrets.compare_digest(expected, stored_hash)
    except Exception:
        return False


def init_db() -> None:
    """Initialize database tables and default accounts."""
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL COLLATE NOCASE,
                name TEXT NOT NULL,
                role TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS scan_history (
                id TEXT PRIMARY KEY,
                user_email TEXT NOT NULL COLLATE NOCASE,
                timestamp TEXT NOT NULL,
                file_name TEXT NOT NULL,
                source TEXT NOT NULL,
                calls_count INTEGER NOT NULL,
                label TEXT NOT NULL,
                alert INTEGER NOT NULL,
                score REAL NOT NULL,
                confidence REAL NOT NULL,
                early_call INTEGER,
                reasons_json TEXT,
                sequence_json TEXT,
                full_result_json TEXT
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_history_user_email ON scan_history(user_email)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_history_timestamp ON scan_history(timestamp DESC)")

        # Ensure default test users exist
        default_users = [
            ("usr_analyst", "abc@example.com", "Ramesh Kumar", "Security Analyst", "password123"),
            ("usr_lead", "group5@ghrce.edu", "Group 5 Lead", "SOC Operator", "password123"),
        ]
        for uid, email, name, role, pwd in default_users:
            cur = conn.execute("SELECT id FROM users WHERE email = ?", (email,))
            if not cur.fetchone():
                now = datetime.now(timezone.utc).isoformat()
                p_hash = hash_password(pwd)
                conn.execute(
                    "INSERT INTO users (id, email, name, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                    (uid, email, name, role, p_hash, now),
                )
        conn.commit()


# Auto-initialize database schema on load
init_db()



# User Auth operations
def create_user(email: str, password: str, name: str, role: str) -> dict[str, Any]:
    email = email.strip().lower()
    name = name.strip() or email.split("@")[0].capitalize()
    role = role.strip() or "Security Analyst"

    with get_connection() as conn:
        cur = conn.execute("SELECT id FROM users WHERE email = ?", (email,))
        if cur.fetchone():
            raise ValueError("An account with this email address already exists.")

        user_id = f"usr_{secrets.token_hex(6)}"
        p_hash = hash_password(password)
        now = datetime.now(timezone.utc).isoformat()

        conn.execute(
            "INSERT INTO users (id, email, name, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (user_id, email, name, role, p_hash, now),
        )
        conn.commit()

        return {
            "id": user_id,
            "email": email,
            "name": name,
            "role": role,
            "avatar": name[:2].upper(),
            "token": f"token_{secrets.token_hex(16)}",
        }


def authenticate_user(email: str, password: str) -> dict[str, Any]:
    email = email.strip().lower()
    with get_connection() as conn:
        cur = conn.execute("SELECT id, email, name, role, password_hash FROM users WHERE email = ?", (email,))
        row = cur.fetchone()
        if not row:
            raise ValueError("No account found with this email. Please create an account first.")

        if not verify_password(password, row["password_hash"]):
            raise ValueError("Incorrect password. Please verify and try again.")

        return {
            "id": row["id"],
            "email": row["email"],
            "name": row["name"],
            "role": row["role"],
            "avatar": row["name"][:2].upper(),
            "token": f"token_{secrets.token_hex(16)}",
        }


def get_user_by_email(email: str) -> dict[str, Any] | None:
    email = email.strip().lower()
    with get_connection() as conn:
        cur = conn.execute("SELECT id, email, name, role FROM users WHERE email = ?", (email,))
        row = cur.fetchone()
        if not row:
            return None
        return {
            "id": row["id"],
            "email": row["email"],
            "name": row["name"],
            "role": row["role"],
            "avatar": row["name"][:2].upper(),
        }


# History operations
def get_user_history(user_email: str) -> list[dict[str, Any]]:
    if not user_email:
        return []
    user_email = user_email.strip().lower()
    with get_connection() as conn:
        cur = conn.execute(
            """
            SELECT id, user_email, timestamp, file_name, source, calls_count,
                   label, alert, score, confidence, early_call,
                   reasons_json, sequence_json, full_result_json
            FROM scan_history
            WHERE user_email = ?
            ORDER BY timestamp DESC
            LIMIT 500
            """,
            (user_email,),
        )
        rows = cur.fetchall()
        results = []
        for r in rows:
            reasons = json.loads(r["reasons_json"]) if r["reasons_json"] else []
            sequence = json.loads(r["sequence_json"]) if r["sequence_json"] else None
            full_result = json.loads(r["full_result_json"]) if r["full_result_json"] else None
            results.append({
                "id": r["id"],
                "userEmail": r["user_email"],
                "timestamp": r["timestamp"],
                "fileName": r["file_name"],
                "source": r["source"],
                "callsCount": r["calls_count"],
                "label": r["label"],
                "alert": bool(r["alert"]),
                "score": r["score"],
                "confidence": r["confidence"],
                "earlyCall": r["early_call"],
                "reasons": reasons,
                "sequence": sequence,
                "fullResult": full_result,
            })
        return results


def save_user_scan(record: dict[str, Any]) -> dict[str, Any]:
    user_email = (record.get("userEmail") or "").strip().lower()
    if not user_email:
        raise ValueError("userEmail is required to persist scan record.")

    scan_id = record.get("id") or f"scan_{int(datetime.now(timezone.utc).timestamp() * 1000)}_{secrets.token_hex(4)}"
    timestamp = record.get("timestamp") or datetime.now(timezone.utc).isoformat()
    file_name = record.get("fileName") or "Uploaded Trace"
    source = record.get("source") or file_name
    calls_count = int(record.get("callsCount") or 0)
    label = record.get("label") or "benign"
    alert = 1 if record.get("alert") else 0
    score = float(record.get("score") or 0.0)
    confidence = float(record.get("confidence") or 0.0)
    early_call = record.get("earlyCall")
    if early_call is not None:
        early_call = int(early_call)

    reasons_json = json.dumps(record.get("reasons") or [])
    sequence_json = json.dumps(record.get("sequence")) if record.get("sequence") is not None else None
    full_result_json = json.dumps(record.get("fullResult")) if record.get("fullResult") is not None else None

    with get_connection() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO scan_history (
                id, user_email, timestamp, file_name, source, calls_count,
                label, alert, score, confidence, early_call,
                reasons_json, sequence_json, full_result_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                scan_id,
                user_email,
                timestamp,
                file_name,
                source,
                calls_count,
                label,
                alert,
                score,
                confidence,
                early_call,
                reasons_json,
                sequence_json,
                full_result_json,
            ),
        )
        conn.commit()

    return {
        "id": scan_id,
        "userEmail": user_email,
        "timestamp": timestamp,
        "fileName": file_name,
        "source": source,
        "callsCount": calls_count,
        "label": label,
        "alert": bool(alert),
        "score": score,
        "confidence": confidence,
        "earlyCall": early_call,
        "reasons": record.get("reasons") or [],
        "sequence": record.get("sequence"),
        "fullResult": record.get("fullResult"),
    }


def delete_user_scan(scan_id: str, user_email: str) -> bool:
    user_email = user_email.strip().lower()
    with get_connection() as conn:
        cur = conn.execute(
            "DELETE FROM scan_history WHERE id = ? AND user_email = ?",
            (scan_id, user_email),
        )
        conn.commit()
        return cur.rowcount > 0


def clear_user_scans(user_email: str) -> int:
    user_email = user_email.strip().lower()
    with get_connection() as conn:
        cur = conn.execute(
            "DELETE FROM scan_history WHERE user_email = ?",
            (user_email,),
        )
        conn.commit()
        return cur.rowcount
