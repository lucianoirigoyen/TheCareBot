# TypeScript Rules – Prompt Multiagente

## Objetivo
Garantizar un **código fuertemente tipado**, sin uso de `any`, con validaciones runtime y prácticas de calidad en todo el proyecto TheCareBot.

---

## Responsabilidades
- Eliminar cualquier uso de `any`.
- Forzar reglas estrictas en `tsconfig.json`.
- Tipado fuerte en APIs, validaciones y estados.
- Uso de **Zod/io-ts** para validar datos externos.
- Mantener consistencia en tipado para backend (Next.js) y frontend (React Native).
- Implementar utility types personalizados.
- Configurar linting y formateo automático.

---

## Reglas Técnicas

### 1. **tsconfig.json - Configuración Estricta**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": false,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "module": "ESNext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "incremental": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/types/*": ["./src/types/*"],
      "@/utils/*": ["./src/utils/*"],
      "@/components/*": ["./src/components/*"],
      "@/services/*": ["./src/services/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules", ".next", "dist"]
}
```

### 2. **ESLint + Prettier - Configuración Avanzada**
```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended",
    "@typescript-eslint/recommended-requiring-type-checking"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "project": "./tsconfig.json"
  },
  "plugins": ["@typescript-eslint"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unsafe-any": "error",
    "@typescript-eslint/no-unsafe-assignment": "error",
    "@typescript-eslint/no-unsafe-call": "error",
    "@typescript-eslint/no-unsafe-member-access": "error",
    "@typescript-eslint/no-unsafe-return": "error",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/prefer-nullish-coalescing": "error",
    "@typescript-eslint/prefer-optional-chain": "error",
    "@typescript-eslint/strict-boolean-expressions": "error",
    "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
    "@typescript-eslint/consistent-type-imports": [
      "error", 
      { "prefer": "type-imports", "fixStyle": "inline-type-imports" }
    ],
    "@typescript-eslint/no-non-null-assertion": "error",
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

### 3. **Arquitectura de Tipos - Estructura Central**
```typescript
// src/types/index.ts - Tipos base del dominio médico

// === TIPOS BASE ===
export interface BaseEntity {
  readonly id: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

// === DOMINIO MÉDICO ===
export interface Doctor extends BaseEntity {
  readonly email: string;
  readonly fullName: string;
  readonly medicalLicense: string;
  readonly specialty: Specialty;
  readonly isActive: boolean;
}

export interface Patient {
  readonly rut: string; // Formato: 12345678-9
  readonly name: string;
  readonly age: number;
  readonly gender: Gender;
}

export interface MedicalSession extends BaseEntity {
  readonly doctorId: string;
  readonly patientRut: string;
  readonly sessionType: SessionType;
  readonly status: SessionStatus;
  readonly expiresAt: string;
  readonly completedAt: string | null;
  readonly metadata: SessionMetadata;
}

export interface MedicalAnalysis extends BaseEntity {
  readonly sessionId: string;
  readonly analysisType: AnalysisType;
  readonly inputData: AnalysisInput;
  readonly results: AnalysisResults | null;
  readonly confidenceScore: number; // 0.0 - 1.0
  readonly processingTimeMs: number;
  readonly status: AnalysisStatus;
}

// === ENUMS Y UNION TYPES ===
export type Specialty = 
  | 'cardiology'
  | 'dermatology' 
  | 'neurology'
  | 'radiology'
  | 'general_medicine';

export type Gender = 'male' | 'female' | 'other';

export type SessionType = 'analysis' | 'consultation' | 'follow_up';

export type SessionStatus = 'active' | 'completed' | 'expired' | 'cancelled';

export type AnalysisType = 
  | 'image_analysis'
  | 'symptom_checker' 
  | 'risk_assessment'
  | 'lab_interpretation';

export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';

// === UTILITY TYPES ===
export type CreateDoctor = Omit<Doctor, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateDoctor = Partial<Pick<Doctor, 'fullName' | 'specialty'>>;

export type CreateSession = Omit<MedicalSession, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>;
export type SessionSummary = Pick<MedicalSession, 'id' | 'sessionType' | 'status' | 'createdAt'>;

// === METADATA TYPES ===
export interface SessionMetadata {
  readonly deviceInfo?: DeviceInfo;
  readonly location?: GeolocationData;
  readonly referenceImages?: readonly string[];
  readonly notes?: string;
}

export interface DeviceInfo {
  readonly platform: 'web' | 'ios' | 'android';
  readonly version: string;
  readonly userAgent?: string;
}

export interface GeolocationData {
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracy: number;
  readonly timestamp: string;
}

// === ANÁLISIS MÉDICO TYPES ===
export type AnalysisInput = 
  | ImageAnalysisInput
  | SymptomCheckerInput
  | RiskAssessmentInput
  | LabInterpretationInput;

export interface ImageAnalysisInput {
  readonly type: 'image_analysis';
  readonly imageUrls: readonly string[];
  readonly bodyRegion: BodyRegion;
  readonly symptoms?: readonly string[];
}

export interface SymptomCheckerInput {
  readonly type: 'symptom_checker';
  readonly symptoms: readonly Symptom[];
  readonly duration: SymptomDuration;
  readonly severity: SeverityLevel;
}

export type AnalysisResults = 
  | ImageAnalysisResults
  | SymptomCheckerResults
  | RiskAssessmentResults
  | LabInterpretationResults;

export interface ImageAnalysisResults {
  readonly type: 'image_analysis';
  readonly findings: readonly Finding[];
  readonly recommendations: readonly string[];
  readonly urgencyLevel: UrgencyLevel;
}

export interface Finding {
  readonly description: string;
  readonly confidence: number;
  readonly severity: SeverityLevel;
  readonly region: BoundingBox;
}

export type BodyRegion = 
  | 'head' | 'neck' | 'chest' | 'abdomen' 
  | 'arms' | 'legs' | 'hands' | 'feet' | 'back';

export type SeverityLevel = 'low' | 'moderate' | 'high' | 'critical';
export type UrgencyLevel = 'routine' | 'urgent' | 'immediate';

// === RESPONSE TYPES ===
export interface ApiResponse<T> {
  readonly success: boolean;
  readonly data: T | null;
  readonly error: ApiError | null;
  readonly timestamp: string;
}

export interface ApiError {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

// === STATE MANAGEMENT TYPES ===
export interface AppState {
  readonly auth: AuthState;
  readonly sessions: SessionsState;
  readonly analyses: AnalysesState;
  readonly ui: UiState;
}

export interface AuthState {
  readonly user: Doctor | null;
  readonly isLoading: boolean;
  readonly error: string | null;
}

export interface SessionsState {
  readonly currentSession: MedicalSession | null;
  readonly recentSessions: readonly MedicalSession[];
  readonly isLoading: boolean;
  readonly error: string | null;
}
```

### 4. **Validación Runtime con Zod - Esquemas Médicos**
```typescript
// src/schemas/medical.schemas.ts
import { z } from 'zod';

// === VALIDADORES BASE ===
const UUIDSchema = z.string().uuid('Invalid UUID format');

const RUTSchema = z
  .string()
  .regex(/^[0-9]{7,8}-[0-9Kk]$/, 'RUT must be in format XXXXXXXX-X')
  .refine((rut) => validateRutCheckDigit(rut), 'Invalid RUT check digit');

const MedicalLicenseSchema = z
  .string()
  .regex(/^[0-9]{6,10}$/, 'Medical license must be 6-10 digits');

// === ESQUEMAS DE DOMINIO ===
export const DoctorSchema = z.object({
  id: UUIDSchema,
  email: z.string().email('Invalid email format'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  medicalLicense: MedicalLicenseSchema,
  specialty: z.enum(['cardiology', 'dermatology', 'neurology', 'radiology', 'general_medicine']),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const PatientSchema = z.object({
  rut: RUTSchema,
  name: z.string().min(2, 'Name must be at least 2 characters'),
  age: z.number().int().min(0).max(120, 'Age must be between 0 and 120'),
  gender: z.enum(['male', 'female', 'other']),
});

export const MedicalSessionSchema = z.object({
  id: UUIDSchema,
  doctorId: UUIDSchema,
  patientRut: RUTSchema,
  sessionType: z.enum(['analysis', 'consultation', 'follow_up']),
  status: z.enum(['active', 'completed', 'expired', 'cancelled']),
  expiresAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  metadata: z.object({
    deviceInfo: z.object({
      platform: z.enum(['web', 'ios', 'android']),
      version: z.string(),
      userAgent: z.string().optional(),
    }).optional(),
    location: z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      accuracy: z.number().positive(),
      timestamp: z.string().datetime(),
    }).optional(),
    referenceImages: z.array(z.string().url()).optional(),
    notes: z.string().optional(),
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// === ESQUEMAS DE ANÁLISIS ===
export const ImageAnalysisInputSchema = z.object({
  type: z.literal('image_analysis'),
  imageUrls: z.array(z.string().url()).min(1, 'At least one image URL required'),
  bodyRegion: z.enum(['head', 'neck', 'chest', 'abdomen', 'arms', 'legs', 'hands', 'feet', 'back']),
  symptoms: z.array(z.string()).optional(),
});

export const AnalysisResultsSchema = z.object({
  type: z.enum(['image_analysis', 'symptom_checker', 'risk_assessment', 'lab_interpretation']),
  findings: z.array(z.object({
    description: z.string(),
    confidence: z.number().min(0).max(1),
    severity: z.enum(['low', 'moderate', 'high', 'critical']),
    region: z.object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
    }).optional(),
  })),
  recommendations: z.array(z.string()),
  urgencyLevel: z.enum(['routine', 'urgent', 'immediate']),
});

// === RESPONSE SCHEMAS ===
export const ApiResponseSchema = <T>(dataSchema: z.ZodSchema<T>) => 
  z.object({
    success: z.boolean(),
    data: dataSchema.nullable(),
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.record(z.unknown()).optional(),
    }).nullable(),
    timestamp: z.string().datetime(),
  });

// === UTILITY FUNCTIONS ===
export function validateRutCheckDigit(rut: string): boolean {
  const [number, checkDigit] = rut.split('-');
  if (!number || !checkDigit) return false;
  
  let sum = 0;
  let multiplier = 2;
  
  for (let i = number.length - 1; i >= 0; i--) {
    sum += parseInt(number[i]!) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  
  const remainder = sum % 11;
  const expectedDigit = remainder < 2 ? remainder.toString() : (11 - remainder).toString().replace('10', 'K');
  
  return checkDigit.toUpperCase() === expectedDigit;
}

// === TYPE GUARDS ===
export function isDoctorValid(data: unknown): data is Doctor {
  const result = DoctorSchema.safeParse(data);
  return result.success;
}

export function isSessionActive(session: MedicalSession): session is MedicalSession & { status: 'active' } {
  return session.status === 'active' && new Date(session.expiresAt) > new Date();
}

export function hasAnalysisResults(analysis: MedicalAnalysis): analysis is MedicalAnalysis & { results: NonNullable<AnalysisResults> } {
  return analysis.status === 'completed' && analysis.results !== null;
}
```

### 5. **Custom Utility Types - Médicos Específicos**
```typescript
// src/types/utils.ts

// === CONDITIONAL TYPES ===
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// === MEDICAL DOMAIN UTILITIES ===
export type ActiveSession = RequiredFields<MedicalSession, 'doctorId' | 'patientRut'> & {
  readonly status: 'active';
  readonly expiresAt: string;
};

export type CompletedAnalysis = RequiredFields<MedicalAnalysis, 'results' | 'completedAt'> & {
  readonly status: 'completed';
  readonly results: NonNullable<AnalysisResults>;
};

// === API UTILITIES ===
export type ApiEndpoint<TRequest, TResponse> = {
  readonly request: TRequest;
  readonly response: TResponse;
};

export type PaginatedResponse<T> = {
  readonly data: readonly T[];
  readonly pagination: {
    readonly total: number;
    readonly page: number;
    readonly limit: number;
    readonly hasNext: boolean;
    readonly hasPrev: boolean;
  };
};

// === STATE UTILITIES ===
export type LoadingState<T> = 
  | { readonly status: 'idle'; readonly data: null; readonly error: null }
  | { readonly status: 'loading'; readonly data: T | null; readonly error: null }
  | { readonly status: 'success'; readonly data: T; readonly error: null }
  | { readonly status: 'error'; readonly data: T | null; readonly error: string };

export type AsyncState<T> = LoadingState<T> & {
  readonly lastUpdated: string | null;
  readonly isStale: boolean;
};

// === FORM UTILITIES ===
export type FormFieldState<T> = {
  readonly value: T;
  readonly error: string | null;
  readonly touched: boolean;
  readonly isValid: boolean;
};

export type FormState<T extends Record<string, unknown>> = {
  readonly [K in keyof T]: FormFieldState<T[K]>;
} & {
  readonly isValid: boolean;
  readonly isSubmitting: boolean;
  readonly submitError: string | null;
};

// === ERROR HANDLING UTILITIES ===
export type Result<T, E = Error> = 
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: E };

export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

// === BRANDED TYPES FOR SAFETY ===
declare const __brand: unique symbol;
export type Brand<T, TBrand> = T & { readonly [__brand]: TBrand };

export type DoctorId = Brand<string, 'DoctorId'>;
export type SessionId = Brand<string, 'SessionId'>;
export type PatientRUT = Brand<string, 'PatientRUT'>;
export type MedicalLicense = Brand<string, 'MedicalLicense'>;

// === TEMPLATE LITERAL TYPES ===
export type RouteParams<T extends string> = T extends `${string}:${infer Param}/${infer Rest}`
  ? { [K in Param]: string } & RouteParams<Rest>
  : T extends `${string}:${infer Param}`
  ? { [K in Param]: string }
  : Record<string, never>;

// Ejemplo: RouteParams<"/doctors/:doctorId/sessions/:sessionId"> 
// = { doctorId: string; sessionId: string }

export type DatabaseOperations = 
  | `create_${string}`
  | `update_${string}` 
  | `delete_${string}`
  | `select_${string}`;

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
```

### 6. **Hooks Tipados - React/React Native**
```typescript
// src/hooks/useMedicalSession.ts
import { useCallback, useEffect } from 'react';
import { z } from 'zod';
import type { MedicalSession, CreateSession, ApiResponse } from '@/types';

interface UseMedicalSessionOptions {
  readonly sessionId?: string;
  readonly autoRefresh?: boolean;
  readonly refreshInterval?: number;
}

interface UseMedicalSessionReturn {
  readonly session: MedicalSession | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly createSession: (sessionData: CreateSession) => Promise<Result<MedicalSession, string>>;
  readonly updateSession: (sessionId: string, updates: Partial<MedicalSession>) => Promise<Result<MedicalSession, string>>;
  readonly refreshSession: () => Promise<void>;
}

export function useMedicalSession(options: UseMedicalSessionOptions = {}): UseMedicalSessionReturn {
  const { sessionId, autoRefresh = false, refreshInterval = 30000 } = options;
  
  const [state, setState] = useState<LoadingState<MedicalSession>>({
    status: 'idle',
    data: null,
    error: null,
  });

  const createSession = useCallback(async (sessionData: CreateSession): Promise<Result<MedicalSession, string>> => {
    try {
      // Validar datos de entrada
      const validatedData = CreateSessionSchema.parse(sessionData);
      
      setState(prev => ({ ...prev, status: 'loading' }));
      
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validatedData),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json() as ApiResponse<MedicalSession>;
      
      if (!result.success || !result.data) {
        return { 
          success: false, 
          error: result.error?.message ?? 'Failed to create session' 
        };
      }

      setState({ status: 'success', data: result.data, error: null });
      return { success: true, data: result.data };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, status: 'error', error: errorMessage }));
      return { success: false, error: errorMessage };
    }
  }, []);

  // Implementar refreshSession, updateSession...
  
  return {
    session: state.data,
    isLoading: state.status === 'loading',
    error: state.error,
    createSession,
    updateSession: async () => ({ success: false, error: 'Not implemented' }),
    refreshSession: async () => {},
  };
}
```

---

## Buenas Prácticas Implementadas

### **Prohibiciones Estrictas**
- ❌ `any` completamente prohibido y detectado por ESLint
- ❌ Tipos implícitos sin anotación
- ❌ Non-null assertions (`!`) sin justificación
- ❌ `@ts-ignore` sin comentario explicativo
- ❌ Mutación de objetos readonly

### **Patterns Recomendados**
- ✅ **Branded Types** para IDs y valores sensibles
- ✅ **Discriminated Unions** para estados y tipos de análisis
- ✅ **Template Literal Types** para rutas tipadas
- ✅ **Conditional Types** para transformaciones complejas
- ✅ **Type Guards** con validación runtime

### **Validación Runtime**
- ✅ Esquemas Zod para todos los datos externos
- ✅ Validadores personalizados (RUT, licencia médica)
- ✅ Type guards con verificación en tiempo real
- ✅ Transformaciones seguras de datos

### **Arquitectura de Tipos**
- ✅ Tipos centralizados en `/types/`
- ✅ Utility types reutilizables
- ✅ Estados de loading tipados consistentemente
- ✅ Error handling con Result<T, E> pattern

---

## Scripts de Desarrollo

### **package.json Scripts**
```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "typecheck:watch": "tsc --noEmit --watch",
    "lint": "eslint . --ext .ts,.tsx --max-warnings 0",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "test:types": "tsd",
    "build": "next build && npm run typecheck"
  }
}
```

### **Precommit Hooks (Husky)**
```bash
#!/bin/sh
# .husky/pre-commit
npm run typecheck
npm run lint
npm run test:types
```

---

## Entregables
- ✅ Código completamente libre de `any`
- ✅ Configuración TypeScript estricta
- ✅ Validaciones runtime con Zod integradas
- ✅ Tipos médicos específicos del dominio
- ✅ Utility types personalizados
- ✅ Hooks tipados para React/React Native
- ✅ Type guards con validación
- ✅ ESLint con reglas estrictas
- ✅ Tests de tipado automatizados
- ✅ Precommit hooks para calidad de código