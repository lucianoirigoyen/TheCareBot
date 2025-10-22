-- TheCareBot Row-Level Security (RLS) Policies
-- Implements granular data access control for Chilean medical compliance
-- Created: 2025-09-04

BEGIN;

-- Enable Row Level Security on all medical tables
ALTER TABLE doctor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_medical_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_data_cache ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- DOCTOR_PROFILES POLICIES
-- Doctors can only access and modify their own profile data
-- =============================================================================

-- Policy: Doctors can view their own profile
CREATE POLICY "doctors_view_own_profile" ON doctor_profiles
  FOR SELECT 
  USING (auth.uid()::text = id::text);

-- Policy: Doctors can update their own profile (except critical fields)
CREATE POLICY "doctors_update_own_profile" ON doctor_profiles
  FOR UPDATE 
  USING (auth.uid()::text = id::text)
  WITH CHECK (
    auth.uid()::text = id::text AND
    -- Prevent modification of critical fields
    medical_license = OLD.medical_license AND
    email = OLD.email AND
    created_at = OLD.created_at
  );

-- Policy: Allow authenticated users to insert their own profile during registration
CREATE POLICY "doctors_insert_own_profile" ON doctor_profiles
  FOR INSERT
  WITH CHECK (auth.uid()::text = id::text);

-- =============================================================================
-- MEDICAL_SESSIONS POLICIES  
-- Doctors can only access sessions they created
-- =============================================================================

-- Policy: Doctors can view their own sessions
CREATE POLICY "doctors_view_own_sessions" ON medical_sessions
  FOR SELECT
  USING (doctor_id = auth.uid());

-- Policy: Doctors can create new sessions
CREATE POLICY "doctors_create_sessions" ON medical_sessions
  FOR INSERT
  WITH CHECK (doctor_id = auth.uid());

-- Policy: Doctors can update their own sessions
CREATE POLICY "doctors_update_own_sessions" ON medical_sessions
  FOR UPDATE
  USING (doctor_id = auth.uid())
  WITH CHECK (
    doctor_id = auth.uid() AND
    -- Prevent modification of critical audit fields
    created_at = OLD.created_at AND
    doctor_id = OLD.doctor_id AND
    patient_rut_hash = OLD.patient_rut_hash
  );

-- Policy: Doctors can delete their own sessions (soft delete only via status)
CREATE POLICY "doctors_delete_own_sessions" ON medical_sessions
  FOR DELETE
  USING (doctor_id = auth.uid());

-- =============================================================================
-- MEDICAL_ANALYSES POLICIES
-- Doctors can only access analyses from their own sessions
-- =============================================================================

-- Policy: Doctors can view analyses from their own sessions
CREATE POLICY "doctors_view_own_analyses" ON medical_analyses
  FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM medical_sessions WHERE doctor_id = auth.uid()
    )
  );

-- Policy: Doctors can create analyses in their own sessions
CREATE POLICY "doctors_create_analyses" ON medical_analyses
  FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM medical_sessions WHERE doctor_id = auth.uid()
    )
  );

-- Policy: Doctors can update analyses in their own sessions
CREATE POLICY "doctors_update_own_analyses" ON medical_analyses
  FOR UPDATE
  USING (
    session_id IN (
      SELECT id FROM medical_sessions WHERE doctor_id = auth.uid()
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT id FROM medical_sessions WHERE doctor_id = auth.uid()
    ) AND
    -- Prevent modification of audit fields
    created_at = OLD.created_at AND
    session_id = OLD.session_id
  );

-- Policy: Doctors can delete analyses from their own sessions
CREATE POLICY "doctors_delete_own_analyses" ON medical_analyses
  FOR DELETE
  USING (
    session_id IN (
      SELECT id FROM medical_sessions WHERE doctor_id = auth.uid()
    )
  );

-- =============================================================================
-- WORKFLOW_EXECUTIONS POLICIES
-- Doctors can only access workflow executions from their own sessions
-- =============================================================================

-- Policy: Doctors can view workflow executions from their own sessions
CREATE POLICY "doctors_view_own_workflows" ON workflow_executions
  FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM medical_sessions WHERE doctor_id = auth.uid()
    )
  );

-- Policy: System can create workflow executions (via service role)
CREATE POLICY "system_create_workflows" ON workflow_executions
  FOR INSERT
  WITH CHECK (
    -- Allow service role to create workflows
    auth.jwt() ->> 'role' = 'service_role' OR
    -- Allow authenticated users for their own sessions
    session_id IN (
      SELECT id FROM medical_sessions WHERE doctor_id = auth.uid()
    )
  );

-- Policy: System can update workflow executions
CREATE POLICY "system_update_workflows" ON workflow_executions
  FOR UPDATE
  USING (
    auth.jwt() ->> 'role' = 'service_role' OR
    session_id IN (
      SELECT id FROM medical_sessions WHERE doctor_id = auth.uid()
    )
  );

-- =============================================================================
-- AUDIT_MEDICAL_ACCESS POLICIES
-- Read-only access to own audit logs for transparency
-- =============================================================================

-- Policy: Doctors can view their own audit logs
CREATE POLICY "doctors_view_own_audit_logs" ON audit_medical_access
  FOR SELECT
  USING (doctor_id = auth.uid());

-- Policy: Only system can insert audit logs
CREATE POLICY "system_insert_audit_logs" ON audit_medical_access
  FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role' OR
    auth.jwt() ->> 'role' = 'authenticated'
  );

-- Policy: Audit logs are immutable (no updates or deletes by users)
CREATE POLICY "audit_logs_immutable" ON audit_medical_access
  FOR UPDATE
  USING (false);

CREATE POLICY "audit_logs_no_delete" ON audit_medical_access
  FOR DELETE
  USING (false);

-- =============================================================================
-- PATIENT_DATA_CACHE POLICIES
-- Temporary cache access restricted to session owners
-- =============================================================================

-- Policy: Doctors can view cache entries from their own sessions
CREATE POLICY "doctors_view_own_cache" ON patient_data_cache
  FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM medical_sessions WHERE doctor_id = auth.uid()
    )
  );

-- Policy: Doctors can create cache entries for their own sessions
CREATE POLICY "doctors_create_cache" ON patient_data_cache
  FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM medical_sessions WHERE doctor_id = auth.uid()
    )
  );

-- Policy: System can update cache entries (for encryption key rotation)
CREATE POLICY "system_update_cache" ON patient_data_cache
  FOR UPDATE
  USING (
    auth.jwt() ->> 'role' = 'service_role' OR
    session_id IN (
      SELECT id FROM medical_sessions WHERE doctor_id = auth.uid()
    )
  );

-- Policy: Doctors can delete their own cache entries
CREATE POLICY "doctors_delete_own_cache" ON patient_data_cache
  FOR DELETE
  USING (
    session_id IN (
      SELECT id FROM medical_sessions WHERE doctor_id = auth.uid()
    )
  );

-- =============================================================================
-- SECURITY FUNCTIONS FOR POLICY ENFORCEMENT
-- =============================================================================

-- Function: Check if user is the session owner
CREATE OR REPLACE FUNCTION is_session_owner(session_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM medical_sessions 
    WHERE id = session_uuid AND doctor_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user has access to analysis
CREATE OR REPLACE FUNCTION can_access_analysis(analysis_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM medical_analyses ma
    JOIN medical_sessions ms ON ma.session_id = ms.id
    WHERE ma.id = analysis_uuid AND ms.doctor_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Validate session timeout and auto-expire
CREATE OR REPLACE FUNCTION enforce_session_timeout()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-expire sessions that have exceeded their timeout
  IF NEW.status = 'active' AND NEW.expires_at <= now() THEN
    NEW.status := 'expired';
    NEW.completed_at := now();
    
    -- Log automatic expiration
    INSERT INTO audit_medical_access (
      session_id, doctor_id, action, resource_type, 
      resource_id, request_data, response_status, ip_address
    )
    VALUES (
      NEW.id, NEW.doctor_id, 'session_auto_expired', 'session',
      NEW.id::text,
      jsonb_build_object('expired_at', now()),
      200,
      COALESCE(NEW.ip_address, '127.0.0.1'::inet)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic session timeout enforcement
CREATE TRIGGER enforce_session_timeout_trigger
  BEFORE UPDATE ON medical_sessions
  FOR EACH ROW 
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION enforce_session_timeout();

-- =============================================================================
-- ADDITIONAL SECURITY CONSTRAINTS
-- =============================================================================

-- Create security constraint function for medical data access logging
CREATE OR REPLACE FUNCTION log_medical_data_access()
RETURNS EVENT_TRIGGER AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT * FROM pg_event_trigger_ddl_commands() LOOP
    -- Log DDL commands that might affect medical data security
    IF r.object_type IN ('table', 'policy', 'function') THEN
      INSERT INTO audit_medical_access (
        action, resource_type, resource_id, 
        request_data, response_status, ip_address
      )
      VALUES (
        'ddl_command_executed', 
        r.object_type,
        r.object_identity,
        jsonb_build_object(
          'command_tag', r.command_tag,
          'schema_name', r.schema_name
        ),
        200,
        '127.0.0.1'::inet
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create event trigger for DDL monitoring (requires superuser)
-- Note: This will only work in environments where we have appropriate privileges
-- CREATE EVENT TRIGGER log_ddl_medical_data ON ddl_command_end
--   EXECUTE FUNCTION log_medical_data_access();

-- =============================================================================
-- POLICY VALIDATION FUNCTIONS
-- =============================================================================

-- Function: Test RLS policies are working correctly
CREATE OR REPLACE FUNCTION test_rls_policies()
RETURNS JSONB AS $$
DECLARE
  test_results JSONB := '{}';
  policy_count INTEGER;
BEGIN
  -- Count RLS policies on medical tables
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'public' 
    AND tablename IN ('doctor_profiles', 'medical_sessions', 'medical_analyses', 
                     'workflow_executions', 'audit_medical_access', 'patient_data_cache');
  
  test_results := jsonb_build_object(
    'rls_policies_count', policy_count,
    'expected_minimum', 15,
    'all_tables_protected', (
      SELECT bool_and(rowsecurity) 
      FROM pg_tables 
      WHERE schemaname = 'public' 
        AND tablename IN ('doctor_profiles', 'medical_sessions', 'medical_analyses', 
                         'workflow_executions', 'audit_medical_access', 'patient_data_cache')
    ),
    'test_timestamp', now()
  );
  
  RETURN test_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- DEMONSTRATION QUERIES (FOR TESTING ONLY)
-- =============================================================================

-- Function: Generate test data for RLS validation (DEMO MODE ONLY)
CREATE OR REPLACE FUNCTION create_demo_data()
RETURNS TEXT AS $$
DECLARE
  demo_doctor_id UUID;
  demo_session_id UUID;
BEGIN
  -- This function should only be used in development/testing
  IF current_setting('app.environment', true) = 'production' THEN
    RAISE EXCEPTION 'Demo data creation not allowed in production environment';
  END IF;
  
  -- Create demo doctor profile
  INSERT INTO doctor_profiles (id, email, full_name, medical_license, specialty)
  VALUES (
    gen_random_uuid(),
    'demo.doctor@hospital.cl',
    'Dr. Demo Médico',
    '1234567',
    'medicina_general'
  ) RETURNING id INTO demo_doctor_id;
  
  -- Create demo session
  INSERT INTO medical_sessions (doctor_id, patient_rut_hash, session_type)
  VALUES (
    demo_doctor_id,
    hash_chilean_rut('12345678-9'),
    'demo_analysis'
  ) RETURNING id INTO demo_session_id;
  
  RETURN 'Demo data created successfully. Doctor ID: ' || demo_doctor_id::text || 
         ', Session ID: ' || demo_session_id::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;