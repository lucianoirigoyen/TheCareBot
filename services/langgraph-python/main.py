"""
FastAPI Server for LangGraph Workflows.
Exposes Chilean SII invoicing workflows as REST endpoints.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import workflows
from graphs.autofill_workflow import execute_autofill_sync
from graphs.invoice_workflow import execute_invoice_generation_sync

# Initialize FastAPI
app = FastAPI(
    title="TheCareBot LangGraph API",
    description="Chilean SII Electronic Invoicing with Intelligent Autofill",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic models
class AutofillRequest(BaseModel):
    doctor_id: str = Field(..., description="Doctor's UUID")
    campo: str = Field(..., description="Field name to autocomplete")
    current_value: str = Field(default="", description="Current user input")
    contexto: Dict = Field(default_factory=dict, description="Context metadata")


class DetalleItem(BaseModel):
    descripcion: str = Field(..., description="Service description")
    cantidad: int = Field(..., gt=0, description="Quantity")
    precio: float = Field(..., gt=0, description="Unit price")
    total: float = Field(..., gt=0, description="Line total")


class InvoiceRequest(BaseModel):
    doctor_id: str = Field(..., description="Doctor's UUID")
    tipo_dte: int = Field(..., description="Document type (33=Factura, 39=Boleta, 61=Nota Crédito)")
    receptor_rut: str = Field(..., description="Receptor RUT")
    receptor_razon_social: str = Field(..., description="Receptor legal name")
    receptor_direccion: Optional[str] = Field(default="", description="Receptor address")
    detalles: List[DetalleItem] = Field(..., min_items=1, description="Line items")


# Health check endpoint
@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "langgraph-python",
        "version": "1.0.0"
    }


# Autofill prediction endpoint
@app.post("/api/invoke/autofill")
def autofill_predict(request: AutofillRequest):
    """
    Intelligent autofill prediction endpoint.

    Uses LangGraph workflow with Claude AI to predict field values
    based on historical patterns and context.
    """
    try:
        result = execute_autofill_sync(
            doctor_id=request.doctor_id,
            campo=request.campo,
            current_value=request.current_value,
            contexto=request.contexto
        )

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Autofill error: {str(e)}")


# Invoice generation endpoint
@app.post("/api/invoke/generate-invoice")
def generate_invoice(request: InvoiceRequest):
    """
    Generate Chilean SII electronic invoice.

    Uses LangGraph workflow to:
    1. Assign folio
    2. Validate data
    3. Generate XML DTE
    4. Sign with certificate
    5. Generate PDF
    6. Send to SII (mock in MVP)
    """
    try:
        # Convert detalles to dict
        detalles_dict = [d.model_dump() for d in request.detalles]

        result = execute_invoice_generation_sync(
            doctor_id=request.doctor_id,
            tipo_dte=request.tipo_dte,
            receptor_rut=request.receptor_rut,
            receptor_razon_social=request.receptor_razon_social,
            receptor_direccion=request.receptor_direccion or "",
            detalles=detalles_dict
        )

        # Don't return pdf_bytes in JSON (too large)
        if "pdf_bytes" in result:
            del result["pdf_bytes"]

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Invoice generation error: {str(e)}")


# Download PDF endpoint
@app.post("/api/invoke/generate-invoice-pdf")
def generate_invoice_pdf(request: InvoiceRequest):
    """
    Generate invoice and return PDF directly.
    """
    try:
        detalles_dict = [d.model_dump() for d in request.detalles]

        result = execute_invoice_generation_sync(
            doctor_id=request.doctor_id,
            tipo_dte=request.tipo_dte,
            receptor_rut=request.receptor_rut,
            receptor_razon_social=request.receptor_razon_social,
            receptor_direccion=request.receptor_direccion or "",
            detalles=detalles_dict
        )

        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("errors", ["Unknown error"]))

        # Return PDF as binary response
        pdf_bytes = result.get("pdf_bytes")
        if not pdf_bytes:
            raise HTTPException(status_code=500, detail="PDF generation failed")

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=boleta_{result['folio']}.pdf"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation error: {str(e)}")


# Learning endpoint (increment pattern frequency)
@app.post("/api/learn/pattern")
def learn_pattern(
    doctor_id: str,
    campo: str,
    valor: str,
    contexto: Dict
):
    """
    Learning endpoint: increment frequency when user selects a suggestion.
    """
    try:
        from tools.supabase_client import SupabaseClient

        supabase_client = SupabaseClient()
        success = supabase_client.increment_pattern_frequency(
            doctor_id=doctor_id,
            campo=campo,
            valor=valor,
            contexto=contexto
        )

        return {"success": success}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Learning error: {str(e)}")


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))

    print(f"""
    ╔══════════════════════════════════════════════════════════╗
    ║  TheCareBot LangGraph API Server                         ║
    ║  Chilean SII Electronic Invoicing                        ║
    ╠══════════════════════════════════════════════════════════╣
    ║  Server: http://{host}:{port}                    ║
    ║  Docs:   http://{host}:{port}/docs               ║
    ╚══════════════════════════════════════════════════════════╝
    """)

    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True,
        log_level="info"
    )
