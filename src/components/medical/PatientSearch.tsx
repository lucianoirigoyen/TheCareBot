'use client'

import React, { useState } from 'react'
import { validateChileanRUT, formatRUT } from '@/utils/chilean-rut'
import { ConfidenceIndicator } from './ConfidenceIndicator'

interface PatientSearchResult {
  found: boolean
  demographics?: {
    age: number
    gender: 'M' | 'F' | 'O'
    region: string
  }
  medicalHistory?: Array<{
    date: string
    diagnosis: string
    treatment: string
    specialty: string
  }>
  confidenceScore: number
}

export function PatientSearch() {
  const [rut, setRut] = useState('')
  const [isValidRUT, setIsValidRUT] = useState<boolean | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchResult, setSearchResult] = useState<PatientSearchResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRUTChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^\d]/g, '')
    
    // Format RUT as user types
    if (value.length >= 7) {
      const rutBody = value.slice(0, -1)
      const checkDigit = value.slice(-1)
      
      try {
        const formattedRUT = formatRUT(rutBody, checkDigit)
        const isValid = validateChileanRUT(formattedRUT)
        
        setRut(formattedRUT)
        setIsValidRUT(isValid)
      } catch (err) {
        setRut(value)
        setIsValidRUT(false)
      }
    } else {
      setRut(value)
      setIsValidRUT(null)
    }
    
    setSearchResult(null)
    setError(null)
  }

  const handleSearch = async () => {
    if (!isValidRUT || !rut) {
      setError('Por favor ingrese un RUT chileno válido')
      return
    }

    setIsSearching(true)
    setError(null)
    
    try {
      // Call the patient search API
      const response = await fetch('/api/patients/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rut,
          sessionId: `session-${Date.now()}`,
          doctorId: 'demo-doctor-001'
        })
      })
      
      const data = await response.json()
      
      if (!data.success) {
        setError(data.error || 'Error al buscar paciente')
        return
      }
      
      // Transform API response to component format
      const result: PatientSearchResult = {
        found: data.found,
        demographics: data.demographics,
        medicalHistory: data.medicalHistory,
        confidenceScore: data.confidenceScore
      }
      
      setSearchResult(result)
    } catch (err) {
      setError('Error de conexión. Intente nuevamente.')
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="medical-card">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
          <span className="mr-2">👤</span>
          Búsqueda de Paciente
        </h2>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-2">
            <span className="text-blue-600 mt-0.5">ℹ️</span>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Búsqueda segura con RUT chileno</p>
              <p>Este sistema valida matemáticamente el dígito verificador del RUT según el algoritmo oficial chileno.</p>
              <p className="text-xs mt-1">🔒 Los RUTs se almacenan cifrados para proteger la privacidad del paciente.</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="rut" className="block text-sm font-medium text-gray-700 mb-2">
              RUT del Paciente
            </label>
            <div className="relative">
              <input
                id="rut"
                type="text"
                value={rut}
                onChange={handleRUTChange}
                placeholder="12.345.678-9"
                className={`
                  medical-input rut-input
                  ${isValidRUT === true ? 'valid' : ''}
                  ${isValidRUT === false ? 'invalid' : ''}
                `}
                maxLength={12}
              />
              {isValidRUT === true && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-600">
                  ✓
                </div>
              )}
              {isValidRUT === false && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-600">
                  ✗
                </div>
              )}
            </div>
            {isValidRUT === false && (
              <p className="text-sm text-red-600 mt-1">
                RUT inválido. Verifique el dígito verificador.
              </p>
            )}
            {isValidRUT === true && (
              <p className="text-sm text-green-600 mt-1">
                RUT válido según algoritmo chileno oficial.
              </p>
            )}
          </div>

          <button
            onClick={handleSearch}
            disabled={!isValidRUT || isSearching}
            className="medical-button w-full"
          >
            {isSearching ? (
              <span className="flex items-center justify-center">
                <span className="medical-spinner mr-2"></span>
                Buscando paciente...
              </span>
            ) : (
              <span className="flex items-center justify-center">
                <span className="mr-2">🔍</span>
                Buscar Paciente
              </span>
            )}
          </button>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <span className="text-red-600">❌</span>
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {searchResult && (
        <div className="medical-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900">Resultado de Búsqueda</h3>
            <ConfidenceIndicator score={searchResult.confidenceScore} />
          </div>

          {searchResult.found ? (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-green-600">✅</span>
                  <p className="font-medium text-green-800">Paciente encontrado</p>
                </div>
                <p className="text-sm text-green-700">
                  RUT: {rut} (hash almacenado de forma segura)
                </p>
              </div>

              {searchResult.demographics && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Información Demográfica</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-gray-600">Edad</p>
                      <p className="text-lg font-semibold text-gray-900">{searchResult.demographics.age} años</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-gray-600">Género</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {searchResult.demographics.gender === 'M' ? 'Masculino' : 'Femenino'}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-gray-600">Región</p>
                      <p className="text-lg font-semibold text-gray-900">{searchResult.demographics.region}</p>
                    </div>
                  </div>
                </div>
              )}

              {searchResult.medicalHistory && searchResult.medicalHistory.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Historial Médico</h4>
                  <div className="space-y-3">
                    {searchResult.medicalHistory.map((entry, index) => (
                      <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{entry.diagnosis}</p>
                            <p className="text-sm text-gray-600 mt-1">{entry.treatment}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              {new Date(entry.date).toLocaleDateString('es-CL')} - {entry.specialty}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <span className="text-yellow-600 mt-0.5">⚠️</span>
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">Datos de demostración</p>
                    <p>En modo demostración no se accede a datos médicos reales. En producción, toda consulta de pacientes se registra en logs de auditoría según Ley 19.628.</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <span className="text-red-600">❌</span>
                <p className="text-red-800">Paciente no encontrado en el sistema</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}