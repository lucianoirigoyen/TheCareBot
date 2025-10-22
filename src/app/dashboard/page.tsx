import { Metadata } from 'next';
import { Suspense } from 'react';
import { MedicalDashboard } from '@/components/medical/medical-dashboard';
import { MedicalHead } from '@/components/seo/medical-head';
import { SessionTimeoutProvider } from '@/components/medical/session-timeout-provider';
import { LoadingSpinner } from '@/components/ui/loading-states';

export const metadata: Metadata = {
  title: 'Dashboard Médico - TheCareBot',
  description: 'Panel de control médico con análisis de IA para profesionales de la salud',
  robots: 'noindex, nofollow', // Medical dashboard should not be indexed
};

export default function DashboardPage() {
  return (
    <>
      <MedicalHead
        title="Dashboard Médico - TheCareBot"
        description="Panel de control médico con análisis de IA para profesionales de la salud"
        noIndex={true}
      />
      <SessionTimeoutProvider>
        <div className="min-h-screen bg-background">
          <Suspense fallback={<DashboardLoadingFallback />}>
            <MedicalDashboard />
          </Suspense>
        </div>
      </SessionTimeoutProvider>
    </>
  );
}

function DashboardLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <LoadingSpinner size="lg" />
        <h2 className="text-xl font-semibold text-foreground">
          Cargando Dashboard Médico
        </h2>
        <p className="text-muted-foreground">
          Iniciando sesión segura y verificando credenciales...
        </p>
      </div>
    </div>
  );
}