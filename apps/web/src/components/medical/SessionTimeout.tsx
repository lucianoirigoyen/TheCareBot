'use client'

import React from 'react'
import { formatRemainingTime } from '../../../../../packages/validators/sessions/session-timeout'

interface SessionTimeoutProps {
  remainingTimeMs: number
  showWarning: boolean
  isExpired: boolean
}

export function SessionTimeout({ remainingTimeMs, showWarning, isExpired }: SessionTimeoutProps) {
  const formattedTime = formatRemainingTime(remainingTimeMs)
  
  const getStatusColor = () => {
    if (isExpired) return 'session-expired'
    if (showWarning) return 'session-warning'
    return 'session-active'
  }
  
  const getStatusIcon = () => {
    if (isExpired) return '🔒'
    if (showWarning) return '⚠️'
    return '🟢'
  }
  
  const getStatusMessage = () => {
    if (isExpired) return 'Sesión Expirada'
    if (showWarning) return 'Sesión por Expirar'
    return 'Sesión Activa'
  }

  return (
    <div className={`session-timeout ${showWarning ? 'warning' : ''} ${isExpired ? 'expired' : ''}`}>
      <div className="flex items-center space-x-2 text-sm">
        <span className="text-lg">{getStatusIcon()}</span>
        <div>
          <div className="font-semibold text-gray-900">
            {getStatusMessage()}
          </div>
          <div className={`font-mono text-lg ${getStatusColor()}`}>
            {formattedTime}
          </div>
          {showWarning && !isExpired && (
            <div className="text-xs text-orange-600 mt-1">
              Su sesión expirará pronto
            </div>
          )}
          {isExpired && (
            <div className="text-xs text-red-600 mt-1">
              Por seguridad médica
            </div>
          )}
        </div>
      </div>
      
      {showWarning && !isExpired && (
        <div className="mt-2 text-xs text-gray-600">
          ⚖️ Requerido por Ley 19.628 - Sesión de 20 minutos
        </div>
      )}
    </div>
  )
}