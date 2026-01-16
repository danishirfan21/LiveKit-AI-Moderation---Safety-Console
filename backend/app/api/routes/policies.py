"""Policy configuration API endpoints."""
from datetime import datetime
from fastapi import APIRouter, HTTPException

from app.models.policy import Policy, PolicyResponse, PolicyUpdate
from app.models.audit import AuditLogEntry, AuditActionType, AuditActor
from app.core.storage import policies_store, audit_store
from app.api.websocket import broadcast_audit_entry

router = APIRouter()


@router.get("", response_model=list[PolicyResponse])
async def list_policies():
    """
    List all policy configurations.
    """
    policies = await policies_store.get_all()

    # Sort by category
    policies.sort(key=lambda p: p.category.value)

    return [PolicyResponse.model_validate(p.model_dump()) for p in policies]


@router.get("/{policy_id}", response_model=PolicyResponse)
async def get_policy(policy_id: str):
    """
    Get a specific policy configuration.
    """
    policy = await policies_store.get(policy_id)

    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    return PolicyResponse.model_validate(policy.model_dump())


@router.put("/{policy_id}", response_model=PolicyResponse)
async def update_policy(policy_id: str, update: PolicyUpdate):
    """
    Update a policy configuration.

    Updates can include:
    - warn_threshold: Confidence threshold for warnings (0-1)
    - mute_threshold: Confidence threshold for muting (0-1)
    - flag_threshold: Confidence threshold for flagging (0-1)
    - enabled: Whether the policy is active

    Thresholds must maintain order: warn < mute < flag
    """
    policy = await policies_store.get(policy_id)

    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    # Track changes for audit
    changes = {}

    # Apply updates
    if update.name is not None:
        changes["name"] = {"old": policy.name, "new": update.name}
        policy.name = update.name

    if update.description is not None:
        changes["description"] = {"old": policy.description, "new": update.description}
        policy.description = update.description

    if update.warn_threshold is not None:
        changes["warn_threshold"] = {"old": policy.warn_threshold, "new": update.warn_threshold}
        policy.warn_threshold = update.warn_threshold

    if update.mute_threshold is not None:
        changes["mute_threshold"] = {"old": policy.mute_threshold, "new": update.mute_threshold}
        policy.mute_threshold = update.mute_threshold

    if update.flag_threshold is not None:
        changes["flag_threshold"] = {"old": policy.flag_threshold, "new": update.flag_threshold}
        policy.flag_threshold = update.flag_threshold

    if update.enabled is not None:
        changes["enabled"] = {"old": policy.enabled, "new": update.enabled}
        policy.enabled = update.enabled

    # Validate threshold ordering
    if not (policy.warn_threshold <= policy.mute_threshold <= policy.flag_threshold):
        raise HTTPException(
            status_code=400,
            detail="Thresholds must be ordered: warn <= mute <= flag"
        )

    # Update timestamp
    policy.updated_at = datetime.utcnow()

    # Save updated policy
    await policies_store.set(policy_id, policy)

    # Create audit entry
    if changes:
        audit_entry = AuditLogEntry(
            decision_id=None,
            action_type=AuditActionType.POLICY_UPDATED,
            actor=AuditActor.ADMIN,
            reason=f"Policy '{policy.name}' updated",
            metadata={
                "policy_id": policy_id,
                "policy_name": policy.name,
                "changes": changes,
            }
        )
        await audit_store.append(audit_entry)
        await broadcast_audit_entry(audit_entry.model_dump(mode="json"))

    return PolicyResponse.model_validate(policy.model_dump())


@router.post("/{policy_id}/toggle")
async def toggle_policy(policy_id: str):
    """
    Toggle a policy's enabled state.
    """
    policy = await policies_store.get(policy_id)

    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    old_enabled = policy.enabled
    policy.enabled = not policy.enabled
    policy.updated_at = datetime.utcnow()

    await policies_store.set(policy_id, policy)

    # Create audit entry
    audit_entry = AuditLogEntry(
        decision_id=None,
        action_type=AuditActionType.POLICY_UPDATED,
        actor=AuditActor.ADMIN,
        reason=f"Policy '{policy.name}' {'enabled' if policy.enabled else 'disabled'}",
        metadata={
            "policy_id": policy_id,
            "policy_name": policy.name,
            "old_enabled": old_enabled,
            "new_enabled": policy.enabled,
        }
    )
    await audit_store.append(audit_entry)
    await broadcast_audit_entry(audit_entry.model_dump(mode="json"))

    return {
        "status": "success",
        "policy_id": policy_id,
        "enabled": policy.enabled,
    }
