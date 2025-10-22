"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AutocompleteInput } from "@/components/sii/AutocompleteInput";
import { Plus, Trash2, FileText, Loader2, CheckCircle2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DetalleItem {
  descripcion: string;
  cantidad: number;
  precio: number;
  total: number;
}

export default function NuevaFacturaPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Form state
  const [tipoDTE, setTipoDTE] = useState("39"); // Boleta by default
  const [receptorRut, setReceptorRut] = useState("");
  const [receptorRazonSocial, setReceptorRazonSocial] = useState("");
  const [receptorDireccion, setReceptorDireccion] = useState("");
  const [detalles, setDetalles] = useState<DetalleItem[]>([
    { descripcion: "", cantidad: 1, precio: 0, total: 0 }
  ]);

  // Mock doctor ID (in production, get from session)
  const doctorId = "550e8400-e29b-41d4-a716-446655440000";

  // Get current context
  const contexto = {
    day_of_week: new Date().getDay(),
    period_of_day: new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"
  };

  const addDetalle = () => {
    setDetalles([...detalles, { descripcion: "", cantidad: 1, precio: 0, total: 0 }]);
  };

  const removeDetalle = (index: number) => {
    setDetalles(detalles.filter((_, i) => i !== index));
  };

  const updateDetalle = (index: number, field: keyof DetalleItem, value: any) => {
    const updated = [...detalles];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-calculate total
    if (field === "cantidad" || field === "precio") {
      updated[index].total = updated[index].cantidad * updated[index].precio;
    }

    setDetalles(updated);
  };

  const calculateTotals = () => {
    const neto = detalles.reduce((sum, d) => sum + d.total, 0);
    const iva = neto * 0.19;
    const total = neto + iva;
    return { neto, iva, total };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setGenerated(false);

    try {
      // Validate
      if (!receptorRut || !receptorRazonSocial) {
        toast({
          title: "Error de validación",
          description: "RUT y Razón Social son obligatorios",
          variant: "destructive"
        });
        return;
      }

      if (detalles.some(d => !d.descripcion || d.cantidad <= 0 || d.precio <= 0)) {
        toast({
          title: "Error de validación",
          description: "Complete todos los detalles correctamente",
          variant: "destructive"
        });
        return;
      }

      // Call Python API
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
          title: "¡Factura generada exitosamente!",
          description: `Folio ${data.folio} - Track ID: ${data.track_id}`,
        });
      } else {
        toast({
          title: "Error al generar factura",
          description: data.errors?.join(", ") || "Error desconocido",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar al servidor Python. Asegúrese de que esté ejecutándose en puerto 8000.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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
          detalles: detalles
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `boleta_${result?.folio || 'nueva'}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: "PDF descargado",
          description: "El PDF se ha descargado exitosamente",
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

  const totals = calculateTotals();

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Generar Boleta Electrónica
        </h1>
        <p className="text-gray-600 mt-2">
          Sistema inteligente de facturación con autocompletado basado en IA 🤖
        </p>
      </div>

      {generated && result && (
        <Card className="mb-6 border-green-500 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              ¡Factura generada exitosamente!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Folio</p>
                <p className="font-bold text-lg">{result.folio}</p>
              </div>
              <div>
                <p className="text-gray-600">Track ID</p>
                <p className="font-mono text-sm">{result.track_id}</p>
              </div>
              <div>
                <p className="text-gray-600">Total</p>
                <p className="font-bold text-lg">${result.monto_total?.toLocaleString('es-CL')}</p>
              </div>
              <div>
                <p className="text-gray-600">Estado SII</p>
                <p className="font-semibold text-green-600">✓ {result.estado_sii}</p>
              </div>
            </div>
            <Button onClick={downloadPDF} className="mt-4 w-full" variant="default">
              <Download className="h-4 w-4 mr-2" />
              Descargar PDF
            </Button>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Datos del Documento</CardTitle>
            <CardDescription>Seleccione el tipo de documento tributario</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Datos del Receptor</CardTitle>
            <CardDescription>Complete con los datos del cliente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="rut">RUT</Label>
              <Input
                id="rut"
                value={receptorRut}
                onChange={(e) => setReceptorRut(e.target.value)}
                placeholder="12345678-9"
                required
              />
            </div>

            <AutocompleteInput
              label="Razón Social"
              campo="razon_social"
              value={receptorRazonSocial}
              onChange={setReceptorRazonSocial}
              doctorId={doctorId}
              contexto={contexto}
              placeholder="Nombre del cliente"
            />

            <AutocompleteInput
              label="Dirección"
              campo="direccion"
              value={receptorDireccion}
              onChange={setReceptorDireccion}
              doctorId={doctorId}
              contexto={contexto}
              placeholder="Dirección del cliente (opcional)"
            />
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Detalle de Servicios</CardTitle>
            <CardDescription>Agregue los servicios prestados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {detalles.map((detalle, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-3 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">Ítem #{index + 1}</span>
                  {detalles.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDetalle(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
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
                    <Label htmlFor={`cantidad-${index}`}>Cantidad</Label>
                    <Input
                      id={`cantidad-${index}`}
                      type="number"
                      min="1"
                      value={detalle.cantidad}
                      onChange={(e) => updateDetalle(index, "cantidad", parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`precio-${index}`}>Precio Unitario</Label>
                    <Input
                      id={`precio-${index}`}
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

            <Button type="button" onClick={addDetalle} variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Ítem
            </Button>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Neto:</span>
                <span className="font-semibold">${totals.neto.toLocaleString('es-CL')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">IVA (19%):</span>
                <span className="font-semibold">${totals.iva.toLocaleString('es-CL')}</span>
              </div>
              <div className="flex justify-between text-lg border-t pt-2">
                <span className="font-bold">TOTAL:</span>
                <span className="font-bold text-blue-600">${totals.total.toLocaleString('es-CL')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={loading} className="w-full h-12 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Generando factura...
            </>
          ) : (
            <>
              <FileText className="h-5 w-5 mr-2" />
              Generar y Enviar a SII
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
