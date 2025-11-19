'use client'

import React, { useState, useEffect } from 'react'
import { MedicalHeader } from '../components/medical/MedicalHeader'
import { SessionTimeout } from '../components/medical/SessionTimeout'
import { MedicalDashboard } from '../components/medical/MedicalDashboard'
import { PatientSearch } from '../components/medical/PatientSearch'
import { ExcelAnalysis } from '../components/medical/ExcelAnalysis'
import { RadiographyAnalysis } from '../components/medical/RadiographyAnalysis'

// Session state type
interface MedicalSessionState {
  sessionId: string;
  doctorId: string;
  createdAt: Date;
  expiresAt: Date;
  isExpired: boolean;
  warningIssued: boolean;
  remainingTimeMs: number;
  shouldShowWarning: boolean;
}

export default function HomePage() {
  const [sessionState, setSessionState] = useState<MedicalSessionState | null>(null)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'patient' | 'excel' | 'radiography'>('dashboard')
  
  // Initialize session on component mount
  useEffect(() => {
    const sessionId = 'session-' + Date.now()
    const doctorId = 'doctor-001'
    
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 20 * 60 * 1000) // 20 minutes
    
    const newSession: MedicalSessionState = {
      sessionId,
      doctorId,
      createdAt: now,
      expiresAt,
      isExpired: false,
      warningIssued: false,
      remainingTimeMs: 20 * 60 * 1000,
      shouldShowWarning: false
    }
    
    setSessionState(newSession)
    
    // Update session state every second
    const interval = setInterval(() => {
      if (!sessionState) return
      
      const remaining = expiresAt.getTime() - Date.now()
      const shouldWarn = remaining < 2 * 60 * 1000 // 2 minutes
      
      setSessionState(prev => prev ? {
        ...prev,
        remainingTimeMs: Math.max(0, remaining),
        isExpired: remaining <= 0,
        shouldShowWarning: shouldWarn
      } : null)
      
      if (remaining <= 0) {
        clearInterval(interval)
        alert('🔒 Su sesión médica ha expirado por seguridad.')
      } else if (shouldWarn && !sessionState.warningIssued) {
        alert('⚠️ Su sesión médica expirará en 2 minutos.')
        setSessionState(prev => prev ? { ...prev, warningIssued: true } : null)
      }
    }, 1000)
    
    return () => clearInterval(interval)
  }, [])

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'patient':
        return <PatientSearch />
      case 'excel':
        return <ExcelAnalysis />
      case 'radiography':
        return <RadiographyAnalysis />
      default:
        return <MedicalDashboard onTabChange={setActiveTab} />
    }
  }

  return (
    <>
      <MedicalHeader 
        doctorName="Dr. Sistema"
        specialty="Medicina General"
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      
      {sessionState && (
        <SessionTimeout 
          remainingTimeMs={sessionState.remainingTimeMs}
          showWarning={sessionState.shouldShowWarning}
          isExpired={sessionState.isExpired}
        />
      )}
      
      <main className="medical-main">
        {renderActiveComponent()}
      </main>
      
      <footer className="bg-gray-50 border-t border-gray-200 py-4 px-6 text-center text-sm text-gray-600">
        <p>
          TheCareBot v1.0 - Sistema de IA Médica con LangGraph
        </p>
        <p className="text-xs mt-1">
          Cumplimiento: Ley 19.628 (Chile) | Timeout: 20 minutos
        </p>
      </footer>
    </>
  )
}
