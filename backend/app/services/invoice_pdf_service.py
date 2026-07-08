from datetime import datetime


def _pdf_escape(value):
    return str(value or "").replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _money(value):
    return f"INR {float(value or 0):,.2f}"


def _date(value):
    if isinstance(value, datetime):
        return value.strftime("%d %b %Y")
    return str(value or "-")[:16]


def _add_text(lines, x, y, text, size=10):
    lines.append(f"BT /F1 {size} Tf {x} {y} Td ({_pdf_escape(text)}) Tj ET")


def _build_pdf(objects: list[str]):
    content = "%PDF-1.4\n"
    offsets = [0]
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(content.encode("latin-1")))
        content += f"{index} 0 obj\n{obj}\nendobj\n"

    xref_offset = len(content.encode("latin-1"))
    content += f"xref\n0 {len(objects) + 1}\n"
    content += "0000000000 65535 f \n"
    for offset in offsets[1:]:
        content += f"{offset:010d} 00000 n \n"
    content += (
        "trailer\n"
        f"<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
        "startxref\n"
        f"{xref_offset}\n"
        "%%EOF\n"
    )
    return content.encode("latin-1", errors="replace")


def generate_invoice_pdf(invoice: dict):
    company = invoice.get("company") or {}
    buyer = invoice.get("buyer") or {}
    invoice_id = invoice.get("invoice_id") or "invoice"
    is_cancelled = invoice.get("invoice_status") == "CANCELLED"
    lines = []

    if is_cancelled:
        lines.append("q 0.85 0 0 0.85 85 205 cm 0.85 0.1 0.1 rg BT /F1 58 Tf 0 0 Td (CANCELLED) Tj ET Q")

    y = 800
    _add_text(lines, 42, y, company.get("company_name") or company.get("brand_name") or "Company", 18)
    y -= 18
    _add_text(lines, 42, y, company.get("address") or "", 9)
    y -= 14
    _add_text(lines, 42, y, f"GSTIN: {company.get('gst_number') or '-'}", 9)
    _add_text(lines, 410, 800, "Tax Invoice", 16)
    _add_text(lines, 410, 780, f"Invoice: {invoice_id}", 10)
    _add_text(lines, 410, 764, f"Date: {_date(invoice.get('invoice_date'))}", 10)
    _add_text(lines, 410, 748, f"Payment: {invoice.get('payment_status') or '-'}", 10)

    y = 710
    _add_text(lines, 42, y, "Bill To", 12)
    y -= 16
    _add_text(lines, 42, y, buyer.get("name") or "-", 10)
    y -= 14
    _add_text(lines, 42, y, buyer.get("address") or "-", 9)
    y -= 14
    _add_text(lines, 42, y, f"Phone: {buyer.get('phone') or '-'}   Email: {buyer.get('email') or '-'}", 9)
    if invoice.get("cancel_reason"):
        y -= 16
        _add_text(lines, 42, y, f"Cancelled Reason: {invoice.get('cancel_reason')}", 9)

    y -= 34
    _add_text(lines, 42, y, "Item", 9)
    _add_text(lines, 280, y, "Qty", 9)
    _add_text(lines, 330, y, "Price", 9)
    _add_text(lines, 405, y, "GST", 9)
    _add_text(lines, 480, y, "Amount", 9)
    y -= 10
    lines.append(f"40 {y} m 555 {y} l S")
    y -= 18

    for item in invoice.get("items", [])[:22]:
        _add_text(lines, 42, y, (item.get("name") or item.get("sku") or "-")[:42], 8)
        _add_text(lines, 280, y, item.get("quantity", 0), 8)
        _add_text(lines, 330, y, _money(item.get("unit_price")), 8)
        _add_text(lines, 405, y, f"{item.get('tax_percentage') or 0}% {_money(item.get('tax_amount'))}", 8)
        _add_text(lines, 480, y, _money(item.get("total_price")), 8)
        y -= 16
        if y < 170:
            break

    y = 150
    lines.append(f"335 {y + 70} m 555 {y + 70} l S")
    _add_text(lines, 360, y + 50, f"Subtotal: {_money(invoice.get('subtotal'))}", 10)
    _add_text(lines, 360, y + 32, f"Discount: {_money(invoice.get('total_discount'))}", 10)
    _add_text(lines, 360, y + 14, f"GST: {_money(invoice.get('total_tax'))}", 10)
    _add_text(lines, 360, y - 8, f"Total: {_money(invoice.get('final_total_amount'))}", 13)
    _add_text(lines, 42, 80, "This is a computer generated invoice.", 8)

    stream = "\n".join(lines)
    objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        f"<< /Length {len(stream.encode('latin-1', errors='replace'))} >>\nstream\n{stream}\nendstream",
    ]
    return _build_pdf(objects)
