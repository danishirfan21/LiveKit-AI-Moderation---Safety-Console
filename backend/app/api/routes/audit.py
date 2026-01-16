"""Audit log API endpoints."""
from datetime import datetime
from fastapi import APIRouter, Query
from typing import Annotated

from app.models.audit import AuditLogEntry, AuditLogResponse, AuditActionType, AuditActor
from app.core.storage import audit_store

router = APIRouter()


@router.get("", response_model=list[AuditLogResponse])
async def list_audit_logs(
    decision_id: str | None = None,
    action_type: AuditActionType | None = None,
    actor: AuditActor | None = None,
    start_time: datetime | None = None,
    end_time: datetime | None = None,
    limit: int = 50,
    offset: int = 0,
):
    """
    List audit log entries with optional filtering.

    Query parameters:
    - decision_id: Filter by related decision
    - action_type: Filter by action type
    - actor: Filter by actor (system/ai/admin)
    - start_time: Filter by start timestamp
    - end_time: Filter by end timestamp
    - limit: Maximum entries (default 50)
    - offset: Skip entries for pagination
    """
    entries = await audit_store.get_all()

    # Apply filters
    if decision_id:
        entries = [e for e in entries if e.decision_id == decision_id]
    if action_type:
        entries = [e for e in entries if e.action_type == action_type]
    if actor:
        entries = [e for e in entries if e.actor == actor]
    if start_time:
        entries = [e for e in entries if e.timestamp >= start_time]
    if end_time:
        entries = [e for e in entries if e.timestamp <= end_time]

    # Sort by timestamp (newest first)
    entries.sort(key=lambda e: e.timestamp, reverse=True)

    # Apply pagination
    paginated = entries[offset:offset + limit]

    return [AuditLogResponse.model_validate(e.model_dump()) for e in paginated]


@router.get("/stats")
async def get_audit_stats():
    """
    Get aggregate statistics for audit logs.
    """
    entries = await audit_store.get_all()

    # Count by action type
    action_counts = {}
    for action_type in AuditActionType:
        action_counts[action_type.value] = len(
            [e for e in entries if e.action_type == action_type]
        )

    # Count by actor
    actor_counts = {}
    for actor in AuditActor:
        actor_counts[actor.value] = len([e for e in entries if e.actor == actor])

    # Get time range
    if entries:
        timestamps = [e.timestamp for e in entries]
        oldest = min(timestamps)
        newest = max(timestamps)
    else:
        oldest = None
        newest = None

    return {
        "total_entries": len(entries),
        "by_action_type": action_counts,
        "by_actor": actor_counts,
        "oldest_entry": oldest.isoformat() if oldest else None,
        "newest_entry": newest.isoformat() if newest else None,
    }


@router.get("/export")
async def export_audit_logs(
    format: Annotated[str, Query(pattern="^(json|csv)$")] = "json",
    decision_id: str | None = None,
    action_type: AuditActionType | None = None,
    actor: AuditActor | None = None,
    start_time: datetime | None = None,
    end_time: datetime | None = None,
):
    """
    Export audit logs in JSON or CSV format.

    Query parameters:
    - format: Export format (json or csv)
    - (other filters same as list endpoint)
    """
    entries = await audit_store.get_all()

    # Apply filters
    if decision_id:
        entries = [e for e in entries if e.decision_id == decision_id]
    if action_type:
        entries = [e for e in entries if e.action_type == action_type]
    if actor:
        entries = [e for e in entries if e.actor == actor]
    if start_time:
        entries = [e for e in entries if e.timestamp >= start_time]
    if end_time:
        entries = [e for e in entries if e.timestamp <= end_time]

    # Sort by timestamp
    entries.sort(key=lambda e: e.timestamp, reverse=True)

    if format == "json":
        return {
            "format": "json",
            "count": len(entries),
            "entries": [e.model_dump(mode="json") for e in entries]
        }
    else:
        # CSV format
        import io
        import csv

        output = io.StringIO()
        writer = csv.writer(output)

        # Header
        writer.writerow([
            "audit_id", "decision_id", "action_type", "actor",
            "reason", "timestamp"
        ])

        # Rows
        for entry in entries:
            writer.writerow([
                entry.audit_id,
                entry.decision_id or "",
                entry.action_type.value,
                entry.actor.value,
                entry.reason,
                entry.timestamp.isoformat(),
            ])

        return {
            "format": "csv",
            "count": len(entries),
            "data": output.getvalue()
        }


@router.get("/{audit_id}", response_model=AuditLogResponse)
async def get_audit_entry(audit_id: str):
    """
    Get a specific audit log entry.
    """
    entries = await audit_store.get_all()

    for entry in entries:
        if entry.audit_id == audit_id:
            return AuditLogResponse.model_validate(entry.model_dump())

    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail="Audit entry not found")
