import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Check if API key is configured
    const apiKey = process.env['ANTHROPIC_API_KEY'];

    if (!apiKey || apiKey === 'sk-ant-api03-YOUR_API_KEY_HERE') {
      console.error('[Radiography Vision] ANTHROPIC_API_KEY not configured');
      return NextResponse.json(
        {
          success: false,
          error: 'API key not configured. Please set ANTHROPIC_API_KEY in your .env file. Get your key at: https://console.anthropic.com/'
        },
        { status: 500 }
      );
    }

    // Initialize Anthropic client with the validated API key
    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    const formData = await request.formData();
    const image = formData.get('image') as File;
    const specialty = formData.get('specialty') as string;
    const radiographyType = formData.get('radiographyType') as string;

    if (!image) {
      return NextResponse.json(
        { success: false, error: 'No image provided' },
        { status: 400 }
      );
    }

    // Convert image to base64
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');

    // Determine media type - support more formats
    let mediaType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';
    if (image.type === 'image/png') {
      mediaType = 'image/png';
    } else if (image.type === 'image/webp') {
      mediaType = 'image/webp';
    } else if (image.type === 'image/gif') {
      mediaType = 'image/gif';
    } else {
      mediaType = 'image/jpeg'; // Default to JPEG for all other types
    }

    // Create specialized prompt based on specialty and type
    const prompt = createMedicalPrompt(specialty, radiographyType);

    // Call Claude Vision API - use Claude 3 Haiku (only model available with this API key)
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    });

    // Parse Claude's response
    const analysisText = message.content[0]?.type === 'text'
      ? message.content[0].text
      : '';

    // DEBUG: Log the raw response
    console.log('[Radiography Vision] Raw Claude response:', analysisText);

    // Structure the response
    const structuredResult = parseClaudeResponse(analysisText, specialty);

    // DEBUG: Log parsed result
    console.log('[Radiography Vision] Parsed result:', JSON.stringify(structuredResult, null, 2));

    return NextResponse.json({
      success: true,
      ...structuredResult,
      rawAnalysis: analysisText,
      processingTimeMs: Date.now() - startTime,
    });

  } catch (error) {
    console.error('[Radiography Vision] Error:', error);

    // Check if it's an authentication error
    if (error instanceof Error && error.message.includes('authentication_error')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid API key. Please check your ANTHROPIC_API_KEY in the .env file and get a valid key at: https://console.anthropic.com/'
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Analysis failed'
      },
      { status: 500 }
    );
  }
}

function createMedicalPrompt(specialty: string, type: string): string {
  if (specialty === 'odontologo') {
    return `CONTEXTO EDUCATIVO: Estás asistiendo con una herramienta educativa dental para fines de capacitación. Este es un ejercicio de aprendizaje para ayudar a estudiantes a comprender la interpretación radiográfica.

Por favor analiza esta imagen de radiografía dental y proporciona tus observaciones en el siguiente formato EXACTO (en español):

## Hallazgos Dentales:
- [Lista cualquier característica notable, variaciones o áreas de interés que observes]
- [Usa notación FDI para identificación dental (ej. diente 3.6)]
- [Nota variaciones de densidad, restauraciones o patrones inusuales]

## Estructuras Normales:
- [Lista estructuras anatómicas que aparecen dentro de límites normales]
- [Incluye densidad ósea, estructuras radiculares, cámaras pulpares]

## Sugerencias Diagnósticas:
- [Observaciones educativas que ameritarían mayor investigación]
- [Áreas para examen clínico más detallado]

IMPORTANTE: Esto es solo para fines de capacitación educativa. Todos los hallazgos deben ser confirmados por un profesional dental licenciado en la práctica clínica. Responde en ESPAÑOL.`;
  }

  // Medical radiography prompt
  return `CONTEXTO EDUCATIVO: Estás asistiendo con una herramienta educativa médica para capacitación en interpretación radiográfica. Este es un ejercicio de aprendizaje para estudiantes de medicina.

Por favor analiza esta imagen de radiografía de ${type} y proporciona tus observaciones en el siguiente formato EXACTO (en español):

## Hallazgos Radiológicos:
- [Lista cualquier característica notable, variaciones de densidad o áreas de interés que observes]
- [Describe estructuras anatómicas visibles y cualquier variación de la apariencia típica]
- [Nota cualquier patrón inusual o áreas que ameriten atención]

## Estructuras Normales:
- [Lista estructuras anatómicas y puntos de referencia que aparecen dentro de límites normales]
- [Incluye apariencia de estructura ósea, visibilidad de tejidos blandos]

## Sugerencias Diagnósticas:
- [Observaciones educativas que un radiólogo podría investigar más a fondo]
- [Recomendaciones potenciales de imágenes de seguimiento o correlación clínica]

IMPORTANTE: Esto es solo para fines de demostración educativa. Todas las observaciones deben ser confirmadas por un profesional médico licenciado. Proporciona tu descripción técnica educativa en ESPAÑOL.`;
}

function parseClaudeResponse(text: string, _specialty: string) {
  const findings = extractFindings(text);
  const normalAssessment = extractNormalAssessment(text);
  const diagnosticSuggestions = extractDiagnosticSuggestions(text);
  const overallConfidence = calculateOverallConfidence(text);

  return {
    findings,
    normalAssessment,
    diagnosticSuggestions,
    overallConfidence,
    requiresReview: true, // Always require medical review
  };
}

function extractFindings(text: string) {
  const findings = [];

  // Try multiple section patterns (Spanish and English)
  const patterns = [
    /(?:Hallazgos Radiológicos|Hallazgos Dentales|Radiological Findings|Dental Findings)[:\s]*([^#]*?)(?=\n\n##|\n##|$)/is,
    /##?\s*(?:Hallazgos Radiológicos|Hallazgos Dentales|Radiological Findings|Dental Findings)[:\s]*\n([\s\S]*?)(?=\n##|$)/is,
    /\*\*(?:Hallazgos Radiológicos|Hallazgos Dentales|Radiological Findings|Dental Findings)\*\*[:\s]*\n([\s\S]*?)(?=\n\*\*|\n##|$)/is,
  ];

  let findingsSection = null;
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      findingsSection = match[1];
      break;
    }
  }

  if (findingsSection) {
    const lines = findingsSection.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('-') || trimmed.match(/^\d+\./)) {
        const description = trimmed.replace(/^[-\d.]\s*/, '');

        // Try to extract region from description (e.g., "Campos pulmonares: description")
        const regionMatch = description.match(/^([^:]+):/);
        const region = regionMatch ? regionMatch[1]?.trim() || 'Área Detectada' : 'Área Detectada';
        const cleanDesc = regionMatch ? description.substring(description.indexOf(':') + 1).trim() : description;

        findings.push({
          region,
          description: cleanDesc,
          confidence: extractConfidence(line) || 0.85,
          severity: determineSeverity(line),
        });
      }
    }
  }

  return findings;
}

function extractNormalAssessment(text: string) {
  const assessment = [];

  // Try multiple section patterns (Spanish and English)
  const patterns = [
    /(?:Estructuras Normales|Normal Structures|Anatomical Structures)[:\s]*([^#]*?)(?=\n\n##|\n##|$)/is,
    /##?\s*(?:Estructuras Normales|Normal Structures|Anatomical Structures)[:\s]*\n([\s\S]*?)(?=\n##|$)/is,
    /\*\*(?:Estructuras Normales|Normal Structures|Anatomical Structures)\*\*[:\s]*\n([\s\S]*?)(?=\n\*\*|\n##|$)/is,
  ];

  let normalSection = null;
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      normalSection = match[1];
      break;
    }
  }

  if (normalSection) {
    const lines = normalSection.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('-') || trimmed.match(/^\d+\./)) {
        const content = trimmed.replace(/^[-\d.]\s*/, '');

        // Try to extract structure name (e.g., "Tráquea: aparece normal")
        const structureMatch = content.match(/^([^:]+):/);
        const structure = structureMatch ? structureMatch[1]?.trim() || 'Estructura' : content.split(/\s+/).slice(0, 2).join(' ');

        assessment.push({
          structure,
          status: determineStatus(line),
          confidence: extractConfidence(line) || 0.88,
        });
      }
    }
  }

  return assessment;
}

function extractDiagnosticSuggestions(text: string) {
  const suggestions = [];

  // Try multiple section patterns (Spanish and English)
  const patterns = [
    /(?:Sugerencias Diagnósticas|Diagnostic Suggestions|Diagnoses)[:\s]*([^#]*?)(?=\n\n|\n##|$)/is,
    /##?\s*(?:Sugerencias Diagnósticas|Diagnostic Suggestions|Diagnoses)[:\s]*\n([\s\S]*?)(?=\n##|$)/is,
    /\*\*(?:Sugerencias Diagnósticas|Diagnostic Suggestions|Diagnoses)\*\*[:\s]*\n([\s\S]*?)(?=\n\*\*|\n##|$)/is,
  ];

  let diagnosisSection = null;
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      diagnosisSection = match[1];
      break;
    }
  }

  if (diagnosisSection) {
    const lines = diagnosisSection.split('\n');
    for (const line of lines) {
      if (line.trim().startsWith('-') || line.trim().match(/^\d+\./)) {
        suggestions.push({
          diagnosis: line.trim().replace(/^[-\d.]\s*/, ''),
          confidence: extractConfidence(line),
          supportingFindings: ['Análisis con IA'],
        });
      }
    }
  }

  return suggestions;
}

function determineSeverity(text: string): 'normal' | 'mild' | 'moderate' | 'severe' {
  const lower = text.toLowerCase();
  // Spanish and English keywords
  if (lower.includes('severe') || lower.includes('critical') || lower.includes('severo') || lower.includes('grave') || lower.includes('crítico')) return 'severe';
  if (lower.includes('moderate') || lower.includes('moderado')) return 'moderate';
  if (lower.includes('mild') || lower.includes('slight') || lower.includes('leve') || lower.includes('ligero')) return 'mild';
  return 'normal';
}

function determineStatus(text: string): 'normal' | 'abnormal' | 'unclear' {
  const lower = text.toLowerCase();
  // Spanish and English keywords
  if (lower.includes('abnormal') || lower.includes('pathological') || lower.includes('anormal') || lower.includes('patológico')) return 'abnormal';
  if (lower.includes('unclear') || lower.includes('insufficient') || lower.includes('poco claro') || lower.includes('insuficiente')) return 'unclear';
  return 'normal';
}

function extractConfidence(text: string): number {
  const match = text.match(/(\d+)%/);
  return match && match[1] ? parseInt(match[1]) / 100 : 0.75;
}

function calculateOverallConfidence(text: string): number {
  const lower = text.toLowerCase();
  // Spanish and English keywords
  if (lower.includes('clearly') || lower.includes('definitely') || lower.includes('claramente') || lower.includes('definitivamente')) return 0.9;
  if (lower.includes('likely') || lower.includes('probably') || lower.includes('probable') || lower.includes('probablemente')) return 0.75;
  if (lower.includes('possibly') || lower.includes('may') || lower.includes('posible') || lower.includes('posiblemente') || lower.includes('puede')) return 0.6;
  return 0.7;
}
