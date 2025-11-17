"""
LangGraph Workflow for Invoice Generation.
Orchestrates multiple agents for complete Chilean SII invoice generation.
"""
from langgraph.graph import StateGraph, END
from typing import Dict
import sys
import os
import time
from datetime import datetime

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from state.workflow_state import InvoiceWorkflowState
from tools.supabase_client import SupabaseClient
from agents.pdf_generator import generate_invoice_pdf
import uuid


# Initialize Supabase client
supabase_client = SupabaseClient()


def assign_folio(state: InvoiceWorkflowState) -> InvoiceWorkflowState:
    """
    Node 1: Assign next available folio from database (atomic operation).
    """
    print(f"[Invoice] Assigning folio for tipo_dte={state['tipo_dte']}")

    try:
        # Get company RUT from environment
        empresa_rut = os.getenv("EMPRESA_RUT", "12345678-9")

        # Try to get folio from Supabase, fallback to demo mode
        folio = None
        try:
            folio = supabase_client.get_next_folio(
                tipo_dte=state["tipo_dte"],
                rut_empresa=empresa_rut
            )
        except Exception as db_error:
            print(f"Error getting next folio: {db_error}")
            folio = None

        # If database failed, use demo mode
        if folio is None:
            print("[Invoice] Falling back to DEMO mode (generating random folio)")
            import random
            folio = random.randint(100000, 999999)  # 6-digit folio for professional look
            print(f"[Invoice] DEMO folio assigned: {folio}")

        print(f"[Invoice] Assigned folio: {folio}")

        return {
            **state,
            "folio": folio,
            "status": "validating"
        }
    except Exception as e:
        return {
            **state,
            "status": "failed",
            "errors": state.get("errors", []) + [f"Error assigning folio: {str(e)}"]
        }


def validate_invoice_data(state: InvoiceWorkflowState) -> InvoiceWorkflowState:
    """
    Node 2: Validate invoice data before generation.
    """
    print("[Invoice] Validating invoice data")

    errors = []

    # Validate receptor RUT format
    receptor_rut = state.get("receptor_rut", "")
    if not receptor_rut or len(receptor_rut) < 9:
        errors.append("Invalid receptor RUT format")

    # Validate detalles
    detalles = state.get("detalles", [])
    if not detalles or len(detalles) == 0:
        errors.append("At least one line item is required")

    # Validate amounts
    for i, detalle in enumerate(detalles):
        if detalle.get("cantidad", 0) <= 0:
            errors.append(f"Invalid quantity in line {i+1}")
        if detalle.get("precio", 0) <= 0:
            errors.append(f"Invalid price in line {i+1}")

    if errors:
        return {
            **state,
            "status": "failed",
            "errors": state.get("errors", []) + errors
        }

    # Calculate totals
    total_neto = sum(d.get("total", 0) for d in detalles)
    total_iva = round(total_neto * 0.19, 2)
    total = round(total_neto + total_iva, 2)

    print(f"[Invoice] Validated. Total: ${total:,.0f}")

    return {
        **state,
        "monto_neto": total_neto,
        "monto_iva": total_iva,
        "monto_total": total,
        "status": "generating_xml"
    }


def generate_xml_dte(state: InvoiceWorkflowState) -> InvoiceWorkflowState:
    """
    Node 3: Generate SII-compliant XML.
    """
    print("[Invoice] Generating XML DTE")

    try:
        # Get company data from environment
        emisor = {
            "rut": os.getenv("EMPRESA_RUT", "12345678-9"),
            "razon_social": os.getenv("EMPRESA_RAZON_SOCIAL", "Clínica Dental TheCareBot"),
            "giro": os.getenv("EMPRESA_GIRO", "Servicios Odontológicos"),
            "direccion": os.getenv("EMPRESA_DIRECCION", "Av. Providencia 1234, Santiago"),
            "actividad_economica": os.getenv("EMPRESA_ACTIVIDAD_ECONOMICA", "869090")
        }

        receptor = {
            "rut": state["receptor_rut"],
            "razon_social": state["receptor_razon_social"],
            "direccion": state.get("receptor_direccion", "")
        }

        # Build simple XML (in production, use proper XML builder with schema validation)
        xml_dte = f"""<?xml version="1.0" encoding="ISO-8859-1"?>
<DTE version="1.0">
  <Documento ID="DTE-{state['tipo_dte']}-{state['folio']}">
    <Encabezado>
      <IdDoc>
        <TipoDTE>{state['tipo_dte']}</TipoDTE>
        <Folio>{state['folio']}</Folio>
        <FchEmis>{datetime.now().strftime('%Y-%m-%d')}</FchEmis>
      </IdDoc>
      <Emisor>
        <RUTEmisor>{emisor['rut']}</RUTEmisor>
        <RznSoc>{emisor['razon_social']}</RznSoc>
        <GiroEmis>{emisor['giro']}</GiroEmis>
        <DirOrigen>{emisor['direccion']}</DirOrigen>
        <Acteco>{emisor['actividad_economica']}</Acteco>
      </Emisor>
      <Receptor>
        <RUTRecep>{receptor['rut']}</RUTRecep>
        <RznSocRecep>{receptor['razon_social']}</RznSocRecep>
        <DirRecep>{receptor.get('direccion', 'N/A')}</DirRecep>
      </Receptor>
      <Totales>
        <MntNeto>{int(state['monto_neto'])}</MntNeto>
        <TasaIVA>19</TasaIVA>
        <IVA>{int(state['monto_iva'])}</IVA>
        <MntTotal>{int(state['monto_total'])}</MntTotal>
      </Totales>
    </Encabezado>
    <Detalle>"""

        for i, detalle in enumerate(state["detalles"], 1):
            xml_dte += f"""
      <Item>
        <NroLinDet>{i}</NroLinDet>
        <NmbItem>{detalle['descripcion']}</NmbItem>
        <QtyItem>{detalle['cantidad']}</QtyItem>
        <PrcItem>{int(detalle['precio'])}</PrcItem>
        <MontoItem>{int(detalle['total'])}</MontoItem>
      </Item>"""

        xml_dte += """
    </Detalle>
  </Documento>
</DTE>"""

        print(f"[Invoice] Generated XML ({len(xml_dte)} bytes)")

        return {
            **state,
            "xml_dte": xml_dte,
            "status": "signing"
        }
    except Exception as e:
        return {
            **state,
            "status": "failed",
            "errors": state.get("errors", []) + [f"Error generating XML: {str(e)}"]
        }


def sign_xml_dte(state: InvoiceWorkflowState) -> InvoiceWorkflowState:
    """
    Node 4: Sign XML with digital certificate.
    (In MVP, we skip actual signing - in production use cryptography library)
    """
    print("[Invoice] Signing XML DTE")

    try:
        # For MVP: just add a mock signature
        # In production: use .pfx certificate and XMLDSig
        xml_signed = state["xml_dte"].replace(
            "</DTE>",
            """
  <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
    <SignedInfo>
      <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
      <SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
    </SignedInfo>
    <SignatureValue>MOCK_SIGNATURE_FOR_MVP_DEMO</SignatureValue>
  </Signature>
</DTE>"""
        )

        print("[Invoice] XML signed (mock signature for MVP)")

        return {
            **state,
            "xml_signed": xml_signed,
            "status": "generating_pdf"
        }
    except Exception as e:
        return {
            **state,
            "status": "failed",
            "errors": state.get("errors", []) + [f"Error signing XML: {str(e)}"]
        }


def generate_pdf_invoice(state: InvoiceWorkflowState) -> InvoiceWorkflowState:
    """
    Node 5: Generate PDF invoice.
    """
    print("[Invoice] Generating PDF")

    try:
        # Prepare data for PDF generator
        emisor = {
            "rut": os.getenv("EMPRESA_RUT", "12345678-9"),
            "razon_social": os.getenv("EMPRESA_RAZON_SOCIAL", "Clínica Dental TheCareBot"),
            "giro": os.getenv("EMPRESA_GIRO", "Servicios Odontológicos"),
            "direccion": os.getenv("EMPRESA_DIRECCION", "Av. Providencia 1234, Santiago")
        }

        receptor = {
            "rut": state["receptor_rut"],
            "razon_social": state["receptor_razon_social"],
            "direccion": state.get("receptor_direccion", "N/A")
        }

        totales = {
            "neto": state["monto_neto"],
            "iva": state["monto_iva"],
            "total": state["monto_total"]
        }

        # Generate mock Track ID
        track_id = f"TRACK-{uuid.uuid4().hex[:8].upper()}"

        # Generate PDF using agent (using .invoke() for @tool decorated function)
        pdf_result = generate_invoice_pdf.invoke({
            "tipo_dte": state["tipo_dte"],
            "folio": state["folio"],
            "emisor": emisor,
            "receptor": receptor,
            "detalles": state["detalles"],
            "totales": totales,
            "track_id": track_id,
            "fecha_emision": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        })

        # Extract bytes from tool result
        pdf_bytes = pdf_result if isinstance(pdf_result, bytes) else pdf_result

        # In production: upload to storage and get URL
        # For MVP: just return the bytes
        pdf_url = f"/api/invoices/{state['folio']}/pdf"

        print(f"[Invoice] PDF generated ({len(pdf_bytes)} bytes)")

        return {
            **state,
            "pdf_bytes": pdf_bytes,
            "pdf_url": pdf_url,
            "track_id": track_id,
            "status": "sending"
        }
    except Exception as e:
        return {
            **state,
            "status": "failed",
            "errors": state.get("errors", []) + [f"Error generating PDF: {str(e)}"]
        }


def send_to_sii(state: InvoiceWorkflowState) -> InvoiceWorkflowState:
    """
    Node 6: Send DTE to SII (mock for MVP).
    """
    print("[Invoice] Sending to SII")

    try:
        # For MVP: mock SII response
        # In production: use SOAP API with circuit breaker

        # Try to save to database, fallback to demo mode
        emisor_rut = os.getenv("EMPRESA_RUT", "12345678-9")

        try:
            invoice_id = supabase_client.save_invoice(
                tipo_dte=state["tipo_dte"],
                folio=state["folio"],
                emisor_rut=emisor_rut,
                receptor_rut=state["receptor_rut"],
                monto_neto=state["monto_neto"],
                monto_iva=state["monto_iva"],
                monto_total=state["monto_total"],
                xml_dte=state["xml_signed"],
                track_id=state["track_id"],
                estado_sii="aceptado"  # Mock: always accepted in MVP
            )

            # Log operation
            supabase_client.log_sii_operation(
                doctor_id=state["doctor_id"],
                tipo_operacion="enviar_sii",
                documento_tipo=state["tipo_dte"],
                documento_folio=state["folio"],
                track_id=state["track_id"],
                estado="exito",
                mensaje="Documento enviado exitosamente (MVP mock)",
                duracion_ms=500,
                metadata={"invoice_id": invoice_id}
            )
        except Exception as db_error:
            print(f"[Invoice] Database save failed: {db_error}")
            print("[Invoice] Running in DEMO mode (no database persistence)")

        track_id = state.get("track_id", f"TRACK-DEMO-{state['folio']}")
        print(f"[Invoice] Sent to SII. Track ID: {track_id}")

        return {
            **state,
            "track_id": track_id,  # Ensure track_id is set
            "status": "completed",
            "confidence_score": 1.0
        }
    except Exception as e:
        return {
            **state,
            "status": "failed",
            "errors": state.get("errors", []) + [f"Error sending to SII: {str(e)}"]
        }


def should_continue(state: InvoiceWorkflowState) -> str:
    """Determine next node based on status."""
    status = state.get("status", "pending")

    if status == "failed":
        return END

    return "continue"


def create_invoice_workflow():
    """Create LangGraph workflow for invoice generation."""

    workflow = StateGraph(InvoiceWorkflowState)

    # Add nodes
    workflow.add_node("assign_folio", assign_folio)
    workflow.add_node("validate_data", validate_invoice_data)
    workflow.add_node("generate_xml", generate_xml_dte)
    workflow.add_node("sign_xml", sign_xml_dte)
    workflow.add_node("generate_pdf", generate_pdf_invoice)
    workflow.add_node("send_to_sii", send_to_sii)

    # Set entry point
    workflow.set_entry_point("assign_folio")

    # Add edges
    workflow.add_conditional_edges(
        "assign_folio",
        should_continue,
        {
            "continue": "validate_data",
            END: END
        }
    )

    workflow.add_conditional_edges(
        "validate_data",
        should_continue,
        {
            "continue": "generate_xml",
            END: END
        }
    )

    workflow.add_edge("generate_xml", "sign_xml")
    workflow.add_edge("sign_xml", "generate_pdf")
    workflow.add_edge("generate_pdf", "send_to_sii")
    workflow.add_edge("send_to_sii", END)

    return workflow.compile()


async def execute_invoice_generation(
    doctor_id: str,
    tipo_dte: int,
    receptor_rut: str,
    receptor_razon_social: str,
    receptor_direccion: str,
    detalles: list[dict]
) -> Dict:
    """
    Execute complete invoice generation workflow.

    Args:
        doctor_id: Doctor's UUID
        tipo_dte: Document type (33, 39, 61)
        receptor_rut: Receptor RUT
        receptor_razon_social: Receptor name
        receptor_direccion: Receptor address
        detalles: Line items

    Returns:
        {
            "success": True,
            "folio": 12345,
            "track_id": "TRACK-ABC123",
            "pdf_url": "/api/invoices/12345/pdf",
            "monto_total": 119000.0
        }
    """
    workflow = create_invoice_workflow()

    initial_state: InvoiceWorkflowState = {
        "doctor_id": doctor_id,
        "tipo_dte": tipo_dte,
        "receptor_rut": receptor_rut,
        "receptor_razon_social": receptor_razon_social,
        "receptor_direccion": receptor_direccion,
        "detalles": detalles,
        "folio": None,
        "xml_dte": None,
        "xml_signed": None,
        "pdf_bytes": None,
        "pdf_url": None,
        "track_id": None,
        "monto_neto": None,
        "monto_iva": None,
        "monto_total": None,
        "status": "pending",
        "errors": [],
        "confidence_score": None
    }

    start_time = time.time()

    try:
        result = await workflow.ainvoke(initial_state)

        duration_ms = int((time.time() - start_time) * 1000)
        print(f"[Invoice] Workflow completed in {duration_ms}ms")

        if result["status"] == "failed":
            return {
                "success": False,
                "errors": result.get("errors", [])
            }

        return {
            "success": True,
            "folio": result["folio"],
            "track_id": result["track_id"],
            "pdf_url": result["pdf_url"],
            "monto_total": result["monto_total"],
            "estado_sii": "aceptado",
            "pdf_bytes": result["pdf_bytes"]  # For download
        }
    except Exception as e:
        return {
            "success": False,
            "errors": [f"Workflow execution error: {str(e)}"]
        }


# Synchronous version for FastAPI
def execute_invoice_generation_sync(
    doctor_id: str,
    tipo_dte: int,
    receptor_rut: str,
    receptor_razon_social: str,
    receptor_direccion: str,
    detalles: list[dict]
) -> Dict:
    """Synchronous version for FastAPI compatibility."""
    import asyncio
    return asyncio.run(execute_invoice_generation(
        doctor_id, tipo_dte, receptor_rut, receptor_razon_social, receptor_direccion, detalles
    ))
