# TheCareBot LangGraph Python Service

Chilean SII Electronic Invoicing System with Intelligent Autofill using LangGraph and Claude AI.

## Architecture

This service uses **Python LangGraph** (not TypeScript) to orchestrate multi-agent workflows:

### Multi-Agent Workflows

1. **Autofill Workflow** (`graphs/autofill_workflow.py`)
   - Pattern Analyzer Agent: Queries historical data
   - Context Enricher Agent: Adds day of week, time, consultation type
   - Confidence Scorer Agent: Uses Claude AI to validate predictions
   - Returns top 5 suggestions with confidence >= 0.6

2. **Invoice Generation Workflow** (`graphs/invoice_workflow.py`)
   - Folio Assigner: Gets next available folio (atomic)
   - Data Validator: Validates RUT, amounts, required fields
   - XML Generator: Builds SII-compliant XML
   - XML Signer: Digital signature (mock in MVP)
   - PDF Generator: Creates professional PDF with QR code
   - SII Sender: Sends to SII API (mock in MVP)

### Agents

- **PDF Generator** (`agents/pdf_generator.py`): ReportLab-based PDF generation
- **Autofill Predictor** (`agents/autofill_predictor.py`): Claude AI pattern analysis

## Installation

```bash
cd services/langgraph-python

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment variables
cp .env.example .env
# Edit .env with your credentials
```

## Configuration

Edit `.env` file:

```bash
ANTHROPIC_API_KEY=your_claude_api_key_here
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

EMPRESA_RUT=12345678-9
EMPRESA_RAZON_SOCIAL=Clínica Dental TheCareBot
EMPRESA_GIRO=Servicios Odontológicos
```

## Running the Server

```bash
# Activate virtual environment
source venv/bin/activate

# Run FastAPI server
python main.py
```

Server will start on `http://localhost:8000`

API documentation: `http://localhost:8000/docs`

## API Endpoints

### Health Check
```bash
GET /health
```

### Intelligent Autofill
```bash
POST /api/invoke/autofill
Content-Type: application/json

{
  "doctor_id": "uuid-here",
  "campo": "descripcion_servicio",
  "current_value": "Limp",
  "contexto": {
    "day_of_week": 1,
    "period_of_day": "morning"
  }
}
```

Response:
```json
{
  "success": true,
  "predictions": [
    {
      "valor": "Limpieza dental",
      "confidence": 0.92,
      "frecuencia": 45,
      "contexto_match": true,
      "icon": "🤖📊"
    }
  ]
}
```

### Generate Invoice
```bash
POST /api/invoke/generate-invoice
Content-Type: application/json

{
  "doctor_id": "uuid-here",
  "tipo_dte": 39,
  "receptor_rut": "12345678-9",
  "receptor_razon_social": "Juan Pérez",
  "receptor_direccion": "Av. Providencia 123",
  "detalles": [
    {
      "descripcion": "Limpieza dental",
      "cantidad": 1,
      "precio": 30000,
      "total": 30000
    }
  ]
}
```

Response:
```json
{
  "success": true,
  "folio": 12345,
  "track_id": "TRACK-ABC123",
  "pdf_url": "/api/invoices/12345/pdf",
  "monto_total": 35700.0,
  "estado_sii": "aceptado"
}
```

### Download PDF
```bash
POST /api/invoke/generate-invoice-pdf
# Same body as generate-invoice
# Returns PDF file directly
```

## Integration with Next.js

The Next.js application calls this Python service via API routes:

```typescript
// src/app/api/python/autofill/route.ts
const response = await fetch('http://localhost:8000/api/invoke/autofill', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ doctor_id, campo, current_value, contexto })
});
```

## Development

### Project Structure

```
langgraph-python/
├── main.py                 # FastAPI server
├── requirements.txt        # Dependencies
├── .env.example           # Environment template
├── agents/                # AI agents
│   ├── pdf_generator.py
│   └── autofill_predictor.py
├── graphs/                # LangGraph workflows
│   ├── autofill_workflow.py
│   └── invoice_workflow.py
├── tools/                 # External integrations
│   └── supabase_client.py
└── state/                 # Workflow states
    └── workflow_state.py
```

### Testing

```bash
# Test autofill endpoint
curl -X POST http://localhost:8000/api/invoke/autofill \
  -H "Content-Type: application/json" \
  -d '{
    "doctor_id": "test-uuid",
    "campo": "razon_social",
    "current_value": "",
    "contexto": {}
  }'
```

## Production Deployment

### TODO for Production:
1. Replace mock XML signature with real .pfx certificate
2. Implement actual SII SOAP API integration
3. Add circuit breaker for SII API (using `opossum` or `circuitbreaker` library)
4. Upload PDFs to cloud storage (S3/GCS)
5. Add authentication middleware
6. Enable HTTPS
7. Add rate limiting
8. Implement proper error monitoring (Sentry)

## Chilean Compliance

- **RUT Validation**: All RUTs validated with check digit
- **Folio Management**: Atomic folio assignment prevents duplicates
- **Audit Logging**: All operations logged to `logs_sii` table
- **Data Encryption**: Certificates stored encrypted in database
- **SII Standards**: XML follows SII DTE schema specification

## License

Proprietary - TheCareBot Medical AI Assistant
