import type {
	GetProjectInfoQuery,
	ProjectInfo,
	ProjectBasic,
	UpdateProjectIsDefaultRequest,
	UpdateProjectFinancialsRequest
} from "../Data/projectInfoData";
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

export const getProjectInfo = async (projectId: number): Promise<ProjectInfo | null> => {
	try {
		const user = getAuthenticatedUser();

		const query: GetProjectInfoQuery = {
			database: user.dataBase,
			projectId
		};
      const endpoint = buildEndpoint(user.urlConnection, "/ProjectInfo/GetProjectInfo");

		const response = await authService.makeAuthenticatedRequest(
			endpoint,
			buildPostOptions(query)
		);

		if (!response.ok) {
			if (response.status === 404) {
				return null;
			}
			throw new Error(`Failed to fetch project info: ${response.statusText}`);
		}

		return await response.json();
	} catch (error) {
		console.error("Error fetching project info:", error);
		throw error;
	}
};

export const updateProjectIsDefault = async (projectId: number, isDefault: boolean): Promise<boolean> => {
	try {
		const user = getAuthenticatedUser();
		const request: UpdateProjectIsDefaultRequest = {
			database: user.dataBase,
			projectId,
			isDefault
		};

		const endpoint = buildEndpoint(user.urlConnection, "/ProjectInfo/UpdateProjectIsDefault");
		const response = await authService.makeAuthenticatedRequest(
			endpoint,
			buildPostOptions(request)
		);

		if (!response.ok) {
			return false;
		}

		return true;
	} catch (error) {
		console.error("Error updating project IsDefault:", error);
		return false;
	}
};

export const getBasicProjects = async (): Promise<ProjectBasic[]> => {
	try {
		const user = getAuthenticatedUser();
		const request = { database: user.dataBase, employeeId: user.id, permissionId: user.permissionId };

		const endpoint = buildEndpoint(user.urlConnection, "/ProjectInfo/GetBasicProjects");
		const response = await authService.makeAuthenticatedRequest(
			endpoint,
			buildPostOptions(request)
		);

		if (!response.ok) {
			throw new Error(`Failed to fetch basic projects: ${response.statusText}`);
		}

		return await response.json();
	} catch (error) {
		console.error("Error fetching basic projects:", error);
		throw error;
	}
};

export const updateProjectFinancials = async (
	projectId: number,
	workingHourCost: number,
	profitPercentage: number
): Promise<boolean> => {
	try {
		const user = getAuthenticatedUser();
		const request: UpdateProjectFinancialsRequest = {
			database: user.dataBase,
			projectId,
			workingHourCost,
			profitPercentage
		};

		const endpoint = buildEndpoint(user.urlConnection, "/ProjectInfo/UpdateProjectFinancials");
		const response = await authService.makeAuthenticatedRequest(
			endpoint,
			buildPostOptions(request)
		);

		if (!response.ok) {
			return false;
		}

		return true;
	} catch (error) {
		console.error("Error updating project financials:", error);
		return false;
	}
};
