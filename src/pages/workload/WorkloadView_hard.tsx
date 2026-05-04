import { useState, useMemo } from 'react';
import {
  Search, Calendar, ChevronLeft, ChevronRight,
  Users, TrendingUp, BarChart3, Filter, X,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmployeeRow { id: number; name: string; }

interface DayCell {
  date: string;       // "YYYY-MM-DD"
  hours: number;
  percentage: number;
}

interface WeeklyEmployee {
  employee: EmployeeRow;
  days: DayCell[];    // Sun–Thu
  weeklyTaskHours: number;
  weeklyWorkloadPct: number;
}

interface MonthlyEmployee {
  employee: EmployeeRow;
  month: number;      // 1–12
  year: number;
  taskHours: number;
  netCapacityHours: number;
  workloadPct: number;
}

// ─── Hardcoded data ───────────────────────────────────────────────────────────

const EMPLOYEES: EmployeeRow[] = [
  { id: 1, name: 'ישראל ישראלי' },
  { id: 2, name: 'שרה כהן' },
  { id: 3, name: 'משה לוי' },
];

function makeWeeklyData(weekStart: Date): WeeklyEmployee[] {
  const days = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  return [
    {
      employee: EMPLOYEES[0],
      weeklyTaskHours: 32,
      weeklyWorkloadPct: 80,
      days: days.map((date, i) => ({ date, hours: [6, 7, 6, 7, 6][i], percentage: [75, 87, 75, 87, 75][i] })),
    },
    {
      employee: EMPLOYEES[1],
      weeklyTaskHours: 20,
      weeklyWorkloadPct: 50,
      days: days.map((date, i) => ({ date, hours: [4, 4, 4, 4, 4][i], percentage: [50, 50, 50, 50, 50][i] })),
    },
    {
      employee: EMPLOYEES[2],
      weeklyTaskHours: 38,
      weeklyWorkloadPct: 95,
      days: days.map((date, i) => ({ date, hours: [8, 8, 7, 8, 7][i], percentage: [100, 100, 87, 100, 87][i] })),
    },
  ];
}

function makeMonthlyData(year: number, month: number): MonthlyEmployee[] {
  return [
    { employee: EMPLOYEES[0], year, month, taskHours: 120, netCapacityHours: 160, workloadPct: 75 },
    { employee: EMPLOYEES[1], year, month, taskHours: 80,  netCapacityHours: 160, workloadPct: 50 },
    { employee: EMPLOYEES[2], year, month, taskHours: 152, netCapacityHours: 160, workloadPct: 95 },
  ];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const HE_DAYS   = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי'];
const HE_MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];

function getSundayOfWeek(d: Date): Date {
  const result = new Date(d);
  result.setDate(d.getDate() - d.getDay());
  return result;
}

/*function _colorClass(pct: number): string {
  if (pct === 0)  return 'bg-gray-50 text-gray-300';
  if (pct >= 90)  return 'bg-green-500 text-white font-bold';
  if (pct >= 70)  return 'bg-yellow-400 text-gray-800 font-bold';
  if (pct >= 50)  return 'bg-orange-400 text-white font-bold';
  return 'bg-red-400 text-white font-bold';
}*/

function formatDateHe(d: Date) {
  return `${d.getDate()} ${HE_MONTHS[d.getMonth()]}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function WorkloadCell({ pct, hours, colorFn }: { pct: number; hours: number; colorFn: (p: number) => string }) {
  if (pct === 0) return <td className="border border-gray-100 w-24 h-14" />;
  return (
    <td className={`border border-gray-100 w-24 h-14 text-center align-middle ${colorFn(pct)}`}>
      <div className="text-sm font-bold">{Math.round(pct)}%</div>
      <div className="text-xs opacity-80">ש׳ {hours.toFixed(1)}</div>
    </td>
  );
}

// ─── Weekly Table ─────────────────────────────────────────────────────────────

function WeeklyTable({ employees, weekStart, colorFn }: { employees: WeeklyEmployee[]; weekStart: Date; colorFn: (p: number) => string }) {
  const days = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm" dir="rtl">
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-gray-200 px-4 py-3 text-right font-semibold text-gray-700 w-36">שם העובד</th>
            {days.map((d, i) => (
              <th key={i} className="border border-gray-200 px-2 py-3 text-center font-semibold text-gray-700 w-24">
                <div>{HE_DAYS[i]}</div>
                <div className="text-xs font-normal text-gray-400">{formatDateHe(d)}</div>
              </th>
            ))}
            <th className="border border-gray-200 px-3 py-3 text-center font-semibold text-gray-700 w-20">סה"כ</th>
          </tr>
        </thead>
        <tbody>
          {employees.map(emp => (
            <tr key={emp.employee.id} className="hover:bg-gray-50">
              <td className="border border-gray-200 px-4 py-2 font-medium text-gray-800 text-right">
                {emp.employee.name}
              </td>
              {emp.days.map((day, i) => (
                <WorkloadCell key={i} pct={day.percentage} hours={day.hours} colorFn={colorFn} />
              ))}
              <td className={`border border-gray-200 px-3 py-2 text-center ${colorFn(emp.weeklyWorkloadPct)}`}>
                <div className="text-sm font-bold">{Math.round(emp.weeklyWorkloadPct)}%</div>
                <div className="text-xs opacity-80">ש׳ {emp.weeklyTaskHours.toFixed(1)}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Monthly Table ────────────────────────────────────────────────────────────

function MonthlyTable({ employees, colorFn }: { employees: MonthlyEmployee[]; colorFn: (p: number) => string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm" dir="rtl">
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-gray-200 px-4 py-3 text-right font-semibold text-gray-700 w-36">שם העובד</th>
            <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">שעות משימות</th>
            <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">קיבולת נטו</th>
            <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">עומס עבודה</th>
          </tr>
        </thead>
        <tbody>
          {employees.map(emp => (
            <tr key={emp.employee.id} className="hover:bg-gray-50">
              <td className="border border-gray-200 px-4 py-3 font-medium text-gray-800 text-right">
                {emp.employee.name}
              </td>
              <td className="border border-gray-200 px-4 py-3 text-center text-gray-700">
                {emp.taskHours} ש׳
              </td>
              <td className="border border-gray-200 px-4 py-3 text-center text-gray-700">
                {emp.netCapacityHours} ש׳
              </td>
              <td className={`border border-gray-200 px-4 py-3 text-center ${colorFn(emp.workloadPct)}`}>
                <div className="text-sm font-bold">{emp.workloadPct}%</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Color schemes ────────────────────────────────────────────────────────────

const COLOR_SCHEMES = {
  default: {
    name: 'ברירת מחדל',
    fn: (pct: number) => {
      if (pct === 0)  return 'bg-gray-50 text-gray-300';
      if (pct >= 90)  return 'bg-green-500 text-white font-bold';
      if (pct >= 70)  return 'bg-yellow-400 text-gray-800 font-bold';
      if (pct >= 50)  return 'bg-orange-400 text-white font-bold';
      return 'bg-red-400 text-white font-bold';
    },
    legend: [
      { color: 'bg-green-500',  label: '90%+' },
      { color: 'bg-yellow-400', label: '70–89%' },
      { color: 'bg-orange-400', label: '50–69%' },
      { color: 'bg-red-400',    label: '<50%' },
    ],
  },
  blue: {
    name: 'גוני כחול',
    fn: (pct: number) => {
      if (pct === 0)  return 'bg-gray-50 text-gray-300';
      if (pct >= 90)  return 'bg-blue-700 text-white font-bold';
      if (pct >= 70)  return 'bg-blue-500 text-white font-bold';
      if (pct >= 50)  return 'bg-blue-300 text-blue-900 font-bold';
      return 'bg-blue-100 text-blue-700 font-bold';
    },
    legend: [
      { color: 'bg-blue-700', label: '90%+' },
      { color: 'bg-blue-500', label: '70–89%' },
      { color: 'bg-blue-300', label: '50–69%' },
      { color: 'bg-blue-100', label: '<50%' },
    ],
  },
  purple: {
    name: 'סגול',
    fn: (pct: number) => {
      if (pct === 0)  return 'bg-gray-50 text-gray-300';
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
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showViewModal,   setShowViewModal]   = useState(false);

  // Data
  const weeklyData  = useMemo(() => makeWeeklyData(weekRef),      [weekRef]);
  const monthlyData = useMemo(() => makeMonthlyData(year, month), [year, month]);

  // Filter
  const filteredWeekly = weeklyData.filter(e =>
    e.employee.name.includes(searchQuery) &&
    (selectedIds.length === 0 || selectedIds.includes(e.employee.id))
  );
  const filteredMonthly = monthlyData.filter(e =>
    e.employee.name.includes(searchQuery) &&
    (selectedIds.length === 0 || selectedIds.includes(e.employee.id))
  );

  const toggleEmployee = (id: number) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);

  // Week label
  const weekEnd = new Date(weekRef);
  weekEnd.setDate(weekRef.getDate() + 4);
  const weekLabel = `${formatDateHe(weekRef)} - ${formatDateHe(weekEnd)}, ${weekRef.getFullYear()}`;

  // Navigation
  const prevWeek  = () => { const d = new Date(weekRef); d.setDate(d.getDate() - 7); setWeekRef(d); };
  const nextWeek  = () => { const d = new Date(weekRef); d.setDate(d.getDate() + 7); setWeekRef(d); };
  const todayWeek = () => setWeekRef(getSundayOfWeek(new Date()));
  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const scheme = COLOR_SCHEMES[colorScheme];

  return (
    <div className="p-6 space-y-5" dir="rtl">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
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

        {/* View toggle */}
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

      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center gap-3 flex-wrap">

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="חיפוש עובד..."
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* Filter button */}
          <button onClick={() => setShowFilterModal(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-medium text-sm transition-all ${
              selectedIds.length > 0
                ? 'bg-indigo-500 text-white border-indigo-600'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'
            }`}>
            <Filter size={15} />
            סינון עובדים
            {selectedIds.length > 0 && (
              <span className="bg-white text-indigo-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                {selectedIds.length}
              </span>
            )}
          </button>

          {/* View button */}
          <button onClick={() => setShowViewModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg border border-gray-300 font-medium text-sm">
            <BarChart3 size={15} /> תצוגה
          </button>

          {/* Week navigation */}
          {viewMode === 'weekly' && (
            <div className="flex items-center gap-2 mr-auto">
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

          {/* Month navigation */}
          {viewMode === 'monthly' && (
            <div className="flex items-center gap-2 mr-auto">
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
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-indigo-500" />
            <span className="text-sm font-semibold text-gray-700">
              {viewMode === 'weekly' ? `שבוע: ${weekLabel}` : `${HE_MONTHS[month - 1]} ${year}`}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            {scheme.legend.map((l, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className={`w-3 h-3 rounded ${l.color} inline-block`} />
                {l.label}
              </span>
            ))}
          </div>
        </div>

        {viewMode === 'weekly' && (
          <WeeklyTable employees={filteredWeekly} weekStart={weekRef} colorFn={scheme.fn} />
        )}
        {viewMode === 'monthly' && (
          <MonthlyTable employees={filteredMonthly} colorFn={scheme.fn} />
        )}

        {(viewMode === 'weekly' ? filteredWeekly : filteredMonthly).length === 0 && (
          <div className="py-16 text-center">
            <Users size={40} className="text-gray-300 mx-auto mb-3" />
            <div className="text-gray-400 font-medium">לא נמצאו עובדים</div>
          </div>
        )}
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
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {EMPLOYEES.map(emp => (
                <label key={emp.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(emp.id)}
                    onChange={() => toggleEmployee(emp.id)}
                    className="w-4 h-4 rounded text-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-800">{emp.name}</span>
                </label>
              ))}
            </div>
            <div className="flex-shrink-0 border-t px-6 py-4 flex gap-3">
              <button onClick={() => setSelectedIds([])}
                className="flex-1 py-2.5 border-2 border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50">
                נקה הכל
              </button>
              <button onClick={() => setShowFilterModal(false)}
                className="flex-1 bg-indigo-500 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-600">
                החל
              </button>
            </div>
          </div>
        </div>
      )}

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
            'ניתן לסנן עובדים ספציפיים ולשנות ערכת צבעים לפי העדפה אישית',
          ].map((text, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-yellow-500 mt-0.5 flex-shrink-0">•</span>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

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
                    colorScheme === key
                      ? 'bg-indigo-500 text-white border-indigo-600'
                      : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
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
                className="w-full py-2.5 border-2 border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50">
                סגור
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}