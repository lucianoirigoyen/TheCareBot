'use client';

import { Loader2, AlertTriangle, RefreshCw, Wifi, WifiOff, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Simple Alert component (inline to avoid missing dependency)
const Alert = ({ children, className, variant, ...props }: React.HTMLAttributes<HTMLDivElement> & { variant?: string }) => (
  <div className={cn('rounded-lg border p-4', variant === 'destructive' && 'border-red-500 bg-red-50', className)} {...props}>{children}</div>
);
const AlertTitle = ({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h5 className={cn('font-medium leading-none tracking-tight', className)} {...props}>{children}</h5>
);
const AlertDescription = ({ children, className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <div className={cn('text-sm [&_p]:leading-relaxed', className)} {...props}>{children}</div>
);

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
  showMedicalIcon?: boolean;
}

export function LoadingSpinner({ 
  size = 'md', 
  message, 
  className,
  showMedicalIcon = false 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };
  
  return (
    <div className={cn('flex items-center justify-center gap-2', className)} role="status" aria-live="polite">
      <Loader2 
        className={cn('animate-spin text-primary', sizeClasses[size])} 
        aria-hidden="true"
      />
      {showMedicalIcon && (
        <Shield className={cn('text-blue-600', sizeClasses[size])} aria-hidden="true" />
      )}
      {message && (
        <span className="text-sm text-muted-foreground" aria-label={message}>
          {message}
        </span>
      )}
      <span className="sr-only">Cargando...</span>
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
  showMedicalContext?: boolean;
}

export function ErrorState({
  title = 'Error',
  message,
  onRetry,
  retryLabel = 'Reintentar',
  className,
  variant = 'inline',
  showMedicalContext = false,
}: ErrorStateProps) {
  const content = (
    <Alert variant="destructive" className={className} role="alert">
      <AlertTriangle className="h-4 w-4" aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="mt-2">
        <div className="space-y-2">
          <p>{message}</p>
          {showMedicalContext && (
            <p className="text-xs text-muted-foreground">
              Si este problema persiste, contacte al soporte técnico médico.
            </p>
          )}
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="mt-2"
              aria-label={`${retryLabel}. ${message}`}
            >
              <RefreshCw className="h-3 w-3 mr-1" aria-hidden="true" />
              {retryLabel}
            </Button>
          )}
        </div>
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
  showDetails?: boolean;
}

export function FallbackState({ 
  type, 
  message, 
  children, 
  className,
  showDetails = true 
}: FallbackStateProps) {
  const getIcon = () => {
    switch (type) {
      case 'offline': return <WifiOff className="h-4 w-4" aria-hidden="true" />;
      case 'demo': return <AlertTriangle className="h-4 w-4" aria-hidden="true" />;
      case 'cached': return <RefreshCw className="h-4 w-4" aria-hidden="true" />;
    }
  };
  
  const getDefaultMessage = () => {
    switch (type) {
      case 'offline': return 'Sin conexión a internet - Mostrando datos guardados';
      case 'demo': return 'Modo demostración - Los datos mostrados son de ejemplo';
      case 'cached': return 'Mostrando datos almacenados localmente';
    }
  };
  
  const getVariant = (): "default" | "destructive" => {
    switch (type) {
      case 'offline': return 'destructive';
      case 'demo': return 'default';
      case 'cached': return 'default';
    }
  };
  
  const getAriaLabel = () => {
    switch (type) {
      case 'offline': return 'Advertencia: Trabajando sin conexión';
      case 'demo': return 'Información: Modo de demostración activo';
      case 'cached': return 'Información: Mostrando datos en caché';
    }
  };
  
  return (
    <div className={className}>
      <Alert 
        variant={getVariant()} 
        className="mb-4"
        role="alert"
        aria-label={getAriaLabel()}
      >
        {getIcon()}
        <AlertDescription>
          <div className="space-y-1">
            <p className="font-medium">{message ?? getDefaultMessage()}</p>
            {showDetails && type === 'demo' && (
              <p className="text-xs text-muted-foreground">
                Estos datos son ficticios y no representan información médica real.
              </p>
            )}
            {showDetails && type === 'offline' && (
              <p className="text-xs text-muted-foreground">
                Los datos se sincronizarán automáticamente cuando se restaure la conexión.
              </p>
            )}
          </div>
        </AlertDescription>
      </Alert>
      <div aria-live="polite" aria-atomic="true">
        {children}
      </div>
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <Card className={cn('border-dashed', className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        {icon && (
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            {icon}
          </div>
        )}
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">{description}</p>
        {action && (
          <Button className="mt-4" onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Network status indicator component
export function NetworkStatusIndicator() {
  const { isOnline, connectionType } = useNetworkStatus();
  
  if (isOnline) return null;
  
  return (
    <div 
      className="bg-destructive text-destructive-foreground px-4 py-2 text-sm text-center font-medium"
      role="alert"
      aria-live="assertive"
    >
      <WifiOff className="inline h-4 w-4 mr-2" aria-hidden="true" />
      Sin conexión a internet - Trabajando en modo offline
    </div>
  );
}

// Accessibility helper for loading states
export function LoadingStateAnnouncement({ message }: { message: string }) {
  return (
    <div
      className="sr-only"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {message}
    </div>
  );
}

// Placeholder for network status hook - this would be imported from actual hook
function useNetworkStatus() {
  // This is a placeholder - in real implementation this would come from the actual hook
  return { isOnline: true, connectionType: 'unknown' };
}