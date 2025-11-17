/**
 * PDF Generator for Chilean SII Invoices (Boletas Electrónicas)
 *
 * Compliant with Chilean tax regulations (Servicio de Impuestos Internos - SII)
 * Generates official-format PDFs for Boletas, Facturas, and Notas de Crédito
 *
 * Features:
 * - Official SII format with proper headers and structure
 * - Chilean currency formatting (dots as thousand separators)
 * - Electronic stamp (Timbre Electrónico) section
 * - Metadata tracking with generation timestamp
 * - Professional layout with proper spacing and typography
 *
 * @requires jspdf - npm install jspdf
 * @module pdf-generator-sii
 */

import { jsPDF } from "jspdf";

// ============ TYPE DEFINITIONS ============

export interface DetalleItem {
  descripcion: string;
  cantidad: number;
  precio: number;
  total: number;
}

export interface EmisorData {
  rut: string;
  razonSocial: string;
  direccion: string;
  comuna: string;
  giro: string;
}

export interface ReceptorData {
  rut: string;
  razonSocial: string;
  direccion?: string;
}

export interface TotalesData {
  neto: number;
  iva: number;
  total: number;
}

export interface PDFGeneratorOptions {
  tipoDTE: number;           // 39 = Boleta, 33 = Factura, 61 = Nota de Crédito
  folio: string;
  fechaEmision: string;
  emisor: EmisorData;
  receptor: ReceptorData;
  detalles: DetalleItem[];
  totales: TotalesData;
  trackId?: string;           // SII tracking ID for electronic stamp
}

export interface PDFMetadata {
  createdAt: string;
  tipoDTE: number;
  folio: string;
  total: number;
}

// ============ MAIN PDF GENERATION FUNCTION ============

/**
 * Generates a professional PDF document for Chilean SII invoices
 * Returns both the Blob and metadata for tracking
 */
export function generateSIIPDF(options: PDFGeneratorOptions): { blob: Blob; metadata: PDFMetadata } {
  const {
    tipoDTE,
    folio,
    fechaEmision,
    emisor,
    receptor,
    detalles,
    totales,
    trackId,
  } = options;

  // Initialize PDF document (A4 portrait)
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;

  // Document type name mapping
  const tipoDocName = getTipoDocumentoName(tipoDTE);

  // ============ RENDER DOCUMENT SECTIONS ============

  yPosition = renderHeader(doc, pageWidth, yPosition, margin, emisor, tipoDocName, folio);
  yPosition = renderEmisorSection(doc, pageWidth, yPosition, margin, emisor);
  yPosition = renderFechaReceptorSection(doc, pageWidth, yPosition, margin, fechaEmision, receptor);
  yPosition = renderDetalleTable(doc, pageWidth, yPosition, margin, detalles);
  yPosition = renderTotalesSection(doc, pageWidth, yPosition, margin, totales);

  if (trackId) {
    yPosition = renderTimbreElectronico(doc, pageWidth, yPosition, margin, trackId);
  }

  renderFooter(doc, pageWidth, pageHeight);

  // Generate metadata
  const metadata: PDFMetadata = {
    createdAt: new Date().toISOString(),
    tipoDTE,
    folio,
    total: totales.total,
  };

  // Return blob and metadata
  const blob = doc.output("blob");
  return { blob, metadata };
}

// ============ RENDERING FUNCTIONS ============

function renderHeader(
  doc: jsPDF,
  pageWidth: number,
  yPosition: number,
  margin: number,
  emisor: EmisorData,
  tipoDocName: string,
  folio: string
): number {
  const boxWidth = 170;
  const boxHeight = 35;
  const boxX = (pageWidth - boxWidth) / 2;

  // Background box
  doc.setFillColor(240, 240, 240);
  doc.rect(boxX, yPosition, boxWidth, boxHeight, "F");

  // Border
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.8);
  doc.rect(boxX, yPosition, boxWidth, boxHeight, "S");

  // RUT line
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`R.U.T.: ${emisor.rut}`, pageWidth / 2, yPosition + 9, {
    align: "center",
  });

  // Document type
  doc.setFontSize(16);
  doc.text(tipoDocName, pageWidth / 2, yPosition + 19, { align: "center" });

  // Folio number
  doc.setFontSize(14);
  doc.text(`Nº ${folio}`, pageWidth / 2, yPosition + 29, { align: "center" });

  return yPosition + boxHeight + 10;
}

function renderEmisorSection(
  doc: jsPDF,
  pageWidth: number,
  yPosition: number,
  margin: number,
  emisor: EmisorData
): number {
  const sectionHeight = 35;

  // Border
  doc.setLineWidth(0.5);
  doc.rect(margin, yPosition, pageWidth - 2 * margin, sectionHeight, "S");

  // Content
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(emisor.razonSocial, margin + 5, yPosition + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Giro: ${emisor.giro}`, margin + 5, yPosition + 15);
  doc.text(`Dirección: ${emisor.direccion}`, margin + 5, yPosition + 22);
  doc.text(`Comuna: ${emisor.comuna}`, margin + 5, yPosition + 29);

  return yPosition + sectionHeight + 8;
}

function renderFechaReceptorSection(
  doc: jsPDF,
  pageWidth: number,
  yPosition: number,
  margin: number,
  fechaEmision: string,
  receptor: ReceptorData
): number {
  const sectionHeight = receptor.direccion ? 32 : 25;

  // Border
  doc.setLineWidth(0.5);
  doc.rect(margin, yPosition, pageWidth - 2 * margin, sectionHeight, "S");

  // Content
  doc.setFontSize(10);
  let lineY = yPosition + 7;

  // Fecha
  doc.setFont("helvetica", "bold");
  doc.text("Fecha Emisión:", margin + 5, lineY);
  doc.setFont("helvetica", "normal");
  doc.text(fechaEmision, margin + 40, lineY);

  lineY += 7;

  // Receptor name
  doc.setFont("helvetica", "bold");
  doc.text("Señor(es):", margin + 5, lineY);
  doc.setFont("helvetica", "normal");
  doc.text(receptor.razonSocial, margin + 30, lineY);

  lineY += 7;

  // RUT
  doc.setFont("helvetica", "bold");
  doc.text("R.U.T.:", margin + 5, lineY);
  doc.setFont("helvetica", "normal");
  doc.text(receptor.rut, margin + 30, lineY);

  // Dirección (optional)
  if (receptor.direccion) {
    lineY += 7;
    doc.setFont("helvetica", "bold");
    doc.text("Dirección:", margin + 5, lineY);
    doc.setFont("helvetica", "normal");
    doc.text(receptor.direccion, margin + 30, lineY);
  }

  return yPosition + sectionHeight + 8;
}

function renderDetalleTable(
  doc: jsPDF,
  pageWidth: number,
  yPosition: number,
  margin: number,
  detalles: DetalleItem[]
): number {
  const colWidths = {
    cantidad: 20,
    descripcion: 100,
    precioUnit: 35,
    total: 35,
  };

  // Table header
  const headerHeight = 10;
  doc.setFillColor(230, 230, 230);
  doc.rect(margin, yPosition, pageWidth - 2 * margin, headerHeight, "F");
  doc.setLineWidth(0.5);
  doc.rect(margin, yPosition, pageWidth - 2 * margin, headerHeight, "S");

  // Header text
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  let xPos = margin;

  doc.text("Cant.", xPos + colWidths.cantidad / 2, yPosition + 6.5, {
    align: "center",
  });
  xPos += colWidths.cantidad;

  doc.text("Descripción", xPos + 4, yPosition + 6.5);
  xPos += colWidths.descripcion;

  doc.text("Precio Unitario", xPos + colWidths.precioUnit / 2, yPosition + 6.5, {
    align: "center",
  });
  xPos += colWidths.precioUnit;

  doc.text("Total", xPos + colWidths.total / 2, yPosition + 6.5, {
    align: "center",
  });

  yPosition += headerHeight;

  // Table rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  detalles.forEach((detalle, index) => {
    const rowHeight = 10;

    // Alternar color de fondo para mejor legibilidad
    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, yPosition, pageWidth - 2 * margin, rowHeight, "F");
    }

    // Row border
    doc.setLineWidth(0.3);
    doc.rect(margin, yPosition, pageWidth - 2 * margin, rowHeight, "S");

    xPos = margin;

    // Cantidad (centrada, en negrita)
    doc.setFont("helvetica", "bold");
    doc.text(
      String(detalle.cantidad),
      xPos + colWidths.cantidad / 2,
      yPosition + 6.5,
      { align: "center" }
    );
    xPos += colWidths.cantidad;

    // Descripción (izquierda, normal)
    doc.setFont("helvetica", "normal");
    const maxLength = 60;
    const descripcionText = detalle.descripcion.length > maxLength
      ? detalle.descripcion.substring(0, maxLength - 3) + "..."
      : detalle.descripcion;
    doc.text(descripcionText, xPos + 4, yPosition + 6.5);
    xPos += colWidths.descripcion;

    // Precio Unitario (derecha, con espacio después del $)
    doc.text(
      `$ ${formatCurrency(detalle.precio)}`,
      xPos + colWidths.precioUnit - 4,
      yPosition + 6.5,
      { align: "right" }
    );
    xPos += colWidths.precioUnit;

    // Total (derecha, en negrita)
    doc.setFont("helvetica", "bold");
    doc.text(
      `$ ${formatCurrency(detalle.total)}`,
      xPos + colWidths.total - 4,
      yPosition + 6.5,
      { align: "right" }
    );

    yPosition += rowHeight;
  });

  return yPosition + 10;
}

function renderTotalesSection(
  doc: jsPDF,
  pageWidth: number,
  yPosition: number,
  margin: number,
  totales: TotalesData
): number {
  const totalesX = pageWidth - margin - 65;
  const labelWidth = 35;
  const valueWidth = 30;

  doc.setFontSize(10);

  // Neto
  doc.setFont("helvetica", "normal");
  doc.text("Neto:", totalesX, yPosition, { align: "right" });
  doc.text(`$ ${formatCurrency(totales.neto)}`, totalesX + labelWidth + valueWidth, yPosition, {
    align: "right",
  });
  yPosition += 7;

  // IVA
  doc.text("IVA 19%:", totalesX, yPosition, { align: "right" });
  doc.text(`$ ${formatCurrency(totales.iva)}`, totalesX + labelWidth + valueWidth, yPosition, {
    align: "right",
  });
  yPosition += 8;

  // Line above total
  doc.setLineWidth(0.8);
  doc.line(totalesX - 5, yPosition - 3, pageWidth - margin, yPosition - 3);

  // Total (bold with background)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setFillColor(245, 245, 245);
  const totalBoxY = yPosition - 5;
  doc.rect(totalesX - 8, totalBoxY, labelWidth + valueWidth + 13, 10, "F");
  doc.setLineWidth(0.8);
  doc.rect(totalesX - 8, totalBoxY, labelWidth + valueWidth + 13, 10, "S");

  doc.text("TOTAL:", totalesX, yPosition, { align: "right" });
  doc.text(`$ ${formatCurrency(totales.total)}`, totalesX + labelWidth + valueWidth, yPosition, {
    align: "right",
  });

  return yPosition + 15;
}

function renderTimbreElectronico(
  doc: jsPDF,
  pageWidth: number,
  yPosition: number,
  margin: number,
  trackId: string
): number {
  const boxHeight = 25;

  // Border
  doc.setLineWidth(0.5);
  doc.setDrawColor(0, 0, 0);
  doc.rect(margin, yPosition, pageWidth - 2 * margin, boxHeight, "S");

  // Title
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("TIMBRE ELECTRÓNICO SII", pageWidth / 2, yPosition + 8, {
    align: "center",
  });

  // Track ID
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Track ID: ${trackId}`, pageWidth / 2, yPosition + 15, {
    align: "center",
  });

  // Verification message
  doc.text(
    "Documento verificable en www.sii.cl",
    pageWidth / 2,
    yPosition + 21,
    { align: "center" }
  );

  return yPosition + boxHeight + 5;
}

function renderFooter(doc: jsPDF, pageWidth: number, pageHeight: number): void {
  const footerY = pageHeight - 15;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);

  const now = new Date();
  const dateStr = now.toLocaleDateString("es-CL");
  const timeStr = now.toLocaleTimeString("es-CL");

  doc.text(
    `Generado el ${dateStr} a las ${timeStr}`,
    pageWidth / 2,
    footerY,
    { align: "center" }
  );

  doc.text(
    "🤖 Generado con IA - TheCareBot Medical Assistant",
    pageWidth / 2,
    footerY + 4,
    { align: "center" }
  );
}

// ============ UTILITY FUNCTIONS ============

function getTipoDocumentoName(tipoDTE: number): string {
  switch (tipoDTE) {
    case 39:
      return "BOLETA ELECTRÓNICA";
    case 33:
      return "FACTURA ELECTRÓNICA";
    case 61:
      return "NOTA DE CRÉDITO ELECTRÓNICA";
    default:
      return "DOCUMENTO TRIBUTARIO ELECTRÓNICO";
  }
}

/**
 * Formats a number as Chilean currency (using dots as thousand separators)
 */
function formatCurrency(amount: number): string {
  return Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Downloads a PDF blob with a specified filename
 */
export function downloadPDF(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Opens a PDF blob in a new browser tab for preview
 */
export function viewPDFInNewTab(blob: Blob): void {
  const url = window.URL.createObjectURL(blob);
  window.open(url, "_blank");
}

/**
 * Creates an object URL from a PDF blob for use in iframe
 */
export function createPDFObjectURL(blob: Blob): string {
  return window.URL.createObjectURL(blob);
}

/**
 * Generates a filename for the PDF based on invoice data
 */
export function generatePDFFilename(
  tipoDTE: number,
  folio: string,
  receptorRut: string
): string {
  const tipoDoc =
    tipoDTE === 39 ? "Boleta" : tipoDTE === 33 ? "Factura" : "NotaCredito";
  const timestamp = new Date().toISOString().split("T")[0].replace(/-/g, "");
  const rutClean = receptorRut.replace(/\./g, "").replace(/-/g, "");
  return `${tipoDoc}_${folio}_${rutClean}_${timestamp}.pdf`;
}
