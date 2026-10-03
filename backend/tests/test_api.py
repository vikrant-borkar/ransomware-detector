from fastapi.testclient import TestClient

from app.main import app


def test_analyze_ordinary_trace_and_health():
    client = TestClient(app)
    health = client.get("/api/health")
    assert health.status_code == 200
    assert health.json()["ok"] is True

    response = client.post(
        "/api/analyze",
        json={"trace": "open, read, write, close, " * 8, "source": "api-test"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["result"]["label"] == "benign"

    ransom = client.post(
        "/api/analyze",
        json={
            "trace": "getdents, open, read, write, rename, unlink, close, " * 8,
            "source": "api-test",
        },
    )
    assert ransom.status_code == 200
    assert ransom.json()["result"]["label"] == "ransomware"
    alerts = client.get("/api/alerts")
    assert any(row["source"] == "api-test" for row in alerts.json()["alerts"])


def test_auth_and_history_persistence():
    client = TestClient(app)

    # 1. Login with seeded test user
    login_res = client.post("/api/auth/login", json={"email": "abc@example.com", "password": "password123"})
    assert login_res.status_code == 200
    user_data = login_res.json()["user"]
    assert user_data["email"] == "abc@example.com"
    assert user_data["role"] == "Security Analyst"

    # 2. Signup with a new test user
    import secrets
    unique_email = f"test_{secrets.token_hex(4)}@domain.com"
    signup_res = client.post(
        "/api/auth/signup",
        json={"email": unique_email, "password": "mypassword", "name": "Alice Tester", "role": "Threat Researcher"},
    )
    assert signup_res.status_code == 200
    created_user = signup_res.json()["user"]
    assert created_user["email"] == unique_email
    assert created_user["name"] == "Alice Tester"

    # 3. Login with newly created user
    login_new = client.post("/api/auth/login", json={"email": unique_email, "password": "mypassword"})
    assert login_new.status_code == 200

    # 4. Save scan record for this user
    save_res = client.post(
        "/api/history",
        json={
            "userEmail": unique_email,
            "fileName": "suspicious_payload.bin",
            "callsCount": 42,
            "label": "ransomware",
            "alert": True,
            "score": 0.95,
            "confidence": 0.98,
            "earlyCall": 12,
            "reasons": [{"name": "Rapid Renames", "detail": "Multiple renames in tight window", "value": 5.0, "lift": 3.2}],
        },
    )
    assert save_res.status_code == 200
    record_id = save_res.json()["record"]["id"]

    # 5. Fetch history for this user
    hist_res = client.get(f"/api/history?userEmail={unique_email}")
    assert hist_res.status_code == 200
    records = hist_res.json()["records"]
    assert len(records) == 1
    assert records[0]["id"] == record_id
    assert records[0]["fileName"] == "suspicious_payload.bin"

    # 6. Delete the scan record
    del_res = client.delete(f"/api/history/{record_id}?userEmail={unique_email}")
    assert del_res.status_code == 200

    # 7. Verify history is empty
    hist_after = client.get(f"/api/history?userEmail={unique_email}")
    assert len(hist_after.json()["records"]) == 0

