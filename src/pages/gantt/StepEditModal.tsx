import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Plus, Trash2, Save, ChevronDown, ChevronRight, GripVertical, Users } from 'lucide-react';
import type {
  DependsOnStepData,
  PlanningStep,
  PlanningTask,
  SystemTable,
  TaskCardCascadeStage,
} from '../../Data/projectsData';
import { getDependsOnDataByIdAsync } from '../../services/taskService';
import MessageBox from '../shared/MessageBox';
import {
  addDays,
  applyStepScalarField,
  applyTaskScalarField,
  cascadeTasksFromParentEnd,
  computeCascadeTailEnd,
  dateDiffDays,
  employeeCountForStage,
  isoDisp,
  laterIsoDate,
  patchTaskFields,
  toInputDate,
  updateStepBatch,
  visibleTasks,
} from './planningStepDraftRules';

export type EditablePhase = PlanningStep;

export type StepEditSaveOptions = {
  cascadeStage?: TaskCardCascadeStage;
};

interface StepEditModalProps {
  step: PlanningStep | null;
  projectName?: string;
  isFirstStep: boolean;
  loading?: boolean;
  saving?: boolean;
  saveError?: string | null;
  loadError?: string | null;
  statusOptions: SystemTable[];
  urgencyOptions: SystemTable[];
  onClose: () => void;
  onSave: (updated: PlanningStep, options?: StepEditSaveOptions) => void | Promise<void>;
  onSyncDraft?: (step: PlanningStep) => void;
  onOpenStepEmployees?: (stepId: number) => void;
  onOpenTaskEmployees?: (stepId: number, taskId: number) => void;
}

const getDefaultId = (options: SystemTable[]) =>
  options.find(o => o.isDefault)?.id ?? options[0]?.id ?? 0;

/** Shared grid — must match StepFieldsRow / TaskFieldsRow column order (gap-1.5, px-2). */
const PLANNING_GRID_COLUMNS = {
  step: '20px 24px 40px minmax(140px,1fr) 4rem 4rem 3.5rem 7rem 7rem 3rem 4rem 6rem 6rem 6rem 2rem',
  task: '20px 40px minmax(140px,1fr) 4rem 4rem 3.5rem 7rem 7rem 3rem 4rem 6rem 6rem 6rem 2rem 2rem',
} as const;

const STEP_HEADER_LABELS = [
  '', '', 'מס׳', 'שם שלב', 'אחוז', 'שעות עבודה', 'ימי עבודה', 'תאריך התחלה', 'תאריך סיום',
  'משך זמן', 'תלוי שלב', 'עובדים', 'סטטוס', 'עדיפות', 'פעיל',
] as const;

const TASK_HEADER_LABELS = [
  '', 'מס׳', 'שם משימה', 'אחוז', 'שעות עבודה', 'ימי עבודה', 'תאריך התחלה', 'תאריך סיום',
  'משך זמן', 'תלוי משימה', 'עובדים', 'סטטוס', 'עדיפות', 'פעיל', '',
] as const;

const PLANNING_GRID_ROW = 'grid items-center gap-1.5 px-2 min-w-[1100px]';

function planningGridStyle(mode: keyof typeof PLANNING_GRID_COLUMNS): React.CSSProperties {
  return { gridTemplateColumns: PLANNING_GRID_COLUMNS[mode] };
}

let nextId = -Date.now();
const tempId = () => --nextId;

function DateInput({
  value, onChange, ringColor = 'focus-within:ring-blue-300', className = '', min,
}: {
  value: string;
  onChange: (v: string) => void;
  ringColor?: string;
  className?: string;
  min?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const toDisplay = (iso: string) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    if (!y || !m || !d) return iso;
    return `${d}/${m}/${y}`;
  };
  const openPicker = () => {
    const el = inputRef.current;
    if (!el) return;
    try { el.showPicker(); } catch { el.focus(); }
  };
  return (
    <div className={`relative flex items-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 overflow-hidden focus-within:ring-2 ${ringColor} ${className}`}>
      <div className="relative flex-1 min-w-0">
        <span className="block px-1.5 py-1.5 text-xs pointer-events-none select-none whitespace-nowrap overflow-hidden">
          {toDisplay(value) || <span className="text-gray-400">dd/mm/yy</span>}
        </span>
        <input
          ref={inputRef}
          type="date"
          value={value}
          min={min}
          onChange={e => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
        />
      </div>
      <button
        type="button"
        onClick={openPicker}
        className="shrink-0 px-1.5 py-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors border-r border-gray-200 dark:border-gray-600"
        tabIndex={-1}
        title="בחר תאריך"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </button>
    </div>
  );
}

function InlineSelect({
  value, options, onChange, width = 'w-24',
}: {
  value: number;
  options: SystemTable[];
  onChange: (v: number) => void;
  width?: string;
}) {
  const selectedOption = options.find(o => o.id === value);
  return (
    <select
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      className={`${width} px-1.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-indigo-300 shrink-0`}
      style={{ color: selectedOption?.color || undefined, borderColor: selectedOption?.color || undefined }}
    >
      {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
    </select>
  );
}

function ColHeaders({ forStep }: { forStep?: boolean }) {
  const mode = forStep ? 'step' : 'task';
  const labels = forStep ? STEP_HEADER_LABELS : TASK_HEADER_LABELS;
  return (
    <div
      className={`${PLANNING_GRID_ROW} py-1.5 rounded-lg text-[11px] font-bold text-gray-700 ${forStep ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-purple-100 dark:bg-purple-900/30'}`}
      style={planningGridStyle(mode)}
    >
      {labels.map((label, i) => (
        <div key={i} className="min-w-0 text-center truncate leading-tight px-0.5">{label}</div>
      ))}
    </div>
  );
}

function StepFieldsRow({
  step, isFirst, statusOptions, urgencyOptions, onChange, onToggle, onOpenEmployees, onWarn, startDateMin, dragHandleProps,
}: {
  step: PlanningStep;
  isFirst: boolean;
  statusOptions: SystemTable[];
  urgencyOptions: SystemTable[];
  onChange: (field: string, value: unknown) => void;
  onToggle: () => void;
  onOpenEmployees?: () => void;
  onWarn: (msg: string) => void;
  startDateMin?: string;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}) {
  const numInput = (field: string, val: number, min = 0, step2 = 1) => (
    <input
      type="number" min={min} step={step2} value={val}
      onChange={e => onChange(field, Number(e.target.value))}
      className="w-full px-1 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-center bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-300"
    />
  );

  const handleStartDateChange = (v: string) => {
    if (!v) return;
    onChange('startDate', v);
  };

  const handleEndDateChange = (v: string) => {
    if (!v) return;
    const start = toInputDate(step.startDate);
    if (start && v < start) { onWarn('תאריך סיום לא יכול להיות קטן מתאריך התחלה'); return; }
    onChange('endDate', v);
  };

  const handleDurationChange = (v: number) => {
    onChange('duration', Math.max(1, Math.floor(v)));
  };

  return (
    <div className="border border-blue-200 dark:border-blue-900/50 rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
      <div
        className={`${PLANNING_GRID_ROW} py-1 bg-blue-50 dark:bg-blue-900/20`}
        style={planningGridStyle('step')}
      >
        <div {...dragHandleProps} className="flex items-center justify-center cursor-grab text-gray-400 hover:text-gray-600">
          <GripVertical size={14} />
        </div>
        <div className="flex items-center justify-center">
          <button type="button" onClick={onToggle} className="p-1 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/40 rounded">
            {step.isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>
        <div className="min-w-0 text-center text-xs font-bold text-gray-500 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg py-1">{step.orderNum}</div>
        <input type="text" value={step.name} onChange={e => onChange('name', e.target.value)}
          className="min-w-0 w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-semibold bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-300" placeholder="שם שלב" />
        <div className="min-w-0 flex items-center gap-0.5">
          {numInput('percentage', step.percentage)}
          <span className="text-xs text-gray-400 shrink-0">%</span>
        </div>
        <div className="min-w-0">{numInput('workHours', step.workHours, 0, 0.5)}</div>
        <div className="min-w-0">{numInput('workDays', step.workDays, 0, 0.5)}</div>
        <div className="min-w-0">
          <DateInput value={toInputDate(step.startDate)} onChange={handleStartDateChange} ringColor="focus-within:ring-blue-300" className="w-full" min={startDateMin} />
        </div>
        <div className="min-w-0">
          <DateInput value={toInputDate(step.endDate)} onChange={handleEndDateChange} ringColor="focus-within:ring-blue-300" className="w-full" />
        </div>
        <div className="min-w-0">
          <input type="number" min={1} step={1} value={step.duration}
            onChange={e => handleDurationChange(Number(e.target.value))}
            className="w-full px-1 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-center bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-300" />
        </div>
        <div className="flex items-center justify-center">
          <input type="checkbox" checked={!isFirst && (step.dependsOnStepId ?? false)} disabled={isFirst}
            onChange={e => onChange('dependsOnStepId', e.target.checked)}
            className="w-4 h-4 accent-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
            title={isFirst ? 'שלב ראשון לא יכול להיות תלוי' : 'תלוי שלב'} />
        </div>
        <button type="button" onClick={onOpenEmployees}
          className="min-w-0 w-full flex items-center justify-center gap-1 px-1 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-bold whitespace-nowrap">
          <Users size={12} />עובדים
          <span className="bg-white text-blue-700 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">{employeeCountForStage(step)}</span>
        </button>
        <InlineSelect value={step.statusId} options={statusOptions} onChange={v => onChange('statusId', v)} width="w-full" />
        <InlineSelect value={step.urgencyId} options={urgencyOptions} onChange={v => onChange('urgencyId', v)} width="w-full" />
        <div className="flex items-center justify-center">
          <input type="checkbox" checked={step.isActive} onChange={() => onChange('isActive', !step.isActive)} className="w-4 h-4 accent-emerald-500" title="פעיל" />
        </div>
      </div>
    </div>
  );
}

function TaskFieldsRow({
  task, isFirst, stepDuration, statusOptions, urgencyOptions, onChange, onDelete, onOpenEmployees, onWarn, onConfirmStepDuration, dragHandleProps,
}: {
  task: PlanningTask;
  isFirst: boolean;
  stepDuration: number;
  statusOptions: SystemTable[];
  urgencyOptions: SystemTable[];
  onChange: (field: string, value: unknown) => void | Promise<void>;
  onDelete: () => void;
  onOpenEmployees?: () => void;
  onWarn: (msg: string) => void;
  onConfirmStepDuration: (newTaskDuration: number) => Promise<void>;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}) {
  const formatInputNumber = (value: number) => Number.isInteger(value) ? value : parseFloat(value.toFixed(2));

  const numInput = (field: string, val: number, min = 0, step2 = 1) => (
    <input type="number" min={min} step={step2} value={formatInputNumber(val)}
      onChange={e => onChange(field, Number(e.target.value))}
      className="w-full px-1 py-1 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-center bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-purple-300"/>
  );

  const handleStartDateChange = (v: string) => {
    if (!v) return;
    void onChange('startDate', v);
  };

  const handleEndDateChange = (v: string) => {
    if (!v) return;
    const start = toInputDate(task.startDate);
    if (start && v < start) { onWarn('תאריך סיום לא יכול להיות קטן מתאריך התחלה'); return; }
    void onChange('endDate', v);
  };

  const handleDurationChange = (v: number) => {
    void onChange('duration', Math.max(1, Math.floor(v)));
  };

  const empCount = task.employees.filter(e => !e.isDeleted).length;

  return (
    <div
      className={`${PLANNING_GRID_ROW} py-1 bg-white dark:bg-gray-800 rounded-lg border border-purple-100 dark:border-purple-900/40`}
      style={planningGridStyle('task')}
    >
      <div {...dragHandleProps} className="flex items-center justify-center cursor-grab text-gray-400 hover:text-gray-600">
        <GripVertical size={13} />
      </div>
      <div className="min-w-0 text-center text-xs font-bold text-gray-400">{task.orderNum}</div>
      <input type="text" value={task.name} onChange={e => onChange('name', e.target.value)}
        className="min-w-0 w-full px-2 py-1 border border-gray-200 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-purple-300" placeholder="שם משימה"/>
      <div className="min-w-0 flex items-center gap-0.5">
        {numInput('percentage', task.percentage)}
        <span className="text-xs text-gray-400 shrink-0">%</span>
      </div>
      <div className="min-w-0">{numInput('workHours', task.workHours, 0, 0.5)}</div>
      <div className="min-w-0">{numInput('workDays', task.workDays, 0, 0.5)}</div>
      <div className="min-w-0">
        <DateInput value={toInputDate(task.startDate)} onChange={handleStartDateChange} ringColor="focus-within:ring-purple-300" className="w-full"/>
      </div>
      <div className="min-w-0">
        <DateInput value={toInputDate(task.endDate)} onChange={handleEndDateChange} ringColor="focus-within:ring-purple-300" className="w-full"/>
      </div>
      <div className="min-w-0">
        <input type="number" min={1} step={1} value={task.duration}
          onChange={e => handleDurationChange(Number(e.target.value))}
          className="w-full px-1 py-1 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-center bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-purple-300"/>
      </div>
      <div className="flex items-center justify-center">
        <input type="checkbox" checked={!isFirst && (task.dependsOnTaskId ?? false)} disabled={isFirst}
          onChange={e => onChange('dependsOnTaskId', e.target.checked)}
          className="w-4 h-4 accent-purple-500 disabled:opacity-40 disabled:cursor-not-allowed"
          title={isFirst ? 'משימה ראשונה לא יכולה להיות תלויה' : 'תלוי משימה'} />
      </div>
      <button type="button" onClick={onOpenEmployees}
        className="min-w-0 w-full flex items-center justify-center gap-1 px-1 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-xs font-bold whitespace-nowrap">
        <Users size={11} />עובדים
        {empCount > 0 && (
          <span className="bg-white text-purple-700 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">{empCount}</span>
        )}
      </button>
      <InlineSelect value={task.statusId} options={statusOptions} onChange={v => onChange('statusId', v)} width="w-full" />
      <InlineSelect value={task.urgencyId} options={urgencyOptions} onChange={v => onChange('urgencyId', v)} width="w-full" />
      <div className="flex items-center justify-center">
        <input type="checkbox" checked={task.isActive} onChange={() => onChange('isActive', !task.isActive)} className="w-4 h-4 accent-emerald-500" title="פעיל" />
      </div>
      <div className="flex items-center justify-center">
        <button type="button" onClick={onDelete} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"><Trash2 size={13} /></button>
      </div>
    </div>
  );
}

const cloneStep = (step: PlanningStep): PlanningStep => ({
  ...step,
  tasks: step.tasks ? step.tasks.map(t => ({ ...t, employees: [...(t.employees ?? [])] })) : [],
  employees: step.employees ? [...step.employees] : [],
  isExpanded: step.isExpanded ?? true,
});

export function StepEditModal({
  step, projectName = '', isFirstStep, loading = false, saving = false, saveError = null, loadError = null, statusOptions, urgencyOptions, onClose, onSave,
  onSyncDraft, onOpenStepEmployees, onOpenTaskEmployees,
}: StepEditModalProps) {
  const [draft, setDraft] = useState<PlanningStep | null>(step ? cloneStep(step) : null);
  const [warnMsg, setWarnMsg] = useState<string | null>(null);
  const dragIdx = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);

  const defaultStatusId = getDefaultId(statusOptions);
  const defaultUrgencyId = getDefaultId(urgencyOptions);

  useEffect(() => {
    if (step) setDraft(cloneStep(step));
  }, [step]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const onWarn = (msg: string) => setWarnMsg(msg);

  const draftRef = useRef(draft);
  useEffect(() => { draftRef.current = draft; }, [draft]);

  const [dependsOnData, setDependsOnData] = useState<DependsOnStepData | null>(null);
  const [cascadeStageUpdate, setCascadeStageUpdate] = useState<TaskCardCascadeStage | null>(null);
  const dependsOnDataRef = useRef<DependsOnStepData | null>(null);
  useEffect(() => { dependsOnDataRef.current = dependsOnData; }, [dependsOnData]);

  useEffect(() => {
    const stepId = step?.id;
    if (!stepId || stepId <= 0) {
      setDependsOnData(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const data = await getDependsOnDataByIdAsync(stepId, false);
        if (!cancelled) setDependsOnData(data);
      } catch (error) {
        console.error('Failed to load depends-on data:', error);
        if (!cancelled) setDependsOnData(null);
      }
    })();
    return () => { cancelled = true; };
  }, [step?.id]);

  useEffect(() => {
    setCascadeStageUpdate(null);
  }, [step?.id]);

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
  }>({ isOpen: false, title: '', message: '', type: 'alert' });

  const closeMessageBox = () => {
    setMessageBox(prev => ({
      ...prev,
      isOpen: false,
      showCancel: false,
      onConfirm: undefined,
      onCancel: undefined,
    }));
  };

  const openConfirm = useCallback((message: string, title = 'אישור'): Promise<boolean> =>
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
    }), []);

  const showAlert = (message: string, title = 'אזהרה') => {
    setMessageBox({
      isOpen: true,
      title,
      message,
      type: 'warning',
      showCancel: false,
      onConfirm: closeMessageBox,
    });
  };

  const setStepDraft = (updater: (prev: PlanningStep) => PlanningStep) => {
    setDraft(prev => (prev ? updater(prev) : prev));
  };

  const minStartDateFromDependency = dependsOnData?.dependsOnID != null
    ? (toInputDate(dependsOnData.dependsOn_EndDate ?? '') || toInputDate(dependsOnData.dependsOn_StartDate ?? ''))
    : null;

  const patchDependedByInState = (newDepStart: string, newDepEnd: string) => {
    setDependsOnData(prev => (prev ? { ...prev, dependedBy_StartDate: newDepStart, dependedBy_EndDate: newDepEnd } : prev));
  };

  const setPlanningStepDates = (newStart: string, newEnd: string) => {
    const s = toInputDate(newStart) || newStart;
    const e = toInputDate(newEnd) || newEnd;
    const dur = Math.max(1, dateDiffDays(s, e) + 1);
    setStepDraft(prev => updateStepBatch(prev, { startDate: s, endDate: e, duration: dur }));
  };

  const applyPlanningStepDependedByCascade = async (newThisStart: string, newThisEnd: string) => {
    const dep = dependsOnDataRef.current;
    if (!dep?.dependedByID) {
      setPlanningStepDates(newThisStart, newThisEnd);
      setCascadeStageUpdate(null);
      return;
    }

    const depStart = toInputDate(dep.dependedBy_StartDate ?? '');
    const depEnd = toInputDate(dep.dependedBy_EndDate ?? '');
    if (!depStart || !depEnd) {
      setPlanningStepDates(newThisStart, newThisEnd);
      setCascadeStageUpdate(null);
      return;
    }

    const thisEnd = toInputDate(newThisEnd) || newThisEnd;
    const requiredDepStart = addDays(thisEnd, 1);
    if (requiredDepStart === depStart) {
      setPlanningStepDates(newThisStart, newThisEnd);
      setCascadeStageUpdate(null);
      return;
    }

    const ok = await openConfirm('השינוי ישפיע על שלבים תלויים. האם לעדכן?');
    if (!ok) return;

    const span = Math.max(1, dateDiffDays(depStart, depEnd) + 1);
    const newDepEnd = addDays(requiredDepStart, span - 1);

    setPlanningStepDates(newThisStart, newThisEnd);
    setCascadeStageUpdate({
      id: dep.dependedByID,
      startDate: requiredDepStart,
      endDate: newDepEnd,
    });
    patchDependedByInState(requiredDepStart, newDepEnd);
  };

  const handleStepFieldChange = async (field: string, v: unknown) => {
    const cur = draftRef.current;
    if (!cur) return;

    if (field === 'startDate') {
      if (v === '') {
        setStepDraft(s => ({ ...s, startDate: '' }));
        setCascadeStageUpdate(null);
        return;
      }

      const newStart = String(v);
      const dep = dependsOnDataRef.current;
      const minStart = dep?.dependsOnID != null
        ? (toInputDate(dep.dependsOn_EndDate ?? '') || toInputDate(dep.dependsOn_StartDate ?? ''))
        : null;
      if (minStart && (toInputDate(newStart) || newStart) < minStart) {
        showAlert('לא ניתן לשנות – קיימת תלות בשלב קודם');
        return;
      }

      const candidateStart = toInputDate(newStart) || newStart;
      const currentEnd = toInputDate(cur.endDate);
      if (currentEnd && candidateStart > currentEnd) {
        showAlert('תאריך התחלה לא יכול להיות גדול מתאריך סיום');
        return;
      }

      const curStart = toInputDate(cur.startDate) || newStart;
      const curEnd = toInputDate(cur.endDate) || curStart;
      const fromSpan = Math.max(1, dateDiffDays(curStart, curEnd) + 1);
      const durDays = Math.max(
        1,
        cur.duration != null && cur.duration > 0 ? Math.floor(cur.duration) : fromSpan,
      );
      const startNorm = candidateStart;
      const newEnd = addDays(startNorm, durDays - 1);
      await applyPlanningStepDependedByCascade(startNorm, newEnd);
      return;
    }

    if (field === 'endDate') {
      if (!v) {
        setStepDraft(s => ({ ...s, endDate: '' }));
        setCascadeStageUpdate(null);
        return;
      }

      const startKeep = toInputDate(cur.startDate) || String(v);
      const newEnd = toInputDate(String(v)) || String(v);
      if (startKeep > newEnd) {
        showAlert('תאריך התחלה לא יכול להיות גדול מתאריך סיום');
        return;
      }
      await applyPlanningStepDependedByCascade(startKeep, newEnd);
      return;
    }

    if (field === 'duration') {
      const newDur = Math.max(1, Math.floor(Number(v)));
      const startKeep = toInputDate(cur.startDate);
      if (!startKeep) {
        setStepDraft(s => ({ ...s, duration: newDur }));
        setCascadeStageUpdate(null);
        return;
      }
      const newEnd = addDays(startKeep, newDur - 1);
      await applyPlanningStepDependedByCascade(startKeep, newEnd);
      return;
    }

    setStepDraft(s => applyStepScalarField(s, field, v));
  };

  const updateStepDurationFromTask = (newDuration: number) => {
    setStepDraft(s => {
      const start = toInputDate(s.startDate);
      const newEnd = start ? addDays(start, newDuration - 1) : s.endDate;
      return updateStepBatch(s, { duration: newDuration, endDate: newEnd });
    });
  };

  const handleConfirmStepDuration = async (newTaskDuration: number) => {
    const cur = draftRef.current;
    if (!cur) return;
    const yes = await openConfirm(
      `משך זמן המשימה (${newTaskDuration} ימים) גדול ממשך זמן השלב (${cur.duration} ימים).\n\nהאם להגדיל את משך זמן השלב ל-${newTaskDuration} ימים?`,
    );
    if (yes) updateStepDurationFromTask(newTaskDuration);
  };

  const runTaskScalar = async (taskId: number, field: string, val: unknown) => {
    let cur = draftRef.current;
    if (!cur) return;
    let result = applyTaskScalarField(cur, taskId, field, val);
    if (result.needsStepHoursConfirm) {
      const { otherHours, newTaskHours } = result.needsStepHoursConfirm;
      const yes = await openConfirm(
        `סה"כ השעות במשימות (${(otherHours + newTaskHours).toFixed(2)}) גדול משעות השלב (${cur.workHours}).\n\nהאם לעדכן את שעות השלב?`,
      );
      if (!yes) return;
      result = applyTaskScalarField(cur, taskId, field, val, {
        allowStepHoursExpand: true,
        updatedStepHours: otherHours + newTaskHours,
      });
    }
    if (result.blocked) {
      if (result.warnMessage) showAlert(result.warnMessage);
      return;
    }
    setDraft(result.step);
  };

  const handleTaskFieldChange = async (taskId: number, field: string, v: unknown) => {
    let cur = draftRef.current;
    if (!cur) return;

    const tasks = visibleTasks(cur);
    const taskIdx = tasks.findIndex(t => t.id === taskId);
    if (taskIdx === -1) return;
    let task = tasks[taskIdx];
    const stepStart = () => {
      const ref = draftRef.current ?? cur;
      if (!ref || !ref.startDate) return undefined;
      return toInputDate(ref.startDate);
    };
    const stepEnd = () => {
      const ref = draftRef.current ?? cur;
      if (!ref || !ref.endDate) return undefined;
      return toInputDate(ref.endDate);
    };

    const ensureStepRangeCoversTask = async (taskStart: string, taskEnd: string): Promise<boolean> => {
      const sStart = stepStart();
 
      const sEnd = stepEnd();
      const nextStepStart = sStart && taskStart < sStart ? taskStart : sStart;
      const nextStepEnd = sEnd && taskEnd > sEnd ? taskEnd : sEnd;
      if (!nextStepStart || !nextStepEnd) return true;
      if (nextStepStart === sStart && nextStepEnd === sEnd) return true;
      const nextStepDuration = Math.max(1, dateDiffDays(nextStepStart, nextStepEnd) + 1);
      const yes = await openConfirm(
        `תאריך השלב יתעדכן: ${isoDisp(nextStepStart)} עד ${isoDisp(nextStepEnd)}.\n\nלאשר?`,
        'עדכון תאריכים',
      );
      if (!yes) return false;
      setStepDraft(s => updateStepBatch(s, { startDate: nextStepStart, endDate: nextStepEnd, duration: nextStepDuration }));
      return true;
    };

    const applyTaskDatesAndCascade = async (patch: Partial<PlanningTask>, parentEnd: string) => {
      setStepDraft(s => cascadeTasksFromParentEnd(patchTaskFields(s, taskId, patch), taskIdx, parentEnd));
    };

    if (field === 'startDate' && taskIdx > 0 && (task.dependsOnTaskId ?? false) && tasks[taskIdx - 1]) {
      const prevTask = tasks[taskIdx - 1];
      const prevStart = toInputDate(prevTask.startDate);
      const prevEnd = toInputDate(prevTask.endDate);
      const newStart = String(v);

      if (newStart < prevStart) {
        onWarn(`לא ניתן להתחיל לפני תאריך ההתחלה של המשימה הקודמת (${isoDisp(prevStart)})`);
        return;
      }

      if (newStart <= prevEnd) {
        const newPrevEnd = addDays(newStart, -1);
        const yes = await openConfirm(
          `תאריך ההתחלה החדש (${isoDisp(newStart)}) נמצא בתוך טווח המשימה הקודמת.\n\n` +
          `האם לקצר את המשימה הקודמת עד ${isoDisp(newPrevEnd)}?`,
        );
        if (!yes) return;
        const newPrevDur = Math.max(1, dateDiffDays(prevStart, newPrevEnd) + 1);
        setStepDraft(s => patchTaskFields(s, prevTask.id, { endDate: newPrevEnd, duration: newPrevDur }));
        cur = draftRef.current ?? cur;
      //  tasks = getTasks();
        task = tasks[taskIdx] ?? task;
      }

      const curDur = Math.max(1, Math.floor(Number(task.duration)));
      const newEnd = addDays(newStart, curDur - 1);
      const tailEnd = computeCascadeTailEnd(draftRef.current ?? cur, taskIdx, newEnd);
      if (!(await ensureStepRangeCoversTask(newStart, laterIsoDate(newEnd, tailEnd)))) return;
      await applyTaskDatesAndCascade({ startDate: newStart, endDate: newEnd, duration: curDur }, newEnd);
      return;
    }

    if (field === 'dependsOnTaskId' && v === true && taskIdx > 0) {
      const prevTask = tasks[taskIdx - 1];
      const prevEnd = toInputDate(prevTask.endDate);
      const curStart = toInputDate(task.startDate);
      let cascadeFromEnd: string | null = null;

      if (curStart && prevEnd && curStart < prevEnd) {
        const newStart = addDays(prevEnd, 1);
        const keepDuration = Math.max(1, Math.floor(Number(task.duration)));
        const newEnd = addDays(newStart, keepDuration - 1);
        const tailEnd = computeCascadeTailEnd(draftRef.current ?? cur, taskIdx, newEnd);
        if (!(await ensureStepRangeCoversTask(newStart, laterIsoDate(newEnd, tailEnd)))) return;
        setStepDraft(s => patchTaskFields(s, taskId, { startDate: newStart, endDate: newEnd, duration: keepDuration, dependsOnTaskId: true }));
        cascadeFromEnd = newEnd;
      } else {
        setStepDraft(s => patchTaskFields(s, taskId, { dependsOnTaskId: true }));
      }

      if (cascadeFromEnd) {
        setStepDraft(s => cascadeTasksFromParentEnd(s, taskIdx, cascadeFromEnd!));
      }
      return;
    }

    if (field === 'startDate') {
      const newStart = String(v);
      if (!newStart) return;
      const newEnd = addDays(newStart, Math.max(1, Math.floor(Number(task.duration))) - 1);
      const tailEnd = computeCascadeTailEnd(draftRef.current ?? cur, taskIdx, newEnd);
      if (!(await ensureStepRangeCoversTask(newStart, laterIsoDate(newEnd, tailEnd)))) return;
      await applyTaskDatesAndCascade({
        startDate: newStart,
        endDate: newEnd,
        duration: Math.max(1, dateDiffDays(newStart, newEnd) + 1),
      }, newEnd);
      return;
    }

    if (field === 'endDate') {
      const endVal = String(v);
      if (!endVal) return;
      const start = toInputDate(task.startDate);
      if (start && endVal < start) {
        onWarn('תאריך סיום לא יכול להיות קטן מתאריך התחלה');
        return;
      }
      const newDur = start ? Math.max(1, dateDiffDays(start, endVal) + 1) : task.duration;
      if (newDur > (draftRef.current ?? cur).duration) {
        await handleConfirmStepDuration(newDur);
      }
      const rangeStart = start || endVal;
      const tailEnd = computeCascadeTailEnd(draftRef.current ?? cur, taskIdx, endVal);
      if (!(await ensureStepRangeCoversTask(rangeStart, laterIsoDate(endVal, tailEnd)))) return;
      await applyTaskDatesAndCascade({ endDate: endVal, duration: newDur }, endVal);
      return;
    }

    if (field === 'duration') {
      const newDuration = Math.max(1, Math.floor(Number(v)));
      if (newDuration > (draftRef.current ?? cur).duration) {
        await handleConfirmStepDuration(newDuration);
      }
      const start = toInputDate(task.startDate);
      const newEnd = start ? addDays(start, newDuration - 1) : String(task.endDate ?? '');
      if (!start || !newEnd) {
        await runTaskScalar(taskId, 'duration', newDuration);
        return;
      }
      const tailEnd = computeCascadeTailEnd(draftRef.current ?? cur, taskIdx, newEnd);
      if (!(await ensureStepRangeCoversTask(start, laterIsoDate(newEnd, tailEnd)))) return;
      await applyTaskDatesAndCascade({ duration: newDuration, endDate: newEnd }, newEnd);
      return;
    }

    await runTaskScalar(taskId, field, v);
  };

  const addTask = () => setDraft(prev => {
    if (!prev) return prev;
    const visible = prev.tasks.filter(t => !t.isDeleted);
    const n = visible.length + 1;
    const newTask: PlanningTask = {
      id: tempId(),
      PlanningStepID: prev.id,
      name: `משימה ${n}`,
      orderNum: n,
      percentage: 0,
      workHours: 0,
      workDays: 0,
      duration: prev.duration || 1,
      dependsOnTaskId: prev.tasks.length === 0 ? null : false,
      employees: [],
      startDate: prev.startDate,
      endDate: prev.endDate,
      statusId: defaultStatusId,
      urgencyId: defaultUrgencyId,
      isActive: true,
      attachments:[]
    };
    return { ...prev, tasks: [...prev.tasks, newTask] };
  });

  const deleteTask = (id: number) =>
    setDraft(prev => {
      if (!prev) return prev;
      const removed = prev.tasks.find(t => t.id === id);
      const deletedTaskIds = [...(prev.deletedTaskIds ?? [])];
      if (removed && removed.id > 0 && !deletedTaskIds.includes(removed.id)) {
        deletedTaskIds.push(removed.id);
      }
      return { ...prev, tasks: prev.tasks.filter(t => t.id !== id), deletedTaskIds };
    });

  const reorderTasks = (from: number, to: number) => {
    setDraft(prev => {
      if (!prev) return prev;
      const visible = visibleTasks(prev);
      const reordered = [...visible];
      const [item] = reordered.splice(from, 1);
      reordered.splice(to, 0, item);
      const reassigned = reordered.map((t, i) => ({
        ...t,
        orderNum: i + 1,
        dependsOnTaskId: false,
      }));
      const deleted = prev.tasks.filter(t => t.isDeleted);
      return { ...prev, tasks: [...reassigned, ...deleted] };
    });
  };

  const statusName = draft ? statusOptions.find(s => s.id === draft.statusId)?.name ?? '' : '';
  const statusColor = draft ? statusOptions.find(s => s.id === draft.statusId)?.color : undefined;
  const stepDisplayName = (draft?.name || step?.name || '').trim();
  const projectDisplayName = projectName.trim();
  const showForm = !loading && draft != null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={onClose}>
      <div className="modal-shell dark-surface bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col"
        style={{ width: '98vw', maxWidth: 1280, maxHeight: '90vh', direction: 'rtl' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4 rounded-t-2xl border-b border-gray-100 dark:border-gray-700 bg-emerald-50 dark:bg-gray-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: statusColor || '#888780' }} />
            <div className="min-w-0 flex flex-col gap-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-gray-800 text-base">עריכת שלב</span>
                {statusName && (
                  <span className="text-xs font-medium px-2.5 py-0.5 rounded-full border border-gray-200 dark:border-gray-600 text-gray-700">{statusName}</span>
                )}
              </div>
              {(projectDisplayName || stepDisplayName) && (
                <p className="text-sm text-gray-600 truncate">
                  {projectDisplayName && (
                    <span className="font-semibold text-gray-700">{projectDisplayName}</span>
                  )}
                  {projectDisplayName && stepDisplayName && (
                    <span className="mx-1.5 text-gray-400" aria-hidden>·</span>
                  )}
                  {stepDisplayName && (
                    <span className="font-medium text-gray-800">{stepDisplayName}</span>
                  )}
                </p>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500"><X size={16} /></button>
        </div>

        {warnMsg && (
          <div className="mx-5 mt-3 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 rounded-lg text-xs text-amber-800 dark:text-amber-200 flex justify-between items-center">
            <span>{warnMsg}</span>
            <button type="button" onClick={() => setWarnMsg(null)} className="text-amber-600 dark:text-amber-300 font-bold">×</button>
          </div>
        )}

        {loadError && (
          <div className="mx-5 mt-3 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 rounded-lg text-xs text-red-700 dark:text-red-300">
            {loadError}
          </div>
        )}

        {saveError && (
          <div className="mx-5 mt-3 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 rounded-lg text-xs text-red-700 dark:text-red-300">
            {saveError}
          </div>
        )}

        {loading && (
          <div className="flex-1 flex items-center justify-center py-16 text-sm text-gray-500">
            טוען נתוני שלב...
          </div>
        )}

        {showForm && draft && (
        <div className="flex-1 overflow-y-auto overflow-x-auto px-5 py-4 space-y-4">
          <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 overflow-hidden min-w-[1100px]">
            <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/25 border-b border-blue-200 dark:border-blue-900/50">
              <span className="text-xs font-bold text-blue-800 dark:text-blue-300">פרטי שלב</span>
            </div>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/15">
              <ColHeaders forStep />
              <StepFieldsRow
                step={draft}
                isFirst={isFirstStep}
                statusOptions={statusOptions}
                urgencyOptions={urgencyOptions}
                onChange={(f, v) => { void handleStepFieldChange(f, v); }}
                onToggle={() => setDraft(p => p ? { ...p, isExpanded: !p.isExpanded } : p)}
                onOpenEmployees={() => {
                  if (!draft) return;
                  onSyncDraft?.(draft);
                  onOpenStepEmployees?.(draft.id);
                }}
                onWarn={onWarn}
                startDateMin={minStartDateFromDependency ?? undefined}
              />
            </div>
          </div>

          <div className="rounded-xl border border-purple-200 dark:border-purple-900/50 overflow-hidden min-w-[1100px]">
            <div className="flex items-center justify-between px-3 py-2 border-b border-purple-200 dark:border-purple-900/50 bg-purple-50 dark:bg-purple-900/25">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setDraft(p => p ? { ...p, isExpanded: !p.isExpanded } : p)}
                  className="p-0.5 hover:bg-purple-200 dark:hover:bg-purple-900/40 rounded text-purple-600 dark:text-purple-300">
                  {draft.isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                <span className="text-xs font-bold text-purple-800 dark:text-purple-300">משימות</span>
                <span className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-200 px-2 py-0.5 rounded-full font-semibold">{draft.tasks.length}</span>
              </div>
              <button type="button" onClick={addTask}
                className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-300 hover:text-purple-800 dark:hover:text-purple-200 font-semibold px-2 py-1 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-lg">
                <Plus size={13} />הוסף משימה
              </button>
            </div>

            {draft.isExpanded && (
              <div className="p-2 space-y-1.5 bg-purple-50 dark:bg-purple-900/10">
                {visibleTasks(draft).length > 0 && <ColHeaders />}
                {visibleTasks(draft).map((task, idx) => (
                  <div key={task.id} draggable
                    onDragStart={() => { dragIdx.current = idx; }}
                    onDragEnter={() => { dragOver.current = idx; }}
                    onDragEnd={() => {
                      if (dragIdx.current !== null && dragOver.current !== null && dragIdx.current !== dragOver.current)
                        reorderTasks(dragIdx.current, dragOver.current);
                      dragIdx.current = null;
                      dragOver.current = null;
                    }}
                    onDragOver={e => e.preventDefault()}>
                    <TaskFieldsRow
                      task={task}
                      isFirst={idx === 0}
                      stepDuration={draft.duration}
                      statusOptions={statusOptions}
                      urgencyOptions={urgencyOptions}
                      onChange={(f, v) => handleTaskFieldChange(task.id, f, v)}
                      onDelete={() => deleteTask(task.id)}
                      onOpenEmployees={() => {
                        if (!draft) return;
                        onSyncDraft?.(draft);
                        onOpenTaskEmployees?.(draft.id, task.id);
                      }}
                      onWarn={onWarn}
                      onConfirmStepDuration={handleConfirmStepDuration}
                    />
                  </div>
                ))}
                {visibleTasks(draft).length === 0 && (
                  <div className="text-center text-xs text-purple-300 dark:text-purple-400 py-4">אין משימות — לחץ &quot;הוסף משימה&quot;</div>
                )}
              </div>
            )}
          </div>
        </div>
        )}

        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-700">
          <button
            type="button"
            onClick={() => {
              if (!draft) return;
              const saveOptions: StepEditSaveOptions | undefined = cascadeStageUpdate
                ? { cascadeStage: cascadeStageUpdate }
                : undefined;
              void onSave(draft, saveOptions);
            }}
            disabled={!draft || loading || saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl text-white disabled:opacity-60"
            style={{ background: '#1D9E75' }}>
            <Save size={15} />{saving ? 'שומר...' : 'שמור שלב'}
          </button>
          <button type="button" onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
            ביטול
          </button>
        </div>

        <MessageBox
          isOpen={messageBox.isOpen}
          onClose={closeMessageBox}
          title={messageBox.title}
          message={messageBox.message}
          type={messageBox.type}
          confirmText={messageBox.confirmText}
          cancelText={messageBox.cancelText}
          showCancel={messageBox.showCancel}
          onConfirm={messageBox.onConfirm}
          onCancel={messageBox.onCancel}
        />
      </div>
    </div>
  );
}

