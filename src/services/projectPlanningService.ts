import type { BasicQuery, PlanningHierarchyQuery, PlanningHierarchyResponse, PlanningSubject, PlanningSystemLists, SubjectTemplate } from "../Data/projectsData";
import authService from "./authService";

interface SavePlanningEmployeeLinkRequest {
	linkId?: number | null;
	employeeId: number;
	percentage: number;
	workHours: number;
	workDays: number;
	duration: number;
}

interface SavePlanningTaskRequest {
	id?: number | null;
	//planningStepId: number;
	name: string;
	orderNum: number;
	percentage: number;
	workHours: number;
	workDays: number;
	duration: number;
	dependsOnTaskId: boolean | null;
	employees: SavePlanningEmployeeLinkRequest[];
	deletedEmployeeIds: number[];
	startDate: string | null;
	endDate: string | null;
	statusId: number;
	urgencyId: number;
	isActive: boolean;

}

interface SavePlanningStepRequest {
	id?: number | null;
	//planningSubjectId: number;
	name: string;
	orderNum: number;
	percentage: number;
	workHours: number;
	workDays: number;
	duration: number;
	dependsOnStepId: boolean | null;
	employees: SavePlanningEmployeeLinkRequest[];
	deletedEmployeeIds: number[];
	startDate: string | null;
	endDate: string | null;
	statusId: number;
	urgencyId: number;
	isActive: boolean;
	tasks: SavePlanningTaskRequest[];
	deletedTaskIds: number[];

}

interface SaveSubContractLinkRequest {
	id: number;
	subjectId: number;
}

interface SavePlanningSubjectRequest {
	id?: number | null;
	name: string;
	isActive: boolean;
	steps: SavePlanningStepRequest[];
	deletedStageIds: number[];
	deletedSubContractsIds: number[];
	subContractsLink?: SaveSubContractLinkRequest[];
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
	body: JSON.stringify(body)
});

const dedupeNumbers = (items: number[]): number[] => Array.from(new Set(items.filter((n) => n > 0)));

const toNullableIsoDate = (value?: string | null): string | null => {
	if (!value) return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const buildEmployeeLinks = (employees: PlanningSubject["steps"][number]["employees"]): SavePlanningEmployeeLinkRequest[] =>
	employees
		.filter((employee) => !employee.isDeleted)
		.map((employee) => ({
			Id: employee.id > 0 ? employee.id : null,
			employeeId: employee.employeeId,
			percentage: employee.percentage,
			workHours: employee.workHours,
			workDays: employee.workDays,
			duration: employee.duration
		}));

const buildSubjectRequest = (subject: PlanningSubject): SavePlanningSubjectRequest => {
	const deletedStageIds = dedupeNumbers([
		...(subject.deletedStepIds ?? []),
		...subject.steps.filter((step) => step.isDeleted && step.id>0).map((step) => step.id)
	]);

	const deletedSubContractsIds = dedupeNumbers([
		...(subject.deletedSubContractIds ?? []),
		...(subject.subContractsLink ?? [])
			.filter((link) => link.isDeleted && link.id>0)
			.map((link) => link.id)
	]);

	const steps = subject.steps
		.filter((step) => !step.isDeleted)
		.map((step) => {
			const deletedTaskIds = dedupeNumbers([
				...(step.deletedTaskIds ?? []),
				...step.tasks.filter((task) => task.isDeleted && task.id>0).map((task) => task.id)
			]);

			const deletedEmployeeIds = dedupeNumbers([
				...(step.deletedEmployeeIds ?? []),
				...step.employees.filter((employee) => employee.isDeleted).map((employee) =>  employee.id)
			]);

			const tasks = step.tasks
				.filter((task) => !task.isDeleted)
				.map((task) => ({
					id: task.id > 0 ? task.id : null,
					//planningStepId: task.PlanningStepID,
					name: task.name,
					orderNum: task.orderNum,
					percentage: task.percentage,
					workHours: task.workHours,
					workDays: task.workDays,
					duration: task.duration,
					dependsOnTaskId: task.dependsOnTaskId ?? null,
					employees: buildEmployeeLinks(task.employees),
					deletedEmployeeIds: dedupeNumbers([
						...(task.deletedEmployeeIds ?? []),
						...task.employees.filter((employee) => employee.isDeleted).map((employee) => employee.id )
					]),
					startDate: toNullableIsoDate(task.startDate),
					endDate: toNullableIsoDate(task.endDate),
					statusId: task.statusId,
					urgencyId: task.urgencyId,
					isActive: task.isActive

				}));

			return {
				id: step.id > 0 ? step.id : null,
				//planningSubjectId: step.PlanningSubjectID,
				name: step.name,
				orderNum: step.orderNum,
				percentage: step.percentage,
				workHours: step.workHours,
				workDays: step.workDays,
				duration: step.duration,
				dependsOnStepId: step.dependsOnStepId ?? null,
				employees: buildEmployeeLinks(step.employees),
				deletedEmployeeIds,
				startDate: toNullableIsoDate(step.startDate),
				endDate: toNullableIsoDate(step.endDate),
				statusId: step.statusId,
				urgencyId: step.urgencyId,
				isActive: step.isActive,
				tasks,
				deletedTaskIds
			};
		});

	return {
		
		id: subject.id > 0 ? subject.id : null,
		name: subject.name,
		isActive: subject.isActive,
		steps,
		deletedStageIds,
		deletedSubContractsIds,
		subContractsLink: subject.subContractsLink
			?.filter((link) => link.isNew===true)
			.map((link) => ({
				id: link.id,
				subjectId: link.subjectId
			}))
	};
};

export const getPlanningHierarchy = async (projectId: number): Promise<PlanningHierarchyResponse> => {
	try {
		const user = getAuthenticatedUser();
		const query: PlanningHierarchyQuery = {
			database: user.dataBase,
			projectId
		};

		const endpoint = buildEndpoint(user.urlConnection, "/Plannings/GetPlanningHierarchy");
		const response = await authService.makeAuthenticatedRequest(
			endpoint,
			buildPostOptions(query)
		);

		if (!response.ok) {
			throw new Error(`Failed to fetch planning hierarchy: ${response.statusText}`);
		}

		const data = await response.json();
		if (Array.isArray(data)) {
			return { subjects: data as PlanningSubject[] };
		}
		return data as PlanningHierarchyResponse;
	} catch (error) {
		console.error("Error fetching planning hierarchy:", error);
		throw error;
	}
};

export const getPlanningSystemLists = async (): Promise<PlanningSystemLists> => {
	try {
		const user = getAuthenticatedUser();
		const query: BasicQuery = { database: user.dataBase };

		const endpoint = buildEndpoint(user.urlConnection, "/Plannings/GetPlanningSystemLists");
		const response = await authService.makeAuthenticatedRequest(
			endpoint,
			buildPostOptions(query)
		);

		if (!response.ok) {
			throw new Error(`Failed to fetch planning system lists: ${response.statusText}`);
		}

		return await response.json();
	} catch (error) {
		console.error("Error fetching planning system lists:", error);
		throw error;
	}
};

export const getSubjectTemplates = async (projectId: number): Promise<SubjectTemplate[]> => {
	try {
		const user = getAuthenticatedUser();
		const query={ database: user.dataBase, projectId };

		const endpoint = buildEndpoint(user.urlConnection, "/Plannings/subject-template");
		const response = await authService.makeAuthenticatedRequest(
			endpoint,
			buildPostOptions(query)
		);

		if (!response.ok) {
			throw new Error(`Failed to fetch subject templates: ${response.statusText}`);
		}

		return await response.json();
	} catch (error) {
		console.error("Error fetching subject templates:", error);
		throw error;
	}
};

export const savePlanningHierarchy = async (subjects: PlanningSubject[],projectId:number): Promise<unknown> => {
	try {
		const user = getAuthenticatedUser();
		const requestBody = {
			database: user.dataBase,
			employeeID: user.employeeId,
			projectId: projectId ?? 0,
			PlanningSubject: subjects.map((subject) => buildSubjectRequest(subject))
		};
		console.log("Saving planning hierarchy with request body:", requestBody);
		const endpoint = buildEndpoint(user.urlConnection, "/Plannings/SavePlanningSubject");
		const response = await authService.makeAuthenticatedRequest(
			endpoint,
			buildPostOptions(requestBody)
		);

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Failed to save planning hierarchy: ${response.statusText} ${errorText}`);
		}

		return await response.json();
	} catch (error) {
		console.error("Error saving planning hierarchy:", error);
		throw error;
	}
};
