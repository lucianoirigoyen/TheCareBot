-- Migration: Create medical_access_audit table
-- Description: Immutable audit trail for all medical data access
-- Compliance: Chilean Law 19.628 - Mandatory access logging

CREATE TABLE medical_access_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  doctor_id UUID REFERENCES doctor_profiles(id) ON DELETE SET NULL,
  session_id UUID REFERENCES medical_sessions(id) ON DELETE SET NULL,
  patient_rut_hash TEXT,
  analysis_id UUID REFERENCES patient_analyses(id) ON DELETE SET NULL,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  data_classification TEXT NOT NULL DEFAULT 'restricted',
  ip_address INET NOT NULL,
  user_agent TEXT NOT NULL,
  purpose TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Event type validation
  CONSTRAINT valid_event_type CHECK (event_type IN (
    'access', 'modify', 'delete', 'export', 'view', 'create'
  )),

  -- Data classification validation
  CONSTRAINT valid_audit_classification CHECK (data_classification IN (
    'public', 'internal', 'confidential', 'restricted', 'top_secret'
  )),

  -- Patient RUT hash format validation (SHA-256 hex)
  CONSTRAINT valid_audit_rut_hash CHECK (
    patient_rut_hash IS NULL OR patient_rut_hash ~ '^[a-f0-9]{64}$'
  ),

  -- Error message required for failed operations
  CONSTRAINT error_message_check CHECK (
    (success = false AND error_message IS NOT NULL) OR
    (success = true)
  )
);

-- Create indexes for audit queries
CREATE INDEX CONCURRENTLY idx_audit_doctor_timestamp
  ON medical_access_audit(doctor_id, timestamp DESC);

CREATE INDEX CONCURRENTLY idx_audit_session_timestamp
  ON medical_access_audit(session_id, timestamp DESC);

CREATE INDEX CONCURRENTLY idx_audit_patient_timestamp
  ON medical_access_audit(patient_rut_hash, timestamp DESC);

CREATE INDEX CONCURRENTLY idx_audit_event_type
  ON medical_access_audit(event_type, timestamp DESC);

CREATE INDEX CONCURRENTLY idx_audit_table_name
  ON medical_access_audit(table_name, timestamp DESC);

CREATE INDEX CONCURRENTLY idx_audit_timestamp
  ON medical_access_audit(timestamp DESC);

-- Partial index for failed operations
CREATE INDEX CONCURRENTLY idx_audit_failed_operations
  ON medical_access_audit(doctor_id, timestamp DESC)
  WHERE success = false;

-- Comments for compliance
COMMENT ON TABLE medical_access_audit IS 'Immutable audit trail - Law 19.628 compliance - NEVER DELETE';
COMMENT ON COLUMN medical_access_audit.event_type IS 'Type of medical data access event';
COMMENT ON COLUMN medical_access_audit.timestamp IS 'Exact timestamp of access - immutable';
COMMENT ON COLUMN medical_access_audit.purpose IS 'Documented purpose for data access';

-- Make audit table immutable (no updates or deletes allowed)
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit records are immutable and cannot be modified or deleted';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_audit_updates
  BEFORE UPDATE ON medical_access_audit
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_modification();

CREATE TRIGGER prevent_audit_deletes
  BEFORE DELETE ON medical_access_audit
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_modification();

-- Rollback migration (WARNING: This will remove audit trail)
-- DROP TRIGGER IF EXISTS prevent_audit_deletes ON medical_access_audit;
-- DROP TRIGGER IF EXISTS prevent_audit_updates ON medical_access_audit;
-- DROP FUNCTION IF EXISTS prevent_audit_modification();
-- DROP INDEX IF EXISTS idx_audit_failed_operations;
-- DROP INDEX IF EXISTS idx_audit_timestamp;
-- DROP INDEX IF EXISTS idx_audit_table_name;
-- DROP INDEX IF EXISTS idx_audit_event_type;
-- DROP INDEX IF EXISTS idx_audit_patient_timestamp;
-- DROP INDEX IF EXISTS idx_audit_session_timestamp;
-- DROP INDEX IF EXISTS idx_audit_doctor_timestamp;
-- DROP TABLE IF EXISTS medical_access_audit;
