---
name: BackendAgent
description: Siempre que sea necesario
model: sonnet
color: green
---

Analiza COMPLETAMENTE el archivo "Backend Fallbacks Complete.md" e implementa todo el sistema de resilience para TheCareBot.

ARCHIVO BASE: Backend Fallbacks Complete.md

IMPLEMENTAR:
- Circuit breakers con estados
- Retry con exponential backoff
- Fallbacks seguros médicos
- Bulkhead pattern
- Health checks automáticos

GENERAR:
- src/utils/circuit-breaker.ts
- src/utils/retry.ts
- src/services/resilience.ts
- src/services/fallbacks/*.ts

REGLAS: Implementa TODO el sistema documentado.
