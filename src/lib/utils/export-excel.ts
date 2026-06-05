import * as XLSX from "xlsx";

export interface ExportColumn<T> {
  header: string;
  accessor: (row: T) => string | number | boolean | null | undefined;
}

/**
 * Export data rows to an .xlsx file and trigger browser download.
 * @param filename - File name without extension
 * @param sheetName - Sheet tab name
 * @param columns - Column definitions with header and accessor
 * @param data - Array of data rows
 */
export function exportToExcel<T>(
  filename: string,
  sheetName: string,
  columns: ExportColumn<T>[],
  data: T[]
) {
  const rows = data.map((row) =>
    Object.fromEntries(
      columns.map((col) => [col.header, col.accessor(row) ?? ""])
    )
  );

  const ws = XLSX.utils.json_to_sheet(rows);

  // Auto-width columns
  const colWidths = columns.map((col) => ({
    wch: Math.max(
      col.header.length,
      ...rows.map((r) => String(r[col.header] ?? "").length),
      10
    ),
  }));
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
