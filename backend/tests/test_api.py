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
