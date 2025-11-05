"""
Generador de PDF con formato oficial del Servicio de Impuestos Internos (SII) de Chile.
Compatible con boletas electrónicas según normativa chilena.
"""
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.pdfgen import canvas
from datetime import datetime
import io
from typing import Dict, List


class SIIInvoiceGenerator:
    """Genera PDFs de boletas electrónicas con formato oficial SII Chile"""

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """Configura estilos personalizados para el documento"""
        # Estilo para encabezado
        self.styles.add(ParagraphStyle(
            name='SIIHeader',
            parent=self.styles['Heading1'],
            fontSize=14,
            textColor=colors.HexColor('#000000'),
            alignment=1,  # Center
            spaceAfter=6
        ))

        # Estilo para datos del receptor
        self.styles.add(ParagraphStyle(
            name='SIIData',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#000000'),
            spaceAfter=3
        ))

        # Estilo para totales
        self.styles.add(ParagraphStyle(
            name='SIITotal',
            parent=self.styles['Normal'],
            fontSize=12,
            textColor=colors.HexColor('#000000'),
            alignment=2,  # Right
            fontName='Helvetica-Bold'
        ))

    def generate_boleta_pdf(
        self,
        tipo_dte: int,
        folio: str,
        fecha_emision: str,
        emisor_rut: str,
        emisor_razon_social: str,
        emisor_direccion: str,
        emisor_comuna: str,
        emisor_giro: str,
        receptor_rut: str,
        receptor_razon_social: str,
        receptor_direccion: str,
        detalles: List[Dict],
        neto: float,
        iva: float,
        total: float,
        track_id: str = None
    ) -> bytes:
        """
        Genera PDF de boleta electrónica según formato SII Chile.

        Args:
            tipo_dte: 39 para Boleta Electrónica, 33 para Factura Electrónica
            folio: Número de folio
            fecha_emision: Fecha en formato DD-MM-YYYY
            emisor_*: Datos del emisor (doctor/clínica)
            receptor_*: Datos del receptor (paciente)
            detalles: Lista de items con descripcion, cantidad, precio, total
            neto: Monto neto
            iva: Monto IVA
            total: Monto total
            track_id: ID de seguimiento SII

        Returns:
            bytes: PDF generado
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=20*mm,
            leftMargin=20*mm,
            topMargin=15*mm,
            bottomMargin=15*mm
        )

        story = []

        # ENCABEZADO OFICIAL SII
        tipo_doc_name = "BOLETA ELECTRÓNICA" if tipo_dte == 39 else "FACTURA ELECTRÓNICA"

        # Cuadro superior con RUT y tipo de documento
        header_data = [
            [Paragraph(f"<b>R.U.T.: {emisor_rut}</b>", self.styles['SIIHeader'])],
            [Paragraph(f"<b>{tipo_doc_name}</b>", self.styles['SIIHeader'])],
            [Paragraph(f"<b>Nº {folio}</b>", self.styles['SIIHeader'])],
        ]

        header_table = Table(header_data, colWidths=[180*mm])
        header_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOX', (0, 0), (-1, -1), 2, colors.black),
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F0F0F0')),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 10*mm))

        # DATOS DEL EMISOR
        emisor_data = [
            [Paragraph(f"<b>{emisor_razon_social}</b>", self.styles['SIIData'])],
            [Paragraph(f"<b>Giro:</b> {emisor_giro}", self.styles['SIIData'])],
            [Paragraph(f"<b>Dirección:</b> {emisor_direccion}", self.styles['SIIData'])],
            [Paragraph(f"<b>Comuna:</b> {emisor_comuna}", self.styles['SIIData'])],
        ]

        emisor_table = Table(emisor_data, colWidths=[180*mm])
        emisor_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOX', (0, 0), (-1, -1), 1, colors.black),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ]))
        story.append(emisor_table)
        story.append(Spacer(1, 8*mm))

        # FECHA Y DATOS DEL RECEPTOR
        fecha_receptor_data = [
            [Paragraph(f"<b>Fecha Emisión:</b> {fecha_emision}", self.styles['SIIData'])],
            [Paragraph(f"<b>Señor(es):</b> {receptor_razon_social}", self.styles['SIIData'])],
            [Paragraph(f"<b>R.U.T.:</b> {receptor_rut}", self.styles['SIIData'])],
            [Paragraph(f"<b>Dirección:</b> {receptor_direccion or 'No especificada'}", self.styles['SIIData'])],
        ]

        fecha_receptor_table = Table(fecha_receptor_data, colWidths=[180*mm])
        fecha_receptor_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOX', (0, 0), (-1, -1), 1, colors.black),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ]))
        story.append(fecha_receptor_table)
        story.append(Spacer(1, 8*mm))

        # DETALLE DE PRODUCTOS/SERVICIOS
        detalle_header = [['Cantidad', 'Descripción', 'Precio Unit.', 'Total']]
        detalle_data = []

        for item in detalles:
            detalle_data.append([
                str(item['cantidad']),
                item['descripcion'],
                f"${item['precio']:,.0f}".replace(',', '.'),
                f"${item['total']:,.0f}".replace(',', '.')
            ])

        detalle_table_data = detalle_header + detalle_data
        detalle_table = Table(
            detalle_table_data,
            colWidths=[25*mm, 95*mm, 30*mm, 30*mm]
        )
        detalle_table.setStyle(TableStyle([
            # Header
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E0E0E0')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('TOPPADDING', (0, 0), (-1, 0), 8),

            # Data rows
            ('ALIGN', (0, 1), (0, -1), 'CENTER'),  # Cantidad
            ('ALIGN', (1, 1), (1, -1), 'LEFT'),    # Descripción
            ('ALIGN', (2, 1), (2, -1), 'RIGHT'),   # Precio
            ('ALIGN', (3, 1), (3, -1), 'RIGHT'),   # Total
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('TOPPADDING', (0, 1), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 5),
            ('LEFTPADDING', (0, 1), (1, -1), 8),
            ('RIGHTPADDING', (2, 1), (-1, -1), 8),

            # Grid
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('BOX', (0, 0), (-1, -1), 1, colors.black),
        ]))
        story.append(detalle_table)
        story.append(Spacer(1, 8*mm))

        # TOTALES
        totales_data = [
            ['', '', 'NETO $', f"${neto:,.0f}".replace(',', '.')],
            ['', '', 'I.V.A. 19% $', f"${iva:,.0f}".replace(',', '.')],
            ['', '', 'TOTAL $', f"${total:,.0f}".replace(',', '.')],
        ]

        totales_table = Table(
            totales_data,
            colWidths=[25*mm, 95*mm, 30*mm, 30*mm]
        )
        totales_table.setStyle(TableStyle([
            # Alignment
            ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
            ('ALIGN', (3, 0), (3, -1), 'RIGHT'),

            # Font
            ('FONTNAME', (2, 0), (2, 1), 'Helvetica'),
            ('FONTNAME', (3, 0), (3, 1), 'Helvetica'),
            ('FONTNAME', (2, 2), (3, 2), 'Helvetica-Bold'),  # Total en negrita
            ('FONTSIZE', (2, 0), (3, -1), 11),

            # Padding
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (2, 0), (-1, -1), 8),

            # Borders
            ('LINEABOVE', (2, 0), (3, 0), 1, colors.black),
            ('LINEABOVE', (2, 2), (3, 2), 1.5, colors.black),
            ('LINEBELOW', (2, 2), (3, 2), 1.5, colors.black),

            # Background
            ('BACKGROUND', (2, 2), (3, 2), colors.HexColor('#F0F0F0')),
        ]))
        story.append(totales_table)
        story.append(Spacer(1, 10*mm))

        # TIMBRE ELECTRÓNICO (Sección oficial SII)
        if track_id:
            timbre_data = [
                [Paragraph("<b>TIMBRE ELECTRÓNICO SII</b>", self.styles['SIIHeader'])],
                [Paragraph(f"Track ID: {track_id}", self.styles['SIIData'])],
                [Paragraph(f"Documento verificable en www.sii.cl", self.styles['SIIData'])],
            ]

            timbre_table = Table(timbre_data, colWidths=[180*mm])
            timbre_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('BOX', (0, 0), (-1, -1), 1, colors.black),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ]))
            story.append(timbre_table)

        # Generar PDF
        doc.build(story)
        pdf_bytes = buffer.getvalue()
        buffer.close()

        return pdf_bytes


def generate_sii_invoice_pdf(
    tipo_dte: int,
    folio: str,
    emisor_data: Dict,
    receptor_data: Dict,
    detalles: List[Dict],
    totales: Dict,
    track_id: str = None
) -> bytes:
    """
    Función helper para generar PDF de boleta SII.

    Args:
        tipo_dte: 39 para Boleta, 33 para Factura
        folio: Número de folio
        emisor_data: {rut, razon_social, direccion, comuna, giro}
        receptor_data: {rut, razon_social, direccion}
        detalles: [{descripcion, cantidad, precio, total}, ...]
        totales: {neto, iva, total}
        track_id: ID de seguimiento SII

    Returns:
        bytes: PDF generado
    """
    generator = SIIInvoiceGenerator()

    fecha_emision = datetime.now().strftime("%d-%m-%Y")

    return generator.generate_boleta_pdf(
        tipo_dte=tipo_dte,
        folio=folio,
        fecha_emision=fecha_emision,
        emisor_rut=emisor_data.get('rut', '76.XXX.XXX-X'),
        emisor_razon_social=emisor_data.get('razon_social', 'Clínica Médica'),
        emisor_direccion=emisor_data.get('direccion', 'Dirección no especificada'),
        emisor_comuna=emisor_data.get('comuna', 'Santiago'),
        emisor_giro=emisor_data.get('giro', 'Servicios Médicos'),
        receptor_rut=receptor_data.get('rut', ''),
        receptor_razon_social=receptor_data.get('razon_social', ''),
        receptor_direccion=receptor_data.get('direccion', ''),
        detalles=detalles,
        neto=totales.get('neto', 0),
        iva=totales.get('iva', 0),
        total=totales.get('total', 0),
        track_id=track_id
    )


# Ejemplo de uso
if __name__ == "__main__":
    # Datos de prueba
    emisor = {
        'rut': '76.123.456-7',
        'razon_social': 'Clínica Dental Dr. Pérez',
        'direccion': 'Av. Providencia 1234',
        'comuna': 'Providencia',
        'giro': 'Servicios Odontológicos'
    }

    receptor = {
        'rut': '20.210.808-K',
        'razon_social': 'Roberto Carlos Fuentes Sánchez',
        'direccion': 'Av. Vitacura 3456, Vitacura'
    }

    detalles = [
        {
            'descripcion': 'Limpieza dental profesional',
            'cantidad': 1,
            'precio': 35000,
            'total': 35000
        },
        {
            'descripcion': 'Control preventivo',
            'cantidad': 1,
            'precio': 10000,
            'total': 10000
        }
    ]

    totales = {
        'neto': 37815,
        'iva': 7185,
        'total': 45000
    }

    pdf_bytes = generate_sii_invoice_pdf(
        tipo_dte=39,
        folio="00123",
        emisor_data=emisor,
        receptor_data=receptor,
        detalles=detalles,
        totales=totales,
        track_id="ABC123-456789-XYZ"
    )

    # Guardar para prueba
    with open('boleta_prueba.pdf', 'wb') as f:
        f.write(pdf_bytes)

    print("✅ PDF generado exitosamente: boleta_prueba.pdf")
