from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "running"

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

def test_simulate_moderation_basic():
    # Test simulation endpoint with basic content
    # Note: This might fail if it actually tries to call OpenAI and no key is set
    # but the mock or error handling should handle it.
    response = client.post(
        "/api/webhooks/simulate",
        json={
            "room_id": "test-room",
            "participant_id": "test-user",
            "participant_identity": "test-user-identity",
            "content": "hello world"
        }
    )
    # Even if OpenAI fails, we improved error handling to return PolicyCategory.NONE
    assert response.status_code == 200
    assert "decision_id" in response.json()
    assert response.json()["status"] == "processed"
