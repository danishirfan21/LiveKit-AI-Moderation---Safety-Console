"""LangGraph moderation pipeline."""
from typing import TypedDict, Annotated
from langgraph.graph import StateGraph, END

from app.models.moderation import (
    ModerationInput,
    ModerationDecision,
    PolicyCategory,
    ModerationAction,
)
from app.moderation.classifier import get_classifier
from app.moderation.scorer import get_scorer
from app.moderation.decider import get_decider
from app.moderation.actions import get_executor


class ModerationState(TypedDict):
    """State passed through the moderation pipeline."""
    # Input
    input: ModerationInput

    # Classification step output
    category: PolicyCategory | None
    classification_reasoning: str | None

    # Scoring step output
    confidence: float | None
    scoring_factors: str | None

    # Decision step output
    action: ModerationAction | None
    policy_id: str | None

    # Final output
    decision: ModerationDecision | None
    error: str | None


async def classify_node(state: ModerationState) -> ModerationState:
    """
    Classification node: Classify content into policy categories.

    Input: Content text
    Output: Policy category and reasoning
    """
    classifier = get_classifier()

    try:
        category, reasoning = await classifier.classify(state["input"].content)

        return {
            **state,
            "category": category,
            "classification_reasoning": reasoning,
        }
    except Exception as e:
        return {
            **state,
            "category": PolicyCategory.NONE,
            "classification_reasoning": f"Error during classification: {str(e)}",
            "error": str(e),
        }


async def score_node(state: ModerationState) -> ModerationState:
    """
    Scoring node: Calculate confidence score for the classification.

    Input: Content, category, reasoning
    Output: Confidence score (0-1)
    """
    scorer = get_scorer()

    try:
        confidence, factors = await scorer.score(
            content=state["input"].content,
            category=state["category"],
            reasoning=state["classification_reasoning"] or "",
        )

        return {
            **state,
            "confidence": confidence,
            "scoring_factors": factors,
        }
    except Exception as e:
        return {
            **state,
            "confidence": 0.0,
            "scoring_factors": f"Error during scoring: {str(e)}",
            "error": str(e),
        }


async def decide_node(state: ModerationState) -> ModerationState:
    """
    Decision node: Determine action based on thresholds.

    This is a deterministic comparison of confidence vs policy thresholds.
    No ML/LLM is used in this step for safety.

    Input: Category, confidence
    Output: Action to take
    """
    decider = get_decider()

    try:
        action, policy_id = await decider.decide(
            category=state["category"],
            confidence=state["confidence"],
        )

        return {
            **state,
            "action": action,
            "policy_id": policy_id,
        }
    except Exception as e:
        return {
            **state,
            "action": ModerationAction.NONE,
            "policy_id": None,
            "error": str(e),
        }


async def action_node(state: ModerationState) -> ModerationState:
    """
    Action node: Execute the decided action and create audit records.

    This node:
    1. Creates the moderation decision record
    2. Creates audit log entries
    3. Executes the action (warn/mute/flag)
    """
    executor = get_executor()

    try:
        # Combine reasoning
        reasoning_parts = []
        if state["classification_reasoning"]:
            reasoning_parts.append(f"Classification: {state['classification_reasoning']}")
        if state["scoring_factors"]:
            reasoning_parts.append(f"Scoring: {state['scoring_factors']}")

        full_reasoning = " | ".join(reasoning_parts)

        decision = await executor.execute(
            input_data=state["input"],
            category=state["category"],
            confidence=state["confidence"],
            action=state["action"],
            policy_id=state["policy_id"],
            reasoning=full_reasoning,
        )

        return {
            **state,
            "decision": decision,
        }
    except Exception as e:
        return {
            **state,
            "error": str(e),
        }


def create_moderation_pipeline() -> StateGraph:
    """
    Create the LangGraph moderation pipeline.

    Pipeline flow:
    [Input] -> [Classify] -> [Score] -> [Decide] -> [Action] -> [End]

    Each step is logged for auditability.
    """
    # Create the graph
    workflow = StateGraph(ModerationState)

    # Add nodes
    workflow.add_node("classify", classify_node)
    workflow.add_node("score", score_node)
    workflow.add_node("decide", decide_node)
    workflow.add_node("action", action_node)

    # Define the edges (linear flow)
    workflow.set_entry_point("classify")
    workflow.add_edge("classify", "score")
    workflow.add_edge("score", "decide")
    workflow.add_edge("decide", "action")
    workflow.add_edge("action", END)

    return workflow.compile()


# Compiled pipeline instance
_pipeline = None


def get_pipeline():
    """Get the compiled moderation pipeline."""
    global _pipeline
    if _pipeline is None:
        _pipeline = create_moderation_pipeline()
    return _pipeline


async def moderate_content(input_data: ModerationInput) -> ModerationDecision | None:
    """
    Main entry point for content moderation.

    Takes content input and returns a moderation decision.
    """
    pipeline = get_pipeline()

    initial_state: ModerationState = {
        "input": input_data,
        "category": None,
        "classification_reasoning": None,
        "confidence": None,
        "scoring_factors": None,
        "action": None,
        "policy_id": None,
        "decision": None,
        "error": None,
    }

    # Run the pipeline
    result = await pipeline.ainvoke(initial_state)

    return result.get("decision")
