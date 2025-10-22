# TheCareBot - LangGraph Migration Status Report
**Generated:** 2025-10-21
**Migration Goal:** Replace n8n with LangGraph multi-agent medical workflows

## ✅ COMPLETED TASKS

### 1. Codebase Analysis Complete
- **Read 7 MD specification files** (8,000+ lines of documentation)
- **Identified architecture:**
  - Multi-agent system (7 specialized agents)
  - Chilean medical compliance (Ley 19.628)
  - Zero-`any` TypeScript enforcement
  - Offline-first design with Supabase RLS
  - Circuit breaker resilience patterns

### 2. n8n Infrastructure Removal
**DELETED:**
- ✅ `/services/n8n-workflows/` directory (entire n8n integration removed)
- ✅ `DemoModeBanner.tsx` components (all instances deleted)

**IDENTIFIED for cleanup (still pending manual edits):**
- `/src/services/health-monitor.ts` - Lines 262-308 (n8n health checks)
- `/packages/observability/metrics/collector.ts` - Lines 321-350 (recordN8nWorkflow method)
- `/packages/database/types/medical-tables.ts` - n8n execution tracking fields
- `/src/config/timeouts.ts` - n8n timeout configurations
- `/orchestrator.ts` - n8n orchestration references

### 3. LangGraph Foundation Created
**NEW STRUCTURE:**
```
/services/langgraph/
├── state/
│   └── medical-workflow-state.ts ✅ COMPLETE (280 lines)
├── agents/ (pending)
├── graphs/ (pending)
├── tools/ (pending)
└── config/ (pending)
```

**medical-workflow-state.ts includes:**
- ✅ Branded types for type safety (SessionId, DoctorId, PatientRUT)
- ✅ Medical workflow state definitions (PatientSearch, ExcelAnalysis, RadiographyAnalysis)
- ✅ Confidence scoring (< 0.7 requires manual review)
- ✅ Chilean compliance tracking (audit events, compliance checks)
- ✅ Zod schemas for runtime validation
- ✅ Zero-`any` policy enforced throughout

## 🚧 IN PROGRESS

### LangGraph Multi-Agent Implementation
**Files created but empty (need implementation):**
- `services/langgraph/index.ts`
- `services/langgraph/config/langgraph-config.ts`
- `services/langgraph/graphs/patient-search-graph.ts`
- `services/langgraph/graphs/excel-analysis-graph.ts`
- `services/langgraph/graphs/radiography-analysis-graph.ts`

## ❌ PENDING CRITICAL TASKS

### IMMEDIATE PRIORITY (Required for MVP)

#### 1. Complete LangGraph Implementation
**Create these files:**

**A. Configuration** (`services/langgraph/config/langgraph-config.ts`):
```typescript
export const LANGGRAPH_CONFIG = {
  CLAUDE_API_KEY: process.env.CLAUDE_API_KEY,
  CLAUDE_MODEL: 'claude-3-5-sonnet-20241022',
  TIMEOUTS: {
    PATIENT_SEARCH: 8000,      // 8s (was n8n timeout)
    EXCEL_ANALYSIS: 30000,      // 30s
    RADIOGRAPHY_ANALYSIS: 30000 // 30s
  },
  CIRCUIT_BREAKERS: {
    FAILURE_THRESHOLD: 5,
    RECOVERY_TIMEOUT: 30000,
    MONITORING_WINDOW: 60000
  },
  CONFIDENCE_THRESHOLD: 0.7 // Manual review below this
};
```

**B. Agents** (create 4 agent files):
1. `services/langgraph/agents/patient-search-agent.ts`
   - Tool: Supabase RUT lookup with RLS
   - Tool: Chilean RUT validation
   - Output: PatientSearchResult with confidence score

2. `services/langgraph/agents/excel-analysis-agent.ts`
   - Tool: Excel file parser
   - Tool: Claude API for medical data analysis
   - Output: ExcelAnalysisResult with anomalies/insights

3. `services/langgraph/agents/radiography-analysis-agent.ts`
   - Tool: Image preprocessing
   - Tool: Claude API vision for radiography analysis
   - Output: RadiographyAnalysisResult with findings

4. `services/langgraph/agents/medical-coordinator-agent.ts`
   - Orchestrates multi-agent workflows
   - Validates confidence scores
   - Triggers manual review when needed

**C. StateGraph Definitions** (implement 3 graphs):
Each graph should:
- Use StateGraph from LangGraph
- Define nodes for each agent
- Add conditional edges for confidence branching
- Implement circuit breaker fallbacks
- Create audit trail events

**D. Main Export** (`services/langgraph/index.ts`):
```typescript
export { executePatientSearch } from './graphs/patient-search-graph';
export { executeExcelAnalysis } from './graphs/excel-analysis-graph';
export { executeRadiographyAnalysis } from './graphs/radiography-analysis-graph';
export * from './state/medical-workflow-state';
```

#### 2. Remove Remaining n8n References
**Edit these files to remove n8n:**
- `/src/services/health-monitor.ts` → Remove `n8n-workflows` health check (lines 262-308)
- `/packages/observability/metrics/collector.ts` → Remove `recordN8nWorkflow` method (lines 321-350)
- `/packages/observability/metrics/medical-business-metrics.ts` → Remove n8nWorkflowAvailability metrics
- `/src/app/api/system/health/route.ts` → Remove n8n health endpoint
- `/orchestrator.ts` → Remove n8n orchestration logic

#### 3. Remove Remaining Demo Mode References
**Edit these files to remove demo logic:**
- `/src/app/api/patients/search/route.ts` → Remove DEMO_RESPONSES fallback
- `/src/app/api/analysis/excel/route.ts` → Remove demo mode checks
- `/src/app/api/analysis/radiography/route.ts` → Remove demo mode checks
- `/packages/observability/metrics/collector.ts` → Remove recordDemoModeActivation (line 454)
- `/src/hooks/useSessionTimeout.ts` → Remove demoMode parameters
- `/src/store/ui.store.ts` → Remove demo mode state

#### 4. Update API Routes to Use LangGraph
**Replace n8n calls with LangGraph:**
- `/src/app/api/patients/search/route.ts` → `import { executePatientSearch } from '@/services/langgraph'`
- `/src/app/api/analysis/excel/route.ts` → `import { executeExcelAnalysis } from '@/services/langgraph'`
- `/src/app/api/analysis/radiography/route.ts` → `import { executeRadiographyAnalysis } from '@/services/langgraph'`

#### 5. Database Migrations
**Create Supabase migrations in `/supabase/migrations/`:**
```sql
-- 20250121000001_create_doctor_profiles.sql
CREATE TABLE doctor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  medical_license TEXT UNIQUE NOT NULL,
  specialty TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- 20250121000002_create_medical_sessions.sql
CREATE TABLE thecarebot_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctor_profiles(id),
  patient_rut TEXT NOT NULL,
  session_type TEXT NOT NULL DEFAULT 'analysis',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '20 minutes'),
  CONSTRAINT valid_rut CHECK (patient_rut ~ '^[0-9]{7,8}-[0-9Kk]$')
);

-- 20250121000003_create_workflow_executions.sql
CREATE TABLE langgraph_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES thecarebot_sessions(id),
  doctor_id UUID NOT NULL REFERENCES doctor_profiles(id),
  intention TEXT NOT NULL,
  status TEXT NOT NULL,
  confidence_score DECIMAL(3,2),
  requires_manual_review BOOLEAN DEFAULT FALSE,
  result_data JSONB,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  processing_time_ms INTEGER
);

-- RLS policies for all tables
-- Enable RLS and create policies restricting access to doctor's own data
```

#### 6. Observability Setup
**Create Prometheus metrics exporters:**
- `/packages/observability/exporters/prometheus-exporter.ts`
- Replace all `n8n.workflow.*` metrics with `langgraph.workflow.*`
- Add medical-specific metrics:
  - `langgraph_workflow_duration_seconds`
  - `langgraph_agent_execution_total`
  - `medical_analysis_confidence_score`
  - `chilean_rut_validation_total`
  - `session_timeout_violations`

## 🔧 TECHNICAL DEBT TO ADDRESS

### Type Safety
- [ ] Scan entire codebase for remaining `any` types
- [ ] Ensure all LangGraph agents use branded types
- [ ] Add Zod validation to all API routes

### Security & Compliance
- [ ] Verify Chilean RUT validation in all patient operations
- [ ] Ensure 20-minute session timeout cannot be extended
- [ ] Confirm AES-256-GCM encryption for all medical data
- [ ] Validate immutable audit logging for data access

### Testing
- [ ] Unit tests for LangGraph agents
- [ ] Integration tests for medical workflows
- [ ] E2E tests with Chilean compliance scenarios
- [ ] Circuit breaker failure scenarios

## 📋 NEXT IMMEDIATE STEPS (DO THIS NEXT)

1. **Install LangGraph dependencies:**
```bash
npm install langgraph @langchain/anthropic @langchain/core
```

2. **Implement patient search graph first (simplest):**
   - Create `patient-search-agent.ts`
   - Create `patient-search-graph.ts` with StateGraph
   - Test with real Supabase queries

3. **Update `/src/app/api/patients/search/route.ts`:**
   - Remove n8n imports
   - Import LangGraph executePatientSearch
   - Test end-to-end flow

4. **Repeat for Excel and Radiography workflows**

5. **Deploy database migrations:**
```bash
npx supabase db push
```

6. **Setup Prometheus metrics in production**

## 🚨 BLOCKERS / DEPENDENCIES

- **Claude API Key:** Required in `.env` as `CLAUDE_API_KEY`
- **Supabase configured:** Already set up
- **AWS/GCP credentials:** Not configured yet (user mentioned)
- **Chilean medical registry API:** Mock implementation needed

## 📊 PROGRESS METRICS

- **Files analyzed:** 7 MD specs + 30+ source files
- **Files deleted:** 2 directories, 2+ components
- **Files created:** 6 LangGraph files (1 complete, 5 pending implementation)
- **Lines of code:** ~280 lines written (state definitions)
- **Estimated remaining:** ~2,000 lines to implement full LangGraph MVP

## 🎯 SUCCESS CRITERIA

✅ **Completed when:**
1. Zero n8n references in codebase
2. Zero demo mode logic remaining
3. All 3 medical workflows working with LangGraph multi-agent
4. Confidence scoring < 0.7 triggers manual review
5. Chilean RUT validation enforced
6. 20-minute session timeout working
7. Prometheus metrics capturing LangGraph executions
8. Database migrations deployed to Supabase
9. End-to-end test of patient search → Excel analysis → radiography analysis

---

**NOTE:** Agent system hit session limits. Manual implementation required for remaining tasks. Focus on creating the 4 agents and 3 StateGraphs as highest priority.
