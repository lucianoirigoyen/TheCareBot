"""
PDF Generator Agent for Chilean SII Invoices.
Generates professional PDF invoices compliant with Chilean tax regulations.
"""
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from langchain_core.tools import tool
import io
import qrcode
from datetime import datetime
from typing import Optional


@tool
def generate_invoice_pdf(
    tipo_dte: int,
    folio: int,
    emisor: dict,
    receptor: dict,
    detalles: list[dict],
    totales: dict,
    track_id: str,
    fecha_emision: Optional[str] = None
) -> bytes:
    """
    Generate Chilean SII-compliant invoice PDF.

    Args:
        tipo_dte: Document type (33=Factura, 39=Boleta, 61=Nota Crédito)
        folio: Invoice folio number
        emisor: Emisor data (rut, razon_social, giro, direccion)
        receptor: Receptor data (rut, razon_social, direccion)
        detalles: Line items [{"descripcion": "", "cantidad": 1, "precio": 10000, "total": 10000}]
        totales: Totals (neto, iva, total)
        track_id: SII Track ID
        fecha_emision: Emission date (ISO format)

    Returns:
        PDF as bytes
    """
    # Create buffer
    buffer = io.BytesIO()

    # Create document
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=20*mm,
        leftMargin=20*mm,
        topMargin=20*mm,
        bottomMargin=20*mm
    )

    # Container for elements
    elements = []
    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=12,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )

    header_style = ParagraphStyle(
        'Header',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#374151'),
        fontName='Helvetica-Bold'
    )

    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#4b5563')
    )

    # Determine document type name
    tipo_dte_names = {
        33: "FACTURA ELECTRÓNICA",
        39: "BOLETA ELECTRÓNICA",
        61: "NOTA DE CRÉDITO ELECTRÓNICA"
    }
    doc_type = tipo_dte_names.get(tipo_dte, "DOCUMENTO TRIBUTARIO ELECTRÓNICO")

    # Title with folio
    title_text = f"{doc_type}<br/>N° {folio}"
    elements.append(Paragraph(title_text, title_style))
    elements.append(Spacer(1, 10*mm))

    # Emisor and Receptor data side by side
    emisor_data = [
        [Paragraph("<b>EMISOR</b>", header_style)],
        [Paragraph(f"<b>RUT:</b> {emisor.get('rut', 'N/A')}", normal_style)],
        [Paragraph(f"<b>Razón Social:</b> {emisor.get('razon_social', 'N/A')}", normal_style)],
        [Paragraph(f"<b>Giro:</b> {emisor.get('giro', 'N/A')}", normal_style)],
        [Paragraph(f"<b>Dirección:</b> {emisor.get('direccion', 'N/A')}", normal_style)],
    ]

    receptor_data = [
        [Paragraph("<b>RECEPTOR</b>", header_style)],
        [Paragraph(f"<b>RUT:</b> {receptor.get('rut', '66666666-6')}", normal_style)],
        [Paragraph(f"<b>Razón Social:</b> {receptor.get('razon_social', 'N/A')}", normal_style)],
        [Paragraph(f"<b>Dirección:</b> {receptor.get('direccion', 'N/A')}", normal_style)],
        [Paragraph("&nbsp;", normal_style)],  # Spacer
    ]

    header_table = Table(
        [[Table(emisor_data, colWidths=[85*mm]), Table(receptor_data, colWidths=[85*mm])]],
        colWidths=[90*mm, 90*mm]
    )

    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOX', (0, 0), (0, 0), 1, colors.HexColor('#d1d5db')),
        ('BOX', (1, 0), (1, 0), 1, colors.HexColor('#d1d5db')),
        ('BACKGROUND', (0, 0), (0, 0), colors.HexColor('#f9fafb')),
        ('BACKGROUND', (1, 0), (1, 0), colors.HexColor('#f9fafb')),
    ]))

    elements.append(header_table)
    elements.append(Spacer(1, 10*mm))

    # Detalle table
    detalle_data = [['Descripción', 'Cantidad', 'Precio Unit.', 'Total']]

    for item in detalles:
        detalle_data.append([
            Paragraph(item.get('descripcion', ''), normal_style),
            str(item.get('cantidad', 1)),
            f"${item.get('precio', 0):,.0f}",
            f"${item.get('total', 0):,.0f}"
        ])

    detalle_table = Table(
        detalle_data,
        colWidths=[100*mm, 20*mm, 30*mm, 30*mm]
    )

    detalle_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#d1d5db')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
    ]))

    elements.append(detalle_table)
    elements.append(Spacer(1, 8*mm))

    # Totales table (right-aligned)
    totales_data = [
        ['Neto:', f"${totales.get('neto', 0):,.0f}"],
        ['IVA (19%):', f"${totales.get('iva', 0):,.0f}"],
        ['<b>TOTAL:</b>', f"<b>${totales.get('total', 0):,.0f}</b>"],
    ]

    totales_table_data = [[Paragraph(label, normal_style), Paragraph(value, normal_style)]
                          for label, value in totales_data]

    totales_table = Table(
        totales_table_data,
        colWidths=[40*mm, 40*mm],
        hAlign='RIGHT'
    )

    totales_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, -1), (-1, -1), 11),
        ('LINEABOVE', (0, -1), (-1, -1), 2, colors.HexColor('#1e40af')),
        ('TOPPADDING', (0, -1), (-1, -1), 8),
    ]))

    elements.append(totales_table)
    elements.append(Spacer(1, 10*mm))

    # Generate QR code for Track ID
    qr = qrcode.QRCode(version=1, box_size=3, border=1)
    qr.add_data(f"Track ID: {track_id}")
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")

    # Save QR to buffer
    qr_buffer = io.BytesIO()
    qr_img.save(qr_buffer, format='PNG')
    qr_buffer.seek(0)

    # Footer with QR and info
    fecha = fecha_emision or datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    footer_data = [
        [
            Image(qr_buffer, width=25*mm, height=25*mm),
            Paragraph(f"<b>Track ID:</b> {track_id}<br/><b>Fecha Emisión:</b> {fecha}<br/><b>Timbre Electrónico SII</b>", normal_style)
        ]
    ]

    footer_table = Table(footer_data, colWidths=[30*mm, 150*mm])
    footer_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))

    elements.append(footer_table)

    # Build PDF
    doc.build(elements)

    # Get PDF bytes
    pdf_bytes = buffer.getvalue()
    buffer.close()

    return pdf_bytes


def save_pdf_to_file(pdf_bytes: bytes, filename: str) -> str:
    """
    Save PDF bytes to file.

    Args:
        pdf_bytes: PDF content as bytes
        filename: Output filename

    Returns:
        Path to saved file
    """
    with open(filename, 'wb') as f:
        f.write(pdf_bytes)
    return filename
