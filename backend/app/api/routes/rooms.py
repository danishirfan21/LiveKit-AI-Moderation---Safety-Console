"""Room API endpoints."""
from fastapi import APIRouter, HTTPException

from app.models.room import Room, RoomResponse, RoomStatus
from app.models.participant import ParticipantResponse
from app.core.storage import rooms_store, participants_store

router = APIRouter()


@router.get("", response_model=list[RoomResponse])
async def list_rooms(
    status: RoomStatus | None = None,
    limit: int = 50,
    offset: int = 0
):
    """
    List all rooms with optional filtering.

    Query parameters:
    - status: Filter by room status (active/ended)
    - limit: Maximum number of rooms to return (default 50)
    - offset: Number of rooms to skip (for pagination)
    """
    rooms = await rooms_store.get_all()

    # Filter by status if provided
    if status:
        rooms = [r for r in rooms if r.status == status]

    # Sort by creation time (newest first)
    rooms.sort(key=lambda r: r.created_at, reverse=True)

    # Apply pagination
    paginated = rooms[offset:offset + limit]

    return [RoomResponse.model_validate(r.model_dump()) for r in paginated]


@router.get("/stats")
async def get_room_stats():
    """
    Get aggregate room statistics.

    Returns counts of active rooms, total participants, etc.
    """
    rooms = await rooms_store.get_all()
    participants = await participants_store.get_all()

    active_rooms = [r for r in rooms if r.status == RoomStatus.ACTIVE]
    active_participants = [p for p in participants if p.state.value in ["joined", "active"]]

    return {
        "total_rooms": len(rooms),
        "active_rooms": len(active_rooms),
        "ended_rooms": len(rooms) - len(active_rooms),
        "total_participants": len(participants),
        "active_participants": len(active_participants),
    }


@router.get("/{room_id}", response_model=RoomResponse)
async def get_room(room_id: str):
    """
    Get details for a specific room.

    Path parameters:
    - room_id: The unique room identifier
    """
    room = await rooms_store.get(room_id)

    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    return RoomResponse.model_validate(room.model_dump())


@router.get("/{room_id}/participants", response_model=list[ParticipantResponse])
async def get_room_participants(room_id: str):
    """
    Get all participants for a specific room.

    Path parameters:
    - room_id: The unique room identifier
    """
    room = await rooms_store.get(room_id)

    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    all_participants = await participants_store.get_all()
    room_participants = [p for p in all_participants if p.room_id == room_id]

    # Sort by join time (newest first)
    room_participants.sort(key=lambda p: p.join_time, reverse=True)

    return [ParticipantResponse.model_validate(p.model_dump()) for p in room_participants]


@router.delete("/{room_id}")
async def end_room(room_id: str):
    """
    End a room (mark as finished).

    This is a soft delete - the room data is preserved for auditing.

    Path parameters:
    - room_id: The unique room identifier
    """
    room = await rooms_store.get(room_id)

    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    if room.status == RoomStatus.ENDED:
        raise HTTPException(status_code=400, detail="Room already ended")

    from datetime import datetime
    room.status = RoomStatus.ENDED
    room.ended_at = datetime.utcnow()

    await rooms_store.set(room_id, room)

    from app.api.websocket import broadcast_room_update
    await broadcast_room_update(room.model_dump(mode="json"))

    return {"status": "success", "message": "Room ended", "room_id": room_id}
