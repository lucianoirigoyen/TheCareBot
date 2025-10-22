'use client'

import React from 'react'
import { getConfidenceLevel, ConfidenceLevel } from '@/types/medical'

interface ConfidenceIndicatorProps {
  score: number
  showLabel?: boolean
}

export function ConfidenceIndicator({ score, showLabel = true }: ConfidenceIndicatorProps) {
  const level = getConfidenceLevel(score)
  
  const getIndicatorProps = () => {
    switch (level) {
      case ConfidenceLevel.LOW:
        return {
          className: 'confidence-low',
          icon: '🔴',
          label: 'Baja',
          description: 'Requiere revisión médica'
        }
      case ConfidenceLevel.MEDIUM:
        return {
          className: 'confidence-medium', 
          icon: '🟡',
          label: 'Media',
          description: 'Supervisión recomendada'
        }
      case ConfidenceLevel.HIGH:
        return {
          className: 'confidence-high',
          icon: '🟢',
          label: 'Alta',
          description: 'Confianza elevada'
        }
      default:
        return {
          className: 'confidence-low',
          icon: '❓',
          label: 'Desconocida',
          description: 'Revisar resultado'
        }
    }
  }
  
  const props = getIndicatorProps()
  const percentage = Math.round(score * 100)
  
  return (
    <div 
      className={`confidence-indicator ${props.className}`}
      title={`${props.description} - ${percentage}%`}
    >
      <span className="mr-1">{props.icon}</span>
      <span className="font-medium">{percentage}%</span>
      {showLabel && (
        <span className="ml-1 text-xs">({props.label})</span>
      )}
    </div>
  )
}