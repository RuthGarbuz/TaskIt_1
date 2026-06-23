import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Plus, Trash2, ChevronDown, ChevronRight,
  Users, Save, CheckCircle, AlertCircle,
  Search, Link, GripVertical, RotateCcw,
  Paperclip,
} from 'lucide-react';
import type {
  EmployeeLink, PlanningAttachment, PlanningStep, PlanningSubject, PlanningTask, SubContract, SubContractLink, SubjectTemplate,
  TemplateStep, TemplateTask, SystemTable, PlanningTemplateEmployeeLinksMaps, PlanningTemplateEmployeeLinkSeed,
} from '../../../Data/projectsData';
import {
  deletePlanningSubject,
  getPlanningHierarchy, getPlanningSystemLists, savePlanningHierarchy,
  getPlanningTemplateEmployeeLinks, EMPTY_PLANNING_TEMPLATE_EMPLOYEE_LINKS,
} from '../../../services/projectPlanningService';
import { getNumberOfHours } from '../../../services/settingService';
import LinkEmployeesToStageModal from '../../shared/LinkEmployeesToStageModal';
import SubcontractsModal from './SubcontractsModal';
import ImportSubjectTemplatesModal, { type ImportPlanningSubjectsPayload } from './ImportSubjectTempLatesModal';
import MessageBox from '../../shared/MessageBox';
import AttachmentsModal from '../AttachmentsModal';

// ─── Types ────────────────────────────────────────────────────────────────────
type SelectOption = { id: number; name: string; isDefault: boolean };

const readAttachmentIsLink = (raw: Record<string, unknown>): boolean => {
  if (typeof raw.isLink === 'boolean') return raw.isLink;
  if (typeof raw.IsLink === 'boolean') return raw.IsLink;
  if (raw.attachmentType === 'link') return true;
  if (raw.attachmentType === 'upload') return false;
  return false;
};

/** Normalize API/UI attachment rows; keeps `isLink` and derived `attachmentType` in sync. */
const normalizePlanningAttachment = (
  raw: PlanningAttachment | Record<string, unknown>,
  entityType: 'step' | 'task',
  entityId: number,
): PlanningAttachment => {
  const r = raw as Record<string, unknown>;
  const isLink = readAttachmentIsLink(r);
  return {
    id: Number(r.id ?? 0),
    entityType,
    entityId,
    employeeId: r.employeeId != null && r.employeeId !== '' ? Number(r.employeeId) : null,
    employeeName: r.employeeName != null ? String(r.employeeName) : undefined,
    description: String(r.description ?? ''),
    fileLink: String(r.fileLink ?? r.FileLink ?? ''),
    isLink,
    fileName: r.fileName != null ? String(r.fileName) : undefined,
    isNew: Boolean(r.isNew),
    isModified: Boolean(r.isModified),
    isDeleted: Boolean(r.isDeleted),
  };
};

const normalizeSubjectAttachments = (subjects: PlanningSubject[]): PlanningSubject[] =>
  subjects.map(s => ({
    ...s,
    steps: s.steps.map(st => ({
      ...st,
      attachments: (st.attachments ?? []).map(a => normalizePlanningAttachment(a, 'step', st.id)),
      tasks: st.tasks.map(t => ({
        ...t,
        attachments: (t.attachments ?? []).map(a => normalizePlanningAttachment(a, 'task', t.id)),
      })),
    })),
  }));

const DEFAULT_STATUS_OPTIONS = [
  { id: 1, name: 'פתוח'   , isDefault: true  },
  { id: 2, name: 'בביצוע' , isDefault: false },
  { id: 3, name: 'הושלם'  , isDefault: false },
  { id: 4, name: 'מושהה'  , isDefault: false },
];
const DEFAULT_URGENCY_OPTIONS = [
  { id: 1, name: 'נמוכה' , isDefault: false },
  { id: 2, name: 'רגילה' , isDefault: true  },
  { id: 3, name: 'גבוהה' , isDefault: false },
  { id: 4, name: 'דחוף'  , isDefault: false },
];

const isTempId = (id: number) => id > 1_000_000_000_000 || id < 0;
const DEFAULT_WORK_HOURS_PER_DAY = 8;

const toInputDate = (value?: string) => {
  if (!value) return '';
  if (value.includes('T')) return value.split('T')[0];
  if (value.includes('/')) {
    const [day, month, year] = value.split('/');
    if (year && month && day) return `${year.padStart(4,'0')}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`;
  }
  return value;
};
const todayIso = () => new Date().toISOString().split('T')[0];

// ─── Date helpers ─────────────────────────────────────────────────────────────
const dateDiffDays = (start: string, end: string): number => {
  if (!start || !end) return 0;
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000);
};
const addDays = (iso: string, days: number): string => {
  if (!iso) return iso;
  const d = new Date(iso); d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};
const maxIsoDate = (a: string, b: string) => (a >= b ? a : b);
const minIsoDate = (a: string, b: string) => (a <= b ? a : b);
const round2 = (n: number) => parseFloat(Number(n).toFixed(2));

const rescaleTaskEmployeesByTaskHours = (
  employees: EmployeeLink[],
  newTaskHours: number,
  oldTaskHours: number,
  hoursPerDay: number
): EmployeeLink[] => {
  const factor = oldTaskHours > 0 ? newTaskHours / oldTaskHours : 1;
  let next = employees.map(e => {
    if (e.isDeleted) return e;
    const hoursRaw = oldTaskHours > 0 ? e.workHours * factor : e.workHours;
    const workHours = round2(Math.max(0, Math.min(hoursRaw, newTaskHours)));
    return { ...e, workHours, workDays: round2(workHours / hoursPerDay), isModified: !e.isNew };
  });

  const totalActive = next.filter(e => !e.isDeleted).reduce((sum, e) => sum + e.workHours, 0);
  if (totalActive > newTaskHours && totalActive > 0) {
    const k = newTaskHours / totalActive;
    next = next.map(e => {
      if (e.isDeleted) return e;
      const workHours = round2(e.workHours * k);
      return { ...e, workHours, workDays: round2(workHours / hoursPerDay), isModified: !e.isNew };
    });
  }

  return next;
};

const applyStepWorkHoursToTasks = (
  step: PlanningStep,
  newStepHoursRaw: number,
  hoursPerDay: number
): PlanningStep => {
  const newStepHours = round2(Math.max(0, newStepHoursRaw));
  const newStepDays = round2(newStepHours / hoursPerDay);
  const visibleTasks = step.tasks.filter(t => !t.isDeleted);

  if (visibleTasks.length === 0) {
    return { ...step, workHours: newStepHours, workDays: newStepDays, isModified: true };
  }

  const allocations = new Map<number, number>();
  const anyTaskPct = visibleTasks.some(t => t.percentage > 0);
  if (anyTaskPct) {
    visibleTasks.forEach(t => {
      allocations.set(t.id, round2((newStepHours * t.percentage) / 100));
    });
  } else {
    let consumed = 0;
    const each = round2(newStepHours / visibleTasks.length);
    visibleTasks.forEach((t, i) => {
      if (i === visibleTasks.length - 1) allocations.set(t.id, round2(Math.max(0, newStepHours - consumed)));
      else {
        allocations.set(t.id, each);
        consumed = round2(consumed + each);
      }
    });
  }

  return {
    ...step,
    workHours: newStepHours,
    workDays: newStepDays,
    tasks: step.tasks.map(t => {
      if (t.isDeleted || !allocations.has(t.id)) return t;
      const workHours = allocations.get(t.id) ?? 0;
      const workDays = round2(workHours / hoursPerDay);
      return {
        ...t,
        workHours,
        workDays,
        employees: rescaleTaskEmployeesByTaskHours(t.employees, workHours, t.workHours, hoursPerDay),
        isModified: !t.isNew,
      };
    }),
    isModified: true,
  };
};

const clampIndependentTaskToStep = (ts: string, te: string, S: string, E: string, preferredDur: number): { start: string; end: string } => {
  const span = Math.max(1, Math.floor(Number(preferredDur)));
  if (!S || !E) return { start: ts || S, end: te || E };
  if (!ts || !te) return { start: S, end: minIsoDate(addDays(S, span - 1), E) };
  if (te < S) return { start: S, end: minIsoDate(addDays(S, span - 1), E) };
  if (ts > E) return { start: maxIsoDate(S, addDays(E, -(span - 1))), end: E };
  let ns = maxIsoDate(ts, S), ne = minIsoDate(te, E);
  if (ns > ne) { ns = S; ne = minIsoDate(addDays(ns, span - 1), E); }
  return { start: ns, end: ne };
};

const scheduleDependentTaskAfterPrev = (prevEnd: string, dur: number, S: string, E: string): { start: string; end: string } => {
  const span = Math.max(1, Math.floor(Number(dur)));
  let start = addDays(prevEnd, 1);
  if (start > E) return { start: maxIsoDate(S, addDays(E, -(span - 1))), end: E };
  if (start < S) start = S;
  let end = addDays(start, span - 1);
  if (end > E) { end = E; start = maxIsoDate(S, addDays(end, -(span - 1))); }
  return { start, end };
};

const refitTasksForStepBounds = (step: PlanningStep): PlanningTask[] => {
  const S = toInputDate(step.startDate), E = toInputDate(step.endDate);
  if (!S || !E) return step.tasks;
  const visible = step.tasks.filter(t => !t.isDeleted);
  const patches = new Map<number, { startDate: string; endDate: string; duration: number }>();
  let prevEnd = '';
  for (let i = 0; i < visible.length; i++) {
    const t = visible[i];
    const dur = Math.max(1, Math.floor(Number(t.duration)));
    const ts = toInputDate(t.startDate), te = toInputDate(t.endDate);
    let start: string, end: string;
    if (i > 0 && (t.dependsOnTaskId ?? false) && prevEnd) {
      const d = scheduleDependentTaskAfterPrev(prevEnd, dur, S, E); start = d.start; end = d.end;
    } else {
      const d = clampIndependentTaskToStep(ts, te, S, E, dur); start = d.start; end = d.end;
    }
    patches.set(t.id, { startDate: start, endDate: end, duration: Math.max(1, dateDiffDays(start, end) + 1) });
    prevEnd = end;
  }
  return step.tasks.map(t => {
    if (t.isDeleted) return t;
    const p = patches.get(t.id); if (!p) return t;
    const same = toInputDate(t.startDate) === p.startDate && toInputDate(t.endDate) === p.endDate && Math.max(1, Math.floor(Number(t.duration))) === p.duration;
    return same ? t : { ...t, ...p, isModified: !t.isNew };
  });
};

const distributeProportionalInts = (weights: number[], targetSum: number): number[] | null => {
  const n = weights.length;
  if (n === 0) return [];
  if (targetSum < n) return Array(n).fill(1);
  const w = weights.map(x => Math.max(1, Math.floor(Number(x))));
  const sumW = w.reduce((a, b) => a + b, 0);
  const base = w.map(wi => Math.max(1, Math.floor((targetSum * wi) / sumW)));
  let diff = targetSum - base.reduce((a, b) => a + b, 0);
  const orderInc = [...w.entries()].sort((a, b) => b[1] - a[1]).map(([i]) => i);
  let k = 0;
  while (diff > 0 && k < targetSum + n + 5) { base[orderInc[k % n]]++; diff--; k++; }
  const orderDec = [...w.entries()].sort((a, b) => a[1] - b[1]).map(([i]) => i);
  k = 0;
  while (diff < 0 && k < targetSum + n + 5) { const i = orderDec[k % n]; if (base[i] > 1) { base[i]--; diff++; } k++; }
  return diff === 0 ? base : null;
};

const coerceDependsFlag = (v: unknown): boolean => {
  if (v === true || v === 1) return true;
  if (v === false || v === 0 || v == null) return false;
  if (typeof v === 'string') { const s = v.trim().toLowerCase(); return s === 'true' || s === '1' || s === 'yes'; }
  return false;
};
const templateStepDependsTrue = (st: TemplateStep): boolean =>
  coerceDependsFlag(st.dependsOnStepId) || coerceDependsFlag((st as TemplateStep & Record<string,unknown>).DependsOnStepID);
const templateTaskDependsTrue = (tt: TemplateTask): boolean =>
  coerceDependsFlag(tt.dependsOnTaskId) || coerceDependsFlag((tt as TemplateTask & Record<string,unknown>).DependsOnTaskID);

const seedsToEmployeeLinks = (defaultStatusId:number,seeds: PlanningTemplateEmployeeLinkSeed[] | undefined, nextTempId: () => number): EmployeeLink[] =>
  (seeds ?? []).map(s => ({
    linkId: 0, id: nextTempId(), employeeId: s.employeeId,
    employeeName: s.employeeName || `עובד ${s.employeeId}`,
    percentage: Number(s.percentage) || 0, workHours: Number(s.workHours) || 0,
    workDays: Number(s.workDays) || 0, duration: Number(s.duration) || 0, isNew: true,
    statusId: defaultStatusId,
  }));

const buildPlanningSubjectsFromImportTemplates = (
  templates: SubjectTemplate[], startDateByTemplateId: Record<number, string>,
  defaultStatusId: number, defaultUrgencyId: number, templateEmployees: PlanningTemplateEmployeeLinksMaps,
): PlanningSubject[] | null => {
  if (!templates.length) return null;
  let seq = 0;
  const nextTempId = () => -Date.now() - (++seq);
  const out: PlanningSubject[] = [];
  for (const tpl of templates) {
    const subjectStartRaw = startDateByTemplateId[tpl.id];
    if (!subjectStartRaw?.trim()) return null;
    const stepsRaw = tpl.steps ?? [];
    const subjectSpan = stepsRaw.length === 0
      ? Math.max(1, Math.floor(Number(tpl.totalDays ?? 1)))
      : Math.max(1, stepsRaw.reduce((sum, st) => sum + Math.max(1, Math.floor(Number(st.duration))), 0));
    const subjectId = nextTempId();
    if (stepsRaw.length === 0) {
      out.push({ id: subjectId, name: tpl.name, isActive: true, isExpanded: true, steps: [], subContractsLink: [], isNew: true });
      continue;
    }
    const segStart = subjectStartRaw, segEnd = addDays(segStart, subjectSpan - 1);
    let stepPrevEnd: string | null = null;
    const planningSteps: PlanningStep[] = [];
    for (let ei = 0; ei < stepsRaw.length; ei++) {
      const st = stepsRaw[ei];
      const span = Math.max(1, Math.floor(Number(st.duration)));
      const dep = ei > 0 && templateStepDependsTrue(st);
      let stepStart = ei === 0 ? segStart : dep ? addDays(stepPrevEnd!, 1) : segStart;
      let stepEnd = addDays(stepStart, span - 1);
      if (stepEnd > segEnd) { stepEnd = segEnd; stepStart = maxIsoDate(segStart, addDays(stepEnd, -(span - 1))); }
      const actualSpan = Math.max(1, dateDiffDays(stepStart, stepEnd) + 1);
      stepPrevEnd = stepEnd;
      const stepId = nextTempId();
      const tasksRaw = st.tasks ?? [];
      let taskSpans: number[] = [];
      if (tasksRaw.length) {
        const dist = distributeProportionalInts(tasksRaw.map(tt => Math.max(1, Math.floor(Number(tt.duration)))), actualSpan);
        if (!dist) return null;
        taskSpans = dist;
      }
      let taskPrevEnd: string | null = null;
      const planningTasks: PlanningTask[] = [];
      for (let ti = 0; ti < tasksRaw.length; ti++) {
        const tt = tasksRaw[ti]; const tdep = ti > 0 && templateTaskDependsTrue(tt);
        let tStart = ti === 0 ? stepStart : tdep ? addDays(taskPrevEnd!, 1) : stepStart;
        let tEnd = addDays(tStart, taskSpans[ti] - 1);
        if (tEnd > stepEnd) { tEnd = stepEnd; tStart = maxIsoDate(stepStart, addDays(tEnd, -(taskSpans[ti] - 1))); }
        taskPrevEnd = tEnd;
        planningTasks.push({
          id: nextTempId(), PlanningStepID: stepId, name: tt.name, orderNum: ti + 1,
          percentage: Number(tt.taskPercentage ?? 0) || 0, workHours: Number(tt.workHours ?? 0) || 0,
          workDays: Number(tt.workDays ?? 0) || 0, duration: Number(tt.duration ?? 0) || 0,
          dependsOnTaskId: tdep, employees: seedsToEmployeeLinks(defaultStatusId, templateEmployees.taskEmployeeLinks[tt.id], nextTempId),
          startDate: tStart, endDate: tEnd, statusId: defaultStatusId, urgencyId: defaultUrgencyId,
          isActive: true, isNew: true, attachments: [],
        });
      }
      planningSteps.push({
        id: stepId, PlanningSubjectID: subjectId, name: st.name, orderNum: ei + 1,
        percentage: Number(st.stepPercentage ?? 0) || 0, workHours: Number(st.workHours ?? 0) || 0,
        workDays: Number(st.workDays ?? 0) || 0, duration: Number(st.duration ?? 0) || 0,
        dependsOnStepId: dep, employees: seedsToEmployeeLinks(defaultStatusId, templateEmployees.stepEmployeeLinks[st.id], nextTempId),
        startDate: stepStart, endDate: stepEnd, statusId: defaultStatusId, urgencyId: defaultUrgencyId,
        isActive: true, isExpanded: true, tasks: planningTasks, isNew: true, attachments: [],
      });
    }
    out.push({ id: subjectId, name: tpl.name, isActive: true, isExpanded: true, steps: planningSteps, subContractsLink: [], isNew: true });
  }
  return out;
};

// ─── DateInput ────────────────────────────────────────────────────────────────
function DateInput({ value, onChange, className = '', ringColor = 'focus-within:ring-blue-300' }: {
  value: string; onChange: (v: string) => void; className?: string; ringColor?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const toDisplay = (iso: string) => { if (!iso) return ''; const [y,m,d] = iso.split('-'); if (!y||!m||!d) return iso; return `${d}/${m}/${y}`; };
  const openPicker = () => { const el = inputRef.current; if (!el) return; try { el.showPicker(); } catch { el.focus(); } };
  return (
    <div className={`relative flex items-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 overflow-hidden focus-within:ring-2 ${ringColor} ${className}`}>
      <div className="relative flex-1 min-w-0">
        <span className="block px-1.5 py-1.5 text-xs pointer-events-none select-none whitespace-nowrap overflow-hidden">
          {toDisplay(value) || <span className="text-gray-400">dd/mm/yy</span>}
        </span>
        <input ref={inputRef} type="date" value={value} onChange={e => onChange(e.target.value)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"/>
      </div>
      <button type="button" onClick={openPicker} className="shrink-0 px-1.5 py-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors border-r border-gray-200 dark:border-gray-600" tabIndex={-1} title="בחר תאריך">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </button>
    </div>
  );
}

// ─── Inline Select ────────────────────────────────────────────────────────────
function InlineSelect({ value, options, onChange, width = 'w-24' }: {
  value: number; options: SystemTable[]; onChange: (v: number) => void; width?: string;
}) {
  const color = options.find(o => o.id === value)?.color;
  return (
    <select value={value} onChange={e => onChange(Number(e.target.value))}
      className={`${width} px-1.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-indigo-300`}
      style={{ color: color || undefined, borderColor: color || undefined }}>
      {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
    </select>
  );
}

// ─── AttachmentButton ─────────────────────────────────────────────────────────
function AttachmentButton({ count, onClick, color = 'indigo' }: {
  count: number; onClick: () => void; color?: 'indigo' | 'purple';
}) {
  const base = color === 'purple' ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/40 dark:text-purple-200 dark:hover:bg-purple-900/60' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-200 dark:hover:bg-indigo-900/60';
  const badge = color === 'purple' ? 'bg-purple-600' : 'bg-indigo-600';
  return (
    <button onClick={onClick} className={`w-20 flex items-center justify-center gap-1 px-1.5 py-1 ${base} rounded-lg text-xs font-bold shrink-0 whitespace-nowrap transition-colors`} title="קבצים וקישורים">
      <Paperclip size={11}/>קבצים
      {count > 0 && <span className={`${badge} text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold`}>{count}</span>}
    </button>
  );
}

// ─── Step Row ─────────────────────────────────────────────────────────────────
function StepRow({
  step, isFirst, onChange, onDelete, onToggle, onOpenEmployees, onOpenAttachments,
  statusOptions, urgencyOptions, onWarn, dragHandleProps,
}: {
  step: PlanningStep; isFirst: boolean; subjectSteps: PlanningStep[];
  onChange: (field: string, value: any) => void;
  onDelete: () => void; onToggle: () => void; onOpenEmployees: () => void;
  onOpenAttachments: () => void;
  statusOptions: SystemTable[]; urgencyOptions: SystemTable[];
  onWarn: (msg: string) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}) {
  const numInput = (field: string, val: number, min = 0, step2 = 1) => (
    <input type="number" min={min} step={step2} value={val} onChange={e => onChange(field, Number(e.target.value))}
      className="w-full px-1 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-center bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-300"/>
  );
  const employeeCountForStage = (stage: PlanningStep): number => {
    const sIds = new Set(stage.employees.filter(e => !e.isDeleted).map(e => e.employeeId));
    const tIds = new Set(stage.tasks.flatMap(t => t.employees.filter(e => !e.isDeleted).map(e => e.employeeId)));
    return new Set([...sIds, ...tIds]).size;
  };
  const attachCount = (step.attachments ?? []).filter(a => !a.isDeleted).length;
  return (
    <div className="border border-blue-200 dark:border-blue-900/50 rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
      <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-900/20">
        <div {...dragHandleProps} className="w-5 shrink-0 flex items-center justify-center cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"><GripVertical size={14}/></div>
        <div className="w-6 shrink-0 flex items-center justify-center">
          <button onClick={onToggle} className="p-1 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/40 rounded">{step.isExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}</button>
        </div>
        <div className="w-10 text-center text-xs font-bold text-gray-500 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg py-1 shrink-0">{step.orderNum}</div>
        <input type="text" value={step.name} onChange={e => onChange('name', e.target.value)}
          className="min-w-0 flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-semibold bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-300" placeholder="שם שלב"/>
        <div className="flex items-center gap-0.5 w-16 shrink-0">{numInput('percentage', step.percentage)}<span className="text-xs text-gray-400">%</span></div>
        <div className="w-16 shrink-0">
          <input
            type="number"
            min={0}
            step={0.5}
            value={parseFloat((Number(step.workHours) || 0).toFixed(2))}
            onChange={e => onChange('workHours', Number(e.target.value))}
            className="w-full px-1 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-center bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <div className="w-14 shrink-0">
          <input
            type="number"
            min={0}
            step={0.5}
            value={parseFloat((Number(step.workDays) || 0).toFixed(2))}
            onChange={e => onChange('workDays', Number(e.target.value))}
            className="w-full px-1 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-center bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <div className="w-28 shrink-0">
          <DateInput value={toInputDate(step.startDate)} onChange={v => { if (!v) return; onChange('startDate', v); }} ringColor="focus-within:ring-blue-300" className="w-full"/>
        </div>
        <div className="w-28 shrink-0">
          <DateInput value={toInputDate(step.endDate)} onChange={v => { if (!v) return; const s = toInputDate(step.startDate); if (s && v < s) { onWarn('תאריך סיום לא יכול להיות קטן מתאריך התחלה'); return; } onChange('endDate', v); }} ringColor="focus-within:ring-blue-300" className="w-full"/>
        </div>
        <div className="w-12 shrink-0">
          <input type="number" min={1} step={1} value={step.duration} onChange={e => onChange('duration', Math.max(1, Math.floor(Number(e.target.value))))}
            className="w-full px-1 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-center bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-300"/>
        </div>
        <div className="w-16 shrink-0 flex items-center justify-center">
          <input type="checkbox" checked={!isFirst && (step.dependsOnStepId ?? false)} disabled={isFirst}
            onChange={e => onChange('dependsOnStepId', e.target.checked)}
            className="w-4 h-4 accent-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
            title={isFirst ? 'שלב ראשון לא יכול להיות תלוי' : 'תלוי שלב'}/>
        </div>
        <button onClick={onOpenEmployees} className="w-24 flex items-center justify-center gap-1 px-1.5 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-bold shrink-0 whitespace-nowrap">
          <Users size={12}/>עובדים
          <span className="bg-white text-blue-700 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">{employeeCountForStage(step)}</span>
        </button>
        <AttachmentButton count={attachCount}
         onClick={onOpenAttachments}
          color="indigo"/>
        <InlineSelect value={step.statusId} options={statusOptions} onChange={v => onChange('statusId', v)} width="w-24"/>
        <InlineSelect value={step.urgencyId} options={urgencyOptions} onChange={v => onChange('urgencyId', v)} width="w-24"/>
        <div className="w-8 shrink-0 flex items-center justify-center">
          <input type="checkbox" checked={step.isActive} onChange={() => onChange('isActive', !step.isActive)} className="w-4 h-4 accent-emerald-500" title="פעיל"/>
        </div>
        <div className="w-8 shrink-0 flex items-center justify-center">
          <button onClick={onDelete} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"><Trash2 size={14}/></button>
        </div>
      </div>
    </div>
  );
}

// ─── Task Row ─────────────────────────────────────────────────────────────────
function TaskRow({
  task, isFirst, onChange, onDelete, onOpenEmployees, onOpenAttachments,
  statusOptions, urgencyOptions, onWarn, stepDuration, onConfirmStepDuration, dragHandleProps,
}: {
  task: PlanningTask; isFirst: boolean; steps: PlanningStep[];
  onChange: (field: string, value: any) => void;
  onDelete: () => void; onOpenEmployees: () => void; onOpenAttachments: () => void;
  statusOptions: SelectOption[]; urgencyOptions: SelectOption[];
  onWarn: (msg: string) => void; stepDuration: number;
  onConfirmStepDuration: (newTaskDuration: number) => Promise<void>;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}) {
  const fmt = (v: number) => Number.isInteger(v) ? v : parseFloat(v.toFixed(2));
  const numInput = (field: string, val: number, min = 0, step2 = 1) => (
    <input type="number" min={min} step={step2} value={fmt(val)} onChange={e => onChange(field, Number(e.target.value))}
      className="w-full px-1 py-1 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-center bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-purple-300"/>
  );
  const attachCount = (task.attachments ?? []).filter(a => !a.isDeleted).length;
  const handleEndDate = async (v: string) => {
    if (!v) return;
    const start = toInputDate(task.startDate);
    if (start && v < start) { onWarn('תאריך סיום לא יכול להיות קטן מתאריך התחלה'); return; }
    const newDur = start ? dateDiffDays(start, v) + 1 : task.duration;
    if (newDur > stepDuration) await onConfirmStepDuration(newDur);
    onChange('endDate', v); if (start) onChange('duration', Math.max(1, newDur));
  };
  const handleDuration = async (v: number) => {
    const nd = Math.max(1, Math.floor(v));
    if (nd > stepDuration) await onConfirmStepDuration(nd);
    onChange('duration', nd);
    const start = toInputDate(task.startDate);
    if (start) onChange('endDate', addDays(start, nd - 1));
  };
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-gray-800 rounded-lg border border-purple-100 dark:border-purple-900/40">
      <div {...dragHandleProps} className="w-5 shrink-0 flex items-center justify-center cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"><GripVertical size={13}/></div>
      <div className="w-10 text-center text-xs font-bold text-gray-400 shrink-0">{task.orderNum}</div>
      <input type="text" value={task.name} onChange={e => onChange('name', e.target.value)}
        className="min-w-0 flex-1 px-2 py-1 border border-gray-200 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-purple-300" placeholder="שם משימה"/>
      <div className="flex items-center gap-0.5 w-16 shrink-0">{numInput('percentage', task.percentage)}<span className="text-xs text-gray-400">%</span></div>
      <div className="w-16 shrink-0">{numInput('workHours', task.workHours, 0, 0.5)}</div>
      <div className="w-14 shrink-0">{numInput('workDays', task.workDays, 0, 0.5)}</div>
      <div className="w-28 shrink-0">
        <DateInput value={toInputDate(task.startDate)} onChange={v => { if (!v) return; onChange('startDate', v); }} ringColor="focus-within:ring-purple-300" className="w-full"/>
      </div>
      <div className="w-28 shrink-0"><DateInput value={toInputDate(task.endDate)} onChange={handleEndDate} ringColor="focus-within:ring-purple-300" className="w-full"/></div>
      <div className="w-12 shrink-0">
        <input type="number" min={1} step={1} value={task.duration} onChange={e => handleDuration(Number(e.target.value))}
          className="w-full px-1 py-1 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-center bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-purple-300"/>
      </div>
      <div className="w-16 shrink-0 flex items-center justify-center">
        <input type="checkbox" checked={!isFirst && (task.dependsOnTaskId ?? false)} disabled={isFirst}
          onChange={e => onChange('dependsOnTaskId', e.target.checked)}
          className="w-4 h-4 accent-purple-500 disabled:opacity-40 disabled:cursor-not-allowed"
          title={isFirst ? 'משימה ראשונה לא יכולה להיות תלויה' : 'תלוי משימה'}/>
      </div>
      <button onClick={onOpenEmployees} className="w-24 flex items-center justify-center gap-1 px-1.5 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-xs font-bold shrink-0 whitespace-nowrap">
        <Users size={11}/>עובדים
        {task.employees.filter(e => !e.isDeleted).length > 0 && (
          <span className="bg-white text-purple-700 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">{task.employees.filter(e => !e.isDeleted).length}</span>
        )}
      </button>
      <AttachmentButton count={attachCount} 
      onClick={onOpenAttachments} color="purple"/>
      <InlineSelect value={task.statusId} options={statusOptions} onChange={v => onChange('statusId', v)} width="w-24"/>
      <InlineSelect value={task.urgencyId} options={urgencyOptions} onChange={v => onChange('urgencyId', v)} width="w-24"/>
      <div className="w-8 shrink-0 flex items-center justify-center">
        <input type="checkbox" checked={task.isActive} onChange={() => onChange('isActive', !task.isActive)} className="w-4 h-4 accent-emerald-500" title="פעיל"/>
      </div>
      <div className="w-8 shrink-0 flex items-center justify-center">
        <button onClick={onDelete} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"><Trash2 size={13}/></button>
      </div>
    </div>
  );
}

// ─── Column Headers ───────────────────────────────────────────────────────────
function ColHeaders({ forStep }: { forStep?: boolean }) {
  const cols: { label: string; w: string }[] = [
    { label: '', w: 'w-5' }, { label: '', w: 'w-6' },
    { label: 'מס׳', w: 'w-10' },
    { label: forStep ? 'שם שלב' : 'שם משימה', w: 'flex-1' },
    { label: 'אחוז', w: 'w-16' }, { label: 'שעות עבודה', w: 'w-16' }, { label: 'ימי עבודה', w: 'w-14' },
    { label: 'תאריך התחלה', w: 'w-28' }, { label: 'תאריך סיום', w: 'w-28' }, { label: 'משך זמן', w: 'w-12' },
    { label: forStep ? 'תלוי שלב' : 'תלוי משימה', w: 'w-16' },
    { label: 'עובדים', w: 'w-24' },
    { label: 'קבצים', w: 'w-20' },
    { label: 'סטטוס', w: 'w-24' }, { label: 'עדיפות', w: 'w-24' }, { label: 'פעיל', w: 'w-8' }, { label: '', w: 'w-8' },
  ];
  const display = forStep ? cols : cols.filter((_, i) => i !== 1);
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-bold ${forStep ? 'bg-blue-100 dark:bg-blue-900/30 text-gray-700 dark:text-blue-100' : 'bg-purple-100 dark:bg-purple-900/30 text-gray-700 dark:text-purple-100'}`}>
      {display.map((c, i) => <div key={i} className={`${c.w} shrink-0 text-center`}>{c.label}</div>)}
    </div>
  );
}

// ─── Drag & Drop Hook ─────────────────────────────────────────────────────────
function useDragDrop<T extends { id: number }>(items: T[], onReorder: (newItems: T[]) => void) {
  const dragIdx = useRef<number | null>(null), dragOver = useRef<number | null>(null);
  const getDragProps = (idx: number) => ({
    draggable: true,
    onDragStart: () => { dragIdx.current = idx; },
    onDragEnter: () => { dragOver.current = idx; },
    onDragEnd: () => {
      if (dragIdx.current === null || dragOver.current === null || dragIdx.current === dragOver.current) { dragIdx.current = dragOver.current = null; return; }
      const newItems = [...items]; const [removed] = newItems.splice(dragIdx.current, 1);
      newItems.splice(dragOver.current, 0, removed); dragIdx.current = dragOver.current = null; onReorder(newItems);
    },
    onDragOver: (e: React.DragEvent) => e.preventDefault(),
  });
  return { getDragProps };
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface ProjectTopicsTabProps {
  projectId?: number; focusPlanningTopicId?: number; focusStepId?: number; focusToken?: number;
}

export default function ProjectTopicsTab({ projectId, focusPlanningTopicId, focusStepId, focusToken }: ProjectTopicsTabProps) {
  const FOCUS_LOCK_MS = 5000;
  const [subjects, setSubjects]                   = useState<PlanningSubject[]>([]);
  const [WORK_HOURS_PER_DAY, setWORK_HOURS_PER_DAY] = useState<number>(DEFAULT_WORK_HOURS_PER_DAY);
  const [statusOptions, setStatusOptions]         = useState(DEFAULT_STATUS_OPTIONS);
  const [urgencyOptions, setUrgencyOptions]       = useState(DEFAULT_URGENCY_OPTIONS);
  const [subContractsOptions, setSubContractsOptions] = useState<SubContract[]>([]);
  const [openImport, setOpenImport]               = useState(false);
  const [deletedIds, setDeletedIds]               = useState({ subjectIds: [] as number[], stepIds: [] as number[], taskIds: [] as number[] });
  const [saving, setSaving]         = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError]   = useState<string | null>(null);
  const [isDirty, setIsDirty]       = useState(false);
  const [reloadPending, setReloadPending] = useState(false);
  const [search, setSearch]         = useState('');
  const [focusedStepId, setFocusedStepId] = useState<number | null>(null);
  const [empModal, setEmpModal]     = useState<{ type: 'step' | 'task'; subjectId: number; stepId: number; taskId?: number } | null>(null);
  const [subModal, setSubModal]     = useState<{ subjectId: number; name: string } | null>(null);
  const [attachModal, setAttachModal] = useState<{
    entityType: 'step' | 'task'; entityId: number; entityName: string;
    subjectId: number; stepId: number; taskId?: number;
  } | null>(null);
  const appliedFocusTokenRef = useRef<number | undefined>(undefined);
  const focusLockRef = useRef<{ subjectId: number; stepId: number; expiresAt: number } | null>(null);
  const [messageBox, setMessageBox] = useState<{
    isOpen: boolean; title: string; message: string; type: 'alert' | 'success' | 'error' | 'warning';
    confirmText?: string; cancelText?: string; showCancel?: boolean;
    onConfirm?: () => void; onCancel?: () => void;
  }>({ isOpen: false, title: '', message: '', type: 'alert' });

  const closeMessageBox = () => setMessageBox(prev => ({ ...prev, isOpen: false, showCancel: false, onConfirm: undefined, onCancel: undefined }));
  const openConfirm = (message: string, title = 'אישור'): Promise<boolean> =>
    new Promise(resolve => {
      setMessageBox({ isOpen: true, title, message, type: 'warning', showCancel: true, confirmText: 'אישור', cancelText: 'ביטול',
        onConfirm: () => { resolve(true);  closeMessageBox(); },
        onCancel:  () => { resolve(false); closeMessageBox(); },
      });
    });
  const showWarning = (message: string) => setMessageBox({ isOpen: true, title: 'אזהרה', message, type: 'warning' });

  const loadPlanningData = useCallback(async (): Promise<boolean> => {
    if (!projectId) { setSubjects([]); setSubContractsOptions([]); return true; }
    try {
      const data = await getPlanningHierarchy(projectId);
      const incoming = data.subjects ?? [];
      let focusTarget: { subjectId: number; stepId: number } | null = null;
      if (focusPlanningTopicId != null && focusStepId != null) {
        const pref = incoming.find(s => s.id === focusPlanningTopicId);
        if (pref) {
          const ex = pref.steps.find(st => st.id === focusStepId);
          if (ex) focusTarget = { subjectId: pref.id, stepId: ex.id };
          if (!focusTarget) { const pb = pref.steps.find(st => st.tasks.some(t => t.id === focusStepId)); if (pb) focusTarget = { subjectId: pref.id, stepId: pb.id }; }
        }
        if (!focusTarget) for (const s of incoming) { const ex = s.steps.find(st => st.id === focusStepId); if (ex) { focusTarget = { subjectId: s.id, stepId: ex.id }; break; } }
        if (!focusTarget) for (const s of incoming) { const pb = s.steps.find(st => st.tasks.some(t => t.id === focusStepId)); if (pb) { focusTarget = { subjectId: s.id, stepId: pb.id }; break; } }
      }
      const now = Date.now(), lock = focusLockRef.current;
      const withLock = lock && lock.expiresAt > now
        ? incoming.map(s => s.id !== lock.subjectId ? s : { ...s, isExpanded: true, steps: s.steps.map(st => st.id === lock.stepId ? { ...st, isExpanded: true } : st) })
        : incoming;
      const withFocus = focusTarget
        ? withLock.map(s => s.id !== focusTarget.subjectId ? s : { ...s, isExpanded: true, steps: s.steps.map(st => st.id === focusTarget.stepId ? { ...st, isExpanded: true } : st) })
        : withLock;
      setSubjects(normalizeSubjectAttachments(withFocus));
      if (focusTarget) { setFocusedStepId(focusTarget.stepId); focusLockRef.current = { subjectId: focusTarget.subjectId, stepId: focusTarget.stepId, expiresAt: Date.now() + FOCUS_LOCK_MS }; }
      setSubContractsOptions(data.subContracts ?? []);
      setSaveError(null); setIsDirty(false);
      return true;
    } catch { setSaveError('שגיאה בטעינת תכנון הפרויקט'); return false; }
  }, [projectId, focusPlanningTopicId, focusStepId]);

  useEffect(() => { void loadPlanningData(); }, [loadPlanningData]);

  useEffect(() => {
    if (focusPlanningTopicId == null || focusStepId == null) return;
    const findTarget = () => {
      const pref = subjects.find(s => s.id === focusPlanningTopicId);
      if (pref) {
        const ex = pref.steps.find(st => st.id === focusStepId); if (ex) return { subjectId: pref.id, stepId: ex.id };
        const pb = pref.steps.find(st => st.tasks.some(t => t.id === focusStepId)); if (pb) return { subjectId: pref.id, stepId: pb.id };
      }
      for (const s of subjects) { const ex = s.steps.find(st => st.id === focusStepId); if (ex) return { subjectId: s.id, stepId: ex.id }; }
      for (const s of subjects) { const pb = s.steps.find(st => st.tasks.some(t => t.id === focusStepId)); if (pb) return { subjectId: s.id, stepId: pb.id }; }
      return null;
    };
    const target = findTarget(); if (!target) return;
    if (focusToken != null && appliedFocusTokenRef.current === focusToken) {
      if (subjects.some(s => s.id === target.subjectId && s.isExpanded && s.steps.some(st => st.id === target.stepId && st.isExpanded))) return;
    }
    if (search.trim()) setSearch('');
    setSubjects(prev => prev.map(s => s.id !== target.subjectId ? s : { ...s, isExpanded: true, steps: s.steps.map(st => st.id === target.stepId ? { ...st, isExpanded: true } : st) }));
    setFocusedStepId(target.stepId);
    focusLockRef.current = { subjectId: target.subjectId, stepId: target.stepId, expiresAt: Date.now() + FOCUS_LOCK_MS };
    if (focusToken != null) appliedFocusTokenRef.current = focusToken;
    window.setTimeout(() => {
      const el = document.querySelector(`[data-step-id="${target.stepId}"]`) as HTMLElement | null;
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-emerald-400', 'ring-offset-1');
      window.setTimeout(() => { el.classList.remove('ring-2', 'ring-emerald-400', 'ring-offset-1'); setFocusedStepId(prev => prev === target.stepId ? null : prev); }, 2400);
    }, 120);
  }, [focusPlanningTopicId, focusStepId, focusToken, search, subjects]);

  const handleCancelChanges = async () => {
    if (!isDirty || saving || reloadPending) return;
    const yes = await openConfirm('כל השינויים שביצעת ייוּמוּ והתצוגה תוחזר למצב השמור בשרת. להמשיך?', 'ביטול שינויים');
    if (!yes) return;
    setReloadPending(true); setSaveSuccess(false);
    try { const ok = await loadPlanningData(); if (ok) { setDeletedIds({ subjectIds: [], stepIds: [], taskIds: [] }); setIsDirty(false); } }
    finally { setReloadPending(false); }
  };

  useEffect(() => {
    const load = async () => { try { const n = await getNumberOfHours(); if (n != null && Number.isFinite(n) && n > 0) setWORK_HOURS_PER_DAY(n); } catch {} };
    void load();
  }, []);
  useEffect(() => {
    const load = async () => { try { const d = await getPlanningSystemLists(); setStatusOptions(d.statuses ?? DEFAULT_STATUS_OPTIONS); setUrgencyOptions(d.priorities ?? DEFAULT_URGENCY_OPTIONS); } catch {} };
    load();
  }, []);

  const filtered = useMemo(() => {
    const visible = subjects.filter(s => !s.isDeleted);
    if (!search.trim()) return visible;
    return visible.filter(s => s.name.includes(search) || s.steps.some(st => !st.isDeleted && (st.name.includes(search) || st.tasks.some(t => !t.isDeleted && t.name.includes(search)))));
  }, [subjects, search]);

  const dirty = () => setIsDirty(true);
  const getDefaultId = (opts: SelectOption[]) => opts.find(o => o.isDefault)?.id ?? opts[0]?.id ?? 0;
  const trackDel = (field: keyof typeof deletedIds, id: number) => { if (!isTempId(id)) setDeletedIds(p => ({ ...p, [field]: [...p[field], id] })); };

  const mergeSubContractLinks = (current: SubContractLink[], next: SubContractLink[]): SubContractLink[] => {
    const nextIds = new Set(next.map(l => l.id)), currentMap = new Map(current.map(l => [l.id, l])), merged: SubContractLink[] = [];
    for (const link of next) { const ex = currentMap.get(link.id); merged.push({ ...(ex ?? {}), ...link, isDeleted: false, isNew: ex ? ex.isNew : true }); }
    for (const ex of current) { if (!nextIds.has(ex.id)) { if (ex.isNew) continue; merged.push({ ...ex, isDeleted: true }); } }
    return merged;
  };

  // ── Subject CRUD ───────────────────────────────────────────────────────────
  const addSubject = () => { setSubjects(p => [...p, { id: -Date.now(), name: `נושא תכנון ${p.length + 1}`, isActive: true, isExpanded: true, steps: [], subContractsLink: [], isNew: true }]); dirty(); };
  const updateSubject = (id: number, field: string, val: any) => { setSubjects(p => p.map(s => s.id === id ? { ...s, [field]: val, isModified: true } : s)); dirty(); };
  const deleteSubject = async (id: number) => {
    const yes = await openConfirm(`נושא חדש שטרם נשמר יוסר מהרשימה. נושא שמור יימחק בשרת — יחד עם כל השלבים והמשימות תחתיו.\n\nלאשר מחיקה?`, 'מחיקת נושא תכנון');
    if (!yes) return;
    const subject = subjects.find(s => s.id === id); if (!subject) return;
    if (isTempId(subject.id) || subject.isNew) { setSubjects(p => p.filter(s => s.id !== id)); dirty(); return; }
    try {
      const ok = await deletePlanningSubject(id);
      if (!ok) { showWarning('נושא התכנון לא נמצא בשרת (ייתכן שכבר נמחק).'); return; }
      setSubjects(p => p.filter(s => s.id !== id));
      setDeletedIds(p => ({ ...p, subjectIds: p.subjectIds.filter(x => x !== id) }));
    } catch (e) { setMessageBox({ isOpen: true, title: 'שגיאה במחיקה', message: e instanceof Error ? e.message : 'שגיאה לא ידועה', type: 'alert' }); }
  };

  // ── Step CRUD ──────────────────────────────────────────────────────────────
  const addStep = (subjectId: number) => {
    const today = todayIso();
    setSubjects(p => p.map(s => s.id !== subjectId ? s : {
      ...s, steps: [...s.steps, {
        id: -Date.now(), PlanningSubjectID: subjectId,
        name: `שלב ${s.steps.filter(st => !st.isDeleted).length + 1}`,
        orderNum: s.steps.filter(st => !st.isDeleted).length + 1,
        percentage: 0, workHours: 0, workDays: 0, duration: 1,
        dependsOnStepId: false, employees: [], startDate: today, endDate: today,
        statusId: getDefaultId(statusOptions), urgencyId: getDefaultId(urgencyOptions),
        isActive: true, isExpanded: false, tasks: [], isNew: true, attachments: [],
      }],
    }));
    dirty();
  };

  const updateStep = (subjectId: number, stepId: number, field: string, val: any) => {
    const subject = subjects.find(s => s.id === subjectId); if (!subject) return;
    if (field === 'percentage') {
      const newPct = Math.max(0, Math.min(100, Number(val)));
      const otherSum = subject.steps.filter((x: PlanningStep) => x.id !== stepId && !x.isDeleted).reduce((a: number, x: PlanningStep) => a + x.percentage, 0);
      if (otherSum + newPct > 100) { setMessageBox({ isOpen: true, title: 'אזהרה', message: `סה"כ אחוזים לא יכול לעבור 100%. כרגע: ${(otherSum + newPct).toFixed(1)}%`, type: 'warning' }); return; }
    }
    setSubjects(prev => prev.map(s => s.id !== subjectId ? s : {
      ...s, steps: s.steps.map((st: PlanningStep) => {
        if (st.id !== stepId) return st;
        if (field === 'workHours') { const h = Math.max(0, Number(val)); return applyStepWorkHoursToTasks(st, h, WORK_HOURS_PER_DAY); }
        if (field === 'workDays')  { const d = Math.max(0, Number(val)); return applyStepWorkHoursToTasks(st, d * WORK_HOURS_PER_DAY, WORK_HOURS_PER_DAY); }
        if (field === 'duration')  return { ...st, duration: Math.max(1, Math.floor(Number(val))), isModified: true };
        if (field === 'percentage') return { ...st, percentage: Math.max(0, Math.min(100, Number(val))), isModified: true };
        return { ...st, [field]: val, isModified: true };
      }),
    }));
    dirty();
  };

  const updateStepBatch = (subjectId: number, stepId: number, fields: Partial<PlanningStep>) => {
    setSubjects(prev => prev.map(s => {
      if (s.id !== subjectId) return s;
      const oldById = new Map(s.steps.map(st => [st.id, st]));
      let updatedSteps = s.steps.map((st: PlanningStep) => st.id !== stepId ? st : { ...st, ...fields, isModified: true });
      const vis = updatedSteps.filter((st: PlanningStep) => !st.isDeleted);
      const ci = vis.findIndex((st: PlanningStep) => st.id === stepId);
      if (ci !== -1) {
        let prevEnd = toInputDate(vis[ci].endDate);
        if (prevEnd) {
          const cascade = new Map<number, { startDate: string; endDate: string }>();
          for (let i = ci + 1; i < vis.length; i++) {
            if (!(vis[i].dependsOnStepId ?? false)) break;
            const ns = addDays(prevEnd, 1), ne = addDays(ns, Math.max(1, Math.floor(Number(vis[i].duration))) - 1);
            cascade.set(vis[i].id, { startDate: ns, endDate: ne }); prevEnd = ne;
          }
          if (cascade.size > 0) updatedSteps = updatedSteps.map((st: PlanningStep) => { const p = cascade.get(st.id); return p ? { ...st, ...p, isModified: true } : st; });
        }
      }
      const finalSteps = updatedSteps.map((st: PlanningStep) => {
        const old = oldById.get(st.id); if (!old) return st;
        if (toInputDate(old.startDate) === toInputDate(st.startDate) && toInputDate(old.endDate) === toInputDate(st.endDate)) return st;
        return { ...st, tasks: refitTasksForStepBounds(st), isModified: true };
      });
      return { ...s, steps: finalSteps };
    }));
    dirty();
  };

  const handleStepStartDateWithDependency = async (subjectId: number, stepId: number, newStart: string, prevStep: PlanningStep) => {
    const prevStart = toInputDate(prevStep.startDate), prevEnd = toInputDate(prevStep.endDate);
    if (newStart < prevStart) { showWarning(`לא ניתן להתחיל לפני תאריך ההתחלה של השלב הקודם (${prevStart.split('-').reverse().join('/')})`); return; }
    if (newStart <= prevEnd) {
      const newPrevEnd = addDays(newStart, -1);
      const yes = await openConfirm(`תאריך ההתחלה החדש (${newStart.split('-').reverse().join('/')}) נמצא בתוך טווח השלב הקודם.\n\nהאם לקצר את השלב הקודם עד ${newPrevEnd.split('-').reverse().join('/')}?`);
      if (!yes) return;
      updateStepBatch(subjectId, prevStep.id, { endDate: newPrevEnd, duration: Math.max(1, dateDiffDays(prevStart, newPrevEnd) + 1) });
    }
    const curStep = subjects.find(s => s.id === subjectId)?.steps.find(st => st.id === stepId); if (!curStep) return;
    updateStepBatch(subjectId, stepId, { startDate: newStart, endDate: addDays(newStart, curStep.duration - 1) });
  };

  const deleteStep = (subjectId: number, stepId: number) => {
    setSubjects(p => p.map(s => s.id !== subjectId ? s : {
      ...s, steps: s.steps.flatMap(st => {
        if (st.id !== stepId) return [st];
        if (isTempId(st.id) || st.isNew) return [];
        trackDel('stepIds', stepId); return [{ ...st, isDeleted: true }];
      }),
    })); dirty();
  };
  const toggleStep = (subjectId: number, stepId: number) =>
    setSubjects(p => p.map(s => s.id !== subjectId ? s : { ...s, steps: s.steps.map(st => st.id !== stepId ? st : { ...st, isExpanded: !st.isExpanded }) }));

  const reorderSteps = (subjectId: number, newSteps: PlanningStep[]) => {
    const subject = subjects.find(s => s.id === subjectId); if (!subject) return;
    const oldVisible = subject.steps.filter(st => !st.isDeleted);
    const reassigned = newSteps.map((st, idx) => {
      const oldIdx = oldVisible.findIndex(o => o.id === st.id);
      const prevChanged = idx === 0 ? oldIdx !== 0 : newSteps[idx - 1].id !== (oldIdx > 0 ? oldVisible[oldIdx - 1].id : null);
      return { ...st, orderNum: idx + 1, dependsOnStepId: prevChanged ? false : st.dependsOnStepId, isModified: true };
    });
    setSubjects(p => p.map(s => s.id !== subjectId ? s : { ...s, steps: reassigned })); dirty();
  };

  const reorderTasks = (subjectId: number, stepId: number, newTasks: PlanningTask[]) => {
    setSubjects(p => p.map(s => s.id !== subjectId ? s : {
      ...s, steps: s.steps.map(st => st.id !== stepId ? st : { ...st, tasks: newTasks.map((t, i) => ({ ...t, orderNum: i + 1, dependsOnTaskId: false, isModified: true })) }),
    })); dirty();
  };

  // ── Task CRUD ──────────────────────────────────────────────────────────────
  const addTask = (subjectId: number, stepId: number) => {
    const step = subjects.find(s => s.id === subjectId)?.steps.find(st => st.id === stepId);
    setSubjects(p => p.map(s => s.id !== subjectId ? s : {
      ...s, steps: s.steps.map(st => st.id !== stepId ? st : {
        ...st, isExpanded: true,
        tasks: [...st.tasks, {
          id: -Date.now(), PlanningStepID: stepId,
          name: `משימה ${st.tasks.filter(t => !t.isDeleted).length + 1}`,
          orderNum: st.tasks.filter(t => !t.isDeleted).length + 1,
          percentage: 0, workHours: 0, workDays: 0, duration: step ? Math.max(1, step.duration) : 1,
          dependsOnTaskId: false, employees: [],
          startDate: step ? toInputDate(step.startDate) || todayIso() : todayIso(),
          endDate:   step ? toInputDate(step.endDate)   || todayIso() : todayIso(),
          statusId: getDefaultId(statusOptions), urgencyId: getDefaultId(urgencyOptions),
          isActive: true, isNew: true, attachments: [],
        }],
      }),
    })); dirty();
  };

  const updateTask = async (subjectId: number, stepId: number, taskId: number, field: string, val: any) => {
    const step = subjects.find(s => s.id === subjectId)?.steps.find(st => st.id === stepId); if (!step) return;
    let updatedStepHours: number | null = null;
    let nextH: number | null = null, nextD: number | null = null, nextPct: number | null = null;
    if (field === 'workHours') {
      const newH = Math.max(0, Number(val));
      const otherH = step.tasks.filter(x => x.id !== taskId && !x.isDeleted).reduce((a, x) => a + x.workHours, 0);
      if (otherH + newH > step.workHours) {
        const yes = await openConfirm(`סה"כ השעות במשימות (${(otherH + newH).toFixed(2)}) גדול משעות השלב (${step.workHours}).\n\nהאם לעדכן את שעות השלב?`);
        if (!yes) return; updatedStepHours = otherH + newH;
      }
      nextH = newH; nextD = newH / WORK_HOURS_PER_DAY;
      nextPct = (updatedStepHours ?? step.workHours) > 0 ? (newH / (updatedStepHours ?? step.workHours)) * 100 : 0;
    }
    if (field === 'workDays') {
      const newD = Math.max(0, Number(val)), newH = newD * WORK_HOURS_PER_DAY;
      const otherH = step.tasks.filter(x => x.id !== taskId && !x.isDeleted).reduce((a, x) => a + x.workHours, 0);
      if (otherH + newH > step.workHours) {
        const yes = await openConfirm(`סה"כ השעות במשימות (${(otherH + newH).toFixed(2)}) גדול משעות השלב (${step.workHours}).\n\nהאם לעדכן את שעות השלב?`);
        if (!yes) return; updatedStepHours = otherH + newH;
      }
      nextH = newH; nextD = newD;
      nextPct = (updatedStepHours ?? step.workHours) > 0 ? (newH / (updatedStepHours ?? step.workHours)) * 100 : 0;
    }
    if (field === 'percentage') {
      const newPct = Math.max(0, Math.min(100, Number(val)));
      const otherSum = step.tasks.filter(x => x.id !== taskId && !x.isDeleted).reduce((a, x) => a + x.percentage, 0);
      if (otherSum + newPct > 100) { setMessageBox({ isOpen: true, title: 'אזהרה', message: `סה"כ אחוזים לא יכול לעבור 100%. כרגע: ${(otherSum + newPct).toFixed(1)}%`, type: 'warning' }); return; }
      nextPct = newPct; nextH = (step.workHours * newPct) / 100; nextD = nextH / WORK_HOURS_PER_DAY;
    }
    setSubjects(p => p.map(s => s.id !== subjectId ? s : {
      ...s, steps: s.steps.map(st => st.id !== stepId ? st : {
        ...st, ...(updatedStepHours !== null ? { workHours: updatedStepHours, workDays: updatedStepHours / WORK_HOURS_PER_DAY } : {}),
        tasks: st.tasks.map(t => {
          if (t.id !== taskId) return t;
          if (field === 'workHours') return { ...t, workHours: nextH ?? t.workHours, workDays: nextD ?? t.workDays, percentage: nextPct ?? t.percentage, isModified: !t.isNew };
          if (field === 'workDays')  return { ...t, workDays: nextD ?? t.workDays, workHours: nextH ?? t.workHours, percentage: nextPct ?? t.percentage, isModified: !t.isNew };
          if (field === 'percentage') return { ...t, percentage: nextPct ?? t.percentage, workHours: nextH ?? t.workHours, workDays: nextD ?? t.workDays, isModified: !t.isNew };
          return { ...t, [field]: val, isModified: !t.isNew };
        }),
      }),
    })); dirty();
  };

  const deleteTask = (subjectId: number, stepId: number, taskId: number) => {
    setSubjects(p => p.map(s => s.id !== subjectId ? s : {
      ...s, steps: s.steps.map(st => st.id !== stepId ? st : {
        ...st, tasks: st.tasks.flatMap(t => { if (t.id !== taskId) return [t]; if (isTempId(t.id) || t.isNew) return []; trackDel('taskIds', taskId); return [{ ...t, isDeleted: true }]; }),
      }),
    })); dirty();
  };

  // ── Attachments ────────────────────────────────────────────────────────────
  const saveStepAttachments = (subjectId: number, stepId: number, attachments: PlanningAttachment[]) => {
    const normalized = attachments.map(a => normalizePlanningAttachment(a, 'step', stepId));
    setSubjects(p => p.map(s => s.id !== subjectId ? s : {
      ...s,
      steps: s.steps.map(st => st.id !== stepId ? st : { ...st, attachments: normalized, isModified: true }),
    }));
    dirty();
  };
  const saveTaskAttachments = (subjectId: number, stepId: number, taskId: number, attachments: PlanningAttachment[]) => {
    const normalized = attachments.map(a => normalizePlanningAttachment(a, 'task', taskId));
    setSubjects(p => p.map(s => s.id !== subjectId ? s : {
      ...s,
      steps: s.steps.map(st => st.id !== stepId ? st : {
        ...st,
        tasks: st.tasks.map(t => t.id !== taskId ? t : { ...t, attachments: normalized, isModified: true }),
      }),
    }));
    dirty();
  };

  // ── Employees ──────────────────────────────────────────────────────────────
  const saveStepEmployees = (subjectId: number, stepId: number, emps: EmployeeLink[], scope?: { stageHours: number; hoursPerDay: number }) => {
    const nextHours = scope?.stageHours, nextHPD = scope?.hoursPerDay && scope.hoursPerDay > 0 ? scope.hoursPerDay : WORK_HOURS_PER_DAY;
    setSubjects(p => p.map(s => s.id !== subjectId ? s : {
      ...s, steps: s.steps.map(st => {
        if (st.id !== stepId) return st;
        const we = { ...st, employees: emps };
        if (nextHours == null || !Number.isFinite(nextHours)) return we;
        return { ...we, workHours: Math.max(0, nextHours), workDays: Math.max(0, nextHours) / nextHPD, isModified: !st.isNew };
      }),
    })); dirty();
  };
  const saveTaskEmployees = (subjectId: number, stepId: number, taskId: number, emps: EmployeeLink[], scope?: { stageHours: number; hoursPerDay: number }): boolean => {
    const step = subjects.find(s => s.id === subjectId)?.steps.find(st => st.id === stepId); if (!step) return false;
    const nextHours = scope?.stageHours;
    if (nextHours != null && Number.isFinite(nextHours)) {
      const other = step.tasks.filter(t => t.id !== taskId && !t.isDeleted).reduce((s, t) => s + (t.workHours ?? 0), 0);
      if (other + nextHours > step.workHours) { showWarning(`לא ניתן לעדכן שעות משימה: סה"כ שעות המשימות (${(other + nextHours).toFixed(2)}) גדול משעות השלב (${step.workHours}).`); return false; }
    }
    const nextHPD = scope?.hoursPerDay && scope.hoursPerDay > 0 ? scope.hoursPerDay : WORK_HOURS_PER_DAY;
    setSubjects(p => p.map(s => s.id !== subjectId ? s : {
      ...s, steps: s.steps.map(st => st.id !== stepId ? st : {
        ...st, tasks: st.tasks.map(t => {
          if (t.id !== taskId) return t;
          const we = { ...t, employees: emps };
          if (nextHours == null || !Number.isFinite(nextHours)) return we;
          return { ...we, workHours: Math.max(0, nextHours), workDays: Math.max(0, nextHours) / nextHPD, percentage: st.workHours > 0 ? (Math.max(0, nextHours) / st.workHours) * 100 : 0, isModified: !t.isNew };
        }),
      }),
    })); dirty(); return true;
  };

  const getEmpModalProps = () => {
    if (!empModal) return null;
    const { type, subjectId, stepId, taskId } = empModal;
    const step = subjects.find(s => s.id === subjectId)?.steps.find(st => st.id === stepId); if (!step) return null;
    if (type === 'step') return { itemType: 'stage' as const, stageName: step.name, stageDuration: step.duration, stageHours: step.workHours, statusId: step.statusId, initialEmployees: step.employees.filter(e => !e.isDeleted), onSave: (emps: EmployeeLink[], scope?: any) => saveStepEmployees(subjectId, stepId, emps, scope) };
    const task = step.tasks.find(t => t.id === taskId); if (!task) return null;
    return { itemType: 'task' as const, stageName: task.name, stageDuration: task.duration, stageHours: task.workHours, statusId: task.statusId, initialEmployees: task.employees.filter(e => !e.isDeleted), onSave: (emps: EmployeeLink[], scope?: any) => saveTaskEmployees(subjectId, stepId, taskId!, emps, scope) };
  };
  const empModalProps = empModal ? getEmpModalProps() : null;

  const handleSave = async () => {
    setSaving(true); setSaveError(null);
    try { await savePlanningHierarchy(subjects, projectId!); setSaveSuccess(true); setIsDirty(false); setDeletedIds({ subjectIds: [], stepIds: [], taskIds: [] }); setTimeout(() => setSaveSuccess(false), 3000); }
    catch { setSaveError('שגיאה בשמירה'); } finally { setSaving(false); }
  };

  const handleImport = async ({ templates: toImport, startDateByTemplateId }: ImportPlanningSubjectsPayload) => {
    if (!toImport.length) return;
    for (const t of toImport) { if (!startDateByTemplateId[t.id]?.trim()) { showWarning('נא לבחור תאריך התחלה לכל תבנית שנבחרה.'); return; } }
    const sIds: number[] = [], tIds: number[] = [];
    for (const tpl of toImport) for (const st of tpl.steps ?? []) { if (st.id > 0) sIds.push(st.id); for (const tt of st.tasks ?? []) { if (tt.id > 0) tIds.push(tt.id); } }
    let templateEmployees: PlanningTemplateEmployeeLinksMaps = EMPTY_PLANNING_TEMPLATE_EMPLOYEE_LINKS;
    if (sIds.length || tIds.length) { try { templateEmployees = await getPlanningTemplateEmployeeLinks(sIds, tIds); } catch (e) { console.error(e); showWarning('לא ניתן לטעון עובדים מהתבנית; הייבוא ימשיך בלי שיוך עובדים.'); } }
    const built = buildPlanningSubjectsFromImportTemplates(toImport, startDateByTemplateId, getDefaultId(statusOptions), getDefaultId(urgencyOptions), templateEmployees);
    if (!built) { showWarning('לא ניתן ליצור את הנושאים מהתבנית. בדקו תאריכי התחלה ותוכן התבנית.'); return; }
    setSubjects(prev => normalizeSubjectAttachments([...prev, ...built]));
    dirty();
  };

  return (
    <div className="dark-surface space-y-2" dir="rtl">
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">סה"כ:</span>
            <span className="inline-flex items-center justify-center px-2 py-0.5 bg-emerald-500 text-white rounded-full text-xs font-bold min-w-[22px]">{subjects.length}</span>
            <span className="text-xs text-gray-400">נושאים</span>
          </div>
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש נושא / שלב / משימה..."
                className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 dark:placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"/>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setOpenImport(true)} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 rounded-lg transition-colors border border-gray-300 dark:border-gray-600 font-medium">
              <Plus size={16}/><span>ייבוא נושא תכנון</span>
            </button>
            {saveError   && <span className="flex items-center gap-1 text-red-600 text-sm"><AlertCircle size={14}/>{saveError}</span>}
            {saveSuccess && <span className="flex items-center gap-1 text-emerald-600 text-sm font-medium"><CheckCircle size={14}/>נשמר!</span>}
            {isDirty && <span className="text-xs text-orange-500 font-semibold">● שינויים שלא נשמרו</span>}
            {isDirty && (
              <button type="button" onClick={() => void handleCancelChanges()} disabled={saving || reloadPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {reloadPending ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"/> : <RotateCcw size={16}/>}
                בטל שינויים
              </button>
            )}
            <button onClick={handleSave} disabled={saving || reloadPending || !isDirty}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors border font-medium ${saving ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 cursor-not-allowed' : saveSuccess ? 'bg-emerald-500 text-white border-emerald-600' : !isDirty ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 border-gray-300 dark:border-gray-600 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600'}`}>
              {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>שומר...</> : <><Save size={16}/>שמור הכל</>}
            </button>
          </div>
        </div>
      </div>

      {filtered.map(subject => (
        <SubjectBlock key={subject.id} subject={subject} focusedStepId={focusedStepId}
          statusOptions={statusOptions} urgencyOptions={urgencyOptions}
          onUpdateSubject={updateSubject} onDeleteSubject={deleteSubject}
          onAddStep={addStep} onUpdateStep={updateStep} onUpdateStepBatch={updateStepBatch}
          onDeleteStep={deleteStep} onToggleStep={toggleStep} onReorderSteps={reorderSteps}
          onAddTask={addTask} onUpdateTask={updateTask} onDeleteTask={deleteTask} onReorderTasks={reorderTasks}
          onOpenStepEmployees={stepId => setEmpModal({ type: 'step', subjectId: subject.id, stepId })}
          onOpenTaskEmployees={(stepId, taskId) => setEmpModal({ type: 'task', subjectId: subject.id, stepId, taskId })}
          onOpenSubContracts={() => setSubModal({ subjectId: subject.id, name: subject.name })}
          onOpenStepAttachments={(stepId, stepName) => setAttachModal({ entityType: 'step', entityId: stepId, entityName: stepName, subjectId: subject.id, stepId })}
          onOpenTaskAttachments={(stepId, taskId, taskName) => setAttachModal({ entityType: 'task', entityId: taskId, entityName: taskName, subjectId: subject.id, stepId, taskId })}
          onWarn={showWarning} onConfirm={openConfirm} allSubjects={subjects}
          handleStepStartDateWithDependency={handleStepStartDateWithDependency}
        />
      ))}

      <button onClick={addSubject} className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all">
        <Plus size={15}/> הוסף נושא תכנון חדש
      </button>

      {empModal && empModalProps && (
        <LinkEmployeesToStageModal
          itemType={empModalProps.itemType} stageName={empModalProps.stageName}
          stageDuration={empModalProps.stageDuration} stageHours={empModalProps.stageHours}
          statusId={empModalProps.statusId} hoursPerDay={WORK_HOURS_PER_DAY}
          initialEmployees={empModalProps.initialEmployees}
          onClose={() => setEmpModal(null)}
          onSave={(emps, scope) => { const ok = empModalProps.onSave(emps, scope); if (ok === false) return false; setEmpModal(null); return true; }}
        />
      )}

      {subModal && (
        <SubcontractsModal subjectId={subModal.subjectId} subjectName={subModal.name}
          linkedIds={subjects.find(s => s.id === subModal.subjectId)?.subContractsLink?.filter(l => !l.isDeleted) ?? []}
          onSave={items => { setSubjects(p => p.map(s => s.id === subModal.subjectId ? { ...s, subContractsLink: mergeSubContractLinks(s.subContractsLink ?? [], items), isModified: true } : s)); dirty(); }}
          onClose={() => setSubModal(null)}
          subContractsOptions={subContractsOptions}
          usedSubContractIds={new Set(subjects.filter(s => s.id !== subModal.subjectId && !s.isDeleted).flatMap(s => (s.subContractsLink ?? []).filter(l => !l.isDeleted).map(l => l.id)))}
        />
      )}

      {attachModal && (
        <AttachmentsModal
          entityType={attachModal.entityType} entityId={attachModal.entityId} entityName={attachModal.entityName}
          employees={[]}
          initialAttachments={(() => {
            const step = subjects.find(s => s.id === attachModal.subjectId)?.steps.find(st => st.id === attachModal.stepId);
            if (!step) return [];
            if (attachModal.entityType === 'step') return step.attachments ?? [];
            return step.tasks.find(t => t.id === attachModal.taskId)?.attachments ?? [];
          })()}
          onSave={atts => { if (attachModal.entityType === 'step') saveStepAttachments(attachModal.subjectId, attachModal.stepId, atts); else saveTaskAttachments(attachModal.subjectId, attachModal.stepId, attachModal.taskId!, atts); }}
          onClose={() => setAttachModal(null)}
        />
      )}

      {openImport && <ImportSubjectTemplatesModal projectId={projectId!} onImport={handleImport} onClose={() => setOpenImport(false)}/>}

      <MessageBox isOpen={messageBox.isOpen} onClose={closeMessageBox}
        title={messageBox.title} message={messageBox.message} type={messageBox.type}
        confirmText={messageBox.confirmText ?? 'אישור'} cancelText={messageBox.cancelText ?? 'ביטול'}
        showCancel={messageBox.showCancel} onConfirm={messageBox.onConfirm} onCancel={messageBox.onCancel}/>
    </div>
  );
}

// ─── SubjectBlock ─────────────────────────────────────────────────────────────
function SubjectBlock({
  subject, focusedStepId, statusOptions, urgencyOptions,
  onUpdateSubject, onDeleteSubject,
  onAddStep, onUpdateStep, onUpdateStepBatch, onDeleteStep, onToggleStep, onReorderSteps,
  onAddTask, onUpdateTask, onDeleteTask, onReorderTasks,
  onOpenStepEmployees, onOpenTaskEmployees, onOpenSubContracts,
  onOpenStepAttachments, onOpenTaskAttachments,
  onWarn, onConfirm, allSubjects, handleStepStartDateWithDependency,
}: {
  subject: PlanningSubject; focusedStepId: number | null;
  statusOptions: SystemTable[]; urgencyOptions: SystemTable[];
  onUpdateSubject: (id: number, field: string, val: any) => void;
  onDeleteSubject: (id: number) => void;
  onAddStep: (subjectId: number) => void;
  onUpdateStep: (subjectId: number, stepId: number, field: string, val: any) => void;
  onUpdateStepBatch: (subjectId: number, stepId: number, fields: Partial<PlanningStep>) => void;
  onDeleteStep: (subjectId: number, stepId: number) => void;
  onToggleStep: (subjectId: number, stepId: number) => void;
  onReorderSteps: (subjectId: number, newSteps: PlanningStep[]) => void;
  onAddTask: (subjectId: number, stepId: number) => void;
  onUpdateTask: (subjectId: number, stepId: number, taskId: number, field: string, val: any) => Promise<void>;
  onDeleteTask: (subjectId: number, stepId: number, taskId: number) => void;
  onReorderTasks: (subjectId: number, stepId: number, newTasks: PlanningTask[]) => void;
  onOpenStepEmployees: (stepId: number) => void;
  onOpenTaskEmployees: (stepId: number, taskId: number) => void;
  onOpenSubContracts: () => void;
  onOpenStepAttachments: (stepId: number, stepName: string) => void;
  onOpenTaskAttachments: (stepId: number, taskId: number, taskName: string) => void;
  onWarn: (msg: string) => void;
  onConfirm: (msg: string, title?: string) => Promise<boolean>;
  allSubjects: PlanningSubject[];
  handleStepStartDateWithDependency: (subjectId: number, stepId: number, newStart: string, prevStep: PlanningStep) => Promise<void>;
}) {
  const visibleSteps = subject.steps.filter(st => !st.isDeleted);
  const { getDragProps: getStepDragProps } = useDragDrop(visibleSteps, newSteps => onReorderSteps(subject.id, newSteps));

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-900/40">
        <button onClick={() => onUpdateSubject(subject.id, 'isExpanded', !subject.isExpanded)} className="p-1 text-amber-600 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/40 rounded-lg shrink-0">
          {subject.isExpanded ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}
        </button>
        <input type="text" value={subject.name} onChange={e => onUpdateSubject(subject.id, 'name', e.target.value)}
          className="flex-1 min-w-0 px-3 py-1.5 text-sm font-bold border-2 border-amber-300 dark:border-amber-700 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-amber-400"/>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${subject.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300'}`}>
          {subject.isActive ? 'פעיל' : 'לא פעיל'}
        </span>
        <label className="flex items-center gap-1.5 cursor-pointer shrink-0 text-xs text-gray-600">
          <input type="checkbox" checked={subject.isActive} onChange={() => onUpdateSubject(subject.id, 'isActive', !subject.isActive)} className="w-4 h-4 accent-emerald-500"/>פעיל
        </label>
        <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200 px-2 py-1 rounded-full font-semibold shrink-0">{visibleSteps.length} שלבים</span>
        <button onClick={onOpenSubContracts}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-200 dark:hover:bg-indigo-900/60 rounded-lg text-xs font-bold transition-all shrink-0">
          <Link size={13}/>תתי חוזים
          <span className={`rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold ${(subject.subContractsLink?.filter(l => !l.isDeleted).length ?? 0) > 0 ? 'bg-indigo-600 text-white' : 'bg-indigo-200 text-indigo-200'}`}>
            {subject.subContractsLink?.filter(l => !l.isDeleted).length ?? 0}
          </span>
        </button>
        <button onClick={() => onDeleteSubject(subject.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg shrink-0"><Trash2 size={16}/></button>
      </div>

      {subject.isExpanded && (
        <div className="p-2 space-y-1 bg-gray-50 dark:bg-gray-900/40">
          <div className="overflow-x-auto pb-1">
            <div className="min-w-max space-y-2">
              {visibleSteps.length > 0 && <ColHeaders forStep/>}

              {visibleSteps.map((step, stepIdx) => {
                const prevStep = stepIdx > 0 ? visibleSteps[stepIdx - 1] : null;
                const isFirst  = stepIdx === 0;
                const isoDisp  = (d: string) => toInputDate(d).split('-').reverse().join('/');

                return (
                  <div key={step.id} data-step-id={step.id} data-subject-id={subject.id}
                    {...getStepDragProps(stepIdx)}
                    className={`transition-all ${focusedStepId === step.id ? 'bg-emerald-50 dark:bg-emerald-900/20 rounded-lg' : ''}`}>
                    <StepRow
                      step={step} isFirst={isFirst} subjectSteps={visibleSteps}
                      onChange={(f, v) => {
                        void (async () => {
                          // startDate on a dependent step
                          if (f === 'startDate' && !isFirst && step.dependsOnStepId && prevStep) {
                            const newStart = String(v);
                            const newEndPreview = addDays(newStart, Math.max(1, Math.floor(Number(step.duration))) - 1);
                            const yes = await onConfirm(
                              `עדכון תאריך התחלה לשלב "${step.name}" (תלוי ב־"${prevStep.name}"):\n\nתאריך התחלה המבוקש: ${isoDisp(newStart)}\nתאריך סיום (לפי משך נוכחי): ${isoDisp(newEndPreview)}\n\nאם התאריך חופף לשלב הקודם, תוצג שאלה נוספת לקיצור השלב הקודם.\n\nלהמשיך?`,
                              'עדכון תאריך שלב'
                            );
                            if (!yes) return;
                            await handleStepStartDateWithDependency(subject.id, step.id, newStart, prevStep);
                            return;
                          }
                          // dependsOnStepId toggle
                          if (f === 'dependsOnStepId' && prevStep) {
                            if (v === true) {
                              const prevEnd = toInputDate(prevStep.endDate), curStart = toInputDate(step.startDate);
                              let extra = '';
                              if (curStart && prevEnd && curStart < prevEnd) {
                                const ns = addDays(prevEnd, 1), nd = addDays(ns, Math.max(1, Math.floor(Number(step.duration))) - 1);
                                extra = `\n\nתאריכי השלב יותאמו אוטומטית:\nהתחלה: ${isoDisp(ns)}, סיום: ${isoDisp(nd)}.`;
                              }
                              const yes = await onConfirm(`להפוך את השלב "${step.name}" לתלוי בשלב הקודם "${prevStep.name}"?${extra}\n\nלאשר?`, 'תלות בשלב');
                              if (!yes) return;
                              if (curStart && prevEnd && curStart < prevEnd) {
                                const ns = addDays(prevEnd, 1), nd = addDays(ns, Math.max(1, Math.floor(Number(step.duration))) - 1);
                                onUpdateStepBatch(subject.id, step.id, { startDate: ns, endDate: nd });
                              }
                              onUpdateStep(subject.id, step.id, f, v); return;
                            }
                            const yes = await onConfirm(`לבטל את התלות של השלב "${step.name}" בשלב הקודם "${prevStep.name}"?\n\nלאשר?`, 'ביטול תלות בשלב');
                            if (!yes) return;
                            onUpdateStep(subject.id, step.id, f, v); return;
                          }
                          // startDate (non-dependent)
                          if (f === 'startDate') {
                            const newStart = String(v), curDur = Math.max(1, Math.floor(Number(step.duration)));
                            const newEnd = addDays(newStart, curDur - 1);
                            if (!isFirst && prevStep) {
                              const prevStart = toInputDate(prevStep.startDate), prevEnd = toInputDate(prevStep.endDate);
                              if (prevStart && newStart < prevStart) { onWarn(`לא ניתן להתחיל לפני תאריך ההתחלה של השלב הקודם (${isoDisp(prevStart)})`); return; }
                              if (prevStart && prevEnd && newStart <= prevEnd) {
                                const newPrevEnd = addDays(newStart, -1);
                                const yes = await onConfirm(`תאריך ההתחלה החדש (${isoDisp(newStart)}) נמצא בתוך טווח השלב הקודם ("${prevStep.name}").\n\nהאם לקצר את השלב הקודם עד ${isoDisp(newPrevEnd)}?`, 'קיצור שלב קודם');
                                if (!yes) return;
                                onUpdateStepBatch(subject.id, prevStep.id, { endDate: newPrevEnd, duration: Math.max(1, dateDiffDays(prevStart, newPrevEnd) + 1) });
                                onUpdateStepBatch(subject.id, step.id, { startDate: newStart, endDate: newEnd }); return;
                              }
                            }
                            const yes = await onConfirm(`לעדכן את השלב "${step.name}"?\n\nתאריך התחלה: ${isoDisp(newStart)}\nתאריך סיום: ${isoDisp(newEnd)} (משך ${curDur} ימים)\n\nלאשר?`, 'עדכון תאריך התחלה');
                            if (!yes) return;
                            onUpdateStepBatch(subject.id, step.id, { startDate: newStart, endDate: newEnd }); return;
                          }
                          // endDate
                          if (f === 'endDate') {
                            const endVal = String(v), start = toInputDate(step.startDate);
                            const newDur = start ? Math.max(1, dateDiffDays(start, endVal) + 1) : step.duration;
                            const cascadeNames: string[] = [];
                            for (let i = stepIdx + 1; i < visibleSteps.length; i++) { if (!(visibleSteps[i].dependsOnStepId ?? false)) break; cascadeNames.push(visibleSteps[i].name); }
                            let msg = `לעדכן את השלב "${step.name}"?\n\nתאריך סיום: ${isoDisp(endVal)}\nמשך השלב: ${newDur} ימים\n`;
                            if (cascadeNames.length) msg += `\nשלבים תלויים שיוזזו אוטומטית (יום אחרי סיום השלב הקודם):\n• ${cascadeNames.join('\n• ')}\n`;
                            msg += `\nלאשר?`;
                            const yes = await onConfirm(msg, 'עדכון תאריך סיום');
                            if (!yes) return;
                            onUpdateStepBatch(subject.id, step.id, { endDate: endVal, duration: newDur });
                            let prevEnd = endVal;
                            for (let i = stepIdx + 1; i < visibleSteps.length; i++) {
                              if (!(visibleSteps[i].dependsOnStepId ?? false)) break;
                              const ns = addDays(prevEnd, 1), ne = addDays(ns, Math.max(1, Math.floor(Number(visibleSteps[i].duration))) - 1);
                              onUpdateStepBatch(subject.id, visibleSteps[i].id, { startDate: ns, endDate: ne });
                              prevEnd = ne;
                            }
                            return;
                          }
                          // duration
                          if (f === 'duration') {
                            const newDur = Math.max(1, Math.floor(Number(v))), start = toInputDate(step.startDate);
                            const newEnd = start ? addDays(start, newDur - 1) : step.endDate;
                            const yes = await onConfirm(`לעדכן את משך השלב "${step.name}"?\n\nמשך: ${newDur} ימים\n${start ? `תאריך סיום חדש: ${isoDisp(newEnd)}\n` : ''}\nלאשר?`, 'עדכון משך שלב');
                            if (!yes) return;
                            onUpdateStepBatch(subject.id, step.id, { duration: newDur, endDate: newEnd }); return;
                          }
                          onUpdateStep(subject.id, step.id, f, v);
                        })();
                      }}
                      onDelete={() => onDeleteStep(subject.id, step.id)}
                      onToggle={() => onToggleStep(subject.id, step.id)}
                      onOpenEmployees={() => onOpenStepEmployees(step.id)}
                      onOpenAttachments={() => onOpenStepAttachments(step.id, step.name)}
                      statusOptions={statusOptions} urgencyOptions={urgencyOptions}
                      onWarn={onWarn} dragHandleProps={{}}
                    />

                    {step.isExpanded && (
                      <TasksBlock subject={subject} step={step}
                        statusOptions={statusOptions} urgencyOptions={urgencyOptions}
                        onAddTask={onAddTask} onUpdateTask={onUpdateTask}
                        onDeleteTask={onDeleteTask} onReorderTasks={onReorderTasks}
                        onOpenTaskEmployees={onOpenTaskEmployees}
                        onOpenTaskAttachments={onOpenTaskAttachments}
                        onWarn={onWarn} onConfirm={onConfirm}
                        onUpdateStepDuration={nd => onUpdateStepBatch(subject.id, step.id, { duration: nd, endDate: addDays(toInputDate(step.startDate), nd - 1) })}
                        onUpdateStepDateRange={(ns, ne, nd) => onUpdateStepBatch(subject.id, step.id, { startDate: ns, endDate: ne, duration: nd })}
                      />
                    )}
                  </div>
                );
              })}

              {visibleSteps.length > 0 && (
                <div className="border border-emerald-300 dark:border-emerald-900/50 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                  <div className="overflow-x-auto"><div className="min-w-max">
                    <div className="flex items-center gap-1.5 px-2 py-1">
                      <div className="w-5 shrink-0"/><div className="w-6 shrink-0"/><div className="w-10 shrink-0"/>
                      <div className="flex-1 text-right font-bold text-emerald-800 dark:text-emerald-300 text-xs">סה"כ</div>
                      <div className="w-16 shrink-0 text-center font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-900/40 rounded px-1 py-0.5 text-xs">{visibleSteps.reduce((s, st) => s + st.percentage, 0).toFixed(1)}%</div>
                      <div className="w-16 shrink-0 text-center font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-900/40 rounded px-1 py-0.5 text-xs">{visibleSteps.reduce((s, st) => s + st.workHours, 0).toFixed(1)}</div>
                      <div className="w-14 shrink-0 text-center font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-900/40 rounded px-1 py-0.5 text-xs">{visibleSteps.reduce((s, st) => s + st.workDays, 0).toFixed(1)}</div>
                      <div className="w-28 shrink-0 text-center text-gray-300 text-xs">-</div>
                      <div className="w-28 shrink-0 text-center text-gray-300 text-xs">-</div>
                      <div className="w-12 shrink-0"/><div className="w-16 shrink-0"/>
                      <div className="w-24 shrink-0"/><div className="w-20 shrink-0"/>
                      <div className="w-24 shrink-0"/><div className="w-24 shrink-0"/>
                      <div className="w-8 shrink-0"/><div className="w-8 shrink-0"/>
                    </div>
                  </div></div>
                </div>
              )}
            </div>
          </div>
          <button onClick={() => onAddStep(subject.id)}
            className="w-full py-1.5 border border-dashed border-blue-400 dark:border-blue-700 text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-xs font-semibold transition-all">
            + הוסף שלב
          </button>
        </div>
      )}
    </div>
  );
}

// ─── TasksBlock ────────────────────────────────────────────────────────────────
function TasksBlock({
  subject, step, statusOptions, urgencyOptions,
  onAddTask, onUpdateTask, onDeleteTask, onReorderTasks,
  onOpenTaskEmployees, onOpenTaskAttachments,
  onWarn, onConfirm, onUpdateStepDuration, onUpdateStepDateRange,
}: {
  subject: PlanningSubject; step: PlanningStep;
  statusOptions: SystemTable[]; urgencyOptions: SystemTable[];
  onAddTask: (subjectId: number, stepId: number) => void;
  onUpdateTask: (subjectId: number, stepId: number, taskId: number, field: string, val: any) => Promise<void>;
  onDeleteTask: (subjectId: number, stepId: number, taskId: number) => void;
  onReorderTasks: (subjectId: number, stepId: number, newTasks: PlanningTask[]) => void;
  onOpenTaskEmployees: (stepId: number, taskId: number) => void;
  onOpenTaskAttachments: (stepId: number, taskId: number, taskName: string) => void;
  onWarn: (msg: string) => void;
  onConfirm: (msg: string, title?: string) => Promise<boolean>;
  onUpdateStepDuration: (newDuration: number) => void;
  onUpdateStepDateRange: (newStart: string, newEnd: string, newDuration: number) => void;
}) {
  const visibleTasks = step.tasks.filter(t => !t.isDeleted);

  const computeCascadeTailEnd = (fromIdx: number, parentEnd: string): string => {
    let prevEnd = parentEnd;
    for (let i = fromIdx + 1; i < visibleTasks.length; i++) {
      if (!(visibleTasks[i].dependsOnTaskId ?? false)) break;
      prevEnd = addDays(addDays(prevEnd, 1), Math.max(1, Math.floor(Number(visibleTasks[i].duration))) - 1);
    }
    return prevEnd;
  };

  const laterIsoDate = (a: string, b: string) => (a >= b ? a : b);

  const cascadeForward = async (fromIdx: number, parentEnd: string): Promise<void> => {
    let prevEnd = parentEnd;
    for (let i = fromIdx + 1; i < visibleTasks.length; i++) {
      const t = visibleTasks[i];
      if (!(t.dependsOnTaskId ?? false)) break;
      const start = addDays(prevEnd, 1), end = addDays(start, Math.max(1, Math.floor(Number(t.duration))) - 1);
      await onUpdateTask(subject.id, step.id, t.id, 'startDate', start);
      await onUpdateTask(subject.id, step.id, t.id, 'endDate', end);
      prevEnd = end;
    }
  };

  const { getDragProps: getTaskDragProps } = useDragDrop(visibleTasks, newTasks => onReorderTasks(subject.id, step.id, newTasks));

  const handleConfirmStepDuration = async (nd: number): Promise<void> => {
    const yes = await onConfirm(`משך זמן המשימה (${nd} ימים) גדול ממשך זמן השלב (${step.duration} ימים).\n\nהאם להגדיל את משך זמן השלב ל-${nd} ימים?`);
    if (yes) onUpdateStepDuration(nd);
  };

  return (
    <div className="mr-6 mt-1 space-y-1 p-2 bg-purple-50 dark:bg-purple-900/15 rounded-xl border border-purple-200 dark:border-purple-900/40">
      {visibleTasks.length > 0 && (
        <>
          <ColHeaders/>
          {visibleTasks.map((task, taskIdx) => (
            <div key={task.id} {...getTaskDragProps(taskIdx)} className="transition-opacity">
              <TaskRow
                task={task} isFirst={taskIdx === 0} steps={subject.steps.filter(st => !st.isDeleted)}
                onChange={(f, v) => {
                  void (async () => {
                    const prevTask = taskIdx > 0 ? visibleTasks[taskIdx - 1] : null;
                    const stepStart = toInputDate(step.startDate), stepEnd = toInputDate(step.endDate);

                    const ensureStepRange = async (ts: string, te: string): Promise<boolean> => {
                      const ns = stepStart && ts < stepStart ? ts : stepStart;
                      const ne = stepEnd && te > stepEnd ? te : stepEnd;
                      if (!ns || !ne || (ns === stepStart && ne === stepEnd)) return true;
                      const yes = await onConfirm(`תאריך השלב יתעדכן: ${ns.split('-').reverse().join('/')} עד ${ne.split('-').reverse().join('/')}.\n\nלאשר?`, 'עדכון תאריכים');
                      if (!yes) return false;
                      onUpdateStepDateRange(ns, ne, Math.max(1, dateDiffDays(ns, ne) + 1));
                      return true;
                    };

                    if (f === 'startDate' && taskIdx > 0 && (task.dependsOnTaskId ?? false) && prevTask) {
                      const prevStart = toInputDate(prevTask.startDate), prevEnd = toInputDate(prevTask.endDate);
                      const newStart = String(v);
                      if (newStart < prevStart) { onWarn(`לא ניתן להתחיל לפני תאריך ההתחלה של המשימה הקודמת (${prevStart.split('-').reverse().join('/')})`); return; }
                      if (newStart <= prevEnd) {
                        const newPrevEnd = addDays(newStart, -1);
                        const yes = await onConfirm(`תאריך ההתחלה החדש (${newStart.split('-').reverse().join('/')}) נמצא בתוך טווח המשימה הקודמת.\n\nהאם לקצר את המשימה הקודמת עד ${newPrevEnd.split('-').reverse().join('/')}?`);
                        if (!yes) return;
                        await onUpdateTask(subject.id, step.id, prevTask.id, 'endDate', newPrevEnd);
                        await onUpdateTask(subject.id, step.id, prevTask.id, 'duration', Math.max(1, dateDiffDays(prevStart, newPrevEnd) + 1));
                      }
                      const newEnd = addDays(newStart, Math.max(1, Math.floor(Number(task.duration))) - 1);
                      if (!await ensureStepRange(newStart, laterIsoDate(newEnd, computeCascadeTailEnd(taskIdx, newEnd)))) return;
                      await onUpdateTask(subject.id, step.id, task.id, 'startDate', newStart);
                      await onUpdateTask(subject.id, step.id, task.id, 'endDate', newEnd);
                      await cascadeForward(taskIdx, newEnd); return;
                    }

                    if (f === 'dependsOnTaskId' && v === true && prevTask) {
                      const curStart = toInputDate(task.startDate), prevEnd = toInputDate(prevTask.endDate);
                      let cascadeFrom: string | null = null;
                      if (curStart && prevEnd && curStart < prevEnd) {
                        const ns = addDays(prevEnd, 1), ne = addDays(ns, Math.max(1, Math.floor(Number(task.duration))) - 1);
                        if (!await ensureStepRange(ns, laterIsoDate(ne, computeCascadeTailEnd(taskIdx, ne)))) return;
                        await onUpdateTask(subject.id, step.id, task.id, 'startDate', ns);
                        await onUpdateTask(subject.id, step.id, task.id, 'endDate', ne);
                        cascadeFrom = ne;
                      }
                      await onUpdateTask(subject.id, step.id, task.id, f, v);
                      if (cascadeFrom) await cascadeForward(taskIdx, cascadeFrom); return;
                    }

                    if (f === 'startDate') {
                      const ns = String(v), ne = addDays(ns, Math.max(1, Math.floor(Number(task.duration))) - 1);
                      if (!await ensureStepRange(ns, laterIsoDate(ne, computeCascadeTailEnd(taskIdx, ne)))) return;
                      await onUpdateTask(subject.id, step.id, task.id, 'startDate', ns);
                      await onUpdateTask(subject.id, step.id, task.id, 'endDate', ne);
                      await cascadeForward(taskIdx, ne); return;
                    }

                    if (f === 'endDate') {
                      const endVal = String(v), start = toInputDate(task.startDate);
                      const newDur = start ? Math.max(1, dateDiffDays(start, endVal) + 1) : task.duration;
                      if (!await ensureStepRange(start || endVal, laterIsoDate(endVal, computeCascadeTailEnd(taskIdx, endVal)))) return;
                      await onUpdateTask(subject.id, step.id, task.id, 'endDate', endVal);
                      await onUpdateTask(subject.id, step.id, task.id, 'duration', newDur);
                      await cascadeForward(taskIdx, endVal); return;
                    }

                    if (f === 'duration') {
                      const nd = Math.max(1, Math.floor(Number(v))), start = toInputDate(task.startDate);
                      const ne = start ? addDays(start, nd - 1) : String(task.endDate ?? '');
                      if (!start || !ne) { await onUpdateTask(subject.id, step.id, task.id, 'duration', nd); await onUpdateTask(subject.id, step.id, task.id, 'endDate', task.endDate); return; }
                      if (!await ensureStepRange(start, laterIsoDate(ne, computeCascadeTailEnd(taskIdx, ne)))) return;
                      await onUpdateTask(subject.id, step.id, task.id, 'duration', nd);
                      await onUpdateTask(subject.id, step.id, task.id, 'endDate', ne);
                      await cascadeForward(taskIdx, ne); return;
                    }

                    await onUpdateTask(subject.id, step.id, task.id, f, v);
                  })();
                }}
                onDelete={() => onDeleteTask(subject.id, step.id, task.id)}
                onOpenEmployees={() => onOpenTaskEmployees(step.id, task.id)}
                onOpenAttachments={() => onOpenTaskAttachments(step.id, task.id, task.name)}
                statusOptions={statusOptions} urgencyOptions={urgencyOptions}
                onWarn={onWarn} stepDuration={step.duration}
                onConfirmStepDuration={handleConfirmStepDuration}
                dragHandleProps={{}}
              />
            </div>
          ))}

          {/* Totals row */}
          <div className="border border-purple-200 dark:border-purple-900/40 rounded-lg bg-purple-50 dark:bg-purple-900/15">
            <div className="overflow-x-auto"><div className="min-w-max">
              <div className="flex items-center gap-1.5 px-2 py-1">
                <div className="w-5 shrink-0"/>
                <div className="w-10 shrink-0 text-right font-bold text-purple-800 dark:text-purple-300 text-xs">סה"כ</div>
                <div className="flex-1"/>
                <div className="w-16 shrink-0 text-center font-bold text-purple-800 dark:text-purple-200 bg-purple-100 dark:bg-purple-900/40 rounded px-1 py-0.5 text-xs">{visibleTasks.reduce((s, t) => s + t.percentage, 0).toFixed(1)}%</div>
                <div className="w-16 shrink-0 text-center font-bold text-purple-800 dark:text-purple-200 bg-purple-100 dark:bg-purple-900/40 rounded px-1 py-0.5 text-xs">{visibleTasks.reduce((s, t) => s + t.workHours, 0).toFixed(1)}</div>
                <div className="w-14 shrink-0 text-center font-bold text-purple-800 dark:text-purple-200 bg-purple-100 dark:bg-purple-900/40 rounded px-1 py-0.5 text-xs">{visibleTasks.reduce((s, t) => s + t.workDays, 0).toFixed(1)}</div>
                <div className="w-28 shrink-0 text-center text-gray-300 text-xs">-</div>
                <div className="w-28 shrink-0 text-center text-gray-300 text-xs">-</div>
                <div className="w-12 shrink-0"/><div className="w-16 shrink-0"/>
                <div className="w-24 shrink-0"/><div className="w-20 shrink-0"/>
                <div className="w-24 shrink-0"/><div className="w-24 shrink-0"/>
                <div className="w-8 shrink-0"/><div className="w-8 shrink-0"/>
              </div>
            </div></div>
          </div>
        </>
      )}
      <button onClick={() => onAddTask(subject.id, step.id)}
        className="w-full py-1.5 border border-dashed border-purple-400 dark:border-purple-700 text-purple-600 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg text-xs font-semibold transition-all">
        + הוסף משימה
      </button>
    </div>
  );
}