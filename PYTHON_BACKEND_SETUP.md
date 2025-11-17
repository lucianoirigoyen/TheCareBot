# 🐍 Python Backend Setup Guide

## ⚠️ Current Issue

You're seeing this error in the Next.js app:

```
Error de conexión
Verifique que el servidor Python esté corriendo en puerto 8000
```

**Reason:** The Python FastAPI server is not running. The Next.js frontend tries to connect to `http://localhost:8000` but the server isn't started.

---

## 🚀 Quick Fix (Start Python Server)

### Step 1: Navigate to Python Service Directory

```bash
cd services/langgraph-python
```

### Step 2: Activate Virtual Environment

**On macOS/Linux:**

```bash
source venv/bin/activate
```

**On Windows:**

```bash
venv\Scripts\activate
```

### Step 3: Install Dependencies (if not already installed)

```bash
pip install -r requirements.txt
```

### Step 4: Create .env File (if missing)

```bash
# Create .env file
touch .env

# Add these required variables
echo "ANTHROPIC_API_KEY=your_api_key_here" >> .env
echo "SUPABASE_URL=your_supabase_url" >> .env
echo "SUPABASE_SERVICE_ROLE_KEY=your_service_key" >> .env
echo "EMPRESA_RUT=76.123.456-7" >> .env
echo "EMPRESA_RAZON_SOCIAL=Clínica Dental Dr. Pérez" >> .env
echo "EMPRESA_GIRO=Servicios Odontológicos" >> .env
```

### Step 5: Start the Server

```bash
python main.py
```

You should see:

```
╔══════════════════════════════════════════════════════════╗
║  TheCareBot LangGraph API Server                         ║
║  Chilean SII Electronic Invoicing                        ║
╠══════════════════════════════════════════════════════════╣
║  Server: http://0.0.0.0:8000                             ║
║  Docs:   http://0.0.0.0:8000/docs                        ║
╚══════════════════════════════════════════════════════════╝
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

---

## ✅ Verify Server is Running

### Option 1: Browser

Open: **http://localhost:8000/health**

Expected response:

```json
{
  "status": "healthy",
  "service": "langgraph-python",
  "version": "1.0.0"
}
```

### Option 2: API Documentation

Open: **http://localhost:8000/docs**

You should see the FastAPI interactive documentation (Swagger UI).

### Option 3: Command Line

```bash
curl http://localhost:8000/health
```

---

## 🔄 Complete Development Workflow

### Terminal 1: Python Backend

```bash
cd services/langgraph-python
source venv/bin/activate
python main.py
```

### Terminal 2: Next.js Frontend

```bash
# In project root
npm run dev
```

Now both servers should be running:

- ✅ Python Backend: `http://localhost:8000`
- ✅ Next.js Frontend: `http://localhost:3000`

---

## 🎯 Two Options for PDF Generation

Now you have **TWO independent PDF generation systems**:

### Option 1: Client-Side PDF (NEW - Implemented Today)

**Location:** `src/utils/pdf-generator-sii.ts`

**Advantages:**

- ✅ No backend required
- ✅ Faster (no network latency)
- ✅ Works offline
- ✅ Better privacy (no data leaves browser)
- ✅ Modern TypeScript implementation

**Usage:**

```typescript
import { generateSIIPDF } from "@/utils/pdf-generator-sii";

const { blob, metadata } = generateSIIPDF(invoiceData);
// Use blob directly in browser
```

**Demo Page:** `http://localhost:3000/facturacion/preview-demo`

**Requirements:** `npm install jspdf`

---

### Option 2: Server-Side PDF (Existing Python Backend)

**Location:** `services/langgraph-python/pdf_generator_sii.py`

**Advantages:**

- ✅ Full LangGraph workflow orchestration
- ✅ Database integration (Supabase)
- ✅ SII XML generation
- ✅ Digital signature support (production)
- ✅ Audit logging
- ✅ Claude AI autofill

**Usage:**

```typescript
const response = await fetch("http://localhost:8000/api/invoke/generate-invoice-pdf", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(invoiceData),
});

const pdfBlob = await response.blob();
```

**Requirements:**

- Python server running on port 8000
- Environment variables configured

---

## 🔀 Integration Strategy (Recommended)

### Hybrid Approach: Use Both!

```typescript
// 1. Use client-side PDF for instant preview
import { PDFPreviewScreen } from "@/components/facturacion/PDFPreviewScreen";

// User previews PDF instantly (client-side)
<PDFPreviewScreen invoiceData={data} />;

// 2. When user clicks "Accept", submit to Python backend
const handleAccept = async () => {
  // Send to backend for:
  // - Folio assignment
  // - Database storage
  // - SII submission
  // - Audit logging
  const response = await fetch("http://localhost:8000/api/invoke/generate-invoice", {
    method: "POST",
    body: JSON.stringify(invoiceData),
  });

  const result = await response.json();

  // Show success with official folio
  alert(`Boleta ${result.folio} generada exitosamente!`);
};
```

**Benefits:**

- ✅ **Fast preview** (client-side, instant)
- ✅ **Official submission** (server-side, with folio)
- ✅ **Best UX** (immediate feedback + backend validation)

---

## 📁 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User Browser                             │
├─────────────────────────────────────────────────────────────┤
│  Next.js App (localhost:3000)                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  InvoiceWizardAI Component                          │   │
│  │  ├─ Step 1: Patient Info                            │   │
│  │  ├─ Step 2: Services                                │   │
│  │  ├─ Step 3: Review                                  │   │
│  │  └─ [Preview PDF Button] ────────────┐              │   │
│  └──────────────────────────────────────│──────────────┘   │
│                                          │                   │
│  ┌──────────────────────────────────────▼──────────────┐   │
│  │  PDFPreviewScreen (NEW)                            │   │
│  │  ├─ Generate PDF (client-side with jsPDF)         │   │
│  │  ├─ Display in iframe                              │   │
│  │  ├─ Zoom controls                                  │   │
│  │  └─ [Accept Button] ──────────────┐                │   │
│  └───────────────────────────────────│────────────────┘   │
│                                       │                     │
└───────────────────────────────────────│─────────────────────┘
                                        │
                    HTTP POST           │
                    (Invoice Data)      │
                                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Python Backend (localhost:8000)                            │
├─────────────────────────────────────────────────────────────┤
│  FastAPI Server (main.py)                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  POST /api/invoke/generate-invoice                  │   │
│  │  ├─ LangGraph Workflow                              │   │
│  │  ├─ Assign Folio (Database)                         │   │
│  │  ├─ Validate Data                                   │   │
│  │  ├─ Generate XML (SII format)                       │   │
│  │  ├─ Generate PDF (ReportLab)                        │   │
│  │  └─ Store in Supabase                               │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Database: Supabase PostgreSQL                              │
│  AI: Claude API (Anthropic)                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Troubleshooting

### Issue: "Module not found" when starting Python server

**Solution:**

```bash
cd services/langgraph-python
source venv/bin/activate
pip install -r requirements.txt
```

### Issue: "No module named 'graphs.invoice_workflow'"

**Solution:** The file might be missing. Create a mock version:

```bash
cd services/langgraph-python
mkdir -p graphs
touch graphs/invoice_workflow.py
```

Then add minimal code:

```python
# graphs/invoice_workflow.py
def execute_invoice_generation_sync(**kwargs):
    return {
        "success": True,
        "folio": "MOCK-123",
        "track_id": "MOCK-TRACK-ID",
        "monto_total": 35000,
        "estado_sii": "aceptado (mock)",
        "pdf_bytes": b""  # Empty for now
    }
```

### Issue: "Connection refused" when Next.js tries to connect

**Solution:** Make sure Python server is actually running:

```bash
# Check if port 8000 is in use
lsof -i :8000

# Should show python process
```

### Issue: CORS errors in browser console

**Solution:** Python server already has CORS configured for localhost:3000. Restart the server:

```bash
# Stop: Ctrl+C
# Start again: python main.py
```

---

## 📋 Environment Variables Checklist

### Python Backend (.env in services/langgraph-python/)

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...          # Your Claude API key
SUPABASE_URL=https://...              # Your Supabase project URL
SUPABASE_SERVICE_ROLE_KEY=eyJ...     # Service role key

# Optional (defaults work for testing)
EMPRESA_RUT=76.123.456-7
EMPRESA_RAZON_SOCIAL=Clínica Dental Dr. Pérez
EMPRESA_GIRO=Servicios Odontológicos
HOST=0.0.0.0
PORT=8000
```

### Next.js Frontend (.env.local in project root)

```bash
# If you have any Next.js specific env vars
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 🎯 Testing Checklist

### 1. Test Python Backend Directly

```bash
# Health check
curl http://localhost:8000/health

# Test autofill (should work even without DB)
curl -X POST http://localhost:8000/api/invoke/autofill \
  -H "Content-Type: application/json" \
  -d '{
    "doctor_id": "test-123",
    "campo": "razon_social",
    "current_value": "",
    "contexto": {}
  }'
```

### 2. Test Client-Side PDF

```bash
# In project root
npm install jspdf
npm run dev
```

Open: `http://localhost:3000/facturacion/preview-demo`

Should see PDF preview instantly (no Python server needed).

### 3. Test Full Integration

1. Start Python server: `python main.py` (in services/langgraph-python)
2. Start Next.js: `npm run dev` (in project root)
3. Open: `http://localhost:3000/facturacion/nueva`
4. Fill form and click "Generar y Enviar al SII"
5. Should connect to Python backend successfully

---

## 🚦 Quick Status Check

Run this to see what's running:

```bash
# Check Python server
curl http://localhost:8000/health 2>/dev/null && echo "✅ Python server OK" || echo "❌ Python server not running"

# Check Next.js
curl http://localhost:3000 2>/dev/null && echo "✅ Next.js OK" || echo "❌ Next.js not running"
```

---

## 📞 Need Help?

### Common Commands Reference

```bash
# Navigate to Python service
cd services/langgraph-python

# Activate venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start server
python main.py

# In another terminal - Start Next.js
npm run dev

# Test client-side PDF (no Python needed)
# Open: http://localhost:3000/facturacion/preview-demo
```

---

## ✅ Success Checklist

You've successfully set up everything when:

- ✅ `curl http://localhost:8000/health` returns `{"status": "healthy"}`
- ✅ `http://localhost:3000` loads Next.js app
- ✅ `http://localhost:3000/facturacion/preview-demo` shows PDF preview
- ✅ `http://localhost:3000/facturacion/nueva` can submit without connection errors
- ✅ Both terminals show running processes without errors

---

## 🎉 You Now Have

1. **Client-Side PDF Generation** (fast, instant preview)
2. **Server-Side PDF Generation** (official, with database)
3. **Professional Preview Component** (zoom, fullscreen, download)
4. **Complete Documentation** (5 comprehensive guides)
5. **Demo Page** (ready to test)
6. **Integration Examples** (copy-paste ready)

**Next Step:** Start both servers and test the demo page!

```bash
# Terminal 1
cd services/langgraph-python && source venv/bin/activate && python main.py

# Terminal 2
npm run dev
```

Then open: `http://localhost:3000/facturacion/preview-demo`

---

**Version**: 1.0.0
**Last Updated**: January 16, 2025
