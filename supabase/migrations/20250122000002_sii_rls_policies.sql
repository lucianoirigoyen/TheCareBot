-- Chilean SII Electronic Invoicing - Row Level Security Policies
-- Migration: 20250122000002_sii_rls_policies.sql

-- ============================================
-- RLS Policies: Doctors can only see their own data
-- ============================================

-- 1. Boletas Electrónicas
CREATE POLICY "Doctors can view own boletas"
  ON boletas_electronicas FOR SELECT
  USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can insert own boletas"
  ON boletas_electronicas FOR INSERT
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update own boletas"
  ON boletas_electronicas FOR UPDATE
  USING (auth.uid() = doctor_id);

-- 2. Facturas Electrónicas
CREATE POLICY "Doctors can view own facturas"
  ON facturas_electronicas FOR SELECT
  USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can insert own facturas"
  ON facturas_electronicas FOR INSERT
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update own facturas"
  ON facturas_electronicas FOR UPDATE
  USING (auth.uid() = doctor_id);

-- 3. Notas de Crédito
CREATE POLICY "Doctors can view own notas credito"
  ON notas_credito FOR SELECT
  USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can insert own notas credito"
  ON notas_credito FOR INSERT
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update own notas credito"
  ON notas_credito FOR UPDATE
  USING (auth.uid() = doctor_id);

-- 4. Folios Asignados
CREATE POLICY "Doctors can view folios"
  ON folios_asignados FOR SELECT
  USING (true); -- All authenticated users can view folios

CREATE POLICY "Only service role can manage folios"
  ON folios_asignados FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- 5. Certificados Tributarios
CREATE POLICY "Doctors can view own certificates"
  ON certificados_tributarios FOR SELECT
  USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can insert own certificates"
  ON certificados_tributarios FOR INSERT
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update own certificates"
  ON certificados_tributarios FOR UPDATE
  USING (auth.uid() = doctor_id);

-- 6. Citas Dentales
CREATE POLICY "Doctors can view own citas"
  ON citas_dentales FOR SELECT
  USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can insert own citas"
  ON citas_dentales FOR INSERT
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update own citas"
  ON citas_dentales FOR UPDATE
  USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can delete own citas"
  ON citas_dentales FOR DELETE
  USING (auth.uid() = doctor_id);

-- 7. Exámenes Dentales
CREATE POLICY "Doctors can view own examenes"
  ON examenes_dentales FOR SELECT
  USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can insert own examenes"
  ON examenes_dentales FOR INSERT
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update own examenes"
  ON examenes_dentales FOR UPDATE
  USING (auth.uid() = doctor_id);

-- 8. Autofill Patterns
CREATE POLICY "Doctors can view own patterns"
  ON autofill_patterns FOR SELECT
  USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can insert own patterns"
  ON autofill_patterns FOR INSERT
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update own patterns"
  ON autofill_patterns FOR UPDATE
  USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can delete own patterns"
  ON autofill_patterns FOR DELETE
  USING (auth.uid() = doctor_id);

-- 9. Logs SII (No RLS - Managed by service role only)
-- Logs are append-only and viewable only by service role for auditing
