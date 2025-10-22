# 🏗️ TheCareBot SII - Technical Architecture Summary

Sistema de facturación electrónica chilena con **inteligencia artificial** usando **LangGraph** y **LangChain**.

---

## 🎯 Objetivo del Sistema

Crear un sistema de facturación electrónica para clínicas dentales chilenas que:

1. **Cumple con normativa SII**: Boletas, facturas y notas de crédito electrónicas
2. **Autocompletado inteligente**: Predice valores usando IA (Claude AI)
3. **Aprende del uso**: Sistema que mejora con cada interacción
4. **Multi-agente**: LangGraph orquesta múltiples agentes especializados

---

## 📐 Arquitectura Multi-Agente

### LangGraph Workflow: Autofill Inteligente

```python
# services/langgraph-python/graphs/autofill_workflow.py

StateGraph(AutofillWorkflowState)
  │
  ├─ Node 1: query_historical_patterns
  │   └─ Consulta Supabase → 20 patrones históricos
  │
  ├─ Node 2: enrich_context
  │   └─ Agrega: day_of_week, period_of_day
  │
  └─ Node 3: calculate_predictions_with_ai
      ├─ Si >= 5 patrones → Claude AI Agent
      └─ Si < 5 patrones → Simple prediction
```

### LangChain AI Agent: Predictor Inteligente

```python
# services/langgraph-python/agents/intelligent_autofill_agent.py

ChatAnthropic("claude-3-5-sonnet-20241022")
  │
  ├─ Tool: analyze_pattern_frequency
  │   └─ Estadísticas: max, avg, high_confidence_count
  │
  ├─ Tool: match_context_patterns
  │   └─ Filtra por: day_of_week, period_of_day
  │
  └─ Tool: calculate_string_similarity
      └─ Score 0.0-1.0 vs input actual
```

**Prompt del Agente**:
- Analiza frecuencia (40%), contexto (30%), similaridad (30%)
- Retorna máximo 5 predicciones
- Solo confidence >= 0.6
- Razonamiento en español

---

## 🗄️ Base de Datos: 9 Tablas Supabase

### Tablas de Facturación (Core SII)

**1. boletas_electronicas** (DTE Tipo 39)
```sql
- folio BIGINT (único por emisor)
- emisor_rut, receptor_rut TEXT
- monto_neto, monto_iva, monto_total NUMERIC(12,2)
- xml_dte TEXT (XML firmado)
- track_id TEXT (SII tracking)
- estado_sii: pendiente|aceptado|rechazado|reparo
```

**2. facturas_electronicas** (DTE Tipo 33)
- Similar a boletas
- Requiere datos completos del receptor (giro, dirección)

**3. notas_credito** (DTE Tipo 61)
- Similar a boletas
- Plus: referencia_tipo_doc, referencia_folio, motivo_referencia

### Gestión de Folios

**4. folios_asignados**
```sql
- tipo_dte INTEGER (33, 39, 61)
- folio_desde, folio_hasta, folio_actual BIGINT
- caf_xml TEXT (Código Autorización Folios del SII)
- estado: activo|agotado|vencido
```

**Función crítica**: `get_next_folio(tipo_dte, rut_empresa)`
- ✅ Atómico (FOR UPDATE lock)
- ✅ Incrementa folio_actual
- ✅ Marca como agotado si llega a folio_hasta

### Sistema de Aprendizaje (AI)

**8. autofill_patterns**
```sql
- doctor_id UUID
- campo TEXT (ej: 'descripcion_servicio', 'razon_social')
- valor TEXT (ej: 'Limpieza dental')
- frecuencia INTEGER (contador de usos)
- contexto JSONB ({"day_of_week": 1, "period_of_day": "morning"})
- UNIQUE(doctor_id, campo, valor)
```

**Función**: `increment_autofill_frequency(doctor_id, campo, valor, contexto)`
- Si existe → frecuencia + 1
- Si no existe → INSERT con frecuencia = 1
- Mecanismo de aprendizaje automático

### Auditoría

**9. logs_sii**
```sql
- operacion TEXT (generar_dte, firmar_dte, enviar_dte)
- exitoso BOOLEAN
- duracion_ms INTEGER
- request_payload, response_payload JSONB
```

---

## 🔄 Flujo de Datos Completo

### Autocompletado Inteligente (End-to-End)

```
[Frontend] Usuario escribe "Limp" en campo descripcion_servicio
    │
    ▼ 300ms debounce
[Next.js API] POST /api/python/autofill
    │
    ▼ HTTP request
[Python FastAPI] POST /api/invoke/autofill
    │
    ▼ Execute workflow
[LangGraph] StateGraph execution:
    │
    ├─ [Node 1] query_historical_patterns
    │     └─ SELECT * FROM autofill_patterns
    │          WHERE doctor_id = ? AND campo = ?
    │          ORDER BY frecuencia DESC LIMIT 20
    │
    ├─ [Node 2] enrich_context
    │     └─ Add: day_of_week = datetime.now().weekday()
    │              period_of_day = "morning"|"afternoon"|"evening"
    │
    └─ [Node 3] calculate_predictions_with_ai
          │
          ├─ IF len(patterns) >= 5 AND ANTHROPIC_API_KEY:
          │     └─ [LangChain Agent] Claude AI prediction
          │           ├─ Tool: analyze_pattern_frequency
          │           ├─ Tool: match_context_patterns
          │           └─ Tool: calculate_string_similarity
          │           → Returns JSON predictions
          │
          └─ ELSE:
                └─ Simple prediction (frequency-based)
    │
    ▼ Return result
{
  "success": true,
  "predictions": [
    {
      "valor": "Limpieza dental",
      "confidence": 0.92,
      "frecuencia": 45,
      "contexto_match": true,
      "icon": "🤖📊",
      "reasoning": "Alta frecuencia (45 usos), match lunes, prefix exacto"
    }
  ]
}
    │
    ▼ Render UI
[Frontend] Muestra dropdown con predicciones
    │
    ▼ Usuario selecciona
[Frontend] POST /api/python/learn
    │
    ▼
[Backend] increment_autofill_frequency()
    └─ frecuencia + 1 en base de datos
```

---

## 🧠 Algoritmo de Confidence Score

### Versión Simple (sin AI)

```python
confidence = (
  0.4 * (frecuencia / max_frecuencia) +      # Peso frecuencia: 40%
  0.3 * context_match_score +                # Peso contexto: 30%
  0.3 * string_similarity                    # Peso similaridad: 30%
)

if confidence >= 0.6:
    include_in_predictions()
```

### Versión AI (con Claude)

Claude analiza:
1. **Patterns**: Frecuencias y contextos históricos
2. **Current input**: Texto parcial del usuario
3. **Context**: Día de semana, hora, tipo de consulta
4. **Tools**: Llama a herramientas para análisis profundo

Retorna JSON con razonamiento explícito.

---

## 🛡️ Seguridad y Compliance

### Row-Level Security (RLS)

Todas las tablas (excepto logs_sii):

```sql
CREATE POLICY "Doctors can view own data"
  ON tabla FOR SELECT
  USING (auth.uid() = doctor_id);
```

✅ Doctor solo ve sus propios datos
✅ Multi-tenant seguro
✅ No requiere filtros en queries

### Validación Chilean RUT

```sql
CREATE FUNCTION validate_chilean_rut(p_rut TEXT)
RETURNS BOOLEAN AS $$
  -- Implementa algoritmo Módulo 11
  -- 1. Limpiar RUT (remover puntos y guión)
  -- 2. Extraer número y dígito verificador
  -- 3. Calcular con factores 2,3,4,5,6,7
  -- 4. mod = 11 - (sum % 11)
  -- 5. Comparar con dígito verificador
$$;
```

Usado en:
- Frontend (TypeScript)
- Backend (Python)
- Database (PostgreSQL)

### Auditoría Completa

Tabla `logs_sii`:
- Todas las operaciones SII
- Request/response payloads
- Duración en ms
- IP y user agent
- Append-only (no updates/deletes)

---

## 🚀 Performance y Escalabilidad

### Índices Estratégicos

```sql
-- Queries comunes optimizadas:
CREATE INDEX idx_boletas_doctor_fecha
  ON boletas_electronicas(doctor_id, fecha_emision DESC);

CREATE INDEX idx_autofill_doctor_campo
  ON autofill_patterns(doctor_id, campo, frecuencia DESC);

-- Búsquedas de pendientes:
CREATE INDEX idx_examenes_feedback_pendiente
  ON examenes_dentales(feedback_generado, feedback_enviado)
  WHERE feedback_generado = TRUE AND feedback_enviado = FALSE;
```

### Circuit Breakers

Python usa `opossum` library:

```python
# En producción (no implementado en MVP):
from opossum import CircuitBreaker

sii_breaker = CircuitBreaker(
    timeout=15000,  # 15 segundos
    errorThresholdPercentage=60,
    resetTimeout=60000  # 1 minuto
)
```

### Caching

Autofill patterns:
- Frontend: Debounce 300ms
- Backend: Query limit 20 (no traer todo)
- AI Agent: Solo si >= 5 patterns (ahorra tokens)

---

## 📊 Métricas de Negocio

### Tracking de Aprendizaje

```sql
-- Patrón más usado por doctor
SELECT campo, valor, frecuencia
FROM autofill_patterns
WHERE doctor_id = ?
ORDER BY frecuencia DESC
LIMIT 10;

-- Tasa de adopción del autofill
SELECT
  COUNT(*) FILTER (WHERE frecuencia > 1) * 100.0 / COUNT(*) as adoption_rate
FROM autofill_patterns
WHERE doctor_id = ?;
```

### SII Success Rate

```sql
SELECT
  COUNT(*) FILTER (WHERE exitoso = true) * 100.0 / COUNT(*) as success_rate,
  AVG(duracion_ms) as avg_duration
FROM logs_sii
WHERE operacion = 'enviar_dte'
  AND created_at > now() - interval '30 days';
```

---

## 🔧 Tecnologías Clave

| Componente | Tecnología | Propósito |
|-----------|-----------|-----------|
| **Workflow Orchestration** | LangGraph | Multi-agent state machine |
| **AI Agent** | LangChain | Tool-calling with Claude |
| **LLM** | Claude 3.5 Sonnet | Intelligent predictions |
| **Database** | Supabase (PostgreSQL) | Multi-tenant with RLS |
| **Backend API** | FastAPI | Async Python server |
| **Frontend** | Next.js 14 + React | Server components |
| **UI Components** | shadcn/ui + Radix | Accessible components |
| **Validation** | Zod | Runtime type checking |
| **PDF Generation** | ReportLab | Chilean SII format |

---

## 📁 Estructura de Archivos Críticos

```
services/langgraph-python/
├── main.py                              # FastAPI server
├── graphs/
│   ├── autofill_workflow.py             # ⭐ LangGraph workflow
│   └── invoice_workflow.py              # Invoice generation
├── agents/
│   ├── intelligent_autofill_agent.py    # ⭐ LangChain AI agent
│   ├── autofill_predictor.py            # Simple predictor
│   └── pdf_generator.py                 # PDF with ReportLab
├── tools/
│   └── supabase_client.py               # Database operations
└── state/
    └── workflow_state.py                # TypedDict states

supabase/migrations/
├── 20250122000001_sii_core_tables.sql   # ⭐ 9 tables
├── 20250122000002_sii_rls_policies.sql  # ⭐ RLS security
└── 20250122000003_sii_functions.sql     # ⭐ PostgreSQL functions

src/components/sii/
└── AutocompleteInput.tsx                # ⭐ Smart autocomplete UI
```

---

## ✅ Estado Actual del Proyecto

### ✅ COMPLETADO

- [x] Base de datos Supabase (9 tablas)
- [x] RLS policies (multi-tenant seguro)
- [x] PostgreSQL functions (get_next_folio, validate_rut)
- [x] Python LangGraph workflow (3 nodos)
- [x] LangChain AI agent con Claude
- [x] FastAPI server con endpoints
- [x] UI components (AutocompleteInput)
- [x] API integration (Next.js ↔ Python)
- [x] Learning mechanism (increment_autofill_frequency)
- [x] PDF generation con ReportLab

### 🚧 PENDIENTE (para producción)

- [ ] Firma digital real con certificado .pfx
- [ ] SII API integration (actualmente mock)
- [ ] XML builder con validación completa
- [ ] Google Calendar sync
- [ ] WhatsApp notifications
- [ ] Circuit breakers en SII API
- [ ] Monitoring (Prometheus/Grafana)
- [ ] TypeScript DTE types completos
- [ ] Tests unitarios y e2e
- [ ] Deploy a producción

---

## 🎓 Conceptos Clave

### LangGraph

**¿Qué es?**: Framework para crear workflows multi-agente con estado.

**¿Por qué?**: Orquesta múltiples pasos de forma controlada:
1. Query DB → 2. Enrich → 3. AI prediction

**Ventajas**:
- State management automático
- Conditional edges para branching
- Error handling integrado
- Visualización del grafo

### LangChain

**¿Qué es?**: Framework para construir aplicaciones con LLMs.

**¿Por qué?**: Claude AI necesita herramientas (tools) para:
- Analizar frecuencias
- Matchear contextos
- Calcular similaridades

**Ventajas**:
- Tool-calling abstraction
- Prompt templates
- Agent executor
- Structured outputs

### Difference: LangGraph vs LangChain

| LangGraph | LangChain |
|-----------|-----------|
| **Orchestration** | **Agents** |
| Multi-step workflows | Single agent tasks |
| State machine | Tool-calling |
| Node-based | Prompt-based |
| Complex flows | Simple chains |

**En este proyecto**:
- LangGraph = Workflow orchestrator (3 pasos)
- LangChain = AI agent (herramientas + reasoning)

---

## 🏆 Innovaciones del Sistema

1. **Aprendizaje automático**: Cada selección mejora el sistema
2. **Multi-agente**: LangGraph + LangChain working together
3. **Contexto inteligente**: Día de semana, hora → mejores predicciones
4. **Fallback gracioso**: Sin API key → simple prediction
5. **Type-safe**: PostgreSQL + Python TypedDict + TypeScript
6. **Multi-tenant seguro**: RLS asegura aislamiento
7. **Auditoría completa**: Cada operación SII tracked

---

**Desarrollado con ❤️ usando LangGraph + LangChain + Claude AI**

*Sistema de facturación inteligente para el futuro de la odontología chilena* 🦷🤖
