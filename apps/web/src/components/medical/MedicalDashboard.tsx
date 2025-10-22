'use client'

import React, { useState, useEffect } from 'react'
import { ConfidenceIndicator } from './ConfidenceIndicator'

interface MedicalDashboardProps {
  onTabChange: (tab: 'dashboard' | 'patient' | 'excel' | 'radiography') => void
}

interface MedicalMetrics {
  todaysAnalyses: number
  averageConfidence: number
  manualReviewQueue: number
  systemHealth: number
}

export function MedicalDashboard({ onTabChange }: MedicalDashboardProps) {
  const [metrics, setMetrics] = useState<MedicalMetrics>({
    todaysAnalyses: 0,
    averageConfidence: 0,
    manualReviewQueue: 0,
    systemHealth: 100
  })
  
  // Simulate real-time metrics updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        todaysAnalyses: Math.min(prev.todaysAnalyses + Math.floor(Math.random() * 2), 47),
        averageConfidence: 0.85 + Math.random() * 0.1,
        manualReviewQueue: Math.max(0, prev.manualReviewQueue + Math.floor(Math.random() * 3 - 1)),
        systemHealth: 98 + Math.random() * 2
      }))
    }, 5000)
    
    return () => clearInterval(interval)
  }, [])
  
  const quickActions = [
    {
      title: '👤 Buscar Paciente',
      description: 'Búsqueda por RUT chileno con validación',
      action: () => onTabChange('patient'),
      color: 'bg-blue-50 border-blue-200 hover:bg-blue-100'
    },
    {
      title: '📊 Analizar Excel',
      description: 'Análisis de planillas médicas con IA',
      action: () => onTabChange('excel'),
      color: 'bg-green-50 border-green-200 hover:bg-green-100'
    },
    {
      title: '🩻 Analizar Radiografía',
      description: 'Análisis de imágenes médicas con IA',
      action: () => onTabChange('radiography'),
      color: 'bg-purple-50 border-purple-200 hover:bg-purple-100'
    }
  ]
  
  const recentActivity = [
    {
      id: 1,
      type: 'patient_search',
      description: 'Búsqueda de paciente RUT 12.345.678-9',
      confidence: 0.95,
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      status: 'completed'
    },
    {
      id: 2,
      type: 'excel_analysis',
      description: 'Análisis de resultados laboratorio.xlsx',
      confidence: 0.72,
      timestamp: new Date(Date.now() - 1000 * 60 * 12),
      status: 'requires_review'
    },
    {
      id: 3,
      type: 'radiography',
      description: 'Análisis radiografía de tórax',
      confidence: 0.88,
      timestamp: new Date(Date.now() - 1000 * 60 * 18),
      status: 'completed'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="medical-card">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Bienvenido a TheCareBot 🏥
        </h2>
        <p className="text-gray-600 mb-4">
          Sistema de IA médica para profesionales de la salud en Chile. 
          Cumple con Ley 19.628 de protección de datos médicos.
        </p>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center text-green-600">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            Sistema operativo
          </div>
          <div className="flex items-center text-blue-600">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
            Licencia médica verificada
          </div>
          <div className="flex items-center text-yellow-600">
            <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
            Modo demostración
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="medical-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Análisis Hoy</p>
              <p className="text-3xl font-bold text-blue-600">{metrics.todaysAnalyses}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
          </div>
        </div>

        <div className="medical-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Confianza Promedio</p>
              <p className="text-3xl font-bold text-green-600">
                {(metrics.averageConfidence * 100).toFixed(0)}%
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
          </div>
        </div>

        <div className="medical-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Revisión Manual</p>
              <p className="text-3xl font-bold text-yellow-600">{metrics.manualReviewQueue}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">👩‍⚕️</span>
            </div>
          </div>
        </div>

        <div className="medical-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Salud del Sistema</p>
              <p className="text-3xl font-bold text-green-600">
                {metrics.systemHealth.toFixed(0)}%
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">💚</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="medical-card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${action.color}`}
            >
              <h4 className="font-semibold text-gray-900 mb-2">{action.title}</h4>
              <p className="text-sm text-gray-600">{action.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="medical-card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Actividad Reciente</h3>
        <div className="space-y-3">
          {recentActivity.map((activity) => (
            <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  {activity.type === 'patient_search' && '👤'}
                  {activity.type === 'excel_analysis' && '📊'}
                  {activity.type === 'radiography' && '🩻'}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{activity.description}</p>
                  <p className="text-sm text-gray-500">
                    {activity.timestamp.toLocaleTimeString('es-CL')}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <ConfidenceIndicator score={activity.confidence} />
                {activity.status === 'requires_review' && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                    Requiere revisión
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Status */}
      <div className="medical-card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Estado del Sistema</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm">Base de datos Supabase</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm">Workflows n8n</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm">API Claude</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-sm">Modo demo activo</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm">Validación RUT</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm">Timeout de sesión</span>
          </div>
        </div>
      </div>
    </div>
  )
}