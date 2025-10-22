# CLAUDE_FACTURACION.md

Este archivo extiende `CLAUDE.md` con funcionalidades específicas para facturación electrónica SII Chile y gestión dental completa, integrándose con la arquitectura existente de **TheCareBot**.

## 📋 Resumen Ejecutivo

**DentalPro SII** es una extensión del sistema TheCareBot que añade:

- ✅ Facturación electrónica SII Chile (Boletas y Facturas)
- ✅ Autocompletado inteligente de datos recurrentes
- ✅ Agenda dental con Google Calendar + WhatsApp
- ✅ Feedback automatizado de exámenes dentales
- ✅ Contabilidad y reportes tributarios automáticos
- ✅ Validación en tiempo real según normativas SII

**Filosofía de Integración**: Reutilizar al máximo la arquitectura existente de TheCareBot sin crear complejidad innecesaria.

---

## 🏗️ Arquitectura de Integración

### Mapeo a Subagentes Existentes

```typescript
// Distribución de responsabilidades en arquitectura actual
const AGENT_RESPONSIBILITIES = {
  "Database Subagent": [
    "Schema de boletas electrónicas",
    "Historial de facturación por paciente",
    "Agenda de citas dentales",
    "Logs de envío SII",
    "Reportes contables agregados",
  ],
  "Backend Subagent": [
    "Integración API SII Chile",
    "Generación XML DTE (Documentos Tributarios Electrónicos)",
    "Firma digital con certificado tributario",
    "Circuit breakers para API SII",
    "Webhook handlers para Google Calendar",
  ],
  "Frontend UX Subagent": [
    "Formularios de boleta electrónica",
    "Dashboard de facturación",
    "Calendario visual de citas",
    "Panel de reportes tributarios",
    "Autocompletado inteligente UI",
  ],
  "Security Subagent": [
    "Encriptación de certificados SII",
    "Validación RUT emisor/receptor",
    "Auditoría compliance SII",
    "Permisos de facturación por rol",
  ],
  "TypeScript Subagent": [
    "Tipos para DTE (33, 39, 61, etc.)",
    "Schemas Zod para validación SII",
    "Branded types para Folio y DTE",
    "Tipos para integraciones externas",
  ],
  "React Native Subagent": [
    "Facturación offline con sync",
    "Captura de firma paciente",
    "Escaneo QR código boleta",
    "Notificaciones push de citas",
  ],
  "Observability Subagent": [
    "Métricas de éxito envío SII",
    "Trazabilidad facturación end-to-end",
    "Alertas por rechazos SII",
    "SLOs para tiempo de emisión",
  ],
} as const;
```

---

## 📂 Estructura de Archivos (Extensión de TheCareBot)

```
thecarebot/
├── src/
│   ├── app/
│   │   ├── facturacion/                    # 🆕 Nueva sección
│   │   │   ├── page.tsx                    # Dashboard de facturación
│   │   │   ├── layout.tsx                  # Layout con breadcrumbs
│   │   │   ├── boletas/
│   │   │   │   ├── page.tsx                # Lista de boletas
│   │   │   │   ├── nueva/page.tsx          # Crear boleta
│   │   │   │   └── [folio]/page.tsx        # Detalle boleta
│   │   │   ├── facturas/
│   │   │   │   └── ...                     # Similar a boletas
│   │   │   ├── reportes/
│   │   │   │   ├── page.tsx                # Reportes tributarios
│   │   │   │   ├── libro-ventas/page.tsx  # Libro de ventas SII
│   │   │   │   └── resumen-mensual/page.tsx
│   │   │   └── configuracion/
│   │   │       ├── page.tsx                # Config SII (certificados)
│   │   │       └── autofill/page.tsx       # Gestión autocompletado
│   │   ├── agenda/                         # 🆕 Gestión de citas
│   │   │   ├── page.tsx                    # Calendario visual
│   │   │   ├── nueva-cita/page.tsx         # Agendar cita
│   │   │   └── [citaId]/page.tsx           # Detalle cita
│   │   └── feedback/                       # 🆕 Feedback exámenes
│   │       ├── page.tsx                    # Lista de exámenes
│   │       └── enviar/page.tsx             # Envío masivo feedback
│   ├── api/
│   │   ├── sii/                            # 🆕 Endpoints SII
│   │   │   ├── route.ts                    # Health check SII
│   │   │   ├── generar-dte/route.ts        # Genera XML DTE
│   │   │   ├── firmar-dte/route.ts         # Firma digital
│   │   │   ├── enviar-dte/route.ts         # Envía a SII
│   │   │   ├── consultar-estado/route.ts   # Consulta estado DTE
│   │   │   ├── anular-boleta/route.ts      # Anulación
│   │   │   └── libro-ventas/route.ts       # Genera libro ventas
│   │   ├── agenda/                         # 🆕 Google Calendar sync
│   │   │   ├── route.ts                    # CRUD citas
│   │   │   ├── sync/route.ts               # Sync con Google
│   │   │   └── webhook/route.ts            # Webhook Calendar
│   │   ├── whatsapp/                       # 🆕 Notificaciones WhatsApp
│   │   │   ├── recordatorio/route.ts       # Envío recordatorios
│   │   │   └── confirmacion/route.ts       # Confirmación cita
│   │   └── feedback/                       # 🆕 Feedback automatizado
│   │       ├── generar/route.ts            # Genera mensaje
│   │       └── enviar/route.ts             # Envía por WhatsApp/Email
│   ├── components/
│   │   ├── facturacion/                    # 🆕 Componentes facturación
│   │   │   ├── FormularioBoleta.tsx        # Form con autocompletado
│   │   │   ├── PreviewDTE.tsx              # Preview antes de enviar
│   │   │   ├── EstadoEnvio.tsx             # Badge estado SII
│   │   │   ├── TablaFacturacion.tsx        # Tabla con filtros
│   │   │   ├── AutocompletadoInteligente.tsx # Input con sugerencias
│   │   │   └── CertificadoUploader.tsx     # Subir certificado .pfx
│   │   ├── agenda/                         # 🆕 Componentes agenda
│   │   │   ├── CalendarioDental.tsx        # Calendario interactivo
│   │   │   ├── FormularioCita.tsx          # Agendar/editar cita
│   │   │   ├── ListaCitas.tsx              # Lista diaria/semanal
│   │   │   └── RecordatorioConfig.tsx      # Config recordatorios
│   │   └── feedback/                       # 🆕 Componentes feedback
│   │       ├── EditorMensaje.tsx           # Editor con templates
│   │       ├── ListaExamenes.tsx           # Exámenes pendientes
│   │       └── PreviewWhatsApp.tsx         # Preview mensaje WA
│   ├── services/
│   │   ├── sii/                            # 🆕 Lógica SII
│   │   │   ├── client.ts                   # HTTP client SII
│   │   │   ├── xml-builder.ts              # Construye XML DTE
│   │   │   ├── xml-signer.ts               # Firma digital XML
│   │   │   ├── validator.ts                # Valida pre-envío
│   │   │   ├── cert-manager.ts             # Maneja certificados
│   │   │   ├── folio-manager.ts            # Control de folios
│   │   │   └── types.ts                    # Tipos específicos SII
│   │   ├── google-calendar/                # 🆕 Integración Calendar
│   │   │   ├── client.ts                   # Google Calendar API
│   │   │   ├── sync-manager.ts             # Bidirectional sync
│   │   │   └── event-transformer.ts        # Transforma eventos
│   │   ├── whatsapp/                       # 🆕 WhatsApp Business API
│   │   │   ├── client.ts                   # Twilio/Meta API
│   │   │   ├── template-manager.ts         # Templates mensajes
│   │   │   └── scheduler.ts                # Programación envíos
│   │   └── autofill/                       # 🆕 Autocompletado IA
│   │       ├── analyzer.ts                 # Analiza patrones
│   │       ├── predictor.ts                # Predice valores
│   │       └── cache.ts                    # Cache de sugerencias
│   ├── validators/
│   │   ├── boleta-electronica.ts           # 🆕 Validación boleta
│   │   ├── factura-electronica.ts          # 🆕 Validación factura
│   │   ├── nota-credito.ts                 # 🆕 Validación NC
│   │   ├── rut-emisor.ts                   # 🆕 Validación RUT emisor
│   │   └── monto-sii.ts                    # 🆕 Validación montos
│   ├── types/
│   │   └── facturacion/                    # 🆕 Tipos facturación
│   │       ├── dte.ts                      # Tipos DTE
│   │       ├── sii-response.ts             # Respuestas SII
│   │       ├── autofill.ts                 # Tipos autocompletado
│   │       └── agenda.ts                   # Tipos citas
│   └── stores/
│       ├── facturacion-store.ts            # 🆕 Estado facturación
│       ├── agenda-store.ts                 # 🆕 Estado agenda
│       └── autofill-store.ts               # 🆕 Cache autocompletado
├── packages/
│   └── database/
│       ├── migrations/
│       │   ├── 20250101_add_boletas.sql    # 🆕 Schema boletas
│       │   ├── 20250102_add_agenda.sql     # 🆕 Schema agenda
│       │   └── 20250103_add_autofill.sql   # 🆕 Schema autofill
│       └── types/
│           ├── boleta.ts                   # 🆕 Tipos DB boleta
│           └── agenda.ts                   # 🆕 Tipos DB agenda
└── supabase/
    └── functions/
        ├── enviar-recordatorio/            # 🆕 Edge function recordatorios
        └── generar-feedback/               # 🆕 Edge function feedback
```

---

## 🗄️ Database Schema (Extensión)

### Tabla: `boletas_electronicas`

```sql
-- Almacena todas las boletas electrónicas emitidas
CREATE TABLE boletas_electronicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relaciones
  doctor_id UUID NOT NULL REFERENCES doctor_profiles(id),
  patient_rut TEXT NOT NULL, -- RUT del paciente (puede no estar en sistema)
  session_id UUID REFERENCES medical_sessions(id), -- Opcional: vincular con sesión médica

  -- Datos SII
  folio BIGINT NOT NULL, -- Número de folio asignado por SII
  tipo_dte INTEGER NOT NULL DEFAULT 39, -- 39=Boleta Electrónica, 41=Boleta Exenta
  fecha_emision TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  monto_neto DECIMAL(18,2) NOT NULL,
  monto_exento DECIMAL(18,2) DEFAULT 0,
  monto_iva DECIMAL(18,2) NOT NULL,
  monto_total DECIMAL(18,2) NOT NULL,

  -- Detalles facturación
  items JSONB NOT NULL, -- Array de items: [{nombre, cantidad, precio, exento}]
  forma_pago TEXT DEFAULT 'contado', -- contado, credito, debito, transferencia
  medio_pago TEXT, -- efectivo, tarjeta_debito, tarjeta_credito, transferencia

  -- Estado y procesamiento
  estado TEXT NOT NULL DEFAULT 'borrador',
    -- Estados: borrador, generada, firmada, enviada, aceptada, rechazada, anulada
  xml_dte TEXT, -- XML generado (firmado)
  track_id TEXT, -- ID de seguimiento SII
  respuesta_sii JSONB, -- Respuesta completa del SII
  fecha_envio TIMESTAMP WITH TIME ZONE,
  fecha_recepcion_sii TIMESTAMP WITH TIME ZONE,

  -- Anulación
  anulada BOOLEAN DEFAULT FALSE,
  motivo_anulacion TEXT,
  fecha_anulacion TIMESTAMP WITH TIME ZONE,

  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Constraints
  CONSTRAINT monto_total_check CHECK (monto_total = monto_neto + monto_iva + monto_exento),
  CONSTRAINT folio_unico UNIQUE (doctor_id, folio, tipo_dte)
);

-- Índices para performance
CREATE INDEX idx_boletas_doctor_fecha ON boletas_electronicas(doctor_id, fecha_emision DESC);
CREATE INDEX idx_boletas_estado ON boletas_electronicas(estado);
CREATE INDEX idx_boletas_folio ON boletas_electronicas(folio);
CREATE INDEX idx_boletas_patient_rut ON boletas_electronicas(patient_rut);

-- RLS Policy: Doctores solo ven sus boletas
ALTER TABLE boletas_electronicas ENABLE ROW LEVEL SECURITY;

CREATE POLICY boletas_doctor_policy ON boletas_electronicas
  FOR ALL
  USING (doctor_id = auth.uid());
```

### Tabla: `facturas_electronicas`

```sql
-- Similar a boletas pero con campos adicionales para empresas
CREATE TABLE facturas_electronicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relaciones
  doctor_id UUID NOT NULL REFERENCES doctor_profiles(id),
  cliente_rut TEXT NOT NULL, -- RUT empresa cliente
  cliente_razon_social TEXT NOT NULL,
  cliente_giro TEXT NOT NULL,
  cliente_direccion TEXT NOT NULL,
  cliente_comuna TEXT NOT NULL,
  cliente_ciudad TEXT NOT NULL,

  -- Datos SII
  folio BIGINT NOT NULL,
  tipo_dte INTEGER NOT NULL DEFAULT 33, -- 33=Factura Electrónica, 34=Factura Exenta
  fecha_emision TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fecha_vencimiento TIMESTAMP WITH TIME ZONE, -- Para crédito

  -- Montos
  monto_neto DECIMAL(18,2) NOT NULL,
  monto_exento DECIMAL(18,2) DEFAULT 0,
  monto_iva DECIMAL(18,2) NOT NULL,
  descuentos DECIMAL(18,2) DEFAULT 0,
  recargos DECIMAL(18,2) DEFAULT 0,
  monto_total DECIMAL(18,2) NOT NULL,

  -- Detalles
  items JSONB NOT NULL,
  forma_pago TEXT DEFAULT 'credito',
  dias_credito INTEGER DEFAULT 30,

  -- Referencias (opcional)
  orden_compra TEXT,
  nota_venta TEXT,
  guia_despacho TEXT,

  -- Estado
  estado TEXT NOT NULL DEFAULT 'borrador',
  xml_dte TEXT,
  track_id TEXT,
  respuesta_sii JSONB,
  fecha_envio TIMESTAMP WITH TIME ZONE,

  -- Pagos
  pagada BOOLEAN DEFAULT FALSE,
  fecha_pago TIMESTAMP WITH TIME ZONE,

  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  CONSTRAINT folio_unico_factura UNIQUE (doctor_id, folio, tipo_dte)
);

CREATE INDEX idx_facturas_doctor_fecha ON facturas_electronicas(doctor_id, fecha_emision DESC);
CREATE INDEX idx_facturas_cliente ON facturas_electronicas(cliente_rut);

ALTER TABLE facturas_electronicas ENABLE ROW LEVEL SECURITY;
CREATE POLICY facturas_doctor_policy ON facturas_electronicas FOR ALL USING (doctor_id = auth.uid());
```

### Tabla: `notas_credito`

```sql
-- Notas de crédito para anulaciones/devoluciones
CREATE TABLE notas_credito (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctor_profiles(id),

  -- Documento referenciado
  tipo_documento_ref INTEGER NOT NULL, -- 33, 39, etc.
  folio_ref BIGINT NOT NULL,
  fecha_ref TIMESTAMP WITH TIME ZONE NOT NULL,
  razon_ref TEXT NOT NULL, -- 1=Anula doc ref, 2=Corrige monto, 3=Corrige texto

  -- Datos NC
  folio BIGINT NOT NULL,
  tipo_dte INTEGER NOT NULL DEFAULT 61, -- 61=Nota Crédito Electrónica
  fecha_emision TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- Montos
  monto_neto DECIMAL(18,2) NOT NULL,
  monto_iva DECIMAL(18,2) NOT NULL,
  monto_total DECIMAL(18,2) NOT NULL,

  -- Detalles
  items JSONB NOT NULL,

  -- Estado
  estado TEXT NOT NULL DEFAULT 'borrador',
  xml_dte TEXT,
  track_id TEXT,
  respuesta_sii JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  CONSTRAINT folio_unico_nc UNIQUE (doctor_id, folio)
);

ALTER TABLE notas_credito ENABLE ROW LEVEL SECURITY;
CREATE POLICY nc_doctor_policy ON notas_credito FOR ALL USING (doctor_id = auth.uid());
```

### Tabla: `folios_asignados`

```sql
-- Control de folios autorizados por el SII
CREATE TABLE folios_asignados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctor_profiles(id),

  tipo_dte INTEGER NOT NULL, -- 33, 39, 61, etc.
  folio_desde BIGINT NOT NULL,
  folio_hasta BIGINT NOT NULL,
  folio_actual BIGINT NOT NULL, -- Último folio usado

  caf_xml TEXT NOT NULL, -- Archivo CAF completo (Código de Autorización de Folios)
  fecha_autorizacion TIMESTAMP WITH TIME ZONE NOT NULL,
  fecha_vencimiento TIMESTAMP WITH TIME ZONE NOT NULL,

  activo BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  CONSTRAINT folio_rango_check CHECK (folio_actual >= folio_desde AND folio_actual <= folio_hasta)
);

CREATE INDEX idx_folios_doctor_tipo ON folios_asignados(doctor_id, tipo_dte, activo);

ALTER TABLE folios_asignados ENABLE ROW LEVEL SECURITY;
CREATE POLICY folios_doctor_policy ON folios_asignados FOR ALL USING (doctor_id = auth.uid());
```

### Tabla: `certificados_tributarios`

```sql
-- Almacena certificados digitales para firma
CREATE TABLE certificados_tributarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctor_profiles(id),

  -- Datos certificado
  nombre TEXT NOT NULL,
  rut_emisor TEXT NOT NULL, -- RUT del dentista/clínica
  razon_social TEXT NOT NULL,

  -- Archivo encriptado
  pfx_encrypted BYTEA NOT NULL, -- Certificado .pfx encriptado con AES-256-GCM
  password_hint TEXT, -- Pista de contraseña (sin guardar la contraseña real)

  -- Validez
  fecha_emision TIMESTAMP WITH TIME ZONE NOT NULL,
  fecha_vencimiento TIMESTAMP WITH TIME ZONE NOT NULL,
  activo BOOLEAN DEFAULT TRUE,

  -- Auditoría
  ultima_utilizacion TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  CONSTRAINT certificado_unico UNIQUE (doctor_id, rut_emisor)
);

ALTER TABLE certificados_tributarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY cert_doctor_policy ON certificados_tributarios FOR ALL USING (doctor_id = auth.uid());
```

### Tabla: `citas_dentales`

```sql
-- Agenda de citas con integración Google Calendar
CREATE TABLE citas_dentales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctor_profiles(id),

  -- Paciente
  patient_id UUID REFERENCES patients(id), -- Opcional si paciente en sistema
  patient_rut TEXT, -- Obligatorio
  patient_nombre TEXT NOT NULL,
  patient_telefono TEXT NOT NULL,
  patient_email TEXT,

  -- Detalles cita
  fecha_hora_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
  fecha_hora_fin TIMESTAMP WITH TIME ZONE NOT NULL,
  duracion_minutos INTEGER GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (fecha_hora_fin - fecha_hora_inicio)) / 60
  ) STORED,

  tipo_consulta TEXT NOT NULL, -- limpieza, tratamiento_conducto, extraccion, control, urgencia
  notas TEXT,
  sala TEXT, -- Box 1, Box 2, etc.

  -- Estado
  estado TEXT NOT NULL DEFAULT 'pendiente',
    -- pendiente, confirmada, en_progreso, completada, cancelada, no_asistio
  motivo_cancelacion TEXT,

  -- Integración Google Calendar
  google_event_id TEXT UNIQUE, -- ID del evento en Google Calendar
  google_calendar_synced BOOLEAN DEFAULT FALSE,
  google_calendar_last_sync TIMESTAMP WITH TIME ZONE,

  -- Recordatorios
  recordatorio_24h_enviado BOOLEAN DEFAULT FALSE,
  recordatorio_24h_fecha TIMESTAMP WITH TIME ZONE,
  recordatorio_2h_enviado BOOLEAN DEFAULT FALSE,
  recordatorio_2h_fecha TIMESTAMP WITH TIME ZONE,
  confirmacion_paciente BOOLEAN DEFAULT FALSE,
  confirmacion_paciente_fecha TIMESTAMP WITH TIME ZONE,

  -- Facturación (opcional)
  boleta_id UUID REFERENCES boletas_electronicas(id),
  factura_id UUID REFERENCES facturas_electronicas(id),

  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  CONSTRAINT fecha_valida CHECK (fecha_hora_fin > fecha_hora_inicio)
);

-- Índices para performance
CREATE INDEX idx_citas_doctor_fecha ON citas_dentales(doctor_id, fecha_hora_inicio);
CREATE INDEX idx_citas_estado ON citas_dentales(estado);
CREATE INDEX idx_citas_patient ON citas_dentales(patient_rut);
CREATE INDEX idx_citas_google_sync ON citas_dentales(google_calendar_synced) WHERE google_calendar_synced = FALSE;

ALTER TABLE citas_dentales ENABLE ROW LEVEL SECURITY;
CREATE POLICY citas_doctor_policy ON citas_dentales FOR ALL USING (doctor_id = auth.uid());
```

### Tabla: `examenes_dentales`

```sql
-- Registro de exámenes para feedback automatizado
CREATE TABLE examenes_dentales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctor_profiles(id),

  -- Paciente
  patient_id UUID REFERENCES patients(id),
  patient_rut TEXT NOT NULL,
  patient_nombre TEXT NOT NULL,
  patient_email TEXT,
  patient_telefono TEXT,

  -- Examen
  tipo_examen TEXT NOT NULL, -- radiografia_panoramica, radiografia_periapical, tac_dental, etc.
  fecha_examen TIMESTAMP WITH TIME ZONE NOT NULL,
  archivo_url TEXT, -- URL del resultado (imagen/PDF)

  -- Resultados
  diagnostico TEXT,
  hallazgos JSONB, -- Detalles estructurados
  recomendaciones TEXT[],
  urgente BOOLEAN DEFAULT FALSE,

  -- Feedback
  feedback_generado BOOLEAN DEFAULT FALSE,
  feedback_mensaje TEXT, -- Mensaje generado por IA
  feedback_enviado BOOLEAN DEFAULT FALSE,
  feedback_fecha_envio TIMESTAMP WITH TIME ZONE,
  feedback_canal TEXT, -- whatsapp, email, sms

  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_examenes_doctor_fecha ON examenes_dentales(doctor_id, fecha_examen DESC);
CREATE INDEX idx_examenes_feedback_pendiente ON examenes_dentales(feedback_generado, feedback_enviado)
  WHERE feedback_generado = TRUE AND feedback_enviado = FALSE;

ALTER TABLE examenes_dentales ENABLE ROW LEVEL SECURITY;
CREATE POLICY examenes_doctor_policy ON examenes_dentales FOR ALL USING (doctor_id = auth.uid());
```

### Tabla: `autofill_patterns`

```sql
-- Almacena patrones de autocompletado por doctor
CREATE TABLE autofill_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctor_profiles(id),

  -- Patrón
  campo TEXT NOT NULL, -- item_nombre, item_precio, medio_pago, etc.
  valor TEXT NOT NULL,
  frecuencia INTEGER DEFAULT 1, -- Contador de veces usado

  -- Contexto
  contexto JSONB, -- Contexto adicional: {dia_semana: 'lunes', tipo_consulta: 'limpieza'}

  -- Metadata
  ultima_utilizacion TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  CONSTRAINT pattern_unico UNIQUE (doctor_id, campo, valor)
);

CREATE INDEX idx_autofill_doctor_campo ON autofill_patterns(doctor_id, campo, frecuencia DESC);

ALTER TABLE autofill_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY autofill_doctor_policy ON autofill_patterns FOR ALL USING (doctor_id = auth.uid());
```

### Tabla: `logs_sii`

```sql
-- Auditoría completa de interacciones con SII
CREATE TABLE logs_sii (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctor_profiles(id),

  -- Operación
  operacion TEXT NOT NULL, -- generar_dte, firmar_dte, enviar_dte, consultar_estado
  tipo_dte INTEGER NOT NULL,
  folio BIGINT,

  -- Request/Response
  request_payload JSONB,
  response_payload JSONB,
  http_status INTEGER,

  -- Resultado
  exitoso BOOLEAN NOT NULL,
  mensaje_error TEXT,

  -- Timing
  duracion_ms INTEGER,

  -- Auditoría
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_logs_sii_doctor_fecha ON logs_sii(doctor_id, created_at DESC);
CREATE INDEX idx_logs_sii_folio ON logs_sii(folio);

-- No RLS: Solo inserción desde backend, lectura solo admin
```

---

## 🔧 TypeScript Types Completos

### `src/types/facturacion/dte.ts`

```typescript
import { z } from "zod";

// Branded Types para seguridad de tipos
export type Folio = number & { readonly __brand: "Folio" };
export type RUTEmisor = string & { readonly __brand: "RUTEmisor" };
export type TrackID = string & { readonly __brand: "TrackID" };

// Tipos de DTE según SII Chile
export enum TipoDTE {
  FACTURA_ELECTRONICA = 33,
  FACTURA_EXENTA = 34,
  BOLETA_ELECTRONICA = 39,
  BOLETA_EXENTA = 41,
  NOTA_CREDITO = 61,
  NOTA_DEBITO = 56,
  FACTURA_EXPORTACION = 110,
  NOTA_CREDITO_EXPORTACION = 112,
}

// Estados de un DTE
export enum EstadoDTE {
  BORRADOR = "borrador",
  GENERADA = "generada",
  FIRMADA = "firmada",
  ENVIADA = "enviada",
  ACEPTADA = "aceptada",
  RECHAZADA = "rechazada",
  REPARO = "reparo",
  ANULADA = "anulada",
}

// Item de una boleta/factura
export interface ItemDTE {
  numeroLinea: number;
  codigoItem?: string;
  nombre: string;
  descripcion?: string;
  cantidad: number;
  unidadMedida: string; // 'UN', 'HRS', 'KG', etc.
  precioUnitario: number;
  montoItem: number;
  descuentoPorcentaje?: number;
  descuentoMonto?: number;
  recargoPorcentaje?: number;
  recargoMonto?: number;
  indicadorExencion?: boolean;
}

// Schema Zod para validación runtime
export const ItemDTESchema = z
  .object({
    numeroLinea: z.number().int().positive(),
    codigoItem: z.string().optional(),
    nombre: z.string().min(1).max(80),
    descripcion: z.string().max(1000).optional(),
    cantidad: z.number().positive(),
    unidadMedida: z.string().max(4),
    precioUnitario: z.number().nonnegative(),
    montoItem: z.number().nonnegative(),
    descuentoPorcentaje: z.number().min(0).max(100).optional(),
    descuentoMonto: z.number().nonnegative().optional(),
    recargoPorcentaje: z.number().min(0).max(100).optional(),
    recargoMonto: z.number().nonnegative().optional(),
    indicadorExencion: z.boolean().optional(),
  })
  .refine(
    (item) => {
      const montoCalculado =
        item.cantidad * item.precioUnitario -
        (item.descuentoMonto ?? 0) +
        (item.recargoMonto ?? 0);
      return Math.abs(montoCalculado - item.montoItem) < 0.01; // Tolerancia para decimales
    },
    { message: "El monto del item no coincide con cantidad * precio" }
  );

// Totales de un DTE
export interface TotalesDTE {
  montoNeto: number;
  montoExento: number;
  montoIVA: number;
  montoTotal: number;
  tasaIVA: number; // Generalmente 19% en Chile
}

export const TotalesDTESchema = z
  .object({
    montoNeto: z.number().nonnegative(),
    montoExento: z.number().nonnegative(),
    montoIVA: z.number().nonnegative(),
    montoTotal: z.number().nonnegative(),
    tasaIVA: z.number().positive(),
  })
  .refine(
    (totales) => {
      const ivaCalculado = Math.round(
        totales.montoNeto * (totales.tasaIVA / 100)
      );
      const totalCalculado =
        totales.montoNeto + totales.montoIVA + totales.montoExento;
      return (
        Math.abs(ivaCalculado - totales.montoIVA) <= 1 && // Tolerancia redondeo
        Math.abs(totalCalculado - totales.montoTotal) < 0.01
      );
    },
    { message: "Los totales no cuadran matemáticamente" }
  );

// Boleta Electrónica completa
export interface BoletaElectronica {
  id: string;
  doctorId: string;

  // Datos receptor (paciente)
  receptorRUT: string;
  receptorNombre?: string;

  // Datos DTE
  tipoDTE: TipoDTE.BOLETA_ELECTRONICA | TipoDTE.BOLETA_EXENTA;
  folio: Folio;
  fechaEmision: Date;

  // Items y totales
  items: ItemDTE[];
  totales: TotalesDTE;

  // Pago
  formaPago: "contado" | "credito";
  medioPago?:
    | "efectivo"
    | "tarjeta_debito"
    | "tarjeta_credito"
    | "transferencia"
    | "cheque";

  // Estado y procesamiento
  estado: EstadoDTE;
  xmlDTE?: string;
  trackID?: TrackID;
  respuestaSII?: RespuestaSII;
  fechaEnvio?: Date;

  // Anulación
  anulada: boolean;
  motivoAnulacion?: string;
  fechaAnulacion?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Factura Electrónica (B2B)
export interface FacturaElectronica
  extends Omit<
    BoletaElectronica,
    "tipoDTE" | "receptorRUT" | "receptorNombre"
  > {
  tipoDTE: TipoDTE.FACTURA_ELECTRONICA | TipoDTE.FACTURA_EXENTA;

  // Datos empresa receptora
  clienteRUT: RUTEmisor;
  clienteRazonSocial: string;
  clienteGiro: string;
  clienteDireccion: string;
  clienteComuna: string;
  clienteCiudad: string;
  clienteContacto?: string;

  // Crédito
  diasCredito?: number;
  fechaVencimiento?: Date;

  // Referencias comerciales
  ordenCompra?: string;
  notaVenta?: string;
  guiaDespacho?: string;

  // Estado de pago
  pagada: boolean;
  fechaPago?: Date;
  montoPagado?: number;
}

// Nota de Crédito
export interface NotaCredito {
  id: string;
  doctorId: string;

  // Documento referenciado
  tipoDocumentoRef: TipoDTE;
  folioRef: Folio;
  fechaRef: Date;
  razonRef: RazonNotaCredito;
  descripcionRef?: string;

  // Datos NC
  tipoDTE: TipoDTE.NOTA_CREDITO;
  folio: Folio;
  fechaEmision: Date;

  // Items y totales
  items: ItemDTE[];
  totales: TotalesDTE;

  // Estado
  estado: EstadoDTE;
  xmlDTE?: string;
  trackID?: TrackID;
  respuestaSII?: RespuestaSII;

  createdAt: Date;
  updatedAt: Date;
}

export enum RazonNotaCredito {
  ANULA_DOCUMENTO = 1,
  CORRIGE_MONTO = 2,
  CORRIGE_TEXTO = 3,
  DESCUENTO = 4,
}

// Respuesta del SII
export interface RespuestaSII {
  trackID: TrackID;
  estado: "ACEPTADO" | "RECHAZADO" | "REPARO" | "PENDIENTE";
  glosa: string;
  codigoError?: string;
  detalleError?: string;
  fechaRespuesta: Date;
}

// Certificado Tributario
export interface CertificadoTributario {
  id: string;
  doctorId: string;
  nombre: string;
  rutEmisor: RUTEmisor;
  razonSocial: string;

  // Archivo encriptado
  pfxEncrypted: Buffer;
  passwordHint?: string;

  // Validez
  fechaEmision: Date;
  fechaVencimiento: Date;
  activo: boolean;

  // Auditoría
  ultimaUtilizacion?: Date;
  createdAt: Date;
}

// CAF (Código de Autorización de Folios)
export interface FoliosAsignados {
  id: string;
  doctorId: string;
  tipoDTE: TipoDTE;
  folioDesde: Folio;
  folioHasta: Folio;
  folioActual: Folio;
  cafXML: string; // XML del CAF completo
  fechaAutorizacion: Date;
  fechaVencimiento: Date;
  activo: boolean;
  createdAt: Date;
}

// Request para generar DTE
export interface GenerarDTERequest {
  tipoDTE: TipoDTE;
  receptorRUT: string;
  receptorNombre?: string;
  items: ItemDTE[];
  formaPago: "contado" | "credito";
  medioPago?: string;
  observaciones?: string;
}

// Response de generación DTE
export interface GenerarDTEResponse {
  success: boolean;
  dte?: BoletaElectronica | FacturaElectronica;
  folio?: Folio;
  xmlDTE?: string;
  error?: string;
}
```

### `src/types/facturacion/agenda.ts`

```typescript
export enum TipoConsulta {
  LIMPIEZA = "limpieza",
  TRATAMIENTO_CONDUCTO = "tratamiento_conducto",
  EXTRACCION = "extraccion",
  CONTROL = "control",
  URGENCIA = "urgencia",
  ORTODONCIA = "ortodoncia",
  IMPLANTE = "implante",
  BLANQUEAMIENTO = "blanqueamiento",
  PROTESIS = "protesis",
}

export enum EstadoCita {
  PENDIENTE = "pendiente",
  CONFIRMADA = "confirmada",
  EN_PROGRESO = "en_progreso",
  COMPLETADA = "completada",
  CANCELADA = "cancelada",
  NO_ASISTIO = "no_asistio",
}

export interface CitaDental {
  id: string;
  doctorId: string;

  // Paciente
  patientId?: string;
  patientRUT: string;
  patientNombre: string;
  patientTelefono: string;
  patientEmail?: string;

  // Detalles
  fechaHoraInicio: Date;
  fechaHoraFin: Date;
  duracionMinutos: number;
  tipoConsulta: TipoConsulta;
  notas?: string;
  sala?: string;

  // Estado
  estado: EstadoCita;
  motivoCancelacion?: string;

  // Google Calendar
  googleEventId?: string;
  googleCalendarSynced: boolean;
  googleCalendarLastSync?: Date;

  // Recordatorios
  recordatorio24hEnviado: boolean;
  recordatorio24hFecha?: Date;
  recordatorio2hEnviado: boolean;
  recordatorio2hFecha?: Date;
  confirmacionPaciente: boolean;
  confirmacionPacienteFecha?: Date;

  // Facturación
  boletaId?: string;
  facturaId?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface ConfiguracionRecordatorios {
  doctorId: string;
  recordatorio24hActivo: boolean;
  recordatorio2hActivo: boolean;
  recordatorioPersonalizado: boolean;
  mensajePersonalizado?: string;
  canalPreferido: "whatsapp" | "email" | "sms";
}
```

---

## 🔌 API Routes Detallados

### `src/app/api/sii/generar-dte/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generarXMLDTE } from "@/services/sii/xml-builder";
import { obtenerSiguienteFolio } from "@/services/sii/folio-manager";
import { validarDTEPreEnvio } from "@/services/sii/validator";
import { ItemDTESchema } from "@/types/facturacion/dte";

// Schema de validación del request
const GenerarDTESchema = z.object({
  tipoDTE: z.number().int().positive(),
  receptorRUT: z.string().regex(/^\d{7,8}-[\dkK]$/),
  receptorNombre: z.string().min(1).max(100).optional(),
  items: z.array(ItemDTESchema).min(1).max(60), // SII permite máx 60 items
  formaPago: z.enum(["contado", "credito"]),
  medioPago: z
    .enum([
      "efectivo",
      "tarjeta_debito",
      "tarjeta_credito",
      "transferencia",
      "cheque",
    ])
    .optional(),
  observaciones: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Autenticación
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // 2. Validar request body
    const body = await request.json();
    const validatedData = GenerarDTESchema.parse(body);

    // 3. Obtener siguiente folio disponible
    const folio = await obtenerSiguienteFolio(user.id, validatedData.tipoDTE);
    if (!folio) {
      return NextResponse.json(
        { error: "No hay folios disponibles para este tipo de DTE" },
        { status: 400 }
      );
    }

    // 4. Calcular totales
    const montoNeto = validatedData.items
      .filter((item) => !item.indicadorExencion)
      .reduce((sum, item) => sum + item.montoItem, 0);

    const montoExento = validatedData.items
      .filter((item) => item.indicadorExencion)
      .reduce((sum, item) => sum + item.montoItem, 0);

    const montoIVA = Math.round(montoNeto * 0.19); // 19% IVA Chile
    const montoTotal = montoNeto + montoIVA + montoExento;

    // 5. Generar XML DTE
    const xmlDTE = await generarXMLDTE({
      tipoDTE: validatedData.tipoDTE,
      folio,
      fechaEmision: new Date(),
      emisor: {
        rut: "76.XXX.XXX-X", // TODO: Obtener de perfil doctor
        razonSocial: "Clínica Dental", // TODO: Obtener de perfil
        giro: "Servicios Dentales",
        direccion: "Av. Providencia 123",
        comuna: "Providencia",
        ciudad: "Santiago",
      },
      receptor: {
        rut: validatedData.receptorRUT,
        nombre: validatedData.receptorNombre || "Público General",
      },
      items: validatedData.items,
      totales: {
        montoNeto,
        montoExento,
        montoIVA,
        montoTotal,
        tasaIVA: 19,
      },
      formaPago: validatedData.formaPago,
      medioPago: validatedData.medioPago,
      observaciones: validatedData.observaciones,
    });

    // 6. Validar XML generado
    const validacion = await validarDTEPreEnvio(xmlDTE);
    if (!validacion.esValido) {
      return NextResponse.json(
        {
          error: "El DTE generado no es válido",
          errores: validacion.errores,
        },
        { status: 400 }
      );
    }

    // 7. Guardar en base de datos
    const { data: boleta, error: dbError } = await supabase
      .from("boletas_electronicas")
      .insert({
        doctor_id: user.id,
        patient_rut: validatedData.receptorRUT,
        folio,
        tipo_dte: validatedData.tipoDTE,
        fecha_emision: new Date().toISOString(),
        monto_neto: montoNeto,
        monto_exento: montoExento,
        monto_iva: montoIVA,
        monto_total: montoTotal,
        items: validatedData.items,
        forma_pago: validatedData.formaPago,
        medio_pago: validatedData.medioPago,
        estado: "generada",
        xml_dte: xmlDTE,
      })
      .select()
      .single();

    if (dbError) {
      throw dbError;
    }

    // 8. Registrar en autofill patterns
    await registrarPatternsAutofill(user.id, validatedData.items);

    // 9. Log de auditoría
    await supabase.from("logs_sii").insert({
      doctor_id: user.id,
      operacion: "generar_dte",
      tipo_dte: validatedData.tipoDTE,
      folio,
      exitoso: true,
      request_payload: validatedData,
      duracion_ms: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      dte: boleta,
      folio,
      xmlDTE,
    });
  } catch (error) {
    console.error("Error generando DTE:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", detalles: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// Helper para registrar patterns de autofill
async function registrarPatternsAutofill(doctorId: string, items: ItemDTE[]) {
  const supabase = createClient();

  for (const item of items) {
    // Registrar nombre de item
    await supabase
      .from("autofill_patterns")
      .upsert(
        {
          doctor_id: doctorId,
          campo: "item_nombre",
          valor: item.nombre,
        },
        {
          onConflict: "doctor_id,campo,valor",
          ignoreDuplicates: false,
        }
      )
      .then(() => {
        // Incrementar frecuencia
        return supabase.rpc("increment_autofill_frequency", {
          p_doctor_id: doctorId,
          p_campo: "item_nombre",
          p_valor: item.nombre,
        });
      });

    // Registrar precio
    await supabase.from("autofill_patterns").upsert(
      {
        doctor_id: doctorId,
        campo: "item_precio",
        valor: item.precioUnitario.toString(),
        contexto: { item_nombre: item.nombre },
      },
      {
        onConflict: "doctor_id,campo,valor",
      }
    );
  }
}
```

### `src/app/api/sii/firmar-dte/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { firmarXMLDTE } from "@/services/sii/xml-signer";
import { obtenerCertificadoActivo } from "@/services/sii/cert-manager";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { boletaId, password } = await request.json();

    // 1. Obtener boleta
    const { data: boleta, error: boletaError } = await supabase
      .from("boletas_electronicas")
      .select("*")
      .eq("id", boletaId)
      .eq("doctor_id", user.id)
      .single();

    if (boletaError || !boleta) {
      return NextResponse.json(
        { error: "Boleta no encontrada" },
        { status: 404 }
      );
    }

    if (!boleta.xml_dte) {
      return NextResponse.json(
        { error: "No hay XML generado" },
        { status: 400 }
      );
    }

    // 2. Obtener certificado activo
    const certificado = await obtenerCertificadoActivo(user.id);
    if (!certificado) {
      return NextResponse.json(
        { error: "No hay certificado tributario configurado" },
        { status: 400 }
      );
    }

    // 3. Firmar XML
    const xmlFirmado = await firmarXMLDTE({
      xmlSinFirma: boleta.xml_dte,
      certificadoPfx: certificado.pfxEncrypted,
      password,
    });

    // 4. Actualizar boleta
    const { error: updateError } = await supabase
      .from("boletas_electronicas")
      .update({
        xml_dte: xmlFirmado,
        estado: "firmada",
        updated_at: new Date().toISOString(),
      })
      .eq("id", boletaId);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      mensaje: "DTE firmado exitosamente",
    });
  } catch (error) {
    console.error("Error firmando DTE:", error);
    return NextResponse.json({ error: "Error al firmar DTE" }, { status: 500 });
  }
}
```

### `src/app/api/sii/enviar-dte/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enviarDTEaSII } from "@/services/sii/client";

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { boletaId } = await request.json();

    // 1. Obtener boleta firmada
    const { data: boleta } = await supabase
      .from("boletas_electronicas")
      .select("*")
      .eq("id", boletaId)
      .eq("doctor_id", user.id)
      .single();

    if (!boleta || boleta.estado !== "firmada") {
      return NextResponse.json(
        { error: "Boleta debe estar firmada antes de enviar" },
        { status: 400 }
      );
    }

    // 2. Enviar a SII con circuit breaker
    const respuestaSII = await enviarDTEaSII({
      xmlFirmado: boleta.xml_dte,
      tipoDTE: boleta.tipo_dte,
      folio: boleta.folio,
      rutEmisor: "76.XXX.XXX-X", // TODO: Desde perfil
      rutReceptor: boleta.patient_rut,
    });

    // 3. Actualizar boleta con respuesta
    await supabase
      .from("boletas_electronicas")
      .update({
        estado: respuestaSII.estado === "ACEPTADO" ? "aceptada" : "rechazada",
        track_id: respuestaSII.trackID,
        respuesta_sii: respuestaSII,
        fecha_envio: new Date().toISOString(),
        fecha_recepcion_sii: respuestaSII.fechaRespuesta.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", boletaId);

    // 4. Log de auditoría
    await supabase.from("logs_sii").insert({
      doctor_id: user.id,
      operacion: "enviar_dte",
      tipo_dte: boleta.tipo_dte,
      folio: boleta.folio,
      exitoso: respuestaSII.estado === "ACEPTADO",
      response_payload: respuestaSII,
      http_status: 200,
      duracion_ms: Date.now() - startTime,
    });

    return NextResponse.json({
      success: respuestaSII.estado === "ACEPTADO",
      respuestaSII,
      trackID: respuestaSII.trackID,
    });
  } catch (error) {
    console.error("Error enviando DTE al SII:", error);

    // Log error
    const supabase = createClient();
    await supabase.from("logs_sii").insert({
      doctor_id: user?.id,
      operacion: "enviar_dte",
      exitoso: false,
      mensaje_error: error.message,
      duracion_ms: Date.now() - startTime,
    });

    return NextResponse.json(
      { error: "Error al enviar DTE al SII" },
      { status: 500 }
    );
  }
}
```

---

## 🚀 Servicios Core

### `src/services/sii/xml-builder.ts`

```typescript
import { create } from "xmlbuilder2";
import { format } from "date-fns";
import type { ItemDTE, TotalesDTE, TipoDTE } from "@/types/facturacion/dte";

interface GenerarXMLParams {
  tipoDTE: TipoDTE;
  folio: number;
  fechaEmision: Date;
  emisor: {
    rut: string;
    razonSocial: string;
    giro: string;
    direccion: string;
    comuna: string;
    ciudad: string;
  };
  receptor: {
    rut: string;
    nombre: string;
  };
  items: ItemDTE[];
  totales: TotalesDTE;
  formaPago: "contado" | "credito";
  medioPago?: string;
  observaciones?: string;
}

export async function generarXMLDTE(params: GenerarXMLParams): Promise<string> {
  const {
    tipoDTE,
    folio,
    fechaEmision,
    emisor,
    receptor,
    items,
    totales,
    formaPago,
  } = params;

  // Construir XML según schema DTE del SII
  const doc = create({ version: "1.0", encoding: "ISO-8859-1" })
    .ele("DTE", { version: "1.0" })
    .ele("Documento", { ID: `DTE-${tipoDTE}-${folio}` })
    // Encabezado
    .ele("Encabezado")
    .ele("IdDoc")
    .ele("TipoDTE")
    .txt(tipoDTE.toString())
    .up()
    .ele("Folio")
    .txt(folio.toString())
    .up()
    .ele("FchEmis")
    .txt(format(fechaEmision, "yyyy-MM-dd"))
    .up()
    .ele("FmaPago")
    .txt(formaPago === "contado" ? "1" : "2")
    .up()
    .up()

    // Emisor
    .ele("Emisor")
    .ele("RUTEmisor")
    .txt(emisor.rut)
    .up()
    .ele("RznSoc")
    .txt(emisor.razonSocial)
    .up()
    .ele("GiroEmis")
    .txt(emisor.giro)
    .up()
    .ele("DirOrigen")
    .txt(emisor.direccion)
    .up()
    .ele("CmnaOrigen")
    .txt(emisor.comuna)
    .up()
    .ele("CiudadOrigen")
    .txt(emisor.ciudad)
    .up()
    .up()

    // Receptor
    .ele("Receptor")
    .ele("RUTRecep")
    .txt(receptor.rut)
    .up()
    .ele("RznSocRecep")
    .txt(receptor.nombre)
    .up()
    .up()

    // Totales
    .ele("Totales")
    .ele("MntNeto")
    .txt(totales.montoNeto.toString())
    .up()
    .ele("MntExe")
    .txt(totales.montoExento.toString())
    .up()
    .ele("TasaIVA")
    .txt(totales.tasaIVA.toString())
    .up()
    .ele("IVA")
    .txt(totales.montoIVA.toString())
    .up()
    .ele("MntTotal")
    .txt(totales.montoTotal.toString())
    .up()
    .up()
    .up();

  // Detalle de items
  const detalle = doc.ele("Detalle");
  items.forEach((item, index) => {
    detalle
      .ele("Item")
      .ele("NroLinDet")
      .txt((index + 1).toString())
      .up()
      .ele("NmbItem")
      .txt(item.nombre)
      .up()
      .ele("QtyItem")
      .txt(item.cantidad.toString())
      .up()
      .ele("UnmdItem")
      .txt(item.unidadMedida)
      .up()
      .ele("PrcItem")
      .txt(item.precioUnitario.toString())
      .up()
      .ele("MontoItem")
      .txt(item.montoItem.toString())
      .up()
      .up();
  });

  return doc.end({ prettyPrint: true });
}
```

### `src/services/sii/xml-signer.ts`

```typescript
import forge from "node-forge";
import { SignedXml } from "xml-crypto";

interface FirmarXMLParams {
  xmlSinFirma: string;
  certificadoPfx: Buffer; // Certificado .pfx encriptado
  password: string;
}

export async function firmarXMLDTE(params: FirmarXMLParams): Promise<string> {
  const { xmlSinFirma, certificadoPfx, password } = params;

  try {
    // 1. Desencriptar certificado PFX
    const pfxData = forge.util.decode64(certificadoPfx.toString("base64"));
    const pkcs12 = forge.pkcs12.pkcs12FromAsn1(
      forge.asn1.fromDer(pfxData),
      password
    );

    // 2. Extraer clave privada y certificado
    const bags = pkcs12.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = bags[forge.pki.oids.certBag]?.[0];
    if (!certBag) throw new Error("No se encontró certificado en PFX");

    const cert = certBag.cert;
    const keyBags = pkcs12.getBags({
      bagType: forge.pki.oids.pkcs8ShroudedKeyBag,
    });
    const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
    if (!keyBag) throw new Error("No se encontró clave privada en PFX");

    const privateKey = keyBag.key;

    // 3. Convertir a formato PEM
    const privateKeyPem = forge.pki.privateKeyToPem(privateKey);
    const certPem = forge.pki.certificateToPem(cert);

    // 4. Firmar XML con XMLDSig
    const sig = new SignedXml({
      privateKey: privateKeyPem,
      publicCert: certPem,
      signatureAlgorithm: "http://www.w3.org/2000/09/xmldsig#rsa-sha1",
      canonicalizationAlgorithm:
        "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
    });

    sig.addReference({
      xpath: "//*[local-name(.)='Documento']",
      digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1",
      transforms: ["http://www.w3.org/2000/09/xmldsig#enveloped-signature"],
    });

    sig.computeSignature(xmlSinFirma, {
      location: { reference: "//*[local-name(.)='DTE']", action: "append" },
    });

    return sig.getSignedXml();
  } catch (error) {
    console.error("Error firmando XML:", error);
    throw new Error(`Error al firmar XML: ${error.message}`);
  }
}
```

### `src/services/sii/client.ts`

```typescript
import axios, { AxiosInstance } from "axios";
import { CircuitBreaker } from "opossum";
import type { RespuestaSII, TrackID } from "@/types/facturacion/dte";

// Configuración del SII
const SII_CONFIG = {
  BASE_URL:
    process.env.NODE_ENV === "production"
      ? "https://palena.sii.cl" // Producción
      : "https://maullin.sii.cl/cgi_dte", // Certificación
  TIMEOUT: 30000, // 30 segundos
  MAX_RETRIES: 3,
};

class SIIClient {
  private client: AxiosInstance;
  private circuitBreaker: CircuitBreaker;

  constructor() {
    // Cliente HTTP con retry
    this.client = axios.create({
      baseURL: SII_CONFIG.BASE_URL,
      timeout: SII_CONFIG.TIMEOUT,
      headers: {
        "Content-Type": "text/xml; charset=ISO-8859-1",
        "User-Agent": "TheCareBot/1.0",
      },
    });

    // Circuit Breaker para resiliencia
    this.circuitBreaker = new CircuitBreaker(this.enviarDTEInterno.bind(this), {
      timeout: SII_CONFIG.TIMEOUT,
      errorThresholdPercentage: 50,
      resetTimeout: 30000, // 30s para resetear
      rollingCountTimeout: 10000,
      rollingCountBuckets: 10,
      name: "sii-circuit-breaker",
    });

    // Eventos del circuit breaker
    this.circuitBreaker.on("open", () => {
      console.error("⚠️ Circuit Breaker ABIERTO - SII no disponible");
    });

    this.circuitBreaker.on("halfOpen", () => {
      console.warn("Circuit Breaker en modo HALF-OPEN - Probando SII");
    });

    this.circuitBreaker.on("close", () => {
      console.info("✅ Circuit Breaker CERRADO - SII operativo");
    });
  }

  private async enviarDTEInterno(params: {
    xmlFirmado: string;
    tipoDTE: number;
    folio: number;
    rutEmisor: string;
    rutReceptor: string;
  }): Promise<RespuestaSII> {
    const { xmlFirmado, tipoDTE, folio, rutEmisor, rutReceptor } = params;

    // Construir envelope SOAP para SII
    const soapEnvelope = `<?xml version="1.0" encoding="ISO-8859-1"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <EnvioDTE xmlns="http://www.sii.cl/SiiDte">
      <SetDTE>
        <Caratula>
          <RutEmisor>${rutEmisor}</RutEmisor>
          <RutReceptor>${rutReceptor}</RutReceptor>
          <TipoDTE>${tipoDTE}</TipoDTE>
          <Folio>${folio}</Folio>
        </Caratula>
        ${xmlFirmado}
      </SetDTE>
    </EnvioDTE>
  </soap:Body>
</soap:Envelope>`;

    // Enviar a SII
    const response = await this.client.post(
      "/cgi_dte/UPL/DTEUpload",
      soapEnvelope
    );

    // Parsear respuesta
    const trackID = this.extractTrackID(response.data);
    const estado = this.extractEstado(response.data);
    const glosa = this.extractGlosa(response.data);

    return {
      trackID: trackID as TrackID,
      estado,
      glosa,
      fechaRespuesta: new Date(),
    };
  }

  public async enviarDTE(params: {
    xmlFirmado: string;
    tipoDTE: number;
    folio: number;
    rutEmisor: string;
    rutReceptor: string;
  }): Promise<RespuestaSII> {
    try {
      // Usar circuit breaker para resiliencia
      return await this.circuitBreaker.fire(params);
    } catch (error) {
      // Si circuit breaker está abierto, lanzar error específico
      if (error.message.includes("Circuit breaker is open")) {
        throw new Error("Servicio SII no disponible temporalmente");
      }
      throw error;
    }
  }

  public async consultarEstadoDTE(trackID: TrackID): Promise<RespuestaSII> {
    const response = await this.client.get(
      `/cgi_dte/UPL/DTECerrado?trackid=${trackID}`
    );

    return {
      trackID,
      estado: this.extractEstado(response.data),
      glosa: this.extractGlosa(response.data),
      fechaRespuesta: new Date(),
    };
  }

  // Helpers para parsear XML del SII
  private extractTrackID(xml: string): string {
    const match = xml.match(/<TRACKID>(\d+)<\/TRACKID>/);
    return match?.[1] || "";
  }

  private extractEstado(
    xml: string
  ): "ACEPTADO" | "RECHAZADO" | "REPARO" | "PENDIENTE" {
    if (xml.includes("<ESTADO>ACEPTADO</ESTADO>")) return "ACEPTADO";
    if (xml.includes("<ESTADO>RECHAZADO</ESTADO>")) return "RECHAZADO";
    if (xml.includes("<ESTADO>REPARO</ESTADO>")) return "REPARO";
    return "PENDIENTE";
  }

  private extractGlosa(xml: string): string {
    const match = xml.match(/<GLOSA>(.*?)<\/GLOSA>/);
    return match?.[1] || "Sin descripción";
  }
}

// Singleton
export const siiClient = new SIIClient();

// Export función principal
export async function enviarDTEaSII(params: {
  xmlFirmado: string;
  tipoDTE: number;
  folio: number;
  rutEmisor: string;
  rutReceptor: string;
}): Promise<RespuestaSII> {
  return siiClient.enviarDTE(params);
}
```

---

## ⚙️ Configuración y Deployment

### Variables de Entorno Necesarias

```bash
# .env.local

# Supabase (ya existentes)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# SII Chile 🆕
SII_AMBIENTE=certificacion # o 'produccion'
SII_RUT_EMPRESA=76123456-7
SII_RAZON_SOCIAL=Clínica Dental SA
SII_CERT_PASSWORD=tu_password_certificado

# Google Calendar API 🆕
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# WhatsApp Business (Twilio) 🆕
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_WHATSAPP_NUMBER=+14155238886

# Meta WhatsApp Business API (alternativa)
META_WHATSAPP_TOKEN=EAAx...
META_WHATSAPP_PHONE_ID=123456789

# Encriptación 🆕
CERT_ENCRYPTION_KEY=tu_clave_aes_256_bits_32_chars
```

### Comandos de Deployment

```bash
# 1. Aplicar migraciones de BD
npm run supabase:migrate

# 2. Verificar tipos TypeScript
npm run typecheck

# 3. Build producción
npm run build

# 4. Deploy a Vercel
vercel --prod

# 5. Verificar health SII
curl https://tu-app.vercel.app/api/sii/health
```

---

## 📝 Tareas Pendientes y Roadmap

### Fase 1: Core Facturación (Semanas 1-2)

- [ ] Implementar generación XML DTE
- [ ] Implementar firma digital
- [ ] Integración básica SII (envío)
- [ ] UI formulario boleta
- [ ] Tabla listado boletas

### Fase 2: Autocompletado (Semana 3)

- [ ] Analizar patrones históricos
- [ ] Implementar predictor IA
- [ ] UI autocompletado en formulario
- [ ] Cache de sugerencias

### Fase 3: Agenda (Semanas 4-5)

- [ ] Integración Google Calendar API
- [ ] CRUD citas
- [ ] Sync bidireccional
- [ ] UI calendario visual

### Fase 4: Notificaciones (Semana 6)

- [ ] Integración WhatsApp Business
- [ ] Templates mensajes
- [ ] Scheduler recordatorios
- [ ] Confirmaciones automáticas

### Fase 5: Feedback (Semana 7)

- [ ] Procesamiento exámenes
- [ ] Generación mensajes con IA
- [ ] Envío automatizado
- [ ] Tracking respuestas

### Fase 6: Reportes y Compliance (Semana 8)

- [ ] Libro de ventas SII
- [ ] Reportes tributarios1
- [ ] Dashboard métricas
- [ ] Auditoría compliance

---

## 🔐 Consideraciones de Seguridad Específicas

### Certificados Tributarios

```typescript
// Los certificados NUNCA se guardan en texto plano
// Siempre encriptados con AES-256-GCM
import { encryptCertificate, decryptCertificate } from "@/security/encryption";

async function guardarCertificado(pfxBuffer: Buffer, password: string) {
  const encrypted = await encryptCertificate(pfxBuffer, CERT_ENCRYPTION_KEY);

  await supabase.from("certificados_tributarios").insert({
    pfx_encrypted: encrypted,
    password_hint: "Las últimas 4 letras de tu apellido", // NO guardar password
  });
}
```

### Validación RUT Emisor

```typescript
// Validar que el RUT del emisor coincida con el certificado
import { validarRUTCertificado } from "@/validators/rut-emisor";

const esValido = await validarRUTCertificado({
  certificado: pfxBuffer,
  rutEsperado: "76.123.456-7",
});

if (!esValido) {
  throw new Error("El certificado no corresponde al RUT del emisor");
}
```

---

## 🎯 Métricas de Éxito

```typescript
// Observability metrics específicas
export const FACTURACION_METRICS = {
  // Performance
  "facturacion.generar_dte.duration": "histogram", // < 2s objetivo
  "facturacion.firmar_dte.duration": "histogram", // < 1s objetivo
  "facturacion.enviar_sii.duration": "histogram", // < 30s objetivo

  // Business
  "facturacion.boletas_generadas.count": "counter",
  "facturacion.boletas_aceptadas_sii.count": "counter",
  "facturacion.boletas_rechazadas_sii.count": "counter",
  "facturacion.monto_total_facturado.gauge": "gauge",

  // Reliability
  "facturacion.sii_errors.count": "counter",
  "facturacion.circuit_breaker_open.count": "counter",
  "facturacion.autofill_hit_rate.gauge": "gauge",

  // Agenda
  "agenda.citas_agendadas.count": "counter",
  "agenda.recordatorios_enviados.count": "counter",
  "agenda.confirmaciones_recibidas.count": "counter",
  "agenda.no_asistencias.count": "counter",
};
```

---

## 🚨 Manejo de Errores SII

```typescript
// Error handling específico para códigos de error SII
export enum ErrorSII {
  FOLIO_INVALIDO = "E001",
  CERTIFICADO_VENCIDO = "E002",
  RUT_INVALIDO = "E003",
  MONTO_NEGATIVO = "E004",
  XML_MAL_FORMADO = "E005",
  FIRMA_INVALIDA = "E006",
}

export function handleErrorSII(error: any): string {
  if (error.code === ErrorSII.FOLIO_INVALIDO) {
    return "El folio utilizado no es válido o ya fue usado";
  }
  if (error.code === ErrorSII.CERTIFICADO_VENCIDO) {
    return "Su certificado tributario ha vencido. Por favor, renuévelo";
  }
  // ... más casos
  return "Error desconocido del SII";
}
```

---

## 📚 Referencias

- [Documentación SII Chile](https://www.sii.cl/factura_electronica/)
- [Schema XML DTE](https://www.sii.cl/factura_electronica/formato_dte.pdf)
- [API Google Calendar](https://developers.google.com/calendar/api)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)
- [Ley 19.628 Chile (Protección Datos)](https://www.bcn.cl/leychile/navegar?idNorma=141599)

---

**IMPORTANTE**: Este documento debe mantenerse sincronizado con `CLAUDE.md`. Cualquier cambio en la arquitectura base debe reflejarse en ambos archivos.
