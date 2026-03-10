import type { BasicQuery, EmployeeLink, GetChatDataRequest, GetMyTasksRequest, GetTasksRequest, SystemTable, TaskChatMessage, TaskReview, TaskUpdatePatch } from "../Data/projectsData";
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

export const getTaskPriorities = async (): Promise<SystemTable[]> => {
	try {
		const user = getAuthenticatedUser();
		const query: BasicQuery = { database: user.dataBase };

		const endpoint = buildEndpoint(user.urlConnection, "/Tasks/GetPrioritiesList");
		const response = await authService.makeAuthenticatedRequest(
			endpoint,
			buildPostOptions(query)
		);

		if (!response.ok) {
			throw new Error(`Failed to fetch task priorities: ${response.statusText}`);
		}

		return await response.json();
	} catch (error) {
		console.error("Error fetching task priorities:", error);
		throw error;
	}
};

export const getTasks = async (projectId:number,fromDate:string|null,toDate:string|null
	
): Promise<TaskReview[]> => {
	try {
		const user = getAuthenticatedUser();
		const query: GetTasksRequest = {
			database: user.dataBase,
			projectId: projectId??0,
			employeeId: user.id,
			permissionType: user.permissionId,
			fromDate: toNullableIsoDate(fromDate),
			toDate: toNullableIsoDate(toDate)
		};

		const endpoint = buildEndpoint(user.urlConnection, "/Tasks/GetAllTasks");
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

const toNullableIsoDate = (value?: string | null): string | null => {
	if (!value) return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export const getMyTasks = async (fromDate:string|null,toDate:string|null
): Promise<TaskReview[]> => {
	try {
		const user = getAuthenticatedUser();
		const query: GetMyTasksRequest = {
			database: user.dataBase,
			employeeId: user.id,
			fromDate: toNullableIsoDate(fromDate),
			toDate: toNullableIsoDate(toDate)
		};

		const endpoint = buildEndpoint(user.urlConnection, "/Tasks/GetMyTasks");
		const response = await authService.makeAuthenticatedRequest(
			endpoint,
			buildPostOptions(query)
		);

		if (!response.ok) {
			throw new Error(`Failed to fetch my tasks: ${response.statusText}`);
		}

		return await response.json();
	} catch (error) {
		console.error("Error fetching my tasks:", error);
		throw error;
	}
};

export const getChatData = async (id: number,isTask: boolean): Promise<TaskChatMessage[]> => {
	try {
		const user = getAuthenticatedUser();
		const query= {
			database: user.dataBase,
			id:id,
			isTask:isTask
		};

		const endpoint = buildEndpoint(user.urlConnection, "/Tasks/GetChatData");
		const response = await authService.makeAuthenticatedRequest(
			endpoint,
			buildPostOptions(query)
		);

		if (!response.ok) {
			throw new Error(`Failed to fetch chat data: ${response.statusText}`);
		}

		return await response.json();
	} catch (error) {
		console.error("Error fetching chat data:", error);
		throw error;
	}
};
export const insertChatAsync = async (
    id: number,
    chatMessage: string,
    isTask: boolean
): Promise<number> => {
    try {
        const user = getAuthenticatedUser();
        const query = {
            database: user.dataBase,
            id,
            isTask,
            chatMessage,
            senderId: user.id
        };

        const endpoint = buildEndpoint(user.urlConnection, "/Tasks/InsertChatAsync");
        const response = await authService.makeAuthenticatedRequest(
            endpoint,
            buildPostOptions(query)
        );

        if (!response.ok) {
            throw new Error(`Failed to insert chat: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Error inserting chat:", error);
        throw error;
    }
};

export const updateStatusAsync = async (
    id: number,
    statusId: number,
    isTask: boolean,
	isAllTasks: boolean
): Promise<boolean> => {
    try {
        const user = getAuthenticatedUser();
        const query = {
            database: user.dataBase,
            id,
            statusId,
            isTask,
			employeeId:isAllTasks ? 0 : user.id
        };

        const endpoint = buildEndpoint(user.urlConnection, "/Tasks/UpdateStatusAsync");
        const response = await authService.makeAuthenticatedRequest(
            endpoint,
            buildPostOptions(query)
        );

        if (!response.ok) {
            throw new Error(`Failed to update status: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Error updating status:", error);
        throw error;
    }
};
export const updateUrgencyAsync = async (
    id: number,
    urgencyId: number,
    isTask: boolean
): Promise<boolean> => {
    try {
        const user = getAuthenticatedUser();
        const query = {
            database: user.dataBase,
            id,
            urgencyId,
            isTask
        };

        const endpoint = buildEndpoint(user.urlConnection, "/Tasks/UpdateUrgencyAsync");
        const response = await authService.makeAuthenticatedRequest(
            endpoint,
            buildPostOptions(query)
        );

        if (!response.ok) {
            throw new Error(`Failed to update urgency: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Error updating urgency:", error);
        throw error;
    }
};

export const getEmployeeLinksAsync = async (
  id: number,
  isTask: boolean
): Promise<EmployeeLink[]> => {
  try {
    const user = getAuthenticatedUser();
    const query = {
      database: user.dataBase,
      id,
      isTask
    };

    const endpoint = buildEndpoint(user.urlConnection, "/Tasks/GetEmployeeLinksAsync"); // <-- confirm endpoint
    const response = await authService.makeAuthenticatedRequest(
      endpoint,
      buildPostOptions(query)
    );

    if (!response.ok) {
      throw new Error(`Failed to load employee links: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error loading employee links:", error);
    throw error;
  }
};

export const updateTaskAsync = async (
    taskUpdate: TaskUpdatePatch,
    employeeLinks: EmployeeLink[],
    isTask: boolean
): Promise<boolean> => {
    try {
        const user = getAuthenticatedUser();
       const normalizedTaskUpdate = {
      ...taskUpdate,
      startDate: taskUpdate.startDate ? new Date(taskUpdate.startDate).toISOString() : null,
      endDate: taskUpdate.endDate ? new Date(taskUpdate.endDate).toISOString() : null
    };

    const activeEmployees = employeeLinks
      .filter(l => !l.isDeleted)
      .map(l => ({
        id: l.id > 0 ? l.id : null,
        employeeId: l.employeeId,
        percentage: l.percentage,
        workHours: l.workHours,
        workDays: l.workDays,
        duration: l.duration,
        statusId: l.statusId
      }));

    const deletedEmployeeIds = Array.from(
      new Set(employeeLinks.filter(l => l.isDeleted && l.id > 0).map(l => l.id))
    );

    const query = {
      database: user.dataBase,
      taskUpdate: normalizedTaskUpdate,
      employees: activeEmployees,
      deletedEmployeeIds,
      isTask
    };


        const endpoint = buildEndpoint(user.urlConnection, "/Tasks/UpdateTaskAsync");
        const response = await authService.makeAuthenticatedRequest(
            endpoint,
            buildPostOptions(query)
        );

        if (!response.ok) {
            throw new Error(`Failed to update task: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Error updating task:", error);
        throw error;
    }
};
export const deleteTaskOrStageAsync = async (
  id: number,
  isTask: boolean
): Promise<boolean> => {
  try {
    const user = getAuthenticatedUser();
    const query = {
      database: user.dataBase,
      id
    };

    const endpoint = buildEndpoint(
      user.urlConnection,
      isTask ? "/Tasks/DeleteTaskAsync" : "/Tasks/DeleteStageAsync"
    );

    const response = await authService.makeAuthenticatedRequest(
      endpoint,
      buildPostOptions(query)
    );

    if (!response.ok) {
      throw new Error(`Failed to delete: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error deleting task/stage:", error);
    throw error;
  }
};