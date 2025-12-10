# TheCareBot 🏥

**Chilean SII Electronic Invoicing System with Medical Management (MVP)**

A Next.js + Python FastAPI application for Chilean healthcare professionals featuring **real** SII-compliant electronic invoicing and **planned** medical analysis capabilities.

---

## ⚠️ ACTUAL PROJECT STATUS

### ✅ **What Actually Works** (Production-Ready)

1. **Chilean SII Electronic Invoicing**
   - ✅ Real LangGraph workflow implementation
   - ✅ Automatic folio assignment (database + fallback)
   - ✅ SII-compliant XML DTE generation
   - ✅ PDF invoice generation (ReportLab)
   - ✅ Audit logging to Supabase
   - ⚠️ Mock digital signature (needs real .pfx certificate)
   - ⚠️ Mock SII SOAP submission (needs real integration)

2. **Intelligent Autofill**
   - ✅ Real LangGraph workflow
   - ✅ Historical pattern learning (Supabase)
   - ✅ Claude AI predictions (when patterns ≥ 5)
   - ✅ Context enrichment
   - ✅ Incremental learning from selections

3. **Chilean RUT Validation**
   - ✅ Mathematical check digit verification
   - ✅ Format validation (XX.XXX.XXX-X)
   - ✅ Client + server validation

4. **Security Basics**
   - ✅ AES-256-GCM encryption utilities
   - ✅ Session timeout configuration
   - ✅ Audit logging framework
   - ✅ Environment-based config

### 🚧 **What's Mock/Incomplete** (DO NOT USE IN PRODUCTION It'sm only a demo)

1. **Medical Excel Analysis** - **COMPLETELY FAKE**
   - ❌ Returns hardcoded mock data
   - 📍 Location: [src/services/langgraph.ts:174-207](src/services/langgraph.ts#L174-L207)

2. **Patient Search** - **COMPLETELY FAKE**
   - ❌ Returns hardcoded mock data

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.9+
- Supabase account
- Anthropic API key

### Installation

```bash
# Install Node.js dependencies
npm install

# Setup Python backend
cd services/langgraph-python
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ../..

# Configure environment
cp .env.example .env
# Edit .env with your credentials
```

### Running

```bash
# Terminal 1: Python backend
cd services/langgraph-python
source venv/bin/activate
python main.py
# Runs on http://localhost:8000

# Terminal 2: Next.js frontend
npm run dev
# Runs on http://localhost:3000
```

---

## 🏗️ Actual Architecture

### Technology Stack

**Frontend**
- Next.js 14 (App Router)
- TypeScript (strict mode)
- TailwindCSS + Radix UI + shadcn/ui
- Zustand (state management)

**Backend**
- Python FastAPI
- LangGraph workflows
- Anthropic Claude Sonnet 3.5
- Supabase PostgreSQL

### Real Project Structure

```
archivos md copy/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── analysis/
│   │   │   │   ├── excel/route.ts          # ⚠️ MOCK
│   │   │   │   └── radiography/route.ts    # ⚠️ MOCK (if exists)
│   │   │   ├── python/                     # Proxy to FastAPI
│   │   │   └── system/health/              # Health checks
│   │   └── facturacion/                    # ✅ Real SII invoicing UI
│   ├── components/
│   │   ├── facturacion/                    # Invoice components
│   │   ├── medical/                        # Medical UI (partial)
│   │   ├── sii/                            # SII components
│   │   └── ui/                             # shadcn components
│   ├── config/                             # API config
│   ├── hooks/                              # React hooks
│   ├── lib/                                # Utilities
│   ├── schemas/                            # Zod schemas
│   ├── security/                           # Encryption, audit
│   ├── services/
│   │   └── langgraph.ts                    # API client (mocks here)
│   ├── store/                              # Zustand stores
│   ├── types/                              # TypeScript types
│   ├── utils/                              # Utilities
│   └── validators/                         # RUT validation
├── services/
│   └── langgraph-python/
│       ├── agents/
│       │   ├── autofill_predictor.py       # ✅ Real
│       │   ├── intelligent_autofill_agent.py # ✅ Real
│       │   └── pdf_generator.py            # ✅ Real
│       ├── graphs/
│       │   ├── autofill_workflow.py        # ✅ Real LangGraph
│       │   └── invoice_workflow.py         # ✅ Real LangGraph
│       ├── state/
│       │   └── workflow_state.py           # State definitions
│       ├── tools/
│       │   └── supabase_client.py          # DB client
│       └── main.py                         # FastAPI server
├── orchestrator.ts                         # Planning tool (simulated)
└── package.json
```

---

## 📊 Working Workflows

### 1. Invoice Generation ✅

**Endpoint**: `POST http://localhost:8000/api/invoke/generate-invoice`

**Workflow** ([services/langgraph-python/graphs/invoice_workflow.py](services/langgraph-python/graphs/invoice_workflow.py)):
1. Assign Folio (DB or demo fallback)
2. Validate Invoice Data
3. Generate XML DTE
4. Sign XML (mock signature)
5. Generate PDF
6. Send to SII (mock)

**Request**:
```json
{
  "doctor_id": "uuid",
  "tipo_dte": 39,
  "receptor_rut": "12.345.678-9",
  "receptor_razon_social": "Juan Pérez",
  "receptor_direccion": "Santiago",
  "detalles": [
    {
      "descripcion": "Consulta dental",
      "cantidad": 1,
      "precio": 50000,
      "total": 50000
    }
  ]
}
```

### 2. Autofill Predictions ✅

**Endpoint**: `POST http://localhost:8000/api/invoke/autofill`

**Workflow** ([services/langgraph-python/graphs/autofill_workflow.py](services/langgraph-python/graphs/autofill_workflow.py)):
1. Query Historical Patterns (Supabase)
2. Enrich Context (time, day)
3. Calculate Predictions (Claude AI if ≥5 patterns)

**Request**:
```json
{
  "doctor_id": "uuid",
  "campo": "razon_social",
  "current_value": "Juan",
  "contexto": {}
}
```

---

## 🔧 Configuration

### Environment Variables

```bash
# Next.js
NEXT_PUBLIC_PYTHON_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx

# Server-only
SUPABASE_SERVICE_ROLE_KEY=xxx
ANTHROPIC_API_KEY=sk-ant-xxx

# Chilean Company Info
EMPRESA_RUT=12.345.678-9
EMPRESA_RAZON_SOCIAL=Clínica Dental Example
EMPRESA_GIRO=Servicios Odontológicos
EMPRESA_DIRECCION=Av. Providencia 1234, Santiago
EMPRESA_ACTIVIDAD_ECONOMICA=869090
```

### Database Schema (Supabase)

```sql
-- Autofill patterns
CREATE TABLE autofill_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID NOT NULL,
  campo TEXT NOT NULL,
  valor TEXT NOT NULL,
  frecuencia INTEGER DEFAULT 1,
  contexto JSONB,
  confidence_score DECIMAL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Folio management
CREATE TABLE folios_asignados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo_dte INTEGER NOT NULL,
  rut_empresa TEXT NOT NULL,
  folio_desde INTEGER NOT NULL,
  folio_hasta INTEGER NOT NULL,
  folio_actual INTEGER NOT NULL,
  estado TEXT DEFAULT 'activo',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Electronic invoices (boletas)
CREATE TABLE boletas_electronicas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  folio INTEGER NOT NULL,
  emisor_rut TEXT NOT NULL,
  receptor_rut TEXT NOT NULL,
  fecha_emision TIMESTAMPTZ DEFAULT NOW(),
  monto_neto DECIMAL NOT NULL,
  monto_iva DECIMAL NOT NULL,
  monto_total DECIMAL NOT NULL,
  xml_dte TEXT,
  track_id TEXT,
  estado_sii TEXT DEFAULT 'pendiente',
  glosa_estado TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Same structure for facturas_electronicas

-- SII operation logs
CREATE TABLE logs_sii (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID NOT NULL,
  tipo_operacion TEXT NOT NULL,
  documento_tipo INTEGER,
  documento_folio INTEGER,
  track_id TEXT,
  estado TEXT NOT NULL,
  mensaje TEXT,
  duracion_ms INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🛠️ Development

### Available Commands

```bash
npm run dev          # Start Next.js dev server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # ESLint
npm run typecheck    # TypeScript check
```

### Python Backend

```bash
cd services/langgraph-python
source venv/bin/activate
python main.py       # Start FastAPI
# Docs: http://localhost:8000/docs
```

### Testing Endpoints

```bash
# Health check
curl http://localhost:8000/health

# Invoice generation
curl -X POST http://localhost:8000/api/invoke/generate-invoice \
  -H "Content-Type: application/json" \
  -d '{
    "doctor_id": "test",
    "tipo_dte": 39,
    "receptor_rut": "12.345.678-9",
    "receptor_razon_social": "Test",
    "receptor_direccion": "Test",
    "detalles": [{
      "descripcion": "Test",
      "cantidad": 1,
      "precio": 10000,
      "total": 10000
    }]
  }'

# Autofill
curl -X POST http://localhost:8000/api/invoke/autofill \
  -H "Content-Type: application/json" \
  -d '{
    "doctor_id": "test",
    "campo": "razon_social",
    "current_value": "Juan",
    "contexto": {}
  }'
```

---

## 🚨 Critical Limitations

### What's Broken/Missing

1. **No Automated Tests**
   - Zero unit tests
   - Zero integration tests
   - Zero E2E tests

2. **Medical Features are Fake**
   - Excel analysis is hardcoded mock
   - Radiography analysis is hardcoded mock
   - Patient search is hardcoded mock

3. **No Mobile App**
   - No React Native app exists
   - No offline capabilities
   - orchestrator.ts references it but it doesn't exist

4. **Partial SII Integration**
   - Mock digital signature (needs real .pfx cert)
   - Mock SII submission (needs SOAP API)
   - Demo mode fallback everywhere

5. **No Observability**
   - No Prometheus
   - No Grafana
   - No distributed tracing
   - Basic console.log only

---

## 📋 Honest Roadmap

### Phase 1: Real Medical Excel Analysis (80-120 hours)
- [ ] Implement pandas Excel ingestion
- [ ] Add medical range validation (JSON config)
- [ ] Statistical anomaly detection (scipy)
- [ ] Trend analysis (statsmodels)
- [ ] Medical report generation
- [ ] Real LangGraph workflow

### Phase 2: Testing Infrastructure (40-60 hours)
- [ ] Unit tests (pytest, jest)
- [ ] Integration tests
- [ ] E2E tests
- [ ] CI/CD pipeline

### Phase 3: Production SII (60-80 hours)
- [ ] Real digital certificate integration
- [ ] SOAP API client for SII
- [ ] Certificate management
- [ ] Error handling & retry logic
- [ ] Full audit compliance

### Phase 4: Medical Image Analysis (80-100 hours)
- [ ] Image upload (Supabase Storage)
- [ ] Claude Vision API integration
- [ ] Medical image preprocessing
- [ ] DICOM support
- [ ] Specialist review workflow

### Phase 5: Mobile App (120-160 hours)
- [ ] React Native app
- [ ] SQLite offline storage
- [ ] Sync service
- [ ] Biometric auth
- [ ] Medical session management

---

## ⚖️ Chilean Compliance Status

### Law 19.628 (Data Protection)

- ✅ Session timeout framework exists
- ✅ RUT validation implemented
- ✅ Encryption utilities exist
- ✅ Audit logging framework exists
- ⚠️ Patient consent: NOT implemented
- ⚠️ Right to erasure: NOT implemented
- ⚠️ Data residency: NOT enforced

### SII Compliance

- ✅ Document types supported (33, 39, 61)
- ✅ Folio management
- ✅ XML DTE generation
- ⚠️ Digital signature: MOCK ONLY
- ⚠️ SII submission: MOCK ONLY
- ❌ Production certificates: NOT integrated

---

## ⚠️ Disclaimers

### Medical Disclaimer

**DO NOT USE FOR REAL PATIENTS.** The medical analysis features return fake hardcoded data. This is a development prototype only.

### Regulatory Disclaimer

This application **has NOT been certified** for:
- Chilean Law 19.628 compliance
- SII production use
- Medical data handling
- Clinical deployment

Production use requires:
- Legal compliance review
- Security audit
- Government approvals
- Production SII certificate
- Comprehensive testing

### Data Protection

- Session timeout exists but not enforced everywhere
- Encryption utilities exist but not used everywhere
- Audit logs exist but coverage incomplete
- No automated compliance monitoring

---

## 🤝 Contributing

### Standards

1. TypeScript strict mode (avoid `any`)
2. Follow ESLint config
3. Manual testing required (no automated tests yet)
4. Descriptive commits

### Workflow

1. Fork and create feature branch
2. Make changes
3. Run `npm run typecheck && npm run lint`
4. Test manually
5. Submit PR

---

## 📄 License

MIT License

---

**Current State**: Working SII invoicing MVP + Mock medical features
**Production Ready**: NO
**For Demo/Development Only**: YES

**Made for Chilean Healthcare Professionals** 🇨🇱
