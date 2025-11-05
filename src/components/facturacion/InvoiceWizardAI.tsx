"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AutocompleteInput } from "@/components/sii/AutocompleteInput";
import { CheckCircle2, Sparkles, User, FileText, Eye, Download, Loader2, ArrowRight, ArrowLeft, AlertCircle, Calendar, DollarSign, Mail, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DetalleItem {
  descripcion: string;
  cantidad: number;
  precio: number;
  total: number;
}

interface PatientData {
  rut: string;
  name: string;
  address: string;
  lastVisit?: {
    date: string;
    services: string[];
    total: number;
  };
  commonServices: string[];
}

type WizardStep = 1 | 2 | 3;

export function InvoiceWizardAI() {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Form state
  const [tipoDTE, setTipoDTE] = useState("39");
  const [receptorRut, setReceptorRut] = useState("");
  const [receptorRazonSocial, setReceptorRazonSocial] = useState("");
  const [receptorDireccion, setReceptorDireccion] = useState("");
  const [useLastVisit, setUseLastVisit] = useState(false);
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [detalles, setDetalles] = useState<DetalleItem[]>([
    { descripcion: "", cantidad: 1, precio: 0, total: 0 }
  ]);

  const doctorId = "550e8400-e29b-41d4-a716-446655440000";
  const contexto = {
    day_of_week: new Date().getDay(),
    period_of_day: new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"
  };

  // AI: Auto-fill patient data when RUT is entered
  const handleRutBlur = async () => {
    if (!receptorRut || receptorRut.length < 9) return;

    setAiLoading(true);
    try {
      // Simulate AI call to fetch patient data
      // In production: call /api/python/get-patient-data
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock patient data for 20.210.808-K
      if (receptorRut.includes("20.210.808") || receptorRut.includes("20210808")) {
        const mockData: PatientData = {
          rut: "20.210.808-K",
          name: "Roberto Carlos Fuentes Sánchez",
          address: "Av. Vitacura 3456, Vitacura",
          lastVisit: {
            date: "2025-01-03",
            services: ["Limpieza dental profesional", "Control preventivo"],
            total: 45000
          },
          commonServices: ["Limpieza dental profesional", "Control preventivo", "Consulta médica general"]
        };

        setPatientData(mockData);
        setReceptorRazonSocial(mockData.name);
        setReceptorDireccion(mockData.address);

        toast({
          title: "✨ Datos cargados con IA",
          description: `Paciente ${mockData.name} encontrado. Última visita: ${new Date(mockData.lastVisit!.date).toLocaleDateString('es-CL')}`,
        });
      } else {
        toast({
          title: "Paciente no encontrado",
          description: "Complete los datos manualmente o verifique el RUT",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error fetching patient:", error);
    } finally {
      setAiLoading(false);
    }
  };

  // AI: Auto-fill invoice from last visit
  const handleUseLastVisit = () => {
    if (!patientData?.lastVisit) return;

    const newDetalles: DetalleItem[] = patientData.lastVisit.services.map(service => ({
      descripcion: service,
      cantidad: 1,
      precio: service.includes("Limpieza") ? 35000 : 10000,
      total: service.includes("Limpieza") ? 35000 : 10000
    }));

    setDetalles(newDetalles);
    setUseLastVisit(true);

    toast({
      title: "✨ Boleta pre-llenada con IA",
      description: `${newDetalles.length} servicios de la última visita agregados`,
    });
  };

  const updateDetalle = (index: number, field: keyof DetalleItem, value: any) => {
    const updated = [...detalles];
    updated[index] = { ...updated[index], [field]: value };

    if (field === "cantidad" || field === "precio") {
      updated[index].total = updated[index].cantidad * updated[index].precio;
    }

    setDetalles(updated);
  };

  const addDetalle = () => {
    setDetalles([...detalles, { descripcion: "", cantidad: 1, precio: 0, total: 0 }]);
  };

  const removeDetalle = (index: number) => {
    if (detalles.length > 1) {
      setDetalles(detalles.filter((_, i) => i !== index));
    }
  };

  const calculateTotals = () => {
    const neto = detalles.reduce((sum, d) => sum + d.total, 0);
    const iva = neto * 0.19;
    const total = neto + iva;
    return { neto, iva, total };
  };

  const canProceedToStep2 = () => {
    return receptorRut && receptorRazonSocial;
  };

  const canProceedToStep3 = () => {
    return detalles.every(d => d.descripcion && d.cantidad > 0 && d.precio > 0);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setGenerated(false);

    try {
      const response = await fetch("http://localhost:8000/api/invoke/generate-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_id: doctorId,
          tipo_dte: parseInt(tipoDTE),
          receptor_rut: receptorRut,
          receptor_razon_social: receptorRazonSocial,
          receptor_direccion: receptorDireccion,
          detalles: detalles
        })
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
        setGenerated(true);
        toast({
          title: "✅ Boleta generada exitosamente",
          description: `Folio ${data.folio} - Listo para enviar al SII`,
        });
      } else {
        toast({
          title: "Error al generar boleta",
          description: data.errors?.join(", ") || "Error desconocido",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error de conexión",
        description: "Verifique que el servidor Python esté corriendo en puerto 8000",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState("");
  const [showEmailInput, setShowEmailInput] = useState(false);

  const viewPDF = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/invoke/generate-invoice-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_id: doctorId,
          tipo_dte: parseInt(tipoDTE),
          receptor_rut: receptorRut,
          receptor_razon_social: receptorRazonSocial,
          receptor_direccion: receptorDireccion,
          detalles: detalles,
          folio: result?.folio,
          track_id: result?.track_id
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        setPdfUrl(url);

        // Abrir en nueva pestaña
        window.open(url, '_blank');

        toast({
          title: "📄 PDF abierto",
          description: "El PDF se ha abierto en una nueva pestaña",
        });
      }
    } catch (error) {
      console.error("Error viewing PDF:", error);
      toast({
        title: "Error al visualizar PDF",
        description: "No se pudo abrir el PDF",
        variant: "destructive"
      });
    }
  };

  const downloadPDF = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/invoke/generate-invoice-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_id: doctorId,
          tipo_dte: parseInt(tipoDTE),
          receptor_rut: receptorRut,
          receptor_razon_social: receptorRazonSocial,
          receptor_direccion: receptorDireccion,
          detalles: detalles,
          folio: result?.folio,
          track_id: result?.track_id
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `boleta_${result?.folio || 'nueva'}_${receptorRut.replace(/\./g, '')}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: "✅ PDF descargado",
          description: "El PDF se ha guardado en tu dispositivo",
        });
      }
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast({
        title: "Error al descargar PDF",
        description: "No se pudo descargar el PDF",
        variant: "destructive"
      });
    }
  };

  const sendEmail = async () => {
    if (!emailRecipient || !emailRecipient.includes('@')) {
      toast({
        title: "Email inválido",
        description: "Por favor ingrese un email válido",
        variant: "destructive"
      });
      return;
    }

    setEmailLoading(true);
    try {
      const response = await fetch("http://localhost:8000/api/invoke/send-invoice-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_id: doctorId,
          tipo_dte: parseInt(tipoDTE),
          receptor_rut: receptorRut,
          receptor_razon_social: receptorRazonSocial,
          receptor_direccion: receptorDireccion,
          detalles: detalles,
          folio: result?.folio,
          track_id: result?.track_id,
          email_to: emailRecipient
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "📧 Email enviado",
          description: `Boleta enviada exitosamente a ${emailRecipient}`,
        });
        setShowEmailInput(false);
        setEmailRecipient("");
      } else {
        toast({
          title: "Error al enviar email",
          description: data.error || "No se pudo enviar el email",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error sending email:", error);
      toast({
        title: "Error de conexión",
        description: "No se pudo enviar el email",
        variant: "destructive"
      });
    } finally {
      setEmailLoading(false);
    }
  };

  const totals = calculateTotals();

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8 space-x-4">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
              currentStep === step
                ? "bg-blue-600 text-white shadow-lg scale-110"
                : currentStep > step
                ? "bg-green-600 text-white"
                : "bg-gray-200 text-gray-500"
            }`}
          >
            {currentStep > step ? <CheckCircle2 className="h-5 w-5" /> : step}
          </div>
          {step < 3 && (
            <div
              className={`w-16 h-1 mx-2 ${
                currentStep > step ? "bg-green-600" : "bg-gray-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  if (generated && result) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <Card className="border-green-500 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700 text-2xl">
              <CheckCircle2 className="h-6 w-6" />
              ¡Boleta Generada Exitosamente!
            </CardTitle>
            <CardDescription>Formato oficial SII - Lista para enviar al Servicio de Impuestos Internos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Folio SII</p>
                <p className="text-2xl font-bold text-gray-900">{result.folio}</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Monto Total</p>
                <p className="text-2xl font-bold text-green-600">${result.monto_total?.toLocaleString('es-CL')}</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Estado SII</p>
                <p className="font-semibold text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  {result.estado_sii}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Track ID</p>
                <p className="font-mono text-sm text-gray-700">{result.track_id}</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-blue-900 mb-2">📄 Documento con Formato Oficial SII</p>
              <p className="text-sm text-blue-700">
                El PDF generado cumple con todas las especificaciones del Servicio de Impuestos Internos de Chile.
                Incluye timbre electrónico y es verificable en www.sii.cl
              </p>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <Button onClick={viewPDF} variant="outline" className="h-12 border-2">
                  <Eye className="h-5 w-5 mr-2" />
                  Ver PDF
                </Button>
                <Button onClick={downloadPDF} className="h-12 bg-blue-600 hover:bg-blue-700">
                  <Download className="h-5 w-5 mr-2" />
                  Descargar
                </Button>
                <Button
                  onClick={() => setShowEmailInput(!showEmailInput)}
                  variant="outline"
                  className="h-12 border-2 border-purple-300 hover:bg-purple-50"
                >
                  <Mail className="h-5 w-5 mr-2" />
                  Enviar Email
                </Button>
              </div>

              {showEmailInput && (
                <div className="bg-white p-4 rounded-lg border-2 border-purple-300 space-y-3">
                  <Label htmlFor="email">Enviar boleta por email</Label>
                  <div className="flex gap-2">
                    <Input
                      id="email"
                      type="email"
                      value={emailRecipient}
                      onChange={(e) => setEmailRecipient(e.target.value)}
                      placeholder="paciente@ejemplo.com"
                      className="flex-1"
                      disabled={emailLoading}
                    />
                    <Button
                      onClick={sendEmail}
                      disabled={emailLoading || !emailRecipient}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {emailLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4 mr-2" />
                          Enviar
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    El PDF oficial del SII será enviado como archivo adjunto
                  </p>
                </div>
              )}

              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="w-full h-12"
              >
                <FileText className="h-5 w-5 mr-2" />
                Crear Nueva Boleta
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-blue-600" />
          Generador Inteligente de Boletas SII
        </h1>
        <p className="text-gray-600 mt-2">
          ✨ Usa IA para pre-llenar automáticamente los datos del paciente y servicios
        </p>
      </div>

      {renderStepIndicator()}

      {/* STEP 1: Patient Information */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Paso 1: Información del Paciente
            </CardTitle>
            <CardDescription>Ingrese el RUT y la IA completará automáticamente los datos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Tipo de Documento</Label>
              <Select value={tipoDTE} onValueChange={setTipoDTE}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="39">Boleta Electrónica (39)</SelectItem>
                  <SelectItem value="33">Factura Electrónica (33)</SelectItem>
                  <SelectItem value="61">Nota de Crédito (61)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="relative">
              <Label htmlFor="rut">RUT del Paciente</Label>
              <Input
                id="rut"
                value={receptorRut}
                onChange={(e) => setReceptorRut(e.target.value)}
                onBlur={handleRutBlur}
                placeholder="20.210.808-K (prueba con este RUT)"
                className="text-lg h-12"
                disabled={aiLoading}
              />
              {aiLoading && (
                <div className="absolute right-3 top-9 flex items-center gap-2 text-blue-600">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Buscando con IA...</span>
                </div>
              )}
            </div>

            {patientData && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-blue-900">¡Paciente encontrado!</p>
                    <p className="text-sm text-blue-700 mt-1">
                      Última visita: {patientData.lastVisit && new Date(patientData.lastVisit.date).toLocaleDateString('es-CL')}
                    </p>
                    <p className="text-sm text-blue-700">
                      Servicios frecuentes: {patientData.commonServices.slice(0, 2).join(", ")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <AutocompleteInput
              label="Nombre Completo"
              campo="razon_social"
              value={receptorRazonSocial}
              onChange={setReceptorRazonSocial}
              doctorId={doctorId}
              contexto={contexto}
              placeholder="Nombre del paciente"
            />

            <AutocompleteInput
              label="Dirección"
              campo="direccion"
              value={receptorDireccion}
              onChange={setReceptorDireccion}
              doctorId={doctorId}
              contexto={contexto}
              placeholder="Dirección del paciente (opcional)"
            />

            <div className="flex justify-end pt-4">
              <Button
                onClick={() => setCurrentStep(2)}
                disabled={!canProceedToStep2()}
                className="bg-blue-600 hover:bg-blue-700 h-12 px-8"
              >
                Continuar
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: Invoice Details */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Paso 2: Detalle de Servicios
            </CardTitle>
            <CardDescription>
              {patientData?.lastVisit
                ? "Usa la IA para cargar servicios de la última visita o ingresa manualmente"
                : "Agregue los servicios prestados"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {patientData?.lastVisit && !useLastVisit && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-purple-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-purple-900">Última Visita Detectada</p>
                      <p className="text-sm text-purple-700 mt-1">
                        {new Date(patientData.lastVisit.date).toLocaleDateString('es-CL')} -
                        {patientData.lastVisit.services.length} servicios -
                        ${patientData.lastVisit.total.toLocaleString('es-CL')}
                      </p>
                      <ul className="text-sm text-purple-700 mt-2 space-y-1">
                        {patientData.lastVisit.services.map((s, i) => (
                          <li key={i}>• {s}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <Button
                    onClick={handleUseLastVisit}
                    className="bg-purple-600 hover:bg-purple-700 shrink-0"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Usar con IA
                  </Button>
                </div>
              </div>
            )}

            {detalles.map((detalle, index) => (
              <div key={index} className="p-4 border rounded-lg bg-gray-50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Servicio #{index + 1}</span>
                  {detalles.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDetalle(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Eliminar
                    </Button>
                  )}
                </div>

                <AutocompleteInput
                  label="Descripción del Servicio"
                  campo="descripcion_servicio"
                  value={detalle.descripcion}
                  onChange={(value) => updateDetalle(index, "descripcion", value)}
                  doctorId={doctorId}
                  contexto={contexto}
                  placeholder="Ej: Limpieza dental, Consulta general..."
                />

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Cantidad</Label>
                    <Input
                      type="number"
                      min="1"
                      value={detalle.cantidad}
                      onChange={(e) => updateDetalle(index, "cantidad", parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div>
                    <Label>Precio Unitario</Label>
                    <Input
                      type="number"
                      min="0"
                      value={detalle.precio}
                      onChange={(e) => updateDetalle(index, "precio", parseFloat(e.target.value) || 0)}
                      placeholder="$"
                    />
                  </div>
                  <div>
                    <Label>Total</Label>
                    <Input
                      value={`$${detalle.total.toLocaleString('es-CL')}`}
                      readOnly
                      className="bg-gray-100 font-semibold"
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button
              type="button"
              onClick={addDetalle}
              variant="outline"
              className="w-full"
            >
              Agregar Otro Servicio
            </Button>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Subtotal (Neto)</p>
                  <p className="text-lg font-semibold">${totals.neto.toLocaleString('es-CL')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">IVA (19%)</p>
                  <p className="text-lg font-semibold">${totals.iva.toLocaleString('es-CL')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">TOTAL</p>
                  <p className="text-2xl font-bold text-blue-600">${totals.total.toLocaleString('es-CL')}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button
                onClick={() => setCurrentStep(1)}
                variant="outline"
                className="h-12 px-8"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Atrás
              </Button>
              <Button
                onClick={() => setCurrentStep(3)}
                disabled={!canProceedToStep3()}
                className="bg-blue-600 hover:bg-blue-700 h-12 px-8"
              >
                Revisar
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: Review and Confirm */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Paso 3: Revisar y Confirmar
            </CardTitle>
            <CardDescription>Verifique todos los datos antes de generar la boleta para el SII</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Información del Paciente</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">RUT</p>
                    <p className="font-semibold">{receptorRut}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Tipo Documento</p>
                    <p className="font-semibold">
                      {tipoDTE === "39" ? "Boleta Electrónica" : tipoDTE === "33" ? "Factura Electrónica" : "Nota de Crédito"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-600">Nombre</p>
                    <p className="font-semibold">{receptorRazonSocial}</p>
                  </div>
                  {receptorDireccion && (
                    <div className="col-span-2">
                      <p className="text-gray-600">Dirección</p>
                      <p className="font-semibold">{receptorDireccion}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-3">Servicios Prestados</h3>
                <div className="space-y-3">
                  {detalles.map((detalle, index) => (
                    <div key={index} className="flex justify-between items-start bg-white p-3 rounded">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{detalle.descripcion}</p>
                        <p className="text-sm text-gray-600">
                          {detalle.cantidad} × ${detalle.precio.toLocaleString('es-CL')}
                        </p>
                      </div>
                      <p className="font-semibold text-gray-900">${detalle.total.toLocaleString('es-CL')}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal (Neto):</span>
                    <span className="font-semibold">${totals.neto.toLocaleString('es-CL')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">IVA (19%):</span>
                    <span className="font-semibold">${totals.iva.toLocaleString('es-CL')}</span>
                  </div>
                  <div className="flex justify-between text-xl border-t pt-3">
                    <span className="font-bold">TOTAL:</span>
                    <span className="font-bold text-blue-600">${totals.total.toLocaleString('es-CL')}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
              <div className="text-sm text-yellow-800">
                <p className="font-semibold">Importante</p>
                <p>Al confirmar, se generará la boleta electrónica y se enviará al Servicio de Impuestos Internos (SII).</p>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button
                onClick={() => setCurrentStep(2)}
                variant="outline"
                className="h-12 px-8"
                disabled={loading}
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Atrás
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 h-12 px-8 text-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <FileText className="h-5 w-5 mr-2" />
                    Generar y Enviar al SII
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
