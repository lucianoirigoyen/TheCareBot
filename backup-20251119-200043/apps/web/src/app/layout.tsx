import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TheCareBot - Medical AI Assistant',
  description: 'Regulated medical AI assistant for Chilean healthcare professionals',
  keywords: ['medical', 'ai', 'healthcare', 'chile', 'assistant'],
  authors: [{ name: 'TheCareBot Team' }],
  // Medical privacy: Disable search indexing in development
  robots: process.env.NODE_ENV === 'production' ? 'index,follow' : 'noindex,nofollow',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es-CL">
      <head>
        {/* Medical compliance: Disable telemetry and tracking */}
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
      </head>
      <body className={inter.className}>
        <div className="medical-layout">
          {children}
        </div>
      </body>
    </html>
  )
}