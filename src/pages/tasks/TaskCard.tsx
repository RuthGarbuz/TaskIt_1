import { useEffect, useState } from 'react';
import { X, Trash2, Plus, MessageSquare, Paperclip } from 'lucide-react';
import type { DependsOnStepData, DependsOnTaskData, EmployeeLink, PlanningAttachment, SystemTable, TaskCardCascadeStage, TaskCardSaveOptions, TaskParentDateCascade, TaskReview, TaskStepHoursCascade } from '../../Data/projectsData';
import { getEmployees, type EmployeeBasic } from '../../services/templatesSettingServices';
import { deleteTaskOrStageAsync, getDependsOnDataByIdAsync, getEmployeeLinksAsync } from '../../services/taskService';
import { getNumberOfHours } from '../../services/settingService';
import { getStepAttachmentsAsync, getTaskAttachmentsAsync, saveEntityAttachmentsAsync } from '../../services/projectPlanningService';
import MessageBox from '../shared/MessageBox';
import ChatModal from './ChatModal';
import AttachmentsModal from '../projects/AttachmentsModal';
import authService from '../../services/authService';

const readAttachmentIsLink = (raw: Record<string, unknown>): boolean => {
  if (typeof raw.isLink === 'boolean') return raw.isLink;
  if (raw.attachmentType === 'link') return true;
  if (raw.attachmentType === 'upload') return false;
  return false;
};

const normalizePlanningAttachment = (
  raw: PlanningAttachment | Record<string, unknown>,
  entityType: 'step' | 'task',
  entityId: number,
): PlanningAttachment => {
  const r = raw as Record<string, unknown>;
  const isLink = readAttachmentIsLink(r);
  return {
    id: Number(r.id ?? 0),
    entityType,
    entityId,
    employeeId: r.employeeId != null && r.employeeId !== '' ? Number(r.employeeId) : null,
    employeeName: r.employeeName != null ? String(r.employeeName) : undefined,
    description: String(r.description ?? ''),
    fileLink: String(r.fileLink ?? r.FileLink ?? ''),
    isLink,
    fileName: r.fileName != null ? String(r.fileName) : undefined,
    isNew: Boolean(r.isNew),
    isModified: Boolean(r.isModified),
    isDeleted: Boolean(r.isDeleted),
  };
};

const DEFAULT_WORK_HOURS_PER_DAY = 8.0;
const HOURS_EPS = 1e-4;
const round2 = (n: number) => Math.round(n * 100) / 100;

interface TaskCardProps {
  task: TaskReview;
  onClose: () => void;
  onUpdate: (updatedTask: TaskReview, employeeLinks: EmployeeLink[], options?: TaskCardSaveOptions) => void;
  viewMode: 'myTasks' | 'allTasks';
  statuses: SystemTable[];
  priorities: SystemTable[];
  /** תצוגה בלבד — חוסם עריכה (למשל מסך אישור חשבונות) */
  readOnly?: boolean;
  /** שורת השלב (תכנון) — לבדיקת שעות מול כלל המשימות בשלב */
  planStepListTask?: TaskReview | null;
  /** כל משימות אותו שלב (ללא isPlanningSte), כולל המשימה הפתוחה */
  tasksInSameStep?: TaskReview[] | null;
  /** כלל המשימות בהקשר הנוכחי (לרשימות/חישובים) */
  contextTasks?: TaskReview[];
}

export default function TaskCard({
  task,
  onClose,
  onUpdate,
  viewMode,
  statuses,
  priorities,
  planStepListTask = null,
  tasksInSameStep = null
}: TaskCardProps) {
  const [editedTask, setEditedTask] = useState<TaskReview>(task);
  const [WORK_HOURS_PER_DAY, setWORK_HOURS_PER_DAY] = useState<number>(DEFAULT_WORK_HOURS_PER_DAY);
  const [newReceiver, setNewReceiver] = useState<EmployeeBasic | null>(null);
  const [chatTask, setChatTask] = useState<TaskReview | null>(null);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [taskAttachments, setTaskAttachments] = useState<PlanningAttachment[]>(() =>
    (task.attachments ?? []).map(a =>
      normalizePlanningAttachment(a, task.isPlanningSte ? 'step' : 'task', task.id)
    )
  );
  const [dependsOnData, setDependsOnData] = useState<DependsOnTaskData | DependsOnStepData | null>(null);
  const [cascadeStageUpdate, setCascadeStageUpdate] = useState<TaskCardCascadeStage | null>(null);
  const [taskStepHoursCascade, setTaskStepHoursCascade] = useState<TaskStepHoursCascade | null>(null);
  const [taskParentDateCascade, setTaskParentDateCascade] = useState<TaskParentDateCascade | null>(null);
  const [availableEmployees, setAvailableEmployees] = useState<EmployeeBasic[]>([]);
  const [employeeLinks, setEmployeeLinks] = useState<EmployeeLink[]>([]);
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

  const showMessage = (
    message: string,
    title: string = 'הודעה',
    type: 'alert' | 'success' | 'error' | 'warning' = 'warning'
  ) => {
    setMessageBox({ isOpen: true, title, message, type, confirmText: 'אישור' });
  };

  const openConfirm = (message: string, title: string = 'אישור'): Promise<boolean> =>
    new Promise(resolve => {
      setMessageBox({
        isOpen: true, title, message, type: 'warning', showCancel: true,
        confirmText: 'אישור', cancelText: 'ביטול',
        onConfirm: () => { resolve(true); closeMessageBox(); },
        onCancel: () => { resolve(false); closeMessageBox(); }
      });
    });

  const loadAttachmentsFromServer = async (entityId: number, isPlanningStep: boolean) =>
    isPlanningStep ? getStepAttachmentsAsync(entityId) : getTaskAttachmentsAsync(entityId);

  const attachmentEntityType = editedTask.isPlanningSte ? 'step' : 'task';

  const attachmentsHavePendingChanges = (attachments: PlanningAttachment[]) =>
    attachments.some(a => a.isNew || a.isModified || a.isDeleted);

  const persistAttachmentsAsync = async (attachments: PlanningAttachment[]): Promise<PlanningAttachment[]> => {
    const normalized = attachments.map(a =>
      normalizePlanningAttachment(a, attachmentEntityType, editedTask.id)
    );
    if (!editedTask.projectId) return normalized;
    await saveEntityAttachmentsAsync(
      editedTask.projectId,
      attachmentEntityType,
      editedTask.id,
      normalized,
    );
    return loadAttachmentsFromServer(editedTask.id, editedTask.isPlanningSte);
  };

  useEffect(() => {
    let cancelled = false;
    const loadAttachments = async () => {
      if (!editedTask.id) return;
      try {
        const attachments = await loadAttachmentsFromServer(editedTask.id, editedTask.isPlanningSte);
        if (!cancelled) setTaskAttachments(attachments);
      } catch (error) {
        console.error('Failed to load attachments:', error);
      }
    };
    void loadAttachments();
    return () => { cancelled = true; };
  }, [editedTask.id, editedTask.isPlanningSte]);

  useEffect(() => {
    const loadEmployeeLinks = async () => {
      try {
        const data = await getEmployeeLinksAsync(editedTask.id, !editedTask.isPlanningSte);
        setEmployeeLinks(data ?? []);
        setEditedTask(prev => ({
          ...prev,
          receivers: (data ?? []).map(d => d.employeeName)
        }));
      } catch (error) {
        console.error('Failed to load employee links:', error);
      }
    };
    loadEmployeeLinks();
  }, [editedTask.id, editedTask.isPlanningSte]);

  useEffect(() => {
    // Load "hours per day" once per card mount from backend settings.
    const load = async () => {
      try {
        const n = await getNumberOfHours();
        if (n != null && Number.isFinite(n) && n > 0) {
          setWORK_HOURS_PER_DAY(n);
        }
      } catch {
        // Keep default on failure.
      }
    };
    void load();
  }, []);

  useEffect(() => {
    if (!WORK_HOURS_PER_DAY || WORK_HOURS_PER_DAY <= 0) return;
    // Recompute workDays from workHours so UI stays consistent with backend setting.
    setEditedTask(prev => ({
      ...prev,
      workDays: (prev.workHours ?? 0) / WORK_HOURS_PER_DAY,
    }));
    setEmployeeLinks(prev =>
      prev.map(l => ({
        ...l,
        workDays: (l.workHours ?? 0) / WORK_HOURS_PER_DAY,
      }))
    );
  }, [WORK_HOURS_PER_DAY]);

  useEffect(() => {
    const loadDependsOnData = async () => {
      try {
        const data = await getDependsOnDataByIdAsync(editedTask.id, !editedTask.isPlanningSte);
        setDependsOnData(data);
      } catch (error) {
        console.error('Failed to load depends-on data:', error);
        setDependsOnData(null);
      }
    };
    loadDependsOnData();
  }, [editedTask.id, editedTask.isPlanningSte]);

  const updateEmployeeLink = (employeeId: number, patch: Partial<EmployeeLink>) => {
    setEmployeeLinks(prev =>
      prev.map(link =>
        link.employeeId === employeeId ? { ...link, ...patch, isModified: true } : link
      )
    );
  };

  const updateEmployeePercentage = (employeeId: number, value: number) => {
    const newPercentage = Math.max(0, value);
    const otherEmployees = employeeLinks.filter(link => !link.isDeleted && link.employeeId !== employeeId);
    const otherPercentagesSum = otherEmployees.reduce((sum, link) => sum + (link.percentage ?? 0), 0);
    if (otherPercentagesSum + newPercentage > 100) {
      showMessage('סה"כ אחוזים לא יכול לעבור 100%', 'אזהרה', 'warning');
      return;
    }
    const taskHours = Math.max(0, editedTask.workHours ?? 0);
    const calculatedHours = (taskHours * newPercentage) / 100;
    const calculatedDays = calculatedHours / WORK_HOURS_PER_DAY;
    setEmployeeLinks(prev => prev.map(link =>
      link.employeeId === employeeId
        ? { ...link, percentage: newPercentage, workHours: calculatedHours, workDays: calculatedDays, isModified: true }
        : link
    ));
  };

  const updateEmployeeWorkHours = async (employeeId: number, value: number) => {
    const newHours = Math.max(0, value);
    const taskHours = Math.max(0, editedTask.workHours ?? 0);
    const otherEmployees = employeeLinks.filter(link => !link.isDeleted && link.employeeId !== employeeId);
    const otherHoursSum = otherEmployees.reduce((sum, link) => sum + (link.workHours ?? 0), 0);
    if (otherHoursSum + newHours > taskHours) {
      const shouldUpdate = await openConfirm(
        `יש חריגה במספר השעות. שעות העובדים גדולים משעות המשימה (${taskHours} שעות).\n\nהאם לעדכן את שעות המשימה?`
      );
      if (!shouldUpdate) return;
      const newTaskHours = otherHoursSum + newHours;
      const newTaskDays = newTaskHours / WORK_HOURS_PER_DAY;
      const newPercentage = newTaskHours > 0 ? (newHours / newTaskHours) * 100 : 0;
      const newDays = newHours / WORK_HOURS_PER_DAY;
      setEditedTask(prev => ({ ...prev, workHours: newTaskHours, workDays: newTaskDays }));
      setEmployeeLinks(prev => prev.map(link => {
        if (link.employeeId === employeeId) {
          return { ...link, workHours: newHours, workDays: newDays, percentage: newPercentage, isModified: true };
        }
        const recalcPercentage = newTaskHours > 0 ? ((link.workHours ?? 0) / newTaskHours) * 100 : 0;
        return { ...link, percentage: recalcPercentage, isModified: true };
      }));
      return;
    }
    const newPercentage = taskHours > 0 ? (newHours / taskHours) * 100 : 0;
    const newDays = newHours / WORK_HOURS_PER_DAY;
    setEmployeeLinks(prev => prev.map(link =>
      link.employeeId === employeeId
        ? { ...link, workHours: newHours, workDays: newDays, percentage: newPercentage, isModified: true }
        : link
    ));
  };

  const updateEmployeeWorkDays = async (employeeId: number, value: number) => {
    const newDays = Math.max(0, value);
    const calculatedHours = newDays * WORK_HOURS_PER_DAY;
    const taskHours = Math.max(0, editedTask.workHours ?? 0);
    const otherEmployees = employeeLinks.filter(link => !link.isDeleted && link.employeeId !== employeeId);
    const otherHoursSum = otherEmployees.reduce((sum, link) => sum + (link.workHours ?? 0), 0);
    if (otherHoursSum + calculatedHours > taskHours) {
      const shouldUpdate = await openConfirm(
        `יש חריגה במספר השעות. שעות העובדים גדולים משעות המשימה (${taskHours} שעות).\n\nהאם לעדכן את שעות המשימה?`
      );
      if (!shouldUpdate) return;
      const newTaskHours = otherHoursSum + calculatedHours;
      const newTaskDays = newTaskHours / WORK_HOURS_PER_DAY;
      const newPercentage = newTaskHours > 0 ? (calculatedHours / newTaskHours) * 100 : 0;
      setEditedTask(prev => ({ ...prev, workHours: newTaskHours, workDays: newTaskDays }));
      setEmployeeLinks(prev => prev.map(link => {
        if (link.employeeId === employeeId) {
          return { ...link, workDays: newDays, workHours: calculatedHours, percentage: newPercentage, isModified: true };
        }
        const recalcPercentage = newTaskHours > 0 ? ((link.workHours ?? 0) / newTaskHours) * 100 : 0;
        return { ...link, percentage: recalcPercentage, isModified: true };
      }));
      return;
    }
    const newPercentage = taskHours > 0 ? (calculatedHours / taskHours) * 100 : 0;
    setEmployeeLinks(prev => prev.map(link =>
      link.employeeId === employeeId
        ? { ...link, workDays: newDays, workHours: calculatedHours, percentage: newPercentage, isModified: true }
        : link
    ));
  };

  const removeReceiver = (receiverId: number) => {
    const employee=activeLinks.find(emp => emp.employeeId === receiverId);
    if(employee?.hoursActual && employee.hoursActual>0){
      showMessage('לא ניתן למחוק עובד שדווח שעות על משימה', 'אזהרה', 'warning');
      return;
    }
    const receiverName = availableEmployees.find(emp => emp.id === receiverId)?.name;
    setEmployeeLinks(prev =>
      prev.map(link =>
        link.employeeId === receiverId ? { ...link, isDeleted: true, isModified: true } : link
      )
    );
    setEditedTask(prev => ({
      ...prev,
      receivers: (prev.receivers ?? []).filter(r => r !== receiverName)
    }));
  };

  const addReceiver = () => {
    const currentReceivers = editedTask.receivers ?? [];
    if (newReceiver && !currentReceivers.includes(newReceiver.name)) {
      setEditedTask({ ...editedTask, receivers: [...currentReceivers, newReceiver.name] });
      setEmployeeLinks(prev => ([...prev, {
        linkId: editedTask.id, id: 0, employeeId: newReceiver.id, employeeName: newReceiver.name,
        percentage: 0, workHours: 0, workDays: 0, duration: 0, statusId: editedTask.statuID ?? 0,
        isNew: true, isModified: true
      }]));
      setNewReceiver(null);
    }
  };

  const isTaskClosed = editedTask.isClosed === true;
  const canEditFull = viewMode === 'allTasks' ;
  // const canEditStatus = (viewMode === 'myTasks' || viewMode === 'allTasks') &&
  //  !isTaskClosed
  
  const isDependentOnPrevious = dependsOnData?.isDependentOnPrevious
    ?? editedTask.dependsOnTaskID
    ?? editedTask.dependsOnStepID;

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const data = await getEmployees();
        setAvailableEmployees(data);
      } catch (error) {
        console.error('Failed to load employees:', error);
      }
    };
    loadEmployees();
  }, []);

  useEffect(() => {
    setEditedTask(task);
    setTaskStepHoursCascade(null);
    setTaskParentDateCascade(null);
    setCascadeStageUpdate(null);
  }, [task.id]);

  const applyEmployeeLinksFromTaskHours = (h: number) => {
    setEmployeeLinks(prev =>
      prev.map(link => {
        const eh = h * (link.percentage ?? 0) / 100;
        return { ...link, workHours: eh, workDays: eh / WORK_HOURS_PER_DAY, isModified: true };
      })
    );
  };

  const validateTaskAgainstParentLimits = async (
    candidateHours: number,
    candidateDays: number,
    candidateDuration: number,
    source: 'hours' | 'days' | 'duration'
  ): Promise<boolean> => {
    if (editedTask.isPlanningSte) return true;

    const dep = dependsOnData as DependsOnTaskData | null;
    let parentHours = dep?.parentStep_WorkHours ?? planStepListTask?.workHours;
    const parentStepId = planStepListTask?.id ?? dep?.parentStepID;
    if (source === 'hours' && parentHours != null && candidateHours > parentHours + HOURS_EPS) {
      const ok = await openConfirm(
        `שעות המשימה (${round2(candidateHours)}) גבוהות משעות השלב (${round2(parentHours)}).\n\n` +
        `האם לעדכן את שעות השלב ל־${round2(candidateHours)}?`,
        'אישור שעות לשלב'
      );
      if (!ok) return false;
      if (parentStepId != null) {
        setTaskStepHoursCascade(prev => ({
          stepId: parentStepId,
          newStepWorkHours: round2(candidateHours),
          taskUpdates: [
            ...(prev?.taskUpdates?.filter(t => t.id !== editedTask.id) ?? []),
            {
              id: editedTask.id,
              workHours: round2(candidateHours),
              workDays: round2(candidateHours / WORK_HOURS_PER_DAY),
              percentage: round2(editedTask.percentage ?? 0)
            }
          ]
        }));
      }
      parentHours = candidateHours;
    }

    const parentDays = parentHours != null ? parentHours / WORK_HOURS_PER_DAY : undefined;
    if (source === 'days' && parentDays != null && candidateDays > parentDays + HOURS_EPS) {
      const requiredHours = candidateDays * WORK_HOURS_PER_DAY;
      const ok = await openConfirm(
        `ימי המשימה (${round2(candidateDays)}) גבוהים מימי השלב (${round2(parentDays)}).\n\n` +
        `האם לעדכן את שעות השלב ל־${round2(requiredHours)} (${round2(candidateDays)} ימים)?`,
        'אישור ימי שלב'
      );
      if (!ok) return false;
      if (parentStepId != null) {
        setTaskStepHoursCascade(prev => ({
          stepId: parentStepId,
          newStepWorkHours: round2(requiredHours),
          taskUpdates: [
            ...(prev?.taskUpdates?.filter(t => t.id !== editedTask.id) ?? []),
            {
              id: editedTask.id,
              workHours: round2(candidateHours),
              workDays: round2(candidateDays),
              percentage: round2(editedTask.percentage ?? 0)
            }
          ]
        }));
      }
      parentHours = requiredHours;
    }

    const parentStart = toComparableIsoDate(dep?.parentStep_StartDate ?? planStepListTask?.startDate ?? null);
    const parentEnd = toComparableIsoDate(dep?.parentStep_EndDate ?? planStepListTask?.endDate ?? null);
    if (parentStart && parentEnd) {
      const parentDuration = Math.max(1, inclusiveSpanDays(parentStart, parentEnd));
      if (source === 'duration' && candidateDuration > parentDuration) {
        const ok = await openConfirm(
          `משך המשימה (${candidateDuration} ימים) גבוה ממשך השלב (${parentDuration} ימים).\n\n` +
          `האם לעדכן את משך השלב ל־${candidateDuration} ימים?`,
          'אישור משך שלב'
        );
        if (!ok) return false;
        if (parentStepId != null) {
          const newParentEnd = addCalendarDaysIso(parentStart, Math.max(0, candidateDuration - 1));
          const nextParentHours = round2(parentHours ?? 0);
          setTaskParentDateCascade({
            stepId: parentStepId,
            startDate: parentStart,
            endDate: newParentEnd,
            duration: candidateDuration,
            workHours: nextParentHours,
            workDays: round2(nextParentHours / WORK_HOURS_PER_DAY)
          });
        }
      }
    }

    return true;
  };

  const handleTaskWorkHoursChange = async (
    rawH: number,
    source: 'hours' | 'days' = 'hours'
  ): Promise<boolean> => {
    const h = Math.max(0, rawH);
    const d = h / WORK_HOURS_PER_DAY;
    const dep = dependsOnData as DependsOnTaskData | null;
    const parentStepId = planStepListTask?.id ?? dep?.parentStepID;
    const hasParentStepContext = parentStepId != null;
    const curStart = toComparableIsoDate(editedTask.startDate || editedTask.creatDate);
    const curEnd = toComparableIsoDate(editedTask.endDate) || curStart;
    const durationCandidate =
      editedTask.duration != null && editedTask.duration > 0
        ? Math.floor(editedTask.duration)
        : curStart && curEnd
          ? Math.max(1, inclusiveSpanDays(curStart, curEnd))
          : 1;
    if (!editedTask.isPlanningSte && hasParentStepContext) {
      if (!(await validateTaskAgainstParentLimits(h, d, durationCandidate, source))) return false;
    }

    if (editedTask.isPlanningSte) {
      setTaskStepHoursCascade(null);
      setEditedTask(prev => ({ ...prev, workHours: h, workDays: h / WORK_HOURS_PER_DAY }));
      applyEmployeeLinksFromTaskHours(h);
      return true;
    }

    const stepId = planStepListTask?.id ?? dep?.parentStepID;
    const stepH = planStepListTask?.workHours ?? dep?.parentStep_WorkHours ?? 0;
    if (stepId == null) {
      setTaskStepHoursCascade(null);
      setEditedTask(prev => ({ ...prev, workHours: h, workDays: h / WORK_HOURS_PER_DAY }));
      applyEmployeeLinksFromTaskHours(h);
      return true;
    }

    const baseList = tasksInSameStep && tasksInSameStep.length > 0 ? tasksInSameStep : [editedTask];
    const list = baseList.some(t => t.id === editedTask.id)
      ? baseList
      : [...baseList, editedTask];
    const withNewHours = list.map(t =>
      t.id === editedTask.id ? { ...t, workHours: h, workDays: h / WORK_HOURS_PER_DAY } : t
    );
    const newTotal = withNewHours.reduce((s, t) => s + (t.workHours ?? 0), 0);

    let denom = stepH;
    if (newTotal > stepH + HOURS_EPS) {
      const ok = await openConfirm(
        `הסה"כ הוא ${round2(newTotal)} שעות, גבוה משעות השלב (${round2(stepH)}).\n\n` +
        `האם לעדכן את שלב הפרויקט ל־${round2(newTotal)} שעות ולחלק מחדש את האחוזים בין המשימות?`,
        'אישור שעות לשלב'
      );
      if (!ok) return false;
      denom = newTotal;
    }

    if (denom <= 0) {
      const taskUpdates: TaskStepHoursCascade['taskUpdates'] = withNewHours.map(t => {
        const wh = t.workHours ?? 0;
        return {
          id: t.id,
          workHours: wh,
          workDays: wh / WORK_HOURS_PER_DAY,
          percentage: 0
        };
      });
      setTaskStepHoursCascade({
        stepId,
        newStepWorkHours: 0,
        taskUpdates
      });
      const mine = taskUpdates.find(x => x.id === editedTask.id);
      if (mine) {
        setEditedTask(prev => ({ ...prev, workHours: mine.workHours, workDays: mine.workDays, percentage: 0 }));
        applyEmployeeLinksFromTaskHours(mine.workHours);
      } else {
        setEditedTask(prev => ({ ...prev, workHours: h, workDays: h / WORK_HOURS_PER_DAY, percentage: 0 }));
        applyEmployeeLinksFromTaskHours(h);
      }
      return true;
    }

    const taskUpdates: TaskStepHoursCascade['taskUpdates'] = withNewHours.map(t => {
      const wh = t.workHours ?? 0;
      return {
        id: t.id,
        workHours: wh,
        workDays: wh / WORK_HOURS_PER_DAY,
        percentage: round2((wh / denom) * 100)
      };
    });
    setTaskStepHoursCascade({
      stepId,
      newStepWorkHours: round2(denom),
      taskUpdates
    });
    const mine = taskUpdates.find(x => x.id === editedTask.id);
    if (mine) {
      setEditedTask(prev => ({ ...prev, workHours: mine.workHours, workDays: mine.workDays, percentage: mine.percentage }));
      applyEmployeeLinksFromTaskHours(mine.workHours);
    }
    return true;
  };

  const handleTaskWorkDaysChange = async (rawD: number): Promise<boolean> => {
    const d = Math.max(0, rawD);
    const h = d * WORK_HOURS_PER_DAY;
    return handleTaskWorkHoursChange(h, 'days');
  };

  const handleSave = async () => {
    const options: TaskCardSaveOptions | undefined = (() => {
      if (!cascadeStageUpdate && !taskStepHoursCascade && !taskParentDateCascade) return undefined;
      const o: TaskCardSaveOptions = {};
      
      if (cascadeStageUpdate) o.cascadeStage = cascadeStageUpdate;
      if (taskStepHoursCascade) o.taskStepHoursCascade = taskStepHoursCascade;
      if (taskParentDateCascade) o.taskParentDateCascade = taskParentDateCascade;
      return o;
    })();

    let taskToSave = editedTask;
    if (attachmentsHavePendingChanges(taskAttachments)) {
      try {
        const fresh = await persistAttachmentsAsync(taskAttachments);
        setTaskAttachments(fresh);
        taskToSave = { ...editedTask, attachments: fresh };
        setEditedTask(prev => ({ ...prev, attachments: fresh }));
      } catch (error) {
        console.error('Failed to save attachments:', error);
        showMessage('שגיאה בשמירת קבצים וקישורים', 'שגיאה', 'error');
        return;
      }
    }

    if (onUpdate) onUpdate(taskToSave, employeeLinks, options);
    onClose();
  };

  const handleOpenChat = () => {
    setChatTask(editedTask);
  };

  const handleCloseChat = () => {
    if (chatTask?.hasChat) {
      setEditedTask(prev => ({ ...prev, hasChat: true }));
    }
    setChatTask(null);
  };

  const handleSaveAttachments = async (attachments: PlanningAttachment[]) => {
    try {
      const fresh = await persistAttachmentsAsync(attachments);
      setTaskAttachments(fresh);
      setEditedTask(prev => ({ ...prev, attachments: fresh }));
      setShowAttachModal(false);
    } catch (error) {
      console.error('Failed to save attachments:', error);
      showMessage('שגיאה בשמירת קבצים וקישורים', 'שגיאה', 'error');
    }
  };

  const handleDelete = async () => {
    if(editedTask.hourReport && editedTask.hourReport>0){
      showMessage('לא ניתן למחוק עובד שדווח שעות על משימה', 'אזהרה', 'warning');
      return;
    }
    const confirmed = await openConfirm('האם אתה בטוח שברצונך למחוק משימה זו?');
    if (!confirmed) return;
    await deleteTaskOrStageAsync(editedTask.id, !editedTask.isPlanningSte);
    onClose();
  };

  const statusKeyFromName = (statusName: string) => {
    const value = statusName.toLowerCase();
    if (value.includes('done') || value.includes('הושלם') || value.includes('סגור')) return 'done';
    if (value.includes('progress') || value.includes('בביצוע')) return 'inProgress';
    return 'todo';
  };

  const urgencyKeyFromName = (urgencyName: string) => {
    const value = urgencyName.toLowerCase();
    if (value.includes('high') || value.includes('גבוה')) return 'high';
    if (value.includes('medium') || value.includes('בינונית')) return 'medium';
    return 'low';
  };

  const getStatusColor = (statusName: string) => {
    switch (statusKeyFromName(statusName)) {
      case 'done': return 'bg-green-50 text-green-700 border-green-200';
      case 'inProgress': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const getUrgencyColor = (urgencyName: string) => {
    switch (urgencyKeyFromName(urgencyName)) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const safeConvertToInputDate = (dateStr?: string) => {
    if (!dateStr) return '';
    if (dateStr.includes('-')) {
      // Keep plain ISO date as-is to avoid timezone day-shift.
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
      const date = new Date(dateStr);
      if (Number.isNaN(date.getTime())) return '';
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    const parts = dateStr.split('/');
    if (parts.length !== 3) return '';
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  const convertToDisplayDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const toComparableIsoDate = (value?: string | null): string | null => {
    if (value == null || value === '') return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const addCalendarDaysIso = (isoYmd: string, daysToAdd: number): string => {
    const [y, m, d] = isoYmd.split('-').map(Number);
    if (!y || !m || !d) return isoYmd;
    const dt = new Date(y, m - 1, d + daysToAdd);
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  };

  const inclusiveSpanDays = (startIso: string, endIso: string): number => {
    const a = toComparableIsoDate(startIso);
    const b = toComparableIsoDate(endIso);
    if (a == null || b == null) return 1;
    const [y1, m1, d1] = a.split('-').map(Number);
    const [y2, m2, d2] = b.split('-').map(Number);
    const t0 = new Date(y1, m1 - 1, d1).getTime();
    const t1 = new Date(y2, m2 - 1, d2).getTime();
    return Math.round((t1 - t0) / 86_400_000) + 1;
  };

  const minStartDateFromDependency =
    dependsOnData != null && dependsOnData.dependsOnID != null
      ? toComparableIsoDate(dependsOnData.dependsOn_EndDate)
        ?? toComparableIsoDate(dependsOnData.dependsOn_StartDate)
      : null;

  const patchDependedByInState = (newDepStart: string, newDepEnd: string) => {
    setDependsOnData(prev => {
      if (!prev) return prev;
      return { ...prev, dependedBy_StartDate: newDepStart, dependedBy_EndDate: newDepEnd };
    });
  };

  const getParentStepForTask = (): { stepId: number; start: string; end: string } | null => {
    const pStart = planStepListTask
      ? toComparableIsoDate(planStepListTask.startDate)
      : toComparableIsoDate((dependsOnData as DependsOnTaskData | null | undefined)?.parentStep_StartDate);
    const pEnd = planStepListTask
      ? toComparableIsoDate(planStepListTask.endDate)
      : toComparableIsoDate((dependsOnData as DependsOnTaskData | null | undefined)?.parentStep_EndDate);
    const stepId = planStepListTask?.id ?? (dependsOnData as DependsOnTaskData | null | undefined)?.parentStepID;
    if (pStart && pEnd && stepId != null) {
      return { stepId, start: pStart, end: pEnd };
    }
    const d = dependsOnData as DependsOnTaskData | null | undefined;
    if (d?.parentStepID == null) return null;
    const a = toComparableIsoDate(d.parentStep_StartDate);
    const b = toComparableIsoDate(d.parentStep_EndDate);
    if (a == null || b == null) return null;
    return { stepId: d.parentStepID, start: a, end: b };
  };

  const earliestStartFromPredecessor = (): string | null => {
    if (dependsOnData?.dependsOnID == null) return null;
    const depEnd = toComparableIsoDate(dependsOnData.dependsOn_EndDate);
    if (depEnd) return addCalendarDaysIso(depEnd, 1);
    return toComparableIsoDate(dependsOnData.dependsOn_StartDate);
  };

  const computeDependedByReschedule = (
    myEndIso: string
  ): { id: number; startDate: string; endDate: string; duration: number } | null => {
    if (dependsOnData == null || dependsOnData.dependedByID == null) return null;
    const cS = toComparableIsoDate(dependsOnData.dependedBy_StartDate);
    const cE = toComparableIsoDate(dependsOnData.dependedBy_EndDate);
    if (cS == null || cE == null) return null;
    if (myEndIso < cS) return null;
    const nS = addCalendarDaysIso(myEndIso, 1);
    const span = inclusiveSpanDays(cS, cE);
    const nE = addCalendarDaysIso(nS, span - 1);
    return { id: dependsOnData.dependedByID, startDate: nS, endDate: nE, duration: span };
  };

  const computeStepRangeAfterTaskChange = (
    pS: string,
    pE: string,
    tS: string,
    tE: string,
    other: { startDate: string; endDate: string } | null
  ): { newPS: string; newPE: string } => {
    const sList: string[] = [pS, tS];
    const eList: string[] = [pE, tE];
    if (other) {
      sList.push(other.startDate);
      eList.push(other.endDate);
    }
    for (const tk of tasksInSameStep ?? []) {
      if (tk.id === editedTask.id) continue;
      if (other && dependsOnData?.dependedByID != null && tk.id === dependsOnData.dependedByID) {
        continue;
      }
      const s = toComparableIsoDate(tk.startDate || tk.creatDate);
      const e = toComparableIsoDate(tk.endDate);
      if (s) sList.push(s);
      if (e) eList.push(e);
    }
    return {
      newPS: sList.reduce((a, b) => (a < b ? a : b)),
      newPE: eList.reduce((a, b) => (a > b ? a : b))
    };
  };

  const applyTaskDatesWithParentCheck = async (tStart: string, tEnd: string) => {
    const tS = toComparableIsoDate(tStart) || tStart;
    const tE = toComparableIsoDate(tEnd) || tEnd;
    const dur = Math.max(1, inclusiveSpanDays(tS, tE));
    setCascadeStageUpdate(null);

    if (!(await validateTaskAgainstParentLimits(Math.max(0, editedTask.workHours ?? 0), Math.max(0, editedTask.workDays ?? 0), dur, 'duration'))) {
      return;
    }

    const mustStart = earliestStartFromPredecessor();
    if (mustStart != null && tS < mustStart) {
      showMessage('לא ניתן לבצע שינוי: תאריך ההתחלה מוקדם מדי ביחס למה שאתה תלוי בו (אחרי סיום התלות).', 'הודעה', 'warning');
      return;
    }

    const parent = getParentStepForTask();
    if (!parent) {
      setEditedTask(prev => ({ ...prev, startDate: tS, endDate: tE, duration: dur }));
      setTaskParentDateCascade(null);
      return;
    }

    const { start: pS, end: pE, stepId } = parent;
    const otherU = computeDependedByReschedule(tE);
    const oRange = otherU ? { startDate: otherU.startDate, endDate: otherU.endDate } : null;
    const { newPS, newPE } = computeStepRangeAfterTaskChange(pS, pE, tS, tE, oRange);

    if (!otherU && tS >= pS && tE <= pE) {
      setEditedTask(prev => ({ ...prev, startDate: tS, endDate: tE, duration: dur }));
      setTaskParentDateCascade(null);
      return;
    }

    const stepChanges = newPS !== pS || newPE !== pE;
    const parts: string[] = [];
    if (otherU) {
      parts.push('משימה שתלויה בך תתעדכן: תתחיל ביום העבודה שלאחר סיומך, עם אותו מספר ימי משימה.');
    }
    if (stepChanges) {
      parts.push(
        `תאריך השלב יתעדכן: ${convertToDisplayDate(newPS)} עד ${convertToDisplayDate(newPE)}.`
      );
    }
    if (parts.length === 0) {
      setEditedTask(prev => ({ ...prev, startDate: tS, endDate: tE, duration: dur }));
      setTaskParentDateCascade(null);
      return;
    }
    const ok = await openConfirm(`${parts.join('\n\n')}\n\nלאשר?`, 'עדכון תאריכים');
    if (!ok) return;

    setEditedTask(prev => ({ ...prev, startDate: tS, endDate: tE, duration: dur }));
    const nextParentDuration = Math.max(1, inclusiveSpanDays(newPS, newPE));
    const nextParentHours = round2(
      planStepListTask?.workHours
      ?? (dependsOnData as DependsOnTaskData | null | undefined)?.parentStep_WorkHours
      ?? 0
    );
    setTaskParentDateCascade({
      stepId,
      startDate: newPS,
      endDate: newPE,
      duration: nextParentDuration,
      workHours: nextParentHours,
      workDays: round2(nextParentHours / WORK_HOURS_PER_DAY),
      ...(otherU ? { otherTaskDateUpdates: [otherU] } : {})
    });
    if (otherU) {
      patchDependedByInState(otherU.startDate, otherU.endDate);
    }
  };

  /** שלב תכנון: אם "יש מי שתלוי בי" – השלב הבא מוגדר כמתחיל ביום שלאחר סיום זה, עם אותו מספר ימים (קלנדר) כמו היום. */
  const MSG_PLANNING_DEPENDENT_CASCADE = 'השינוי ישפיע על שלבים תלויים. האם לעדכן?';

  const setPlanningStepDates = (newStart: string, newEnd: string) => {
    const s = toComparableIsoDate(newStart) || newStart;
    const e = toComparableIsoDate(newEnd) || newEnd;
    const dur = Math.max(1, inclusiveSpanDays(s, e));
    setEditedTask(prev => ({ ...prev, startDate: s, endDate: e, duration: dur }));
  };

  const applyPlanningStepDependedByCascade = async (newThisStart: string, newThisEnd: string) => {
    setTaskParentDateCascade(null);
    if (!dependsOnData?.dependedByID) {
      setPlanningStepDates(newThisStart, newThisEnd);
      setCascadeStageUpdate(null);
      return;
    }

    const depStart = toComparableIsoDate(dependsOnData.dependedBy_StartDate);
    const depEnd = toComparableIsoDate(dependsOnData.dependedBy_EndDate);
    if (!depStart || !depEnd) {
      setPlanningStepDates(newThisStart, newThisEnd);
      setCascadeStageUpdate(null);
      return;
    }

    const thisEnd = toComparableIsoDate(newThisEnd) || newThisEnd;
    const requiredDepStart = addCalendarDaysIso(thisEnd, 1);
    if (requiredDepStart === depStart) {
      setPlanningStepDates(newThisStart, newThisEnd);
      setCascadeStageUpdate(null);
      return;
    }

    const ok = await openConfirm(MSG_PLANNING_DEPENDENT_CASCADE);
    if (!ok) return;

    const span = inclusiveSpanDays(depStart, depEnd);
    const newDepEnd = addCalendarDaysIso(requiredDepStart, span - 1);

    setPlanningStepDates(newThisStart, newThisEnd);
    setCascadeStageUpdate({
      id: dependsOnData.dependedByID,
      startDate: requiredDepStart,
      endDate: newDepEnd,
    });
    patchDependedByInState(requiredDepStart, newDepEnd);
  };

  const handleDurationChange = async (nextValue: number) => {
    const dur = Math.max(1, Math.floor(nextValue || 1));
    setTaskStepHoursCascade(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        duration: dur
      };
    });
    if (!editedTask.isPlanningSte) {
      const startIso = toComparableIsoDate(editedTask.startDate || editedTask.creatDate);
      if (!startIso) {
        setEditedTask(prev => ({ ...prev, duration: dur }));
        return;
      }
      const endIso = addCalendarDaysIso(startIso, dur - 1);
      await applyTaskDatesWithParentCheck(startIso, endIso);
      return;
    }

    const startKeep = toComparableIsoDate(editedTask.startDate || editedTask.creatDate);
    if (!startKeep) {
      setEditedTask(prev => ({ ...prev, duration: dur }));
      return;
    }
    const newEnd = addCalendarDaysIso(startKeep, dur - 1);
    await applyPlanningStepDependedByCascade(startKeep, newEnd);
  };

  const handleStartDateChange = async (nextValue: string) => {
    if (!editedTask.isPlanningSte) {
      if (nextValue === '') {
        setEditedTask(prev => ({ ...prev, startDate: nextValue }));
        setTaskParentDateCascade(null);
        return;
      }
      const candidateStart = toComparableIsoDate(nextValue) || nextValue;
      const currentEnd = toComparableIsoDate(editedTask.endDate);
      if (currentEnd && candidateStart > currentEnd) {
        showMessage('תאריך התחלה לא יכול להיות גדול מתאריך סיום', 'הודעה', 'warning');
        return;
      }
      const curStart = toComparableIsoDate(editedTask.startDate || editedTask.creatDate) || nextValue;
      const curEnd = toComparableIsoDate(editedTask.endDate) || curStart;
      const fromSpan = inclusiveSpanDays(curStart, curEnd);
      const rawDur =
        editedTask.duration != null && editedTask.duration > 0
          ? Math.floor(editedTask.duration)
          : fromSpan;
      const durDays = Math.max(1, rawDur);
      const startNorm = toComparableIsoDate(nextValue) || nextValue;
      const newEnd = addCalendarDaysIso(startNorm, durDays - 1);
      await applyTaskDatesWithParentCheck(startNorm, newEnd);
      return;
    }

    if (nextValue === '') {
      setEditedTask(prev => ({ ...prev, startDate: nextValue }));
      setCascadeStageUpdate(null);
      return;
    }

    if (
      dependsOnData?.dependsOnID != null
      && minStartDateFromDependency != null
      && (toComparableIsoDate(nextValue) || nextValue) < minStartDateFromDependency
    ) {
      showMessage('לא ניתן לשנות – קיימת תלות בשלב קודם', 'הודעה', 'warning');
      return;
    }
    const candidateStart = toComparableIsoDate(nextValue) || nextValue;
    const currentEnd = toComparableIsoDate(editedTask.endDate);
    if (currentEnd && candidateStart > currentEnd) {
      showMessage('תאריך התחלה לא יכול להיות גדול מתאריך סיום', 'הודעה', 'warning');
      return;
    }

    const curStart = toComparableIsoDate(editedTask.startDate || editedTask.creatDate) || nextValue;
    const curEnd = toComparableIsoDate(editedTask.endDate) || curStart;
    const fromSpan = inclusiveSpanDays(curStart, curEnd);
    const rawDur =
      editedTask.duration != null && editedTask.duration > 0
        ? Math.floor(editedTask.duration)
        : fromSpan;
    const durDays = Math.max(1, rawDur);
    const startNorm = toComparableIsoDate(nextValue) || nextValue;
    const newEnd = addCalendarDaysIso(startNorm, durDays - 1);
    await applyPlanningStepDependedByCascade(startNorm, newEnd);
  };

  const handleEndDateChange = async (nextValue: string) => {
    if (!editedTask.isPlanningSte) {
      if (!nextValue) {
        setEditedTask(prev => ({ ...prev, endDate: nextValue }));
        setTaskParentDateCascade(null);
        setCascadeStageUpdate(null);
        return;
      }
      const startIso = toComparableIsoDate(editedTask.startDate || editedTask.creatDate) || nextValue;
      const endIso = toComparableIsoDate(nextValue) || nextValue;
      if (startIso > endIso) {
        showMessage('תאריך התחלה לא יכול להיות גדול מתאריך סיום', 'הודעה', 'warning');
        return;
      }
      await applyTaskDatesWithParentCheck(startIso, endIso);
      return;
    }
    if (!nextValue) {
      setEditedTask(prev => ({ ...prev, endDate: nextValue }));
      setCascadeStageUpdate(null);
      return;
    }
    const startKeep = toComparableIsoDate(editedTask.startDate || editedTask.creatDate) || nextValue;
    const newEnd = toComparableIsoDate(nextValue) || nextValue;
    if (startKeep > newEnd) {
      showMessage('תאריך התחלה לא יכול להיות גדול מתאריך סיום', 'הודעה', 'warning');
      return;
    }
    await applyPlanningStepDependedByCascade(startKeep, newEnd);
  };

  const getStatusColorByKey = (statusId: number) => {
    const status = statuses.find(s => s.id === statusId);
    const color = status?.color ?? '';
    return color ? ({ color, stroke: color } as React.CSSProperties) : undefined;
  };

  const getEmployeeStatusName = (statusId?: number) => {
    if (statusId === undefined || statusId === null) return '-';
    return statuses.find(s => s.id === statusId)?.name ?? '-';
  };

  //const updatedAt = task.lastUpdate ?? '-';

  const activeLinks = employeeLinks.filter(l => !l.isDeleted);
  const attachCount = taskAttachments.filter(a => !a.isDeleted).length;
  const totals = activeLinks.reduce(
    (acc, link) => ({
      percentage: acc.percentage + (link.percentage ?? 0),
      workHours: acc.workHours + (link.workHours ?? 0),
      hoursActual: acc.hoursActual + (link.hoursActual ?? 0),
      workDays: acc.workDays + (link.workDays ?? 0),
      duration: acc.duration + (link.duration ?? 0)
    }),
    { percentage: 0, workHours: 0, hoursActual: 0, workDays: 0, duration: 0 }
  );

  const formatNumberUpTo2 = (value: number) => {
    if (!Number.isFinite(value)) return '0';
    const truncated = Math.trunc(value * 100) / 100;
    return Number.isInteger(truncated) ? String(truncated) : truncated.toFixed(2);
  };

  const [activeTab, setActiveTab] = useState<'info' | 'employees'>('info');
  const fmt = formatNumberUpTo2;
  const truncateTo16 = (value?: string) => {
    const text = (value ?? '').trim();
    return text.length > 16 ? `${text.slice(0, 16)}...` : text;
  };

  // ── shared style tokens ──────────────────────────────────────────────────
  const lbl = 'block text-xs text-gray-400 dark:text-gray-400 mb-1';
  const readBox = 'w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700';
  const inputCls = 'w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-400';
  // ────────────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="modal-shell dark-surface bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col" style={{ maxHeight: '90vh' }}>

          {/* ── Header ── */}
          <div className="flex-shrink-0 bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-3 rounded-t-2xl flex items-center justify-between">
            <span className="text-white font-semibold text-sm">כרטיס משימה – {editedTask.name}</span>
            {/* {createdAt !== '-' && <span className="text-emerald-100 text-xs">נוצר: {createdAt}</span>
            } */}
            <button onClick={onClose} className="p-1.5 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all">
              <X size={18} className="text-white" />
            </button>
          </div>

          {/* ── Scrollable body ── */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">

            {/* תיאור המשימה — full width, נוצר inline with label */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-gray-400">תיאור המשימה</label>
                <span className="text-xs text-gray-400">
                  <span className="font-bold">עדכון ע"י:</span> {editedTask.updateByName || '-'} <span className="font-bold">בתאריך:</span> {(() => {
                    const sourceDate = editedTask.lastUpdate || editedTask.creatDate;
                    if (!sourceDate) return '-';
                    const d = new Date(sourceDate);
                    if (isNaN(d.getTime())) return sourceDate;
                    const pad = (n: number) => n.toString().padStart(2, '0');
                    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
                  })()}
                </span>
              </div>
              {canEditFull ? (
                <textarea
                  value={editedTask.subject}
                  rows={3}
                  onChange={e => setEditedTask({ ...editedTask, subject: e.target.value })}
                  className={`${inputCls} resize-none`}
                />
              ) : (
                <div className={`${readBox} min-h-[80px] leading-relaxed`}>{editedTask.subject}</div>
              )}
            </div>

            {/* יוצר המשימה + סגור — row below description */}
            <div className="grid grid-cols-4 gap-3">
              <div >
                <label className={lbl}>יוצר המשימה</label>
                <div className={readBox}>{editedTask.senderName}</div>
              </div>
              <div>
                <label className={lbl}>תלוי בשלב</label>
                <div className={readBox}>{isDependentOnPrevious ? 'כן' : 'לא'}</div>
              </div>
              <div>
                <label className={lbl}>שעות שדווחו</label>
                <div className={readBox}>{`${editedTask.hourReport ?? 0} ש'`}</div>
              </div>  
              <div>
              <label className="flex items-center gap-2 cursor-pointer pt-5">
                <input
                  type="checkbox"
                  checked={editedTask.isClosed}
                  onChange={e => setEditedTask({ ...editedTask, isClosed: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500"
                />
                <span className="text-sm font-semibold text-gray-700">נבדק</span>
              </label>
              </div>
            </div>

            {/* ── שורה 1: סטטוס | דחיפות | תלוי בשלב | שעות עבודה ── */}
            <div className="grid grid-cols-4 gap-3">
              {/* סטטוס */}
              <div>
                <label className={lbl}>סטטוס</label>
                {
                //canEditStatus &&
                     (editedTask.stepDependStatusID!=3||editedTask.taskDependStatusID!=3) ? (
                  <select
                    value={String(statuses.find(s => s.name === editedTask.statusName)?.id ?? editedTask.statuID ?? 0)}
                    onChange={e => { void (async () => {
                      const id = Number(e.target.value);
                      const name = statuses.find(s => s.id === id)?.name ?? editedTask.statusName;
                       if(viewMode==="myTasks"){
                        const user = authService.getCurrentUser();
                        setEmployeeLinks(prev =>
                          prev.map(link =>
                            link.employeeId === user.id ? { ...link, statusId: id, isModified: true } : link
                          )
                        );
                      }
                        else if (activeLinks.length > 0) {
                        const shouldUpdateEmployees = await openConfirm('האם לעדכן סטטוס לכל העובדים?', 'עדכון סטטוס עובדים');
                        if (shouldUpdateEmployees) {
                          setEmployeeLinks(prev =>
                            prev.map(link => (link.isDeleted ? link : { ...link, statusId: id, isModified: true }))
                          );
                        }
                        
                      }
                      
                      setEditedTask({ ...editedTask, statuID: id, statusName: name });
                    })(); }}
                    className={`${inputCls} font-medium cursor-pointer ${getStatusColor(editedTask.statusName)}`}
                    style={getStatusColorByKey(editedTask.statuID ?? 0)}
                  >
                    {editedTask.statuID === 0 && !statuses.some(s => s.name === editedTask.statusName) && (
                      <option value="0">{editedTask.statusName}</option>
                    )}
                    {statuses.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                  </select>
                ) : (
                  <div
                    title={editedTask.statusName}
                    className={`${readBox} font-medium text-center ${getStatusColor(editedTask.statusName)} truncate whitespace-nowrap overflow-hidden`}
                  >
                    {editedTask.statusName}
                  </div>
                )}
              </div>

              {/* דחיפות */}
              <div>
                <label className={lbl}>עדיפות</label>
                {canEditFull ? (
                  <select
                    value={editedTask.urgencyID ?? 0}
                    onChange={e => {
                      const id = Number(e.target.value);
                      const name = priorities.find(p => p.id === id)?.name ?? editedTask.urgencyName;
                      setEditedTask({ ...editedTask, urgencyID: id, urgencyName: name });
                    }}
                    className={`${inputCls} font-medium cursor-pointer ${getUrgencyColor(editedTask.urgencyName)}`}
                  >
                    {priorities.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                ) : (
                  <div
                    title={editedTask.urgencyName}
                    className={`${readBox} font-medium text-center ${getUrgencyColor(editedTask.urgencyName)} truncate whitespace-nowrap overflow-hidden`}
                  >
                    {editedTask.urgencyName}
                  </div>
                )}
              </div>

              {/* שעות עבודה */}
              <div>
                <label className={lbl}>שעות עבודה</label>
                {canEditFull ? (
                  <input
                    type="number" min="0" step="0.01"
                    value={editedTask.workHours ?? 0}
                    onChange={e => { void (async () => {
                      const h = Math.max(0, Number(e.target.value));
                      await handleTaskWorkHoursChange(h, 'hours');
                    })(); }}
                    className={`${inputCls} text-center`}
                  />
                ) : (
                  <div className={`${readBox} text-center`}>{editedTask.workHours}</div>
                )}
              </div>

              {/* ימי עבודה */}
              <div>
                <label className={lbl}>ימי עבודה</label>
                {canEditFull ? (
                  <input
                    type="number" min="0" step="0.001"
                    value={editedTask.workDays !== undefined ? Number(editedTask.workDays).toFixed(3) : '0.000'}
                    onChange={e => { void (async () => {
                      const d = Math.max(0, Number(e.target.value));
                      await handleTaskWorkDaysChange(d);
                    })(); }}
                    className={`${inputCls} text-center`}
                  />
                ) : (
                  <div className={`${readBox} text-center`}>{formatNumberUpTo2(editedTask.workDays ?? 0)}</div>
                )}
              </div>
            </div>

            {/* ── שורה 2: משך זמן | מתאריך | עד תאריך | צ'אט/קבצים ── */}
            <div className="grid grid-cols-4 gap-3">
              {/* משך זמן */}
              <div>
                <label className={lbl}>משך זמן</label>
                {canEditFull ? (
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={editedTask.duration ?? 1}
                    onChange={e => { void handleDurationChange(Number(e.target.value)); }}
                    className={`${inputCls} text-center`}
                  />
                ) : (
                  <div className={`${readBox} text-center`}>{editedTask.duration ?? '-'}</div>
                )}
              </div>

              {/* מתאריך */}
              <div>
                <label className={lbl}>מתאריך</label>
                {!isTaskClosed ? (
                  <input
                    type="date"
                    value={safeConvertToInputDate(editedTask.startDate || editedTask.creatDate) || ''}
                    min={dependsOnData?.dependsOnID != null && minStartDateFromDependency ? minStartDateFromDependency : undefined}
                    onChange={e => { void handleStartDateChange(e.target.value); }}
                    className={`${inputCls} text-center`}
                  />
                ) : (
                  <div className={`${readBox} text-center`}>
                    {(() => {
                      const iso = safeConvertToInputDate(editedTask.startDate || editedTask.creatDate);
                      return iso ? convertToDisplayDate(iso) : '-';
                    })()}
                  </div>
                )}
              </div>

              {/* עד תאריך */}
              <div>
                <label className={lbl}>עד תאריך</label>
                {!isTaskClosed ? (
                  <input
                    type="date"
                    value={safeConvertToInputDate(editedTask.endDate) || ''}
                    onChange={e => { void handleEndDateChange(e.target.value); }}
                    className={`${inputCls} text-center`}
                  />
                ) : (
                  <div className={`${readBox} text-center`}>
                    {(() => {
                      const iso = safeConvertToInputDate(editedTask.endDate);
                      return iso ? convertToDisplayDate(iso) : '-';
                    })()}
                  </div>
                )}
              </div>

              {/* צ'אט וקבצים */}
              <div className="grid grid-cols-2 gap-3">
                
                <div>
                <label className={lbl}>צ'אט</label>
                  <button
                    onClick={handleOpenChat}
                    className="relative p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
                    title="פתח צ'אט"
                  >
                    <MessageSquare size={14} />
                    {editedTask.hasChat && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white" />
                    )}
                  </button>
                  </div>
                  <div>
                  <label className={lbl}>קבצים</label>
                  <button
                    onClick={() => setShowAttachModal(true)}
                    className="relative p-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-all"
                    title="קבצים וקישורים"
                  >
                    <Paperclip size={14} />
                    {attachCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-0.5 bg-red-500 rounded-full border border-white text-[9px] font-bold text-white flex items-center justify-center">
                        {attachCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>

            </div>

            {/* ── Tabs: מידע כללי | עובדים ── */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              {/* Tab bar */}
              <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                {(['info', 'employees'] as const).map(tab => {
                  const labels: Record<string, string> = { info: 'מידע כללי', employees: 'עובדים' };
                  const isActive = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-5 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
                        isActive
                          ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-gray-800'
                          : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
                      }`}
                    >
                      {labels[tab]}
                      {tab === 'employees' && (
                        <span className={`mr-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                          isActive ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-200' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-300'
                        }`}>
                          {activeLinks.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Tab content */}
              <div className="p-2">

                {/* מידע כללי */}
                {activeTab === 'info' && (
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className={lbl}>שם פרויקט</label><div className={readBox}>{editedTask.projectName}</div></div>
                    <div><label className={lbl}>מספר פרויקט</label><div className={readBox}>P-{editedTask.id.toString().padStart(4, '0')}</div></div>
                    <div><label className={lbl}>פרויקט פעיל</label><div className={readBox}>{editedTask.isActive ? '✓ פעיל' : '✗ לא פעיל'}</div></div>
                    <div><label className={lbl}>נושא תכנון</label><div className={readBox}>{editedTask?.planningSubjectName}</div></div>
                    <div><label className={lbl}>מחלקה</label><div className={`${readBox} text-gray-400`}> {editedTask.studioDepartment===""?'לא הוגדר':editedTask.studioDepartment}</div></div>
                    <div><label className={lbl}>סוג פרויקט</label><div className={`${readBox} text-gray-400`}>{editedTask.projectType===""?'לא הוגדר':editedTask.projectType}</div></div>
                  </div>
                )}

                {/* עובדים */}
                {activeTab === 'employees' && (
                  <>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-3">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                            <th className="px-3 py-2 text-right font-medium text-gray-500">עובד</th>
                            <th className="px-3 py-2 text-center font-medium text-gray-500 min-w-[11rem]">סטטוס</th>
                            <th className="px-3 py-2 text-center font-medium text-gray-500">אחוז</th>
                            <th className="px-3 py-2 text-center font-medium text-gray-500">שעות עבודה</th>
                            <th className="px-3 py-2 text-center font-medium text-gray-500">שעות מדווחות</th>
                            <th className="px-3 py-2 text-center font-medium text-gray-500">ימי עבודה</th>
                            <th className="px-3 py-2 text-center font-medium text-gray-500">משך עבודה</th>
                            {canEditFull && <th className="px-3 py-2 w-8" />}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {activeLinks.map(link => (
                            <tr key={link.employeeId} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                              <td className="px-3 py-2 font-medium text-gray-800" title={link.employeeName}>
                                {truncateTo16(link.employeeName)}
                              </td>
                              <td className="px-3 py-2 text-center min-w-[11rem]">
                                {canEditFull ? (
                                  <select
                                    value={String(link.statusId ?? 0)}
                                    onChange={e => updateEmployeeLink(link.employeeId, { statusId: Number(e.target.value), isModified: true })}
                                    className="w-full min-w-[10rem] max-w-[14rem] px-2 py-1 text-center border border-gray-200 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                                    title={getEmployeeStatusName(link.statusId)}
                                  >
                                    <option value="0">-</option>
                                    {statuses.map(s => (
                                      <option key={s.id} value={String(s.id)} title={s.name}>
                                        {truncateTo16(s.name)}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span title={getEmployeeStatusName(link.statusId)}>
                                    {truncateTo16(getEmployeeStatusName(link.statusId))}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {canEditFull
                                  ? <input type="number" min="0" max="100" value={fmt(link.percentage)} onChange={e => updateEmployeePercentage(link.employeeId, Number(e.target.value))} className="w-16 px-2 py-1 text-center border border-gray-200 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100" />
                                  : <span>{fmt(link.percentage)}%</span>}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {canEditFull
                                  ? <input type="number" min="0" value={fmt(link.workHours)} onChange={e => updateEmployeeWorkHours(link.employeeId, Number(e.target.value))} className="w-16 px-2 py-1 text-center border border-gray-200 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100" />
                                  : <span>{fmt(link.workHours)}</span>}
                              </td>
                              <td className="px-3 py-2 text-center">{fmt(link.hoursActual ?? 0)}</td>
                              <td className="px-3 py-2 text-center">
                                {canEditFull
                                  ? <input type="number" min="0" value={fmt(link.workDays)} onChange={e => updateEmployeeWorkDays(link.employeeId, Number(e.target.value))} className="w-16 px-2 py-1 text-center border border-gray-200 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100" />
                                  : <span>{fmt(link.workDays)}</span>}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {canEditFull
                                  ? <input type="number" min="0" value={link.duration} onChange={e => {
                                      const v = Math.max(0, Number(e.target.value));
                                      if (v > (editedTask.duration ?? 0)) {
                                        showMessage('משך זמן חייב להיות קטן או שווה למשך זמן המשימה', 'אזהרה');
                                        return;
                                      }
                                      updateEmployeeLink(link.employeeId, { duration: v });
                                    }} className="w-16 px-2 py-1 text-center border border-gray-200 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100" />
                                  : <span>{link.duration}</span>}
                              </td>
                              {canEditFull && (
                                <td className="px-2 py-2 text-center">
                                  <button onClick={() => removeReceiver(link.employeeId)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-all">
                                    <Trash2 size={12} />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                          <tr className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 font-medium text-gray-700">
                            <td className="px-3 py-2">סה"כ</td>
                            <td className="px-3 py-2 text-center">-</td>
                            <td className="px-3 py-2 text-center">{fmt(totals.percentage)}%</td>
                            <td className="px-3 py-2 text-center">{fmt(totals.workHours)}</td>
                            <td className="px-3 py-2 text-center">{fmt(totals.hoursActual)}</td>
                            <td className="px-3 py-2 text-center">{fmt(totals.workDays)}</td>
                            <td className="px-3 py-2 text-center">{totals.duration}</td>
                            {canEditFull && <td />}
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {canEditFull && (
                      <div className="flex gap-2">
                        <select
                          value={newReceiver ? String(newReceiver.id) : ''}
                          onChange={e => setNewReceiver(availableEmployees.find(emp => emp.id === Number(e.target.value)) || null)}
                          className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                        >
                          <option value="">בחר עובד להוספה...</option>
                          {availableEmployees
                            .filter(emp => !(editedTask.receivers ?? []).includes(emp.name))
                            .map(emp => <option key={emp.id} value={String(emp.id)}>{emp.name}</option>)}
                        </select>
                        <button onClick={addReceiver} disabled={!newReceiver}
                          className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 transition-all flex items-center gap-1.5 text-sm font-medium">
                          <Plus size={14} /> הוסף
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="flex-shrink-0 flex gap-2 px-5 py-3 border-t border-gray-200 dark:border-gray-700 rounded-b-2xl bg-white dark:bg-gray-800">
            {canEditFull &&editedTask.hourReport<=0 && (
              <button onClick={handleDelete}
                className="px-4 py-2 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 text-sm font-medium transition-all flex items-center gap-1.5">
                <Trash2 size={14} /> מחק
              </button>
            )}
            <button onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-all">
              ביטול
            </button>
            <button onClick={() => { void handleSave(); }}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-2 rounded-lg hover:from-emerald-600 hover:to-teal-600 text-sm font-medium transition-all shadow-sm">
              שמירה
            </button>
          </div>

        </div>
      </div>

      <MessageBox
        isOpen={messageBox.isOpen} onClose={closeMessageBox}
        title={messageBox.title} message={messageBox.message} type={messageBox.type}
        confirmText={messageBox.confirmText ?? 'אישור'} cancelText={messageBox.cancelText ?? 'ביטול'}
        showCancel={messageBox.showCancel} onConfirm={messageBox.onConfirm} onCancel={messageBox.onCancel}
      />
      {chatTask && (
        <ChatModal
          task={chatTask}
          setTask={setChatTask}
          onClose={handleCloseChat}
        />
      )}
      {showAttachModal && (
        <AttachmentsModal
          entityType={attachmentEntityType}
          entityId={editedTask.id}
          entityName={editedTask.name || editedTask.subject}
          employees={activeLinks.map(l => ({ id: l.employeeId, name: l.employeeName }))}
          initialAttachments={taskAttachments}
          onSave={atts => { void handleSaveAttachments(atts); }}
          onClose={() => setShowAttachModal(false)}
        />
      )}
    </>
  );
}