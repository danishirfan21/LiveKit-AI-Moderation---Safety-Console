"""Audit log models."""
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field
import uuid


class AuditActionType(str, Enum):
    """Types of auditable actions."""
    DECISION_CREATED = "decision_created"
    ACTION_EXECUTED = "action_executed"
    POLICY_UPDATED = "policy_updated"
    DECISION_REVIEWED = "decision_reviewed"
    DECISION_OVERTURNED = "decision_overturned"
    PARTICIPANT_WARNED = "participant_warned"
    PARTICIPANT_MUTED = "participant_muted"
    CONTENT_FLAGGED = "content_flagged"


class AuditActor(str, Enum):
    """Actor types for audit entries."""
    SYSTEM = "system"
    AI = "ai"
    ADMIN = "admin"


class AuditLogEntry(BaseModel):
    """Audit log entry model."""
    audit_id: str = Field(default_factory=lambda: f"audit-{uuid.uuid4().hex[:12]}")
    decision_id: str | None = Field(default=None, description="Related decision ID if applicable")
    action_type: AuditActionType = Field(..., description="Type of action")
    actor: AuditActor = Field(..., description="Who performed the action")
    reason: str = Field(..., description="Reason for the action")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: dict | None = Field(default=None, description="Full decision context and details")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class AuditLogEntryCreate(BaseModel):
    """Schema for creating an audit log entry."""
    decision_id: str | None = None
    action_type: AuditActionType
    actor: AuditActor
    reason: str
    metadata: dict | None = None


class AuditLogResponse(BaseModel):
    """API response for audit log entry."""
    audit_id: str
    decision_id: str | None
    action_type: AuditActionType
    actor: AuditActor
    reason: str
    timestamp: datetime
    metadata: dict | None

    class Config:
        from_attributes = True


class AuditFilters(BaseModel):
    """Filters for querying audit logs."""
    decision_id: str | None = None
    action_type: AuditActionType | None = None
    actor: AuditActor | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
