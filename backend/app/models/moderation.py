"""Moderation decision models."""
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field
import uuid


class PolicyCategory(str, Enum):
    """Content policy categories."""
    HARASSMENT = "harassment"
    HATE_SPEECH = "hate_speech"
    SPAM = "spam"
    VIOLENCE = "violence"
    ADULT_CONTENT = "adult_content"
    NONE = "none"


class ModerationAction(str, Enum):
    """Actions that can be taken on content."""
    NONE = "none"
    WARN = "warn"
    MUTE = "mute"
    FLAG_FOR_REVIEW = "flag_for_review"


class ModerationStatus(str, Enum):
    """Status of a moderation decision."""
    PENDING = "pending"
    EXECUTED = "executed"
    REVIEWED = "reviewed"
    OVERTURNED = "overturned"


class ContentType(str, Enum):
    """Type of content being moderated."""
    TEXT = "text"
    AUDIO_TRANSCRIPT = "audio_transcript"
    VIDEO_FRAME = "video_frame"


class ModerationDecision(BaseModel):
    """Moderation decision model."""
    decision_id: str = Field(default_factory=lambda: f"dec-{uuid.uuid4().hex[:12]}")
    room_id: str = Field(..., description="Room where content originated")
    participant_id: str = Field(..., description="Participant who created content")
    participant_identity: str = Field(..., description="Participant identity/username")
    content: str = Field(..., description="Content that was moderated")
    content_type: ContentType = Field(default=ContentType.TEXT)
    classification: PolicyCategory = Field(..., description="Detected policy category")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Confidence score 0-1")
    action: ModerationAction = Field(..., description="Action taken")
    status: ModerationStatus = Field(default=ModerationStatus.PENDING)
    policy_id: str | None = Field(default=None, description="Policy that triggered the decision")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    reasoning: str | None = Field(default=None, description="AI reasoning for classification")
    metadata: dict | None = Field(default=None)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ModerationInput(BaseModel):
    """Input for moderation pipeline."""
    room_id: str
    participant_id: str
    participant_identity: str
    content: str
    content_type: ContentType = ContentType.TEXT
    metadata: dict | None = None


class ModerationDecisionResponse(BaseModel):
    """API response for moderation decision."""
    decision_id: str
    room_id: str
    participant_id: str
    participant_identity: str
    content: str
    content_type: ContentType
    classification: PolicyCategory
    confidence_score: float
    action: ModerationAction
    status: ModerationStatus
    policy_id: str | None
    timestamp: datetime
    reasoning: str | None
    metadata: dict | None

    class Config:
        from_attributes = True


class ModerationFilters(BaseModel):
    """Filters for querying moderation decisions."""
    room_id: str | None = None
    participant_id: str | None = None
    classification: PolicyCategory | None = None
    action: ModerationAction | None = None
    status: ModerationStatus | None = None
    min_confidence: float | None = None
    max_confidence: float | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
