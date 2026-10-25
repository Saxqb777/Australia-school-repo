import "server-only";
import ExcelJS from "exceljs";
import mammoth from "mammoth";
import { READABLE_TYPES, readSchedule } from "./ai/read-documents";

function cellText(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((r) => r.text).join("");
    if ("text" in v && typeof v.text === "string") return v.text;
    if ("result" in v) return cellText(v.result as ExcelJS.CellValue);
    return "";
  }
  return String(v);
}

/** First worksheet as tab-separated text; merged cells keep the value only in their first cell. */
async function excelToTable(data: Buffer): Promise<string> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data as unknown as ArrayBuffer);
  const ws = wb.worksheets[0];
  if (!ws) return "";
  const lines: string[] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      const master = cell.isMerged && cell.master !== cell ? "" : cellText(cell.value);
      cells[col - 1] = master.replace(/[\t\r\n]+/g, " ").trim();
    });
    lines.push(Array.from(cells, (c) => c ?? "").join("\t"));
  });
  return lines.join("\n");
}

const extension = (name: string) => name.toLowerCase().split(".").pop() ?? "";

/**
 * Turns an uploaded schedule into the table text the preview reads. Excel and CSV are read directly;
 * PDF, Word and photos are read by AI.
 */
export async function scheduleFileToText(file: File): Promise<string> {
  const ext = extension(file.name);
  const data = Buffer.from(await file.arrayBuffer());
  if (["csv", "tsv", "txt"].includes(ext)) return data.toString("utf8");
  if (ext === "xlsx") return excelToTable(data);
  if (ext === "xls") throw new Error("Old .xls files can't be read. In Excel, choose File, Save As, Excel Workbook (.xlsx), then upload that.");
  if (ext === "docx") {
    const { value } = await mammoth.convertToHtml({ buffer: data });
    return readSchedule({ text: value });
  }
  const mime = file.type || (ext === "pdf" ? "application/pdf" : ext === "png" ? "image/png" : "image/jpeg");
  if (READABLE_TYPES[mime]) return readSchedule({ data, mimeType: mime });
  throw new Error("Use an Excel (.xlsx), CSV, PDF, Word (.docx) or photo (JPG or PNG) file.");
}
