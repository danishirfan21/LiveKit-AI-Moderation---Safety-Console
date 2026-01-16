"""Action execution module."""
from datetime import datetime

from app.models.moderation import (
    ModerationDecision,
    ModerationAction,
    ModerationStatus,
    ModerationInput,
    PolicyCategory,
)
from app.models.audit import AuditLogEntry, AuditActionType, AuditActor
from app.core.storage import decisions_store, audit_store


class ActionExecutor:
    """Executes moderation actions and creates audit logs."""

    async def execute(
        self,
        input_data: ModerationInput,
        category: PolicyCategory,
        confidence: float,
        action: ModerationAction,
        policy_id: str | None,
        reasoning: str,
    ) -> ModerationDecision:
        """
        Execute a moderation action and create appropriate records.

        This creates the moderation decision record and audit log entry
        BEFORE any action is taken (for safety/auditability).
        """
        # Create the moderation decision
        decision = ModerationDecision(
            room_id=input_data.room_id,
            participant_id=input_data.participant_id,
            participant_identity=input_data.participant_identity,
            content=input_data.content,
            content_type=input_data.content_type,
            classification=category,
            confidence_score=confidence,
            action=action,
            status=ModerationStatus.PENDING,
            policy_id=policy_id,
            reasoning=reasoning,
            metadata=input_data.metadata,
        )

        # Store the decision
        await decisions_store.set(decision.decision_id, decision)

        # Create audit log entry for decision creation
        await self._create_audit_entry(
            decision_id=decision.decision_id,
            action_type=AuditActionType.DECISION_CREATED,
            reason=f"Moderation decision created: {category.value} with confidence {confidence:.2f}",
            metadata={
                "decision": decision.model_dump(mode="json"),
                "input": input_data.model_dump(mode="json"),
            }
        )

        # Execute the action if any
        if action != ModerationAction.NONE:
            await self._execute_action(decision)

        return decision

    async def _execute_action(self, decision: ModerationDecision) -> None:
        """Execute the specific moderation action."""
        action_type_map = {
            ModerationAction.WARN: AuditActionType.PARTICIPANT_WARNED,
            ModerationAction.MUTE: AuditActionType.PARTICIPANT_MUTED,
            ModerationAction.FLAG_FOR_REVIEW: AuditActionType.CONTENT_FLAGGED,
        }

        audit_action_type = action_type_map.get(
            decision.action,
            AuditActionType.ACTION_EXECUTED
        )

        # In a real implementation, this would call LiveKit API to:
        # - WARN: Send a data message to the participant
        # - MUTE: Call UpdateParticipant to mute audio/video
        # - FLAG_FOR_REVIEW: Add to review queue (already done via decision status)

        # For now, we just log the action
        # Future: integrate with LiveKit Server API

        # Update decision status
        decision.status = ModerationStatus.EXECUTED
        await decisions_store.set(decision.decision_id, decision)

        # Create audit log for action execution
        await self._create_audit_entry(
            decision_id=decision.decision_id,
            action_type=audit_action_type,
            reason=f"Action executed: {decision.action.value} on participant {decision.participant_identity}",
            metadata={
                "action": decision.action.value,
                "participant_id": decision.participant_id,
                "participant_identity": decision.participant_identity,
                "room_id": decision.room_id,
                "classification": decision.classification.value,
                "confidence": decision.confidence_score,
            }
        )

    async def _create_audit_entry(
        self,
        decision_id: str,
        action_type: AuditActionType,
        reason: str,
        metadata: dict | None = None,
    ) -> AuditLogEntry:
        """Create and store an audit log entry."""
        entry = AuditLogEntry(
            decision_id=decision_id,
            action_type=action_type,
            actor=AuditActor.AI,
            reason=reason,
            metadata=metadata,
        )

        await audit_store.append(entry)
        return entry


# Singleton instance
_executor: ActionExecutor | None = None


def get_executor() -> ActionExecutor:
    """Get the action executor instance."""
    global _executor
    if _executor is None:
        _executor = ActionExecutor()
    return _executor
