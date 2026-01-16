"""LiveKit webhook handlers."""
from datetime import datetime
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

from app.models.room import Room, RoomStatus
from app.models.participant import Participant, ParticipantState
from app.models.moderation import ModerationInput, ContentType
from app.core.storage import rooms_store, participants_store
from app.moderation.pipeline import moderate_content
from app.api.websocket import (
    broadcast_room_update,
    broadcast_participant_update,
    broadcast_moderation_decision,
)

router = APIRouter()


class LiveKitWebhookEvent(BaseModel):
    """LiveKit webhook event payload."""
    event: str
    room: dict | None = None
    participant: dict | None = None
    track: dict | None = None
    egress_info: dict | None = None
    ingress_info: dict | None = None


class SimulatedContentEvent(BaseModel):
    """Simulated content event for testing moderation."""
    room_id: str
    participant_id: str
    participant_identity: str
    content: str
    content_type: str = "text"


@router.post("/livekit")
async def handle_livekit_webhook(
    event: LiveKitWebhookEvent,
    background_tasks: BackgroundTasks
):
    """
    Handle incoming LiveKit webhook events.

    Supported events:
    - room_started: New room created
    - room_finished: Room ended
    - participant_joined: Participant joined room
    - participant_left: Participant left room
    - track_published: Track published (audio/video)
    - track_unpublished: Track unpublished
    """
    event_type = event.event

    if event_type == "room_started":
        return await handle_room_started(event)
    elif event_type == "room_finished":
        return await handle_room_finished(event)
    elif event_type == "participant_joined":
        return await handle_participant_joined(event)
    elif event_type == "participant_left":
        return await handle_participant_left(event)
    elif event_type == "track_published":
        return await handle_track_published(event)
    elif event_type == "track_unpublished":
        return await handle_track_unpublished(event)
    else:
        return {"status": "ignored", "event": event_type}


async def handle_room_started(event: LiveKitWebhookEvent):
    """Handle room started event."""
    if not event.room:
        raise HTTPException(status_code=400, detail="Missing room data")

    room_data = event.room
    room = Room(
        room_id=room_data.get("sid", ""),
        room_name=room_data.get("name", ""),
        status=RoomStatus.ACTIVE,
        participant_count=0,
        metadata=room_data.get("metadata"),
    )

    await rooms_store.set(room.room_id, room)
    await broadcast_room_update(room.model_dump(mode="json"))

    return {"status": "processed", "event": "room_started", "room_id": room.room_id}


async def handle_room_finished(event: LiveKitWebhookEvent):
    """Handle room finished event."""
    if not event.room:
        raise HTTPException(status_code=400, detail="Missing room data")

    room_id = event.room.get("sid", "")
    room = await rooms_store.get(room_id)

    if room:
        room.status = RoomStatus.ENDED
        room.ended_at = datetime.utcnow()
        await rooms_store.set(room_id, room)
        await broadcast_room_update(room.model_dump(mode="json"))

    return {"status": "processed", "event": "room_finished", "room_id": room_id}


async def handle_participant_joined(event: LiveKitWebhookEvent):
    """Handle participant joined event."""
    if not event.participant or not event.room:
        raise HTTPException(status_code=400, detail="Missing participant or room data")

    participant_data = event.participant
    room_id = event.room.get("sid", "")

    participant = Participant(
        participant_id=participant_data.get("sid", ""),
        identity=participant_data.get("identity", ""),
        room_id=room_id,
        state=ParticipantState.JOINED,
        metadata=participant_data.get("metadata"),
    )

    await participants_store.set(participant.participant_id, participant)

    # Update room participant count
    room = await rooms_store.get(room_id)
    if room:
        room.participant_count += 1
        await rooms_store.set(room_id, room)
        await broadcast_room_update(room.model_dump(mode="json"))

    await broadcast_participant_update(participant.model_dump(mode="json"))

    return {
        "status": "processed",
        "event": "participant_joined",
        "participant_id": participant.participant_id
    }


async def handle_participant_left(event: LiveKitWebhookEvent):
    """Handle participant left event."""
    if not event.participant or not event.room:
        raise HTTPException(status_code=400, detail="Missing participant or room data")

    participant_id = event.participant.get("sid", "")
    room_id = event.room.get("sid", "")

    participant = await participants_store.get(participant_id)

    if participant:
        participant.state = ParticipantState.DISCONNECTED
        participant.leave_time = datetime.utcnow()
        await participants_store.set(participant_id, participant)
        await broadcast_participant_update(participant.model_dump(mode="json"))

    # Update room participant count
    room = await rooms_store.get(room_id)
    if room:
        room.participant_count = max(0, room.participant_count - 1)
        await rooms_store.set(room_id, room)
        await broadcast_room_update(room.model_dump(mode="json"))

    return {
        "status": "processed",
        "event": "participant_left",
        "participant_id": participant_id
    }


async def handle_track_published(event: LiveKitWebhookEvent):
    """Handle track published event."""
    if not event.participant:
        return {"status": "ignored", "event": "track_published"}

    participant_id = event.participant.get("sid", "")
    participant = await participants_store.get(participant_id)

    if participant:
        participant.is_publisher = True
        participant.state = ParticipantState.ACTIVE
        await participants_store.set(participant_id, participant)
        await broadcast_participant_update(participant.model_dump(mode="json"))

    return {
        "status": "processed",
        "event": "track_published",
        "participant_id": participant_id
    }


async def handle_track_unpublished(event: LiveKitWebhookEvent):
    """Handle track unpublished event."""
    # Track unpublished doesn't necessarily mean participant stopped publishing
    # Would need to check if they have other tracks
    return {"status": "processed", "event": "track_unpublished"}


@router.post("/simulate")
async def simulate_content_event(
    content_event: SimulatedContentEvent,
    background_tasks: BackgroundTasks
):
    """
    Simulate a content event for testing the moderation pipeline.

    This endpoint allows testing without a real LiveKit connection.
    """
    # Ensure room exists or create a test room
    room = await rooms_store.get(content_event.room_id)
    if not room:
        room = Room(
            room_id=content_event.room_id,
            room_name=f"Test Room {content_event.room_id[-6:]}",
            status=RoomStatus.ACTIVE,
            participant_count=1,
        )
        await rooms_store.set(room.room_id, room)
        await broadcast_room_update(room.model_dump(mode="json"))

    # Ensure participant exists or create a test participant
    participant = await participants_store.get(content_event.participant_id)
    if not participant:
        participant = Participant(
            participant_id=content_event.participant_id,
            identity=content_event.participant_identity,
            room_id=content_event.room_id,
            state=ParticipantState.ACTIVE,
        )
        await participants_store.set(participant.participant_id, participant)
        await broadcast_participant_update(participant.model_dump(mode="json"))

    # Create moderation input
    content_type_map = {
        "text": ContentType.TEXT,
        "audio_transcript": ContentType.AUDIO_TRANSCRIPT,
        "video_frame": ContentType.VIDEO_FRAME,
    }

    moderation_input = ModerationInput(
        room_id=content_event.room_id,
        participant_id=content_event.participant_id,
        participant_identity=content_event.participant_identity,
        content=content_event.content,
        content_type=content_type_map.get(content_event.content_type, ContentType.TEXT),
    )

    # Run moderation pipeline
    decision = await moderate_content(moderation_input)

    if decision:
        await broadcast_moderation_decision(decision.model_dump(mode="json"))

        return {
            "status": "processed",
            "decision_id": decision.decision_id,
            "classification": decision.classification.value,
            "confidence": decision.confidence_score,
            "action": decision.action.value,
        }
    else:
        return {"status": "error", "message": "Moderation pipeline failed"}
