import { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, AlertCircle, Eye, MessageSquare, Send, Filter, X, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import type { CurrentView } from '../../types/index';
import { getInitials, getAvatarColor } from '../../Data/tasksData';
import type { SystemTable, TaskReview, TaskStatusCascade } from '../../Data/projectsData';
import ChatModal from '../tasks/ChatModal';
import SearchableCheckboxFilter from '../shared/SearchableCheckboxFilter';
import DateFilter from '../shared/DateFilter';
import MessageBox from '../shared/MessageBox';
import {
  clearStatusMessageBoxFields,
  createOpenConfirm,
  createStepStatusSyncConfirm,
  type StatusMessageBoxState,
} from '../shared/statusSyncConfirm';
import PlanningBillRequestModal from './PlanningBillRequestModal';
import { planTableStatusChange } from './taskStatusChangeRules';
import { dedupeTaskReviews, taskReviewRowKey } from '../../services/taskService';
import HorizontalScrollContainer from '../../components/HorizontalScrollContainer';
import {
  TASK_FILTER_POPOVER,
  TASK_HEADER_FILTER_BTN_INACTIVE,
  TASK_HEADER_TH_HOVER,
  TASK_SUMMARY_PANEL,
  TASK_TABLE_HEAD,
  TASK_TABLE_HEAD_CELL,
  TASK_TABLE_SHELL,
  TASK_TABLE_STICKY_CELL,
} from './taskViewTheme';

export type TaskTableStatusChangeOptions = {
  updateAllEmployees?: boolean;
  statusCascade?: TaskStatusCascade | null;
};

interface TaskTableProps {
  tasks: TaskReview[];
  currentView: CurrentView;
  onTaskComplete: (taskId: number) => void;
  onTaskStatusChange: (
    taskId: number,
    statusId: number,
    statusName: string,
    options?: TaskTableStatusChangeOptions,
  ) => void;
  onTaskUrgencyChange: (taskId: number, urgencyId: number, urgencyName: string) => void;
  onTaskSubjectChange: (taskId: number, subject: string) => void;
  onTaskClick: (task: TaskReview) => void;
  onTasksUpdate: (updatedTasks: TaskReview[]) => void;
  statuses: SystemTable[];
  priorities: SystemTable[];
  hideProjectColumn?: boolean;
}

type TaskTableColumnFilterKey = 'isClosed' | 'project' | 'status' | 'urgency' | 'sender' | 'startDate' | 'endDate';
type SortKey = 'subject' | 'name' | 'planningSubjectName' | 'projectName' | 'statusName' | 'urgencyName' | 'senderName' | 'startDate' | 'endDate' | 'workHours' | 'utilizationPercentage';
type SortDir = 'asc' | 'desc' | null;
interface SortState { key: SortKey | null; dir: SortDir; }
const truncateTo18 = (value?: string) => {
  const text = (value ?? '').trim();
  return text.length > 18 ? `${text.slice(0, 18)}...` : text;
};

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active || !dir) return <ChevronsUpDown size={11} className="text-gray-400" />;
  return dir === 'asc' ? <ChevronUp size={11} className="text-emerald-600" /> : <ChevronDown size={11} className="text-emerald-600" />;
}

function SortableTh({ sortKey, label, className, sort, onSort }: {
  sortKey: SortKey; label: string; className: string; sort: SortState; onSort: (key: SortKey) => void;
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

export default function TaskTable({
  tasks, currentView, onTaskComplete, onTaskStatusChange, onTaskUrgencyChange,
  onTaskSubjectChange, onTaskClick, onTasksUpdate, statuses, priorities, hideProjectColumn = false
}: TaskTableProps) {
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingSubject, setEditingSubject] = useState('');
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatTask, setChatTask] = useState<TaskReview | null>(null);
  const [billRequestTask, setBillRequestTask] = useState<TaskReview | null>(null);
  const [openColumnFilter, setOpenColumnFilter] = useState<TaskTableColumnFilterKey | null>(null);
  const [columnFilterSearch, setColumnFilterSearch] = useState({ isClosed: '', project: '', status: '', urgency: '', sender: '' });
  const [columnFilters, setColumnFilters] = useState({
    closedStates: [] as string[], projects: [] as string[], statuses: [] as number[],
    urgencies: [] as string[], senders: [] as string[],
    startDateFrom: '', startDateTo: '', endDateFrom: '', endDateTo: ''
  });
  const [sort, setSort] = useState<SortState>({ key: null, dir: null });

  const [messageBox, setMessageBox] = useState<StatusMessageBoxState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
  });

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

  const handleTableStatusChange = async (task: TaskReview, nextStatusId: number, statusName: string) => {
    const view = currentView === 'myTasks' ? 'myTasks' : 'allTasks';
    const plan = await planTableStatusChange(
      task,
      nextStatusId,
      statusName,
      tasks,
      view,
      openConfirm,
      openStepStatusSyncConfirm,
      (message) => showMessage(message, 'אזהרה', 'warning'),
    );
    if (!plan.proceed) return;
    onTaskStatusChange(task.id, nextStatusId, statusName, plan.options);
  };

  const handleSort = (key: SortKey) => {
    setSort(prev => {
      if (prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return { key: null, dir: null };
    });
  };

  useEffect(() => {
    if (!hideProjectColumn) return;
    setColumnFilters(prev => prev.projects.length === 0 ? prev : { ...prev, projects: [] });
    setColumnFilterSearch(prev => prev.project === '' ? prev : { ...prev, project: '' });
    setOpenColumnFilter(current => current === 'project' ? null : current);
  }, [hideProjectColumn]);

  const getUrgencyColorByKey = (urgencyId: number) => {
    const color = priorities.find(p => p.id === urgencyId)?.color ?? '';
    return color ? { color, stroke: color } as React.CSSProperties : undefined;
  };

  const getStatusColorByKey = (statusId: number) => {
    const color = statuses.find(s => s.id === statusId)?.color ?? '';
    return color ? { color, stroke: color } as React.CSSProperties : undefined;
  };

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

  const isDatePast = (dateStr?: string | null) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
  };

  const listTasks = useMemo(() => dedupeTaskReviews(tasks), [tasks]);

  const closedStateOptions = useMemo(() => [{ value: 'open', label: 'פתוח' }, { value: 'closed', label: 'סגור' }], []);
  const projectFilterOptions = useMemo(() => Array.from(new Set(listTasks.map(t => t.projectName).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'he')).map(p => ({ value: p, label: p })), [listTasks]);
  const senderFilterOptions = useMemo(() => Array.from(new Set(listTasks.map(t => t.senderName).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'he')).map(s => ({ value: s, label: s })), [listTasks]);
  const urgencyFilterOptions = useMemo(() => Array.from(new Set(listTasks.map(t => t.urgencyName).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'he')).map(u => ({ value: u, label: u })), [listTasks]);
  const statusFilterOptions = useMemo(() => {
    const map = new Map<number, string>();
    listTasks.forEach(t => { const id = t.statuID ?? 0; const name = t.statusName || statuses.find(s => s.id === id)?.name || `סטטוס ${id}`; if (!map.has(id)) map.set(id, name); });
    return Array.from(map, ([id, name]) => ({ value: id, label: name })).sort((a, b) => a.label.localeCompare(b.label, 'he'));
  }, [listTasks, statuses]);

  const columnFilteredTasks = useMemo(() => listTasks.filter(task => {
    const closedState = task.isClosed ? 'closed' : 'open';
    return (
      (columnFilters.closedStates.length === 0 || columnFilters.closedStates.includes(closedState)) &&
      (hideProjectColumn || columnFilters.projects.length === 0 || columnFilters.projects.includes(task.projectName)) &&
      (columnFilters.statuses.length === 0 || columnFilters.statuses.includes(task.statuID ?? 0)) &&
      (columnFilters.urgencies.length === 0 || columnFilters.urgencies.includes(task.urgencyName)) &&
      (columnFilters.senders.length === 0 || columnFilters.senders.includes(task.senderName)) &&
      matchesDateRange(task.startDate || task.creatDate, columnFilters.startDateFrom, columnFilters.startDateTo) &&
      matchesDateRange(task.endDate, columnFilters.endDateFrom, columnFilters.endDateTo)
    );
  }), [listTasks, columnFilters, hideProjectColumn]);

  const sortedTasks = useMemo(() => {
    if (!sort.key || !sort.dir) return columnFilteredTasks;
    return [...columnFilteredTasks].sort((a, b) => {
      const key = sort.key!;
      let aVal: string | number = '';
      let bVal: string | number = '';
      if (key === 'startDate') { aVal = toComparableDate(a.startDate || a.creatDate) ?? ''; bVal = toComparableDate(b.startDate || b.creatDate) ?? ''; }
      else if (key === 'endDate') { aVal = toComparableDate(a.endDate) ?? ''; bVal = toComparableDate(b.endDate) ?? ''; }
      else if (key === 'workHours') { aVal = a.workHours ?? 0; bVal = b.workHours ?? 0; }
      else if (key === 'utilizationPercentage') { aVal = a.utilizationPercentage ?? 0; bVal = b.utilizationPercentage ?? 0; }
      else { aVal = (a[key as keyof TaskReview] as string | null | undefined) ?? ''; bVal = (b[key as keyof TaskReview] as string | null | undefined) ?? ''; }
      if (typeof aVal === 'number' && typeof bVal === 'number') return sort.dir === 'asc' ? aVal - bVal : bVal - aVal;
      const cmp = String(aVal).localeCompare(String(bVal), 'he', { sensitivity: 'base' });
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [columnFilteredTasks, sort]);

  const isColumnFilterActive = (filterKey: TaskTableColumnFilterKey) => {
    switch (filterKey) {
      case 'isClosed': return columnFilters.closedStates.length > 0;
      case 'project': return columnFilters.projects.length > 0;
      case 'status': return columnFilters.statuses.length > 0;
      case 'urgency': return columnFilters.urgencies.length > 0;
      case 'sender': return columnFilters.senders.length > 0;
      case 'startDate': return Boolean(columnFilters.startDateFrom || columnFilters.startDateTo);
      case 'endDate': return Boolean(columnFilters.endDateFrom || columnFilters.endDateTo);
      default: return false;
    }
  };

  const renderHeaderFilter = ({ filterKey, label, headerClassName, contentClassName = 'w-72', align = 'right', sortKey, children }: {
    filterKey: TaskTableColumnFilterKey; label: string; headerClassName: string;
    contentClassName?: string; align?: 'right' | 'center'; sortKey?: SortKey; children: React.ReactNode;
  }) => (
    <th className={`${headerClassName} relative ${sortKey ? `cursor-pointer ${TASK_HEADER_TH_HOVER}` : ''}`} onClick={sortKey ? () => handleSort(sortKey) : undefined}>
      <div className={`flex items-center gap-1 ${align === 'center' ? 'justify-center' : 'justify-between'}`}>
        <div className="flex items-center gap-1">
          <span>{label}</span>
          {sortKey && <SortIcon active={sort.key === sortKey} dir={sort.key === sortKey ? sort.dir : null} />}
        </div>
        <button type="button"
          onClick={e => { e.stopPropagation(); setOpenColumnFilter(current => current === filterKey ? null : filterKey); }}
          className={`p-1 rounded-md border transition-colors ${isColumnFilterActive(filterKey) ? 'bright-surface bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700' : TASK_HEADER_FILTER_BTN_INACTIVE}`}
          title={`סינון ${label}`}
        >
          <Filter size={12} />
        </button>
      </div>
      {openColumnFilter === filterKey && (
        <div className={`absolute mt-2 z-[9999] ${TASK_FILTER_POPOVER} ${contentClassName}`} style={{ top: '100%' }} onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">סינון {label}</span>
            <button type="button" onClick={() => setOpenColumnFilter(null)} className="p-1 rounded-md text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"><X size={14} /></button>
          </div>
          {children}
        </div>
      )}
    </th>
  );

  const startEditingSubject = (task: TaskReview) => { setEditingTaskId(task.id); setEditingSubject(task.subject); };
  const saveSubject = (taskId: number) => { if (editingSubject.trim()) onTaskSubjectChange(taskId, editingSubject.trim()); setEditingTaskId(null); setEditingSubject(''); };
  const cancelEditing = () => { setEditingTaskId(null); setEditingSubject(''); };
  const handleOpenChat = (task: TaskReview, e: React.MouseEvent) => { e.stopPropagation(); setChatTask(task); setShowChatModal(true); };
  const handleSendInvoiceRequest = (task: TaskReview, e: React.MouseEvent) => {
    e.stopPropagation();
    setBillRequestTask({ ...task, hasBill: true });
  };
  const handleCloseChat = () => {
    if (chatTask?.hasChat) onTasksUpdate(tasks.map(t => t.id === chatTask.id ? { ...t, hasChat: true } : t));
    setShowChatModal(false);
  };
  // const isTaskBlockedByDependency = (task: TaskReview): boolean => {
  //   if (!task.dependsOnTaskID && !task.dependsOnStepID) return false;
  //     return task.stepDependStatusID !== 3||task.taskDependStatusID !== 3;
  // }
  return (
    <>
      <HorizontalScrollContainer
        contentClassName={TASK_TABLE_SHELL}
        contentStyle={{
          overflowX: openColumnFilter ? 'visible' : undefined,
          overflowY: openColumnFilter ? 'visible' : undefined,
        }}
      >
        <table className="w-full min-w-[1800px]">
          <thead className={TASK_TABLE_HEAD}>
            <tr>
              {/* Eye sticky */}
              <th className={`px-2 py-2 w-10 sticky right-0 z-20 ${TASK_TABLE_HEAD_CELL}`} />

              {renderHeaderFilter({
                filterKey: 'isClosed', label: 'נבדק',
                headerClassName: 'px-3 py-2 text-right text-xs font-semibold text-gray-700 w-10',
                align: 'center',
                children: (
                  <SearchableCheckboxFilter
                    searchValue={columnFilterSearch.isClosed}
                    onSearchChange={value => setColumnFilterSearch(prev => ({ ...prev, isClosed: value }))}
                    options={closedStateOptions} selectedValues={columnFilters.closedStates}
                    onToggle={value => setColumnFilters(prev => ({ ...prev, closedStates: toggleArrayFilter(prev.closedStates, value) }))}
                    onClear={() => setColumnFilters(prev => ({ ...prev, closedStates: [] }))}
                    searchPlaceholder="חיפוש סטטוס סגירה..." emptyMessage="לא נמצאו אפשרויות"
                  />
                )
              })}

              {/* 1. תיאור המשימה — 2 שורות + tooltip */}
              <SortableTh sortKey="subject" label="תיאור המשימה" className="px-3 py-2 text-right text-xs font-semibold text-gray-700 min-w-[200px]" sort={sort} onSort={handleSort} />
              <th className="px-3 py-2 text-center text-xs font-semibold text-emerald-700 w-16">צ'אט</th>

              {/* 2. שלב — 2 שורות + tooltip */}
              <SortableTh sortKey="name" label="שלב" className="px-3 py-2 text-right text-xs font-semibold text-gray-700 w-32" sort={sort} onSort={handleSort} />
              <SortableTh sortKey="planningSubjectName" label="נושא תכנון" className="px-3 py-2 text-right text-xs font-semibold text-gray-700 w-36" sort={sort} onSort={handleSort} />

              {!hideProjectColumn && renderHeaderFilter({
                filterKey: 'project', label: 'פרויקט',
                headerClassName: 'px-3 py-2 text-right text-xs font-semibold text-gray-700 w-28',
                sortKey: 'projectName',
                children: (
                  <SearchableCheckboxFilter
                    searchValue={columnFilterSearch.project}
                    onSearchChange={value => setColumnFilterSearch(prev => ({ ...prev, project: value }))}
                    options={projectFilterOptions} selectedValues={columnFilters.projects}
                    onToggle={value => setColumnFilters(prev => ({ ...prev, projects: toggleArrayFilter(prev.projects, value) }))}
                    onClear={() => { setColumnFilters(prev => ({ ...prev, projects: [] })); setOpenColumnFilter(null); }}
                    searchPlaceholder="חיפוש פרויקט..." emptyMessage="לא נמצאו פרויקטים"
                  />
                )
              })}

              {/* 3. סטטוס */}
              {renderHeaderFilter({
                filterKey: 'status', label: 'סטטוס משימה',
                headerClassName: 'px-3 py-2 text-right text-xs font-semibold text-gray-700 w-48',
                sortKey: 'statusName',
                children: (
                  <SearchableCheckboxFilter
                    searchValue={columnFilterSearch.status}
                    onSearchChange={value => setColumnFilterSearch(prev => ({ ...prev, status: value }))}
                    options={statusFilterOptions} selectedValues={columnFilters.statuses}
                    onToggle={value => setColumnFilters(prev => ({ ...prev, statuses: toggleArrayFilter(prev.statuses, value) }))}
                    onClear={() => { setColumnFilters(prev => ({ ...prev, statuses: [] })); setOpenColumnFilter(null); }}
                    searchPlaceholder="חיפוש סטטוס..." emptyMessage="לא נמצאו סטטוסים"
                  />
                )
              })}

              {renderHeaderFilter({
                filterKey: 'urgency', label: 'עדיפות',
                headerClassName: 'px-3 py-2 text-right text-xs font-semibold text-gray-700 w-20',
                sortKey: 'urgencyName',
                children: (
                  <SearchableCheckboxFilter
                    searchValue={columnFilterSearch.urgency}
                    onSearchChange={value => setColumnFilterSearch(prev => ({ ...prev, urgency: value }))}
                    options={urgencyFilterOptions} selectedValues={columnFilters.urgencies}
                    onToggle={value => setColumnFilters(prev => ({ ...prev, urgencies: toggleArrayFilter(prev.urgencies, value) }))}
                    onClear={() => { setColumnFilters(prev => ({ ...prev, urgencies: [] })); setOpenColumnFilter(null); }}
                    searchPlaceholder="חיפוש עדיפות..." emptyMessage="לא נמצאו דרגות עדיפות"
                  />
                )
              })}

              {renderHeaderFilter({
                filterKey: 'sender', label: 'שולח',
                headerClassName: 'px-3 py-2 text-right text-xs font-semibold text-gray-700 w-24',
                sortKey: 'senderName',
                children: (
                  <SearchableCheckboxFilter
                    searchValue={columnFilterSearch.sender}
                    onSearchChange={value => setColumnFilterSearch(prev => ({ ...prev, sender: value }))}
                    options={senderFilterOptions} selectedValues={columnFilters.senders}
                    onToggle={value => setColumnFilters(prev => ({ ...prev, senders: toggleArrayFilter(prev.senders, value) }))}
                    onClear={() => { setColumnFilters(prev => ({ ...prev, senders: [] })); setOpenColumnFilter(null); }}
                    searchPlaceholder="חיפוש שולח..." emptyMessage="לא נמצאו שולחים"
                  />
                )
              })}

              {currentView === 'allTasks' && <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 w-24">מקבל</th>}

              {renderHeaderFilter({
                filterKey: 'startDate', label: 'תאריך התחלה',
                headerClassName: 'px-3 py-2 text-right text-xs font-semibold text-emerald-700 w-28',
                contentClassName: 'w-80', sortKey: 'startDate',
                children: (
                  <DateFilter
                    fromDate={columnFilters.startDateFrom} toDate={columnFilters.startDateTo}
                    onFromDateChange={value => setColumnFilters(prev => ({ ...prev, startDateFrom: value }))}
                    onToDateChange={value => setColumnFilters(prev => ({ ...prev, startDateTo: value }))}
                    onClear={() => { setColumnFilters(prev => ({ ...prev, startDateFrom: '', startDateTo: '' })); setOpenColumnFilter(null); }}
                  />
                )
              })}

              {/* 4. תאריך סיום */}
              {renderHeaderFilter({
                filterKey: 'endDate', label: 'תאריך סיום',
                headerClassName: 'px-3 py-2 text-right text-xs font-semibold text-emerald-700 w-28',
                contentClassName: 'w-80', sortKey: 'endDate',
                children: (
                  <DateFilter
                    fromDate={columnFilters.endDateFrom} toDate={columnFilters.endDateTo}
                    onFromDateChange={value => setColumnFilters(prev => ({ ...prev, endDateFrom: value }))}
                    onToDateChange={value => setColumnFilters(prev => ({ ...prev, endDateTo: value }))}
                    onClear={() => { setColumnFilters(prev => ({ ...prev, endDateFrom: '', endDateTo: '' })); setOpenColumnFilter(null); }}
                  />
                )
              })}

              <th className="px-3 py-2 text-center text-xs font-semibold text-emerald-700 w-20">תלוי משימה</th>
              <SortableTh sortKey="workHours" label="תקצוב שעות למשימה" className="px-3 py-2 text-right text-xs font-semibold text-emerald-700 w-32" sort={sort} onSort={handleSort} />
              <SortableTh sortKey="utilizationPercentage" label="אחוז ניצול במשימה" className="px-3 py-2 text-center text-xs font-semibold text-emerald-700 w-28" sort={sort} onSort={handleSort} />
              <th className="px-3 py-2 text-center text-xs font-semibold text-emerald-700 w-20">אינדקציה לחשבון</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {sortedTasks.map((task, index) => {
              // const dependencyBlocked = isTaskBlockedByDependency(task);
              // const dependencyBlockTitle = 'המשימה תלויה במשימה/שלב קודם שטרם הושלם';
              return (
              <tr
                key={taskReviewRowKey(task, index)}
                // onMouseEnter={() => setHoveredTaskId(task.id)}
                // onMouseLeave={() => setHoveredTaskId(null)}
                className="hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors relative group"
              >
                {/* 5. Eye sticky — כמו MyTasks */}
                <td className={`px-2 py-2 sticky right-0 z-10 ${TASK_TABLE_STICKY_CELL}`}>
                  <button
                    onClick={() => onTaskClick(task)}
                    className="p-1 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all opacity-0 group-hover:opacity-100"
                    title="צפה בכרטיס משימה"
                  >
                    <Eye size={14} />
                  </button>
                </td>

                {/* Checkbox */}
                <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={task.isClosed || false} onChange={() => onTaskComplete(task.id)}
                    
                    className="w-4 h-4 rounded border-gray-300 text-emerald-500 cursor-pointer focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50" />
                </td>

                {/* 1. תיאור המשימה — 2 שורות + tooltip */}
                <td className="px-3 py-2 max-w-[200px]" onClick={e => e.stopPropagation()}>
                  {currentView === 'allTasks' && editingTaskId === task.id ? (
                    <div className="flex items-center gap-2">
                      <input type="text" value={editingSubject}
                        onChange={e => setEditingSubject(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveSubject(task.id); if (e.key === 'Escape') cancelEditing(); }}
                        className="flex-1 px-2 py-1 border border-emerald-500 rounded focus:ring-2 focus:ring-emerald-500 text-xs" autoFocus />
                      <button onClick={() => saveSubject(task.id)} className="px-2 py-1 bg-emerald-500 text-white rounded text-xs hover:bg-emerald-600">✓</button>
                      <button onClick={cancelEditing} className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400">✕</button>
                    </div>
                  ) : (
                    <span
                      onClick={currentView === 'allTasks' ? () => startEditingSubject(task) : undefined}
                      title={task.subject}
                     className={`text-xs font-medium  text-gray-900 ${currentView === 'allTasks' ? 'cursor-text hover:bg-gray-100' : ''} px-1 rounded block overflow-hidden`}
                      style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                    >
                      {task.subject}
                    </span>
                  )}
                </td>

                {/* Chat */}
                <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                  <button onClick={e => handleOpenChat(task, e)} className="relative p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all" title="פתח צ'אט">
                    <MessageSquare size={14} />
                    {task.hasChat && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white" />}
                  </button>
                </td>

                {/* 2. שלב — 2 שורות + tooltip */}
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
                  <span className="text-xs text-gray-600 block overflow-hidden text-ellipsis whitespace-nowrap" title={task.planningSubjectName}>
                    {task.planningSubjectName}
                  </span>
                </td>

                {/* פרויקט */}
                {!hideProjectColumn && (
                <td className="px-3 py-2 w-48 max-w-[192px]">
                    <span className="text-xs text-gray-600 block overflow-hidden text-ellipsis whitespace-nowrap" title={task.projectName}>
                      {task.projectName}
                    </span>
                  </td>
                )}

                {/* 3. סטטוס — עם progress bar */}
                <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                  <div className="flex flex-col gap-1">
                    {(() => {
                      const selectedStatusId = String(statuses.find(s => s.name === task.statusName)?.id ?? task.statuID ?? 0);
                      const selectedStatusName =
                        statuses.find(s => String(s.id) === selectedStatusId)?.name ?? task.statusName;
                      const fallbackOptionNeeded = task.statuID === 0 && !statuses.some(s => s.name === task.statusName) && selectedStatusId !== '0';
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
                            key={`status-${task.id}-${task.statuID}`}
                            value={selectedStatusId}
                            onChange={e => {
                              const id = Number(e.target.value);
                              const name = statuses.find(s => s.id === id)?.name ?? task.statusName;
                              void handleTableStatusChange(task, id, name);
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                            title={selectedStatusName}
                          >
                            {fallbackOptionNeeded && <option value="0">{task.statusName}</option>}
                            {statuses.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
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
                            <div className="h-1.5 rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: color }} />
                          </div>
                          <span className="text-[10px] text-gray-500 min-w-[28px]">{pct}%</span>
                        </div>
                      );
                    })()}
                  </div>
                </td>

                {/* דחיפות */}
                <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                  {currentView === 'allTasks' ? (
                    (() => {
                      const selectedUrgencyId = String(priorities.find(p => p.name === task.urgencyName)?.id ?? task.urgencyID ?? 0);
                      const selectedUrgencyName =
                        priorities.find(p => String(p.id) === selectedUrgencyId)?.name ?? task.urgencyName;
                      const fallbackOptionNeeded = task.urgencyID === 0 && !priorities.some(p => p.name === task.urgencyName) && selectedUrgencyId !== '0';
                      return (
                        <div className="relative min-w-[112px]">
                          <div
                            className="text-xs font-medium px-2 py-1 rounded-full border w-full pl-6 overflow-hidden whitespace-nowrap text-ellipsis"
                            style={getUrgencyColorByKey(task.urgencyID)}
                            title={selectedUrgencyName}
                          >
                            {truncateTo18(selectedUrgencyName)}
                          </div>
                          <ChevronDown
                            size={12}
                            className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 opacity-80"
                            style={getUrgencyColorByKey(task.urgencyID)}
                          />
                          <select
                            value={selectedUrgencyId}
                            disabled={false}
                            onChange={e => { const id = Number(e.target.value); const name = priorities.find(p => p.id === id)?.name ?? task.urgencyName; onTaskUrgencyChange(task.id, id, name); }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            title={selectedUrgencyName}
                          >
                            {fallbackOptionNeeded && <option value="0">{task.urgencyName}</option>}
                            {priorities.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                          </select>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="flex items-center gap-1">
                      <AlertCircle size={12} style={getUrgencyColorByKey(task.urgencyID)} />
                      <span className="text-xs font-medium" style={getUrgencyColorByKey(task.urgencyID)}>{task.urgencyName}</span>
                    </div>
                  )}
                </td>

                {/* שולח */}
                <td className="px-3 py-2">
                  <span className="text-xs text-gray-600">{task.senderName}</span>
                </td>

                {/* מקבל */}
                {currentView === 'allTasks' && (
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-0.5">
                      {(task.receivers ?? []).slice(0, 2).map((receiver, idx) => (
                        <div key={idx} className={`w-5 h-5 rounded-full ${getAvatarColor(receiver)} flex items-center justify-center text-white text-[10px] font-bold ${idx > 0 ? '-mr-1' : ''} border-2 border-white`}>
                          {getInitials(receiver)}
                        </div>
                      ))}
                      {(task.receivers ?? []).length > 2 && (
                        <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-gray-700 text-[10px] font-bold -mr-1 border-2 border-white">
                          +{(task.receivers ?? []).length - 2}
                        </div>
                      )}
                    </div>
                  </td>
                )}

                {/* תאריך התחלה */}
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <Clock size={12} className="text-gray-400" />
                    <span className="text-xs text-gray-600">
                      {task.startDate || task.creatDate ? new Date(task.startDate || task.creatDate).toLocaleDateString('en-GB') : '-'}
                    </span>
                  </div>
                </td>

                {/* 4. תאריך סיום — אדום אם עבר וסטטוס לא 3 */}
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
                  <input type="checkbox" checked={task.dependsOnStepID || false} disabled className="w-4 h-4 text-emerald-600 rounded cursor-not-allowed opacity-60" />
                </td>

                {/* תקצוב שעות */}
                <td className="px-3 py-2">
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">{task.workHours || 0}h</span>
                    {task.hourReport !== undefined && task.hourReport > 0 && <span className="text-[10px] text-gray-500">({task.hourReport}h בפועל)</span>}
                  </div>
                </td>

                {/* אחוז ניצול */}
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden min-w-[50px]">
                      <div
                        className={`h-2 rounded-full transition-all ${(task.utilizationPercentage || 0) >= 80 ? 'bg-emerald-500' : (task.utilizationPercentage || 0) >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${task.utilizationPercentage || 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-gray-700 min-w-[35px]">
                      {(task.utilizationPercentage || 0) % 1 !== 0 ? (task.utilizationPercentage || 0).toFixed(2) : Math.round(task.utilizationPercentage || 0)}%
                    </span>
                  </div>
                </td>

                {/* חשבון */}
                <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                  <button onClick={e => { handleSendInvoiceRequest(task, e); }}
                    className="relative px-2 py-1 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all flex items-center gap-1 text-xs font-bold mx-auto disabled:cursor-not-allowed disabled:opacity-50"
                    title={task.hasBill ? 'קיימת בקשת חשבון' : 'שלח בקשה להגשת חשבון'}>
                    <Send size={12} />
                    <span className="hidden lg:inline">חשבון</span>
                    {(task.hasBill || (billRequestTask && billRequestTask.id === task.id && billRequestTask.hasBill)) && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white" />
                    )}
                  </button>
                </td>
              </tr>
            );
            })}
            {sortedTasks.length === 0 && (
              <tr><td colSpan={17} className="px-4 py-2 text-center text-gray-400 text-xs">לא נמצאו משימות</td></tr>
            )}
          </tbody>
        </table>
      </HorizontalScrollContainer>

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
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">משימות</div>
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

      
      {showChatModal && chatTask && (
        <ChatModal task={chatTask} setTask={setChatTask} onClose={() => { handleCloseChat(); }} />
      )}

      {billRequestTask && (
        <PlanningBillRequestModal
          task={billRequestTask}
          onClose={() => setBillRequestTask(null)}
          onSuccess={() => {
            if (billRequestTask) {
              onTasksUpdate(tasks.map(t => t.id === billRequestTask.id ? { ...t, hasBill: true } : t));
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
        confirmText={messageBox.confirmText}
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