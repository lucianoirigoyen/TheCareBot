-- Migration: Create medical_sessions table
-- Description: Medical session management with 20-minute timeout enforcement
-- Compliance: Chilean Law 19.628 - Session security and timeout requirements

CREATE TABLE medical_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '20 minutes'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  warning_shown_at TIMESTAMP WITH TIME ZONE,
  ip_address INET NOT NULL,
  user_agent TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- 20-minute maximum session duration (legal requirement)
  CONSTRAINT session_max_duration CHECK (expires_at <= start_time + INTERVAL '20 minutes'),

  -- Session cannot expire before it starts
  CONSTRAINT valid_expiration CHECK (expires_at > start_time),

  -- Last activity cannot be before session start
  CONSTRAINT valid_activity CHECK (last_activity >= start_time),

  -- Warning must be shown before expiration
  CONSTRAINT valid_warning CHECK (warning_shown_at IS NULL OR warning_shown_at < expires_at)
);

-- Create indexes for session queries
CREATE INDEX CONCURRENTLY idx_medical_sessions_doctor_id
  ON medical_sessions(doctor_id);

CREATE INDEX CONCURRENTLY idx_medical_sessions_expires_at
  ON medical_sessions(expires_at)
  WHERE is_active = true;

CREATE INDEX CONCURRENTLY idx_medical_sessions_doctor_active
  ON medical_sessions(doctor_id, is_active, created_at DESC);

-- Comments for compliance
COMMENT ON TABLE medical_sessions IS 'Medical sessions with enforced 20-minute timeout per Chilean regulations';
COMMENT ON COLUMN medical_sessions.expires_at IS 'Session expiration - MUST be within 20 minutes of start_time';
COMMENT ON COLUMN medical_sessions.warning_shown_at IS '2-minute warning timestamp before session expiration';
COMMENT ON COLUMN medical_sessions.ip_address IS 'Source IP for audit trail compliance';

-- Trigger for updated_at
CREATE TRIGGER update_medical_sessions_updated_at
  BEFORE UPDATE ON medical_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Rollback migration
-- DROP INDEX IF EXISTS idx_medical_sessions_doctor_active;
-- DROP INDEX IF EXISTS idx_medical_sessions_expires_at;
-- DROP INDEX IF EXISTS idx_medical_sessions_doctor_id;
-- DROP TRIGGER IF EXISTS update_medical_sessions_updated_at ON medical_sessions;
-- DROP TABLE IF EXISTS medical_sessions;
