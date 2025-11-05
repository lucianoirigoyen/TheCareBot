"""
LangChain AI Agent for Intelligent Autofill.
Uses Claude 3.5 Sonnet with tool-calling for predicting invoice field values.
"""
from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.tools import tool
# AgentExecutor no disponible en esta versión de langchain
from typing import List, Dict
import os
import json


# Initialize Claude 3.5 Sonnet
llm = ChatAnthropic(
    model="claude-3-5-sonnet-20241022",
    api_key=os.getenv("ANTHROPIC_API_KEY"),
    temperature=0.3,
    max_tokens=2000
)


@tool
def analyze_pattern_frequency(patterns: List[Dict]) -> Dict:
    """
    Analyze frequency statistics of historical patterns.

    Args:
        patterns: List of historical patterns with frecuencia field

    Returns:
        Statistics about pattern usage
    """
    if not patterns:
        return {
            "max_frequency": 0,
            "avg_frequency": 0,
            "total_patterns": 0,
            "high_confidence_count": 0
        }

    frequencies = [p.get("frecuencia", 0) for p in patterns]

    return {
        "max_frequency": max(frequencies),
        "avg_frequency": sum(frequencies) / len(frequencies),
        "total_patterns": len(patterns),
        "high_confidence_count": sum(1 for f in frequencies if f >= 10)
    }


@tool
def match_context_patterns(patterns: List[Dict], current_context: Dict) -> List[Dict]:
    """
    Filter patterns that match current context (day of week, time, etc.).

    Args:
        patterns: Historical patterns with contexto field
        current_context: Current context {day_of_week, period_of_day, etc.}

    Returns:
        Filtered list of patterns matching context
    """
    matched = []

    for pattern in patterns:
        pattern_ctx = pattern.get("contexto", {})

        # Check day of week match
        day_match = pattern_ctx.get("day_of_week") == current_context.get("day_of_week")

        # Check period of day match
        period_match = pattern_ctx.get("period_of_day") == current_context.get("period_of_day")

        # If at least one context matches, include it
        if day_match or period_match:
            matched.append({
                **pattern,
                "context_match_score": (1 if day_match else 0) + (1 if period_match else 0)
            })

    # Sort by context match score descending
    matched.sort(key=lambda x: x.get("context_match_score", 0), reverse=True)

    return matched


@tool
def calculate_string_similarity(pattern_value: str, current_input: str) -> float:
    """
    Calculate similarity between pattern value and current user input.

    Args:
        pattern_value: Historical pattern value
        current_input: Current user input

    Returns:
        Similarity score 0.0-1.0
    """
    if not current_input:
        return 1.0  # No input yet, don't penalize

    pattern_lower = pattern_value.lower()
    input_lower = current_input.lower()

    # Check if pattern starts with input
    if pattern_lower.startswith(input_lower):
        return 1.0

    # Check if input is contained in pattern
    if input_lower in pattern_lower:
        return 0.8

    # Calculate Levenshtein-like similarity (simple version)
    max_len = max(len(pattern_lower), len(input_lower))
    if max_len == 0:
        return 1.0

    matches = sum(1 for i, char in enumerate(input_lower) if i < len(pattern_lower) and char == pattern_lower[i])

    return matches / max_len


# Create AI agent prompt
prompt = ChatPromptTemplate.from_messages([
    ("system", """You are an intelligent autofill assistant for a Chilean dental clinic invoicing system.

Your mission: Predict what the doctor is likely to type next based on historical patterns and context.

You have access to these tools:
- analyze_pattern_frequency: Get statistics about how often patterns are used
- match_context_patterns: Find patterns matching current context (day of week, time of day)
- calculate_string_similarity: Check how similar a pattern is to current user input

PREDICTION STRATEGY:
1. Use analyze_pattern_frequency to understand usage patterns
2. Use match_context_patterns to find contextually relevant options
3. Use calculate_string_similarity for partial matches
4. Combine frequency + context + similarity for confidence score

CONFIDENCE SCORING:
- Frequency weight: 40% (higher frequency = more confident)
- Context match: 30% (matching day/time = more confident)
- String similarity: 30% (closer to input = more confident)

OUTPUT FORMAT:
Return a JSON array of predictions (maximum 5):
[
  {{
    "valor": "Limpieza dental",
    "confidence": 0.92,
    "frecuencia": 45,
    "contexto_match": true,
    "reasoning": "High frequency (45 uses), matches Monday pattern, exact prefix match"
  }},
  ...
]

RULES:
- Only include predictions with confidence >= 0.6
- Sort by confidence descending
- Maximum 5 predictions
- Provide brief reasoning for each
- Use Spanish for valor and reasoning
"""),
    ("user", "{input}"),
    ("placeholder", "{agent_scratchpad}")
])


# Temporalmente deshabilitado - AgentExecutor no disponible
# tools = [analyze_pattern_frequency, match_context_patterns, calculate_string_similarity]
# agent = create_tool_calling_agent(llm, tools, prompt)
# agent_executor = AgentExecutor(...)


async def predict_with_ai_agent(
    patterns: List[Dict],
    current_value: str,
    contexto: Dict
) -> List[Dict]:
    """
    Use Claude AI directly to predict autofill values.

    Args:
        patterns: Historical patterns from database
        current_value: Current user input
        contexto: Context {day_of_week, period_of_day, etc.}

    Returns:
        List of predictions: [{"valor": "...", "confidence": 0.9, ...}, ...]
    """

    if not patterns:
        print("[AI Agent] No patterns provided")
        return []

    # Check if API key is configured
    if not os.getenv("ANTHROPIC_API_KEY"):
        print("[AI Agent] ANTHROPIC_API_KEY not set, using fallback")
        from autofill_predictor import predict_autofill_simple
        return predict_autofill_simple(patterns, current_value, contexto)

    # Prepare data for Claude (limit to top 15 to save tokens)
    patterns_summary = []
    for p in patterns[:15]:
        patterns_summary.append({
            "valor": p.get("valor", ""),
            "frecuencia": p.get("frecuencia", 0),
            "contexto": p.get("contexto", {})
        })

    # Create prompt for Claude
    prompt_content = f"""Eres un asistente de autocompletado inteligente para un sistema de facturación dental chileno.

Analiza estos patrones históricos y predice los valores más probables que el doctor ingresará:

PATRONES HISTÓRICOS:
{json.dumps(patterns_summary, indent=2, ensure_ascii=False)}

ENTRADA ACTUAL DEL USUARIO: "{current_value}"

CONTEXTO ACTUAL:
{json.dumps(contexto, indent=2, ensure_ascii=False)}

ESTRATEGIA DE PREDICCIÓN:
1. Frecuencia (40%): Valores más usados tienen mayor confianza
2. Contexto (30%): Coincidencia de día de semana y período del día
3. Similaridad (30%): Qué tan cercano está al input actual

REGLAS:
- Solo incluir predicciones con confidence >= 0.6
- Ordenar por confidence descendente
- Máximo 5 predicciones
- Para confidence >= 0.8, agregar emoji 📊

FORMATO DE SALIDA (JSON válido):
[
  {{
    "valor": "Limpieza dental",
    "confidence": 0.92,
    "frecuencia": 45,
    "contexto_match": true,
    "reasoning": "Alta frecuencia (45 usos), coincide con patrón de lunes, match exacto de prefijo",
    "icon": "🤖📊"
  }}
]

Retorna SOLO el array JSON, sin texto adicional."""

    try:
        # Invoke Claude directly
        from langchain_core.messages import HumanMessage

        print("[AI Agent] Invoking Claude AI for predictions...")
        response = await llm.ainvoke([HumanMessage(content=prompt_content)])

        # Parse JSON response
        response_text = response.content.strip()

        # Remove markdown code blocks if present
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:-1])
            if response_text.startswith("json"):
                response_text = response_text[4:].strip()

        predictions = json.loads(response_text)

        # Validate and return
        if isinstance(predictions, list):
            print(f"[AI Agent] ✅ Claude AI generated {len(predictions)} predictions")
            return predictions[:5]
        else:
            print("[AI Agent] Invalid response format, using fallback")
            from autofill_predictor import predict_autofill_simple
            return predict_autofill_simple(patterns, current_value, contexto)

    except Exception as e:
        print(f"[AI Agent] ❌ Error using Claude: {e}, using fallback")
        # Fallback to simple prediction
        from autofill_predictor import predict_autofill_simple
        return predict_autofill_simple(patterns, current_value, contexto)


def predict_with_ai_agent_sync(
    patterns: List[Dict],
    current_value: str,
    contexto: Dict
) -> List[Dict]:
    """Synchronous version of predict_with_ai_agent."""
    import asyncio
    return asyncio.run(predict_with_ai_agent(patterns, current_value, contexto))
