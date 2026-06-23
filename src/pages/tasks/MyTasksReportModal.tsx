import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, FileText, Mail, X } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import * as XLSX from 'xlsx';

export type ReportCellValue = string | number | boolean | null | undefined;
export type ReportRow = Record<string, ReportCellValue>;

export type ReportColumn = {
  key: string;
  label: string;
  widthPx?: number;
  widthChars?: number;
  hideInPrint?: boolean;
  hideInExcel?: boolean;
  align?: 'right' | 'center' | 'left';
};

type PageOrientation = 'portrait' | 'landscape';
type MarginPreset = 'compact' | 'normal' | 'wide';
export type ReportTheme = 'emerald' | 'minimal' | 'print';

const marginMm: Record<MarginPreset, number> = {
  compact: 6,
  normal: 10,
  wide: 16
};

const PDF_COLUMNS_PER_PAGE = 8;

function chunkArray<T>(items: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size) as T[]);
  }
  return result;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function toCellString(value: ReportCellValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'כן' : 'לא';
  return String(value);
}

function defaultReportFileBase() {
  return `tasks-report-${new Date().toISOString().slice(0, 10)}`;
}

function buildReportPdfPageHtml(
  rows: ReportRow[],
  theme: ReportTheme,
  title: string,
  columns: ReportColumn[],
  chunkIndex: number
): string {
  const border = theme === 'print' ? '#000' : '#d1d5db';
  const cellBorder = theme === 'print' ? '#000' : '#e5e7eb';
  const theadBg = theme === 'print' ? '#fff' : '#f3f4f6';
  const printableColumns = columns.filter((column) => !column.hideInPrint);
  const columnChunks = chunkArray(printableColumns, PDF_COLUMNS_PER_PAGE);
  const totalParts = columnChunks.length;
  const activeColumns = columnChunks[chunkIndex];

  if (!activeColumns?.length) {
    return '<div dir="rtl" style="width:960px;background:#fff;">&nbsp;</div>';
  }

  const startCol = chunkIndex * PDF_COLUMNS_PER_PAGE + 1;
  const endCol = chunkIndex * PDF_COLUMNS_PER_PAGE + activeColumns.length;
  const partTitle =
    totalParts > 1
      ? `חלק ${chunkIndex + 1} מתוך ${totalParts} — עמודות \u200E${startCol}–${endCol}\u200E (כל השורות)`
      : '';

  const todayDdMmYyyy = (() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  })();

  const headerBlock =
    theme === 'emerald'
      ? `<div style="background:linear-gradient(90deg,#059669,#0d9488);color:#fff;padding:8px 14px;border-radius:10px 10px 0 0;margin:0;">
          <div style="display:flex;direction:ltr;justify-content:space-between;align-items:center;width:100%;font-size:16px;font-weight:700;">
            <span style="font-weight:600;opacity:.95;">${todayDdMmYyyy}</span>
            <span>${escapeHtml(title)}</span>
          </div>
          ${partTitle ? `<div style="font-size:10px;font-weight:500;opacity:.85;margin-top:3px;text-align:right;">${escapeHtml(partTitle)}</div>` : ''}
        </div>`
      : theme === 'minimal'
        ? `<div style="background:#f3f4f6;color:#111827;padding:7px 12px;border-radius:8px 8px 0 0;border:1px solid #e5e7eb;border-bottom:none;">
            <div style="display:flex;direction:ltr;justify-content:space-between;align-items:center;width:100%;font-size:14px;font-weight:700;">
              <span style="color:#6b7280;font-weight:600;">${todayDdMmYyyy}</span>
              <span>${escapeHtml(title)}</span>
            </div>
            ${partTitle ? `<div style="font-size:10px;color:#6b7280;margin-top:2px;text-align:right;">${escapeHtml(partTitle)}</div>` : ''}
          </div>`
        : `<div style="background:#fff;color:#000;padding:6px 0;border-bottom:3px solid #000;margin:0;">
            <div style="display:flex;direction:ltr;justify-content:space-between;align-items:baseline;width:100%;">
              <span style="font-size:11px;font-weight:600;">${todayDdMmYyyy}</span>
              <span style="font-size:15px;font-weight:800;">${escapeHtml(title)}</span>
            </div>
            ${partTitle ? `<div style="font-size:9px;color:#555;margin-top:2px;text-align:right;">${escapeHtml(partTitle)}</div>` : ''}
          </div>`;

  const tableShellFirst =
    theme === 'print'
      ? 'border:2px solid #000;border-radius:0;'
      : 'border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;';

  const tableShellNext =
    theme === 'print'
      ? 'border:2px solid #000;border-radius:0;'
      : 'border:1px solid #e5e7eb;border-radius:10px;';

  const shell = chunkIndex === 0 ? tableShellFirst : tableShellNext;

  const totalColWidth = activeColumns.reduce((sum, col) => sum + (col.widthPx ?? 120), 0);
  const colGroup = activeColumns
    .map((column) => {
      const pct = (((column.widthPx ?? 120) / totalColWidth) * 100).toFixed(3);
      return `<col style="width:${pct}%;" />`;
    })
    .join('');

  const thCells = activeColumns
    .map((column) => {
      const textAlign = column.align ?? 'right';
      return `<th style="border:1px solid ${border};padding:7px 4px;text-align:${textAlign};font-weight:700;background:${theadBg};font-size:10px;font-family:'Segoe UI',Arial,sans-serif;">${escapeHtml(column.label)}</th>`;
    })
    .join('');

  const tableRows = rows
    .map((row, rowIndex) => {
      const tds = activeColumns
        .map((column) => {
          const textAlign = column.align ?? 'right';
          return `<td style="border:1px solid ${cellBorder};padding:5px 4px;text-align:${textAlign};vertical-align:top;background:${rowIndex % 2 === 0 ? '#ffffff' : '#f9fafb'};font-size:10px;">${escapeHtml(toCellString(row[column.key]))}</td>`;
        })
        .join('');
      return `<tr>${tds}</tr>`;
    })
    .join('');

  return `
    <div dir="rtl" lang="he" style="font-family:'Segoe UI',Arial,sans-serif;width:100%;min-width:720px;background:#fff;color:#111827;box-sizing:border-box;padding-bottom:12px;">
      ${headerBlock}
      <div style="margin-top:0;">

        <div style="${shell}overflow:visible;">
          <table style="border-collapse:collapse;width:100%;table-layout:fixed;font-size:9px;font-family:'Segoe UI',Arial,sans-serif;">
            <colgroup>${colGroup}</colgroup>
            <thead><tr>${thCells}</tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
      </div>
      <p style="font-size:10px;color:#9ca3af;margin:10px 0 0 0;text-align:center;line-height:1.4;">נוצר ממערכת PlanIt</p>
    </div>
  `;
}

type MyTasksReportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  rows: ReportRow[];
  columns: ReportColumn[];
  filteredCount?: number;
  reportTitle?: string;
  fileBaseName?: string;
  onCopySummary?: () => void;
  onExportJson?: () => void;
};

export default function MyTasksReportModal({
  isOpen,
  onClose,
  rows,
  columns,
  filteredCount,
  reportTitle = 'דוח רשימת משימות',
  fileBaseName,
  onCopySummary,
  onExportJson
}: MyTasksReportModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const [orientation, setOrientation] = useState<PageOrientation>('landscape');
  const [marginPreset, setMarginPreset] = useState<MarginPreset>('normal');
  const [theme, setTheme] = useState<ReportTheme>('emerald');
  const [busy, setBusy] = useState<'pdf' | 'xlsx' | 'email' | null>(null);

  const rowCount = filteredCount ?? rows.length;
  const printableColumns = useMemo(() => columns.filter((column) => !column.hideInPrint), [columns]);
  const excelColumns = useMemo(() => columns.filter((column) => !column.hideInExcel), [columns]);
  const outputBaseName = fileBaseName ?? defaultReportFileBase();

  const runPdf = useCallback(
    async (mode: 'download' | 'blob'): Promise<Blob | void> => {
      if (printableColumns.length === 0) {
        alert('לא נבחרו עמודות להדפסה.');
        return;
      }

      const chunkCount = chunkArray(printableColumns, PDF_COLUMNS_PER_PAGE).length;
      const html2pdf = (await import('html2pdf.js')).default;
      const m = marginMm[marginPreset];
      const mergedPdf = await PDFDocument.create();

      const waitForPaint = async () => {
        try {
          await document.fonts.ready;
        } catch {
          /* ignore */
        }
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
          });
        });
      };

      for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex++) {
        const html = buildReportPdfPageHtml(rows, theme, reportTitle, columns, chunkIndex);
        const wrapper = document.createElement('div');
        wrapper.innerHTML = html.trim();
        const el = wrapper.firstElementChild as HTMLElement;
        if (!el) continue;

        el.style.position = 'fixed';
        el.style.left = '0';
        el.style.top = '0';
        el.style.width = '960px';
        el.style.boxSizing = 'border-box';
        el.style.zIndex = '-1';
        el.style.pointerEvents = 'none';
        el.style.backgroundColor = '#ffffff';
        document.body.appendChild(el);

        try {
          await waitForPaint();

          const w = Math.max(el.offsetWidth, el.scrollWidth, 960);
          const h = Math.max(el.offsetHeight, el.scrollHeight, 1);

          const opt = {
            margin: [m, m, m, m] as [number, number, number, number],
            filename: `${outputBaseName}.pdf`,
            image: { type: 'jpeg' as const, quality: 0.96 },
            html2canvas: {
              scale: 2,
              useCORS: true,
              logging: false,
              backgroundColor: '#ffffff',
              width: w,
              height: h,
              scrollX: 0,
              scrollY: 0,
              windowWidth: w,
              windowHeight: h
            },
            jsPDF: {
              unit: 'mm' as const,
              format: 'a4' as const,
              orientation
            },
            pagebreak: { mode: ['css', 'legacy'] as const }
          };

          const blob = (await html2pdf().set(opt).from(el).outputPdf('blob')) as Blob;
          const chunkPdf = await PDFDocument.load(await blob.arrayBuffer());
          const copiedPages = await mergedPdf.copyPages(chunkPdf, chunkPdf.getPageIndices());
          copiedPages.forEach((page: any) => mergedPdf.addPage(page));
        } finally {
          document.body.removeChild(el);
        }
      }

      const pdfBytes = await mergedPdf.save();
      const outBlob = new Blob([Uint8Array.from(pdfBytes)], { type: 'application/pdf' });

      if (mode === 'download') {
        const url = URL.createObjectURL(outBlob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${outputBaseName}.pdf`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
      } else {
        return outBlob;
      }
    },
    [rows, columns, printableColumns, theme, reportTitle, orientation, marginPreset, outputBaseName]
  );

  const handleDownloadPdf = async () => {
    setBusy('pdf');
    try {
      await runPdf('download');
    } catch {
      alert('שגיאה ביצירת PDF. נסו שוב או שינוי סגנון עמוד.');
    } finally {
      setBusy(null);
    }
  };

  const handleDownloadXlsx = () => {
    setBusy('xlsx');
    try {
      if (excelColumns.length === 0) {
        alert('לא נבחרו עמודות ל-Excel.');
        return;
      }

      const xlsxColCount = excelColumns.length;
      const created = new Date();
      const titleSub = `נוצר: ${created.toLocaleDateString('he-IL', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}  ·  סה״כ ${rowCount} שורות`;

      const padRow = (text: string): string[] => {
        const line = Array<string>(xlsxColCount).fill('');
        line[0] = text;
        return line;
      };

      const dataAoA = rows.map((row) => excelColumns.map((column) => toCellString(row[column.key])));
      const blank = Array<string>(xlsxColCount).fill('');
      const aoa = [padRow(reportTitle), padRow(titleSub), blank, excelColumns.map((column) => column.label), ...dataAoA];

      const ws = XLSX.utils.aoa_to_sheet(aoa);

      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: xlsxColCount - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: xlsxColCount - 1 } }
      ];

      ws['!cols'] = excelColumns.map((column) => ({
        wch: column.widthChars ?? Math.max(8, Math.round((column.widthPx ?? 120) / 7))
      }));

      const titleRows: NonNullable<XLSX.WorkSheet['!rows']> = [];
      titleRows[0] = { hpt: 30 };
      titleRows[1] = { hpt: 24 };
      titleRows[2] = { hpt: 8 };
      titleRows[3] = { hpt: 22 };
      ws['!rows'] = titleRows;

      const wb = XLSX.utils.book_new();
      wb.Workbook = { Views: [{ RTL: true }] };
      wb.Props = {
        Title: reportTitle,
        Subject: `${reportTitle} (${rowCount} שורות)`,
        Author: 'PlanIt',
        CreatedDate: created
      };

      XLSX.utils.book_append_sheet(wb, ws, reportTitle.slice(0, 24) || 'דוח');
      XLSX.writeFile(wb, `${outputBaseName}.xlsx`);
    } finally {
      setBusy(null);
    }
  };

  const handleEmail = async () => {
    setBusy('email');
    const datePart = new Date().toISOString().slice(0, 10);
    const filename = `${outputBaseName}.pdf`;

    try {
      const blob = await runPdf('blob');
      if (!blob) {
        alert('לא ניתן ליצור PDF.');
        return;
      }

      const file = new File([blob], filename, { type: 'application/pdf' });
      const nav = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
        share?: (data: ShareData) => Promise<void>;
      };

      if (typeof nav.canShare === 'function' && nav.canShare({ files: [file] }) && typeof nav.share === 'function') {
        try {
          await nav.share({
            title: reportTitle,
            text: `${reportTitle} (${rowCount} שורות) — ${datePart}`,
            files: [file]
          });
          return;
        } catch (e) {
          if ((e as Error).name === 'AbortError') return;
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      window.location.href = `mailto:?subject=${encodeURIComponent(`${reportTitle} ${datePart}`)}&body=${encodeURIComponent(
        `מצורף ${reportTitle} בקובץ PDF שהורד כעת (${filename}).\n\nאנא צרף את הקובץ להודעה ושלח.\n\nסה"כ שורות בדוח: ${rowCount}`
      )}`;
    } catch {
      alert('שגיאה ביצירת PDF לשליחה במייל.');
    } finally {
      setBusy(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="סגירה" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-lg modal-shell dark-surface bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl"
        role="dialog"
        aria-labelledby="report-modal-title"
      >
        <div className="flex items-start justify-between border-b border-gray-100 dark:border-gray-700 px-5 py-4">
          <div>
            <h2 id="report-modal-title" className="text-lg font-bold text-gray-900 dark:text-white">
              {reportTitle}
            </h2>
            <p className="mt-1 text-sm text-gray-500">{rowCount} שורות (לפי מסננים נוכחיים)</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="סגור"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 px-5 py-4">
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">סגנון עמוד (PDF / מייל)</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-gray-700">
                כיוון
                <select
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value as PageOrientation)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="portrait">לאורך (A4)</option>
                  <option value="landscape">לרוחב (A4)</option>
                </select>
              </label>
              <label className="block text-sm text-gray-700">
                שוליים
                <select
                  value={marginPreset}
                  onChange={(e) => setMarginPreset(e.target.value as MarginPreset)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="compact">צפופים</option>
                  <option value="normal">רגילים</option>
                  <option value="wide">רחבים</option>
                </select>
              </label>
            </div>
            <label className="mt-3 block text-sm text-gray-700">
              עיצוב דוח
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as ReportTheme)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="emerald">כותרת ירוקה (מומלץ)</option>
                <option value="minimal">מינימלי אפור</option>
                <option value="print">הדפסה שחור-לבן</option>
              </select>
            </label>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">ייצוא</h3>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={!!busy}
                onClick={handleDownloadPdf}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <FileText size={18} />
                {busy === 'pdf' ? 'מייצא…' : 'הורד PDF'}
              </button>
              <button
                type="button"
                disabled={!!busy}
                onClick={handleDownloadXlsx}
                className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
              >
                <FileSpreadsheet size={18} />
                {busy === 'xlsx' ? 'מייצא…' : 'הורד Excel (XLSX)'}
              </button>
              <button
                type="button"
                disabled={!!busy}
                onClick={handleEmail}
                className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
              >
                <Mail size={18} />
                {busy === 'email' ? 'מכין…' : 'שליחה במייל (PDF)'}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              בדפדפנים שתומכים בשיתוף קבצים נפתח תפריט עם קובץ PDF מצורף. אחרת הקובץ יורד וייפתח תיבת דואר.
            </p>
          </section>

          {(onCopySummary || onExportJson) && (
            <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-3 text-xs text-emerald-700">
              {onCopySummary && (
                <button type="button" onClick={onCopySummary} className="underline hover:text-emerald-900">
                  העתקת סיכום
                </button>
              )}
              {onExportJson && (
                <button type="button" onClick={onExportJson} className="underline hover:text-emerald-900">
                  ייצוא JSON
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
