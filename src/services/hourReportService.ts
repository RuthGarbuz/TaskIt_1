import type {
  HourReportList,
  HourReportPlanningSubject,
  HourReportProject,
  HourReportQuery,
  HoursReport,
  HourReportStep,
  PlanningHierarchyByProjectResult,
} from '../Data/HoursReportData';
import authService from './authService';




const getAuthenticatedUser = () => {
  const user = authService.getCurrentUser();
  if (!user) throw new Error('User not authenticated');
  return user;
};

const buildEndpoint = (baseUrl: string, path: string) => `${baseUrl}${path}`;
const buildPostOptions = (body: unknown) => ({ method: 'POST' as const, body: JSON.stringify(body) });

const toNullableIsoDate = (value?: string | null): string | null => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

const toNullableTimeSpan = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Server expects TimeSpan format, safest is HH:mm:ss
  if (/^\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed}:00`;
  }

  return trimmed;
};

export const getHourReports = async (query: HourReportQuery): Promise<HourReportList[]> => {
  try {
    const user = getAuthenticatedUser();

    const payload = {
      database: user.dataBase,
      employeeID: query.EmployeeID,
      permissionType: query.PermissionType,
      fromDate: toNullableIsoDate(query.FromDate ?? null),
      toDate: toNullableIsoDate(query.ToDate ?? null),
      ProjectsIds: query.projects ?? null,
    } as const;

    const endpoint = buildEndpoint(user.urlConnection, '/HourReport/GetHourReports');
    const response = await authService.makeAuthenticatedRequest(endpoint, buildPostOptions(payload));

    if (!response.ok) {
      throw new Error(`Failed to fetch hour reports: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching hour reports:', error);
    throw error;
  }
};

export const getHourReportProjects = async (isActive?: boolean | null, isClosed?: boolean | null): Promise<HourReportProject[]> => {
  try {
    const user = getAuthenticatedUser();

    const payload = {
      database: user.dataBase,
      employeeID: user.id,
      isActive: isActive ?? null,
      isClosed: isClosed ?? null,
    } as const;

    const endpoint = buildEndpoint(user.urlConnection, '/HourReport/GetHourReportProjects');
    const response = await authService.makeAuthenticatedRequest(endpoint, buildPostOptions(payload));

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch hour report projects (${response.status}): ${errorText || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching hour report projects:', error);
    throw error;
  }
};

const asRecord = (v: unknown): Record<string, unknown> | null =>
  v != null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

const readSubjects = (raw: unknown): HourReportPlanningSubject[] => {
  const root = asRecord(raw);
  const arr = (root?.subjects ?? root?.Subjects) as unknown;
  if (!Array.isArray(arr)) return [];
  return arr
    .map((row): HourReportPlanningSubject | null => {
      const r = asRecord(row);
      if (!r) return null;
      const id = Number(r.id ?? r.ID ?? 0);
      const name = String(r.name ?? r.Name ?? '').trim();
      if (!Number.isFinite(id) || id <= 0) return null;
      return { id, name };
    })
    .filter((x): x is HourReportPlanningSubject => x != null);
};

const readStepItems = (raw: unknown): HourReportStep[] => {
  const root = asRecord(raw);
  const arr = (root?.items ?? root?.Items) as unknown;
  if (!Array.isArray(arr)) return [];
  return arr
    .map((row): HourReportStep | null => {
      const r = asRecord(row);
      if (!r) return null;
      const id = Number(r.id ?? r.ID ?? 0);
      const name = String(r.name ?? r.Name ?? '').trim();
      const isStep = r.isPlanningStep ?? r.IsPlanningStep;
      const isPlanningStep = typeof isStep === 'boolean' ? isStep : String(isStep).toLowerCase() === 'true';
      if (!Number.isFinite(id) || id <= 0) return null;
      const psRaw = r.planningSubjectId ?? r.PlanningSubjectID ?? r.planningSubjectID;
      const psNum = psRaw != null && psRaw !== '' ? Number(psRaw) : NaN;
      const planningSubjectId =
        Number.isFinite(psNum) && psNum > 0 ? psNum : undefined;
      return { id, name, isPlanningStep, ...(planningSubjectId != null ? { planningSubjectId } : {}) };
    })
    .filter((x): x is HourReportStep => x != null);
};

/**
 * Loads planning subjects and step/task rows for the hour-report flow
 * (`POST /HourReport/planning-hierarchy` → `GetPlanningHierarchyByProjectIdAsync`).
 */
export const getPlanningHierarchyByProjectId = async (
  projectId: number,
  isClosed?: boolean | null,
): Promise<PlanningHierarchyByProjectResult> => {
  try {
    const user = getAuthenticatedUser();
    const payload = {
      database: user.dataBase,
      employeeID: user.id,
      projectID: projectId,
      isClosed: isClosed ?? null,
    } as const;

    const endpoint = buildEndpoint(user.urlConnection, '/HourReport/planning-hierarchy');
    const response = await authService.makeAuthenticatedRequest(endpoint, buildPostOptions(payload));

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch planning hierarchy (${response.status}): ${errorText || response.statusText}`,
      );
    }

    const raw: unknown = await response.json();
    return {
      subjects: readSubjects(raw),
      items: readStepItems(raw),
    };
  } catch (error) {
    console.error('Error fetching planning hierarchy by project:', error);
    throw error;
  }
};

// export const getHourReportStepsByProjectId = async (
//   projectId: number,
//   isClosed?: boolean | null,
// ): Promise<HourReportStep[]> => {
//   try {
//     const user = getAuthenticatedUser();

//     const payload = {
//       database: user.dataBase,
//       employeeID: user.id,
//       projectID: projectId,
//       isClosed: isClosed ?? null,
//     } as const;

//     const endpoint = buildEndpoint(user.urlConnection, '/HourReport/GetHourReportSteps');
//     const response = await authService.makeAuthenticatedRequest(endpoint, buildPostOptions(payload));

//     if (!response.ok) {
//       const errorText = await response.text();
//       throw new Error(`Failed to fetch hour report steps (${response.status}): ${errorText || response.statusText}`);
//     }

//     return await response.json();
//   } catch (error) {
//     console.error('Error fetching hour report steps:', error);
//     throw error;
//   }
// };

export const insertHourReport = async (report: HoursReport, projectId: number, isTask: boolean): Promise<boolean> => {
  try {
    const user = getAuthenticatedUser();
    const reportDate = toNullableIsoDate(report.reportDate);

    const payload = {
      database: user.dataBase,
      employeeID: user.id,
      taskId: report.taskId,
      reportDate,
      fromTime: report.inputMode === 'range' ? toNullableTimeSpan(report.fromTime) : null,
      toTime: report.inputMode === 'range' ? toNullableTimeSpan(report.toTime) : null,
      totalHours: report.totalHours > 0 ? report.totalHours : null,
      inputMode: report.inputMode,
      notes: report.notes?.trim() ? report.notes.trim() : null,
      projectID: projectId,
      isTask,
    } as const;

    const endpoint = buildEndpoint(user.urlConnection, '/HourReport/InsertHourReport');
    const response = await authService.makeAuthenticatedRequest(endpoint, buildPostOptions(payload));

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to insert hour report (${response.status}): ${errorText || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error inserting hour report:', error);
    throw error;
  }
};
export const updateHourReport = async (report: HoursReport): Promise<boolean> => {
  try {
    const user = getAuthenticatedUser();
    const reportDate = toNullableIsoDate(report.reportDate);

    const payload = {
      database: user.dataBase,
      hourReportId: report.id,
      reportDate,
      fromTime: report.inputMode === 'range' ? toNullableTimeSpan(report.fromTime) : null,
      toTime: report.inputMode === 'range' ? toNullableTimeSpan(report.toTime) : null,
      totalHours: report.totalHours > 0 ? report.totalHours : null,
      notes: report.notes?.trim() ? report.notes.trim() : null,
     
    } as const;

    const endpoint = buildEndpoint(user.urlConnection, '/HourReport/UpdateHourReport');
    const response = await authService.makeAuthenticatedRequest(endpoint, buildPostOptions(payload));

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update hour report (${response.status}): ${errorText || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating hour report:', error);
    throw error;
  }
};
export const deleteHourReport = async (hourReportId: number): Promise<boolean> => {
  try {
   const user = getAuthenticatedUser();
    const query = {
      database: user.dataBase,
      id: hourReportId,
    };
const endpoint = buildEndpoint(
      user.urlConnection,
       "/HourReport/DeleteHourReport" 
    );

    const response = await authService.makeAuthenticatedRequest(
      endpoint,
      buildPostOptions(query)
    );
 
    if (!response.ok) {
      throw new Error(`Failed to delete hour report: ${response.statusText}`);
    }

    const result = await response.json();
    return result.message ? true : result;
  } catch (error) {
    console.error('Error deleting hour report:', error);
    throw error;
  }
};
export const deleteTaskOrStageAsync = async (
  id: number,
  isTask: boolean
): Promise<boolean> => {
  try {
    const user = getAuthenticatedUser();
    const query = {
      database: user.dataBase,
      id
    };

    const endpoint = buildEndpoint(
      user.urlConnection,
      isTask ? "/Tasks/DeleteTaskAsync" : "/Tasks/DeleteStageAsync"
    );

    const response = await authService.makeAuthenticatedRequest(
      endpoint,
      buildPostOptions(query)
    );

    if (!response.ok) {
      throw new Error(`Failed to delete: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error deleting task/stage:", error);
    throw error;
  }
};
export default {
  getHourReports,
  getHourReportProjects,
 // getHourReportStepsByProjectId,
  getPlanningHierarchyByProjectId,
  insertHourReport,
  updateHourReport,
  deleteHourReport,
};
