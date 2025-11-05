-- ============================================================================
-- SCRIPT DE DATOS DE PRUEBA PARA THECAREBOT
-- Inserta patrones de autocompletado y datos de ejemplo
-- ============================================================================

-- Doctor de prueba (ID fijo para testing)
INSERT INTO doctor_profiles (id, email, full_name, medical_license, specialty, created_at, is_active)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'doctor.test@thecarebot.cl',
  'Dr. Juan Pérez López',
  '12345678',
  'Medicina General',
  now(),
  true
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PATRONES DE AUTOCOMPLETADO PARA SERVICIOS DENTALES/MÉDICOS
-- ============================================================================

-- Tabla: autofill_patterns
CREATE TABLE IF NOT EXISTS autofill_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctor_profiles(id),
  campo TEXT NOT NULL,
  valor TEXT NOT NULL,
  frecuencia INTEGER DEFAULT 1,
  contexto JSONB DEFAULT '{}',
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(doctor_id, campo, valor)
);

-- Servicios médicos comunes
INSERT INTO autofill_patterns (doctor_id, campo, valor, frecuencia, contexto) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'descripcion_servicio', 'Consulta médica general', 45, '{"day_of_week": 1, "period_of_day": "morning"}'),
('550e8400-e29b-41d4-a716-446655440000', 'descripcion_servicio', 'Limpieza dental profesional', 38, '{"day_of_week": 2, "period_of_day": "afternoon"}'),
('550e8400-e29b-41d4-a716-446655440000', 'descripcion_servicio', 'Control preventivo', 32, '{"day_of_week": 3, "period_of_day": "morning"}'),
('550e8400-e29b-41d4-a716-446655440000', 'descripcion_servicio', 'Obturación dental simple', 28, '{"day_of_week": 4, "period_of_day": "afternoon"}'),
('550e8400-e29b-41d4-a716-446655440000', 'descripcion_servicio', 'Extracción dental', 22, '{"day_of_week": 5, "period_of_day": "morning"}'),
('550e8400-e29b-41d4-a716-446655440000', 'descripcion_servicio', 'Radiografía dental', 20, '{"day_of_week": 1, "period_of_day": "afternoon"}'),
('550e8400-e29b-41d4-a716-446655440000', 'descripcion_servicio', 'Blanqueamiento dental', 18, '{"day_of_week": 5, "period_of_day": "afternoon"}'),
('550e8400-e29b-41d4-a716-446655440000', 'descripcion_servicio', 'Ortodoncia control mensual', 15, '{"day_of_week": 3, "period_of_day": "afternoon"}'),
('550e8400-e29b-41d4-a716-446655440000', 'descripcion_servicio', 'Endodoncia', 12, '{"day_of_week": 2, "period_of_day": "morning"}'),
('550e8400-e29b-41d4-a716-446655440000', 'descripcion_servicio', 'Prótesis dental', 10, '{"day_of_week": 4, "period_of_day": "morning"}')
ON CONFLICT (doctor_id, campo, valor) DO UPDATE SET
  frecuencia = EXCLUDED.frecuencia,
  last_used_at = now();

-- Razones sociales (nombres de pacientes comunes)
INSERT INTO autofill_patterns (doctor_id, campo, valor, frecuencia, contexto) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'razon_social', 'Roberto Carlos Fuentes Sánchez', 18, '{}'),
('550e8400-e29b-41d4-a716-446655440000', 'razon_social', 'María González Martínez', 15, '{}'),
('550e8400-e29b-41d4-a716-446655440000', 'razon_social', 'Juan Pérez Rodríguez', 12, '{}'),
('550e8400-e29b-41d4-a716-446655440000', 'razon_social', 'Carmen Silva López', 10, '{}'),
('550e8400-e29b-41d4-a716-446655440000', 'razon_social', 'Pedro Morales Castro', 8, '{}'),
('550e8400-e29b-41d4-a716-446655440000', 'razon_social', 'Ana Fernández Torres', 7, '{}')
ON CONFLICT (doctor_id, campo, valor) DO UPDATE SET
  frecuencia = EXCLUDED.frecuencia;

-- Direcciones comunes en Santiago
INSERT INTO autofill_patterns (doctor_id, campo, valor, frecuencia, contexto) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'direccion', 'Av. Vitacura 3456, Vitacura', 12, '{}'),
('550e8400-e29b-41d4-a716-446655440000', 'direccion', 'Av. Providencia 1234, Providencia', 8, '{}'),
('550e8400-e29b-41d4-a716-446655440000', 'direccion', 'Av. Libertador Bernardo O''Higgins 5678, Santiago Centro', 6, '{}'),
('550e8400-e29b-41d4-a716-446655440000', 'direccion', 'Los Leones 890, Providencia', 5, '{}'),
('550e8400-e29b-41d4-a716-446655440000', 'direccion', 'Apoquindo 3456, Las Condes', 4, '{}'),
('550e8400-e29b-41d4-a716-446655440000', 'direccion', 'Gran Avenida 2345, San Miguel', 3, '{}')
ON CONFLICT (doctor_id, campo, valor) DO UPDATE SET
  frecuencia = EXCLUDED.frecuencia;

-- ============================================================================
-- PACIENTES DE PRUEBA
-- ============================================================================

CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rut TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL,
  medical_history TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

INSERT INTO patients (rut, name, age, gender, medical_history) VALUES
('12.345.678-9', 'Juan Carlos Pérez González', 45, 'male', ARRAY['Diabetes tipo 2', 'Hipertensión arterial']),
('98.765.432-1', 'María Isabel González López', 32, 'female', ARRAY['Alergia a penicilina', 'Asma leve']),
('15.678.234-K', 'Pedro Antonio Morales Castro', 58, 'male', ARRAY['Dislipidemia', 'Antecedentes cardíacos']),
('23.456.789-0', 'Carmen Rosa Silva Fernández', 41, 'female', ARRAY['Hipotiroidismo']),
('34.567.890-1', 'Ana María Torres Ramírez', 29, 'female', ARRAY['Ninguno registrado']),
('20.210.808-K', 'Roberto Carlos Fuentes Sánchez', 35, 'male', ARRAY['Alergias estacionales', 'Control dental regular'])
ON CONFLICT (rut) DO NOTHING;

-- ============================================================================
-- ÍNDICES PARA MEJOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_autofill_doctor_campo ON autofill_patterns(doctor_id, campo);
CREATE INDEX IF NOT EXISTS idx_autofill_frecuencia ON autofill_patterns(frecuencia DESC);
CREATE INDEX IF NOT EXISTS idx_patients_rut ON patients(rut);

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

SELECT 'Doctor de prueba creado:' as status, email, full_name FROM doctor_profiles WHERE id = '550e8400-e29b-41d4-a716-446655440000';
SELECT 'Patrones de autocompletado creados:' as status, COUNT(*) as total FROM autofill_patterns;
SELECT 'Pacientes de prueba creados:' as status, COUNT(*) as total FROM patients;

SELECT 'Top 5 servicios más frecuentes:' as status;
SELECT valor, frecuencia FROM autofill_patterns 
WHERE campo = 'descripcion_servicio' 
ORDER BY frecuencia DESC 
LIMIT 5;
