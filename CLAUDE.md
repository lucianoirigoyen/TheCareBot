# CLAUDE.md

This file provides comprehensive guidance to Claude Code (claude.ai/code) when working with the **TheCareBot** medical AI assistant project.

## Project Overview

**TheCareBot** is a regulated medical AI assistant designed for healthcare professionals in Chile. It provides intelligent medical analysis, session management, and diagnostic support while maintaining strict compliance with Chilean medical data protection laws (Ley 19.628) and international healthcare standards (HIPAA/GDPR).

### Key Characteristics

- **Regulated Medical Application**: Requires Chilean medical compliance and data protection
- **Multi-Agent Architecture**: Specialized domain experts with clear boundaries
- **Offline-First Design**: Critical for clinical environments with unreliable connectivity
- **Zero-Any TypeScript**: Strict typing throughout the entire codebase
- **Resilience-First**: Circuit breakers, fallbacks, and graceful degradation

## Architecture & Technology Stack

### Core Technologies

- **Frontend Web**: Next.js 14 (App Router), TypeScript, TailwindCSS, Zustand, Radix UI + shadcn/ui
- **Mobile**: React Native with offline-first SQLite, encrypted medical data sync
- **Backend**: Langchain + Next.js API Routes + Supabase Edge Functions
- **Database**: Supabase (PostgreSQL) with medical-grade RLS policies
- **Authentication**: Supabase Auth with Chilean medical license validation
- **AI Integration**: Claude API + Google Healthcare API for medical analysis
- **Observability**: Prometheus + Grafana + distributed tracing
- **Validation**: Zod schemas with Chilean-specific validators (RUT, medical licenses)

### Multi-Agent Specialization

The project uses a **multi-agent architecture** where each agent has specific domain expertise:

#### 1. **Database Subagent** (`packages/database/`)

- **Expertise**: Supabase schemas, RLS policies, medical data structures
- **Responsibilities**: PostgreSQL optimization, audit logging, data migrations
- **Critical Features**: Row-level security for patient data, automatic session expiration

#### 2. **TypeScript Subagent** (`packages/types/`)

- **Expertise**: Zero-`any` policy, medical domain types, runtime validation
- **Responsibilities**: Type safety, Zod schemas, branded types for medical IDs
- **Critical Features**: Chilean RUT validation, medical license verification

#### 3. **Backend Subagent** (`services/langchain/`)

- **Expertise**: n8n workflow integration, resilience patterns, circuit breakers
- **Responsibilities**: Medical AI analysis, fallback strategies, health checks
- **Critical Features**: Demo mode for system degradation, retry with exponential backoff

#### 4. **Frontend UX Subagent** (`apps/web/`)

- **Expertise**: Medical dashboard UI, session management, accessibility
- **Responsibilities**: PWA capabilities, medical file upload, session timeout management
- **Critical Features**: 20-minute medical session timeout, WCAG 2.1 AA compliance

#### 5. **Security Subagent** (`packages/validators/`)

- **Expertise**: Chilean medical compliance, data encryption, audit trails
- **Responsibilities**: AES-256 encryption, RUT validation, medical data protection
- **Critical Features**: Ley 19.628 compliance, immutable audit logs

#### 6. **React Native Subagent** (`apps/mobile/`)

- **Expertise**: Offline-first architecture, medical data sync, encrypted SQLite
- **Responsibilities**: Mobile medical workflows, connectivity management, secure storage
- **Critical Features**: Offline medical sessions, intelligent sync strategies

#### 7. **Observability Subagent** (`packages/observability/`)

- **Expertise**: Medical metrics, distributed tracing, chaos engineering
- **Responsibilities**: SLO/SLI monitoring, medical analysis performance, alert management
- **Critical Features**: Medical business metrics, compliance monitoring

## Development Requirements

### Medical Compliance (CRITICAL)

```typescript
// All medical operations require these validations
interface MedicalOperation {
  doctorId: DoctorId; // Validated Chilean medical license
  patientRut: PatientRUT; // Validated Chilean RUT with check digit
  sessionId: SessionId; // UUID v4 with 20-minute timeout
  auditTrail: AuditEvent[]; // Immutable compliance logging
}
```

### TypeScript Standards (ENFORCED)

- **Zero `any` Policy**: ESLint rules prevent any use of `any` type with `@typescript-eslint/no-explicit-any: "error"`
- **Strict Configuration**: Ultra-strict TypeScript with all strict flags enabled
  - `noImplicitAny: true`
  - `strictNullChecks: true`
  - `noUncheckedIndexedAccess: true`
  - `exactOptionalPropertyTypes: true`
  - `noImplicitReturns: true`
- **Medical Domain Types**: Branded types for medical IDs and Chilean compliance
- **Runtime Validation**: All external data validated with Zod + Chilean validators
- **Type Safety Rules**: No unsafe operations, consistent imports, exhaustive switch checks

### Backend Resilience (REQUIRED)

- **Circuit Breakers**: For medical workflow execution with configurable thresholds
- **Fallback Strategies**: Demo mode that never exposes real medical data
- **Timeout Configuration**: 3s for DB queries, 30s for image analysis, 8s for Google Healthcare API
- **Health Checks**: Continuous monitoring of medical workflow availability

### Security Requirements (NON-NEGOTIABLE)

- **Chilean RUT Validation**: Strict validation with mathematical check digit verification
- **Medical License Validation**: Integration with Chilean medical registry validation
- **Session Management**: 20-minute timeout with visual countdown and 2-minute warnings
- **Data Encryption**: AES-256-GCM for all medical data at rest and in transit
- **Audit Logging**: Every medical data access logged with immutable timestamps

## File Organization

```
thecarebot/
├── src/                        # Next.js 14 App Router source
│   ├── app/                          # App Router pages and layouts
│   ├── components/                   # UI components and medical components
│   ├── api/                          # API route handlers
│   ├── hooks/                        # React hooks for medical sessions
│   ├── stores/                       # Zustand state management
│   ├── types/                        # TypeScript type definitions
│   ├── utils/                        # Utility functions
│   ├── validators/                   # Zod schemas and Chilean validators
│   ├── security/                     # Security and encryption utilities
│   ├── services/                     # External service integrations
│   ├── schemas/                      # Medical data schemas
│   ├── middleware/                   # Next.js middleware
│   ├── pages/                        # Legacy pages (if any)
│   ├── config/                       # Configuration files
│   └── lib/                          # Core libraries and setup
├── apps/                       # Multi-app architecture (planned)
│   ├── web/                          # Next.js medical dashboard (future)
│   └── mobile/                       # React Native offline app
├── packages/                   # Shared packages
│   ├── database/                     # Supabase schemas and migrations
│   │   ├── migrations/               # Versioned medical schema changes
│   │   ├── types/                    # Database types
│   │   └── policies/                 # RLS medical policies
│   ├── types/                        # Shared TypeScript medical types
│   │   ├── medical/                  # Medical domain types
│   │   ├── auth/                     # Chilean medical auth types
│   │   └── api/                      # Medical API contracts
│   ├── validators/                   # Chilean compliance validators
│   │   ├── rut/                      # Chilean RUT validation
│   │   ├── medical-license/          # Medical license verification
│   │   └── schemas/                  # Zod medical schemas
│   └── observability/                # Medical metrics and monitoring
│       ├── metrics/                  # Medical business metrics
│       ├── tracing/                  # Distributed medical tracing
│       └── alerts/                   # Medical compliance alerts
├── services/
│   └── lanchain-w                # Medical AI workflow definitions
│       ├── analysis/                 # Medical analysis workflows
│       ├── fallbacks/                # Demo mode workflows
│       └── monitoring/               # Workflow health checks
├── docs/
│   ├── compliance/                   # Chilean medical compliance docs
│   ├── security/                     # Medical data protection specs
│   └── deployment/                   # Production deployment guides
├── supabase/                   # Supabase configuration
│   └── migrations/                   # Database migrations
├── orchestrator.ts             # Multi-agent orchestration script
├── deploy.sh                   # Production deployment script
└── Configuration files:
    ├── next.config.js              # Next.js configuration
    ├── tailwind.config.js          # TailwindCSS configuration
    ├── tsconfig.json               # TypeScript strict configuration
    ├── .eslintrc.json              # ESLint with zero-any policy
    └── postcss.config.js           # PostCSS configuration
```

## Development Commands

### Core Development Commands

```bash
# Development
npm run dev                    # Start Next.js development server (port 3000)
npm run build                  # Build production bundle
npm run start                  # Start production server
npm run lint                   # Run ESLint with medical compliance rules
npm run typecheck              # Run TypeScript compiler checks
```

### Project Architecture Commands

```bash
# Multi-agent orchestration (via orchestrator.ts)
node orchestrator.ts init      # Initialize all subagents
node orchestrator.ts plan      # Generate execution plan
node orchestrator.ts execute   # Run coordinated development

# Deployment
./deploy.sh staging full       # Deploy to staging environment
./deploy.sh production full    # Deploy to production environment
```

## Critical Integration Points

### n8n Medical Workflow Integration

```typescript
// Medical analysis workflow integration
interface MedicalWorkflowExecution {
  executionId: string;
  intention: "buscar_paciente" | "analizar_excel" | "analizar_radiografia";
  confidenceScore: number; // 0.0-1.0 scale, <0.7 requires manual review
  fallbackMode: boolean; // Auto-fallback to demo when workflows fail
  auditTrail: WorkflowAuditEvent[];
}
```

### Database Medical Schema Patterns

```sql
-- All medical tables follow this pattern
CREATE TABLE medical_* (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctor_profiles(id),
  patient_rut_hash TEXT NOT NULL,  -- Hashed for privacy
  audit_timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  -- RLS policies restrict access to doctor's own data only
);
```

### Mobile Offline Medical Strategy

```typescript
// Encrypted SQLite for medical sessions
interface OfflineMedicalSession {
  encryptedData: AESEncryptedData; // AES-256-GCM encryption
  syncStatus: "pending" | "synced"; // Automatic sync on secure WiFi
  compressionLevel: number; // Intelligent compression for images
  integrityHash: string; // Verify data integrity
}
```

## Security & Compliance Requirements

### Chilean Medical Law Compliance (Ley 19.628)

- **Data Residency**: Medical data must remain in Chilean-approved cloud regions
- **Patient Consent**: Explicit consent for each medical analysis with audit trail
- **Right to Erasure**: Secure data deletion with cryptographic proof
- **Access Logging**: Every medical data access logged with IP, timestamp, purpose

### Medical Data Classification

```typescript
type MedicalDataClassification =
  | "public" // Non-sensitive medical information
  | "internal" // Internal medical workflows
  | "confidential" // Patient demographics
  | "restricted" // Medical diagnoses and results
  | "top_secret"; // Chilean medical license validations
```

### Session Security

- **20-Minute Timeout**: All medical sessions expire after 20 minutes of inactivity
- **Visual Countdown**: 2-minute warning before session expiration
- **Secure Handoff**: Session data encrypted during mobile-web transitions
- **Biometric Lock**: Mobile app supports biometric authentication

## Important Development Notes

⚠️ **CRITICAL**: This is a regulated medical application requiring:

- Chilean Law 19.628 compliance for patient data protection
- Medical analysis confidence scores below 0.7 require manual physician review
- Demo mode must NEVER expose real patient data under any circumstances
- Chilean RUT validation is mandatory for all patient operations
- All medical workflows require immutable audit trails
- 20-minute session timeout is legally required and cannot be extended

⚠️ **DATA PROTECTION**:

- All medical data encrypted with AES-256-GCM
- Patient RUTs hashed with salt before database storage
- Medical license numbers validated against Chilean medical registry
- Cross-border data transfer requires explicit Chilean government approval

⚠️ **PERFORMANCE REQUIREMENTS**:

- Medical analysis must complete within 30 seconds (SLA requirement)
- Mobile app must work offline for minimum 24 hours
- Database queries must complete within 3 seconds for patient lookup
- System must handle minimum 100 concurrent medical sessions

⚠️ **OBSERVABILITY REQUIREMENTS**:

- Medical business metrics tracked (analysis accuracy, time-to-result)
- Distributed tracing for all medical workflows end-to-end
- Compliance alerts for data access violations or timeout breaches
- Chaos testing in staging only, never in production with real patient data

This system is designed to save lives through intelligent medical analysis while maintaining the highest standards of data protection and regulatory compliance.
