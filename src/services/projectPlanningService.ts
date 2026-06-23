import type {
	BasicGetQuery,
	BasicQuery,
	PlanningHierarchyQuery,
	PlanningHierarchyResponse,
	PlanningStepByProjectResult,
	PlanningStepItem,
	PlanningStepQuery,
	PlanningStepSubject,
	PlanningAttachment,
	PlanningSubject,
	PlanningSystemLists,
	PlanningTemplateEmployeeLinkSeed,
	PlanningTemplateEmployeeLinksMaps,
	SubjectTemplate,
} from "../Data/projectsData";
import authService from "./authService";

interface SavePlanningEmployeeLinkRequest {
	linkId?: number | null;
	employeeId: number;
	percentage: number;
	workHours: number;
	workDays: number;
	duration: number;
	statusId?: number;
}

interface SavePlanningAttachmentRequest {
	id?: number | null;
	employeeId: number | null;
	description: string;
	fileLink: string;
	isLink: boolean;
	fileName?: string;
}

interface InsertAttachmentRequest {
	dataBase: string;
	attachment: {
		entityType: "step" | "task";
		entityId: number;
		employeeId: number | null;
		description: string;
		fileLink: string;
		isLink: boolean;
		fileName?: string;
	};
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
	attachments: SavePlanningAttachmentRequest[];
	deletedAttachmentIds: number[];
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
	attachments: SavePlanningAttachmentRequest[];
	deletedAttachmentIds: number[];
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

const buildGetOptions = () => ({
	method: "GET" as const,
});

/** DELETE with optional JSON body (see `deletePlanningSubject`). */
const buildDeleteOptionsWithJsonBody = (body: Record<string, unknown>): RequestInit => ({
	method: "DELETE" as const,
	body: JSON.stringify(body),
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
			duration: employee.duration,
			statusId: employee.statusId
		}));

const buildAttachmentPayload = (attachments: PlanningAttachment[] | undefined): {
	attachments: SavePlanningAttachmentRequest[];
	deletedAttachmentIds: number[];
} => {
	const list = attachments ?? [];
	return {
		deletedAttachmentIds: dedupeNumbers(
			list.filter((a) => a.isDeleted && a.id > 0).map((a) => a.id),
		),
		attachments: list
			.filter((a) => !a.isDeleted)
			.map((a) => ({
				id: a.id > 0 ? a.id : null,
				employeeId: a.employeeId,
				description: a.description,
				fileLink: a.fileLink,
				isLink: a.isLink,
				...(a.fileName ? { fileName: a.fileName } : {}),
			})),
	};
};

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
				.map((task) => {
					const taskAttachments = buildAttachmentPayload(task.attachments);
					return {
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
						isActive: task.isActive,
						attachments: taskAttachments.attachments,
						deletedAttachmentIds: taskAttachments.deletedAttachmentIds,
					};
				});

			const stepAttachments = buildAttachmentPayload(step.attachments);

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
				deletedTaskIds,
				attachments: stepAttachments.attachments,
				deletedAttachmentIds: stepAttachments.deletedAttachmentIds,
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

const normalizePlanningAttachmentFromApi = (
	raw: Record<string, unknown>,
	fallbackEntityType: "step" | "task",
	fallbackEntityId: number,
): PlanningAttachment => {
	const entityTypeRaw = String(raw.entityType ?? raw.EntityType ?? fallbackEntityType).toLowerCase();
	const entityType: "step" | "task" = entityTypeRaw === "step" ? "step" : "task";
	const isLinkRaw = raw.isLink ?? raw.IsLink;
	const isLink = typeof isLinkRaw === "boolean" ? isLinkRaw : false;

	return {
		id: Number(raw.id ?? raw.Id ?? 0),
		entityType,
		entityId: Number(raw.entityId ?? raw.EntityId ?? fallbackEntityId),
		employeeId:
			raw.employeeId != null && raw.employeeId !== ""
				? Number(raw.employeeId)
				: raw.EmployeeId != null && raw.EmployeeId !== ""
					? Number(raw.EmployeeId)
					: null,
		employeeName:
			raw.employeeName != null
				? String(raw.employeeName)
				: raw.EmployeeName != null
					? String(raw.EmployeeName)
					: undefined,
		description: String(raw.description ?? raw.Description ?? ""),
		fileLink: String(raw.fileLink ?? raw.FileLink ?? ""),
		isLink,
		fileName: raw.fileName != null ? String(raw.fileName) : raw.FileName != null ? String(raw.FileName) : undefined,
	};
};

const fetchPlanningAttachments = async (
	path: "step-attachments" | "task-attachments",
	id: number,
	entityType: "step" | "task",
): Promise<PlanningAttachment[]> => {
	const user = getAuthenticatedUser();
	const query: BasicGetQuery = {
		database: user.dataBase,
		id,
	};

	const endpoint = buildEndpoint(user.urlConnection, `/Plannings/${path}`);
	const response = await authService.makeAuthenticatedRequest(endpoint, buildPostOptions(query));

	if (!response.ok) {
		throw new Error(`Failed to fetch ${entityType} attachments: ${response.statusText}`);
	}

	const data: unknown = await response.json();
	if (!Array.isArray(data)) return [];

	return data
		.filter((item): item is Record<string, unknown> => item != null && typeof item === "object" && !Array.isArray(item))
		.map((item) => normalizePlanningAttachmentFromApi(item, entityType, id));
};

/** POST /Plannings/step-attachments */
export const getStepAttachmentsAsync = async (stepId: number): Promise<PlanningAttachment[]> => {
	try {
		return await fetchPlanningAttachments("step-attachments", stepId, "step");
	} catch (error) {
		console.error("Error fetching step attachments:", error);
		throw error;
	}
};

/** POST /Plannings/task-attachments */
export const getTaskAttachmentsAsync = async (taskId: number): Promise<PlanningAttachment[]> => {
	try {
		return await fetchPlanningAttachments("task-attachments", taskId, "task");
	} catch (error) {
		console.error("Error fetching task attachments:", error);
		throw error;
	}
};

const normalizePlanningStepByProjectResponse = (raw: unknown): PlanningStepByProjectResult => {
	const asRec = (v: unknown): Record<string, unknown> | null =>
		v != null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

	const asArr = (v: unknown): Record<string, unknown>[] =>
		Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => x != null && typeof x === "object" && !Array.isArray(x)) : [];

	const root = asRec(raw) ?? {};
	const rawSubjects = asArr(root.subjects ?? root.Subjects);
	const rawSteps = asArr(root.steps ?? root.Steps);

	const subjects: PlanningStepSubject[] = rawSubjects
		.map((s) => {
			const id = Number(s.id ?? s.ID ?? 0);
			const name = String(s.name ?? s.Name ?? "").trim();
			if (!Number.isFinite(id) || id <= 0) return null;
			return { id, name };
		})
		.filter((x): x is PlanningStepSubject => x != null);

	const steps: PlanningStepItem[] = rawSteps
		.map((s) => {
			const id = Number(s.id ?? s.ID ?? 0);
			const planningSubjectId = Number(s.planningSubjectId ?? s.PlanningSubjectId ?? s.PlanningSubjectID ?? 0);
			const name = String(s.name ?? s.stepName ?? s.StepName ?? s.Name ?? "").trim();
			const isPlanningStepRaw = s.isPlanningStep ?? s.IsPlanningStep;
			const isPlanningStep =
				typeof isPlanningStepRaw === "boolean" ? isPlanningStepRaw : String(isPlanningStepRaw).toLowerCase() === "true";
			if (!Number.isFinite(id) || id <= 0 || !Number.isFinite(planningSubjectId) || planningSubjectId <= 0) return null;
			return { id, planningSubjectId, name, isPlanningStep };
		})
		.filter((x): x is PlanningStepItem => x != null);

	return { subjects, steps };
};

/**
 * Loads planning subjects and steps for a project.
 * Backend route: GET /Plannings/steps-by-project?database=...&projectID=...&isClosed=...
 */
export const getPlanningStepsByProjectId = async (
	projectId: number,
	isClosed?: boolean | null,
): Promise<PlanningStepByProjectResult> => {
	try {
		const user = getAuthenticatedUser();
		const query: PlanningStepQuery = {
			database: user.dataBase,
			projectID: projectId,
			isClosed: isClosed ?? null,
		};
		const qs = new URLSearchParams({
			database: query.database,
			projectID: String(query.projectID),
			...(query.isClosed == null ? {} : { isClosed: String(query.isClosed) }),
		});
		const endpoint = buildEndpoint(user.urlConnection, `/Plannings/steps-by-project?${qs.toString()}`);
		const response = await authService.makeAuthenticatedRequest(endpoint, buildGetOptions());

		if (!response.ok) {
			const errorText = await response.text().catch(() => "");
			throw new Error(`Failed to fetch planning steps by project: ${response.statusText}${errorText ? ` ${errorText}` : ""}`);
		}

		const data: unknown = await response.json();
		return normalizePlanningStepByProjectResponse(data);
	} catch (error) {
		console.error("Error fetching planning steps by project:", error);
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

export const EMPTY_PLANNING_TEMPLATE_EMPLOYEE_LINKS: PlanningTemplateEmployeeLinksMaps = {
	stepEmployeeLinks: {},
	taskEmployeeLinks: {},
};

const asRecord = (v: unknown): Record<string, unknown> | null =>
	v != null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

const pickNum = (obj: Record<string, unknown>, keys: string[], def = 0): number => {
	for (const k of keys) {
		const v = obj[k];
		if (v == null || v === "") continue;
		const n = Number(v);
		if (Number.isFinite(n)) return n;
	}
	return def;
};

const pickStr = (obj: Record<string, unknown>, keys: string[], def = ""): string => {
	for (const k of keys) {
		const v = obj[k];
		if (v == null) continue;
		const s = String(v).trim();
		if (s) return s;
	}
	return def;
};

const asObjectArray = (v: unknown): Record<string, unknown>[] => {
	if (!Array.isArray(v)) return [];
	return v.filter((x): x is Record<string, unknown> => x != null && typeof x === "object" && !Array.isArray(x)) as Record<
		string,
		unknown
	>[];
};

const dictToRows = (
	value: unknown,
	idProp: "PlanningStepTemplateID" | "PlanningTaskTemplateID",
): Record<string, unknown>[] => {
	const dict = asRecord(value);
	if (!dict) return [];
	const rows: Record<string, unknown>[] = [];
	for (const [key, rawList] of Object.entries(dict)) {
		const templateId = Number(key);
		if (!Number.isFinite(templateId) || templateId <= 0) continue;
		const list = asObjectArray(rawList);
		for (const item of list) {
			rows.push({ ...item, [idProp]: templateId });
		}
	}
	return rows;
};

const rowToStepSeed = (row: Record<string, unknown>): { key: number; seed: PlanningTemplateEmployeeLinkSeed } | null => {
	const key = pickNum(row, ["planningStepTemplateId", "PlanningStepTemplateID", "planningStepTemplateID"], 0);
	if (!key) return null;
	const employeeId = pickNum(row, ["employeeId", "EmployeeID"]);
	const employeeName = pickStr(row, ["employeeName", "EmployeeName"], "");
	const percentage = pickNum(row, ["percentage", "Percentage"]);
	const workHours = pickNum(row, ["workHours", "WorkHours"]);
	const workDays = pickNum(row, ["workDays", "WorkDays"]);
	const duration = pickNum(row, ["taskDuration", "TaskDuration", "duration", "Duration"]);
	return {
		key,
		seed: {
			employeeId,
			employeeName: employeeName || `עובד ${employeeId}`,
			percentage,
			workHours,
			workDays,
			duration,
		},
	};
};

const rowToTaskSeed = (row: Record<string, unknown>): { key: number; seed: PlanningTemplateEmployeeLinkSeed } | null => {
	const key = pickNum(row, ["planningTaskTemplateId", "PlanningTaskTemplateID", "planningTaskTemplateID"], 0);
	if (!key) return null;
	const employeeId = pickNum(row, ["employeeId", "EmployeeID"]);
	const employeeName = pickStr(row, ["employeeName", "EmployeeName"], "");
	const percentage = pickNum(row, ["percentage", "Percentage"]);
	const workHours = pickNum(row, ["workHours", "WorkHours"]);
	const workDays = pickNum(row, ["workDays", "WorkDays"]);
	const duration = pickNum(row, ["taskDuration", "TaskDuration", "duration", "Duration"]);
	return {
		key,
		seed: {
			employeeId,
			employeeName: employeeName || `עובד ${employeeId}`,
			percentage,
			workHours,
			workDays,
			duration,
		},
	};
};

const pushGrouped = (
	map: Record<number, PlanningTemplateEmployeeLinkSeed[]>,
	key: number,
	seed: PlanningTemplateEmployeeLinkSeed,
) => {
	if (!map[key]) map[key] = [];
	map[key].push(seed);
};

const extractArraysFromPayload = (raw: unknown): { stepRows: Record<string, unknown>[]; taskRows: Record<string, unknown>[] } => {
	const root = asRecord(raw) ?? {};
	const tryKeys = (obj: Record<string, unknown>, keys: string[]): unknown => {
		for (const k of keys) {
			if (k in obj && obj[k] != null) return obj[k];
		}
		return undefined;
	};
	let stepRows = asObjectArray(
		tryKeys(root, [
			"stepEmployeeLinks",
			"StepEmployeeLinks",
			"planningStepEmployeeLinkTemplates",
			"PlanningStepEmployeeLinkTemplates",
			"stepLinks",
			"StepLinks",
		]),
	);
	if (!stepRows.length) {
		stepRows = dictToRows(
			tryKeys(root, ["stepEmployeeLinks", "StepEmployeeLinks"]),
			"PlanningStepTemplateID",
		);
	}
	let taskRows = asObjectArray(
		tryKeys(root, [
			"taskEmployeeLinks",
			"TaskEmployeeLinks",
			"planningTaskEmployeeLinkTemplates",
			"PlanningTaskEmployeeLinkTemplates",
			"taskLinks",
			"TaskLinks",
		]),
	);
	if (!taskRows.length) {
		taskRows = dictToRows(
			tryKeys(root, ["taskEmployeeLinks", "TaskEmployeeLinks"]),
			"PlanningTaskTemplateID",
		);
	}
	const data = asRecord(root.data) ?? asRecord(root.Data);
	if (data) {
		if (!stepRows.length)
			stepRows = asObjectArray(
				tryKeys(data, [
					"stepEmployeeLinks",
					"StepEmployeeLinks",
					"planningStepEmployeeLinkTemplates",
					"PlanningStepEmployeeLinkTemplates",
					"stepLinks",
					"StepLinks",
				]),
			);
		if (!stepRows.length) {
			stepRows = dictToRows(
				tryKeys(data, ["stepEmployeeLinks", "StepEmployeeLinks"]),
				"PlanningStepTemplateID",
			);
		}
		if (!taskRows.length)
			taskRows = asObjectArray(
				tryKeys(data, [
					"taskEmployeeLinks",
					"TaskEmployeeLinks",
					"planningTaskEmployeeLinkTemplates",
					"PlanningTaskEmployeeLinkTemplates",
					"taskLinks",
					"TaskLinks",
				]),
			);
		if (!taskRows.length) {
			taskRows = dictToRows(
				tryKeys(data, ["taskEmployeeLinks", "TaskEmployeeLinks"]),
				"PlanningTaskTemplateID",
			);
		}
	}
	return { stepRows, taskRows };
};

const normalizePlanningTemplateEmployeeLinksResponse = (raw: unknown): PlanningTemplateEmployeeLinksMaps => {
	const out: PlanningTemplateEmployeeLinksMaps = { stepEmployeeLinks: {}, taskEmployeeLinks: {} };
	const { stepRows, taskRows } = extractArraysFromPayload(raw);
	for (const row of stepRows) {
		const parsed = rowToStepSeed(row);
		if (parsed) pushGrouped(out.stepEmployeeLinks, parsed.key, parsed.seed);
	}
	for (const row of taskRows) {
		const parsed = rowToTaskSeed(row);
		if (parsed) pushGrouped(out.taskEmployeeLinks, parsed.key, parsed.seed);
	}
	return out;
};

/**
 * Loads employee rows from PlanningStepEmployeesLinkTemplates / PlanningTaskEmployeesLinkTemplates
 * for the given template step/task IDs. Backend route: POST /Plannings/GetPlanningTemplateEmployeeLinks
 * Body: { database, planningStepTemplateIds, planningTaskTemplateIds }
 */
export const getPlanningTemplateEmployeeLinks = async (
	planningStepTemplateIds: number[],
	planningTaskTemplateIds: number[],
): Promise<PlanningTemplateEmployeeLinksMaps> => {
	const user = getAuthenticatedUser();
	const body = {
		database: user.dataBase,
		planningStepTemplateIds: dedupeNumbers(planningStepTemplateIds),
		planningTaskTemplateIds: dedupeNumbers(planningTaskTemplateIds),
	};
	const endpoint = buildEndpoint(user.urlConnection, "/Plannings/GetPlanningTemplateEmployeeLinks");
	const response = await authService.makeAuthenticatedRequest(endpoint, buildPostOptions(body));
	if (!response.ok) {
		const errorText = await response.text().catch(() => "");
		throw new Error(`GetPlanningTemplateEmployeeLinks failed: ${response.status} ${errorText}`);
	}
	const raw: unknown = await response.json();
	return normalizePlanningTemplateEmployeeLinksResponse(raw);
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

/**
 * Deletes one planning subject (`DELETE /Plannings/subject`).
 *
 * Sends `DeleteQuery` as JSON in the body. With `[ApiController]`, ASP.NET Core infers complex
 * action parameters from the body by default — a query-only DELETE often leaves `DeleteQuery` empty (Id=0)
 * so the handler returns NotFound().
 *
 * If your action explicitly uses `[FromQuery] DeleteQuery query`, bind from query instead (do not rely on body).
 */
export const deletePlanningSubject = async (
	subjectId: number
): Promise<boolean> => {
	try {
		const user = getAuthenticatedUser();
		if (!Number.isFinite(subjectId) || subjectId <= 0) {
			throw new Error("Invalid planning subject id for delete");
		}

		const endpoint = buildEndpoint(user.urlConnection, "/Plannings/subject");
		const response = await authService.makeAuthenticatedRequest(
			endpoint,
			buildDeleteOptionsWithJsonBody({
				database: user.dataBase,
				id: subjectId,
			}),
		);

		if (response.status === 404) {
			return false;
		}
		if (!response.ok) {
			const errorText = await response.text().catch(() => "");
			throw new Error(
				`Failed to delete planning subject: ${response.statusText}${errorText ? ` — ${errorText}` : ""}`.trim(),
			);
		}
		return true;
	} catch (error) {
		console.error("Error deleting planning subject:", error);
		throw error;
	}
};

/** POST /Plannings/insert-attachment */
export const insertPlanningAttachmentAsync = async (
	entityType: "step" | "task",
	entityId: number,
	attachment: Pick<PlanningAttachment, "employeeId" | "description" | "fileLink" | "isLink" | "fileName">,
): Promise<number> => {
	const user = getAuthenticatedUser();
	const requestBody: InsertAttachmentRequest = {
		dataBase: user.dataBase,
		attachment: {
			entityType,
			entityId,
			employeeId: attachment.employeeId,
			description: attachment.description,
			fileLink: attachment.fileLink,
			isLink: attachment.isLink,
			...(attachment.fileName ? { fileName: attachment.fileName } : {}),
		},
	};

	const endpoint = buildEndpoint(user.urlConnection, "/Plannings/insert-attachment");
	const response = await authService.makeAuthenticatedRequest(endpoint, buildPostOptions(requestBody));

	if (!response.ok) {
		const errorText = await response.text().catch(() => "");
		throw new Error(
			`Failed to insert planning attachment: ${response.statusText}${errorText ? ` — ${errorText}` : ""}`.trim(),
		);
	}

	const newId = await response.json();
	return Number(newId);
};

const saveEntityAttachmentsViaHierarchyAsync = async (
	projectId: number,
	entityType: "step" | "task",
	entityId: number,
	attachments: PlanningAttachment[],
): Promise<void> => {
	const data = await getPlanningHierarchy(projectId);
	const subjects = data.subjects ?? [];
	let subjectToSave: PlanningSubject | null = null;

	for (const subject of subjects) {
		let subjectModified = false;
		const steps = subject.steps.map((step) => {
			if (entityType === "step" && step.id === entityId) {
				subjectModified = true;
				return { ...step, attachments, isModified: true };
			}
			let taskModified = false;
			const tasks = step.tasks.map((task) => {
				if (entityType === "task" && task.id === entityId) {
					taskModified = true;
					subjectModified = true;
					return { ...task, attachments, isModified: true };
				}
				return task;
			});
			if (taskModified) return { ...step, tasks };
			return step;
		});
		if (subjectModified) {
			subjectToSave = { ...subject, steps };
			break;
		}
	}

	if (!subjectToSave) {
		throw new Error("Entity not found in planning hierarchy");
	}

	await savePlanningHierarchy([subjectToSave], projectId);
};

/**
 * Persists attachment changes for a planning step or task.
 * New rows use POST /Plannings/insert-attachment; updates and deletes still use SavePlanningSubject.
 */
export const saveEntityAttachmentsAsync = async (
	projectId: number,
	entityType: "step" | "task",
	entityId: number,
	attachments: PlanningAttachment[],
): Promise<void> => {
	const pendingInserts = attachments.filter((a) => !a.isDeleted && (a.isNew || a.id <= 0));
	const needsHierarchySave = attachments.some(
		(a) => (a.isDeleted && a.id > 0) || (a.isModified && a.id > 0),
	);

	for (const attachment of pendingInserts) {
		await insertPlanningAttachmentAsync(entityType, entityId, {
			employeeId: getAuthenticatedUser().id,
			description: attachment.description,
			fileLink: attachment.fileLink,
			isLink: attachment.isLink,
			fileName: attachment.fileName,
		});
	}

	if (!needsHierarchySave) return;

	// Exclude rows already inserted so SavePlanningSubject does not insert duplicates.
	const attachmentsForHierarchy = attachments.filter((a) => !(a.isNew || a.id <= 0));
	await saveEntityAttachmentsViaHierarchyAsync(projectId, entityType, entityId, attachmentsForHierarchy);
};

export const savePlanningHierarchy = async (subjects: PlanningSubject[],projectId:number): Promise<unknown> => {
	try {
		const user = getAuthenticatedUser();
		const requestBody = {
			database: user.dataBase,
			employeeID: user.id,
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
