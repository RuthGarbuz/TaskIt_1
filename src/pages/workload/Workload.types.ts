// ─── Types matching SQL stored procedure responses ─────────────────────────────

/** Weekly API response — one row per employee per day */
export interface WeeklyWorkloadRow {
  employeeID: number;
  employee: string;
  weekStart: string;        // "2025-03-16"
  weekEnd: string;          // "2025-03-20"
  workDay: string;          // "2025-03-17"
  dayName: string;          // "Monday"
  dailyTaskHours: number;
  capacityPerDay: number;
  netCapacityPerDay: number;
  dailyWorkloadPct: number;
  weeklyTaskHours: number;
  weeklyNetCapacity: number;
  weeklyWorkloadPct: number;
}

/** Monthly API response — one row per employee per month */
export interface MonthlyWorkloadRow {
  employeeID: number;
  employee: string;
  year: number;
  month: number;            // 1–12
  baseCapacityHours: number;
  officeDeductionHours: number;
  personalDeductionHours: number;
  netCapacityHours: number;
  taskHoursMonth: number;
  workloadPct: number;
}

/** Parameters sent to POST /api/workload/weekly */
export interface WeeklyWorkloadRequest {
  employeeID: number;
  permissionType: number;
  weekStart: string;        // "YYYY-MM-DD" — Sunday of the week
}

/** Parameters sent to POST /api/workload/monthly */
export interface MonthlyWorkloadRequest {
  employeeID: number;
  permissionType: number;
  year: number;
  month: number;
}

/** Normalised shape used inside the component */
export interface EmployeeRow {
  id: number;
  name: string;
}

export interface DayCell {
  date: string;             // "YYYY-MM-DD"
  hours: number;
  percentage: number;
  netCapacity: number;
}

export interface WeeklyEmployee {
  employee: EmployeeRow;
  days: DayCell[];          // 5 entries — Sun–Thu
  weeklyTaskHours: number;
  weeklyNetCapacity: number;
  weeklyWorkloadPct: number;
}

export interface MonthCell {
  month: number;            // 1–12
  hours: number;
  percentage: number;
}

export interface MonthlyEmployee {
  employee: EmployeeRow;
  months: MonthCell[];      // 12 entries
  yearlyTaskHours: number;
  avgWorkloadPct: number;
}