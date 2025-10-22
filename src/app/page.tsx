'use client'

import React, { useState, useEffect } from 'react'
import { MedicalHeader } from '@/components/medical/MedicalHeader'
import { SessionTimeout } from '@/components/medical/SessionTimeout'
import { MedicalDashboard } from '@/components/medical/MedicalDashboard'
import { PatientSearch } from '@/components/medical/PatientSearch'
import { ExcelAnalysis } from '@/components/medical/ExcelAnalysis'
import { RadiographyAnalysis } from '@/components/medical/RadiographyAnalysis'

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
  const [mounted, setMounted] = useState(false)
  
  // Fix hydration - only mount on client
  useEffect(() => {
    setMounted(true)
  }, [])

  // Initialize session on component mount
  useEffect(() => {
    if (!mounted) return
    
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
      const remaining = expiresAt.getTime() - Date.now()
      const shouldWarn = remaining < 2 * 60 * 1000 && remaining > 0 // 2 minutes warning
      
      setSessionState(prev => {
        if (!prev) return null
        
        const isNowExpired = remaining <= 0
        const needsWarning = shouldWarn && !prev.warningIssued
        
        // Show warning toast only once
        if (needsWarning) {
          console.log('⚠️ Sesión expirará en 2 minutos')
          // You can replace this with a proper toast notification
        }
        
        // Show expiration notification
        if (isNowExpired && !prev.isExpired) {
          console.log('🔒 Sesión expirada')
          clearInterval(interval)
        }
        
        return {
          ...prev,
          remainingTimeMs: Math.max(0, remaining),
          isExpired: isNowExpired,
          shouldShowWarning: shouldWarn,
          warningIssued: needsWarning ? true : prev.warningIssued
        }
      })
    }, 1000)
    
    return () => clearInterval(interval)
  }, [mounted])

  const renderActiveComponent = () => {
    if (!mounted) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando TheCareBot...</p>
          </div>
        </div>
      )
    }

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

  if (!mounted) {
    return null // Prevent hydration mismatch
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
      
      <main className="medical-main min-h-screen bg-gray-50">
        {renderActiveComponent()}
      </main>
      
      <footer className="bg-gray-50 border-t border-gray-200 py-4 px-6 text-center text-sm text-gray-600">
        <p>
          TheCareBot v1.0 - Sistema de IA Médica con LangGraph Multi-Agente
        </p>
        <p className="text-xs mt-1 text-green-600">
          ✅ Cumplimiento: Ley 19.628 (Chile) | ⏱️ Timeout: 20 minutos | 🤖 Powered by LangGraph
        </p>
      </footer>
    </>
  )
}
