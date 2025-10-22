-- Migration: Create patient_analyses table
-- Description: Medical analysis results with confidence scoring
-- Compliance: Chilean Law 19.628 - Patient data protection with hashed RUT

CREATE TABLE patient_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES medical_sessions(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  patient_rut_hash TEXT NOT NULL,
  langgraph_execution_id UUID,
  intention TEXT NOT NULL,
  confidence_score NUMERIC(3,2) NOT NULL,
  confidence_level TEXT NOT NULL,
  findings JSONB NOT NULL DEFAULT '[]',
  recommendations JSONB NOT NULL DEFAULT '[]',
  requires_manual_review BOOLEAN NOT NULL DEFAULT false,
  processing_time_ms INTEGER NOT NULL,
  data_classification TEXT NOT NULL DEFAULT 'restricted',
  file_upload_path TEXT,
  file_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Confidence score validation (0.00 to 1.00)
  CONSTRAINT valid_confidence_score CHECK (confidence_score >= 0.00 AND confidence_score <= 1.00),

  -- Confidence level validation
  CONSTRAINT valid_confidence_level CHECK (confidence_level IN ('high', 'medium', 'low', 'critical')),

  -- Medical workflow intentions
  CONSTRAINT valid_intention CHECK (intention IN (
    'buscar_paciente',
    'analizar_excel',
    'analizar_radiografia',
    'diagnostico_general',
    'recomendacion_tratamiento'
  )),

  -- Data classification levels
  CONSTRAINT valid_data_classification CHECK (data_classification IN (
    'public', 'internal', 'confidential', 'restricted', 'top_secret'
  )),

  -- File type validation
  CONSTRAINT valid_file_type CHECK (file_type IS NULL OR file_type IN ('excel', 'radiography', 'document')),

  -- Manual review required for low confidence (<0.70)
  CONSTRAINT manual_review_check CHECK (
    (confidence_score < 0.70 AND requires_manual_review = true) OR
    (confidence_score >= 0.70)
  ),

  -- Patient RUT hash format validation (SHA-256 hex)
  CONSTRAINT valid_rut_hash CHECK (patient_rut_hash ~ '^[a-f0-9]{64}$')
);

-- Create indexes for analysis queries
CREATE INDEX CONCURRENTLY idx_patient_analyses_session_id
  ON patient_analyses(session_id);

CREATE INDEX CONCURRENTLY idx_patient_analyses_doctor_id
  ON patient_analyses(doctor_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_patient_analyses_patient_rut
  ON patient_analyses(patient_rut_hash, created_at DESC);

CREATE INDEX CONCURRENTLY idx_patient_analyses_intention
  ON patient_analyses(intention, created_at DESC);

CREATE INDEX CONCURRENTLY idx_patient_analyses_manual_review
  ON patient_analyses(doctor_id, requires_manual_review, created_at DESC)
  WHERE requires_manual_review = true;

-- GIN index for JSONB fields
CREATE INDEX CONCURRENTLY idx_patient_analyses_findings
  ON patient_analyses USING GIN (findings);

CREATE INDEX CONCURRENTLY idx_patient_analyses_recommendations
  ON patient_analyses USING GIN (recommendations);

-- Comments for compliance
COMMENT ON TABLE patient_analyses IS 'Medical analysis results - Law 19.628 compliant with hashed patient identifiers';
COMMENT ON COLUMN patient_analyses.patient_rut_hash IS 'SHA-256 hash of Chilean RUT - NEVER store plain RUT';
COMMENT ON COLUMN patient_analyses.confidence_score IS 'AI confidence 0.00-1.00 - scores <0.70 require manual review';
COMMENT ON COLUMN patient_analyses.requires_manual_review IS 'Mandated physician review for low confidence analyses';
COMMENT ON COLUMN patient_analyses.langgraph_execution_id IS 'LangGraph workflow execution tracking ID';

-- Trigger for updated_at
CREATE TRIGGER update_patient_analyses_updated_at
  BEFORE UPDATE ON patient_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Rollback migration
-- DROP INDEX IF EXISTS idx_patient_analyses_recommendations;
-- DROP INDEX IF EXISTS idx_patient_analyses_findings;
-- DROP INDEX IF EXISTS idx_patient_analyses_manual_review;
-- DROP INDEX IF EXISTS idx_patient_analyses_intention;
-- DROP INDEX IF EXISTS idx_patient_analyses_patient_rut;
-- DROP INDEX IF EXISTS idx_patient_analyses_doctor_id;
-- DROP INDEX IF EXISTS idx_patient_analyses_session_id;
-- DROP TRIGGER IF EXISTS update_patient_analyses_updated_at ON patient_analyses;
-- DROP TABLE IF EXISTS patient_analyses;
