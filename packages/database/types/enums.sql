-- Database enums and types for TheCareBot
-- Chilean medical specialties and system enums

-- Medical specialties enum (Chilean medical specialties)
CREATE TYPE medical_specialty_enum AS ENUM (
  'medicina_general',
  'cardiologia',
  'neurologia',
  'pediatria',
  'ginecologia_obstetricia',
  'traumatologia',
  'oftalmologia',
  'otorrinolaringologia',
  'dermatologia',
  'psiquiatria',
  'radiologia',
  'anestesiologia',
  'cirugia_general',
  'medicina_interna',
  'medicina_familiar',
  'geriatria',
  'endocrinologia',
  'gastroenterologia',
  'hematologia',
  'infectologia',
  'nefrologia',
  'neumologia',
  'oncologia',
  'reumatologia',
  'urologia'
);

-- Session status enum
CREATE TYPE session_status_enum AS ENUM (
  'active',
  'completed', 
  'expired',
  'cancelled'
);

-- Analysis status enum
CREATE TYPE analysis_status_enum AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed'
);

-- Analysis type enum for different medical document types
CREATE TYPE analysis_type_enum AS ENUM (
  'excel',
  'radiografia',
  'resumen'
);

-- Audit action types for compliance logging
CREATE TYPE audit_action_enum AS ENUM (
  'session_created',
  'session_updated',
  'session_completed',
  'session_expired',
  'analysis_started',
  'analysis_completed',
  'analysis_failed',
  'profile_accessed',
  'profile_updated',
  'data_exported',
  'security_violation',
  'cleanup_expired_sessions',
  'cleanup_old_logs'
);

-- Resource types for audit logging
CREATE TYPE resource_type_enum AS ENUM (
  'session',
  'analysis',
  'profile',
  'system',
  'maintenance'
);

-- Chilean RUT validation custom type
CREATE DOMAIN chilean_rut AS TEXT 
  CHECK (VALUE ~ '^[0-9]{7,8}-[0-9Kk]$');

-- Chilean medical license validation custom type  
CREATE DOMAIN chilean_medical_license AS TEXT
  CHECK (VALUE ~ '^[0-9]{6,10}$');

-- Email validation custom type
CREATE DOMAIN email_address AS TEXT
  CHECK (VALUE ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$');

-- Confidence score type for AI analysis results
CREATE DOMAIN confidence_score AS DECIMAL(3,2)
  CHECK (VALUE BETWEEN 0.00 AND 1.00);

-- HTTP status code type for audit logging
CREATE DOMAIN http_status_code AS INTEGER
  CHECK (VALUE BETWEEN 100 AND 599);