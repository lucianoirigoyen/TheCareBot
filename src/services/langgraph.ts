/**
 * LangGraph Client for TheCareBot
 * TypeScript client to communicate with Python FastAPI backend
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type SessionId = string & { readonly __brand: 'SessionId' };
export type DoctorId = string & { readonly __brand: 'DoctorId' };
export type PatientRUT = string & { readonly __brand: 'PatientRUT' };

export interface WorkflowResult<T = unknown> {
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: T;
  errors: string[];
  confidenceScore?: {
    value: number;
    requiresManualReview: boolean;
  };
  startTime: string;
  endTime: string;
  processingTimeMs: number;
}

// Patient Search Types
export interface PatientSearchInput {
  patientRUT: PatientRUT;
}

export interface PatientSearchResult {
  found: boolean;
  patient?: {
    age: number;
    gender: string;
    medicalHistory: string[];
  };
}

// Excel Analysis Types
export interface ExcelAnalysisInput {
  fileUrl: string;
  fileType: 'xlsx' | 'xls' | 'csv';
  expectedColumns?: string[];
}

export interface ExcelAnalysisResult {
  summary: string;
  insights: string[];
  warnings: string[];
}

// Radiography Analysis Types
export interface RadiographyAnalysisInput {
  imageUrls: readonly string[];
  bodyRegion: 'head' | 'neck' | 'chest' | 'abdomen' | 'arms' | 'legs' | 'hands' | 'feet' | 'back';
  symptoms?: string[];
  patientAge?: number;
  patientGender?: 'male' | 'female' | 'other';
}

export interface RadiographyAnalysisResult {
  findings: string[];
  recommendations: string[];
  urgencyLevel: 'routine' | 'urgent' | 'emergency';
  requiresSpecialistReview: boolean;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const PYTHON_API_URL = process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function callPythonAPI<T>(endpoint: string, data: unknown): Promise<WorkflowResult<T>> {
  const startTime = new Date().toISOString();
  const start = Date.now();

  try {
    const response = await fetch(`${PYTHON_API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const endTime = new Date().toISOString();
    const processingTimeMs = Date.now() - start;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      return {
        status: 'failed',
        errors: [errorData.detail || `HTTP ${response.status}`],
        startTime,
        endTime,
        processingTimeMs,
      };
    }

    const result = await response.json();

    return {
      status: 'completed',
      result: result as T,
      errors: [],
      startTime,
      endTime,
      processingTimeMs,
    };
  } catch (error) {
    const endTime = new Date().toISOString();
    const processingTimeMs = Date.now() - start;

    return {
      status: 'failed',
      errors: [error instanceof Error ? error.message : 'Network error'],
      startTime,
      endTime,
      processingTimeMs,
    };
  }
}

// ============================================================================
// MEDICAL AI WORKFLOWS (MOCK - TODO: Implement in Python)
// ============================================================================

/**
 * Execute patient search workflow (LangGraph)
 * NOTE: This is currently a MOCK implementation
 * TODO: Add this workflow to Python backend
 */
export async function executePatientSearch(
  sessionId: SessionId,
  doctorId: DoctorId,
  input: PatientSearchInput
): Promise<WorkflowResult<PatientSearchResult>> {
  console.warn('[LangGraph] Patient search not yet implemented in Python backend - using mock');

  // Mock implementation for demo
  const startTime = new Date().toISOString();
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate processing

  return {
    status: 'completed',
    result: {
      found: true,
      patient: {
        age: 45,
        gender: 'male',
        medicalHistory: ['Diabetes tipo 2', 'Hipertensión arterial'],
      },
    },
    errors: [],
    confidenceScore: {
      value: 0.95,
      requiresManualReview: false,
    },
    startTime,
    endTime: new Date().toISOString(),
    processingTimeMs: 500,
  };
}

/**
 * Execute Excel analysis workflow (LangGraph)
 * NOTE: This is currently a MOCK implementation
 * TODO: Add this workflow to Python backend
 */
export async function executeExcelAnalysis(
  sessionId: SessionId,
  doctorId: DoctorId,
  input: ExcelAnalysisInput
): Promise<WorkflowResult<ExcelAnalysisResult>> {
  console.warn('[LangGraph] Excel analysis not yet implemented in Python backend - using mock');

  // Mock implementation for demo
  const startTime = new Date().toISOString();
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing

  return {
    status: 'completed',
    result: {
      summary: 'Análisis de resultados de laboratorio completo',
      insights: [
        'Glucosa en ayunas: 120 mg/dL (ligeramente elevada)',
        'Colesterol total: 180 mg/dL (rango normal)',
        'Hemoglobina: 14.2 g/dL (rango normal)',
      ],
      warnings: [
        'Glucosa en ayunas requiere seguimiento',
      ],
    },
    errors: [],
    confidenceScore: {
      value: 0.88,
      requiresManualReview: false,
    },
    startTime,
    endTime: new Date().toISOString(),
    processingTimeMs: 1000,
  };
}

/**
 * Execute radiography analysis workflow (LangGraph)
 * NOTE: This is currently a MOCK implementation
 * TODO: Add this workflow to Python backend
 */
export async function executeRadiographyAnalysis(
  sessionId: SessionId,
  doctorId: DoctorId,
  input: RadiographyAnalysisInput
): Promise<WorkflowResult<RadiographyAnalysisResult>> {
  console.warn('[LangGraph] Radiography analysis not yet implemented in Python backend - using mock');

  // Mock implementation for demo
  const startTime = new Date().toISOString();
  await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing

  return {
    status: 'completed',
    result: {
      findings: [
        'Campos pulmonares transparentes',
        'Índice cardiotorácico normal',
        'No se observan infiltrados',
      ],
      recommendations: [
        'Control radiológico en 6 meses',
        'Mantener tratamiento actual',
      ],
      urgencyLevel: 'routine',
      requiresSpecialistReview: false,
    },
    errors: [],
    confidenceScore: {
      value: 0.82,
      requiresManualReview: true,
    },
    startTime,
    endTime: new Date().toISOString(),
    processingTimeMs: 2000,
  };
}

// ============================================================================
// SII FACTURACION WORKFLOWS (IMPLEMENTED IN PYTHON)
// ============================================================================

export interface AutofillRequest {
  doctor_id: string;
  campo: string;
  current_value: string;
  contexto: Record<string, unknown>;
}

export interface AutofillPrediction {
  valor: string;
  confidence: number;
  frecuencia: number;
  contexto_match: boolean;
  icon?: string;
  reasoning?: string;
}

/**
 * Get autofill predictions from Python LangGraph backend
 */
export async function getAutofillPredictions(
  request: AutofillRequest
): Promise<AutofillPrediction[]> {
  try {
    const result = await callPythonAPI<{ success: boolean; predictions: AutofillPrediction[] }>(
      '/api/invoke/autofill',
      request
    );

    if (result.status === 'failed') {
      console.error('[LangGraph] Autofill failed:', result.errors);
      return [];
    }

    return result.result?.predictions || [];
  } catch (error) {
    console.error('[LangGraph] Autofill error:', error);
    return [];
  }
}
