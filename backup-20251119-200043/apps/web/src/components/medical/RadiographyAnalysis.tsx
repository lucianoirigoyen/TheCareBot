'use client'

import React, { useState, useCallback } from 'react'
import { ConfidenceIndicator } from './ConfidenceIndicator'

interface RadiographyAnalysisResult {
  findings: Array<{
    region: string
    description: string
    confidence: number
    severity: 'normal' | 'mild' | 'moderate' | 'severe'
  }>
  normalAssessment: Array<{
    structure: string
    status: 'normal' | 'abnormal' | 'unclear'
    confidence: number
  }>
  diagnosticSuggestions: Array<{
    diagnosis: string
    confidence: number
    supportingFindings: string[]
  }>
  overallConfidence: number
  processingTimeMs: number
  requiresReview: boolean
}

export function RadiographyAnalysis() {
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [radiographyType, setRadiographyType] = useState<'chest' | 'skull' | 'spine' | 'limb' | 'abdomen' | 'other'>('chest')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<RadiographyAnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      validateAndSetFile(droppedFile)
    }
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      validateAndSetFile(selectedFile)
    }
  }

  const validateAndSetFile = (selectedFile: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/dicom']
    
    if (!validTypes.includes(selectedFile.type)) {
      setError('Tipo de archivo no válido. Seleccione una imagen (JPG, PNG, WebP) o archivo DICOM.')
      return
    }
    
    if (selectedFile.size > 50 * 1024 * 1024) { // 50MB limit for medical images
      setError('El archivo es demasiado grande. Límite: 50MB.')
      return
    }
    
    setFile(selectedFile)
    setError(null)
    setAnalysisResult(null)
    
    // Create image preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(selectedFile)
  }

  const handleAnalysis = async () => {
    if (!file) return
    
    setIsAnalyzing(true)
    setError(null)
    
    try {
      // Simulate radiography analysis
      await new Promise(resolve => setTimeout(resolve, 4000))
      
      const demoResult: RadiographyAnalysisResult = {
        findings: [
          {
            region: 'Campos pulmonares',
            description: 'Campos pulmonares claros sin evidencia de consolidación o derrame pleural',
            confidence: 0.95,
            severity: 'normal'
          },
          {
            region: 'Silueta cardíaca',
            description: 'Silueta cardíaca de tamaño y contorno normales',
            confidence: 0.88,
            severity: 'normal'
          },
          {
            region: 'Hemidiafragma derecho',
            description: 'Posible elevación leve del hemidiafragma derecho',
            confidence: 0.72,
            severity: 'mild'
          }
        ],
        normalAssessment: [
          {
            structure: 'Tráquea',
            status: 'normal',
            confidence: 0.92
          },
          {
            structure: 'Hilios pulmonares',
            status: 'normal',
            confidence: 0.89
          },
          {
            structure: 'Costillas',
            status: 'normal',
            confidence: 0.94
          },
          {
            structure: 'Espacios intercostales',
            status: 'unclear',
            confidence: 0.65
          }
        ],
        diagnosticSuggestions: [
          {
            diagnosis: 'Radiografía de tórax normal',
            confidence: 0.87,
            supportingFindings: ['Campos pulmonares claros', 'Silueta cardíaca normal', 'Tráquea centrada']
          },
          {
            diagnosis: 'Posible parálisis diafragmática leve',
            confidence: 0.45,
            supportingFindings: ['Elevación hemidiafragma derecho']
          }
        ],
        overallConfidence: 0.84,
        processingTimeMs: 3247,
        requiresReview: true
      }
      
      setAnalysisResult(demoResult)
    } catch (err) {
      setError('Error al analizar la imagen. Intente nuevamente.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'severe': return 'text-red-600 bg-red-50 border-red-200'
      case 'moderate': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'mild': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'normal': return 'text-green-600 bg-green-50 border-green-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'text-green-600 bg-green-50'
      case 'abnormal': return 'text-red-600 bg-red-50'
      case 'unclear': return 'text-yellow-600 bg-yellow-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="space-y-6">
      <div className="medical-card">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
          <span className="mr-2">🩻</span>
          Análisis de Radiografías
        </h2>
        
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-2">
            <span className="text-purple-600 mt-0.5">🤖</span>
            <div className="text-sm text-purple-800">
              <p className="font-medium mb-1">Análisis de imágenes médicas con IA</p>
              <p>Detección automática de hallazgos, evaluación de estructuras anatómicas y sugerencias diagnósticas.</p>
              <p className="text-xs mt-1">📸 Soporta JPG, PNG, WebP y DICOM hasta 50MB.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* File Upload */}
          <div className="lg:col-span-2">
            <div
              className={`file-upload-area ${dragActive ? 'dragover' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById('image-input')?.click()}
            >
              <input
                id="image-input"
                type="file"
                accept="image/*,.dcm"
                onChange={handleFileInput}
                className="hidden"
              />
              
              {imagePreview ? (
                <div className="space-y-4">
                  <div className="max-w-md mx-auto">
                    <img
                      src={imagePreview}
                      alt="Radiografía cargada"
                      className="w-full h-64 object-contain border rounded-lg bg-black"
                    />
                  </div>
                  <p className="font-medium text-gray-900">{file?.name}</p>
                  <p className="text-sm text-gray-500">
                    {file && (file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setFile(null)
                      setImagePreview(null)
                      setAnalysisResult(null)
                    }}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Remover imagen
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🩻</span>
                  </div>
                  <p className="font-medium text-gray-900">
                    Arrastre y suelte su radiografía aquí
                  </p>
                  <p className="text-sm text-gray-500">
                    o haga clic para seleccionar una imagen
                  </p>
                  <p className="text-xs text-gray-400">
                    JPG, PNG, WebP, DICOM (máx. 50MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Radiografía
              </label>
              <select
                value={radiographyType}
                onChange={(e) => setRadiographyType(e.target.value as any)}
                className="medical-input"
              >
                <option value="chest">Tórax</option>
                <option value="skull">Cráneo</option>
                <option value="spine">Columna</option>
                <option value="limb">Extremidades</option>
                <option value="abdomen">Abdomen</option>
                <option value="other">Otro</option>
              </select>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Información del Análisis</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>• Detección automática de anomalías</p>
                <p>• Evaluación de estructuras anatómicas</p>
                <p>• Sugerencias diagnósticas con confianza</p>
                <p>• Revisión médica recomendada</p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
            <div className="flex items-center space-x-2">
              <span className="text-red-600">❌</span>
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {file && (
          <button
            onClick={handleAnalysis}
            disabled={isAnalyzing}
            className="medical-button w-full mt-4"
          >
            {isAnalyzing ? (
              <span className="flex items-center justify-center">
                <span className="medical-spinner mr-2"></span>
                Analizando radiografía con IA...
              </span>
            ) : (
              <span className="flex items-center justify-center">
                <span className="mr-2">🔍</span>
                Analizar Radiografía
              </span>
            )}
          </button>
        )}
      </div>

      {analysisResult && (
        <div className="medical-card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Resultado del Análisis</h3>
            <ConfidenceIndicator score={analysisResult.overallConfidence} />
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-blue-600">Hallazgos Detectados</p>
              <p className="text-2xl font-bold text-blue-900">{analysisResult.findings.length}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-purple-600">Estructuras Evaluadas</p>
              <p className="text-2xl font-bold text-purple-900">{analysisResult.normalAssessment.length}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-green-600">Tiempo de Análisis</p>
              <p className="text-2xl font-bold text-green-900">{(analysisResult.processingTimeMs / 1000).toFixed(1)}s</p>
            </div>
          </div>

          {/* Findings */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">Hallazgos Radiológicos</h4>
            <div className="space-y-3">
              {analysisResult.findings.map((finding, index) => (
                <div key={index} className={`border rounded-lg p-4 ${getSeverityColor(finding.severity)}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium">{finding.region}</span>
                        <span className={`text-xs px-2 py-1 rounded ${getSeverityColor(finding.severity)}`}>
                          {finding.severity}
                        </span>
                      </div>
                      <p className="text-sm">{finding.description}</p>
                    </div>
                    <ConfidenceIndicator score={finding.confidence} showLabel={false} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Normal Assessment */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">Evaluación de Estructuras</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {analysisResult.normalAssessment.map((assessment, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{assessment.structure}</span>
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs px-2 py-1 rounded ${getStatusColor(assessment.status)}`}>
                        {assessment.status}
                      </span>
                      <ConfidenceIndicator score={assessment.confidence} showLabel={false} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Diagnostic Suggestions */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">Sugerencias Diagnósticas</h4>
            <div className="space-y-3">
              {analysisResult.diagnosticSuggestions.map((suggestion, index) => (
                <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-medium text-blue-900">{suggestion.diagnosis}</span>
                    <ConfidenceIndicator score={suggestion.confidence} />
                  </div>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Hallazgos que apoyan:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {suggestion.supportingFindings.map((finding, idx) => (
                        <li key={idx}>{finding}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Review Warning */}
          {analysisResult.requiresReview && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-2">
                <span className="text-yellow-600 mt-0.5">⚠️</span>
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Revisión radiológica requerida</p>
                  <p>Este análisis debe ser interpretado por un radiólogo o médico especialista. La IA proporciona hallazgos preliminares que requieren validación profesional.</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <span className="text-purple-600 mt-0.5">🧪</span>
              <div className="text-sm text-purple-800">
                <p className="font-medium mb-1">Modo demostración</p>
                <p>Este es un análisis de demostración con resultados ficticios. En producción, todos los análisis de imágenes médicas se almacenan de forma segura y cumplen con estándares DICOM.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}