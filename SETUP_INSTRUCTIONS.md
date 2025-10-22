# 🚀 TheCareBot SII Electronic Invoicing - Setup Instructions

Sistema completo de facturación electrónica chilena con **LangGraph** + **LangChain** + **Claude AI**.

## 📋 Resumen del Sistema

- **Backend Python**: LangGraph workflows con Claude AI para autocompletado inteligente
- **Frontend Next.js**: Interfaz con autocompletado en tiempo real
- **Base de Datos**: Supabase con 9 tablas para SII compliance
- **AI**: LangChain agent con Claude 3.5 Sonnet para predicciones

---

## 🗄️ Paso 1: Configurar Base de Datos Supabase

### 1.1 Ejecutar Migraciones

```bash
cd supabase

# Migración 1: Crear tablas
psql $DATABASE_URL -f migrations/20250122000001_sii_core_tables.sql

# Migración 2: Políticas RLS
psql $DATABASE_URL -f migrations/20250122000002_sii_rls_policies.sql

# Migración 3: Funciones PostgreSQL
psql $DATABASE_URL -f migrations/20250122000003_sii_functions.sql
```

### 1.2 Verificar Tablas Creadas

Deberías tener estas 9 tablas:

1. ✅ `boletas_electronicas` - Boletas (Tipo DTE 39)
2. ✅ `facturas_electronicas` - Facturas (Tipo DTE 33)
3. ✅ `notas_credito` - Notas de crédito (Tipo DTE 61)
4. ✅ `folios_asignados` - Gestión de folios con CAF
5. ✅ `certificados_tributarios` - Certificados digitales
6. ✅ `citas_dentales` - Citas con Google Calendar
7. ✅ `examenes_dentales` - Exámenes con feedback IA
8. ✅ `autofill_patterns` - Patrones de aprendizaje
9. ✅ `logs_sii` - Audit trail completo

### 1.3 Inicializar Folios

```sql
-- Crear rango de folios para boletas (ejemplo)
SELECT initialize_folio_range(
  39, -- tipo_dte (39=Boleta)
  '12345678-9', -- RUT empresa
  1, -- folio_desde
  1000, -- folio_hasta
  '<CAF>...</CAF>', -- XML del CAF desde SII
  now(), -- fecha_autorizacion
  now() + interval '6 months' -- fecha_vencimiento
);
```

---

## 🐍 Paso 2: Configurar Backend Python (LangGraph + LangChain)

### 2.1 Instalar Dependencias

```bash
cd services/langgraph-python

# Crear entorno virtual
python3 -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt
```

### 2.2 Configurar Variables de Entorno

```bash
cp .env.example .env
```

Edita `.env`:

```bash
# Claude AI
ANTHROPIC_API_KEY=sk-ant-...  # Tu API key de Claude

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...  # Service role key (no anon key)

# Empresa
EMPRESA_RUT=12345678-9
EMPRESA_RAZON_SOCIAL=Clínica Dental TheCareBot
EMPRESA_GIRO=Servicios Odontológicos
EMPRESA_DIRECCION=Av. Providencia 1234, Santiago
EMPRESA_ACTIVIDAD_ECONOMICA=869090

# Server
HOST=0.0.0.0
PORT=8000
```

### 2.3 Ejecutar Servidor Python

```bash
python main.py
```

Deberías ver:

```
╔══════════════════════════════════════════════════════════╗
║  TheCareBot LangGraph API Server                         ║
║  Chilean SII Electronic Invoicing                        ║
╠══════════════════════════════════════════════════════════╣
║  Server: http://0.0.0.0:8000                             ║
║  Docs:   http://0.0.0.0:8000/docs                        ║
╚══════════════════════════════════════════════════════════╝
```

### 2.4 Probar API

Abre [http://localhost:8000/docs](http://localhost:8000/docs) para ver Swagger UI.

Prueba el endpoint de autofill:

```bash
curl -X POST http://localhost:8000/api/invoke/autofill \
  -H "Content-Type: application/json" \
  -d '{
    "doctor_id": "550e8400-e29b-41d4-a716-446655440000",
    "campo": "descripcion_servicio",
    "current_value": "Limp",
    "contexto": {
      "day_of_week": 1,
      "period_of_day": "morning"
    }
  }'
```

---

## ⚛️ Paso 3: Configurar Frontend Next.js

### 3.1 Instalar Dependencias

```bash
npm install
```

### 3.2 Variables de Entorno

Ya deberías tener `.env.local` configurado. Asegúrate de tener:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...

# Python backend URL (en producción usar URL real)
NEXT_PUBLIC_PYTHON_API_URL=http://localhost:8000
```

### 3.3 Ejecutar Next.js

```bash
npm run dev
```

Abre [http://localhost:3000/facturacion/nueva](http://localhost:3000/facturacion/nueva)

---

## 🧪 Paso 4: Probar el Sistema Completo

### 4.1 Insertar Patrones de Prueba

```sql
-- Insertar patrones de ejemplo para autocompletado
INSERT INTO autofill_patterns (doctor_id, campo, valor, frecuencia, contexto) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'descripcion_servicio', 'Limpieza dental', 45, '{"day_of_week": 1}'::jsonb),
('550e8400-e29b-41d4-a716-446655440000', 'descripcion_servicio', 'Consulta general', 32, '{"day_of_week": 2}'::jsonb),
('550e8400-e29b-41d4-a716-446655440000', 'razon_social', 'Juan Pérez', 12, '{}'::jsonb);
```

### 4.2 Flujo Completo

1. **Abrir formulario**: [http://localhost:3000/facturacion/nueva](http://localhost:3000/facturacion/nueva)

2. **Comenzar a escribir** en "Descripción del Servicio": `Limp`

3. **Ver predicciones**:
   - Python backend consulta base de datos
   - LangGraph workflow ejecuta 3 nodos
   - Claude AI agent analiza patrones (si hay >= 5)
   - Frontend muestra predicciones con:
     - 🤖 icono de AI
     - 📊 badge de alta confianza (>= 0.8)
     - Frecuencia de uso
     - Match de contexto

4. **Seleccionar sugerencia**:
   - Valor se autocompleta
   - Backend incrementa frecuencia (aprendizaje)
   - ✓ Checkmark verde aparece

5. **Completar boleta**:
   - Agregar ítems
   - Ver totales calculados automáticamente
   - Generar y enviar

---

## 🎯 Arquitectura del Sistema

### LangGraph Workflow (Python)

```
┌─────────────────────────────────────────────┐
│         AUTOFILL WORKFLOW                   │
│                                             │
│  ┌──────────────┐                          │
│  │ query_patterns│  (Node 1)               │
│  │ - Query DB   │                          │
│  └──────┬───────┘                          │
│         │                                   │
│         ▼                                   │
│  ┌──────────────┐                          │
│  │ enrich_context│ (Node 2)                │
│  │ - Add day/time│                         │
│  └──────┬───────┘                          │
│         │                                   │
│         ▼                                   │
│  ┌──────────────┐                          │
│  │ AI prediction │ (Node 3)                │
│  │ - Claude 3.5  │                         │
│  │ - LangChain   │                         │
│  └──────┬───────┘                          │
│         │                                   │
│         ▼                                   │
│    [predictions]                           │
└─────────────────────────────────────────────┘
```

### LangChain AI Agent

```
Claude 3.5 Sonnet
     │
     ├─ Tool: analyze_pattern_frequency
     ├─ Tool: match_context_patterns
     └─ Tool: calculate_string_similarity
          │
          ▼
     Predictions (JSON)
     [
       {
         "valor": "Limpieza dental",
         "confidence": 0.92,
         "frecuencia": 45,
         "reasoning": "High frequency, Monday pattern match"
       }
     ]
```

---

## 🔧 Funciones PostgreSQL Críticas

### get_next_folio()

```sql
-- Uso:
SELECT get_next_folio(39, '12345678-9');
-- Retorna: 123 (próximo folio disponible)

-- Características:
-- ✅ Atómico (previene race conditions)
-- ✅ Marca como 'agotado' si se acaban los folios
-- ✅ Usa FOR UPDATE lock
```

### validate_chilean_rut()

```sql
-- Uso:
SELECT validate_chilean_rut('12.345.678-9');
-- Retorna: true/false

-- Implementa algoritmo Módulo 11
```

### increment_autofill_frequency()

```sql
-- Uso (desde código):
SELECT increment_autofill_frequency(
  'doctor-uuid',
  'razon_social',
  'Juan Pérez',
  '{"day_of_week": 1}'::jsonb
);

-- Si existe: frecuencia + 1
-- Si no existe: INSERT frecuencia = 1
```

---

## 🐛 Troubleshooting

### Error: "No active folio range"

```sql
-- Verificar folios:
SELECT * FROM folios_asignados WHERE estado = 'activo';

-- Si no hay, inicializar:
SELECT initialize_folio_range(...);
```

### Error: "ANTHROPIC_API_KEY not set"

El sistema fallará a predicción simple (sin AI). Configura:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

### Error: "Failed to connect to Python server"

Verifica que el servidor Python esté corriendo:

```bash
curl http://localhost:8000/health
# Debería retornar: {"status": "healthy"}
```

### Autofill no muestra predicciones

1. Verifica que hay patrones en DB:
```sql
SELECT * FROM autofill_patterns LIMIT 10;
```

2. Verifica logs del Python server:
```bash
# En terminal de Python deberías ver:
[Autofill] Querying patterns for campo='descripcion_servicio'
[Autofill] Enriching context
[Autofill] Calculating predictions with Claude AI Agent
```

---

## 📊 Monitoreo

### Ver logs SII

```sql
SELECT * FROM logs_sii
ORDER BY created_at DESC
LIMIT 20;
```

### Ver patrones más usados

```sql
SELECT campo, valor, frecuencia
FROM autofill_patterns
ORDER BY frecuencia DESC
LIMIT 10;
```

### Ver folios disponibles

```sql
SELECT tipo_dte, folio_actual, folio_hasta,
       (folio_hasta - folio_actual) as folios_restantes
FROM folios_asignados
WHERE estado = 'activo';
```

---

## 🚀 Próximos Pasos

1. **Implementar firma digital real** (actualmente mock)
2. **Integrar SII API real** (actualmente mock)
3. **Agregar generación PDF** con timbre electrónico
4. **Implementar Google Calendar sync** para citas
5. **Agregar WhatsApp notifications**

---

## 📚 Documentación Adicional

- [LangGraph Docs](https://python.langchain.com/docs/langgraph)
- [LangChain Docs](https://python.langchain.com/)
- [SII Chile - DTE Specification](https://www.sii.cl/factura_electronica/)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)

---

## ✅ Checklist de Producción

Antes de ir a producción:

- [ ] Configurar certificado digital (.pfx) real del SII
- [ ] Obtener folios CAF reales desde SII
- [ ] Configurar SII API credentials
- [ ] Habilitar HTTPS en Python server
- [ ] Configurar rate limiting
- [ ] Setup monitoring (Prometheus/Grafana)
- [ ] Configurar backups automáticos de Supabase
- [ ] Implementar circuit breakers para SII API
- [ ] Pruebas de carga (mínimo 100 usuarios concurrentes)
- [ ] Compliance audit (Ley 19.628)

---

**Sistema desarrollado con LangGraph + LangChain + Claude AI 🤖**

*TheCareBot - Intelligent Medical Invoicing for Chile*
