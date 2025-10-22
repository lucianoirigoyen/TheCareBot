/**
 * Patient Search API for TheCareBot
 * Chilean RUT-based patient lookup with medical compliance
 * NOW USING LANGGRAPH (replaced n8n)
 */

import { NextRequest, NextResponse } from 'next/server';
import { executePatientSearch } from '@/services/langgraph';
import type { SessionId, DoctorId, PatientRUT } from '@/services/langgraph';

// ============================================================================
// API HANDLER - LANGGRAPH POWERED
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { rut, sessionId, doctorId } = body;

    // Validate required fields
    if (!rut || !sessionId || !doctorId) {
      return NextResponse.json(
        {
          success: false,
          error: 'RUT, sessionId y doctorId son requeridos',
          code: 'MISSING_REQUIRED_FIELDS'
        },
        { status: 400 }
      );
    }

    // Execute LangGraph patient search workflow
    const result = await executePatientSearch(
      sessionId as SessionId,
      doctorId as DoctorId,
      { patientRUT: rut as PatientRUT }
    );

    // Check if workflow failed
    if (result.status === 'failed') {
      return NextResponse.json(
        {
          success: false,
          error: result.errors.join(', '),
          code: 'WORKFLOW_FAILED'
        },
        { status: 400 }
      );
    }

    // Return workflow result
    const response = {
      success: true,
      found: result.result?.found ?? false,
      demographics: result.result?.patient ? {
        age: result.result.patient.age,
        gender: result.result.patient.gender,
        medicalHistory: result.result.patient.medicalHistory
      } : null,
      confidenceScore: result.confidenceScore?.value ?? 0.0,
      requiresManualReview: result.confidenceScore?.requiresManualReview ?? false,
      searchTimestamp: result.endTime,
      processingTimeMs: result.processingTimeMs,
      auditInfo: {
        searchedBy: doctorId,
        sessionId: sessionId,
        accessReason: 'patient_lookup',
        ipAddress: request.headers.get('x-forwarded-for') || 'localhost'
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[ERROR] Patient search failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor. Intente nuevamente.',
        code: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Método no permitido. Use POST para búsqueda de pacientes.' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Método no permitido. Use POST para búsqueda de pacientes.' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Método no permitido. Use POST para búsqueda de pacientes.' },
    { status: 405 }
  );
}