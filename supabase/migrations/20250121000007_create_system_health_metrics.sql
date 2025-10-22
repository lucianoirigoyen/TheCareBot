-- Migration: Create system_health_metrics table
-- Description: System health monitoring for medical infrastructure
-- Purpose: Track LangGraph availability, database performance, session timeouts

CREATE TABLE system_health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  threshold_min NUMERIC,
  threshold_max NUMERIC,
  status TEXT NOT NULL DEFAULT 'healthy',
  message TEXT,
  doctor_id UUID REFERENCES doctor_profiles(id) ON DELETE SET NULL,
  session_id UUID REFERENCES medical_sessions(id) ON DELETE SET NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Metric type validation
  CONSTRAINT valid_metric_type CHECK (metric_type IN (
    'langgraph_availability',
    'database_performance',
    'session_timeout',
    'file_upload',
    'analysis_latency',
    'workflow_success_rate',
    'circuit_breaker_status'
  )),

  -- Health status validation
  CONSTRAINT valid_status CHECK (status IN ('healthy', 'warning', 'critical', 'unknown')),

  -- Threshold validation
  CONSTRAINT valid_thresholds CHECK (
    (threshold_min IS NULL AND threshold_max IS NULL) OR
    (threshold_min IS NOT NULL AND threshold_max IS NOT NULL AND threshold_min <= threshold_max)
  ),

  -- Status must match threshold violations
  CONSTRAINT status_threshold_consistency CHECK (
    (threshold_min IS NULL) OR
    (metric_value >= threshold_min AND metric_value <= threshold_max AND status = 'healthy') OR
    (metric_value < threshold_min OR metric_value > threshold_max)
  )
);

-- Create indexes for health monitoring queries
CREATE INDEX CONCURRENTLY idx_health_metrics_type_timestamp
  ON system_health_metrics(metric_type, timestamp DESC);

CREATE INDEX CONCURRENTLY idx_health_metrics_status_timestamp
  ON system_health_metrics(status, timestamp DESC);

CREATE INDEX CONCURRENTLY idx_health_metrics_timestamp
  ON system_health_metrics(timestamp DESC);

CREATE INDEX CONCURRENTLY idx_health_metrics_doctor_id
  ON system_health_metrics(doctor_id, timestamp DESC);

CREATE INDEX CONCURRENTLY idx_health_metrics_session_id
  ON system_health_metrics(session_id, timestamp DESC);

-- Partial index for critical issues
CREATE INDEX CONCURRENTLY idx_health_metrics_critical
  ON system_health_metrics(metric_type, timestamp DESC)
  WHERE status IN ('critical', 'warning');

-- Comments for monitoring
COMMENT ON TABLE system_health_metrics IS 'System health monitoring for medical infrastructure reliability';
COMMENT ON COLUMN system_health_metrics.metric_type IS 'Type of health metric being tracked';
COMMENT ON COLUMN system_health_metrics.status IS 'Current health status for alerting';
COMMENT ON COLUMN system_health_metrics.threshold_min IS 'Minimum acceptable value for metric';
COMMENT ON COLUMN system_health_metrics.threshold_max IS 'Maximum acceptable value for metric';

-- Rollback migration
-- DROP INDEX IF EXISTS idx_health_metrics_critical;
-- DROP INDEX IF EXISTS idx_health_metrics_session_id;
-- DROP INDEX IF EXISTS idx_health_metrics_doctor_id;
-- DROP INDEX IF EXISTS idx_health_metrics_timestamp;
-- DROP INDEX IF EXISTS idx_health_metrics_status_timestamp;
-- DROP INDEX IF EXISTS idx_health_metrics_type_timestamp;
-- DROP TABLE IF EXISTS system_health_metrics;
