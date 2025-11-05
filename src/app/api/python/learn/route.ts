/**
 * Proxy API for Python LangGraph Learning
 */

import { NextRequest, NextResponse } from 'next/server';

const PYTHON_API_URL = process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${PYTHON_API_URL}/api/learn/pattern`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: data.detail || 'Error en backend Python',
      }, { status: response.status });
    }

    return NextResponse.json({
      success: data.success || true,
    });
  } catch (error) {
    console.error('[Learning Proxy] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'No se pudo conectar con servidor Python',
    }, { status: 503 });
  }
}
