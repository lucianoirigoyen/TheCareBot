-- TheCareBot Medical Database Schema Migration
-- Implements Chilean Law 19.628 compliance for medical data protection
-- Created: 2025-09-04

BEGIN;

-- Create necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types for medical data
CREATE TYPE medical_specialty AS ENUM (
  'medicina_general',
  'cardiologia', 
  'neurologia',
  'pediatria',
  'ginecologia',
  'traumatologia',
  'psiquiatria',
  'dermatologia',
  'oftalmologia',
  'otorrinolaringologia',
  'medicina_interna',
  'cirugia_general',
  'anestesiologia',
  'radiologia',
  'medicina_familiar',
  'medicina_urgencia'
);

CREATE TYPE session_status AS ENUM ('active', 'completed', 'expired', 'cancelled');
CREATE TYPE analysis_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE analysis_type AS ENUM ('buscar_paciente', 'analizar_excel', 'analizar_radiografia', 'consulta_general');

-- Table: doctor_profiles
-- Stores Chilean medical professionals with license validation
CREATE TABLE doctor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  medical_license TEXT UNIQUE NOT NULL,
  specialty medical_specialty,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  session_timeout_minutes INTEGER DEFAULT 20 CHECK (session_timeout_minutes BETWEEN 5 AND 120),
  
  -- Chilean email validation
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  -- Chilean medical license format (6-10 digits)
  CONSTRAINT valid_license CHECK (medical_license ~ '^[0-9]{6,10}$'),
  CONSTRAINT valid_full_name CHECK (char_length(full_name) >= 3)
);

-- Table: medical_sessions 
-- Tracks medical consultation sessions with 20-minute timeout
CREATE TABLE medical_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  -- Store hashed RUT for privacy (never store raw RUT)
  patient_rut_hash TEXT NOT NULL, 
  session_type TEXT NOT NULL DEFAULT 'analysis',
  status session_status NOT NULL DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  -- Default 20-minute session timeout for medical compliance
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '20 minutes'),
  completed_at TIMESTAMP WITH TIME ZONE,
  ip_address INET,
  user_agent TEXT,
  
  CONSTRAINT valid_expiry CHECK (expires_at > created_at),
  CONSTRAINT session_duration_limit CHECK (expires_at <= created_at + INTERVAL '2 hours')
);

-- Table: medical_analyses
-- Stores AI analysis results with confidence scoring
CREATE TABLE medical_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES medical_sessions(id) ON DELETE CASCADE,
  analysis_type analysis_type NOT NULL,
  input_data JSONB NOT NULL,
  results JSONB,
  confidence_score DECIMAL(3,2) CHECK (confidence_score BETWEEN 0.00 AND 1.00),
  processing_time_ms INTEGER,
  status analysis_status NOT NULL DEFAULT 'pending',
  n8n_execution_id TEXT, -- Track n8n workflow execution
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT results_when_completed CHECK (
    (status = 'completed' AND results IS NOT NULL AND confidence_score IS NOT NULL) OR 
    (status != 'completed')
  ),
  CONSTRAINT valid_processing_time CHECK (processing_time_ms IS NULL OR processing_time_ms > 0)
);

-- Table: workflow_executions
-- Tracks n8n workflow integration for audit compliance
CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES medical_sessions(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES medical_analyses(id) ON DELETE SET NULL,
  workflow_name TEXT NOT NULL,
  n8n_execution_id TEXT UNIQUE,
  execution_status TEXT NOT NULL DEFAULT 'pending',
  input_data JSONB NOT NULL,
  output_data JSONB,
  error_details JSONB,
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT valid_workflow_name CHECK (workflow_name IN ('buscar_paciente', 'analizar_excel', 'analizar_radiografia')),
  CONSTRAINT valid_execution_status CHECK (execution_status IN ('pending', 'running', 'success', 'error', 'cancelled'))
);

-- Table: audit_medical_access
-- Immutable audit logs for Chilean medical data compliance (Law 19.628)
CREATE TABLE audit_medical_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES medical_sessions(id) ON DELETE SET NULL,
  doctor_id UUID REFERENCES doctor_profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  patient_rut_hash TEXT, -- For tracking patient data access
  ip_address INET NOT NULL,
  user_agent TEXT,
  request_data JSONB,
  response_status INTEGER,
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT valid_status CHECK (response_status BETWEEN 100 AND 599),
  CONSTRAINT valid_action CHECK (char_length(action) >= 3),
  CONSTRAINT valid_resource_type CHECK (char_length(resource_type) >= 3)
);

-- Table: patient_data_cache
-- Temporary encrypted cache for patient data (max 24h retention)
CREATE TABLE patient_data_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES medical_sessions(id) ON DELETE CASCADE,
  patient_rut_hash TEXT NOT NULL,
  encrypted_data TEXT NOT NULL, -- Encrypted patient data
  data_type TEXT NOT NULL, -- 'excel', 'radiografia', 'busqueda'
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT valid_data_type CHECK (data_type IN ('excel', 'radiografia', 'busqueda', 'general')),
  CONSTRAINT cache_expiry_limit CHECK (expires_at <= created_at + INTERVAL '24 hours')
);

-- Function: Chilean RUT validation with check digit
CREATE OR REPLACE FUNCTION validate_chilean_rut(rut TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  rut_numbers TEXT;
  check_digit CHAR;
  calculated_digit CHAR;
  sum_total INTEGER := 0;
  multiplier INTEGER := 2;
  i INTEGER;
BEGIN
  -- Remove dots and hyphens, convert to uppercase
  rut := UPPER(REPLACE(REPLACE(rut, '.', ''), '-', ''));
  
  -- Check format (7-8 digits + check digit)
  IF NOT rut ~ '^[0-9]{7,8}[0-9Kk]$' THEN
    RETURN FALSE;
  END IF;
  
  -- Extract numbers and check digit
  rut_numbers := LEFT(rut, LENGTH(rut) - 1);
  check_digit := RIGHT(rut, 1);
  
  -- Calculate check digit
  FOR i IN REVERSE LENGTH(rut_numbers)..1 LOOP
    sum_total := sum_total + (SUBSTRING(rut_numbers FROM i FOR 1)::INTEGER * multiplier);
    multiplier := multiplier + 1;
    IF multiplier > 7 THEN
      multiplier := 2;
    END IF;
  END LOOP;
  
  calculated_digit := CASE 11 - (sum_total % 11)
    WHEN 11 THEN '0'
    WHEN 10 THEN 'K'
    ELSE (11 - (sum_total % 11))::TEXT
  END;
  
  RETURN check_digit = calculated_digit;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Hash Chilean RUT for privacy compliance
CREATE OR REPLACE FUNCTION hash_chilean_rut(rut TEXT, salt TEXT DEFAULT 'thecarebot_medical_salt')
RETURNS TEXT AS $$
BEGIN
  -- Validate RUT format first
  IF NOT validate_chilean_rut(rut) THEN
    RAISE EXCEPTION 'Invalid Chilean RUT format: %', rut;
  END IF;
  
  -- Return SHA-256 hash with salt
  RETURN encode(digest(rut || salt, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

-- Function: Cleanup expired sessions (run every 5 minutes)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  -- Update expired active sessions
  UPDATE medical_sessions 
  SET status = 'expired'::session_status, 
      completed_at = now()
  WHERE status = 'active'::session_status 
    AND expires_at < now();
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  -- Log cleanup operation
  INSERT INTO audit_medical_access (
    action, resource_type, response_status, request_data, ip_address
  )
  VALUES (
    'cleanup_expired_sessions', 
    'maintenance', 
    200, 
    jsonb_build_object('affected_rows', affected_rows),
    '127.0.0.1'::inet
  );
  
  RETURN affected_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Cleanup expired cache data
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  -- Delete expired cache entries
  DELETE FROM patient_data_cache 
  WHERE expires_at < now();
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  -- Log cleanup operation
  INSERT INTO audit_medical_access (
    action, resource_type, response_status, request_data, ip_address
  )
  VALUES (
    'cleanup_expired_cache', 
    'maintenance', 
    200, 
    jsonb_build_object('deleted_rows', affected_rows),
    '127.0.0.1'::inet
  );
  
  RETURN affected_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get doctor session statistics
CREATE OR REPLACE FUNCTION get_doctor_session_stats(doctor_uuid UUID)
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'total_sessions', COUNT(*),
      'active_sessions', COUNT(*) FILTER (WHERE status = 'active'),
      'completed_sessions', COUNT(*) FILTER (WHERE status = 'completed'),
      'expired_sessions', COUNT(*) FILTER (WHERE status = 'expired'),
      'avg_session_duration_minutes', 
        ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(completed_at, now()) - created_at)) / 60), 2),
      'total_analyses', (
        SELECT COUNT(*) 
        FROM medical_analyses ma 
        JOIN medical_sessions ms ON ma.session_id = ms.id 
        WHERE ms.doctor_id = doctor_uuid
      ),
      'successful_analyses', (
        SELECT COUNT(*) 
        FROM medical_analyses ma 
        JOIN medical_sessions ms ON ma.session_id = ms.id 
        WHERE ms.doctor_id = doctor_uuid AND ma.status = 'completed'
      )
    )
    FROM medical_sessions 
    WHERE doctor_id = doctor_uuid
      AND created_at >= now() - INTERVAL '30 days'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update session activity (extend timeout)
CREATE OR REPLACE FUNCTION extend_session_timeout(session_uuid UUID, minutes INTEGER DEFAULT 20)
RETURNS BOOLEAN AS $$
DECLARE
  session_exists BOOLEAN;
  max_extension INTEGER := 60; -- Maximum 1 hour extension
BEGIN
  -- Check if session exists and is active
  SELECT EXISTS(
    SELECT 1 FROM medical_sessions 
    WHERE id = session_uuid AND status = 'active'::session_status
  ) INTO session_exists;
  
  IF NOT session_exists THEN
    RETURN FALSE;
  END IF;
  
  -- Limit extension time
  IF minutes > max_extension THEN
    minutes := max_extension;
  END IF;
  
  -- Extend session timeout
  UPDATE medical_sessions 
  SET expires_at = now() + (minutes || ' minutes')::INTERVAL,
      updated_at = now()
  WHERE id = session_uuid AND status = 'active'::session_status;
  
  -- Log extension
  INSERT INTO audit_medical_access (
    session_id, action, resource_type, resource_id, 
    request_data, response_status, ip_address
  )
  VALUES (
    session_uuid, 'extend_session_timeout', 'session', session_uuid::text,
    jsonb_build_object('extended_minutes', minutes), 200, '127.0.0.1'::inet
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function: Log session status changes for audit
CREATE OR REPLACE FUNCTION log_session_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO audit_medical_access (
      session_id, doctor_id, action, resource_type, 
      resource_id, request_data, response_status, ip_address
    )
    VALUES (
      NEW.id, NEW.doctor_id, 'session_status_change', 'session', 
      NEW.id::text, 
      jsonb_build_object(
        'old_status', OLD.status, 
        'new_status', NEW.status,
        'changed_at', now()
      ),
      200,
      COALESCE(NEW.ip_address, '127.0.0.1'::inet)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function: Log medical analysis access
CREATE OR REPLACE FUNCTION log_analysis_access()
RETURNS TRIGGER AS $$
DECLARE
  session_doctor_id UUID;
  session_patient_hash TEXT;
BEGIN
  -- Get session details for audit logging
  SELECT s.doctor_id, s.patient_rut_hash 
  INTO session_doctor_id, session_patient_hash
  FROM medical_sessions s 
  WHERE s.id = NEW.session_id;
  
  INSERT INTO audit_medical_access (
    session_id, doctor_id, action, resource_type, 
    resource_id, patient_rut_hash, request_data, 
    response_status, ip_address
  )
  VALUES (
    NEW.session_id, session_doctor_id, 'medical_analysis_created', 'analysis',
    NEW.id::text, session_patient_hash,
    jsonb_build_object(
      'analysis_type', NEW.analysis_type,
      'n8n_execution_id', NEW.n8n_execution_id
    ),
    201,
    '127.0.0.1'::inet
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER update_doctor_profiles_updated_at 
  BEFORE UPDATE ON doctor_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER log_session_status_changes
  AFTER UPDATE ON medical_sessions
  FOR EACH ROW EXECUTE FUNCTION log_session_changes();

CREATE TRIGGER log_analysis_creation
  AFTER INSERT ON medical_analyses
  FOR EACH ROW EXECUTE FUNCTION log_analysis_access();

-- Schedule automatic cleanup jobs (requires pg_cron extension)
-- Cleanup expired sessions every 5 minutes
SELECT cron.schedule('cleanup-expired-sessions', '*/5 * * * *', 'SELECT cleanup_expired_sessions();');

-- Cleanup expired cache every hour
SELECT cron.schedule('cleanup-expired-cache', '0 * * * *', 'SELECT cleanup_expired_cache();');

-- Cleanup old audit logs (keep 1 year for compliance)
SELECT cron.schedule('cleanup-old-audit-logs', '0 2 * * 0', 
  'DELETE FROM audit_medical_access WHERE created_at < now() - INTERVAL ''1 year'' AND action NOT IN (''security_violation'', ''data_breach'', ''unauthorized_access'');'
);

COMMIT;