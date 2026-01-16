"""Confidence scorer using LangChain."""
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.models.moderation import PolicyCategory


class ScoringResult(BaseModel):
    """Result of confidence scoring."""
    confidence: float = Field(description="Confidence score between 0.0 and 1.0")
    factors: str = Field(description="Factors that influenced the score")


SCORING_PROMPT = """You are a content moderation confidence scorer. Given content that has been classified as potentially violating a policy, assess how confident we should be in this classification.

Content: "{content}"
Classified as: {category}
Classification reasoning: {reasoning}

Consider these factors when scoring:
1. Clarity of violation: Is the violation obvious or ambiguous?
2. Context: Could the content be interpreted differently in context?
3. Severity: How severe is the potential violation?
4. Intent: Does the content appear intentionally harmful?

Respond with a JSON object containing:
- "confidence": a number between 0.0 and 1.0 (0.0 = not confident at all, 1.0 = completely confident)
- "factors": brief explanation of what influenced your confidence score

Scoring guidelines:
- 0.0-0.3: Very uncertain, could easily be misclassified
- 0.3-0.5: Some indicators present but ambiguous
- 0.5-0.7: Clear indicators but some room for interpretation
- 0.7-0.9: Strong evidence of violation
- 0.9-1.0: Unambiguous, severe violation
"""


class ConfidenceScorer:
    """Scores confidence in content classification using LLM."""

    def __init__(self):
        settings = get_settings()
        self.llm = ChatOpenAI(
            model=settings.openai_model,
            api_key=settings.openai_api_key,
            temperature=0.0,
        )
        self.prompt = ChatPromptTemplate.from_template(SCORING_PROMPT)
        self.parser = JsonOutputParser(pydantic_object=ScoringResult)

    async def score(
        self,
        content: str,
        category: PolicyCategory,
        reasoning: str
    ) -> tuple[float, str]:
        """
        Score confidence in a classification.

        Returns:
            Tuple of (confidence score 0-1, factors string)
        """
        # If no violation detected, confidence is not applicable
        if category == PolicyCategory.NONE:
            return 0.0, "No violation detected"

        try:
            chain = self.prompt | self.llm | self.parser
            result = await chain.ainvoke({
                "content": content,
                "category": category.value,
                "reasoning": reasoning,
            })

            confidence = float(result.get("confidence", 0.0))
            factors = result.get("factors", "")

            # Clamp confidence to valid range
            confidence = max(0.0, min(1.0, confidence))

            return confidence, factors

        except Exception as e:
            # On error, return low confidence
            return 0.0, f"Scoring error: {str(e)}"


# Singleton instance
_scorer: ConfidenceScorer | None = None


def get_scorer() -> ConfidenceScorer:
    """Get the confidence scorer instance."""
    global _scorer
    if _scorer is None:
        _scorer = ConfidenceScorer()
    return _scorer
