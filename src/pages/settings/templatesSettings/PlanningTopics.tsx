import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight, Users, Copy } from 'lucide-react';
import LinkEmployeesToStageModal from '../../shared/LinkEmployeesToStageModal';
import type { EmployeeLink, PlanningStepEmployeeLinkTemplate, PlanningStepTemplate, PlanningSubjectTemplate, PlanningTaskEmployeeLinkTemplate, PlanningTaskTemplate } from '../../../Data/PlanningTemplates';
import { deletePlanningSubjectTemplate, getPlanningTemplates, PlanningTemplates } from '../../../services/templatesSettingServices';
import { hasPlanningTemplatesChanges } from '../planningTopicsDirty';
import { getNumberOfHours } from '../../../services/settingService';
import MessageBox from '../../shared/MessageBox';
import NumberInput from '../../shared/NumberInput';
import { BRIGHT_SURFACE } from '../../tasks/taskViewTheme';
import { SETTINGS_FIELD } from '../settingsTheme';

const DEFAULT_WORK_HOURS_PER_DAY = 8.00;

/** Transparent 1×1 image — hides the browser drag ghost outside the drop zone */
const EMPTY_DRAG_IMAGE = (() => {
  const img = new Image();
  img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  return img;
})();

const taskStageKey = (subjectId: number, stageId: number) => `${subjectId}-${stageId}`;
const stageSubjectKey = (subjectId: number) => String(subjectId);

const byOrderNum = <T extends { orderNum?: number; id?: number }>(a: T, b: T): number => {
  const ao = a.orderNum ?? Number.MAX_SAFE_INTEGER;
  const bo = b.orderNum ?? Number.MAX_SAFE_INTEGER;
  if (ao !== bo) return ao - bo;
  return (a.id ?? 0) - (b.id ?? 0);
};

const round2 = (n: number) => parseFloat(Number(n).toFixed(2));

/** Scale task employee links to the new task hour budget (never above task; total capped proportionally). */
function rescaleTaskEmployeesToTaskBudget(
  employees: PlanningTaskEmployeeLinkTemplate[],
  newTaskHours: number,
  oldTaskHours: number,
  hoursPerDay: number,
): PlanningTaskEmployeeLinkTemplate[] {
  // We intentionally rescale from `percentage` to match the user expectation:
  // employee workHours/workDays must follow their percentage of the task budget.
  void oldTaskHours; // kept for backward compatibility with existing callers

  const nextRaw = employees.map(e => {
    if (e.isDeleted) return e;
    const nh = round2(Math.max(0, (newTaskHours * (e.percentage ?? 0)) / 100));
    return {
      ...e,
      workHours: nh,
      workDays: round2(nh / hoursPerDay),
      isModified: !e.isNew,
    };
  });

  const sumActive = nextRaw.filter(e => !e.isDeleted).reduce((a, e) => a + e.workHours, 0);
  if (sumActive > newTaskHours && sumActive > 0) {
    const k = newTaskHours / sumActive;
    return nextRaw.map(e => {
      if (e.isDeleted) return e;
      const nh = round2(Math.max(0, e.workHours * k));
      return { ...e, workHours: nh, workDays: round2(nh / hoursPerDay), isModified: !e.isNew };
    });
  }

  return nextRaw;
}

function rescaleStageEmployeesToStageBudget(
  employees: PlanningStepEmployeeLinkTemplate[],
  newStageHours: number,
  hoursPerDay: number,
): PlanningStepEmployeeLinkTemplate[] {
  const nextRaw = employees.map(e => {
    if (e.isDeleted) return e;
    const nh = round2(Math.max(0, (newStageHours * (e.percentage ?? 0)) / 100));
    return {
      ...e,
      workHours: nh,
      workDays: round2(nh / hoursPerDay),
      isModified: !e.isNew,
    };
  });

  const sumActive = nextRaw.filter(e => !e.isDeleted).reduce((a, e) => a + e.workHours, 0);
  if (sumActive > newStageHours && sumActive > 0) {
    const k = newStageHours / sumActive;
    return nextRaw.map(e => {
      if (e.isDeleted) return e;
      const nh = round2(Math.max(0, e.workHours * k));
      return { ...e, workHours: nh, workDays: round2(nh / hoursPerDay), isModified: !e.isNew };
    });
  }

  return nextRaw;
}

/**
 * After step work hours change: each non-deleted task gets
 * `stepWorkHours × (taskPercentage / 100)` — percentages are not modified.
 * If every task has 0%, hours are split evenly across tasks.
 * Task employees: same `percentage` field; `workHours` / `workDays` scale to the new task budget.
 */
function applyStepWorkBudgetToTasks(
  st: PlanningStepTemplate,
  newStepHoursRaw: number,
  hoursPerDay: number,
): PlanningStepTemplate {
  const newStepH = round2(Math.max(0, newStepHoursRaw));
  const newStepD = round2(newStepH / hoursPerDay);

  const visible = st.tasks.filter(t => !t.isDeleted);
  if (visible.length === 0) {
    return { ...st, workHours: newStepH, workDays: newStepD, isModified: !st.isNew };
  }

  const allocations = new Map<number, number>();
  const anyTaskPct = visible.some(t => t.taskPercentage > 0);

  if (anyTaskPct) {
    visible.forEach(t => {
      allocations.set(t.id, round2((newStepH * t.taskPercentage) / 100));
    });
  } else {
    let consumed = 0;
    const each = visible.length > 0 ? round2(newStepH / visible.length) : 0;
    visible.forEach((t, i) => {
      if (i === visible.length - 1) {
        allocations.set(t.id, round2(Math.max(0, newStepH - consumed)));
      } else {
        allocations.set(t.id, each);
        consumed = round2(consumed + each);
      }
    });
  }

  const tasks = st.tasks.map(t => {
    if (t.isDeleted || !allocations.has(t.id)) return t;
    const nh = allocations.get(t.id)!;
    const nd = round2(nh / hoursPerDay);
    const emps = rescaleTaskEmployeesToTaskBudget(t.employees, nh, t.workHours, hoursPerDay);
    return {
      ...t,
      workHours: nh,
      workDays: nd,
      employees: emps,
      isModified: !t.isNew,
    };
  });

  return {
    ...st,
    workHours: newStepH,
    workDays: newStepD,
    employees: rescaleStageEmployeesToStageBudget(st.employees, newStepH, hoursPerDay),
    tasks,
    isModified: !st.isNew,
  };
}

type ExpandSnapshot = {
  subjectExpandedIds: Set<number>;
  subjectExpandedNames: Set<string>;
  stageExpandedKeys: Set<string>;
};

const captureExpandSnapshot = (list: PlanningSubjectTemplate[]): ExpandSnapshot => {
  const subjectExpandedIds = new Set<number>();
  const subjectExpandedNames = new Set<string>();
  const stageExpandedKeys = new Set<string>();

  for (const s of list) {
    if (s.isExpanded) {
      if (s.id > 0) subjectExpandedIds.add(s.id);
      else subjectExpandedNames.add(s.name.trim());
    }
    for (const st of s.stages) {
      if (!st.isExpanded) continue;
      if (st.id > 0) stageExpandedKeys.add(`${s.id}:${st.id}`);
      else if (s.id > 0) stageExpandedKeys.add(`${s.id}:o:${st.orderNum ?? 0}`);
      else stageExpandedKeys.add(`n:${s.name.trim()}:o:${st.orderNum ?? 0}`);
    }
  }

  return { subjectExpandedIds, subjectExpandedNames, stageExpandedKeys };
};

const resolveSubjectExpanded = (subject: PlanningSubjectTemplate, snap: ExpandSnapshot): boolean =>
  snap.subjectExpandedIds.has(subject.id) ||
  snap.subjectExpandedNames.has(subject.name.trim());

const resolveStageExpanded = (
  subject: PlanningSubjectTemplate,
  stage: PlanningStepTemplate,
  snap: ExpandSnapshot,
): boolean =>
  snap.stageExpandedKeys.has(`${subject.id}:${stage.id}`) ||
  snap.stageExpandedKeys.has(`${subject.id}:o:${stage.orderNum ?? 0}`) ||
  snap.stageExpandedKeys.has(`n:${subject.name.trim()}:o:${stage.orderNum ?? 0}`);

const mapLoadedSubjects = (
  data: PlanningSubjectTemplate[],
  expandSnap?: ExpandSnapshot,
): PlanningSubjectTemplate[] =>
  data.map((subject) => ({
    ...subject,
    isExpanded: expandSnap ? resolveSubjectExpanded(subject, expandSnap) : false,
    stages: [...subject.stages]
      .sort(byOrderNum)
      .map((stage) => ({
        ...stage,
        isExpanded: expandSnap ? resolveStageExpanded(subject, stage, expandSnap) : false,
        tasks: [...stage.tasks].sort(byOrderNum),
      })),
  }));

export interface PlanningTopicsRef {
  save: () => Promise<void>;
  hasUnsavedChanges: () => boolean;
  reload: () => Promise<void>;
}

const PlanningTopics = forwardRef<PlanningTopicsRef>((_props, ref) => {
  // ─── State ─────────────────────────────────────────────────────────────────
  const [subjects, setSubjects] = useState<PlanningSubjectTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [WORK_HOURS_PER_DAY, setWORK_HOURS_PER_DAY] = useState<number>(DEFAULT_WORK_HOURS_PER_DAY);
  const [draggingTask, setDraggingTask] = useState<{
    subjectId: number;
    stageId: number;
    taskId: number;
  } | null>(null);
  /** Stage task list currently under the pointer while dragging (null = outside → no drag styling) */
  const [taskDragZoneKey, setTaskDragZoneKey] = useState<string | null>(null);
  const [draggingStage, setDraggingStage] = useState<{
    subjectId: number;
    stageId: number;
  } | null>(null);
  /** Subject stages list currently under the pointer while dragging (null = outside → no drag styling) */
  const [stageDragZoneKey, setStageDragZoneKey] = useState<string | null>(null);
  const [messageBox, setMessageBox] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'alert' | 'success' | 'error' | 'warning';
    confirmText?: string;
    cancelText?: string;
    showCancel?: boolean;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({ isOpen: false, title: '', message: '', type: 'alert' });

  const closeMessageBox = () => {
    setMessageBox(prev => ({
      ...prev,
      isOpen: false,
      showCancel: false,
      onConfirm: undefined,
      onCancel: undefined
    }));
  };

  const openConfirm = (message: string, title: string = 'אישור'): Promise<boolean> =>
    new Promise(resolve => {
      setMessageBox({
        isOpen: true,
        title,
        message,
        type: 'warning',
        showCancel: true,
        confirmText: 'אישור',
        cancelText: 'ביטול',
        onConfirm: () => { resolve(true); closeMessageBox(); },
        onCancel:  () => { resolve(false); closeMessageBox(); }
      });
    });

  const [modalState, setModalState] = useState<{
    open: boolean;
    type: 'stage' | 'task';
    subjectId: number;
    stageId: number;
    taskId?: number;
  } | null>(null);

  // ─── Data Loading ──────────────────────────────────────────────────────────
  const loadPlanningTemplates = async (preserveExpand?: ExpandSnapshot) => {
    try {
      if (!preserveExpand) setIsLoading(true);
      const data = await getPlanningTemplates();
      setSubjects(mapLoadedSubjects(data, preserveExpand));
    } catch (error) {
      console.error('Failed to load planning templates:', error);
      setMessageBox({ isOpen: true, title: 'שגיאה', message: 'שגיאה בטעינת תבניות תכנון', type: 'error' });
    } finally {
      if (!preserveExpand) setIsLoading(false);
    }
  };

  useEffect(() => { void loadPlanningTemplates(); }, []);

  useEffect(() => {
    const loadHours = async () => {
      try {
        const n = await getNumberOfHours();
        if (n != null && Number.isFinite(n) && n > 0) {
          setWORK_HOURS_PER_DAY(n);
        }
      } catch {
        // Keep default on failure.
      }
    };
    void loadHours();
  }, []);

  // ─── Save Function ─────────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    save: async () => {
      try {
        const expandSnap = captureExpandSnapshot(subjects);
        await PlanningTemplates(subjects);
        await loadPlanningTemplates(expandSnap);
      } catch (error) {
        console.error('Failed to save planning templates:', error);
        throw error;
      }
    },
    hasUnsavedChanges: () => hasPlanningTemplatesChanges(subjects),
    reload: () => loadPlanningTemplates(),
  }));

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const getStage = (subjectId: number, stageId: number) =>
    subjects.find((s: PlanningSubjectTemplate) => s.id === subjectId)?.stages.find((st: PlanningStepTemplate) => st.id === stageId);

  const getTask = (subjectId: number, stageId: number, taskId: number) =>
    getStage(subjectId, stageId)?.tasks.find((t: PlanningTaskTemplate) => t.id === taskId);

  const employeeCountForStage = (stage: PlanningStepTemplate): number => {
    const stageEmployeeIds = new Set(stage.employees.filter(e => !e.isDeleted).map(e => e.employeeId));
    const taskEmployeeIds = new Set(
      stage.tasks.flatMap(t => t.employees.filter(e => !e.isDeleted).map(e => e.employeeId))
    );
    return new Set([...stageEmployeeIds, ...taskEmployeeIds]).size;
  };

  // ─── Subject actions ───────────────────────────────────────────────────────
  const toggleSubject = (id: number) =>
    setSubjects(prev => prev.map(s => s.id === id ? { ...s, isExpanded: !s.isExpanded } : s));

  const updateSubjectName = (id: number, name: string) =>
    setSubjects(prev => prev.map(s => s.id === id ? { ...s, name, isModified: !s.isNew } : s));

  const addSubject = () => {
    const newSubject: PlanningSubjectTemplate = {
      id: -Date.now(),
      name: `נושא תכנון ${subjects.length + 1}`,
      isActive: true,
      isExpanded: true,
      isNew: true,
      stages: [],
    };
    setSubjects(prev => [...prev, newSubject]);
  };

  const duplicateSubject = (id: number) => {
    const src = subjects.find(s => s.id === id);
    if (!src) return;
    const now = Date.now();
    const copy: PlanningSubjectTemplate = {
      ...src,
      id: now,
      name: `${src.name} (משוכפל)`,
      isNew: true,
      isModified: undefined,
      isDeleted: undefined,
      stages: src.stages.map((st: PlanningStepTemplate, si: number) => ({
        ...st,
        id: 0,
        planningSubjectTemplateId: now,
        isNew: true,
        isModified: undefined,
        isDeleted: undefined,
        employees: st.employees.map(e => ({ ...e, isNew: true, isModified: undefined, isDeleted: undefined })),
        tasks: st.tasks.map((t: PlanningTaskTemplate, ti: number) => ({
          ...t,
          id: now + si * 100 + ti + 200,
          planningStepTemplateId: now + si + 1,
          isNew: true,
          isModified: undefined,
          isDeleted: undefined,
          employees: t.employees.map(e => ({ ...e, isNew: true, isModified: undefined, isDeleted: undefined })),
        })),
      })),
    };
    setSubjects(prev => [...prev, copy]);
  };

  const deleteSubject = async (id: number) => {
    const confirmed = await openConfirm('האם אתה בטוח שברצונך למחוק נושא תכנון זה?');
    if (!confirmed) return;
    const subject = subjects.find(s => s.id === id);
    if (subject && !subject.isNew && subject.id > 0) {
      try {
        await deletePlanningSubjectTemplate(subject.id);
        setSubjects(prev => prev.filter(s => s.id !== id));
      } catch {
        setMessageBox({ isOpen: true, title: 'שגיאה', message: 'שגיאה במחיקת נושא התכנון מהשרת', type: 'error' });
      }
      return;
    }
    setSubjects(prev => prev.map(s =>
      s.id === id ? (s.isNew ? s : { ...s, isDeleted: true }) : s
    ).filter(s => !(s.isNew && s.isDeleted)));
  };

  // ─── Stage actions ─────────────────────────────────────────────────────────
  const toggleStage = (subjectId: number, stageId: number) =>
    setSubjects(prev => prev.map(s =>
      s.id !== subjectId ? s : {
        ...s,
        stages: s.stages.map((st: PlanningStepTemplate) =>
          st.id === stageId ? { ...st, isExpanded: !st.isExpanded } : st
        )
      }
    ));

  const addStage = async (subjectId: number) => {
    setSubjects(prev => prev.map(s =>
      s.id !== subjectId ? s : {
        ...s,
        isModified: !s.isNew,
        stages: [
          ...s.stages,
          {
            id: -Date.now(),
            planningSubjectTemplateId: subjectId,
            stepName: `שלב ${s.stages.length + 1}`,
            stepPercentage: 0,
            workHours: 0,
            workDays: 0,
            stepDuration: 1,
            isActive: true,
            orderNum: s.stages.length + 1,
            dependsOnStepId: null,
            isExpanded: false,
            isNew: true,
            tasks: [],
            employees: [],
          }
        ]
      }
    ));
  };

  const updateStage = (subjectId: number, stageId: number, field: string, value: any) => {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return;

    setSubjects(prev => prev.map(s =>
      s.id !== subjectId ? s : {
        ...s,
        stages: s.stages.map((st: PlanningStepTemplate) => {
          if (st.id !== stageId) return st;
          if (field === 'workHours') {
            const h = Math.max(0, Number(value) || 0);
            return applyStepWorkBudgetToTasks(st, h, WORK_HOURS_PER_DAY);
          }
          if (field === 'workDays') {
            const d = Math.max(0, Number(value) || 0);
            const h = d * WORK_HOURS_PER_DAY;
            return applyStepWorkBudgetToTasks(st, h, WORK_HOURS_PER_DAY);
          }
          if (field === 'stepDuration') {
            const newDuration = Math.max(0, Math.floor(Number(value)));
            return { ...st, stepDuration: newDuration, isModified: !st.isNew };
          }
          if (field === 'stepPercentage') {
            const newPct = Math.max(0, Math.min(100, Number(value)));
            const otherSum = subject.stages
              .filter((x: PlanningStepTemplate) => x.id !== stageId)
              .reduce((acc: number, x: PlanningStepTemplate) => acc + x.stepPercentage, 0);
            if (otherSum + newPct > 100) {
              setMessageBox({
                isOpen: true, title: 'אזהרה',
                message: `סה"כ אחוזים לא יכול לעבור 100%. כרגע: ${(otherSum + newPct).toFixed(1)}%`,
                type: 'warning'
              });
              return st;
            }
            return { ...st, stepPercentage: newPct, isModified: !st.isNew };
          }
          if (field === 'dependsOnStepId') {
            return { ...st, dependsOnStepId: value, isModified: !st.isNew };
          }
          return { ...st, [field]: value, isModified: !st.isNew };
        })
      }
    ));
  };

  const deleteStage = async (subjectId: number, stageId: number) => {
    const confirmed = await openConfirm('האם אתה בטוח שברצונך למחוק שלב זה?');
    if (!confirmed) return;
    setSubjects(prev => prev.map(s =>
      s.id !== subjectId ? s : {
        ...s,
        isModified: !s.isNew,
        stages: s.stages.map(st =>
          st.id === stageId ? (st.isNew ? st : { ...st, isDeleted: true }) : st
        ).filter(st => !(st.isNew && st.isDeleted))
      }
    ));
  };

  const capTaskDurations = (subjectId: number, stageId: number) => {
    setSubjects(prev => prev.map(s =>
      s.id !== subjectId ? s : {
        ...s,
        stages: s.stages.map((st: PlanningStepTemplate) =>
          st.id !== stageId ? st : {
            ...st,
            tasks: st.tasks.map((t: PlanningTaskTemplate) =>
              t.taskDuration > st.stepDuration ? { ...t, taskDuration: st.stepDuration } : t
            )
          }
        )
      }
    ));
  };

  // ─── Task actions ──────────────────────────────────────────────────────────
  const addTask = async (subjectId: number, stageId: number) => {
    setSubjects(prev => prev.map(s =>
      s.id !== subjectId ? s : {
        ...s,
        isModified: !s.isNew,
        stages: s.stages.map((st: PlanningStepTemplate) =>
          st.id !== stageId ? st : {
            ...st,
            isModified: !st.isNew,
            tasks: [
              ...st.tasks,
              {
                id: -Date.now(),
                planningStepTemplateId: stageId,
                taskName: `משימה ${st.tasks.length + 1}`,
                taskPercentage: 0,
                workHours: 0,
                workDays: 0,
                taskDuration: st.stepDuration,
                isActive: true,
                orderNum: st.tasks.length + 1,
                dependsOnTaskId: null,
                isNew: true,
                employees: [],
              }
            ]
          }
        )
      }
    ));
  };

  const getOtherTaskWorkHoursTotal = (stage: PlanningStepTemplate, taskId: number) =>
    stage.tasks.filter((t: PlanningTaskTemplate) => t.id !== taskId).reduce((sum, t) => sum + t.workHours, 0);

  const getOtherTaskPercentageTotal = (stage: PlanningStepTemplate, taskId: number) =>
    stage.tasks.filter((t: PlanningTaskTemplate) => t.id !== taskId).reduce((sum, t) => sum + t.taskPercentage, 0);

  const resolveStageHoursUpdate = async (
    stage: PlanningStepTemplate, taskId: number, nextTaskHours: number
  ): Promise<{ shouldAbort: boolean; updatedStageHours: number | null }> => {
    const otherTotal = getOtherTaskWorkHoursTotal(stage, taskId);
    const total = otherTotal + nextTaskHours;
    if (total <= stage.workHours) return { shouldAbort: false, updatedStageHours: null };
    const yes = await openConfirm(
      `סה"כ השעות במשימות (${total.toFixed(2)}) גדול משעות השלב (${stage.workHours.toFixed(2)}).\n\nהאם לעדכן את שעות השלב?`
    );
    if (!yes) return { shouldAbort: true, updatedStageHours: null };
    return { shouldAbort: false, updatedStageHours: total };
  };

  const updateTask = async (subjectId: number, stageId: number, taskId: number, field: string, value: any) => {
    const stage = getStage(subjectId, stageId);
    if (!stage) return;

    let updatedStageHours: number | null = null;
    let nextTaskWorkHours: number | null = null;
    let nextTaskWorkDays:  number | null = null;
    let nextTaskPercentage: number | null = null;
    let nextTaskDuration:  number | null = null;

    switch (field) {
      case 'workHours': {
        const nextHours = Math.max(0, Number(value));
        const r = await resolveStageHoursUpdate(stage, taskId, nextHours);
        if (r.shouldAbort) return;
        updatedStageHours = r.updatedStageHours;
        nextTaskWorkHours = nextHours;
        nextTaskWorkDays  = nextHours / WORK_HOURS_PER_DAY;
        break;
      }
      case 'workDays': {
        const nextDays  = Math.max(0, Number(value));
        const nextHours = nextDays * WORK_HOURS_PER_DAY;
        const r = await resolveStageHoursUpdate(stage, taskId, nextHours);
        if (r.shouldAbort) return;
        updatedStageHours = r.updatedStageHours;
        nextTaskWorkHours = nextHours;
        nextTaskWorkDays  = nextDays;
        break;
      }
      case 'taskWorkHours': {
        const nextHours = Math.max(0, Number(value));
        const r = await resolveStageHoursUpdate(stage, taskId, nextHours);
        if (r.shouldAbort) return;
        updatedStageHours  = r.updatedStageHours;
        nextTaskWorkHours  = nextHours;
        nextTaskWorkDays   = nextHours / WORK_HOURS_PER_DAY;
        nextTaskPercentage = stage.workHours > 0 ? (nextHours / stage.workHours) * 100 : 0;
        break;
      }
      case 'taskWorkDays': {
        const nextDays  = Math.max(0, Number(value));
        const nextHours = nextDays * WORK_HOURS_PER_DAY;
        const r = await resolveStageHoursUpdate(stage, taskId, nextHours);
        if (r.shouldAbort) return;
        updatedStageHours  = r.updatedStageHours;
        nextTaskWorkHours  = nextHours;
        nextTaskWorkDays   = nextDays;
        nextTaskPercentage = stage.workHours > 0 ? (nextHours / stage.workHours) * 100 : 0;
        break;
      }
      case 'taskPercentage': {
        const newPct    = Math.max(0, Math.min(100, Number(value)));
        const otherSum  = getOtherTaskPercentageTotal(stage, taskId);
        if (otherSum + newPct > 100) {
          setMessageBox({ isOpen: true, title: 'אזהרה', message: `סה"כ אחוזים לא יכול לעבור 100%. כרגע: ${(otherSum + newPct).toFixed(1)}%`, type: 'warning' });
          return;
        }
        nextTaskPercentage = newPct;
        nextTaskWorkHours  = (stage.workHours * newPct) / 100;
        nextTaskWorkDays   = nextTaskWorkHours / WORK_HOURS_PER_DAY;
        break;
      }
      case 'taskDuration': {
        nextTaskDuration = Math.max(0, Math.floor(Number(value)));
        if (nextTaskDuration > stage.stepDuration) {
          setMessageBox({ isOpen: true, title: 'אזהרה', message: `משך זמן המשימה (${nextTaskDuration}) לא יכול לעבור את משך זמן השלב (${stage.stepDuration}).`, type: 'warning' });
          return;
        }
        break;
      }
      default: break;
    }

    setSubjects(prev => prev.map(s =>
      s.id !== subjectId ? s : {
        ...s,
        stages: s.stages.map((st: PlanningStepTemplate) =>
          st.id !== stageId ? st : {
            ...st,
            ...(updatedStageHours !== null
              ? {
                  workHours: updatedStageHours,
                  workDays: updatedStageHours / WORK_HOURS_PER_DAY,
                  employees: rescaleStageEmployeesToStageBudget(st.employees, updatedStageHours, WORK_HOURS_PER_DAY),
                }
              : {}),
            tasks: st.tasks.map((t: PlanningTaskTemplate) => {
              if (t.id !== taskId) return t;
              switch (field) {
                case 'workHours': {
                  const nh = nextTaskWorkHours ?? t.workHours;
                  const nd = nextTaskWorkDays ?? t.workDays;
                  const emps = rescaleTaskEmployeesToTaskBudget(t.employees, nh, t.workHours, WORK_HOURS_PER_DAY);
                  return { ...t, workHours: nh, workDays: nd, employees: emps, isModified: !t.isNew };
                }
                case 'workDays': {
                  const nd = nextTaskWorkDays ?? t.workDays;
                  const nh = nextTaskWorkHours ?? t.workHours;
                  const emps = rescaleTaskEmployeesToTaskBudget(t.employees, nh, t.workHours, WORK_HOURS_PER_DAY);
                  return { ...t, workDays: nd, workHours: nh, employees: emps, isModified: !t.isNew };
                }
                case 'taskWorkHours':
                case 'taskWorkDays': {
                  const nh = nextTaskWorkHours ?? t.workHours;
                  const nd = nextTaskWorkDays ?? t.workDays;
                  const emps = rescaleTaskEmployeesToTaskBudget(t.employees, nh, t.workHours, WORK_HOURS_PER_DAY);
                  return { ...t, workHours: nh, workDays: nd, taskPercentage: nextTaskPercentage ?? t.taskPercentage, employees: emps, isModified: !t.isNew };
                }
                case 'taskDuration':  return { ...t, taskDuration: nextTaskDuration ?? t.taskDuration };
                case 'taskPercentage': {
                  const nh = nextTaskWorkHours ?? t.workHours;
                  const nd = nextTaskWorkDays ?? t.workDays;
                  const emps = rescaleTaskEmployeesToTaskBudget(t.employees, nh, t.workHours, WORK_HOURS_PER_DAY);
                  return { ...t, taskPercentage: nextTaskPercentage ?? t.taskPercentage, workHours: nh, workDays: nd, employees: emps, isModified: !t.isNew };
                }
                case 'dependsOnTaskId': return { ...t, dependsOnTaskId: value, isModified: !t.isNew };
                default: return { ...t, [field]: value, isModified: !t.isNew };
              }
            })
          }
        )
      }
    ));
  };

  const deleteTask = (subjectId: number, stageId: number, taskId: number) =>
    setSubjects(prev => prev.map((s: PlanningSubjectTemplate) =>
      s.id !== subjectId ? s : {
        ...s,
        isModified: !s.isNew,
        stages: s.stages.map((st: PlanningStepTemplate) =>
          st.id !== stageId ? st : {
            ...st,
            isModified: !st.isNew,
            tasks: st.tasks.map((t: PlanningTaskTemplate) =>
              t.id === taskId ? (t.isNew ? t : { ...t, isDeleted: true }) : t
            ).filter((t: PlanningTaskTemplate) => !(t.isNew && t.isDeleted)),
            deletedTaskIds: Array.from(new Set([
              ...(st.deletedTaskIds ?? []),
              ...(st.tasks.find((t: PlanningTaskTemplate) => t.id === taskId && !t.isNew) ? [taskId] : [])
            ]))
          }
        )
      }
    ));

  const moveTaskRow = (subjectId: number, stageId: number, draggedTaskId: number, targetTaskId: number) => {
    if (draggedTaskId === targetTaskId) return;

    setSubjects(prev => prev.map((s: PlanningSubjectTemplate) =>
      s.id !== subjectId ? s : {
        ...s,
        isModified: !s.isNew,
        stages: s.stages.map((st: PlanningStepTemplate) => {
          if (st.id !== stageId) return st;

          const visibleTasks = st.tasks.filter((t: PlanningTaskTemplate) => !t.isDeleted);
          const hiddenTasks = st.tasks.filter((t: PlanningTaskTemplate) => t.isDeleted);
          const fromIndex = visibleTasks.findIndex((t: PlanningTaskTemplate) => t.id === draggedTaskId);
          const toIndex = visibleTasks.findIndex((t: PlanningTaskTemplate) => t.id === targetTaskId);

          if (fromIndex < 0 || toIndex < 0) return st;

          const reordered = [...visibleTasks];
          const [moved] = reordered.splice(fromIndex, 1);
          if (!moved) return st;
          reordered.splice(toIndex, 0, {
            ...moved,
            // After reordering, remove task dependency as requested.
            dependsOnTaskId: false,
            isModified: !moved.isNew,
          });

          const withOrder = reordered.map((t: PlanningTaskTemplate, idx: number) => ({
            ...t,
            orderNum: idx + 1,
          }));

          return {
            ...st,
            isModified: !st.isNew,
            tasks: [...withOrder, ...hiddenTasks],
          };
        }),
      }
    ));
  };

  const moveStageRow = (subjectId: number, draggedStageId: number, targetStageId: number) => {
    if (draggedStageId === targetStageId) return;

    setSubjects(prev => prev.map((s: PlanningSubjectTemplate) => {
      if (s.id !== subjectId) return s;

      const visibleStages = s.stages.filter((st: PlanningStepTemplate) => !st.isDeleted);
      const hiddenStages = s.stages.filter((st: PlanningStepTemplate) => st.isDeleted);
      const fromIndex = visibleStages.findIndex((st: PlanningStepTemplate) => st.id === draggedStageId);
      const toIndex = visibleStages.findIndex((st: PlanningStepTemplate) => st.id === targetStageId);
      if (fromIndex < 0 || toIndex < 0) return s;

      const reordered = [...visibleStages];
      const [moved] = reordered.splice(fromIndex, 1);
      if (!moved) return s;
      reordered.splice(toIndex, 0, {
        ...moved,
        // After reordering, remove stage dependency as requested.
        dependsOnStepId: false,
        isModified: !moved.isNew,
      });

      const withOrder = reordered.map((st: PlanningStepTemplate, idx: number) => ({
        ...st,
        orderNum: idx + 1,
      }));

      return {
        ...s,
        isModified: !s.isNew,
        stages: [...withOrder, ...hiddenStages],
      };
    }));
  };

  // ─── Employee save handlers ────────────────────────────────────────────────
  const saveStageEmployees = (
    subjectId: number,
    stageId: number,
    links: EmployeeLink[],
    scope?: { stageHours: number; hoursPerDay: number },
  ) => {
    const prevStage = getStage(subjectId, stageId);
    const prevEmployeeIds = new Set((prevStage?.employees ?? []).map(e => e.id).filter(id => id > 0));
    const nextEmployeeIds = new Set(links.map(l => l.id).filter(id => id > 0));
    const deletedEmployeeIds = [...prevEmployeeIds].filter(id => !nextEmployeeIds.has(id));

    const mapped: PlanningStepEmployeeLinkTemplate[] = links.map(l => ({
      id: l.id, linkId: l.linkId, employeeId: l.employeeId, employeeName: l.employeeName,
      planningStepTemplateId: stageId,
      percentage: l.percentage, workHours: l.workHours, workDays: l.workDays, taskDuration: l.duration,
      isNew: l.isNew, isModified: l.isModified, isDeleted: l.isDeleted,
    }));

    const hpd = scope?.hoursPerDay && scope.hoursPerDay > 0 ? scope.hoursPerDay : WORK_HOURS_PER_DAY;
    const nextStageH =
      scope != null && Number.isFinite(scope.stageHours) ? round2(Math.max(0, scope.stageHours)) : null;
    const nextStageD = nextStageH != null ? round2(nextStageH / hpd) : null;

    setSubjects(prev => prev.map((s: PlanningSubjectTemplate) =>
      s.id !== subjectId ? s : {
        ...s,
        isModified: !s.isNew,
        stages: s.stages.map((st: PlanningStepTemplate) =>
          st.id !== stageId ? st : {
            ...st,
            ...(nextStageH != null && nextStageD != null
              ? { workHours: nextStageH, workDays: nextStageD, isModified: !st.isNew }
              : {}),
            employees: mapped,
            deletedEmployeeIds: Array.from(new Set([...(st.deletedEmployeeIds ?? []), ...deletedEmployeeIds])),
            isModified: !st.isNew
          }
        )
      }
    ));
  };

  const saveTaskEmployees = (
    subjectId: number,
    stageId: number,
    taskId: number,
    links: EmployeeLink[],
    scope?: { stageHours: number; hoursPerDay: number },
  ) => {
    const prevTask = getTask(subjectId, stageId, taskId);
    if (!prevTask) return;

    const prevEmployeeIds = new Set((prevTask.employees ?? []).map(e => e.id).filter(id => id > 0));
    const nextEmployeeIds = new Set(links.map(l => l.id).filter(id => id > 0));
    const deletedEmployeeIds = [...prevEmployeeIds].filter(id => !nextEmployeeIds.has(id));

    const mapped: PlanningTaskEmployeeLinkTemplate[] = links.map(l => ({
      id: l.id, employeeId: l.employeeId, linkId: l.linkId, employeeName: l.employeeName,
      planningTaskTemplateId: taskId,
      percentage: l.percentage, workHours: l.workHours, workDays: l.workDays, taskDuration: l.duration,
      isNew: l.isNew, isModified: l.isModified, isDeleted: l.isDeleted,
    }));

    const hpd = scope?.hoursPerDay && scope.hoursPerDay > 0 ? scope.hoursPerDay : WORK_HOURS_PER_DAY;
    const hasScopeHours = scope != null && Number.isFinite(scope.stageHours);
    const taskHours = hasScopeHours && scope ? round2(Math.max(0, scope.stageHours)) : prevTask.workHours;

    setSubjects(prev => prev.map((s: PlanningSubjectTemplate) =>
      s.id !== subjectId ? s : {
        ...s,
        isModified: !s.isNew,
        stages: s.stages.map((st: PlanningStepTemplate) => {
          if (st.id !== stageId) return st;

          const otherTasksH = st.tasks
            .filter((t: PlanningTaskTemplate) => t.id !== taskId && !t.isDeleted)
            .reduce((sum, t) => sum + (t.workHours ?? 0), 0);
          const finalStepH = hasScopeHours ? Math.max(st.workHours, otherTasksH + taskHours) : st.workHours;
          const finalStepD = hasScopeHours ? round2(finalStepH / hpd) : st.workDays;

          return {
            ...st,
            ...(hasScopeHours
              ? { workHours: finalStepH, workDays: finalStepD, isModified: !st.isNew }
              : {}),
            tasks: st.tasks.map((t: PlanningTaskTemplate) => {
              if (t.id !== taskId) {
                if (t.isDeleted || !hasScopeHours) return t;
                const pct = finalStepH > 0 ? round2(((t.workHours ?? 0) / finalStepH) * 100) : t.taskPercentage;
                return { ...t, taskPercentage: pct, isModified: !t.isNew };
              }
              return {
                ...t,
                employees: mapped,
                deletedEmployeeIds: Array.from(new Set([...(t.deletedEmployeeIds ?? []), ...deletedEmployeeIds])),
                ...(hasScopeHours
                  ? {
                      workHours: taskHours,
                      workDays: round2(taskHours / hpd),
                      taskPercentage: finalStepH > 0 ? round2((taskHours / finalStepH) * 100) : t.taskPercentage,
                      isModified: !t.isNew,
                    }
                  : { isModified: !t.isNew }),
              };
            }),
          };
        }),
      }
    ));
  };

  // ─── Modal ─────────────────────────────────────────────────────────────────
  const openModal = async (type: 'stage' | 'task', subjectId: number, stageId: number, taskId?: number) => {
    setModalState({ open: true, type, subjectId, stageId, taskId });
  };

  const getModalProps = () => {
    if (!modalState) return null;
    const { type, subjectId, stageId, taskId } = modalState;
    if (type === 'stage') {
      const st = getStage(subjectId, stageId);
      if (!st) return null;
      return {
        itemType: 'stage' as const,
        stageName: st.stepName, stageDuration: st.stepDuration, stageHours: st.workHours,
        initialEmployees: st.employees.map(e => ({
          employeeId: e.employeeId, linkId: e.linkId, id: e.id, employeeName: e.employeeName,
          percentage: e.percentage, workHours: e.workHours, workDays: e.workDays, duration: e.taskDuration,
        })),
        onSave: (links: EmployeeLink[], scope?: { stageHours: number; hoursPerDay: number }) =>
          saveStageEmployees(subjectId, stageId, links, scope),
      };
    } else {
      const t = getTask(subjectId, stageId, taskId!);
      if (!t) return null;
      return {
        itemType: 'task' as const,
        stageName: t.taskName, stageDuration: t.taskDuration, stageHours: t.workHours,
        initialEmployees: t.employees.map(e => ({
          employeeId: e.employeeId, linkId: e.linkId, id: e.id, employeeName: e.employeeName,
          percentage: e.percentage, workHours: e.workHours, workDays: e.workDays, duration: e.taskDuration,
        })),
        onSave: (links: EmployeeLink[], scope?: { stageHours: number; hoursPerDay: number }) =>
          saveTaskEmployees(subjectId, stageId, taskId!, links, scope),
      };
    }
  };

  const modalProps = modalState?.open ? getModalProps() : null;

  // ─── Render ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg text-gray-600 dark:text-gray-300">טוען תבניות תכנון...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {subjects.filter(s => !s.isDeleted).map((subject) => (
        <div key={subject.id} className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">

          {/* Subject header */}
          <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <button onClick={() => toggleSubject(subject.id)}>
                {subject.isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              </button>
              <input
                type="text" value={subject.name}
                onChange={(e) => updateSubjectName(subject.id, e.target.value)}
                className={`settings-section-title ${SETTINGS_FIELD} font-bold text-lg flex-1 max-w-[450px] focus:ring-2 focus:ring-emerald-500`}
              />
              <span className="bg-emerald-500 text-white px-3 py-1 rounded-full text-sm font-bold whitespace-nowrap">
                {subject.stages.length} שלבים
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => duplicateSubject(subject.id)} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded" title="שכפל">
                <Copy size={18} />
              </button>
              <button onClick={() => deleteSubject(subject.id)} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          {subject.isExpanded && (
            <div className="p-4 space-y-3 bg-gray-50 dark:bg-gray-900/40">

              {/* ── Stage column headers + stage rows (drag zone) ── */}
              {subject.stages.filter(st => !st.isDeleted).length > 0 && (
                <div
                  className="space-y-3"
                  onDragEnter={(e) => {
                    if (!draggingStage) return;
                    e.preventDefault();
                    if (draggingStage.subjectId === subject.id) {
                      setStageDragZoneKey(stageSubjectKey(subject.id));
                    }
                  }}
                  onDragOver={(e) => {
                    if (!draggingStage) return;
                    e.preventDefault();
                    if (draggingStage.subjectId === subject.id) {
                      e.dataTransfer.dropEffect = 'move';
                      setStageDragZoneKey(stageSubjectKey(subject.id));
                    } else {
                      e.dataTransfer.dropEffect = 'none';
                    }
                  }}
                  onDragLeave={(e) => {
                    if (!draggingStage) return;
                    const related = e.relatedTarget as Node | null;
                    if (!related || !e.currentTarget.contains(related)) {
                      setStageDragZoneKey(null);
                    }
                  }}
                >
                <div className="overflow-x-auto">
                  <div className="min-w-[1160px]">
                    <div className={`grid grid-cols-[18px_18px_18px_50px_1fr_80px_110px_110px_90px_160px_120px_36px] gap-2 px-2 py-1.5 bg-blue-200 dark:bg-blue-900/40 rounded-lg text-xs font-bold text-gray-700 dark:text-blue-100`}>
                      <div />
                      <div />
                      <div />
                      <div className="text-center">מספ׳</div>
                      <div className="text-right">שם שלב</div>
                      <div className="text-center">אחוז</div>
                      <div className="text-center">שעות עבודה</div>
                      <div className="text-center">ימי עבודה</div>
                      <div className="text-center">משך זמן בימים</div>
                      <div className="text-center">תלוי שלב</div>
                      <div className="text-center">קישור עובדים</div>
                      <div className="text-center">מחק</div>
                    </div>
                  </div>
                </div>

              {[...subject.stages].filter(st => !st.isDeleted).sort(byOrderNum).map((stage, stageIndex) => {
                const zoneKey = stageSubjectKey(subject.id);
                const showStageDragStyle =
                  draggingStage?.stageId === stage.id && stageDragZoneKey === zoneKey;

                return (
                <div
                  key={stage.id}
                  className={`border-2 border-blue-300 dark:border-blue-700 rounded-lg bg-white dark:bg-gray-800 ${
                    stage.isExpanded ? 'overflow-visible' : 'overflow-hidden'
                  }`}
                >

                  {/* ── Single merged stage row (above expanded tasks for hit-testing) ── */}
                  <div
                    className={`overflow-x-auto bg-blue-50 dark:bg-gray-800/60 shrink-0 relative z-30 isolate ${
                      stage.isExpanded ? 'sticky top-0' : ''
                    } ${showStageDragStyle ? 'opacity-60 ring-2 ring-blue-300' : ''}`}
                    onDragOver={(e) => {
                      if (!draggingStage) return;
                      e.preventDefault();
                      e.stopPropagation();
                      if (draggingStage.subjectId === subject.id) {
                        e.dataTransfer.dropEffect = 'move';
                      } else {
                        e.dataTransfer.dropEffect = 'none';
                      }
                    }}
                    onDrop={(e) => {
                      if (!draggingStage) return;
                      e.preventDefault();
                      e.stopPropagation();
                      if (draggingStage.subjectId !== subject.id) return;
                      moveStageRow(subject.id, draggingStage.stageId, stage.id);
                      setDraggingStage(null);
                      setStageDragZoneKey(null);
                    }}
                  >
                    <div className="min-w-[1160px]">
                      <div className="grid grid-cols-[18px_18px_18px_50px_1fr_80px_110px_110px_90px_160px_120px_36px] gap-2 items-center px-2 py-2">

                        {/* drag handle — only this cell starts stage drag (keeps buttons/inputs clickable) */}
                        <div
                          draggable
                          onDragStart={(e) => {
                            e.stopPropagation();
                            setDraggingStage({ subjectId: subject.id, stageId: stage.id });
                            setStageDragZoneKey(zoneKey);
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setDragImage(EMPTY_DRAG_IMAGE, 0, 0);
                          }}
                          onDragEnd={() => {
                            setDraggingStage(null);
                            setStageDragZoneKey(null);
                          }}
                          className="flex items-center justify-center cursor-grab active:cursor-grabbing"
                        >
                          <GripVertical size={14} className="text-gray-400 pointer-events-none" />
                        </div>

                        {/* expand toggle */}
                        <button onClick={() => toggleStage(subject.id, stage.id)} className="text-gray-500 hover:text-blue-600">
                          {stage.isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>

                        {/* badges (tasks + employees) stacked */}
                        <div className="flex flex-col gap-0.5 items-center">
                          <span className="bg-purple-500 text-white px-1 rounded-full text-[9px] font-bold leading-tight whitespace-nowrap">
                            {stage.tasks.length}
                          </span>
                          {(stage.employees.length > 0 || stage.tasks.some(t => t.employees.length > 0)) && (
                            <span className="bg-blue-500 text-white px-1 rounded-full text-[9px] font-bold leading-tight whitespace-nowrap">
                              {employeeCountForStage(stage)}
                            </span>
                          )}
                        </div>

                        {/* stage number */}
                        <div className="text-center text-sm font-bold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded py-1">{stageIndex + 1}</div>

                        {/* stage name input */}
                        <input
                          type="text"
                          value={stage.stepName}
                          onChange={(e) => updateStage(subject.id, stage.id, 'stepName', e.target.value)}
                          title={stage.stepName?.trim() ? stage.stepName : undefined}
                          className={`min-w-0 w-full truncate font-bold ${SETTINGS_FIELD} text-sm focus:ring-2 focus:ring-blue-500`}
                        />

                        {/* step percentage */}
                        <NumberInput min={0} max={100} step={0.01}
                          value={stage.stepPercentage}
                          onChange={v => updateStage(subject.id, stage.id, 'stepPercentage', v)}
                          className={`${SETTINGS_FIELD} text-sm text-center focus:ring-2 focus:ring-blue-400`}
                        />

                        {/* work hours */}
                        <NumberInput step={0.01} min={0}
                          value={Number(stage.workHours) || 0}
                          onChange={v => updateStage(subject.id, stage.id, 'workHours', v)}
                          onBlur={() => updateStage(subject.id, stage.id, 'workHours', round2(Number(stage.workHours) || 0))}
                          className={`${SETTINGS_FIELD} text-sm text-center focus:ring-2 focus:ring-blue-400`}
                        />

                        {/* work days */}
                        <NumberInput step={0.01} min={0}
                          value={Number(stage.workDays) || 0}
                          onChange={v => updateStage(subject.id, stage.id, 'workDays', v)}
                          onBlur={() => updateStage(subject.id, stage.id, 'workDays', round2(Number(stage.workDays) || 0))}
                          className={`${BRIGHT_SURFACE} px-2 py-1 border-2 border-emerald-300 dark:border-emerald-600 rounded text-sm text-center bg-emerald-50 font-bold focus:ring-2 focus:ring-emerald-500`}
                        />

                        {/* step duration */}
                        <NumberInput integerOnly min={0} step={1}
                          value={stage.stepDuration}
                          onChange={v => updateStage(subject.id, stage.id, 'stepDuration', v)}
                          onBlur={() => capTaskDurations(subject.id, stage.id)}
                          className={`${SETTINGS_FIELD} text-sm text-center focus:ring-2 focus:ring-blue-400`}
                        />

                        {/* depends on step */}
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            disabled={(stage.orderNum ?? 0) === 1}
                            checked={stage.dependsOnStepId ?? false}
                            onChange={e => updateStage(subject.id, stage.id, 'dependsOnStepId', e.target.checked)}
                            className="w-4 h-4 accent-blue-500"
                            title="תלוי שלב"
                          />
                        </div>

                        {/* link employees */}
                        <button
                        disabled={stage.tasks.length>0}
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            void openModal('stage', subject.id, stage.id);
                          }}
                          className="relative z-40 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-bold shadow-sm pointer-events-auto"
                        >
                          <Users size={13} />
                          קישור
                          {(stage.employees.length > 0 || stage.tasks.some(t => t.employees.length > 0)) && (
                            <span className="bright-surface bg-white text-blue-700 rounded-full px-1.5 text-[10px] font-bold">
                              {employeeCountForStage(stage)}
                            </span>
                          )}
                        </button>

                        {/* delete */}
                        <button onClick={() => deleteStage(subject.id, stage.id)} className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded flex items-center justify-center">
                          <Trash2 size={14} />
                        </button>

                      </div>
                    </div>
                  </div>

                  {/* Tasks */}
                  {stage.isExpanded && (
                    <div
                      className="relative z-0 p-3 bg-purple-50 dark:bg-gray-900/30"
                      onDragEnter={(e) => {
                        if (!draggingTask) return;
                        e.preventDefault();
                        e.stopPropagation();
                        if (
                          draggingTask.subjectId === subject.id &&
                          draggingTask.stageId === stage.id
                        ) {
                          setTaskDragZoneKey(taskStageKey(subject.id, stage.id));
                        }
                      }}
                      onDragOver={(e) => {
                        if (!draggingTask) return;
                        e.preventDefault();
                        e.stopPropagation();
                        if (
                          draggingTask.subjectId === subject.id &&
                          draggingTask.stageId === stage.id
                        ) {
                          e.dataTransfer.dropEffect = 'move';
                          setTaskDragZoneKey(taskStageKey(subject.id, stage.id));
                        } else {
                          e.dataTransfer.dropEffect = 'none';
                        }
                      }}
                      onDragLeave={(e) => {
                        if (!draggingTask) return;
                        const related = e.relatedTarget as Node | null;
                        if (!related || !e.currentTarget.contains(related)) {
                          setTaskDragZoneKey(null);
                        }
                      }}
                    >
                      <div className="overflow-x-auto">
                        <div className="min-w-[1100px]">
                          {/* Task column headers */}
                          <div className={`grid grid-cols-[40px_50px_1fr_80px_110px_110px_90px_160px_120px_60px] gap-2 px-2 py-2 bg-purple-200 dark:bg-purple-900/40 rounded-lg text-xs font-bold text-gray-700 dark:text-purple-100`}>
                            <div></div>
                            <div className="text-center">מספ׳</div>
                            <div className="text-right">שם משימה</div>
                            <div className="text-center">אחוז</div>
                            <div className="text-center">שעות עבודה</div>
                            <div className="text-center">ימי עבודה</div>
                            <div className="text-center">משך זמן בימים</div>
                            <div className="text-center">תלוי משימה</div>
                            <div className="text-center">קישור עובדים</div>
                            <div className="text-center">מחק</div>
                          </div>

                          {[...stage.tasks].filter(t => !t.isDeleted).sort(byOrderNum).map((task, taskIndex) => {
                            const zoneKey = taskStageKey(subject.id, stage.id);
                            const showTaskDragStyle =
                              draggingTask?.taskId === task.id && taskDragZoneKey === zoneKey;

                            return (
                            <div
                              key={task.id}
                              onDragOver={(e) => {
                                if (!draggingTask) return;
                                e.preventDefault();
                                e.stopPropagation();
                                if (
                                  draggingTask.subjectId === subject.id &&
                                  draggingTask.stageId === stage.id
                                ) {
                                  e.dataTransfer.dropEffect = 'move';
                                } else {
                                  e.dataTransfer.dropEffect = 'none';
                                }
                              }}
                              onDrop={(e) => {
                                if (!draggingTask) return;
                                e.preventDefault();
                                e.stopPropagation();
                                if (draggingTask.subjectId !== subject.id || draggingTask.stageId !== stage.id) return;
                                moveTaskRow(subject.id, stage.id, draggingTask.taskId, task.id);
                                setDraggingTask(null);
                                setTaskDragZoneKey(null);
                              }}
                              className={`grid grid-cols-[40px_50px_1fr_80px_110px_110px_90px_160px_120px_60px] gap-2 items-center px-2 py-2 bg-white dark:bg-gray-700 border-b border-purple-200 dark:border-purple-800 rounded ${
                                showTaskDragStyle ? 'opacity-60 ring-2 ring-purple-300' : ''
                              }`}
                            >
                              <div
                                draggable
                                onDragStart={(e) => {
                                  e.stopPropagation();
                                  setDraggingTask({ subjectId: subject.id, stageId: stage.id, taskId: task.id });
                                  setTaskDragZoneKey(zoneKey);
                                  e.dataTransfer.effectAllowed = 'move';
                                  e.dataTransfer.setDragImage(EMPTY_DRAG_IMAGE, 0, 0);
                                }}
                                onDragEnd={() => {
                                  setDraggingTask(null);
                                  setTaskDragZoneKey(null);
                                }}
                                className="flex items-center justify-center cursor-grab active:cursor-grabbing"
                                title="גרור לשינוי סדר"
                              >
                                <GripVertical size={16} className="text-gray-400 pointer-events-none" />
                              </div>
                              <div className="text-center text-sm font-bold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-600 rounded py-1">{taskIndex + 1}</div>
                              <input
                                type="text"
                                value={task.taskName}
                                onChange={(e) => updateTask(subject.id, stage.id, task.id, 'taskName', e.target.value)}
                                title={task.taskName?.trim() ? task.taskName : undefined}
                                className={`min-w-0 w-full truncate ${SETTINGS_FIELD} text-sm focus:ring-2 focus:ring-purple-400`}
                              />
                              <NumberInput min={0} max={100} step={0.01}
                                value={task.taskPercentage}
                                onChange={v => updateTask(subject.id, stage.id, task.id, 'taskPercentage', v)}
                                className={`${SETTINGS_FIELD} text-sm text-center focus:ring-2 focus:ring-purple-400`}
                              />
                              <NumberInput step={0.01} min={0}
                                value={Number(task.workHours) || 0}
                                onChange={v => updateTask(subject.id, stage.id, task.id, 'taskWorkHours', v)}
                                onBlur={() => updateTask(subject.id, stage.id, task.id, 'taskWorkHours', round2(Number(task.workHours) || 0))}
                                className={`${SETTINGS_FIELD} text-sm text-center focus:ring-2 focus:ring-purple-400`}
                              />
                              <NumberInput step={0.01} min={0}
                                value={Number(task.workDays) || 0}
                                onChange={v => updateTask(subject.id, stage.id, task.id, 'taskWorkDays', v)}
                                onBlur={() => updateTask(subject.id, stage.id, task.id, 'taskWorkDays', round2(Number(task.workDays) || 0))}
                                className={`${BRIGHT_SURFACE} px-2 py-1 border-2 border-emerald-300 dark:border-emerald-600 rounded text-sm text-center bg-emerald-50 font-bold focus:ring-2 focus:ring-emerald-500`}
                              />
                              <NumberInput integerOnly min={0} step={1}
                                value={task.taskDuration}
                                onChange={v => updateTask(subject.id, stage.id, task.id, 'taskDuration', v)}
                                className={`${SETTINGS_FIELD} text-sm text-center focus:ring-2 focus:ring-purple-400`}
                              />
                              <div className="flex items-center justify-center">
                                <input
                                  type="checkbox"
                                  disabled={(task.orderNum ?? 0) === 1}
                                  checked={task.dependsOnTaskId ?? false}
                                  onChange={e => updateTask(subject.id, stage.id, task.id, 'dependsOnTaskId', e.target.checked)}
                                  className="w-4 h-4 accent-blue-500"
                                  title="תלוי משימה"
                                />
                              </div>
                              <button
                                onClick={() => openModal('task', subject.id, stage.id, task.id)}
                                className="flex items-center justify-center gap-1 px-2 py-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 text-xs font-bold shadow-sm"
                              >
                                <Users size={14} />
                                קישור
                                {task.employees.length > 0 && (
                                  <span className="bright-surface bg-white text-purple-700 rounded-full px-1.5 text-[10px] font-bold">{task.employees.length}</span>
                                )}
                              </button>
                              <button onClick={() => deleteTask(subject.id, stage.id, task.id)} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded mx-auto">
                                <Trash2 size={14} />
                              </button>
                            </div>
                            );
                          })}

                          {stage.tasks.filter(t => !t.isDeleted).length > 0 && (
                            <div className={`${BRIGHT_SURFACE} grid grid-cols-[40px_50px_1fr_80px_110px_110px_90px_160px_120px_60px] gap-2 items-center px-2 py-2 bg-blue-100 dark:bg-blue-900/30 font-bold border-t-2 border-blue-300 dark:border-blue-700 rounded`}>
                              <div></div><div></div>
                              <div className="text-right px-2 text-blue-800">סה"כ</div>
                              <div className="text-center text-blue-700">
                                {stage.tasks.filter(t => !t.isDeleted).reduce((s, t) => s + t.taskPercentage, 0).toFixed(2)}%
                              </div>
                              <div className="text-center text-blue-700">
                                {stage.tasks.filter(t => !t.isDeleted).reduce((s, t) => s + t.workHours, 0).toFixed(2)}
                              </div>
                              <div className="text-center text-blue-700">
                                {stage.tasks.filter(t => !t.isDeleted).reduce((s, t) => s + t.workDays, 0).toFixed(2)}
                              </div>
                              <div className="text-center text-gray-400">-</div>
                              <div className="text-center text-gray-400">-</div>
                              <div className="text-center text-gray-400">-</div>
                              <div></div>
                            </div>
                          )}

                          <button
                            onClick={() => addTask(subject.id, stage.id)}
                            className="w-full py-2 border-2 border-dashed border-purple-400 dark:border-purple-600 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded text-sm font-bold mt-2 transition-all"
                          >
                            + הוסף משימה
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                );
              })}

                </div>
              )}

              {/* Stages totals row */}
              {subject.stages.filter(st => !st.isDeleted).length > 0 && (
                <div className={`${BRIGHT_SURFACE} border-2 border-emerald-300 dark:border-emerald-700 rounded-lg bg-emerald-50`}>
                  <div className="overflow-x-auto">
                    <div className="min-w-[1160px]">
                      <div className="grid grid-cols-[18px_18px_18px_50px_1fr_80px_110px_110px_90px_160px_120px_36px] gap-2 items-center px-2 py-2">
                        <div></div><div></div><div></div><div></div>
                        <div className="text-right font-bold text-emerald-800 px-2">סה"כ כל השלבים</div>
                        <div className="text-center font-bold text-emerald-800 bg-emerald-100 rounded py-1">
                          {subject.stages.filter(st => !st.isDeleted).reduce((s, st) => s + st.stepPercentage, 0).toFixed(2)}%
                        </div>
                        <div className="text-center font-bold text-emerald-800 bg-emerald-100 rounded py-1">
                          {subject.stages.filter(st => !st.isDeleted).reduce((s, st) => s + st.workHours, 0).toFixed(2)}
                        </div>
                        <div className="text-center font-bold text-emerald-800 bg-emerald-100 rounded py-1">
                          {subject.stages.filter(st => !st.isDeleted).reduce((s, st) => s + st.workDays, 0).toFixed(2)}
                        </div>
                        <div className="text-center text-gray-400">-</div>
                        <div className="text-center text-gray-400">-</div>
                        <div></div>
                        <div></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={() => addStage(subject.id)}
                className="w-full py-3 border-2 border-dashed border-blue-400 dark:border-blue-600 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded font-bold transition-all"
              >
                + הוסף שלב
              </button>
            </div>
          )}
        </div>
      ))}

      <button
        onClick={addSubject}
        className="w-full py-4 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-bold text-lg flex items-center justify-center gap-2 shadow-lg transition-all"
      >
        <Plus size={22} />
        הוסף נושא תכנון חדש
      </button>

      {/* Notes */}
      {false && (
      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
        <h4 className="font-bold text-yellow-900 mb-3 text-lg">💡 הערות</h4>
        <ul className="text-sm text-yellow-800 space-y-2">
          <li>• <strong>PlanningSubjectTemplates</strong> – נושאי תכנון</li>
          <li>• <strong>PlanningStepTemplates</strong> – שלבים (בן של נושא)</li>
          <li>• <strong>PlanningStepEmployeesLinkTemplates</strong> – עובדים לשלב</li>
          <li>• <strong>PlanningTaskTemplates</strong> – משימות (בן של שלב)</li>
          <li>• <strong>PlanningTaskEmployeesLinkTemplates</strong> – עובדים למשימה</li>
          <li>• <strong>DependsOnStepID / DependsOnTaskID</strong> – תלות (שלב/משימה ראשון תמיד מנוטרל)</li>
          <li>• שעות עבודה ביום: <strong>{WORK_HOURS_PER_DAY}</strong></li>
        </ul>
      </div>
)}
      {/* Employee link modal */}
      {modalState?.open && modalProps && (
        <LinkEmployeesToStageModal
          itemType={modalProps.itemType}
          stageName={modalProps.stageName}
          stageDuration={modalProps.stageDuration}
          stageHours={modalProps.stageHours}
          initialEmployees={modalProps.initialEmployees}
          hoursPerDay={WORK_HOURS_PER_DAY}
          showHoursActualColumn={false}
          onClose={() => setModalState(null)}
          onSave={(links, scope) => { modalProps.onSave(links, scope); setModalState(null); }}
        />
      )}

      <MessageBox
        isOpen={messageBox.isOpen}
        onClose={closeMessageBox}
        title={messageBox.title}
        message={messageBox.message}
        type={messageBox.type}
        confirmText={messageBox.confirmText ?? 'אישור'}
        cancelText={messageBox.cancelText ?? 'ביטול'}
        showCancel={messageBox.showCancel}
        onConfirm={messageBox.onConfirm}
        onCancel={messageBox.onCancel}
      />
    </div>
  );
});

export default PlanningTopics;