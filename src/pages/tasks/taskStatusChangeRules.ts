import type { EmployeeLink, TaskReview, TaskStatusCascade } from '../../Data/projectsData';
import { findPlanStepRowInTasks, getEmployeeLinksAsync, resolveParentStepStatusAsync } from '../../services/taskService';
import {
  STEP_STATUS_CHILDREN_SYNC_MSG,
  type StepStatusSyncConfirmFn,
} from '../shared/statusSyncConfirm';

export const COMPLETED_STATUS_ID = 3;

export const TASK_STATUS_BLOCKED_BY_STEP_MSG =
  'לא ניתן לשנות סטטוס משימה כל עוד השלב הושלם. ניתן לשנות את הסטטוס של השלב כדי לעדכן.';

export const STEP_COMPLETE_REQUIRES_TASKS_SYNC_MSG =
  'לא ניתן לשנות את סטטוס השלב להושלם כל עוד המשימות לא הושלמו. האם לשנות את הסטטוס של המשימות והעובדים של השלב גם להושלם?';

export const EMPLOYEE_STATUS_BLOCKED_WHEN_COMPLETED_MSG =
  'לא ניתן לשנות סטטוס עובד כל עוד המשימה/שלב הושלמה, ניתן לשנות את הסטטוס של השלב/משימה כדי לעדכן.';

const isEntityCompleted = (statusId?: number) => (statusId ?? 0) === COMPLETED_STATUS_ID;

const isCompletedStatusLabel = (name?: string) => {
  const v = (name ?? '').trim().toLowerCase();
  return v.includes('הושלם') || v.includes('done') || v.includes('complete') || v.includes('סגור');
};

const activeEmployeeLinks = (links: EmployeeLink[]) => links.filter(l => !l.isDeleted);

const allEmployeesAtStatus = (links: EmployeeLink[], statusId: number) => {
  const vis = activeEmployeeLinks(links);
  return vis.length === 0 || vis.every(l => (l.statusId ?? 0) === statusId);
};

const isParentStepCompletedSync = (task: TaskReview, tasks: TaskReview[]) => {
  if (task.isPlanningSte) return false;
  const stepRow = findPlanStepRowInTasks(tasks, task.planningStepID);
  return isEntityCompleted(stepRow?.statuID) || isCompletedStatusLabel(stepRow?.statusName);
};

export async function isParentStepCompletedForTask(
  task: TaskReview,
  allTasks: TaskReview[],
): Promise<boolean> {
  if (task.isPlanningSte) return false;
  if (isParentStepCompletedSync(task, allTasks)) return true;
  const stepRow = findPlanStepRowInTasks(allTasks, task.planningStepID);
  const statusId = await resolveParentStepStatusAsync(task, {
    planStepListTask: stepRow ?? null,
    contextTasks: allTasks,
  });
  return isEntityCompleted(statusId ?? undefined);
};

export type TaskStatusChangeOptions = {
  updateAllEmployees?: boolean;
  statusCascade?: TaskStatusCascade | null;
};

export type TaskStatusChangePlan = {
  proceed: boolean;
  options?: TaskStatusChangeOptions;
};

type ConfirmFn = (message: string, title?: string) => Promise<boolean>;
type WarnFn = (message: string) => void;

export async function planTableStatusChange(
  task: TaskReview,
  nextStatusId: number,
  statusName: string,
  allTasks: TaskReview[],
  currentView: 'myTasks' | 'allTasks',
  openConfirm: ConfirmFn,
  openStepStatusSyncConfirm: StepStatusSyncConfirmFn,
  showWarning: WarnFn,
): Promise<TaskStatusChangePlan> {
  const currentId = task.statuID ?? 0;
  if (nextStatusId === currentId) return { proceed: false };

  if (currentView === 'myTasks') {
    if (await isParentStepCompletedForTask(task, allTasks) || isEntityCompleted(task.statuID)) {
      showWarning(EMPLOYEE_STATUS_BLOCKED_WHEN_COMPLETED_MSG);
      return { proceed: false };
    }
    return { proceed: true, options: { updateAllEmployees: false } };
  }

  if (!task.isPlanningSte && await isParentStepCompletedForTask(task, allTasks)) {
    showWarning(TASK_STATUS_BLOCKED_BY_STEP_MSG);
    return { proceed: false };
  }

  const isTaskEntity = !task.isPlanningSte;
  let employeeLinks: EmployeeLink[] = [];
  try {
    employeeLinks = await getEmployeeLinksAsync(task.id, isTaskEntity);
  } catch {
    employeeLinks = [];
  }
  const activeLinks = activeEmployeeLinks(employeeLinks);

  if (task.isPlanningSte) {
    const stepKey = task.id;
    const childTasks = allTasks.filter(
      t => !t.isPlanningSte && (t.planningStepID === stepKey || t.planningStepID === task.planningStepID),
    );
    let syncChildren = false;
    let syncEmployees = false;

    if (
      nextStatusId === COMPLETED_STATUS_ID
      && childTasks.length > 0
      && childTasks.some(t => (t.statuID ?? 0) !== COMPLETED_STATUS_ID)
    ) {
      const yes = await openConfirm(STEP_COMPLETE_REQUIRES_TASKS_SYNC_MSG, 'שינוי סטטוס');
      if (!yes) return { proceed: false };
      return {
        proceed: true,
        options: {
          updateAllEmployees: activeLinks.length > 0,
          statusCascade: {
            childTaskUpdates: childTasks.map(t => ({
              id: t.id,
              statuID: nextStatusId,
              statusName,
            })),
            syncChildEmployees: activeLinks.length > 0,
          },
        },
      };
    }

    if (activeLinks.length > 0) {
      if (activeLinks.length === 1) {
        syncEmployees = true;
        if (nextStatusId === COMPLETED_STATUS_ID) {
          syncChildren = true;
        } else if (childTasks.length > 0) {
          const yes = await openConfirm(STEP_STATUS_CHILDREN_SYNC_MSG, 'שינוי סטטוס');
          syncChildren = yes;
        }
      } else if (nextStatusId === COMPLETED_STATUS_ID) {
        if (!allEmployeesAtStatus(activeLinks, COMPLETED_STATUS_ID)) {
          const yes = await openConfirm(
            'לא ניתן לשנות את הסטטוס להושלם במידה והעובדים לא שינו את הסטטוס להושלם.\n\nהאם לשנות את סטטוס של העובדים להושלם?',
            'שינוי סטטוס',
          );
          if (!yes) return { proceed: false };
          syncChildren = true;
          syncEmployees = true;
        } else {
          syncChildren = true;
        }
      } else {
        const result = await openStepStatusSyncConfirm();
        if (!result.ok) return { proceed: false };
        syncChildren = true;
        syncEmployees = result.includeEmployees;
      }
    } else if (childTasks.length > 0) {
      if (nextStatusId === COMPLETED_STATUS_ID) {
        syncChildren = true;
      } else {
        const yes = await openConfirm(STEP_STATUS_CHILDREN_SYNC_MSG, 'שינוי סטטוס');
        syncChildren = yes;
      }
    }

    return {
      proceed: true,
      options: {
        updateAllEmployees: syncEmployees,
        statusCascade:
          syncChildren && childTasks.length > 0
            ? {
                childTaskUpdates: childTasks.map(t => ({
                  id: t.id,
                  statuID: nextStatusId,
                  statusName,
                })),
                syncChildEmployees: syncEmployees,
              }
            : null,
      },
    };
  }

  let updateAllEmployees = false;
  if (activeLinks.length === 1) {
    updateAllEmployees = true;
  } else if (activeLinks.length > 1) {
    if (nextStatusId === COMPLETED_STATUS_ID) {
      if (!allEmployeesAtStatus(activeLinks, COMPLETED_STATUS_ID)) {
        const yes = await openConfirm(
          'לא ניתן לשנות את הסטטוס להושלם במידה והעובדים לא שינו את הסטטוס להושלם.\n\nהאם לשנות את סטטוס של העובדים להושלם?',
          'שינוי סטטוס',
        );
        if (!yes) return { proceed: false };
        updateAllEmployees = true;
      }
    } else {
      const yes = await openConfirm(
        'האם לשנות את הסטטוס של העובדים לאותו סטטוס של המשימה?',
        'שינוי סטטוס',
      );
      updateAllEmployees = yes;
    }
  }

  return {
    proceed: true,
    options: { updateAllEmployees, statusCascade: null },
  };
}
