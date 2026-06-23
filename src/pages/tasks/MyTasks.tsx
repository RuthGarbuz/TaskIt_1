import { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, AlertCircle, Eye, MessageSquare, Send, Filter, X, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { useTaskFilters } from '../../hooks/useTaskFilters';
import { useTaskGrouping } from '../../hooks/useTaskGrouping';
import TaskControls from './TaskControls';
import TaskCard from './TaskCard';
import ViewModal from '../../components/ViewModal';
import GanttChart from './GanttChart';
import HoursReportModal from '../hoursReport/HoursReportModal';
import type { EmployeeLink, SystemTable, TaskReview, TaskCardSaveOptions, TaskUpdatePatch } from '../../Data/projectsData';
import { getTaskPriorities, getTaskStatuses, updateStatusAsync, getMyTasks, updateIsClosedAsync, updateTaskAsync, findPlanStepRowInTasks, resolveParentStepStatusAsync, dedupeTaskReviews, taskReviewRowKey } from '../../services/taskService';
import ChatModal from '../tasks/ChatModal';
import authService from '../../services/authService';
import type { HoursReport } from '../../Data/HoursReportData';
import type { DBFilters } from '../../Data/tasksData';
import DateFilter from '../shared/DateFilter';
import SearchableCheckboxFilter from '../shared/SearchableCheckboxFilter';
import DbFilterModal, { getDefaultDBFilters } from './DbFilterModal';
import { usePersistedDbFilters } from '../../hooks/usePersistedDbFilters';
import {
  usePersistedSessionState,
  isTaskListViewMode,
  isGanttTimeframe,
  isTasksActiveView,
} from '../../hooks/usePersistedSessionState';
import HorizontalScrollContainer from '../../components/HorizontalScrollContainer';
import {
  TASK_FILTER_POPOVER,
  TASK_GROUP_CARD,
  TASK_HEADER_FILTER_BTN_INACTIVE,
  TASK_HEADER_TH_HOVER,
  TASK_SUMMARY_PANEL,
  TASK_TABLE_HEAD,
  TASK_TABLE_HEAD_CELL,
  TASK_TABLE_SHELL,
  TASK_TABLE_STICKY_CELL,
} from './taskViewTheme';
import MyTasksReportModal, { type ReportColumn } from './MyTasksReportModal';
import MessageBox from '../shared/MessageBox';
import {
  clearStatusMessageBoxFields,
  createOpenConfirm,
  createStepStatusSyncConfirm,
  type StatusMessageBoxState,
} from '../shared/statusSyncConfirm';
import PlanningBillRequestModal from './PlanningBillRequestModal';
import {
  COMPLETED_STATUS_ID,
  EMPLOYEE_STATUS_BLOCKED_WHEN_COMPLETED_MSG,
  planTableStatusChange,
} from './taskStatusChangeRules';

interface MyTasksProps {
  tasks: TaskReview[];
  onTaskUpdate: (updatedTask: TaskReview) => void;
  onTasksUpdate: (tasks: TaskReview[]) => void;
}

type StatusKey = 'todo' | 'inProgress' | 'done';
type ColumnFilterKey = 'isClosed' | 'project' | 'status' | 'urgency' | 'sender' | 'startDate' | 'endDate';

type SortKey = 'subject' | 'name' | 'planningSubjectName' | 'projectName' | 'statusName' | 'urgencyName' | 'senderName' | 'startDate' | 'endDate' | 'workHours' | 'utilizationPercentage';
type SortDir = 'asc' | 'desc' | null;
interface SortState { key: SortKey | null; dir: SortDir; }
const truncateTo18 = (value?: string) => {
  const text = (value ?? '').trim();
  return text.length > 18 ? `${text.slice(0, 18)}...` : text;
};

const MY_TASKS_REPORT_COLUMNS: ReportColumn[] = [
  { key: 'isClosed', label: 'נבדק', widthPx: 60, widthChars: 8, align: 'center' },
  { key: 'subject', label: 'תיאור משימה', widthPx: 220, widthChars: 30 },
  { key: 'hasChat', label: 'צ\'אט', widthPx: 60, widthChars: 8, align: 'center' },
  { key: 'stageName', label: 'שלב', widthPx: 150, widthChars: 22 },
  { key: 'planningSubject', label: 'נושא תכנון', widthPx: 160, widthChars: 24 },
  { key: 'project', label: 'פרויקט', widthPx: 170, widthChars: 24 },
  { key: 'status', label: 'סטטוס', widthPx: 110, widthChars: 14 },
  { key: 'urgency', label: 'עדיפות', widthPx: 95, widthChars: 12 },
  { key: 'sender', label: 'שולח', widthPx: 110, widthChars: 16 },
  { key: 'startDate', label: 'תאריך התחלה', widthPx: 100, widthChars: 12, align: 'center' },
  { key: 'endDate', label: 'תאריך סיום', widthPx: 100, widthChars: 12, align: 'center' },
  { key: 'dependsOnStep', label: 'תלוי שלב/משימה', widthPx: 130, widthChars: 16, align: 'center' },
  { key: 'workHoursBudget', label: 'תקצוב שעות', widthPx: 150, widthChars: 20 },
  { key: 'utilization', label: 'אחוז ניצול', widthPx: 100, widthChars: 14, align: 'center' },
  { key: 'hoursReported', label: 'דיווח שעות', widthPx: 100, widthChars: 14, align: 'center' },
  { key: 'invoiceIndicator', label: 'אינדקציה לחשבון', widthPx: 120, widthChars: 16, hideInPrint: true, align: 'center' }
];

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active || !dir) return <ChevronsUpDown size={11} className="text-gray-400" />;
  return dir === 'asc' ? <ChevronUp size={11} className="text-emerald-600" /> : <ChevronDown size={11} className="text-emerald-600" />;
}

function SortableTh({ sortKey, label, className, sort, onSort }: {
  sortKey: SortKey; label: string; className: string; sort: SortState; onSort: (k: SortKey) => void;
}) {
  return (
    <th className={`${className} cursor-pointer select-none ${TASK_HEADER_TH_HOVER} transition-colors`} onClick={() => onSort(sortKey)}>
      <div className="flex items-center gap-1">
        <span>{label}</span>
        <SortIcon active={sort.key === sortKey} dir={sort.key === sortKey ? sort.dir : null} />
      </div>
    </th>
  );
}

export default function MyTasks({ tasks, onTaskUpdate, onTasksUpdate }: MyTasksProps) {
  const [viewMode, setViewMode] = usePersistedSessionState('taskit.ui.myTasks.viewMode', 'list', isTaskListViewMode);
  const [ganttTimeframe, setGanttTimeframe] = usePersistedSessionState('taskit.ui.myTasks.ganttTimeframe', 'weekly', isGanttTimeframe);
  const [ganttTask, setGanttTask] = useState<TaskReview[]>([]);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [dbFilters, setDbFilters] = usePersistedDbFilters('taskit.dbFilters.myTasks', getDefaultDBFilters);
  const [activeView, setActiveView] = usePersistedSessionState('taskit.ui.myTasks.activeView', 'all', isTasksActiveView);
  const [selectedTask, setSelectedTask] = useState<TaskReview | null>(null);
  const taskCardStepContext = useMemo(() => {
    if (!selectedTask || selectedTask.isPlanningSte) {
      return { planStepListTask: undefined as TaskReview | undefined };
    }
    const stepKey = selectedTask.planningStepID;
    const step = findPlanStepRowInTasks(tasks, stepKey);
    return { planStepListTask: step };
  }, [selectedTask, tasks]);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatTask, setChatTask] = useState<TaskReview | null>(null);
  const [showHoursModal, setShowHoursModal] = useState(false);
  const [hoursTask, setHoursTask] = useState<TaskReview | null>(null);
  const [billRequestTask, setBillRequestTask] = useState<TaskReview | null>(null);
  const [statuses, setStatuses] = useState<SystemTable[]>([]);
  const [priorities, setPriorities] = useState<SystemTable[]>([]);
  const [openColumnFilter, setOpenColumnFilter] = useState<ColumnFilterKey | null>(null);
  const [columnFilterSearch, setColumnFilterSearch] = useState({ project: '', status: '', urgency: '', sender: '' });
  const [columnFilters, setColumnFilters] = useState({
    closedStates: [] as string[],
    projects: [] as string[], statuses: [] as number[], urgencies: [] as string[],
    senders: [] as string[], startDateFrom: '', startDateTo: '', endDateFrom: '', endDateTo: '',
  });
  const [showReportModal, setShowReportModal] = useState(false);
  const [messageBox, setMessageBox] = useState<StatusMessageBoxState>({ isOpen: false, title: '', message: '', type: 'alert' });

  const closeMessageBox = useCallback(() => {
    setMessageBox(prev => clearStatusMessageBoxFields(prev));
  }, []);

  const showMessage = (
    message: string,
    title = 'הודעה',
    type: 'alert' | 'success' | 'error' | 'warning' = 'alert',
  ) => {
    setMessageBox({ isOpen: true, title, message, type, confirmText: 'אישור' });
  };

  const openConfirm = useMemo(() => createOpenConfirm(setMessageBox, closeMessageBox), [closeMessageBox]);
  const openStepStatusSyncConfirm = useMemo(
    () => createStepStatusSyncConfirm(setMessageBox, closeMessageBox),
    [closeMessageBox],
  );

  const [parentStepStatusByStepId, setParentStepStatusByStepId] = useState<Record<number, number>>({});

  const [sort, setSort] = useState<SortState>({ key: null, dir: null });

  const handleSort = (key: SortKey) => {
    setSort(prev => {
      if (prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return { key: null, dir: null };
    });
  };

  const userId = authService.getCurrentUser()?.id ?? 0;

  const statusKeyFromName = (statusName: string): StatusKey => {
    const value = statusName.toLowerCase();
    if (value.includes('done') || value.includes('הושלם') || value.includes('סגור')) return 'done';
    if (value.includes('progress') || value.includes('בביצוע')) return 'inProgress';
    return 'todo';
  };

  const statusOptions = useMemo(() => statuses.map(s => ({ id: s.id, name: s.name })), [statuses]);
  const { searchQuery, setSearchQuery, filteredTasks, activeFiltersCount } = useTaskFilters(tasks, 'myTasks', '');

  const isTaskBlockedByDependency = (task: TaskReview): boolean => {

    // New backend signal: predecessor status for dependency chain.
    // Any value other than "3" means predecessor is not completed yet.
     // return task.stepDependStatusID !== 3||task.taskDependStatusID !== 3 &&( !task.stepDependStatusID &&!task.taskDependStatusID) ;
     if ( (task.stepDependStatusID === 3 || !task.stepDependStatusID)
&&   (task.taskDependStatusID === 3 || !task.taskDependStatusID)){
  return false;
}else{
  return true;
}

    }

  

  const toggleArrayFilter = <T,>(items: T[], value: T) =>
    items.includes(value) ? items.filter(i => i !== value) : [...items, value];

  const toComparableDate = (value?: string | null) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const matchesDateRange = (value: string | undefined | null, from: string, to: string) => {
    const d = toComparableDate(value);
    if (!d) return !from && !to;
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  };

  const projectFilterOptions = useMemo(() =>
    Array.from(new Set(tasks.map(t => t.projectName).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, 'he'))
      .map(p => ({ value: p, label: p })), [tasks]);

  const senderFilterOptions = useMemo(() =>
    Array.from(new Set(tasks.map(t => t.senderName).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, 'he'))
      .map(s => ({ value: s, label: s })), [tasks]);

  const urgencyFilterOptions = useMemo(() =>
    Array.from(new Set(tasks.map(t => t.urgencyName).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, 'he'))
      .map(u => ({ value: u, label: u })), [tasks]);

  const statusFilterOptions = useMemo(() => {
    const map = new Map<number, string>();
    tasks.forEach(t => {
      const id = t.statuID ?? 0;
      const name = t.statusName || statuses.find(s => s.id === id)?.name || `סטטוס ${id}`;
      if (!map.has(id)) map.set(id, name);
    });
    return Array.from(map, ([id, name]) => ({ value: id, label: name }))
      .sort((a, b) => a.label.localeCompare(b.label, 'he'));
  }, [tasks, statuses]);

  const closedStateOptions = useMemo(() => [
    { value: 'open', label: 'פתוח' },
    { value: 'closed', label: 'סגור' },
  ], []);

  const listTasks = useMemo(() => dedupeTaskReviews(filteredTasks), [filteredTasks]);

  const columnFilteredTasks = useMemo(() =>
    listTasks.filter(task => {
      const closedState = task.isClosed ? 'closed' : 'open';
      return (
        (columnFilters.closedStates.length === 0 || columnFilters.closedStates.includes(closedState)) &&
        (columnFilters.projects.length === 0 || columnFilters.projects.includes(task.projectName)) &&
        (columnFilters.statuses.length === 0 || columnFilters.statuses.includes(task.statuID ?? 0)) &&
        (columnFilters.urgencies.length === 0 || columnFilters.urgencies.includes(task.urgencyName)) &&
        (columnFilters.senders.length === 0 || columnFilters.senders.includes(task.senderName)) &&
        matchesDateRange(task.startDate, columnFilters.startDateFrom, columnFilters.startDateTo) &&
        matchesDateRange(task.endDate, columnFilters.endDateFrom, columnFilters.endDateTo)
      );
    }), [listTasks, columnFilters]);

  const sortTasks = (taskList: TaskReview[]) => {
    if (!sort.key || !sort.dir) return taskList;
    return [...taskList].sort((a, b) => {
      const key = sort.key!;
      let aVal: string | number = '';
      let bVal: string | number = '';
      if (key === 'startDate') { aVal = toComparableDate(a.startDate) ?? ''; bVal = toComparableDate(b.startDate) ?? ''; }
      else if (key === 'endDate') { aVal = toComparableDate(a.endDate) ?? ''; bVal = toComparableDate(b.endDate) ?? ''; }
      else if (key === 'workHours') { aVal = a.workHours ?? 0; bVal = b.workHours ?? 0; }
      else if (key === 'utilizationPercentage') { aVal = a.utilizationPercentage ?? 0; bVal = b.utilizationPercentage ?? 0; }
      else { aVal = (a[key as keyof TaskReview] as string | null | undefined) ?? ''; bVal = (b[key as keyof TaskReview] as string | null | undefined) ?? ''; }
      if (typeof aVal === 'number' && typeof bVal === 'number')
        return sort.dir === 'asc' ? aVal - bVal : bVal - aVal;
      const cmp = String(aVal).localeCompare(String(bVal), 'he', { sensitivity: 'base' });
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  };

  const groupedTasks = useTaskGrouping(columnFilteredTasks, activeView);

  const columnFilterCount =
    columnFilters.closedStates.length +
    columnFilters.projects.length + columnFilters.statuses.length +
    columnFilters.urgencies.length + columnFilters.senders.length +
    (columnFilters.startDateFrom ? 1 : 0) + (columnFilters.startDateTo ? 1 : 0) +
    (columnFilters.endDateFrom ? 1 : 0) + (columnFilters.endDateTo ? 1 : 0);

  const isColumnFilterActive = (filterKey: ColumnFilterKey) => {
    switch (filterKey) {
      case 'isClosed':  return columnFilters.closedStates.length > 0;
      case 'project':   return columnFilters.projects.length > 0;
      case 'status':    return columnFilters.statuses.length > 0;
      case 'sender':    return columnFilters.senders.length > 0;
      case 'urgency':   return columnFilters.urgencies.length > 0;
      case 'startDate': return Boolean(columnFilters.startDateFrom || columnFilters.startDateTo);
      case 'endDate':   return Boolean(columnFilters.endDateFrom || columnFilters.endDateTo);
      default: return false;
    }
  };
  const formatDateCell = (value?: string | null) => (value ? new Date(value).toLocaleDateString('en-GB') : '-');

  const getReportRows = () =>
    columnFilteredTasks.map((task) => {
      const util = task.utilizationPercentage ?? 0;
      const utilStr = util % 1 !== 0 ? util.toFixed(2) : String(Math.round(util));
      const reported = task.hourReport ?? 0;
      const workBudget =
        reported > 0
          ? `${task.workHours ?? 0}h (${reported}h בפועל)`
          : `${task.workHours ?? 0}h`;
      return {
        isClosed: task.isClosed ? 'כן' : 'לא',
        subject: task.subject ?? '',
        hasChat: task.hasChat ? 'כן' : 'לא',
        stageName: task.name ?? '',
        planningSubject: task.planningSubjectName ?? '',
        project: task.projectName ?? '',
        status: task.statusName ?? '',
        urgency: task.urgencyName ?? '',
        sender: task.senderName ?? '',
        startDate: formatDateCell(task.startDate),
        endDate: formatDateCell(task.endDate),
        dependsOnStep: task.dependsOnStepID ? 'כן' : 'לא',
        workHoursBudget: workBudget,
        utilization: `${utilStr}%`,
        hoursReported: reported > 0 ? String(reported) : '-',
        invoiceIndicator: '—'
      };
    });

  const downloadFile = (content: string, mimeType: string, extension: string) => {
    const datePart = new Date().toISOString().slice(0, 10);
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `my-tasks-report-${datePart}.${extension}`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    const content = JSON.stringify(getReportRows(), null, 2);
    downloadFile(content, 'application/json;charset=utf-8;', 'json');
  };

  const handleCopySummary = async () => {
    const closedCount = columnFilteredTasks.filter((task) => task.isClosed).length;
    const openCount = columnFilteredTasks.length - closedCount;
    const summary = `דוח משימות\nסה"כ: ${columnFilteredTasks.length}\nפתוחות: ${openCount}\nסגורות: ${closedCount}`;
    try {
      await navigator.clipboard.writeText(summary);
      alert('סיכום הדוח הועתק ללוח.');
    } catch {
      alert(summary);
    }
  };

  const handleOpenReportMenu = () => {
    setOpenColumnFilter(null);
    setShowReportModal(true);
  };
  const renderHeaderFilter = ({
    filterKey, label, headerClassName, contentClassName = 'w-72',
    align = 'right', sortKey, children,
  }: {
    filterKey: ColumnFilterKey; label: string; headerClassName: string;
    contentClassName?: string; align?: 'right' | 'center';
    sortKey?: SortKey; children: React.ReactNode;
  }) => (
    <th
      className={`${headerClassName} relative ${sortKey ? `cursor-pointer ${TASK_HEADER_TH_HOVER}` : ''}`}
      onClick={sortKey ? () => handleSort(sortKey) : undefined}
    >
      <div className={`flex items-center gap-1 ${align === 'center' ? 'justify-center' : 'justify-between'}`}>
        <div className="flex items-center gap-1">
          <span>{label}</span>
          {sortKey && <SortIcon active={sort.key === sortKey} dir={sort.key === sortKey ? sort.dir : null} />}
        </div>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); setOpenColumnFilter(current => current === filterKey ? null : filterKey); }}
          className={`p-1 rounded-md border transition-colors ${
            isColumnFilterActive(filterKey)
              ? 'bright-surface bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700'
              : TASK_HEADER_FILTER_BTN_INACTIVE
          }`}
          title={`סינון ${label}`}
        >
          <Filter size={12} />
        </button>
      </div>
      {openColumnFilter === filterKey && (
        <div
          className={`absolute mt-2 z-[9999] ${TASK_FILTER_POPOVER} ${contentClassName}`}
          style={{ top: '100%' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">סינון {label}</span>
            <button type="button" onClick={() => setOpenColumnFilter(null)} className="p-1 rounded-md text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700">
              <X size={14} />
            </button>
          </div>
          {children}
        </div>
      )}
    </th>
  );

  const loadTasks = async (isMounted: boolean, filters?: DBFilters) => {
    try {
      const data = await getMyTasks(
        filters?.dateFrom || null, filters?.dateTo || null,
        filters?.closedTasks === 'yes' ? true : filters?.closedTasks === 'no' ? false : undefined,
        {
          statusIds: filters?.status.length ? filters.status : undefined,
          priorityIds: filters?.urgency.length ? filters.urgency : undefined,
          projectIds: filters?.projects.length ? filters.projects : undefined,
          employeeIds: filters?.senders.length ? filters.senders : undefined,
        }
      );
      if (isMounted) onTasksUpdate(data ?? []);
    } catch (error) { console.error('Error loading my tasks:', error); }
  };

  const loadGanttTasks = async (isMounted: boolean, filters?: DBFilters) => {
    try {
      const data = await getMyTasks(null, null,
        filters?.closedTasks === 'yes' ? true : filters?.closedTasks === 'no' ? false : undefined,
        {
          statusIds: filters?.status.length ? filters.status : undefined,
          priorityIds: filters?.urgency.length ? filters.urgency : undefined,
          projectIds: filters?.projects.length ? filters.projects : undefined,
          employeeIds: filters?.senders.length ? filters.senders : undefined,
        }
      );
      if (isMounted) setGanttTask(data ?? []);
    } catch (error) { console.error('Error loading gantt tasks:', error); if (isMounted) setGanttTask([]); }
  };

  const reloadPageTasks = async () => {
    await loadTasks(true, dbFilters);
    if (viewMode === 'gantt') await loadGanttTasks(true, dbFilters);
  };

  useEffect(() => {
    let isMounted = true;
    const loadStatuses = async () => {
      try { const data = await getTaskStatuses(); if (isMounted) setStatuses(data ?? []); }
      catch { if (isMounted) setStatuses([]); }
    };
    const loadPriorities = async () => {
      try { const data = await getTaskPriorities(); if (isMounted) setPriorities(data ?? []); }
      catch { if (isMounted) setPriorities([]); }
    };
    loadTasks(isMounted, dbFilters);
    loadStatuses();
    loadPriorities();
    const intervalId = window.setInterval(() => loadTasks(true, dbFilters), 60000);
    return () => { isMounted = false; window.clearInterval(intervalId); };
  }, [onTasksUpdate, dbFilters]);

  useEffect(() => {
    let isMounted = true;
    if (viewMode !== 'gantt') return () => { isMounted = false; };
    loadGanttTasks(isMounted, dbFilters);
    const intervalId = window.setInterval(() => loadGanttTasks(true, dbFilters), 60000);
    return () => { isMounted = false; window.clearInterval(intervalId); };
  }, [viewMode, dbFilters]);

  useEffect(() => {
    let cancelled = false;
    const loadParentStepStatuses = async () => {
      const stepIds = [...new Set(
        tasks.filter(t => !t.isPlanningSte && t.planningStepID > 0).map(t => t.planningStepID),
      )];
      if (stepIds.length === 0) {
        if (!cancelled) setParentStepStatusByStepId({});
        return;
      }
      const next: Record<number, number> = {};
      await Promise.all(stepIds.map(async stepId => {
        const sampleTask = tasks.find(t => !t.isPlanningSte && t.planningStepID === stepId);
        if (!sampleTask) return;
        const stepRow = findPlanStepRowInTasks(tasks, stepId);
        if (stepRow?.statuID != null && stepRow.statuID > 0) {
          next[stepId] = stepRow.statuID;
          return;
        }
        try {
          const statusId = await resolveParentStepStatusAsync(sampleTask, {
            planStepListTask: stepRow ?? null,
            contextTasks: tasks,
          });
          if (statusId != null && statusId > 0) next[stepId] = statusId;
        } catch {
          /* keep without entry */
        }
      }));
      if (!cancelled) setParentStepStatusByStepId(next);
    };
    void loadParentStepStatuses();
    return () => { cancelled = true; };
  }, [tasks]);

  const handleTaskStatusChange = async (task: TaskReview, statusId: number) => {
    if (statusId === (task.statuID ?? 0)) return;

    if (isTaskBlockedByDependency(task)) {
      showMessage('המשימה תלויה במשימה/שלב קודם שטרם הושלם', 'אזהרה', 'warning');
      return;
    }

    const parentStepCompleted =
      !task.isPlanningSte && parentStepStatusByStepId[task.planningStepID] === COMPLETED_STATUS_ID;
    if (parentStepCompleted || task.statuID === COMPLETED_STATUS_ID) {
      showMessage(EMPLOYEE_STATUS_BLOCKED_WHEN_COMPLETED_MSG, 'אזהרה', 'warning');
      return;
    }

    const nextStatusName = statusOptions.find(s => s.id === statusId)?.name ?? task.statusName;
    const plan = await planTableStatusChange(
      task,
      statusId,
      nextStatusName,
      tasks,
      'myTasks',
      openConfirm,
      openStepStatusSyncConfirm,
      (message) => showMessage(message, 'אזהרה', 'warning'),
    );
    if (!plan.proceed) return;

    const isTask = !task.isPlanningSte;
    await updateStatusAsync(task.id, statusId, isTask, false);
    onTasksUpdate(tasks.map(t => t.id === task.id
      ? { ...t, statuID: statusId, statusName: nextStatusName || t.statusName, isClosed: statusKeyFromName(nextStatusName || t.statusName) === 'done' }
      : t));
  };

  const buildChanges = (editedTask: TaskReview): TaskUpdatePatch => ({
    id: editedTask.id,
    subject: editedTask.subject,
    statuID: editedTask.statuID,
    urgencyID: editedTask.urgencyID,
    dependsOnStepID: editedTask.dependsOnStepID,
    dependsOnTaskID: editedTask.dependsOnTaskID,
    workDays: editedTask.workDays,
    workHours: editedTask.workHours,
    percentage: editedTask.percentage,
    startDate: editedTask.startDate,
    endDate: editedTask.endDate,
    duration: editedTask.duration
  });

  const handleTaskUpdateFromCard = async (
    updatedTask: TaskReview,
    employeeLinks: EmployeeLink[] = [],
    options?: TaskCardSaveOptions
  ) => {
    const stepCascade = options?.taskStepHoursCascade;
    const pdc = options?.taskParentDateCascade;
    const currentTask = tasks.find(t => t.id === updatedTask.id);
    const isTask = currentTask?.isPlanningSte ?? false;
    // if (currentTask && currentTask.statuID !== updatedTask.statuID) {
    //   const nextStatusName = statusOptions.find(s => s.id === (updatedTask.statuID ?? 0))?.name ?? updatedTask.statusName ?? '';
    //   await updateStatusAsync(updatedTask.id, updatedTask.statuID ?? 0, !isTask, false);
    //   updatedTask = { ...updatedTask, statusName: nextStatusName, isClosed: statusKeyFromName(nextStatusName) === 'done' };
    // }
    if (currentTask && currentTask.isClosed !== updatedTask.isClosed)
      await updateIsClosedAsync(updatedTask.id, updatedTask.isClosed ?? false, !isTask);

    if (stepCascade) {
      const c = stepCascade;
      for (const tu of c.taskUpdates) {
        const isCurrent = tu.id === updatedTask.id;
        const patch: TaskUpdatePatch = isCurrent
          ? { ...buildChanges(updatedTask), workHours: tu.workHours, workDays: tu.workDays, percentage: tu.percentage }
          : { id: tu.id, workHours: tu.workHours, workDays: tu.workDays, percentage: tu.percentage };
        await updateTaskAsync(
          patch,
          isCurrent ? employeeLinks : [],
          true,
          false
        );
      }

      const pdcForStep = pdc && pdc.stepId === c.stepId ? pdc : undefined;
      for (const o of pdcForStep?.otherTaskDateUpdates ?? []) {
        await updateTaskAsync(
          { id: o.id, startDate: o.startDate, endDate: o.endDate, duration: o.duration },
          [],
          true,
          false
        );
      }

      const stepPatch: TaskUpdatePatch = { id: c.stepId };
      if (c.newStepWorkHours != null) stepPatch.workHours = c.newStepWorkHours;
      if (c.duration != null) stepPatch.duration = c.duration;
      if (c.workDays != null) stepPatch.workDays = c.workDays;
      if (pdcForStep) {
        stepPatch.startDate = pdcForStep.startDate;
        stepPatch.endDate = pdcForStep.endDate;
        if (pdcForStep.duration != null) stepPatch.duration = pdcForStep.duration;
        if (pdcForStep.workHours != null) stepPatch.workHours = pdcForStep.workHours;
        if (pdcForStep.workDays != null) stepPatch.workDays = pdcForStep.workDays;
      }
      if (Object.keys(stepPatch).length > 1) {
        await updateTaskAsync(stepPatch, [], false,false);
      }

      onTasksUpdate(
        tasks.map(t => {
          if (t.id === updatedTask.id) return { ...updatedTask };
          const tu = c.taskUpdates.find(x => x.id === t.id);
          if (tu) return { ...t, workHours: tu.workHours, workDays: tu.workDays, percentage: tu.percentage };
          const oDate = pdcForStep?.otherTaskDateUpdates?.find(x => x.id === t.id);
          if (oDate) return { ...t, startDate: oDate.startDate, endDate: oDate.endDate, duration: oDate.duration };
          if (t.isPlanningSte && t.id === c.stepId) {
            return {
              ...t,
              workHours: pdcForStep?.workHours ?? c.newStepWorkHours,
              workDays: pdcForStep?.workDays ?? c.workDays ?? (pdcForStep?.workHours ?? c.newStepWorkHours) / 8,
              ...(pdcForStep ? { startDate: pdcForStep.startDate, endDate: pdcForStep.endDate } : {}),
              ...(pdcForStep?.duration != null ? { duration: pdcForStep.duration } : {}),
              ...(pdcForStep?.duration == null && c.duration != null ? { duration: c.duration } : {})
            };
          }
          return t;
        })
      );
      onTaskUpdate(updatedTask);
      await reloadPageTasks();
      return;
    }

    if (pdc) {
      const changes = buildChanges(updatedTask);
      const hasT = Object.keys(changes).length > 1;
      if (hasT || !employeeLinks.every(l => !l.isModified && !l.isNew && !l.isDeleted)) {
        await updateTaskAsync(changes, employeeLinks, true,false);
      }

      for (const o of pdc.otherTaskDateUpdates ?? []) {
        await updateTaskAsync(
          { id: o.id, startDate: o.startDate, endDate: o.endDate, duration: o.duration },
          [],
          true,false
        );
      }

      if (pdc.stepId) {
        await updateTaskAsync(
          {
            id: pdc.stepId,
            startDate: pdc.startDate,
            endDate: pdc.endDate,
            ...(pdc.duration != null ? { duration: pdc.duration } : {}),
            ...(pdc.workHours != null ? { workHours: pdc.workHours } : {}),
            ...(pdc.workDays != null ? { workDays: pdc.workDays } : {})
          },
          [],
          false,false
        );
      }

      onTasksUpdate(
        tasks.map(t => {
          if (t.id === updatedTask.id) return { ...updatedTask };
          const oDate = pdc.otherTaskDateUpdates?.find(x => x.id === t.id);
          if (oDate) return { ...t, startDate: oDate.startDate, endDate: oDate.endDate, duration: oDate.duration };
          if (t.isPlanningSte && t.id === pdc.stepId) {
            return {
              ...t,
              startDate: pdc.startDate,
              endDate: pdc.endDate,
              ...(pdc.duration != null ? { duration: pdc.duration } : {}),
              ...(pdc.workHours != null ? { workHours: pdc.workHours } : {}),
              ...(pdc.workDays != null ? { workDays: pdc.workDays } : {})
            };
          }
          return t;
        })
      );
      onTaskUpdate(updatedTask);
      await reloadPageTasks();
      return;
    }

    const changes = buildChanges(updatedTask);
    const hasChanges = Object.keys(changes).length > 1;
    if (
      !hasChanges &&
      employeeLinks.every(l => !l.isModified && !l.isNew && !l.isDeleted) &&
      !options?.cascadeStage &&
      !options?.taskStepHoursCascade &&
      !options?.taskParentDateCascade &&
      !options?.statusCascade
    ) {
      return;
    }

    await updateTaskAsync(changes, employeeLinks, !isTask,false);

    if (options?.statusCascade) {
      const sc = options.statusCascade;
      for (const child of sc.childTaskUpdates) {
        await updateStatusAsync(child.id, child.statuID, true, false, sc.syncChildEmployees);
      }
      onTasksUpdate(
        tasks.map(t => {
          if (t.id === updatedTask.id) return { ...updatedTask };
          const cu = sc.childTaskUpdates.find(c => c.id === t.id);
          if (cu) {
            return { ...t, statuID: cu.statuID, statusName: cu.statusName, isClosed: statusKeyFromName(cu.statusName) === 'done' };
          }
          return t;
        })
      );
      onTaskUpdate(updatedTask);
      await reloadPageTasks();
      return;
    }

    if (options?.cascadeStage) {
      const c = options.cascadeStage;
      await updateTaskAsync(
        { id: c.id, startDate: c.startDate, endDate: c.endDate },
        [],
        false,false
      );
      onTasksUpdate(
        tasks.map(t => {
          if (t.id === updatedTask.id) return { ...updatedTask };
          if (t.id === c.id) return { ...t, startDate: c.startDate, endDate: c.endDate };
          return t;
        })
      );
    }
    onTaskUpdate(updatedTask);
    await reloadPageTasks();
  };

  const getUrgencyColorByKey = (urgencyId: number) => {
    const color = priorities.find(p => p.id === urgencyId)?.color ?? '';
    return color ? { color, stroke: color } as React.CSSProperties : undefined;
  };

  const getStatusColorByKey = (statusId: number) => {
    const color = statuses.find(s => s.id === statusId)?.color ?? '';
    return color ? { color, stroke: color } as React.CSSProperties : undefined;
  };

  const isDatePast = (dateStr?: string | null) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
  };

  return (
    <>
      <TaskControls
        viewMode={viewMode} setViewMode={setViewMode}
        ganttTimeframe={ganttTimeframe} setGanttTimeframe={setGanttTimeframe}
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        selectedEmployee="" setSelectedEmployee={() => {}} allEmployees={[]}
        currentView="myTasks" activeFiltersCount={activeFiltersCount + columnFilterCount}
        onShowViewModal={() => setShowViewModal(true)}
        onShowFilterModal={() => setShowFilterModal(true)}
        onOpenReportModal={handleOpenReportMenu}
        totalTasks={tasks.length} filteredTasksCount={columnFilteredTasks.length}
      />

      {viewMode === 'list' ? (
        <>
          <div className="space-y-6">
            {Object.entries(groupedTasks).map(([groupName, groupTasks]) => {
              const sorted = sortTasks(groupTasks);
              return (
                <div key={groupName} className={TASK_GROUP_CARD}>
                  {activeView !== 'all' && (
                    <div className={`px-6 py-3 flex items-center justify-between ${
                      activeView === 'urgency' ? 'bg-gradient-to-r from-amber-400 to-orange-400' :
                      activeView === 'project' ? 'bg-gradient-to-r from-blue-400 to-blue-500' :
                      activeView === 'status'  ? 'bg-gradient-to-r from-purple-400 to-purple-500' :
                      activeView === 'date'    ? 'bg-gradient-to-r from-emerald-400 to-teal-500' :
                      'bg-gradient-to-r from-violet-400 to-violet-500'
                    }`}>
                      <div className="flex items-center justify-between w-full">
                        <h3 className="text-white font-bold text-lg">{groupName}</h3>
                        <span className="text-white text-sm opacity-80">({groupTasks.length} משימות)</span>
                      </div>
                    </div>
                  )}

                  <HorizontalScrollContainer
                    contentClassName={TASK_TABLE_SHELL}
                    contentStyle={{
                      overflowX: openColumnFilter ? 'visible' : undefined,
                      overflowY: openColumnFilter ? 'visible' : undefined,
                    }}
                  >
                    <table style={{ minWidth: '1800px', width: '100%' }}>
                      <thead className={TASK_TABLE_HEAD}>
                        <tr>
                          {/* Eye sticky */}
                          <th className={`px-2 py-2 w-10 sticky right-0 z-20 ${TASK_TABLE_HEAD_CELL}`} />

                          {/* נבדק */}
                          {renderHeaderFilter({
                            filterKey: 'isClosed',
                            label: 'נבדק',
                            headerClassName: 'px-3 py-2 text-center text-xs font-semibold text-gray-700 w-16',
                            align: 'center',
                            children: (
                              <SearchableCheckboxFilter
                                searchValue=""
                                onSearchChange={() => {}}
                                options={closedStateOptions}
                                selectedValues={columnFilters.closedStates}
                                onToggle={v => setColumnFilters(p => ({ ...p, closedStates: toggleArrayFilter(p.closedStates, v) }))}
                                onClear={() => setColumnFilters(p => ({ ...p, closedStates: [] }))}
                                searchPlaceholder="סינון סטטוס..."
                                emptyMessage="לא נמצאו"
                              />
                            ),
                          })}

                          <SortableTh sortKey="subject" label="תיאור המשימה" className="px-3 py-2 text-right text-xs font-semibold text-gray-700 min-w-[200px]" sort={sort} onSort={handleSort} />
                          <th className="px-3 py-2 text-center text-xs font-semibold text-emerald-700 w-16">צ'אט</th>
                          <SortableTh sortKey="name" label="שלב" className="px-3 py-2 text-right text-xs font-semibold text-gray-700 w-32" sort={sort} onSort={handleSort} />
                          <SortableTh sortKey="planningSubjectName" label="נושא תכנון" className="px-3 py-2 text-right text-xs font-semibold text-gray-700 w-36" sort={sort} onSort={handleSort} />

                          {renderHeaderFilter({
                            filterKey: 'project', label: 'פרויקט',
                            headerClassName: 'px-3 py-2 text-right text-xs font-semibold text-gray-700 w-48',
                            sortKey: 'projectName',
                            children: (
                              <SearchableCheckboxFilter
                                searchValue={columnFilterSearch.project}
                                onSearchChange={v => setColumnFilterSearch(p => ({ ...p, project: v }))}
                                options={projectFilterOptions} selectedValues={columnFilters.projects}
                                onToggle={v => setColumnFilters(p => ({ ...p, projects: toggleArrayFilter(p.projects, v) }))}
                                onClear={() => { setColumnFilters(p => ({ ...p, projects: [] })); setOpenColumnFilter(null); }}
                                searchPlaceholder="חיפוש פרויקט..." emptyMessage="לא נמצאו פרויקטים"
                              />
                            ),
                          })}

                          {renderHeaderFilter({
                            filterKey: 'status', label: 'סטטוס עובד למשימה',
                            headerClassName: 'px-3 py-2 text-right text-xs font-semibold text-gray-700 w-20 whitespace-nowrap',
                            sortKey: 'statusName',
                            children: (
                              <SearchableCheckboxFilter
                                searchValue={columnFilterSearch.status}
                                onSearchChange={v => setColumnFilterSearch(p => ({ ...p, status: v }))}
                                options={statusFilterOptions} selectedValues={columnFilters.statuses}
                                onToggle={v => setColumnFilters(p => ({ ...p, statuses: toggleArrayFilter(p.statuses, v) }))}
                                onClear={() => { setColumnFilters(p => ({ ...p, statuses: [] })); setOpenColumnFilter(null); }}
                                searchPlaceholder="חיפוש סטטוס..." emptyMessage="לא נמצאו סטטוסים"
                              />
                            ),
                          })}

                          {renderHeaderFilter({
                            filterKey: 'urgency', label: 'עדיפות',
                            headerClassName: 'px-3 py-2 text-right text-xs font-semibold text-gray-700 w-32',
                            sortKey: 'urgencyName',
                            children: (
                              <SearchableCheckboxFilter
                                searchValue={columnFilterSearch.urgency}
                                onSearchChange={v => setColumnFilterSearch(p => ({ ...p, urgency: v }))}
                                options={urgencyFilterOptions} selectedValues={columnFilters.urgencies}
                                onToggle={v => setColumnFilters(p => ({ ...p, urgencies: toggleArrayFilter(p.urgencies, v) }))}
                                onClear={() => { setColumnFilters(p => ({ ...p, urgencies: [] })); setOpenColumnFilter(null); }}
                                searchPlaceholder="חיפוש עדיפות..." emptyMessage="לא נמצאו דרגות עדיפות"
                              />
                            ),
                          })}

                          {renderHeaderFilter({
                            filterKey: 'sender', label: 'שולח',
                            headerClassName: 'px-3 py-2 text-right text-xs font-semibold text-gray-700 w-24',
                            sortKey: 'senderName',
                            children: (
                              <SearchableCheckboxFilter
                                searchValue={columnFilterSearch.sender}
                                onSearchChange={v => setColumnFilterSearch(p => ({ ...p, sender: v }))}
                                options={senderFilterOptions} selectedValues={columnFilters.senders}
                                onToggle={v => setColumnFilters(p => ({ ...p, senders: toggleArrayFilter(p.senders, v) }))}
                                onClear={() => { setColumnFilters(p => ({ ...p, senders: [] })); setOpenColumnFilter(null); }}
                                searchPlaceholder="חיפוש שולח..." emptyMessage="לא נמצאו שולחים"
                              />
                            ),
                          })}

                          {renderHeaderFilter({
                            filterKey: 'startDate', label: 'תאריך התחלה',
                            headerClassName: 'px-3 py-2 text-right text-xs font-semibold text-emerald-700 w-28',
                            contentClassName: 'w-80', sortKey: 'startDate',
                            children: (
                              <DateFilter
                                fromDate={columnFilters.startDateFrom} toDate={columnFilters.startDateTo}
                                onFromDateChange={v => setColumnFilters(p => ({ ...p, startDateFrom: v }))}
                                onToDateChange={v => setColumnFilters(p => ({ ...p, startDateTo: v }))}
                                onClear={() => { setColumnFilters(p => ({ ...p, startDateFrom: '', startDateTo: '' })); setOpenColumnFilter(null); }}
                              />
                            ),
                          })}

                          {renderHeaderFilter({
                            filterKey: 'endDate', label: 'תאריך סיום',
                            headerClassName: 'px-3 py-2 text-right text-xs font-semibold text-emerald-700 w-28',
                            contentClassName: 'w-80', sortKey: 'endDate',
                            children: (
                              <DateFilter
                                fromDate={columnFilters.endDateFrom} toDate={columnFilters.endDateTo}
                                onFromDateChange={v => setColumnFilters(p => ({ ...p, endDateFrom: v }))}
                                onToDateChange={v => setColumnFilters(p => ({ ...p, endDateTo: v }))}
                                onClear={() => { setColumnFilters(p => ({ ...p, endDateFrom: '', endDateTo: '' })); setOpenColumnFilter(null); }}
                              />
                            ),
                          })}

                          <th className="px-3 py-2 text-center text-xs font-semibold text-emerald-700 w-28">תלוי משימה</th>
                          <SortableTh sortKey="workHours" label="תקצוב שעות למשימה" className="px-3 py-2 text-right text-xs font-semibold text-emerald-700 w-32" sort={sort} onSort={handleSort} />
                          <SortableTh sortKey="utilizationPercentage" label="אחוז ניצול במשימה" className="px-3 py-2 text-center text-xs font-semibold text-emerald-700 w-28" sort={sort} onSort={handleSort} />
                          <th className="px-3 py-2 text-center text-xs font-semibold text-emerald-700 w-28">דיווח שעות</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-emerald-700 w-20">אינדקציה לחשבון</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {sorted.map((task, index) => (
                          (() => {
                            const dependencyBlocked = isTaskBlockedByDependency(task);
                            const dependencyBlockTitle = 'המשימה תלויה במשימה/שלב קודם שטרם הושלם';
                            return (
                          <tr key={taskReviewRowKey(task, index)} className="hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors relative group">

                            {/* Eye sticky */}
                            <td className={`px-2 py-2 sticky right-0 z-10 ${TASK_TABLE_STICKY_CELL}`}>
                              <button
                                onClick={() => setSelectedTask(task)}
                                className="p-1 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all opacity-0 group-hover:opacity-100"
                                title="צפה בכרטיס משימה"
                              >
                                <Eye size={14} />
                              </button>
                            </td>

                            {/* נבדק */}
                            <td className="px-3 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={task.isClosed || false}
                                disabled
                                className="w-4 h-4 rounded border-gray-300 text-emerald-500 cursor-not-allowed opacity-70"
                              />
                            </td>

                            {/* תיאור המשימה */}
                            <td className="px-3 py-2 max-w-[200px]">
                              <span
                                className="text-xs font-medium text-gray-900 px-1 rounded block overflow-hidden"
                                style={{
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                }}
                                title={task.subject}
                              >
                                {task.subject}
                              </span>
                            </td>

                            {/* Chat */}
                            <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={e => { e.stopPropagation(); setChatTask(task); setShowChatModal(true); }}
                                className="relative p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
                                title="פתח צ'אט"
                              >
                                <MessageSquare size={14} />
                                {(task.hasChat || (chatTask && chatTask.id === task.id && chatTask.hasChat)) && (
                                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white" />
                                )}
                              </button>
                            </td>

                            {/* שלב */}
                           <td className="px-3 py-2 max-w-[128px]">
                            <span
                              className="inline-flex px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium max-w-full overflow-hidden text-ellipsis whitespace-nowrap block"
                              title={task.name}
                            >
                              {task.name}
                            </span>
                          </td>

                          {/* נושא תכנון */}
                          <td className="px-3 py-2 max-w-[144px]">
                            <span
                              className="text-xs text-gray-600 block overflow-hidden text-ellipsis whitespace-nowrap"
                              title={task.planningSubjectName}
                            >
                              {task.planningSubjectName}
                            </span>
                          </td>


                           {/* פרויקט */}
                          <td className="px-3 py-2 w-48 max-w-[192px]"> 
                            <span
                              className="text-xs text-gray-600 block overflow-hidden text-ellipsis whitespace-nowrap"
                              title={task.projectName}
                            >
                              {task.projectName}
                            </span>
                          </td>
                           {/* סטטוס */}
<td className="px-3 py-2" onClick={e => e.stopPropagation()}>
  <div className="flex flex-col gap-1">
    {(() => {
      const selectedStatusId = String(statusOptions.find(s => s.name === task.statusName)?.id ?? task.statuID ?? 0);
      const selectedStatusName = statusOptions.find(s => String(s.id) === selectedStatusId)?.name ?? task.statusName;
      const fallbackOptionNeeded = task.statuID === 0 && !statusOptions.some(s => s.name === task.statusName) && selectedStatusId !== '0';
      return (
        <div className="relative w-full">
          <div
            className="text-xs font-medium px-2 py-1 rounded-full border w-full pl-6 overflow-hidden whitespace-nowrap text-ellipsis"
            style={getStatusColorByKey(task.statuID ?? 0)}
            title={selectedStatusName}
          >
            {truncateTo18(selectedStatusName)}
          </div>
          <ChevronDown
            size={12}
            className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 opacity-80"
            style={getStatusColorByKey(task.statuID ?? 0)}
          />
          <select
            key={`status-${taskReviewRowKey(task)}-${task.statuID}`}
            value={selectedStatusId}
            onChange={e => {
              const id = Number(e.target.value);
              void handleTaskStatusChange(task, id);
            }}
            disabled={task.isClosed && task.senderID !== userId}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            title={selectedStatusName}
          >
            {fallbackOptionNeeded && <option value="0">{task.statusName}</option>}
            {statusOptions.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
          </select>
        </div>
      );
    })()}

    {(() => {
      const pct = statuses.find(s => s.id === (task.statuID ?? 0))?.progressPercentage ?? 0;
      const color = statuses.find(s => s.id === (task.statuID ?? 0))?.color ?? '#10b981';
      return (
        <div className="flex items-center gap-1.5 px-1">
          <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${pct}%`, backgroundColor: color }}
            />
          </div>
          <span className="text-[10px] text-gray-500 min-w-[28px]">{pct}%</span>
        </div>
      );
    })()}
  </div>
</td>

                            {/* עדיפות */}
                            <td className="px-3 py-2 w-32 max-w-[140px]">
                              <div className="flex items-start gap-1">
                                <AlertCircle size={12} style={getUrgencyColorByKey(task.urgencyID)} />
                                <span
                                  className="text-xs font-medium block overflow-hidden"
                                  style={{
                                    ...getUrgencyColorByKey(task.urgencyID),
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical'
                                  }}
                                  title={task.urgencyName}
                                >
                                  {task.urgencyName}
                                </span>
                              </div>
                            </td>

                            {/* שולח */}
                            <td className="px-3 py-2">
                              <span className="text-xs text-gray-600">{task.senderName}</span>
                            </td>

                            {/* תאריך התחלה */}
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1">
                                <Clock size={12} className="text-gray-400" />
                                <span className="text-xs text-gray-600">
                                  {task.startDate ? new Date(task.startDate).toLocaleDateString('en-GB') : '-'}
                                </span>
                              </div>
                            </td>

                    {/* תאריך סיום */}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <Clock size={12} className={isDatePast(task.endDate) && task.statuID !== 3 ? 'text-red-500' : 'text-gray-400'} />
                        <span className={`text-xs ${isDatePast(task.endDate) && task.statuID !== 3 ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                          {task.endDate ? new Date(task.endDate).toLocaleDateString('en-GB') : '-'}
                        </span>
                      </div>
                    </td>

                            {/* תלוי בשלב */}
                            <td className="px-3 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={task.dependsOnStepID || false}
                                disabled
                                className="w-4 h-4 text-emerald-600 rounded cursor-not-allowed opacity-60"
                              />
                            </td>

                            {/* תקצוב שעות */}
                            <td className="px-3 py-2">
                              <div className="flex flex-col items-start gap-0.5">
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                                  {task.workHours || 0}h
                                </span>
                                {task.hourReport !== undefined && task.hourReport > 0 && (
                                  <span className="text-[10px] text-gray-500">({task.hourReport}h בפועל)</span>
                                )}
                              </div>
                            </td>

                            {/* אחוז ניצול */}
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden min-w-[50px]">
                                  <div
                                    className={`h-2 rounded-full transition-all ${
                                      (task.utilizationPercentage || 0) >= 80 ? 'bg-emerald-500' :
                                      (task.utilizationPercentage || 0) >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${task.utilizationPercentage || 0}%` }}
                                  />
                                </div>
                                <span className="text-xs font-bold text-gray-700 min-w-[35px]">
                                  {(task.utilizationPercentage || 0) % 1 !== 0
                                    ? (task.utilizationPercentage || 0).toFixed(2)
                                    : Math.round(task.utilizationPercentage || 0)}%
                                </span>
                              </div>
                            </td>

                            {/* דיווח שעות */}
                            <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={e => { e.stopPropagation(); if (dependencyBlocked) return; setHoursTask(task); setShowHoursModal(true); }}
                                disabled={dependencyBlocked}
                                className="px-2 py-1 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-all flex items-center gap-1 text-xs font-bold mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
                                title={dependencyBlocked ? dependencyBlockTitle : 'דיווח שעות לשלב/משימה'}
                              >
                                <Clock size={12} />
                                <span className="hidden lg:inline">דיווח</span>
                              </button>
                            </td>

                            {/* חשבון */}
                            <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  if (dependencyBlocked) return;
                                  setBillRequestTask({ ...task, hasBill: true });
                                }}
                                disabled={dependencyBlocked}
                                className="relative px-2 py-1 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all flex items-center gap-1 text-xs font-bold mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
                                title={dependencyBlocked ? dependencyBlockTitle : task.hasBill ? 'קיימת בקשת חשבון' : 'שלח בקשה להגשת חשבון'}
                              >
                                <Send size={12} />
                                <span className="hidden lg:inline">חשבון</span>
                                {(task.hasBill || (billRequestTask && billRequestTask.id === task.id && billRequestTask.hasBill)) && (
                                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white" />
                                )}
                              </button>
                            </td>

                          </tr>
                            );
                          })()
                        ))}

                        {sorted.length === 0 && (
                          <tr>
                            <td colSpan={17} className="px-4 py-2 text-center text-gray-400 text-xs">
                              לא נמצאו משימות
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </HorizontalScrollContainer>
                </div>
              );
            })}
          </div>
{/* ── מקטע סיכום ── */}
{(() => {
  const totalTasks = columnFilteredTasks.length;
  const completedTasks = columnFilteredTasks.filter(t => t.isClosed).length;
  const openTasks = totalTasks - completedTasks;
  const plannedHours = columnFilteredTasks.reduce((s, t) => s + (t.workHours ?? 0), 0);
  const actualHours = columnFilteredTasks.reduce((s, t) => s + (t.hourReport ?? 0), 0);

  return (
    <div className={TASK_SUMMARY_PANEL}>
      <div className="grid grid-cols-5 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-blue-600">{totalTasks}</div>
          <div className="text-xs text-gray-500 mt-1">משימות</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-indigo-600">
            {plannedHours % 1 !== 0 ? plannedHours.toFixed(2) : plannedHours}
          </div>
          <div className="text-xs text-gray-500 mt-1">שעות מתוכננות</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-purple-600">
            {actualHours % 1 !== 0 ? actualHours.toFixed(2) : actualHours}
          </div>
          <div className="text-xs text-gray-500 mt-1">שעות בפועל</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-emerald-600">{completedTasks}</div>
          <div className="text-xs text-gray-500 mt-1">הושלמו</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-amber-600">{openTasks}</div>
          <div className="text-xs text-gray-500 mt-1">משימות פתוחות</div>
        </div>
      </div>
    </div>
  );
})()}
          {/* ── מקטע הערות ── */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mt-4">
            <div className="flex items-center gap-2 mb-3 border-b border-amber-200 pb-2">
              <span className="text-amber-600 text-lg">💡</span>
              <h3 className="text-sm font-semibold text-amber-800">הערות</h3>
            </div>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm text-amber-800">
                <span className="text-amber-500 mt-0.5">•</span>
                <span><span className="font-bold">סינון משימות אישי:</span> בורד "המשימות שלי" יציג אך ורק משימות המשויכות למשתמש המחובר.</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-amber-800">
                <span className="text-amber-500 mt-0.5">•</span>
                <span><span className="font-bold">ניהול תצוגה וחיתוכים:</span> ניתן לשנות את תצוגת הבורד לרשימה/גאנט, וכן לקבץ ולסנן את המשימות לפי קטגוריה, רמת עדיפות או חתכים נוספים.</span>
              </li>
            </ul>
          </div>
        </>
      ) : (
        <GanttChart
          tasks={ganttTask} timeframe={ganttTimeframe} currentView="myTasks"
          statuses={statuses} priorities={priorities}
          onUpdate={async (updatedTask, employeeLinks, options) => {
            await handleTaskUpdateFromCard(updatedTask, employeeLinks, options);
            setSelectedTask(null);
          }}
          viewMode={'myTasks'}
        />
      )}
{showReportModal && (
        <MyTasksReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          rows={getReportRows()}
          columns={MY_TASKS_REPORT_COLUMNS}
          filteredCount={columnFilteredTasks.length}
          reportTitle="דוח משימות - המשימות שלי"
          fileBaseName={`my-tasks-report-${new Date().toISOString().slice(0, 10)}`}
          onCopySummary={handleCopySummary}
          onExportJson={handleExportJson}
        />
      )}
      {showViewModal && (
        <ViewModal
          activeView={activeView}
          onViewChange={view => { setActiveView(view); setShowViewModal(false); }}
          onClose={() => setShowViewModal(false)}
        />
      )}

      {showFilterModal && (
        <DbFilterModal
          onClose={() => setShowFilterModal(false)}
          onApply={nextFilters => { setDbFilters(nextFilters); loadTasks(true, nextFilters); }}
          currentFilters={dbFilters}
        />
      )}

      {selectedTask && (
        <TaskCard
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={async (updatedTask, employeeLinks, options) => {
            await handleTaskUpdateFromCard(updatedTask, employeeLinks, options);
            setSelectedTask(null);
          }}
          viewMode="myTasks"
          statuses={statuses}
          priorities={priorities}
          planStepListTask={taskCardStepContext.planStepListTask}
          contextTasks={tasks}
        />
      )}

      {showHoursModal && hoursTask && (
        <HoursReportModal
          task={hoursTask}
          onClose={() => { setShowHoursModal(false); setHoursTask(null); }}
          onSave={(report: HoursReport) => { console.log('Hours report saved:', report); }}
        />
      )}

      {showChatModal && chatTask && (
        <ChatModal
          task={chatTask}
          setTask={setChatTask}
          onClose={() => {
            if (chatTask?.hasChat) onTasksUpdate(tasks.map(t => t.id === chatTask.id ? { ...t, hasChat: true } : t));
            setShowChatModal(false);
          }}
        />
      )}

      {billRequestTask && (
        <PlanningBillRequestModal
          task={billRequestTask}
          onClose={() => setBillRequestTask(null)}
          onSuccess={() => {
            if (billRequestTask) {
              const updated = { ...billRequestTask, hasBill: true };
              onTasksUpdate(tasks.map(t => t.id === billRequestTask.id ? { ...t, hasBill: true } : t));
              onTaskUpdate(updated);
            }
            showMessage('בקשה להגשת חשבון נפתחה בהצלחה', 'הגשת חשבון', 'success');
          }}
          onError={message => showMessage(message, 'שגיאה', 'error')}
        />
      )}

      <MessageBox
        isOpen={messageBox.isOpen}
        onClose={closeMessageBox}
        title={messageBox.title}
        message={messageBox.message}
        type={messageBox.type}
        confirmText={messageBox.confirmText ?? 'אישור'}
        cancelText={messageBox.cancelText ?? 'לא'}
        showCancel={messageBox.showCancel}
        checkboxLabel={messageBox.checkboxLabel}
        checkboxDefaultChecked={messageBox.checkboxDefaultChecked}
        onConfirm={messageBox.onConfirm}
        onCancel={messageBox.onCancel}
      />
    </>
  );
}