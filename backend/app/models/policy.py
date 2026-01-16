"""Policy threshold models."""
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class PolicyCategory(str, Enum):
    """Content policy categories."""
    HARASSMENT = "harassment"
    HATE_SPEECH = "hate_speech"
    SPAM = "spam"
    VIOLENCE = "violence"
    ADULT_CONTENT = "adult_content"


class Policy(BaseModel):
    """Policy configuration model."""
    policy_id: str = Field(..., description="Unique policy identifier")
    name: str = Field(..., description="Human-readable policy name")
    category: PolicyCategory = Field(..., description="Policy category")
    description: str = Field(..., description="Policy description")
    warn_threshold: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Confidence threshold for warning"
    )
    mute_threshold: float = Field(
        default=0.7,
        ge=0.0,
        le=1.0,
        description="Confidence threshold for muting"
    )
    flag_threshold: float = Field(
        default=0.85,
        ge=0.0,
        le=1.0,
        description="Confidence threshold for flagging for review"
    )
    enabled: bool = Field(default=True, description="Whether policy is active")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class PolicyUpdate(BaseModel):
    """Schema for updating a policy."""
    name: str | None = None
    description: str | None = None
    warn_threshold: float | None = Field(default=None, ge=0.0, le=1.0)
    mute_threshold: float | None = Field(default=None, ge=0.0, le=1.0)
    flag_threshold: float | None = Field(default=None, ge=0.0, le=1.0)
    enabled: bool | None = None


class PolicyResponse(BaseModel):
    """API response for policy data."""
    policy_id: str
    name: str
    category: PolicyCategory
    description: str
    warn_threshold: float
    mute_threshold: float
    flag_threshold: float
    enabled: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
