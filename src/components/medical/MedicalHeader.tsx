'use client'

import React from 'react'
import { ChileanMedicalSpecialty } from '../../types/medical'

interface MedicalHeaderProps {
  doctorName: string
  specialty: string
  activeTab: string
  onTabChange: (tab: 'dashboard' | 'patient' | 'excel' | 'radiography') => void
}

export function MedicalHeader({ doctorName, specialty, activeTab, onTabChange }: MedicalHeaderProps) {
  const tabs = [
    { id: 'dashboard', label: '📊 Dashboard', description: 'Vista general' },
    { id: 'patient', label: '👤 Buscar Paciente', description: 'Búsqueda por RUT' },
    { id: 'excel', label: '📊 Análisis Excel', description: 'Análisis de planillas' },
    { id: 'radiography', label: '🩻 Radiografías', description: 'Análisis de imágenes' },
  ] as const

  return (
    <header className="medical-header">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-2xl">🏥</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold">TheCareBot</h1>
            <p className="text-blue-100">Asistente de IA Médica - Chile</p>
          </div>
        </div>
        
        <div className="text-right">
          <p className="font-semibold">{doctorName}</p>
          <p className="text-blue-100 text-sm">{specialty}</p>
          <p className="text-blue-200 text-xs">Licencia Médica Verificada ✓</p>
        </div>
      </div>
      
      <nav className="flex space-x-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id as any)}
            className={`
              px-4 py-2 rounded-lg font-medium transition-all duration-200
              ${activeTab === tab.id 
                ? 'bg-white text-medical-600 shadow-md' 
                : 'text-blue-100 hover:bg-white/10 hover:text-white'
              }
            `}
            title={tab.description}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </header>
  )
}