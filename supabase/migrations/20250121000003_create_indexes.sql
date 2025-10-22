-- Performance Indexes for Medical Workflows

-- Doctor lookups
CREATE INDEX IF NOT EXISTS idx_doctor_profiles_email ON doctor_profiles(email);
CREATE INDEX IF NOT EXISTS idx_doctor_profiles_license ON doctor_profiles(medical_license);

-- Patient lookups (RUT is most common query)
CREATE INDEX IF NOT EXISTS idx_patients_rut ON patients(rut);

-- Session management
CREATE INDEX IF NOT EXISTS idx_medical_sessions_doctor ON medical_sessions(doctor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_medical_sessions_expires ON medical_sessions(expires_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_medical_sessions_status ON medical_sessions(status, expires_at);

-- LangGraph executions
CREATE INDEX IF NOT EXISTS idx_langgraph_executions_session ON langgraph_executions(session_id);
CREATE INDEX IF NOT EXISTS idx_langgraph_executions_doctor ON langgraph_executions(doctor_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_langgraph_manual_review ON langgraph_executions(requires_manual_review) WHERE requires_manual_review = true;

-- Medical analyses
CREATE INDEX IF NOT EXISTS idx_medical_analyses_session ON medical_analyses(session_id);
CREATE INDEX IF NOT EXISTS idx_medical_analyses_type ON medical_analyses(analysis_type, created_at DESC);

-- Audit logs (chronological access)
CREATE INDEX IF NOT EXISTS idx_audit_logs_doctor_time ON workflow_audit_logs(doctor_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_session ON workflow_audit_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON workflow_audit_logs(event_type, timestamp DESC);
