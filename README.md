# TheCareBot 🏥

**Regulated Medical AI Assistant for Chilean Healthcare Professionals**

TheCareBot is a compliance-first medical AI assistant designed specifically for healthcare professionals in Chile. Built with multi-agent architecture, offline-first mobile capabilities, and strict adherence to Chilean medical data protection laws (Ley 19.628).

## 🚀 Quick Start

```bash
# Initialize TheCareBot project
npm run thecarebot:init

# Run in development mode
npm run dev

# Deploy to staging
./deploy.sh staging full

# Deploy to production  
./deploy.sh production full
```

## 🏗️ Architecture Overview

TheCareBot uses a **multi-agent architecture** where specialized subagents handle different aspects of the medical system:

### 🔧 Core Agents

- **🗄️ Database Agent**: Supabase schemas with medical RLS policies
- **📝 TypeScript Agent**: Zero-`any` policy with medical domain types
- **⚡ Backend Agent**: n8n workflows with resilience patterns
- **🖥️ Frontend Agent**: Medical dashboard with accessibility compliance
- **🔒 Security Agent**: Chilean compliance and medical data protection
- **📱 Mobile Agent**: Offline-first React Native app
- **📊 Observability Agent**: Medical metrics and compliance monitoring

### 🛠️ Technology Stack

**Frontend & Mobile**
- Next.js 14 (App Router) + TypeScript + TailwindCSS
- React Native with offline-first SQLite
- Radix UI + shadcn/ui + custom medical components
- Progressive Web App (PWA) capabilities

**Backend & Data**
- Langraph for medical AI analysis
- Supabase (PostgreSQL) with Row-Level Security
- Next.js API Routes + Supabase Edge Functions
- Claude API + Google Healthcare API integration
- Google Calendar API for appointment scheduling
- WhatsApp conversational AI agent

**Security & Compliance**
- AES-256-GCM encryption for all medical data
- Chilean RUT validation with mathematical check digit
- Medical license validation against Chilean registry
- Immutable audit logging for compliance

**DevOps & Monitoring**
- Prometheus + Grafana for medical metrics
- Distributed tracing for workflow visibility
- Chilean compliance reporting and alerting

## ⚖️ Medical Compliance

### Chilean Law 19.628 Requirements

TheCareBot is designed to meet all Chilean medical data protection requirements:

- ✅ **Data Residency**: Medical data in Chilean-approved regions
- ✅ **Patient Consent**: Explicit consent with audit trail
- ✅ **Right to Erasure**: Secure deletion with cryptographic proof
- ✅ **Access Logging**: Every medical access logged with purpose
- ✅ **20-Minute Sessions**: Legally mandated session timeout
- ✅ **RUT Protection**: Hashed storage, never raw RUTs

### Critical Security Features

```typescript
// Session Management (20-minute timeout)
const SESSION_TIMEOUT_MS = 20 * 60 * 1000; // NON-NEGOTIABLE

// Chilean RUT Validation
const isValidRUT = validateChileanRUT('12.345.678-9'); // Check digit verified

// Medical License Verification  
const doctorProfile = await verifyMedicalLicense('MED-1234567-CL');

// Encrypted Patient Data
const patientData = await encryptMedicalData(data, 'AES-256-GCM');
```

## 🏥 Medical Workflows

### Supported Analysis Types

1. **👤 Patient Search** (`buscar_paciente`)
   - Chilean RUT validation and lookup
   - Medical history retrieval
   - Demographic information (encrypted)

2. **📊 Excel Analysis** (`analizar_excel`)
   - Medical spreadsheet processing
   - Lab result analysis
   - Anomaly detection with confidence scoring

3. **🩻 Radiography Analysis** (`analizar_radiografia`)
   - Medical image processing
   - AI-powered diagnostic suggestions
   - Anatomical structure assessment
   - Appointment Scheduling (agendar_cita)

Doctor availability check (Google Calendar API)

Suggest available time slots to patients

Confirm appointments and store in Supabase

Notify patients via WhatsApp

### Confidence Scoring

All medical analyses include confidence scores:
- 🔴 **Low (<0.7)**: Requires mandatory manual physician review
- 🟡 **Medium (0.7-0.9)**: Acceptable with physician oversight
- 🟢 **High (>0.9)**: High confidence AI analysis

## 📱 Offline-First Mobile

The React Native mobile app provides:

- **24-hour minimum offline capability**
- **Encrypted SQLite storage** for medical sessions
- **Automatic sync** on secure WiFi networks  
- **Biometric authentication** (Touch/Face ID)
- **Compressed radiography** image handling
- **Secure mobile-web** session handoff

## 🚀 Development Commands

### Multi-Agent Orchestration
```bash
npm run orchestrate:init          # Initialize all subagents
npm run orchestrate:plan          # Generate execution plan
npm run orchestrate:execute       # Run coordinated development
```

### Subagent-Specific Commands
```bash
npm run agent:database           # Database schemas & migrations
npm run agent:types              # TypeScript types & validation
npm run agent:backend            # n8n workflows & resilience
npm run agent:frontend           # Next.js medical dashboard
npm run agent:security           # Chilean compliance & encryption
npm run agent:mobile             # React Native offline app
npm run agent:observability      # Metrics & monitoring
```

### Medical Compliance Testing
```bash
npm run test:compliance          # Chilean medical law compliance
npm run test:rut-validation      # RUT check digit validation
npm run test:medical-license     # Medical license verification
npm run test:audit-trail         # Audit logging verification
npm run test:session-timeout     # 20-minute timeout testing
npm run test:offline-sync        # Mobile offline functionality
```

### Phased Deployment
```bash
npm run deploy:phase1            # Infrastructure (Supabase + n8n)
npm run deploy:phase2            # Backend APIs + authentication
npm run deploy:phase3            # Frontend dashboard + PWA
npm run deploy:phase4            # Mobile app + sync services
npm run deploy:monitor           # Observability & alerting
```

## 🏗️ Project Structure

```
thecarebot/
├── apps/
│   ├── web/                     # Next.js medical dashboard
│   │   ├── src/components/medical/   # Medical UI components
│   │   ├── src/hooks/               # Medical session hooks
│   │   └── src/stores/              # Zustand medical state
│   └── mobile/                  # React Native offline app
│       ├── src/storage/             # SQLite encrypted storage
│       ├── src/services/            # Connectivity & sync
│       └── src/screens/             # Medical screens
├── packages/
│   ├── database/                # Supabase schemas and migrations
│   │   ├── migrations/              # Versioned medical schema changes
│   │   ├── types/                   # Database types
│   │   └── policies/                # RLS medical policies
│   ├── types/                   # Shared TypeScript medical types
│   │   ├── medical/                 # Medical domain types
│   │   ├── auth/                    # Chilean medical auth types
│   │   └── api/                     # Medical API contracts
│   ├── validators/              # Chilean compliance validators
│   │   ├── rut/                     # Chilean RUT validation
│   │   ├── medical-license/         # Medical license verification
│   │   └── schemas/                 # Zod medical schemas
│   └── observability/           # Medical metrics and monitoring
│       ├── metrics/                 # Medical business metrics
│       ├── tracing/                 # Distributed medical tracing
│       └── alerts/                  # Medical compliance alerts
├── services/
│   └── Langraph-workflows/           # Medical AI workflow definitions
│       ├── analysis/                # Medical analysis workflows
│       ├── fallbacks/               # Demo mode workflows
│       └── monitoring/              # Workflow health checks
└── docs/
    ├── compliance/              # Chilean medical compliance docs
    ├── security/                # Medical data protection specs
    └── deployment/              # Production deployment guides
```

## 🔐 Security & Data Protection

### Medical Data Classification

```typescript
type MedicalDataClassification =
  | "public"        // Non-sensitive medical information
  | "internal"      // Internal medical workflows
  | "confidential"  // Patient demographics
  | "restricted"    // Medical diagnoses and results
  | "top_secret";   // Chilean medical license validations
```

### Session Security
- **20-minute timeout** (legally required, cannot be extended)
- **Visual countdown** with 2-minute warnings
- **Secure handoff** between mobile and web
- **Biometric locks** on mobile devices

### Data Encryption
- **AES-256-GCM** for all medical data at rest and in transit
- **RUT hashing** with salt before database storage
- **Medical license** encrypted validation
- **Audit logs** with immutable timestamps

## 📊 Monitoring & Observability

### Medical SLOs (Service Level Objectives)

- **Medical Analysis**: 95% complete within 30 seconds
- **Patient Lookup**: 99% complete within 3 seconds  
- **Session Timeout**: 100% accuracy at 20 minutes
- **n8n Availability**: 99.9% uptime
- **Mobile Sync**: 95% success on first attempt

### Chilean Compliance Alerts

Real-time monitoring for:
- Session timeout violations
- Medical data access breaches
- RUT validation failures
- Demo mode vs real data usage
- Cross-border data transfer attempts

## 🚨 Important Medical Warnings

⚠️ **CRITICAL MEDICAL COMPLIANCE REQUIREMENTS**:

- This is a **regulated medical application** requiring Chilean Law 19.628 compliance
- Medical analysis confidence scores **below 0.7 require manual physician review**
- Demo mode must **NEVER expose real patient data** under any circumstances
- Chilean RUT validation is **mandatory for all patient operations**
- All medical workflows require **immutable audit trails**
- **20-minute session timeout is legally required** and cannot be extended

⚠️ **DATA PROTECTION REQUIREMENTS**:

- All medical data encrypted with **AES-256-GCM**
- Patient RUTs **hashed with salt** before database storage
- Medical license numbers **validated against Chilean medical registry**
- Cross-border data transfer requires **explicit Chilean government approval**

⚠️ **PERFORMANCE REQUIREMENTS**:

- Medical analysis must complete **within 30 seconds** (SLA requirement)
- Mobile app must work offline for **minimum 24 hours**
- Database queries must complete **within 3 seconds** for patient lookup
- System must handle **minimum 100 concurrent medical sessions**

## 👥 Contributing

TheCareBot follows strict medical compliance requirements. All contributions must:

1. ✅ Maintain **zero-`any` TypeScript policy**
2. ✅ Include **Chilean compliance validation**
3. ✅ Add **medical audit logging**
4. ✅ Follow **medical data encryption** standards
5. ✅ Include **comprehensive testing**

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

**⚠️ Medical Disclaimer**: This system is designed to assist healthcare professionals but does not replace medical judgment. All AI analysis results must be reviewed by licensed physicians before clinical use.

---

## 🏥 About TheCareBot

TheCareBot is designed to save lives through intelligent medical analysis while maintaining the highest standards of data protection and regulatory compliance. Built specifically for the Chilean healthcare system, it bridges the gap between advanced AI capabilities and strict medical data protection requirements.

**Made with ❤️ for Chilean Healthcare Professionals**