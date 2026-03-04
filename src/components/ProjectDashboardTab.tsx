import { useState, useMemo } from 'react';
import { Filter, X, ChevronDown, TrendingUp, Clock, Percent } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type StatusType   = 'תכנון' | 'בביצוע' | 'בהמתנה' | 'הושלם';
type PriorityType = 'גבוהה' | 'בינונית' | 'נמוכה';

interface Task {
  id: number;
  name: string;
  status: StatusType;
  priority: PriorityType;
  employee: string;
  topic: string;
  hours: number;
  progress: number;
}

// ─── Demo data ────────────────────────────────────────────────────────────────
const ALL_TASKS: Task[] = [
  { id:1,  name:'תכנון אדריכלי ראשוני', status:'בביצוע',  priority:'גבוהה',  employee:'נועל',  topic:'תכנון אדריכלי',    hours:80,  progress:60 },
  { id:2,  name:'מערכת האוטומציה',      status:'תכנון',   priority:'בינונית',employee:'אורי',  topic:'מערכת האוטומציה',   hours:120, progress:90 },
  { id:3,  name:'תכנון 1:50',           status:'בהמתנה', priority:'נמוכה',  employee:'מיכלי', topic:'תכנון 1:50',         hours:60,  progress:60 },
  { id:4,  name:'קצב דיגיטלית',        status:'תכנון',   priority:'גבוהה',  employee:'אחרי',  topic:'קצב דיגיטלית',      hours:40,  progress:30 },
  { id:5,  name:'תכנון סיב',            status:'בביצוע',  priority:'בינונית',employee:'נועל',  topic:'תכנון סיב',         hours:55,  progress:40 },
  { id:6,  name:'שרטוטים בתכנון',       status:'הושלם',  priority:'נמוכה',  employee:'אורי',  topic:'תכנון אדריכלי',    hours:35,  progress:50 },
  { id:7,  name:'בדיקת תשתיות',        status:'בביצוע',  priority:'גבוהה',  employee:'מיכלי', topic:'מערכת האוטומציה',   hours:90,  progress:70 },
  { id:8,  name:'אישורי רשות',         status:'תכנון',   priority:'בינונית',employee:'אחרי',  topic:'קצב דיגיטלית',      hours:25,  progress:20 },
  { id:9,  name:'עיצוב פנים',          status:'הושלם',  priority:'נמוכה',  employee:'נועל',  topic:'תכנון אדריכלי',    hours:45,  progress:100},
  { id:10, name:'תאורה ואקוסטיקה',     status:'בהמתנה', priority:'גבוהה',  employee:'אורי',  topic:'תכנון סיב',         hours:70,  progress:15 },
];

// const STATUS_COLORS: Record<StatusType, string> = {
//   'תכנון':   'bg-orange-400',
//   'בביצוע':  'bg-yellow-400',
//   'בהמתנה':  'bg-green-500',
//   'הושלם':   'bg-blue-500',
// };
// const STATUS_TEXT: Record<StatusType, string> = {
//   'תכנון':   'text-orange-600',
//   'בביצוע':  'text-yellow-600',
//   'בהמתנה':  'text-green-600',
//   'הושלם':   'text-blue-600',
// };

// const PRIORITY_COLORS: Record<PriorityType, string> = {
//   'גבוהה':   'bg-blue-800',
//   'בינונית': 'bg-cyan-600',
//   'נמוכה':   'bg-cyan-400',
// };

//const EMPLOYEE_COLORS = ['bg-teal-500','bg-blue-600','bg-purple-600','bg-purple-800'];
const EMPLOYEES = ['נועל','אורי','מיכלי','אחרי'];
const TOPICS    = [...new Set(ALL_TASKS.map(t => t.topic))];

const BUDGETED_HOURS = 480;

// ─── Donut Chart ──────────────────────────────────────────────────────────────
function DonutChart({ data, total }: {
  data: { label: string; value: number; color: string }[];
  total: number;
}) {
  const circumference = 2 * Math.PI * 40;
  let offset = 0;

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-32 h-32 flex-shrink-0">
        <svg viewBox="0 0 100 100" className="-rotate-90 w-full h-full">
          {data.map((d, i) => {
            const dash = (d.value / total) * circumference;
            const segment = (
              <circle key={i} cx="50" cy="50" r="40" fill="none"
                stroke={d.color} strokeWidth="20"
                strokeDasharray={`${dash} ${circumference}`}
                strokeDashoffset={-offset}
              />
            );
            offset += dash;
            return segment;
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-lg font-bold text-gray-700">
          {total}
        </div>
      </div>
      <div className="space-y-1.5 flex-1">
        {data.map((d, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="text-gray-600">{d.label}</span>
            </div>
            <span className="font-bold text-gray-800">
              {total > 0 ? Math.round(d.value / total * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────
function BarChart({ bars, maxVal }: {
  bars: { label: string; value: number; color: string }[];
  maxVal: number;
}) {
  return (
    <div className="flex items-end gap-3 h-36 pt-2">
      {bars.map((b, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1">
          <span className="text-[10px] font-bold text-gray-600">{b.value}</span>
          <div className="w-full rounded-t transition-all duration-500"
            style={{
              height: maxVal > 0 ? `${(b.value / maxVal) * 100}%` : '4px',
              minHeight: '4px',
              backgroundColor: b.color,
            }}
          />
          <span className="text-[10px] text-gray-500 text-center leading-tight">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, highlight }: {
  label: string; value: string; sub?: string; highlight?: boolean;
}) {
  return (
    <div className={`bg-white rounded-xl border p-4 shadow-sm ${highlight ? 'border-amber-300 bg-amber-50' : 'border-gray-200'}`}>
      <div className={`text-2xl font-bold ${highlight ? 'text-amber-700' : 'text-gray-800'}`}>{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

// ─── Filter Pill ──────────────────────────────────────────────────────────────
function FilterPill({ label, active, onClick }: {
  label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
        active
          ? 'bg-indigo-600 text-white border-indigo-600'
          : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
      }`}
    >
      {label}
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ProjectDashboardTab() {
  // Financial controls
  const [hourlyRate,    setHourlyRate]    = useState(250);
  const [profitPercent, setProfitPercent] = useState(20);

  // Filters
  const [filterStatus,   setFilterStatus]   = useState<StatusType[]>([]);
  const [filterPriority, setFilterPriority] = useState<PriorityType[]>([]);
  const [filterEmployee, setFilterEmployee] = useState<string[]>([]);
  const [filterTopic,    setFilterTopic]    = useState<string[]>([]);
  const [showFilters,    setShowFilters]    = useState(false);

  const toggleFilter = <T,>(arr: T[], setArr: (v: T[]) => void, val: T) =>
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);

  const activeFilterCount =
    filterStatus.length + filterPriority.length + filterEmployee.length + filterTopic.length;

  const clearFilters = () => {
    setFilterStatus([]); setFilterPriority([]); setFilterEmployee([]); setFilterTopic([]);
  };

  // Filtered tasks
  const tasks = useMemo(() => ALL_TASKS.filter(t =>
    (filterStatus.length   === 0 || filterStatus.includes(t.status))   &&
    (filterPriority.length === 0 || filterPriority.includes(t.priority)) &&
    (filterEmployee.length === 0 || filterEmployee.includes(t.employee)) &&
    (filterTopic.length    === 0 || filterTopic.includes(t.topic))
  ), [filterStatus, filterPriority, filterEmployee, filterTopic]);

  // Derived stats
  const totalHours    = tasks.reduce((s, t) => s + t.hours, 0);
  const totalCost     = totalHours * hourlyRate;
  const profit        = Math.round(totalCost * profitPercent / 100);
  const budgetUsedPct = Math.min(100, Math.round(totalHours / BUDGETED_HOURS * 100));
  const openTasks     = tasks.filter(t => t.status !== 'הושלם').length;
  const avgProgress   = tasks.length > 0
    ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / tasks.length) : 0;

  // Status donut
  const statusTypes: StatusType[] = ['תכנון','בביצוע','בהמתנה','הושלם'];
  const statusColors = ['#fb923c','#fbbf24','#10b981','#3b82f6'];
  const statusData = statusTypes.map((s, i) => ({
    label: s,
    value: tasks.filter(t => t.status === s).length,
    color: statusColors[i],
  })).filter(d => d.value > 0);

  // Priority donut
  const priorityTypes: PriorityType[] = ['גבוהה','בינונית','נמוכה'];
  const priorityColors = ['#1e40af','#0891b2','#06b6d4'];
  const priorityData = priorityTypes.map((p, i) => ({
    label: p,
    value: tasks.filter(t => t.priority === p).length,
    color: priorityColors[i],
  })).filter(d => d.value > 0);

  // Employee bars
  const empBars = EMPLOYEES.map((e, i) => ({
    label: e,
    value: tasks.filter(t => t.employee === e).length,
    color: ['#14b8a6','#2563eb','#7c3aed','#6d28d9'][i],
  }));
  const maxEmp = Math.max(...empBars.map(b => b.value), 1);

  // Topic progress
  const topicProgress = TOPICS.map(topic => {
    const topicTasks = tasks.filter(t => t.topic === topic);
    return {
      name: topic,
      progress: topicTasks.length > 0
        ? Math.round(topicTasks.reduce((s, t) => s + t.progress, 0) / topicTasks.length) : 0,
      count: topicTasks.length,
    };
  }).filter(t => t.count > 0);

  // Budget topic bars
  const topicHours = TOPICS.map((topic, i) => ({
    label: topic.length > 8 ? topic.slice(0, 8) + '…' : topic,
    value: tasks.filter(t => t.topic === topic).reduce((s, t) => s + t.hours, 0),
    color: ['#0d9488','#1d4ed8','#6d28d9','#7c3aed','#2563eb','#0891b2'][i % 6],
  })).filter(b => b.value > 0);
  const maxTopicHours = Math.max(...topicHours.map(b => b.value), 1);

  return (
    <div className="space-y-4" dir="rtl">

      {/* ── Financial Controls Bar ─────────────────────────────────────────── */}
      <div className="bg-white border-2 border-amber-300 rounded-xl px-5 py-4 shadow-sm">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-amber-500" />
            <span className="font-bold text-gray-700 text-sm">פרמטרים פיננסיים</span>
          </div>

          {/* Hourly rate */}
          <div className="flex items-center gap-3 flex-1 min-w-[220px]">
            <label className="text-xs font-semibold text-gray-600 whitespace-nowrap flex items-center gap-1">
              <Clock size={13} className="text-amber-400" />
              עלות לשעה
            </label>
            <input type="range" min={0} max={2000} step={10}
              value={hourlyRate}
              onChange={e => setHourlyRate(Number(e.target.value))}
              className="flex-1 h-2 accent-amber-500 cursor-pointer"
            />
            <div className="relative w-24">
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">₪</span>
              <input type="number" min={0} max={2000} step={10}
                value={hourlyRate}
                onChange={e => setHourlyRate(Math.max(0, Math.min(2000, Number(e.target.value))))}
                className="w-full pr-6 pl-2 py-1.5 border-2 border-amber-200 rounded-lg text-sm font-bold text-center focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          {/* Profit percent */}
          <div className="flex items-center gap-3 flex-1 min-w-[220px]">
            <label className="text-xs font-semibold text-gray-600 whitespace-nowrap flex items-center gap-1">
              <Percent size={13} className="text-amber-400" />
              אחוז רווח
            </label>
            <input type="range" min={0} max={100} step={1}
              value={profitPercent}
              onChange={e => setProfitPercent(Number(e.target.value))}
              className="flex-1 h-2 accent-amber-500 cursor-pointer"
            />
            <div className="relative w-20">
              <input type="number" min={0} max={100}
                value={profitPercent}
                onChange={e => setProfitPercent(Math.max(0, Math.min(100, Number(e.target.value))))}
                className="w-full pr-2 pl-6 py-1.5 border-2 border-amber-200 rounded-lg text-sm font-bold text-center focus:ring-2 focus:ring-amber-400"
              />
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
            </div>
          </div>

          {/* Live results */}
          <div className="flex gap-3">
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
              <div className="text-xs text-amber-600 font-medium">עלות כוללת</div>
              <div className="text-base font-bold text-amber-800">₪{totalCost.toLocaleString()}</div>
            </div>
            <div className={`border rounded-lg px-3 py-2 text-center ${
              profitPercent >= 20 ? 'bg-emerald-50 border-emerald-200'
              : profitPercent >= 10 ? 'bg-yellow-50 border-yellow-200'
              : 'bg-red-50 border-red-200'
            }`}>
              <div className="text-xs font-medium text-gray-500">רווח צפוי</div>
              <div className={`text-base font-bold ${
                profitPercent >= 20 ? 'text-emerald-700'
                : profitPercent >= 10 ? 'text-yellow-700'
                : 'text-red-600'
              }`}>₪{profit.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter Bar ─────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl px-5 py-3 shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-semibold transition-all ${
              showFilters || activeFilterCount > 0
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-gray-300 text-gray-600 hover:border-indigo-300'
            }`}
          >
            <Filter size={15} />
            סינון
            {activeFilterCount > 0 && (
              <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {activeFilterCount > 0 && (
            <button onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-semibold"
            >
              <X size={13} /> נקה הכל
            </button>
          )}

          <span className="text-xs text-gray-400 mr-auto">
            מציג {tasks.length} מתוך {ALL_TASKS.length} משימות
          </span>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-gray-100">
            {/* סטטוס */}
            <div>
              <div className="text-xs font-bold text-gray-500 mb-2">סטטוס</div>
              <div className="flex flex-wrap gap-1.5">
                {statusTypes.map(s => (
                  <FilterPill key={s} label={s}
                    active={filterStatus.includes(s)}
                    onClick={() => toggleFilter(filterStatus, setFilterStatus, s)}
                  />
                ))}
              </div>
            </div>

            {/* עדיפות */}
            <div>
              <div className="text-xs font-bold text-gray-500 mb-2">עדיפות</div>
              <div className="flex flex-wrap gap-1.5">
                {priorityTypes.map(p => (
                  <FilterPill key={p} label={p}
                    active={filterPriority.includes(p)}
                    onClick={() => toggleFilter(filterPriority, setFilterPriority, p)}
                  />
                ))}
              </div>
            </div>

            {/* עובד */}
            <div>
              <div className="text-xs font-bold text-gray-500 mb-2">עובד</div>
              <div className="flex flex-wrap gap-1.5">
                {EMPLOYEES.map(e => (
                  <FilterPill key={e} label={e}
                    active={filterEmployee.includes(e)}
                    onClick={() => toggleFilter(filterEmployee, setFilterEmployee, e)}
                  />
                ))}
              </div>
            </div>

            {/* נושא */}
            <div>
              <div className="text-xs font-bold text-gray-500 mb-2">נושא תכנון</div>
              <div className="flex flex-wrap gap-1.5">
                {TOPICS.map(t => (
                  <FilterPill key={t} label={t.length > 10 ? t.slice(0,10)+'…' : t}
                    active={filterTopic.includes(t)}
                    onClick={() => toggleFilter(filterTopic, setFilterTopic, t)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Stats Row 1 ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="אחוז תקציב משומש"    value={`${budgetUsedPct}%`} />
        <StatCard label="אחוז רווח רצוי"      value={`${profitPercent}%`} />
        <StatCard label="שעות מוגדרות"        value={BUDGETED_HOURS.toString()} />
        <StatCard label="שעות משימות מסוננות" value={totalHours.toString()} />
        <StatCard label="עלות כוללת" value={`₪${totalCost.toLocaleString()}`} highlight />
        <StatCard label="רווח צפוי"  value={`₪${profit.toLocaleString()}`}
          sub={profitPercent >= 20 ? '✓ תקין' : profitPercent >= 10 ? '⚠ נמוך' : '✗ נמוך מאוד'}
          highlight
        />
      </div>

      {/* ── Stats Row 2 ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="משימות פתוחות"       value={openTasks.toString()} />
        <StatCard label="סה״כ משימות מסוננות" value={tasks.length.toString()} />
        <StatCard label="שעות מדווחות"        value="430" />
        <StatCard label="ממוצע התקדמות"       value={`${avgProgress}%`} />
      </div>

      {/* ── Charts Row 1 ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Donut: סטטוס */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-700 mb-4">סטטוס משימות</h3>
          {tasks.length > 0
            ? <DonutChart data={statusData} total={tasks.length} />
            : <div className="h-32 flex items-center justify-center text-gray-400 text-sm">אין נתונים</div>
          }
        </div>

        {/* Donut: עדיפות */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-700 mb-4">עדיפויות</h3>
          {tasks.length > 0
            ? <DonutChart data={priorityData} total={tasks.length} />
            : <div className="h-32 flex items-center justify-center text-gray-400 text-sm">אין נתונים</div>
          }
        </div>

        {/* Bar: משימות לעובד */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-700 mb-2">משימות לעובד</h3>
          {tasks.length > 0
            ? <BarChart bars={empBars} maxVal={maxEmp} />
            : <div className="h-36 flex items-center justify-center text-gray-400 text-sm">אין נתונים</div>
          }
        </div>
      </div>

      {/* ── Charts Row 2 ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Progress bars: נושאי תכנון */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-700 mb-4">התקדמות לנושא תכנון</h3>
          {topicProgress.length > 0 ? (
            <div className="space-y-3">
              {topicProgress.map(t => (
                <div key={t.name}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-gray-600">{t.name}</span>
                    <span className="text-xs font-bold text-gray-800">{t.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div className="h-3 bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${t.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-gray-400 text-sm">אין נתונים</div>
          )}
        </div>

        {/* Bar: שעות לנושא */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-700 mb-2">שעות לנושא תכנון</h3>
          {topicHours.length > 0
            ? <BarChart bars={topicHours} maxVal={maxTopicHours} />
            : <div className="h-36 flex items-center justify-center text-gray-400 text-sm">אין נתונים</div>
          }
        </div>
      </div>

      {/* ── Budget utilization strip ────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-700">ניצול תקציב שעות</h3>
          <span className="text-sm font-bold text-gray-600">{totalHours} / {BUDGETED_HOURS} ש׳</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-5 overflow-hidden">
          <div
            className={`h-5 rounded-full transition-all duration-500 flex items-center justify-center text-xs font-bold text-white ${
              budgetUsedPct > 90 ? 'bg-red-500'
              : budgetUsedPct > 70 ? 'bg-yellow-500'
              : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.max(budgetUsedPct, 3)}%` }}
          >
            {budgetUsedPct > 10 ? `${budgetUsedPct}%` : ''}
          </div>
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>0</span>
          <span>{BUDGETED_HOURS / 2}</span>
          <span>{BUDGETED_HOURS} שעות</span>
        </div>
      </div>

    </div>
  );
}