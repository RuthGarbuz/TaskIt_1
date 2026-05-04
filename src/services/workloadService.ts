import authService from "./authService";

// ─── Request / Response types ─────────────────────────────────────────────────

export interface WeeklyWorkloadRequest {
  database: string;
  employeeID: number;
  permissionType: number;
  weekStart: string; // "YYYY-MM-DD"
}

export interface WeeklyWorkloadResult {
  employeeID: number;
  employee: string;
  weekStart: string;
  weekEnd: string;
  workDay: string;
  dayName: string;
  dailyTaskHours: number;
  capacityPerDay: number;
  netCapacityPerDay: number;
  dailyWorkloadPct: number;
  weeklyTaskHours: number;
  weeklyNetCapacity: number;
  weeklyWorkloadPct: number;
}

export interface MonthlyWorkloadRequest {
  database: string;
  employeeID: number;
  permissionType: number;
  month: number; // 1–12
  year: number;
}

export interface MonthlyWorkloadResult {
  employeeID: number;
  employee: string;
  year: number;
  month: number;
  baseCapacityHours: number;
  officeDeductionHours: number;
  personalDeductionHours: number;
  netCapacityHours: number;
  taskHoursMonth: number;
  workloadPct: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getAuthenticatedUser = () => {
  const user = authService.getCurrentUser();
  if (!user) throw new Error("User not authenticated");
  return user;
};

const buildEndpoint = (baseUrl: string, path: string) => `${baseUrl}${path}`;

const buildPostOptions = (body: unknown) => ({
  method: "POST" as const,
  body: JSON.stringify(body),
});

// ─── Weekly workload ──────────────────────────────────────────────────────────

export const getWeeklyWorkload = async (
  weekStart: string // "YYYY-MM-DD" — Sunday of the week
): Promise<WeeklyWorkloadResult[]> => {
  try {
    const user = getAuthenticatedUser();
    const request: WeeklyWorkloadRequest = {
      database: user.dataBase,
      employeeID: user.id,
      permissionType: user.permissionId,
      weekStart,
    };
    const endpoint = buildEndpoint(user.urlConnection, "/Workload/GetWeeklyWorkload");
    const response = await authService.makeAuthenticatedRequest(endpoint, buildPostOptions(request));
    if (!response.ok) throw new Error(`Failed to fetch weekly workload: ${response.statusText}`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching weekly workload:", error);
    throw error;
  }
};

// ─── Monthly workload ─────────────────────────────────────────────────────────

export const getMonthlyWorkload = async (
  month: number, // 1–12
  year: number
): Promise<MonthlyWorkloadResult[]> => {
  try {
    const user = getAuthenticatedUser();
    const request: MonthlyWorkloadRequest = { 
      database: user.dataBase,
      employeeID: user.id,
      permissionType: user.permissionId,
      month,
      year,
    };
    const endpoint = buildEndpoint(user.urlConnection, "/Workload/GetMonthlyWorkload");
    const response = await authService.makeAuthenticatedRequest(endpoint, buildPostOptions(request));
    if (!response.ok) throw new Error(`Failed to fetch monthly workload: ${response.statusText}`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching monthly workload:", error);
    throw error;
  }
};