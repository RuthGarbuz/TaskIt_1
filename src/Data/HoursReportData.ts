// ─── Types ────────────────────────────────────────────────────────────────────
export interface HourReportList {
  hoursReportID: number;
  objectID: number;
  /** Legacy / display fallback when taskName is absent */
  /** משימה */
  taskName?: string | null;
  /** שלב */
  stepName?: string | null;
  /** נושא תכנון */
  subjectName?: string | null;
  employeeName: string;
  dateTime: string; // ISO string
  startTime: string;
  endTime: string;
  hours: number;
  hoursInTime: string;
  rawMilliseconds: number;
  description ?: string | null;
  isPlanningStep: boolean;
  projectName: string;
  projectID: number;
}

// export function hourReportTaskLabel(r: HourReportList): string {
//   const t = (r.taskName ?? r.name ?? '').trim();
//   return t || '—';
// }

// export function hourReportStageLabel(r: HourReportList): string {
//   const t = (r.stageName ?? '').trim();
//   return t || '—';
// }

// export function hourReportPlanningSubjectLabel(r: HourReportList): string {
//   const t = (r.planningSubjectName ?? '').trim();
//   return t || '—';
// }
// // Grouped types for the 3 view modes
export interface GroupedByDate {
  date: string;             // 'YYYY-MM-DD'
  reports: HourReportList[];
  totalHours: number;
}

export interface GroupedByEmployee {
  reporterName: string;
  reports: HourReportList[];
  totalHours: number;
}

export interface GroupedByProject {
  project: string;
  reports: HourReportList[];
  totalHours: number;
}

// ─── Demo data ────────────────────────────────────────────────────────────────
// export const DEMO_REPORTS: HourReportList[] = [
//   {
//     hoursReportID: 1, objectID: 1, name: 'עיצוב ממשק ראשי',
//     taskName: 'עיצוב ממשק ראשי', stageName: 'אפיון', planningSubjectName: 'ממשק משתמש',
//     employeeName: 'יוסי כהן',
//     dateTime: '2026-02-11T00:00:00Z', startTime: '09:00', endTime: '12:30',
//     hours: 3.5, hoursInTime: '03:30', rawMilliseconds: 12600000,
//     description: 'עבודה על מסכי הלוגין והדשבורד', isPlanningStep: true,
//     projectName: 'פרויקט א', projectID: 101,
//   },
//   {
//     hoursReportID: 2, objectID: 2, name: 'פיתוח API',
//     taskName: 'פיתוח API', stageName: 'פיתוח', planningSubjectName: 'שירותים',
//     employeeName: 'מיכל לוי',
//     dateTime: '2026-02-11T00:00:00Z', startTime: '13:00', endTime: '17:00',
//     hours: 4, hoursInTime: '04:00', rawMilliseconds: 14400000,
//     description: '', isPlanningStep: false,
//     projectName: 'פרויקט א', projectID: 101,
//   },
//   {
//     hoursReportID: 3, objectID: 3, name: 'בדיקות QA', employeeName: 'רון שמיר',
//     dateTime: '2026-02-10T00:00:00Z', startTime: '', endTime: '',
//     hours: 6, hoursInTime: '06:00', rawMilliseconds: 21600000,
//     description: 'בדיקות רגרסיה מלאות', isPlanningStep: false,
//     projectName: 'פרויקט ב', projectID: 102,
//   },
//   {
//     hoursReportID: 4, objectID: 4, name: 'כתיבת תיעוד', employeeName: 'נועה גל',
//     dateTime: '2026-02-10T00:00:00Z', startTime: '08:00', endTime: '10:00',
//     hours: 2, hoursInTime: '02:00', rawMilliseconds: 7200000,
//     description: '', isPlanningStep: true,
//     projectName: 'פרויקט ב', projectID: 102,
//   },
//   {
//     hoursReportID: 5, objectID: 5, name: 'סקירת קוד', employeeName: 'יוסי כהן',
//     dateTime: '2026-02-09T00:00:00Z', startTime: '14:00', endTime: '16:30',
//     hours: 2.5, hoursInTime: '02:30', rawMilliseconds: 9000000,
//     description: 'סקירת PR מספר 47', isPlanningStep: false,
//     projectName: 'פרויקט ג', projectID: 103,
//   },
//   {
//     hoursReportID: 6, objectID: 6, name: 'ישיבת תכנון', employeeName: 'מיכל לוי',
//     dateTime: '2026-02-09T00:00:00Z', startTime: '', endTime: '',
//     hours: 1.5, hoursInTime: '01:30', rawMilliseconds: 5400000,
//     description: 'ישיבה שבועית', isPlanningStep: true,
//     projectName: 'פרויקט א', projectID: 101,
//   },
//   {
//     hoursReportID: 7, objectID: 7, name: 'דיזיין סיסטם', employeeName: 'נועה גל',
//     dateTime: '2026-02-08T00:00:00Z', startTime: '09:00', endTime: '11:30',
//     hours: 2.5, hoursInTime: '02:30', rawMilliseconds: 9000000,
//     description: 'קומפוננטים בסיסיים', isPlanningStep: true,
//     projectName: 'פרויקט ג', projectID: 103,
//   },
//   {
//     hoursReportID: 8, objectID: 8, name: 'אינטגרציה מסד נתונים', employeeName: 'רון שמיר',
//     dateTime: '2026-02-08T00:00:00Z', startTime: '10:00', endTime: '15:00',
//     hours: 5, hoursInTime: '05:00', rawMilliseconds: 18000000,
//     description: '', isPlanningStep: false,
//     projectName: 'פרויקט ב', projectID: 102,
//   },
// ];

// ─── Helpers ──────────────────────────────────────────────────────────────────
export const formatHours = (h: number): string =>
  h % 1 === 0 ? `${h}h` : `${h.toFixed(1)}h`;

export const formatDateHe = (d: string): string => {
  const normalized = d.includes('T') ? d.split('T')[0] : d;
  const [y, m, day] = normalized.split('-');
  return `${day}/${m}/${y}`;
};

export const getInitials = (name: string): string =>
  name.split(' ').map(w => w[0]).join('').slice(0, 2);

// ─── Grouping functions ───────────────────────────────────────────────────────
const toDateOnly = (dateTime: string): string => (dateTime.includes('T') ? dateTime.split('T')[0] : dateTime);

export function groupByDate(reports: HourReportList[]): GroupedByDate[] {
  const map = new Map<string, HourReportList[]>();
  for (const r of reports) {
    const date = toDateOnly(r.dateTime);
    if (!map.has(date)) map.set(date, []);
    map.get(date)!.push(r);
  }
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))   // newest first
    .map(([date, items]) => ({
      date,
      reports: items,
      totalHours: items.reduce((s, r) => s + r.hours, 0),
    }));
}

export function groupByEmployee(reports: HourReportList[]): GroupedByEmployee[] {
  const map = new Map<string, HourReportList[]>();
  for (const r of reports) {
    if (!map.has(r.employeeName)) map.set(r.employeeName, []);
    map.get(r.employeeName)!.push(r);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([reporterName, items]) => ({
      reporterName,
      reports: items.sort((a, b) => toDateOnly(b.dateTime).localeCompare(toDateOnly(a.dateTime))),
      totalHours: items.reduce((s, r) => s + r.hours, 0),
    }));
}

export function groupByProject(reports: HourReportList[]): GroupedByProject[] {
  const map = new Map<string, HourReportList[]>();
  for (const r of reports) {
    if (!map.has(r.projectName)) map.set(r.projectName, []);
    map.get(r.projectName)!.push(r);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([project, items]) => ({
      project,
      reports: items.sort((a, b) => toDateOnly(b.dateTime).localeCompare(toDateOnly(a.dateTime))),
      totalHours: items.reduce((s, r) => s + r.hours, 0),
    }));
}
export interface HoursReport {
  id:number;
  taskId: number;
  reportDate: string;
  fromTime: string;
  toTime: string;
  totalHours: number;
  inputMode: 'range' | 'total';
  notes?: string;
}


export interface HourReportQuery {
  Database?: string;
  EmployeeID: number;
  PermissionType: number;
  FromDate?: string | null;
  ToDate?: string | null;
  projects?: number[] | null;
}

export interface HourReportProject {
  projectNum: string;
  name: string;
  id: number;
}

export interface HourReportStep {
  id: number;
  name: string;
  isPlanningStep: boolean;
  /** Optional: when the API returns it, used to filter steps/tasks under a planning subject. */
  planningSubjectId?: number;
}

/** Body for `POST /HourReport/planning-hierarchy` — matches server `HourReportProjectQuery`. */
export interface HourReportPlanningHierarchyQuery {
  database: string;
  employeeID: number;
  projectID: number | null;
  isClosed?: boolean | null;
}

/** Planning subject row for hour-report picker (first result set). */
export interface HourReportPlanningSubject {
  id: number;
  name: string;
}

/** Response from `GetPlanningHierarchyByProjectId` — subjects + flat steps/tasks. */
export interface PlanningHierarchyByProjectResult {
  subjects: HourReportPlanningSubject[];
  items: HourReportStep[];
}

