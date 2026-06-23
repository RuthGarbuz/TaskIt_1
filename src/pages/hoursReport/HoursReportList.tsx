import React, { useEffect, useState, useMemo } from 'react';
import {
  Clock, Calendar, User, Briefcase,
  ChevronDown, ChevronUp, Trash2, X, Edit2, Filter, List,
  ChevronsUpDown,
} from 'lucide-react';

import HorizontalScrollContainer from '../../components/HorizontalScrollContainer';
import { APP_PANEL, BRIGHT_SURFACE, TASK_HEADER_FILTER_BTN_INACTIVE, TASK_TABLE_HEAD } from '../tasks/taskViewTheme';
import HoursReportHeader from './HoursReportHeader';
import HoursReportDbFilter, {
  getDefaultHoursDBFilters,
  countActiveHoursDbFilters,
} from './HoursReportDbFilter';
import { usePersistedHoursDbFilters } from '../../hooks/usePersistedHoursDbFilters';
import { usePersistedSessionState, isHoursReportViewMode } from '../../hooks/usePersistedSessionState';
import {
  formatDateHe, formatHours, getInitials,
  groupByDate, groupByEmployee, groupByProject,

  type HourReportList,
  type HourReportPlanningSubject,
  type HourReportProject,
  type HourReportStep,
  type HoursReport,
  type PlanningHierarchyByProjectResult,
} from '../../Data/HoursReportData';
import type { TaskReview } from '../../Data/projectsData';
import HoursReportModal from './HoursReportModal';
import {
  deleteHourReport,
  getHourReportProjects,
  getHourReports,
  getPlanningHierarchyByProjectId,
} from '../../services/hourReportService';
import authService from '../../services/authService';
import AutoComplete from '../shared/AutoComplete';
import SearchableCheckboxFilter from '../shared/SearchableCheckboxFilter';
import MyTasksReportModal, { type ReportColumn, type ReportRow } from '../tasks/MyTasksReportModal';
import MessageBox from '../shared/MessageBox';

type ViewMode = 'all' | 'date' | 'employee' | 'project';
type HoursColumnFilterKey = 'dateTime' | 'projectName' | 'employeeName';

// ─── Sort types ───────────────────────────────────────────────────────────────

type SortKey =
  | 'dateTime'
  | 'taskName'
  | 'stepName'
  | 'subjectName'
  | 'projectName'
  | 'employeeName'
  | 'hours';
type SortDir = 'asc' | 'desc' | null;
interface SortState { key: SortKey | null; dir: SortDir; }

function hourReportSortValue(r: HourReportList, key: SortKey): string | number {
  switch (key) {
    case 'dateTime': return r.dateTime;
    case 'taskName': return (r.taskName ?? '').trim();
    case 'stepName': return (r.stepName ?? '').trim();
    case 'subjectName': return (r.subjectName ?? '').trim();
    case 'projectName': return r.projectName ?? '';
    case 'employeeName': return r.employeeName ?? '';
    case 'hours': return r.hours ?? 0;
  }
}

function compareHourReportRows(a: HourReportList, b: HourReportList, key: SortKey, dir: 'asc' | 'desc'): number {
  const av = hourReportSortValue(a, key);
  const bv = hourReportSortValue(b, key);
  if (typeof av === 'number' && typeof bv === 'number')
    return dir === 'asc' ? av - bv : bv - av;
  const cmp = String(av).localeCompare(String(bv), 'he', { sensitivity: 'base' });
  return dir === 'asc' ? cmp : -cmp;
}

// ─── Sort helpers — OUTSIDE component ────────────────────────────────────────

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active || !dir) return <ChevronsUpDown size={11} className="text-gray-400" />;
  return dir === 'asc' ? <ChevronUp size={11} className="text-teal-600" /> : <ChevronDown size={11} className="text-teal-600" />;
}

function SortableTh({ sortKey, label, className, sort, onSort }: {
  sortKey: SortKey; label: string; className: string; sort: SortState; onSort: (k: SortKey) => void;
}) {
  return (
    <th className={`${className} cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`} onClick={() => onSort(sortKey)}>
      <div className="flex items-center gap-1">
        <span>{label}</span>
        <SortIcon active={sort.key === sortKey} dir={sort.key === sortKey ? sort.dir : null} />
      </div>
    </th>
  );
}

// ─── Avatar colors ────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'from-violet-400 to-purple-500', 'from-sky-400 to-blue-500',
  'from-rose-400 to-pink-500', 'from-amber-400 to-orange-500',
  'from-emerald-400 to-teal-500',
];
const avatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

const HOURS_REPORT_COLUMNS: ReportColumn[] = [
  { key: 'date', label: 'תאריך', widthPx: 120, widthChars: 16, align: 'right' },
  { key: 'taskName', label: 'משימה', widthPx: 280, widthChars: 42, align: 'right' },
  { key: 'stepName', label: 'שלב', widthPx: 180, widthChars: 26, align: 'right' },
  { key: 'subjectName', label: 'נושא תכנון', widthPx: 180, widthChars: 26, align: 'right' },
  { key: 'projectName', label: 'פרויקט', widthPx: 200, widthChars: 28, align: 'right' },
  { key: 'employeeName', label: 'עובד מדווח', widthPx: 160, widthChars: 22, align: 'right' },
  { key: 'startTime', label: 'משעה', widthPx: 90, widthChars: 12, align: 'center' },
  { key: 'endTime', label: 'עד שעה', widthPx: 90, widthChars: 12, align: 'center' },
  { key: 'hours', label: 'סה"כ שעות', widthPx: 110, widthChars: 12, align: 'center' },
  { key: 'description', label: 'הערות', widthPx: 320, widthChars: 48, align: 'right' }
];

// ── Data row ──────────────────────────────────────────────────────────────────

function DataRow({ r, onDelete, onEdit, hideDate, hideProject, hideEmployee }: {
  r: HourReportList; onDelete: (id: number) => void; onEdit: (r: HourReportList) => void;
  hideDate?: boolean; hideProject?: boolean; hideEmployee?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <tr className="hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors border-b border-gray-100 dark:border-gray-700 relative group"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {!hideDate && (
        <td className="px-4 py-2.5">
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{formatDateHe(r.dateTime)}</span>
        </td>
      )}
       <td className="px-3 py-2 max-w-[200px]">
                              <span
                                className="text-xs font-medium text-gray-900 dark:text-gray-100 px-1 rounded block overflow-hidden"
                                style={{
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                }}
                              >
                                {r.taskName}
                              </span>
                            </td>

      {/* <td className="px-4 py-2.5">
        <div className="text-xs font-semibold text-gray-800 leading-snug">{r.taskName}</div>
      </td> */}
      <td className="px-4 py-2.5">
        <div className="text-xs font-medium text-gray-700 dark:text-gray-200 leading-snug">{r.stepName}</div>
      </td>
      <td className="px-4 py-2.5">
        <div className="text-xs font-medium text-gray-700 dark:text-gray-200 leading-snug">{r.subjectName}</div>
      </td>
      {!hideProject && (
        <td className="px-4 py-2.5">
          <span className="inline-flex px-2 py-0.5  rounded-full text-xs font-medium">{r.projectName}</span>
        </td>
      )}
      {!hideEmployee && (
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${avatarColor(r.employeeName)} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
              {getInitials(r.employeeName)}
            </div>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-200">{r.employeeName}</span>
          </div>
        </td>
      )}
      <td className="px-4 py-2.5 text-center">
        {r.startTime
          ? <span className={`text-xs font-medium text-gray-700 ${BRIGHT_SURFACE} bg-gray-100 px-2 py-1 rounded-lg`}>{r.startTime}</span>
          : <span className="text-xs text-gray-400">—</span>}
      </td>
      <td className="px-4 py-2.5 text-center">
        {r.endTime
          ? <span className={`text-xs font-medium text-gray-700 ${BRIGHT_SURFACE} bg-gray-100 px-2 py-1 rounded-lg`}>{r.endTime}</span>
          : <span className="text-xs text-gray-400">—</span>}
      </td>
      <td className="px-4 py-2.5 text-center">
        <span className={`inline-flex items-center px-2.5 py-0.5 ${BRIGHT_SURFACE} bg-teal-100 text-teal-700 rounded-full text-xs font-bold`}>
          {formatHours(r.hours)}
        </span>
      </td>
      <td className="px-4 py-2.5">
        {r.description
          ? <span className="text-xs text-gray-500 dark:text-gray-400 italic">{r.description}</span>
          : <span className="text-xs text-gray-300 dark:text-gray-600">—</span>}
      </td>
      <td className="px-4 py-2.5 text-center">
        <div className="flex items-center justify-center gap-1">
          <button onClick={() => onEdit(r)}
            className={`p-1.5 text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-all ${hovered ? 'opacity-100' : 'opacity-0'}`}
            title="ערוך דיווח">
            <Edit2 size={13} />
          </button>
          <button onClick={() => onDelete(r.hoursReportID)}
            className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
            title="מחק דיווח">
            <Trash2 size={13} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── View Modal ────────────────────────────────────────────────────────────────

function HoursViewModal({ viewMode, onSelect, onClose }: {
  viewMode: ViewMode; onSelect: (v: ViewMode) => void; onClose: () => void;
}) {
  const options: { value: ViewMode; label: string; desc: string; icon: React.ElementType }[] = [
    { value: 'all',      label: 'הצג הכל',        desc: 'כל הדיווחים ברשימה שטוחה ללא קיבוץ', icon: List },
    { value: 'date',     label: 'קבץ לפי תאריך',  desc: 'קבץ את הדיווחים לפי תאריך',          icon: Calendar },
    { value: 'employee', label: 'קבץ לפי עובד',   desc: 'קבץ את הדיווחים לפי שם העובד',       icon: User },
    { value: 'project',  label: 'קבץ לפי פרויקט', desc: 'קבץ את הדיווחים לפי שם הפרויקט',    icon: Briefcase },
  ];
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="modal-shell dark-surface bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md">
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">בחר תצוגה</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <X size={20} className="text-gray-600 dark:text-gray-300" />
          </button>
        </div>
        <div className="p-6 space-y-2">
          {options.map(opt => (
            <button key={opt.value} onClick={() => { onSelect(opt.value); onClose(); }}
              className={`w-full text-right px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-3 ${
                viewMode === opt.value
                  ? 'bright-surface bg-teal-50 text-teal-700 border-2 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-700'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700 border-2 border-transparent text-gray-700 dark:text-gray-200'
              }`}>
              <opt.icon size={18} className={viewMode === opt.value ? 'text-teal-500' : 'text-gray-400'} />
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Flat `Items` from hour-report planning API: when rows include `planningSubjectId`, filter by subject;
 * otherwise show all items (server did not scope rows per subject).
 */
function hourReportStepItemsForSubject(items: HourReportStep[], subjectId: number): HourReportStep[] {
  const scoped = items.some(i => i.planningSubjectId != null && i.planningSubjectId > 0);
  if (!scoped) return items;
  return items.filter(i => (i.planningSubjectId ?? 0) === subjectId);
}

// ── New Report Modal ──────────────────────────────────────────────────────────

function NewReportSelectorModal({ onSelect, onClose }: {
  onSelect: (task: TaskReview) => void; onClose: () => void;
}) {
  const [projects, setProjects] = useState<HourReportProject[]>([]);
  const [projectsError, setProjectsError] = useState('');
  const [hierarchyError, setHierarchyError] = useState('');
  const [hierarchyLoading, setHierarchyLoading] = useState(false);
  const [hierarchyData, setHierarchyData] = useState<PlanningHierarchyByProjectResult | null>(null);
  const [planningSubjects, setPlanningSubjects] = useState<HourReportPlanningSubject[]>([]);
  const [selectedProject, setSelectedProject] = useState<HourReportProject | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<HourReportPlanningSubject | null>(null);
  const [selectedStep, setSelectedStep] = useState<HourReportStep | null>(null);

  useEffect(() => {
    const loadProjects = async () => {
      setProjectsError('');
      try {
        const user = authService.getCurrentUser();
        if (!user) { setProjects([]); setProjectsError('לא נמצא משתמש מחובר'); return; }
        const data = await getHourReportProjects(null, null);
        setProjects(data);
      } catch (error) {
        setProjects([]);
        setProjectsError(error instanceof Error ? error.message : 'שגיאה בטעינת פרויקטים');
      }
    };
    void loadProjects();
  }, []);

  useEffect(() => {
    const loadHierarchy = async () => {
      setHierarchyError('');
      setHierarchyData(null);
      setPlanningSubjects([]);
      setSelectedSubject(null);
      setSelectedStep(null);
      if (!selectedProject) return;
      setHierarchyLoading(true);
      try {
        const data = await getPlanningHierarchyByProjectId(selectedProject.id, null);
        setHierarchyData(data);
        setPlanningSubjects(data.subjects ?? []);
      } catch (error) {
        setHierarchyData(null);
        setPlanningSubjects([]);
        setHierarchyError(error instanceof Error ? error.message : 'שגיאה בטעינת נושאי תכנון');
      } finally {
        setHierarchyLoading(false);
      }
    };
    void loadHierarchy();
  }, [selectedProject]);

  const stepItems = useMemo(() => {
    if (!hierarchyData?.items?.length || !selectedSubject) return [];
    return hourReportStepItemsForSubject(hierarchyData.items, selectedSubject.id);
  }, [hierarchyData, selectedSubject]);

  const handleConfirm = () => {
    if (!selectedProject || !selectedSubject || !selectedStep) return;
    const fakeTask: TaskReview = {
      id: selectedStep?.id ?? 0, name: selectedStep?.name ?? '', stage: selectedStep?.name ?? '',
      planningStepID: 0, planningSubjectName: selectedSubject.name, percentage: 0,
      workHours: 0, workDays: 0, duration: 0, isActive: true,
      dependsOnStepID: false, dependsOnTaskID: false, startDate: '', endDate: '',
      senderID: 0, receivers: [], senderName: '', statuID: 0, statusName: '',
      urgencyID: 0, urgencyName: '', note: null,
      creatDate: new Date().toISOString(), lastUpdate: new Date().toISOString(),
      updateBy: 0, isClosed: false, orderNum: 0, hourReport: 0,
      projectName: selectedProject?.name ?? '', projectId: selectedProject?.id ?? 0,
      utilizationPercentage: 0, hasChat: false,
      isPlanningSte: selectedStep?.isPlanningStep ?? true,
      projectType: '', studioDepartment: '',
    } as unknown as TaskReview;
    onSelect(fakeTask);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="modal-shell dark-surface bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-sm">
        <div className="border-b px-6 py-4 flex items-center justify-between bg-gradient-to-r from-emerald-500 to-teal-600 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Clock size={20} className="text-white" />
            <h2 className="text-lg font-bold text-white">דיווח שעות חדש</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all">
            <X size={18} className="text-white" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {projectsError && <div className="text-xs text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">{projectsError}</div>}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">פרויקט</label>
            <AutoComplete items={projects} selectedItem={projects.find(p => p.id === selectedProject?.id) ?? null}
              onSelect={item => { setSelectedProject(item); }}
              getItemId={item => item.id} getItemLabel={item => item.name} placeholder="בחר פרויקט..." />
          </div>
          {hierarchyError && <div className="text-xs text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">{hierarchyError}</div>}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">נושא תכנון</label>
            <AutoComplete
              items={planningSubjects}
              selectedItem={planningSubjects.find(s => s.id === selectedSubject?.id) ?? null}
              onSelect={item => { setSelectedSubject(item); setSelectedStep(null); }}
              getItemId={item => item.id}
              getItemLabel={item => item.name}
              placeholder={hierarchyLoading ? 'טוען נושאים...' : 'בחר נושא תכנון...'}
              disabled={!selectedProject || hierarchyLoading || !!hierarchyError}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">שלב / משימה</label>
            <AutoComplete items={stepItems} selectedItem={stepItems.find(s => s.id === selectedStep?.id) ?? null}
              onSelect={item => setSelectedStep(item)}
              getItemId={item => item.id} getItemLabel={item => item.name}
              placeholder="בחר שלב או משימה..."
              disabled={!selectedSubject || hierarchyLoading}
            />
          </div>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex gap-3">
          <button onClick={onClose} className={`flex-1 py-2.5 border-2 rounded-lg text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600`}>ביטול</button>
          <button onClick={handleConfirm} disabled={!selectedProject || !selectedSubject || !selectedStep}
            className="flex-1 bg-emerald-500 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed">
            המשך
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function HoursReportList() {
  const [reports, setReports] = useState<HourReportList[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [viewMode, setViewMode] = usePersistedSessionState<ViewMode>('taskit.ui.hoursReport.viewMode', 'all', isHoursReportViewMode);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoursDbFilters, setHoursDbFilters] = usePersistedHoursDbFilters('taskit.hoursReport.dbFilters', getDefaultHoursDBFilters);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [openColumnFilter, setOpenColumnFilter] = useState<HoursColumnFilterKey | null>(null);
  const [columnFilterSearch, setColumnFilterSearch] = useState({ dateTime: '', projectName: '', employeeName: '' });
  const [columnFilters, setColumnFilters] = useState({ dateTimes: [] as string[], projectNames: [] as string[], employeeNames: [] as string[] });
  const [editHourReport, setEditHourReport] = useState<HoursReport | null>(null);
  const [editTask, setEditTask] = useState<TaskReview | null>(null);
  const [showNewSelector, setShowNewSelector] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const [sort, setSort] = useState<SortState>({ key: null, dir: null });
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
  }>({ isOpen: false, title: '', message: '', type: 'warning' });

  const closeMessageBox = () => {
    setMessageBox(prev => ({
      ...prev,
      isOpen: false,
      showCancel: false,
      onConfirm: undefined,
      onCancel: undefined,
    }));
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
        onConfirm: () => { resolve(true); closeMessageBox(); },
        onCancel: () => { resolve(false); closeMessageBox(); },
      });
    });

  const handleSort = (key: SortKey) => {
    setSort(prev => {
      if (prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return { key: null, dir: null };
    });
  };

  useEffect(() => { void loadReports(); }, [hoursDbFilters.dateFrom, hoursDbFilters.dateTo]);

  const toggleArrayFilter = <T,>(items: T[], value: T) =>
    items.includes(value) ? items.filter(i => i !== value) : [...items, value];

  const projectFilterOptions = useMemo(() =>
    [...new Set(reports.map(r => r.projectName).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'he'))
      .map(name => ({ value: name, label: name })), [reports]);

  const employeeFilterOptions = useMemo(() =>
    [...new Set(reports.map(r => r.employeeName).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'he'))
      .map(name => ({ value: name, label: name })), [reports]);

  const dateTimeFilterOptions = useMemo(() =>
    [...new Set(reports.map(r => r.dateTime.split('T')[0]))]
      .sort((a, b) => b.localeCompare(a))
      .map(value => ({ value, label: formatDateHe(value) })), [reports]);

  const columnFilterCount = columnFilters.dateTimes.length + columnFilters.projectNames.length + columnFilters.employeeNames.length;

  const isColumnFilterActive = (key: HoursColumnFilterKey) => {
    switch (key) {
      case 'dateTime':     return columnFilters.dateTimes.length > 0;
      case 'projectName':  return columnFilters.projectNames.length > 0;
      case 'employeeName': return columnFilters.employeeNames.length > 0;
      default: return false;
    }
  };

  const loadReports = async (dbRange?: { dateFrom: string; dateTo: string; projects: number[] }) => {
    setIsLoading(true);
    setLoadError('');
    const range = dbRange ?? hoursDbFilters;
    try {
      const user = authService.getCurrentUser();
      if (!user) { setReports([]); setLoadError('לא נמצא משתמש מחובר'); return; }
      const serverReports = await getHourReports({
        Database: user.dataBase, EmployeeID: user.id, PermissionType: user.permissionId,
        FromDate: range.dateFrom || null, ToDate: range.dateTo || null, projects: range.projects,
      });
      setReports(serverReports);
    } catch (error) {
      setReports([]);
      setLoadError(error instanceof Error ? error.message : 'שגיאה בטעינת דיווחי שעות');
    } finally {
      setIsLoading(false);
    }
  };

  const baseFiltered = useMemo(() => reports.filter(r => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || [
      r.taskName, r.stepName, r.subjectName,
      r.projectName, r.employeeName, r.description || '',
    ].filter((v): v is string => Boolean(v && String(v).trim())).some(v => v.toLowerCase().includes(q));
    const matchDbProjects = hoursDbFilters.projects.length === 0 || hoursDbFilters.projects.includes(r.projectID);
    const matchDbEmployees = hoursDbFilters.employees.length === 0 || hoursDbFilters.employees.includes(r.employeeName);
    return matchSearch && matchDbProjects && matchDbEmployees;
  }), [reports, searchQuery, hoursDbFilters.projects, hoursDbFilters.employees]);

  const filtered = useMemo(() => baseFiltered.filter(r => {
    const reportDate = r.dateTime.split('T')[0];
    return (
      (columnFilters.dateTimes.length === 0 || columnFilters.dateTimes.includes(reportDate)) &&
      (columnFilters.projectNames.length === 0 || columnFilters.projectNames.includes(r.projectName)) &&
      (columnFilters.employeeNames.length === 0 || columnFilters.employeeNames.includes(r.employeeName))
    );
  }), [baseFiltered, columnFilters]);

  const sortedFiltered = useMemo(() => {
    if (!sort.key || !sort.dir) return filtered;
    const sk = sort.key;
    const sd = sort.dir;
    return [...filtered].sort((a, b) => compareHourReportRows(a, b, sk, sd));
  }, [filtered, sort]);

  const getReportRows = (): ReportRow[] =>
    sortedFiltered.map((r) => ({
      date: formatDateHe(r.dateTime),
      taskName: r.taskName ?? '',
      stepName: r.stepName ?? '',
      subjectName: r.subjectName ?? '',
      projectName: r.projectName ?? '',
      employeeName: r.employeeName ?? '',
      startTime: r.startTime ?? '—',
      endTime: r.endTime ?? '—',
      hours: formatHours(r.hours),
      description: r.description ?? ''
    }));

  const totalHours = useMemo(() => filtered.reduce((s, r) => s + r.hours, 0), [filtered]);
  const activeFilters = useMemo(() => countActiveHoursDbFilters(hoursDbFilters) + columnFilterCount, [hoursDbFilters, columnFilterCount]);

  const handleDelete = async (id: number) => {
    const yes = await openConfirm('האם למחוק דיווח זה?', 'מחיקת דיווח');
    if (!yes) return;
    await deleteHourReport(id);
    setReports(prev => prev.filter(r => r.hoursReportID !== id));
  };

  const handleEdit = (r: HourReportList) => {
    const report: HoursReport = {
      id: r.hoursReportID, taskId: r.objectID, reportDate: r.dateTime,
      fromTime: r.startTime, toTime: r.endTime, totalHours: r.hours,
      inputMode: r.startTime && r.endTime ? 'range' : 'total',
      notes: r.description ?? undefined,
    };
    setEditHourReport(report);
    const task: TaskReview = {
      id: r.objectID,
      name: r.taskName ,
      subject: r.stepName ?? '',
      planningSubjectName: r.subjectName ?? '',
      projectName: r.projectName, projectId: r.projectID,
      isPlanningSte: r.isPlanningStep,
    } as unknown as TaskReview;
    setEditTask(task);
  };

  const handleSaveReport = () => { loadReports(); setEditTask(null); };

  const toggleGroup = (key: string) => setCollapsed(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  const byDate     = useMemo(() => groupByDate(filtered),     [filtered]);
  const byEmployee = useMemo(() => groupByEmployee(filtered), [filtered]);
  const byProject  = useMemo(() => groupByProject(filtered),  [filtered]);

  const hideDate     = viewMode === 'date';
  const hideProject  = viewMode === 'project';
  const hideEmployee = viewMode === 'employee' || authService.getPermissionId() === 4;
  const totalCols =
    8 +
    (hideDate ? 0 : 1) +
    (hideProject ? 0 : 1) +
    (hideEmployee ? 0 : 1);

  const sortGroup = (items: HourReportList[]) => {
    if (!sort.key || !sort.dir) return items;
    const sk = sort.key;
    const sd = sort.dir;
    return [...items].sort((a, b) => compareHourReportRows(a, b, sk, sd));
  };

  // ─── Shared thead ─────────────────────────────────────────────────────────
  const renderThead = () => (
    <thead>
      <tr className={TASK_TABLE_HEAD}>
        {!hideDate && (
          <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 w-28 relative">
            <div className="flex items-center justify-between gap-1">
              <div
                className="flex items-center gap-1 cursor-pointer select-none hover:text-teal-600"
                onClick={() => handleSort('dateTime')}
              >
                <span>תאריך</span>
                <SortIcon active={sort.key === 'dateTime'} dir={sort.key === 'dateTime' ? sort.dir : null} />
              </div>
              <button
                type="button"
                onClick={() => setOpenColumnFilter(c => c === 'dateTime' ? null : 'dateTime')}
                className={`p-1 rounded-md border transition-colors shrink-0 ${
                  isColumnFilterActive('dateTime')
                    ? 'bright-surface bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700'
                    : TASK_HEADER_FILTER_BTN_INACTIVE
                }`}
                title="סינון תאריך"
              >
                <Filter size={12} />
              </button>
            </div>
            {openColumnFilter === 'dateTime' && (
              <div className="absolute mt-2 z-50 right-0 w-72 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 dark-surface shadow-xl p-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-800 dark:text-white">סינון תאריך</span>
                  <button type="button" onClick={() => setOpenColumnFilter(null)} className="p-1 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <X size={14} />
                  </button>
                </div>
                <SearchableCheckboxFilter
                  searchValue={columnFilterSearch.dateTime}
                  onSearchChange={v => setColumnFilterSearch(p => ({ ...p, dateTime: v }))}
                  options={dateTimeFilterOptions} selectedValues={columnFilters.dateTimes}
                  onToggle={v => setColumnFilters(p => ({ ...p, dateTimes: toggleArrayFilter(p.dateTimes, v) }))}
                  onClear={() => setColumnFilters(p => ({ ...p, dateTimes: [] }))}
                  searchPlaceholder="חיפוש תאריך..." emptyMessage="לא נמצאו תאריכים"
                />
              </div>
            )}
          </th>
        )}

        <SortableTh sortKey="taskName" label="משימה"
          className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 min-w-[7rem]"
          sort={sort} onSort={handleSort} />
        <SortableTh sortKey="stepName" label="שלב"
          className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 min-w-[7rem]"
          sort={sort} onSort={handleSort} />
        <SortableTh sortKey="subjectName" label="נושא תכנון"
          className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 min-w-[8rem]"
          sort={sort} onSort={handleSort} />

        {!hideProject && (
          <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 w-46 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 cursor-pointer select-none hover:text-teal-600"
                onClick={() => handleSort('projectName')}>
                <span>פרויקט</span>
                <SortIcon active={sort.key === 'projectName'} dir={sort.key === 'projectName' ? sort.dir : null} />
              </div>
              <button type="button"
                onClick={() => setOpenColumnFilter(c => c === 'projectName' ? null : 'projectName')}
                className={`p-1 rounded-md border transition-colors ${isColumnFilterActive('projectName') ? 'bright-surface bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700' : TASK_HEADER_FILTER_BTN_INACTIVE}`}
                title="סינון פרויקט">
                <Filter size={12} />
              </button>
            </div>
            {openColumnFilter === 'projectName' && (
              <div className="absolute mt-2 z-50 right-0 w-72 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 dark-surface shadow-xl p-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-800 dark:text-white">סינון פרויקט</span>
                  <button type="button" onClick={() => setOpenColumnFilter(null)} className="p-1 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"><X size={14} /></button>
                </div>
                <SearchableCheckboxFilter
                  searchValue={columnFilterSearch.projectName}
                  onSearchChange={v => setColumnFilterSearch(p => ({ ...p, projectName: v }))}
                  options={projectFilterOptions} selectedValues={columnFilters.projectNames}
                  onToggle={v => setColumnFilters(p => ({ ...p, projectNames: toggleArrayFilter(p.projectNames, v) }))}
                  onClear={() => setColumnFilters(p => ({ ...p, projectNames: [] }))}
                  searchPlaceholder="חיפוש פרויקט..." emptyMessage="לא נמצאו פרויקטים"
                />
              </div>
            )}
          </th>
        )}

        {!hideEmployee && (
          <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 w-36 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 cursor-pointer select-none hover:text-teal-600"
                onClick={() => handleSort('employeeName')}>
                <span>עובד מדווח</span>
                <SortIcon active={sort.key === 'employeeName'} dir={sort.key === 'employeeName' ? sort.dir : null} />
              </div>
              <button type="button"
                onClick={() => setOpenColumnFilter(c => c === 'employeeName' ? null : 'employeeName')}
                className={`p-1 rounded-md border transition-colors ${isColumnFilterActive('employeeName') ? 'bright-surface bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700' : TASK_HEADER_FILTER_BTN_INACTIVE}`}
                title="סינון עובד">
                <Filter size={12} />
              </button>
            </div>
            {openColumnFilter === 'employeeName' && (
              <div className="absolute mt-2 z-50 right-0 w-72 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 dark-surface shadow-xl p-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-800 dark:text-white">סינון עובד מדווח</span>
                  <button type="button" onClick={() => setOpenColumnFilter(null)} className="p-1 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"><X size={14} /></button>
                </div>
                <SearchableCheckboxFilter
                  searchValue={columnFilterSearch.employeeName}
                  onSearchChange={v => setColumnFilterSearch(p => ({ ...p, employeeName: v }))}
                  options={employeeFilterOptions} selectedValues={columnFilters.employeeNames}
                  onToggle={v => setColumnFilters(p => ({ ...p, employeeNames: toggleArrayFilter(p.employeeNames, v) }))}
                  onClear={() => setColumnFilters(p => ({ ...p, employeeNames: [] }))}
                  searchPlaceholder="חיפוש עובד..." emptyMessage="לא נמצאו עובדים"
                />
              </div>
            )}
          </th>
        )}

        <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 w-20">משעה</th>
        <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 w-20">עד שעה</th>
        <SortableTh sortKey="hours" label='סה"כ שעות'
          className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 w-24"
          sort={sort} onSort={handleSort} />
        <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 w-32">הערות</th>
        <th className="px-4 py-2.5 w-20"></th>
      </tr>
    </thead>
  );

  // ─── Group card wrapper ───────────────────────────────────────────────────
  const renderGroupCard = (
    groupKey: string,
    headerContent: React.ReactNode,
    headerClass: string,
    rows: HourReportList[]
  ) => (
    <div key={groupKey} className={`${APP_PANEL} rounded-xl shadow-sm overflow-hidden`}>
      <div
        className={`px-6 py-3 flex items-center justify-between cursor-pointer ${headerClass}`}
        onClick={() => toggleGroup(groupKey)}
      >
        <div className="flex items-center gap-2">
          {!collapsed.has(groupKey)
            ? <ChevronDown size={16} className="text-white opacity-80" />
            : <ChevronUp size={16} className="text-white opacity-80" />}
          {headerContent}
        </div>
        <span className="text-white text-sm opacity-80">({rows.length} דיווחים)</span>
      </div>
      {!collapsed.has(groupKey) && (
        <HorizontalScrollContainer>
          <table className="w-full table-fixed min-w-[1180px]">
            {renderThead()}
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {sortGroup(rows).map(r => (
                <DataRow key={r.hoursReportID} r={r} onDelete={handleDelete} onEdit={handleEdit}
                  hideDate={hideDate} hideProject={hideProject} hideEmployee={hideEmployee} />
              ))}
            </tbody>
          </table>
        </HorizontalScrollContainer>
      )}
    </div>
  );

  return (
    <div className=" space-y-5" dir="rtl">
      <HoursReportHeader
        searchQuery={searchQuery} onSearchChange={setSearchQuery}
        activeFiltersCount={activeFilters}
        onShowViewModal={() => setShowViewModal(true)}
        onShowFilterModal={() => setShowFilterModal(true)}
        onShowReportModal={() => setShowReportModal(true)}
        onRefresh={() => { void loadReports(); }}
        onShowNewSelector={() => setShowNewSelector(true)}
        totalHours={totalHours} filteredReportsCount={filtered.length} totalReportsCount={reports.length}
      />
      

      {loadError && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-300">{loadError}</div>
      )}

      {isLoading && (
        <div className={`${APP_PANEL} rounded-xl py-16 text-center`}>
          <Clock size={40} className="text-gray-300 dark:text-gray-600 mx-auto mb-3 animate-pulse" />
          <div className="text-gray-500 dark:text-gray-300 font-medium">טוען דיווחי שעות...</div>
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className={`${APP_PANEL} rounded-xl py-16 text-center`}>
          <Clock size={40} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <div className="text-gray-400 dark:text-gray-300 font-medium">לא נמצאו דיווחי שעות</div>
          <div className="text-gray-300 dark:text-gray-500 text-sm mt-1">נסה לשנות את פרמטרי החיפוש</div>
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <>
          {/* ── הצג הכל ── */}
          {viewMode === 'all' && (
            <div className={`${APP_PANEL} rounded-xl shadow-sm overflow-hidden`}>
              <HorizontalScrollContainer>
                <table className="w-full table-fixed min-w-[1180px]">
                  {renderThead()}
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {sortedFiltered.map(r => (
                      <DataRow key={r.hoursReportID} r={r} onDelete={handleDelete} onEdit={handleEdit} />
                    ))}
                  </tbody>
                  <tfoot className="bg-teal-50 dark:bg-teal-950/40 border-t-2 border-teal-200 dark:border-teal-800">
                    <tr>
                      <td colSpan={totalCols - 3} className="px-4 py-2.5">
                        <span className="text-sm font-bold text-teal-800 dark:text-teal-200">סה"כ: {filtered.length} דיווחים</span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="inline-flex items-center px-3 py-0.5 bg-teal-500 text-white rounded-full text-sm font-bold">
                          {formatHours(totalHours)}
                        </span>
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </HorizontalScrollContainer>
            </div>
          )}

          {/* ── קבץ לפי תאריך ── */}
          {viewMode === 'date' && (
            <div className="space-y-4">
              {byDate.map(group => renderGroupCard(
                group.date,
                <>
                  <span className="text-white font-bold text-lg">{formatDateHe(group.date)}</span>
                  <span className="text-white opacity-60 text-sm">
                    {new Date(group.date).toLocaleDateString('he-IL', { weekday: 'long' })}
                  </span>
                </>,
                'bg-gradient-to-r from-teal-400 to-teal-500',
                group.reports
              ))}
            </div>
          )}

          {/* ── קבץ לפי עובד ── */}
          {viewMode === 'employee' && (
            <div className="space-y-4">
              {byEmployee.map(group => renderGroupCard(
                group.reporterName,
                <>
                  <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarColor(group.reporterName)} flex items-center justify-center text-white text-[10px] font-bold border-2 border-white border-opacity-30`}>
                    {getInitials(group.reporterName)}
                  </div>
                  <span className="text-white font-bold text-lg">{group.reporterName}</span>
                </>,
                'bg-gradient-to-r from-violet-400 to-violet-500',
                group.reports
              ))}
            </div>
          )}

          {/* ── קבץ לפי פרויקט ── */}
          {viewMode === 'project' && (
            <div className="space-y-4">
              {byProject.map(group => renderGroupCard(
                group.project,
                <span className="text-white font-bold text-lg">{group.project}</span>,
                'bg-gradient-to-r from-blue-400 to-blue-500',
                group.reports
              ))}
            </div>
          )}
        </>
      )}

      {showViewModal && <HoursViewModal viewMode={viewMode} onSelect={setViewMode} onClose={() => setShowViewModal(false)} />}

      {showFilterModal && (
        <HoursReportDbFilter
          onClose={() => setShowFilterModal(false)}
          onApply={next => { setHoursDbFilters(next); void loadReports({ dateFrom: next.dateFrom, dateTo: next.dateTo, projects: next.projects }); }}
          currentFilters={hoursDbFilters}
        />
      )}

      {showNewSelector && (
        <NewReportSelectorModal
          onSelect={task => { setEditHourReport(null); setEditTask(task); setShowNewSelector(false); }}
          onClose={() => setShowNewSelector(false)}
        />
      )}
      {showReportModal && (
        <MyTasksReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          rows={getReportRows()}
          columns={HOURS_REPORT_COLUMNS}
          filteredCount={filtered.length}
          reportTitle="דוח שעות - רשימת דיווחים"
          fileBaseName={`hours-report-${new Date().toISOString().slice(0, 10)}`}
        />
      )}
 <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mt-4">
            <div className="flex items-center gap-2 mb-3 border-b border-amber-200 pb-2">
              <span className="text-amber-600 text-lg">💡</span>
              <h3 className="text-sm font-semibold text-amber-800">הערות</h3>
            </div>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm text-amber-800">
                <span className="text-amber-500 mt-0.5">•</span>
                <span><strong>הרשאות צפייה:</strong> רשימת דיווחי השעות בהתאם לרמת ההרשאה שנקבעה למשתמש במערכת.</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-amber-800">
                <span className="text-amber-500 mt-0.5">•</span>
                <span><strong>ניהול תצוגה וחיתוכים:</strong> ניתן לשנות את מבנה התצוגה מרשימה לקיבוץ ולסנן את הדיווחים באופן דינמי</span>
              </li>
            </ul>
          </div>
      {editTask && (
        <HoursReportModal task={editTask} editReport={editHourReport}
          onClose={() => { setEditTask(null); setEditHourReport(null); }}
          onSave={handleSaveReport}
          onDelete={handleDelete}
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
  
}