"""
LangGraph Workflow for Intelligent Autofill.
Multi-agent system for predicting invoice field values.
"""
from langgraph.graph import StateGraph, END
from typing import Dict
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from state.workflow_state import AutofillWorkflowState
from tools.supabase_client import SupabaseClient
from agents.autofill_predictor import predict_autofill_simple
from agents.intelligent_autofill_agent import predict_with_ai_agent
from datetime import datetime


# Initialize Supabase client
supabase_client = SupabaseClient()


def query_historical_patterns(state: AutofillWorkflowState) -> dict:
    """
    Node 1: Query historical patterns from database.
    LangGraph best practice: Return only fields that change.
    """
    print(f"[Autofill] Querying patterns for campo='{state['campo']}'")

    try:
        patterns = supabase_client.query_autofill_patterns(
            doctor_id=state["doctor_id"],
            campo=state["campo"],
            limit=20
        )

        return {
            "historical_patterns": patterns,
            "status": "analyzing"
        }
    except Exception as e:
        return {
            "status": "failed",
            "errors": state.get("errors", []) + [f"Error querying patterns: {str(e)}"]
        }


def enrich_context(state: AutofillWorkflowState) -> dict:
    """
    Node 2: Enrich context with additional metadata.
    LangGraph best practice: Return only fields that change.
    """
    print("[Autofill] Enriching context")

    try:
        # Add current day of week
        current_context = state.get("contexto", {}).copy()

        if "day_of_week" not in current_context:
            current_context["day_of_week"] = datetime.now().weekday()  # 0=Monday, 6=Sunday

        if "period_of_day" not in current_context:
            hour = datetime.now().hour
            if hour < 12:
                current_context["period_of_day"] = "morning"
            elif hour < 18:
                current_context["period_of_day"] = "afternoon"
            else:
                current_context["period_of_day"] = "evening"

        return {
            "enriched_context": current_context,
            "contexto": current_context,
            "status": "scoring"
        }
    except Exception as e:
        return {
            "status": "failed",
            "errors": state.get("errors", []) + [f"Error enriching context: {str(e)}"]
        }


async def calculate_predictions_with_ai(state: AutofillWorkflowState) -> dict:
    """
    Node 3: Calculate predictions with AI agent using Claude.
    LangGraph best practice: Return only fields that change.
    """
    print("[Autofill] Calculating predictions with Claude AI Agent")

    try:
        patterns = state.get("historical_patterns", [])
        current_value = state.get("current_value", "")
        contexto = state.get("enriched_context", {})

        # Use Claude AI agent if we have enough patterns (>= 5)
        # Otherwise fallback to simple prediction
        use_ai_agent = len(patterns) >= 5 and os.getenv("ANTHROPIC_API_KEY")

        if use_ai_agent:
            print("[Autofill] Using Claude AI agent for intelligent prediction")
            predictions = await predict_with_ai_agent(
                patterns=patterns,
                current_value=current_value,
                contexto=contexto
            )
        else:
            print("[Autofill] Using simple prediction (not enough patterns or no API key)")
            predictions = predict_autofill_simple(
                patterns=patterns,
                current_value=current_value,
                contexto=contexto
            )

        print(f"[Autofill] Generated {len(predictions)} predictions")

        return {
            "predictions": predictions,
            "status": "completed"
        }
    except Exception as e:
        print(f"[Autofill] Error: {e}, falling back to simple prediction")
        # Fallback to simple prediction on error
        predictions = predict_autofill_simple(
            patterns=state.get("historical_patterns", []),
            current_value=state.get("current_value", ""),
            contexto=state.get("enriched_context", {})
        )
        return {
            "predictions": predictions,
            "status": "completed"
        }


def should_continue(state: AutofillWorkflowState) -> str:
    """Determine next node based on status."""
    status = state.get("status", "pending")

    if status == "failed":
        return END
    if status == "completed":
        return END

    return "continue"


def create_autofill_workflow():
    """Create LangGraph workflow for autofill predictions."""

    workflow = StateGraph(AutofillWorkflowState)

    # Add nodes
    workflow.add_node("query_patterns", query_historical_patterns)
    workflow.add_node("enrich_context", enrich_context)
    workflow.add_node("calculate_predictions", calculate_predictions_with_ai)

    # Set entry point
    workflow.set_entry_point("query_patterns")

    # Add edges
    workflow.add_edge("query_patterns", "enrich_context")
    workflow.add_edge("enrich_context", "calculate_predictions")
    workflow.add_conditional_edges(
        "calculate_predictions",
        should_continue,
        {
            "continue": END,
            END: END
        }
    )

    return workflow.compile()


async def execute_autofill(
    doctor_id: str,
    campo: str,
    current_value: str,
    contexto: Dict
) -> Dict:
    """
    Execute autofill workflow.

    Args:
        doctor_id: Doctor's UUID
        campo: Field name to autocomplete
        current_value: Current user input
        contexto: Context metadata

    Returns:
        {
            "success": True,
            "predictions": [
                {
                    "valor": "Limpieza dental",
                    "confidence": 0.92,
                    "frecuencia": 45,
                    "contexto_match": True,
                    "icon": "🤖📊"
                },
                ...
            ]
        }
    """
    workflow = create_autofill_workflow()

    initial_state: AutofillWorkflowState = {
        "doctor_id": doctor_id,
        "campo": campo,
        "current_value": current_value,
        "contexto": contexto,
        "historical_patterns": [],
        "enriched_context": None,
        "predictions": [],
        "status": "pending",
        "errors": []
    }

    try:
        result = await workflow.ainvoke(initial_state)

        if result["status"] == "failed":
            return {
                "success": False,
                "predictions": [],
                "errors": result.get("errors", [])
            }

        return {
            "success": True,
            "predictions": result.get("predictions", []),
            "errors": []
        }
    except Exception as e:
        return {
            "success": False,
            "predictions": [],
            "errors": [f"Workflow execution error: {str(e)}"]
        }


# Synchronous version for FastAPI
def execute_autofill_sync(
    doctor_id: str,
    campo: str,
    current_value: str,
    contexto: Dict
) -> Dict:
    """
    Synchronous version of execute_autofill (for FastAPI compatibility).
    """
    import asyncio
    return asyncio.run(execute_autofill(doctor_id, campo, current_value, contexto))
