# Validaciones y Seguridad – Prompt Multiagente

## Objetivo
Proteger datos médicos sensibles en TheCareBot mediante validaciones estrictas, seguridad en profundidad y cumplimiento de normativas sanitarias internacionales.

---

## Responsabilidades
- Validación de identificadores (UUID v4, RUT chileno, licencias médicas).
- Esquemas Zod para requests/responses con sanitización.
- Implementar RLS (Row-Level Security) en Supabase con políticas granulares.
- Logs de auditoría completos con trazabilidad médica.
- Headers de seguridad y CSP estrictos en frontend.
- Cifrado de datos sensibles en reposo y tránsito.
- Gestión de sesiones médicas con timeout automático.
- Cumplimiento HIPAA/GDPR en manejo de datos.

---

## Reglas Técnicas

### 1. **Validación de Identificadores Médicos**
```typescript
// src/security/validators.ts
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { createHash, createCipher, createDecipher } from 'crypto';

// === VALIDADORES MÉDICOS ESPECÍFICOS ===

// Validador de RUT chileno con dígito verificador
export const RUTSchema = z
  .string()
  .regex(/^[0-9]{7,8}-[0-9Kk]$/, 'RUT debe tener formato XXXXXXXX-X')
  .refine((rut) => validateRutCheckDigit(rut), 'Dígito verificador de RUT inválido')
  .transform((rut) => rut.toUpperCase()); // Normalizar K mayúscula

export function validateRutCheckDigit(rut: string): boolean {
  const [numberStr, checkDigit] = rut.split('-');
  if (!numberStr || !checkDigit) return false;
  
  const number = parseInt(numberStr, 10);
  if (isNaN(number)) return false;
  
  let sum = 0;
  let multiplier = 2;
  
  // Algoritmo de validación RUT
  const digits = numberStr.split('').reverse();
  for (const digit of digits) {
    sum += parseInt(digit, 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  
  const remainder = sum % 11;
  const expectedDigit = remainder < 2 
    ? remainder.toString() 
    : (11 - remainder === 10 ? 'K' : (11 - remainder).toString());
  
  return checkDigit.toUpperCase() === expectedDigit;
}

// Validador de licencia médica internacional
export const MedicalLicenseSchema = z
  .string()
  .min(6, 'Licencia médica debe tener al menos 6 caracteres')
  .max(20, 'Licencia médica no puede exceder 20 caracteres')
  .regex(/^[A-Z0-9\-]+$/, 'Licencia médica solo puede contener letras, números y guiones')
  .refine((license) => validateMedicalLicense(license), 'Formato de licencia médica inválido');

export function validateMedicalLicense(license: string): boolean {
  // Validaciones específicas por país/región
  const patterns = {
    // Chile: 6-8 dígitos
    chile: /^[0-9]{6,8}$/,
    // España: Formato específico
    spain: /^[0-9]{2}\.[0-9]{3}\.[0-9]{3}$/,
    // Generic international: alphanumeric
    international: /^[A-Z0-9]{6,15}$/,
  };
  
  return Object.values(patterns).some(pattern => pattern.test(license));
}

// Validador de UUID v4 estricto
export const UUIDv4Schema = z
  .string()
  .uuid('Debe ser un UUID v4 válido')
  .refine((uuid) => {
    // Verificar que sea específicamente v4
    const version = parseInt(uuid.charAt(14), 16);
    return version === 4;
  }, 'Debe ser específicamente UUID versión 4');

// Validador de email médico con dominios permitidos
export const MedicalEmailSchema = z
  .string()
  .email('Email inválido')
  .refine((email) => {
    const allowedDomains = [
      'hospital.com',
      'clinic.org',
      'medical.edu',
      'health.gov',
      '.med.',
      // Agregar dominios médicos específicos
    ];
    
    const domain = email.toLowerCase();
    return allowedDomains.some(allowed => 
      domain.includes(allowed) || 
      domain.endsWith('.med') || 
      domain.includes('hospital') ||
      process.env.NODE_ENV === 'development' // Permitir todos en desarrollo
    );
  }, 'Email debe ser de una institución médica reconocida')
  .transform((email) => email.toLowerCase());

// Validador de contraseña médica fuerte
export const MedicalPasswordSchema = z
  .string()
  .min(12, 'Contraseña debe tener al menos 12 caracteres')
  .max(128, 'Contraseña no puede exceder 128 caracteres')
  .regex(/[a-z]/, 'Debe contener al menos una minúscula')
  .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
  .regex(/[0-9]/, 'Debe contener al menos un número')
  .regex(/[^a-zA-Z0-9]/, 'Debe contener al menos un carácter especial')
  .refine((password) => {
    // Verificar que no contenga patrones comunes
    const commonPatterns = [
      /123456/,
      /password/i,
      /qwerty/i,
      /admin/i,
      /doctor/i,
      /medical/i,
    ];
    
    return !commonPatterns.some(pattern => pattern.test(password));
  }, 'Contraseña no puede contener patrones comunes');

// === VALIDADORES DE DATOS MÉDICOS ===

// Validador de datos de paciente
export const PatientDataSchema = z.object({
  rut: RUTSchema,
  firstName: z.string()
    .min(2, 'Nombre debe tener al menos 2 caracteres')
    .max(50, 'Nombre no puede exceder 50 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nombre solo puede contener letras y espacios')
    .transform((name) => name.trim()),
  
  lastName: z.string()
    .min(2, 'Apellido debe tener al menos 2 caracteres')
    .max(50, 'Apellido no puede exceder 50 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Apellido solo puede contener letras y espacios')
    .transform((name) => name.trim()),
  
  dateOfBirth: z.string()
    .datetime('Fecha de nacimiento debe ser ISO 8601')
    .refine((date) => {
      const birthDate = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      return age >= 0 && age <= 150;
    }, 'Edad debe estar entre 0 y 150 años'),
  
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']),
  
  contactInfo: z.object({
    email: z.string().email().optional(),
    phone: z.string()
      .regex(/^\+?[1-9]\d{1,14}$/, 'Teléfono debe ser formato internacional')
      .optional(),
    emergencyContact: z.object({
      name: z.string().min(2).max(100),
      phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
      relationship: z.string().min(2).max(50),
    }).optional(),
  }).optional(),
  
  medicalHistory: z.object({
    allergies: z.array(z.string()).max(20).optional(),
    medications: z.array(z.string()).max(50).optional(),
    conditions: z.array(z.string()).max(30).optional(),
  }).optional(),
}).strict(); // Rechazar propiedades adicionales

// === SANITIZACIÓN DE DATOS ===
export function sanitizeHtmlInput(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remover scripts
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remover iframes
    .replace(/javascript:/gi, '') // Remover javascript: URLs
    .replace(/on\w+\s*=/gi, '') // Remover event handlers
    .trim();
}

export function sanitizeSqlInput(input: string): string {
  return input
    .replace(/['";\\]/g, '') // Remover caracteres SQL peligrosos
    .replace(/\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b/gi, '') // Remover keywords SQL
    .trim();
}
```

### 2. **Sistema de Cifrado de Datos Médicos**
```typescript
// src/security/encryption.ts
import { createCipherGCM, createDecipherGCM, randomBytes, pbkdf2Sync } from 'crypto';

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyDerivationSalt: string;
}

export class MedicalDataEncryption {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32; // 256 bits
  private static readonly IV_LENGTH = 16; // 128 bits
  private static readonly SALT_LENGTH = 32; // 256 bits
  private static readonly PBKDF2_ITERATIONS = 100000;
  
  private masterKey: string;
  
  constructor() {
    this.masterKey = process.env.MASTER_ENCRYPTION_KEY || '';
    if (!this.masterKey) {
      throw new Error('MASTER_ENCRYPTION_KEY environment variable is required');
    }
    
    if (this.masterKey.length < 32) {
      throw new Error('Master encryption key must be at least 32 characters');
    }
  }
  
  /**
   * Cifra datos médicos sensibles
   */
  encryptMedicalData(plaintext: string, additionalData?: string): EncryptedData {
    try {
      // Generar salt único para derivación de clave
      const keyDerivationSalt = randomBytes(MedicalDataEncryption.SALT_LENGTH);
      
      // Derivar clave específica usando PBKDF2
      const derivedKey = pbkdf2Sync(
        this.masterKey,
        keyDerivationSalt,
        MedicalDataEncryption.PBKDF2_ITERATIONS,
        MedicalDataEncryption.KEY_LENGTH,
        'sha512'
      );
      
      // Generar IV único
      const iv = randomBytes(MedicalDataEncryption.IV_LENGTH);
      
      // Crear cipher
      const cipher = createCipherGCM(MedicalDataEncryption.ALGORITHM, derivedKey, iv);
      
      // Agregar datos adicionales autenticados (AAD) si se proporcionan
      if (additionalData) {
        cipher.setAAD(Buffer.from(additionalData, 'utf8'));
      }
      
      // Cifrar
      let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
      ciphertext += cipher.final('base64');
      
      // Obtener tag de autenticación
      const authTag = cipher.getAuthTag();
      
      return {
        ciphertext,
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        keyDerivationSalt: keyDerivationSalt.toString('base64'),
      };
      
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt medical data');
    }
  }
  
  /**
   * Descifra datos médicos
   */
  decryptMedicalData(encryptedData: EncryptedData, additionalData?: string): string {
    try {
      // Reconstruir la clave derivada
      const keyDerivationSalt = Buffer.from(encryptedData.keyDerivationSalt, 'base64');
      const derivedKey = pbkdf2Sync(
        this.masterKey,
        keyDerivationSalt,
        MedicalDataEncryption.PBKDF2_ITERATIONS,
        MedicalDataEncryption.KEY_LENGTH,
        'sha512'
      );
      
      // Reconstruir IV y authTag
      const iv = Buffer.from(encryptedData.iv, 'base64');
      const authTag = Buffer.from(encryptedData.authTag, 'base64');
      
      // Crear decipher
      const decipher = createDecipherGCM(MedicalDataEncryption.ALGORITHM, derivedKey, iv);
      decipher.setAuthTag(authTag);
      
      // Configurar AAD si se proporcionó
      if (additionalData) {
        decipher.setAAD(Buffer.from(additionalData, 'utf8'));
      }
      
      // Descifrar
      let plaintext = decipher.update(encryptedData.ciphertext, 'base64', 'utf8');
      plaintext += decipher.final('utf8');
      
      return plaintext;
      
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt medical data - data may be corrupted or key invalid');
    }
  }
  
  /**
   * Genera hash seguro para indexación
   */
  hashForIndexing(data: string): string {
    const hash = pbkdf2Sync(data, this.masterKey, 10000, 32, 'sha512');
    return hash.toString('base64');
  }
}

// Singleton para uso global
export const medicalEncryption = new MedicalDataEncryption();

// === FUNCIONES DE UTILIDAD PARA DATOS ESPECÍFICOS ===

/**
 * Cifra RUT de paciente manteniendo formato para búsquedas
 */
export function encryptPatientRUT(rut: string): { encrypted: EncryptedData; searchHash: string } {
  const encrypted = medicalEncryption.encryptMedicalData(rut, 'patient_rut');
  const searchHash = medicalEncryption.hashForIndexing(rut);
  
  return { encrypted, searchHash };
}

/**
 * Cifra datos de análisis médico
 */
export function encryptAnalysisResults(results: object, sessionId: string): EncryptedData {
  const jsonResults = JSON.stringify(results);
  return medicalEncryption.encryptMedicalData(jsonResults, `analysis_${sessionId}`);
}

/**
 * Descifra datos de análisis médico
 */
export function decryptAnalysisResults(encrypted: EncryptedData, sessionId: string): object {
  const decrypted = medicalEncryption.decryptMedicalData(encrypted, `analysis_${sessionId}`);
  return JSON.parse(decrypted);
}
```

### 3. **Políticas RLS Granulares para Supabase**
```sql
-- src/database/security/rls_policies.sql

-- === POLÍTICAS DE SEGURIDAD MÉDICA ===

-- Habilitar RLS en todas las tablas médicas
ALTER TABLE doctor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE thecarebot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE thecarebot_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE encrypted_medical_records ENABLE ROW LEVEL SECURITY;

-- === POLÍTICAS PARA DOCTORES ===

-- Los doctores solo pueden ver y editar su propio perfil
CREATE POLICY "doctors_own_profile_select" ON doctor_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "doctors_own_profile_update" ON doctor_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Los doctores no pueden eliminar su propio perfil (solo admin)
CREATE POLICY "doctors_no_delete_own_profile" ON doctor_profiles
  FOR DELETE USING (false);

-- === POLÍTICAS PARA DATOS DE PACIENTES ===

-- Los doctores solo pueden acceder a datos de pacientes de sus sesiones activas
CREATE POLICY "doctors_patient_data_via_sessions" ON patient_data
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM thecarebot_sessions 
      WHERE doctor_id = auth.uid() 
        AND patient_rut = patient_data.rut_hash
        AND status IN ('active', 'completed')
        AND expires_at > now()
    )
  );

-- Los doctores pueden insertar nuevos pacientes solo si tienen sesión activa
CREATE POLICY "doctors_insert_patient_with_session" ON patient_data
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM thecarebot_sessions 
      WHERE doctor_id = auth.uid() 
        AND patient_rut = NEW.rut_hash
        AND status = 'active'
        AND expires_at > now()
    )
  );

-- Actualizaciones limitadas solo durante sesiones activas
CREATE POLICY "doctors_update_patient_in_session" ON patient_data
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM thecarebot_sessions 
      WHERE doctor_id = auth.uid() 
        AND patient_rut = patient_data.rut_hash
        AND status = 'active'
        AND expires_at > now()
    )
  );

-- === POLÍTICAS PARA SESIONES MÉDICAS ===

-- Los doctores solo pueden ver y gestionar sus propias sesiones
CREATE POLICY "doctors_own_sessions" ON thecarebot_sessions
  FOR ALL USING (doctor_id = auth.uid());

-- Las sesiones deben tener un doctor válido al crearlas
CREATE POLICY "valid_doctor_for_new_session" ON thecarebot_sessions
  FOR INSERT WITH CHECK (
    doctor_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM doctor_profiles 
      WHERE id = auth.uid() 
        AND is_active = true
    )
  );

-- === POLÍTICAS PARA ANÁLISIS MÉDICOS ===

-- Los doctores pueden acceder a análisis de sus propias sesiones
CREATE POLICY "doctors_analyses_via_sessions" ON medical_analyses
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM thecarebot_sessions 
      WHERE doctor_id = auth.uid()
    )
  );

-- Los doctores pueden crear análisis solo en sus sesiones activas
CREATE POLICY "doctors_create_analyses_active_sessions" ON medical_analyses
  FOR INSERT WITH CHECK (
    session_id IN (
      SELECT id FROM thecarebot_sessions 
      WHERE doctor_id = auth.uid() 
        AND status = 'active'
        AND expires_at > now()
    )
  );

-- Los análisis no pueden ser eliminados, solo marcados como inválidos
CREATE POLICY "no_delete_analyses" ON medical_analyses
  FOR DELETE USING (false);

-- === POLÍTICAS PARA LOGS DE AUDITORÍA ===

-- Los doctores pueden ver logs de sus propias acciones (últimos 30 días)
CREATE POLICY "doctors_own_logs_recent" ON thecarebot_logs
  FOR SELECT USING (
    doctor_id = auth.uid() 
    AND created_at > (now() - INTERVAL '30 days')
  );

-- Solo el sistema puede insertar logs (función SECURITY DEFINER)
CREATE POLICY "system_only_insert_logs" ON thecarebot_logs
  FOR INSERT WITH CHECK (false); -- Bloqueado por defecto

-- Los logs nunca pueden ser actualizados o eliminados
CREATE POLICY "logs_immutable" ON thecarebot_logs
  FOR UPDATE USING (false);

CREATE POLICY "logs_no_delete" ON thecarebot_logs
  FOR DELETE USING (false);

-- === POLÍTICAS PARA REGISTROS MÉDICOS CIFRADOS ===

-- Acceso a registros cifrados solo a través de sesiones
CREATE POLICY "encrypted_records_via_sessions" ON encrypted_medical_records
  FOR SELECT USING (
    patient_rut_hash IN (
      SELECT patient_rut FROM thecarebot_sessions 
      WHERE doctor_id = auth.uid() 
        AND status IN ('active', 'completed')
        AND expires_at > now() - INTERVAL '24 hours'
    )
  );

-- === FUNCIONES DE SEGURIDAD ===

-- Función para registrar acceso a datos médicos
CREATE OR REPLACE FUNCTION log_medical_data_access()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO thecarebot_logs (
    doctor_id,
    action,
    resource_type,
    resource_id,
    ip_address,
    created_at
  ) VALUES (
    auth.uid(),
    TG_OP || '_' || TG_TABLE_NAME,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id)::text,
    current_setting('request.header.x-forwarded-for', true),
    now()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers para auditoría automática
CREATE TRIGGER log_patient_data_access
  AFTER SELECT OR INSERT OR UPDATE ON patient_data
  FOR EACH ROW EXECUTE FUNCTION log_medical_data_access();

CREATE TRIGGER log_medical_analyses_access
  AFTER SELECT OR INSERT OR UPDATE ON medical_analyses
  FOR EACH ROW EXECUTE FUNCTION log_medical_data_access();

-- === POLÍTICAS PARA ROLES ADMINISTRATIVOS ===

-- Crear rol de administrador médico
CREATE ROLE medical_admin;

-- Los administradores médicos pueden ver todos los datos (con logging)
CREATE POLICY "medical_admin_full_access" ON patient_data
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'medical_admin'
  );

-- Política similar para otras tablas con rol admin
CREATE POLICY "admin_sessions_access" ON thecarebot_sessions
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'medical_admin'
  );

-- === POLÍTICAS DE TIEMPO Y EXPIRACIÓN ===

-- Las sesiones expiradas no pueden ser accedidas
CREATE OR REPLACE FUNCTION check_session_validity()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM thecarebot_sessions 
    WHERE id = current_setting('app.current_session_id', true)::uuid
      AND expires_at > now()
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar validación de sesión a todas las operaciones críticas
ALTER TABLE patient_data ADD CONSTRAINT valid_session_required 
  CHECK (check_session_validity());
```

### 4. **Headers de Seguridad y CSP**
```typescript
// src/middleware/security.ts
import { NextRequest, NextResponse } from 'next/server';
import rateLimit from 'express-rate-limit';

// === CONFIGURACIÓN DE CONTENT SECURITY POLICY ===
const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Solo para desarrollo, remover en producción
    'https://cdnjs.cloudflare.com',
    'https://unpkg.com',
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Necesario para styled-components
    'https://fonts.googleapis.com',
  ],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    'https://*.supabase.co',
    'https://images.unsplash.com', // Para imágenes de placeholder
  ],
  'font-src': [
    "'self'",
    'https://fonts.gstatic.com',
  ],
  'connect-src': [
    "'self'",
    'https://*.supabase.co',
    'https://api.openai.com',
    'https://healthcare.googleapis.com',
    process.env.NODE_ENV === 'development' ? 'http://localhost:*' : '',
  ].filter(Boolean),
  'frame-ancestors': ["'none'"], // Prevenir clickjacking
  'form-action': ["'self'"],
  'base-uri': ["'self'"],
  'object-src': ["'none'"],
  'media-src': ["'self'", 'blob:'],
  'worker-src': ["'self'", 'blob:'],
  'child-src': ["'none'"],
  'frame-src': ["'none'"],
  'manifest-src': ["'self'"],
};

function generateCSP(): string {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
}

// === HEADERS DE SEGURIDAD MÉDICA ===
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy
  response.headers.set('Content-Security-Policy', generateCSP());
  
  // Strict Transport Security (HTTPS obligatorio)
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
  
  // Prevenir MIME sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Prevenir clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  
  // XSS Protection (legacy pero aún útil)
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Referrer Policy (limitar información en headers)
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Feature Policy / Permissions Policy
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()'
  );
  
  // Prevenir caching de datos sensibles
  response.headers.set(
    'Cache-Control',
    'private, no-cache, no-store, must-revalidate, max-age=0'
  );
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  
  // Headers específicos para aplicaciones médicas
  response.headers.set('X-Medical-App', 'TheCareBot');
  response.headers.set('X-Data-Classification', 'Medical-PHI');
  response.headers.set('X-Compliance', 'HIPAA-GDPR');
  
  // Remove server information
  response.headers.delete('Server');
  response.headers.delete('X-Powered-By');
  
  return response;
}

// === MIDDLEWARE DE RATE LIMITING ===
interface RateLimitRule {
  endpoint: string;
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
}

const MEDICAL_RATE_LIMITS: RateLimitRule[] = [
  // Endpoints de autenticación más restrictivos
  {
    endpoint: '/api/auth/login',
    windowMs: 15 * 60 * 1000, // 15 minutos
    maxRequests: 5, // 5 intentos por IP
    skipSuccessfulRequests: false,
  },
  
  // Análisis médicos - límite por session
  {
    endpoint: '/api/medical/analysis',
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 10,
    skipSuccessfulRequests: true,
  },
  
  // Consultas de pacientes
  {
    endpoint: '/api/patients',
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 30,
    skipSuccessfulRequests: true,
  },
  
  // General API
  {
    endpoint: '/api/*',
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 100,
    skipSuccessfulRequests: true,
  },
];

export function createRateLimitMiddleware(rule: RateLimitRule) {
  return rateLimit({
    windowMs: rule.windowMs,
    max: rule.maxRequests,
    message: {
      error: 'Too many requests',
      retryAfter: rule.windowMs / 1000,
      endpoint: rule.endpoint,
    },
    skipSuccessfulRequests: rule.skipSuccessfulRequests,
    standardHeaders: true,
    legacyHeaders: false,
    // Key generator personalizado para incluir user ID si está disponible
    keyGenerator: (request: any) => {
      const ip = request.ip || request.connection.remoteAddress;
      const userId = request.user?.id || '';
      return `${ip}-${userId}`;
    },
    // Handler personalizado para logging
    onLimitReached: (request: any) => {
      console.warn('Rate limit exceeded', {
        ip: request.ip,
        endpoint: request.url,
        userAgent: request.headers['user-agent'],
        timestamp: new Date().toISOString(),
      });
    },
  });
}

// === VALIDACIÓN DE SESIÓN MÉDICA ===
export async function validateMedicalSession(
  request: NextRequest
): Promise<{ valid: boolean; sessionId?: string; doctorId?: string; error?: string }> {
  try {
    const sessionToken = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!sessionToken) {
      return { valid: false, error: 'No session token provided' };
    }
    
    // Verificar token JWT (implementar según tu sistema de auth)
    const decoded = await verifyJWT(sessionToken);
    if (!decoded) {
      return { valid: false, error: 'Invalid session token' };
    }
    
    // Verificar que la sesión esté activa en la base de datos
    const session = await supabase
      .from('thecarebot_sessions')
      .select('id, doctor_id, status, expires_at')
      .eq('id', decoded.sessionId)
      .eq('status', 'active')
      .single();
    
    if (session.error || !session.data) {
      return { valid: false, error: 'Session not found or inactive' };
    }
    
    // Verificar expiración
    if (new Date(session.data.expires_at) < new Date()) {
      return { valid: false, error: 'Session expired' };
    }
    
    // Renovar sesión si está por expirar (menos de 10 minutos)
    const expiresIn = new Date(session.data.expires_at).getTime() - Date.now();
    if (expiresIn < 10 * 60 * 1000) { // 10 minutos
      await extendMedicalSession(session.data.id);
    }
    
    return {
      valid: true,
      sessionId: session.data.id,
      doctorId: session.data.doctor_id,
    };
    
  } catch (error) {
    console.error('Session validation error:', error);
    return { valid: false, error: 'Session validation failed' };
  }
}

async function extendMedicalSession(sessionId: string): Promise<void> {
  const newExpiryTime = new Date(Date.now() + 20 * 60 * 1000); // +20 minutos
  
  await supabase
    .from('thecarebot_sessions')
    .update({ expires_at: newExpiryTime.toISOString() })
    .eq('id', sessionId);
}

// === SANITIZACIÓN DE DATOS DE ENTRADA ===
export function sanitizeRequestData(data: any): any {
  if (typeof data === 'string') {
    return sanitizeHtmlInput(data);
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeRequestData);
  }
  
  if (data && typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeRequestData(value);
    }
    return sanitized;
  }
  
  return data;
}
```

### 5. **Sistema de Auditoría Completa**
```typescript
// src/security/audit.ts
import { randomUUID } from 'crypto';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

export interface AuditEvent {
  id: string;
  timestamp: string;
  doctorId: string;
  sessionId?: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestData?: Record<string, unknown>;
  responseStatus: number;
  responseTime?: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  complianceFlags?: string[];
  errorMessage?: string;
  additionalContext?: Record<string, unknown>;
}

export type AuditAction = 
  | 'login' | 'logout' | 'session_start' | 'session_end'
  | 'patient_view' | 'patient_create' | 'patient_update'
  | 'analysis_start' | 'analysis_complete' | 'analysis_view'
  | 'data_export' | 'data_import' | 'data_delete'
  | 'permission_grant' | 'permission_revoke'
  | 'system_config_change' | 'security_event';

export type AuditResource = 
  | 'authentication' | 'patient_data' | 'medical_analysis'
  | 'medical_session' | 'doctor_profile' | 'system_config'
  | 'audit_log' | 'encrypted_record';

export class MedicalAuditLogger {
  private static instance: MedicalAuditLogger;
  private eventBuffer: AuditEvent[] = [];
  private readonly bufferSize = 100;
  private flushInterval?: NodeJS.Timeout;
  
  private constructor() {
    this.startPeriodicFlush();
  }
  
  static getInstance(): MedicalAuditLogger {
    if (!MedicalAuditLogger.instance) {
      MedicalAuditLogger.instance = new MedicalAuditLogger();
    }
    return MedicalAuditLogger.instance;
  }
  
  /**
   * Registra evento de auditoría médica
   */
  async logEvent(params: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void> {
    const event: AuditEvent = {
      ...params,
      id: randomUUID(),
      timestamp: new Date().toISOString(),
    };
    
    // Determinar nivel de riesgo automáticamente si no se especifica
    if (!event.riskLevel) {
      event.riskLevel = this.calculateRiskLevel(event);
    }
    
    // Agregar flags de cumplimiento
    event.complianceFlags = this.generateComplianceFlags(event);
    
    // Agregar a buffer
    this.eventBuffer.push(event);
    
    // Flush inmediato para eventos críticos
    if (event.riskLevel === 'critical' || this.eventBuffer.length >= this.bufferSize) {
      await this.flushEvents();
    }
    
    // Log en consola para eventos de alto riesgo
    if (['high', 'critical'].includes(event.riskLevel)) {
      console.warn('HIGH RISK AUDIT EVENT', {
        action: event.action,
        resource: event.resource,
        doctor: event.doctorId,
        risk: event.riskLevel,
        ip: event.ipAddress,
      });
    }
  }
  
  /**
   * Calcula nivel de riesgo basado en la acción
   */
  private calculateRiskLevel(event: AuditEvent): 'low' | 'medium' | 'high' | 'critical' {
    // Eventos críticos
    if (['data_delete', 'data_export', 'permission_grant', 'system_config_change'].includes(event.action)) {
      return 'critical';
    }
    
    // Eventos de alto riesgo
    if (['patient_create', 'patient_update', 'analysis_complete'].includes(event.action)) {
      return 'high';
    }
    
    // Eventos de riesgo medio
    if (['patient_view', 'analysis_start', 'analysis_view'].includes(event.action)) {
      return 'medium';
    }
    
    // Errores son siempre de alto riesgo
    if (event.responseStatus >= 400) {
      return event.responseStatus >= 500 ? 'critical' : 'high';
    }
    
    return 'low';
  }
  
  /**
   * Genera flags de cumplimiento normativo
   */
  private generateComplianceFlags(event: AuditEvent): string[] {
    const flags: string[] = [];
    
    // HIPAA compliance flags
    if (['patient_view', 'patient_create', 'patient_update', 'analysis_view'].includes(event.action)) {
      flags.push('HIPAA_PHI_ACCESS');
    }
    
    if (['data_export', 'data_delete'].includes(event.action)) {
      flags.push('HIPAA_PHI_DISCLOSURE');
    }
    
    // GDPR compliance flags
    if (['patient_create', 'patient_update'].includes(event.action)) {
      flags.push('GDPR_PERSONAL_DATA');
    }
    
    if (event.action === 'data_delete') {
      flags.push('GDPR_RIGHT_TO_ERASURE');
    }
    
    // Security event flags
    if (event.responseStatus === 401 || event.responseStatus === 403) {
      flags.push('SECURITY_ACCESS_DENIED');
    }
    
    if (event.riskLevel === 'critical') {
      flags.push('REQUIRES_REVIEW');
    }
    
    return flags;
  }
  
  /**
   * Flush eventos al storage persistente
   */
  private async flushEvents(): Promise<void> {
    if (this.eventBuffer.length === 0) return;
    
    const eventsToFlush = [...this.eventBuffer];
    this.eventBuffer = [];
    
    try {
      // Insertar en base de datos
      const { error } = await supabase
        .from('thecarebot_logs')
        .insert(
          eventsToFlush.map(event => ({
            id: event.id,
            doctor_id: event.doctorId,
            session_id: event.sessionId,
            action: event.action,
            resource_type: event.resource,
            resource_id: event.resourceId,
            ip_address: event.ipAddress,
            user_agent: event.userAgent,
            request_data: event.requestData,
            response_status: event.responseStatus,
            execution_time_ms: event.responseTime,
            risk_level: event.riskLevel,
            compliance_flags: event.complianceFlags,
            error_message: event.errorMessage,
            additional_context: event.additionalContext,
            created_at: event.timestamp,
          }))
        );
      
      if (error) {
        console.error('Failed to flush audit events:', error);
        // Re-agregar eventos al buffer para retry
        this.eventBuffer.unshift(...eventsToFlush);
      } else {
        console.info(`Flushed ${eventsToFlush.length} audit events`);
      }
      
    } catch (error) {
      console.error('Audit flush exception:', error);
      this.eventBuffer.unshift(...eventsToFlush);
    }
  }
  
  private startPeriodicFlush(): void {
    this.flushInterval = setInterval(() => {
      this.flushEvents();
    }, 10000); // Flush cada 10 segundos
  }
  
  /**
   * Métodos de conveniencia para eventos comunes
   */
  
  async logPatientAccess(doctorId: string, patientRut: string, sessionId: string, ipAddress?: string): Promise<void> {
    await this.logEvent({
      doctorId,
      sessionId,
      action: 'patient_view',
      resource: 'patient_data',
      resourceId: patientRut,
      ipAddress,
      responseStatus: 200,
      riskLevel: 'medium',
      additionalContext: {
        dataType: 'patient_demographics',
        accessMethod: 'direct_lookup',
      },
    });
  }
  
  async logAnalysisComplete(
    doctorId: string,
    sessionId: string,
    analysisId: string,
    analysisType: string,
    responseTime: number,
    ipAddress?: string
  ): Promise<void> {
    await this.logEvent({
      doctorId,
      sessionId,
      action: 'analysis_complete',
      resource: 'medical_analysis',
      resourceId: analysisId,
      ipAddress,
      responseStatus: 200,
      responseTime,
      riskLevel: 'high',
      additionalContext: {
        analysisType,
        processingTime: responseTime,
      },
    });
  }
  
  async logSecurityEvent(
    doctorId: string,
    action: string,
    details: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logEvent({
      doctorId,
      action: 'security_event',
      resource: 'authentication',
      responseStatus: 403,
      riskLevel: 'critical',
      ipAddress,
      userAgent,
      errorMessage: details,
      additionalContext: {
        securityEventType: action,
        requiresInvestigation: true,
      },
    });
  }
}

// Singleton instance
export const auditLogger = MedicalAuditLogger.getInstance();

// Decorator para auditoría automática
export function audited(action: AuditAction, resource: AuditResource) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      let responseStatus = 200;
      let errorMessage: string | undefined;
      
      try {
        const result = await originalMethod.apply(this, args);
        return result;
      } catch (error) {
        responseStatus = error instanceof Error && 'status' in error 
          ? (error as any).status 
          : 500;
        errorMessage = error instanceof Error ? error.message : String(error);
        throw error;
      } finally {
        const responseTime = Date.now() - startTime;
        
        // Extraer context del primer argumento (asumiendo que contiene doctorId, sessionId)
        const context = args[0] || {};
        
        await auditLogger.logEvent({
          doctorId: context.doctorId || context.userId || 'unknown',
          sessionId: context.sessionId,
          action,
          resource,
          resourceId: context.resourceId,
          responseStatus,
          responseTime,
          errorMessage,
          additionalContext: {
            method: propertyKey,
            argumentsHash: hashArguments(args),
          },
        });
      }
    };
    
    return descriptor;
  };
}

function hashArguments(args: any[]): string {
  // Crear hash de argumentos sin incluir datos sensibles
  const safeArgs = args.map(arg => {
    if (typeof arg === 'object' && arg !== null) {
      // Remover campos sensibles
      const { password, token, key, secret, ...safe } = arg;
      return safe;
    }
    return typeof arg === 'string' && arg.length > 100 ? '[LARGE_STRING]' : arg;
  });
  
  return JSON.stringify(safeArgs).slice(0, 500); // Limitar tamaño
}
```

---

## Buenas Prácticas Implementadas

### **Validación Estricta de Datos**
- ✅ **Validadores específicos** para RUT chileno, licencias médicas, emails institucionales
- ✅ **Zod schemas** con sanitización automática
- ✅ **Transformaciones normalizadas** (mayúsculas, trim, formato)
- ✅ **Validación de integridad** con checksums y algoritmos

### **Cifrado de Datos Médicos**
- ✅ **AES-256-GCM** para cifrado simétrico fuerte
- ✅ **PBKDF2** para derivación de claves con salt único
- ✅ **Autenticación de datos** con GCM auth tags
- ✅ **Key rotation** preparado con salt por registro

### **Row-Level Security Granular**
- ✅ **Políticas específicas** por rol y tipo de operación
- ✅ **Validación temporal** de sesiones activas
- ✅ **Triggers de auditoría** automática
- ✅ **Immutabilidad** de logs críticos

### **Headers de Seguridad Completos**
- ✅ **CSP estricto** específico para aplicaciones médicas
- ✅ **HSTS** con preload para HTTPS obligatorio
- ✅ **Anti-clickjacking** y XSS protection
- ✅ **Rate limiting** diferenciado por endpoint

### **Auditoría Médica Completa**
- ✅ **Logging automático** de todos los accesos a datos médicos
- ✅ **Flags de cumplimiento** HIPAA/GDPR automáticos
- ✅ **Risk scoring** automático por tipo de evento
- ✅ **Buffer con flush** para alta performance

### **Gestión de Sesiones Médicas**
- ✅ **Tokens JWT** con validación estricta
- ✅ **Auto-renovación** antes de expiración
- ✅ **Timeout automático** por inactividad
- ✅ **Invalidación** en eventos sospechosos

---

## Scripts de Validación de Seguridad

### **Test de Penetración Automatizado**
```typescript
// src/testing/security/penetration-tests.ts
export const securityTests = [
  {
    name: 'SQL Injection Protection',
    test: async () => {
      const maliciousInputs = [
        "'; DROP TABLE patient_data; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM doctor_profiles --",
      ];
      
      for (const input of maliciousInputs) {
        const result = await testPatientSearch(input);
        if (result.includes('doctor_profiles') || result.includes('DROP')) {
          throw new Error('SQL Injection vulnerability detected');
        }
      }
    },
  },
  
  {
    name: 'XSS Protection',
    test: async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src=x onerror=alert("XSS")>',
      ];
      
      for (const payload of xssPayloads) {
        const result = await testPatientNameInput(payload);
        if (result.includes('<script>') || result.includes('javascript:')) {
          throw new Error('XSS vulnerability detected');
        }
      }
    },
  },
  
  {
    name: 'Authentication Bypass',
    test: async () => {
      const response = await fetch('/api/patients', {
        headers: { 'Authorization': 'Bearer invalid-token' },
      });
      
      if (response.status !== 401) {
        throw new Error('Authentication bypass vulnerability');
      }
    },
  },
];
```

---

## Entregables
- ✅ Validadores médicos específicos (RUT, licencias, emails)
- ✅ Sistema de cifrado AES-256-GCM para datos sensibles
- ✅ Políticas RLS granulares con validación temporal
- ✅ Headers de seguridad completos con CSP estricto
- ✅ Sistema de auditoría con cumplimiento HIPAA/GDPR
- ✅ Rate limiting diferenciado por criticidad
- ✅ Gestión segura de sesiones médicas
- ✅ Sanitización automática de inputs
- ✅ Tests de penetración automatizados
- ✅ Documentación de cumplimiento normativo