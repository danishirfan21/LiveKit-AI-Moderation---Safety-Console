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

def test_simulate_multiple_participants_count():
    # Test that participant count increments correctly in simulation
    room_id = "count-test-room"

    # 1. First participant
    client.post(
        "/api/webhooks/simulate",
        json={
            "room_id": room_id,
            "participant_id": "user-1",
            "participant_identity": "user-1",
            "content": "hello"
        }
    )

    response = client.get(f"/api/rooms/{room_id}")
    assert response.status_code == 200
    assert response.json()["participant_count"] == 1

    # 2. Second participant
    client.post(
        "/api/webhooks/simulate",
        json={
            "room_id": room_id,
            "participant_id": "user-2",
            "participant_identity": "user-2",
            "content": "hi"
        }
    )

    response = client.get(f"/api/rooms/{room_id}")
    assert response.json()["participant_count"] == 2

    # 3. Same participant again (should NOT increment)
    client.post(
        "/api/webhooks/simulate",
        json={
            "room_id": room_id,
            "participant_id": "user-1",
            "participant_identity": "user-1",
            "content": "hello again"
        }
    )

    response = client.get(f"/api/rooms/{room_id}")
    assert response.json()["participant_count"] == 2