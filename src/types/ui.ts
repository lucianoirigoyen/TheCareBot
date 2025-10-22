/**
 * UI State Types for TheCareBot Medical Interface
 * Resilient state management without demo mode
 */

// ============================================================================
// ASYNC STATE MACHINE
// ============================================================================

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface LoadingState<T> {
  readonly status: AsyncStatus;
  readonly data: T | null;
  readonly error: string | null;
}

// ============================================================================
// NOTIFICATION SYSTEM
// ============================================================================

export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export type NotificationVariant = 'primary' | 'secondary';

export interface NotificationAction {
  readonly label: string;
  readonly action: () => void;
  readonly variant?: NotificationVariant;
}

export interface Notification {
  readonly id: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly message: string;
  readonly timestamp: string;
  readonly duration?: number;
  readonly actions?: readonly NotificationAction[];
}

// ============================================================================
// THEME SYSTEM
// ============================================================================

export type Theme = 'light' | 'dark' | 'system';

// ============================================================================
// FALLBACK MODES (OFFLINE/CACHED ONLY - NO DEMO)
// ============================================================================

export type FallbackMode = 'none' | 'cached' | 'offline';

// ============================================================================
// UI STORE STATE
// ============================================================================

export interface UiState {
  // Theme configuration
  readonly theme: Theme;

  // Layout state
  readonly sidebarCollapsed: boolean;

  // Notifications
  readonly notifications: readonly Notification[];

  // Loading states for different sections
  readonly loadingStates: Readonly<Record<string, LoadingState<unknown>>>;

  // Network and fallback state
  readonly isOffline: boolean;
  readonly fallbackMode: FallbackMode;

  // Actions
  readonly setTheme: (theme: Theme) => void;
  readonly toggleSidebar: () => void;
  readonly addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  readonly removeNotification: (id: string) => void;
  readonly setLoadingState: (key: string, state: LoadingState<unknown>) => void;
  readonly setFallbackMode: (mode: FallbackMode) => void;
  readonly setOfflineStatus: (isOffline: boolean) => void;
}

// ============================================================================
// MEDICAL SESSION STATE
// ============================================================================

export type SessionStatus = 'active' | 'expired' | 'warning' | 'completed' | 'cancelled';

export interface MedicalSession {
  readonly id: string;
  readonly doctorId: string;
  readonly patientRut: string;
  readonly sessionType: 'consultation' | 'analysis' | 'review';
  readonly status: SessionStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly expiresAt: string;
  readonly completedAt?: string;
  readonly metadata: {
    readonly deviceInfo: {
      readonly platform: 'web' | 'mobile';
      readonly version: string;
    };
    readonly notes?: string;
  };
}

// ============================================================================
// DOCTOR PROFILE
// ============================================================================

export interface Doctor {
  readonly id: string;
  readonly email: string;
  readonly fullName: string;
  readonly medicalLicense: string;
  readonly specialty: string;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

// ============================================================================
// ANALYSIS RESULTS
// ============================================================================

export type SeverityLevel = 'low' | 'moderate' | 'high' | 'critical';
export type UrgencyLevel = 'routine' | 'urgent' | 'emergency';

export interface AnalysisFinding {
  readonly description: string;
  readonly confidence: number;
  readonly severity: SeverityLevel;
  readonly region?: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
}

export interface AnalysisResults {
  readonly type: 'image_analysis' | 'data_analysis' | 'patient_search';
  readonly findings: readonly AnalysisFinding[];
  readonly recommendations: readonly string[];
  readonly urgencyLevel: UrgencyLevel;
  readonly processingTimeMs?: number;
  readonly metadata?: Record<string, unknown>;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isLoadingState<T>(state: LoadingState<T>): state is LoadingState<T> {
  return (
    state !== null &&
    typeof state === 'object' &&
    'status' in state &&
    'data' in state &&
    'error' in state
  );
}

export function hasData<T>(state: LoadingState<T>): state is LoadingState<T> & { data: T } {
  return isLoadingState(state) && state.data !== null;
}

export function hasError<T>(state: LoadingState<T>): state is LoadingState<T> & { error: string } {
  return isLoadingState(state) && state.error !== null;
}
