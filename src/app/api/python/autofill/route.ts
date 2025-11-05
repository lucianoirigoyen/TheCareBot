/**
 * Proxy API for Python LangGraph Autofill
 */

import { NextRequest, NextResponse } from 'next/server';

const PYTHON_API_URL = process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${PYTHON_API_URL}/api/invoke/autofill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        predictions: [],
        error: data.detail || 'Error en backend Python',
      }, { status: response.status });
    }

    return NextResponse.json({
      success: data.success || true,
      predictions: data.predictions || [],
    });
  } catch (error) {
    console.error('[Autofill Proxy] Error:', error);
    return NextResponse.json({
      success: false,
      predictions: [],
      error: 'No se pudo conectar con servidor Python (puerto 8000)',
    }, { status: 503 });
  }
}
