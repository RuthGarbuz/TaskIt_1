import type { BillTaskReview, GetBillTasksRequest, SavePlanningBillRequest, UpdateSubmitedBillRequest } from '../Data/projectsData';
import authService from './authService';

const getAuthenticatedUser = () => {
  const user = authService.getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user;
};

const buildEndpoint = (baseUrl: string, path: string): string => `${baseUrl}${path}`;

const buildPostOptions = (body: unknown) => ({
  method: 'POST' as const,
  body: JSON.stringify(body),
});

const buildDeleteOptions = (body: unknown) => ({
  method: 'DELETE' as const,
  body: JSON.stringify(body),
});

const toNullableIsoDate = (value?: string | null): string | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export const getBillTasks = async (
  fromDate: string | null,
  toDate: string | null,
  isSubmited?: boolean,
  filters?: {
    projectId?: number | null;
    statusIds?: number[];
    projectIds?: number[];
    employeeIds?: number[];
  },
): Promise<BillTaskReview[]> => {
  try {
    const user = getAuthenticatedUser();
    const query: GetBillTasksRequest = {
      database: user.dataBase,
      projectId: filters?.projectId ?? null,
      employeeId: user.id,
      permissionType: user.permissionId,
      fromDate: toNullableIsoDate(fromDate),
      toDate: toNullableIsoDate(toDate),
      isSubmited: isSubmited ?? null,
      statusIds: filters?.statusIds,
      projectIds: filters?.projectIds,
      employeeIds: filters?.employeeIds,
    };

    const endpoint = buildEndpoint(user.urlConnection, '/PlanningBills/get-bill-tasks');
    const response = await authService.makeAuthenticatedRequest(
      endpoint,
      buildPostOptions(query),
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch bill tasks: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching bill tasks:', error);
    throw error;
  }
};

export const savePlanningBill = async (
  planningTaskID: number,
  isPlanningStep: boolean,
  employeeID: number,
  note?: string | null,
): Promise<number> => {
  try {
    const user = getAuthenticatedUser();
    const query: SavePlanningBillRequest = {
      database: user.dataBase,
      planningTaskID,
      employeeID,
      isPlanningStep,
      note: note ?? null,
      updatedByID: user.id,
    };

    const endpoint = buildEndpoint(user.urlConnection, '/PlanningBills/save');
    const response = await authService.makeAuthenticatedRequest(
      endpoint,
      buildPostOptions(query),
    );

    if (!response.ok) {
      const errorText = (await response.text()).trim();
      throw new Error(errorText || `Failed to save planning bill: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving planning bill:', error);
    throw error;
  }
};

export const updateSubmitedBill = async (
  planningBillId: number,
  isSubmited: boolean,
): Promise<boolean> => {
  try {
    const user = getAuthenticatedUser();
    if (!Number.isFinite(planningBillId) || planningBillId <= 0) {
      throw new Error('Invalid planning bill id for update');
    }

    const query: UpdateSubmitedBillRequest = {
      database: user.dataBase,
      id: planningBillId,
      isSubmited,
    };

    const endpoint = buildEndpoint(user.urlConnection, '/PlanningBills/update-submited');
    const response = await authService.makeAuthenticatedRequest(
      endpoint,
      buildPostOptions(query),
    );

    if (response.status === 404) return false;

    if (!response.ok) {
      const errorText = (await response.text()).trim();
      throw new Error(errorText || `Failed to update submitted bill: ${response.status} ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error updating submitted bill:', error);
    throw error;
  }
};

export const deletePlanningBill = async (planningBillId: number): Promise<boolean> => {
  try {
    const user = getAuthenticatedUser();
    if (!Number.isFinite(planningBillId) || planningBillId <= 0) {
      throw new Error('Invalid planning bill id for delete');
    }

    const query = {
      database: user.dataBase,
      id: planningBillId,
    };

    const endpoint = buildEndpoint(user.urlConnection, '/PlanningBills/delete');
    const response = await authService.makeAuthenticatedRequest(
      endpoint,
      buildDeleteOptions(query),
    );

    if (response.status === 404) return false;

    if (!response.ok) {
      const errorText = (await response.text()).trim();
      throw new Error(errorText || `Failed to delete planning bill: ${response.status} ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error deleting planning bill:', error);
    throw error;
  }
};
