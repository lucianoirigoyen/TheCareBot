-- TheCareBot Core Tables Migration
-- Created: 2025-01-21
-- Purpose: Create production database schema for LangGraph medical workflows

-- Doctor Profiles Table
CREATE TABLE IF NOT EXISTS doctor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  medical_license TEXT UNIQUE NOT NULL,
  specialty TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  CONSTRAINT valid_license CHECK (medical_license ~ '^[0-9]{6,10}$')
);

-- Patients Table
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rut TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 0 AND age <= 120),
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT valid_rut CHECK (rut ~ '^[0-9]{7,8}-[0-9Kk]$')
);

-- Medical Sessions Table (20-minute timeout - Chilean law requirement)
CREATE TABLE IF NOT EXISTS medical_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  patient_rut TEXT NOT NULL,
  session_type TEXT NOT NULL DEFAULT 'analysis',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '20 minutes'),
  
  CONSTRAINT valid_rut CHECK (patient_rut ~ '^[0-9]{7,8}-[0-9Kk]$'),
  CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- LangGraph Executions Table (replaces n8n_executions)
CREATE TABLE IF NOT EXISTS langgraph_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES medical_sessions(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctor_profiles(id),
  intention TEXT NOT NULL CHECK (intention IN ('buscar_paciente', 'analizar_excel', 'analizar_radiografia')),
  status TEXT NOT NULL CHECK (status IN ('idle', 'processing', 'completed', 'failed', 'manual_review_required')),
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  requires_manual_review BOOLEAN DEFAULT FALSE,
  result_data JSONB,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  processing_time_ms INTEGER
);

-- Medical Analyses Table
CREATE TABLE IF NOT EXISTS medical_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES medical_sessions(id),
  patient_rut TEXT,
  analysis_type TEXT NOT NULL,
  input_data JSONB NOT NULL,
  results JSONB,
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  status TEXT NOT NULL DEFAULT 'pending',
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Workflow Audit Logs (immutable - Chilean Ley 19.628 compliance)
CREATE TABLE IF NOT EXISTS workflow_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  session_id UUID REFERENCES medical_sessions(id),
  doctor_id UUID NOT NULL REFERENCES doctor_profiles(id),
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Comments for compliance
COMMENT ON TABLE workflow_audit_logs IS 'Immutable audit trail for Chilean Ley 19.628 compliance - NO UPDATES OR DELETES ALLOWED';
COMMENT ON TABLE medical_sessions IS 'Sessions expire after 20 minutes per Chilean medical law';
COMMENT ON COLUMN langgraph_executions.requires_manual_review IS 'True when confidence_score < 0.7';
