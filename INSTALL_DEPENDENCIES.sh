#!/bin/bash
# Script para instalar todas las dependencias faltantes

echo "🔧 Instalando dependencias UI de Shadcn/Radix..."

npm install lucide-react \
  @radix-ui/react-slot \
  @radix-ui/react-label \
  @radix-ui/react-select \
  @radix-ui/react-popover \
  class-variance-authority \
  tailwind-merge

echo "✅ Instalación completa!"
echo ""
echo "Ahora ejecuta: npm run dev"
