import * as XLSX from "xlsx";

const safeText = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  if (Array.isArray(value)) return value.map(safeText).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const escapeHtml = (value) =>
  safeText(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const normalizeRows = (rows, columns) =>
  rows.map((row) =>
    Object.fromEntries(
      columns.map((column) => [
        column.header,
        safeText(column.value ? column.value(row) : row[column.key]),
      ]),
    ),
  );

const timestamp = () => new Date().toISOString().slice(0, 10);

export const exportToExcel = ({ rows, columns, filename, sheetName = "Data" }) => {
  const worksheet = XLSX.utils.json_to_sheet(normalizeRows(rows, columns));
  worksheet["!cols"] = columns.map((column) => ({
    wch: Math.max(column.header.length + 2, 14),
  }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  XLSX.writeFile(workbook, `${filename}-${timestamp()}.xlsx`);
};

export const exportToPdf = ({ rows, columns, title, company = {} }) => {
  const tableRows = normalizeRows(rows, columns);
  const companyName = company.name || company.company_name || company.brand_name || "Company";
  const logoUrl = company.logoUrl || company.logo_url || "";
  const contactLine = [
    company.gst_number ? `GST: ${company.gst_number}` : "",
    company.phone ? `Phone: ${company.phone}` : "",
    company.email ? `Email: ${company.email}` : "",
    company.website ? `Website: ${company.website}` : "",
  ].filter(Boolean).join(" | ");
  const generatedAt = new Date().toLocaleString();
  const html = `
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          @page { margin: 18mm 12mm 16mm; }
          body { font-family: Arial, sans-serif; color: #111827; margin: 0; }
          .report-header {
            border-bottom: 2px solid #111827;
            display: flex;
            justify-content: space-between;
            gap: 20px;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .company-block { display: flex; align-items: flex-start; gap: 12px; min-width: 0; }
          .company-logo {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            height: 54px;
            object-fit: contain;
            padding: 4px;
            width: 54px;
          }
          .company-name { font-size: 20px; font-weight: 800; margin: 0 0 5px; }
          .company-meta, .report-meta, .footer { color: #64748b; font-size: 11px; line-height: 1.45; }
          .report-title { font-size: 17px; font-weight: 800; margin: 0 0 5px; text-align: right; }
          table { border-collapse: collapse; width: 100%; font-size: 11px; }
          th, td { border: 1px solid #cbd5e1; padding: 7px; text-align: left; vertical-align: top; }
          th { background: #f1f5f9; font-weight: 700; }
          tr:nth-child(even) td { background: #f8fafc; }
          .footer {
            border-top: 1px solid #cbd5e1;
            display: flex;
            justify-content: space-between;
            gap: 16px;
            margin-top: 18px;
            padding-top: 8px;
          }
          @media print {
            .footer { position: fixed; bottom: 0; left: 0; right: 0; }
          }
        </style>
      </head>
      <body>
        <header class="report-header">
          <div class="company-block">
            ${logoUrl ? `<img class="company-logo" src="${escapeHtml(logoUrl)}" alt="${escapeHtml(companyName)} logo" />` : ""}
            <div>
              <p class="company-name">${escapeHtml(companyName)}</p>
              ${company.address ? `<div class="company-meta">${escapeHtml(company.address)}</div>` : ""}
              ${contactLine ? `<div class="company-meta">${escapeHtml(contactLine)}</div>` : ""}
            </div>
          </div>
          <div>
            <p class="report-title">${escapeHtml(title)}</p>
            <div class="report-meta">Generated: ${escapeHtml(generatedAt)}</div>
            <div class="report-meta">Rows: ${tableRows.length}</div>
          </div>
        </header>
        <table>
          <thead>
            <tr>${columns.map((column) => `<th>${escapeHtml(column.header)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${tableRows
              .map(
                (row) =>
                  `<tr>${columns
                    .map((column) => `<td>${escapeHtml(row[column.header])}</td>`)
                    .join("")}</tr>`,
              )
              .join("")}
          </tbody>
        </table>
        <footer class="footer">
          <span>${escapeHtml(companyName)}</span>
          <span>${escapeHtml(title)} | Generated ${escapeHtml(generatedAt)}</span>
        </footer>
      </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};
