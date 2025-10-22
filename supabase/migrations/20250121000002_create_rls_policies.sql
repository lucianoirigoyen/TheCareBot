-- Row Level Security Policies
-- Chilean medical data protection compliance

-- Enable RLS on all tables
ALTER TABLE doctor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE langgraph_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_audit_logs ENABLE ROW LEVEL SECURITY;

-- Doctor Profiles RLS
CREATE POLICY "Doctors can view own profile" ON doctor_profiles
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Doctors can update own profile" ON doctor_profiles
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Patients RLS (doctors can only see patients from their sessions)
CREATE POLICY "Doctors can view patients from own sessions" ON patients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM medical_sessions 
      WHERE medical_sessions.patient_rut = patients.rut 
      AND medical_sessions.doctor_id::text = auth.uid()::text
    )
  );

-- Medical Sessions RLS
CREATE POLICY "Doctors can view own sessions" ON medical_sessions
  FOR SELECT USING (auth.uid()::text = doctor_id::text);

CREATE POLICY "Doctors can insert own sessions" ON medical_sessions
  FOR INSERT WITH CHECK (auth.uid()::text = doctor_id::text);

CREATE POLICY "Doctors can update own sessions" ON medical_sessions
  FOR UPDATE USING (auth.uid()::text = doctor_id::text);

-- LangGraph Executions RLS
CREATE POLICY "Doctors can view own executions" ON langgraph_executions
  FOR SELECT USING (auth.uid()::text = doctor_id::text);

CREATE POLICY "Doctors can insert own executions" ON langgraph_executions
  FOR INSERT WITH CHECK (auth.uid()::text = doctor_id::text);

-- Medical Analyses RLS
CREATE POLICY "Doctors can view own analyses" ON medical_analyses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM medical_sessions 
      WHERE medical_sessions.id = medical_analyses.session_id 
      AND medical_sessions.doctor_id::text = auth.uid()::text
    )
  );

-- Audit Logs RLS (read-only for doctors, append-only)
CREATE POLICY "Doctors can view own audit logs" ON workflow_audit_logs
  FOR SELECT USING (auth.uid()::text = doctor_id::text);

CREATE POLICY "System can insert audit logs" ON workflow_audit_logs
  FOR INSERT WITH CHECK (true);

-- Prevent updates/deletes on audit logs (Chilean compliance)
CREATE POLICY "No updates allowed on audit logs" ON workflow_audit_logs
  FOR UPDATE USING (false);

CREATE POLICY "No deletes allowed on audit logs" ON workflow_audit_logs
  FOR DELETE USING (false);
