const sanitizeCell = (value) => {
  if (value == null) return "";
  return String(value).replace(/"/g, '""');
};

const buildCsvContent = (columns, rows) => {
  const header = columns.map((column) => `"${sanitizeCell(column.label)}"`).join(",");
  const body = rows
    .map((row) =>
      columns
        .map((column) => `"${sanitizeCell(row[column.key])}"`)
        .join(","),
    )
    .join("\n");

  return `${header}\n${body}`;
};

export const downloadCsvReport = ({ filename, columns, rows }) => {
  const csv = buildCsvContent(columns, rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const downloadPdfReport = async ({
  filename,
  title,
  meta = [],
  columns,
  rows,
}) => {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF("p", "pt", "a4");
  doc.setFontSize(20);
  doc.text(title, 40, 48);

  doc.setFontSize(10);
  let currentY = 68;
  meta.forEach((line) => {
    if (!line) return;
    doc.text(String(line), 40, currentY);
    currentY += 14;
  });

  autoTable(doc, {
    startY: currentY + 12,
    head: [columns.map((column) => column.label)],
    body: rows.map((row) => columns.map((column) => row[column.key] ?? "")),
    theme: "striped",
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
    styles: { fontSize: 9, cellPadding: 6 },
  });

  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
};
