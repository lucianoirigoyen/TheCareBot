"use client";

/**
 * PDF Preview Demo Page
 *
 * Standalone page to test the PDFPreviewScreen component
 * with mock Chilean SII invoice data.
 *
 * Access at: http://localhost:3000/facturacion/preview-demo
 */

import React from "react";
import { PDFPreviewScreen } from "@/components/facturacion/PDFPreviewScreen";
import { useRouter } from "next/navigation";
import type { PDFGeneratorOptions } from "@/utils/pdf-generator-sii";

export default function PDFPreviewDemoPage() {
  const router = useRouter();

  // Mock invoice data for testing
  const mockInvoiceData: PDFGeneratorOptions = {
    tipoDTE: 39, // Boleta Electrónica
    folio: "000123",
    fechaEmision: new Date().toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    emisor: {
      rut: "76.123.456-7",
      razonSocial: "Clínica Dental Dr. Pérez y Asociados",
      direccion: "Av. Providencia 1234, Oficina 501",
      comuna: "Providencia",
      giro: "Servicios Odontológicos y Salud Dental",
    },
    receptor: {
      rut: "20.210.808-K",
      razonSocial: "Roberto Carlos Fuentes Sánchez",
      direccion: "Av. Vitacura 3456, Departamento 1202, Vitacura",
    },
    detalles: [
      {
        descripcion: "Limpieza dental profesional con ultrasonido",
        cantidad: 1,
        precio: 35000,
        total: 35000,
      },
      {
        descripcion: "Control preventivo y revisión general",
        cantidad: 1,
        precio: 10000,
        total: 10000,
      },
      {
        descripcion: "Aplicación de flúor para prevención",
        cantidad: 1,
        precio: 8000,
        total: 8000,
      },
    ],
    totales: {
      neto: 44538, // Total sin IVA
      iva: 8462, // 19% IVA
      total: 53000,
    },
    trackId: "ABC123-456789-XYZ-2025", // Mock SII tracking ID
  };

  // Handlers
  const handleAcceptAndDownload = () => {
    console.log("✅ PDF accepted and downloaded!");
    alert("¡PDF aceptado y descargado exitosamente!");
    // In real app: Navigate to success page or dashboard
    // router.push("/facturacion/exitoso");
  };

  const handleBackToEdit = () => {
    console.log("⬅️ Returning to edit mode");
    // In real app: Navigate back to invoice form
    router.push("/facturacion/nueva");
  };

  return (
    <PDFPreviewScreen
      invoiceData={mockInvoiceData}
      onAcceptAndDownload={handleAcceptAndDownload}
      onBackToEdit={handleBackToEdit}
      filename="Boleta_Demo_123_2025.pdf"
    />
  );
}
