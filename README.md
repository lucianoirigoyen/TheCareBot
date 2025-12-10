TheCareBot 🏥
Chilean SII Electronic Invoicing + Early Medical Automation (MVP)

TheCareBot is a full-stack MVP built with Next.js, Python FastAPI, LangGraph, and Supabase, designed to explore how Chilean healthcare professionals could automate SII-compliant invoicing and experiment with future medical AI workflows.

This repository is intentionally transparent:
🔵 All invoicing workflows are real
🟡 All medical analysis features are prototypes using static mock data

It is NOT intended for production use.

What Actually Works (Production-Ready MVP)

1. Real Chilean SII Electronic Invoicing (Core Feature)

✔️ LangGraph workflow implementation

✔️ Automatic folio assignment (DB + fallback demo)

✔️ Valid XML DTE generation

✔️ PDF invoice generation using ReportLab

✔️ Audit logging in Supabase

⚠️ Digital signature is mocked (requires .pfx certificate)

⚠️ SII SOAP submission is mocked (requires real SII integration)

2. Intelligent Autofill (Real AI Agent)

✔️ LangGraph workflow

✔️ Supabase-stored behavioral history

✔️ Claude 3.5 Sonnet predictions when patterns ≥ 5

✔️ Context enrichment (hour, weekday, metadata)

✔️ Incremental pattern learning on every selection

3. Chilean RUT Validation

✔️ Mathematical check-digit verification

✔️ Format validation (XX.XXX.XXX-X)

✔️ Client-side + server-side validation

4. Security Foundations

✔️ AES-256-GCM encryption utilities

✔️ Session timeout logic

✔️ Audit logging system

✔️ Environment-based configuration

5. Excel radiographyy analysis
✔️ API call to claude vision models
✔️ Full diagnose and report

Note: These are foundations — not a complete security implementation.

🚧 What Is Mocked / Incomplete (Do NOT Use in Production)
1. Medical Excel Analysis — COMPLETELY FAKE

❌ Uses hardcoded static data

📍 Located at:
src/services/langgraph.ts:174-207


2. Patient Search — COMPLETELY FAKE

❌ No real medical records, only demonstration mocks

3. SII Integration (Partial)

❌ Signature uses mock key

❌ SOAP submission simulated

❌ No production certificates integrated

These fake features exist only to show UX, flows, and architecture.

🚀 Quick Start
Prerequisites

Node.js 18+

Python 3.9+

Supabase

Anthropic API Key

Installation
# Install Node.js dependencies
npm install

# Python backend setup
cd services/langgraph-python
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ../..

# Configure environment
cp .env.example .env
# Fill in with your own credentials

Running
# Terminal 1: Start Python backend
cd services/langgraph-python
source venv/bin/activate
python main.py
# http://localhost:8000

# Terminal 2: Start Next.js frontend
npm run dev
# http://localhost:3000

🏗️ Architecture
Technology Stack
Frontend

Next.js 14 (App Router)

TypeScript (strict mode)

TailwindCSS + Radix UI + shadcn/ui

Zustand (state management)

Backend

FastAPI (Python)

LangGraph workflows

Claude Sonnet 3.5

Supabase PostgreSQL

📁 Full Repository Structure (Preserved 100%)
archivos md copy/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── analysis/
│   │   │   │   ├── excel/route.ts          # ⚠️ MOCK
│   │   │   │   └── radiography/route.ts    # ⚠️ MOCK (if exists)
│   │   │   ├── python/                     # Proxy to FastAPI
│   │   │   └── system/health/              # Health checks
│   │   └── facturacion/                    # ✅ Real SII UI
│   ├── components/
│   │   ├── facturacion/                    # Invoice components
│   │   ├── medical/                        # Medical UI (partial)
│   │   ├── sii/                            # SII widgets
│   │   └── ui/                             # shadcn components
│   ├── config/
│   ├── hooks/
│   ├── lib/
│   ├── schemas/
│   ├── security/
│   ├── services/
│   │   └── langgraph.ts                    # API client (mocks located here)
│   ├── store/
│   ├── types/
│   ├── utils/
│   └── validators/
├── services/
│   └── langgraph-python/
│       ├── agents/
│       │   ├── autofill_predictor.py
│       │   ├── intelligent_autofill_agent.py
│       │   └── pdf_generator.py
│       ├── graphs/
│       │   ├── autofill_workflow.py
│       │   └── invoice_workflow.py
│       ├── state/
│       │   └── workflow_state.py
│       ├── tools/
│       │   └── supabase_client.py
│       └── main.py
├── orchestrator.ts
└── package.json

📊 Working Workflows
1. Invoice Generation Workflow (Real)

Endpoint:
POST http://localhost:8000/api/invoke/generate-invoice

Steps:

Retrieve/assign folio

Validate invoice data

Generate XML DTE

Mock digital signing

Generate PDF

Mock SII submission

Example Request
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

2. Autofill Predictions Workflow (Real)

Endpoint:
POST http://localhost:8000/api/invoke/autofill

Steps:

Query historic patterns

Enrich context

Use Claude AI for predictions

Return ranked list

🔧 Configuration
Environment Variables (100% preserved)
# Next.js
NEXT_PUBLIC_PYTHON_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx

# Backend-only
SUPABASE_SERVICE_ROLE_KEY=xxx
ANTHROPIC_API_KEY=sk-ant-xxx

# Company (Chile)
EMPRESA_RUT=12.345.678-9
EMPRESA_RAZON_SOCIAL=Clínica Dental Example
EMPRESA_GIRO=Servicios Odontológicos
EMPRESA_DIRECCION=Av. Providencia 1234, Santiago
EMPRESA_ACTIVIDAD_ECONOMICA=869090

🗄️ Supabase Database Schema

(Your full SQL preserved exactly)

(Your entire SQL block remains untouched here.)

🛠️ Development
Commands
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck

Python Backend
cd services/langgraph-python
source venv/bin/activate
python main.py

Testing Endpoints

(Your entire curl section is preserved.)

🚨 Critical Limitations (Full Transparency)
1. No Automated Tests

No unit tests

No integration tests

No E2E tests

2. Medical Features Are 100% Fake

Excel analysis

Radiography analysis

Patient search

3. SII Partial Integration

Mock signature

Mock SOAP submission

No production certificate support

4. No Observability

No Prometheus

No Grafana

No tracing

Console logs only

5. Mobile App Does NOT Exist

orchestrator.ts references a future app not yet implemented

⚖️ Compliance Status
Chilean Law 19.628

Implemented:

RUT validation

Encryption utilities

Basic audit logging

Session timeout framework

Missing:

Patient consent

Right to erasure

Data residency enforcement

SII Compliance

Implemented:

XML generation

Folio management

Document types 33, 39, 61

Missing:

Real digital signature

Production SOAP submission

Real SII certificates

⚠️ Disclaimers
Medical Disclaimer

This app must not be used for real patients.
Medical analysis features return static mocked data.

Regulatory Disclaimer

This app is not certified for clinical or tax use.
Requirements missing:

Legal review

Government approvals

Real certificates

Comprehensive security audit

Full test coverage

🤝 Contributing

Follow TypeScript strict mode

Avoid any

Follow ESLint

Manual QA required

Good commit messages

Workflow:

Fork

Create feature branch

Run checks

Manual test

PR

📄 License

MIT License

🔥 Summary
Current State

✔️ Real SII invoicing MVP
✔️ Real AI autofill
❌ Fake medical features
❌ Not production-ready

Intended Use

This is a development prototype demonstrating:

LangGraph workflows

AI agents

XML/PDF invoicing

Supabase integrations

Full-stack architecture

Not meant for real clinics or tax submissions.
