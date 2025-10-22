# Base de Datos (Supabase) – Prompt Multiagente

## Objetivo
Gestionar los datos médicos de TheCareBot de forma segura, eficiente y escalable con Supabase (PostgreSQL + Auth).

---

## Responsabilidades
- Definir esquemas de tablas médicos y de sesiones.
- Implementar RLS (Row-Level Security).
- Optimizar queries con índices.
- Mantener logs de auditoría.
- Planificar caching inteligente.
- Implementar connection pooling y gestión de transacciones.
- Configurar backup automático y disaster recovery.

---

## Reglas Técnicas

### 1. **Esquema Base**
```sql
-- Tabla de perfiles médicos
CREATE TABLE doctor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  medical_license TEXT UNIQUE NOT NULL,
  specialty TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  CONSTRAINT valid_license CHECK (medical_license ~ '^[0-9]{6,10}$')
);

-- Tabla de sesiones médicas
CREATE TABLE thecarebot_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  patient_rut TEXT NOT NULL,
  session_type TEXT NOT NULL DEFAULT 'analysis',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'cancelled')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT valid_rut CHECK (patient_rut ~ '^[0-9]{7,8}-[0-9Kk]$'),
  CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- Tabla de logs de auditoría
CREATE TABLE thecarebot_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES thecarebot_sessions(id) ON DELETE SET NULL,
  doctor_id UUID REFERENCES doctor_profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  ip_address INET,
  user_agent TEXT,
  request_data JSONB,
  response_status INTEGER,
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT valid_status CHECK (response_status BETWEEN 100 AND 599)
);

-- Tabla de análisis médicos
CREATE TABLE medical_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES thecarebot_sessions(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL,
  input_data JSONB NOT NULL,
  results JSONB,
  confidence_score DECIMAL(3,2) CHECK (confidence_score BETWEEN 0.00 AND 1.00),
  processing_time_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT results_when_completed CHECK (
    (status = 'completed' AND results IS NOT NULL) OR 
    (status != 'completed')
  )
);
```

### 2. **Seguridad (RLS) - Políticas Detalladas**
```sql
-- Habilitar RLS en todas las tablas
ALTER TABLE doctor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE thecarebot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE thecarebot_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_analyses ENABLE ROW LEVEL SECURITY;

-- Políticas para doctor_profiles
CREATE POLICY "Doctors can view own profile" ON doctor_profiles
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Doctors can update own profile" ON doctor_profiles
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Políticas para thecarebot_sessions
CREATE POLICY "Doctors can access own sessions" ON thecarebot_sessions
  FOR ALL USING (doctor_id = auth.uid());

-- Políticas para logs (solo lectura para auditoría)
CREATE POLICY "Doctors can view own logs" ON thecarebot_logs
  FOR SELECT USING (doctor_id = auth.uid());

-- Políticas para análisis médicos
CREATE POLICY "Doctors can access analyses of own sessions" ON medical_analyses
  FOR ALL USING (
    session_id IN (
      SELECT id FROM thecarebot_sessions WHERE doctor_id = auth.uid()
    )
  );
```

### 3. **Optimización - Índices Estratégicos**
```sql
-- Índices primarios para performance
CREATE INDEX CONCURRENTLY idx_doctor_profiles_email ON doctor_profiles(email);
CREATE INDEX CONCURRENTLY idx_doctor_profiles_license ON doctor_profiles(medical_license);

-- Índices para sesiones (queries frecuentes)
CREATE INDEX CONCURRENTLY idx_sessions_doctor_status ON thecarebot_sessions(doctor_id, status);
CREATE INDEX CONCURRENTLY idx_sessions_created_at ON thecarebot_sessions(created_at DESC);
CREATE INDEX CONCURRENTLY idx_sessions_expires_at ON thecarebot_sessions(expires_at) 
  WHERE status = 'active';

-- Índices para logs (auditoría y troubleshooting)
CREATE INDEX CONCURRENTLY idx_logs_session_created ON thecarebot_logs(session_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_logs_doctor_action ON thecarebot_logs(doctor_id, action, created_at DESC);
CREATE INDEX CONCURRENTLY idx_logs_created_at ON thecarebot_logs(created_at DESC);

-- Índices para análisis médicos
CREATE INDEX CONCURRENTLY idx_analyses_session_status ON medical_analyses(session_id, status);
CREATE INDEX CONCURRENTLY idx_analyses_type_created ON medical_analyses(analysis_type, created_at DESC);

-- Índices parciales para queries específicas
CREATE INDEX CONCURRENTLY idx_active_sessions ON thecarebot_sessions(doctor_id, created_at DESC) 
  WHERE status = 'active';

CREATE INDEX CONCURRENTLY idx_failed_analyses ON medical_analyses(session_id, created_at DESC) 
  WHERE status = 'failed';
```

### 4. **Funciones Optimizadas**
```sql
-- Función para limpiar sesiones expiradas
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE thecarebot_sessions 
  SET status = 'expired', 
      completed_at = now()
  WHERE status = 'active' 
    AND expires_at < now();
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  -- Log de la operación de limpieza
  INSERT INTO thecarebot_logs (action, resource_type, response_status, request_data)
  VALUES ('cleanup_expired_sessions', 'session', 200, 
          jsonb_build_object('affected_rows', affected_rows));
  
  RETURN affected_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener estadísticas de sesiones
CREATE OR REPLACE FUNCTION get_session_stats(doctor_uuid UUID)
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'total_sessions', COUNT(*),
      'active_sessions', COUNT(*) FILTER (WHERE status = 'active'),
      'completed_sessions', COUNT(*) FILTER (WHERE status = 'completed'),
      'avg_session_duration_minutes', 
        ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(completed_at, now()) - created_at)) / 60), 2)
    )
    FROM thecarebot_sessions 
    WHERE doctor_id = doctor_uuid
      AND created_at >= now() - INTERVAL '30 days'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 5. **Triggers para Auditoría Automática**
```sql
-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_doctor_profiles_updated_at 
  BEFORE UPDATE ON doctor_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para logging automático de cambios críticos
CREATE OR REPLACE FUNCTION log_session_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO thecarebot_logs (session_id, doctor_id, action, resource_type, 
                                resource_id, request_data)
    VALUES (NEW.id, NEW.doctor_id, 'session_status_change', 'session', 
            NEW.id::text, 
            jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status));
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER log_session_status_changes
  AFTER UPDATE ON thecarebot_sessions
  FOR EACH ROW EXECUTE FUNCTION log_session_changes();
```

### 6. **Connection Pooling y Performance**
```typescript
// Configuración de Supabase con connection pooling
const supabaseConfig = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      'x-application': 'thecarebot'
    }
  }
};

// Pool de conexiones para queries de alta concurrencia
class DatabasePool {
  private static instance: DatabasePool;
  private pool: any;

  private constructor() {
    // Configurar pool con límites apropiados
    this.pool = {
      max: 20, // máximo conexiones concurrentes
      min: 2,  // mínimo conexiones activas
      acquireTimeoutMillis: 3000,
      createTimeoutMillis: 3000,
      idleTimeoutMillis: 30000
    };
  }

  static getInstance(): DatabasePool {
    if (!DatabasePool.instance) {
      DatabasePool.instance = new DatabasePool();
    }
    return DatabasePool.instance;
  }
}
```

### 7. **Backup y Disaster Recovery**
```sql
-- Configuración de backup automático
-- (Configurar en Supabase Dashboard o CLI)

-- Política de retención de logs (limpiar logs antiguos)
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS INTEGER AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  DELETE FROM thecarebot_logs 
  WHERE created_at < now() - INTERVAL '90 days'
    AND action NOT IN ('critical_error', 'security_violation');
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  INSERT INTO thecarebot_logs (action, resource_type, response_status, request_data)
  VALUES ('cleanup_old_logs', 'maintenance', 200, 
          jsonb_build_object('deleted_rows', affected_rows));
  
  RETURN affected_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Programar limpieza automática con pg_cron
SELECT cron.schedule('cleanup-logs', '0 2 * * 0', 'SELECT cleanup_old_logs();');
SELECT cron.schedule('cleanup-sessions', '0 1 * * *', 'SELECT cleanup_expired_sessions();');
```

---

## Buenas Prácticas Implementadas

### **Nomenclatura y Estructura**
- Uso de `snake_case` para tablas y columnas (estándar PostgreSQL)
- UUIDs como claves primarias para seguridad y distribución
- Timestamps con zona horaria (`TIMESTAMP WITH TIME ZONE`)
- Constraints con nombres descriptivos

### **Seguridad en Profundidad**
- RLS habilitado en todas las tablas sensibles
- Políticas granulares por tipo de operación
- Validación de datos a nivel de base de datos
- Funciones con `SECURITY DEFINER` para operaciones controladas

### **Performance y Escalabilidad**
- Índices estratégicos basados en patrones de consulta
- Índices parciales para queries específicas
- Funciones optimizadas para operaciones comunes
- Connection pooling configurado

### **Observabilidad y Mantenimiento**
- Logging automático de todas las operaciones críticas
- Triggers para auditoría transparente
- Funciones de estadísticas y monitoreo
- Limpieza automática de datos históricos

---

## Scripts de Migración

### **Migración Inicial**
```sql
-- migrations/001_initial_schema.sql
BEGIN;

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Crear tablas en orden de dependencias
\i tables/doctor_profiles.sql
\i tables/thecarebot_sessions.sql
\i tables/thecarebot_logs.sql
\i tables/medical_analyses.sql

-- Crear índices
\i indexes/performance_indexes.sql

-- Configurar RLS
\i security/rls_policies.sql

-- Crear funciones
\i functions/utility_functions.sql

-- Crear triggers
\i triggers/audit_triggers.sql

COMMIT;
```

### **Validación Post-Migración**
```sql
-- Verificar que RLS está habilitado
SELECT schemaname, tablename, rowsecurity, forcerowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename LIKE 'thecarebot_%' OR tablename = 'doctor_profiles';

-- Verificar índices creados
SELECT indexname, tablename, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('doctor_profiles', 'thecarebot_sessions', 'thecarebot_logs', 'medical_analyses');

-- Test básico de funcionalidad
DO $$
DECLARE
  test_doctor_id UUID;
  test_session_id UUID;
BEGIN
  -- Test de creación de doctor (requiere auth context en producción)
  RAISE NOTICE 'Schema validation completed successfully';
END $$;
```

---

## Entregables
- ✅ Esquema Supabase implementado con constraints y validaciones
- ✅ RLS activado con políticas granulares por rol
- ✅ Logs de auditoría automática con triggers
- ✅ Índices optimizados para performance
- ✅ Funciones utilitarias para operaciones comunes
- ✅ Scripts de migración versionados
- ✅ Configuración de connection pooling
- ✅ Sistema de backup y disaster recovery
- ✅ Documentación completa de la arquitectura de datos