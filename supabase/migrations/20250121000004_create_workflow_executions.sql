-- Migration: Create langgraph_workflow_executions table
-- Description: LangGraph medical workflow execution tracking
-- Note: Replaces legacy n8n workflow system

CREATE TABLE langgraph_workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES medical_sessions(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  workflow_id TEXT NOT NULL,
  workflow_name TEXT NOT NULL,
  intention TEXT NOT NULL,
  execution_status TEXT NOT NULL DEFAULT 'pending',
  input_data JSONB NOT NULL DEFAULT '{}',
  output_data JSONB,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Execution status validation
  CONSTRAINT valid_execution_status CHECK (execution_status IN (
    'pending', 'running', 'success', 'failed', 'timeout'
  )),

  -- Medical workflow intentions
  CONSTRAINT valid_workflow_intention CHECK (intention IN (
    'buscar_paciente',
    'analizar_excel',
    'analizar_radiografia',
    'diagnostico_general',
    'recomendacion_tratamiento'
  )),

  -- Completed workflows must have completion timestamp
  CONSTRAINT completed_check CHECK (
    (execution_status = 'success' AND completed_at IS NOT NULL) OR
    (execution_status != 'success')
  ),

  -- Execution time consistency
  CONSTRAINT valid_execution_time CHECK (
    (completed_at IS NOT NULL AND execution_time_ms IS NOT NULL AND
     execution_time_ms = EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000) OR
    (completed_at IS NULL AND execution_time_ms IS NULL)
  ),

  -- Completed timestamp must be after start
  CONSTRAINT valid_completion CHECK (completed_at IS NULL OR completed_at >= started_at)
);

-- Create indexes for workflow queries
CREATE INDEX CONCURRENTLY idx_workflow_executions_session_id
  ON langgraph_workflow_executions(session_id);

CREATE INDEX CONCURRENTLY idx_workflow_executions_doctor_id
  ON langgraph_workflow_executions(doctor_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_workflow_executions_status
  ON langgraph_workflow_executions(execution_status, created_at DESC);

CREATE INDEX CONCURRENTLY idx_workflow_executions_workflow_id
  ON langgraph_workflow_executions(workflow_id, execution_status);

CREATE INDEX CONCURRENTLY idx_workflow_executions_intention
  ON langgraph_workflow_executions(intention, execution_status, created_at DESC);

-- Partial index for failed workflows
CREATE INDEX CONCURRENTLY idx_workflow_executions_failed
  ON langgraph_workflow_executions(doctor_id, created_at DESC)
  WHERE execution_status IN ('failed', 'timeout');

-- GIN indexes for JSONB fields
CREATE INDEX CONCURRENTLY idx_workflow_executions_input
  ON langgraph_workflow_executions USING GIN (input_data);

CREATE INDEX CONCURRENTLY idx_workflow_executions_output
  ON langgraph_workflow_executions USING GIN (output_data);

-- Comments for medical compliance
COMMENT ON TABLE langgraph_workflow_executions IS 'LangGraph medical workflow execution tracking for audit compliance';
COMMENT ON COLUMN langgraph_workflow_executions.workflow_id IS 'LangGraph workflow identifier';
COMMENT ON COLUMN langgraph_workflow_executions.execution_status IS 'Workflow execution state for monitoring';
COMMENT ON COLUMN langgraph_workflow_executions.execution_time_ms IS 'Processing time for SLA compliance';

-- Rollback migration
-- DROP INDEX IF EXISTS idx_workflow_executions_output;
-- DROP INDEX IF EXISTS idx_workflow_executions_input;
-- DROP INDEX IF EXISTS idx_workflow_executions_failed;
-- DROP INDEX IF EXISTS idx_workflow_executions_intention;
-- DROP INDEX IF EXISTS idx_workflow_executions_workflow_id;
-- DROP INDEX IF EXISTS idx_workflow_executions_status;
-- DROP INDEX IF EXISTS idx_workflow_executions_doctor_id;
-- DROP INDEX IF EXISTS idx_workflow_executions_session_id;
-- DROP TABLE IF EXISTS langgraph_workflow_executions;
