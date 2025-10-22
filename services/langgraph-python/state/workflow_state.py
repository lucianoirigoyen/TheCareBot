"""
Workflow state definitions for LangGraph.
Chilean SII electronic invoicing system.
"""
from typing import TypedDict, Literal, Annotated, Optional
from langgraph.graph import add_messages
import operator


class WorkflowState(TypedDict):
    """Base workflow state."""
    doctor_id: str
    session_id: str
    intention: Literal["generar_boleta", "generar_factura", "autocompletar", "buscar_paciente"]
    status: Literal["pending", "processing", "completed", "failed"]
    messages: Annotated[list, add_messages]
    result: Optional[dict]
    confidence_score: Optional[float]
    errors: Annotated[list[str], operator.add]


class InvoiceWorkflowState(TypedDict):
    """State for invoice generation workflow."""
    # Input data
    doctor_id: str
    tipo_dte: int  # 33=Factura, 39=Boleta, 61=Nota Crédito
    receptor_rut: str
    receptor_razon_social: str
    receptor_direccion: Optional[str]
    detalles: list[dict]  # [{"descripcion": "", "cantidad": 1, "precio": 10000}]

    # Generated data
    folio: Optional[int]
    xml_dte: Optional[str]
    xml_signed: Optional[str]
    pdf_bytes: Optional[bytes]
    pdf_url: Optional[str]
    track_id: Optional[str]

    # Totals
    monto_neto: Optional[float]
    monto_iva: Optional[float]
    monto_total: Optional[float]

    # Workflow control
    status: Literal["pending", "validating", "generating_xml", "signing", "generating_pdf", "sending", "completed", "failed"]
    errors: Annotated[list[str], operator.add]
    confidence_score: Optional[float]


class AutofillWorkflowState(TypedDict):
    """State for intelligent autofill workflow."""
    doctor_id: str
    campo: str  # Field name to autocomplete
    current_value: str
    contexto: dict  # Context: day_of_week, hora, tipo_consulta, etc.

    # Retrieved data
    historical_patterns: list[dict]
    enriched_context: Optional[dict]

    # Predictions
    predictions: list[dict]  # [{"valor": "", "confidence": 0.9, "frecuencia": 45}]

    # Workflow control
    status: Literal["pending", "querying", "analyzing", "scoring", "completed", "failed"]
    errors: Annotated[list[str], operator.add]


class PatientSearchWorkflowState(TypedDict):
    """State for patient search workflow."""
    doctor_id: str
    patient_rut: str

    # Search results
    patient_found: bool
    patient_data: Optional[dict]

    # Workflow control
    status: Literal["pending", "validating_rut", "searching", "completed", "failed"]
    confidence_score: Optional[float]
    errors: Annotated[list[str], operator.add]
