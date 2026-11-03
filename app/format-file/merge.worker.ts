/// <reference lib="webworker" />
import * as XLSX from "xlsx";

type HeaderMode = "first" | "all" | "none";
type MergeMode = "append" | "sheets";

type InMsg = {
  type: "merge";
  files: File[];
  mergeMode: MergeMode;
  headerMode: HeaderMode;
  bookType: "xlsx" | "csv" | "biff8";
};

type OutMsg =
  | { type: "progress"; stage: "read" | "write"; index?: number; total?: number; name?: string }
  | { type: "done"; buffer: ArrayBuffer; rows: number; sheets: number }
  | { type: "error"; message: string };

declare const self: DedicatedWorkerGlobalScope;

function post(msg: OutMsg, transfer?: Transferable[]) {
  self.postMessage(msg, transfer ?? []);
}

// V8 refuses to enumerate objects with more than ~8.3M properties
// ("RangeError: Too many properties to enumerate"), and SheetJS stores
// a worksheet as {A1:{...}, B1:{...}, ..., !ref:...}. Keep each sheet
// safely under that limit; this also stays under Excel's 1,048,576 rows.
const SAFE_CELL_LIMIT = 6_000_000;

function csvEscape(v: unknown): string {
  if (v === null || v === undefined || v === "") return "";
  const s = typeof v === "string" ? v : v instanceof Date ? v.toISOString() : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowsToCsv(rows: unknown[][]): string {
  const parts: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const line = new Array(r.length);
    for (let j = 0; j < r.length; j++) line[j] = csvEscape(r[j]);
    parts.push(line.join(","));
  }
  return parts.join("\n");
}

function chunkSizeFor(colCount: number): number {
  const safeByCells = Math.max(1, Math.floor(SAFE_CELL_LIMIT / Math.max(1, colCount)));
  return Math.min(safeByCells, 1_000_000);
}

function maxColCount(rows: unknown[][]): number {
  let m = 0;
  for (let i = 0; i < rows.length; i++) {
    const len = rows[i].length;
    if (len > m) m = len;
  }
  return m;
}

self.addEventListener("message", async (e: MessageEvent<InMsg>) => {
  const { type } = e.data;
  if (type !== "merge") return;
  const { files, mergeMode, headerMode, bookType } = e.data;

  try {
    const parsed: { name: string; sheets: { name: string; rows: unknown[][] }[] }[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      post({ type: "progress", stage: "read", index: i + 1, total: files.length, name: f.name });
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheets = wb.SheetNames.map((n) => {
        const ws = wb.Sheets[n];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
          header: 1,
          raw: true,
          defval: "",
          blankrows: false,
        });
        return { name: n, rows };
      });
      parsed.push({ name: f.name, sheets });
    }

    let totalRows = 0;
    let totalSheets = 0;

    // Build combined rows once (used by both append and csv-direct paths)
    const combined: unknown[][] = [];
    if (mergeMode === "append") {
      let headerAdded = false;
      for (const f of parsed) {
        for (const sh of f.sheets) {
          if (sh.rows.length === 0) continue;
          if (headerMode === "none") {
            for (const r of sh.rows) combined.push(r);
          } else if (headerMode === "first") {
            if (!headerAdded) {
              for (const r of sh.rows) combined.push(r);
              headerAdded = true;
            } else {
              for (let i = 1; i < sh.rows.length; i++) combined.push(sh.rows[i]);
            }
          } else {
            for (const r of sh.rows) combined.push(r);
          }
        }
      }
      totalRows = combined.length;
    }

    post({ type: "progress", stage: "write" });

    // CSV path: write directly from rows, no sheet object — handles any size.
    if (bookType === "csv" && mergeMode === "append") {
      const csv = rowsToCsv(combined);
      const bytes = new TextEncoder().encode("﻿" + csv);
      const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      totalSheets = 1;
      post({ type: "done", buffer: ab, rows: totalRows, sheets: totalSheets }, [ab]);
      return;
    }
    if (bookType === "csv" && mergeMode === "sheets") {
      // CSV can only hold one sheet; concatenate all with a separator comment line.
      const parts: string[] = [];
      for (const f of parsed) {
        for (const sh of f.sheets) {
          parts.push(`# ${f.name} :: ${sh.name}`);
          parts.push(rowsToCsv(sh.rows));
          totalRows += sh.rows.length;
          totalSheets += 1;
        }
      }
      const csv = parts.join("\n");
      const bytes = new TextEncoder().encode("﻿" + csv);
      const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      post({ type: "done", buffer: ab, rows: totalRows, sheets: totalSheets }, [ab]);
      return;
    }

    const outWb = XLSX.utils.book_new();

    if (mergeMode === "append") {
      // Chunk into multiple sheets so each sheet stays under V8's property-
      // enumeration limit and under Excel's 1,048,576 row cap.
      const cols = maxColCount(combined);
      const chunk = chunkSizeFor(cols);
      const headerRow =
        headerMode === "first" && combined.length > 0 ? combined[0] : null;
      const dataStart = headerRow ? 1 : 0;
      const dataLen = combined.length - dataStart;
      const sheetCount = dataLen > 0 ? Math.ceil(dataLen / chunk) : 1;

      for (let s = 0; s < sheetCount; s++) {
        const from = dataStart + s * chunk;
        const to = Math.min(combined.length, from + chunk);
        const slice: unknown[][] = [];
        if (headerRow) slice.push(headerRow);
        for (let i = from; i < to; i++) slice.push(combined[i]);
        const ws = XLSX.utils.aoa_to_sheet(slice);
        const name = sheetCount > 1 ? `Merged ${s + 1}` : "Merged";
        XLSX.utils.book_append_sheet(outWb, ws, name);
      }
      totalSheets = sheetCount;
    } else {
      const used = new Set<string>();
      for (const f of parsed) {
        const base = f.name.replace(/\.(xlsx|xls|csv|ods|tsv)$/i, "");
        for (const sh of f.sheets) {
          const baseLabel = f.sheets.length > 1 ? `${base} - ${sh.name}` : base;
          const cleaned = baseLabel.replace(/[\\/?*[\]:]/g, "_") || "Sheet";
          // Also chunk per-source-sheet when a single sheet exceeds the limit.
          const cols = maxColCount(sh.rows);
          const chunk = chunkSizeFor(cols);
          const parts = Math.max(1, Math.ceil(sh.rows.length / chunk));
          for (let p = 0; p < parts; p++) {
            const slice = sh.rows.slice(p * chunk, (p + 1) * chunk);
            const label = parts > 1 ? `${cleaned} ${p + 1}` : cleaned;
            let name = label.slice(0, 31);
            let unique = name;
            let i = 2;
            while (used.has(unique)) {
              const suffix = ` (${i++})`;
              unique = name.slice(0, 31 - suffix.length) + suffix;
            }
            used.add(unique);
            const ws = XLSX.utils.aoa_to_sheet(slice);
            XLSX.utils.book_append_sheet(outWb, ws, unique);
            totalRows += slice.length;
            totalSheets += 1;
          }
        }
      }
    }

    const out = XLSX.write(outWb, { bookType, type: "array", compression: true }) as ArrayBuffer;
    post({ type: "done", buffer: out, rows: totalRows, sheets: totalSheets }, [out]);
  } catch (err) {
    post({
      type: "error",
      message: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    });
  }
});

export {};
