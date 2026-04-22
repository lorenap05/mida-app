import * as XLSX from "xlsx";
import type { MonthlyData } from "./userStore";
import { getMonthColumns } from "./monthUtils";

const EXPECTED_ROWS = ["Income", "Rent", "Groceries", "Transport", "Leisure", "Utilities", "Health", "Education", "Others"];

export interface ParseResult {
  success: boolean;
  data?: MonthlyData[];
  error?: string;
}

export const parseFinancialTemplate = (file: File): Promise<ParseResult> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (!json || json.length < 10) {
          resolve({ success: false, error: "The file doesn't have enough rows. Please use the provided template." });
          return;
        }

        // Accept either real month labels (Mar/25) or legacy M1..M12
        const expectedCols = getMonthColumns(); // e.g. ["Mar/25", ..., "Feb/26"]
        const legacyCols   = ["M1","M2","M3","M4","M5","M6","M7","M8","M9","M10","M11","M12"];

        const headerRow  = json[0];
        const colHeaders = headerRow.slice(1, 13).map((h: any) => String(h ?? "").trim());

        const usesRealLabels  = colHeaders[0] === expectedCols[0]  && colHeaders[11] === expectedCols[11];
        const usesLegacy      = colHeaders[0] === legacyCols[0]    && colHeaders[11] === legacyCols[11];

        if (!usesRealLabels && !usesLegacy) {
          resolve({
            success: false,
            error: `Column headers not recognised. Expected "${expectedCols[0]}" through "${expectedCols[11]}" (or M1 through M12). Please use the downloaded template.`,
          });
          return;
        }

        // Validate row names and parse data
        const monthlyData: MonthlyData[] = [];
        for (let m = 0; m < 12; m++) {
          const entry: any = { month: `M${m + 1}` };
          for (let r = 0; r < EXPECTED_ROWS.length; r++) {
            const row = json[r + 1];
            if (!row) {
              resolve({ success: false, error: `Missing row: "${EXPECTED_ROWS[r]}". Do not change row names.` });
              return;
            }
            const rowName = String(row[0] ?? "").trim();
            if (rowName !== EXPECTED_ROWS[r]) {
              resolve({ success: false, error: `Row name mismatch: expected "${EXPECTED_ROWS[r]}" but found "${rowName || "(empty)"}". Do not change row names.` });
              return;
            }
            const cellValue = row[m + 1];
            if (cellValue === undefined || cellValue === null || cellValue === "") {
              resolve({ success: false, error: `Empty cell at ${EXPECTED_ROWS[r]} / column ${m + 1}. Please fill all cells with numbers.` });
              return;
            }
            const num = Number(cellValue);
            if (isNaN(num)) {
              resolve({ success: false, error: `Non-numeric value "${cellValue}" at ${EXPECTED_ROWS[r]} / column ${m + 1}. Use only numbers.` });
              return;
            }
            entry[EXPECTED_ROWS[r].toLowerCase()] = num;
          }
          monthlyData.push(entry as MonthlyData);
        }

        resolve({ success: true, data: monthlyData });
      } catch {
        resolve({ success: false, error: "Failed to read the file. Please make sure it's a valid .xlsx file." });
      }
    };
    reader.onerror = () => resolve({ success: false, error: "Failed to read the file." });
    reader.readAsArrayBuffer(file);
  });
};