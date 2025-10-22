"""
Supabase client for database operations.
"""
from supabase import create_client, Client
from typing import List, Dict, Optional
import os
from datetime import datetime


class SupabaseClient:
    """Supabase database client."""

    def __init__(self):
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        if not supabase_url or not supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")

        self.client: Client = create_client(supabase_url, supabase_key)

    def query_autofill_patterns(
        self,
        doctor_id: str,
        campo: str,
        limit: int = 20
    ) -> List[Dict]:
        """
        Query historical autofill patterns from database.

        Args:
            doctor_id: Doctor's UUID
            campo: Field name (e.g., 'razon_social', 'descripcion_servicio')
            limit: Maximum number of results

        Returns:
            List of patterns with frecuencia and contexto
        """
        try:
            response = self.client.table("autofill_patterns")\
                .select("*")\
                .eq("doctor_id", doctor_id)\
                .eq("campo", campo)\
                .order("frecuencia", desc=True)\
                .limit(limit)\
                .execute()

            return response.data if response.data else []
        except Exception as e:
            print(f"Error querying autofill patterns: {e}")
            return []

    def increment_pattern_frequency(
        self,
        doctor_id: str,
        campo: str,
        valor: str,
        contexto: Dict
    ) -> bool:
        """
        Increment frequency for a selected pattern (learning mechanism).

        Args:
            doctor_id: Doctor's UUID
            campo: Field name
            valor: Selected value
            contexto: Context metadata

        Returns:
            True if successful
        """
        try:
            # Check if pattern exists
            existing = self.client.table("autofill_patterns")\
                .select("*")\
                .eq("doctor_id", doctor_id)\
                .eq("campo", campo)\
                .eq("valor", valor)\
                .execute()

            if existing.data and len(existing.data) > 0:
                # Update existing pattern
                pattern_id = existing.data[0]["id"]
                current_freq = existing.data[0]["frecuencia"]

                self.client.table("autofill_patterns")\
                    .update({
                        "frecuencia": current_freq + 1,
                        "last_used_at": datetime.now().isoformat(),
                        "contexto": contexto
                    })\
                    .eq("id", pattern_id)\
                    .execute()
            else:
                # Insert new pattern
                self.client.table("autofill_patterns")\
                    .insert({
                        "doctor_id": doctor_id,
                        "campo": campo,
                        "valor": valor,
                        "frecuencia": 1,
                        "contexto": contexto,
                        "confidence_score": 0.5,
                        "last_used_at": datetime.now().isoformat()
                    })\
                    .execute()

            return True
        except Exception as e:
            print(f"Error updating pattern frequency: {e}")
            return False

    def get_next_folio(self, tipo_dte: int, rut_empresa: str) -> Optional[int]:
        """
        Get next available folio for document type (atomic operation).

        Args:
            tipo_dte: Document type (33, 39, 61)
            rut_empresa: Company RUT

        Returns:
            Next folio number or None if exhausted
        """
        try:
            # Get active folio range
            response = self.client.table("folios_asignados")\
                .select("*")\
                .eq("tipo_dte", tipo_dte)\
                .eq("rut_empresa", rut_empresa)\
                .eq("estado", "activo")\
                .order("folio_actual", desc=False)\
                .limit(1)\
                .execute()

            if not response.data or len(response.data) == 0:
                raise ValueError(f"No active folios found for tipo_dte={tipo_dte}")

            folio_range = response.data[0]
            current_folio = folio_range["folio_actual"]
            next_folio = current_folio + 1

            # Check if exhausted
            if next_folio > folio_range["folio_hasta"]:
                # Mark as exhausted
                self.client.table("folios_asignados")\
                    .update({"estado": "agotado"})\
                    .eq("id", folio_range["id"])\
                    .execute()
                raise ValueError(f"Folios exhausted for tipo_dte={tipo_dte}")

            # Update current folio (atomic)
            self.client.table("folios_asignados")\
                .update({"folio_actual": next_folio})\
                .eq("id", folio_range["id"])\
                .execute()

            return next_folio
        except Exception as e:
            print(f"Error getting next folio: {e}")
            return None

    def log_sii_operation(
        self,
        doctor_id: str,
        tipo_operacion: str,
        documento_tipo: int,
        documento_folio: int,
        track_id: Optional[str],
        estado: str,
        mensaje: str,
        duracion_ms: int,
        metadata: Dict
    ):
        """
        Log SII operation for audit trail.

        Args:
            doctor_id: Doctor's UUID
            tipo_operacion: Operation type (generar_xml, firmar_dte, enviar_sii, etc.)
            documento_tipo: Document type
            documento_folio: Folio number
            track_id: SII Track ID (if applicable)
            estado: Status (exito, error)
            mensaje: Result message
            duracion_ms: Operation duration in milliseconds
            metadata: Additional metadata
        """
        try:
            self.client.table("logs_sii")\
                .insert({
                    "doctor_id": doctor_id,
                    "tipo_operacion": tipo_operacion,
                    "documento_tipo": documento_tipo,
                    "documento_folio": documento_folio,
                    "track_id": track_id,
                    "estado": estado,
                    "mensaje": mensaje,
                    "duracion_ms": duracion_ms,
                    "metadata": metadata,
                    "created_at": datetime.now().isoformat()
                })\
                .execute()
        except Exception as e:
            print(f"Error logging SII operation: {e}")

    def save_invoice(
        self,
        tipo_dte: int,
        folio: int,
        emisor_rut: str,
        receptor_rut: str,
        monto_neto: float,
        monto_iva: float,
        monto_total: float,
        xml_dte: str,
        track_id: str,
        estado_sii: str = "pendiente"
    ) -> Optional[str]:
        """
        Save generated invoice to database.

        Returns:
            Invoice ID (UUID)
        """
        try:
            table_name = "boletas_electronicas" if tipo_dte == 39 else "facturas_electronicas"

            response = self.client.table(table_name)\
                .insert({
                    "folio": folio,
                    "emisor_rut": emisor_rut,
                    "receptor_rut": receptor_rut,
                    "fecha_emision": datetime.now().isoformat(),
                    "monto_neto": monto_neto,
                    "monto_iva": monto_iva,
                    "monto_total": monto_total,
                    "xml_dte": xml_dte,
                    "track_id": track_id,
                    "estado_sii": estado_sii,
                    "glosa_estado": "Documento generado, pendiente envío a SII"
                })\
                .execute()

            if response.data and len(response.data) > 0:
                return response.data[0]["id"]
            return None
        except Exception as e:
            print(f"Error saving invoice: {e}")
            return None
