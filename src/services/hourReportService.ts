import type { HourReportList, HourReportProject, HourReportQuery, HoursReport, HourReportStep } from '../Data/HoursReportData';
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

export const getHourReportStepsByProjectId = async (
  projectId: number,
  isClosed?: boolean | null,
): Promise<HourReportStep[]> => {
  try {
    const user = getAuthenticatedUser();

    const payload = {
      database: user.dataBase,
      employeeID: user.id,
      projectID: projectId,
      isClosed: isClosed ?? null,
    } as const;

    const endpoint = buildEndpoint(user.urlConnection, '/HourReport/GetHourReportSteps');
    const response = await authService.makeAuthenticatedRequest(endpoint, buildPostOptions(payload));

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch hour report steps (${response.status}): ${errorText || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching hour report steps:', error);
    throw error;
  }
};

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
  getHourReportStepsByProjectId,
  insertHourReport,
  updateHourReport,
  deleteHourReport,
};
