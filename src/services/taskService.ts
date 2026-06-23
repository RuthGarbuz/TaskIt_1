import type { BasicQuery, DependsOnStepData, DependsOnTaskData, EmployeeLink, GetMyTasksRequest, GetTasksRequest, SubContractData, SystemTable, TaskReview, TaskUpdatePatch } from "../Data/projectsData";
import authService from "./authService";
import { getPlanningStepData } from "./ganttService";

const pickPositiveInt = (raw: Record<string, unknown>, keys: string[]): number | null => {
	for (const key of keys) {
		const v = raw[key];
		if (v == null || v === "") continue;
		const n = Number(v);
		if (Number.isFinite(n) && n > 0) return n;
	}
	return null;
};

const statusIdFromTaskRow = (row?: TaskReview | null): number | null => {
	if (!row) return null;
	if (row.statuID != null && row.statuID > 0) return row.statuID;
	return null;
};

/** Find the planning-step row in a tasks list (GetAllTasks / GetTasksForProject). */
export const findPlanStepRowInTasks = (
	tasks: TaskReview[],
	planningStepID: number,
	parentStepID?: number | null,
): TaskReview | undefined => {
	const keys = new Set(
		[planningStepID, parentStepID ?? 0].filter((v): v is number => Number.isFinite(v) && v > 0),
	);
	if (keys.size === 0) return undefined;
	return tasks.find(
		t => t.isPlanningSte && (keys.has(t.id) || keys.has(t.planningStepID)),
	);
};

/** Canonical row identity — step id/planningStepID can represent the same step in either field. */
export const taskReviewIdentityKey = (
	task: Pick<TaskReview, "id" | "isPlanningSte" | "planningStepID" | "projectId">,
): string => {
	if (!task.isPlanningSte) {
		return `task-${task.projectId}-${task.id}`;
	}
	const lo = Math.min(task.id, task.planningStepID);
	const hi = Math.max(task.id, task.planningStepID);
	return `step-${task.projectId}-${lo}-${hi}`;
};

/** React list key; pass index when rendering arrays that may still contain duplicates. */
export const taskReviewRowKey = (
	task: Pick<TaskReview, "id" | "isPlanningSte" | "planningStepID" | "projectId" | "orderNum">,
	index?: number,
): string => {
	const base = `${taskReviewIdentityKey(task)}-o${task.orderNum ?? 0}`;
	return index == null ? base : `${base}-i${index}`;
};

/** Remove duplicate step/task rows returned by GetAllTasks / GetMyTasks. */
export const dedupeTaskReviews = (tasks: TaskReview[]): TaskReview[] => {
	const seen = new Set<string>();
	const result: TaskReview[] = [];
	for (const task of tasks) {
		const key = taskReviewIdentityKey(task);
		if (seen.has(key)) continue;
		seen.add(key);
		result.push(task);
	}
	return result;
};

const normalizeDependsOnTaskData = (raw: unknown): DependsOnTaskData | null => {
	if (!raw || typeof raw !== "object") return null;
	const r = raw as Record<string, unknown>;
	const parentStepID = pickPositiveInt(r, ["parentStepID", "ParentStepID"]);
	if (!parentStepID) return null;

	const parentStep_StatuID = pickPositiveInt(r, [
		"parentStep_StatuID",
		"parentStepStatuID",
		"ParentStepStatuID",
		"parentStepStatusID",
		"ParentStepStatusID",
		"parentStep_StatusID",
		"ParentStep_StatusID",
	]) ?? undefined;

	return {
		id: Number(r.id ?? r.Id ?? 0),
		isDependentOnPrevious: Boolean(r.isDependentOnPrevious ?? r.IsDependentOnPrevious ?? false),
		dependsOnID: pickPositiveInt(r, ["dependsOnID", "DependsOnID", "dependsOnId"]),
		dependsOn_StartDate: (r.dependsOn_StartDate ?? r.DependsOn_StartDate ?? null) as string | null,
		dependsOn_EndDate: (r.dependsOn_EndDate ?? r.DependsOn_EndDate ?? null) as string | null,
		isDependedOnByNext: Boolean(r.isDependedOnByNext ?? r.IsDependedOnByNext ?? false),
		dependedByID: pickPositiveInt(r, ["dependedByID", "DependedByID", "dependedById"]),
		dependedBy_StartDate: (r.dependedBy_StartDate ?? r.DependedBy_StartDate ?? null) as string | null,
		dependedBy_EndDate: (r.dependedBy_EndDate ?? r.DependedBy_EndDate ?? null) as string | null,
		parentStepID,
		parentStep_StartDate: String(r.parentStep_StartDate ?? r.ParentStep_StartDate ?? ""),
		parentStep_EndDate: String(r.parentStep_EndDate ?? r.ParentStep_EndDate ?? ""),
		parentStep_WorkHours: Number(r.parentStep_WorkHours ?? r.ParentStep_WorkHours ?? 0),
		...(parentStep_StatuID != null ? { parentStep_StatuID } : {}),
	};
};

export type ResolveParentStepStatusOptions = {
	planStepListTask?: TaskReview | null;
	contextTasks?: TaskReview[];
	dependsOnData?: DependsOnTaskData | null;
};

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

const buildGetOptions = () => ({
	method: "GET" as const
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

export const getTasks = async (
	projectId: number,
	fromDate: string | null,
	toDate: string | null,
    closedTasks?: boolean,
	filters?: {
		statusIds?: number[];
		priorityIds?: number[];
		projectIds?: number[];
		employeeIds?: number[];
	}
): Promise<TaskReview[]> => {
	try {
		if ((projectId ?? 0) > 0) {
			return dedupeTaskReviews(await getTasksForProject(projectId));
		}

		const user = getAuthenticatedUser();
		const query: GetTasksRequest = {
			database: user.dataBase,
			projectId: projectId ?? 0,
			employeeId: user.id,
			permissionType: user.permissionId,
			fromDate: toNullableIsoDate(fromDate),
			toDate: toNullableIsoDate(toDate),
            closedTasks,
			statusIds: filters?.statusIds,
			priorityIds: filters?.priorityIds,
			projectIds: filters?.projectIds,
			employeeIds: filters?.employeeIds
		};

		const endpoint = buildEndpoint(user.urlConnection, "/Tasks/GetAllTasks");
		const response = await authService.makeAuthenticatedRequest(
			endpoint,
			buildPostOptions(query)
		);
		
		if (!response.ok) {
			throw new Error(`Failed to fetch tasks: ${response.statusText}`);
		}

		return dedupeTaskReviews(await response.json());
	} catch (error) {
		console.error("Error fetching tasks:", error);
		throw error;
	}
};

export const getTasksForProject = async (projectId: number): Promise<TaskReview[]> => {
	try {
		const user = getAuthenticatedUser();
		const endpoint = buildEndpoint(
			user.urlConnection,
			`/Tasks/GetTasksForProject?database=${encodeURIComponent(user.dataBase)}&projectId=${projectId}`
		);
		const response = await authService.makeAuthenticatedRequest(endpoint, buildGetOptions());

		if (!response.ok) {
			throw new Error(`Failed to fetch project tasks: ${response.statusText}`);
		}

		return dedupeTaskReviews(await response.json());
	} catch (error) {
		console.error("Error fetching project tasks:", error);
		throw error;
	}
};

export const getSubContractData = async (stepId: number): Promise<SubContractData[]> => {
	try {
		const user = getAuthenticatedUser();
		const endpoint = buildEndpoint(
			user.urlConnection,
			`/Tasks/GetSubContractData?database=${encodeURIComponent(user.dataBase)}&stepId=${stepId}`
		);
		const response = await authService.makeAuthenticatedRequest(endpoint, buildGetOptions());

		if (!response.ok) {
			throw new Error(`Failed to fetch sub contract data: ${response.statusText}`);
		}

		return await response.json();
	} catch (error) {
		console.error("Error fetching sub contract data:", error);
		throw error;
	}
};

const toNullableIsoDate = (value?: string | null): string | null => {
	if (!value) return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export const getMyTasks = async (
	fromDate: string | null,
	toDate: string | null,
    closedTasks?: boolean,
	filters?: {
		statusIds?: number[];
		priorityIds?: number[];
		projectIds?: number[];
		employeeIds?: number[];
	}
): Promise<TaskReview[]> => {
	try {
		const user = getAuthenticatedUser();
		const query: GetMyTasksRequest = {
			database: user.dataBase,
			employeeId: user.id,
			fromDate: toNullableIsoDate(fromDate),
			toDate: toNullableIsoDate(toDate),
			statusIds: filters?.statusIds,
			priorityIds: filters?.priorityIds,
			projectIds: filters?.projectIds,
			employeeIds: filters?.employeeIds,
            closedTasks: closedTasks
		};

		const endpoint = buildEndpoint(user.urlConnection, "/Tasks/GetMyTasks");
		const response = await authService.makeAuthenticatedRequest(
			endpoint,
			buildPostOptions(query)
		);

		if (!response.ok) {
			throw new Error(`Failed to fetch my tasks: ${response.statusText}`);
		}

		return dedupeTaskReviews(await response.json());
	} catch (error) {
		console.error("Error fetching my tasks:", error);
		throw error;
	}
};




export const updateStatusAsync = async (
    id: number,
    statusId: number,
    isTask: boolean,
	isAllTasks: boolean,
	updateAllEmployees: boolean = false
): Promise<boolean> => {
    try {
        const user = getAuthenticatedUser();
        const query = {
            database: user.dataBase,
            id,
            statusId,
            isTask,
			employeeId:isAllTasks ? 0 : user.id,
			updateAllEmployees
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

export const getDependsOnDataByIdAsync = async (
  id: number,
  isTask: boolean
): Promise<DependsOnTaskData | DependsOnStepData | null> => {
  try {
    const user = getAuthenticatedUser();
    const baseEndpoint = buildEndpoint(
      user.urlConnection,
      isTask ? "/Tasks/DependsOnTaskData" : "/Tasks/DependsOnStepData"
    );
    const params = new URLSearchParams({
      database: user.dataBase,
      ...(isTask ? { planningTaskId: String(id) } : { planningStepId: String(id) })
    });
    const endpoint = `${baseEndpoint}?${params.toString()}`;

    const response = await authService.makeAuthenticatedRequest(
      endpoint,
      buildGetOptions()
    );

    if (!response.ok) {
      throw new Error(`Failed to load depends-on data: ${response.statusText}`);
    }

    const data = await response.json();
    if (isTask) {
      const normalized = normalizeDependsOnTaskData(data);
      return normalized ?? (data as DependsOnTaskData | null);
    }
    return data as DependsOnStepData | null;
  } catch (error) {
    console.error("Error loading depends-on data:", error);
    throw error;
  }
};

const PARENT_STEP_STATUS_CACHE_TTL_MS = 45_000;

type TimedCacheEntry<T> = { value: T; expires: number };

const planningStepStatusCache = new Map<number, TimedCacheEntry<number | null>>();
const planningStepStatusInflight = new Map<number, Promise<number | null>>();
const projectTasksCache = new Map<number, TimedCacheEntry<TaskReview[]>>();
const projectTasksInflight = new Map<number, Promise<TaskReview[]>>();
const dependsOnTaskCache = new Map<number, TimedCacheEntry<DependsOnTaskData | null>>();
const dependsOnTaskInflight = new Map<number, Promise<DependsOnTaskData | null>>();

const readTimedCache = <T>(cache: Map<number, TimedCacheEntry<T>>, key: number): T | undefined => {
	const hit = cache.get(key);
	if (!hit || hit.expires <= Date.now()) return undefined;
	return hit.value;
};

const writeTimedCache = <T>(cache: Map<number, TimedCacheEntry<T>>, key: number, value: T) => {
	cache.set(key, { value, expires: Date.now() + PARENT_STEP_STATUS_CACHE_TTL_MS });
};

const dedupeInflight = <K, V>(
	inflight: Map<K, Promise<V>>,
	key: K,
	factory: () => Promise<V>,
): Promise<V> => {
	const existing = inflight.get(key);
	if (existing) return existing;
	const promise = factory().finally(() => inflight.delete(key));
	inflight.set(key, promise);
	return promise;
};

const getPlanningStepStatusIdCached = async (stepId: number): Promise<number | null> => {
	const cached = readTimedCache(planningStepStatusCache, stepId);
	if (cached !== undefined) return cached;

	return dedupeInflight(planningStepStatusInflight, stepId, async () => {
		try {
			const step = await getPlanningStepData({ stepId });
			const statusId = step?.statusId != null && step.statusId > 0 ? step.statusId : null;
			writeTimedCache(planningStepStatusCache, stepId, statusId);
			return statusId;
		} catch (error) {
			console.error("Failed to load planning step data for status:", error);
			writeTimedCache(planningStepStatusCache, stepId, null);
			return null;
		}
	});
};

const getTasksForProjectCached = async (projectId: number): Promise<TaskReview[]> => {
	const cached = readTimedCache(projectTasksCache, projectId);
	if (cached) return cached;

	return dedupeInflight(projectTasksInflight, projectId, async () => {
		const data = await getTasksForProject(projectId);
		writeTimedCache(projectTasksCache, projectId, data);
		return data;
	});
};

const getDependsOnTaskDataCached = async (taskId: number): Promise<DependsOnTaskData | null> => {
	const cached = readTimedCache(dependsOnTaskCache, taskId);
	if (cached !== undefined) return cached;

	return dedupeInflight(dependsOnTaskInflight, taskId, async () => {
		try {
			const dep = await getDependsOnDataByIdAsync(taskId, true);
			const normalized = (dep && typeof dep === "object"
				? normalizeDependsOnTaskData(dep) ?? (dep as DependsOnTaskData)
				: null);
			writeTimedCache(dependsOnTaskCache, taskId, normalized);
			return normalized;
		} catch (error) {
			console.error("Failed to load depends-on data for parent step status:", error);
			writeTimedCache(dependsOnTaskCache, taskId, null);
			return null;
		}
	});
};

/** Resolve parent planning-step status id for a task (multi-source, cached). */
export const resolveParentStepStatusAsync = async (
	task: Pick<TaskReview, "id" | "planningStepID" | "projectId" | "isPlanningSte">,
	options: ResolveParentStepStatusOptions = {},
): Promise<number | null> => {
	if (task.isPlanningSte) return null;

	const stepKey = task.planningStepID;
	let parentStepID = options.dependsOnData?.parentStepID ?? null;
	const stepRowInContext =
		options.planStepListTask?.isPlanningSte
			? options.planStepListTask
			: findPlanStepRowInTasks(options.contextTasks ?? [], stepKey, parentStepID);

	if (options.dependsOnData?.parentStep_StatuID != null && options.dependsOnData.parentStep_StatuID > 0) {
		return options.dependsOnData.parentStep_StatuID;
	}

	const fromList =
		statusIdFromTaskRow(options.planStepListTask)
		?? statusIdFromTaskRow(stepRowInContext);
	if (fromList != null) return fromList;

	const apiStepIds = new Set<number>();
	const addApiStepId = (id?: number | null) => {
		if (id != null && id > 0) apiStepIds.add(id);
	};
	addApiStepId(stepRowInContext?.id);

	let depData = options.dependsOnData ?? null;
	if (!depData) {
		depData = await getDependsOnTaskDataCached(task.id);
		if (depData?.parentStep_StatuID != null && depData.parentStep_StatuID > 0) {
			return depData.parentStep_StatuID;
		}
		parentStepID = parentStepID ?? depData?.parentStepID ?? null;
	}
	addApiStepId(parentStepID);

	if (task.projectId > 0) {
		try {
			const projectTasks = await getTasksForProjectCached(task.projectId);
			const stepRow = findPlanStepRowInTasks(projectTasks, stepKey, parentStepID);
			addApiStepId(stepRow?.id);
			const fromProject = statusIdFromTaskRow(stepRow);
			if (fromProject != null) return fromProject;
		} catch (error) {
			console.error("Failed to load project tasks for parent step status:", error);
		}
	}

	const stepIds = [...apiStepIds];
	if (stepIds.length > 0) {
		const statuses = await Promise.all(stepIds.map(stepId => getPlanningStepStatusIdCached(stepId)));
		for (const statusId of statuses) {
			if (statusId != null && statusId > 0) return statusId;
		}
	}

	return null;
};

export const clearParentStepStatusCaches = () => {
	planningStepStatusCache.clear();
	planningStepStatusInflight.clear();
	projectTasksCache.clear();
	projectTasksInflight.clear();
	dependsOnTaskCache.clear();
	dependsOnTaskInflight.clear();
};

export const updateTaskAsync = async (
    taskUpdate: TaskUpdatePatch,
    employeeLinks: EmployeeLink[],
    isTask: boolean,
    isAllTasks:boolean
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
      employeeId:  isAllTasks?0 : user.id,
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
export const updateIsClosedAsync = async (
    id: number,
    IsClosed: boolean,
    isTask: boolean,
): Promise<boolean> => {
    try {
        const user = getAuthenticatedUser();
        const query = {
            database: user.dataBase,
            id,
            IsClosed,
            isTask,

        };

        const endpoint = buildEndpoint(user.urlConnection, "/Tasks/UpdateClosedAsync");
        const response = await authService.makeAuthenticatedRequest(
            endpoint,
            buildPostOptions(query)
        );

        if (!response.ok) {
            throw new Error(`Failed to update Closed: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Error updating Closed:", error);
        throw error;
    }
};

export const updateNameAsync = async (
    id: number,
    name: string,
    isTask: boolean,
): Promise<boolean> => {
    try {
        const user = getAuthenticatedUser();
        const query = {
            database: user.dataBase,
            id,
            name,
            isTask,

        };

        const endpoint = buildEndpoint(user.urlConnection, "/Tasks/UpdateNameAsync");
        const response = await authService.makeAuthenticatedRequest(
            endpoint,
            buildPostOptions(query)
        );

        if (!response.ok) {
            throw new Error(`Failed to update name: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Error updating name:", error);
        throw error;
    }
};
