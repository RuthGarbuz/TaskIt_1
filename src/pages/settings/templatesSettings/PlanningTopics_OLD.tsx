import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight, Users, Copy } from 'lucide-react';
import LinkEmployeesToStageModal from '../../shared/LinkEmployeesToStageModal';
import type { EmployeeLink, PlanningStepEmployeeLinkTemplate, PlanningStepTemplate, PlanningSubjectTemplate, PlanningTaskEmployeeLinkTemplate, PlanningTaskTemplate } from '../../../Data/PlanningTemplates';
import { getPlanningTemplates, PlanningTemplates } from '../../../services/templatesSettingServices';
import MessageBox from '../../shared/MessageBox';


const WORK_HOURS_PER_DAY = 8.00;

// ─── EmployeeLink shape expected by the modal ────────────────────────────────


export interface PlanningTopicsRef {
  save: () => Promise<void>;
}

const PlanningTopics = forwardRef<PlanningTopicsRef>((_props, ref) => {
  // ─── State ─────────────────────────────────────────────────────────────────
  const [subjects, setSubjects] = useState<PlanningSubjectTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
        onConfirm: () => {
          resolve(true);
          closeMessageBox();
        },
        onCancel: () => {
          resolve(false);
          closeMessageBox();
        }
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
  const loadPlanningTemplates = async () => {
    try {
      setIsLoading(true);
      const data = await getPlanningTemplates();
      setSubjects(data);
    } catch (error) {
      console.error('Failed to load planning templates:', error);
      setMessageBox({
        isOpen: true,
        title: 'שגיאה',
        message: 'שגיאה בטעינת תבניות תכנון',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlanningTemplates();
  }, []);

  // ─── Save Function ──────────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    save: async () => {
      try {
        await PlanningTemplates(subjects);
        await loadPlanningTemplates();
      } catch (error) {
        console.error('Failed to save planning templates:', error);
        throw error;
      }
    }
  }));

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const getStage = (subjectId: number, stageId: number) =>
    subjects.find((s: PlanningSubjectTemplate) => s.id === subjectId)?.stages.find((st: PlanningStepTemplate) => st.id === stageId);

  const getTask = (subjectId: number, stageId: number, taskId: number) =>
    getStage(subjectId, stageId)?.tasks.find((t: PlanningTaskTemplate) => t.id === taskId);

 
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


  const addStage = async(subjectId: number) =>{
    // try {
    //   // Ensure subject is saved if it's new
    //  const newID  = await ensureSubjectSaved(subjectId);
    //   if(newID)
    //  subjectId = newID;
    // } catch (error) {
    //   return;
    // }
    
    setSubjects(prev => prev.map(s =>
      s.id !== subjectId ? s : {
        ...s,
       // id: subjectId,
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
  }
  const updateStage = (subjectId: number, stageId: number, field: string, value: any) => {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return;

    setSubjects(prev => prev.map(s =>
      s.id !== subjectId ? s : {
        ...s,
        stages: s.stages.map((st: PlanningStepTemplate) => {
          if (st.id !== stageId) return st;

          if (field === 'workHours') {
            const h = Math.max(0, Number(value));
            return { ...st, workHours: h, workDays: h / WORK_HOURS_PER_DAY, isModified: !st.isNew };
          }
          if (field === 'workDays') {
            const d = Math.max(0, Number(value));
            return { ...st, workDays: d, workHours: d * WORK_HOURS_PER_DAY, isModified: !st.isNew };
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
                isOpen: true,
                title: 'אזהרה',
                message: `סה"כ אחוזים לא יכול לעבור 100%. כרגע: ${(otherSum + newPct).toFixed(1)}%`,
                type: 'warning'
              });
              return st;
            }
            return { ...st, stepPercentage: newPct, isModified: !st.isNew };
          }
          if (field === 'dependsOnStepId') {
            return { ...st, dependsOnStepId: value , isModified: !st.isNew };
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
              t.taskDuration > st.stepDuration
                ? { ...t, taskDuration: st.stepDuration }
                : t
            )
          }
        )
      }
    ));
  };

  // ─── Task actions ──────────────────────────────────────────────────────────
  const addTask = async (subjectId: number, stageId: number) => {
    // try {
    //   // Ensure stage is saved if it's new
    //   stageId = await ensureStageSaved(subjectId, stageId);
    // } catch (error) {
    //   return;
    // }
    
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
    stage.tasks
      .filter((task: PlanningTaskTemplate) => task.id !== taskId)
      .reduce((sum: number, task: PlanningTaskTemplate) => sum + task.workHours, 0);

  const getOtherTaskPercentageTotal = (stage: PlanningStepTemplate, taskId: number) =>
    stage.tasks
      .filter((task: PlanningTaskTemplate) => task.id !== taskId)
      .reduce((sum: number, task: PlanningTaskTemplate) => sum + task.taskPercentage, 0);

  const resolveStageHoursUpdate = async (
    stage: PlanningStepTemplate,
    taskId: number,
    nextTaskHours: number
  ): Promise<{ shouldAbort: boolean; updatedStageHours: number | null }> => {
    const otherTaskWorkHoursTotal = getOtherTaskWorkHoursTotal(stage, taskId);
    const totalTaskWorkHours = otherTaskWorkHoursTotal + nextTaskHours;

    if (totalTaskWorkHours <= stage.workHours) {
      return { shouldAbort: false, updatedStageHours: null };
    }

    const shouldUpdateStageHours = await openConfirm(
      `סה"כ השעות במשימות (${totalTaskWorkHours.toFixed(2)}) גדול משעות השלב (${stage.workHours}).\n\nהאם לעדכן את שעות השלב?`
    );

    if (!shouldUpdateStageHours) {
      return { shouldAbort: true, updatedStageHours: null };
    }

    return { shouldAbort: false, updatedStageHours: totalTaskWorkHours };
  };

  const updateTask = async (subjectId: number, stageId: number, taskId: number, field: string, value: any) => {
    const stage = getStage(subjectId, stageId);
    if (!stage) return;

    let updatedStageHours: number | null = null;
    let nextTaskWorkHours: number | null = null;
    let nextTaskWorkDays: number | null = null;
    let nextTaskPercentage: number | null = null;

    let nextTaskDuration: number | null = null;

    switch (field) {
      case 'workHours': {
        const nextHours = Math.max(0, Number(value));
        const stageHoursUpdate = await resolveStageHoursUpdate(stage, taskId, nextHours);
        if (stageHoursUpdate.shouldAbort) return;

        updatedStageHours = stageHoursUpdate.updatedStageHours;
        nextTaskWorkHours = nextHours;
        nextTaskWorkDays = nextHours / WORK_HOURS_PER_DAY;
        break;
      }
      case 'workDays': {
        const nextDays = Math.max(0, Number(value));
        const nextHours = nextDays * WORK_HOURS_PER_DAY;
        const stageHoursUpdate = await resolveStageHoursUpdate(stage, taskId, nextHours);
        if (stageHoursUpdate.shouldAbort) return;

        updatedStageHours = stageHoursUpdate.updatedStageHours;
        nextTaskWorkHours = nextHours;
        nextTaskWorkDays = nextDays;
        break;
      }
      case 'taskWorkHours': {
        const nextHours = Math.max(0, Number(value));
        const stageHoursUpdate = await resolveStageHoursUpdate(stage, taskId, nextHours);
        if (stageHoursUpdate.shouldAbort) return;

        updatedStageHours = stageHoursUpdate.updatedStageHours;
        nextTaskWorkHours = nextHours;
        nextTaskWorkDays = nextHours / WORK_HOURS_PER_DAY;
        nextTaskPercentage = stage.workHours > 0 ? (nextHours / stage.workHours) * 100 : 0;
        break;
      }
      case 'taskWorkDays': {
        const nextDays = Math.max(0, Number(value));
        const nextHours = nextDays * WORK_HOURS_PER_DAY;
        const stageHoursUpdate = await resolveStageHoursUpdate(stage, taskId, nextHours);
        if (stageHoursUpdate.shouldAbort) return;

        updatedStageHours = stageHoursUpdate.updatedStageHours;
        nextTaskWorkHours = nextHours;
        nextTaskWorkDays = nextDays;
        nextTaskPercentage = stage.workHours > 0 ? (nextHours / stage.workHours) * 100 : 0;
        break;
      }
      case 'taskPercentage': {
        const nextPercentage = Math.max(0, Math.min(100, Number(value)));
        const otherTaskPercentageTotal = getOtherTaskPercentageTotal(stage, taskId);

        if (otherTaskPercentageTotal + nextPercentage > 100) {
          setMessageBox({
            isOpen: true,
            title: 'אזהרה',
            message: `סה"כ אחוזים לא יכול לעבור 100%. כרגע: ${(otherTaskPercentageTotal + nextPercentage).toFixed(1)}%`,
            type: 'warning'
          });
          return;
        }

        nextTaskPercentage = nextPercentage;
        nextTaskWorkHours = (stage.workHours * nextPercentage) / 100;
        nextTaskWorkDays = nextTaskWorkHours / WORK_HOURS_PER_DAY;
        break;
      }
      case 'taskDuration': {
        nextTaskDuration = Math.max(0, Math.floor(Number(value)));

        if (nextTaskDuration > stage.stepDuration) {
          setMessageBox({
            isOpen: true,
            title: 'אזהרה',
            message: `משך זמן המשימה (${nextTaskDuration}) לא יכול לעבור את משך זמן השלב (${stage.stepDuration}).`,
            type: 'warning'
          });
          return;
        }
        break;
      }
      default:
        break;
    }

    setSubjects(prev => prev.map(s =>
      s.id !== subjectId ? s : {
        ...s,
        stages: s.stages.map((st: PlanningStepTemplate) =>
          st.id !== stageId ? st : {
            ...st,
            ...(updatedStageHours !== null
              ? { workHours: updatedStageHours, workDays: updatedStageHours / WORK_HOURS_PER_DAY }
              : {}),
            tasks: st.tasks.map((t: PlanningTaskTemplate) => {
              if (t.id !== taskId) return t;

              switch (field) {
                case 'workHours':
                  return { ...t, workHours: nextTaskWorkHours ?? t.workHours, workDays: nextTaskWorkDays ?? t.workDays, isModified: !t.isNew };
                case 'workDays':
                  return { ...t, workDays: nextTaskWorkDays ?? t.workDays, workHours: nextTaskWorkHours ?? t.workHours, isModified: !t.isNew };
                case 'taskWorkHours':
                case 'taskWorkDays':
                  return { ...t, workHours: nextTaskWorkHours ?? t.workHours, workDays: nextTaskWorkDays ?? t.workDays, taskPercentage: nextTaskPercentage ?? t.taskPercentage, isModified: !t.isNew };
                case 'taskDuration':
                  return { ...t, taskDuration: nextTaskDuration ?? t.taskDuration };
                case 'taskPercentage':
                  return { ...t, taskPercentage: nextTaskPercentage ?? t.taskPercentage, workHours: nextTaskWorkHours ?? t.workHours, workDays: nextTaskWorkDays ?? t.workDays, isModified: !t.isNew };
                case 'dependsOnTaskId':
                  return { ...t, dependsOnTaskId: value, isModified: !t.isNew };
                default:
                  return { ...t, [field]: value, isModified: !t.isNew };
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

  // ─── Employee save handlers ────────────────────────────────────────────────
  const saveStageEmployees = (subjectId: number, stageId: number, links: EmployeeLink[]) => {
    const prevStage = getStage(subjectId, stageId);
    const prevEmployeeIds = new Set((prevStage?.employees ?? []).map(e => e.id).filter(id => id > 0));
    const nextEmployeeIds = new Set(links.map(l => l.id).filter(id => id > 0));
    const deletedEmployeeIds = [...prevEmployeeIds].filter(id => !nextEmployeeIds.has(id));

    const mapped: PlanningStepEmployeeLinkTemplate[] = links.map(l => ({
      id: l.id,
      linkId: l.linkId,
      employeeId: l.employeeId,
      employeeName: l.employeeName,
      planningStepTemplateId: stageId,
      percentage: l.percentage,
      workHours: l.workHours,
      workDays: l.workDays,
      taskDuration: l.duration,
      isNew: l.isNew,
      isModified: l.isModified,
      isDeleted: l.isDeleted,
    }));
    setSubjects(prev => prev.map((s: PlanningSubjectTemplate) =>
      s.id !== subjectId ? s : {
        ...s,
        isModified: !s.isNew,
        stages: s.stages.map((st: PlanningStepTemplate) =>
          st.id !== stageId ? st : {
            ...st,
            employees: mapped,
            deletedEmployeeIds: Array.from(new Set([...(st.deletedEmployeeIds ?? []), ...deletedEmployeeIds])),
            isModified: !st.isNew
          }
        )
      }
    ));
  };

  const saveTaskEmployees = (subjectId: number, stageId: number, taskId: number, links: EmployeeLink[]) => {
    const prevTask = getTask(subjectId, stageId, taskId);
    const prevEmployeeIds = new Set((prevTask?.employees ?? []).map(e => e.id).filter(id => id > 0));
    const nextEmployeeIds = new Set(links.map(l => l.id).filter(id => id > 0));
    const deletedEmployeeIds = [...prevEmployeeIds].filter(id => !nextEmployeeIds.has(id));

    const mapped: PlanningTaskEmployeeLinkTemplate[] = links.map(l => ({
      id: 0,
      employeeId: 0,
      linkId: l.linkId,
      employeeName: l.employeeName,
      planningTaskTemplateId: taskId,
      percentage: l.percentage,
      workHours: l.workHours,
      workDays: l.workDays,
      taskDuration: l.duration,
      isNew: l.isNew,
      isModified: l.isModified,
      isDeleted: l.isDeleted,
    }));
    setSubjects(prev => prev.map((s: PlanningSubjectTemplate) =>
      s.id !== subjectId ? s : {
        ...s,
        isModified: !s.isNew,
        stages: s.stages.map((st: PlanningStepTemplate) =>
          st.id !== stageId ? st : {
            ...st,
            isModified: !st.isNew,
            tasks: st.tasks.map((t: PlanningTaskTemplate) =>
              t.id !== taskId ? t : {
                ...t,
                employees: mapped,
                deletedEmployeeIds: Array.from(new Set([...(t.deletedEmployeeIds ?? []), ...deletedEmployeeIds])),
                isModified: !t.isNew
              }
            )
          }
        )
      }
    ));
  };

  // ─── Modal ─────────────────────────────────────────────────────────────────
  const openModal = async (type: 'stage' | 'task', subjectId: number, stageId: number, taskId?: number) =>{
    // try {
    //   if(type === 'stage')
    //   // Ensure subject is saved if it's new
    //   stageId = await ensureStageSaved(subjectId, stageId);
      
    //  else if(type === 'task')
    //   // Ensure stage is saved if it's new
    // } catch (error) {
    //   return;
    // }
    
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
        stageName: st.stepName,
        stageDuration: st.stepDuration,
        stageHours: st.workHours,
        initialEmployees: st.employees.map(e => ({
          employeeId: e.employeeId,
          linkId:e.linkId,
          id: e.id, employeeName: e.employeeName,
          percentage: e.percentage, workHours: e.workHours,
          workDays: e.workDays, duration: e.taskDuration,
        })),
        onSave: (links: EmployeeLink[]) => saveStageEmployees(subjectId, stageId, links),
      };
    } else {
      const t = getTask(subjectId, stageId, taskId!);
      if (!t) return null;
      return {
        itemType: 'task' as const,
        stageName: t.taskName,
        stageDuration: t.taskDuration,
        stageHours: t.workHours,
        initialEmployees: t.employees.map(e => ({
          employeeId: e.employeeId,
          linkId:e.linkId,
          id: e.id,
          employeeName: e.employeeName,
          percentage: e.percentage, workHours: e.workHours,
          workDays: e.workDays, duration: e.taskDuration,
        })),
        onSave: (links: EmployeeLink[]) => saveTaskEmployees(subjectId, stageId, taskId!, links),
      };
    }
  };

  const modalProps = modalState?.open ? getModalProps() : null;
const employeeCountForStage = (stage: PlanningStepTemplate): number => {
  const stageEmployeeIds = new Set(stage.employees.filter(e => !e.isDeleted).map(e => e.employeeId));
  const taskEmployeeIds = new Set(
    stage.tasks.flatMap(t => t.employees.filter(e => !e.isDeleted).map(e => e.employeeId))
  );
  const allUniqueIds = new Set([...stageEmployeeIds, ...taskEmployeeIds]);
  return allUniqueIds.size;
};
  // ─── Render ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg text-gray-600">טוען תבניות תכנון...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {subjects.filter(s => !s.isDeleted).map((subject) => (
        <div key={subject.id} className="border border-gray-300 rounded-lg overflow-hidden">
          {/* Subject header */}
          <div className="bg-gray-100 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <button onClick={() => toggleSubject(subject.id)}>
                {subject.isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              </button>
              <input
                type="text"
                value={subject.name}
                onChange={(e) => updateSubjectName(subject.id, e.target.value)}
                className="font-bold text-lg px-3 py-1.5 border-2 border-gray-300 rounded flex-1 max-w-[450px] focus:ring-2 focus:ring-emerald-500"
              />
              <span className="bg-emerald-500 text-white px-3 py-1 rounded-full text-sm font-bold whitespace-nowrap">
                {subject.stages.length} שלבים
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => duplicateSubject(subject.id)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded" title="שכפל">
                <Copy size={18} />
              </button>
              <button onClick={() => deleteSubject(subject.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          {subject.isExpanded && (
            <div className="p-4 space-y-3 bg-gray-50">
              {subject.stages.filter(st => !st.isDeleted).map((stage, stageIndex) => (

              <div key={stage.id} className="border-2 border-blue-300 rounded-lg bg-white">
                {/* Stage header */}
                <div className="bg-blue-100 px-3 py-2 flex items-center justify-between" >
                <div className="flex items-center gap-3">
                  <GripVertical size={18} className="text-gray-500 cursor-move" />
                  <button onClick={() => toggleStage(subject.id, stage.id)}>
                  {stage.isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>
                  <span className="text-sm text-gray-600 font-semibold bg-gray-200 px-2 py-1 rounded">
                  מספר: {stageIndex + 1}
                  </span>
                  <input
                  type="text"
                  value={stage.stepName}
                  onChange={(e) => updateStage(subject.id, stage.id, 'stepName', e.target.value)}
                  className="font-bold px-3 py-1 border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="bg-purple-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                  {stage.tasks.length} משימות
                  </span>
                  {(stage.employees.length > 0 || stage.tasks.some(task => task.employees.length > 0)) && (
                  <span className="bg-blue-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                    {employeeCountForStage(stage)} עובדים
                  </span>
                  )}
                </div>
                <button onClick={() => deleteStage(subject.id, stage.id)} className="p-1 text-red-500 hover:bg-red-100 rounded">
                  <Trash2 size={16} />
                </button>
                </div>

                {/* Stage data row */}
                <div className="px-3 py-2 bg-blue-50">
                <div className="overflow-x-auto">
                  <div className="min-w-[1100px]">
                  {/* Stage column headers */}
                  <div className="grid grid-cols-[40px_50px_1fr_80px_110px_110px_90px_160px_120px] gap-2 px-2 py-2 bg-blue-200 rounded-lg text-xs font-bold text-gray-700">
                    <div></div>
                    <div className="text-center">מספ׳</div>
                    <div className="text-right">שם שלב</div>
                    <div className="text-center">אחוז</div>
                    <div className="text-center">שעות עבודה</div>
                    <div className="text-center">ימי עבודה</div>
                    <div className="text-center">משך זמן</div>
                    <div className="text-center">תלוי שלב</div>
                    <div className="text-center">קישור עובדים</div>
                  </div>
                  {/* Stage data */}
                  <div className="grid grid-cols-[40px_50px_1fr_80px_110px_110px_90px_160px_120px] gap-2 items-center px-2 py-2 bg-white border-b-2 border-blue-300 rounded">
                    <GripVertical size={16} className="text-gray-400 cursor-move" />
                    <div className="text-center text-sm font-bold text-gray-700 bg-gray-100 rounded py-1">{stageIndex + 1}</div>
                    <div className="px-2 py-1 text-sm font-bold bg-gray-100 border border-gray-300 rounded">{stage.stepName}</div>
                    <input
                    type="number" min="0" max="100"
                    value={stage.stepPercentage}
                    onChange={(e) => updateStage(subject.id, stage.id, 'stepPercentage', e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm text-center focus:ring-2 focus:ring-blue-400"
                    />
                    <input
                    type="number" step="0.01" min="0"
                    value={stage.workHours}
                    onChange={(e) => updateStage(subject.id, stage.id, 'workHours', e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm text-center focus:ring-2 focus:ring-blue-400"
                    />
                    <input
                    type="number" step="0.001" min="0"
                    value={stage.workDays.toFixed(3)}
                    onChange={(e) => updateStage(subject.id, stage.id, 'workDays', e.target.value)}
                    className="px-2 py-1 border-2 border-emerald-300 rounded text-sm text-center bg-emerald-50 font-bold focus:ring-2 focus:ring-emerald-500"
                    />
                    <input

                    
                    type="number" min="0" step="1"
                    value={stage.stepDuration}
                    onChange={(e) => updateStage(subject.id, stage.id, 'stepDuration', e.target.value)}
                    onBlur={() => capTaskDurations(subject.id, stage.id)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm text-center focus:ring-2 focus:ring-blue-400"
                    />
                    {/* DependsOnStepID dropdown */}
                           <input
            type="checkbox"
            checked={stage.dependsOnStepId?? false }
            onChange={e => updateStage(subject.id, stage.id, 'dependsOnStepId', e.target.checked)}
            className="w-4 h-4 accent-blue-500"
            title="תלוי שלב"
            
          />
                    {/* <select
                    value={stage.dependsOnStepId??false }
                    onChange={(e) => updateStage(subject.id, stage.id, 'dependsOnStepId', e.target.value)}
                    disabled={stageIndex === 0}
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:text-gray-400"
                    >
                    <option value="">-</option>
                    {getPriorStages(subject.id, stage.id).map(s => (
                      <option key={s.id} value={s.id}>{s.stepName}</option>
                    ))}
                    </select> */}
                    <button
                    onClick={() => openModal('stage', subject.id, stage.id)}
                    className="flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-bold shadow-sm"
                    >
                    <Users size={14} />
                    קישור
                    {(stage.employees.length > 0 || stage.tasks.some(task => task.employees.length > 0)) && (
                      <span className="bg-white text-blue-700 rounded-full px-1.5 text-[10px] font-bold">{employeeCountForStage(stage)}</span>
                    // {(() => {
                    //   const stageEmployeeIds = new Set(stage.employees.map(e => e.employeeId));
                    //   const taskEmployeeIds = new Set(
                    //     stage.tasks.flatMap(t => t.employees.map(e => e.employeeId))
                    //   );
                    //   const allUniqueIds = new Set([...stageEmployeeIds, ...taskEmployeeIds]);
                    //   return allUniqueIds.size;
                    // })()}
                    )}
                    </button>
                  </div>
                  </div>
                </div>
                </div>

                {/* Tasks */}
                {stage.isExpanded && (
                <div className="p-3 bg-purple-50">
                  <div className="overflow-x-auto">
                  <div className="min-w-[1100px]">
                    {/* Task column headers */}
                    <div className="grid grid-cols-[40px_50px_1fr_80px_110px_110px_90px_160px_120px_60px] gap-2 px-2 py-2 bg-purple-200 rounded-lg text-xs font-bold text-gray-700">
                    <div></div>
                    <div className="text-center">מספ׳</div>
                    <div className="text-right">שם משימה</div>
                    <div className="text-center">אחוז</div>
                    <div className="text-center">שעות עבודה</div>
                    <div className="text-center">ימי עבודה</div>
                    <div className="text-center">משך זמן</div>
                    <div className="text-center">תלוי במשימה</div>
                    <div className="text-center">קישור עובדים</div>
                    <div className="text-center">מחק</div>
                    </div>
                    {stage.tasks.filter(t => !t.isDeleted).map((task, taskIndex) => (
                    <div key={task.id} className="grid grid-cols-[40px_50px_1fr_80px_110px_110px_90px_160px_120px_60px] gap-2 items-center px-2 py-2 bg-white border-b border-purple-200 rounded">
                      <GripVertical size={16} className="text-gray-400 cursor-move" />
                      <div className="text-center text-sm font-bold text-gray-700 bg-gray-100 rounded py-1">{taskIndex + 1}</div>
                      <input
                      type="text"
                      value={task.taskName}
                      onChange={(e) => updateTask(subject.id, stage.id, task.id, 'taskName', e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-400"
                      />
                      <input
                      type="number" min="0" max="100"
                      value={task.taskPercentage}
                      onChange={(e) => updateTask(subject.id, stage.id, task.id, 'taskPercentage', e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-sm text-center focus:ring-2 focus:ring-purple-400"
                      />
                      <input
                      type="number" step="0.01" min="0"
                      value={task.workHours}
                      onChange={(e) => updateTask(subject.id, stage.id, task.id, 'taskWorkHours', e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-sm text-center focus:ring-2 focus:ring-purple-400"
                      />
                      <input
                      type="number" step="0.001" min="0"
                      value={task.workDays.toFixed(3)}
                      onChange={(e) => updateTask(subject.id, stage.id, task.id, 'taskWorkDays', e.target.value)}
                      className="px-2 py-1 border-2 border-emerald-300 rounded text-sm text-center bg-emerald-50 font-bold focus:ring-2 focus:ring-emerald-500"
                      />
                      <input
                      type="number" min="0" step="1"
                      value={task.taskDuration}
                      onChange={(e) => updateTask(subject.id, stage.id, task.id, 'taskDuration', e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-sm text-center focus:ring-2 focus:ring-purple-400"
                      />
                      {/* DependsOnTaskID dropdown */}
                                             <input
            type="checkbox"
            checked={task.dependsOnTaskId?? false }
            onChange={e => updateTask(subject.id, stage.id, task.id, 'dependsOnTaskId', e.target.checked)}
            className="w-4 h-4 accent-blue-500"
            title="תלוי משימה"
            
          />
                      {/* <select
                      value={task.dependsOnTaskId ?? ''}
                      onChange={(e) => updateTask(subject.id, stage.id, task.id, 'dependsOnTaskId', e.target.value)}
                      disabled={taskIndex === 0}
                      className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-400 disabled:bg-gray-100 disabled:text-gray-400"
                      >
                      <option value="">-</option>
                      {getPriorTasks(subject.id, stage.id, task.id).map(t => (
                        <option key={t.id} value={t.id}>{t.taskName}</option>
                      ))}
                      </select> */}
                      <button
                      onClick={() => openModal('task', subject.id, stage.id, task.id)}
                      className="flex items-center justify-center gap-1 px-2 py-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 text-xs font-bold shadow-sm"
                      >
                      <Users size={14} />
                      קישור
                      {task.employees.length > 0 && (
                        <span className="bg-white text-purple-700 rounded-full px-1.5 text-[10px] font-bold">{task.employees.length}</span>
                      )}
                      </button>
                      <button onClick={() => deleteTask(subject.id, stage.id, task.id)} className="p-1 text-red-500 hover:bg-red-50 rounded mx-auto">
                      <Trash2 size={14} />
                      </button>
                    </div>
                    ))}

                    {/* Tasks totals row */}
                    {stage.tasks.length > 0 && (
                    <div className="grid grid-cols-[40px_50px_1fr_80px_110px_110px_90px_160px_120px_60px] gap-2 items-center px-2 py-2 bg-blue-100 font-bold border-t-2 border-blue-300 rounded">
                      <div></div><div></div>
                      <div className="text-right px-2 text-blue-800">סה"כ</div>
                      <div className="text-center text-blue-700">
                      {stage.tasks.reduce((s, t) => s + t.taskPercentage, 0).toFixed(2)}%
                      </div>
                      <div className="text-center text-blue-700">
                      {stage.tasks.reduce((s, t) => s + t.workHours, 0).toFixed(2)}
                      </div>
                      <div className="text-center text-blue-700">
                      {stage.tasks.reduce((s, t) => s + t.workDays, 0).toFixed(3)}
                      </div>
                      <div className="text-center text-gray-400">-</div>
                      <div className="text-center text-gray-400">-</div>
                      <div className="text-center text-gray-400">-</div>
                      <div></div>
                    </div>
                    )}

                    <button
                    onClick={() => addTask(subject.id, stage.id)}
                    className="w-full py-2 border-2 border-dashed border-purple-400 text-purple-700 hover:bg-purple-100 rounded text-sm font-bold mt-2 transition-all"
                    >
                    + הוסף משימה
                    </button>
                  </div>
                  </div>
                </div>
                )}
              </div>
              ))}

              {/* Stages totals row */}
              {subject.stages.filter(st => !st.isDeleted).length > 0 && (
              <div className="border-2 border-emerald-300 rounded-lg bg-emerald-50 p-3">
                <div className="overflow-x-auto">
                <div className="min-w-[1100px]">
                  <div className="grid grid-cols-[40px_50px_1fr_80px_110px_110px_90px_160px_120px] gap-2 items-center px-2 py-2">
                  <div></div><div></div>
                  <div className="text-right font-bold text-emerald-800 px-2">סה"כ כל השלבים</div>
                  <div className="text-center font-bold text-emerald-800 bg-emerald-100 rounded py-1">
                    {subject.stages.filter(st => !st.isDeleted).reduce((s, st) => s + st.stepPercentage, 0).toFixed(2)}%
                  </div>
                  <div className="text-center font-bold text-emerald-800 bg-emerald-100 rounded py-1">
                    {subject.stages.filter(st => !st.isDeleted).reduce((s, st) => s + st.workHours, 0).toFixed(2)}
                  </div>
                  <div className="text-center font-bold text-emerald-800 bg-emerald-100 rounded py-1">
                    {subject.stages.filter(st => !st.isDeleted).reduce((s, st) => s + st.workDays, 0).toFixed(3)}
                  </div>
                  <div className="text-center text-gray-400">-</div>
                  <div className="text-center text-gray-400">-</div>
                  <div></div>
                  </div>
                </div>
                </div>
              </div>
              )}

              <button
              onClick={() => addStage(subject.id)}
              className="w-full py-3 border-2 border-dashed border-blue-400 text-blue-700 hover:bg-blue-50 rounded font-bold transition-all"
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

      {/* Employee link modal */}
      {modalState?.open && modalProps && (
        <LinkEmployeesToStageModal
          itemType={modalProps.itemType}
          stageName={modalProps.stageName}
          stageDuration={modalProps.stageDuration}
          stageHours={modalProps.stageHours}
         initialEmployees={modalProps.initialEmployees}
          hoursPerDay={WORK_HOURS_PER_DAY}
          onClose={() => setModalState(null)}
          onSave={(links) => {
            modalProps.onSave(links);
            employeeCountForStage(getStage(modalState.subjectId, modalState.stageId)!) // update count in badge
            
            setModalState(null);
          }}
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

