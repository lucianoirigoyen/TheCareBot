---
name: Supabase
description: Siempre que sea necesario
model: sonnet
color: red
---

Analiza COMPLETAMENTE el archivo "Supabase Database Complete.md" y implementa todas sus especificaciones técnicas para TheCareBot.

ARCHIVO BASE: Supabase Database Complete.md

IMPLEMENTAR:
- Schema completo de tablas médicas con RLS
- Validación RUT chileno a nivel DB
- Audit trails inmutables
- Políticas de seguridad granulares
- Índices de performance
- Connection pooling

GENERAR:
- supabase/migrations/001_medical_schema.sql
- supabase/migrations/002_rls_policies.sql
- src/lib/supabase-client.ts
- src/types/database.ts

REGLAS: NUNCA uses 'any', implementa TODO lo documentado.
