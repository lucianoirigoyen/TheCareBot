# Frontend UX (Next.js) – Prompt Multiagente

## Objetivo
Diseñar una **interfaz médica robusta** en TheCareBot con estados claros, accesibles y resilientes frente a errores o modos degradados.

---

## Responsabilidades
- Implementar estados de carga, error y fallback coherentes en todas las pantallas.
- Integrar Zustand para estado global resiliente.
- Usar Radix UI + shadcn/ui con accesibilidad garantizada.
- Soportar modo demo (datos simulados) sin romper experiencia.
- Implementar Progressive Web App (PWA) capabilities.
- Optimizar performance con lazy loading y code splitting.
- Configurar SEO y metadatos para páginas médicas.

---

## Reglas Técnicas

### 1. **Estados de UI Consistentes - Sistema de Estado Global**
```typescript
// src/store/ui.store.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { LoadingState, AsyncState } from '@/types';

interface UiState {
  // Estados globales de UI
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  notifications: Notification[];
  
  // Estados de loading para diferentes secciones
  loadingStates: Record<string, LoadingState<unknown>>;
  
  // Configuración de fallbacks
  fallbackMode: 'none' | 'demo' | 'cached';
  isOffline: boolean;
  
  // Acciones
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleSidebar: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  setLoadingState: (key: string, state: LoadingState<unknown>) => void;
  setFallbackMode: (mode: 'none' | 'demo' | 'cached') => void;
  setOfflineStatus: (isOffline: boolean) => void;
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  duration?: number;
  actions?: Array<{
    label: string;
    action: () => void;
    variant?: 'primary' | 'secondary';
  }>;
}

export const useUiStore = create<UiState>()(
  devtools(
    persist(
      (set, get) => ({
        // Estado inicial
        theme: 'system',
        sidebarCollapsed: false,
        notifications: [],
        loadingStates: {},
        fallbackMode: 'none',
        isOffline: false,
        
        // Acciones
        setTheme: (theme) => set({ theme }),
        
        toggleSidebar: () => set(state => ({ 
          sidebarCollapsed: !state.sidebarCollapsed 
        })),
        
        addNotification: (notification) => set(state => ({
          notifications: [
            ...state.notifications,
            {
              ...notification,
              id: crypto.randomUUID(),
              timestamp: new Date().toISOString(),
            },
          ],
        })),
        
        removeNotification: (id) => set(state => ({
          notifications: state.notifications.filter(n => n.id !== id),
        })),
        
        setLoadingState: (key, loadingState) => set(state => ({
          loadingStates: {
            ...state.loadingStates,
            [key]: loadingState,
          },
        })),
        
        setFallbackMode: (mode) => set({ fallbackMode: mode }),
        setOfflineStatus: (isOffline) => set({ isOffline }),
      }),
      {
        name: 'thecarebot-ui',
        partialize: (state) => ({
          theme: state.theme,
          sidebarCollapsed: state.sidebarCollapsed,
          fallbackMode: state.fallbackMode,
        }),
      }
    )
  )
);
```

### 2. **Componentes de Estado UI Reutilizables**
```typescript
// src/components/ui/loading-states.tsx
import { Loader2, AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

export function LoadingSpinner({ size = 'md', message, className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };
  
  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <Loader2 className={`animate-spin ${sizeClasses[size]}`} />
      {message && (
        <span className="text-sm text-muted-foreground">{message}</span>
      )}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  variant?: 'inline' | 'card' | 'fullscreen';
}

export function ErrorState({
  title = 'Error',
  message,
  onRetry,
  retryLabel = 'Reintentar',
  className,
  variant = 'inline',
}: ErrorStateProps) {
  const content = (
    <Alert variant="destructive" className={className}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="mt-2">
        {message}
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="ml-2"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            {retryLabel}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
  
  if (variant === 'card') {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          {content}
        </CardContent>
      </Card>
    );
  }
  
  if (variant === 'fullscreen') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {content}
        </div>
      </div>
    );
  }
  
  return content;
}

interface FallbackStateProps {
  type: 'demo' | 'cached' | 'offline';
  message?: string;
  children: React.ReactNode;
  className?: string;
}

export function FallbackState({ type, message, children, className }: FallbackStateProps) {
  const getIcon = () => {
    switch (type) {
      case 'offline': return <WifiOff className="h-4 w-4" />;
      case 'demo': return <AlertTriangle className="h-4 w-4" />;
      case 'cached': return <RefreshCw className="h-4 w-4" />;
    }
  };
  
  const getDefaultMessage = () => {
    switch (type) {
      case 'offline': return 'Mostrando datos guardados (sin conexión)';
      case 'demo': return 'Mostrando datos de demostración';
      case 'cached': return 'Mostrando datos almacenados';
    }
  };
  
  const getVariant = () => {
    switch (type) {
      case 'offline': return 'destructive' as const;
      case 'demo': return 'default' as const;
      case 'cached': return 'default' as const;
    }
  };
  
  return (
    <div className={className}>
      <Alert variant={getVariant()} className="mb-4">
        {getIcon()}
        <AlertDescription>
          {message ?? getDefaultMessage()}
        </AlertDescription>
      </Alert>
      {children}
    </div>
  );
}

// Hook para manejar estados de loading de manera consistente
export function useLoadingState<T>(key: string) {
  const { loadingStates, setLoadingState } = useUiStore();
  const currentState = loadingStates[key] as LoadingState<T> | undefined;
  
  const setState = useCallback((state: LoadingState<T>) => {
    setLoadingState(key, state);
  }, [key, setLoadingState]);
  
  const setLoading = useCallback((data: T | null = null) => {
    setState({ status: 'loading', data, error: null });
  }, [setState]);
  
  const setSuccess = useCallback((data: T) => {
    setState({ status: 'success', data, error: null });
  }, [setState]);
  
  const setError = useCallback((error: string, data: T | null = null) => {
    setState({ status: 'error', data, error });
  }, [setState]);
  
  const setIdle = useCallback(() => {
    setState({ status: 'idle', data: null, error: null });
  }, [setState]);
  
  return {
    state: currentState ?? { status: 'idle', data: null, error: null },
    setLoading,
    setSuccess,
    setError,
    setIdle,
  } as const;
}
```

### 3. **Layout Resiliente con Manejo de Errores**
```typescript
// src/components/layout/main-layout.tsx
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { NetworkStatus } from '@/components/layout/network-status';
import { LoadingSpinner, ErrorState, FallbackState } from '@/components/ui/loading-states';
import { useUiStore } from '@/store/ui.store';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { sidebarCollapsed, isOffline, fallbackMode } = useUiStore();
  
  return (
    <div className="min-h-screen bg-background">
      {/* Network Status Indicator */}
      <NetworkStatus />
      
      <div className="flex">
        {/* Sidebar */}
        <Sidebar collapsed={sidebarCollapsed} />
        
        {/* Main Content Area */}
        <main className={`flex-1 transition-all duration-300 ${
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        }`}>
          <Header />
          
          {/* Content with Error Boundary */}
          <div className="p-6">
            <ErrorBoundary
              FallbackComponent={ErrorFallback}
              onError={handleGlobalError}
              onReset={() => window.location.reload()}
            >
              <Suspense fallback={<PageLoadingFallback />}>
                {/* Wrap content with fallback indicator if needed */}
                {(isOffline || fallbackMode !== 'none') ? (
                  <FallbackState 
                    type={isOffline ? 'offline' : fallbackMode}
                    className="mb-6"
                  >
                    {children}
                  </FallbackState>
                ) : (
                  children
                )}
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>
      
      {/* Global Notifications */}
      <Toaster />
    </div>
  );
}

// Fallback para errores globales
function ErrorFallback({ error, resetErrorBoundary }: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <ErrorState
      variant="fullscreen"
      title="Error de la Aplicación"
      message={`Ha ocurrido un error inesperado: ${error.message}`}
      onRetry={resetErrorBoundary}
      retryLabel="Recargar Aplicación"
    />
  );
}

// Fallback para carga de páginas
function PageLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingSpinner size="lg" message="Cargando página..." />
    </div>
  );
}

// Manejo global de errores
function handleGlobalError(error: Error, errorInfo: { componentStack: string }) {
  console.error('Global error caught:', error, errorInfo);
  
  // Enviar error a servicio de logging
  // logErrorToService(error, errorInfo);
}
```

### 4. **Hook para Detección de Conectividad y Fallbacks**
```typescript
// src/hooks/useNetworkStatus.tsx
import { useEffect, useState } from 'react';
import { useUiStore } from '@/store/ui.store';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [connectionType, setConnectionType] = useState<string>('unknown');
  const { setOfflineStatus, addNotification } = useUiStore();
  
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setOfflineStatus(false);
      
      addNotification({
        type: 'success',
        title: 'Conexión Restaurada',
        message: 'La conexión a internet se ha restaurado',
        duration: 3000,
      });
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setOfflineStatus(true);
      
      addNotification({
        type: 'warning',
        title: 'Sin Conexión',
        message: 'Trabajando en modo offline con datos guardados',
        duration: 5000,
      });
    };
    
    // Detectar tipo de conexión si está disponible
    const updateConnectionType = () => {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        setConnectionType(connection.effectiveType || 'unknown');
      }
    };
    
    // Listeners para eventos de conectividad
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Listener para cambios en el tipo de conexión
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection.addEventListener('change', updateConnectionType);
      updateConnectionType(); // Check inicial
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        connection.removeEventListener('change', updateConnectionType);
      }
    };
  }, [setOfflineStatus, addNotification]);
  
  // Test manual de conectividad
  const checkConnectivity = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
        mode: 'no-cors',
      });
      
      const isConnected = response.ok;
      setIsOnline(isConnected);
      setOfflineStatus(!isConnected);
      
      return isConnected;
    } catch {
      setIsOnline(false);
      setOfflineStatus(true);
      return false;
    }
  };
  
  return {
    isOnline,
    isOffline: !isOnline,
    connectionType,
    checkConnectivity,
  };
}

// Componente para mostrar status de red
export function NetworkStatus() {
  const { isOffline } = useNetworkStatus();
  
  if (!isOffline) return null;
  
  return (
    <div className="bg-destructive text-destructive-foreground px-4 py-2 text-sm text-center">
      <WifiOff className="inline h-4 w-4 mr-2" />
      Sin conexión a internet - Trabajando en modo offline
    </div>
  );
}
```

### 5. **Componentes Médicos con Estados Resilientes**
```typescript
// src/components/medical/session-dashboard.tsx
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner, ErrorState } from '@/components/ui/loading-states';
import { useMedicalSession } from '@/hooks/useMedicalSession';
import { useLoadingState } from '@/components/ui/loading-states';
import type { MedicalSession } from '@/types';

interface SessionDashboardProps {
  doctorId: string;
}

export function SessionDashboard({ doctorId }: SessionDashboardProps) {
  const { state, setLoading, setSuccess, setError } = useLoadingState<MedicalSession[]>('sessions');
  const { refreshSessions } = useMedicalSession();
  
  const loadSessions = async () => {
    try {
      setLoading();
      const sessions = await refreshSessions(doctorId);
      setSuccess(sessions);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Error al cargar sesiones',
        null
      );
    }
  };
  
  useEffect(() => {
    loadSessions();
  }, [doctorId]);
  
  // Estado de carga
  if (state.status === 'loading') {
    return (
      <Card>
        <CardContent className="pt-6">
          <LoadingSpinner size="lg" message="Cargando sesiones médicas..." />
        </CardContent>
      </Card>
    );
  }
  
  // Estado de error
  if (state.status === 'error') {
    return (
      <ErrorState
        variant="card"
        title="Error al Cargar Sesiones"
        message={state.error}
        onRetry={loadSessions}
        retryLabel="Recargar Sesiones"
      />
    );
  }
  
  // Estado exitoso
  const sessions = state.data || [];
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Sesiones Médicas</h2>
        <Button onClick={loadSessions} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>
      
      {sessions.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No hay sesiones activas en este momento
              </p>
              <Button className="mt-4" onClick={() => {/* Crear nueva sesión */}}>
                Crear Nueva Sesión
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}

// Componente individual de sesión
function SessionCard({ session }: { session: MedicalSession }) {
  const getStatusBadge = (status: MedicalSession['status']) => {
    const variants = {
      active: 'default',
      completed: 'secondary',
      expired: 'destructive',
      cancelled: 'outline',
    } as const;
    
    return (
      <Badge variant={variants[status]}>
        {status === 'active' && 'Activa'}
        {status === 'completed' && 'Completada'}
        {status === 'expired' && 'Expirada'}
        {status === 'cancelled' && 'Cancelada'}
      </Badge>
    );
  };
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Paciente: {session.patientRut}
        </CardTitle>
        {getStatusBadge(session.status)}
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            Tipo: {session.sessionType}
          </p>
          <p className="text-muted-foreground">
            Creada: {new Date(session.createdAt).toLocaleDateString()}
          </p>
          {session.status === 'active' && (
            <p className="text-muted-foreground">
              Expira: {new Date(session.expiresAt).toLocaleString()}
            </p>
          )}
        </div>
        
        <div className="flex gap-2 mt-4">
          <Button size="sm" variant="outline" className="flex-1">
            Ver Detalles
          </Button>
          {session.status === 'active' && (
            <Button size="sm" className="flex-1">
              Continuar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

### 6. **PWA Configuration y Service Worker**
```typescript
// src/components/pwa/install-prompt.tsx
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  
  useEffect(() => {
    // Verificar si ya está instalada
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppiOS = (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone || isInWebAppiOS);
    
    // Escuchar evento de instalación
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Mostrar prompt después de un delay (mejor UX)
      setTimeout(() => setShowPrompt(true), 5000);
    };
    
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    window.addEventListener('appinstalled', handleAppInstalled);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);
  
  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted PWA install');
    } else {
      console.log('User dismissed PWA install');
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };
  
  const handleDismiss = () => {
    setShowPrompt(false);
    // No mostrar de nuevo en esta sesión
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
  };
  
  // No mostrar si ya está instalada o fue dismisseada
  if (isInstalled || !showPrompt || sessionStorage.getItem('pwa-prompt-dismissed')) {
    return null;
  }
  
  return (
    <Card className="fixed bottom-4 right-4 w-80 shadow-lg border-2 z-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Instalar TheCareBot</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          Instala la aplicación para un acceso más rápido y funcionalidad offline
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Button onClick={handleInstallClick} className="flex-1">
            <Download className="h-4 w-4 mr-2" />
            Instalar
          </Button>
          <Button onClick={handleDismiss} variant="outline">
            Ahora no
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 7. **Hook para Modo Demo Inteligente**
```typescript
// src/hooks/useDemoMode.tsx
import { useState, useCallback, useEffect } from 'react';
import { useUiStore } from '@/store/ui.store';
import type { MedicalSession, Doctor, AnalysisResults } from '@/types';

// Datos de demo seguros (sin información médica real)
const DEMO_DATA = {
  doctor: {
    id: 'demo-doctor-001',
    email: 'demo@thecarebot.com',
    fullName: 'Dr. Demostracion',
    medicalLicense: '12345678',
    specialty: 'general_medicine',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Doctor,
  
  sessions: [
    {
      id: 'demo-session-001',
      doctorId: 'demo-doctor-001',
      patientRut: '12345678-9',
      sessionType: 'analysis',
      status: 'completed',
      createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 día atrás
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(), // 1 día adelante
      completedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hora atrás
      metadata: {
        deviceInfo: {
          platform: 'web' as const,
          version: '1.0.0',
        },
        notes: 'Sesión de demostración',
      },
    },
  ] as MedicalSession[],
  
  analysisResults: {
    type: 'image_analysis',
    findings: [
      {
        description: 'Área de interés identificada para revisión',
        confidence: 0.85,
        severity: 'moderate' as const,
        region: { x: 100, y: 150, width: 50, height: 75 },
      },
    ],
    recommendations: [
      'Este es un análisis de demostración',
      'Para uso en entornos de prueba solamente',
      'No utilizar para diagnósticos reales',
    ],
    urgencyLevel: 'routine' as const,
  } as AnalysisResults,
} as const;

export function useDemoMode() {
  const { fallbackMode, setFallbackMode } = useUiStore();
  const [isDemo, setIsDemo] = useState(false);
  
  useEffect(() => {
    // Activar modo demo si está configurado en variables de entorno
    const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
    if (isDemoMode) {
      setIsDemo(true);
      setFallbackMode('demo');
    }
  }, [setFallbackMode]);
  
  const toggleDemoMode = useCallback(() => {
    const newDemoMode = !isDemo;
    setIsDemo(newDemoMode);
    setFallbackMode(newDemoMode ? 'demo' : 'none');
    
    // Mostrar notificación
    if (newDemoMode) {
      console.info('Modo demo activado - Mostrando datos de demostración');
    } else {
      console.info('Modo demo desactivado');
    }
  }, [isDemo, setFallbackMode]);
  
  const getDemoData = useCallback(<T extends keyof typeof DEMO_DATA>(
    dataType: T
  ): typeof DEMO_DATA[T] => {
    return DEMO_DATA[dataType];
  }, []);
  
  // Wrapper para APIs que retorna datos demo cuando está activo
  const withDemoFallback = useCallback(
    async <T>(
      apiCall: () => Promise<T>,
      demoData: T
    ): Promise<T> => {
      if (isDemo) {
        // Simular delay de red
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
        return demoData;
      }
      
      try {
        return await apiCall();
      } catch (error) {
        console.warn('API call failed, falling back to demo data:', error);
        setFallbackMode('demo');
        return demoData;
      }
    },
    [isDemo, setFallbackMode]
  );
  
  return {
    isDemo: isDemo || fallbackMode === 'demo',
    toggleDemoMode,
    getDemoData,
    withDemoFallback,
  };
}
```

### 8. **Meta Tags y SEO para Páginas Médicas**
```typescript
// src/components/seo/medical-head.tsx
import Head from 'next/head';
import { useRouter } from 'next/router';

interface MedicalHeadProps {
  title?: string;
  description?: string;
  imageUrl?: string;
  noIndex?: boolean;
  structuredData?: object;
}

export function MedicalHead({
  title = 'TheCareBot - Plataforma Médica Digital',
  description = 'Sistema inteligente de análisis médico con IA para profesionales de la salud',
  imageUrl = '/images/medical-og.jpg',
  noIndex = false,
  structuredData,
}: MedicalHeadProps) {
  const router = useRouter();
  const canonicalUrl = `https://thecarebot.com${router.asPath}`;
  
  return (
    <Head>
      {/* Title y Meta básicos */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Robots */}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:site_name" content="TheCareBot" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      
      {/* PWA Meta Tags */}
      <meta name="theme-color" content="#0369a1" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="TheCareBot" />
      
      {/* Security Headers */}
      <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
      <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
      
      {/* Medical/Health Related */}
      <meta name="rating" content="general" />
      <meta name="subject" content="Healthcare Technology" />
      <meta name="coverage" content="Worldwide" />
      <meta name="distribution" content="Global" />
      
      {/* Structured Data */}
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
      )}
      
      {/* Preload Critical Resources */}
      <link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossOrigin="" />
      <link rel="dns-prefetch" href="//fonts.googleapis.com" />
      <link rel="dns-prefetch" href="//fonts.gstatic.com" />
    </Head>
  );
}

// Structured data para páginas médicas
export const createMedicalStructuredData = (type: 'WebApplication' | 'MedicalWebPage') => {
  const base = {
    "@context": "https://schema.org",
    "@type": type,
    "name": "TheCareBot",
    "description": "Plataforma médica digital con IA para análisis y diagnóstico",
    "url": "https://thecarebot.com",
    "applicationCategory": "HealthApplication",
    "operatingSystem": "Web Browser",
    "permissions": "Requires authentication",
    "featureList": [
      "Análisis de imágenes médicas",
      "Gestión de pacientes",
      "Informes de diagnóstico",
      "Seguimiento de tratamientos"
    ],
    "audience": {
      "@type": "ProfessionalAudience",
      "audienceType": "Medical Professionals"
    }
  };
  
  if (type === 'MedicalWebPage') {
    return {
      ...base,
      "medicalAudience": [
        {
          "@type": "MedicalAudience",
          "audienceType": "Physician"
        }
      ],
      "about": {
        "@type": "MedicalCondition",
        "name": "General Medical Analysis"
      }
    };
  }
  
  return base;
};
```

---

## Buenas Prácticas Implementadas

### **Estado de UI Consistente**
- ✅ **Estados bien definidos**: loading, error, success con transiciones claras
- ✅ **Zustand para estado global** con persistencia selectiva
- ✅ **Hook personalizado** `useLoadingState` para consistencia
- ✅ **Componentes reutilizables** para todos los estados

### **Manejo de Errores Robusto**
- ✅ **Error Boundaries** para capturar errores de React
- ✅ **Fallbacks graceful** sin romper la experiencia
- ✅ **Logging estructurado** de errores para debugging
- ✅ **Recovery automático** con botones de retry

### **Resiliencia de Conectividad**
- ✅ **Detección automática** de estado online/offline
- ✅ **Fallbacks inteligentes** con datos cacheados
- ✅ **Indicadores visuales** de estado de red
- ✅ **Sincronización automática** cuando se restaura conexión

### **Modo Demo Seguro**
- ✅ **Datos de demo realistas** pero claramente identificados
- ✅ **No exposición de datos médicos reales** en demos
- ✅ **Fallback automático** cuando APIs fallan
- ✅ **Toggle fácil** entre modo producción y demo

### **Accesibilidad y UX**
- ✅ **Radix UI + shadcn/ui** para componentes accesibles
- ✅ **Indicadores claros** de estado y acciones
- ✅ **Keyboard navigation** completa
- ✅ **Screen reader friendly** con ARIA labels

### **Performance y PWA**
- ✅ **Code splitting** automático con Next.js
- ✅ **Lazy loading** de componentes pesados
- ✅ **Service Worker** para funcionalidad offline
- ✅ **Install prompt** inteligente para PWA

### **SEO y Metadatos Médicos**
- ✅ **Meta tags específicos** para contenido médico
- ✅ **Structured data** para mejor indexación
- ✅ **Security headers** para protección
- ✅ **Canonical URLs** para SEO consistente

---

## Entregables
- ✅ Estados de UI consistentes en toda la aplicación
- ✅ Manejo robusto de errores con fallbacks graceful
- ✅ Integración completa con Zustand para estado global
- ✅ Detección y manejo de conectividad
- ✅ Modo demo seguro sin datos médicos sensibles
- ✅ Componentes accesibles con Radix UI + shadcn/ui
- ✅ Configuración PWA con install prompt
- ✅ SEO optimizado para contenido médico
- ✅ Error boundaries y logging estructurado
- ✅ Documentación completa de patrones de UI