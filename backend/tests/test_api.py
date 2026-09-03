import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_textgrid_export_api():
    payload = {
        "min_timestamp": 0.0,
        "max_timestamp": 3.0,
        "tiers": [
            {
                "name": "phonemes",
                "tier_type": "interval",
                "min_timestamp": 0.0,
                "max_timestamp": 3.0,
                "entries": [
                    {"start": 0.5, "end": 1.5, "label": "a"}
                ]
            }
        ]
    }
    response = client.post("/api/textgrid/export", json=payload)
    assert response.status_code == 200
    assert "phonemes" in response.text
    assert '"a"' in response.text or 'a' in response.text
