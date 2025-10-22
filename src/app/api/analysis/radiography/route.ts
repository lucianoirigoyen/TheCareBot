/**
 * Radiography Analysis API for TheCareBot
 * Medical image analysis with AI-powered diagnostic suggestions
 * NOW USING LANGGRAPH (replaced n8n and demo mode)
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeRadiographyAnalysis } from '@/services/langgraph';
import type { SessionId, DoctorId, RadiographyAnalysisInput } from '@/services/langgraph';

// ============================================================================
// API HANDLER - LANGGRAPH POWERED
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const images = formData.getAll('images') as File[];
    const sessionId = formData.get('sessionId') as string;
    const doctorId = formData.get('doctorId') as string;
    const bodyRegion = formData.get('bodyRegion') as string;
    const symptoms = formData.get('symptoms') as string;
    const patientAge = formData.get('patientAge') as string;
    const patientGender = formData.get('patientGender') as string;

    // Validate required fields
    if (!images || images.length === 0 || !sessionId || !doctorId || !bodyRegion) {
      return NextResponse.json(
        {
          success: false,
          error: 'Imágenes, sessionId, doctorId y bodyRegion son requeridos',
          code: 'MISSING_REQUIRED_FIELDS'
        },
        { status: 400 }
      );
    }

    // Validate image types
    const validTypes = ['image/jpeg', 'image/png', 'image/dicom'];
    for (const image of images) {
      if (!validTypes.includes(image.type)) {
        return NextResponse.json(
          {
            success: false,
            error: `Tipo de imagen no válido: ${image.type}. Use JPEG, PNG o DICOM.`,
            code: 'INVALID_IMAGE_TYPE',
            supportedTypes: ['image/jpeg', 'image/png', 'image/dicom']
          },
          { status: 400 }
        );
      }
    }

    // Validate image sizes (20MB limit per image)
    const maxSize = 20 * 1024 * 1024; // 20MB
    for (const image of images) {
      if (image.size > maxSize) {
        return NextResponse.json(
          {
            success: false,
            error: `Imagen ${image.name} demasiado grande. Límite máximo: 20MB.`,
            code: 'IMAGE_TOO_LARGE',
            fileSize: image.size,
            maxSize
          },
          { status: 400 }
        );
      }
    }

    // Convert images to URLs (in production, upload to storage first)
    const imageUrls = images.map(img => `temp://uploaded-images/${img.name}`);

    // Validate body region
    const validRegions = ['head', 'neck', 'chest', 'abdomen', 'arms', 'legs', 'hands', 'feet', 'back'];
    if (!validRegions.includes(bodyRegion)) {
      return NextResponse.json(
        {
          success: false,
          error: `Región corporal no válida: ${bodyRegion}`,
          code: 'INVALID_BODY_REGION',
          validRegions
        },
        { status: 400 }
      );
    }

    // Parse symptoms
    const symptomsList = symptoms ? symptoms.split(',').map(s => s.trim()) : [];

    // Execute LangGraph Radiography analysis workflow
    const result = await executeRadiographyAnalysis(
      sessionId as SessionId,
      doctorId as DoctorId,
      {
        imageUrls: imageUrls as readonly string[],
        bodyRegion: bodyRegion as any,
        symptoms: symptomsList,
        patientAge: patientAge ? parseInt(patientAge) : undefined,
        patientGender: patientGender as 'male' | 'female' | 'other' | undefined
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
      analysisId: `radiography-${Date.now()}`,
      imageCount: images.length,
      bodyRegion,
      findings: result.result?.findings || [],
      recommendations: result.result?.recommendations || [],
      urgencyLevel: result.result?.urgencyLevel || 'routine',
      requiresSpecialistReview: result.result?.requiresSpecialistReview ?? true,
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
    console.error('[ERROR] Radiography analysis failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Error al analizar radiografía. Intente nuevamente.',
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
    { error: 'Método no permitido. Use POST para análisis de radiografías.' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Método no permitido. Use POST para análisis de radiografías.' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Método no permitido. Use POST para análisis de radiografías.' },
    { status: 405 }
  );
}
