import { useState, useMemo } from 'react';
import {
  Search, Filter, Calendar, ChevronLeft, ChevronRight,
  Users, TrendingUp, X, Lightbulb,
} from 'lucide-react';

type ViewMode = 'weekly' | 'monthly';

interface EmployeeWorkload {
  id: number;
  name: string;
  weeklyCapacity: number;
  dailyCapacity: number;
}

interface WorkloadEntry {
  employeeId: number;
  date: string;
  hours: number;
  percentage: number;
}

const EMPLOYEES: EmployeeWorkload[] = [
  { id: 1, name: 'מעיין טוטי',  weeklyCapacity: 40, dailyCapacity: 8 },
  { id: 2, name: 'אורי ריבקה',  weeklyCapacity: 40, dailyCapacity: 8 },
  { id: 3, name: 'נטלי מזרחי', weeklyCapacity: 40, dailyCapacity: 8 },
  { id: 4, name: 'דני כהן',     weeklyCapacity: 32, dailyCapacity: 6.4 },
  { id: 5, name: 'רון שמיר',    weeklyCapacity: 40, dailyCapacity: 8 },
];

function generateWorkload(): WorkloadEntry[] {
  const entries: WorkloadEntry[] = [];
  EMPLOYEES.forEach(emp => {
    for (let m = 0; m < 12; m++) {
      for (let d = 0; d < 31; d++) {
        const date = new Date(2025, m, d + 1);
        if (date.getMonth() !== m) break;
        if (date.getDay() === 0 || date.getDay() === 6) continue;
        const pct = Math.floor(Math.random() * 80) + 20;
        entries.push({
          employeeId: emp.id,
          date: date.toISOString().split('T')[0],
          hours: parseFloat(((pct / 100) * emp.dailyCapacity).toFixed(1)),
          percentage: pct,
        });
      }
    }
  });
  return entries;
}

const ALL_WORKLOAD = generateWorkload();

const HE_DAYS   = ['יום ראשון','יום שני','יום שלישי','יום רביעי','יום חמישי'];
const HE_MONTHS = ['ינו','פבר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספט','אוק','נוב','דצמ'];

function getWeekDays(refDate: Date): Date[] {
  const d = new Date(refDate);
  d.setDate(d.getDate() - d.getDay());
  return Array.from({ length: 5 }, (_, i) => {
    const day = new Date(d);
    day.setDate(d.getDate() + i);
    return day;
  });
}

function toDateStr(d: Date) { return d.toISOString().split('T')[0]; }
function formatDate(d: Date) { return `${d.getDate()} ל${HE_MONTHS[d.getMonth()]}`; }

// ── Color schemes — replaced gray with green ──────────────────────────────────
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
  // ✅ replaced gray with teal/green
  teal: {
    name: 'ירוק-כחול',
    fn: (pct: number) => {
      if (pct === 0)  return 'bg-gray-50 text-gray-300';
      if (pct >= 90)  return 'bg-teal-700 text-white font-bold';
      if (pct >= 70)  return 'bg-teal-500 text-white font-bold';
      if (pct >= 50)  return 'bg-teal-300 text-teal-900 font-bold';
      return 'bg-teal-100 text-teal-700 font-bold';
    },
    legend: [
      { color: 'bg-teal-700', label: '90%+' },
      { color: 'bg-teal-500', label: '70–89%' },
      { color: 'bg-teal-300', label: '50–69%' },
      { color: 'bg-teal-100', label: '<50%' },
    ],
  },
};

type SchemeKey = keyof typeof COLOR_SCHEMES;

function WorkloadCell({ pct, hours, colorFn }: { pct: number; hours: number; colorFn: (p: number) => string }) {
  if (pct === 0) return <td className="border border-gray-100 w-24 h-14" />;
  return (
    <td className={`border border-gray-100 w-24 h-14 text-center align-middle ${colorFn(pct)}`}>
      <div className="text-sm font-bold">{pct}%</div>
      <div className="text-xs opacity-80">ש׳ {hours}</div>
    </td>
  );
}

function WeeklyView({ employees, workload, weekDays, colorFn }: {
  employees: EmployeeWorkload[]; workload: WorkloadEntry[]; weekDays: Date[]; colorFn: (p: number) => string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm" dir="rtl">
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-gray-200 px-4 py-3 text-right font-semibold text-gray-700 w-36">שם העובד</th>
            {weekDays.map(d => (
              <th key={toDateStr(d)} className="border border-gray-200 px-2 py-3 text-center font-semibold text-gray-700 w-24">
                {HE_DAYS[d.getDay()]}
              </th>
            ))}
            <th className="border border-gray-200 px-3 py-3 text-center font-semibold text-gray-700 w-20">סה"כ</th>
          </tr>
        </thead>
        <tbody>
          {employees.map(emp => {
            const dayEntries = weekDays.map(d =>
              workload.find(w => w.employeeId === emp.id && w.date === toDateStr(d))
              ?? { percentage: 0, hours: 0, employeeId: emp.id, date: toDateStr(d) }
            );
            const totalHours = dayEntries.reduce((s, e) => s + e.hours, 0);
            const active = dayEntries.filter(e => e.percentage > 0);
            const avgPct = active.length > 0 ? Math.round(active.reduce((s, e) => s + e.percentage, 0) / active.length) : 0;
            return (
              <tr key={emp.id} className="hover:bg-gray-50">
                <td className="border border-gray-200 px-4 py-2 font-medium text-gray-800 text-right">{emp.name}</td>
                {dayEntries.map((entry, i) => <WorkloadCell key={i} pct={entry.percentage} hours={entry.hours} colorFn={colorFn} />)}
                <td className={`border border-gray-200 px-3 py-2 text-center ${colorFn(avgPct)}`}>
                  <div className="text-sm font-bold">{avgPct}%</div>
                  <div className="text-xs opacity-80">ש׳ {totalHours.toFixed(1)}</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MonthlyView({ employees, workload, year, colorFn }: {
  employees: EmployeeWorkload[]; workload: WorkloadEntry[]; year: number; colorFn: (p: number) => string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm" dir="rtl">
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-gray-200 px-4 py-3 text-right font-semibold text-gray-700 w-36">שם העובד</th>
            {HE_MONTHS.map(m => (
              <th key={m} className="border border-gray-200 px-2 py-3 text-center font-semibold text-gray-700 w-16">{m}</th>
            ))}
            <th className="border border-gray-200 px-3 py-3 text-center font-semibold text-gray-700 w-20">סה"כ</th>
          </tr>
        </thead>
        <tbody>
          {employees.map(emp => {
            const monthData = HE_MONTHS.map((_, mi) => {
              const entries = workload.filter(w => {
                const d = new Date(w.date);
                return w.employeeId === emp.id && d.getFullYear() === year && d.getMonth() === mi;
              });
              if (!entries.length) return { pct: 0, hours: 0 };
              return {
                hours: parseFloat(entries.reduce((s, e) => s + e.hours, 0).toFixed(1)),
                pct: Math.round(entries.reduce((s, e) => s + e.percentage, 0) / entries.length),
              };
            });
            const totalHours = parseFloat(monthData.reduce((s, m) => s + m.hours, 0).toFixed(1));
            const active = monthData.filter(m => m.pct > 0);
            const avgPct = active.length > 0 ? Math.round(active.reduce((s, m) => s + m.pct, 0) / active.length) : 0;
            return (
              <tr key={emp.id} className="hover:bg-gray-50">
                <td className="border border-gray-200 px-4 py-2 font-medium text-gray-800 text-right">{emp.name}</td>
                {monthData.map((m, i) => <WorkloadCell key={i} pct={m.pct} hours={m.hours} colorFn={colorFn} />)}
                <td className={`border border-gray-200 px-3 py-2 text-center ${colorFn(avgPct)}`}>
                  <div className="text-sm font-bold">{avgPct > 0 ? `${avgPct}%` : ''}</div>
                  <div className="text-xs opacity-80">{totalHours > 0 ? `ש׳ ${totalHours}` : ''}</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function WorkloadView() {
  const [viewMode, setViewMode]         = useState<ViewMode>('weekly');
  const [searchQuery, setSearchQuery]   = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [weekRef, setWeekRef]           = useState(new Date(2025, 2, 16));
  const [year, setYear]                 = useState(2025);
  const [colorScheme, setColorScheme]   = useState<SchemeKey>('default');

  // ── 3. Multi-employee filter ──
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const toggleEmployee = (id: number) => {
    setSelectedEmployees(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const weekDays  = useMemo(() => getWeekDays(weekRef), [weekRef]);
  const weekLabel = useMemo(() => {
    const s = weekDays[0], e = weekDays[4];
    return `${formatDate(s)} - ${formatDate(e)}, ${s.getFullYear()}`;
  }, [weekDays]);

  const prevWeek  = () => { const d = new Date(weekRef); d.setDate(d.getDate() - 7); setWeekRef(d); };
  const nextWeek  = () => { const d = new Date(weekRef); d.setDate(d.getDate() + 7); setWeekRef(d); };
  const todayWeek = () => setWeekRef(new Date());

  // filter by search + selected employees
  const filteredEmployees = useMemo(() =>
    EMPLOYEES.filter(e => {
      const matchesSearch = !searchQuery || e.name.includes(searchQuery);
      const matchesFilter = selectedEmployees.length === 0 || selectedEmployees.includes(e.id);
      return matchesSearch && matchesFilter;
    }),
    [searchQuery, selectedEmployees]
  );

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
            <p className="text-sm text-gray-500">{filteredEmployees.length} עובדים</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          <button onClick={() => setViewMode('weekly')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === 'weekly' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Calendar size={15} /> שבועי
          </button>
          <button onClick={() => setViewMode('monthly')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === 'monthly' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Calendar size={15} /> חודשי / שנתי
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="חיפוש עובד..."
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400" />
          </div>

          <button onClick={() => setShowFilterModal(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-medium text-sm transition-all ${
              selectedEmployees.length > 0
                ? 'bg-indigo-500 text-white border-indigo-600'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'
            }`}>
            <Filter size={15} />
            סינון עובדים
            {selectedEmployees.length > 0 && (
              <span className="bg-white text-indigo-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                {selectedEmployees.length}
              </span>
            )}
          </button>

          {/* Color scheme */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-600">ערכת צבעים:</span>
            <div className="flex gap-1">
              {(Object.keys(COLOR_SCHEMES) as SchemeKey[]).map(key => (
                <button key={key} onClick={() => setColorScheme(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    colorScheme === key ? 'bg-indigo-500 text-white border-indigo-600' : 'bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100'
                  }`}>
                  {COLOR_SCHEMES[key].name}
                </button>
              ))}
            </div>
          </div>

          {viewMode === 'weekly' && (
            <div className="flex items-center gap-2 mr-auto">
              <button onClick={prevWeek} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight size={18} className="text-gray-600" /></button>
              <button onClick={todayWeek} className="px-3 py-1.5 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 border border-indigo-200">היום</button>
              <span className="text-sm font-semibold text-gray-700 min-w-[200px] text-center">{weekLabel}</span>
              <button onClick={nextWeek} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={18} className="text-gray-600" /></button>
              <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-1 rounded-full font-semibold">שבועי</span>
            </div>
          )}
          {viewMode === 'monthly' && (
            <div className="flex items-center gap-2 mr-auto">
              <button onClick={() => setYear(y => y - 1)} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight size={18} className="text-gray-600" /></button>
              <span className="text-lg font-bold text-gray-800 min-w-[60px] text-center">{year}</span>
              <button onClick={() => setYear(y => y + 1)} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={18} className="text-gray-600" /></button>
              <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-1 rounded-full font-semibold">חודשי</span>
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
              {viewMode === 'weekly' ? `שבוע: ${weekLabel}` : `שנה: ${year}`}
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

        {viewMode === 'weekly' && <WeeklyView employees={filteredEmployees} workload={ALL_WORKLOAD} weekDays={weekDays} colorFn={scheme.fn} />}
        {viewMode === 'monthly' && <MonthlyView employees={filteredEmployees} workload={ALL_WORKLOAD} year={year} colorFn={scheme.fn} />}
        {filteredEmployees.length === 0 && (
          <div className="py-16 text-center">
            <Users size={40} className="text-gray-300 mx-auto mb-3" />
            <div className="text-gray-400 font-medium">לא נמצאו עובדים</div>
          </div>
        )}
      </div>

      {/* ── הסבר על עומס עבודה ── */}
      <div className="rounded-xl border border-yellow-200 bg-yellow-50" dir="rtl">
        <div className="px-5 py-3 border-b border-yellow-200 flex items-center gap-2">
          <Lightbulb size={16} className="text-yellow-500" />
          <span className="text-sm font-bold text-yellow-800">הערות</span>
        </div>
        <div className="px-6 py-5 space-y-2 text-sm text-gray-700 leading-relaxed">
          <div className="flex items-start gap-2">
            <span className="text-yellow-500 mt-0.5 flex-shrink-0">•</span>
            <span>עומס עבודה מציג את אחוז הניצול של כל עובד ביחס לקיבולת השבועית או החודשית שלו</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-yellow-500 mt-0.5 flex-shrink-0">•</span>
            <span>הנתונים מחושבים על בסיס שעות משימות מתוכננות מול שעות זמינות לפי ימי עבודה (ראשון–חמישי)</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-yellow-500 mt-0.5 flex-shrink-0">•</span>
            <span>ניצול מעל 90% מצביע על עובד עמוס מאוד — מומלץ לבדוק חלוקת משימות מחדש</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-yellow-500 mt-0.5 flex-shrink-0">•</span>
            <span>ניצול מתחת ל-50% מצביע על תת-ניצול — ניתן להקצות משימות נוספות לעובד</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-yellow-500 mt-0.5 flex-shrink-0">•</span>
            <span>ניתן לסנן עובדים ספציפיים ולשנות ערכת צבעים לפי העדפה אישית</span>
          </div>
        </div>
      </div>

      {/* ── Filter Modal — multi employee ── */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col" style={{ maxHeight: '80vh' }}>
            <div className="flex-shrink-0 border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">סינון עובדים</h2>
              <button onClick={() => setShowFilterModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Search inside modal */}
              <div className="relative">
                <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="חיפוש לפי שם..."
                  className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400" />
              </div>

              {/* Employee checkboxes */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500">בחר עובדים להצגה</p>
                {EMPLOYEES.map(emp => (
                  <label key={emp.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedEmployees.includes(emp.id)}
                      onChange={() => toggleEmployee(emp.id)}
                      className="w-4 h-4 rounded text-indigo-500 focus:ring-indigo-400"
                    />
                    <span className="text-sm font-medium text-gray-800">{emp.name}</span>
                  </label>
                ))}
              </div>

              {selectedEmployees.length > 0 && (
                <p className="text-xs text-indigo-600 font-semibold">
                  {selectedEmployees.length} עובדים נבחרו
                </p>
              )}
            </div>

            <div className="flex-shrink-0 border-t px-6 py-4 flex gap-3">
              <button onClick={() => { setSelectedEmployees([]); setSearchQuery(''); }}
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
    </div>
  );
}