// Updated Task type with new fields
export interface Task {
  id: number;
  subject: string;
  sender: string;
  receivers: string[];
  assignee?: string;        // ✅ NEW: מבצע
  status: 'todo' | 'inProgress' | 'done';
  urgency: 'low' | 'medium' | 'high';
  date?: string;            // תאריך כללי (backward compatibility)
  startDate?: string;       // ✅ NEW: תאריך התחלה
  endDate?: string;         // ✅ NEW: תאריך סיום
  hoursEstimate?: number;
  hoursActual?: number;     // ✅ NEW: שעות בפועל
  utilizationPercentage?: number; // ✅ NEW: אחוז ניצול (0-100)
  dependsOnStage?: boolean; // ✅ UPDATED: תלוי בשלב
  dependsOnStageName?: string; // ✅ NEW: שם השלב התלוי
  budget?: number;          // ✅ NEW: תקציב
  completed: boolean;
  project: string;
  stage: string;
  planning: string;
  hasChat?: boolean;        // ✅ NEW: יש צ'אט
  hasUnreadMessages?: boolean; // ✅ NEW: יש הודעות שלא נקראו
  unreadMessages?: number;  // ✅ NEW: מספר הודעות שלא נקראו
  canSubmitInvoice?: boolean; // ✅ NEW: ניתן להגשת חשבון
  invoiceStatus?: 'pending' | 'sent' | 'approved' | 'rejected'; // ✅ NEW: סטטוס חשבונית
}

export type TaskStatus = 'todo' | 'inProgress' | 'done';
export type TaskUrgency = 'low' | 'medium' | 'high';
export type ViewMode = 'list' | 'gantt';
export type GroupBy = 'all' | 'status' | 'urgency' | 'project' | 'date';
export type CurrentView =
  | 'allTasks'
  | 'myTasks'
  | 'hoursReport'
  | 'workload'
  | 'settings'
  | 'projects'
  | 'billTasks';