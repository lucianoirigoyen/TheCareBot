-- Chilean SII Electronic Invoicing - PostgreSQL Functions
-- Migration: 20250122000003_sii_functions.sql

-- ============================================
-- Function: Get Next Folio (Atomic Operation)
-- ============================================
CREATE OR REPLACE FUNCTION get_next_folio(
  p_tipo_dte INTEGER,
  p_rut_empresa TEXT
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_folio_range RECORD;
  v_next_folio BIGINT;
BEGIN
  -- Get active folio range with row lock
  SELECT * INTO v_folio_range
  FROM folios_asignados
  WHERE tipo_dte = p_tipo_dte
    AND rut_empresa = p_rut_empresa
    AND estado = 'activo'
  ORDER BY folio_actual ASC
  LIMIT 1
  FOR UPDATE;

  -- Check if folio range exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active folio range found for tipo_dte=% and rut_empresa=%', p_tipo_dte, p_rut_empresa;
  END IF;

  -- Calculate next folio
  v_next_folio := v_folio_range.folio_actual + 1;

  -- Check if folio exhausted
  IF v_next_folio > v_folio_range.folio_hasta THEN
    -- Mark as exhausted
    UPDATE folios_asignados
    SET estado = 'agotado',
        updated_at = now()
    WHERE id = v_folio_range.id;

    RAISE EXCEPTION 'Folios exhausted for tipo_dte=%. Range: % to %', p_tipo_dte, v_folio_range.folio_desde, v_folio_range.folio_hasta;
  END IF;

  -- Update current folio (atomic)
  UPDATE folios_asignados
  SET folio_actual = v_next_folio,
      updated_at = now()
  WHERE id = v_folio_range.id;

  RETURN v_next_folio;
END;
$$;

COMMENT ON FUNCTION get_next_folio IS 'Atomically get next available folio for document type. Prevents race conditions.';

-- ============================================
-- Function: Validate Chilean RUT
-- ============================================
CREATE OR REPLACE FUNCTION validate_chilean_rut(p_rut TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_clean_rut TEXT;
  v_number TEXT;
  v_check_digit CHAR(1);
  v_sum INTEGER := 0;
  v_multiplier INTEGER := 2;
  v_mod INTEGER;
  v_expected_digit CHAR(1);
  v_digit CHAR(1);
  v_i INTEGER;
BEGIN
  -- Clean RUT (remove dots and dashes)
  v_clean_rut := UPPER(REPLACE(REPLACE(p_rut, '.', ''), '-', ''));

  -- Check minimum length
  IF LENGTH(v_clean_rut) < 2 THEN
    RETURN FALSE;
  END IF;

  -- Extract number and check digit
  v_number := SUBSTRING(v_clean_rut, 1, LENGTH(v_clean_rut) - 1);
  v_check_digit := SUBSTRING(v_clean_rut, LENGTH(v_clean_rut), 1);

  -- Validate number part is numeric
  IF v_number !~ '^[0-9]+$' THEN
    RETURN FALSE;
  END IF;

  -- Calculate check digit using Módulo 11 algorithm
  FOR v_i IN REVERSE LENGTH(v_number)..1 LOOP
    v_digit := SUBSTRING(v_number, v_i, 1);
    v_sum := v_sum + (v_digit::INTEGER * v_multiplier);

    v_multiplier := v_multiplier + 1;
    IF v_multiplier > 7 THEN
      v_multiplier := 2;
    END IF;
  END LOOP;

  v_mod := 11 - (v_sum % 11);

  -- Determine expected check digit
  IF v_mod = 11 THEN
    v_expected_digit := '0';
  ELSIF v_mod = 10 THEN
    v_expected_digit := 'K';
  ELSE
    v_expected_digit := v_mod::TEXT;
  END IF;

  RETURN v_check_digit = v_expected_digit;
END;
$$;

COMMENT ON FUNCTION validate_chilean_rut IS 'Validates Chilean RUT using Módulo 11 check digit algorithm';

-- ============================================
-- Function: Increment Autofill Frequency
-- ============================================
CREATE OR REPLACE FUNCTION increment_autofill_frequency(
  p_doctor_id UUID,
  p_campo TEXT,
  p_valor TEXT,
  p_contexto JSONB DEFAULT '{}'::JSONB
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  -- Upsert: If pattern exists, increment frequency; otherwise insert new
  INSERT INTO autofill_patterns (doctor_id, campo, valor, frecuencia, contexto, last_used_at)
  VALUES (p_doctor_id, p_campo, p_valor, 1, p_contexto, now())
  ON CONFLICT (doctor_id, campo, valor)
  DO UPDATE SET
    frecuencia = autofill_patterns.frecuencia + 1,
    contexto = p_contexto,
    last_used_at = now();
END;
$$;

COMMENT ON FUNCTION increment_autofill_frequency IS 'Learning mechanism: Increments frequency when user selects autofill suggestion';

-- ============================================
-- Function: Initialize Folio Range
-- ============================================
CREATE OR REPLACE FUNCTION initialize_folio_range(
  p_tipo_dte INTEGER,
  p_rut_empresa TEXT,
  p_folio_desde BIGINT,
  p_folio_hasta BIGINT,
  p_caf_xml TEXT,
  p_fecha_autorizacion TIMESTAMP WITH TIME ZONE,
  p_fecha_vencimiento TIMESTAMP WITH TIME ZONE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_folio_id UUID;
BEGIN
  -- Validate range
  IF p_folio_desde > p_folio_hasta THEN
    RAISE EXCEPTION 'Invalid folio range: desde (%) > hasta (%)', p_folio_desde, p_folio_hasta;
  END IF;

  IF p_folio_desde < 1 THEN
    RAISE EXCEPTION 'Folio desde must be >= 1';
  END IF;

  -- Insert new folio range
  INSERT INTO folios_asignados (
    tipo_dte,
    rut_empresa,
    folio_desde,
    folio_hasta,
    folio_actual,
    caf_xml,
    fecha_autorizacion,
    fecha_vencimiento,
    estado
  ) VALUES (
    p_tipo_dte,
    p_rut_empresa,
    p_folio_desde,
    p_folio_hasta,
    p_folio_desde - 1, -- Start at desde-1 so first call to get_next_folio returns desde
    p_caf_xml,
    p_fecha_autorizacion,
    p_fecha_vencimiento,
    'activo'
  )
  RETURNING id INTO v_folio_id;

  RETURN v_folio_id;
END;
$$;

COMMENT ON FUNCTION initialize_folio_range IS 'Initialize a new folio range from SII CAF authorization';

-- ============================================
-- Function: Calculate IVA (19% Chilean Tax)
-- ============================================
CREATE OR REPLACE FUNCTION calculate_iva(p_monto_neto NUMERIC)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ROUND(p_monto_neto * 0.19, 0);
$$;

COMMENT ON FUNCTION calculate_iva IS 'Calculate Chilean IVA (19%) from neto amount, rounded to integer';
