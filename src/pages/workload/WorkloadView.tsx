import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search, Calendar, ChevronLeft, ChevronRight,
  Users, TrendingUp, BarChart3, Filter, X, RefreshCw, Loader2, ChevronUp, ChevronDown, ChevronsUpDown,
} from 'lucide-react';
import {
  getWeeklyWorkload, getMonthlyWorkload,
  type WeeklyWorkloadResult, type MonthlyWorkloadResult,
} from '../../services/workloadService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmployeeRow { id: number; name: string; }
interface DayCell { date: string; hours: number; percentage: number; capacity: number; }

interface WeeklyEmployee {
  employee: EmployeeRow;
  days: DayCell[];
  weeklyTaskHours: number;
  weeklyWorkloadPct: number;
  weeklyCapacityHours: number;
}

interface MonthlyEmployee {
  employee: EmployeeRow;
  month: number;
  year: number;
  taskHours: number;
  netCapacityHours: number;
  workloadPct: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const HE_DAYS   = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי'];
const HE_MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];

function getSundayOfWeek(d: Date): Date {
  const result = new Date(d);
  result.setDate(d.getDate() - d.getDay());
  return result;
}

function toDateStr(d: Date): string {
  const year  = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day   = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateHe(d: Date) {
  return `${d.getDate()} ${HE_MONTHS[d.getMonth()]}`;
}

// ─── Transform ────────────────────────────────────────────────────────────────

function transformWeeklyData(rows: WeeklyWorkloadResult[]): WeeklyEmployee[] {
  const map = new Map<number, WeeklyEmployee>();
  for (const row of rows) {
    if (!map.has(row.employeeID)) {
      map.set(row.employeeID, {
        employee: { id: row.employeeID, name: row.employee },
        days: [],
        weeklyTaskHours:     Number(row.weeklyTaskHours),
        weeklyWorkloadPct:   Number(row.weeklyWorkloadPct),
        weeklyCapacityHours: Number(row.weeklyNetCapacity),
      });
    }
    const emp = map.get(row.employeeID)!;
    emp.days.push({
      date:       toDateStr(new Date(row.workDay)),
      hours:      Number(row.dailyTaskHours),
      percentage: Number(row.dailyWorkloadPct),
      capacity:   Number(row.capacityPerDay),
    });
    emp.weeklyTaskHours     = Number(row.weeklyTaskHours);
    emp.weeklyWorkloadPct   = Number(row.weeklyWorkloadPct);
    emp.weeklyCapacityHours = Number(row.weeklyNetCapacity);
  }
  return Array.from(map.values());
}

function transformMonthlyData(rows: MonthlyWorkloadResult[]): MonthlyEmployee[] {
  return rows.map(row => ({
    employee:         { id: row.employeeID, name: row.employee },
    month:            row.month,
    year:             row.year,
    taskHours:        Number(row.taskHoursMonth),
    netCapacityHours: Number(row.netCapacityHours),
    workloadPct:      Number(row.workloadPct),
  }));
}

// ─── Color schemes ────────────────────────────────────────────────────────────

const COLOR_SCHEMES = {
  default: {
    name: 'ברירת מחדל',
    fn: (pct: number) => {
      if (pct >= 100) return 'bg-red-200 text-red-900 font-bold';
      if (pct >= 84)  return 'bg-green-500 text-white font-bold';
      if (pct >= 70)  return 'bg-yellow-400 text-gray-800 font-bold';
      if (pct >= 50)  return 'bg-orange-400 text-white font-bold';
      return 'bg-red-500 text-white font-bold';
    },
    legend: [
      { color: 'bg-red-500',    label: '50%-0%' },
      { color: 'bg-orange-400', label: '69%-50%' },
      { color: 'bg-yellow-400', label: '84%-70%' },
      { color: 'bg-green-500',  label: '99%-84%' },
      { color: 'bg-red-200',    label: '100%+' },
    ],
  },
  blue: {
    name: 'גוני כחול',
    fn: (pct: number) => {
      if (pct === 0)  return 'bg-white text-gray-400';
      if (pct >= 90)  return 'bg-blue-700 text-white font-bold';
      if (pct >= 70)  return 'bg-blue-500 text-white font-bold';
      if (pct >= 50)  return 'bg-blue-300 text-blue-900 font-bold';
      return 'bg-blue-100 text-blue-700 font-bold';
    },
    legend: [
      { color: 'bg-blue-700', label: '90%+' },
      { color: 'bg-blue-500', label: '70%–89%' },
      { color: 'bg-blue-300', label: '50–69%' },
      { color: 'bg-blue-100', label: '<50%' },
    ],
  },
  purple: {
    name: 'סגול',
    fn: (pct: number) => {
      if (pct === 0)  return 'bg-white text-gray-400';
      if (pct >= 90)  return 'bg-purple-700 text-white font-bold';
      if (pct >= 70)  return 'bg-purple-500 text-white font-bold';
      if (pct >= 50)  return 'bg-purple-300 text-purple-900 font-bold';
      return 'bg-purple-100 text-purple-700 font-bold';
    },
    legend: [
      { color: 'bg-purple-700', label: '90%+' },
      { color: 'bg-purple-500', label: '70–89%' },
      { color: 'bg-purple-300', label: '50–69%' },
      { color: 'bg-purple-100', label: '<50%' },
    ],
  },
} as const;

type SchemeKey = keyof typeof COLOR_SCHEMES;

// ─── Sub-components ───────────────────────────────────────────────────────────

function WorkloadCell({ pct, hours, colorFn }: {
  pct: number; hours: number; colorFn: (p: number) => string;
}) {
  return (
    <td className={`border border-gray-100 w-24 h-14 text-center align-middle ${colorFn(pct)}`}>
      <div className="text-sm font-bold">{Math.round(pct)}%</div>
      <div className="text-xs opacity-80">{hours.toFixed(1)}ש׳</div>
    </td>
  );
}

function WeeklyTable({
  employees,
  weekStart,
  colorFn,
  weeklySortBy,
  employeeSortDir,
  totalSortDir,
  onToggleEmployeeSort,
  onToggleTotalSort,
}: {
  employees: WeeklyEmployee[];
  weekStart: Date;
  colorFn: (p: number) => string;
  weeklySortBy: 'employee' | 'total';
  employeeSortDir: 'asc' | 'desc';
  totalSortDir: 'asc' | 'desc';
  onToggleEmployeeSort: () => void;
  onToggleTotalSort: () => void;
}) {
  const days = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
  const dayTotals = days.map((d) => {
    const dateStr = toDateStr(d);
    const hours = employees.reduce((sum, emp) => {
      const fallbackDailyCapacity = emp.weeklyCapacityHours / 5;
      const cell = emp.days.find((day) => day.date === dateStr)
        ?? { hours: 0, percentage: 0, date: dateStr, capacity: fallbackDailyCapacity };
      return sum + cell.hours;
    }, 0);
    const capacity = employees.reduce((sum, emp) => {
      const fallbackDailyCapacity = emp.weeklyCapacityHours / 5;
      const cell = emp.days.find((day) => day.date === dateStr)
        ?? { hours: 0, percentage: 0, date: dateStr, capacity: fallbackDailyCapacity };
      return sum + cell.capacity;
    }, 0);
    const pct = capacity > 0 ? (hours / capacity) * 100 : 0;
    return { hours, pct };
  });
  const totalTaskHours = employees.reduce((sum, emp) => sum + emp.weeklyTaskHours, 0);
  const totalCapacityHours = employees.reduce((sum, emp) => sum + emp.weeklyCapacityHours, 0);
  const totalPct = totalCapacityHours > 0 ? (totalTaskHours / totalCapacityHours) * 100 : 0;
  const isTotalZero = totalPct === 0;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm" dir="rtl">
        <thead>
          <tr className="bg-gray-50">
            <th
              className="border border-gray-200 px-4 py-2 text-right font-semibold text-gray-700 w-36 cursor-pointer select-none hover:bg-gray-100 transition-colors"
              onClick={onToggleEmployeeSort}
            >
              <div className="flex items-center justify-between gap-2">
                <span>שם העובד</span>
                {weeklySortBy === 'employee'
                  ? (employeeSortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)
                  : <ChevronsUpDown size={14} className="text-gray-400" />}
              </div>
            </th>
            {/* ── עמודה חדשה ── */}
            <th className="border border-gray-200 px-3 py-2 text-center font-semibold text-gray-700 w-24">היקף שעות עבודה</th>
            {days.map((d, i) => (
              <th key={i} className="border border-gray-200 px-2 py-2 text-center font-semibold text-gray-700 w-24">
                <div>{HE_DAYS[i]}</div>
                <div className="text-xs font-normal text-gray-400">{formatDateHe(d)}</div>
              </th>
            ))}
            <th
              className="border border-gray-200 px-3 py-2 text-center font-semibold text-gray-700 w-20 cursor-pointer select-none hover:bg-gray-100 transition-colors"
              onClick={onToggleTotalSort}
            >
              <div className="flex items-center justify-center gap-1">
                <span>סה"כ</span>
                {weeklySortBy === 'total'
                  ? (totalSortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)
                  : <ChevronsUpDown size={14} className="text-gray-400" />}
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {employees.map(emp => {
            const dayStrs = days.map(d => toDateStr(d));
            const fallbackDailyCapacity = emp.weeklyCapacityHours / 5;
            const isZeroWeek = emp.weeklyWorkloadPct === 0;

            return (
              <tr key={emp.employee.id} className="hover:bg-gray-50">
                <td className="border border-gray-200 px-4 py-2 font-medium text-gray-800 text-right">
                  {emp.employee.name}
                </td>
                {/* ── תא קיבולת נטו ── */}
                <td className="border border-gray-200 px-3 py-2 text-center">
                  <div className="text-sm font-semibold text-gray-700">{emp.weeklyCapacityHours.toFixed(1)} ש׳</div>
                  <div className="text-xs text-gray-400">{(emp.weeklyCapacityHours / 5).toFixed(1)} ש׳/יום</div>
                </td>
                {dayStrs.map((dateStr, i) => {
                  const cell = emp.days.find(d => d.date === dateStr)
                    ?? { hours: 0, percentage: 0, date: dateStr, capacity: fallbackDailyCapacity };
                  return (
                    <WorkloadCell
                      key={i}
                      pct={cell.percentage}
                      hours={cell.hours}
            
                      colorFn={colorFn}
                    />
                  );
                })}
                <td className={`border border-gray-200 px-3 py-2 text-center ${isZeroWeek ? 'bg-white' : colorFn(emp.weeklyWorkloadPct)}`}>
                  <div className={`text-sm font-bold ${isZeroWeek ? 'text-gray-400' : ''}`}>
                    {Math.round(emp.weeklyWorkloadPct)}%
                  </div>
                  <div className={`text-xs ${isZeroWeek ? 'text-gray-400' : 'opacity-80'}`}>
                    {emp.weeklyTaskHours.toFixed(1)}ש׳
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50">
            <td className="border border-gray-200 px-4 py-2 font-bold text-gray-900 text-right">סה"כ</td>
            <td className="border border-gray-200 px-3 py-2 text-center text-gray-700 font-semibold">
              {totalCapacityHours.toFixed(1)} ש׳
            </td>
            {dayTotals.map((day, i) => (
              <td key={i} className={`border border-gray-200 px-2 py-2 text-center ${day.pct === 0 ? 'bg-white' : colorFn(day.pct)}`}>
                <div className={`text-sm font-bold ${day.pct === 0 ? 'text-gray-400' : ''}`}>
                  {Math.round(day.pct)}%
                </div>
                <div className={`text-xs ${day.pct === 0 ? 'text-gray-400' : 'opacity-80'}`}>
                  {day.hours.toFixed(1)}ש׳
                </div>
              </td>
            ))}
            <td className={`border border-gray-200 px-3 py-2 text-center ${isTotalZero ? 'bg-white' : colorFn(totalPct)}`}>
              <div className={`text-sm font-bold ${isTotalZero ? 'text-gray-400' : ''}`}>
                {Math.round(totalPct)}%
              </div>
              <div className={`text-xs ${isTotalZero ? 'text-gray-400' : 'opacity-80'}`}>
                {totalTaskHours.toFixed(1)}ש׳
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
function MonthlyTable({ employees, colorFn, employeeSortDir, onToggleEmployeeSort }: {
  employees: MonthlyEmployee[];
  colorFn: (p: number) => string;
  employeeSortDir: 'asc' | 'desc';
  onToggleEmployeeSort: () => void;
}) {
  const totalTaskHours = employees.reduce((sum, emp) => sum + emp.taskHours, 0);
  const totalCapacityHours = employees.reduce((sum, emp) => sum + emp.netCapacityHours, 0);
  const totalPct = totalCapacityHours > 0 ? (totalTaskHours / totalCapacityHours) * 100 : 0;
  const isTotalZero = totalPct === 0;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm" dir="rtl">
        <thead>
          <tr className="bg-gray-50">
            <th
              className="border border-gray-200 px-4 py-2 text-right font-semibold text-gray-700 w-36 cursor-pointer select-none hover:bg-gray-100 transition-colors"
              onClick={onToggleEmployeeSort}
            >
              <div className="flex items-center justify-between gap-2">
                <span>שם העובד</span>
                {employeeSortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </th>
            <th className="border border-gray-200 px-4 py-2 text-center font-semibold text-gray-700">שעות למשימות</th>
            <th className="border border-gray-200 px-4 py-2 text-center font-semibold text-gray-700">היקף שעות עבודה</th>
            <th className="border border-gray-200 px-4 py-2 text-center font-semibold text-gray-700">עומס עבודה</th>
          </tr>
        </thead>
        <tbody>
          {employees.map(emp => {
            const isZero = emp.workloadPct === 0;
            return (
              <tr key={emp.employee.id} className="hover:bg-gray-50">
                <td className="border border-gray-200 px-4 py-3 font-medium text-gray-800 text-right min-w-[340px] w-[340px]">
                  {emp.employee.name}
                </td>
                <td className="border border-gray-200 px-4 py-3 text-center text-gray-700">
                  {emp.taskHours === 0
                    ? <span className="text-gray-400 font-semibold">0 ש׳</span>
                    : <>{emp.taskHours.toFixed(1)} ש׳</>
                  }
                </td>
                <td className="border border-gray-200 px-4 py-3 text-center text-gray-700">
                  {emp.netCapacityHours.toFixed(1)} ש׳
                </td>
                <td className={`border border-gray-200 px-4 py-3 text-center ${isZero ? 'bg-white' : colorFn(emp.workloadPct)}`}>
                  <div className={`text-sm font-bold ${isZero ? 'text-gray-400' : ''}`}>
                    {Math.round(emp.workloadPct)}%
                  </div>
                  <div className={`text-xs ${isZero ? 'text-gray-400' : 'opacity-80'}`}>
                    ({emp.netCapacityHours.toFixed(1)}) {emp.taskHours.toFixed(1)}ש׳
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50">
            <td className="border border-gray-200 px-4 py-3 font-bold text-gray-900 text-right">סה"כ</td>
            <td className="border border-gray-200 px-4 py-3 text-center text-gray-700 font-semibold">
              {totalTaskHours.toFixed(1)} ש׳
            </td>
            <td className="border border-gray-200 px-4 py-3 text-center text-gray-700 font-semibold">
              {totalCapacityHours.toFixed(1)} ש׳
            </td>
            <td className={`border border-gray-200 px-4 py-3 text-center ${isTotalZero ? 'bg-white' : colorFn(totalPct)}`}>
              <div className={`text-sm font-bold ${isTotalZero ? 'text-gray-400' : ''}`}>
                {Math.round(totalPct)}%
              </div>
              <div className={`text-xs ${isTotalZero ? 'text-gray-400' : 'opacity-80'}`}>
                ({totalCapacityHours.toFixed(1)}) {totalTaskHours.toFixed(1)}ש׳
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type ViewMode = 'weekly' | 'monthly';

export default function WorkloadView() {
  const [viewMode,        setViewMode]        = useState<ViewMode>('weekly');
  const [searchQuery,     setSearchQuery]     = useState('');
  const [weekRef,         setWeekRef]         = useState(() => getSundayOfWeek(new Date()));
  const [month,           setMonth]           = useState(new Date().getMonth() + 1);
  const [year,            setYear]            = useState(new Date().getFullYear());
  const [colorScheme,     setColorScheme]     = useState<SchemeKey>('default');
  const [selectedIds,     setSelectedIds]     = useState<number[]>([]);
  const [weeklySortBy,    setWeeklySortBy]    = useState<'employee' | 'total'>('employee');
  const [employeeSortDir, setEmployeeSortDir] = useState<'asc' | 'desc'>('asc');
  const [totalSortDir,    setTotalSortDir]    = useState<'asc' | 'desc'>('desc');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterSearchQuery, setFilterSearchQuery] = useState('');
  const [showViewModal,   setShowViewModal]   = useState(false);

  const [weeklyData,  setWeeklyData]  = useState<WeeklyEmployee[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyEmployee[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  const loadWeeklyData = useCallback(async (weekStart: Date) => {
    setLoading(true); setError('');
    try {
      const rows = await getWeeklyWorkload(toDateStr(weekStart));
      setWeeklyData(transformWeeklyData(rows));
    } catch (err) {
      setError('שגיאה בטעינת נתוני עומס עבודה שבועי');
      console.error(err);
    } finally { setLoading(false); }
  }, []);

  const loadMonthlyData = useCallback(async (m: number, y: number) => {
    setLoading(true); setError('');
    try {
      const rows = await getMonthlyWorkload(m, y);
      setMonthlyData(transformMonthlyData(rows));
    } catch (err) {
      setError('שגיאה בטעינת נתוני עומס עבודה חודשי');
      console.error(err);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (viewMode === 'weekly') loadWeeklyData(weekRef);
  }, [viewMode, weekRef, loadWeeklyData]);

  useEffect(() => {
    if (viewMode === 'monthly') loadMonthlyData(month, year);
  }, [viewMode, month, year, loadMonthlyData]);

  const filteredWeekly = weeklyData.filter(e =>
    e.employee.name.includes(searchQuery) &&
    (selectedIds.length === 0 || selectedIds.includes(e.employee.id))
  );
  const filteredMonthly = monthlyData.filter(e =>
    e.employee.name.includes(searchQuery) &&
    (selectedIds.length === 0 || selectedIds.includes(e.employee.id))
  );
  const sortedWeekly = useMemo(() => [...filteredWeekly].sort((a, b) => {
    if (weeklySortBy === 'total') {
      const diff = a.weeklyWorkloadPct - b.weeklyWorkloadPct;
      if (diff !== 0) return totalSortDir === 'asc' ? diff : -diff;
      const nameCmp = a.employee.name.localeCompare(b.employee.name, 'he', { sensitivity: 'base' });
      return nameCmp;
    }
    const cmp = a.employee.name.localeCompare(b.employee.name, 'he', { sensitivity: 'base' });
    return employeeSortDir === 'asc' ? cmp : -cmp;
  }), [filteredWeekly, weeklySortBy, totalSortDir, employeeSortDir]);
  const sortedMonthly = useMemo(() => [...filteredMonthly].sort((a, b) => {
    const cmp = a.employee.name.localeCompare(b.employee.name, 'he', { sensitivity: 'base' });
    return employeeSortDir === 'asc' ? cmp : -cmp;
  }), [filteredMonthly, employeeSortDir]);

  const allEmployees = useMemo(() =>
    viewMode === 'weekly' ? weeklyData.map(e => e.employee) : monthlyData.map(e => e.employee),
    [viewMode, weeklyData, monthlyData]
  );
  const filteredEmployeesInModal = useMemo(() => {
    const q = filterSearchQuery.trim().toLowerCase();
    if (!q) return allEmployees;
    return allEmployees.filter(emp => emp.name.toLowerCase().includes(q));
  }, [allEmployees, filterSearchQuery]);

  const toggleEmployee = (id: number) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);

  const weekEnd = new Date(weekRef);
  weekEnd.setDate(weekRef.getDate() + 4);
  const weekLabel = `${formatDateHe(weekRef)} - ${formatDateHe(weekEnd)}, ${weekRef.getFullYear()}`;

  const prevWeek  = () => { const d = new Date(weekRef); d.setDate(d.getDate() - 7); setWeekRef(d); };
  const nextWeek  = () => { const d = new Date(weekRef); d.setDate(d.getDate() + 7); setWeekRef(d); };
  const todayWeek = () => setWeekRef(getSundayOfWeek(new Date()));
  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const scheme = COLOR_SCHEMES[colorScheme];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 py-2 mb-6" dir="rtl">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center shadow-sm">
            <TrendingUp size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">עומס עבודה</h1>
            <p className="text-sm text-gray-500">
              {viewMode === 'weekly' ? filteredWeekly.length : filteredMonthly.length} עובדים
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-2">
          {viewMode === 'weekly' && (
            <div className="flex items-center gap-2">
              <button onClick={prevWeek} className="p-2 hover:bg-gray-100 rounded-lg">
                <ChevronRight size={18} className="text-gray-600" />
              </button>
              <button onClick={todayWeek}
                className="px-3 py-1.5 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 border border-indigo-200">
                היום
              </button>
              <span className="text-sm font-semibold text-gray-700 min-w-[220px] text-center">{weekLabel}</span>
              <button onClick={nextWeek} className="p-2 hover:bg-gray-100 rounded-lg">
                <ChevronLeft size={18} className="text-gray-600" />
              </button>
            </div>
          )}

          {viewMode === 'monthly' && (
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg">
                <ChevronRight size={18} className="text-gray-600" />
              </button>
              <span className="text-base font-bold text-gray-800 min-w-[140px] text-center">
                {HE_MONTHS[month - 1]} {year}
              </span>
              <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg">
                <ChevronLeft size={18} className="text-gray-600" />
              </button>
            </div>
          )}

          <button
            onClick={() => viewMode === 'weekly' ? loadWeeklyData(weekRef) : loadMonthlyData(month, year)}
            disabled={loading}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 disabled:opacity-40"
            title="רענן">
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>

          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            <button onClick={() => setViewMode('weekly')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                viewMode === 'weekly' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              <Calendar size={15} /> שבועי
            </button>
            <button onClick={() => setViewMode('monthly')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                viewMode === 'monthly' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              <BarChart3 size={15} /> חודשי
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-2">
        <div className="flex items-center gap-3 flex-wrap ">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="חיפוש עובד..."
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400" />
          </div>

          <div className="flex items-center gap-3 text-xs">
            {scheme.legend.map((l, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className={`w-3 h-3 rounded ${l.color} inline-block`} />
                {l.label}
              </span>
            ))}
          </div>

          <button onClick={() => setShowFilterModal(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-medium text-sm transition-all ${
              selectedIds.length > 0 ? 'bg-indigo-500 text-white border-indigo-600' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'
            }`}>
            <Filter size={15} />
            סינון עובדים
            {selectedIds.length > 0 && (
              <span className="bg-white text-indigo-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                {selectedIds.length}
              </span>
            )}
          </button>

          <button onClick={() => setShowViewModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg border border-gray-300 font-medium text-sm hidden">
            <BarChart3 size={15} /> תצוגה
          </button>

        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden  ">
        {loading && (
          <div className="flex items-center justify-center py-20 gap-3 text-indigo-500">
            <Loader2 size={24} className="animate-spin" />
            <span className="text-sm font-medium">טוען נתונים...</span>
          </div>
        )}

        {!loading && viewMode === 'weekly' && (
          <WeeklyTable
            employees={sortedWeekly}
            weekStart={weekRef}
            colorFn={scheme.fn}
            weeklySortBy={weeklySortBy}
            employeeSortDir={employeeSortDir}
            totalSortDir={totalSortDir}
            onToggleEmployeeSort={() => {
              setWeeklySortBy('employee');
              setEmployeeSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
            }}
            onToggleTotalSort={() => {
              setWeeklySortBy('total');
              setTotalSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
            }}
          />
        )}
        {!loading && viewMode === 'monthly' && (
          <MonthlyTable
            employees={sortedMonthly}
            colorFn={scheme.fn}
            employeeSortDir={employeeSortDir}
            onToggleEmployeeSort={() => setEmployeeSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
          />
        )}

        {!loading && (viewMode === 'weekly' ? filteredWeekly : filteredMonthly).length === 0 && (
          <div className="py-16 text-center">
            <Users size={40} className="text-gray-300 mx-auto mb-3" />
            <div className="text-gray-400 font-medium">לא נמצאו עובדים</div>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="rounded-xl border border-yellow-200 bg-yellow-50" dir="rtl">
        <div className="px-5 py-3 border-b border-yellow-200 flex items-center gap-2">
          <span className="text-sm font-bold text-yellow-800">💡 הערות</span>
        </div>
        <div className="px-6 py-5 space-y-2 text-sm text-gray-700 leading-relaxed">
          {[
            'עומס עבודה מציג את אחוז הניצול של כל עובד ביחס לקיבולת השבועית או החודשית שלו',
            'הנתונים מחושבים על בסיס שעות משימות מתוכננות מול שעות זמינות לפי ימי עבודה (ראשון–חמישי)',
            'ניצול מעל 90% מצביע על עובד עמוס מאוד — מומלץ לבדוק חלוקת משימות מחדש',
            'ניצול מתחת ל-50% מצביע על תת-ניצול — ניתן להקצות משימות נוספות לעובד',
          ].map((text, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-yellow-500 mt-0.5 flex-shrink-0">•</span>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col" style={{ maxHeight: '80vh' }}>
            <div className="flex-shrink-0 border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">סינון עובדים</h2>
              <button onClick={() => setShowFilterModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="flex-shrink-0 px-6 pt-4">
              <div className="relative">
                <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={filterSearchQuery}
                  onChange={e => setFilterSearchQuery(e.target.value)}
                  placeholder="חיפוש עובד בסינון..."
                  className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {filteredEmployeesInModal.map(emp => (
                <label key={emp.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                  <input type="checkbox" checked={selectedIds.includes(emp.id)} onChange={() => toggleEmployee(emp.id)}
                    className="w-4 h-4 rounded text-indigo-500" />
                  <span className="text-sm font-medium text-gray-800">{emp.name}</span>
                </label>
              ))}
              {filteredEmployeesInModal.length === 0 && <p className="text-sm text-gray-400 text-center">אין עובדים לסינון</p>}
            </div>
            <div className="flex-shrink-0 border-t px-6 py-4 flex gap-3">
              <button onClick={() => setSelectedIds([])}
                className="flex-1 py-2.5 border-2 border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50">נקה הכל</button>
              <button onClick={() => setShowFilterModal(false)}
                className="flex-1 bg-indigo-500 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-600">החל</button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col" style={{ maxHeight: '80vh' }}>
            <div className="flex-shrink-0 border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">תצוגה</h2>
              <button onClick={() => setShowViewModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              <p className="text-xs font-semibold text-gray-500">בחר ערכת צבעים</p>
              {(Object.keys(COLOR_SCHEMES) as SchemeKey[]).map(key => (
                <button key={key} onClick={() => { setColorScheme(key); setShowViewModal(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                    colorScheme === key ? 'bg-indigo-500 text-white border-indigo-600' : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}>
                  <span>{COLOR_SCHEMES[key].name}</span>
                  <span className="flex items-center gap-1">
                    {COLOR_SCHEMES[key].legend.slice(0, 3).map((l, i) => (
                      <span key={i} className={`w-3 h-3 rounded ${l.color}`} />
                    ))}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex-shrink-0 border-t px-6 py-4">
              <button onClick={() => setShowViewModal(false)}
                className="w-full py-2.5 border-2 border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50">סגור</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}