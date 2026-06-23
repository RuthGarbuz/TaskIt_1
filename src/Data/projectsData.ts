export interface SubContractLink {
  id: number;
  name: string;
  subjectId: number;
  isNew?: boolean;
  isModified?: boolean;
  isDeleted?: boolean;
}
// Types for simplified 2-level hierarchy
export interface SubTask {
  id: number;
  name: string;
  completed?: boolean;
}

export interface Stage {
  id: number;
  name: string;
  subTasks: SubTask[];
  isExpanded: boolean;
}

export interface ProjectSection {
  id: number;
  name: string; // נושא תכנון
  stages: Stage[]; // שלבים ישירות תחת נושא תכנון
  isExpanded: boolean;
}
export interface EmployeeLink {
  linkId: number; // ID of the link between employee and stage/task, if it exists in the database
  id: number;
  employeeId: number;
  employeeName: string;
  percentage: number;
  workHours: number;
  hoursActual?: number;
  workDays: number;
  duration: number;
  statusId?: number;
  isNew?: boolean;
  isModified?: boolean;
  isDeleted?: boolean;
}

export interface PlanningTask {
  id: number;
  PlanningStepID: number;
  name: string;
  orderNum: number;
  percentage: number;
  workHours: number;
  workDays: number;
  duration: number;
  dependsOnTaskId: boolean |null;
  employees: EmployeeLink[];
  deletedEmployeeIds?: number[];
  startDate: string;
  endDate: string;
  statusId: number;
  urgencyId: number;
  isActive: boolean;
  isNew?: boolean;
  isModified?: boolean;
  isDeleted?: boolean;
  attachments: PlanningAttachment[];
  hasHourReport?: boolean;
  /** When true, save migrates step-level DB resources to this first task on a persisted step. */
  migrateStepResourcesToFirstTask?: boolean;

}

export interface PlanningStep {
  id: number;
  PlanningSubjectID: number;
  name: string;
  orderNum: number;
  percentage: number;
  workHours: number;
  workDays: number;
  duration: number;
  dependsOnStepId: boolean | null;
  employees: EmployeeLink[];
  deletedEmployeeIds?: number[];
  startDate: string;
  endDate: string;
  statusId: number;
  urgencyId: number;
  isActive: boolean;
  isExpanded: boolean;
  tasks: PlanningTask[];
  deletedTaskIds?: number[];
  isNew?: boolean;
  isModified?: boolean;
  isDeleted?: boolean;
  attachments?: PlanningAttachment[];
  hasHourReport?: boolean;

}

export interface PlanningSubject {
  id: number;
  name: string;
  isActive: boolean;
  isExpanded: boolean;
  steps: PlanningStep[];
  subContractsLink?: SubContractLink[];
  deletedStepIds?: number[];
  deletedSubContractIds?: number[];
  isNew?: boolean;
  isModified?: boolean;
  isDeleted?: boolean;

}

export interface SystemTable {
  id: number;
  name: string;
  isDefault: boolean;
  color?: string;
  progressPercentage?:number
}
export interface SubContract {
  id: number;
  contractName: string;
  subcontractName: string;
}
export interface PlanningSystemLists {
  statuses: SystemTable[];
  priorities: SystemTable[];
  //subContracts: SystemTable[];

}

export interface BasicQuery {
  database: string;
}

export interface BasicGetQuery {
  database: string;
  id: number;
}

export interface GetTasksRequest {
  database: string;
  projectId: number;
  employeeId: number;
  permissionType: number;
  fromDate: string | null;
  toDate: string | null;
  closedTasks?: boolean;
  projectIds?: number[];
  employeeIds?: number[];
  statusIds?: number[];
  priorityIds?: number[];
}

export interface GetMyTasksRequest {
  database: string;
  employeeId: number;
  fromDate: string | null;
  toDate: string | null;
  projectIds?: number[];
  employeeIds?: number[];
  statusIds?: number[];
  priorityIds?: number[];
  closedTasks?: boolean;
}

export interface GetBillTasksRequest {
  database: string;
  projectId?: number | null;
  employeeId: number;
  permissionType: number;
  fromDate: string | null;
  toDate: string | null;
  isSubmited?: boolean | null;
  projectIds?: number[];
  employeeIds?: number[];
  statusIds?: number[];
}

export interface GetChatDataRequest {
  database: string;
  taskId: number;
}

export interface TaskChatMessage {
  id: number;
  senderID: number; 
  senderName: string;
  createDate: string;
  message: string;
}

export interface TaskReview {
  id: number;
  planningStepID: number;
  name: string;
  subject: string;
  planningSubjectName: string;
  percentage: number;
  workHours: number;
  workDays: number;
  duration: number;
  isActive: boolean;
  dependsOnStepID: boolean;
  dependsOnTaskID: boolean;
  startDate: string;
  endDate: string;
  senderID: number;
  receivers: string[] | null;
  senderName: string;
  statuID: number;
  statusName: string;
  urgencyID: number;
  urgencyName: string;
  note: string | null;
  creatDate: string;
  lastUpdate: string;
  updateBy: number;
  updateByName?: string;
  isClosed: boolean;
  orderNum: number;
  hourReport: number;
  projectName: string;
  projectId: number;
  utilizationPercentage: number;
  hasChat: boolean;
  isPlanningSte: boolean;
  projectType:string
  studioDepartment: string
  stepDependStatusID?: number;
  taskDependStatusID?: number;
  attachments?: PlanningAttachment[];
  hasBill?: boolean;

}

export interface BillTaskReview extends TaskReview {
  planningBillID: number;
  billNote?: string | null;
  isSubmited: boolean;
}

export interface SavePlanningBillRequest {
  database: string;
  planningTaskID: number;
  employeeID: number;
  isPlanningStep: boolean;
  note?: string | null;
  updatedByID: number;
}

export interface UpdateSubmitedBillRequest {
  database: string;
  id: number;
  isSubmited: boolean;
}

export interface SubContractData {
	stepName: string;
	subContractName: string;
	contractName: string;
	feeSum: number;
}
export interface TaskUpdatePatch {
  id: number;
  subject?: string;
  statuID?: number;
  urgencyID?: number;
  dependsOnStepID?: boolean;
  dependsOnTaskID?: boolean;
  startDate?: string;
  endDate?: string;
  workHours?: number;
  workDays?: number;
  /** אחוז משבצת התכנון (משימות) */
  percentage?: number;
  /** משך (ימים) – אם השרת דורש */
  duration?: number;
}

export type TaskCardCascadeStage = { id: number; startDate: string; endDate: string };

export type TaskStepHoursCascade = {
  stepId: number;
  newStepWorkHours: number;
  duration?: number;
  workDays?: number;
  taskUpdates: { id: number; workHours: number; workDays: number; percentage: number }[];
};

/** עדכון תאריכי שלב-ההורה; otherTaskDateUpdates = משימות שתלויות במשימה הנערכת */
export type TaskParentDateCascade = {
  stepId: number;
  startDate: string;
  endDate: string;
  duration?: number;
  workHours?: number;
  workDays?: number;
  otherTaskDateUpdates?: { id: number; startDate: string; endDate: string; duration: number }[];
};

export type TaskStatusCascade = {
  childTaskUpdates: { id: number; statuID: number; statusName: string }[];
  syncChildEmployees: boolean;
};

export type TaskCardSaveOptions = {
  cascadeStage?: TaskCardCascadeStage;
  taskStepHoursCascade?: TaskStepHoursCascade;
  taskParentDateCascade?: TaskParentDateCascade;
  statusCascade?: TaskStatusCascade;
};

export interface DependsOnStepData {
  id: number;
  isDependentOnPrevious: boolean;
  dependsOnID: number | null;
  dependsOn_StartDate: string | null;
  dependsOn_EndDate: string | null;
  isDependedOnByNext: boolean;
  dependedByID: number | null;
  dependedBy_StartDate: string | null;
  dependedBy_EndDate: string | null;
  // parentStep_StatuID?: number;
  // parentStepID: number;

}

export interface DependsOnTaskData extends DependsOnStepData {
  parentStepID: number;
  parentStep_StartDate: string;
  parentStep_EndDate: string;
  parentStep_WorkHours: number;

  parentStep_StatuID?: number;
  
}

export interface PlanningHierarchyQuery {
  database: string;
  projectId: number;
}

/** Query for `DELETE /Plannings/subject` — server `[FromQuery] DeleteQuery`. */
export interface DeletePlanningSubjectQuery {
  database: string;
  /** Planning subject id */
  id: number;
}

export interface PlanningHierarchyResponse {
  subjects: PlanningSubject[];
  subContracts?: SubContract[];
}

/** Query for `GET /Plannings/steps-by-project` */
export interface PlanningStepQuery {
  database: string;
  projectID: number;
  isClosed?: boolean | null;
}

export interface PlanningStepSubject {
  id: number;
  name: string;
}

export interface PlanningStepItem {
  id: number;
  planningSubjectId: number;
  name: string;
  isPlanningStep: boolean;
}

export interface PlanningStepByProjectResult {
  subjects: PlanningStepSubject[];
  steps: PlanningStepItem[];
}
 
export interface PlanningAttachment {
  id: number;
  entityType: 'step' | 'task';      // which table: PlanningStepAttachments / PlanningTaskAttachments
  entityId: number;                  // PlanningStepID or PlanningTaskID
  employeeId: number | null;         // [EmployeeID]
  employeeName?: string;             // resolved on load for display — not saved
  description: string;               // [Description]
  fileLink: string;
  /** true = external link; false = uploaded file */
  isLink: boolean;
  fileName?: string;                 // client-only: original filename for uploads
  isNew?: boolean;
  isModified?: boolean;
  isDeleted?: boolean;
}
 

// Initial data - 2 levels only
export const initialProjectsData: ProjectSection[] = [
  {
    id: 1,
    name: 'נושא תכנון',
    isExpanded: true,
    stages: [
      {
        id: 1,
        name: 'שלב 1',
        isExpanded: true,
        subTasks: [
          { id: 1, name: 'משימה 1', completed: false },
          { id: 2, name: 'משימה 2', completed: false },
          { id: 3, name: 'משימה 3', completed: false }
        ]
      },
      {
        id: 2,
        name: 'שלב 2',
        isExpanded: false,
        subTasks: [
          { id: 4, name: 'משימה 4', completed: false },
          { id: 5, name: 'משימה 5', completed: true }
        ]
      }
    ]
  },
  {
    id: 2,
    name: 'מגורות תשתיות צער הנוסע',
    isExpanded: true,
    stages: [
      {
        id: 3,
        name: 'אנליזה',
        isExpanded: false,
        subTasks: []
      },
      {
        id: 4,
        name: 'תכנון',
        isExpanded: false,
        subTasks: []
      },
      {
        id: 5,
        name: 'ביצוע',
        isExpanded: false,
        subTasks: []
      }
    ]
  }
];

// Helper functions
export const generateProjectNumber = (): string => {
  return `P-${String(Date.now()).slice(-4)}`;
};
export interface TemplateTask {
  id: number;
  planningStepID:number;
  name: string;
  workHours: number;
  workDays: number;
  duration: number;
  taskPercentage: number;
  /** From template/API — only rows with true become planning dependsOnTaskId (first task is always false). */
  dependsOnTaskId?: boolean | null;
}

export interface TemplateStep {
  id: number;
  planningSubjectID:number;
  name: string;
  workHours: number;
  workDays: number;
  duration: number;
  /** From template/API — only rows with true become planning dependsOnStepId (first step is always false). */
  dependsOnStepId?: boolean | null;
  stepPercentage: number;
  tasks: TemplateTask[];
}

export interface SubjectTemplate {
  id: number;
  name: string;
  category: string;
  totalHours: number;
  totalDays: number;
  stepsCount: number;
  tasksCount: number;
  steps: TemplateStep[];
}

/** One row from PlanningStepEmployeesLinkTemplates / PlanningTaskEmployeesLinkTemplates (API → import). */
export interface PlanningTemplateEmployeeLinkSeed {
  employeeId: number;
  employeeName: string;
  percentage: number;
  workHours: number;
  workDays: number;
  duration: number;
}

/** Grouped by PlanningStepTemplateID / PlanningTaskTemplateID for import into project planning. */
export interface PlanningTemplateEmployeeLinksMaps {
  stepEmployeeLinks: Record<number, PlanningTemplateEmployeeLinkSeed[]>;
  taskEmployeeLinks: Record<number, PlanningTemplateEmployeeLinkSeed[]>;
}
export interface EmployeeNotification {
  id: number;
  isTask: boolean;
  taskId: number;
  taskChatId: number;
  senderName: string;
  message: string;
  createDate: string;
  isRead: boolean;
  projectName: string;
  planningSubjectName: string;
  name: string;
}