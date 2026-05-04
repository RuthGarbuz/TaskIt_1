import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import type { Task } from '../../types';
import type { EmployeeLink, SystemTable, TaskCardSaveOptions, TaskReview } from '../../Data/projectsData';
import TaskCard from './TaskCard';

interface GanttChartProps {
  tasks: Array< TaskReview>;
  timeframe: 'weekly' | 'monthly';
  currentView?: 'allTasks' | 'myTasks';
  statuses: SystemTable[];
  priorities: SystemTable[];
  onUpdate: (updatedTask: TaskReview, employeeLinks: EmployeeLink[], options?: TaskCardSaveOptions) => void;
    viewMode: 'myTasks' | 'allTasks';
 // onTaskUpdate?: (updatedTask: TaskReview) => void;
  //nTasksUpdate?: (tasks: TaskReview[]) => void;
}

// colors are provided via `statuses: SystemTable[]` and `priorities: SystemTable[]`



// 10 צבעים ייחודיים לעובדים
const EMPLOYEE_COLOR_LIST = [
  { bg: 'bg-pink-500',    hex: '#ec4899', name: '' },
  { bg: 'bg-violet-500',  hex: '#8b5cf6', name: '' },
  { bg: 'bg-cyan-500',    hex: '#06b6d4', name: '' },
  { bg: 'bg-amber-500',   hex: '#f59e0b', name: '' },
  { bg: 'bg-lime-500',    hex: '#84cc16', name: '' },
  { bg: 'bg-rose-500',    hex: '#f43f5e', name: '' },
  { bg: 'bg-indigo-500',  hex: '#6366f1', name: '' },
  { bg: 'bg-teal-500',    hex: '#14b8a6', name: '' },
  { bg: 'bg-orange-400',  hex: '#fb923c', name: '' },
  { bg: 'bg-purple-500',  hex: '#a855f7', name: '' },
];

export default function GanttChart({
  tasks,
  timeframe,
  currentView = 'myTasks',
  statuses,
  priorities,
  onUpdate,
  
}: GanttChartProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [colorBy, setColorBy] = useState<'status' | 'urgency' | 'employee'>('urgency');
  const [selectedTask, setSelectedTask] = useState<TaskReview | null>(null);

  const taskCardStepContext = useMemo(() => {
    if (!selectedTask || selectedTask.isPlanningSte) {
      return { planStepListTask: undefined as TaskReview | undefined, tasksInSameStep: undefined as TaskReview[] | undefined };
    }
    const step = tasks.find(t => t.isPlanningSte && t.id === selectedTask.planningStepID);
    if (!step) {
      return { planStepListTask: undefined as TaskReview | undefined, tasksInSameStep: undefined as TaskReview[] | undefined };
    }
    const same = tasks.filter(t => !t.isPlanningSte && t.planningStepID === selectedTask.planningStepID);
    return { planStepListTask: step, tasksInSameStep: same };
  }, [selectedTask, tasks]);

  // בנה מפת עובד → צבע
  const getReceivers = (task: Task | TaskReview) =>
    'receivers' in task ? (task.receivers ?? []) : ( []);



  const getStatusKey = (task: Task | TaskReview) => {
    if ('status' in task) return task.status;
    const value = task.statusName?.toLowerCase() ?? '';
    if (value.includes('done') || value.includes('הושלם') || value.includes('סגור')) return 'done';
    if (value.includes('progress') || value.includes('בביצוע')) return 'inProgress';
    return 'todo';
  };

  const getHoursEstimate = (task: Task | TaskReview) =>
    'hoursEstimate' in task ? (task.hoursEstimate ?? 0) : ((task as TaskReview).workHours ?? 0);

  const getHoursActual = (task: Task | TaskReview) =>
    'hoursActual' in task ? (task.hoursActual ?? 0) : ((task as TaskReview).hourReport ?? 0);


  const resolveTableColor = (tables: SystemTable[] | undefined, key: number | undefined) => {
    if (!tables || key === undefined) return null;
    const found=tables.find(t => t.id === key);
    if (!found || !found.color) return null;
    const c = found.color;
    if (c.startsWith('bg-')) return { className: c, style: undefined } as const;
    return { className: undefined, style: { backgroundColor: c } } as const;
  };

  const employeeColorMap = useMemo(() => {
    const allEmployees = Array.from(
      new Set(tasks.flatMap(t => getReceivers(t)))
    ).sort();
    const map: Record<string, { bg: string; hex: string }> = {};
    allEmployees.forEach((emp, i) => {
      map[emp] = EMPLOYEE_COLOR_LIST[i % EMPLOYEE_COLOR_LIST.length];
    });
    return map;
  }, [tasks]);

  // כשפותחים מ-allTasks — ברירת מחדל צבע לפי עובד
  useMemo(() => {
    if (currentView === 'allTasks') setColorBy('employee');
  }, [currentView]);

  const goToPrevious = () => {
    const d = new Date(currentDate);
    if (timeframe === 'weekly') d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const goToNext = () => {
    const d = new Date(currentDate);
    if (timeframe === 'weekly') d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const goToToday = () => setCurrentDate(new Date());

  const getDateRangeText = () => {
    if (timeframe === 'weekly') {
      const ws = new Date(currentDate);
      ws.setDate(currentDate.getDate() - currentDate.getDay());
      const we = new Date(ws);
      we.setDate(ws.getDate() + 4);
      return `${ws.toLocaleDateString('he-IL', { month: 'short', day: 'numeric' })} - ${we.toLocaleDateString('he-IL', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return currentDate.toLocaleDateString('he-IL', { year: 'numeric', month: 'long' });
  };

  const timeSlots = useMemo(() => {
    if (timeframe === 'weekly') {
      const ws = new Date(currentDate);
      ws.setDate(currentDate.getDate() - currentDate.getDay());
      return Array.from({ length: 5 }, (_, i) => {
        const day = new Date(ws);
        day.setDate(ws.getDate() + i);
        return {
          label: day.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'short' }),
          date: day,
        };
      });
    }
    const ms = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    return Array.from({ length: 4 }, (_, i) => {
      const ws = new Date(ms);
      ws.setDate(ms.getDate() + i * 7);
      const we = new Date(ws);
      we.setDate(ws.getDate() + 6);
      return {
        label: `${ws.getDate()}/${ws.getMonth() + 1} - ${we.getDate()}/${we.getMonth() + 1}`,
        date: ws,
      };
    });
  }, [currentDate, timeframe]);

  const getVisibleRange = () => {
    if (timeframe === 'weekly') {
      const ws = new Date(currentDate);
      ws.setDate(currentDate.getDate() - currentDate.getDay());
      const start = new Date(ws.getFullYear(), ws.getMonth(), ws.getDate());
      const end = new Date(start);
      end.setDate(start.getDate() + 4);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    const ms = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const start = new Date(ms.getFullYear(), ms.getMonth(), ms.getDate());
    const end = new Date(start);
    end.setDate(start.getDate() + (4 * 7 - 1));
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };

  const getTaskPosition = (task: Task | TaskReview) => {
    const { start: rangeStart, end: rangeEnd } = getVisibleRange();
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

    const normalizedRangeStart = startOfDay(rangeStart);
    const normalizedRangeEnd = endOfDay(rangeEnd);
    const sdRaw = (task as any).startDate ?? (task as any).start;
    const edRaw = (task as any).endDate ?? (task as any).end;
    const startDate = sdRaw ? new Date(sdRaw) : null;
    const endDate = edRaw ? new Date(edRaw) : null;
    let s = startOfDay(startDate ?? new Date((task as any).start || Date.now()));
    let e = endOfDay(endDate ?? new Date((task as any).end || s));
    if (e.getTime() < s.getTime()) {
      const tmp = s;
      s = e;
      e = tmp;
    }
    if (!isFinite(normalizedRangeStart.getTime()) || !isFinite(normalizedRangeEnd.getTime())) return { display: 'none' } as React.CSSProperties;
    if (e.getTime() < normalizedRangeStart.getTime() || s.getTime() > normalizedRangeEnd.getTime()) {
      return { display: 'none' } as React.CSSProperties;
    }
    const clampedStart = new Date(Math.max(s.getTime(), normalizedRangeStart.getTime()));
    const clampedEnd = new Date(Math.min(e.getTime(), normalizedRangeEnd.getTime()));
    const total = normalizedRangeEnd.getTime() - normalizedRangeStart.getTime();
    if (!isFinite(total) || total <= 0) return { display: 'none' } as React.CSSProperties;
    let leftPct = ((clampedStart.getTime() - normalizedRangeStart.getTime()) / total) * 100;
    if (!Number.isFinite(leftPct)) leftPct = 0;
    const widthPct = ((clampedEnd.getTime() - clampedStart.getTime()) / total) * 100;
    return { left: `${leftPct}%`, width: `${Math.max(widthPct, 2)}%`, minWidth: '24px' } as React.CSSProperties;
  };

  const getTaskBarColor = (task:  TaskReview) => {
    if (colorBy === 'employee') {
      const firstReceiver = getReceivers(task)[0];
      if (firstReceiver && employeeColorMap[firstReceiver]) {
        return { className: employeeColorMap[firstReceiver].bg, style: undefined } as const;
      }
      return { className: 'bg-gray-400', style: undefined } as const;
    }
    if (colorBy === 'urgency') {
      const urgenyId=task.urgencyID;
      const resolved = resolveTableColor(priorities, urgenyId);

      // const urgencyKey = getUrgencyKey(task) as string | undefined;
      // const resolved = resolveTableColor(priorities, urgencyKey);
      if (resolved) return resolved;
      return { className: 'bg-gray-400', style: undefined } as const;
    }
    
 //   const statusKey = getStatusKey(task) as string | undefined;
    const resolved = resolveTableColor(statuses, task.statuID);
    if (resolved) return resolved;
    return { className: 'bg-gray-400', style: undefined } as const;
  };

  const getUtilizationColor = (pct: number) => {
    if (pct >= 80) return 'text-emerald-600';
    if (pct >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const calculateSlotUtilization = () => {
    const total = tasks.reduce((s, t) => s + getHoursEstimate(t), 0);
    const avg = total / timeSlots.length;
    return Math.min(Math.round((avg / 8) * 100), 100);
  };

  const visibleTasks = useMemo(() => {
    return tasks.filter(task => {
      const pos = getTaskPosition(task);
      return (pos as any).display !== 'none';
    });
  }, [tasks, currentDate, timeframe]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

      {/* Navigation Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={goToPrevious} className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-all">
              <ChevronRight size={20} className="text-white" />
            </button>
            <div className="text-center">
              <h3 className="text-white font-bold text-xl">{getDateRangeText()}</h3>
              <p className="text-emerald-100 text-sm">{timeframe === 'weekly' ? 'תצוגה שבועית' : 'תצוגה חודשית'}</p>
            </div>
            <button onClick={goToNext} className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-all">
              <ChevronLeft size={20} className="text-white" />
            </button>
          </div>
          <button onClick={goToToday} className="flex items-center gap-2 px-4 py-2 bg-white text-emerald-600 rounded-lg hover:bg-emerald-50 font-semibold transition-all">
            <Calendar size={18} />
            היום
          </button>
        </div>
      </div>

      {/* Gantt Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Time Headers */}
          <div className="border-b-2 border-gray-200">
            <div className="grid" style={{ gridTemplateColumns: `repeat(${timeSlots.length}, 1fr)` }}>
              {timeSlots.map((slot, i) => (
                <div key={i} className="bg-gray-50 px-2 py-3 border-l border-gray-200 text-center">
                  <div className="text-xs font-bold text-gray-700">{slot.label}</div>
                    <div  className={`text-xs font-semibold mt-1 ${getUtilizationColor(calculateSlotUtilization())} hidden`}>
                    {calculateSlotUtilization()}%
                    </div>
                </div>
              ))}
            </div>
          </div>

          {/* Task Rows */}
          <div className="divide-y divide-gray-200">
            {tasks.length === 0 ? (
              <div className="py-12 text-center text-gray-500">אין משימות להצגה</div>
            ) : (
              tasks.map((task) => (
                
                <div key={task.id} onClick={() => setSelectedTask(task)} className="hover:bg-blue-50 transition-colors cursor-pointer">
                  <div className="relative py-3 px-2">
                    {/* <div>{`${task.projectName} - ${task.name}\n${task.workHours}h`}</div> */}
                    <div className="grid h-full" style={{ gridTemplateColumns: `repeat(${timeSlots.length}, 1fr)` }}>
                      {timeSlots.map((_, i) => <div key={i} className="border-l border-gray-100" />)}
                    </div>
                    <div className="absolute top-0 left-0 right-0 bottom-0 px-2 py-3 pointer-events-none">
                      <div className=" h-full">
                        {
                          (() => {
                            const bar = getTaskBarColor(task);
                              const pos = getTaskPosition(task);
                              return (
                                <div
                                  className={`absolute top-0 h-full ${bar.className ?? ''} rounded-full shadow-md flex items-center px-3 hover:shadow-lg transition-all`}
                                  style={{ ...(pos ?? {}), ...(bar.style ?? {}) }}
                                  title={`${task.projectName} - ${task.subject}\n${getHoursEstimate(task)}h`}
                                >
                                <span className="text-gray text-xs font-semibold truncate">
                                  {task.projectName} - {task.subject}
                                </span>
                              </div>
                            );
                          })()
                        }
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {selectedTask && (
        <TaskCard
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={(updatedTask, employeeLinks, options) => {
            if (onUpdate) onUpdate(updatedTask, employeeLinks, options);
            setSelectedTask(null);
          }}
          viewMode={currentView}
          statuses={statuses}
          priorities={priorities}
          planStepListTask={taskCardStepContext.planStepListTask}
          tasksInSameStep={taskCardStepContext.tasksInSameStep}
        />
      )}

      {/* Legend + Toggle */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">צבע לפי:</span>
            <div className="flex items-center gap-1 bg-gray-200 rounded-lg p-1">
              <button
                onClick={() =>{console.log('tasks', tasks); setColorBy('urgency')} }
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${colorBy === 'urgency' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600'}`}
              >
                עדיפות
              </button>
              <button
                onClick={() => setColorBy('status')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${colorBy === 'status' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600'}`}
              >
                סטטוס
              </button>
              {currentView === 'allTasks' && (
                <button
                  onClick={() => setColorBy('employee')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${colorBy === 'employee' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600'}`}
                >
                  עובד
                </button>
              )}
            </div>
          </div>

          {/* Legend items */}
          <div className="flex items-center gap-4 flex-wrap text-sm">
            {colorBy === 'urgency' && priorities.map((p) => (
              <div key={p.id} className="flex items-center gap-1.5">
                {p.color && p.color.startsWith('bg-') ? (
                  <div className={`w-3 h-3 ${p.color} rounded`} />
                ) : (
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: p.color }} />
                )}
                <span className="text-gray-600 text-xs">{p.name}</span>
              </div>
            ))}
            {colorBy === 'status' && statuses.map((s) => (
              <div key={s.id} className="flex items-center gap-1.5">
                {s.color && s.color.startsWith('bg-') ? (
                  <div className={`w-3 h-3 ${s.color} rounded`} />
                ) : (
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: s.color }} />
                )}
                <span className="text-gray-600 text-xs">{s.name}</span>
              </div>
            ))}
            {colorBy === 'employee' && Object.entries(employeeColorMap).map(([emp, color]) => (
              <div key={emp} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 ${color.bg} rounded`} />
                <span className="text-gray-600 text-xs">{emp}</span>
              </div>
            ))}
          </div>

          <div className=" items-center gap-4 text-sm hidden">
            <span className="font-semibold text-gray-700">ניצול:</span>
            <span className="text-emerald-600 font-semibold">≥80%</span>
            <span className="text-yellow-600 font-semibold">50-79%</span>
            <span className="text-red-600 font-semibold">&lt;50%</span>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-t border-gray-200">
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{visibleTasks.length}</div>
            <div className="text-xs text-gray-600">משימות</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-600">{visibleTasks.reduce((s, t) => s + getHoursEstimate(t), 0)}</div>
            <div className="text-xs text-gray-600">שעות מתוכננות</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{visibleTasks.reduce((s, t) => s + getHoursActual(t), 0)}</div>
            <div className="text-xs text-gray-600">שעות בפועל</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{visibleTasks.filter(t => getStatusKey(t) === 'done').length}</div>
            <div className="text-xs text-gray-600">הושלמו</div>
          </div>
        </div>
      </div>
    </div>
  );
}