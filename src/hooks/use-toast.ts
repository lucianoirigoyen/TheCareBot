import * as React from "react"

type ToastProps = {
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

export const useToast = () => {
  return {
    toast: ({ title, description, variant }: ToastProps) => {
      console.log(`[Toast ${variant}] ${title}: ${description}`)
      // Fallback to alert for now
      if (typeof window !== 'undefined') {
        alert(`${title}\n${description}`)
      }
    }
  }
}
