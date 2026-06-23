import { useState, useCallback, useMemo, useRef, useEffect, Fragment } from 'react';
import { SlidersHorizontal, CalendarDays, ChevronLeft, ChevronRight, Search } from 'lucide-react';


import { GanttFilterModal, getDefaultGanttFilters } from './GanttFilterModal';
import { usePersistedGanttFilters } from '../../hooks/usePersistedGanttFilters';
import styles from './GanttSteps.module.css';
import { StepEditModal, type EditablePhase, type StepEditSaveOptions } from './StepEditModal';
import type { GanttFilters, Phase, Project, ViewMode } from './types.ts';
import { COL_WIDTHS, formatShortDate, getMonths, getQuarters, getRangeEnd, getRangeStart, isTodayInRange, STATUS_BG, STATUS_COLOR, STATUS_TEXT, todayPct } from './utils.ts';
import { getTaskStatuses } from '../../services/taskService';
import { getTaskPriorities } from '../../services/settingService';
import type { EmployeeLink, PlanningStep } from '../../Data/projectsData';
import LinkEmployeesToStageModal from '../shared/LinkEmployeesToStageModal';
import {
  ganttFiltersToQuery,
  ganttStepsToProjects,
  getGanttSteps,
  getPlanningStepData,
  saveGanttStep,
} from '../../services/ganttService';
import { updateTaskAsync } from '../../services/taskService';
import type { SystemTable } from '../../Data/projectsData';

/** Client-only filters (date / closed / urgency) — rest sent to server on fetch. */
function phaseMatchesClientFilters(ph: Phase, f: GanttFilters): boolean {
  if (f.closedTasks === 'yes') {
    if (ph.status !== 'הושלם') return false;
  } else if (f.closedTasks === 'no') {
    if (ph.status === 'הושלם') return false;
  }

  const fromBound = f.dateFrom || '1970-01-01';
  const toBound = f.dateTo || '2099-12-31';
  if (ph.end < fromBound || ph.start > toBound) return false;

  if (f.urgency.length > 0) {
    if (ph.urgencyId == null || !f.urgency.includes(ph.urgencyId)) return false;
  }

  return true;
}

/** Lowercase and strip spaces / hyphens / underscores so e.g. "nataly 900" matches "nataly-900". */
function normalizeGanttSearchKey(s: string): string {
  return s.trim().toLowerCase().replace(/[-_\s]+/g, '');
}

interface GanttStepsProps {
  onPhaseUpdate?: (projectId: number, updatedPhase: EditablePhase) => void;
}

function GridLines({ numCols }: { numCols: number }) {
  return (
    <>
      {Array.from({ length: numCols }).map((_, i) => (
        <div key={i} className={styles.gridV}
          style={{
            right: `${((i / numCols) * 100).toFixed(2)}%`,
            width: `${((1 / numCols) * 100).toFixed(2)}%`,
          }}
        />
      ))}
    </>
  );
}

function TodayLine({ pct, visible }: { pct: number; visible: boolean }) {
  if (!visible) return null;
  return <div className={styles.todayLine} style={{ right: `${pct.toFixed(2)}%` }} />;
}

function calcDuration(start: string, end: string): number {
  if (!start || !end) return 1;
  return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1);
}

const WORK_HOURS_PER_DAY = 8;

export function GanttSteps({ onPhaseUpdate }: GanttStepsProps) {
  const [viewMode, setViewMode]       = useState<ViewMode>('month');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editPhase, setEditPhase]     = useState<{
    projectId: number;
    projectName: string;
    phase: EditablePhase | null;
    isFirstStep: boolean;
    loading: boolean;
    loadError: string | null;
  } | null>(null);
  const [offset, setOffset]           = useState(0);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusTables, setStatusTables] = useState<SystemTable[]>([]);
  const [urgencyTables, setUrgencyTables] = useState<SystemTable[]>([]);
  const [empModal, setEmpModal] = useState<{ type: 'step' | 'task'; stepId: number; taskId?: number } | null>(null);
  const [empWarn, setEmpWarn] = useState<string | null>(null);
  const [stepSaving, setStepSaving] = useState(false);
  const [stepSaveError, setStepSaveError] = useState<string | null>(null);
  const [appliedFilters, setAppliedFilters] = usePersistedGanttFilters(
    'taskit.ganttFilters.steps',
    getDefaultGanttFilters
  );
  const defaultFiltersRef = useRef(getDefaultGanttFilters());
  const ganttWrapRef = useRef<HTMLDivElement>(null);
  const [ganttSearchQuery, setGanttSearchQuery] = useState('');

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const [taskStatuses, priorities] = await Promise.all([
          getTaskStatuses(),
          getTaskPriorities(),
        ]);
        if (!isMounted) return;
        setStatusTables((taskStatuses ?? []).filter(Boolean));
        setUrgencyTables((priorities ?? []).filter(Boolean));
      } catch {
        if (!isMounted) return;
        setStatusTables([]);
        setUrgencyTables([]);
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadSteps = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const rows = await getGanttSteps(ganttFiltersToQuery(appliedFilters));
        if (!isMounted) return;
        setProjects(ganttStepsToProjects(rows));
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to load gantt steps:', err);
        setProjects([]);
        setLoadError('שגיאה בטעינת נתוני הגאנט');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadSteps();
    return () => {
      isMounted = false;
    };
  }, [appliedFilters]);

  const statusColorMaps = useMemo(() => {
    const colorByName: Record<string, string | undefined> = {};
    statusTables.forEach(s => {
      colorByName[s.name] = s.color;
    });

    const hex = (c: string | undefined) => (c && /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(c) ? c : undefined);
    const parse = (h: string) => {
      const v = h.length === 4
        ? [h[1] + h[1], h[2] + h[2], h[3] + h[3]]
        : [h.slice(1, 3), h.slice(3, 5), h.slice(5, 7)];
      return v.map(x => parseInt(x, 16)) as [number, number, number];
    };
    const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
    const mix = (a: number, b: number, t: number) => a + (b - a) * t;
    const toHex = (n: number) => clamp(n).toString(16).padStart(2, '0');
    const lighten = (h: string, t: number) => {
      const [r, g, b] = parse(h);
      const rr = mix(r, 255, t), gg = mix(g, 255, t), bb = mix(b, 255, t);
      return `#${toHex(rr)}${toHex(gg)}${toHex(bb)}`;
    };
    const darken = (h: string, t: number) => {
      const [r, g, b] = parse(h);
      const rr = mix(r, 0, t), gg = mix(g, 0, t), bb = mix(b, 0, t);
      return `#${toHex(rr)}${toHex(gg)}${toHex(bb)}`;
    };

    const barColor = (status: string) => {
      const c = hex(colorByName[status]);
      return c ?? STATUS_COLOR[status] ?? '#888780';
    };
    const pillBg = (status: string) => {
      const c = hex(colorByName[status]);
      return c ? lighten(c, 0.82) : (STATUS_BG[status] ?? '#F1EFE8');
    };
    const pillText = (status: string) => {
      const c = hex(colorByName[status]);
      return c ? darken(c, 0.25) : (STATUS_TEXT[status] ?? '#5F5E5A');
    };

    return { barColor, pillBg, pillText };
  }, [statusTables]);

  const { rangeStart, rangeEnd } = useMemo(() => {
    const allStarts = projects.flatMap(p => p.phases.map(ph => new Date(ph.start)));
    const allEnds   = projects.flatMap(p => p.phases.map(ph => new Date(ph.end)));
    if (allStarts.length === 0) {
      const today = new Date();
      return {
        rangeStart: new Date(today.getFullYear(), today.getMonth(), 1),
        rangeEnd: new Date(today.getFullYear(), today.getMonth() + 6, 1),
      };
    }
    return { rangeStart: getRangeStart(allStarts), rangeEnd: getRangeEnd(allEnds) };
  }, [projects]);

  const { viewStart, viewEnd } = useMemo(() => {
    const step = viewMode === 'month' ? 1 : 3;
    const vs = new Date(rangeStart); vs.setMonth(vs.getMonth() + offset * step);
    const ve = new Date(rangeEnd);   ve.setMonth(ve.getMonth() + offset * step);
    return { viewStart: vs, viewEnd: ve };
  }, [rangeStart, rangeEnd, offset, viewMode]);

  const viewTotalMs = viewEnd.getTime() - viewStart.getTime();
  const vPct   = (ds: string) => Math.max(0, Math.min(100, ((new Date(ds).getTime() - viewStart.getTime()) / viewTotalMs) * 100));
  const vWidth = (s: string, e: string) => vPct(e) - vPct(s);

  const cols    = useMemo(() => viewMode === 'month' ? getMonths(viewStart, viewEnd) : getQuarters(viewStart, viewEnd), [viewMode, viewStart, viewEnd]);
  const numCols = cols.length;
  const colW    = COL_WIDTHS[viewMode];
  const todayPctVal = todayPct(viewStart, viewTotalMs);
  const todayVis    = isTodayInRange(viewStart, viewEnd);

  const viewLabel = useMemo(() => {
    if (!cols.length) return '';
    const first = cols[0], last = cols[cols.length - 1];
    if (viewMode === 'month') {
      return first.getFullYear() === last.getFullYear()
        ? `${first.toLocaleDateString('he-IL', { month: 'long' })} – ${last.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}`
        : `${first.toLocaleDateString('he-IL', { month: 'short', year: 'numeric' })} – ${last.toLocaleDateString('he-IL', { month: 'short', year: 'numeric' })}`;
    }
    const q1 = Math.floor(first.getMonth() / 3) + 1;
    const q2 = Math.floor(last.getMonth() / 3) + 1;
    return first.getFullYear() === last.getFullYear()
      ? `Q${q1} – Q${q2} ${first.getFullYear()}`
      : `Q${q1} ${first.getFullYear()} – Q${q2} ${last.getFullYear()}`;
  }, [cols, viewMode]);

  const toggle = useCallback((id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const scrollToday = useCallback(() => {
    const wrap = ganttWrapRef.current; if (!wrap) return;
    wrap.scrollTo({ left: Math.max(0, 220 + (wrap.scrollWidth - 220) * (todayPctVal / 100) - wrap.clientWidth / 2), behavior: 'smooth' });
  }, [todayPctVal]);

  const filteredProjects = useMemo(() => {
    const f = appliedFilters;
    const searchKey = normalizeGanttSearchKey(ganttSearchQuery);
    const nameMatches = (s: string) => {
      if (!searchKey) return true;
      return normalizeGanttSearchKey(s).includes(searchKey);
    };

    let list = projects
      .map(proj => ({
        ...proj,
        phases: proj.phases.filter(ph => phaseMatchesClientFilters(ph, f)),
      }))
      .filter(proj => proj.phases.length > 0);

    if (searchKey) {
      list = list
        .map(proj => {
          const projHit = nameMatches(proj.name);
          const phases = projHit
            ? proj.phases
            : proj.phases.filter(ph => nameMatches(ph.name));
          return { ...proj, phases };
        })
        .filter(proj => proj.phases.length > 0);
    }

    return list;
  }, [projects, appliedFilters, ganttSearchQuery]);

  const activeFilterCount = useMemo(() => {
    const f = appliedFilters;
    const def = defaultFiltersRef.current;
    let c = 0;
    if (f.dateFrom !== def.dateFrom || f.dateTo !== def.dateTo) c++;
    if (f.stepStatusId != null) c++;
    if (f.projectStatusId != null) c++;
    if (f.urgency.length > 0) c++;
    if (f.closedTasks !== 'all') c++;
    if (f.teamLeadId != null) c++;
    if (f.studioDepartmentId != null) c++;
    if (f.projects.length > 0) c++;
    return c;
  }, [appliedFilters]);

  // Stats
  const stats = useMemo(() => {
    const allPhases = filteredProjects.flatMap(p => p.phases);
    return {
      total:    allPhases.length,
      done:     allPhases.filter(ph => ph.status === 'הושלם').length,
      active:   allPhases.filter(ph => ph.status === 'פעיל').length,
      projects: filteredProjects.length,
    };
  }, [filteredProjects]);

  const buildFallbackStep = useCallback((projectId: number, phase: Phase, idx: number, isFirst: boolean): PlanningStep => {
    const defaultStatusId = statusTables.find(s => s.isDefault)?.id ?? statusTables[0]?.id ?? 0;
    const defaultUrgencyId = urgencyTables.find(u => u.isDefault)?.id ?? urgencyTables[0]?.id ?? 0;
    const statusId = phase.statuID ?? statusTables.find(s => s.name === phase.status)?.id ?? defaultStatusId;
    return {
      id: phase.id ?? idx,
      PlanningSubjectID: projectId,
      name: phase.name,
      orderNum: idx + 1,
      percentage: 0,
      workHours: 0,
      workDays: 0,
      duration: calcDuration(phase.start, phase.end),
      dependsOnStepId: isFirst ? null : false,
      employees: [],
      startDate: phase.start,
      endDate: phase.end,
      statusId,
      urgencyId: phase.urgencyId ?? defaultUrgencyId,
      isActive: true,
      isExpanded: true,
      tasks: [],
      attachments:[]
    };
  }, [statusTables, urgencyTables]);

  const openEdit = useCallback((project: Project, phase: Phase, idx: number, isFirst: boolean) => {
      const stepId = phase.id;
      if (!stepId) {
        setEditPhase({
          projectId: project.id,
          projectName: project.name,
          phase: buildFallbackStep(project.id, phase, idx, isFirst),
          isFirstStep: isFirst,
          loading: false,
          loadError: null,
        });
        return;
      }

      setEditPhase({
        projectId: project.id,
        projectName: project.name,
        phase: null,
      isFirstStep: isFirst,
      loading: true,
      loadError: null,
    });
    setStepSaveError(null);

    void (async () => {
      try {
        const loaded = await getPlanningStepData({ stepId });
        if (!loaded) {
          setEditPhase({
            projectId: project.id,
            projectName: project.name,
            phase: buildFallbackStep(project.id, phase, idx, isFirst),
            isFirstStep: isFirst,
            loading: false,
            loadError: 'לא נמצאו נתוני שלב בשרת',
          });
          return;
        }
        setEditPhase({
          projectId: project.id,
          projectName: project.name,
          phase: { ...loaded, isExpanded: true },
          isFirstStep: loaded.orderNum <= 1 || isFirst,
          loading: false,
          loadError: null,
        });
      } catch {
        setEditPhase({
          projectId: project.id,
          projectName: project.name,
          phase: buildFallbackStep(project.id, phase, idx, isFirst),
          isFirstStep: isFirst,
          loading: false,
          loadError: 'שגיאה בטעינת נתוני השלב',
        });
      }
    })();
  }, [buildFallbackStep]);

  const saveStepEmployees = useCallback((
    stepId: number,
    emps: EmployeeLink[],
    scope?: { stageHours: number; hoursPerDay: number },
  ) => {
    const nextStageHours = scope?.stageHours;
    const nextHoursPerDay = scope?.hoursPerDay && scope.hoursPerDay > 0 ? scope.hoursPerDay : WORK_HOURS_PER_DAY;
    setEditPhase(prev => {
      if (!prev?.phase || prev.phase.id !== stepId) return prev;
      let next = { ...prev.phase, employees: emps };
      if (nextStageHours != null && Number.isFinite(nextStageHours)) {
        next = {
          ...next,
          workHours: Math.max(0, nextStageHours),
          workDays: Math.max(0, nextStageHours) / nextHoursPerDay,
        };
      }
      return { ...prev, phase: next };
    });
  }, []);

  const saveTaskEmployees = useCallback((
    stepId: number,
    taskId: number,
    emps: EmployeeLink[],
    scope?: { stageHours: number; hoursPerDay: number },
  ): boolean => {
    const nextTaskHours = scope?.stageHours;
    const nextHoursPerDay = scope?.hoursPerDay && scope.hoursPerDay > 0 ? scope.hoursPerDay : WORK_HOURS_PER_DAY;
    let saved = false;

    setEditPhase(prev => {
      if (!prev?.phase || prev.phase.id !== stepId) return prev;
      const step = prev.phase;
      if (!step.tasks.some(t => t.id === taskId)) return prev;

      if (nextTaskHours != null && Number.isFinite(nextTaskHours)) {
        const otherHours = step.tasks
          .filter(t => t.id !== taskId && !t.isDeleted)
          .reduce((sum, t) => sum + (t.workHours ?? 0), 0);
        if (otherHours + nextTaskHours > step.workHours) {
          setEmpWarn(
            `לא ניתן לעדכן שעות משימה: סה"כ שעות המשימות (${(otherHours + nextTaskHours).toFixed(2)}) גדול משעות השלב (${step.workHours}).`,
          );
          return prev;
        }
      }

      saved = true;
      return {
        ...prev,
        phase: {
          ...step,
          tasks: step.tasks.map(t => {
            if (t.id !== taskId) return t;
            const withEmployees = { ...t, employees: emps };
            if (nextTaskHours == null || !Number.isFinite(nextTaskHours)) return withEmployees;
            return {
              ...withEmployees,
              workHours: Math.max(0, nextTaskHours),
              workDays: Math.max(0, nextTaskHours) / nextHoursPerDay,
              percentage: step.workHours > 0
                ? (Math.max(0, nextTaskHours) / step.workHours) * 100
                : 0,
            };
          }),
        },
      };
    });
    return saved;
  }, []);

  const empModalProps = useMemo(() => {
    if (!empModal || !editPhase?.phase) return null;
    const { type, stepId, taskId } = empModal;
    const step = editPhase.phase;
    if (step.id !== stepId) return null;

    if (type === 'step') {
      return {
        itemType: 'stage' as const,
        stageName: step.name,
        stageDuration: step.duration,
        stageHours: step.workHours,
        statusId: step.statusId,
        initialEmployees: step.employees.filter(e => !e.isDeleted),
        onSave: (emps: EmployeeLink[], scope?: { stageHours: number; hoursPerDay: number }) => {
          saveStepEmployees(stepId, emps, scope ?? undefined);
          // return true;
        },
      };
    }

    const task = step.tasks.find(t => t.id === taskId);
    if (!task) return null;
    return {
      itemType: 'task' as const,
      stageName: task.name,
      stageDuration: task.duration,
      stageHours: task.workHours,
      statusId: task.statusId,
      initialEmployees: task.employees.filter(e => !e.isDeleted),
      onSave: (emps: EmployeeLink[], scope?: { stageHours: number; hoursPerDay: number }) =>
        saveTaskEmployees(stepId, taskId!, emps, scope),
    };
  }, [empModal, editPhase?.phase, saveStepEmployees, saveTaskEmployees]);

  const renderBar = (s: string, e: string, color: string, label: string, alpha: number, onDoubleClick?: () => void) => {
    const left = vPct(s), width = vWidth(s, e);
    if (width <= 0 && left > 100) return null;
    return (
      <div className={styles.bar}
        style={{ right: `${left.toFixed(2)}%`, width: `${Math.max(0.5, width).toFixed(2)}%`, background: color, opacity: alpha, cursor: onDoubleClick ? 'pointer' : 'default' }}
        title={`${label}: ${s} → ${e}`}
        onDoubleClick={onDoubleClick}>
        {width > 8 ? label : ''}
      </div>
    );
  };

  const headerCols = cols.map((col, i) => {
    if (viewMode === 'month') {
      const lbl = col.toLocaleDateString('he-IL', { month: 'short' }) + "'" + String(col.getFullYear()).slice(2);
      return <th key={i} className={`${styles.thCell} bg-gray-50 px-2 py-3 border-s border-gray-200 text-center text-xs font-bold text-gray-700`} style={{ minWidth: colW, width: colW }}>{lbl}</th>;
    }
    const qn = Math.floor(col.getMonth() / 3) + 1;
    return <th key={i} className={`${styles.thQuarter} bg-gray-50 px-2 py-3 border-s border-gray-200 text-center text-xs font-bold text-gray-700`} style={{ minWidth: colW, width: colW }}>Q{qn} {col.getFullYear()}</th>;
  });

  return (
    <div className="dark-surface bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden" dir="rtl">

      {/* ── Header — same style as GanttChart ── */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">

          {/* Date navigation */}
          <div className="flex items-center gap-4">
            <button onClick={() => setOffset(o => o - 1)}
              className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-all">
              <ChevronRight size={20} className="text-white" />
            </button>
            <div className="text-center">
              <h3 className="text-white font-bold text-xl">{viewLabel}</h3>
              <p className="text-emerald-100 text-sm">{viewMode === 'month' ? 'תצוגה חודשית' : 'תצוגה רבעונית'}</p>
            </div>
            <button onClick={() => setOffset(o => o + 1)}
              className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-all">
              <ChevronLeft size={20} className="text-white" />
            </button>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View toggle */}
            <div className="flex items-center bg-white bg-opacity-20 rounded-lg overflow-hidden">
              <button
                onClick={() => { setViewMode('month'); setOffset(0); }}
                className={`px-3 py-1.5 text-sm font-semibold transition-all ${viewMode === 'month' ? 'bg-white text-emerald-700' : 'text-white hover:bg-white hover:bg-opacity-10'}`}
              >
                חודשי
              </button>
              <button
                onClick={() => { setViewMode('quarter'); setOffset(0); }}
                className={`px-3 py-1.5 text-sm font-semibold transition-all ${viewMode === 'quarter' ? 'bg-white text-emerald-700' : 'text-white hover:bg-white hover:bg-opacity-10'}`}
              >
                רבעוני
              </button>
            </div>

            {/* Filter → GanttFilterModal */}
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={isModalOpen}
              onClick={() => setIsModalOpen(true)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-sm transition-all ${activeFilterCount > 0 ? 'bg-white text-emerald-700' : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'}`}
            >
              <SlidersHorizontal size={16} />
              סינון
              {activeFilterCount > 0 && (
                <span className="bg-emerald-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Today */}
            <button
              onClick={() => { setOffset(0); scrollToday(); }}
              className="flex items-center gap-2 px-4 py-2 bg-white text-emerald-600 rounded-lg hover:bg-emerald-50 font-semibold transition-all"
            >
              <CalendarDays size={18} />
              היום
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex-1 min-w-[200px] max-w-md">
            <div className="relative">
              <Search size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={ganttSearchQuery}
                onChange={e => setGanttSearchQuery(e.target.value)}
                placeholder="חפש לפי שם פרויקט או שלב..."
                className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 dark:placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                aria-label="חיפוש פרויקט או שלב"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Gantt table — ריווח שורות דרך `.bodyCell` ב-CSS ── */}
      <div className="overflow-x-auto" dir="rtl" ref={ganttWrapRef}>
        <div className="min-w-[960px]" dir="rtl">
        <table className={styles.ganttTable}>
          <thead className="border-b-2 border-gray-200">
            <tr>
              <th className={`${styles.colLabel} bg-gray-50 px-2 py-2 text-xs font-bold text-gray-700 border-s border-gray-200`}>פרויקט / שלב</th>
              {headerCols}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className={styles.emptyRow}>
                <td className="py-12 text-center text-gray-500" colSpan={numCols + 1}>טוען נתונים...</td>
              </tr>
            ) : loadError ? (
              <tr className={styles.emptyRow}>
                <td className="py-12 text-center text-red-500" colSpan={numCols + 1}>{loadError}</td>
              </tr>
            ) : filteredProjects.length === 0 ? (
              <tr className={styles.emptyRow}>
                <td className="py-12 text-center text-gray-500" colSpan={numCols + 1}>
                  {normalizeGanttSearchKey(ganttSearchQuery)
                    ? 'אין תוצאות התואמות לחיפוש'
                    : 'אין נתונים התואמים לסינון'}
                </td>
              </tr>
            ) : (
              filteredProjects.map(proj => {
                const isOpen    = expandedIds.has(proj.id);
                const visiblePhases = proj.phases;
                if (visiblePhases.length === 0) return null;
                const projStart = visiblePhases.reduce((a, b) => a < b.start ? a : b.start, visiblePhases[0].start);
                const projEnd   = visiblePhases.reduce((a, b) => a > b.end   ? a : b.end,   visiblePhases[0].end);
                const done      = visiblePhases.filter(p => p.status === 'הושלם').length;
                return (
                  <Fragment key={`p-${proj.id}`}>
                    <tr className={styles.projRow} onClick={() => toggle(proj.id)}>
                      <td className={`${styles.colLabel} ${styles.projColLabel} ${styles.bodyCell} align-middle`}>
                        <div className={styles.projHeader}>
                          <div className={styles.projDot} style={{ background: proj.color }} />
                          <div>
                            <div className={styles.projName}>{proj.name}</div>
                            <div className={styles.projMeta}>{done}/{visiblePhases.length} שלבים הושלמו</div>
                          </div>
                          <span className={`${styles.chev} ${isOpen ? styles.chevOpen : ''}`}>▼</span>
                        </div>
                      </td>
                      <td className={`${styles.barCell} ${styles.bodyCell} relative align-middle`} colSpan={numCols}>
                        <div className={styles.barWrap}>
                          <GridLines numCols={numCols} />
                          <TodayLine pct={todayPctVal} visible={todayVis} />
                          {renderBar(projStart, projEnd, proj.color, proj.name, 0.2)}
                          {isOpen && visiblePhases.map(ph => renderBar(ph.start, ph.end, statusColorMaps.barColor(ph.status), ph.name, 0.55))}
                        </div>
                      </td>
                    </tr>
                    {isOpen && visiblePhases.map((ph, phIdx) => (
                      <tr
                        key={`ph-${proj.id}-${ph.id ?? phIdx}`}
                        className={`${styles.phaseRow} cursor-pointer`}
                        onDoubleClick={() => openEdit(proj, ph, phIdx, phIdx === 0)}
                      >
                        <td className={`${styles.colLabel} ${styles.bodyCell} align-middle`}>
                          <div className={styles.phaseLabel}>
                            <div>
                              <div className={styles.phaseNameRow}>
                                <span className={styles.statusPill}
                                  style={{ background: statusColorMaps.pillBg(ph.status), color: statusColorMaps.pillText(ph.status) }}>
                                  {ph.status}
                                </span>
                                <span className={styles.phaseNameText}>{ph.name}</span>
                              </div>
                              <div className={styles.phaseSub}>
                                {formatShortDate(ph.start)} – {formatShortDate(ph.end)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className={`${styles.barCell} ${styles.bodyCell} relative align-middle`} colSpan={numCols}>
                          <div className={styles.barWrap}>
                            <GridLines numCols={numCols} />
                            <TodayLine pct={todayPctVal} visible={todayVis} />
                            {renderBar(ph.start, ph.end, statusColorMaps.barColor(ph.status), ph.name, 1)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="bg-gray-50 dark:bg-gray-800/60 px-6 py-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ background: '#639922' }} />
            <span className="text-xs text-gray-600 dark:text-gray-300">הושלם</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ background: '#3266ad' }} />
            <span className="text-xs text-gray-600 dark:text-gray-300">פעיל</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ background: '#888780' }} />
            <span className="text-xs text-gray-600 dark:text-gray-300">עתידי</span>
          </div>
          {todayVis && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ background: '#E24B4A' }} />
              <span className="text-xs text-gray-600 dark:text-gray-300">היום</span>
            </div>
          )}
          <span className="text-xs text-gray-400 dark:text-gray-500 mr-auto">לחץ על שלב לעריכה</span>
        </div>
      </div>

      {/* ── Summary stats — same as GanttChart ── */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/40 dark:to-purple-950/40 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.projects}</div>
            <div className="text-xs text-gray-600 dark:text-gray-300">פרויקטים</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.total}</div>
            <div className="text-xs text-gray-600 dark:text-gray-300">סה״כ שלבים</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.active}</div>
            <div className="text-xs text-gray-600 dark:text-gray-300">שלבים פעילים</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.done}</div>
            <div className="text-xs text-gray-600 dark:text-gray-300">הושלמו</div>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      <GanttFilterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onApply={setAppliedFilters}
        currentFilters={appliedFilters}
      />

      {editPhase && (
        <StepEditModal
          step={editPhase.phase}
          projectName={editPhase.projectName}
          isFirstStep={editPhase.isFirstStep}
          loading={editPhase.loading}
          loadError={editPhase.loadError}
          statusOptions={statusTables}
          urgencyOptions={urgencyTables}
          onClose={() => {
            setEditPhase(null);
            setStepSaveError(null);
          }}
          saving={stepSaving}
          saveError={stepSaveError}
          onSave={async (updated, saveOptions?: StepEditSaveOptions) => {
            const subjectId = updated.PlanningSubjectID;
            if (!subjectId) {
              setStepSaveError('חסר מזהה נושא תכנון לשמירה');
              return;
            }
            setStepSaving(true);
            setStepSaveError(null);
            try {
              await saveGanttStep({
                projectId: editPhase.projectId,
                subjectId,
                step: updated,
              });

              if (saveOptions?.cascadeStage) {
                const c = saveOptions.cascadeStage;
                await updateTaskAsync(
                  { id: c.id, startDate: c.startDate, endDate: c.endDate },
                  [],
                  false,
                  true,
                );
              }

              const rows = await getGanttSteps(ganttFiltersToQuery(appliedFilters));
              setProjects(ganttStepsToProjects(rows));
              onPhaseUpdate?.(editPhase.projectId, updated);
              setEditPhase(null);
            } catch (err) {
              console.error('Failed to save gantt step:', err);
              setStepSaveError('שגיאה בשמירת השלב');
            } finally {
              setStepSaving(false);
            }
          }}
          onSyncDraft={phase => setEditPhase(p => (p ? { ...p, phase } : p))}
          onOpenStepEmployees={stepId => setEmpModal({ type: 'step', stepId })}
          onOpenTaskEmployees={(stepId, taskId) => setEmpModal({ type: 'task', stepId, taskId })}
        />
      )}

      {empModal && empModalProps && (
        <LinkEmployeesToStageModal
          itemType={empModalProps.itemType}
          stageName={empModalProps.stageName}
          stageDuration={empModalProps.stageDuration}
          stageHours={empModalProps.stageHours}
          statusId={empModalProps.statusId}
          hoursPerDay={WORK_HOURS_PER_DAY}
          initialEmployees={empModalProps.initialEmployees}
          onClose={() => setEmpModal(null)}
          onSave={(emps, scope) => {
            const ok = empModalProps.onSave(emps, scope);
            if (ok === false) return false;
            setEmpModal(null);
            return true;
          }}
        />
      )}

      {empWarn && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] max-w-md px-4 py-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-900/50 rounded-lg text-xs text-amber-800 dark:text-amber-200 shadow-lg flex items-center gap-2">
          <span>{empWarn}</span>
          <button type="button" onClick={() => setEmpWarn(null)} className="text-amber-600 dark:text-amber-300 font-bold shrink-0">×</button>
        </div>
      )}
    </div>
  );
}

export default GanttSteps;