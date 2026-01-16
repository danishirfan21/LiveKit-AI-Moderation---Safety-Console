"""Action decision logic based on policy thresholds."""
from app.models.moderation import ModerationAction, PolicyCategory
from app.models.policy import Policy
from app.core.storage import policies_store


class ActionDecider:
    """Decides moderation action based on confidence scores and policy thresholds."""

    async def decide(
        self,
        category: PolicyCategory,
        confidence: float
    ) -> tuple[ModerationAction, str | None]:
        """
        Decide what action to take based on category and confidence.

        This is a deterministic function that compares the confidence score
        against the policy thresholds to determine the appropriate action.

        Returns:
            Tuple of (action, policy_id)
        """
        # No violation = no action
        if category == PolicyCategory.NONE:
            return ModerationAction.NONE, None

        # Find the matching policy
        policy = await self._get_policy_for_category(category)

        if policy is None or not policy.enabled:
            return ModerationAction.NONE, None

        # Deterministic threshold comparison
        # Check thresholds from highest to lowest
        if confidence >= policy.flag_threshold:
            return ModerationAction.FLAG_FOR_REVIEW, policy.policy_id
        elif confidence >= policy.mute_threshold:
            return ModerationAction.MUTE, policy.policy_id
        elif confidence >= policy.warn_threshold:
            return ModerationAction.WARN, policy.policy_id
        else:
            return ModerationAction.NONE, policy.policy_id

    async def _get_policy_for_category(self, category: PolicyCategory) -> Policy | None:
        """Get the policy configuration for a category."""
        policies = await policies_store.get_all()

        for policy in policies:
            if policy.category.value == category.value:
                return policy

        return None


# Singleton instance
_decider: ActionDecider | None = None


def get_decider() -> ActionDecider:
    """Get the action decider instance."""
    global _decider
    if _decider is None:
        _decider = ActionDecider()
    return _decider
