-- TheCareBot Performance Indexes and Utility Functions
-- Optimizes database performance for medical applications with high concurrency
-- Created: 2025-09-04

BEGIN;

-- =============================================================================
-- PERFORMANCE INDEXES FOR MEDICAL QUERIES
-- =============================================================================

-- Doctor Profiles Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_doctor_profiles_email 
  ON doctor_profiles(email) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_doctor_profiles_license 
  ON doctor_profiles(medical_license) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_doctor_profiles_specialty 
  ON doctor_profiles(specialty, created_at DESC) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_doctor_profiles_last_login 
  ON doctor_profiles(last_login_at DESC) WHERE is_active = true;

-- Medical Sessions Indexes (Most Critical for Performance)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_medical_sessions_doctor_status 
  ON medical_sessions(doctor_id, status) WHERE status IN ('active', 'completed');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_medical_sessions_created_at 
  ON medical_sessions(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_medical_sessions_expires_at 
  ON medical_sessions(expires_at) WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_medical_sessions_patient_hash 
  ON medical_sessions(patient_rut_hash, created_at DESC);

-- Composite index for doctor's active sessions (hot path query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_active_sessions_doctor 
  ON medical_sessions(doctor_id, created_at DESC) 
  WHERE status = 'active';

-- Index for session timeout monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_timeout_monitoring 
  ON medical_sessions(expires_at, status) 
  WHERE status = 'active' AND expires_at <= now() + INTERVAL '5 minutes';

-- Medical Analyses Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_medical_analyses_session_status 
  ON medical_analyses(session_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_medical_analyses_type_created 
  ON medical_analyses(analysis_type, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_medical_analyses_confidence 
  ON medical_analyses(confidence_score DESC) WHERE status = 'completed';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_medical_analyses_n8n_execution 
  ON medical_analyses(n8n_execution_id) WHERE n8n_execution_id IS NOT NULL;

-- Composite index for doctor's analyses performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_doctor_analyses_performance 
  ON medical_analyses(session_id, status, created_at DESC);

-- Workflow Executions Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_executions_session 
  ON workflow_executions(session_id, execution_status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_executions_n8n_id 
  ON workflow_executions(n8n_execution_id) WHERE n8n_execution_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_executions_name_status 
  ON workflow_executions(workflow_name, execution_status, created_at DESC);

-- Index for failed workflows analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_failed_workflows 
  ON workflow_executions(workflow_name, created_at DESC) 
  WHERE execution_status = 'error';

-- Audit Medical Access Indexes (Critical for Compliance)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_session_created 
  ON audit_medical_access(session_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_doctor_action 
  ON audit_medical_access(doctor_id, action, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_created_at 
  ON audit_medical_access(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_patient_access 
  ON audit_medical_access(patient_rut_hash, created_at DESC) 
  WHERE patient_rut_hash IS NOT NULL;

-- Index for security monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_security_events 
  ON audit_medical_access(action, ip_address, created_at DESC) 
  WHERE action IN ('login_failed', 'unauthorized_access', 'security_violation');

-- Patient Data Cache Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patient_cache_session 
  ON patient_data_cache(session_id, data_type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patient_cache_expiry 
  ON patient_data_cache(expires_at) WHERE expires_at > now();

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patient_cache_patient_hash 
  ON patient_data_cache(patient_rut_hash, created_at DESC);

-- =============================================================================
-- SPECIALIZED INDEXES FOR JSONB DATA
-- =============================================================================

-- Index on session metadata for custom query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_metadata_gin 
  ON medical_sessions USING GIN(metadata) WHERE metadata != '{}';

-- Index on analysis results for AI confidence searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analyses_results_gin 
  ON medical_analyses USING GIN(results) WHERE results IS NOT NULL;

-- Index on workflow input/output data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_input_gin 
  ON workflow_executions USING GIN(input_data);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_output_gin 
  ON workflow_executions USING GIN(output_data) WHERE output_data IS NOT NULL;

-- Index on audit request data for compliance queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_request_data_gin 
  ON audit_medical_access USING GIN(request_data) WHERE request_data IS NOT NULL;

-- =============================================================================
-- ADVANCED QUERY OPTIMIZATION FUNCTIONS
-- =============================================================================

-- Function: Get doctor's session summary with performance optimizations
CREATE OR REPLACE FUNCTION get_doctor_dashboard_data(doctor_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  WITH session_stats AS (
    SELECT 
      COUNT(*) as total_sessions,
      COUNT(*) FILTER (WHERE status = 'active') as active_sessions,
      COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions,
      COUNT(*) FILTER (WHERE created_at >= current_date) as today_sessions
    FROM medical_sessions 
    WHERE doctor_id = doctor_uuid 
      AND created_at >= current_date - INTERVAL '30 days'
  ),
  analysis_stats AS (
    SELECT 
      COUNT(*) as total_analyses,
      COUNT(*) FILTER (WHERE ma.status = 'completed') as completed_analyses,
      ROUND(AVG(ma.confidence_score), 3) as avg_confidence,
      COUNT(*) FILTER (WHERE ma.created_at >= current_date) as today_analyses
    FROM medical_analyses ma
    JOIN medical_sessions ms ON ma.session_id = ms.id
    WHERE ms.doctor_id = doctor_uuid 
      AND ma.created_at >= current_date - INTERVAL '30 days'
  ),
  recent_sessions AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', id,
        'patient_rut_hash', patient_rut_hash,
        'status', status,
        'created_at', created_at,
        'expires_at', expires_at
      )
      ORDER BY created_at DESC
    ) as sessions
    FROM medical_sessions 
    WHERE doctor_id = doctor_uuid 
      AND created_at >= current_date - INTERVAL '7 days'
    LIMIT 10
  )
  SELECT jsonb_build_object(
    'session_stats', to_jsonb(ss),
    'analysis_stats', to_jsonb(ans),
    'recent_sessions', rs.sessions,
    'last_updated', now()
  )
  INTO result
  FROM session_stats ss, analysis_stats ans, recent_sessions rs;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Advanced session search with filters
CREATE OR REPLACE FUNCTION search_medical_sessions(
  doctor_uuid UUID,
  status_filter session_status DEFAULT NULL,
  date_from TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  date_to TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  patient_rut_hash_filter TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 50
)
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', ms.id,
        'patient_rut_hash', ms.patient_rut_hash,
        'status', ms.status,
        'session_type', ms.session_type,
        'created_at', ms.created_at,
        'expires_at', ms.expires_at,
        'completed_at', ms.completed_at,
        'analyses_count', (
          SELECT COUNT(*) FROM medical_analyses 
          WHERE session_id = ms.id
        ),
        'completed_analyses', (
          SELECT COUNT(*) FROM medical_analyses 
          WHERE session_id = ms.id AND status = 'completed'
        )
      )
      ORDER BY ms.created_at DESC
    )
    FROM medical_sessions ms
    WHERE ms.doctor_id = doctor_uuid
      AND (status_filter IS NULL OR ms.status = status_filter)
      AND (date_from IS NULL OR ms.created_at >= date_from)
      AND (date_to IS NULL OR ms.created_at <= date_to)
      AND (patient_rut_hash_filter IS NULL OR ms.patient_rut_hash = patient_rut_hash_filter)
    ORDER BY ms.created_at DESC
    LIMIT limit_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get analysis performance metrics
CREATE OR REPLACE FUNCTION get_analysis_performance_metrics(
  doctor_uuid UUID,
  days_back INTEGER DEFAULT 30
)
RETURNS JSONB AS $$
BEGIN
  RETURN (
    WITH analysis_metrics AS (
      SELECT 
        ma.analysis_type,
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE ma.status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE ma.status = 'failed') as failed_count,
        ROUND(AVG(ma.processing_time_ms), 2) as avg_processing_time_ms,
        ROUND(AVG(ma.confidence_score) FILTER (WHERE ma.status = 'completed'), 3) as avg_confidence,
        MIN(ma.confidence_score) FILTER (WHERE ma.status = 'completed') as min_confidence,
        MAX(ma.confidence_score) FILTER (WHERE ma.status = 'completed') as max_confidence
      FROM medical_analyses ma
      JOIN medical_sessions ms ON ma.session_id = ms.id
      WHERE ms.doctor_id = doctor_uuid 
        AND ma.created_at >= current_date - (days_back || ' days')::INTERVAL
      GROUP BY ma.analysis_type
    )
    SELECT jsonb_object_agg(
      analysis_type,
      jsonb_build_object(
        'total_analyses', total_count,
        'completed_analyses', completed_count,
        'failed_analyses', failed_count,
        'success_rate', ROUND((completed_count::DECIMAL / NULLIF(total_count, 0)) * 100, 2),
        'avg_processing_time_ms', avg_processing_time_ms,
        'avg_confidence_score', avg_confidence,
        'confidence_range', jsonb_build_object(
          'min', min_confidence,
          'max', max_confidence
        )
      )
    )
    FROM analysis_metrics
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Monitor system health and performance
CREATE OR REPLACE FUNCTION get_system_health_metrics()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  WITH health_metrics AS (
    SELECT 
      (SELECT COUNT(*) FROM medical_sessions WHERE status = 'active') as active_sessions,
      (SELECT COUNT(*) FROM medical_sessions WHERE status = 'active' AND expires_at <= now() + INTERVAL '5 minutes') as expiring_soon,
      (SELECT COUNT(*) FROM medical_analyses WHERE status = 'processing') as processing_analyses,
      (SELECT COUNT(*) FROM workflow_executions WHERE execution_status = 'running') as running_workflows,
      (SELECT COUNT(*) FROM patient_data_cache WHERE expires_at > now()) as cached_entries,
      (SELECT COUNT(*) FROM doctor_profiles WHERE is_active = true AND last_login_at >= current_date - INTERVAL '7 days') as active_doctors_week
  )
  SELECT jsonb_build_object(
    'active_sessions', hm.active_sessions,
    'sessions_expiring_soon', hm.expiring_soon,
    'processing_analyses', hm.processing_analyses,
    'running_workflows', hm.running_workflows,
    'cached_patient_data', hm.cached_entries,
    'active_doctors_this_week', hm.active_doctors_week,
    'system_status', CASE 
      WHEN hm.processing_analyses > 100 THEN 'overloaded'
      WHEN hm.expiring_soon > 20 THEN 'warning'
      ELSE 'healthy'
    END,
    'last_updated', now()
  )
  INTO result
  FROM health_metrics hm;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- DATABASE MAINTENANCE AND OPTIMIZATION FUNCTIONS
-- =============================================================================

-- Function: Analyze table statistics and suggest optimizations
CREATE OR REPLACE FUNCTION analyze_table_performance()
RETURNS JSONB AS $$
DECLARE
  result JSONB := '{}';
  table_stats RECORD;
BEGIN
  -- Analyze key medical tables
  FOR table_stats IN 
    SELECT 
      schemaname,
      tablename,
      n_tup_ins as inserts,
      n_tup_upd as updates,
      n_tup_del as deletes,
      n_live_tup as live_rows,
      n_dead_tup as dead_rows,
      last_vacuum,
      last_autovacuum,
      last_analyze,
      last_autoanalyze
    FROM pg_stat_user_tables 
    WHERE tablename IN ('doctor_profiles', 'medical_sessions', 'medical_analyses', 
                       'workflow_executions', 'audit_medical_access', 'patient_data_cache')
  LOOP
    result := result || jsonb_build_object(
      table_stats.tablename,
      jsonb_build_object(
        'live_rows', table_stats.live_rows,
        'dead_rows', table_stats.dead_rows,
        'dead_row_ratio', CASE 
          WHEN table_stats.live_rows > 0 THEN 
            ROUND((table_stats.dead_rows::DECIMAL / table_stats.live_rows) * 100, 2)
          ELSE 0 
        END,
        'needs_vacuum', table_stats.dead_rows > 1000 AND table_stats.dead_rows > table_stats.live_rows * 0.1,
        'last_vacuum', table_stats.last_vacuum,
        'last_analyze', table_stats.last_analyze,
        'total_operations', table_stats.inserts + table_stats.updates + table_stats.deletes
      )
    );
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get index usage statistics
CREATE OR REPLACE FUNCTION get_index_usage_stats()
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT jsonb_object_agg(
      indexname,
      jsonb_build_object(
        'table', tablename,
        'scans', idx_scan,
        'tuples_read', idx_tup_read,
        'tuples_fetched', idx_tup_fetch,
        'size_mb', ROUND(pg_relation_size(indexrelid) / 1024.0 / 1024.0, 2),
        'usage_ratio', CASE 
          WHEN idx_scan > 0 THEN ROUND((idx_tup_fetch::DECIMAL / idx_tup_read) * 100, 2)
          ELSE 0
        END
      )
    )
    FROM pg_stat_user_indexes 
    WHERE schemaname = 'public' 
      AND tablename IN ('doctor_profiles', 'medical_sessions', 'medical_analyses', 
                       'workflow_executions', 'audit_medical_access', 'patient_data_cache')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Comprehensive database cleanup
CREATE OR REPLACE FUNCTION comprehensive_database_cleanup()
RETURNS JSONB AS $$
DECLARE
  cleanup_results JSONB := '{}';
  expired_sessions INTEGER;
  expired_cache INTEGER;
  old_audit_logs INTEGER;
BEGIN
  -- Cleanup expired sessions
  SELECT cleanup_expired_sessions() INTO expired_sessions;
  
  -- Cleanup expired cache
  SELECT cleanup_expired_cache() INTO expired_cache;
  
  -- Cleanup old audit logs (keep 1 year for compliance)
  DELETE FROM audit_medical_access 
  WHERE created_at < now() - INTERVAL '1 year' 
    AND action NOT IN ('security_violation', 'data_breach', 'unauthorized_access');
  GET DIAGNOSTICS old_audit_logs = ROW_COUNT;
  
  -- Update table statistics
  ANALYZE doctor_profiles;
  ANALYZE medical_sessions;
  ANALYZE medical_analyses;
  ANALYZE workflow_executions;
  ANALYZE audit_medical_access;
  ANALYZE patient_data_cache;
  
  cleanup_results := jsonb_build_object(
    'expired_sessions_cleaned', expired_sessions,
    'expired_cache_cleaned', expired_cache,
    'old_audit_logs_cleaned', old_audit_logs,
    'tables_analyzed', 6,
    'cleanup_completed_at', now()
  );
  
  -- Log cleanup operation
  INSERT INTO audit_medical_access (
    action, resource_type, request_data, response_status, ip_address
  )
  VALUES (
    'comprehensive_database_cleanup',
    'maintenance',
    cleanup_results,
    200,
    '127.0.0.1'::inet
  );
  
  RETURN cleanup_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- PERFORMANCE MONITORING VIEWS
-- =============================================================================

-- View: Active sessions with timeout warnings
CREATE OR REPLACE VIEW active_sessions_monitor AS
SELECT 
  ms.id,
  ms.doctor_id,
  dp.full_name as doctor_name,
  ms.patient_rut_hash,
  ms.created_at,
  ms.expires_at,
  EXTRACT(EPOCH FROM (ms.expires_at - now())) / 60 as minutes_until_expiry,
  CASE 
    WHEN ms.expires_at <= now() THEN 'EXPIRED'
    WHEN ms.expires_at <= now() + INTERVAL '5 minutes' THEN 'EXPIRING_SOON'
    WHEN ms.expires_at <= now() + INTERVAL '10 minutes' THEN 'WARNING'
    ELSE 'OK'
  END as timeout_status,
  (SELECT COUNT(*) FROM medical_analyses WHERE session_id = ms.id) as total_analyses,
  (SELECT COUNT(*) FROM medical_analyses WHERE session_id = ms.id AND status = 'processing') as processing_analyses
FROM medical_sessions ms
JOIN doctor_profiles dp ON ms.doctor_id = dp.id
WHERE ms.status = 'active'
ORDER BY ms.expires_at ASC;

-- View: Analysis performance summary
CREATE OR REPLACE VIEW analysis_performance_summary AS
SELECT 
  ma.analysis_type,
  COUNT(*) as total_analyses,
  COUNT(*) FILTER (WHERE ma.status = 'completed') as completed_count,
  COUNT(*) FILTER (WHERE ma.status = 'failed') as failed_count,
  COUNT(*) FILTER (WHERE ma.status = 'processing') as processing_count,
  ROUND(AVG(ma.processing_time_ms) FILTER (WHERE ma.status = 'completed'), 2) as avg_processing_time_ms,
  ROUND(AVG(ma.confidence_score) FILTER (WHERE ma.status = 'completed'), 3) as avg_confidence_score,
  ROUND((COUNT(*) FILTER (WHERE ma.status = 'completed'))::DECIMAL / COUNT(*) * 100, 2) as success_rate_percent
FROM medical_analyses ma
WHERE ma.created_at >= current_date - INTERVAL '24 hours'
GROUP BY ma.analysis_type
ORDER BY total_analyses DESC;

COMMIT;