"""Content classifier using LangChain."""
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.models.moderation import PolicyCategory


class ClassificationResult(BaseModel):
    """Result of content classification."""
    category: str = Field(description="The policy category detected")
    reasoning: str = Field(description="Brief explanation for the classification")


CLASSIFICATION_PROMPT = """You are a content moderation classifier. Analyze the following content and classify it into one of these categories:

Categories:
- harassment: Content that harasses, intimidates, or bullies individuals
- hate_speech: Content that promotes hatred against protected groups
- spam: Repetitive, promotional, or unsolicited content
- violence: Content that promotes or glorifies violence
- adult_content: Sexually explicit or mature content
- none: Content that does not violate any policy

Content to analyze:
"{content}"

Respond with a JSON object containing:
- "category": one of the categories listed above
- "reasoning": a brief explanation for your classification

Be conservative: only classify as a violation if there is clear evidence. When in doubt, classify as "none".
"""


class ContentClassifier:
    """Classifies content into policy categories using LLM."""

    def __init__(self):
        settings = get_settings()
        self.llm = ChatOpenAI(
            model=settings.openai_model,
            api_key=settings.openai_api_key,
            temperature=0.0,  # Deterministic output
        )
        self.prompt = ChatPromptTemplate.from_template(CLASSIFICATION_PROMPT)
        self.parser = JsonOutputParser(pydantic_object=ClassificationResult)

    async def classify(self, content: str) -> tuple[PolicyCategory, str]:
        """
        Classify content into a policy category.

        Returns:
            Tuple of (PolicyCategory, reasoning string)
        """
        try:
            chain = self.prompt | self.llm | self.parser
            result = await chain.ainvoke({"content": content})

            if not isinstance(result, dict):
                return PolicyCategory.NONE, f"Unexpected response format from LLM: {type(result)}"

            # Map string to enum
            category_str = result.get("category", "none")
            if category_str:
                category_str = category_str.lower()
            else:
                category_str = "none"

            reasoning = result.get("reasoning", "")

            # Map to PolicyCategory enum
            category_map = {
                "harassment": PolicyCategory.HARASSMENT,
                "hate_speech": PolicyCategory.HATE_SPEECH,
                "spam": PolicyCategory.SPAM,
                "violence": PolicyCategory.VIOLENCE,
                "adult_content": PolicyCategory.ADULT_CONTENT,
                "none": PolicyCategory.NONE,
            }

            category = category_map.get(category_str, PolicyCategory.NONE)
            return category, reasoning

        except Exception as e:
            # On error, default to safe classification
            return PolicyCategory.NONE, f"Classification error: {str(e)}"


# Singleton instance
_classifier: ContentClassifier | None = None


def get_classifier() -> ContentClassifier:
    """Get the content classifier instance."""
    global _classifier
    if _classifier is None:
        _classifier = ContentClassifier()
    return _classifier
