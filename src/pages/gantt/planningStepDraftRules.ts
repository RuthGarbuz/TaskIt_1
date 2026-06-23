import type { EmployeeLink, PlanningAttachment, PlanningStep, PlanningTask } from '../../Data/projectsData';
import { COMPLETED_STATUS_ID } from '../tasks/taskStatusChangeRules';
import {
  STEP_STATUS_CHILDREN_SYNC_MSG,
  type StepStatusSyncConfirmFn,
} from '../shared/statusSyncConfirm';

export const WORK_HOURS_PER_DAY = 8;

export const TASK_STATUS_BLOCKED_BY_STEP_MSG =
  'לא ניתן לשנות סטטוס משימה כל עוד השלב הושלם. ניתן לשנות את הסטטוס של השלב כדי לעדכן.';

export const STEP_COMPLETE_REQUIRES_TASKS_SYNC_MSG =
  'לא ניתן לשנות את סטטוס השלב להושלם כל עוד המשימות לא הושלמו. האם לשנות את הסטטוס של המשימות והעובדים של השלב גם להושלם?';

const visibleEmployeeLinks = (employees: EmployeeLink[]) => employees.filter(e => !e.isDeleted);

export const syncEmployeesToStatus = (employees: EmployeeLink[], statusId: number): EmployeeLink[] =>
  employees.map(e => (e.isDeleted ? e : { ...e, statusId, isModified: true }));

export const allEmployeesAtStatus = (employees: EmployeeLink[], statusId: number): boolean => {
  const vis = visibleEmployeeLinks(employees);
  return vis.length === 0 || vis.every(e => (e.statusId ?? 0) === statusId);
};

export const collectStepEmployeeLinks = (step: PlanningStep): EmployeeLink[] => [
  ...visibleEmployeeLinks(step.employees),
  ...step.tasks.filter(t => !t.isDeleted).flatMap(t => visibleEmployeeLinks(t.employees)),
];

export const allTasksAtStatus = (step: PlanningStep, statusId: number): boolean => {
  const vis = step.tasks.filter(t => !t.isDeleted);
  return vis.length === 0 || vis.every(t => (t.statusId ?? 0) === statusId);
};

export const applyStepStatusChange = (
  step: PlanningStep,
  newStatusId: number,
  syncChildren: boolean,
  syncEmployees: boolean,
): PlanningStep => ({
  ...step,
  statusId: newStatusId,
  isModified: true,
  ...(syncEmployees ? { employees: syncEmployeesToStatus(step.employees, newStatusId) } : {}),
  tasks: step.tasks.map(t => {
    if (t.isDeleted || !syncChildren) return t;
    if (syncEmployees) return applyTaskStatusChange(t, newStatusId, true);
    return { ...t, statusId: newStatusId, isModified: !t.isNew };
  }),
});

export const applyTaskStatusChange = (
  task: PlanningTask,
  newStatusId: number,
  syncEmployees: boolean,
): PlanningTask => {
  if (!syncEmployees) return { ...task, statusId: newStatusId, isModified: !task.isNew };
  return {
    ...task,
    statusId: newStatusId,
    employees: syncEmployeesToStatus(task.employees, newStatusId),
    isModified: !task.isNew,
  };
};

export type PlanningStatusSyncPlan = {
  syncChildren: boolean;
  syncEmployees: boolean;
};

export async function planPlanningStepStatusChange(
  step: PlanningStep,
  newStatusId: number,
  openConfirm: (message: string, title?: string) => Promise<boolean>,
  openStepStatusSyncConfirm: StepStatusSyncConfirmFn,
): Promise<PlanningStatusSyncPlan | null> {
  if (step.statusId === newStatusId) return null;

  const relatedEmployees = collectStepEmployeeLinks(step);
  const hasChildTasks = step.tasks.some(t => !t.isDeleted);
  let syncChildren = false;
  let syncEmployees = false;

  if (newStatusId === COMPLETED_STATUS_ID && hasChildTasks && !allTasksAtStatus(step, COMPLETED_STATUS_ID)) {
    const yes = await openConfirm(STEP_COMPLETE_REQUIRES_TASKS_SYNC_MSG, 'שינוי סטטוס');
    if (!yes) return null;
    return { syncChildren: true, syncEmployees: relatedEmployees.length > 0 };
  }

  if (relatedEmployees.length > 0) {
    if (relatedEmployees.length === 1) {
      syncEmployees = true;
      if (newStatusId === COMPLETED_STATUS_ID) {
        syncChildren = true;
      } else if (hasChildTasks) {
        const yes = await openConfirm(STEP_STATUS_CHILDREN_SYNC_MSG, 'שינוי סטטוס');
        syncChildren = yes;
      }
    } else if (newStatusId === COMPLETED_STATUS_ID) {
      if (!allEmployeesAtStatus(relatedEmployees, COMPLETED_STATUS_ID)) {
        const yes = await openConfirm(
          'לא ניתן לשנות את הסטטוס להושלם במידה והעובדים לא שינו את הסטטוס להושלם.\n\nהאם לשנות את סטטוס של העובדים להושלם?',
          'שינוי סטטוס',
        );
        if (!yes) return null;
        syncChildren = true;
        syncEmployees = true;
      } else {
        syncChildren = true;
      }
    } else {
      const result = await openStepStatusSyncConfirm();
      if (!result.ok) return null;
      syncChildren = true;
      syncEmployees = result.includeEmployees;
    }
  } else if (hasChildTasks) {
    if (newStatusId === COMPLETED_STATUS_ID) {
      syncChildren = true;
    } else {
      const yes = await openConfirm(STEP_STATUS_CHILDREN_SYNC_MSG, 'שינוי סטטוס');
      syncChildren = yes;
    }
  }

  return { syncChildren, syncEmployees };
}

export type PlanningTaskStatusPlan = {
  syncEmployees: boolean;
};

export async function planPlanningTaskStatusChange(
  step: PlanningStep,
  task: PlanningTask,
  newStatusId: number,
  openConfirm: (message: string, title?: string) => Promise<boolean>,
): Promise<PlanningTaskStatusPlan | 'blocked' | null> {
  if (task.statusId === newStatusId) return null;
  if (step.statusId === COMPLETED_STATUS_ID) return 'blocked';

  const relatedEmployees = visibleEmployeeLinks(task.employees);
  if (relatedEmployees.length === 0) return { syncEmployees: false };

  if (relatedEmployees.length === 1) {
    return { syncEmployees: true };
  }

  if (newStatusId === COMPLETED_STATUS_ID) {
    if (!allEmployeesAtStatus(task.employees, COMPLETED_STATUS_ID)) {
      const yes = await openConfirm(
        'לא ניתן לשנות את הסטטוס להושלם במידה והעובדים לא שינו את הסטטוס להושלם.\n\nהאם לשנות את סטטוס של העובדים להושלם?',
        'שינוי סטטוס',
      );
      if (!yes) return null;
      return { syncEmployees: true };
    }
    return { syncEmployees: false };
  }

  const yes = await openConfirm(
    'האם לשנות את הסטטוס של העובדים לאותו סטטוס של המשימה?',
    'שינוי סטטוס',
  );
  return { syncEmployees: yes };
}

const round2 = (n: number) => parseFloat(Number(n).toFixed(2));

function rescaleTaskEmployeesByTaskHours(
  employees: EmployeeLink[],
  newTaskHours: number,
  oldTaskHours: number,
  hoursPerDay: number,
): EmployeeLink[] {
  void oldTaskHours;
  const nextRaw = employees.map(e => {
    if (e.isDeleted) return e;
    const workHours = round2(Math.max(0, (newTaskHours * (e.percentage ?? 0)) / 100));
    return { ...e, workHours, workDays: round2(workHours / hoursPerDay), isModified: !e.isNew };
  });

  const totalActive = nextRaw.filter(e => !e.isDeleted).reduce((sum, e) => sum + e.workHours, 0);
  if (totalActive > newTaskHours && totalActive > 0) {
    const k = newTaskHours / totalActive;
    return nextRaw.map(e => {
      if (e.isDeleted) return e;
      const workHours = round2(Math.max(0, e.workHours * k));
      return { ...e, workHours, workDays: round2(workHours / hoursPerDay), isModified: !e.isNew };
    });
  }

  return nextRaw;
}

function rescaleStepEmployeesByStepHours(
  employees: EmployeeLink[],
  newStepHours: number,
  hoursPerDay: number,
): EmployeeLink[] {
  const nextRaw = employees.map(e => {
    if (e.isDeleted) return e;
    const workHours = round2(Math.max(0, (newStepHours * (e.percentage ?? 0)) / 100));
    return { ...e, workHours, workDays: round2(workHours / hoursPerDay), isModified: !e.isNew };
  });

  const totalActive = nextRaw.filter(e => !e.isDeleted).reduce((sum, e) => sum + e.workHours, 0);
  if (totalActive > newStepHours && totalActive > 0) {
    const k = newStepHours / totalActive;
    return nextRaw.map(e => {
      if (e.isDeleted) return e;
      const workHours = round2(Math.max(0, e.workHours * k));
      return { ...e, workHours, workDays: round2(workHours / hoursPerDay), isModified: !e.isNew };
    });
  }

  return nextRaw;
}

/**
 * When step work hours change: each non-deleted task with percentage > 0 gets
 * `stepHours × (task.percentage / 100)`. Tasks at 0% keep 0 hours/days.
 */
export const applyStepWorkHoursToTasks = (
  step: PlanningStep,
  newStepHoursRaw: number,
  hoursPerDay: number,
): PlanningStep => {
  const newStepHours = round2(Math.max(0, newStepHoursRaw));
  const newStepDays = round2(newStepHours / hoursPerDay);
  const vis = visibleTasks(step);

  if (vis.length === 0) {
    return {
      ...step,
      workHours: newStepHours,
      workDays: newStepDays,
      employees: rescaleStepEmployeesByStepHours(step.employees, newStepHours, hoursPerDay),
    };
  }

  const allocations = new Map<number, number>();
  vis.forEach(t => {
    const pct = t.percentage ?? 0;
    allocations.set(t.id, pct > 0 ? round2((newStepHours * pct) / 100) : 0);
  });

  return {
    ...step,
    workHours: newStepHours,
    workDays: newStepDays,
    employees: rescaleStepEmployeesByStepHours(step.employees, newStepHours, hoursPerDay),
    tasks: step.tasks.map(t => {
      if (t.isDeleted || !allocations.has(t.id)) return t;
      const workHours = allocations.get(t.id) ?? 0;
      const workDays = round2(workHours / hoursPerDay);
      return {
        ...t,
        workHours,
        workDays,
        employees: rescaleTaskEmployeesByTaskHours(t.employees, workHours, t.workHours, hoursPerDay),
        isModified: !t.isNew,
      };
    }),
  };
};

export const toInputDate = (value?: string) => {
  if (!value) return '';
  if (value.includes('T')) return value.split('T')[0];
  if (value.includes('/')) {
    const [day, month, year] = value.split('/');
    if (year && month && day) {
      return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  return value;
};

export const dateDiffDays = (start: string, end: string): number => {
  if (!start || !end) return 0;
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000);
};

export const addDays = (iso: string, days: number): string => {
  if (!iso) return iso;
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

export const maxIsoDate = (a: string, b: string) => (a >= b ? a : b);
export const minIsoDate = (a: string, b: string) => (a <= b ? a : b);
export const laterIsoDate = (a: string, b: string) => (a >= b ? a : b);
export const isoDisp = (d: string) => toInputDate(d).split('-').reverse().join('/');

export const visibleTasks = (step: PlanningStep) => step.tasks.filter(t => !t.isDeleted);

export const readHasHourReport = (row: { hasHourReport?: boolean } | Record<string, unknown>): boolean => {
  const r = row as Record<string, unknown>;
  const v = r.hasHourReport ?? r.HasHourReport;
  if (v === true || v === 1) return true;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    return s === 'true' || s === '1';
  }
  return false;
};

export const employeeCountForStage = (stage: PlanningStep): number => {
  const stageIds = new Set(stage.employees.filter(e => !e.isDeleted).map(e => e.employeeId));
  const taskIds = new Set(stage.tasks.flatMap(t => t.employees.filter(e => !e.isDeleted).map(e => e.employeeId)));
  return new Set([...stageIds, ...taskIds]).size;
};

const clampIndependentTaskToStep = (
  ts: string,
  te: string,
  S: string,
  E: string,
  preferredDur: number,
): { start: string; end: string } => {
  const span = Math.max(1, Math.floor(Number(preferredDur)));
  if (!S || !E) return { start: ts || S, end: te || E };
  if (!ts || !te) return { start: S, end: minIsoDate(addDays(S, span - 1), E) };
  if (te < S) return { start: S, end: minIsoDate(addDays(S, span - 1), E) };
  if (ts > E) {
    const end = E;
    const start = maxIsoDate(S, addDays(end, -(span - 1)));
    return { start, end };
  }
  let ns = maxIsoDate(ts, S);
  let ne = minIsoDate(te, E);
  if (ns > ne) {
    ns = S;
    ne = minIsoDate(addDays(ns, span - 1), E);
  }
  return { start: ns, end: ne };
};

const scheduleDependentTaskAfterPrev = (
  prevEnd: string,
  dur: number,
  S: string,
  E: string,
): { start: string; end: string } => {
  const span = Math.max(1, Math.floor(Number(dur)));
  let start = addDays(prevEnd, 1);
  if (start > E) {
    const st = maxIsoDate(S, addDays(E, -(span - 1)));
    return { start: st, end: E };
  }
  if (start < S) start = S;
  let end = addDays(start, span - 1);
  if (end > E) {
    end = E;
    start = maxIsoDate(S, addDays(end, -(span - 1)));
  }
  return { start, end };
};

/** When step start/end change: clamp tasks and re-run task dependency chain. */
export const refitTasksForStepBounds = (step: PlanningStep): PlanningTask[] => {
  const S = toInputDate(step.startDate);
  const E = toInputDate(step.endDate);
  if (!S || !E) return step.tasks;

  const visible = visibleTasks(step);
  const patches = new Map<number, { startDate: string; endDate: string; duration: number }>();

  let prevEnd = '';
  for (let i = 0; i < visible.length; i++) {
    const t = visible[i];
    const dur = Math.max(1, Math.floor(Number(t.duration)));
    const ts = toInputDate(t.startDate);
    const te = toInputDate(t.endDate);

    let start: string;
    let end: string;

    if (i > 0 && (t.dependsOnTaskId ?? false) && prevEnd) {
      const dep = scheduleDependentTaskAfterPrev(prevEnd, dur, S, E);
      start = dep.start;
      end = dep.end;
    } else {
      const ind = clampIndependentTaskToStep(ts, te, S, E, dur);
      start = ind.start;
      end = ind.end;
    }

    patches.set(t.id, { startDate: start, endDate: end, duration: Math.max(1, dateDiffDays(start, end) + 1) });
    prevEnd = end;
  }

  return step.tasks.map(t => {
    if (t.isDeleted) return t;
    const p = patches.get(t.id);
    if (!p) return t;
    return { ...t, ...p };
  });
};

export const updateStepBatch = (step: PlanningStep, fields: Partial<PlanningStep>): PlanningStep => {
  let next = { ...step, ...fields };
  const oldS = toInputDate(step.startDate);
  const oldE = toInputDate(step.endDate);
  const newS = toInputDate(next.startDate);
  const newE = toInputDate(next.endDate);
  if (oldS !== newS || oldE !== newE) {
    next = { ...next, tasks: refitTasksForStepBounds(next) };
  }
  return next;
};

export const applyStepScalarField = (step: PlanningStep, field: string, val: unknown): PlanningStep => {
  if (field === 'workHours') {
    const h = Math.max(0, Number(val));
    return applyStepWorkHoursToTasks(step, h, WORK_HOURS_PER_DAY);
  }
  if (field === 'workDays') {
    const d = Math.max(0, Number(val));
    return applyStepWorkHoursToTasks(step, d * WORK_HOURS_PER_DAY, WORK_HOURS_PER_DAY);
  }
  if (field === 'duration') {
    return { ...step, duration: Math.max(1, Math.floor(Number(val))) };
  }
  if (field === 'percentage') {
    return { ...step, percentage: Math.max(0, Math.min(100, Number(val))) };
  }
  return { ...step, [field]: val } as PlanningStep;
};

export type TaskFieldUpdateResult = {
  step: PlanningStep;
  /** Block apply (e.g. percentage > 100 across tasks). */
  blocked?: boolean;
  warnMessage?: string;
  /** Task hours exceed step — caller should confirm then set updatedStepHours. */
  needsStepHoursConfirm?: { otherHours: number; newTaskHours: number };
  updatedStepHours?: number;
};

export const applyTaskScalarField = (
  step: PlanningStep,
  taskId: number,
  field: string,
  val: unknown,
  options?: { allowStepHoursExpand?: boolean; updatedStepHours?: number | null },
): TaskFieldUpdateResult => {
  const task = step.tasks.find(t => t.id === taskId);
  if (!task) return { step };

  let updatedStepHours: number | null = options?.updatedStepHours ?? null;
  let nextTaskWorkHours: number | null = null;
  let nextTaskWorkDays: number | null = null;
  let nextTaskPercentage: number | null = null;

  const stepHoursBase = () => updatedStepHours ?? step.workHours;

  if (field === 'workHours') {
    const newH = Math.max(0, Number(val));
    const otherH = step.tasks
      .filter(x => x.id !== taskId && !x.isDeleted)
      .reduce((a, x) => a + x.workHours, 0);
    if (otherH + newH > step.workHours && !options?.allowStepHoursExpand) {
      return {
        step,
        needsStepHoursConfirm: { otherHours: otherH, newTaskHours: newH },
      };
    }
    if (otherH + newH > step.workHours) updatedStepHours = otherH + newH;
    nextTaskWorkHours = newH;
    nextTaskWorkDays = newH / WORK_HOURS_PER_DAY;
    nextTaskPercentage = stepHoursBase() > 0 ? (newH / stepHoursBase()) * 100 : 0;
  }

  if (field === 'workDays') {
    const newD = Math.max(0, Number(val));
    const newH = newD * WORK_HOURS_PER_DAY;
    const otherH = step.tasks
      .filter(x => x.id !== taskId && !x.isDeleted)
      .reduce((a, x) => a + x.workHours, 0);
    if (otherH + newH > step.workHours && !options?.allowStepHoursExpand) {
      return {
        step,
        needsStepHoursConfirm: { otherHours: otherH, newTaskHours: newH },
      };
    }
    if (otherH + newH > step.workHours) updatedStepHours = otherH + newH;
    nextTaskWorkHours = newH;
    nextTaskWorkDays = newD;
    nextTaskPercentage = stepHoursBase() > 0 ? (newH / stepHoursBase()) * 100 : 0;
  }

  if (field === 'percentage') {
    const newPct = Math.max(0, Math.min(100, Number(val)));
    const otherSum = step.tasks
      .filter(x => x.id !== taskId && !x.isDeleted)
      .reduce((a, x) => a + x.percentage, 0);
    if (otherSum + newPct > 100) {
      return {
        step,
        blocked: true,
        warnMessage: `סה"כ אחוזים לא יכול לעבור 100%. כרגע: ${(otherSum + newPct).toFixed(1)}%`,
      };
    }
    nextTaskPercentage = newPct;
    nextTaskWorkHours = (step.workHours * newPct) / 100;
    nextTaskWorkDays = (nextTaskWorkHours ?? 0) / WORK_HOURS_PER_DAY;
  }

  let nextStep = step;
  if (updatedStepHours !== null) {
    nextStep = {
      ...nextStep,
      workHours: updatedStepHours,
      workDays: updatedStepHours / WORK_HOURS_PER_DAY,
      employees: rescaleStepEmployeesByStepHours(step.employees, updatedStepHours, WORK_HOURS_PER_DAY),
    };
  }

  const tasks = nextStep.tasks.map(t => {
    if (t.id !== taskId) return t;
    if (field === 'workHours') {
      const nh = nextTaskWorkHours ?? t.workHours;
      const nd = nextTaskWorkDays ?? t.workDays;
      return {
        ...t,
        workHours: nh,
        workDays: nd,
        percentage: nextTaskPercentage ?? t.percentage,
        employees: rescaleTaskEmployeesByTaskHours(t.employees, nh, t.workHours, WORK_HOURS_PER_DAY),
      };
    }
    if (field === 'workDays') {
      const nh = nextTaskWorkHours ?? t.workHours;
      const nd = nextTaskWorkDays ?? t.workDays;
      return {
        ...t,
        workDays: nd,
        workHours: nh,
        percentage: nextTaskPercentage ?? t.percentage,
        employees: rescaleTaskEmployeesByTaskHours(t.employees, nh, t.workHours, WORK_HOURS_PER_DAY),
      };
    }
    if (field === 'percentage') {
      const nh = nextTaskWorkHours ?? t.workHours;
      const nd = nextTaskWorkDays ?? t.workDays;
      return {
        ...t,
        percentage: nextTaskPercentage ?? t.percentage,
        workHours: nh,
        workDays: nd,
        employees: rescaleTaskEmployeesByTaskHours(t.employees, nh, t.workHours, WORK_HOURS_PER_DAY),
      };
    }
    return { ...t, [field]: val } as PlanningTask;
  });

  return { step: { ...nextStep, tasks } };
};

export const computeCascadeTailEnd = (step: PlanningStep, fromIdx: number, parentEnd: string): string => {
  const tasks = visibleTasks(step);
  let prevEnd = parentEnd;
  for (let i = fromIdx + 1; i < tasks.length; i++) {
    const t = tasks[i];
    if (!(t.dependsOnTaskId ?? false)) break;
    const start = addDays(prevEnd, 1);
    const dur = Math.max(1, Math.floor(Number(t.duration)));
    prevEnd = addDays(start, dur - 1);
  }
  return prevEnd;
};

export const cascadeTasksFromParentEnd = (
  step: PlanningStep,
  fromIdx: number,
  parentEnd: string,
): PlanningStep => {
  const tasks = visibleTasks(step);
  let prevEnd = parentEnd;
  const patches = new Map<number, { startDate: string; endDate: string }>();

  for (let i = fromIdx + 1; i < tasks.length; i++) {
    const t = tasks[i];
    if (!(t.dependsOnTaskId ?? false)) break;
    const start = addDays(prevEnd, 1);
    const dur = Math.max(1, Math.floor(Number(t.duration)));
    const end = addDays(start, dur - 1);
    patches.set(t.id, { startDate: start, endDate: end });
    prevEnd = end;
  }

  if (patches.size === 0) return step;

  return {
    ...step,
    tasks: step.tasks.map(t => {
      const p = patches.get(t.id);
      if (!p) return t;
      const duration = Math.max(1, dateDiffDays(p.startDate, p.endDate) + 1);
      return { ...t, ...p, duration };
    }),
  };
};

export const patchTaskFields = (
  step: PlanningStep,
  taskId: number,
  fields: Partial<PlanningTask>,
): PlanningStep => ({
  ...step,
  tasks: step.tasks.map(t => (t.id === taskId ? { ...t, ...fields } : t)),
});

const isTempPlanningId = (id: number) => id > 1_000_000_000_000 || id < 0;
const dedupeNumbers = (items: number[]) => Array.from(new Set(items.filter(n => n > 0)));
const todayIso = () => new Date().toISOString().split('T')[0];

export const isPersistedPlanningStep = (step: PlanningStep) =>
  step.id > 0 && !step.isNew && !isTempPlanningId(step.id);

export type FirstTaskForStepBundle = {
  task: PlanningTask;
  stepUpdates: Pick<PlanningStep, 'employees' | 'attachments' | 'deletedEmployeeIds' | 'isModified'>;
};

/** Move step employees/attachments into the first new task when a step had no tasks. */
export const buildFirstTaskForStepWithoutTasks = (
  step: PlanningStep,
  newTaskId: number,
  defaultStatusId: number,
  defaultUrgencyId: number,
): FirstTaskForStepBundle => {
  const stepEmployees = visibleEmployeeLinks(step.employees);
  const stepAttachments = (step.attachments ?? []).filter(a => !a.isDeleted);
  const migrateOnSave = isPersistedPlanningStep(step);
  const persistedEmployeeIds = stepEmployees.filter(e => e.id > 0 && !e.isNew).map(e => e.id);

  const taskEmployees: EmployeeLink[] = stepEmployees.map(emp => ({
    ...emp,
    linkId: newTaskId,
    id: migrateOnSave ? emp.id : (isTempPlanningId(emp.id) || emp.isNew ? emp.id : -Date.now() - emp.employeeId),
    isNew: migrateOnSave ? false : true,
    isModified: migrateOnSave ? true : !emp.isNew,
    isDeleted: false,
  }));

  const taskAttachments: PlanningAttachment[] = stepAttachments.map(att => ({
    ...att,
    entityType: 'task',
    entityId: newTaskId,
    isNew: migrateOnSave ? false : (att.isNew || isTempPlanningId(att.id) || att.id <= 0),
    isModified: migrateOnSave ? true : !att.isNew && att.id > 0,
  }));

  const task: PlanningTask = {
    id: newTaskId,
    PlanningStepID: step.id,
    name: 'משימה 1',
    orderNum: 1,
    percentage: step.percentage > 0 ? step.percentage : 100,
    workHours: step.workHours,
    workDays: step.workDays,
    duration: Math.max(1, step.duration),
    dependsOnTaskId: null,
    employees: taskEmployees,
    startDate: toInputDate(step.startDate) || todayIso(),
    endDate: toInputDate(step.endDate) || todayIso(),
    statusId: step.statusId || defaultStatusId,
    urgencyId: step.urgencyId || defaultUrgencyId,
    isActive: true,
    isNew: true,
    attachments: taskAttachments,
    ...(migrateOnSave ? { migrateStepResourcesToFirstTask: true } : {}),
  };

  return {
    task,
    stepUpdates: {
      employees: [],
      attachments: [],
      deletedEmployeeIds: migrateOnSave
        ? (step.deletedEmployeeIds ?? [])
        : dedupeNumbers([...(step.deletedEmployeeIds ?? []), ...persistedEmployeeIds]),
      isModified: !step.isNew,
    },
  };
};
