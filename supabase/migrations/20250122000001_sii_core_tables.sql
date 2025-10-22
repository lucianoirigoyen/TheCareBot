-- Chilean SII Electronic Invoicing System - Core Tables
-- Migration: 20250122000001_sii_core_tables.sql

-- 1. Boletas Electrónicas (Electronic Receipts - Tipo DTE 39)
CREATE TABLE boletas_electronicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Document identification
  folio BIGINT NOT NULL,
  tipo_dte INTEGER DEFAULT 39,

  -- Parties
  emisor_rut TEXT NOT NULL,
  receptor_rut TEXT NOT NULL,
  receptor_razon_social TEXT NOT NULL,

  -- Dates
  fecha_emision TIMESTAMP WITH TIME ZONE DEFAULT now(),
  fecha_envio TIMESTAMP WITH TIME ZONE,

  -- Amounts
  monto_neto NUMERIC(12,2) NOT NULL,
  monto_iva NUMERIC(12,2) NOT NULL,
  monto_total NUMERIC(12,2) NOT NULL,

  -- XML and tracking
  xml_dte TEXT,
  track_id TEXT,

  -- Status
  estado_sii TEXT DEFAULT 'pendiente' CHECK (estado_sii IN ('pendiente', 'aceptado', 'rechazado', 'reparo')),
  glosa_estado TEXT,

  -- Association
  doctor_id UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  CONSTRAINT boletas_folio_emisor_unique UNIQUE (folio, emisor_rut)
);

CREATE INDEX idx_boletas_doctor_fecha ON boletas_electronicas(doctor_id, fecha_emision DESC);
CREATE INDEX idx_boletas_track_id ON boletas_electronicas(track_id) WHERE track_id IS NOT NULL;
CREATE INDEX idx_boletas_estado ON boletas_electronicas(estado_sii, fecha_emision DESC);

-- 2. Facturas Electrónicas (Electronic Invoices - Tipo DTE 33)
CREATE TABLE facturas_electronicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  folio BIGINT NOT NULL,
  tipo_dte INTEGER DEFAULT 33,

  emisor_rut TEXT NOT NULL,
  receptor_rut TEXT NOT NULL,
  receptor_razon_social TEXT NOT NULL,
  receptor_giro TEXT,
  receptor_direccion TEXT,

  fecha_emision TIMESTAMP WITH TIME ZONE DEFAULT now(),
  fecha_envio TIMESTAMP WITH TIME ZONE,

  monto_neto NUMERIC(12,2) NOT NULL,
  monto_iva NUMERIC(12,2) NOT NULL,
  monto_total NUMERIC(12,2) NOT NULL,

  xml_dte TEXT,
  track_id TEXT,

  estado_sii TEXT DEFAULT 'pendiente' CHECK (estado_sii IN ('pendiente', 'aceptado', 'rechazado', 'reparo')),
  glosa_estado TEXT,

  doctor_id UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  CONSTRAINT facturas_folio_emisor_unique UNIQUE (folio, emisor_rut)
);

CREATE INDEX idx_facturas_doctor_fecha ON facturas_electronicas(doctor_id, fecha_emision DESC);
CREATE INDEX idx_facturas_track_id ON facturas_electronicas(track_id) WHERE track_id IS NOT NULL;

-- 3. Notas de Crédito (Credit Notes - Tipo DTE 61)
CREATE TABLE notas_credito (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  folio BIGINT NOT NULL,
  tipo_dte INTEGER DEFAULT 61,

  emisor_rut TEXT NOT NULL,
  receptor_rut TEXT NOT NULL,
  receptor_razon_social TEXT NOT NULL,

  -- Reference to original document
  referencia_tipo_doc INTEGER NOT NULL,
  referencia_folio BIGINT NOT NULL,
  motivo_referencia TEXT NOT NULL,

  fecha_emision TIMESTAMP WITH TIME ZONE DEFAULT now(),
  fecha_envio TIMESTAMP WITH TIME ZONE,

  monto_neto NUMERIC(12,2) NOT NULL,
  monto_iva NUMERIC(12,2) NOT NULL,
  monto_total NUMERIC(12,2) NOT NULL,

  xml_dte TEXT,
  track_id TEXT,

  estado_sii TEXT DEFAULT 'pendiente' CHECK (estado_sii IN ('pendiente', 'aceptado', 'rechazado', 'reparo')),
  glosa_estado TEXT,

  doctor_id UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  CONSTRAINT notas_folio_emisor_unique UNIQUE (folio, emisor_rut)
);

CREATE INDEX idx_notas_doctor_fecha ON notas_credito(doctor_id, fecha_emision DESC);
CREATE INDEX idx_notas_referencia ON notas_credito(referencia_tipo_doc, referencia_folio);

-- 4. Folios Asignados (Folio Management with CAF Authorization)
CREATE TABLE folios_asignados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  tipo_dte INTEGER NOT NULL CHECK (tipo_dte IN (33, 39, 61)),
  rut_empresa TEXT NOT NULL,

  folio_desde BIGINT NOT NULL,
  folio_hasta BIGINT NOT NULL,
  folio_actual BIGINT NOT NULL,

  caf_xml TEXT NOT NULL, -- CAF (Código de Autorización de Folios) from SII

  fecha_autorizacion TIMESTAMP WITH TIME ZONE NOT NULL,
  fecha_vencimiento TIMESTAMP WITH TIME ZONE NOT NULL,

  estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'agotado', 'vencido')),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  CONSTRAINT folio_actual_in_range CHECK (folio_actual >= folio_desde AND folio_actual <= folio_hasta)
);

CREATE INDEX idx_folios_tipo_estado ON folios_asignados(tipo_dte, estado);
CREATE INDEX idx_folios_empresa ON folios_asignados(rut_empresa, tipo_dte);

-- 5. Certificados Tributarios (Tax Certificates - Encrypted)
CREATE TABLE certificados_tributarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  rut_empresa TEXT NOT NULL,

  archivo_pfx TEXT NOT NULL, -- Encrypted .pfx certificate
  password_encrypted TEXT NOT NULL, -- AES-256 encrypted password

  fecha_vencimiento TIMESTAMP WITH TIME ZONE NOT NULL,
  estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'vencido')),

  doctor_id UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_certificados_doctor ON certificados_tributarios(doctor_id, estado);

-- 6. Citas Dentales (Dental Appointments with Google Calendar)
CREATE TABLE citas_dentales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  doctor_id UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,

  patient_nombre TEXT NOT NULL,
  patient_telefono TEXT,
  patient_email TEXT,

  fecha_cita TIMESTAMP WITH TIME ZONE NOT NULL,
  duracion_minutos INTEGER DEFAULT 30,
  tipo_consulta TEXT,
  notas TEXT,

  -- Google Calendar integration
  google_calendar_id TEXT,
  google_calendar_event_id TEXT,

  -- WhatsApp notifications
  whatsapp_sent BOOLEAN DEFAULT false,
  whatsapp_sent_at TIMESTAMP WITH TIME ZONE,

  -- Status
  estado TEXT DEFAULT 'agendada' CHECK (estado IN ('agendada', 'confirmada', 'completada', 'cancelada')),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_citas_doctor_fecha ON citas_dentales(doctor_id, fecha_cita DESC);
CREATE INDEX idx_citas_estado ON citas_dentales(estado, fecha_cita);

-- 7. Exámenes Dentales (Dental Exams with AI Feedback)
CREATE TABLE examenes_dentales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  doctor_id UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,

  patient_rut TEXT NOT NULL,
  patient_nombre TEXT NOT NULL,
  patient_email TEXT,
  patient_telefono TEXT,

  tipo_examen TEXT NOT NULL,
  fecha_examen TIMESTAMP WITH TIME ZONE NOT NULL,
  archivo_url TEXT,

  diagnostico TEXT,
  hallazgos JSONB,
  recomendaciones TEXT[],
  urgente BOOLEAN DEFAULT false,

  -- AI-generated feedback
  feedback_generado BOOLEAN DEFAULT false,
  feedback_mensaje TEXT,
  feedback_enviado BOOLEAN DEFAULT false,
  feedback_fecha_envio TIMESTAMP WITH TIME ZONE,
  feedback_canal TEXT CHECK (feedback_canal IN ('whatsapp', 'email', 'sms')),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_examenes_doctor_fecha ON examenes_dentales(doctor_id, fecha_examen DESC);
CREATE INDEX idx_examenes_feedback_pendiente ON examenes_dentales(feedback_generado, feedback_enviado)
  WHERE feedback_generado = TRUE AND feedback_enviado = FALSE;

-- 8. Autofill Patterns (AI Pattern Learning for Intelligent Autocomplete)
CREATE TABLE autofill_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  doctor_id UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,

  campo TEXT NOT NULL,
  valor TEXT NOT NULL,
  frecuencia INTEGER DEFAULT 1,

  contexto JSONB, -- {dia_semana: 1, hora: 'manana', tipo_consulta: 'limpieza'}
  confidence_score NUMERIC(3,2),

  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  CONSTRAINT pattern_unico UNIQUE (doctor_id, campo, valor)
);

CREATE INDEX idx_autofill_doctor_campo ON autofill_patterns(doctor_id, campo, frecuencia DESC);
CREATE INDEX idx_autofill_last_used ON autofill_patterns(doctor_id, last_used_at DESC);

-- 9. Logs SII (SII Audit Trail - Append Only)
CREATE TABLE logs_sii (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  doctor_id UUID REFERENCES doctor_profiles(id) ON DELETE SET NULL,

  operacion TEXT NOT NULL,
  tipo_dte INTEGER,
  folio BIGINT,

  request_payload JSONB,
  response_payload JSONB,
  http_status INTEGER,

  exitoso BOOLEAN NOT NULL,
  mensaje_error TEXT,

  duracion_ms INTEGER,

  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_logs_sii_doctor_fecha ON logs_sii(doctor_id, created_at DESC);
CREATE INDEX idx_logs_sii_folio ON logs_sii(folio) WHERE folio IS NOT NULL;
CREATE INDEX idx_logs_sii_exitoso ON logs_sii(exitoso, created_at DESC);

-- Enable Row Level Security on all tables except logs_sii
ALTER TABLE boletas_electronicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas_electronicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas_credito ENABLE ROW LEVEL SECURITY;
ALTER TABLE folios_asignados ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificados_tributarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas_dentales ENABLE ROW LEVEL SECURITY;
ALTER TABLE examenes_dentales ENABLE ROW LEVEL SECURITY;
ALTER TABLE autofill_patterns ENABLE ROW LEVEL SECURITY;
