'use client'

import React, { useState, useCallback } from 'react'
import { ConfidenceIndicator } from './ConfidenceIndicator'

interface ExcelAnalysisResult {
  rowsProcessed: number
  anomaliesDetected: Array<{
    row: number
    column: string
    type: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    description: string
  }>
  insights: Array<{
    category: string
    insight: string
    confidence: number
  }>
  confidenceScore: number
  processingTimeMs: number
  requiresReview: boolean
}

export function ExcelAnalysis() {
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<ExcelAnalysisResult | null>(null)
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
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ]
    
    if (!validTypes.includes(selectedFile.type)) {
      setError('Tipo de archivo no válido. Seleccione un archivo Excel (.xlsx, .xls) o CSV.')
      return
    }
    
    if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
      setError('El archivo es demasiado grande. Límite: 10MB.')
      return
    }
    
    setFile(selectedFile)
    setError(null)
    setAnalysisResult(null)
  }

  const handleAnalysis = async () => {
    if (!file) return
    
    setIsAnalyzing(true)
    setError(null)
    
    try {
      // Prepare form data for file upload
      const formData = new FormData()
      formData.append('file', file)
      formData.append('sessionId', `session-${Date.now()}`)
      formData.append('doctorId', 'demo-doctor-001')
      formData.append('analysisType', 'lab_results')
      
      // Call the Excel analysis API
      const response = await fetch('/api/analysis/excel', {
        method: 'POST',
        body: formData
      })
      
      const data = await response.json()
      
      if (!data.success) {
        setError(data.error || 'Error al analizar el archivo')
        return
      }
      
      // Transform API response to component format
      const result: ExcelAnalysisResult = {
        rowsProcessed: data.rowsProcessed,
        anomaliesDetected: data.anomaliesDetected,
        insights: data.insights,
        confidenceScore: data.confidenceScore,
        processingTimeMs: data.processingTimeMs,
        requiresReview: data.requiresReview
      }
      
      setAnalysisResult(result)
    } catch (err) {
      setError('Error de conexión. Intente nuevamente.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      case 'high': return 'text-red-500 bg-red-50 border-red-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      <div className="medical-card">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
          <span className="mr-2">📊</span>
          Análisis de Excel Médico
        </h2>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-2">
            <span className="text-green-600 mt-0.5">💡</span>
            <div className="text-sm text-green-800">
              <p className="font-medium mb-1">Análisis inteligente de datos médicos</p>
              <p>Detección de anomalías, validación de rangos normales y análisis estadístico con IA.</p>
              <p className="text-xs mt-1">📋 Soporta archivos Excel (.xlsx, .xls) y CSV hasta 10MB.</p>
            </div>
          </div>
        </div>

        {/* File Upload Area */}
        <div
          className={`file-upload-area ${dragActive ? 'dragover' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <input
            id="file-input"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileInput}
            className="hidden"
          />
          
          {file ? (
            <div className="space-y-2">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <p className="font-medium text-gray-900">{file.name}</p>
              <p className="text-sm text-gray-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setFile(null)
                  setAnalysisResult(null)
                }}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Remover archivo
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">📎</span>
              </div>
              <p className="font-medium text-gray-900">
                Arrastre y suelte su archivo Excel aquí
              </p>
              <p className="text-sm text-gray-500">
                o haga clic para seleccionar un archivo
              </p>
              <p className="text-xs text-gray-400">
                Soporta .xlsx, .xls, .csv (máx. 10MB)
              </p>
            </div>
          )}
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
                Analizando archivo médico...
              </span>
            ) : (
              <span className="flex items-center justify-center">
                <span className="mr-2">🔍</span>
                Analizar Excel con IA
              </span>
            )}
          </button>
        )}
      </div>

      {analysisResult && (
        <div className="medical-card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Resultado del Análisis</h3>
            <ConfidenceIndicator score={analysisResult.confidenceScore} />
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-blue-600">Filas Procesadas</p>
              <p className="text-2xl font-bold text-blue-900">{analysisResult.rowsProcessed}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-yellow-600">Anomalías Detectadas</p>
              <p className="text-2xl font-bold text-yellow-900">{analysisResult.anomaliesDetected.length}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-green-600">Tiempo de Análisis</p>
              <p className="text-2xl font-bold text-green-900">{(analysisResult.processingTimeMs / 1000).toFixed(1)}s</p>
            </div>
          </div>

          {/* Anomalies */}
          {analysisResult.anomaliesDetected.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Anomalías Detectadas</h4>
              <div className="space-y-3">
                {analysisResult.anomaliesDetected.map((anomaly, index) => (
                  <div key={index} className={`border rounded-lg p-4 ${getSeverityColor(anomaly.severity)}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium">Fila {anomaly.row} - {anomaly.column}</span>
                          <span className={`text-xs px-2 py-1 rounded ${getSeverityColor(anomaly.severity)}`}>
                            {anomaly.severity}
                          </span>
                        </div>
                        <p className="text-sm">{anomaly.description}</p>
                        <p className="text-xs mt-1 opacity-75">Tipo: {anomaly.type}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Insights */}
          {analysisResult.insights.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Insights Médicos</h4>
              <div className="space-y-3">
                {analysisResult.insights.map((insight, index) => (
                  <div key={index} className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-purple-900 mb-1">{insight.category}</p>
                        <p className="text-purple-800">{insight.insight}</p>
                      </div>
                      <ConfidenceIndicator score={insight.confidence} showLabel={false} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Review Warning */}
          {analysisResult.requiresReview && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <span className="text-yellow-600 mt-0.5">⚠️</span>
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Revisión médica requerida</p>
                  <p>Este análisis requiere revisión por un profesional médico debido a la presencia de anomalías o confianza inferior al 90%.</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <div className="flex items-start space-x-2">
              <span className="text-blue-600 mt-0.5">🧪</span>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Modo demostración</p>
                <p>Este es un análisis de demostración con datos ficticios. En producción, todos los análisis de archivos médicos se registran para auditoría.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}