import { useEffect, useMemo, useState } from 'react';
import { Clock, Eye, MessageSquare, Filter, X, ChevronUp, ChevronDown, ChevronsUpDown, FileText, Trash2 } from 'lucide-react';
import { useTaskFilters } from '../../hooks/useTaskFilters';
import { useTaskGrouping } from '../../hooks/useTaskGrouping';
import TaskControls from './TaskControls';
import TaskCard from './TaskCard';
import ViewModal from '../../components/ViewModal';
import type { BillTaskReview, SystemTable } from '../../Data/projectsData';
import { getTaskPriorities, getTaskStatuses } from '../../services/taskService';
import { deletePlanningBill, getBillTasks, updateSubmitedBill } from '../../services/taskBillService';
import ChatModal from './ChatModal';
import type { DBFilters } from '../../Data/tasksData';
import DateFilter from '../shared/DateFilter';
import SearchableCheckboxFilter from '../shared/SearchableCheckboxFilter';
import DbFilterModal, { getDefaultDBFilters } from './DbFilterModal';
import { usePersistedDbFilters } from '../../hooks/usePersistedDbFilters';
import { usePersistedSessionState, isBillTasksActiveView } from '../../hooks/usePersistedSessionState';
import SubContractsModal from './SubContractsModal';
import MessageBox from '../shared/MessageBox';
import HorizontalScrollContainer from '../../components/HorizontalScrollContainer';
import { BRIGHT_SURFACE, TASK_FILTER_POPOVER, TASK_GROUP_CARD, TASK_HEADER_FILTER_BTN_INACTIVE, TASK_HEADER_TH_HOVER, TASK_TABLE_HEAD, TASK_TABLE_HEAD_CELL, TASK_TABLE_SHELL, TASK_TABLE_STICKY_CELL } from './taskViewTheme';


interface BillTasksProps {
  tasks: BillTaskReview[];
  onTaskUpdate: (updatedTask: BillTaskReview) => void;
  onTasksUpdate: (tasks: BillTaskReview[]) => void;
}

type ColumnFilterKey = 'isBilled' | 'project' | 'status' | 'sender' | 'openedDate';

type SortKey = 'subject' | 'name' | 'planningSubjectName' | 'projectName' | 'statusName' | 'senderName' | 'creatDate' | 'endDate' | 'workHours' | 'utilizationPercentage';
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

export default function BillTasks({ tasks, onTaskUpdate, onTasksUpdate }: BillTasksProps) {
  const getBillTasksDefaultFilters = () => getDefaultDBFilters([], 'no');
  const [showViewModal, setShowViewModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [dbFilters, setDbFilters] = usePersistedDbFilters('taskit.dbFilters.billTasks', getBillTasksDefaultFilters);
  const [activeView, setActiveView] = usePersistedSessionState('taskit.ui.billTasks.activeView', 'all', isBillTasksActiveView);
  const [selectedTask, setSelectedTask] = useState<BillTaskReview | null>(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatTask, setChatTask] = useState<BillTaskReview | null>(null);
  const [statuses, setStatuses] = useState<SystemTable[]>([]);
  const [priorities, setPriorities] = useState<SystemTable[]>([]);
  const [openColumnFilter, setOpenColumnFilter] = useState<ColumnFilterKey | null>(null);
  const [columnFilterSearch, setColumnFilterSearch] = useState({ project: '', status: '', sender: '' });
  const [columnFilters, setColumnFilters] = useState({
    billedStates: [] as string[],
    projects: [] as string[],
    statuses: [] as number[],
    senders: [] as string[],
    openedDateFrom: '',
    openedDateTo: '',
  });
  const [sort, setSort] = useState<SortState>({ key: null, dir: null });
  const [deletingBillId, setDeletingBillId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
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
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
  });

  const closeMessageBox = () => {
    setMessageBox(prev => ({
      ...prev,
      isOpen: false,
      showCancel: false,
      onConfirm: undefined,
      onCancel: undefined,
    }));
  };

  const showMessage = (
    message: string,
    title = 'הודעה',
    type: 'alert' | 'success' | 'error' | 'warning' = 'alert',
  ) => {
    setMessageBox({ isOpen: true, title, message, type, confirmText: 'אישור' });
  };

  const openConfirm = (message: string, title = 'אישור'): Promise<boolean> =>
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
        },
      });
    });

  // ── תתי חוזים ──
  const [showSubContractsModal, setShowSubContractsModal] = useState(false);
  const [subContractsTask, setSubContractsTask] = useState<BillTaskReview | null>(null);

  const handleSort = (key: SortKey) => {
    setSort(prev => {
      if (prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return { key: null, dir: null };
    });
  };

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

  const billedStateOptions = useMemo(() => [
    { value: 'billed', label: 'הוגש חשבון' },
    { value: 'notBilled', label: 'לא הוגש' },
  ], []);

  const columnFilteredTasks = useMemo(() =>
    filteredTasks.filter(task => {
      const billedState = task.isSubmited ? 'billed' : 'notBilled';
      return (
        (columnFilters.billedStates.length === 0 || columnFilters.billedStates.includes(billedState)) &&
        (columnFilters.projects.length === 0 || columnFilters.projects.includes(task.projectName)) &&
        (columnFilters.statuses.length === 0 || columnFilters.statuses.includes(task.statuID ?? 0)) &&
        (columnFilters.senders.length === 0 || columnFilters.senders.includes(task.senderName)) &&
        matchesDateRange(task.creatDate, columnFilters.openedDateFrom, columnFilters.openedDateTo)
      );
    }), [filteredTasks, columnFilters]);

  const sortTasks = (taskList: BillTaskReview[]) => {
    if (!sort.key || !sort.dir) return taskList;
    return [...taskList].sort((a, b) => {
      const key = sort.key!;
      let aVal: string | number = '';
      let bVal: string | number = '';
      if (key === 'creatDate') { aVal = toComparableDate(a.creatDate) ?? ''; bVal = toComparableDate(b.creatDate) ?? ''; }
      else if (key === 'endDate') { aVal = toComparableDate(a.endDate) ?? ''; bVal = toComparableDate(b.endDate) ?? ''; }
      else if (key === 'workHours') { aVal = a.workHours ?? 0; bVal = b.workHours ?? 0; }
      else if (key === 'utilizationPercentage') { aVal = a.utilizationPercentage ?? 0; bVal = b.utilizationPercentage ?? 0; }
      else { aVal = (a[key as keyof BillTaskReview] as string | null | undefined) ?? ''; bVal = (b[key as keyof BillTaskReview] as string | null | undefined) ?? ''; }
      if (typeof aVal === 'number' && typeof bVal === 'number')
        return sort.dir === 'asc' ? aVal - bVal : bVal - aVal;
      const cmp = String(aVal).localeCompare(String(bVal), 'he', { sensitivity: 'base' });
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  };

  const groupedTasks = useTaskGrouping(columnFilteredTasks, activeView);

  const columnFilterCount =
    columnFilters.billedStates.length +
    columnFilters.projects.length +
    columnFilters.statuses.length +
    columnFilters.senders.length +
    (columnFilters.openedDateFrom ? 1 : 0) +
    (columnFilters.openedDateTo ? 1 : 0);

  const isColumnFilterActive = (filterKey: ColumnFilterKey) => {
    switch (filterKey) {
      case 'isBilled':    return columnFilters.billedStates.length > 0;
      case 'project':     return columnFilters.projects.length > 0;
      case 'status':      return columnFilters.statuses.length > 0;
      case 'sender':      return columnFilters.senders.length > 0;
      case 'openedDate':  return Boolean(columnFilters.openedDateFrom || columnFilters.openedDateTo);
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
      const isSubmitedFilter =
        filters?.closedTasks === 'yes' ? true : filters?.closedTasks === 'no' ? false : undefined;
      const data = await getBillTasks(
        filters?.dateFrom || null,
        filters?.dateTo || null,
        isSubmitedFilter,
        {
          statusIds: filters?.status.length ? filters.status : undefined,
          projectIds: filters?.projects.length ? filters.projects : undefined,
          employeeIds: filters?.senders.length ? filters.senders : undefined,
        },
      );
      const filtered =
        isSubmitedFilter === undefined
          ? data
          : (data ?? []).filter(task => task.isSubmited === isSubmitedFilter);
      if (isMounted) onTasksUpdate(filtered ?? []);
    } catch (error) { console.error('Error loading bill tasks:', error); }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadTasks(true, dbFilters);
    } finally {
      setRefreshing(false);
    }
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
    void loadTasks(isMounted, dbFilters);
    void loadStatuses();
    void loadPriorities();
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount; filter modal calls loadTasks on apply
  }, []);

  const handleBilledChange = async (planningBillID: number, checked: boolean) => {
    const previousTasks = tasks;
    const updatedTasks = tasks.map(task => (
      task.planningBillID === planningBillID ? { ...task, isSubmited: checked } : task
    ));
    onTasksUpdate(updatedTasks);
    const updatedTask = updatedTasks.find(t => t.planningBillID === planningBillID);
    if (updatedTask) onTaskUpdate(updatedTask);

    try {
      const ok = await updateSubmitedBill(planningBillID, checked);
      if (!ok) {
        onTasksUpdate(previousTasks);
        const reverted = previousTasks.find(t => t.planningBillID === planningBillID);
        if (reverted) onTaskUpdate(reverted);
        showMessage('בקשת החשבון לא נמצאה', 'שגיאה', 'error');
        return;
      }
    } catch (err) {
      onTasksUpdate(previousTasks);
      const reverted = previousTasks.find(t => t.planningBillID === planningBillID);
      if (reverted) onTaskUpdate(reverted);
      const message = err instanceof Error && err.message.trim()
        ? err.message.trim()
        : 'שגיאה בעדכון סטטוס הגשת החשבון';
      showMessage(message, 'שגיאה', 'error');
    }
  };

  const handleDeleteBill = async (planningBillID: number) => {
    const confirmed = await openConfirm('האם למחוק את בקשת החשבון?', 'מחיקת בקשת חשבון');
    if (!confirmed) return;
    setDeletingBillId(planningBillID);
    try {
      const ok = await deletePlanningBill(planningBillID);
      if (!ok) {
        showMessage('בקשת החשבון לא נמצאה', 'שגיאה', 'error');
        return;
      }
      onTasksUpdate(tasks.filter(t => t.planningBillID !== planningBillID));
      showMessage('בקשת החשבון נמחקה בהצלחה', 'הצלחה', 'success');
    } catch (err) {
      const message = err instanceof Error && err.message.trim()
        ? err.message.trim()
        : 'שגיאה במחיקת בקשת החשבון';
      showMessage(message, 'שגיאה', 'error');
    } finally {
      setDeletingBillId(null);
    }
  };

  const getStatusColorByKey = (statusId: number) => {
    const color = statuses.find(s => s.id === statusId)?.color ?? '';
    return color ? { color, stroke: color } as React.CSSProperties : undefined;
  };

  return (
    <>
      <TaskControls
        viewMode="list" setViewMode={() => {}}
        ganttTimeframe="weekly" setGanttTimeframe={() => {}}
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        selectedEmployee="" setSelectedEmployee={() => {}} allEmployees={[]}
        currentView="billTasks" activeFiltersCount={activeFiltersCount + columnFilterCount}
        onShowViewModal={() => setShowViewModal(true)}
        onShowFilterModal={() => setShowFilterModal(true)}
        onRefresh={() => { void handleRefresh(); }}
        refreshing={refreshing}
        totalTasks={tasks.length} filteredTasksCount={columnFilteredTasks.length}
      />

      <div className="space-y-6">
        {Object.entries(groupedTasks).map(([groupName, groupTasks]) => {
          const sorted = sortTasks(groupTasks);
          return (
            <div key={groupName} className={TASK_GROUP_CARD}>
              {activeView !== 'all' && (
                <div className={`px-6 py-3 flex items-center justify-between ${
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
                <table style={{ minWidth: '1700px', width: '100%' }}>
                  <thead className={TASK_TABLE_HEAD}>
                    <tr>
                      {/* Eye sticky */}
                      <th className={`px-2 py-2 w-10 sticky right-0 z-20 ${TASK_TABLE_HEAD_CELL}`} />

                      {/* הוגש חשבון */}
                      {renderHeaderFilter({
                        filterKey: 'isBilled',
                        label: 'הוגש חשבון',
                        headerClassName: 'px-3 py-2 text-center text-xs font-semibold text-gray-700 w-24 whitespace-nowrap',
                        align: 'center',
                        children: (
                          <SearchableCheckboxFilter
                            searchValue=""
                            onSearchChange={() => {}}
                            options={billedStateOptions}
                            selectedValues={columnFilters.billedStates}
                            onToggle={v => setColumnFilters(p => ({ ...p, billedStates: toggleArrayFilter(p.billedStates, v) }))}
                            onClear={() => setColumnFilters(p => ({ ...p, billedStates: [] }))}
                            searchPlaceholder=""
                            emptyMessage="לא נמצאו"
                          />
                        ),
                      })}

                      {/* מתי נפתחה הבקשה */}
                      {renderHeaderFilter({
                        filterKey: 'openedDate',
                        label: 'מתי נפתחה הבקשה',
                        headerClassName: 'px-3 py-2 text-right text-xs font-semibold text-emerald-700 w-36 whitespace-nowrap',
                        contentClassName: 'w-80',
                        sortKey: 'creatDate',
                        children: (
                          <DateFilter
                            fromDate={columnFilters.openedDateFrom}
                            toDate={columnFilters.openedDateTo}
                            onFromDateChange={v => setColumnFilters(p => ({ ...p, openedDateFrom: v }))}
                            onToDateChange={v => setColumnFilters(p => ({ ...p, openedDateTo: v }))}
                            onClear={() => { setColumnFilters(p => ({ ...p, openedDateFrom: '', openedDateTo: '' })); setOpenColumnFilter(null); }}
                          />
                        ),
                      })}

                      {/* פותח הבקשה */}
                      {renderHeaderFilter({
                        filterKey: 'sender',
                        label: 'פותח הבקשה',
                        headerClassName: 'px-3 py-2 text-right text-xs font-semibold text-gray-700 w-28 whitespace-nowrap',
                        sortKey: 'senderName',
                        children: (
                          <SearchableCheckboxFilter
                            searchValue={columnFilterSearch.sender}
                            onSearchChange={v => setColumnFilterSearch(p => ({ ...p, sender: v }))}
                            options={senderFilterOptions} selectedValues={columnFilters.senders}
                            onToggle={v => setColumnFilters(p => ({ ...p, senders: toggleArrayFilter(p.senders, v) }))}
                            onClear={() => { setColumnFilters(p => ({ ...p, senders: [] })); setOpenColumnFilter(null); }}
                            searchPlaceholder="חיפוש פותח..." emptyMessage="לא נמצאו"
                          />
                        ),
                      })}

                      <SortableTh sortKey="subject" label="תיאור המשימה" className="px-3 py-2 text-right text-xs font-semibold text-gray-700 min-w-[200px]" sort={sort} onSort={handleSort} />

                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 min-w-[140px] whitespace-nowrap">הערה</th>

                      {/* Chat */}
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 w-16">צ'אט</th>

                      {/* תת חוזה — עמודה חדשה */}
                      <th className="px-3 py-2 text-center text-xs font-semibold text-amber-700 w-20 whitespace-nowrap">
                        תת חוזה
                      </th>

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
                        filterKey: 'status', label: 'סטטוס משימה',
                        headerClassName: 'px-3 py-2 text-right text-xs font-semibold text-gray-700 w-28 min-w-[7rem] whitespace-nowrap',
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

                      <SortableTh sortKey="workHours" label="תקצוב שעות למשימה" className="px-3 py-2 text-right text-xs font-semibold text-emerald-700 w-32" sort={sort} onSort={handleSort} />
                      <SortableTh sortKey="utilizationPercentage" label="אחוז ניצול במשימה" className="px-3 py-2 text-center text-xs font-semibold text-emerald-700 w-28" sort={sort} onSort={handleSort} />
                      <th className="px-3 py-2 text-center text-xs font-semibold text-red-600 w-16 whitespace-nowrap">מחק</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {sorted.map(task => (
                      <tr key={task.planningBillID} className="hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors relative group">

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

                        {/* הוגש חשבון */}
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={task.isSubmited || false}
                            onChange={e => { void handleBilledChange(task.planningBillID, e.target.checked); }}
                            className="w-4 h-4 rounded border-gray-300 text-emerald-500 cursor-pointer"
                          />
                        </td>

                        {/* מתי נפתחה הבקשה */}
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <Clock size={12} className="text-gray-400" />
                            <span className="text-xs text-gray-600">
                              {task.creatDate ? new Date(task.creatDate).toLocaleDateString('en-GB') : '-'}
                            </span>
                          </div>
                        </td>

                        {/* פותח הבקשה */}
                        <td className="px-3 py-2">
                          <span
                            className="text-xs text-gray-600 block overflow-hidden"
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                            title={task.senderName}
                          >
                            {task.senderName}
                          </span>
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

                        {/* הערה */}
                        <td className="px-3 py-2 max-w-[160px]">
                          <span
                            className="text-xs text-gray-600 block overflow-hidden"
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                            title={task.billNote ?? ''}
                          >
                            {task.billNote?.trim() || '-'}
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
                            {(task.hasChat || (chatTask && chatTask.planningBillID === task.planningBillID && chatTask.hasChat)) && (
                              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white" />
                            )}
                          </button>
                        </td>

                        {/* תת חוזה — תא חדש */}
                        <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setSubContractsTask(task);
                              setShowSubContractsModal(true);
                            }}
                            className="p-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-all"
                            title="תתי חוזים משויכים"
                          >
                            <FileText size={14} />
                          </button>
                        </td>

                        {/* שלב */}
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex px-2 py-0.5 ${BRIGHT_SURFACE} bg-purple-100 text-purple-700 rounded-full text-xs font-medium max-w-[140px] overflow-hidden`}
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                            title={task.name}
                          >
                            {task.name}
                          </span>
                        </td>

                        {/* נושא תכנון */}
                        <td className="px-3 py-2">
                          <span
                            className="text-xs text-gray-600 block overflow-hidden"
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                            title={task.planningSubjectName}
                          >
                            {task.planningSubjectName}
                          </span>
                        </td>

                        {/* פרויקט */}
                        <td className="px-3 py-2 w-48">
                          <span
                            className="text-xs text-gray-600 block overflow-hidden"
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                            title={task.projectName}
                          >
                            {task.projectName}
                          </span>
                        </td>

                        {/* סטטוס */}
                        <td className="px-3 py-2 w-28 min-w-[7rem]">
                          <div className="flex flex-col gap-1 w-full">
                            <span
                              className="text-xs font-medium px-2 py-1 rounded-full border w-full overflow-hidden whitespace-nowrap text-ellipsis block text-right"
                              style={getStatusColorByKey(task.statuID ?? 0)}
                              title={task.statusName}
                            >
                              {task.statusName?.trim() ? truncateTo18(task.statusName) : '-'}
                            </span>

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

                        {/* ניצול שעות */}
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

                        <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => { void handleDeleteBill(task.planningBillID); }}
                            disabled={deletingBillId === task.planningBillID}
                            className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            title="מחק בקשת חשבון"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>

                      </tr>
                    ))}

                    {sorted.length === 0 && (
                      <tr>
                        <td colSpan={16} className="px-4 py-2 text-center text-gray-400 text-xs">
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

      {/* ── מקטע הערות ── */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mt-4">
        <div className="flex items-center gap-2 mb-3 border-b border-amber-200 pb-2">
          <span className="text-amber-600 text-lg">💡</span>
          <h3 className="text-sm font-semibold text-amber-800">הערות</h3>
        </div>
        <ul className="space-y-2">
          <li className="flex items-start gap-2 text-sm text-amber-800">
            <span className="text-amber-500 mt-0.5">•</span>
            <span><strong>סטטוס חשבונות:</strong> בבורד זה יוצגו אך ורק משימות שעבורן נפתחה בקשה פעילה להגשת חשבון.</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-amber-800">
            <span className="text-amber-500 mt-0.5">•</span>
            <span><strong>ניהול תצוגה וחיתוכים:</strong> ניתן לשנות את מבנה התצוגה מרשימה לקיבוץ ולסנן את המשימות באופן דינמי</span>
          </li>
        </ul>
      </div>

      {showViewModal && (
        <ViewModal
          activeView={activeView}
          onViewChange={view => { setActiveView(view as any); setShowViewModal(false); }}
          hideUrgencyOption
          onClose={() => setShowViewModal(false)}
        />
      )}

      {showFilterModal && (
        <DbFilterModal
          onClose={() => setShowFilterModal(false)}
          onApply={nextFilters => { setDbFilters(nextFilters); loadTasks(true, nextFilters); }}
          currentFilters={dbFilters}
          defaultClosedTasks="no"
          closedTasksLabel="חשבונות שהוגשו"
          senderLabel="פותח הבקשה"
          hideUrgency
        />
      )}

      {selectedTask && (
        <TaskCard
          task={selectedTask}
          readOnly
          onClose={() => setSelectedTask(null)}
          onUpdate={() => {}}
          viewMode="myTasks"
          statuses={statuses}
          priorities={priorities}
        />
      )}

      {showChatModal && chatTask && (
        <ChatModal
          task={chatTask}
          setTask={updater => setChatTask(prev => (
            typeof updater === 'function' ? updater(prev) as BillTaskReview | null : updater as BillTaskReview | null
          ))}
          onClose={() => {
            if (chatTask?.hasChat) onTasksUpdate(tasks.map(t => t.planningBillID === chatTask.planningBillID ? { ...t, hasChat: true } : t));
            setShowChatModal(false);
          }}
        />
      )}

      {/* ── מודל תתי חוזים ── */}
      {showSubContractsModal && subContractsTask && (
        <SubContractsModal
          task={subContractsTask}
          onClose={() => { setShowSubContractsModal(false); setSubContractsTask(null); }}
        />
      )}

      <MessageBox
        isOpen={messageBox.isOpen}
        onClose={closeMessageBox}
        title={messageBox.title}
        message={messageBox.message}
        type={messageBox.type}
        confirmText={messageBox.confirmText}
        cancelText={messageBox.cancelText}
        showCancel={messageBox.showCancel}
        onConfirm={messageBox.onConfirm}
        onCancel={messageBox.onCancel}
      />
    </>
  );
}