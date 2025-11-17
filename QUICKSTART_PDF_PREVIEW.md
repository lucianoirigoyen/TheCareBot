# 🚀 PDF Preview Quick Start Guide

## ⚡ Get Started in 3 Steps

### Step 1: Install Dependency

```bash
npm install jspdf
```

### Step 2: Start Development Server

```bash
npm run dev
```

### Step 3: Open Demo Page

Navigate to: **http://localhost:3000/facturacion/preview-demo**

---

## ✨ What You'll See

A professional PDF preview interface with:

- ✅ **PDF Viewer**: Full document preview in iframe
- ✅ **Zoom Controls**: 50% - 200% zoom range
- ✅ **Fullscreen Mode**: Immersive viewing experience
- ✅ **Document Summary**: Folio, totals, client info
- ✅ **Action Buttons**: Accept, Download, Edit
- ✅ **Chilean SII Format**: Official tax authority format

---

## 📁 Files Created

```
✅ src/utils/pdf-generator-sii.ts          - PDF generation engine
✅ src/components/facturacion/PDFPreviewScreen.tsx  - Preview component
✅ src/app/facturacion/preview-demo/page.tsx       - Demo page
✅ PDF_PREVIEW_IMPLEMENTATION.md           - Full documentation
✅ QUICKSTART_PDF_PREVIEW.md              - This file
```

---

## 🎯 Key Features

### PDF Generation (`pdf-generator-sii.ts`)

- ✅ Chilean SII official format
- ✅ Boletas (39), Facturas (33), Notas de Crédito (61)
- ✅ Chilean currency formatting (dots as thousands)
- ✅ Electronic stamp (Timbre Electrónico)
- ✅ Client-side generation (no backend needed)
- ✅ TypeScript with full type safety

### Preview Component (`PDFPreviewScreen.tsx`)

- ✅ Responsive design (desktop, tablet, mobile)
- ✅ Zoom in/out controls
- ✅ Fullscreen mode toggle
- ✅ Document summary panel
- ✅ Accept/Download/Edit actions
- ✅ Loading and error states
- ✅ shadcn/ui + Tailwind styling

---

## 🧪 Testing the Demo

### Test Checklist

1. **PDF Viewer**

   - [ ] PDF loads and displays correctly
   - [ ] Document shows all sections (header, details, totals)
   - [ ] Chilean formatting is correct (RUT, currency)

2. **Zoom Controls**

   - [ ] Click "Zoom In" button (should increase to 125%, 150%, etc.)
   - [ ] Click "Zoom Out" button (should decrease to 75%, 50%)
   - [ ] Click percentage button (should reset to 100%)

3. **Fullscreen Mode**

   - [ ] Click "Fullscreen" button (should expand to full screen)
   - [ ] Bottom action bar appears in fullscreen
   - [ ] Click "Exit Fullscreen" to return

4. **Document Summary**

   - [ ] Folio number: "000123"
   - [ ] Document type: "Boleta Electrónica"
   - [ ] Client: "Roberto Carlos Fuentes Sánchez"
   - [ ] Total: $53,000

5. **Action Buttons**

   - [ ] Click "Solo Descargar" (PDF should download)
   - [ ] Click "Aceptar y Descargar" (alert + download)
   - [ ] Click "Volver a Editar" (navigates to /facturacion/nueva)

6. **Responsive Design**
   - [ ] Resize browser to mobile width (stacks vertically)
   - [ ] Resize to tablet width (maintains usability)
   - [ ] Resize to desktop (side-by-side layout)

---

## 💡 Usage Example

### Minimal Example

```tsx
import { PDFPreviewScreen } from "@/components/facturacion/PDFPreviewScreen";

function MyPage() {
  const invoiceData = {
    tipoDTE: 39,
    folio: "000123",
    fechaEmision: "16-01-2025",
    emisor: {
      rut: "76.123.456-7",
      razonSocial: "Mi Clínica",
      direccion: "Av. Principal 123",
      comuna: "Santiago",
      giro: "Servicios Médicos",
    },
    receptor: {
      rut: "12.345.678-9",
      razonSocial: "Juan Pérez",
    },
    detalles: [
      {
        descripcion: "Consulta médica",
        cantidad: 1,
        precio: 30000,
        total: 30000,
      },
    ],
    totales: {
      neto: 25210,
      iva: 4790,
      total: 30000,
    },
  };

  return (
    <PDFPreviewScreen
      invoiceData={invoiceData}
      onAcceptAndDownload={() => alert("Accepted!")}
      onBackToEdit={() => alert("Back to edit")}
    />
  );
}
```

---

## 🔗 Integration with InvoiceWizardAI

### Quick Integration Steps

1. **Import the component**

   ```tsx
   import { PDFPreviewScreen } from "@/components/facturacion/PDFPreviewScreen";
   ```

2. **Add state to InvoiceWizardAI**

   ```tsx
   const [showPreview, setShowPreview] = useState(false);
   const [previewData, setPreviewData] = useState(null);
   ```

3. **Add Preview button in Step 3**

   ```tsx
   <Button onClick={() => handleShowPreview()}>
     <Eye className="h-5 w-5 mr-2" />
     Previsualizar PDF
   </Button>
   ```

4. **Conditionally render preview**

   ```tsx
   if (showPreview && previewData) {
     return (
       <PDFPreviewScreen
         invoiceData={previewData}
         onAcceptAndDownload={handleSubmit}
         onBackToEdit={() => setShowPreview(false)}
       />
     );
   }
   ```

---

## 🐛 Common Issues

### PDF Not Displaying

```bash
# Solution: Ensure jsPDF is installed
npm install jspdf

# Then restart dev server
npm run dev
```

### TypeScript Errors

```bash
# Solution: Ensure TypeScript is up to date
npm install typescript@latest

# Check tsconfig.json has strict mode enabled
```

### Module Not Found

```bash
# Solution: Clear Next.js cache
rm -rf .next
npm run dev
```

---

## 📚 Learn More

- **Full Documentation**: See [PDF_PREVIEW_IMPLEMENTATION.md](./PDF_PREVIEW_IMPLEMENTATION.md)
- **Component API**: Full props reference in main docs
- **Advanced Usage**: Integration patterns and best practices

---

## ✅ Success Criteria

You've successfully implemented PDF preview when:

- ✅ Demo page loads without errors
- ✅ PDF displays correctly in viewer
- ✅ All controls work (zoom, fullscreen)
- ✅ Download generates correct PDF file
- ✅ Chilean SII format is validated
- ✅ Responsive on all devices

---

## 🎉 Next Steps

1. ✅ Test the demo page thoroughly
2. ✅ Customize styling to match your brand
3. ✅ Integrate with InvoiceWizardAI workflow
4. ✅ Add to your production build
5. ✅ Deploy to staging/production

---

## 📞 Need Help?

- Check browser console for errors
- Review [PDF_PREVIEW_IMPLEMENTATION.md](./PDF_PREVIEW_IMPLEMENTATION.md)
- Verify all dependencies are installed
- Test with mock data first

---

**Happy Coding! 🚀**

---

**Version**: 1.0.0
**Framework**: Next.js 14 + React 18 + TypeScript 5
**Styling**: TailwindCSS 3 + shadcn/ui
