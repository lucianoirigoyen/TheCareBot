/**
 * TheCareBot Mobile - Medical Domain Types
 * Chilean RUT and Medical License branded types with strict validation
 */

// === BRANDED TYPES FOR MEDICAL COMPLIANCE ===

/**
 * Chilean RUT with validation and check digit
 */
export type ChileanRUT = string & { readonly __brand: 'ChileanRUT' };

/**
 * Medical License Number for Chilean doctors
 */
export type MedicalLicenseNumber = string & { readonly __brand: 'MedicalLicense' };

/**
 * Session UUID v4 for medical sessions
 */
export type SessionUUID = string & { readonly __brand: 'SessionUUID' };

/**
 * Encrypted data container with AES-256-GCM
 */
export interface AESEncryptedData {
  readonly encryptedData: string;
  readonly iv: string;
  readonly salt: string;
  readonly tag: string;
  readonly algorithm: 'AES-256-GCM';
  readonly createdAt: number;
}

/**
 * Medical session sync status for offline-first architecture
 */
export type SyncStatus = 'pending' | 'synced' | 'conflict' | 'error';

/**
 * Chilean medical specialties enum
 */
export enum ChileanMedicalSpecialty {
  MEDICINA_GENERAL = 'medicina_general',
  CARDIOLOGIA = 'cardiologia',
  NEUROLOGIA = 'neurologia',
  ONCOLOGIA = 'oncologia',
  PEDIATRIA = 'pediatria',
  GINECOLOGIA = 'ginecologia',
  TRAUMATOLOGIA = 'traumatologia',
  RADIOLOGIA = 'radiologia',
  ANESTESIOLOGIA = 'anestesiologia',
  MEDICINA_INTERNA = 'medicina_interna',
}

// === MEDICAL SESSION TYPES ===

/**
 * Medical session for offline-first mobile app
 */
export interface MedicalSession {
  readonly id: SessionUUID;
  readonly doctorId: string;
  readonly doctorRut: ChileanRUT;
  readonly patientRut: ChileanRUT;
  readonly sessionType: 'buscar_paciente' | 'analizar_excel' | 'analizar_radiografia';
  readonly status: 'active' | 'completed' | 'cancelled';
  readonly specialty: ChileanMedicalSpecialty;
  readonly createdAt: string; // ISO 8601
  readonly updatedAt: string; // ISO 8601
  readonly completedAt: string | null;
  readonly expiresAt: string; // 24-hour offline capability
  readonly confidenceScore?: number; // 0.0-1.0 for AI analysis
  readonly n8nExecutionId?: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Create session request payload
 */
export interface CreateMedicalSession {
  readonly doctorId: string;
  readonly doctorRut: ChileanRUT;
  readonly patientRut: ChileanRUT;
  readonly sessionType: MedicalSession['sessionType'];
  readonly specialty: ChileanMedicalSpecialty;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Analysis results with Chilean medical compliance
 */
export interface AnalysisResults {
  readonly analysisId: string;
  readonly sessionId: SessionUUID;
  readonly analysisType: MedicalSession['sessionType'];
  readonly results: {
    readonly findings: string[];
    readonly recommendations: string[];
    readonly confidence: number; // 0.0-1.0
    readonly requiresManualReview: boolean; // true if confidence < 0.7
  };
  readonly n8nWorkflowResults?: Record<string, unknown>;
  readonly auditTrail: {
    readonly analyzedAt: string;
    readonly analyzedBy: string;
    readonly reviewedBy?: string;
    readonly reviewedAt?: string;
  };
}

// === OFFLINE STORAGE TYPES ===

/**
 * Offline medical record with encryption and sync metadata
 */
export interface OfflineMedicalRecord<T> {
  readonly id: string;
  readonly encryptedData: AESEncryptedData;
  readonly plainData?: T; // Only available after decryption
  readonly lastModified: number;
  readonly syncStatus: SyncStatus;
  readonly version: number;
  readonly integrityHash: string;
  readonly compressionLevel?: number; // For radiography images
  readonly offlineCapability: number; // Hours of offline operation
}

/**
 * Medical file with compression and integrity verification
 */
export interface MedicalFile {
  readonly id: string;
  readonly sessionId: SessionUUID;
  readonly fileName: string;
  readonly fileType: 'excel' | 'radiography' | 'document';
  readonly mimeType: string;
  readonly filePath: string;
  readonly fileSize: number;
  readonly compressedSize?: number;
  readonly compressionRatio?: number;
  readonly integrityHash: string;
  readonly uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'failed';
  readonly uploadProgress: number; // 0-100
  readonly createdAt: string;
}

/**
 * Compressed radiography image with intelligent sync
 */
export interface CompressedRadiographyImage {
  readonly id: string;
  readonly sessionId: SessionUUID;
  readonly originalPath: string;
  readonly compressedPath: string;
  readonly thumbnailPath: string;
  readonly originalSize: number;
  readonly compressedSize: number;
  readonly compressionLevel: number; // 1-10
  readonly quality: number; // 0.1-1.0
  readonly dimensions: {
    readonly width: number;
    readonly height: number;
  };
  readonly metadata: {
    readonly capturedAt: string;
    readonly deviceInfo: string;
    readonly geoLocation?: {
      readonly latitude: number;
      readonly longitude: number;
    };
  };
  readonly integrityVerification: {
    readonly originalHash: string;
    readonly compressedHash: string;
    readonly verified: boolean;
  };
}

// === NETWORK AND SYNC TYPES ===

/**
 * Network state for intelligent sync
 */
export interface NetworkState {
  readonly isConnected: boolean;
  readonly connectionType: 'wifi' | 'cellular' | '3g' | '4g' | '5g' | 'unknown';
  readonly isExpensive: boolean;
  readonly isSecureWiFi: boolean; // Detected WiFi security
  readonly strength: number; // 0-100
  readonly lastConnected: number;
}

/**
 * Sync progress with medical audit trail
 */
export interface SyncProgress {
  readonly totalItems: number;
  readonly completedItems: number;
  readonly failedItems: number;
  readonly currentItem?: string;
  readonly errors: readonly string[];
  readonly isActive: boolean;
  readonly startedAt?: number;
  readonly estimatedCompletion?: number;
}

/**
 * Sync conflict resolution
 */
export interface SyncConflict<T> {
  readonly resourceId: string;
  readonly resourceType: 'session' | 'analysis' | 'media';
  readonly localVersion: T;
  readonly serverVersion: T;
  readonly conflictType: 'version' | 'integrity' | 'timestamp';
  readonly resolutionStrategy: 'local-wins' | 'server-wins' | 'manual-review';
  readonly resolvedAt?: string;
  readonly resolvedBy?: string;
}

// === BIOMETRIC AUTHENTICATION TYPES ===

/**
 * Biometric authentication configuration
 */
export interface BiometricConfig {
  readonly enabled: boolean;
  readonly availableTypes: readonly ('TouchID' | 'FaceID' | 'Fingerprint')[];
  readonly requireBiometric: boolean; // Force biometric for medical data
  readonly maxAttempts: number;
  readonly lockoutDuration: number; // Minutes
}

/**
 * Biometric authentication result
 */
export interface BiometricAuthResult {
  readonly success: boolean;
  readonly biometryType?: 'TouchID' | 'FaceID' | 'Fingerprint';
  readonly error?: string;
  readonly attemptsRemaining?: number;
}

// === UI STATE TYPES ===

/**
 * UI state for medical components
 */
export interface UIState<T> {
  readonly status: 'idle' | 'loading' | 'success' | 'error';
  readonly data: T | null;
  readonly error: string | null;
  readonly lastUpdated?: number;
}

/**
 * Offline mode UI configuration
 */
export interface OfflineModeConfig {
  readonly showOfflineIndicator: boolean;
  readonly allowOfflineActions: boolean;
  readonly fallbackType: 'cached' | 'demo' | 'disabled';
  readonly warningMessage?: string;
}

// === ERROR TYPES ===

/**
 * Medical app specific error types
 */
export type MedicalAppError =
  | { readonly type: 'INVALID_RUT'; readonly rut: string }
  | { readonly type: 'INVALID_MEDICAL_LICENSE'; readonly license: string }
  | { readonly type: 'SESSION_EXPIRED'; readonly sessionId: SessionUUID }
  | { readonly type: 'BIOMETRIC_FAILED'; readonly attempts: number }
  | { readonly type: 'ENCRYPTION_FAILED'; readonly reason: string }
  | { readonly type: 'SYNC_CONFLICT'; readonly conflict: SyncConflict<unknown> }
  | { readonly type: 'NETWORK_UNAVAILABLE'; readonly requiredAction: string }
  | { readonly type: 'STORAGE_FULL'; readonly requiredSpace: number }
  | { readonly type: 'INTEGRITY_VIOLATION'; readonly resourceId: string };

// === UTILITY TYPES ===

/**
 * Readonly recursive type for immutable medical data
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * Brand utility function
 */
export function brand<T, B>(value: T): T & { readonly __brand: B } {
  return value as T & { readonly __brand: B };
}

// === TYPE GUARDS ===

export function isChileanRUT(value: string): value is ChileanRUT {
  // Chilean RUT format: XXXXXXXX-X (8 digits + dash + check digit)
  const rutRegex = /^\d{7,8}-[\dKk]$/;
  return rutRegex.test(value);
}

export function isMedicalLicenseNumber(value: string): value is MedicalLicenseNumber {
  // Chilean medical license format validation
  const licenseRegex = /^[A-Z0-9]{6,12}$/;
  return licenseRegex.test(value);
}

export function isSessionUUID(value: string): value is SessionUUID {
  // UUID v4 format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}