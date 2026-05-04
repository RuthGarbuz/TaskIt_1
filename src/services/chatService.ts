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
export const getUnreadNotificationsCount = async (): Promise<number> => {
    try {
        const user = getAuthenticatedUser();
        const endpoint = `${user.urlConnection}/Chat/GetUnreadNotificationsCount?database=${encodeURIComponent(
            user.dataBase
        )}&employeeId=${user.id}`;
        const response = await authService.makeAuthenticatedRequest(endpoint, {
            method: "GET" as const
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch unread notifications count: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching unread notifications count:", error);
        throw error;
    }
};

export const getEmployeeNotifications = async (): Promise<EmployeeNotification[]> => {
    try {
        const user = getAuthenticatedUser();
        const endpoint = `${user.urlConnection}/Chat/notifications?database=${encodeURIComponent(
            user.dataBase
        )}&employeeId=${user.id}`;
        const response = await authService.makeAuthenticatedRequest(endpoint, {
            method: "GET" as const
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch employee notifications: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching employee notifications:", error);
        throw error;
    }
};

export const updateNotificationReadState = async (
    taskChatId: number,
    isTask: boolean,
    isRead: boolean
): Promise<boolean> => {
    try {
        const user = getAuthenticatedUser();
        const query = {
            database: user.dataBase,
                taskChatId,
                isTask,
                isRead
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