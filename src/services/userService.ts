import type { EmployeeNotification } from "../Data/projectsData";
import type { UserListItem } from "../Data/settingsData";
import authService from "./authService";

const API_BASE_URL = "https://localhost:7282/api";

//const API_BASE_URL = "https://mpweba.master-plan.co.il/TaskItGlobalWebAPI/api";

const getAuthenticatedUser = () => {
	const user = authService.getCurrentUser();
	if (!user) {
		throw new Error("User not authenticated");
	}
	return user;
};

// const buildPostOptions = (body: unknown) => ({
// 	method: "POST" as const,
// 	body: JSON.stringify(body)
// });
export const getUsersList = async (): Promise<UserListItem[]> => {
    try {

        const user = getAuthenticatedUser();
       
        const request: UserRequest = { 
            dataBaseName: user.dataBase,
        };
 
        const endpoint = `${API_BASE_URL}/User/GetUsersList`;
        const response = await authService.makeAuthenticatedRequest(endpoint, {
            method: "POST" as const,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(request)  // ✅ Send the request body
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch users list: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching users list:", error);
        throw error;
    }
};

export interface UserRequest {
    dataBaseName: string;
}

export interface UserPermissionUpdate {
    id: number;
    permissionID: number;
}



const buildPostOptions = (body: unknown) => ({
    method: "POST" as const,
    body: JSON.stringify(body)
});

export const saveUsersPermissions = async (updates: UserPermissionUpdate[]): Promise<boolean> => {
    try {
        getAuthenticatedUser();

        const endpoint = `${API_BASE_URL}/User/UpdateUser`;
        const response = await authService.makeAuthenticatedRequest(
            endpoint,
            buildPostOptions(updates)
        );

        if (!response.ok) {
            throw new Error(`Failed to save users permissions: ${response.statusText}`);
        }

        return true;
    } catch (error) {
        console.error("Error saving users permissions:", error);
        throw error;
    }
};


