"""Moderation decision API endpoints."""
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query
from typing import Annotated

from app.models.moderation import (
    ModerationDecision,
    ModerationDecisionResponse,
    ModerationAction,
    ModerationStatus,
    PolicyCategory,
)
from app.models.audit import AuditLogEntry, AuditActionType, AuditActor
from app.core.storage import decisions_store, audit_store
from app.api.websocket import broadcast_moderation_decision, broadcast_audit_entry

router = APIRouter()


@router.get("/decisions", response_model=list[ModerationDecisionResponse])
async def list_decisions(
    room_id: str | None = None,
    participant_id: str | None = None,
    classification: PolicyCategory | None = None,
    action: ModerationAction | None = None,
    status: ModerationStatus | None = None,
    min_confidence: Annotated[float | None, Query(ge=0.0, le=1.0)] = None,
    max_confidence: Annotated[float | None, Query(ge=0.0, le=1.0)] = None,
    limit: int = 50,
    offset: int = 0,
):
    """
    List moderation decisions with optional filtering.

    Query parameters:
    - room_id: Filter by room
    - participant_id: Filter by participant
    - classification: Filter by policy category
    - action: Filter by action taken
    - status: Filter by decision status
    - min_confidence: Minimum confidence score
    - max_confidence: Maximum confidence score
    - limit: Maximum number of decisions (default 50)
    - offset: Number to skip for pagination
    """
    decisions = await decisions_store.get_all()

    # Apply filters
    if room_id:
        decisions = [d for d in decisions if d.room_id == room_id]
    if participant_id:
        decisions = [d for d in decisions if d.participant_id == participant_id]
    if classification:
        decisions = [d for d in decisions if d.classification == classification]
    if action:
        decisions = [d for d in decisions if d.action == action]
    if status:
        decisions = [d for d in decisions if d.status == status]
    if min_confidence is not None:
        decisions = [d for d in decisions if d.confidence_score >= min_confidence]
    if max_confidence is not None:
        decisions = [d for d in decisions if d.confidence_score <= max_confidence]

    # Sort by timestamp (newest first)
    decisions.sort(key=lambda d: d.timestamp, reverse=True)

    # Apply pagination
    paginated = decisions[offset:offset + limit]

    return [ModerationDecisionResponse.model_validate(d.model_dump()) for d in paginated]


@router.get("/decisions/stats")
async def get_decision_stats():
    """
    Get aggregate statistics for moderation decisions.
    """
    decisions = await decisions_store.get_all()

    # Count by action
    action_counts = {}
    for action in ModerationAction:
        action_counts[action.value] = len([d for d in decisions if d.action == action])

    # Count by classification
    classification_counts = {}
    for category in PolicyCategory:
        classification_counts[category.value] = len(
            [d for d in decisions if d.classification == category]
        )

    # Count by status
    status_counts = {}
    for status in ModerationStatus:
        status_counts[status.value] = len([d for d in decisions if d.status == status])

    # Calculate average confidence
    confidences = [d.confidence_score for d in decisions if d.confidence_score > 0]
    avg_confidence = sum(confidences) / len(confidences) if confidences else 0

    return {
        "total_decisions": len(decisions),
        "by_action": action_counts,
        "by_classification": classification_counts,
        "by_status": status_counts,
        "average_confidence": round(avg_confidence, 3),
    }


@router.get("/decisions/{decision_id}", response_model=ModerationDecisionResponse)
async def get_decision(decision_id: str):
    """
    Get details for a specific moderation decision.
    """
    decision = await decisions_store.get(decision_id)

    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")

    return ModerationDecisionResponse.model_validate(decision.model_dump())


@router.post("/decisions/{decision_id}/review")
async def review_decision(decision_id: str, approved: bool, notes: str | None = None):
    """
    Mark a decision as reviewed (for FLAG_FOR_REVIEW decisions).

    Path parameters:
    - decision_id: The decision to review

    Body parameters:
    - approved: Whether the AI decision was correct
    - notes: Optional notes from reviewer
    """
    decision = await decisions_store.get(decision_id)

    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")

    # Update status
    decision.status = ModerationStatus.REVIEWED
    await decisions_store.set(decision_id, decision)

    # Create audit entry
    audit_entry = AuditLogEntry(
        decision_id=decision_id,
        action_type=AuditActionType.DECISION_REVIEWED,
        actor=AuditActor.ADMIN,
        reason=f"Decision reviewed: {'approved' if approved else 'rejected'}. {notes or ''}",
        metadata={
            "approved": approved,
            "notes": notes,
            "decision_classification": decision.classification.value,
            "decision_action": decision.action.value,
        }
    )
    await audit_store.append(audit_entry)
    await broadcast_audit_entry(audit_entry.model_dump(mode="json"))

    await broadcast_moderation_decision(decision.model_dump(mode="json"))

    return {
        "status": "success",
        "decision_id": decision_id,
        "new_status": decision.status.value,
    }


@router.post("/decisions/{decision_id}/overturn")
async def overturn_decision(decision_id: str, reason: str):
    """
    Overturn a moderation decision.

    Path parameters:
    - decision_id: The decision to overturn

    Body parameters:
    - reason: Required reason for overturning
    """
    decision = await decisions_store.get(decision_id)

    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")

    if decision.status == ModerationStatus.OVERTURNED:
        raise HTTPException(status_code=400, detail="Decision already overturned")

    # Update status
    old_action = decision.action
    decision.status = ModerationStatus.OVERTURNED
    await decisions_store.set(decision_id, decision)

    # Create audit entry
    audit_entry = AuditLogEntry(
        decision_id=decision_id,
        action_type=AuditActionType.DECISION_OVERTURNED,
        actor=AuditActor.ADMIN,
        reason=reason,
        metadata={
            "original_action": old_action.value,
            "original_classification": decision.classification.value,
            "original_confidence": decision.confidence_score,
        }
    )
    await audit_store.append(audit_entry)
    await broadcast_audit_entry(audit_entry.model_dump(mode="json"))

    await broadcast_moderation_decision(decision.model_dump(mode="json"))

    return {
        "status": "success",
        "decision_id": decision_id,
        "new_status": decision.status.value,
    }
