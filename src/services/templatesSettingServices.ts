import type {
  PlanningSubjectTemplate,
  SaveEmployeeLinkRequest,
  SavePlanningSubjectRequest,
  SavePlanningSubjectResult,
  SaveStageRequest,
  SaveTaskRequest
} from "../Data/PlanningTemplates";
import authService from "./authService";

export interface EmployeeBasic {
  id: number;
  name: string;
}



const getAuthenticatedUser = () => {
  const user = authService.getCurrentUser();
  if (!user) {
    throw new Error("User not authenticated");
  }
  return user;
};
const buildEndpoint = (baseUrl: string, path: string): string => `${baseUrl}${path}`;

const buildPostOptions = (body: unknown) => ({
  method: "POST" as const,
  body: JSON.stringify(body),
 
});
// Planning Templates operations

export const getPlanningTemplates = async (): Promise<PlanningSubjectTemplate[]> => {
  try {
    const user = getAuthenticatedUser();

    const requestBody = {
      database: user.dataBase,
    };
    
    const endpoint = buildEndpoint(user.urlConnection, "/TemplatesSettings/GetPlanningTemplates");
    const response = await authService.makeAuthenticatedRequest(
      endpoint,
      buildPostOptions(requestBody)
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch planning templates: ${response.statusText}`);
    }

    const data: PlanningSubjectTemplate[] = await response.json();
    
    // Add UI-only properties for expanded state
    return data.map(subject => ({
      ...subject,
      isExpanded: false,
      stages: subject.stages.map(stage => ({
        ...stage,
        isExpanded: false
      }))
    }));
  } catch (error) {
    console.error('Error fetching planning templates:', error);
    throw error;
  }
};

export const getEmployees = async (): Promise<EmployeeBasic[]> => {
  try {
    const user = getAuthenticatedUser();

    const requestBody = {
      database: user.dataBase,
    };
    
    const endpoint = buildEndpoint(user.urlConnection, "/Employee/GetTaskItEmployees");
    const response = await authService.makeAuthenticatedRequest(
      endpoint,
      buildPostOptions(requestBody)
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch employees: ${response.statusText}`);
    }

    const data: EmployeeBasic[] = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching employees:', error);
    throw error;
  }
};



const dedupeNumbers = (items: number[]): number[] => Array.from(new Set(items.filter((n) => n > 0)));

const subjectHasChanges = (subject: PlanningSubjectTemplate): boolean => {
  if (subject.isNew || subject.isModified || subject.isDeleted) return true;

  return subject.stages.some(stage =>
    stage.isNew || stage.isModified || stage.isDeleted ||
    (stage.deletedEmployeeIds?.length ?? 0) > 0 ||
    (stage.deletedTaskIds?.length ?? 0) > 0 ||
    stage.tasks.some(task =>
      task.isNew || task.isModified || task.isDeleted ||
      (task.deletedEmployeeIds?.length ?? 0) > 0 ||
      task.employees.some(emp => emp.isNew || emp.isModified || emp.isDeleted)
    ) ||
    stage.employees.some(emp => emp.isNew || emp.isModified || emp.isDeleted)
  );
};

const buildSubjectRequest = (subject: PlanningSubjectTemplate): SavePlanningSubjectRequest => {
  const deletedStageIds = subject.stages
    .filter(stage => stage.isDeleted && !stage.isNew)
    .map(stage => stage.id);

  const stages: SaveStageRequest[] = subject.stages
    .filter(stage => !stage.isDeleted)
    .map(stage => {
      const deletedTaskIds = dedupeNumbers([
        ...(stage.deletedTaskIds ?? []),
        ...stage.tasks.filter(t => t.isDeleted && !t.isNew).map(t => t.id)
      ]);

      const deletedEmployeeIds = dedupeNumbers([
        ...(stage.deletedEmployeeIds ?? []),
        ...stage.employees.filter(e => e.isDeleted).map(e => e.id)
      ]);

      const employees: SaveEmployeeLinkRequest[] = stage.employees
        .filter(e => !e.isDeleted)
        .map(e => ({
          id: e.id>0 ? e.id : null,
          employeeId: e.employeeId,
          percentage: e.percentage,
          workHours: e.workHours,
          workDays: e.workDays,
          taskDuration: e.taskDuration
        }));

      const tasks: SaveTaskRequest[] = stage.tasks
        .filter(task => !task.isDeleted)
        .map(task => ({
          id: task.id>0 ? task.id : null,
          taskName: task.taskName,
          taskPercentage: task.taskPercentage,
          workHours: task.workHours,
          workDays: task.workDays,
          taskDuration: task.taskDuration,
          isActive: task.isActive,
          orderNum: task.orderNum,
          dependsOnTaskId: task.dependsOnTaskId ?? null,
          employees: task.employees
            .filter(e => !e.isDeleted)
            .map(e => ({
              id: e.id>0 ? e.id : null,
              employeeId: e.employeeId,
              percentage: e.percentage,
              workHours: e.workHours,
              workDays: e.workDays,
              taskDuration: e.taskDuration
            })),
          deletedEmployeeIds: dedupeNumbers([
            ...(task.deletedEmployeeIds ?? []),
            ...task.employees.filter(e => e.isDeleted).map(e => e.id)
          ])
        }));

      return {
        id: stage.id>0 ? stage.id : null,
        stepName: stage.stepName,
        stepPercentage: stage.stepPercentage,
        workHours: stage.workHours,
        workDays: stage.workDays,
        stepDuration: stage.stepDuration,
        isActive: stage.isActive,
        orderNum: stage.orderNum,
        dependsOnStepId: stage.dependsOnStepId ?? null,
        employees,
        deletedEmployeeIds,
        tasks,
        deletedTaskIds
      };
    });

  return {
    id: subject.id||undefined,
    name: subject.name,
    isActive: subject.isActive,
    stages,
    deletedStageIds
  };
};

export const PlanningTemplates = async (subjects: PlanningSubjectTemplate[]): Promise<SavePlanningSubjectResult[]> => {
  try {
    const user = getAuthenticatedUser();
    const subjectsToSave = subjects.filter(subjectHasChanges);
    if (subjectsToSave.length === 0) {
      return [];
    }

    const requestBody ={
      database: user.dataBase,
      subjects: subjectsToSave.map(subject => buildSubjectRequest(subject))
    } 
    const endpoint = buildEndpoint(user.urlConnection, "/TemplatesSettings/SavePlanningSubject");
    const response = await authService.makeAuthenticatedRequest(
      endpoint,
      buildPostOptions(requestBody)
    );

    if (!response.ok) {
      throw new Error(`Failed to save planning subject: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving planning subject:', error);
    throw error;
  }
};



