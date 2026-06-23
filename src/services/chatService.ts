import type { EmployeeNotification, TaskChatMessage } from "../Data/projectsData";
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

/** Matches server GetNotificationRequest (Database, EmployeeID) */
export type GetNotificationRequest = {
	Database: string;
	EmployeeID: number;
};

/** Matches server DeleteNotificationRequest (Database, Id, IsTask) */
export type DeleteNotificationRequest = {
	Database: string;
	Id: number;
	IsTask: boolean;
};

const buildNotificationRequest = (user: { dataBase: string; id: number }): GetNotificationRequest => ({
	Database: user.dataBase,
	EmployeeID: Number(user.id) || 0,
});

const parseCountResponse = async (response: Response, errorLabel: string): Promise<number> => {
	if (!response.ok) {
		const errorText = await response.text().catch(() => "");
		throw new Error(
			`Failed to fetch ${errorLabel}: ${response.status} ${response.statusText}${errorText ? ` — ${errorText}` : ""}`.trim()
		);
	}
	const data = await response.json();
	return typeof data === "number" ? data : Number(data) || 0;
};

/** POST + [FromBody] GetNotificationRequest — matches server HttpPost actions. */
const fetchNotificationCount = async (path: string, errorLabel: string): Promise<number> => {
	const user = getAuthenticatedUser();
	const request = buildNotificationRequest(user);
	const endpoint = buildEndpoint(user.urlConnection, path);
	const response = await authService.makeAuthenticatedRequest(
		endpoint,
		buildPostOptions(request)
	);
	return parseCountResponse(response, errorLabel);
};

export const getUnreadNotificationsCount = async (): Promise<number> => {
	try {
		return await fetchNotificationCount(
			"/Chat/GetUnreadNotificationsCount",
			"unread notifications count"
		);
	} catch (error) {
		console.error("Error fetching unread notifications count:", error);
		throw error;
	}
};

export const getUnreadNotificationsTasksCount = async (): Promise<number> => {
	try {
		return await fetchNotificationCount(
			"/Chat/GetUnreadNotificationsTasksCount",
			"unread task notifications count"
		);
	} catch (error) {
		console.error("Error fetching unread task notifications count:", error);
		throw error;
	}
};

/** Matches server Notification from TaskIt_GetEmployeeTasksNotifications */
export type EmployeeTasksNotification = {
	id: number;
	isTask: boolean;
	taskId: number;
	senderName: string | null;
	name: string | null;
	createDate: string | null;
	isRead: boolean;
	projectName: string | null;
	planningSubjectName: string | null;
	stepName: string | null;
};

const pickStr = (row: Record<string, unknown>, ...keys: string[]): string | null => {
	for (const key of keys) {
		const v = row[key];
		if (v != null && v !== "") return String(v);
	}
	return null;
};

const mapEmployeeTasksNotification = (row: Record<string, unknown>): EmployeeTasksNotification => {
	const createDateRaw = row.createDate ?? row.CreateDate;
	let createDate: string | null = null;
	if (createDateRaw != null && createDateRaw !== "") {
		createDate =
			typeof createDateRaw === "string"
				? createDateRaw
				: new Date(createDateRaw as string | number).toISOString();
	}

	return {
		id: Number(row.id ?? row.Id ?? 0),
		isTask: Boolean(row.isTask ?? row.IsTask ?? false),
		taskId: Number(row.taskId ?? row.TaskId ?? 0),
		senderName: pickStr(row, "senderName", "SenderName"),
		name: pickStr(row, "name", "Name", "taskName", "TaskName"),
		createDate,
		isRead: Boolean(row.isRead ?? row.IsRead ?? false),
		projectName: pickStr(row, "projectName", "ProjectName"),
		planningSubjectName: pickStr(row, "planningSubjectName", "PlanningSubjectName"),
		stepName: pickStr(row, "stepName", "StepName"),
	};
};

/** POST /Chat/employee-tasks-notifications — [FromBody] GetNotificationRequest */
export const getEmployeeTasksNotifications = async (): Promise<EmployeeTasksNotification[]> => {
	try {
		const user = getAuthenticatedUser();
		const request = buildNotificationRequest(user);
		const endpoint = buildEndpoint(user.urlConnection, "/Chat/employee-tasks-notifications");
		const response = await authService.makeAuthenticatedRequest(
			endpoint,
			buildPostOptions(request)
		);

		if (!response.ok) {
			const errorText = await response.text().catch(() => "");
			throw new Error(
				`Failed to fetch employee task notifications: ${response.status} ${response.statusText}${errorText ? ` — ${errorText}` : ""}`.trim()
			);
		}

		const data = await response.json();
		if (!Array.isArray(data)) return [];

		return data.map((item) =>
			mapEmployeeTasksNotification(item as Record<string, unknown>)
		);
	} catch (error) {
		console.error("Error fetching employee task notifications:", error);
		throw error;
	}
};

/** POST /Chat/delete-notification — [FromBody] DeleteNotificationRequest */
export const deletePlanningNotification = async (
	id: number,
	isTask: boolean
): Promise<boolean> => {
	try {
		const user = getAuthenticatedUser();
		const request: DeleteNotificationRequest = {
			Database: user.dataBase,
			Id: id,
			IsTask: isTask,
		};
		const endpoint = buildEndpoint(user.urlConnection, "/Chat/delete-notification");
		const response = await authService.makeAuthenticatedRequest(
			endpoint,
			buildPostOptions(request)
		);

		if (!response.ok) {
			const errorText = await response.text().catch(() => "");
			throw new Error(
				`Failed to delete notification: ${response.status} ${response.statusText}${errorText ? ` — ${errorText}` : ""}`.trim()
			);
		}

		const data = await response.json();
		return data === true || data === "true";
	} catch (error) {
		console.error("Error deleting planning notification:", error);
		throw error;
	}
};

/** POST /Chat/notifications — [FromBody] GetNotificationRequest */
export const getEmployeeNotifications = async (): Promise<EmployeeNotification[]> => {
	try {
		const user = getAuthenticatedUser();
		const request = buildNotificationRequest(user);
		const endpoint = buildEndpoint(user.urlConnection, "/Chat/notifications");
		const response = await authService.makeAuthenticatedRequest(
			endpoint,
			buildPostOptions(request)
		);

		if (!response.ok) {
			const errorText = await response.text().catch(() => "");
			throw new Error(
				`Failed to fetch employee notifications: ${response.status} ${response.statusText}${errorText ? ` — ${errorText}` : ""}`.trim()
			);
		}

		const data = await response.json();
		return Array.isArray(data) ? data : [];
	} catch (error) {
		console.error("Error fetching employee notifications:", error);
		throw error;
	}
};

export const updateNotificationReadState = async (
    taskChatId: number,
    isTask: boolean,
    isRead: boolean,
    taskId?: number
): Promise<boolean> => {
    try {
        const user = getAuthenticatedUser();
        const query = {
            database: user.dataBase,
                taskChatId,
                isTask,
                isRead,
                ...(taskId ? { taskId } : {})
        };
        const endpoint = `${user.urlConnection}/Chat/UpdateNotificationReadState`;
        const response = await authService.makeAuthenticatedRequest(endpoint, {
            method: "POST" as const,
            body: JSON.stringify(query)
        });

        if (!response.ok) {
            throw new Error(`Failed to update notification read state: ${response.statusText}`);
        }

        return true;
    } catch (error) {
        console.error("Error updating notification read state:", error);
        throw error;
    }
};

export const insertChatAsync = async (
    id: number,
    chatMessage: string,
    isTask: boolean,
    receiverIds?: number[]   // מערך — undefined = שלח לכולם
): Promise<number> => {
    try {
        const user = getAuthenticatedUser();
        const query = {
            database: user.dataBase,
            id,
            isTask,
            chatMessage,
            senderId: user.id,
            ...(receiverIds?.length ? { receiverIds } : {})
        };
 
        const endpoint = buildEndpoint(user.urlConnection, "/Chat/InsertChatAsync");
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
export const deletePlanningChat = async (
    taskChatId: number,
    isTask: boolean
): Promise<boolean> => {
    try {
        const user = getAuthenticatedUser();
        const query = {
            database: user.dataBase,
            isTask,
            taskChatId
        };

        const endpoint = buildEndpoint(user.urlConnection, "/Chat/DeletePlanningChat");
        const response = await authService.makeAuthenticatedRequest(
            endpoint,
            buildPostOptions(query)
        );

        if (!response.ok) {
            throw new Error(`Failed to delete planning chat: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Error deleting planning chat:", error);
        throw error;
    }
};

export const updatePlanningChat = async (
    taskChatId: number,
    isTask: boolean,
    message: string
): Promise<boolean> => {
    try {
        const user = getAuthenticatedUser();
        const query = {
            database: user.dataBase,
            isTask,
            taskChatId,
            message
        };

        const endpoint = buildEndpoint(user.urlConnection, "/Chat/UpdatePlanningChat");
        const response = await authService.makeAuthenticatedRequest(
            endpoint,
            buildPostOptions(query)
        );

        if (!response.ok) {
            throw new Error(`Failed to update planning chat: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Error updating planning chat:", error);
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

		const endpoint = buildEndpoint(user.urlConnection, "/Chat/GetChatData");
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