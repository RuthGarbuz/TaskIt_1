import type { BasicQuery, GetTasksRequest, SystemTable, TaskReview } from "../Data/projectsData";
import authService from "./authService";

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

export const getTaskStatuses = async (): Promise<SystemTable[]> => {
	try {
		const user = getAuthenticatedUser();
		const query: BasicQuery = { database: user.dataBase };

		const endpoint = buildEndpoint(user.urlConnection, "/Tasks/GetStatuseList");
		const response = await authService.makeAuthenticatedRequest(
			endpoint,
			buildPostOptions(query)
		);

		if (!response.ok) {
			throw new Error(`Failed to fetch task statuses: ${response.statusText}`);
		}

		return await response.json();
	} catch (error) {
		console.error("Error fetching task statuses:", error);
		throw error;
	}
};

export const getTasks = async (
	request: Omit<GetTasksRequest, "database">
): Promise<TaskReview[]> => {
	try {
		const user = getAuthenticatedUser();
		const query: GetTasksRequest = {
			database: user.dataBase,
			projectId: request.projectId,
			employeeId: request.employeeId,
			permissionType: request.permissionType,
			myTask: request.myTask
		};

		const endpoint = buildEndpoint(user.urlConnection, "/Tasks/GetTasks");
		const response = await authService.makeAuthenticatedRequest(
			endpoint,
			buildPostOptions(query)
		);

		if (!response.ok) {
			throw new Error(`Failed to fetch tasks: ${response.statusText}`);
		}

		return await response.json();
	} catch (error) {
		console.error("Error fetching tasks:", error);
		throw error;
	}
};
