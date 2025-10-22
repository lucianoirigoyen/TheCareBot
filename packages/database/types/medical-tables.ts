/**
 * Supabase Database Types for TheCareBot Medical System
 * Row-Level Security (RLS) enabled for all medical data
 * 
 * CRITICAL: All medical tables follow Chilean Law 19.628 compliance
 * Patient data encrypted and access-controlled per doctor
 */

import { 
  DoctorId, 
  PatientRUT, 
  SessionId, 
  AnalysisId, 
  WorkflowExecutionId,
  MedicalLicense,
  ChileanMedicalSpecialty,
  MedicalWorkflowIntention,
  MedicalDataClassification,
  ConfidenceLevel
} from '../../types/medical/core';

// ============================================================================
// DOCTOR PROFILES TABLE
// ============================================================================

export interface DoctorProfile {
  readonly id: DoctorId;
  readonly medical_license: MedicalLicense;
  readonly first_name: string;
  readonly last_name: string;
  readonly specialty: ChileanMedicalSpecialty;
  readonly email: string;
  readonly phone?: string;
  readonly institution_affiliation?: string;
  readonly region: string;
  readonly license_expiration: Date;
  readonly is_active: boolean;
  readonly last_license_verification: Date;
  readonly created_at: Date;
  readonly updated_at: Date;
}

// ============================================================================
// MEDICAL SESSIONS TABLE (20-MINUTE TIMEOUT ENFORCED)
// ============================================================================

export interface MedicalSession {
  readonly id: SessionId;
  readonly doctor_id: DoctorId;
  readonly start_time: Date;
  readonly last_activity: Date;
  readonly expires_at: Date; // 20 minutes from start_time
  readonly is_active: boolean;
  readonly warning_shown_at?: Date; // 2-minute warning timestamp
  readonly demo_mode: boolean;
  readonly ip_address: string;
  readonly user_agent: string;
  readonly created_at: Date;
  readonly updated_at: Date;
}

// ============================================================================
// PATIENT ANALYSES TABLE
// ============================================================================

export interface PatientAnalysis {
  readonly id: AnalysisId;
  readonly session_id: SessionId;
  readonly doctor_id: DoctorId;
  readonly patient_rut_hash: string; // Hashed RUT for privacy
  readonly workflow_execution_id: WorkflowExecutionId;
  readonly intention: MedicalWorkflowIntention;
  readonly confidence_score: number; // 0.0 to 1.0
  readonly confidence_level: ConfidenceLevel;
  readonly findings: readonly string[];
  readonly recommendations: readonly string[];
  readonly requires_manual_review: boolean;
  readonly processing_time_ms: number;
  readonly fallback_mode: boolean;
  readonly data_classification: MedicalDataClassification;
  readonly file_upload_path?: string;
  readonly file_type?: 'excel' | 'radiography' | 'document';
  readonly created_at: Date;
  readonly updated_at: Date;
}

// ============================================================================
// N8N WORKFLOW EXECUTIONS TABLE
// ============================================================================

export interface WorkflowExecution {
  readonly id: WorkflowExecutionId;
  readonly session_id: SessionId;
  readonly doctor_id: DoctorId;
  readonly workflow_id: string;
  readonly workflow_name: string;
  readonly intention: MedicalWorkflowIntention;
  readonly execution_status: 'pending' | 'running' | 'success' | 'failed' | 'timeout';
  readonly input_data: Record<string, unknown>;
  readonly output_data?: Record<string, unknown>;
  readonly error_message?: string;
  readonly started_at: Date;
  readonly completed_at?: Date;
  readonly execution_time_ms?: number;
  readonly fallback_triggered: boolean;
  readonly created_at: Date;
}

// ============================================================================
// MEDICAL DATA ACCESS AUDIT LOG
// ============================================================================

export interface MedicalAccessAudit {
  readonly id: string;
  readonly event_type: 'access' | 'modify' | 'delete' | 'export' | 'view';
  readonly doctor_id: DoctorId;
  readonly session_id?: SessionId;
  readonly patient_rut_hash?: string;
  readonly analysis_id?: AnalysisId;
  readonly table_name: string;
  readonly record_id: string;
  readonly data_classification: MedicalDataClassification;
  readonly ip_address: string;
  readonly user_agent: string;
  readonly purpose: string;
  readonly success: boolean;
  readonly error_message?: string;
  readonly timestamp: Date;
  readonly created_at: Date;
}

// ============================================================================
// MEDICAL FILE UPLOADS TABLE
// ============================================================================

export interface MedicalFileUpload {
  readonly id: string;
  readonly session_id: SessionId;
  readonly doctor_id: DoctorId;
  readonly analysis_id?: AnalysisId;
  readonly file_name: string;
  readonly file_type: 'excel' | 'radiography' | 'document';
  readonly file_size_bytes: number;
  readonly file_path: string; // Encrypted storage path
  readonly mime_type: string;
  readonly upload_status: 'uploading' | 'completed' | 'failed' | 'deleted';
  readonly encryption_key_id: string;
  readonly integrity_hash: string;
  readonly virus_scan_status: 'pending' | 'clean' | 'infected' | 'error';
  readonly retention_expires_at: Date;
  readonly created_at: Date;
  readonly updated_at: Date;
}

// ============================================================================
// SYSTEM HEALTH MONITORING TABLE
// ============================================================================

export interface SystemHealthMetric {
  readonly id: string;
  readonly metric_type: 'n8n_availability' | 'database_performance' | 'session_timeout' | 'file_upload';
  readonly metric_value: number;
  readonly threshold_min?: number;
  readonly threshold_max?: number;
  readonly status: 'healthy' | 'warning' | 'critical';
  readonly message?: string;
  readonly doctor_id?: DoctorId;
  readonly session_id?: SessionId;
  readonly timestamp: Date;
  readonly created_at: Date;
}

// ============================================================================
// DEMO MODE DATA (SAFE FOR FALLBACK)
// ============================================================================

export interface DemoMedicalData {
  readonly id: string;
  readonly demo_type: 'patient_search' | 'excel_analysis' | 'radiography_analysis';
  readonly demo_scenario: string;
  readonly sample_input: Record<string, unknown>;
  readonly sample_output: Record<string, unknown>;
  readonly confidence_score: number;
  readonly is_active: boolean;
  readonly created_at: Date;
  readonly updated_at: Date;
}

// ============================================================================
// ROW LEVEL SECURITY (RLS) POLICY TYPES
// ============================================================================

export interface RLSPolicy {
  readonly table_name: string;
  readonly policy_name: string;
  readonly policy_type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  readonly policy_definition: string;
  readonly is_active: boolean;
  readonly created_at: Date;
}

// Medical data RLS policies ensure:
// 1. Doctors only access their own sessions and analyses
// 2. Sessions automatically expire after 20 minutes
// 3. Patient data is encrypted and access-logged
// 4. Demo mode data is clearly separated from real medical data

// Example RLS policies:

export const DOCTOR_PROFILE_RLS = `
  CREATE POLICY "doctors_can_only_access_own_profile" ON doctor_profiles
  FOR ALL USING (auth.uid()::text = id::text);
`;

export const MEDICAL_SESSION_RLS = `
  CREATE POLICY "doctors_can_only_access_own_sessions" ON medical_sessions
  FOR ALL USING (auth.uid()::text = doctor_id::text AND expires_at > NOW());
`;

export const PATIENT_ANALYSIS_RLS = `
  CREATE POLICY "doctors_can_only_access_own_analyses" ON patient_analyses
  FOR ALL USING (auth.uid()::text = doctor_id::text);
`;

export const AUDIT_LOG_RLS = `
  CREATE POLICY "doctors_can_only_view_own_audit_logs" ON medical_access_audit
  FOR SELECT USING (auth.uid()::text = doctor_id::text);
`;

// ============================================================================
// DATABASE TRIGGERS FOR COMPLIANCE
// ============================================================================

// Session timeout enforcement trigger
export const SESSION_TIMEOUT_TRIGGER = `
  CREATE OR REPLACE FUNCTION check_session_timeout()
  RETURNS TRIGGER AS $$
  BEGIN
    IF NEW.expires_at <= NOW() THEN
      NEW.is_active = false;
    END IF;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER enforce_session_timeout
    BEFORE UPDATE ON medical_sessions
    FOR EACH ROW EXECUTE FUNCTION check_session_timeout();
`;

// Automatic audit logging trigger
export const AUDIT_LOGGING_TRIGGER = `
  CREATE OR REPLACE FUNCTION log_medical_data_access()
  RETURNS TRIGGER AS $$
  BEGIN
    INSERT INTO medical_access_audit (
      event_type,
      doctor_id,
      table_name,
      record_id,
      data_classification,
      ip_address,
      user_agent,
      purpose,
      success,
      timestamp
    ) VALUES (
      TG_OP,
      COALESCE(NEW.doctor_id, OLD.doctor_id),
      TG_TABLE_NAME,
      COALESCE(NEW.id, OLD.id),
      'restricted',
      current_setting('request.header.x-forwarded-for', true),
      current_setting('request.header.user-agent', true),
      'database_operation',
      true,
      NOW()
    );
    RETURN COALESCE(NEW, OLD);
  END;
  $$ LANGUAGE plpgsql;
`;

// ============================================================================
// DATABASE FUNCTIONS FOR MEDICAL OPERATIONS
// ============================================================================

export const MEDICAL_SESSION_FUNCTIONS = `
  -- Create new medical session with 20-minute timeout
  CREATE OR REPLACE FUNCTION create_medical_session(
    p_doctor_id UUID,
    p_demo_mode BOOLEAN DEFAULT false
  ) RETURNS UUID AS $$
  DECLARE
    session_id UUID;
  BEGIN
    session_id := gen_random_uuid();
    
    INSERT INTO medical_sessions (
      id,
      doctor_id,
      start_time,
      last_activity,
      expires_at,
      is_active,
      demo_mode,
      ip_address,
      user_agent
    ) VALUES (
      session_id,
      p_doctor_id,
      NOW(),
      NOW(),
      NOW() + INTERVAL '20 minutes',
      true,
      p_demo_mode,
      current_setting('request.header.x-forwarded-for', true),
      current_setting('request.header.user-agent', true)
    );
    
    RETURN session_id;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  -- Extend session activity (up to 20-minute limit)
  CREATE OR REPLACE FUNCTION extend_session_activity(p_session_id UUID)
  RETURNS BOOLEAN AS $$
  BEGIN
    UPDATE medical_sessions 
    SET 
      last_activity = NOW(),
      expires_at = GREATEST(expires_at, NOW() + INTERVAL '20 minutes')
    WHERE 
      id = p_session_id 
      AND is_active = true 
      AND expires_at > NOW();
      
    RETURN FOUND;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
`;