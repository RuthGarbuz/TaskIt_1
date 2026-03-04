import type { GeneralSettings, WorkCapacitySettingsResult, EmployeeWorkCapacityUpdate, EmployeeWorkingSetting, StatusItem, PriorityItem } from "../types/settings";
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
  body: JSON.stringify(body),
  // headers: {
  //           'Content-Type': 'application/json',
  //       }
});

export const getGeneralSettings = async (): Promise<GeneralSettings | null> => {
  try {
    const user = getAuthenticatedUser();

      const requestBody = {
        database: user.dataBase,
      };
      const endpoint = buildEndpoint(user.urlConnection, "/Settings/GetGeneralSettings");
   const response = await authService.makeAuthenticatedRequest(
        endpoint,
        buildPostOptions(requestBody)
      );
  

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch general settings: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching general settings:', error);
    throw error;
  }
};

export const updateGeneralSettings = async (settings: GeneralSettings): Promise<boolean> => {
  try {
    const user = getAuthenticatedUser();

    const numberOfHours = Number((settings.hours + (settings.minutes / 60)).toFixed(2));

  const requestBody = {
  Database: user.dataBase,
  ID: settings.id,
  DisplayMode: settings.displayMode,
  ProfitPercentage: settings.profitPercentage,
  WorkingHourCost: settings.workingHourCost,
  MonthlyJobScopeHours: settings.monthlyJobScopeHours,
  NumberOfHours: numberOfHours,
  BillRequestSent: settings.billRequestSent,
  ClosedByStatusChange: settings.closedByStatusChange
};
    
    const endpoint = buildEndpoint(user.urlConnection, "/Settings/UpdateGeneralSettings");
    const response = await authService.makeAuthenticatedRequest(
      endpoint,
      buildPostOptions(requestBody)
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update general settings: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error updating general settings:', error);
    throw error;
  }
};

export const getWorkCapacitySettings = async (): Promise<WorkCapacitySettingsResult | null> => {
  try {
    const user = getAuthenticatedUser();

    const requestBody = {
      database: user.dataBase,
    };
    const endpoint = buildEndpoint(user.urlConnection, "/Settings/GetWorkCapacitySettings");
    const response = await authService.makeAuthenticatedRequest(
      endpoint,
      buildPostOptions(requestBody)
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch work capacity settings: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching work capacity settings:', error);
    throw error;
  }
};

export const updateEmployeeWorkCapacity = async (employees: EmployeeWorkCapacityUpdate[]): Promise<boolean> => {
  try {
    const user = getAuthenticatedUser();

    const requestBody = {
      database: user.dataBase,
      employees: employees,
    };

    const endpoint = buildEndpoint(user.urlConnection, "/Settings/UpdateEmployeeWorkCapacity");
    const response = await authService.makeAuthenticatedRequest(
      endpoint,
      buildPostOptions(requestBody)
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update employee work capacity: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error updating employee work capacity:', error);
    throw error;
  }
};

export const insertEmployee = async (employee: EmployeeWorkingSetting): Promise<number> => {
  try {
    const user = getAuthenticatedUser();

    const requestBody = {
      database: user.dataBase,
      identityNum: employee.idNumber,
      firstName: employee.firstName,
      lastName: employee.lastName,
      workCapacityPercentage: employee.jobPercentage,
    };

    const endpoint = buildEndpoint(user.urlConnection, "/Settings/InsertWorkCapacityEmployee");
    const response = await authService.makeAuthenticatedRequest(
      endpoint,
      buildPostOptions(requestBody)
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to insert employee: ${response.status} - ${errorText}`);
    }

    const newId = await response.json();
    return newId;
  } catch (error) {
    console.error('Error inserting employee:', error);
    throw error;
  }
};

export const getStatuses = async (): Promise<StatusItem[]> => {
  try {
    const user = getAuthenticatedUser();

    const requestBody = {
      database: user.dataBase,
    };
    
    const endpoint = buildEndpoint(user.urlConnection, "/Settings/GetStatuses");
    const response = await authService.makeAuthenticatedRequest(
      endpoint,
      buildPostOptions(requestBody)
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch statuses: ${response.statusText}`);
    }

    const data: StatusItem[] = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching statuses:', error);
    throw error;
  }
};

export const getPriorities = async (): Promise<PriorityItem[]> => {
  try {
    const user = getAuthenticatedUser();

    const requestBody = {
      database: user.dataBase,
    };
    
    const endpoint = buildEndpoint(user.urlConnection, "/Settings/GetPriorities");
    const response = await authService.makeAuthenticatedRequest(
      endpoint,
      buildPostOptions(requestBody)
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch priorities: ${response.statusText}`);
    }

    const data: PriorityItem[] = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching priorities:', error);
    throw error;
  }
};

// Status CRUD operations
export const insertStatus = async (status: Omit<StatusItem, 'id'>): Promise<number> => {
  try {
    const user = getAuthenticatedUser();

    const requestBody = {
      database: user.dataBase,
      name: status.name,
      color: status.color,
      progressPercentage: status.progressPercentage,
      isDefault: status.isDefault,
      isActive: status.isActive
    };
    
    const endpoint = buildEndpoint(user.urlConnection, "/Settings/InsertStatus");
    const response = await authService.makeAuthenticatedRequest(
      endpoint,
      buildPostOptions(requestBody)
    );

    if (!response.ok) {
      throw new Error(`Failed to insert status: ${response.statusText}`);
    }

    const newId = await response.json();
    return newId;
  } catch (error) {
    console.error('Error inserting status:', error);
    throw error;
  }
};

export const updateStatus = async (status: StatusItem): Promise<boolean> => {
  try {
    const user = getAuthenticatedUser();

    const requestBody = {
      database: user.dataBase,
      id: status.id,
      name: status.name,
      color: status.color,
      progressPercentage: status.progressPercentage,
      isDefault: status.isDefault,
      isActive: status.isActive
    };
    
    const endpoint = buildEndpoint(user.urlConnection, "/Settings/UpdateStatus");
    const response = await authService.makeAuthenticatedRequest(
      endpoint,
      buildPostOptions(requestBody)
    );

    if (!response.ok) {
      throw new Error(`Failed to update status: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error updating status:', error);
    throw error;
  }
};

export const deleteStatus = async (statusId: number): Promise<boolean> => {
  try {
    const user = getAuthenticatedUser();
    
    const endpoint = buildEndpoint(
      user.urlConnection, 
      `/Settings/DeleteStatus?database=${encodeURIComponent(user.dataBase)}&id=${statusId}`
    );
    const response = await authService.makeAuthenticatedRequest(
      endpoint,
      { method: "POST" }
    );

    if (!response.ok) {
      throw new Error(`Failed to delete status: ${response.statusText}`);
    }

    const result = await response.json();
    return result.message ? true : result;
  } catch (error) {
    console.error('Error deleting status:', error);
    throw error;
  }
};

// Priority CRUD operations
export const insertPriority = async (priority: Omit<PriorityItem, 'id'>): Promise<number> => {
  try {
    const user = getAuthenticatedUser();

    const requestBody = {
      database: user.dataBase,
      name: priority.name,
      color: priority.color,
      isDefault: priority.isDefault,
      isActive: priority.isActive
    };
    
    const endpoint = buildEndpoint(user.urlConnection, "/Settings/InsertPriority");
    const response = await authService.makeAuthenticatedRequest(
      endpoint,
      buildPostOptions(requestBody)
    );

    if (!response.ok) {
      throw new Error(`Failed to insert priority: ${response.statusText}`);
    }

    const newId = await response.json();
    return newId;
  } catch (error) {
    console.error('Error inserting priority:', error);
    throw error;
  }
};

export const updatePriority = async (priority: PriorityItem): Promise<boolean> => {
  try {
    const user = getAuthenticatedUser();

    const requestBody = {
      database: user.dataBase,
      id: priority.id,
      name: priority.name,
      color: priority.color,
      isDefault: priority.isDefault,
      isActive: priority.isActive
    };
    
    const endpoint = buildEndpoint(user.urlConnection, "/Settings/UpdatePriority");
    const response = await authService.makeAuthenticatedRequest(
      endpoint,
      buildPostOptions(requestBody)
    );

    if (!response.ok) {
      throw new Error(`Failed to update priority: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error updating priority:', error);
    throw error;
  }
};

export const deletePriority = async (id: number): Promise<boolean> => {
  try {
    const user = getAuthenticatedUser();
    
    const endpoint = buildEndpoint(
      user.urlConnection, 
      `/Settings/DeletePriority?database=${encodeURIComponent(user.dataBase)}&id=${id}`
    );
    const response = await authService.makeAuthenticatedRequest(
      endpoint,
      { method: "POST" }
    );

    if (!response.ok) {
      throw new Error(`Failed to delete priority: ${response.statusText}`);
    }

    const result = await response.json();
    return result.message ? true : result;
  } catch (error) {
    console.error('Error deleting priority:', error);
    throw error;
  }
};


