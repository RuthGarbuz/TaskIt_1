import { useState, useMemo } from 'react';
import { Filter, X, ChevronDown, TrendingUp, Clock, Percent, CheckCircle, ListTodo, BarChart2, Target } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type StatusType   = 'תכנון' | 'בביצוע' | 'בהמתנה' | 'הושלם';
type PriorityType = 'גבוהה' | 'בינונית' | 'נמוכה';

interface Task {
  id: number; name: string; status: StatusType; priority: PriorityType;
  employee: string; topic: string; hours: number; progress: number;
}

const ALL_TASKS: Task[] = [
  { id:1,  name:'תכנון אדריכלי ראשוני', status:'בביצוע',  priority:'גבוהה',  employee:'נועל',  topic:'תכנון אדריכלי',  hours:80,  progress:60  },
  { id:2,  name:'מערכת האוטומציה',      status:'תכנון',   priority:'בינונית',employee:'אורי',  topic:'מערכת האוטומציה',hours:120, progress:90  },
  { id:3,  name:'תכנון 1:50',           status:'בהמתנה', priority:'נמוכה',  employee:'מיכלי', topic:'תכנון 1:50',      hours:60,  progress:60  },
  { id:4,  name:'קצב דיגיטלית',        status:'תכנון',   priority:'גבוהה',  employee:'אחרי',  topic:'קצב דיגיטלית',   hours:40,  progress:30  },
  { id:5,  name:'תכנון סיב',            status:'בביצוע',  priority:'בינונית',employee:'נועל',  topic:'תכנון סיב',       hours:55,  progress:40  },
  { id:6,  name:'שרטוטים בתכנון',       status:'הושלם',  priority:'נמוכה',  employee:'אורי',  topic:'תכנון אדריכלי',  hours:35,  progress:50  },
  { id:7,  name:'בדיקת תשתיות',        status:'בביצוע',  priority:'גבוהה',  employee:'מיכלי', topic:'מערכת האוטומציה',hours:90,  progress:70  },
  { id:8,  name:'אישורי רשות',         status:'תכנון',   priority:'בינונית',employee:'אחרי',  topic:'קצב דיגיטלית',   hours:25,  progress:20  },
  { id:9,  name:'עיצוב פנים',          status:'הושלם',  priority:'נמוכה',  employee:'נועל',  topic:'תכנון אדריכלי',  hours:45,  progress:100 },
  { id:10, name:'תאורה ואקוסטיקה',     status:'בהמתנה', priority:'גבוהה',  employee:'אורי',  topic:'תכנון סיב',       hours:70,  progress:15  },
];

const SUBCONTRACT_FEE = 85_000;
const BUDGETED_HOURS  = 480;
const REPORTED_HOURS  = 430;
const EMPLOYEES       = ['נועל','אורי','מיכלי','אחרי'];
const TOPICS          = [...new Set(ALL_TASKS.map(t => t.topic))];

// ─── Donut Chart ──────────────────────────────────────────────────────────────
function DonutChart({ data, total }: { data: { label: string; value: number; color: string }[]; total: number }) {
  const circ = 2 * Math.PI * 40;
  let off = 0;
  return (
    <div className="flex items-center gap-4">
      <div className="relative w-28 h-28 flex-shrink-0">
        <svg viewBox="0 0 100 100" className="-rotate-90 w-full h-full">
          {data.map((d, i) => {
            const dash = (d.value / total) * circ;
            const el = <circle key={i} cx="50" cy="50" r="40" fill="none" stroke={d.color} strokeWidth="20" strokeDasharray={`${dash} ${circ}`} strokeDashoffset={-off}/>;
            off += dash; return el;
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-lg font-bold text-gray-700">{total}</div>
      </div>
      <div className="space-y-1.5 flex-1">
        {data.map((d, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}/>
              <span className="text-gray-600">{d.label}</span>
            </div>
            <span className="font-bold text-gray-800">{total > 0 ? Math.round(d.value / total * 100) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────
function BarChart({ bars, maxVal }: { bars: { label: string; value: number; color: string }[]; maxVal: number }) {
  return (
    <div className="flex items-end gap-3 h-36 pt-2">
      {bars.map((b, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1">
          <span className="text-[10px] font-bold text-gray-600">{b.value}</span>
          <div className="w-full rounded-t transition-all duration-500"
            style={{ height: maxVal > 0 ? `${(b.value / maxVal) * 100}%` : '4px', minHeight: '4px', backgroundColor: b.color }}/>
          <span className="text-[10px] text-gray-500 text-center leading-tight">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color = 'gray', icon: Icon }: {
  label: string; value: string; sub?: string;
  color?: 'blue'|'emerald'|'amber'|'purple'|'rose'|'gray';
  icon?: React.ElementType;
}) {
  const cls = {
    blue:    'bg-blue-50    border-blue-200    text-blue-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    amber:   'bg-amber-50   border-amber-200   text-amber-700',
    purple:  'bg-purple-50  border-purple-200  text-purple-700',
    rose:    'bg-rose-50    border-rose-200    text-rose-700',
    gray:    'bg-gray-50    border-gray-200    text-gray-700',
  }[color];
  return (
    <div className={`rounded-xl border p-3 shadow-sm ${cls}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium opacity-75">{label}</span>
        {Icon && <Icon size={14} className="opacity-60"/>}
      </div>
      <div className="text-xl font-bold">{value}</div>
      {sub && <div className="text-[10px] opacity-70 mt-0.5">{sub}</div>}
    </div>
  );
}

// ─── Filter Pill ──────────────────────────────────────────────────────────────
function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
        active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
      }`}>
      {label}
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ProjectDashboardTab() {
  // Read-only financial parameters (UI disabled)
  const [hourlyRate]    = useState(250);
  const [profitPercent] = useState(20);
  const [filterStatus,   setFilterStatus]   = useState<StatusType[]>([]);
  const [filterPriority, setFilterPriority] = useState<PriorityType[]>([]);
  const [filterEmployee, setFilterEmployee] = useState<string[]>([]);
  const [filterTopic,    setFilterTopic]    = useState<string[]>([]);
  const [showFilters,    setShowFilters]    = useState(false);

  const toggleFilter = <T,>(arr: T[], set: (v: T[]) => void, val: T) =>
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);

  const activeFilterCount = filterStatus.length + filterPriority.length + filterEmployee.length + filterTopic.length;
  const clearFilters = () => { setFilterStatus([]); setFilterPriority([]); setFilterEmployee([]); setFilterTopic([]); };

  const tasks = useMemo(() => ALL_TASKS.filter(t =>
    (filterStatus.length   === 0 || filterStatus.includes(t.status))    &&
    (filterPriority.length === 0 || filterPriority.includes(t.priority)) &&
    (filterEmployee.length === 0 || filterEmployee.includes(t.employee)) &&
    (filterTopic.length    === 0 || filterTopic.includes(t.topic))
  ), [filterStatus, filterPriority, filterEmployee, filterTopic]);

  // ── Financial ──────────────────────────────────────────────────────────────
  const totalWorkHours = tasks.reduce((s, t) => s + t.hours, 0);
  const workCost       = totalWorkHours * hourlyRate;
  const expectedProfit = Math.round(SUBCONTRACT_FEE * profitPercent / 100);

  // ── Hours ──────────────────────────────────────────────────────────────────
  const remainingHours = BUDGETED_HOURS - REPORTED_HOURS;
  const budgetUsedPct  = Math.min(100, Math.round(REPORTED_HOURS / BUDGETED_HOURS * 100));

  // ── Tasks ──────────────────────────────────────────────────────────────────
  const closedTasks    = tasks.filter(t => t.status === 'הושלם' || t.status === 'בהמתנה').length;
  const completedTasks = tasks.filter(t => t.status === 'הושלם').length;
  const completedPct   = tasks.length > 0 ? Math.round(completedTasks / tasks.length * 100) : 0;
  const avgProgress    = tasks.length > 0 ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / tasks.length) : 0;

  // ── Charts ─────────────────────────────────────────────────────────────────
  const statusTypes: StatusType[]     = ['תכנון','בביצוע','בהמתנה','הושלם'];
  const statusColors                  = ['#fb923c','#fbbf24','#10b981','#3b82f6'];
  const statusData = statusTypes.map((s, i) => ({ label: s, value: tasks.filter(t => t.status === s).length, color: statusColors[i] })).filter(d => d.value > 0);

  const priorityTypes: PriorityType[] = ['גבוהה','בינונית','נמוכה'];
  const priorityColors                = ['#1e40af','#0891b2','#06b6d4'];
  const priorityData = priorityTypes.map((p, i) => ({ label: p, value: tasks.filter(t => t.priority === p).length, color: priorityColors[i] })).filter(d => d.value > 0);

  const empBars = EMPLOYEES.map((e, i) => ({
    label: e, value: tasks.filter(t => t.employee === e).length,
    color: ['#14b8a6','#2563eb','#7c3aed','#6d28d9'][i],
  }));
  const maxEmp = Math.max(...empBars.map(b => b.value), 1);

  const topicProgress = TOPICS.map(topic => {
    const tt = tasks.filter(t => t.topic === topic);
    return { name: topic, progress: tt.length > 0 ? Math.round(tt.reduce((s, t) => s + t.progress, 0) / tt.length) : 0, count: tt.length };
  }).filter(t => t.count > 0);

  const topicHours = TOPICS.map((topic, i) => ({
    label: topic.length > 8 ? topic.slice(0, 8) + '…' : topic,
    value: tasks.filter(t => t.topic === topic).reduce((s, t) => s + t.hours, 0),
    color: ['#0d9488','#1d4ed8','#6d28d9','#7c3aed','#2563eb','#0891b2'][i % 6],
  })).filter(b => b.value > 0);
  const maxTopicHours = Math.max(...topicHours.map(b => b.value), 1);

  return (
    <div className="space-y-4" dir="rtl">

      {/* ══ 1. FINANCIAL CONTROLS ════════════════════════════════════════════ */}
      <div className="bg-white border-2 border-amber-200 rounded-xl px-5 py-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-amber-500"/>
          <span className="font-bold text-gray-700 text-sm">פרמטרים פיננסיים</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* עלות שעות עבודה */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Clock size={13} className="text-blue-500"/>
              <span className="text-xs font-semibold text-blue-700">עלות שעות עבודה</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <input type="range" min={0} max={2000} step={10} value={hourlyRate}
                onChange={() => {}}
                disabled
                className="flex-1 h-1.5 accent-blue-500 cursor-not-allowed opacity-60"/>
              <div className="relative w-20">
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">₪</span>
                <input
                  type="number"
                  min={0}
                  max={2000}
                  step={10}
                  value={hourlyRate}
                  readOnly
                  className="w-full pr-5 pl-1 py-1 border border-blue-300 rounded-lg text-xs font-bold text-center bg-gray-50 focus:ring-0"
                />
              </div>
            </div>
            <div className="text-lg font-bold text-blue-800">₪{workCost.toLocaleString()}</div>
            <div className="text-[10px] text-blue-500">{totalWorkHours} שעות × ₪{hourlyRate}</div>
          </div>

          {/* אחוז רווח */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Percent size={13} className="text-purple-500"/>
              <span className="text-xs font-semibold text-purple-700">אחוז רווח</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <input type="range" min={0} max={100} step={1} value={profitPercent}
                onChange={() => {}}
                disabled
                className="flex-1 h-1.5 accent-purple-500 cursor-not-allowed opacity-60"/>
              <div className="relative w-16">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={profitPercent}
                  readOnly
                  className="w-full pr-1 pl-5 py-1 border border-purple-300 rounded-lg text-xs font-bold text-center bg-gray-50 focus:ring-0"
                />
                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">%</span>
              </div>
            </div>
            <div className="text-lg font-bold text-purple-800">{profitPercent}%</div>
            <div className="text-[10px] text-purple-500">מתוך שכ"ט תתי חוזים</div>
          </div>

          {/* שכ"ט לתתי חוזים — קריאה בלבד */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <BarChart2 size={13} className="text-gray-500"/>
              <span className="text-xs font-semibold text-gray-600">שכ"ט לתתי חוזים</span>
              <span className="text-[9px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded font-bold mr-auto">קבוע</span>
            </div>
            <div className="text-lg font-bold text-gray-700">₪{SUBCONTRACT_FEE.toLocaleString()}</div>
            <div className="text-[10px] text-gray-400 mt-1">לא ניתן לשינוי</div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
              <div className="bg-gray-400 h-1.5 rounded-full w-full"/>
            </div>
          </div>

          {/* רווח צפוי */}
          <div className={`rounded-xl p-3 border ${
            profitPercent >= 20 ? 'bg-emerald-50 border-emerald-200'
            : profitPercent >= 10 ? 'bg-amber-50 border-amber-200'
            : 'bg-rose-50 border-rose-200'
          }`}>
            <div className="flex items-center gap-1.5 mb-2">
              <Target size={13} className={profitPercent >= 20 ? 'text-emerald-500' : profitPercent >= 10 ? 'text-amber-500' : 'text-rose-500'}/>
              <span className={`text-xs font-semibold ${profitPercent >= 20 ? 'text-emerald-700' : profitPercent >= 10 ? 'text-amber-700' : 'text-rose-700'}`}>
                רווח צפוי
              </span>
            </div>
            <div className={`text-2xl font-bold ${profitPercent >= 20 ? 'text-emerald-800' : profitPercent >= 10 ? 'text-amber-800' : 'text-rose-800'}`}>
              ₪{expectedProfit.toLocaleString()}
            </div>
            <div className={`text-[10px] mt-0.5 ${profitPercent >= 20 ? 'text-emerald-600' : profitPercent >= 10 ? 'text-amber-600' : 'text-rose-600'}`}>
              {profitPercent}% × ₪{SUBCONTRACT_FEE.toLocaleString()}
            </div>
            <div className={`text-[10px] font-bold mt-0.5 ${profitPercent >= 20 ? 'text-emerald-700' : profitPercent >= 10 ? 'text-amber-700' : 'text-rose-700'}`}>
              {profitPercent >= 20 ? '✓ תקין' : profitPercent >= 10 ? '⚠ נמוך' : '✗ נמוך מאוד'}
            </div>
          </div>
        </div>
      </div>

      {/* ══ 2. FILTER BAR ════════════════════════════════════════════════════ */}
      <div className="bg-white border border-gray-200 rounded-xl px-5 py-3 shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-semibold transition-all ${
              showFilters || activeFilterCount > 0
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-gray-300 text-gray-600 hover:border-indigo-300'
            }`}>
            <Filter size={15}/>סינון
            {activeFilterCount > 0 && (
              <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>
            )}
            <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`}/>
          </button>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-semibold">
              <X size={13}/> נקה הכל
            </button>
          )}
          <span className="text-xs text-gray-400 mr-auto">מציג {tasks.length} מתוך {ALL_TASKS.length} משימות</span>
        </div>
        {showFilters && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-gray-100">
            <div>
              <div className="text-xs font-bold text-gray-500 mb-2">סטטוס</div>
              <div className="flex flex-wrap gap-1.5">
                {statusTypes.map(s => <FilterPill key={s} label={s} active={filterStatus.includes(s)} onClick={() => toggleFilter(filterStatus, setFilterStatus, s)}/>)}
              </div>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-500 mb-2">עדיפות</div>
              <div className="flex flex-wrap gap-1.5">
                {priorityTypes.map(p => <FilterPill key={p} label={p} active={filterPriority.includes(p)} onClick={() => toggleFilter(filterPriority, setFilterPriority, p)}/>)}
              </div>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-500 mb-2">עובד</div>
              <div className="flex flex-wrap gap-1.5">
                {EMPLOYEES.map(e => <FilterPill key={e} label={e} active={filterEmployee.includes(e)} onClick={() => toggleFilter(filterEmployee, setFilterEmployee, e)}/>)}
              </div>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-500 mb-2">נושא תכנון</div>
              <div className="flex flex-wrap gap-1.5">
                {TOPICS.map(t => <FilterPill key={t} label={t.length > 10 ? t.slice(0,10)+'…' : t} active={filterTopic.includes(t)} onClick={() => toggleFilter(filterTopic, setFilterTopic, t)}/>)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══ 3. HOURS ROW ═════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="שעות מתוקצבות" value={BUDGETED_HOURS.toString()} color="blue"   icon={Clock}/>
        <KpiCard label="שעות מדווחות"  value={REPORTED_HOURS.toString()}  color="purple" icon={Clock}/>
        <KpiCard label="יתרת שעות"     value={remainingHours.toString()}
          color={remainingHours >= 0 ? 'emerald' : 'rose'}
          sub={remainingHours < 0 ? '⚠ חריגה מהתקציב' : undefined}
          icon={Clock}
        />
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-600">ניצול שעות</span>
            <span className="text-xs font-bold text-gray-700">{budgetUsedPct}%</span>
          </div>
          <div className="text-xl font-bold text-gray-800 mb-2">{REPORTED_HOURS}/{BUDGETED_HOURS}</div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div className={`h-3 rounded-full transition-all duration-500 ${budgetUsedPct > 90 ? 'bg-rose-500' : budgetUsedPct > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.max(budgetUsedPct, 3)}%` }}/>
          </div>
        </div>
      </div>

      {/* ══ 4. TASKS ROW ═════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="מספר משימות כולל"    value={tasks.length.toString()}   color="blue"    icon={ListTodo}/>
        <KpiCard label="משימות סגורות"        value={closedTasks.toString()}    color="gray"    icon={CheckCircle}/>
        <KpiCard label="משימות שהושלמו"       value={completedTasks.toString()} color="emerald" icon={CheckCircle}/>
        <KpiCard label="אחוז משימות שהושלמו"  value={`${completedPct}%`}
          color={completedPct >= 70 ? 'emerald' : completedPct >= 40 ? 'amber' : 'rose'}
          sub={`ממוצע התקדמות: ${avgProgress}%`}
          icon={Target}
        />
      </div>

      {/* ══ 5. CHARTS ════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-700 mb-4">סטטוס משימות</h3>
          {tasks.length > 0 ? <DonutChart data={statusData} total={tasks.length}/> : <div className="h-32 flex items-center justify-center text-gray-400 text-sm">אין נתונים</div>}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-700 mb-4">עדיפויות</h3>
          {tasks.length > 0 ? <DonutChart data={priorityData} total={tasks.length}/> : <div className="h-32 flex items-center justify-center text-gray-400 text-sm">אין נתונים</div>}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-700 mb-2">משימות לעובד</h3>
          {tasks.length > 0 ? <BarChart bars={empBars} maxVal={maxEmp}/> : <div className="h-36 flex items-center justify-center text-gray-400 text-sm">אין נתונים</div>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                    <div className="h-3 bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${t.progress}%` }}/>
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="h-32 flex items-center justify-center text-gray-400 text-sm">אין נתונים</div>}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-700 mb-2">שעות לנושא תכנון</h3>
          {topicHours.length > 0 ? <BarChart bars={topicHours} maxVal={maxTopicHours}/> : <div className="h-36 flex items-center justify-center text-gray-400 text-sm">אין נתונים</div>}
        </div>
      </div>

    </div>
  );
}