// ─── Types ────────────────────────────────────────────────────────────────────
export interface HoursReportEntry {
  id: number;
  taskId: number;
  taskName: string;
  project: string;
  stage: string;
  reportDate: string;       // 'YYYY-MM-DD'
  fromTime: string;         // 'HH:MM' or ''
  toTime: string;           // 'HH:MM' or ''
  totalHours: number;
  inputMode: 'range' | 'total';
  reporterName: string;
  notes?: string;
}

// Grouped types for the 3 view modes
export interface GroupedByDate {
  date: string;             // 'YYYY-MM-DD'
  reports: HoursReportEntry[];
  totalHours: number;
}

export interface GroupedByEmployee {
  reporterName: string;
  reports: HoursReportEntry[];
  totalHours: number;
}

export interface GroupedByProject {
  project: string;
  reports: HoursReportEntry[];
  totalHours: number;
}

// ─── Demo data ────────────────────────────────────────────────────────────────
export const DEMO_REPORTS: HoursReportEntry[] = [
  {
    id: 1, taskId: 1, taskName: 'עיצוב ממשק ראשי', project: 'פרויקט א',
    stage: 'תכנון UI', reportDate: '2026-02-11',
    fromTime: '09:00', toTime: '12:30', totalHours: 3.5, inputMode: 'range',
    reporterName: 'יוסי כהן', notes: 'עבודה על מסכי הלוגין והדשבורד',
  },
  {
    id: 2, taskId: 2, taskName: 'פיתוח API', project: 'פרויקט א',
    stage: 'פיתוח Backend', reportDate: '2026-02-11',
    fromTime: '13:00', toTime: '17:00', totalHours: 4, inputMode: 'range',
    reporterName: 'מיכל לוי', notes: '',
  },
  {
    id: 3, taskId: 3, taskName: 'בדיקות QA', project: 'פרויקט ב',
    stage: 'בדיקות', reportDate: '2026-02-10',
    fromTime: '', toTime: '', totalHours: 6, inputMode: 'total',
    reporterName: 'רון שמיר', notes: 'בדיקות רגרסיה מלאות',
  },
  {
    id: 4, taskId: 4, taskName: 'כתיבת תיעוד', project: 'פרויקט ב',
    stage: 'תיעוד', reportDate: '2026-02-10',
    fromTime: '08:00', toTime: '10:00', totalHours: 2, inputMode: 'range',
    reporterName: 'נועה גל', notes: '',
  },
  {
    id: 5, taskId: 5, taskName: 'סקירת קוד', project: 'פרויקט ג',
    stage: 'Code Review', reportDate: '2026-02-09',
    fromTime: '14:00', toTime: '16:30', totalHours: 2.5, inputMode: 'range',
    reporterName: 'יוסי כהן', notes: 'סקירת PR מספר 47',
  },
  {
    id: 6, taskId: 6, taskName: 'ישיבת תכנון', project: 'פרויקט א',
    stage: 'ניהול', reportDate: '2026-02-09',
    fromTime: '', toTime: '', totalHours: 1.5, inputMode: 'total',
    reporterName: 'מיכל לוי', notes: 'ישיבה שבועית',
  },
  {
    id: 7, taskId: 7, taskName: 'דיזיין סיסטם', project: 'פרויקט ג',
    stage: 'תכנון UI', reportDate: '2026-02-08',
    fromTime: '09:00', toTime: '11:30', totalHours: 2.5, inputMode: 'range',
    reporterName: 'נועה גל', notes: 'קומפוננטים בסיסיים',
  },
  {
    id: 8, taskId: 8, taskName: 'אינטגרציה מסד נתונים', project: 'פרויקט ב',
    stage: 'פיתוח Backend', reportDate: '2026-02-08',
    fromTime: '10:00', toTime: '15:00', totalHours: 5, inputMode: 'range',
    reporterName: 'רון שמיר', notes: '',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
export const formatHours = (h: number): string =>
  h % 1 === 0 ? `${h}h` : `${h.toFixed(1)}h`;

export const formatDateHe = (d: string): string => {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

export const getInitials = (name: string): string =>
  name.split(' ').map(w => w[0]).join('').slice(0, 2);

// ─── Grouping functions ───────────────────────────────────────────────────────
export function groupByDate(reports: HoursReportEntry[]): GroupedByDate[] {
  const map = new Map<string, HoursReportEntry[]>();
  for (const r of reports) {
    if (!map.has(r.reportDate)) map.set(r.reportDate, []);
    map.get(r.reportDate)!.push(r);
  }
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))   // newest first
    .map(([date, items]) => ({
      date,
      reports: items,
      totalHours: items.reduce((s, r) => s + r.totalHours, 0),
    }));
}

export function groupByEmployee(reports: HoursReportEntry[]): GroupedByEmployee[] {
  const map = new Map<string, HoursReportEntry[]>();
  for (const r of reports) {
    if (!map.has(r.reporterName)) map.set(r.reporterName, []);
    map.get(r.reporterName)!.push(r);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([reporterName, items]) => ({
      reporterName,
      reports: items.sort((a, b) => b.reportDate.localeCompare(a.reportDate)),
      totalHours: items.reduce((s, r) => s + r.totalHours, 0),
    }));
}

export function groupByProject(reports: HoursReportEntry[]): GroupedByProject[] {
  const map = new Map<string, HoursReportEntry[]>();
  for (const r of reports) {
    if (!map.has(r.project)) map.set(r.project, []);
    map.get(r.project)!.push(r);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([project, items]) => ({
      project,
      reports: items.sort((a, b) => b.reportDate.localeCompare(a.reportDate)),
      totalHours: items.reduce((s, r) => s + r.totalHours, 0),
    }));
}