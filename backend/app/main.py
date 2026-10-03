"""HTTP API for the behavioral ransomware detector."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.db import (
    authenticate_user,
    clear_user_scans,
    create_user,
    delete_user_scan,
    get_user_by_email,
    get_user_history,
    init_db,
    save_user_scan,
)
from app.engine import get_engine, samples_payload
from app.monitor import (
    ALERTS,
    get_session,
    public_view,
    record_manual_alert,
    scenario_catalog,
    start_session,
    stop_session,
)
from app.parser import parse_user_trace

META = {
    "title": "Behavioral ransomware detection",
    "subtitle": "System call sequence analysis",
    "objective": [
        "Develop an AI-based behavioral ransomware detection system.",
        "Monitor and analyze system-call sequences of running processes.",
        "Detect both known and unknown ransomware variants.",
        "Minimize data loss through early threat detection and alerts.",
    ],
    "scope": [
        "Real-time monitoring of application behavior.",
        "Train and evaluate machine-learning models for ransomware detection.",
        "Detect ransomware-like behavior before the call sequence completes.",
        "A foundation for later integration with endpoint security tools.",
    ],
    "benefits": [
        "Scores previously unseen call patterns instead of relying on a file signature.",
        "Uses the order of system calls, which signature antivirus does not see.",
        "Raises an alert while later calls in the trace can still be cut off.",
    ],
    "methodology": [
        {
            "step": 1,
            "title": "Monitor system calls",
            "detail": "Watch the file calls a running program makes: open, read, write, delete.",
        },
        {
            "step": 2,
            "title": "Create the sequence",
            "detail": "Keep those calls in order. Example: open, read, write, close.",
        },
        {
            "step": 3,
            "title": "Analyze the behavior",
            "detail": "Compare the sequence with ordinary file activity using n-grams, file-cycle rates, and the ensemble.",
        },
        {
            "step": 4,
            "title": "Detect ransomware",
            "detail": "Repeated writes, renames, and deletes across many files are treated as ransomware behavior.",
        },
        {
            "step": 5,
            "title": "Alert and stop",
            "detail": "Alert the operator and stop the monitored process so later writes in the trace do not continue.",
        },
    ],
    "layers": [
        {
            "name": "Collection",
            "module": "monitor.py · parser.py",
            "detail": "strace on a console-launched workload, or a pasted trace, or a recorded call sequence.",
        },
        {
            "name": "Sequence builder",
            "module": "vocab.py · parser.py",
            "detail": "Normalize names (openat becomes open) and cut the stream into sliding windows.",
        },
        {
            "name": "Behavior analysis",
            "module": "features.py · engine.py",
            "detail": "Unigrams, bigrams, write/read ratio, and write–rename–delete cycle rate.",
        },
        {
            "name": "Decision",
            "module": "engine.py",
            "detail": "Gradient boosting screens the window. Random forest, linear SVM, and a sequence MLP confirm it.",
        },
        {
            "name": "Response",
            "module": "monitor.py",
            "detail": "Alert log, and for a ransomware-shaped replay, stop consuming the rest of the sequence.",
        },
    ],
    "limits": [
        "Training traces are synthetic call sequences, not captured malware.",
        "The prototype does not include ransomware, encryption routines, or exploit code.",
        "Live capture follows only the benign workloads this console starts, inside /tmp/brd-sandbox.",
        "A production endpoint agent would still need a broader host dataset and a response policy.",
    ],
}


class AnalyzeRequest(BaseModel):
    trace: str | None = None
    sequence: list[str] | None = None
    source: str = Field(default="Pasted trace")


class MonitorRequest(BaseModel):
    scenario: str


class SignupRequest(BaseModel):
    email: str
    password: str
    name: str = ""
    role: str = "Security Analyst"


class LoginRequest(BaseModel):
    email: str
    password: str


class SaveHistoryRequest(BaseModel):
    id: str | None = None
    userEmail: str
    timestamp: str | None = None
    fileName: str
    source: str | None = None
    callsCount: int
    label: str
    alert: bool
    score: float
    confidence: float
    earlyCall: int | None = None
    reasons: list[dict] | None = None
    sequence: list[str] | None = None
    fullResult: dict | None = None


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    get_engine()
    yield


app = FastAPI(title="Behavioral ransomware detection", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
@app.get("/health")
@app.get("/api/health")
def health() -> dict:
    engine = get_engine()
    return {"ok": True, "status": "online", "version": engine.version}


@app.get("/api/meta")
def meta() -> dict:
    return META


@app.get("/api/metrics")
def metrics() -> dict:
    return get_engine().metrics


@app.get("/api/samples")
def samples() -> dict:
    return {"samples": samples_payload()}


@app.get("/api/scenarios")
def scenarios() -> dict:
    return {"scenarios": scenario_catalog()}


# --- Authentication Endpoints ---

@app.post("/api/auth/signup")
def auth_signup(body: SignupRequest) -> dict:
    if not body.email or "@" not in body.email:
        raise HTTPException(status_code=400, detail="Invalid email address.")
    if len(body.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters.")
    try:
        user = create_user(
            email=body.email,
            password=body.password,
            name=body.name,
            role=body.role,
        )
        return {"ok": True, "user": user}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None


@app.post("/api/auth/login")
def auth_login(body: LoginRequest) -> dict:
    if not body.email or "@" not in body.email:
        raise HTTPException(status_code=400, detail="Invalid email address.")
    if not body.password:
        raise HTTPException(status_code=400, detail="Password is required.")
    try:
        user = authenticate_user(email=body.email, password=body.password)
        return {"ok": True, "user": user}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None


@app.get("/api/auth/user")
def auth_get_user(email: str) -> dict:
    user = get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return {"ok": True, "user": user}


# --- Scan History Endpoints ---

@app.get("/api/history")
def get_history(userEmail: str) -> dict:
    if not userEmail:
        return {"records": []}
    records = get_user_history(userEmail)
    return {"records": records}


@app.post("/api/history")
def save_history(body: SaveHistoryRequest) -> dict:
    try:
        record = save_user_scan(body.model_dump())
        return {"ok": True, "record": record}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None


@app.delete("/api/history/{scan_id}")
def delete_history_item(scan_id: str, userEmail: str) -> dict:
    if not userEmail:
        raise HTTPException(status_code=400, detail="userEmail is required.")
    deleted = delete_user_scan(scan_id, userEmail)
    return {"ok": deleted}


@app.delete("/api/history")
def clear_history(userEmail: str) -> dict:
    if not userEmail:
        raise HTTPException(status_code=400, detail="userEmail is required.")
    count = clear_user_scans(userEmail)
    return {"ok": True, "deletedCount": count}


# --- Analyzer Endpoints ---

@app.post("/api/analyze")
def analyze(body: AnalyzeRequest) -> dict:
    if body.sequence:
        from app.vocab import normalize

        calls = [name for token in body.sequence if (name := normalize(token))]
    elif body.trace:
        calls = parse_user_trace(body.trace)
    else:
        raise HTTPException(status_code=400, detail="Provide a trace or a sequence.")
    if len(calls) > 5000:
        raise HTTPException(status_code=400, detail="Trace is longer than 5000 calls.")
    result = get_engine().score(calls)
    if not result.get("ok"):
        raise HTTPException(status_code=400, detail=result["error"])
    record_manual_alert(body.source, result)
    return {"sequence": calls, "result": result}


@app.get("/api/alerts")
def alerts() -> dict:
    return {"alerts": ALERTS.list()}


@app.delete("/api/alerts")
def clear_alerts() -> dict:
    ALERTS.clear()
    return {"ok": True}


@app.post("/api/monitor")
def monitor(body: MonitorRequest) -> dict:
    try:
        session = start_session(body.scenario)
    except KeyError:
        raise HTTPException(status_code=404, detail="Unknown scenario.") from None
    return public_view(session)


@app.get("/api/monitor/{session_id}")
def monitor_status(session_id: str) -> dict:
    session = get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    return public_view(session)


@app.post("/api/monitor/{session_id}/stop")
def monitor_stop(session_id: str) -> dict:
    session = stop_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    return public_view(session)
