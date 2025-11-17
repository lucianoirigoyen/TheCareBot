"use client";

/**
 * PDF Preview Screen Component
 *
 * Professional PDF preview interface for Chilean SII invoices.
 * Features:
 * - Full-screen PDF viewer with iframe
 * - Zoom controls and pagination (if PDF library supports it)
 * - Accept/Download and Edit actions
 * - Responsive design with mobile support
 * - Integration with InvoiceWizardAI workflow
 *
 * @component PDFPreviewScreen
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  Download,
  ArrowLeft,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  FileText,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  generateSIIPDF,
  downloadPDF,
  createPDFObjectURL,
  generatePDFFilename,
  type PDFGeneratorOptions,
  type DetalleItem,
} from "@/utils/pdf-generator-sii";

// ============ TYPE DEFINITIONS ============

interface PDFPreviewScreenProps {
  /** Invoice data for PDF generation */
  invoiceData: PDFGeneratorOptions;

  /** Callback when user accepts and downloads PDF */
  onAcceptAndDownload?: () => void;

  /** Callback when user wants to go back to edit */
  onBackToEdit?: () => void;

  /** Optional: Pre-generated PDF blob (if already generated) */
  pdfBlob?: Blob;

  /** Optional: Custom filename */
  filename?: string;
}

// ============ MAIN COMPONENT ============

export function PDFPreviewScreen({
  invoiceData,
  onAcceptAndDownload,
  onBackToEdit,
  pdfBlob: initialPdfBlob,
  filename: customFilename,
}: PDFPreviewScreenProps) {
  // State management
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(initialPdfBlob || null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initialPdfBlob);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(100);

  // Generate PDF on mount if not provided
  useEffect(() => {
    if (initialPdfBlob) {
      const url = createPDFObjectURL(initialPdfBlob);
      setPdfUrl(url);
      setLoading(false);
    } else {
      generatePDFDocument();
    }

    // Cleanup URL on unmount
    return () => {
      if (pdfUrl) {
        window.URL.revokeObjectURL(pdfUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Generate PDF document
  const generatePDFDocument = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Small delay to show loading state
      await new Promise((resolve) => setTimeout(resolve, 500));

      const { blob, metadata } = generateSIIPDF(invoiceData);

      setPdfBlob(blob);
      const url = createPDFObjectURL(blob);
      setPdfUrl(url);

      console.log("✅ PDF Generated:", metadata);
    } catch (err) {
      console.error("❌ PDF Generation Error:", err);
      setError(
        err instanceof Error ? err.message : "Error al generar el PDF"
      );
    } finally {
      setLoading(false);
    }
  }, [invoiceData]);

  // Handle download
  const handleDownload = useCallback(() => {
    if (!pdfBlob) return;

    const filename =
      customFilename ||
      generatePDFFilename(
        invoiceData.tipoDTE,
        invoiceData.folio,
        invoiceData.receptor.rut
      );

    downloadPDF(pdfBlob, filename);
  }, [pdfBlob, customFilename, invoiceData]);

  // Handle accept and download
  const handleAcceptAndDownload = useCallback(() => {
    handleDownload();
    onAcceptAndDownload?.();
  }, [handleDownload, onAcceptAndDownload]);

  // Handle back to edit
  const handleBackToEdit = useCallback(() => {
    onBackToEdit?.();
  }, [onBackToEdit]);

  // Zoom controls
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));
  const handleResetZoom = () => setZoom(100);

  // Fullscreen toggle
  const toggleFullscreen = () => setIsFullscreen((prev) => !prev);

  // Calculate totals for summary
  const totals = invoiceData.totales;
  const itemCount = invoiceData.detalles.length;

  // ============ RENDER ============

  return (
    <div
      className={cn(
        "min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8 px-4 transition-all",
        isFullscreen && "fixed inset-0 z-50 bg-white py-0 px-0"
      )}
    >
      <div
        className={cn(
          "container mx-auto max-w-7xl",
          isFullscreen && "max-w-full h-full flex flex-col"
        )}
      >
        {/* Header Section */}
        {!isFullscreen && (
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">
                Previsualización de Boleta SII
              </h1>
            </div>
            <p className="text-gray-600">
              Revise el documento antes de aceptar y descargar
            </p>
          </div>
        )}

        {/* Main Content Grid */}
        <div
          className={cn(
            "grid gap-6",
            isFullscreen
              ? "grid-cols-1 h-full"
              : "lg:grid-cols-[1fr_380px] grid-cols-1"
          )}
        >
          {/* PDF Viewer Section */}
          <Card
            className={cn(
              "shadow-xl border-2",
              isFullscreen && "rounded-none border-0 flex-1 flex flex-col"
            )}
          >
            <CardHeader className={cn(isFullscreen && "py-4")}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Eye className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-xl">
                    Vista Previa del Documento
                  </CardTitle>
                </div>

                {/* Viewer Controls */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleZoomOut}
                    disabled={zoom <= 50}
                    title="Reducir zoom"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetZoom}
                    title="Restablecer zoom"
                  >
                    <span className="text-xs font-mono">{zoom}%</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleZoomIn}
                    disabled={zoom >= 200}
                    title="Aumentar zoom"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>

                  <div className="w-px h-6 bg-gray-300 mx-1" />

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleFullscreen}
                    title={
                      isFullscreen ? "Salir pantalla completa" : "Pantalla completa"
                    }
                  >
                    {isFullscreen ? (
                      <Minimize2 className="h-4 w-4" />
                    ) : (
                      <Maximize2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent
              className={cn(
                "p-0",
                isFullscreen && "flex-1 flex flex-col"
              )}
            >
              {/* Loading State */}
              {loading && (
                <div className="flex flex-col items-center justify-center h-[600px] bg-gray-50">
                  <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                  <p className="text-lg font-semibold text-gray-700">
                    Generando PDF...
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Aplicando formato oficial SII
                  </p>
                </div>
              )}

              {/* Error State */}
              {error && !loading && (
                <div className="flex flex-col items-center justify-center h-[600px] bg-red-50">
                  <AlertCircle className="h-12 w-12 text-red-600 mb-4" />
                  <p className="text-lg font-semibold text-red-700 mb-2">
                    Error al generar PDF
                  </p>
                  <p className="text-sm text-red-600 mb-4">{error}</p>
                  <Button onClick={generatePDFDocument} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reintentar
                  </Button>
                </div>
              )}

              {/* PDF Viewer */}
              {pdfUrl && !loading && !error && (
                <div
                  className={cn(
                    "bg-gray-100 rounded-b-lg overflow-hidden",
                    isFullscreen && "rounded-none h-full"
                  )}
                  style={{
                    height: isFullscreen ? "100%" : "calc(100vh - 300px)",
                    minHeight: isFullscreen ? "100%" : "600px",
                  }}
                >
                  <iframe
                    src={pdfUrl}
                    className="w-full h-full border-0"
                    title="PDF Preview"
                    style={{
                      transform: `scale(${zoom / 100})`,
                      transformOrigin: "top center",
                      width: `${(100 / zoom) * 100}%`,
                      height: `${(100 / zoom) * 100}%`,
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Panel (hidden in fullscreen) */}
          {!isFullscreen && (
            <div className="space-y-6">
              {/* Document Summary Card */}
              <Card className="border-2 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                    Resumen del Documento
                  </CardTitle>
                  <CardDescription>
                    Información de la boleta generada
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Document Info */}
                  <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Tipo</span>
                      <Badge variant="outline" className="bg-white">
                        {invoiceData.tipoDTE === 39
                          ? "Boleta Electrónica"
                          : invoiceData.tipoDTE === 33
                          ? "Factura Electrónica"
                          : "Nota de Crédito"}
                      </Badge>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Folio</span>
                      <span className="font-mono font-bold text-gray-900">
                        {invoiceData.folio}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Fecha</span>
                      <span className="font-medium text-gray-900">
                        {invoiceData.fechaEmision}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Items</span>
                      <span className="font-medium text-gray-900">
                        {itemCount} servicio{itemCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Neto</span>
                      <span className="font-semibold">
                        ${totals.neto.toLocaleString("es-CL")}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">IVA (19%)</span>
                      <span className="font-semibold">
                        ${totals.iva.toLocaleString("es-CL")}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>TOTAL</span>
                      <span className="text-blue-600">
                        ${totals.total.toLocaleString("es-CL")}
                      </span>
                    </div>
                  </div>

                  {/* Client Info */}
                  <div className="border-t pt-4">
                    <p className="text-xs text-gray-500 mb-2">Cliente</p>
                    <p className="font-medium text-gray-900 text-sm">
                      {invoiceData.receptor.razonSocial}
                    </p>
                    <p className="text-xs text-gray-600 font-mono mt-1">
                      RUT: {invoiceData.receptor.rut}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <Card className="border-2 border-green-200 bg-green-50 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg text-green-800">
                    Acciones del Documento
                  </CardTitle>
                  <CardDescription className="text-green-700">
                    Acepte o edite el documento
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Accept and Download */}
                  <Button
                    onClick={handleAcceptAndDownload}
                    disabled={!pdfBlob || loading}
                    className="w-full h-14 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transition-all"
                    size="lg"
                  >
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Aceptar y Descargar PDF
                  </Button>

                  {/* Download Only */}
                  <Button
                    onClick={handleDownload}
                    disabled={!pdfBlob || loading}
                    variant="outline"
                    className="w-full h-12 border-2"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Solo Descargar
                  </Button>

                  {/* Back to Edit */}
                  <Button
                    onClick={handleBackToEdit}
                    variant="ghost"
                    className="w-full h-12 text-gray-700 hover:bg-gray-200"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Volver a Editar
                  </Button>
                </CardContent>
              </Card>

              {/* Help Card */}
              <Card className="border border-blue-200 bg-blue-50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-semibold mb-1">Documento Oficial SII</p>
                      <p className="text-xs leading-relaxed">
                        Este PDF cumple con el formato oficial del Servicio de
                        Impuestos Internos de Chile. Puede verificar el timbre
                        electrónico en www.sii.cl
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Fullscreen Actions (shown only in fullscreen) */}
        {isFullscreen && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl p-4 z-50">
            <div className="container mx-auto flex items-center justify-between gap-4">
              <Button onClick={toggleFullscreen} variant="outline">
                <Minimize2 className="h-4 w-4 mr-2" />
                Salir de Pantalla Completa
              </Button>

              <div className="flex gap-3">
                <Button onClick={handleBackToEdit} variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver a Editar
                </Button>

                <Button
                  onClick={handleDownload}
                  disabled={!pdfBlob || loading}
                  variant="outline"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar
                </Button>

                <Button
                  onClick={handleAcceptAndDownload}
                  disabled={!pdfBlob || loading}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Aceptar y Descargar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
