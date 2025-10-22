-- Migration: Create doctor_profiles table
-- Description: Medical professional profiles with Chilean license validation
-- Compliance: Chilean Law 19.628 - Personal Data Protection

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create doctor_profiles table
CREATE TABLE doctor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_license TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  institution_affiliation TEXT,
  region TEXT NOT NULL DEFAULT 'Metropolitana',
  license_expiration TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_license_verification TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Chilean medical license validation (6-10 digits)
  CONSTRAINT valid_medical_license CHECK (medical_license ~ '^[0-9]{6,10}$'),

  -- Email validation
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),

  -- License must not be expired
  CONSTRAINT license_not_expired CHECK (license_expiration > NOW()),

  -- Valid Chilean regions
  CONSTRAINT valid_region CHECK (region IN (
    'Arica y Parinacota', 'Tarapacá', 'Antofagasta', 'Atacama',
    'Coquimbo', 'Valparaíso', 'Metropolitana', 'O''Higgins',
    'Maule', 'Ñuble', 'Biobío', 'Araucanía', 'Los Ríos',
    'Los Lagos', 'Aysén', 'Magallanes'
  ))
);

-- Comments for medical compliance
COMMENT ON TABLE doctor_profiles IS 'Chilean medical professional profiles - Law 19.628 compliant';
COMMENT ON COLUMN doctor_profiles.medical_license IS 'Chilean medical license number (Super Intendencia de Salud)';
COMMENT ON COLUMN doctor_profiles.license_expiration IS 'License validity period - requires annual verification';
COMMENT ON COLUMN doctor_profiles.last_license_verification IS 'Last automated verification against Chilean medical registry';

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_doctor_profiles_updated_at
  BEFORE UPDATE ON doctor_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Rollback migration
-- DROP TRIGGER IF EXISTS update_doctor_profiles_updated_at ON doctor_profiles;
-- DROP FUNCTION IF EXISTS update_updated_at_column();
-- DROP TABLE IF EXISTS doctor_profiles;
