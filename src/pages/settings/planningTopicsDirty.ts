import type {
	PlanningSubjectTemplate,
	PlanningStepTemplate,
	PlanningTaskTemplate,
} from '../../Data/PlanningTemplates';

const linkChanged = (item: { isNew?: boolean; isModified?: boolean; isDeleted?: boolean }) =>
	Boolean(item.isNew || item.isModified || item.isDeleted);

const taskChanged = (t: PlanningTaskTemplate) =>
	linkChanged(t) || t.employees.some(linkChanged);

const stageChanged = (st: PlanningStepTemplate) =>
	linkChanged(st) || st.employees.some(linkChanged) || st.tasks.some(taskChanged);

/** True when any subject / stage / task / employee link was added, edited, or marked deleted */
export const hasPlanningTemplatesChanges = (subjects: PlanningSubjectTemplate[]): boolean =>
	subjects.some(
		(s) => linkChanged(s) || s.stages.some(stageChanged)
	);
