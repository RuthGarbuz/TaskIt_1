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
  workDays: number;
  duration: number;
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

export interface GetTasksRequest {
  database: string;
  projectId: number;
  employeeId: number;
  permissionType: number;
  myTask: boolean;
}

export interface TaskReview {
  id: number;
  planningStepID: number;
  name: string;
  percentage: number;
  workHours: number;
  workDays: number;
  duration: number;
  isActive: boolean;
  dependsOnStepID: boolean ;
  dependsOnTaskID: boolean ;
  startDate: string;
  endDate: string;
  senderID: number;
  statuID: number;
  statusName: string;
  urgencyID: number;
  urgencyName: string;
  note: string | null;
  creatDate: string;
  lastUpdate: string;
  updateBy: number;
  isClosed: boolean;
  orderNum: number;
  hourReport: number;
}

export interface PlanningHierarchyQuery {
  database: string;
  projectId: number;
}

export interface PlanningHierarchyResponse {
  subjects: PlanningSubject[];
  subContracts?: SubContract[];
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
}

export interface TemplateStep {
  id: number;
  planningSubjectID:number;
  name: string;
  workHours: number;
  workDays: number;
  duration: number;
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