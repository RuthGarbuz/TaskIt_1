export type StatusType = string;

export interface Phase {
  name: string;
  owner: string;
  status: StatusType;
  start: string; // yyyy-MM-dd
  end: string;   // yyyy-MM-dd
  /** מזהה שלב תכנון (מהשרת) */
  id?: number;
  statuID?: number;
  /** אופציונלי — לסינון עדיפות כשקיים בנתונים */
  urgencyId?: number;
}

export interface Project {
  id: number;
  name: string;
  color: string;
  phases: Phase[];
  /** אופציונלי — סינון סטודיו/מחלקה */
  departmentId?: number;
  departmentName?: string;
}

/** סינון גאנט — מבנה דומה ל־DBFilters עם שינויי בחירה יחידה */
export interface GanttFilters {
  dateFrom: string;
  dateTo: string;
  closedTasks: 'all' | 'yes' | 'no';
  /** סטטוס שלב — id מההגדרות; null = כל הסטטוסים */
  stepStatusId: number | null;
  /** סטטוס פרויקט — id מההגדרות; null = כל הסטטוסים */
  projectStatusId: number | null;
  urgency: number[];
  /** ראש צוות — עובד יחיד */
  teamLeadId: number | null;
  /** סטודיו / מחלקה — יחיד */
  studioDepartmentId: number | null;
  projects: number[];
}

export type ViewMode = 'month' | 'quarter';
