import authService from './authService';
import type { EmployeeLink, PlanningStep, PlanningTask } from '../Data/projectsData';
import type { GanttFilters } from '../pages/gantt/types';
import type { Project } from '../pages/gantt/types';

const PROJECT_COLORS = ['#7F77DD', '#1D9E75', '#D85A30', '#BA7517', '#3266ad', '#639922', '#E24B4A', '#8b5cf6'];

const getAuthenticatedUser = () => {
  const user = authService.getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user;
};

const buildEndpoint = (baseUrl: string, path: string): string => `${baseUrl}${path}`;

const buildPostOptions = (body: unknown) => ({
  method: 'POST' as const,
  body: JSON.stringify(body),
});

/** Matches server GetStepDataQuery ([FromBody]). */
export interface GetStepDataQuery {
  stepId: number;
  database?: string;
}

/** Matches server GanttStepQuery (POST body). */
export interface GanttStepQuery {
  database?: string;
  stepStatusID?: number | null;
  projectStatusID?: number | null;
  leaderID?: number | null;
  studioDepartmentID?: number | null;
  projectIDs?: number[];
}

/** Matches server GanttStep response row. */
export interface GanttStep {
  projectID: number;
  projectName: string;
  planningStepsID: number;
  stepName: string;
  statuID: number;
  statusName: string;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
}

const mapGanttStep = (item: Record<string, unknown>): GanttStep => ({
  projectID: Number(item.projectID ?? item.ProjectID ?? 0),
  projectName: String(item.projectName ?? item.ProjectName ?? ''),
  planningStepsID: Number(item.planningStepsID ?? item.PlanningStepsID ?? 0),
  stepName: String(item.stepName ?? item.StepName ?? ''),
  statuID: Number(item.statuID ?? item.StatuID ?? 0),
  statusName: String(item.statusName ?? item.StatusName ?? ''),
  startDate: toIsoDateOrNull(item.startDate ?? item.StartDate),
  endDate: toIsoDateOrNull(item.endDate ?? item.EndDate),
  isActive: Boolean(item.isActive ?? item.IsActive ?? false),
});

const toIsoDateOrNull = (value: unknown): string | null => {
  if (value == null || value === '') return null;
  if (typeof value === 'string') {
    const d = value.includes('T') ? value.split('T')[0] : value;
    return d.length >= 10 ? d.slice(0, 10) : value;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().split('T')[0];
  }
  return null;
};

const toIsoDateString = (value: unknown, fallback = ''): string =>
  toIsoDateOrNull(value) ?? fallback;

const fallbackDate = () => new Date().toISOString().split('T')[0];

const toNumber = (value: unknown, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const toBoolOrNull = (value: unknown): boolean | null => {
  if (value == null) return null;
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1' || value === 1) return true;
  if (value === 'false' || value === '0' || value === 0) return false;
  return null;
};

const pick = (row: Record<string, unknown>, keys: string[]): unknown => {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) return row[key];
  }
  return undefined;
};

const mapEmployeeLink = (row: Record<string, unknown>): EmployeeLink => {
  const linkId = toNumber(pick(row, ['linkId', 'LinkId', 'id', 'ID']), 0);
  const employeeId = toNumber(pick(row, ['employeeId', 'EmployeeId', 'EmployeeID']), 0);
  return {
    linkId,
    id: linkId,
    employeeId,
    employeeName: String(pick(row, ['employeeName', 'EmployeeName']) ?? ''),
    percentage: toNumber(pick(row, ['percentage', 'Percentage'])),
    workHours: toNumber(pick(row, ['workHours', 'WorkHours'])),
    hoursActual: toNumber(pick(row, ['hoursActual', 'HoursActual'])),
    workDays: toNumber(pick(row, ['workDays', 'WorkingDays', 'WorkDays'])),
    duration: toNumber(pick(row, ['duration', 'Duration'])),
    statusId: pick(row, ['statusId', 'StatusId', 'StatusID']) != null
      ? toNumber(pick(row, ['statusId', 'StatusId', 'StatusID']))
      : undefined,
  };
};

const mapPlanningTask = (row: Record<string, unknown>): PlanningTask => ({
  id: toNumber(pick(row, ['id', 'Id', 'ID'])),
  PlanningStepID: toNumber(pick(row, ['planningStepID', 'PlanningStepID', 'PlanningStepId'])),
  name: String(pick(row, ['name', 'Name', 'taskName', 'TaskName']) ?? ''),
  orderNum: toNumber(pick(row, ['orderNum', 'OrderNum'])),
  percentage: toNumber(pick(row, ['percentage', 'Percentage', 'taskPercentage', 'TaskPercentage'])),
  workHours: toNumber(pick(row, ['workHours', 'WorkHours'])),
  workDays: toNumber(pick(row, ['workDays', 'WorkingDays', 'WorkDays'])),
  duration: toNumber(pick(row, ['duration', 'Duration', 'taskDuration', 'TaskDuration']), 1),
  dependsOnTaskId: toBoolOrNull(pick(row, ['dependsOnTaskId', 'DependsOnTaskId', 'DependsOnTaskID'])),
  employees: Array.isArray(row.employees ?? row.Employees)
    ? ((row.employees ?? row.Employees) as Record<string, unknown>[]).map(mapEmployeeLink)
    : [],
  startDate: toIsoDateString(pick(row, ['startDate', 'StartDate']), fallbackDate()),
  endDate: toIsoDateString(pick(row, ['endDate', 'EndDate']), fallbackDate()),
  statusId: toNumber(pick(row, ['statusId', 'StatusId', 'statuID', 'StatuID'])),
  urgencyId: toNumber(pick(row, ['urgencyId', 'UrgencyId', 'urgencyID', 'UrgencyID'])),
  isActive: Boolean(pick(row, ['isActive', 'IsActive']) ?? true),
  hasHourReport: pick(row, ['hasHourReport', 'HasHourReport']) === true
    || pick(row, ['hasHourReport', 'HasHourReport']) === 1
    || String(pick(row, ['hasHourReport', 'HasHourReport']) ?? '').toLowerCase() === 'true',
  attachments: []
});

const mapPlanningStep = (row: Record<string, unknown>): PlanningStep => ({
  id: toNumber(pick(row, ['id', 'Id', 'ID'])),
  PlanningSubjectID: toNumber(pick(row, ['planningSubjectID', 'PlanningSubjectID', 'PlanningSubjectId'])),
  name: String(pick(row, ['name', 'Name', 'stepName', 'StepName']) ?? ''),
  orderNum: toNumber(pick(row, ['orderNum', 'OrderNum']), 1),
  percentage: toNumber(pick(row, ['percentage', 'Percentage', 'stepPercentage', 'StepPercentage'])),
  workHours: toNumber(pick(row, ['workHours', 'WorkHours'])),
  workDays: toNumber(pick(row, ['workDays', 'WorkingDays', 'WorkDays'])),
  duration: toNumber(pick(row, ['duration', 'Duration', 'stepDuration', 'StepDuration']), 1),
  dependsOnStepId: toBoolOrNull(pick(row, ['dependsOnStepId', 'DependsOnStepId', 'DependsOnStepID'])),
  employees: Array.isArray(row.employees ?? row.Employees)
    ? ((row.employees ?? row.Employees) as Record<string, unknown>[]).map(mapEmployeeLink)
    : [],
  startDate: toIsoDateString(pick(row, ['startDate', 'StartDate']), fallbackDate()),
  endDate: toIsoDateString(pick(row, ['endDate', 'EndDate']), fallbackDate()),
  statusId: toNumber(pick(row, ['statusId', 'StatusId', 'statuID', 'StatuID'])),
  urgencyId: toNumber(pick(row, ['urgencyId', 'UrgencyId', 'urgencyID', 'UrgencyID'])),
  isActive: Boolean(pick(row, ['isActive', 'IsActive']) ?? true),
  isExpanded: Boolean(pick(row, ['isExpanded', 'IsExpanded']) ?? true),
  tasks: Array.isArray(row.tasks ?? row.Tasks)
    ? ((row.tasks ?? row.Tasks) as Record<string, unknown>[]).map(mapPlanningTask)
    : [],
});

/** Build API body with PascalCase keys expected by ASP.NET model binding. */
const toServerGanttStepQuery = (query: GanttStepQuery, database: string) => ({
  Database: database,
  StepStatusID: query.stepStatusID ?? null,
  ProjectStatusID: query.projectStatusID ?? null,
  LeaderID: query.leaderID ?? null,
  StudioDepartmentID: query.studioDepartmentID ?? null,
  ProjectIDs: query.projectIDs ?? [],
});

const toServerGetStepDataQuery = (query: GetStepDataQuery, database: string) => ({
  database,
  stepId: query.stepId,
});

/** Map UI filters to API query (server-side filtering). */
export const ganttFiltersToQuery = (f: GanttFilters): GanttStepQuery => ({
  stepStatusID: f.stepStatusId,
  projectStatusID: f.projectStatusId,
  leaderID: f.teamLeadId,
  studioDepartmentID: f.studioDepartmentId,
  projectIDs: f.projects.length > 0 ? f.projects : undefined,
});

/** Group flat GanttStep rows into Project[] for the gantt UI. */
export const ganttStepsToProjects = (steps: GanttStep[]): Project[] => {
  const byProject = new Map<number, Project>();

  for (const row of steps) {
    if (!row.projectID) continue;

    let proj = byProject.get(row.projectID);
    if (!proj) {
      const colorIdx = byProject.size % PROJECT_COLORS.length;
      proj = {
        id: row.projectID,
        name: row.projectName || `פרויקט ${row.projectID}`,
        color: PROJECT_COLORS[colorIdx],
        phases: [],
      };
      byProject.set(row.projectID, proj);
    }

    const start = row.startDate ?? fallbackDate();
    const end = row.endDate ?? start;

    proj.phases.push({
      id: row.planningStepsID,
      statuID: row.statuID,
      name: row.stepName || '—',
      owner: '',
      status: row.statusName?.trim() || 'עתידי',
      start,
      end,
    });
  }

  return Array.from(byProject.values()).map(p => ({
    ...p,
    phases: [...p.phases].sort((a, b) => a.start.localeCompare(b.start)),
  }));
};

/**
 * POST api/GanttSteps/get — matches GanttStepsController + [HttpPost("get")].
 */
export const getGanttSteps = async (query: GanttStepQuery = {}): Promise<GanttStep[]> => {
  try {
    const user = getAuthenticatedUser();
    const endpoint = buildEndpoint(user.urlConnection, '/GanttSteps/get');
    const body = toServerGanttStepQuery(query, user.dataBase);

    const response = await authService.makeAuthenticatedRequest(endpoint, buildPostOptions(body));

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(
        `Failed to fetch gantt steps: ${response.status} ${response.statusText}${errorText ? ` — ${errorText}` : ''}`.trim()
      );
    }

    const data = await response.json();
    if (!Array.isArray(data)) return [];

    return data.map((row: Record<string, unknown>) => mapGanttStep(row));
  } catch (error) {
    console.error('Error fetching gantt steps:', error);
    throw error;
  }
};

/**
 * POST api/GanttSteps/step-data — matches [HttpPost("step-data")] GetPlanningStepData ([FromBody]).
 */
export const getPlanningStepData = async (
  query: GetStepDataQuery,
): Promise<PlanningStep | null> => {
  try {
    const user = getAuthenticatedUser();
    if (!Number.isFinite(query.stepId) || query.stepId <= 0) {
      throw new Error('Invalid step id for planning step data');
    }
    const body = toServerGetStepDataQuery(query, query.database ?? user.dataBase);
    const endpoint = buildEndpoint(user.urlConnection, '/GanttSteps/step-data');

    const response = await authService.makeAuthenticatedRequest(endpoint, buildPostOptions(body));

    if (response.status === 404 || response.status === 204) return null;

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(
        `Failed to fetch planning step: ${response.status} ${response.statusText}${errorText ? ` — ${errorText}` : ''}`.trim(),
      );
    }

    const raw = await response.text();
    if (!raw.trim()) return null;
    const data = JSON.parse(raw) as unknown;
    if (data == null || typeof data !== 'object') return null;

    return mapPlanningStep(data as Record<string, unknown>);
  } catch (error) {
    console.error('Error fetching planning step data:', error);
    throw error;
  }
};

// ── Save gantt step (POST save-data) ─────────────────────────────────────────

interface GanttEmployeeLinkRequest {
  Id?: number | null;
  LinkId?: number | null;
  EmployeeId: number;
  EmployeeName?: string;
  Percentage: number;
  WorkHours: number;
  WorkDays: number;
  Duration: number;
  StatusId?: number;
  HoursActual?: number;
}

interface GanttPlanningTaskRequest {
  Id?: number | null;
  Name: string;
  OrderNum: number;
  Percentage: number;
  WorkHours: number;
  WorkDays: number;
  Duration: number;
  DependsOnTaskId: boolean | null;
  Employees: GanttEmployeeLinkRequest[];
  DeletedEmployeeIds: number[];
  StartDate: string | null;
  EndDate: string | null;
  StatusId: number;
  UrgencyId: number;
  IsActive: boolean;
  MigrateStepResourcesToFirstTask?: boolean;
}

interface GanttPlanningStepRequest {
  Id?: number | null;
  Name: string;
  OrderNum: number;
  Percentage: number;
  WorkHours: number;
  WorkDays: number;
  Duration: number;
  DependsOnStepId: boolean | null;
  Employees: GanttEmployeeLinkRequest[];
  DeletedEmployeeIds: number[];
  StartDate: string | null;
  EndDate: string | null;
  StatusId: number;
  UrgencyId: number;
  IsActive: boolean;
  IsExpanded?: boolean | null;
  Tasks: GanttPlanningTaskRequest[];
  DeletedTaskIds: number[];
}

export interface GanttStepSaveRequest {
  Database: string;
  ProjectId: number;
  EmployeeId: number;
  SubjectId: number;
  GanttStep: GanttPlanningStepRequest;
}

export interface SaveGanttStepParams {
  projectId: number;
  subjectId: number;
  step: PlanningStep;
}

const dedupeNumbers = (items: number[]): number[] =>
  Array.from(new Set(items.filter(n => n > 0)));

const toNullableIsoDate = (value?: string | null): string | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const buildGanttEmployeeLinks = (employees: EmployeeLink[]): GanttEmployeeLinkRequest[] =>
  employees
    .filter(employee => !employee.isDeleted)
    .map(employee => ({
      Id: employee.id > 0 ? employee.id : null,
      LinkId: employee.linkId > 0 ? employee.linkId : null,
      EmployeeId: employee.employeeId,
      EmployeeName: employee.employeeName,
      Percentage: employee.percentage,
      WorkHours: employee.workHours,
      WorkDays: employee.workDays,
      Duration: employee.duration,
      StatusId: employee.statusId,
      HoursActual: employee.hoursActual,
    }));

export const buildGanttStepRequest = (step: PlanningStep): GanttPlanningStepRequest => {
  const deletedTaskIds = dedupeNumbers([
    ...(step.deletedTaskIds ?? []),
    ...step.tasks.filter(task => task.isDeleted && task.id > 0).map(task => task.id),
  ]);

  const deletedEmployeeIds = dedupeNumbers([
    ...(step.deletedEmployeeIds ?? []),
    ...step.employees.filter(employee => employee.isDeleted).map(employee => employee.id),
  ]);

  const tasks = step.tasks
    .filter(task => !task.isDeleted)
    .map(task => {
      const migrateStepResources = Boolean(task.migrateStepResourcesToFirstTask);
      return {
        Id: task.id > 0 ? task.id : null,
        Name: task.name,
        OrderNum: task.orderNum,
        Percentage: task.percentage,
        WorkHours: task.workHours,
        WorkDays: task.workDays,
        Duration: task.duration,
        DependsOnTaskId: task.dependsOnTaskId ?? null,
        Employees: migrateStepResources ? [] : buildGanttEmployeeLinks(task.employees),
        DeletedEmployeeIds: migrateStepResources
          ? []
          : dedupeNumbers([
            ...(task.deletedEmployeeIds ?? []),
            ...task.employees.filter(employee => employee.isDeleted).map(employee => employee.id),
          ]),
        StartDate: toNullableIsoDate(task.startDate),
        EndDate: toNullableIsoDate(task.endDate),
        StatusId: task.statusId,
        UrgencyId: task.urgencyId,
        IsActive: task.isActive,
        ...(migrateStepResources ? { MigrateStepResourcesToFirstTask: true } : {}),
      };
    });

  return {
    Id: step.id > 0 ? step.id : null,
    Name: step.name,
    OrderNum: step.orderNum,
    Percentage: step.percentage,
    WorkHours: step.workHours,
    WorkDays: step.workDays,
    Duration: step.duration,
    DependsOnStepId: step.dependsOnStepId ?? null,
    Employees: buildGanttEmployeeLinks(step.employees),
    DeletedEmployeeIds: deletedEmployeeIds,
    StartDate: toNullableIsoDate(step.startDate),
    EndDate: toNullableIsoDate(step.endDate),
    StatusId: step.statusId,
    UrgencyId: step.urgencyId,
    IsActive: step.isActive,
    IsExpanded: step.isExpanded,
    Tasks: tasks,
    DeletedTaskIds: deletedTaskIds,
  };
};

/**
 * POST api/GanttSteps/save-data — matches [HttpPost("save-data")] SaveGanttSteps.
 */
export const saveGanttStep = async ({
  projectId,
  subjectId,
  step,
}: SaveGanttStepParams): Promise<unknown> => {
  try {
    const user = getAuthenticatedUser();
    const requestBody: GanttStepSaveRequest = {
      Database: user.dataBase,
      ProjectId: projectId,
      EmployeeId: user.id,
      SubjectId: subjectId,
      GanttStep: buildGanttStepRequest(step),
    };

    const endpoint = buildEndpoint(user.urlConnection, '/GanttSteps/save-data');
    const response = await authService.makeAuthenticatedRequest(
      endpoint,
      buildPostOptions(requestBody),
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(
        `Failed to save gantt step: ${response.status} ${response.statusText}${errorText ? ` — ${errorText}` : ''}`.trim(),
      );
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving gantt step:', error);
    throw error;
  }
};
