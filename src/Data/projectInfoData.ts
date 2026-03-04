export interface ProjectInfo {
	name: string;
	projectNum: string;
	statusId: number;
	statusName: string;
	projectType: string;
	startDate: string;
	endDate: string;
	isActive: boolean;
	customerName: string;
	officeName: string;
	departmentName: string;
	teamLeadName: string;
	responsibleName: string;
	cityName: string;
	budgetedHours: string;
	description: string;
	folderPath: string;
	profitPercentage: number;
	workingHourCost: number;
	isDefault: boolean;
}

export interface GetProjectInfoQuery {
	database: string;
	projectId: number;
}

export interface UpdateProjectIsDefaultRequest {
	database: string;
	projectId: number;
	isDefault: boolean;
}

export interface UpdateProjectFinancialsRequest {
	database: string;
	projectId: number;
	workingHourCost: number;
	profitPercentage: number;
}
export interface ProjectBasic {
  id: number;
  name: string;
  isDefault: boolean;
}
