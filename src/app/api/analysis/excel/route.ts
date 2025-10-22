/**
 * Excel Analysis API for TheCareBot
 * Medical spreadsheet analysis with anomaly detection
 * NOW USING LANGGRAPH (replaced n8n and demo mode)
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeExcelAnalysis } from '@/services/langgraph';
import type { SessionId, DoctorId, ExcelAnalysisInput } from '@/services/langgraph';

// ============================================================================
// API HANDLER - LANGGRAPH POWERED
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sessionId = formData.get('sessionId') as string;
    const doctorId = formData.get('doctorId') as string;

    // Validate required fields
    if (!file || !sessionId || !doctorId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Archivo, sessionId y doctorId son requeridos',
          code: 'MISSING_REQUIRED_FIELDS'
        },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];

    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tipo de archivo no válido. Use archivos Excel (.xlsx, .xls) o CSV.',
          code: 'INVALID_FILE_TYPE',
          supportedTypes: ['.xlsx', '.xls', '.csv']
        },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: 'Archivo demasiado grande. Límite máximo: 10MB.',
          code: 'FILE_TOO_LARGE',
          fileSize: file.size,
          maxSize
        },
        { status: 400 }
      );
    }

    // Convert file to URL (in production, upload to storage first)
    // For now, create a temporary file URL
    const fileUrl = `temp://uploaded-files/${file.name}`;

    // Determine file type
    let fileType: 'xlsx' | 'xls' | 'csv' = 'xlsx';
    if (file.type === 'application/vnd.ms-excel') fileType = 'xls';
    if (file.type === 'text/csv') fileType = 'csv';

    // Execute LangGraph Excel analysis workflow
    const result = await executeExcelAnalysis(
      sessionId as SessionId,
      doctorId as DoctorId,
      {
        fileUrl,
        fileType,
        expectedColumns: [],
      }
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
      analysisId: `analysis-${Date.now()}`,
      fileName: file.name,
      fileSize: file.size,
      summary: result.result?.summary,
      insights: result.result?.insights || [],
      warnings: result.result?.warnings || [],
      confidenceScore: result.confidenceScore?.value ?? 0.0,
      requiresManualReview: result.confidenceScore?.requiresManualReview ?? true,
      status: result.status,
      processingTimeMs: result.processingTimeMs,
      analysisTimestamp: result.endTime,
      auditInfo: {
        analyzedBy: doctorId,
        sessionId: sessionId,
        ipAddress: request.headers.get('x-forwarded-for') || 'localhost'
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[ERROR] Excel analysis failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Error al procesar el archivo Excel. Intente nuevamente.',
        code: 'ANALYSIS_FAILED',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Método no permitido. Use POST para análisis de Excel.' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Método no permitido. Use POST para análisis de Excel.' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Método no permitido. Use POST para análisis de Excel.' },
    { status: 405 }
  );
}