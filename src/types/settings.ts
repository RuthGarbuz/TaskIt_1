export interface GeneralSettings {
  id: number;
  displayMode: number;
  profitPercentage: number;
  workingHourCost: number;
  monthlyJobScopeHours: number;
  numberOfHours: number;
  hours: number;
  minutes: number;
  billRequestSent: boolean;
  closedByStatusChange: boolean;
  isShowNotification?: boolean;
}

export interface WorkCapacityEmployee {
  id: number;
  identityNum: string;
  name: string;
  workCapacityPercentage: number;
  isActive: boolean;
}

export interface WorkCapacitySettingsResult {
  employees: WorkCapacityEmployee[];
  monthlyJobScopeHours: number;
}
export interface EmployeeWorkingSetting {
  id: number;
  firstName: string;
  lastName: string;
  idNumber: string;
  jobPercentage: number;
  monthlyHoursCapacity: number;
  isActive: boolean;
}

export interface EmployeeWorkCapacityUpdate {
  id: number;
  workCapacityPercentage: number;
  isActive: boolean;
}

export interface StatusItem {
  id: number;
  name: string;
  color: string;
  progressPercentage: number;
  isDefault: boolean;
  isActive: boolean;
}

export interface PriorityItem {
  id: number;
  name: string;
  color: string;
  isDefault: boolean;
  isActive: boolean;
}

export interface DBDetailsResult {
  profitPercentage: number;
  hourlyRate: number;
  subcontractCost: number;
  monthlyJobScopeHours: number;
}

export interface StudioDepartmentType {
  id: number;
  name: string;
}


