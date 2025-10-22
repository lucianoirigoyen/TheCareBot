-- Migration: Create medical_file_uploads table
-- Description: Medical file upload tracking with encryption and virus scanning
-- Compliance: Chilean Law 19.628 - Secure medical file storage

CREATE TABLE medical_file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES medical_sessions(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES patient_analyses(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  upload_status TEXT NOT NULL DEFAULT 'uploading',
  encryption_key_id TEXT NOT NULL,
  integrity_hash TEXT NOT NULL,
  virus_scan_status TEXT NOT NULL DEFAULT 'pending',
  retention_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- File type validation
  CONSTRAINT valid_file_type CHECK (file_type IN ('excel', 'radiography', 'document')),

  -- Upload status validation
  CONSTRAINT valid_upload_status CHECK (upload_status IN (
    'uploading', 'completed', 'failed', 'deleted'
  )),

  -- Virus scan status validation
  CONSTRAINT valid_virus_scan_status CHECK (virus_scan_status IN (
    'pending', 'clean', 'infected', 'error'
  )),

  -- File size validation (max 50MB for medical files)
  CONSTRAINT valid_file_size CHECK (file_size_bytes > 0 AND file_size_bytes <= 52428800),

  -- Integrity hash format validation (SHA-256 hex)
  CONSTRAINT valid_integrity_hash CHECK (integrity_hash ~ '^[a-f0-9]{64}$'),

  -- Retention period validation (must be future date)
  CONSTRAINT valid_retention CHECK (retention_expires_at > created_at),

  -- Infected files must be deleted
  CONSTRAINT infected_file_check CHECK (
    (virus_scan_status = 'infected' AND upload_status = 'deleted') OR
    (virus_scan_status != 'infected')
  )
);

-- Create indexes for file queries
CREATE INDEX CONCURRENTLY idx_file_uploads_session_id
  ON medical_file_uploads(session_id);

CREATE INDEX CONCURRENTLY idx_file_uploads_doctor_id
  ON medical_file_uploads(doctor_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_file_uploads_analysis_id
  ON medical_file_uploads(analysis_id);

CREATE INDEX CONCURRENTLY idx_file_uploads_upload_status
  ON medical_file_uploads(upload_status, created_at DESC);

CREATE INDEX CONCURRENTLY idx_file_uploads_virus_scan
  ON medical_file_uploads(virus_scan_status, created_at DESC);

-- Partial index for active files
CREATE INDEX CONCURRENTLY idx_file_uploads_active
  ON medical_file_uploads(doctor_id, created_at DESC)
  WHERE upload_status = 'completed' AND virus_scan_status = 'clean';

-- Partial index for retention cleanup
CREATE INDEX CONCURRENTLY idx_file_uploads_retention
  ON medical_file_uploads(retention_expires_at)
  WHERE upload_status IN ('completed', 'failed');

-- Comments for compliance
COMMENT ON TABLE medical_file_uploads IS 'Medical file uploads with encryption and virus scanning - Law 19.628 compliant';
COMMENT ON COLUMN medical_file_uploads.encryption_key_id IS 'AES-256-GCM encryption key reference';
COMMENT ON COLUMN medical_file_uploads.integrity_hash IS 'SHA-256 hash for file integrity verification';
COMMENT ON COLUMN medical_file_uploads.virus_scan_status IS 'Mandatory virus scan before processing';
COMMENT ON COLUMN medical_file_uploads.retention_expires_at IS 'Automatic deletion date per data retention policy';

-- Trigger for updated_at
CREATE TRIGGER update_medical_file_uploads_updated_at
  BEFORE UPDATE ON medical_file_uploads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Rollback migration
-- DROP INDEX IF EXISTS idx_file_uploads_retention;
-- DROP INDEX IF EXISTS idx_file_uploads_active;
-- DROP INDEX IF EXISTS idx_file_uploads_virus_scan;
-- DROP INDEX IF EXISTS idx_file_uploads_upload_status;
-- DROP INDEX IF EXISTS idx_file_uploads_analysis_id;
-- DROP INDEX IF EXISTS idx_file_uploads_doctor_id;
-- DROP INDEX IF EXISTS idx_file_uploads_session_id;
-- DROP TRIGGER IF EXISTS update_medical_file_uploads_updated_at ON medical_file_uploads;
-- DROP TABLE IF EXISTS medical_file_uploads;
