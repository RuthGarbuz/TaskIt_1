
// ============================================================
// Types matching the exact DB schema
// ============================================================

// PlanningSubjectTemplates
export interface PlanningSubjectTemplate {
  id: number;                      // ID
  name: string;                    // Name
  isActive: boolean;               // IsActive
  // UI only
  isExpanded: boolean;
  isNew?: boolean;
  isModified?: boolean;
  isDeleted?: boolean;
  stages: PlanningStepTemplate[];
}

// PlanningStepTemplates (child of PlanningSubjectTemplates)
export interface PlanningStepTemplate {
  id: number;                      // ID
  planningSubjectTemplateId: number; // PlanningSubjectTemplateID
  stepName: string;                // StepName
  stepPercentage: number;          // StepPercentage
  workHours: number;               // WorkHours
  stepDuration: number;            // StepDuration
  isActive: boolean;               // IsActive
  orderNum: number;                // OrderNum
  dependsOnStepId: boolean | null;  // DependsOnStepID
  workDays: number;                // WorkDays
  // UI only
  isExpanded: boolean;
  isNew?: boolean;
  isModified?: boolean;
  isDeleted?: boolean;
  deletedEmployeeIds?: number[];
  deletedTaskIds?: number[];
  tasks: PlanningTaskTemplate[];
  employees: PlanningStepEmployeeLinkTemplate[];
}

// PlanningStepEmployeesLinkTemplates (employees linked to a step)
export interface PlanningStepEmployeeLinkTemplate {
  id: number;     
                   // ID
  linkId: number; // ID of the link between employee and stage, if it exists in the database
  employeeId: number;              // EmployeeID
  employeeName: string;            // UI helper
  planningStepTemplateId: number;  // PlanningStepTemplateID
  percentage: number;              // Percentage
  workHours: number;               // WorkHours
  workDays: number;                // WorkDays
  taskDuration: number;            // TaskDuration
  // UI only
  isNew?: boolean;
  isModified?: boolean;
  isDeleted?: boolean;
}


// PlanningTaskTemplates (child of PlanningStepTemplates)
export interface PlanningTaskTemplate {
  id: number;                      // ID
  planningStepTemplateId: number;  // PlanningStepTemplateID
  taskName: string;                // TaskName
  workHours: number;               // WorkHours
  isActive: boolean;               // IsActive
  orderNum: number;                // OrderNum
  taskPercentage: number;          // TaskPercentage
  taskDuration: number;            // TaskDuration
  dependsOnTaskId: boolean | null;  // DependsOnTaskID
  workDays: number;                // WorkDays
  // UI only
  isNew?: boolean;
  isModified?: boolean;
  isDeleted?: boolean;
  deletedEmployeeIds?: number[];
  employees: PlanningTaskEmployeeLinkTemplate[];
}

// PlanningTaskEmployeesLinkTemplates (employees linked to a task)
export interface PlanningTaskEmployeeLinkTemplate {
  id: number;                      // ID
  linkId: number;                  // ID of the link between employee and step/task, if it exists in the database
  employeeId: number;              // EmployeeID
  employeeName: string;            // UI helper
  planningTaskTemplateId: number;  // PlanningTaskTemplateID
  percentage: number;              // Percentage
  workHours: number;               // WorkHours
  workDays: number;                // WorkDays
  taskDuration: number;            // TaskDuration
  // UI only
  isNew?: boolean;
  isModified?: boolean;
  isDeleted?: boolean;
}

// PlanningTemplates (project templates)
export interface PlanningTemplate {
  id: number;                      // ID
  name: string;                    // Name
  isActive: boolean;               // IsActive
  // UI only
  subjects: PlanningSubjectTemplate[];
}

// PlanningTemplateLinks (many-to-many: Template ↔ Subject)
export interface PlanningTemplateLink {
  planningSubjectTemplateId: number; // PlanningSubjectTemplateID
  planningTemplateId: number;        // PlanningTemplateID
}

export interface EmployeeBasic {
  Id: number; 
  Name: string;      
}

// ============================================================
// Save Planning Subject API Models
// ============================================================

export interface SavePlanningSubjectRequest {
  id?: number | null;
  name: string;
  isActive: boolean;
  stages: SaveStageRequest[];
  deletedStageIds: number[];
}

export interface SaveStageRequest {
  id?: number | null;
  stepName: string;
  stepPercentage: number;
  workHours: number;
  workDays: number;
  stepDuration: number;
  isActive: boolean;
  orderNum: number;
  dependsOnStepId?:boolean;
  employees: SaveEmployeeLinkRequest[];
  deletedEmployeeIds: number[];
  tasks: SaveTaskRequest[];
  deletedTaskIds: number[];
}

export interface SaveTaskRequest {
  id?: number | null;
  taskName: string;
  taskPercentage: number;
  workHours: number;
  workDays: number;
  taskDuration: number;
  isActive: boolean;
  orderNum: number;
  dependsOnTaskId?:boolean;
  employees: SaveEmployeeLinkRequest[];
  deletedEmployeeIds: number[];
}

export interface SaveEmployeeLinkRequest {
  id?: number | null;
  employeeId: number;
  percentage: number;
  workHours: number;
  workDays: number;
  taskDuration: number;
}

export interface SavePlanningSubjectResult {
  subjectId: number;
  stages: StageIdMapping[];
}

export interface StageIdMapping {
  tempId: number;
  realId: number;
  tasks: TaskIdMapping[];
}

export interface TaskIdMapping {
  tempId: number;
  realId: number;
}
export interface EmployeeLink {
  linkId: number; // ID of the link between employee and stage/task, if it exists in the database
  id: number;
  employeeId: number;
  employeeName: string;
  percentage: number;
  workHours: number;
  workDays: number;
  duration: number;
  statusId?: number;
  hoursActual?: number;
  isNew?: boolean;
  isModified?: boolean;
  isDeleted?: boolean;
}

export interface LinkEmployeesToStageModalProps {
  stageName: string;
  stageDuration: number;
  stageHours: number;
  hoursPerDay: number;
  statusId?: number;
  itemType?: 'stage' | 'task';
  initialEmployees?: EmployeeLink[];
  onClose: () => void;
  onSave: (employees: EmployeeLink[]) => void;
}
