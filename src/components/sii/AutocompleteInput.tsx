"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Prediction {
  valor: string;
  confidence: number;
  frecuencia: number;
  contexto_match: boolean;
  icon: string;
}

interface AutocompleteInputProps {
  label: string;
  campo: string;
  value: string;
  onChange: (value: string) => void;
  doctorId: string;
  contexto?: Record<string, unknown>;
  placeholder?: string;
}

export function AutocompleteInput({
  label,
  campo,
  value,
  onChange,
  doctorId,
  contexto = {},
  placeholder = "Comience a escribir..."
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Fetch predictions with debounce
  useEffect(() => {
    if (value === "" || selected) {
      setPredictions([]);
      return;
    }

    setLoading(true);

    // Debounce 300ms
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      try {
        const response = await fetch("/api/python/autofill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doctor_id: doctorId,
            campo,
            current_value: value,
            contexto
          })
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setPredictions(result.predictions || []);
            setOpen(result.predictions && result.predictions.length > 0);
          }
        }
      } catch (error) {
        console.error("Autofill error:", error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [value, campo, doctorId, contexto, selected]);

  const handleSelect = async (prediction: Prediction) => {
    setSelected(true);
    onChange(prediction.valor);
    setOpen(false);

    // Learn from selection (increment frequency)
    try {
      await fetch("/api/python/learn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_id: doctorId,
          campo,
          valor: prediction.valor,
          contexto
        })
      });
    } catch (error) {
      console.error("Learning error:", error);
    }

    // Reset selected flag after brief delay
    setTimeout(() => setSelected(false), 1000);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={campo} className="flex items-center gap-2">
        {label}
        {loading && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}
        {selected && <Check className="h-3 w-3 text-green-500" />}
      </Label>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              id={campo}
              value={value}
              onChange={(e) => {
                setSelected(false);
                onChange(e.target.value);
              }}
              placeholder={placeholder}
              className={cn(
                "pr-10",
                selected && "border-green-500",
                loading && "border-blue-400"
              )}
            />
            {predictions.length > 0 && (
              <Sparkles className="absolute right-3 top-2.5 h-4 w-4 text-purple-500 animate-pulse" />
            )}
          </div>
        </PopoverTrigger>

        <PopoverContent className="w-[600px] p-0 z-50" align="start" side="bottom" sideOffset={8}>
          <Command className="rounded-lg border shadow-2xl">
            <CommandList className="max-h-[400px]">
              {predictions.length === 0 && (
                <CommandEmpty className="py-8 text-center">
                  <div className="text-gray-400 mb-2">🤖</div>
                  <p className="text-sm text-gray-500">No hay sugerencias disponibles</p>
                  <p className="text-xs text-gray-400 mt-1">Sigue escribiendo para obtener predicciones</p>
                </CommandEmpty>
              )}

              {predictions.length > 0 && (
                <CommandGroup heading={
                  <div className="px-2 py-2 text-sm font-semibold text-purple-700 bg-gradient-to-r from-purple-50 to-blue-50 border-b">
                    🤖 Sugerencias Inteligentes de IA
                  </div>
                }>
                  {predictions.map((prediction, index) => (
                    <CommandItem
                      key={index}
                      value={prediction.valor}
                      onSelect={() => handleSelect(prediction)}
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 border-b last:border-b-0 transition-all"
                    >
                      <div className="flex flex-col gap-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-base text-gray-800">{prediction.valor}</span>
                          {prediction.confidence >= 0.8 && (
                            <Badge variant="default" className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs px-2">
                              ⭐ Alta confianza
                            </Badge>
                          )}
                          {prediction.confidence >= 0.6 && prediction.confidence < 0.8 && (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs px-2">
                              ⚡ Confianza media
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <span className="flex items-center gap-1">
                            <span className="font-mono font-bold text-blue-600">{(prediction.confidence * 100).toFixed(0)}%</span>
                            confianza
                          </span>
                          <span className="flex items-center gap-1">
                            📈 Usado <span className="font-bold text-indigo-600">{prediction.frecuencia}</span> veces
                          </span>
                          {prediction.contexto_match && (
                            <Badge variant="outline" className="text-xs border-purple-300 text-purple-700">
                              📊 Contexto similar
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-3xl ml-4">{prediction.icon}</div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selected && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <Check className="h-3 w-3" />
          Valor autocompletado
        </p>
      )}
    </div>
  );
}
