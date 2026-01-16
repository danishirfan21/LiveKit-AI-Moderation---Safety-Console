"""Participant models for LiveKit room participants."""
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class ParticipantState(str, Enum):
    """Participant connection state."""
    JOINING = "joining"
    JOINED = "joined"
    ACTIVE = "active"
    DISCONNECTED = "disconnected"


class Participant(BaseModel):
    """LiveKit room participant model."""
    participant_id: str = Field(..., description="Unique participant identifier (SID)")
    identity: str = Field(..., description="Participant identity/username")
    room_id: str = Field(..., description="Room the participant is in")
    state: ParticipantState = Field(default=ParticipantState.JOINED)
    join_time: datetime = Field(default_factory=datetime.utcnow)
    leave_time: datetime | None = Field(default=None)
    metadata: dict | None = Field(default=None, description="Additional participant metadata")
    is_publisher: bool = Field(default=False, description="Whether participant is publishing media")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ParticipantCreate(BaseModel):
    """Schema for creating a participant."""
    participant_id: str
    identity: str
    room_id: str
    metadata: dict | None = None
    is_publisher: bool = False


class ParticipantUpdate(BaseModel):
    """Schema for updating a participant."""
    state: ParticipantState | None = None
    metadata: dict | None = None
    is_publisher: bool | None = None


class ParticipantResponse(BaseModel):
    """API response for participant data."""
    participant_id: str
    identity: str
    room_id: str
    state: ParticipantState
    join_time: datetime
    leave_time: datetime | None
    metadata: dict | None
    is_publisher: bool

    class Config:
        from_attributes = True
