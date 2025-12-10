/**
 * Invoice Service
 *
 * Handles all invoice-related API calls to Python backend for Chilean SII (tax authority) integration.
 * Provides type-safe methods for generating invoices, PDFs, and email delivery.
 *
 * @module InvoiceService
 *
 * Features:
 * - Chilean electronic invoice (boleta electrónica) generation
 * - PDF generation with SII-compliant format
 * - Email delivery with attachments
 * - Automatic timeout handling (30s)
 * - Type-safe error handling
 *
 * @example
 * ```typescript
 * import { invoiceService } from '@/services/invoice.service';
 *
 * const result = await invoiceService.generateInvoice({
 *   doctor_id: '550e8400-e29b-41d4-a716-446655440000',
 *   tipo_dte: 39, // Boleta electrónica
 *   receptor_rut: '12.345.678-9',
 *   receptor_razon_social: 'Juan Pérez',
 *   receptor_direccion: 'Av. Providencia 123, Santiago',
 *   detalles: [
 *     {
 *       descripcion: 'Consulta médica',
 *       cantidad: 1,
 *       precio: 50000,
 *       total: 50000
 *     }
 *   ]
 * });
 * ```
 */

import { API_CONFIG } from '@/config/api';
import { APIError, NetworkError } from '@/lib/errors';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Invoice data structure for Chilean electronic invoicing (SII)
 */
export interface InvoiceData {
  /** Doctor's UUID from authentication context */
  doctor_id: string;

  /** Chilean document type (39 = Boleta Electrónica, 33 = Factura Electrónica) */
  tipo_dte: number;

  /** Patient's Chilean RUT with format XX.XXX.XXX-Y */
  receptor_rut: string;

  /** Patient's full legal name */
  receptor_razon_social: string;

  /** Patient's full address */
  receptor_direccion: string;

  /** Line items for the invoice */
  detalles: DetalleItem[];
}

/**
 * Single line item in an invoice
 */
export interface DetalleItem {
  /** Service or product description */
  descripcion: string;

  /** Quantity (must be positive integer) */
  cantidad: number;

  /** Unit price in Chilean Pesos (CLP) */
  precio: number;

  /** Total amount (cantidad * precio) */
  total: number;
}

/**
 * Result from invoice generation operation
 */
export interface InvoiceResult {
  /** Whether the operation succeeded */
  success: boolean;

  /** Chilean SII folio number (unique invoice ID) */
  folio?: string;

  /** Internal tracking ID for the invoice */
  track_id?: string;

  /** Total invoice amount including VAT (IVA 19%) */
  monto_total?: number;

  /** Current status in SII system */
  estado_sii?: string;

  /** Array of error messages if operation failed */
  errors?: string[];
}

// ============================================================================
// SERVICE
// ============================================================================

class InvoiceService {
  private readonly baseUrl = API_CONFIG.python.baseUrl;
  private readonly timeout = API_CONFIG.python.timeout;

  /**
   * Generate Chilean electronic invoice (boleta electrónica)
   *
   * Sends invoice data to Python backend for SII processing.
   *
   * @param data - Invoice data including doctor ID, patient info, and line items
   * @returns Promise resolving to invoice result with folio and tracking info
   * @throws {APIError} If the backend returns an error status
   * @throws {NetworkError} If unable to connect to Python backend
   *
   * @example
   * ```typescript
   * const result = await invoiceService.generateInvoice({
   *   doctor_id: doctorUuid,
   *   tipo_dte: 39,
   *   receptor_rut: '12.345.678-9',
   *   receptor_razon_social: 'Juan Pérez',
   *   receptor_direccion: 'Av. Providencia 123',
   *   detalles: [{ descripcion: 'Consulta', cantidad: 1, precio: 50000, total: 50000 }]
   * });
   *
   * if (result.success) {
   *   console.log(`Invoice generated: ${result.folio}`);
   * }
   * ```
   */
  async generateInvoice(data: InvoiceData): Promise<InvoiceResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}${API_CONFIG.python.endpoints.generateInvoice}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
          signal: AbortSignal.timeout(this.timeout),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new APIError(
          result.errors?.join(', ') || 'Error al generar boleta',
          response.status,
          result
        );
      }

      return result;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new NetworkError(
        'Unable to connect to Python backend server. Please verify it is running.',
        error
      );
    }
  }

  /**
   * Generate PDF document for a Chilean electronic invoice
   *
   * Creates a SII-compliant PDF with invoice details, QR code, and official formatting.
   *
   * @param data - Invoice data with optional folio and tracking ID from previous generation
   * @returns Promise resolving to PDF Blob for download or display
   * @throws {APIError} If PDF generation fails
   * @throws {NetworkError} If unable to connect to Python backend
   *
   * @example
   * ```typescript
   * const pdfBlob = await invoiceService.generateInvoicePDF({
   *   ...invoiceData,
   *   folio: '000123',
   *   track_id: 'abc-123'
   * });
   *
   * // Download PDF
   * const url = URL.createObjectURL(pdfBlob);
   * const link = document.createElement('a');
   * link.href = url;
   * link.download = `boleta-${folio}.pdf`;
   * link.click();
   * ```
   */
  async generateInvoicePDF(data: InvoiceData & { folio?: string | undefined; track_id?: string | undefined }): Promise<Blob> {
    try {
      const response = await fetch(
        `${this.baseUrl}${API_CONFIG.python.endpoints.generateInvoicePDF}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
          signal: AbortSignal.timeout(this.timeout),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new APIError(
          errorData.error || 'Error al generar PDF',
          response.status,
          errorData
        );
      }

      return await response.blob();
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new NetworkError(
        'No se pudo generar el PDF',
        error
      );
    }
  }

  /**
   * Send invoice PDF via email
   *
   * Sends the generated invoice PDF to the specified email address with professional formatting.
   *
   * @param data - Invoice data with recipient email address
   * @returns Promise resolving to success status
   * @throws {APIError} If email sending fails
   * @throws {NetworkError} If unable to connect to Python backend
   *
   * @example
   * ```typescript
   * const result = await invoiceService.sendInvoiceEmail({
   *   ...invoiceData,
   *   folio: '000123',
   *   track_id: 'abc-123',
   *   email_to: 'patient@example.com'
   * });
   *
   * if (result.success) {
   *   console.log('Email sent successfully');
   * }
   * ```
   */
  async sendInvoiceEmail(
    data: InvoiceData & { folio?: string | undefined; track_id?: string | undefined; email_to: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(
        `${this.baseUrl}${API_CONFIG.python.endpoints.sendInvoiceEmail}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
          signal: AbortSignal.timeout(this.timeout),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new APIError(
          result.error || 'Error al enviar email',
          response.status,
          result
        );
      }

      return result;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new NetworkError(
        'No se pudo enviar el email',
        error
      );
    }
  }
}

export const invoiceService = new InvoiceService();
