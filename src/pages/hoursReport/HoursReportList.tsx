import React, { useState, useMemo } from 'react';
import {
  Clock, Calendar, User, Briefcase,
  ChevronDown, ChevronUp, Trash2, FileText, X,
} from 'lucide-react';

import HoursReportControls from './HoursReportControls';
import HoursReportFilterModal, {
  type HoursReportFilters,
  EMPTY_FILTERS,
  countActiveFilters,
} from './HoursReportFilterModal';
import { DEMO_REPORTS, formatDateHe, formatHours, getInitials, groupByDate, groupByEmployee, groupByProject, type HoursReportEntry } from '../../Data/HoursReportData';

type ViewMode = 'date' | 'employee' | 'project';

const AVATAR_COLORS = [
  'from-violet-400 to-purple-500', 'from-sky-400 to-blue-500',
  'from-rose-400 to-pink-500',     'from-amber-400 to-orange-500',
  'from-emerald-400 to-teal-500',
];
const avatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

// ── colSpan helper ────────────────────────────────────────────────────────────
// function colCount(hideDate: boolean, hideProject: boolean, hideEmployee: boolean) {
//   return 5 - (hideDate ? 1 : 0) - (hideProject ? 1 : 0) - (hideEmployee ? 1 : 0);
// }

// ── Data row (conditionally hides columns) ────────────────────────────────────
function DataRow({ r, onDelete, hideDate, hideProject, hideEmployee }: {
  r: HoursReportEntry; onDelete: (id: number) => void;
  hideDate?: boolean; hideProject?: boolean; hideEmployee?: boolean;
}) {
  return (
    <tr className="hover:bg-teal-50 transition-colors border-b border-gray-100">
      {!hideDate && (
        <td className="px-4 py-2.5">
          <span className="text-xs font-semibold text-gray-700">{formatDateHe(r.reportDate)}</span>
        </td>
      )}
      <td className="px-4 py-2.5">
        <div className="text-xs font-semibold text-gray-800">{r.taskName}</div>
        <div className="text-[10px] text-gray-400 mt-0.5">{r.stage}</div>
      </td>
      {!hideProject && (
        <td className="px-4 py-2.5">
          <span className="inline-flex px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">{r.project}</span>
        </td>
      )}
      {!hideEmployee && (
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${avatarColor(r.reporterName)} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
              {getInitials(r.reporterName)}
            </div>
            <span className="text-xs font-medium text-gray-700">{r.reporterName}</span>
          </div>
        </td>
      )}
      <td className="px-4 py-2.5 text-center">
        {r.inputMode === 'range' && r.fromTime
          ? <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded-lg">{r.fromTime} – {r.toTime}</span>
          : <span className="text-xs text-gray-400">—</span>
        }
      </td>
      <td className="px-4 py-2.5 text-center">
        <span className="inline-flex items-center px-2.5 py-0.5 bg-teal-100 text-teal-700 rounded-full text-xs font-bold">
          {formatHours(r.totalHours)}
        </span>
      </td>
      <td className="px-4 py-2.5">
        {r.notes
          ? <span className="text-xs text-gray-500 italic">{r.notes}</span>
          : <span className="text-xs text-gray-300">—</span>
        }
      </td>
      <td className="px-4 py-2.5 text-center">
        <button onClick={() => onDelete(r.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="מחק דיווח">
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
  );
}

// ── Table headers (conditional) ───────────────────────────────────────────────
function TableHead({ hideDate, hideProject, hideEmployee }: {
  hideDate?: boolean; hideProject?: boolean; hideEmployee?: boolean;
}) {
  return (
    <thead>
      <tr className="bg-gray-50 border-b border-gray-200">
        {!hideDate     && <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 w-28">תאריך</th>}
        <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">שלב / משימה</th>
        {!hideProject  && <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 w-32">פרויקט</th>}
        {!hideEmployee && <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 w-36">עובד מדווח</th>}
        <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 w-36">משעה – עד שעה</th>
        <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 w-24">סה"כ שעות</th>
        <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">הערות</th>
        <th className="px-4 py-2.5 w-10"></th>
      </tr>
    </thead>
  );
}

// ── Group header row (spans all visible columns) ──────────────────────────────
function GroupRow({ label, sub, totalHours, count, color, expanded, onToggle, totalCols, avatar }: {
  label: string; sub?: string; totalHours: number; count: number;
  color: string; expanded: boolean; onToggle: () => void;
  totalCols: number; avatar?: React.ReactNode;
}) {
  return (
    <tr onClick={onToggle} className={`${color} cursor-pointer select-none`}>
      <td colSpan={totalCols} className="px-5 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {expanded
              ? <ChevronDown size={14} className="text-white opacity-80" />
              : <ChevronUp   size={14} className="text-white opacity-80" />
            }
            {avatar}
            <span className="font-bold text-white text-sm">{label}</span>
            {sub && <span className="text-white opacity-60 text-xs">{sub}</span>}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-white opacity-75 text-xs">{count} דיווחים</span>
            <span className="bg-white bg-opacity-20 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
              {formatHours(totalHours)}
            </span>
          </div>
        </div>
      </td>
    </tr>
  );
}

// ── View Modal ────────────────────────────────────────────────────────────────
function HoursViewModal({ viewMode, onSelect, onClose }: {
  viewMode: ViewMode; onSelect: (v: ViewMode) => void; onClose: () => void;
}) {
  const options: { value: ViewMode; label: string; icon: React.ElementType }[] = [
    { value: 'date',     label: 'קבץ לפי תאריך',  icon: Calendar  },
    { value: 'employee', label: 'קבץ לפי עובד',    icon: User      },
    { value: 'project',  label: 'קבץ לפי פרויקט', icon: Briefcase },
  ];
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">בחר תצוגה</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} className="text-gray-600" />
          </button>
        </div>
        <div className="p-6 space-y-2">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onSelect(opt.value); onClose(); }}
              className={`w-full text-right px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-3 ${
                viewMode === opt.value
                  ? 'bg-teal-50 text-teal-700 border-2 border-teal-200'
                  : 'hover:bg-gray-50 border-2 border-transparent text-gray-700'
              }`}
            >
              <opt.icon size={18} className={viewMode === opt.value ? 'text-teal-500' : 'text-gray-400'} />
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function HoursReportList() {
  const [reports, setReports]     = useState<HoursReportEntry[]>(DEMO_REPORTS);
  const [viewMode, setViewMode]   = useState<ViewMode>('date');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters]     = useState<HoursReportFilters>(EMPTY_FILTERS);
  const [showViewModal, setShowViewModal]     = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const allProjects  = useMemo(() => [...new Set(reports.map(r => r.project))].sort(),      [reports]);
  const allReporters = useMemo(() => [...new Set(reports.map(r => r.reporterName))].sort(), [reports]);

  const filtered = useMemo(() => reports.filter(r => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || [r.taskName, r.project, r.reporterName, r.stage, r.notes || '']
      .some(v => v.toLowerCase().includes(q));
    const matchProject  = filters.projects.length === 0  || filters.projects.includes(r.project);
    const matchReporter = filters.reporters.length === 0 || filters.reporters.includes(r.reporterName);
    const matchDateFrom = !filters.dateFrom || r.reportDate >= filters.dateFrom;
    const matchDateTo   = !filters.dateTo   || r.reportDate <= filters.dateTo;
    return matchSearch && matchProject && matchReporter && matchDateFrom && matchDateTo;
  }), [reports, searchQuery, filters]);

  const totalHours    = useMemo(() => filtered.reduce((s, r) => s + r.totalHours, 0), [filtered]);
  const activeFilters = useMemo(() => countActiveFilters(filters), [filters]);

  const handleDelete = (id: number) => setReports(prev => prev.filter(r => r.id !== id));
  const toggleGroup  = (key: string) => setCollapsed(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  const byDate     = useMemo(() => groupByDate(filtered),     [filtered]);
  const byEmployee = useMemo(() => groupByEmployee(filtered), [filtered]);
  const byProject  = useMemo(() => groupByProject(filtered),  [filtered]);

  // columns visible per view
  const hideDate     = viewMode === 'date';
  const hideProject  = viewMode === 'project';
  const hideEmployee = viewMode === 'employee';
  // total visible columns = fixed 5 (משימה, שעות, טווח, הערות, מחק) + dynamic
  const totalCols = 5 + (hideDate ? 0 : 1) + (hideProject ? 0 : 1) + (hideEmployee ? 0 : 1);

  return (
    <div className="p-6 space-y-5" dir="rtl">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center shadow-sm">
            <FileText size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">דיווחי שעות</h1>
            <p className="text-sm text-gray-500">{filtered.length} דיווחים • סה"כ {formatHours(totalHours)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-2 text-center min-w-[80px]">
            <div className="text-xl font-bold text-teal-700">{formatHours(totalHours)}</div>
            <div className="text-xs text-teal-500">סה"כ שעות</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-center min-w-[70px]">
            <div className="text-xl font-bold text-blue-700">{filtered.length}</div>
            <div className="text-xs text-blue-500">דיווחים</div>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <HoursReportControls
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeFiltersCount={activeFilters}
        onShowViewModal={() => setShowViewModal(true)}
        onShowFilterModal={() => setShowFilterModal(true)}
      />

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <Clock size={40} className="text-gray-300 mx-auto mb-3" />
          <div className="text-gray-400 font-medium">לא נמצאו דיווחי שעות</div>
          <div className="text-gray-300 text-sm mt-1">נסה לשנות את פרמטרי החיפוש</div>
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">

              <TableHead hideDate={hideDate} hideProject={hideProject} hideEmployee={hideEmployee} />

              <tbody>

                {/* ── לפי תאריך ── */}
                {viewMode === 'date' && byDate.map(group => (
                  <React.Fragment key={group.date}>
                    <GroupRow
                      label={formatDateHe(group.date)}
                      sub={new Date(group.date).toLocaleDateString('he-IL', { weekday: 'long' })}
                      totalHours={group.totalHours} count={group.reports.length}
                      color="bg-gradient-to-l from-teal-600 to-teal-500"
                      expanded={!collapsed.has(group.date)} onToggle={() => toggleGroup(group.date)}
                      totalCols={totalCols}
                    />
                    {!collapsed.has(group.date) && group.reports.map(r => (
                      <DataRow key={r.id} r={r} onDelete={handleDelete}
                        hideDate={hideDate} hideProject={hideProject} hideEmployee={hideEmployee} />
                    ))}
                  </React.Fragment>
                ))}

                {/* ── לפי עובד ── */}
                {viewMode === 'employee' && byEmployee.map(group => (
                  <React.Fragment key={group.reporterName}>
                    <GroupRow
                      label={group.reporterName}
                      totalHours={group.totalHours} count={group.reports.length}
                      color="bg-gradient-to-l from-violet-600 to-violet-500"
                      expanded={!collapsed.has(group.reporterName)} onToggle={() => toggleGroup(group.reporterName)}
                      totalCols={totalCols}
                      avatar={
                        <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarColor(group.reporterName)} flex items-center justify-center text-white text-[10px] font-bold border-2 border-white border-opacity-30`}>
                          {getInitials(group.reporterName)}
                        </div>
                      }
                    />
                    {!collapsed.has(group.reporterName) && group.reports.map(r => (
                      <DataRow key={r.id} r={r} onDelete={handleDelete}
                        hideDate={hideDate} hideProject={hideProject} hideEmployee={hideEmployee} />
                    ))}
                  </React.Fragment>
                ))}

                {/* ── לפי פרויקט ── */}
                {viewMode === 'project' && byProject.map(group => (
                  <React.Fragment key={group.project}>
                    <GroupRow
                      label={group.project}
                      totalHours={group.totalHours} count={group.reports.length}
                      color="bg-gradient-to-l from-blue-600 to-blue-500"
                      expanded={!collapsed.has(group.project)} onToggle={() => toggleGroup(group.project)}
                      totalCols={totalCols}
                    />
                    {!collapsed.has(group.project) && group.reports.map(r => (
                      <DataRow key={r.id} r={r} onDelete={handleDelete}
                        hideDate={hideDate} hideProject={hideProject} hideEmployee={hideEmployee} />
                    ))}
                  </React.Fragment>
                ))}

              </tbody>

              {/* Totals footer */}
              <tfoot className="bg-teal-50 border-t-2 border-teal-200">
                <tr>
                  <td colSpan={totalCols - 2} className="px-4 py-2.5">
                    <span className="text-sm font-bold text-teal-800">סה"כ: {filtered.length} דיווחים</span>
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
          </div>
        </div>
      )}

      {/* Modals */}
      {showViewModal && (
        <HoursViewModal viewMode={viewMode} onSelect={setViewMode} onClose={() => setShowViewModal(false)} />
      )}
      {showFilterModal && (
        <HoursReportFilterModal
          filters={filters} allProjects={allProjects} allReporters={allReporters}
          onChange={setFilters} onClear={() => setFilters(EMPTY_FILTERS)}
          onClose={() => setShowFilterModal(false)}
        />
      )}

    </div>
  );
}