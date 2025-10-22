"""
Intelligent Autofill Predictor Agent using Claude AI and LangChain.
Learns from historical patterns and predicts field values.
"""
from langchain_anthropic import ChatAnthropic
from langchain_core.tools import tool
from langchain_core.prompts import ChatPromptTemplate
from typing import List, Dict
import os
from difflib import SequenceMatcher


# Initialize Claude
llm = ChatAnthropic(
    model="claude-3-5-sonnet-20241022",
    api_key=os.getenv("ANTHROPIC_API_KEY"),
    temperature=0.3
)


def calculate_string_similarity(a: str, b: str) -> float:
    """Calculate similarity between two strings (0.0 to 1.0)."""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def calculate_context_match_score(pattern_context: Dict, current_context: Dict) -> float:
    """
    Calculate how well the pattern's context matches the current context.

    Args:
        pattern_context: Historical pattern's context
        current_context: Current user's context

    Returns:
        Score between 0.0 and 1.0
    """
    if not pattern_context or not current_context:
        return 0.5  # Neutral score if no context

    matches = 0
    total = 0

    # Check day of week
    if "day_of_week" in pattern_context and "day_of_week" in current_context:
        total += 1
        if pattern_context["day_of_week"] == current_context["day_of_week"]:
            matches += 1

    # Check consultation type
    if "tipo_consulta" in pattern_context and "tipo_consulta" in current_context:
        total += 1
        if pattern_context["tipo_consulta"] == current_context["tipo_consulta"]:
            matches += 1

    # Check time of day (morning/afternoon/evening)
    if "period_of_day" in pattern_context and "period_of_day" in current_context:
        total += 1
        if pattern_context["period_of_day"] == current_context["period_of_day"]:
            matches += 1

    if total == 0:
        return 0.5  # No comparable context fields

    return matches / total


def calculate_confidence_score(
    pattern: Dict,
    current_input: str,
    current_context: Dict,
    max_frequency: int
) -> float:
    """
    Calculate confidence score for a prediction.

    Factors:
    - Frequency weight: 40% (normalized by max frequency)
    - Context match: 30%
    - String similarity: 30%

    Args:
        pattern: Historical pattern data
        current_input: Current user input
        current_context: Current context
        max_frequency: Maximum frequency in dataset (for normalization)

    Returns:
        Confidence score between 0.0 and 1.0
    """
    # Frequency score (normalized)
    frequency = pattern.get("frecuencia", 1)
    frequency_score = min(frequency / max(max_frequency, 1), 1.0)

    # Context match score
    pattern_context = pattern.get("contexto", {})
    context_score = calculate_context_match_score(pattern_context, current_context)

    # String similarity score
    pattern_value = pattern.get("valor", "")
    if current_input.strip() == "":
        similarity_score = 1.0  # If no input yet, don't penalize
    else:
        similarity_score = calculate_string_similarity(current_input, pattern_value)

    # Weighted combination
    confidence = (
        0.4 * frequency_score +
        0.3 * context_score +
        0.3 * similarity_score
    )

    return round(confidence, 2)


@tool
def query_and_score_patterns(
    patterns: List[Dict],
    current_input: str,
    current_context: Dict
) -> List[Dict]:
    """
    Score historical patterns based on current input and context.

    Args:
        patterns: List of historical patterns from database
        current_input: Current user input
        current_context: Current context metadata

    Returns:
        Scored predictions sorted by confidence
    """
    if not patterns:
        return []

    # Find max frequency for normalization
    max_frequency = max(p.get("frecuencia", 1) for p in patterns)

    # Calculate confidence for each pattern
    scored_predictions = []
    for pattern in patterns:
        confidence = calculate_confidence_score(
            pattern,
            current_input,
            current_context,
            max_frequency
        )

        # Only include predictions with confidence >= 0.6
        if confidence >= 0.6:
            scored_predictions.append({
                "valor": pattern.get("valor", ""),
                "confidence": confidence,
                "frecuencia": pattern.get("frecuencia", 1),
                "contexto_match": calculate_context_match_score(
                    pattern.get("contexto", {}),
                    current_context
                ) > 0.7,
                "last_used": pattern.get("last_used_at", ""),
            })

    # Sort by confidence (descending)
    scored_predictions.sort(key=lambda x: x["confidence"], reverse=True)

    # Return top 5
    return scored_predictions[:5]


# Comentado temporalmente - requiere AgentExecutor de langchain
def _create_autofill_agent_disabled():
    """Create LangChain agent for autofill predictions."""

    tools = [query_and_score_patterns]

    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an intelligent autofill assistant for Chilean medical invoices.

Your job is to analyze historical patterns and predict field values that the doctor is likely to enter.

Consider these factors:
1. **Frequency of use**: Values used more often have higher confidence
2. **Day of week patterns**: E.g., "Limpieza dental" more common on Mondays
3. **Consultation type correlation**: Certain services correlate with specific consultations
4. **String similarity**: If the user has started typing, match partially entered text

IMPORTANT:
- Only return predictions with confidence >= 0.6
- Return maximum 5 predictions
- Sort by confidence score (highest first)
- Include visual indicators (🤖 for AI suggestions, 📊 for high confidence ≥0.8)

Output format:
[
  {{
    "valor": "Limpieza dental",
    "confidence": 0.92,
    "frecuencia": 45,
    "contexto_match": true,
    "icon": "🤖📊"
  }},
  ...
]
"""),
        ("user", "{input}"),
        ("placeholder", "{agent_scratchpad}")
    ])

    agent = create_tool_calling_agent(llm, tools, prompt)
    return AgentExecutor(agent=agent, tools=tools, verbose=False)


def predict_autofill_simple(
    patterns: List[Dict],
    current_value: str,
    contexto: Dict
) -> List[Dict]:
    """
    Simple prediction function without LangChain agent (for direct use).

    Args:
        patterns: Historical patterns from database
        current_value: Current user input
        contexto: Context metadata

    Returns:
        List of predictions with confidence scores
    """
    if not patterns:
        return []

    # Find max frequency
    max_frequency = max(p.get("frecuencia", 1) for p in patterns)

    # Score all patterns
    predictions = []
    for pattern in patterns:
        confidence = calculate_confidence_score(
            pattern,
            current_value,
            contexto,
            max_frequency
        )

        # Only include if confidence >= 0.6
        if confidence >= 0.6:
            icon = "🤖"
            if confidence >= 0.8:
                icon += "📊"  # High confidence

            predictions.append({
                "valor": pattern.get("valor", ""),
                "confidence": confidence,
                "frecuencia": pattern.get("frecuencia", 1),
                "contexto_match": calculate_context_match_score(
                    pattern.get("contexto", {}),
                    contexto
                ) > 0.7,
                "icon": icon,
                "last_used": pattern.get("last_used_at", "")
            })

    # Sort by confidence
    predictions.sort(key=lambda x: x["confidence"], reverse=True)

    return predictions[:5]


# Comentado temporalmente - requiere AgentExecutor
async def _predict_autofill_with_agent_disabled(
    patterns: List[Dict],
    current_value: str,
    contexto: Dict
) -> List[Dict]:
    """
    Predict autofill values using LangChain agent with Claude AI.

    Args:
        patterns: Historical patterns from database
        current_value: Current user input
        contexto: Context metadata

    Returns:
        List of predictions with confidence scores
    """
    agent = create_autofill_agent()

    input_data = {
        "input": f"""Analyze these historical patterns and predict the best values:

Patterns: {patterns}
Current input: "{current_value}"
Context: {contexto}

Return top 5 predictions with confidence >= 0.6, sorted by confidence."""
    }

    try:
        result = await agent.ainvoke(input_data)
        return result.get("output", [])
    except Exception as e:
        print(f"Error in autofill agent: {e}")
        # Fallback to simple prediction
        return predict_autofill_simple(patterns, current_value, contexto)
