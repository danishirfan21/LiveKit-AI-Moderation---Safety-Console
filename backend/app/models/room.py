"""Room models for LiveKit rooms."""
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class RoomStatus(str, Enum):
    """Room status enumeration."""
    ACTIVE = "active"
    ENDED = "ended"


class Room(BaseModel):
    """LiveKit room model."""
    room_id: str = Field(..., description="Unique room identifier")
    room_name: str = Field(..., description="Human-readable room name")
    status: RoomStatus = Field(default=RoomStatus.ACTIVE, description="Room status")
    participant_count: int = Field(default=0, description="Current participant count")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: datetime | None = Field(default=None)
    metadata: dict | None = Field(default=None, description="Additional room metadata")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class RoomCreate(BaseModel):
    """Schema for creating a room."""
    room_id: str
    room_name: str
    metadata: dict | None = None


class RoomUpdate(BaseModel):
    """Schema for updating a room."""
    status: RoomStatus | None = None
    participant_count: int | None = None
    metadata: dict | None = None


class RoomResponse(BaseModel):
    """API response for room data."""
    room_id: str
    room_name: str
    status: RoomStatus
    participant_count: int
    created_at: datetime
    ended_at: datetime | None
    metadata: dict | None

    class Config:
        from_attributes = True
