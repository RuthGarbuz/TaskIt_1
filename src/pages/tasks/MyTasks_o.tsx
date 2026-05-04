import { useEffect, useMemo, useState } from 'react';
import { Clock, AlertCircle, Eye, MessageSquare, Send, Filter, X, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { useTaskFilters } from '../../hooks/useTaskFilters';
import { useTaskGrouping } from '../../hooks/useTaskGrouping';
import TaskControls from './TaskControls';
import TaskCard from './TaskCard';
import ViewModal from '../../components/ViewModal';
import GanttChart from './GanttChart';
import HoursReportModal from '../hoursReport/HoursReportModal';
import type { SystemTable, TaskReview } from '../../Data/projectsData';
import { getTaskPriorities, getTaskStatuses, updateStatusAsync, getMyTasks, updateIsClosedAsync } from '../../services/taskService';
import ChatModal from './ChatModal';
import authService from '../../services/authService';
import type { HoursReport } from '../../Data/HoursReportData';
import type { DBFilters } from '../../Data/tasksData';
import DateFilter from '../shared/DateFilter';
import SearchableCheckboxFilter from '../shared/SearchableCheckboxFilter';
import DbFilterModal, { getDefaultDBFilters } from './DbFilterModal';
import { usePersistedDbFilters } from '../../hooks/usePersistedDbFilters';

interface MyTasksProps {
  tasks: TaskReview[];
  onTaskUpdate: (updatedTask: TaskReview) => void;
  onTasksUpdate: (tasks: TaskReview[]) => void;
}

type StatusKey = 'todo' | 'inProgress' | 'done';
type ColumnFilterKey = 'project' | 'status' | 'urgency' | 'sender' | 'startDate' | 'endDate';

// ─── Sort types ───────────────────────────────────────────────────────────────

type SortKey = 'subject' | 'name' | 'planningSubjectName' | 'projectName' | 'statusName' | 'urgencyName' | 'senderName' | 'startDate' | 'endDate' | 'workHours' | 'utilizationPercentage';
type SortDir = 'asc' | 'desc' | null;
interface SortState { key: SortKey | null; dir: SortDir; }

// ─── Sort helpers — OUTSIDE component ────────────────────────────────────────

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active || !dir) return <ChevronsUpDown size={11} className="text-gray-400" />;
  return dir === 'asc' ? <ChevronUp size={11} className="text-emerald-600" /> : <ChevronDown size={11} className="text-emerald-600" />;
}

function SortableTh({ sortKey, label, className, sort, onSort }: {
  sortKey: SortKey; label: string; className: string; sort: SortState; onSort: (k: SortKey) => void;
}) {
  return (
    <th className={`${className} cursor-pointer select-none hover:bg-gray-100 transition-colors`} onClick={() => onSort(sortKey)}>
      <div className="flex items-center gap-1">
        <span>{label}</span>
        <SortIcon active={sort.key === sortKey} dir={sort.key === sortKey ? sort.dir : null} />
      </div>
    </th>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MyTasks({ tasks, onTaskUpdate, onTasksUpdate }: MyTasksProps) {
  const [viewMode, setViewMode] = useState<'list' | 'gantt'>('list');
  const [ganttTimeframe, setGanttTimeframe] = useState<'weekly' | 'monthly'>('weekly');
  const [ganttTask, setGanttTask] = useState<TaskReview[]>([]);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [dbFilters, setDbFilters] = usePersistedDbFilters('taskit.dbFilters.myTasks', getDefaultDBFilters);
  const [activeView, setActiveView] = useState<'all' | 'status' | 'urgency' | 'project' | 'date'>('all');
  const [selectedTask, setSelectedTask] = useState<TaskReview | null>(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatTask, setChatTask] = useState<TaskReview | null>(null);
  const [hoveredTaskId, setHoveredTaskId] = useState<number | null>(null);
  const [showHoursModal, setShowHoursModal] = useState(false);
  const [hoursTask, setHoursTask] = useState<TaskReview | null>(null);
  const [statuses, setStatuses] = useState<SystemTable[]>([]);
  const [priorities, setPriorities] = useState<SystemTable[]>([]);
  const [openColumnFilter, setOpenColumnFilter] = useState<ColumnFilterKey | null>(null);
  const [columnFilterSearch, setColumnFilterSearch] = useState({ project: '', status: '', urgency: '', sender: '' });
  const [columnFilters, setColumnFilters] = useState({
    projects: [] as string[], statuses: [] as number[], urgencies: [] as string[],
    senders: [] as string[], startDateFrom: '', startDateTo: '', endDateFrom: '', endDateTo: '',
  });

  // ─── Sort state ───────────────────────────────────────────────────────────
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

  const columnFilteredTasks = useMemo(() =>
    filteredTasks.filter(task =>
      (columnFilters.projects.length === 0 || columnFilters.projects.includes(task.projectName)) &&
      (columnFilters.statuses.length === 0 || columnFilters.statuses.includes(task.statuID ?? 0)) &&
      (columnFilters.urgencies.length === 0 || columnFilters.urgencies.includes(task.urgencyName)) &&
      (columnFilters.senders.length === 0 || columnFilters.senders.includes(task.senderName)) &&
      matchesDateRange(task.startDate, columnFilters.startDateFrom, columnFilters.startDateTo) &&
      matchesDateRange(task.endDate, columnFilters.endDateFrom, columnFilters.endDateTo)
    ), [filteredTasks, columnFilters]);

  // ─── Sort tasks ───────────────────────────────────────────────────────────
  const sortTasks = (taskList: TaskReview[]) => {
    if (!sort.key || !sort.dir) return taskList;
    return [...taskList].sort((a, b) => {
      const key = sort.key!;
      let aVal: string | number = '';
      let bVal: string | number = '';

      if (key === 'startDate') {
        aVal = toComparableDate(a.startDate) ?? '';
        bVal = toComparableDate(b.startDate) ?? '';
      } else if (key === 'endDate') {
        aVal = toComparableDate(a.endDate) ?? '';
        bVal = toComparableDate(b.endDate) ?? '';
      } else if (key === 'workHours') {
        aVal = a.workHours ?? 0; bVal = b.workHours ?? 0;
      } else if (key === 'utilizationPercentage') {
        aVal = a.utilizationPercentage ?? 0; bVal = b.utilizationPercentage ?? 0;
      } else {
        aVal = (a[key as keyof TaskReview] as string | null | undefined) ?? '';
        bVal = (b[key as keyof TaskReview] as string | null | undefined) ?? '';
      }

      if (typeof aVal === 'number' && typeof bVal === 'number')
        return sort.dir === 'asc' ? aVal - bVal : bVal - aVal;
      const cmp = String(aVal).localeCompare(String(bVal), 'he', { sensitivity: 'base' });
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  };

  const groupedTasks = useTaskGrouping(columnFilteredTasks, activeView);

  const columnFilterCount =
    columnFilters.projects.length + columnFilters.statuses.length +
    columnFilters.urgencies.length + columnFilters.senders.length +
    (columnFilters.startDateFrom ? 1 : 0) + (columnFilters.startDateTo ? 1 : 0) +
    (columnFilters.endDateFrom ? 1 : 0) + (columnFilters.endDateTo ? 1 : 0);

  const isColumnFilterActive = (filterKey: ColumnFilterKey) => {
    switch (filterKey) {
      case 'project':   return columnFilters.projects.length > 0;
      case 'status':    return columnFilters.statuses.length > 0;
      case 'sender':    return columnFilters.senders.length > 0;
      case 'urgency':   return columnFilters.urgencies.length > 0;
      case 'startDate': return Boolean(columnFilters.startDateFrom || columnFilters.startDateTo);
      case 'endDate':   return Boolean(columnFilters.endDateFrom || columnFilters.endDateTo);
      default: return false;
    }
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
      className={`${headerClassName} relative ${sortKey ? 'cursor-pointer hover:bg-gray-100' : ''}`}
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
              ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
              : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-100'
          }`}
          title={`סינון ${label}`}
        >
          <Filter size={12} />
        </button>
      </div>
      {openColumnFilter === filterKey && (
        <div className={`absolute mt-2 z-50 ${contentClassName} rounded-xl border border-gray-200 bg-white shadow-xl p-3`}
          style={{ top: 'auto' }} onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-800">סינון {label}</span>
            <button type="button" onClick={() => setOpenColumnFilter(null)} className="p-1 rounded-md text-gray-500 hover:bg-gray-100">
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
    const intervalId = window.setInterval(() => loadTasks(true, dbFilters), 30000);
    return () => { isMounted = false; window.clearInterval(intervalId); };
  }, [onTasksUpdate, dbFilters]);

  useEffect(() => {
    let isMounted = true;
    if (viewMode !== 'gantt') return () => { isMounted = false; };
    loadGanttTasks(isMounted, dbFilters);
    const intervalId = window.setInterval(() => loadGanttTasks(true, dbFilters), 30000);
    return () => { isMounted = false; window.clearInterval(intervalId); };
  }, [viewMode, dbFilters]);

  const handleTaskStatusChange = async (taskId: number, statusId: number) => {
    const nextStatusName = statusOptions.find(s => s.id === statusId)?.name ?? '';
    const isTask = tasks.find(t => t.id === taskId)?.isPlanningSte ?? false;
    await updateStatusAsync(taskId, statusId, !isTask, false);
    onTasksUpdate(tasks.map(task => task.id === taskId
      ? { ...task, statuID: statusId, statusName: nextStatusName || task.statusName, isClosed: statusKeyFromName(nextStatusName || task.statusName) === 'done' }
      : task));
  };

  const handleTaskUpdateFromCard = async (updatedTask: TaskReview) => {
    const currentTask = tasks.find(t => t.id === updatedTask.id);
    const isTask = currentTask?.isPlanningSte ?? false;
    if (currentTask && currentTask.statuID !== updatedTask.statuID) {
      const nextStatusName = statusOptions.find(s => s.id === (updatedTask.statuID ?? 0))?.name ?? updatedTask.statusName ?? '';
      await updateStatusAsync(updatedTask.id, updatedTask.statuID ?? 0, !isTask, false);
      updatedTask = { ...updatedTask, statusName: nextStatusName, isClosed: statusKeyFromName(nextStatusName) === 'done' };
    }
    if (currentTask && currentTask.isClosed !== updatedTask.isClosed)
      await updateIsClosedAsync(updatedTask.id, updatedTask.isClosed ?? false, !isTask);
    onTasksUpdate(tasks.map(t => t.id === updatedTask.id ? { ...updatedTask } : t));
    onTaskUpdate(updatedTask);
  };

  const getUrgencyColorByKey = (urgencyId: number) => {
    const color = priorities.find(p => p.id === urgencyId)?.color ?? '';
    return color ? { color, stroke: color } as React.CSSProperties : undefined;
  };

  const getStatusColorByKey = (statusId: number) => {
    const color = statuses.find(s => s.id === statusId)?.color ?? '';
    return color ? { color, stroke: color } as React.CSSProperties : undefined;
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
        totalTasks={tasks.length} filteredTasksCount={columnFilteredTasks.length}
      />

      {viewMode === 'list' ? (
        <div className="space-y-6">
          {Object.entries(groupedTasks).map(([groupName, groupTasks]) => {
            const sorted = sortTasks(groupTasks);
            return (
              <div key={groupName} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
                {activeView !== 'all' && (
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-bold text-lg">{groupName}</h3>
                      <p className="text-emerald-100 text-sm">{groupTasks.length} משימות</p>
                    </div>
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-white bg-opacity-25 text-white rounded-full text-sm font-bold">
                      {groupTasks.length}
                    </span>
                  </div>
                )}

                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table style={{ minWidth: '1800px', width: '100%' }}>
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <SortableTh sortKey="subject" label="תיאור המשימה" className="px-3 py-2 text-right text-xs font-semibold text-gray-700 min-w-[200px]" sort={sort} onSort={handleSort} />
                        <th className="px-3 py-2 text-center text-xs font-semibold text-emerald-700 w-16">Chat</th>
                        <SortableTh sortKey="name" label="שלב" className="px-3 py-2 text-right text-xs font-semibold text-gray-700 w-32" sort={sort} onSort={handleSort} />
                        <SortableTh sortKey="planningSubjectName" label="נושא תכנון" className="px-3 py-2 text-right text-xs font-semibold text-gray-700 w-36" sort={sort} onSort={handleSort} />

                        {renderHeaderFilter({
                          filterKey: 'project', label: 'פרויקט',
                          headerClassName: 'px-3 py-2 text-right text-xs font-semibold text-gray-700 w-28',
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
                          filterKey: 'status', label: 'סטטוס',
                          headerClassName: 'px-3 py-2 text-right text-xs font-semibold text-gray-700 w-20',
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
                          filterKey: 'urgency', label: 'דחיפות',
                          headerClassName: 'px-3 py-2 text-right text-xs font-semibold text-gray-700 w-20',
                          sortKey: 'urgencyName',
                          children: (
                            <SearchableCheckboxFilter
                              searchValue={columnFilterSearch.urgency}
                              onSearchChange={v => setColumnFilterSearch(p => ({ ...p, urgency: v }))}
                              options={urgencyFilterOptions} selectedValues={columnFilters.urgencies}
                              onToggle={v => setColumnFilters(p => ({ ...p, urgencies: toggleArrayFilter(p.urgencies, v) }))}
                              onClear={() => { setColumnFilters(p => ({ ...p, urgencies: [] })); setOpenColumnFilter(null); }}
                              searchPlaceholder="חיפוש דחיפות..." emptyMessage="לא נמצאו דרגות דחיפות"
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

                        <th className="px-3 py-2 text-center text-xs font-semibold text-emerald-700 w-28">תלוי שלב/משימה</th>
                        <SortableTh sortKey="workHours" label="תקצוב שעות" className="px-3 py-2 text-right text-xs font-semibold text-emerald-700 w-24" sort={sort} onSort={handleSort} />
                        <SortableTh sortKey="utilizationPercentage" label="אחוז ניצול" className="px-3 py-2 text-center text-xs font-semibold text-emerald-700 w-28" sort={sort} onSort={handleSort} />
                        <th className="px-3 py-2 text-center text-xs font-semibold text-emerald-700 w-28">דיווח שעות</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-emerald-700 w-20">חשבון</th>
                        <th className="px-2 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {sorted.map(task => (
                        <tr key={task.id}
                          onMouseEnter={() => setHoveredTaskId(task.id)}
                          onMouseLeave={() => setHoveredTaskId(null)}
                          className="hover:bg-emerald-50 transition-colors relative group"
                        >
                          <td className="px-3 py-2">
                            <span className={`text-xs font-medium ${task.isClosed ? 'line-through text-gray-400' : 'text-gray-900'} px-1 rounded`}>
                              {task.subject}
                            </span>
                          </td>

                          <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                            <button onClick={e => { e.stopPropagation(); setChatTask(task); setShowChatModal(true); }}
                              className="relative p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all" title="פתח צ'אט">
                              <MessageSquare size={14} />
                              {(task.hasChat || (chatTask && chatTask.id === task.id && chatTask.hasChat)) && (
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white" />
                              )}
                            </button>
                          </td>

                          <td className="px-3 py-2">
                            <span className="inline-flex px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">{task.name}</span>
                          </td>

                          <td className="px-3 py-2">
                            <span className="text-xs text-gray-600">{task.planningSubjectName}</span>
                          </td>

                          <td className="px-3 py-2">
                            <span className="text-xs text-gray-600">{task.projectName}</span>
                          </td>

                          <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                            <select
                              value={String(statusOptions.find(s => s.name === task.statusName)?.id ?? task.statuID ?? 0)}
                              onChange={e => handleTaskStatusChange(task.id, Number(e.target.value))}
                              disabled={task.isClosed && task.senderID !== userId}
                              className="text-xs font-medium px-2 py-1 rounded-full border cursor-pointer focus:ring-2 focus:ring-emerald-500"
                              style={getStatusColorByKey(task.statuID ?? 0)}
                            >
                              {task.statuID === 0 && !statusOptions.some(s => s.name === task.statusName) && <option value="0">{task.statusName}</option>}
                              {statusOptions.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                            </select>
                          </td>

                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              <AlertCircle size={12} style={getUrgencyColorByKey(task.urgencyID)} />
                              <span className="text-xs font-medium" style={getUrgencyColorByKey(task.urgencyID)}>{task.urgencyName}</span>
                            </div>
                          </td>

                          <td className="px-3 py-2">
                            <span className="text-xs text-gray-600">{task.senderName}</span>
                          </td>

                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              <Clock size={12} className="text-gray-400" />
                              <span className="text-xs text-gray-600">
                                {task.startDate ? new Date(task.startDate).toLocaleDateString('en-GB') : '-'}
                              </span>
                            </div>
                          </td>

                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              <Clock size={12} className="text-gray-400" />
                              <span className="text-xs text-gray-600">
                                {task.endDate ? new Date(task.endDate).toLocaleDateString('en-GB') : '-'}
                              </span>
                            </div>
                          </td>

                          <td className="px-3 py-2 text-center">
                            <input type="checkbox" checked={task.dependsOnStepID || false} disabled className="w-4 h-4 text-emerald-600 rounded cursor-not-allowed opacity-60" />
                          </td>

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

                          <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                            <button onClick={e => { e.stopPropagation(); setHoursTask(task); setShowHoursModal(true); }}
                              className="px-2 py-1 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-all flex items-center gap-1 text-xs font-bold mx-auto"
                              title="דיווח שעות לשלב/משימה">
                              <Clock size={12} />
                              <span className="hidden lg:inline">דיווח</span>
                            </button>
                          </td>

                          <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                            <button onClick={e => { e.stopPropagation(); alert(`שליחת בקשה להגשת חשבון עבור: ${task.subject}`); }}
                              className="px-2 py-1 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all flex items-center gap-1 text-xs font-bold mx-auto"
                              title="שלח בקשה להגשת חשבון">
                              <Send size={12} />
                              <span className="hidden lg:inline">חשבון</span>
                            </button>
                          </td>

                          <td className="px-2 py-2">
                            <button onClick={() => setSelectedTask(task)}
                              className={`p-1 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all ${hoveredTaskId === task.id ? 'opacity-100' : 'opacity-0'}`}
                              title="צפה בכרטיס משימה">
                              <Eye size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}

                      {sorted.length === 0 && (
                        <tr>
                          <td colSpan={16} className="px-4 py-12 text-center text-gray-500">לא נמצאו משימות</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <GanttChart
          tasks={ganttTask} timeframe={ganttTimeframe} currentView="myTasks"
          statuses={statuses} priorities={priorities}
          onUpdate={(updatedTask) => { handleTaskUpdateFromCard(updatedTask); setSelectedTask(null); }}
          viewMode={'myTasks'}
        />
      )}

      {showViewModal && (
        <ViewModal activeView={activeView}
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
        <TaskCard task={selectedTask} onClose={() => setSelectedTask(null)}
          onUpdate={updatedTask => { handleTaskUpdateFromCard(updatedTask); setSelectedTask(null); }}
          viewMode="myTasks" statuses={statuses} priorities={priorities}
        />
      )}

      {showHoursModal && hoursTask && (
        <HoursReportModal task={hoursTask}
          onClose={() => { setShowHoursModal(false); setHoursTask(null); }}
          onSave={(report: HoursReport) => { console.log('Hours report saved:', report); }}
        />
      )}

      {showChatModal && chatTask && (
        <ChatModal task={chatTask} setTask={setChatTask}
          onClose={() => {
            if (chatTask?.hasChat) onTasksUpdate(tasks.map(t => t.id === chatTask.id ? { ...t, hasChat: true } : t));
            setShowChatModal(false);
          }}
        />
      )}
    </>
  );
}