// import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
// import {
//   Plus, Trash2, ChevronDown, ChevronRight,
//   Users, Save, CheckCircle, AlertCircle,
//   Search, Link, GripVertical, RotateCcw,
// } from 'lucide-react';
// import type {
//   EmployeeLink, PlanningStep, PlanningSubject, PlanningTask, SubContract, SubContractLink, SubjectTemplate,
//   TemplateStep, TemplateTask, SystemTable, PlanningTemplateEmployeeLinksMaps, PlanningTemplateEmployeeLinkSeed,
// } from '../../../Data/projectsData';
// import {
//   deletePlanningSubject,
//   getPlanningHierarchy, getPlanningSystemLists, savePlanningHierarchy,
//   getPlanningTemplateEmployeeLinks, EMPTY_PLANNING_TEMPLATE_EMPLOYEE_LINKS,
// } from '../../../services/projectPlanningService';
// import { getNumberOfHours } from '../../../services/settingService';
// import LinkEmployeesToStageModal from '../../shared/LinkEmployeesToStageModal';
// import SubcontractsModal from './SubcontractsModal';
// import ImportSubjectTemplatesModal, { type ImportPlanningSubjectsPayload } from './ImportSubjectTempLatesModal';
// import MessageBox from '../../shared/MessageBox';

// // ─── Types ────────────────────────────────────────────────────────────────────
// type SelectOption = { id: number; name: string; isDefault: boolean };

// const DEFAULT_STATUS_OPTIONS = [
//   { id: 1, name: 'פתוח'   , isDefault: true  },
//   { id: 2, name: 'בביצוע' , isDefault: false },
//   { id: 3, name: 'הושלם'  , isDefault: false },
//   { id: 4, name: 'מושהה'  , isDefault: false },
// ];

// const DEFAULT_URGENCY_OPTIONS = [
//   { id: 1, name: 'נמוכה' , isDefault: false },
//   { id: 2, name: 'רגילה' , isDefault: true  },
//   { id: 3, name: 'גבוהה' , isDefault: false },
//   { id: 4, name: 'דחוף'  , isDefault: false },
// ];

// const isTempId = (id: number) => id > 1_000_000_000_000 || id < 0;
// const DEFAULT_WORK_HOURS_PER_DAY = 8;

// const toInputDate = (value?: string) => {
//   if (!value) return '';
//   if (value.includes('T')) return value.split('T')[0];
//   if (value.includes('/')) {
//     const [day, month, year] = value.split('/');
//     if (year && month && day) {
//       return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
//     }
//   }
//   return value;
// };

// const todayIso = () => new Date().toISOString().split('T')[0];

// // ─── Date helpers ─────────────────────────────────────────────────────────────
// const dateDiffDays = (start: string, end: string): number => {
//   if (!start || !end) return 0;
//   const s = new Date(start);
//   const e = new Date(end);
//   return Math.round((e.getTime() - s.getTime()) / 86_400_000);
// };

// const addDays = (iso: string, days: number): string => {
//   if (!iso) return iso;
//   const d = new Date(iso);
//   d.setDate(d.getDate() + days);
//   return d.toISOString().split('T')[0];
// };

// const maxIsoDate = (a: string, b: string) => (a >= b ? a : b);
// const minIsoDate = (a: string, b: string) => (a <= b ? a : b);

// const round2 = (n: number) => parseFloat(Number(n).toFixed(2));

// /** Fit a task interval into [S,E], preserving preferred duration when possible (non-dependent tasks). */
// const clampIndependentTaskToStep = (
//   ts: string,
//   te: string,
//   S: string,
//   E: string,
//   preferredDur: number,
// ): { start: string; end: string } => {
//   const span = Math.max(1, Math.floor(Number(preferredDur)));
//   if (!S || !E) return { start: ts || S, end: te || E };
//   if (!ts || !te) {
//     return { start: S, end: minIsoDate(addDays(S, span - 1), E) };
//   }
//   if (te < S) {
//     return { start: S, end: minIsoDate(addDays(S, span - 1), E) };
//   }
//   if (ts > E) {
//     const end = E;
//     const start = maxIsoDate(S, addDays(end, -(span - 1)));
//     return { start, end };
//   }
//   let ns = maxIsoDate(ts, S);
//   let ne = minIsoDate(te, E);
//   if (ns > ne) {
//     ns = S;
//     ne = minIsoDate(addDays(ns, span - 1), E);
//   }
//   return { start: ns, end: ne };
// };

// /** Dependent task: start day after predecessor end, preserve duration, clamp to step. */
// const scheduleDependentTaskAfterPrev = (
//   prevEnd: string,
//   dur: number,
//   S: string,
//   E: string,
// ): { start: string; end: string } => {
//   const span = Math.max(1, Math.floor(Number(dur)));
//   let start = addDays(prevEnd, 1);
//   if (start > E) {
//     const st = maxIsoDate(S, addDays(E, -(span - 1)));
//     return { start: st, end: E };
//   }
//   if (start < S) start = S;
//   let end = addDays(start, span - 1);
//   if (end > E) {
//     end = E;
//     start = maxIsoDate(S, addDays(end, -(span - 1)));
//   }
//   return { start, end };
// };

// /**
//  * When step start/end change: clamp every task into the step range, then apply task dependency chain
//  * (same step) so dependsOnTaskId tasks start the day after the previous task's end.
//  */
// const refitTasksForStepBounds = (step: PlanningStep): PlanningTask[] => {
//   const S = toInputDate(step.startDate);
//   const E = toInputDate(step.endDate);
//   if (!S || !E) return step.tasks;

//   const visible = step.tasks.filter(t => !t.isDeleted);
//   const patches = new Map<number, { startDate: string; endDate: string; duration: number }>();

//   let prevEnd = '';
//   for (let i = 0; i < visible.length; i++) {
//     const t = visible[i];
//     const dur = Math.max(1, Math.floor(Number(t.duration)));
//     const ts = toInputDate(t.startDate);
//     const te = toInputDate(t.endDate);

//     let start: string;
//     let end: string;

//     if (i > 0 && (t.dependsOnTaskId ?? false) && prevEnd) {
//       const dep = scheduleDependentTaskAfterPrev(prevEnd, dur, S, E);
//       start = dep.start;
//       end = dep.end;
//     } else {
//       const ind = clampIndependentTaskToStep(ts, te, S, E, dur);
//       start = ind.start;
//       end = ind.end;
//     }

//     const newDur = Math.max(1, dateDiffDays(start, end) + 1);
//     patches.set(t.id, { startDate: start, endDate: end, duration: newDur });
//     prevEnd = end;
//   }

//   return step.tasks.map(t => {
//     if (t.isDeleted) return t;
//     const p = patches.get(t.id);
//     if (!p) return t;
//     const same =
//       toInputDate(t.startDate) === p.startDate &&
//       toInputDate(t.endDate) === p.endDate &&
//       Math.max(1, Math.floor(Number(t.duration))) === p.duration;
//     if (same) return t;
//     return { ...t, ...p, isModified: !t.isNew };
//   });
// };

// /**
//  * Positive integers proportional to weights, each >= 1.
//  * If targetSum is smaller than items count, we still return 1 per item
//  * and let downstream date clamping overlap rows on the same day when needed.
//  */
// const distributeProportionalInts = (weights: number[], targetSum: number): number[] | null => {
//   const n = weights.length;
//   if (n === 0) return [];
//   if (targetSum < n) return Array(n).fill(1);
//   const w = weights.map(x => Math.max(1, Math.floor(Number(x))));
//   const sumW = w.reduce((a, b) => a + b, 0);
//   const base = w.map(wi => Math.max(1, Math.floor((targetSum * wi) / sumW)));
//   let diff = targetSum - base.reduce((a, b) => a + b, 0);
//   const orderInc = [...w.entries()].sort((a, b) => b[1] - a[1]).map(([i]) => i);
//   let k = 0;
//   while (diff > 0 && k < targetSum + n + 5) {
//     base[orderInc[k % n]]++;
//     diff--;
//     k++;
//   }
//   const orderDec = [...w.entries()].sort((a, b) => a[1] - b[1]).map(([i]) => i);
//   k = 0;
//   while (diff < 0 && k < targetSum + n + 5) {
//     const i = orderDec[k % n];
//     if (base[i] > 1) {
//       base[i]--;
//       diff++;
//     }
//     k++;
//   }
//   return diff === 0 ? base : null;
// };

// /** Template/API often sends bool, 1/0, or alternate JSON property names — normalize so depends flags survive import. */
// const coerceDependsFlag = (v: unknown): boolean => {
//   if (v === true || v === 1) return true;
//   if (v === false || v === 0 || v == null) return false;
//   if (typeof v === 'string') {
//     const s = v.trim().toLowerCase();
//     return s === 'true' || s === '1' || s === 'yes';
//   }
//   return false;
// };

// const templateStepDependsTrue = (st: TemplateStep): boolean => {
//   if (coerceDependsFlag(st.dependsOnStepId)) return true;
//   const o = st as TemplateStep & Record<string, unknown>;
//   return coerceDependsFlag(o.DependsOnStepID);
// };

// const templateTaskDependsTrue = (tt: TemplateTask): boolean => {
//   if (coerceDependsFlag(tt.dependsOnTaskId)) return true;
//   const o = tt as TemplateTask & Record<string, unknown>;
//   return coerceDependsFlag(o.DependsOnTaskID);
// };

// const seedsToEmployeeLinks = (
//   seeds: PlanningTemplateEmployeeLinkSeed[] | undefined,
//   nextTempId: () => number,
// ): EmployeeLink[] =>
//   (seeds ?? []).map(s => ({
//     linkId: 0,
//     id: nextTempId(),
//     employeeId: s.employeeId,
//     employeeName: s.employeeName || `עובד ${s.employeeId}`,
//     percentage: Number(s.percentage) || 0,
//     workHours: Number(s.workHours) || 0,
//     workDays: Number(s.workDays) || 0,
//     duration: Number(s.duration) || 0,
//     isNew: true,
//   }));

// /**
//  * Converts imported templates into planning subjects: each template uses its chosen calendar start;
//  * subject length in days is the sum of step durations (or template totalDays when there are no steps).
//  * Dependent steps/tasks chain day-after-previous; non-dependent rows anchor to segment start.
//  */
// const buildPlanningSubjectsFromImportTemplates = (
//   templates: SubjectTemplate[],
//   startDateByTemplateId: Record<number, string>,
//   defaultStatusId: number,
//   defaultUrgencyId: number,
//   templateEmployees: PlanningTemplateEmployeeLinksMaps,
// ): PlanningSubject[] | null => {
//   if (!templates.length) return null;

//   let seq = 0;
//   const nextTempId = () => -Date.now() - (++seq);

//   const subjectsOut: PlanningSubject[] = [];

//   for (const tpl of templates) {
//     const subjectStartRaw = startDateByTemplateId[tpl.id];
//     if (!subjectStartRaw?.trim()) return null;

//     const stepsRaw = tpl.steps ?? [];
//     const subjectSpanFromSteps = stepsRaw.reduce(
//       (sum, st) => sum + Math.max(1, Math.floor(Number(st.duration))),
//       0,
//     );
//     const subjectSpan = stepsRaw.length === 0
//       ? Math.max(1, Math.floor(Number(tpl.totalDays ?? 1)))
//       : Math.max(1, subjectSpanFromSteps);

//     const subjectId = nextTempId();

//     if (stepsRaw.length === 0) {
//       subjectsOut.push({
//         id: subjectId,
//         name: tpl.name,
//         isActive: true,
//         isExpanded: true,
//         steps: [],
//         subContractsLink: [],
//         isNew: true,
//       });
//       continue;
//     }

//     const subjectSegmentStart = subjectStartRaw;
//     const subjectSegmentEnd = addDays(subjectSegmentStart, subjectSpan - 1);

//     const stepWeights = stepsRaw.map(st => Math.max(1, Math.floor(Number(st.duration))));
//     const stepSpans = stepWeights;

//     let stepPrevEnd: string | null = null;
//     const planningSteps: PlanningStep[] = [];

//     for (let ei = 0; ei < stepsRaw.length; ei++) {
//       const st: TemplateStep = stepsRaw[ei];
//       const span = stepSpans[ei];
//       const templateStepDepends = ei > 0 && templateStepDependsTrue(st);

//       let stepStart: string;
//       if (ei === 0) {
//         stepStart = subjectSegmentStart;
//       } else if (templateStepDepends) {
//         stepStart = addDays(stepPrevEnd!, 1);
//       } else {
//         stepStart = subjectSegmentStart;
//       }
//       let stepEnd = addDays(stepStart, span - 1);
//       if (stepEnd > subjectSegmentEnd) {
//         stepEnd = subjectSegmentEnd;
//         stepStart = maxIsoDate(subjectSegmentStart, addDays(stepEnd, -(span - 1)));
//       }
//       const actualStepSpan = Math.max(1, dateDiffDays(stepStart, stepEnd) + 1);
//       stepPrevEnd = stepEnd;

//       const stepId = nextTempId();
//       const tasksRaw = st.tasks ?? [];
//       const taskWeights = tasksRaw.map(tt => Math.max(1, Math.floor(Number(tt.duration))));
//       let taskSpans: number[] = [];
//       if (tasksRaw.length) {
//         const distTasks = distributeProportionalInts(taskWeights, actualStepSpan);
//         if (!distTasks) return null;
//         taskSpans = distTasks;
//       }

//       let taskPrevEnd: string | null = null;
//       const planningTasks: PlanningTask[] = [];
//       for (let ti = 0; ti < tasksRaw.length; ti++) {
//         const tt = tasksRaw[ti];
//         const tdAlloc = taskSpans[ti];
//         const templateTaskDepends = ti > 0 && templateTaskDependsTrue(tt);

//         let tStart: string;
//         if (ti === 0) {
//           tStart = stepStart;
//         } else if (templateTaskDepends) {
//           tStart = addDays(taskPrevEnd!, 1);
//         } else {
//           tStart = stepStart;
//         }
//         let tEnd = addDays(tStart, tdAlloc - 1);
//         if (tEnd > stepEnd) {
//           tEnd = stepEnd;
//           tStart = maxIsoDate(stepStart, addDays(tEnd, -(tdAlloc - 1)));
//         }
//         taskPrevEnd = tEnd;

//         planningTasks.push({
//           id: nextTempId(),
//           PlanningStepID: stepId,
//           name: tt.name,
//           orderNum: ti + 1,
//           percentage: Number(tt.taskPercentage ?? 0) || 0,
//           workHours: Number(tt.workHours ?? 0) || 0,
//           workDays: Number(tt.workDays ?? 0) || 0,
//           duration: Number(tt.duration ?? 0) || 0,
//           dependsOnTaskId: templateTaskDepends,
//           employees: seedsToEmployeeLinks(templateEmployees.taskEmployeeLinks[tt.id], nextTempId),
//           startDate: tStart,
//           endDate: tEnd,
//           statusId: defaultStatusId,
//           urgencyId: defaultUrgencyId,
//           isActive: true,
//           isNew: true,
//         });
//       }

//       planningSteps.push({
//         id: stepId,
//         PlanningSubjectID: subjectId,
//         name: st.name,
//         orderNum: ei + 1,
//         percentage: Number(st.stepPercentage ?? 0) || 0,
//         workHours: Number(st.workHours ?? 0) || 0,
//         workDays: Number(st.workDays ?? 0) || 0,
//         duration: Number(st.duration ?? 0) || 0,
//         dependsOnStepId: templateStepDepends,
//         employees: seedsToEmployeeLinks(templateEmployees.stepEmployeeLinks[st.id], nextTempId),
//         startDate: stepStart,
//         endDate: stepEnd,
//         statusId: defaultStatusId,
//         urgencyId: defaultUrgencyId,
//         isActive: true,
//         isExpanded: true,
//         tasks: planningTasks,
//         isNew: true,
//       });
//     }

//     subjectsOut.push({
//       id: subjectId,
//       name: tpl.name,
//       isActive: true,
//       isExpanded: true,
//       steps: planningSteps,
//       subContractsLink: [],
//       isNew: true,
//     });
//   }

//   return subjectsOut;
// };

// // ─── DateInput ────────────────────────────────────────────────────────────────
// function DateInput({
//   value, onChange, className = '', ringColor = 'focus-within:ring-blue-300',
// }: {
//   value: string;
//   onChange: (v: string) => void;
//   className?: string;
//   ringColor?: string;
// }) {
//   const inputRef = useRef<HTMLInputElement>(null);

//   const toDisplay = (iso: string) => {
//     if (!iso) return '';
//     const [y, m, d] = iso.split('-');
//     if (!y || !m || !d) return iso;
//     return `${d}/${m}/${y}`;
//   };

//   const openPicker = () => {
//     const el = inputRef.current;
//     if (!el) return;
//     try { el.showPicker(); } catch { el.focus(); }
//   };

//   return (
//     <div className={`relative flex items-center border border-gray-300 rounded-lg bg-white overflow-hidden focus-within:ring-2 ${ringColor} ${className}`}>
//       {/* Transparent date input covers only the text label area */}
//       <div className="relative flex-1 min-w-0">
//         <span className="block px-1.5 py-1.5 text-xs pointer-events-none select-none whitespace-nowrap overflow-hidden">
//           {toDisplay(value) || <span className="text-gray-400">dd/mm/yy</span>}
//         </span>
//         <input
//           ref={inputRef}
//           type="date"
//           value={value}
//           onChange={e => onChange(e.target.value)}
//           className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
//         />
//       </div>
//       {/* Calendar icon — sits outside the overlay, triggers picker */}
//       <button
//         type="button"
//         onClick={openPicker}
//         className="shrink-0 px-1.5 py-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors border-r border-gray-200"
//         tabIndex={-1}
//         title="בחר תאריך"
//       >
//         <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none"
//           stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//           <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
//           <line x1="16" y1="2" x2="16" y2="6"/>
//           <line x1="8" y1="2" x2="8" y2="6"/>
//           <line x1="3" y1="10" x2="21" y2="10"/>
//         </svg>
//       </button>
//     </div>
//   );
// }

// // ─── Inline Select ────────────────────────────────────────────────────────────
// function InlineSelect({
//   value, options, onChange, width = 'w-24',
// }: {
//   value: number;
//   options: SystemTable[];
//   onChange: (v: number) => void;
//   width?: string;
// }) {
//   const selectedOption = options.find(o => o.id === value);
//   const selectedColor = selectedOption?.color;
//   return (
//     <select
//       value={value}
//       onChange={e => onChange(Number(e.target.value))}
//       className={`${width} px-1.5 py-1.5 border rounded-lg text-xs focus:ring-2 focus:ring-indigo-300`}
//       style={{ color: selectedColor || undefined, borderColor: selectedColor || undefined }}
//     >
//       {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
//     </select>
//   );
// }

// // ─── Step Row ─────────────────────────────────────────────────────────────────
// function StepRow({
//   step, isFirst, onChange, onDelete, onToggle, onOpenEmployees, statusOptions, urgencyOptions, onWarn,
//   dragHandleProps,
// }: {
//   step: PlanningStep;
//   isFirst: boolean;
//   subjectSteps: PlanningStep[];
//   onChange: (field: string, value: any) => void;
//   onDelete: () => void;
//   onToggle: () => void;
//   onOpenEmployees: () => void;
//   statusOptions: SystemTable[];
//   urgencyOptions: SystemTable[];
//   onWarn: (msg: string) => void;
//   dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
// }) {
//   const numInput = (field: string, val: number, min = 0, step2 = 1) => (
//     <input
//       type="number" min={min} step={step2} value={val}
//       onChange={e => onChange(field, Number(e.target.value))}
//       className="w-full px-1 py-1 border border-gray-300 rounded-lg text-xs text-center focus:ring-2 focus:ring-blue-300"
//     />
//   );

//   const employeeCountForStage = (stage: PlanningStep): number => {
//     const stageEmployeeIds = new Set(stage.employees.filter(e => !e.isDeleted).map(e => e.employeeId));
//     const taskEmployeeIds = new Set(stage.tasks.flatMap(t => t.employees.filter(e => !e.isDeleted).map(e => e.employeeId)));
//     return new Set([...stageEmployeeIds, ...taskEmployeeIds]).size;
//   };

//   // Start date change → push endDate (SubjectBlock handles batch+cascade)
//   const handleStartDateChange = (v: string) => {
//     if (!v) return;
//     onChange('startDate', v);
//   };

//   // End date change → recalc duration (SubjectBlock handles batch+cascade)
//   const handleEndDateChange = (v: string) => {
//     if (!v) return;
//     const start = toInputDate(step.startDate);
//     if (start && v < start) { onWarn('תאריך סיום לא יכול להיות קטן מתאריך התחלה'); return; }
//     onChange('endDate', v);
//   };

//   // Duration change → SubjectBlock handles endDate recalc + cascade
//   const handleDurationChange = (v: number) => {
//     onChange('duration', Math.max(1, Math.floor(v)));
//   };

//   // Columns order: ..., startDate, endDate, duration, dependsOn, ...
//   return (
//     <div className="border border-blue-200 rounded-lg overflow-hidden bg-white shadow-sm">
//       <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50">
//         {/* Drag handle */}
//         <div
//           {...dragHandleProps}
//           className="w-5 shrink-0 flex items-center justify-center cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
//         >
//           <GripVertical size={14}/>
//         </div>
//         <div className="w-6 shrink-0 flex items-center justify-center">
//           <button onClick={onToggle} className="p-1 hover:bg-blue-200 rounded">
//             {step.isExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
//           </button>
//         </div>
//         <div className="w-10 text-center text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-lg py-1 shrink-0">{step.orderNum}</div>
//         <input type="text" value={step.name} onChange={e => onChange('name', e.target.value)}
//           className="min-w-0 flex-1 px-2 py-1 border border-gray-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-300" placeholder="שם שלב"/>
//         <div className="flex items-center gap-0.5 w-16 shrink-0">
//           {numInput('percentage', step.percentage)}
//           <span className="text-xs text-gray-400">%</span>
//         </div>
//         <div className="w-16 shrink-0">{numInput('workHours', step.workHours, 0, 0.5)}</div>
//         <div className="w-14 shrink-0">{numInput('workDays', step.workDays, 0, 0.5)}</div>
//         {/* Start date */}
//         <div className="w-28 shrink-0">
//           <DateInput value={toInputDate(step.startDate)} onChange={handleStartDateChange} ringColor="focus-within:ring-blue-300" className="w-full"/>
//         </div>
//         {/* End date */}
//         <div className="w-28 shrink-0">
//           <DateInput value={toInputDate(step.endDate)} onChange={handleEndDateChange} ringColor="focus-within:ring-blue-300" className="w-full"/>
//         </div>
//         {/* Duration */}
//         <div className="w-12 shrink-0">
//           <input type="number" min={1} step={1} value={step.duration}
//             onChange={e => handleDurationChange(Number(e.target.value))}
//             className="w-full px-1 py-1 border border-gray-300 rounded-lg text-xs text-center focus:ring-2 focus:ring-blue-300"/>
//         </div>
//         {/* Depends on step */}
//         <div className="w-16 shrink-0 flex items-center justify-center">
//           <input
//             type="checkbox"
//             checked={!isFirst && (step.dependsOnStepId ?? false)}
//             disabled={isFirst}
//             onChange={e => onChange('dependsOnStepId', e.target.checked)}
//             className="w-4 h-4 accent-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
//             title={isFirst ? 'שלב ראשון לא יכול להיות תלוי' : 'תלוי שלב'}
//           />
//         </div>
//         <button onClick={onOpenEmployees}
//           className="w-24 flex items-center justify-center gap-1 px-1.5 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-bold shrink-0 whitespace-nowrap">
//           <Users size={12}/>עובדים
//           <span className="bg-white text-blue-700 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">{employeeCountForStage(step)}</span>
//         </button>
//         <InlineSelect value={step.statusId} options={statusOptions} onChange={v => onChange('statusId', v)} width="w-24"/>
//         <InlineSelect value={step.urgencyId} options={urgencyOptions} onChange={v => onChange('urgencyId', v)} width="w-24"/>
//         <div className="w-8 shrink-0 flex items-center justify-center">
//           <input type="checkbox" checked={step.isActive} onChange={() => onChange('isActive', !step.isActive)} className="w-4 h-4 accent-emerald-500" title="פעיל"/>
//         </div>
//         <div className="w-8 shrink-0 flex items-center justify-center">
//           <button onClick={onDelete} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14}/></button>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─── Task Row ─────────────────────────────────────────────────────────────────
// function TaskRow({
//   task, isFirst, onChange, onDelete, onOpenEmployees, statusOptions, urgencyOptions, onWarn,
//   stepDuration, onConfirmStepDuration, dragHandleProps,
// }: {
//   task: PlanningTask;
//   isFirst: boolean;
//   steps: PlanningStep[];
//   onChange: (field: string, value: any) => void;
//   onDelete: () => void;
//   onOpenEmployees: () => void;
//   statusOptions: SelectOption[];
//   urgencyOptions: SelectOption[];
//   onWarn: (msg: string) => void;
//   stepDuration: number;
//   onConfirmStepDuration: (newTaskDuration: number) => Promise<void>;
//   dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
// }) {
//   const formatInputNumber = (value: number) => Number.isInteger(value) ? value : parseFloat(value.toFixed(2));

//   const numInput = (field: string, val: number, min = 0, step2 = 1) => (
//     <input type="number" min={min} step={step2} value={formatInputNumber(val)}
//       onChange={e => onChange(field, Number(e.target.value))}
//       className="w-full px-1 py-1 border border-gray-200 rounded-lg text-xs text-center focus:ring-2 focus:ring-purple-300"/>
//   );

//   // Start date change → keep duration, push endDate forward
//   const handleStartDateChange = (v: string) => {
//     if (!v) return;
//     onChange('startDate', v);
//   };

//   // End date change → recalc duration; if exceeds step, ask user
//   const handleEndDateChange = async (v: string) => {
//     if (!v) return;
//     const start = toInputDate(task.startDate);
//     if (start && v < start) { onWarn('תאריך סיום לא יכול להיות קטן מתאריך התחלה'); return; }
//     const newDuration = start ? dateDiffDays(start, v) + 1 : task.duration;
//     if (newDuration > stepDuration) {
//       await onConfirmStepDuration(newDuration);
//       // apply regardless — step duration updated if user confirmed
//     }
//     onChange('endDate', v);
//     if (start) onChange('duration', Math.max(1, newDuration));
//   };

//   // Duration change → push endDate; if exceeds step, ask user
//   const handleDurationChange = async (v: number) => {
//     const newDuration = Math.max(1, Math.floor(v));
//     if (newDuration > stepDuration) {
//       await onConfirmStepDuration(newDuration);
//       // apply regardless — step duration updated if user confirmed
//     }
//     onChange('duration', newDuration);
//     const start = toInputDate(task.startDate);
//     if (start) onChange('endDate', addDays(start, newDuration - 1));
//   };

//   return (
//     <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-lg border border-purple-100">
//       {/* Drag handle */}
//       <div
//         {...dragHandleProps}
//         className="w-5 shrink-0 flex items-center justify-center cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
//       >
//         <GripVertical size={13}/>
//       </div>
//       <div className="w-10 text-center text-xs font-bold text-gray-400 shrink-0">{task.orderNum}</div>
//       <input type="text" value={task.name} onChange={e => onChange('name', e.target.value)}
//         className="min-w-0 flex-1 px-2 py-1 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-purple-300" placeholder="שם משימה"/>
//       <div className="flex items-center gap-0.5 w-16 shrink-0">
//         {numInput('percentage', task.percentage)}
//         <span className="text-xs text-gray-400">%</span>
//       </div>
//       <div className="w-16 shrink-0">{numInput('workHours', task.workHours, 0, 0.5)}</div>
//       <div className="w-14 shrink-0">{numInput('workDays', task.workDays, 0, 0.5)}</div>
//       {/* Start date */}
//       <div className="w-28 shrink-0">
//         <DateInput value={toInputDate(task.startDate)} onChange={handleStartDateChange} ringColor="focus-within:ring-purple-300" className="w-full"/>
//       </div>
//       {/* End date */}
//       <div className="w-28 shrink-0">
//         <DateInput value={toInputDate(task.endDate)} onChange={handleEndDateChange} ringColor="focus-within:ring-purple-300" className="w-full"/>
//       </div>
//       {/* Duration */}
//       <div className="w-12 shrink-0">
//         <input type="number" min={1} step={1} value={task.duration}
//           onChange={e => handleDurationChange(Number(e.target.value))}
//           className="w-full px-1 py-1 border border-gray-200 rounded-lg text-xs text-center focus:ring-2 focus:ring-purple-300"/>
//       </div>
//       {/* Depends on task */}
//       <div className="w-16 shrink-0 flex items-center justify-center">
//         <input
//           type="checkbox"
//           checked={!isFirst && (task.dependsOnTaskId ?? false)}
//           disabled={isFirst}
//           onChange={e => onChange('dependsOnTaskId', e.target.checked)}
//           className="w-4 h-4 accent-purple-500 disabled:opacity-40 disabled:cursor-not-allowed"
//           title={isFirst ? 'משימה ראשונה לא יכולה להיות תלויה' : 'תלוי משימה'}
//         />
//       </div>
//       <button onClick={onOpenEmployees}
//         className="w-24 flex items-center justify-center gap-1 px-1.5 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-xs font-bold shrink-0 whitespace-nowrap">
//         <Users size={11}/>עובדים
//         {task.employees.filter(e => !e.isDeleted).length > 0 && (
//           <span className="bg-white text-purple-700 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
//             {task.employees.filter(e => !e.isDeleted).length}
//           </span>
//         )}
//       </button>
//       <InlineSelect value={task.statusId} options={statusOptions} onChange={v => onChange('statusId', v)} width="w-24"/>
//       <InlineSelect value={task.urgencyId} options={urgencyOptions} onChange={v => onChange('urgencyId', v)} width="w-24"/>
//       <div className="w-8 shrink-0 flex items-center justify-center">
//         <input type="checkbox" checked={task.isActive} onChange={() => onChange('isActive', !task.isActive)} className="w-4 h-4 accent-emerald-500" title="פעיל"/>
//       </div>
//       <div className="w-8 shrink-0 flex items-center justify-center">
//         <button onClick={onDelete} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={13}/></button>
//       </div>
//     </div>
//   );
// }

// // ─── Column Headers ───────────────────────────────────────────────────────────
// // Widths must exactly match StepRow / TaskRow cell widths (gap-1.5 between each)
// function ColHeaders({ forStep }: { forStep?: boolean }) {
//   const cols: { label: string; w: string }[] = [
//     { label: '',                                            w: 'w-5'   }, // drag handle
//     { label: '',                                            w: 'w-6'   }, // expand toggle (step only) — spacer for task
//     { label: 'מס׳',                                         w: 'w-10'  },
//     { label: forStep ? 'שם שלב' : 'שם משימה',              w: 'flex-1'},
//     { label: 'אחוז',                                        w: 'w-16'  },
//     { label: 'שעות עבודה',                                  w: 'w-16'  },
//     { label: 'ימי עבודה',                                   w: 'w-14'  },
//     { label: 'תאריך התחלה',                                 w: 'w-28'  },
//     { label: 'תאריך סיום',                                  w: 'w-28'  },
//     { label: 'משך זמן',                                     w: 'w-12'  },
//     { label: forStep ? 'תלוי שלב' : 'תלוי משימה',          w: 'w-16'  },
//     { label: 'עובדים',                                      w: 'w-24'  },
//     { label: 'סטטוס',                                       w: 'w-24'  },
//     { label: 'עדיפות',                                      w: 'w-24'  },
//     { label: 'פעיל',                                        w: 'w-8'   },
//     { label: '',                                            w: 'w-8'   },
//   ];

//   // For task rows there's no expand toggle — drop that column
//   const display = forStep ? cols : cols.filter((_, i) => i !== 1);

//   return (
//     <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-bold text-gray-700 ${forStep ? 'bg-blue-100' : 'bg-purple-100'}`}>
//       {display.map((c, i) => (
//         <div key={i} className={`${c.w} shrink-0 text-center`}>{c.label}</div>
//       ))}
//     </div>
//   );
// }

// // ─── Drag & Drop Hook ─────────────────────────────────────────────────────────
// function useDragDrop<T extends { id: number }>(
//   items: T[],
//   onReorder: (newItems: T[]) => void,
// ) {
//   const dragIdx = useRef<number | null>(null);
//   const dragOver = useRef<number | null>(null);

//   const handleDragStart = (idx: number) => {
//     dragIdx.current = idx;
//   };

//   const handleDragEnter = (idx: number) => {
//     dragOver.current = idx;
//   };

//   const handleDragEnd = () => {
//     if (dragIdx.current === null || dragOver.current === null || dragIdx.current === dragOver.current) {
//       dragIdx.current = null;
//       dragOver.current = null;
//       return;
//     }
//     const newItems = [...items];
//     const [removed] = newItems.splice(dragIdx.current, 1);
//     newItems.splice(dragOver.current, 0, removed);
//     dragIdx.current = null;
//     dragOver.current = null;
//     onReorder(newItems);
//   };

//   const getDragProps = (idx: number) => ({
//     draggable: true,
//     onDragStart: () => handleDragStart(idx),
//     onDragEnter: () => handleDragEnter(idx),
//     onDragEnd: handleDragEnd,
//     onDragOver: (e: React.DragEvent) => e.preventDefault(),
//   });

//   return { getDragProps };
// }

// // ─── Main Component ───────────────────────────────────────────────────────────
// interface ProjectTopicsTabProps {
//   projectId?: number;
//   focusPlanningTopicId?: number;
//   focusStepId?: number;
//   focusToken?: number;
// }

// export default function ProjectTopicsTab({
//   projectId,
//   focusPlanningTopicId,
//   focusStepId,
//   focusToken,
// }: ProjectTopicsTabProps) {
//   const FOCUS_LOCK_MS = 5000;
//   const [subjects, setSubjects] = useState<PlanningSubject[]>([]);
//   const [WORK_HOURS_PER_DAY, setWORK_HOURS_PER_DAY] = useState<number>(DEFAULT_WORK_HOURS_PER_DAY);
//   const [statusOptions, setStatusOptions] = useState(DEFAULT_STATUS_OPTIONS);
//   const [urgencyOptions, setUrgencyOptions] = useState(DEFAULT_URGENCY_OPTIONS);
//   const [subContractsOptions, setSubContractsOptions] = useState<SubContract[]>([]);
//   const [openImport, setOpenImport] = useState(false);
//   const [deletedIds, setDeletedIds] = useState({ subjectIds: [] as number[], stepIds: [] as number[], taskIds: [] as number[] });
//   const [saving, setSaving]           = useState(false);
//   const [saveSuccess, setSaveSuccess] = useState(false);
//   const [saveError, setSaveError]     = useState<string | null>(null);
//   const [isDirty, setIsDirty]         = useState(false);
//   const [reloadPending, setReloadPending] = useState(false);
//   const [search, setSearch]           = useState('');
//   const [focusedStepId, setFocusedStepId] = useState<number | null>(null);
//   const [empModal, setEmpModal] = useState<{ type: 'step' | 'task'; subjectId: number; stepId: number; taskId?: number } | null>(null);
//   const [subModal, setSubModal] = useState<{ subjectId: number; name: string } | null>(null);
//   const appliedFocusTokenRef = useRef<number | undefined>(undefined);
//   const focusLockRef = useRef<{ subjectId: number; stepId: number; expiresAt: number } | null>(null);
//   const [messageBox, setMessageBox] = useState<{
//     isOpen: boolean; title: string; message: string;
//     type: 'alert' | 'success' | 'error' | 'warning';
//     confirmText?: string; cancelText?: string; showCancel?: boolean;
//     onConfirm?: () => void; onCancel?: () => void;
//   }>({ isOpen: false, title: '', message: '', type: 'alert' });

//   const closeMessageBox = () =>
//     setMessageBox(prev => ({ ...prev, isOpen: false, showCancel: false, onConfirm: undefined, onCancel: undefined }));

//   const openConfirm = (message: string, title = 'אישור'): Promise<boolean> =>
//     new Promise(resolve => {
//       setMessageBox({
//         isOpen: true, title, message, type: 'warning', showCancel: true,
//         confirmText: 'אישור', cancelText: 'ביטול',
//         onConfirm: () => { resolve(true);  closeMessageBox(); },
//         onCancel:  () => { resolve(false); closeMessageBox(); },
//       });
//     });

//   const showWarning = (message: string) =>
//     setMessageBox({ isOpen: true, title: 'אזהרה', message, type: 'warning' });

//   const loadPlanningData = useCallback(async (): Promise<boolean> => {
//     if (!projectId) {
//       setSubjects([]);
//       setSubContractsOptions([]);
//       return true;
//     }
//     try {
//       const data = await getPlanningHierarchy(projectId);
//       const incoming = data.subjects ?? [];
//       let focusTarget: { subjectId: number; stepId: number } | null = null;
//       if (focusPlanningTopicId != null && focusStepId != null) {
//         const preferredSubject = incoming.find(s => s.id === focusPlanningTopicId);
//         if (preferredSubject) {
//           const exactStep = preferredSubject.steps.find(st => st.id === focusStepId);
//           if (exactStep) focusTarget = { subjectId: preferredSubject.id, stepId: exactStep.id };
//           if (!focusTarget) {
//             const parentByTask = preferredSubject.steps.find(st => st.tasks.some(t => t.id === focusStepId));
//             if (parentByTask) focusTarget = { subjectId: preferredSubject.id, stepId: parentByTask.id };
//           }
//         }
//         if (!focusTarget) {
//           for (const subject of incoming) {
//             const exactStep = subject.steps.find(st => st.id === focusStepId);
//             if (exactStep) {
//               focusTarget = { subjectId: subject.id, stepId: exactStep.id };
//               break;
//             }
//           }
//         }
//         if (!focusTarget) {
//           for (const subject of incoming) {
//             const parentByTask = subject.steps.find(st => st.tasks.some(t => t.id === focusStepId));
//             if (parentByTask) {
//               focusTarget = { subjectId: subject.id, stepId: parentByTask.id };
//               break;
//             }
//           }
//         }
//       }
//       const now = Date.now();
//       const lock = focusLockRef.current;
//       const withFocusLock =
//         lock && lock.expiresAt > now
//           ? incoming.map((subject) =>
//               subject.id !== lock.subjectId
//                 ? subject
//                 : {
//                     ...subject,
//                     isExpanded: true,
//                     steps: subject.steps.map((step) =>
//                       step.id === lock.stepId ? { ...step, isExpanded: true } : step
//                     ),
//                   }
//             )
//           : incoming;
//       const withFocusFromProps = (() => {
//         if (!focusTarget) return withFocusLock;
//         return withFocusLock.map((subject) =>
//           subject.id !== focusTarget.subjectId
//             ? subject
//             : {
//                 ...subject,
//                 isExpanded: true,
//                 steps: subject.steps.map((step) =>
//                   step.id === focusTarget.stepId ? { ...step, isExpanded: true } : step
//                 ),
//               }
//         );
//       })();
//       setSubjects(withFocusFromProps);
//       if (focusTarget) {
//         setFocusedStepId(focusTarget.stepId);
//         focusLockRef.current = {
//           subjectId: focusTarget.subjectId,
//           stepId: focusTarget.stepId,
//           expiresAt: Date.now() + FOCUS_LOCK_MS,
//         };
//       }
//       setSubContractsOptions(data.subContracts ?? []);
//       setSaveError(null);
//       setIsDirty(false);
//       return true;
//     } catch {
//       setSaveError('שגיאה בטעינת תכנון הפרויקט');
//       return false;
//     }
//   }, [projectId, focusPlanningTopicId, focusStepId]);

//   useEffect(() => {
//     void loadPlanningData();
//   }, [loadPlanningData]);

//   useEffect(() => {
//     if (focusPlanningTopicId == null || focusStepId == null) return;
//     const findTarget = () => {
//       // 1) Preferred: exact subject + exact step id
//       const preferredSubject = subjects.find(s => s.id === focusPlanningTopicId);
//       if (preferredSubject) {
//         const exactStep = preferredSubject.steps.find(st => st.id === focusStepId);
//         if (exactStep) return { subjectId: preferredSubject.id, stepId: exactStep.id };

//         // 2) Same subject but selected id is a task id -> open its parent step
//         const parentByTask = preferredSubject.steps.find(st => st.tasks.some(t => t.id === focusStepId));
//         if (parentByTask) return { subjectId: preferredSubject.id, stepId: parentByTask.id };
//       }

//       // 3) Fallback across all subjects: exact step id
//       for (const subject of subjects) {
//         const exactStep = subject.steps.find(st => st.id === focusStepId);
//         if (exactStep) return { subjectId: subject.id, stepId: exactStep.id };
//       }

//       // 4) Fallback across all subjects: selected id is a task id
//       for (const subject of subjects) {
//         const parentByTask = subject.steps.find(st => st.tasks.some(t => t.id === focusStepId));
//         if (parentByTask) return { subjectId: subject.id, stepId: parentByTask.id };
//       }

//       return null;
//     };

//     const target = findTarget();
//     if (!target) return;

//     if (focusToken != null && appliedFocusTokenRef.current === focusToken) {
//       const alreadyExpanded = subjects.some(
//         s => s.id === target.subjectId && s.isExpanded && s.steps.some(st => st.id === target.stepId && st.isExpanded)
//       );
//       if (alreadyExpanded) return;
//     }

//     // Ensure target subject/step is visible (search can hide it)
//     if (search.trim()) {
//       setSearch('');
//     }

//     setSubjects(prev =>
//       prev.map(subject => {
//         if (subject.id !== target.subjectId) return subject;
//         return {
//           ...subject,
//           isExpanded: true,
//           steps: subject.steps.map(step =>
//             step.id === target.stepId ? { ...step, isExpanded: true } : step
//           ),
//         };
//       }),
//     );
//     setFocusedStepId(target.stepId);
//     focusLockRef.current = {
//       subjectId: target.subjectId,
//       stepId: target.stepId,
//       expiresAt: Date.now() + FOCUS_LOCK_MS,
//     };

//     if (focusToken != null) appliedFocusTokenRef.current = focusToken;
//     window.setTimeout(() => {
//       const el = document.querySelector(`[data-step-id="${target.stepId}"]`) as HTMLElement | null;
//       if (!el) return;
//       el.scrollIntoView({ behavior: 'smooth', block: 'center' });
//       el.classList.add('ring-2', 'ring-emerald-400', 'ring-offset-1');
//       window.setTimeout(() => {
//         el.classList.remove('ring-2', 'ring-emerald-400', 'ring-offset-1');
//         setFocusedStepId(prev => (prev === target.stepId ? null : prev));
//       }, 2400);
//     }, 120);
//   }, [focusPlanningTopicId, focusStepId, focusToken, search, subjects]);

//   const handleCancelChanges = async () => {
//     if (!isDirty || saving || reloadPending) return;
//     const yes = await openConfirm(
//       'כל השינויים שביצעת ייוּמוּ והתצוגה תוחזר למצב השמור בשרת. להמשיך?',
//       'ביטול שינויים'
//     );
//     if (!yes) return;
//     setReloadPending(true);
//     setSaveSuccess(false);
//     try {
//       const ok = await loadPlanningData();
//       if (ok) {
//         setDeletedIds({ subjectIds: [], stepIds: [], taskIds: [] });
//         setIsDirty(false);
//       }
//     } finally {
//       setReloadPending(false);
//     }
//   };

//   useEffect(() => {
//     // Load "work hours per day" once from backend settings.
//     const loadHours = async () => {
//       try {
//         const n = await getNumberOfHours();
//         if (n != null && Number.isFinite(n) && n > 0) {
//           setWORK_HOURS_PER_DAY(n);
//         }
//       } catch {
//         // Keep default if request fails.
//       }
//     };
//     void loadHours();
//   }, []);

//   useEffect(() => {
//     const loadLists = async () => {
//       try {
//         const data = await getPlanningSystemLists();
//         setStatusOptions(data.statuses ?? DEFAULT_STATUS_OPTIONS);
//         setUrgencyOptions(data.priorities ?? DEFAULT_URGENCY_OPTIONS);
//       } catch { /* defaults */ }
//     };
//     loadLists();
//   }, []);

//   const filtered = useMemo(() => {
//     const visible = subjects.filter(s => !s.isDeleted);
//     if (!search.trim()) return visible;
//     return visible.filter(s =>
//       s.name.includes(search) ||
//       s.steps.some(st => !st.isDeleted && (st.name.includes(search) || st.tasks.some(t => !t.isDeleted && t.name.includes(search))))
//     );
//   }, [subjects, search]);

//   const dirty = () => setIsDirty(true);
//   const getDefaultId = (options: SelectOption[]) => options.find(o => o.isDefault)?.id ?? options[0]?.id ?? 0;
//   const trackDel = (field: keyof typeof deletedIds, id: number) => {
//     if (!isTempId(id)) setDeletedIds(p => ({ ...p, [field]: [...p[field], id] }));
//   };

//   const mergeSubContractLinks = (current: SubContractLink[], next: SubContractLink[]): SubContractLink[] => {
//     const nextIds = new Set(next.map(l => l.id));
//     const currentMap = new Map(current.map(l => [l.id, l]));
//     const merged: SubContractLink[] = [];
//     for (const link of next) {
//       const existing = currentMap.get(link.id);
//       merged.push({ ...(existing ?? {}), ...link, isDeleted: false, isNew: existing ? existing.isNew : true });
//     }
//     for (const existing of current) {
//       if (!nextIds.has(existing.id)) {
//         if (existing.isNew) continue;
//         merged.push({ ...existing, isDeleted: true });
//       }
//     }
//     return merged;
//   };

//   // ── Subject CRUD ───────────────────────────────────────────────────────────
//   const addSubject = () => {
//     setSubjects(p => [...p, { id: -Date.now(), name: `נושא תכנון ${p.length + 1}`, isActive: true, isExpanded: true, steps: [], subContractsLink: [], isNew: true }]);
//     dirty();
//   };
//   const updateSubject = (id: number, field: string, val: any) => {
//     setSubjects(p => p.map(s => s.id === id ? { ...s, [field]: val, isModified: true } : s));
//     dirty();
//   };
//   const deleteSubject = async (id: number) => {
//     const yes = await openConfirm(
//       `נושא חדש שטרם נשמר יוסר מהרשימה. נושא שמור יימחק בשרת — יחד עם כל השלבים והמשימות תחתיו.\n\nלאשר מחיקה?`,
//       'מחיקת נושא תכנון'
//     );
//     if (!yes) return;

//     const subject = subjects.find(s => s.id === id);
//     if (!subject) return;

//     if (isTempId(subject.id) || subject.isNew) {
//       setSubjects(p => p.flatMap(s => {
//         if (s.id !== id) return [s];
//         return [];
//       }));
//       dirty();
//       return;
//     }

//     try {
//       const ok = await deletePlanningSubject(id);
//       if (!ok) {
//         showWarning('נושא התכנון לא נמצא בשרת (ייתכן שכבר נמחק).');
//         return;
//       }
//       setSubjects(p => p.filter(s => s.id !== id));
//       setDeletedIds(p => ({ ...p, subjectIds: p.subjectIds.filter(x => x !== id) }));
//     } catch (e) {
//       const msg = e instanceof Error ? e.message : 'שגיאה לא ידועה';
//       setMessageBox({ isOpen: true, title: 'שגיאה במחיקה', message: msg, type: 'alert' });
//     }
//   };

//   // ── Step CRUD ──────────────────────────────────────────────────────────────
//   const addStep = (subjectId: number) => {
//     const defaultStatusId  = getDefaultId(statusOptions);
//     const defaultUrgencyId = getDefaultId(urgencyOptions);
//     const today = todayIso();
//     setSubjects(p => p.map(s => s.id !== subjectId ? s : {
//       ...s, steps: [...s.steps, {
//         id: -Date.now(), PlanningSubjectID: subjectId, name: `שלב ${s.steps.filter(st => !st.isDeleted).length + 1}`,
//         orderNum: s.steps.filter(st => !st.isDeleted).length + 1, percentage: 0, workHours: 0, workDays: 0, duration: 1,
//         dependsOnStepId: false, employees: [],
//         startDate: today, endDate: today,
//         statusId: defaultStatusId, urgencyId: defaultUrgencyId, isActive: true, isExpanded: false, tasks: [], isNew: true,
//       }],
//     }));
//     dirty();
//   };

//   const updateStep = (subjectId: number, stepId: number, field: string, val: any) => {
//     const subject = subjects.find(s => s.id === subjectId);
//     if (!subject) return;
//     if (field === 'percentage') {
//       const newPct = Math.max(0, Math.min(100, Number(val)));
//       const otherSum = subject.steps.filter((x: PlanningStep) => x.id !== stepId && !x.isDeleted).reduce((a: number, x: PlanningStep) => a + x.percentage, 0);
//       if (otherSum + newPct > 100) {
//         setMessageBox({ isOpen: true, title: 'אזהרה', message: `סה"כ אחוזים לא יכול לעבור 100%. כרגע: ${(otherSum + newPct).toFixed(1)}%`, type: 'warning' });
//         return;
//       }
//     }
//     setSubjects(prev => prev.map(s => s.id !== subjectId ? s : {
//       ...s,
//       steps: s.steps.map((st: PlanningStep) => {
//         if (st.id !== stepId) return st;
//         if (field === 'workHours') { const h = Math.max(0, Number(val)); return { ...st, workHours: h, workDays: round2(h / WORK_HOURS_PER_DAY), isModified: true }; }
//         if (field === 'workDays')  { const d = Math.max(0, Number(val)); return { ...st, workDays: d, workHours: round2(d * WORK_HOURS_PER_DAY), isModified: true }; }
//         if (field === 'duration')  { return { ...st, duration: Math.max(1, Math.floor(Number(val))), isModified: true }; }
//         if (field === 'percentage') { return { ...st, percentage: Math.max(0, Math.min(100, Number(val))), isModified: true }; }
//         return { ...st, [field]: val, isModified: true };
//       })
//     }));
//     dirty();
//   };

//   /**
//    * Batch-update multiple fields on a step in one setState call,
//    * then cascade through all following dependency-linked steps.
//    */
//   const updateStepBatch = (subjectId: number, stepId: number, fields: Partial<PlanningStep>) => {
//     setSubjects(prev => prev.map(s => {
//       if (s.id !== subjectId) return s;

//       const oldById = new Map(s.steps.map(st => [st.id, st]));

//       // 1. Apply fields to the target step
//       let updatedSteps = s.steps.map((st: PlanningStep) => {
//         if (st.id !== stepId) return st;
//         return { ...st, ...fields, isModified: true };
//       });

//       // 2. Cascade through subsequent steps while dependency is enabled
//       const visibleSorted = updatedSteps.filter((st: PlanningStep) => !st.isDeleted);
//       const changedIdx = visibleSorted.findIndex((st: PlanningStep) => st.id === stepId);
//       if (changedIdx !== -1) {
//         const changedStep = visibleSorted[changedIdx];
//         let prevEndForCascade = toInputDate(changedStep.endDate);
//         if (prevEndForCascade) {
//           const cascadeById = new Map<number, { startDate: string; endDate: string }>();
//           for (let i = changedIdx + 1; i < visibleSorted.length; i++) {
//             const followingStep = visibleSorted[i];
//             if (!(followingStep.dependsOnStepId ?? false)) break;
//             const newStart = addDays(prevEndForCascade, 1);
//             const newEnd = addDays(newStart, Math.max(1, Math.floor(Number(followingStep.duration))) - 1);
//             cascadeById.set(followingStep.id, { startDate: newStart, endDate: newEnd });
//             prevEndForCascade = newEnd;
//           }
//           if (cascadeById.size > 0) {
//             updatedSteps = updatedSteps.map((st: PlanningStep) => {
//               const patch = cascadeById.get(st.id);
//               return patch ? { ...st, ...patch, isModified: true } : st;
//             });
//           }
//         }
//       }

//       // 3. When any step's calendar range changed, clamp its tasks to the step and re-run task dependency chain
//       const finalSteps = updatedSteps.map((st: PlanningStep) => {
//         const old = oldById.get(st.id);
//         if (!old) return st;
//         const oldS = toInputDate(old.startDate);
//         const oldE = toInputDate(old.endDate);
//         const newS = toInputDate(st.startDate);
//         const newE = toInputDate(st.endDate);
//         if (oldS === newS && oldE === newE) return st;
//         return { ...st, tasks: refitTasksForStepBounds(st), isModified: true };
//       });

//       return { ...s, steps: finalSteps };
//     }));
//     dirty();
//   };

//   /**
//    * Called when a dependent step's startDate changes.
//    *
//    * Rules:
//    * 1. newStart < prevStep.startDate → hard block (can never start before prev step starts)
//    * 2. newStart >= prevStep.startDate AND newStart <= prevStep.endDate →
//    *    ask user: if yes, shorten prevStep.endDate = newStart - 1 day (and recalc prevStep duration)
//    * 3. newStart > prevStep.endDate → always allowed, apply silently
//    */
//   const handleStepStartDateWithDependency = async (
//     subjectId: number,
//     stepId: number,
//     newStart: string,
//     prevStep: PlanningStep,
//   ) => {
//     const prevStart = toInputDate(prevStep.startDate);
//     const prevEnd   = toInputDate(prevStep.endDate);

//     // Rule 1 — hard block
//     if (newStart < prevStart) {
//       showWarning(
//         `לא ניתן להתחיל לפני תאריך ההתחלה של השלב הקודם (${prevStart.split('-').reverse().join('/')})`
//       );
//       return;
//     }

//     // Rule 2 — overlap: newStart is within prevStep's range → ask to shorten prevStep
//     if (newStart <= prevEnd) {
//       const newPrevEnd = addDays(newStart, -1);
//       const yes = await openConfirm(
//         `תאריך ההתחלה החדש (${newStart.split('-').reverse().join('/')}) נמצא בתוך טווח השלב הקודם.\n\n` +
//         `האם לקצר את השלב הקודם עד ${newPrevEnd.split('-').reverse().join('/')}?`
//       );
//       if (!yes) return;
//     // Shorten prevStep endDate and recalc its duration — use batch so cascade fires
//       const newPrevDuration = Math.max(1, dateDiffDays(prevStart, newPrevEnd) + 1);
//       updateStepBatch(subjectId, prevStep.id, { endDate: newPrevEnd, duration: newPrevDuration });
//     }

//     // Apply the new startDate to current step — keep duration, push endDate — use batch for cascade
//     const curStep = subjects.find(s => s.id === subjectId)?.steps.find(st => st.id === stepId);
//     if (!curStep) return;
//     const newEnd = addDays(newStart, curStep.duration - 1);
//     updateStepBatch(subjectId, stepId, { startDate: newStart, endDate: newEnd });
//   };

//   const deleteStep = (subjectId: number, stepId: number) => {
//     setSubjects(p => p.map(s => s.id !== subjectId ? s : {
//       ...s, steps: s.steps.flatMap(st => {
//         if (st.id !== stepId) return [st];
//         if (isTempId(st.id) || st.isNew) return [];
//         trackDel('stepIds', stepId);
//         return [{ ...st, isDeleted: true }];
//       }),
//     }));
//     dirty();
//   };

//   const toggleStep = (subjectId: number, stepId: number) =>
//     setSubjects(p => p.map(s => s.id !== subjectId ? s : {
//       ...s, steps: s.steps.map(st => st.id !== stepId ? st : { ...st, isExpanded: !st.isExpanded }),
//     }));

//   // Reorder steps via drag & drop
//   // Only clear dependsOnStepId for a step whose immediate predecessor has changed
//   const reorderSteps = (subjectId: number, newSteps: PlanningStep[]) => {
//     const subject = subjects.find(s => s.id === subjectId);
//     if (!subject) return;
//     const oldVisible = subject.steps.filter(st => !st.isDeleted);

//     const reassigned = newSteps.map((st, idx) => {
//       const oldIdx = oldVisible.findIndex(o => o.id === st.id);
//       const prevIdChanged = idx === 0
//         ? oldIdx !== 0 // was not first before
//         : newSteps[idx - 1].id !== (oldIdx > 0 ? oldVisible[oldIdx - 1].id : null);
//       return {
//         ...st,
//         orderNum: idx + 1,
//         // Only reset dependency if this step's predecessor changed
//         dependsOnStepId: prevIdChanged ? false : st.dependsOnStepId,
//         isModified: true,
//       };
//     });
//     setSubjects(p => p.map(s => s.id !== subjectId ? s : { ...s, steps: reassigned }));
//     dirty();
//   };

//   // Reorder tasks via drag & drop — clears dependsOnTaskId when order changes
//   const reorderTasks = (subjectId: number, stepId: number, newTasks: PlanningTask[]) => {
//     const reassigned = newTasks.map((t, idx) => ({
//       ...t,
//       orderNum: idx + 1,
//       dependsOnTaskId: false,
//       isModified: true,
//     }));
//     setSubjects(p => p.map(s => s.id !== subjectId ? s : {
//       ...s,
//       steps: s.steps.map(st => st.id !== stepId ? st : { ...st, tasks: reassigned }),
//     }));
//     dirty();
//   };

//   // ── Task CRUD ──────────────────────────────────────────────────────────────
//   const addTask = (subjectId: number, stepId: number) => {
//     const defaultStatusId  = getDefaultId(statusOptions);
//     const defaultUrgencyId = getDefaultId(urgencyOptions);
//     const step = subjects.find(s => s.id === subjectId)?.steps.find(st => st.id === stepId);
//     // New task inherits step's start/end dates
//     const taskStart = step ? toInputDate(step.startDate) || todayIso() : todayIso();
//     const taskEnd   = step ? toInputDate(step.endDate)   || todayIso() : todayIso();
//     const taskDuration = step ? Math.max(1, step.duration) : 1;

//     setSubjects(p => p.map(s => s.id !== subjectId ? s : {
//       ...s, steps: s.steps.map(st => st.id !== stepId ? st : {
//         ...st, isExpanded: true,
//         tasks: [...st.tasks, {
//           id: -Date.now(), PlanningStepID: stepId, name: `משימה ${st.tasks.filter(t => !t.isDeleted).length + 1}`,
//           orderNum: st.tasks.filter(t => !t.isDeleted).length + 1,
//           percentage: 0, workHours: 0, workDays: 0,
//           duration: taskDuration,
//           dependsOnTaskId: false, employees: [],
//           startDate: taskStart,
//           endDate:   taskEnd,
//           statusId: defaultStatusId, urgencyId: defaultUrgencyId, isActive: true, isNew: true,
//         }],
//       }),
//     }));
//     dirty();
//   };

//   const updateTask = async (subjectId: number, stepId: number, taskId: number, field: string, val: any) => {
//     const step = subjects.find(s => s.id === subjectId)?.steps.find(st => st.id === stepId);
//     if (!step) return;

//     let updatedStepHours: number | null = null;
//     let nextTaskWorkHours: number | null = null;
//     let nextTaskWorkDays:  number | null = null;
//     let nextTaskPercentage: number | null = null;

//     if (field === 'workHours') {
//       const newH = Math.max(0, Number(val));
//       const otherH = step.tasks.filter(x => x.id !== taskId && !x.isDeleted).reduce((a, x) => a + x.workHours, 0);
//       if (otherH + newH > step.workHours) {
//         const yes = await openConfirm(`סה"כ השעות במשימות (${(otherH + newH).toFixed(2)}) גדול משעות השלב (${step.workHours}).\n\nהאם לעדכן את שעות השלב?`);
//         if (!yes) return;
//         updatedStepHours = otherH + newH;
//       }
//       nextTaskWorkHours = newH; nextTaskWorkDays = newH / WORK_HOURS_PER_DAY;
//       nextTaskPercentage = (updatedStepHours ?? step.workHours) > 0 ? (newH / (updatedStepHours ?? step.workHours)) * 100 : 0;
//     }
//     if (field === 'workDays') {
//       const newD = Math.max(0, Number(val)); const newH = newD * WORK_HOURS_PER_DAY;
//       const otherH = step.tasks.filter(x => x.id !== taskId && !x.isDeleted).reduce((a, x) => a + x.workHours, 0);
//       if (otherH + newH > step.workHours) {
//         const yes = await openConfirm(`סה"כ השעות במשימות (${(otherH + newH).toFixed(2)}) גדול משעות השלב (${step.workHours}).\n\nהאם לעדכן את שעות השלב?`);
//         if (!yes) return;
//         updatedStepHours = otherH + newH;
//       }
//       nextTaskWorkHours = newH; nextTaskWorkDays = newD;
//       nextTaskPercentage = (updatedStepHours ?? step.workHours) > 0 ? (newH / (updatedStepHours ?? step.workHours)) * 100 : 0;
//     }
//     if (field === 'percentage') {
//       const newPct = Math.max(0, Math.min(100, Number(val)));
//       const otherSum = step.tasks.filter(x => x.id !== taskId && !x.isDeleted).reduce((a, x) => a + x.percentage, 0);
//       if (otherSum + newPct > 100) {
//         setMessageBox({ isOpen: true, title: 'אזהרה', message: `סה"כ אחוזים לא יכול לעבור 100%. כרגע: ${(otherSum + newPct).toFixed(1)}%`, type: 'warning' });
//         return;
//       }
//       nextTaskPercentage = newPct;
//       nextTaskWorkHours  = (step.workHours * newPct) / 100;
//       nextTaskWorkDays   = nextTaskWorkHours / WORK_HOURS_PER_DAY;
//     }

//     setSubjects(p => p.map(s => s.id !== subjectId ? s : {
//       ...s,
//       steps: s.steps.map(st => st.id !== stepId ? st : {
//         ...st,
//         ...(updatedStepHours !== null ? { workHours: updatedStepHours, workDays: updatedStepHours / WORK_HOURS_PER_DAY } : {}),
//         tasks: st.tasks.map(t => {
//           if (t.id !== taskId) return t;
//           if (field === 'workHours') return { ...t, workHours: nextTaskWorkHours ?? t.workHours, workDays: nextTaskWorkDays ?? t.workDays, percentage: nextTaskPercentage ?? t.percentage, isModified: !t.isNew };
//           if (field === 'workDays')  return { ...t, workDays: nextTaskWorkDays ?? t.workDays, workHours: nextTaskWorkHours ?? t.workHours, percentage: nextTaskPercentage ?? t.percentage, isModified: !t.isNew };
//           if (field === 'percentage') return { ...t, percentage: nextTaskPercentage ?? t.percentage, workHours: nextTaskWorkHours ?? t.workHours, workDays: nextTaskWorkDays ?? t.workDays, isModified: !t.isNew };
//           return { ...t, [field]: val, isModified: !t.isNew };
//         })
//       })
//     }));
//     dirty();
//   };

//   const deleteTask = (subjectId: number, stepId: number, taskId: number) => {
//     setSubjects(p => p.map(s => s.id !== subjectId ? s : {
//       ...s, steps: s.steps.map(st => st.id !== stepId ? st : {
//         ...st, tasks: st.tasks.flatMap(t => {
//           if (t.id !== taskId) return [t];
//           if (isTempId(t.id) || t.isNew) return [];
//           trackDel('taskIds', taskId);
//           return [{ ...t, isDeleted: true }];
//         }),
//       }),
//     }));
//     dirty();
//   };

//   // ── Employees ──────────────────────────────────────────────────────────────
//   const saveStepEmployees = (
//     subjectId: number,
//     stepId: number,
//     emps: EmployeeLink[],
//     scope?: { stageHours: number; hoursPerDay: number },
//   ) => {
//     const nextStageHours = scope?.stageHours;
//     const nextHoursPerDay = scope?.hoursPerDay && scope.hoursPerDay > 0 ? scope.hoursPerDay : WORK_HOURS_PER_DAY;
//     setSubjects(p => p.map(s => s.id !== subjectId ? s : {
//       ...s,
//       steps: s.steps.map(st => {
//         if (st.id !== stepId) return st;
//         const withEmployees = { ...st, employees: emps };
//         if (nextStageHours == null || !Number.isFinite(nextStageHours)) return withEmployees;
//         return {
//           ...withEmployees,
//           workHours: Math.max(0, nextStageHours),
//           workDays: Math.max(0, nextStageHours) / nextHoursPerDay,
//           isModified: !st.isNew,
//         };
//       }),
//     }));
//     dirty();
//   };
//   const saveTaskEmployees = (
//     subjectId: number,
//     stepId: number,
//     taskId: number,
//     emps: EmployeeLink[],
//     scope?: { stageHours: number; hoursPerDay: number },
//   ): boolean => {
//     const root = subjects.find(s => s.id === subjectId);
//     const step = root?.steps.find(st => st.id === stepId);
//     if (!step) return false;

//     const nextTaskHours = scope?.stageHours;
//     if (nextTaskHours != null && Number.isFinite(nextTaskHours)) {
//       const otherHours = step.tasks
//         .filter(t => t.id !== taskId && !t.isDeleted)
//         .reduce((sum, t) => sum + (t.workHours ?? 0), 0);
//       if (otherHours + nextTaskHours > step.workHours) {
//         showWarning(
//           `לא ניתן לעדכן שעות משימה: סה"כ שעות המשימות (${(otherHours + nextTaskHours).toFixed(2)}) גדול משעות השלב (${step.workHours}).`
//         );
//         return false;
//       }
//     }

//     const nextHoursPerDay = scope?.hoursPerDay && scope.hoursPerDay > 0 ? scope.hoursPerDay : WORK_HOURS_PER_DAY;
//     setSubjects(p => p.map(s => s.id !== subjectId ? s : {
//       ...s, steps: s.steps.map(st => st.id !== stepId ? st : {
//         ...st, tasks: st.tasks.map(t => {
//           if (t.id !== taskId) return t;
//           const withEmployees = { ...t, employees: emps };
//           if (nextTaskHours == null || !Number.isFinite(nextTaskHours)) return withEmployees;
//           return {
//             ...withEmployees,
//             workHours: Math.max(0, nextTaskHours),
//             workDays: Math.max(0, nextTaskHours) / nextHoursPerDay,
//             percentage: st.workHours > 0 ? (Math.max(0, nextTaskHours) / st.workHours) * 100 : 0,
//             isModified: !t.isNew,
//           };
//         }),
//       }),
//     }));
//     dirty();
//     return true;
//   };

//   const getEmpModalProps = () => {
//     if (!empModal) return null;
//     const { type, subjectId, stepId, taskId } = empModal;
//     const step = subjects.find(s => s.id === subjectId)?.steps.find(st => st.id === stepId);
//     if (!step) return null;
//     if (type === 'step') return {
//       itemType: 'stage' as const, stageName: step.name, stageDuration: step.duration, stageHours: step.workHours, statusId: step.statusId,
//       initialEmployees: step.employees.filter(e => !e.isDeleted),
//       onSave: (emps: EmployeeLink[], scope?: { stageHours: number; hoursPerDay: number }) =>
//         saveStepEmployees(subjectId, stepId, emps, scope),
//     };
//     const task = step.tasks.find(t => t.id === taskId);
//     if (!task) return null;
//     return {
//       itemType: 'task' as const, stageName: task.name, stageDuration: task.duration, stageHours: task.workHours, statusId: task.statusId,
//       initialEmployees: task.employees.filter(e => !e.isDeleted),
//       onSave: (emps: EmployeeLink[], scope?: { stageHours: number; hoursPerDay: number }) =>
//         saveTaskEmployees(subjectId, stepId, taskId!, emps, scope),
//     };
//   };

//   const empModalProps = empModal ? getEmpModalProps() : null;

//   const handleSave = async () => {
//     setSaving(true); setSaveError(null);
//     try {
//       await savePlanningHierarchy(subjects, projectId!);
//       setSaveSuccess(true); setIsDirty(false);
//       setDeletedIds({ subjectIds: [], stepIds: [], taskIds: [] });
//       setTimeout(() => setSaveSuccess(false), 3000);
//     } catch { setSaveError('שגיאה בשמירה'); }
//     finally { setSaving(false); }
//   };
//   const handleImport = async ({ templates: toImport, startDateByTemplateId }: ImportPlanningSubjectsPayload) => {
//     if (!toImport.length) return;
//     for (const t of toImport) {
//       const d = startDateByTemplateId[t.id];
//       if (!d?.trim()) {
//         showWarning('נא לבחור תאריך התחלה לכל תבנית שנבחרה.');
//         return;
//       }
//     }

//     const planningStepTemplateIds: number[] = [];
//     const planningTaskTemplateIds: number[] = [];
//     for (const tpl of toImport) {
//       for (const st of tpl.steps ?? []) {
//         if (st.id > 0) planningStepTemplateIds.push(st.id);
//         for (const tt of st.tasks ?? []) {
//           if (tt.id > 0) planningTaskTemplateIds.push(tt.id);
//         }
//       }
//     }

//     let templateEmployees: PlanningTemplateEmployeeLinksMaps = EMPTY_PLANNING_TEMPLATE_EMPLOYEE_LINKS;
//     if (planningStepTemplateIds.length || planningTaskTemplateIds.length) {
//       try {
//         templateEmployees = await getPlanningTemplateEmployeeLinks(planningStepTemplateIds, planningTaskTemplateIds);
//       } catch (e) {
//         console.error(e);
//         showWarning('לא ניתן לטעון עובדים מהתבנית; הייבוא ימשיך בלי שיוך עובדים.');
//         templateEmployees = EMPTY_PLANNING_TEMPLATE_EMPLOYEE_LINKS;
//       }
//     }

//     const built = buildPlanningSubjectsFromImportTemplates(
//       toImport,
//       startDateByTemplateId,
//       getDefaultId(statusOptions),
//       getDefaultId(urgencyOptions),
//       templateEmployees,
//     );
//     if (!built) {
//       showWarning('לא ניתן ליצור את הנושאים מהתבנית. בדקו תאריכי התחלה ותוכן התבנית.');
//       return;
//     }
//     setSubjects(built);
//     setDeletedIds({ subjectIds: [], stepIds: [], taskIds: [] });
//     dirty();
//   };

//   // ─── Render ────────────────────────────────────────────────────────────────
//   return (
//     <div className="space-y-2" dir="rtl">

//       {/* Save / Search bar — sticky */}
//       <div className="sticky top-0 z-20 bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
//         <div className="flex items-center justify-between gap-4 flex-wrap">
//           <div className="flex items-center gap-2">
//             <span className="text-xs text-gray-500">סה"כ:</span>
//             <span className="inline-flex items-center justify-center px-2 py-0.5 bg-emerald-500 text-white rounded-full text-xs font-bold min-w-[22px]">
//               {subjects.length}
//             </span>
//             <span className="text-xs text-gray-400">נושאים</span>
//           </div>

//           <div className="flex-1 max-w-md">
//             <div className="relative">
//               <Search size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
//               <input
//                 type="text"
//                 value={search}
//                 onChange={e => setSearch(e.target.value)}
//                 placeholder="חיפוש נושא / שלב / משימה..."
//                 className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
//               />
//             </div>
//           </div>

//           <div className="flex items-center gap-3">
//             <button
//               onClick={() => setOpenImport(true)}
//               className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors border border-gray-300 font-medium"
//             >
//               <Plus size={16} />
//               <span>ייבוא נושא תכנון</span>
//             </button>

//             {saveError && (
//               <span className="flex items-center gap-1 text-red-600 text-sm">
//                 <AlertCircle size={14} />
//                 {saveError}
//               </span>
//             )}
//             {saveSuccess && (
//               <span className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
//                 <CheckCircle size={14} />
//                 נשמר!
//               </span>
//             )}
//             {isDirty && <span className="text-xs text-orange-500 font-semibold">● שינויים שלא נשמרו</span>}

//             {isDirty && (
//               <button
//                 type="button"
//                 onClick={() => void handleCancelChanges()}
//                 disabled={saving || reloadPending}
//                 className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
//               >
//                 {reloadPending ? (
//                   <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
//                 ) : (
//                   <RotateCcw size={16} />
//                 )}
//                 בטל שינויים
//               </button>
//             )}

//             <button
//               onClick={handleSave}
//               disabled={saving || reloadPending || !isDirty}
//               className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors border font-medium ${
//                 saving
//                   ? 'bg-gray-300 text-gray-500 border-gray-300 cursor-not-allowed'
//                   : saveSuccess
//                     ? 'bg-emerald-500 text-white border-emerald-600'
//                     : !isDirty
//                       ? 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed'
//                       : 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600'
//               }`}
//             >
//               {saving
//                 ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />שומר...</>
//                 : <><Save size={16} />שמור הכל</>}
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* Subjects */}
//       {filtered.map(subject => (
//         <SubjectBlock
//           key={subject.id}
//           subject={subject}
//           focusedStepId={focusedStepId}
//           statusOptions={statusOptions}
//           urgencyOptions={urgencyOptions}
//           onUpdateSubject={updateSubject}
//           onDeleteSubject={deleteSubject}
//           onAddStep={addStep}
//           onUpdateStep={updateStep}
//           onUpdateStepBatch={updateStepBatch}
//           onDeleteStep={deleteStep}
//           onToggleStep={toggleStep}
//           onReorderSteps={reorderSteps}
//           onAddTask={addTask}
//           onUpdateTask={updateTask}
//           onDeleteTask={deleteTask}
//           onReorderTasks={reorderTasks}
//           onOpenStepEmployees={(stepId) => setEmpModal({ type: 'step', subjectId: subject.id, stepId })}
//           onOpenTaskEmployees={(stepId, taskId) => setEmpModal({ type: 'task', subjectId: subject.id, stepId, taskId })}
//           onOpenSubContracts={() => setSubModal({ subjectId: subject.id, name: subject.name })}
//           onWarn={showWarning}
//           onConfirm={openConfirm}
//           allSubjects={subjects}
//           handleStepStartDateWithDependency={handleStepStartDateWithDependency}
//         />
//       ))}

//       <button onClick={addSubject}
//         className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all">
//         <Plus size={15}/> הוסף נושא תכנון חדש
//       </button>

//       {empModal && empModalProps && (
//         <LinkEmployeesToStageModal
//           itemType={empModalProps.itemType} stageName={empModalProps.stageName}
//           stageDuration={empModalProps.stageDuration} stageHours={empModalProps.stageHours}
//           statusId={empModalProps.statusId} hoursPerDay={WORK_HOURS_PER_DAY}
//           initialEmployees={empModalProps.initialEmployees}
//           onClose={() => setEmpModal(null)}
//           onSave={(emps, scope) => {
//             const ok = empModalProps.onSave(emps, scope);
//             if (ok === false) return false;
//             setEmpModal(null);
//             return true;
//           }}
//         />
//       )}

//       {subModal && (
//         <SubcontractsModal
//           subjectId={subModal.subjectId} subjectName={subModal.name}
//           linkedIds={subjects.find(s => s.id === subModal.subjectId)?.subContractsLink?.filter(l => !l.isDeleted) ?? []}
//           onSave={items => {
//             setSubjects(p => p.map(s => s.id === subModal.subjectId
//               ? { ...s, subContractsLink: mergeSubContractLinks(s.subContractsLink ?? [], items), isModified: true } : s));
//             dirty();
//           }}
//           onClose={() => setSubModal(null)}
//           subContractsOptions={subContractsOptions}
//           usedSubContractIds={new Set(
//             subjects
//               .filter(s => s.id !== subModal.subjectId && !s.isDeleted)
//               .flatMap(s => (s.subContractsLink ?? []).filter(l => !l.isDeleted).map(l => l.id))
//           )}
//         />
//       )}

//       {openImport && (
//         <ImportSubjectTemplatesModal projectId={projectId!} onImport={handleImport} onClose={() => setOpenImport(false)}/>
//       )}

//       <MessageBox
//         isOpen={messageBox.isOpen} onClose={closeMessageBox}
//         title={messageBox.title} message={messageBox.message} type={messageBox.type}
//         confirmText={messageBox.confirmText ?? 'אישור'} cancelText={messageBox.cancelText ?? 'ביטול'}
//         showCancel={messageBox.showCancel} onConfirm={messageBox.onConfirm} onCancel={messageBox.onCancel}
//       />
//     </div>
//   );
// }

// // ─── SubjectBlock — extracted to allow per-subject drag state ─────────────────
// function SubjectBlock({
//   subject, focusedStepId, statusOptions, urgencyOptions,
//   onUpdateSubject, onDeleteSubject,
//   onAddStep, onUpdateStep, onUpdateStepBatch, onDeleteStep, onToggleStep, onReorderSteps,
//   onAddTask, onUpdateTask, onDeleteTask, onReorderTasks,
//   onOpenStepEmployees, onOpenTaskEmployees, onOpenSubContracts,
//   onWarn, onConfirm,
//   allSubjects,
//   handleStepStartDateWithDependency,
// }: {
//   subject: PlanningSubject;
//   focusedStepId: number | null;
//   statusOptions: SystemTable[];
//   urgencyOptions: SystemTable[];
//   onUpdateSubject: (id: number, field: string, val: any) => void;
//   onDeleteSubject: (id: number) => void;
//   onAddStep: (subjectId: number) => void;
//   onUpdateStep: (subjectId: number, stepId: number, field: string, val: any) => void;
//   onUpdateStepBatch: (subjectId: number, stepId: number, fields: Partial<PlanningStep>) => void;
//   onDeleteStep: (subjectId: number, stepId: number) => void;
//   onToggleStep: (subjectId: number, stepId: number) => void;
//   onReorderSteps: (subjectId: number, newSteps: PlanningStep[]) => void;
//   onAddTask: (subjectId: number, stepId: number) => void;
//   onUpdateTask: (subjectId: number, stepId: number, taskId: number, field: string, val: any) => Promise<void>;
//   onDeleteTask: (subjectId: number, stepId: number, taskId: number) => void;
//   onReorderTasks: (subjectId: number, stepId: number, newTasks: PlanningTask[]) => void;
//   onOpenStepEmployees: (stepId: number) => void;
//   onOpenTaskEmployees: (stepId: number, taskId: number) => void;
//   onOpenSubContracts: () => void;
//   onWarn: (msg: string) => void;
//   onConfirm: (msg: string, title?: string) => Promise<boolean>;
//   allSubjects: PlanningSubject[];
//   handleStepStartDateWithDependency: (subjectId: number, stepId: number, newStart: string, prevStep: PlanningStep) => Promise<void>;
// }) {
//   const visibleSteps = subject.steps.filter(st => !st.isDeleted);

//   const { getDragProps: getStepDragProps } = useDragDrop(
//     visibleSteps,
//     (newSteps) => onReorderSteps(subject.id, newSteps),
//   );

//   return (
//     <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
//       <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 border-b border-amber-200">
//         <button onClick={() => onUpdateSubject(subject.id, 'isExpanded', !subject.isExpanded)} className="p-1 hover:bg-amber-200 rounded-lg shrink-0">
//           {subject.isExpanded ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}
//         </button>
//         <input type="text" value={subject.name} onChange={e => onUpdateSubject(subject.id, 'name', e.target.value)}
//           className="flex-1 min-w-0 px-3 py-1.5 text-sm font-bold border-2 border-amber-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-400"/>
//         <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${subject.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
//           {subject.isActive ? 'פעיל' : 'לא פעיל'}
//         </span>
//         <label className="flex items-center gap-1.5 cursor-pointer shrink-0 text-xs text-gray-600">
//           <input type="checkbox" checked={subject.isActive} onChange={() => onUpdateSubject(subject.id, 'isActive', !subject.isActive)} className="w-4 h-4 accent-emerald-500"/>פעיל
//         </label>
//         <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold shrink-0">
//           {visibleSteps.length} שלבים
//         </span>
//         <button onClick={onOpenSubContracts}
//           className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-lg text-xs font-bold transition-all shrink-0">
//           <Link size={13}/>תתי חוזים
//           <span className={`rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold ${
//             (subject.subContractsLink?.filter(l => !l.isDeleted).length ?? 0) > 0
//               ? 'bg-indigo-600 text-white'
//               : 'bg-indigo-200 text-indigo-200'
//           }`}>
//             {subject.subContractsLink?.filter(l => !l.isDeleted).length ?? 0}
//           </span>
//         </button>
//         <button onClick={() => onDeleteSubject(subject.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0">
//           <Trash2 size={16}/>
//         </button>
//       </div>

//       {subject.isExpanded && (
//         <div className="p-2 space-y-1 bg-gray-50">
//           <div className="overflow-x-auto pb-1">
//             <div className="min-w-max space-y-2">
//               {visibleSteps.length > 0 && <ColHeaders forStep/>}

//               {visibleSteps.map((step, stepIdx) => {
//                 // Find previous visible step for dependency logic
//                 const prevStep = stepIdx > 0 ? visibleSteps[stepIdx - 1] : null;
//                 const isFirst = stepIdx === 0;

//                 return (
//                   <div
//                     key={step.id}
//                     data-step-id={step.id}
//                     data-subject-id={subject.id}
//                     {...getStepDragProps(stepIdx)}
//                     className={`transition-all ${focusedStepId === step.id ? 'bg-emerald-50 rounded-lg' : ''}`}
//                   >
//                     <StepRow
//                       step={step}
//                       isFirst={isFirst}
//                       subjectSteps={visibleSteps}
//                       onChange={(f, v) => {
//                         void (async () => {
//                           const isoDisp = (d: string) => toInputDate(d).split('-').reverse().join('/');

//                           // Handle startDate with dependency check (dependent step changing its own start)
//                           if (f === 'startDate' && !isFirst && step.dependsOnStepId && prevStep) {
//                             const newStart = String(v);
//                             const newEndPreview = addDays(newStart, Math.max(1, Math.floor(Number(step.duration))) - 1);
//                             const yes = await onConfirm(
//                               `עדכון תאריך התחלה לשלב "${step.name}" (תלוי ב־"${prevStep.name}"):\n\n` +
//                               `תאריך התחלה המבוקש: ${isoDisp(newStart)}\n` +
//                               `תאריך סיום (לפי משך נוכחי): ${isoDisp(newEndPreview)}\n\n` +
//                               `אם התאריך חופף לשלב הקודם, תוצג שאלה נוספת לקיצור השלב הקודם.\n\nלהמשיך?`,
//                               'עדכון תאריך שלב'
//                             );
//                             if (!yes) return;
//                             await handleStepStartDateWithDependency(subject.id, step.id, newStart, prevStep);
//                             return;
//                           }
//                           // When enabling / disabling step dependency
//                           if (f === 'dependsOnStepId' && prevStep) {
//                             if (v === true) {
//                               const prevEnd = toInputDate(prevStep.endDate);
//                               const curStart = toInputDate(step.startDate);
//                               let extra = '';
//                               if (curStart && prevEnd && curStart < prevEnd) {
//                                 const newStart = addDays(prevEnd, 1);
//                                 const keepDuration = Math.max(1, Math.floor(Number(step.duration)));
//                                 const newEnd = addDays(newStart, keepDuration - 1);
//                                 extra =
//                                   `\n\nתאריכי השלב יותאמו אוטומטית:\nהתחלה: ${isoDisp(newStart)}, סיום: ${isoDisp(newEnd)}.`;
//                               }
//                               const yes = await onConfirm(
//                                 `להפוך את השלב "${step.name}" לתלוי בשלב הקודם "${prevStep.name}"?${extra}\n\nלאשר?`,
//                                 'תלות בשלב'
//                               );
//                               if (!yes) return;
//                               if (curStart && prevEnd && curStart < prevEnd) {
//                                 const newStart = addDays(prevEnd, 1);
//                                 const keepDuration = Math.max(1, Math.floor(Number(step.duration)));
//                                 const newEnd = addDays(newStart, keepDuration - 1);
//                                 onUpdateStepBatch(subject.id, step.id, { startDate: newStart, endDate: newEnd });
//                               }
//                               onUpdateStep(subject.id, step.id, f, v);
//                               return;
//                             }
//                             const yesOff = await onConfirm(
//                               `לבטל את התלות של השלב "${step.name}" בשלב הקודם "${prevStep.name}"?\n\nלאשר?`,
//                               'ביטול תלות בשלב'
//                             );
//                             if (!yesOff) return;
//                             onUpdateStep(subject.id, step.id, f, v);
//                             return;
//                           }
//                           // For startDate changes: batch startDate+endDate (+ shorten prev step if overlap — same idea as TaskRow)
//                           if (f === 'startDate') {
//                             const newStart = String(v);
//                             const curDur = Math.max(1, Math.floor(Number(step.duration)));
//                             const newEnd = addDays(newStart, curDur - 1);

//                             if (!isFirst && prevStep) {
//                               const prevStart = toInputDate(prevStep.startDate);
//                               const prevEnd = toInputDate(prevStep.endDate);
//                               if (prevStart && newStart < prevStart) {
//                                 onWarn(
//                                   `לא ניתן להתחיל לפני תאריך ההתחלה של השלב הקודם (${isoDisp(prevStart)})`
//                                 );
//                                 return;
//                               }
//                               if (prevStart && prevEnd && newStart <= prevEnd) {
//                                 const newPrevEnd = addDays(newStart, -1);
//                                 const yesShort = await onConfirm(
//                                   `תאריך ההתחלה החדש (${isoDisp(newStart)}) נמצא בתוך טווח השלב הקודם ("${prevStep.name}").\n\n` +
//                                   `האם לקצר את השלב הקודם עד ${isoDisp(newPrevEnd)}?`,
//                                   'קיצור שלב קודם'
//                                 );
//                                 if (!yesShort) return;
//                                 const newPrevDur = Math.max(1, dateDiffDays(prevStart, newPrevEnd) + 1);
//                                 onUpdateStepBatch(subject.id, prevStep.id, {
//                                   endDate: newPrevEnd,
//                                   duration: newPrevDur,
//                                 });
//                                 onUpdateStepBatch(subject.id, step.id, { startDate: newStart, endDate: newEnd });
//                                 return;
//                               }
//                             }

//                             const yes = await onConfirm(
//                               `לעדכן את השלב "${step.name}"?\n\n` +
//                               `תאריך התחלה: ${isoDisp(newStart)}\n` +
//                               `תאריך סיום: ${isoDisp(newEnd)} (משך ${curDur} ימים)\n\nלאשר?`,
//                               'עדכון תאריך התחלה'
//                             );
//                             if (!yes) return;
//                             onUpdateStepBatch(subject.id, step.id, { startDate: newStart, endDate: newEnd });
//                             return;
//                           }
//                           // For endDate changes: batch endDate+duration together (+ cascade dependent steps)
//                           if (f === 'endDate') {
//                             const endVal = String(v);
//                             const start = toInputDate(step.startDate);
//                             const newDur = start ? Math.max(1, dateDiffDays(start, endVal) + 1) : step.duration;
//                             const cascadeNames: string[] = [];
//                             for (let i = stepIdx + 1; i < visibleSteps.length; i++) {
//                               const followingStep = visibleSteps[i];
//                               if (!(followingStep.dependsOnStepId ?? false)) break;
//                               cascadeNames.push(followingStep.name);
//                             }
//                             let msg =
//                               `לעדכן את השלב "${step.name}"?\n\n` +
//                               `תאריך סיום: ${isoDisp(endVal)}\n` +
//                               `משך השלב: ${newDur} ימים\n`;
//                             if (cascadeNames.length) {
//                               msg +=
//                                 `\nשלבים תלויים שיוזזו אוטומטית (יום אחרי סיום השלב הקודם):\n• ${cascadeNames.join('\n• ')}\n`;
//                             }
//                             msg += `\nלאשר?`;
//                             const yes = await onConfirm(msg, 'עדכון תאריך סיום');
//                             if (!yes) return;
//                             onUpdateStepBatch(subject.id, step.id, { endDate: endVal, duration: newDur });

//                             let prevEndForCascade = endVal;
//                             for (let i = stepIdx + 1; i < visibleSteps.length; i++) {
//                               const followingStep = visibleSteps[i];
//                               if (!(followingStep.dependsOnStepId ?? false)) break;

//                               const followingStart = addDays(prevEndForCascade, 1);
//                               const followingDuration = Math.max(1, Math.floor(Number(followingStep.duration)));
//                               const followingEnd = addDays(followingStart, followingDuration - 1);
//                               onUpdateStepBatch(subject.id, followingStep.id, { startDate: followingStart, endDate: followingEnd });
//                               prevEndForCascade = followingEnd;
//                             }
//                             return;
//                           }
//                           // For duration changes: batch duration+endDate together
//                           if (f === 'duration') {
//                             const newDur = Math.max(1, Math.floor(Number(v)));
//                             const start = toInputDate(step.startDate);
//                             const newEnd = start ? addDays(start, newDur - 1) : step.endDate;
//                             const yes = await onConfirm(
//                               `לעדכן את משך השלב "${step.name}"?\n\n` +
//                               `משך: ${newDur} ימים\n` +
//                               (start ? `תאריך סיום חדש: ${isoDisp(newEnd)}\n` : '') +
//                               `\nלאשר?`,
//                               'עדכון משך שלב'
//                             );
//                             if (!yes) return;
//                             onUpdateStepBatch(subject.id, step.id, { duration: newDur, endDate: newEnd });
//                             return;
//                           }
//                           onUpdateStep(subject.id, step.id, f, v);
//                         })();
//                       }}
//                       onDelete={() => onDeleteStep(subject.id, step.id)}
//                       onToggle={() => onToggleStep(subject.id, step.id)}
//                       onOpenEmployees={() => onOpenStepEmployees(step.id)}
//                       statusOptions={statusOptions}
//                       urgencyOptions={urgencyOptions}
//                       onWarn={onWarn}
//                       dragHandleProps={{}} // drag handled by wrapper div above
//                     />

//                     {step.isExpanded && (
//                       <TasksBlock
//                         subject={subject}
//                         step={step}
//                         statusOptions={statusOptions}
//                         urgencyOptions={urgencyOptions}
//                         onAddTask={onAddTask}
//                         onUpdateTask={onUpdateTask}
//                         onDeleteTask={onDeleteTask}
//                         onReorderTasks={onReorderTasks}
//                         onOpenTaskEmployees={onOpenTaskEmployees}
//                         onWarn={onWarn}
//                         onConfirm={onConfirm}
//                         onUpdateStepDuration={(newDur) => onUpdateStepBatch(subject.id, step.id, { duration: newDur, endDate: addDays(toInputDate(step.startDate), newDur - 1) })}
//                         onUpdateStepDateRange={(newStart, newEnd, newDuration) =>
//                           onUpdateStepBatch(subject.id, step.id, { startDate: newStart, endDate: newEnd, duration: newDuration })
//                         }
//                       />
//                     )}
//                   </div>
//                 );
//               })}

//               {visibleSteps.length > 0 && (
//                 <div className="border border-emerald-300 rounded-lg bg-emerald-50">
//                   <div className="overflow-x-auto">
//                     <div className="min-w-max">
//                       <div className="flex items-center gap-1.5 px-2 py-1">
//                         <div className="w-5 shrink-0"/>
//                         <div className="w-6 shrink-0"/>
//                         <div className="w-10 shrink-0"/>
//                         <div className="flex-1 text-right font-bold text-emerald-800 text-xs">סה"כ</div>
//                         <div className="w-16 shrink-0 text-center font-bold text-emerald-800 bg-emerald-100 rounded px-1 py-0.5 text-xs">{visibleSteps.reduce((s, st) => s + st.percentage, 0).toFixed(1)}%</div>
//                         <div className="w-16 shrink-0 text-center font-bold text-emerald-800 bg-emerald-100 rounded px-1 py-0.5 text-xs">{visibleSteps.reduce((s, st) => s + st.workHours, 0).toFixed(1)}</div>
//                         <div className="w-14 shrink-0 text-center font-bold text-emerald-800 bg-emerald-100 rounded px-1 py-0.5 text-xs">{visibleSteps.reduce((s, st) => s + st.workDays, 0).toFixed(1)}</div>
//                         <div className="w-28 shrink-0 text-center text-gray-300 text-xs">-</div>
//                         <div className="w-28 shrink-0 text-center text-gray-300 text-xs">-</div>
//                         <div className="w-12 shrink-0"/><div className="w-16 shrink-0"/><div className="w-24 shrink-0"/><div className="w-24 shrink-0"/><div className="w-24 shrink-0"/><div className="w-8 shrink-0"/><div className="w-8 shrink-0"/>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>
//           <button onClick={() => onAddStep(subject.id)}
//             className="w-full py-1.5 border border-dashed border-blue-400 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-semibold transition-all">
//             + הוסף שלב
//           </button>
//         </div>
//       )}
//     </div>
//   );
// }

// // ─── TasksBlock — extracted for per-step drag state ───────────────────────────
// function TasksBlock({
//   subject, step, statusOptions, urgencyOptions,
//   onAddTask, onUpdateTask, onDeleteTask, onReorderTasks,
//   onOpenTaskEmployees, onWarn, onConfirm, onUpdateStepDuration, onUpdateStepDateRange,
// }: {
//   subject: PlanningSubject;
//   step: PlanningStep;
//   statusOptions: SystemTable[];
//   urgencyOptions: SystemTable[];
//   onAddTask: (subjectId: number, stepId: number) => void;
//   onUpdateTask: (subjectId: number, stepId: number, taskId: number, field: string, val: any) => Promise<void>;
//   onDeleteTask: (subjectId: number, stepId: number, taskId: number) => void;
//   onReorderTasks: (subjectId: number, stepId: number, newTasks: PlanningTask[]) => void;
//   onOpenTaskEmployees: (stepId: number, taskId: number) => void;
//   onWarn: (msg: string) => void;
//   onConfirm: (msg: string, title?: string) => Promise<boolean>;
//   onUpdateStepDuration: (newDuration: number) => void;
//   onUpdateStepDateRange: (newStart: string, newEnd: string, newDuration: number) => void;
// }) {
//   const visibleTasks = step.tasks.filter(t => !t.isDeleted);

//   /**
//    * Dry-run the dependency chain: given task at `fromIdx` ends on `parentEnd`,
//    * returns the calendar end date of the last task that would still be updated (or `parentEnd` if none).
//    */
//   const computeCascadeTailEnd = (fromIdx: number, parentEnd: string): string => {
//     let prevEnd = parentEnd;
//     for (let i = fromIdx + 1; i < visibleTasks.length; i++) {
//       const t = visibleTasks[i];
//       if (!(t.dependsOnTaskId ?? false)) break;
//       const start = addDays(prevEnd, 1);
//       const dur = Math.max(1, Math.floor(Number(t.duration)));
//       prevEnd = addDays(start, dur - 1);
//     }
//     return prevEnd;
//   };

//   /** Apply cascade: each following task with dependsOnTaskId starts the day after previous task's end. */
//   const laterIsoDate = (a: string, b: string): string => (a >= b ? a : b);

//   const cascadeForwardFromParentEnd = async (fromIdx: number, parentEnd: string): Promise<void> => {
//     let prevEnd = parentEnd;
//     for (let i = fromIdx + 1; i < visibleTasks.length; i++) {
//       const t = visibleTasks[i];
//       if (!(t.dependsOnTaskId ?? false)) break;
//       const start = addDays(prevEnd, 1);
//       const dur = Math.max(1, Math.floor(Number(t.duration)));
//       const end = addDays(start, dur - 1);
//       await onUpdateTask(subject.id, step.id, t.id, 'startDate', start);
//       await onUpdateTask(subject.id, step.id, t.id, 'endDate', end);
//       prevEnd = end;
//     }
//   };

//   const { getDragProps: getTaskDragProps } = useDragDrop(
//     visibleTasks,
//     (newTasks) => onReorderTasks(subject.id, step.id, newTasks),
//   );

//   // Called by TaskRow when task duration > step duration
//   const handleConfirmStepDuration = async (newTaskDuration: number): Promise<void> => {
//     const yes = await onConfirm(
//       `משך זמן המשימה (${newTaskDuration} ימים) גדול ממשך זמן השלב (${step.duration} ימים).\n\nהאם להגדיל את משך זמן השלב ל-${newTaskDuration} ימים?`
//     );
//     if (yes) onUpdateStepDuration(newTaskDuration);
//   };

//   return (
//     <div className="mr-6 mt-1 space-y-1 p-2 bg-purple-50 rounded-xl border border-purple-200">
//       {visibleTasks.length > 0 && (
//         <>
//           <ColHeaders/>
//           {visibleTasks.map((task, taskIdx) => (
//             <div
//               key={task.id}
//               {...getTaskDragProps(taskIdx)}
//               className="transition-opacity"
//             >
//               <TaskRow
//                 task={task}
//                 isFirst={taskIdx === 0}
//                 steps={subject.steps.filter(st => !st.isDeleted)}
//                 onChange={(f, v) => {
//                   void (async () => {
//                     const prevTask = taskIdx > 0 ? visibleTasks[taskIdx - 1] : null;
//                     const isFirstTask = taskIdx === 0;
//                     const stepStart = toInputDate(step.startDate);
//                     const stepEnd = toInputDate(step.endDate);

//                     const ensureStepRangeCoversTask = async (taskStart: string, taskEnd: string): Promise<boolean> => {
//                       const nextStepStart = stepStart && taskStart < stepStart ? taskStart : stepStart;
//                       const nextStepEnd = stepEnd && taskEnd > stepEnd ? taskEnd : stepEnd;
//                       if (!nextStepStart || !nextStepEnd) return true;
//                       if (nextStepStart === stepStart && nextStepEnd === stepEnd) return true;
//                       const nextStepDuration = Math.max(1, dateDiffDays(nextStepStart, nextStepEnd) + 1);
//                       const yes = await onConfirm(
//                         `תאריך השלב יתעדכן: ${nextStepStart.split('-').reverse().join('/')} עד ${nextStepEnd.split('-').reverse().join('/')}.\n\nלאשר?`,
//                         'עדכון תאריכים'
//                       );
//                       if (!yes) return false;
//                       onUpdateStepDateRange(nextStepStart, nextStepEnd, nextStepDuration);
//                       return true;
//                     };

//                     // Handle startDate with dependency check (dependent task changing its own start)
//                     if (f === 'startDate' && !isFirstTask && (task.dependsOnTaskId ?? false) && prevTask) {
//                       const prevStart = toInputDate(prevTask.startDate);
//                       const prevEnd = toInputDate(prevTask.endDate);
//                       const newStart = String(v);

//                       if (newStart < prevStart) {
//                         onWarn(`לא ניתן להתחיל לפני תאריך ההתחלה של המשימה הקודמת (${prevStart.split('-').reverse().join('/')})`);
//                         return;
//                       }

//                       if (newStart <= prevEnd) {
//                         const newPrevEnd = addDays(newStart, -1);
//                         const yes = await onConfirm(
//                           `תאריך ההתחלה החדש (${newStart.split('-').reverse().join('/')}) נמצא בתוך טווח המשימה הקודמת.\n\n` +
//                           `האם לקצר את המשימה הקודמת עד ${newPrevEnd.split('-').reverse().join('/')}?`
//                         );
//                         if (!yes) return;
//                         const newPrevDur = Math.max(1, dateDiffDays(prevStart, newPrevEnd) + 1);
//                         await onUpdateTask(subject.id, step.id, prevTask.id, 'endDate', newPrevEnd);
//                         await onUpdateTask(subject.id, step.id, prevTask.id, 'duration', newPrevDur);
//                       }

//                       const curDur = Math.max(1, Math.floor(Number(task.duration)));
//                       const newEnd = addDays(newStart, curDur - 1);
//                       const tailEnd = computeCascadeTailEnd(taskIdx, newEnd);
//                       const canApply = await ensureStepRangeCoversTask(newStart, laterIsoDate(newEnd, tailEnd));
//                       if (!canApply) return;
//                       await onUpdateTask(subject.id, step.id, task.id, 'startDate', newStart);
//                       await onUpdateTask(subject.id, step.id, task.id, 'endDate', newEnd);
//                       await cascadeForwardFromParentEnd(taskIdx, newEnd);
//                       return;
//                     }

//                     // When enabling dependency for current task: ensure previous task aligns
//                     if (f === 'dependsOnTaskId' && v === true && prevTask) {
//                       let cascadeFromEnd: string | null = null;
//                       const curStart = toInputDate(task.startDate);
//                       const prevEnd = toInputDate(prevTask.endDate);
//                       if (curStart && prevEnd && curStart < prevEnd) {
//                         const newStart = addDays(prevEnd, 1);
//                         const keepDuration = Math.max(1, Math.floor(Number(task.duration)));
//                         const newEnd = addDays(newStart, keepDuration - 1);
//                         const tailEnd = computeCascadeTailEnd(taskIdx, newEnd);
//                         const canApply = await ensureStepRangeCoversTask(newStart, laterIsoDate(newEnd, tailEnd));
//                         if (!canApply) return;
//                         await onUpdateTask(subject.id, step.id, task.id, 'startDate', newStart);
//                         await onUpdateTask(subject.id, step.id, task.id, 'endDate', newEnd);
//                         cascadeFromEnd = newEnd;
//                       }
//                       await onUpdateTask(subject.id, step.id, task.id, f, v);
//                       if (cascadeFromEnd) await cascadeForwardFromParentEnd(taskIdx, cascadeFromEnd);
//                       return;
//                     }

//                     // For startDate changes: batch startDate+endDate behavior
//                     if (f === 'startDate') {
//                       const newStart = String(v);
//                       const newEnd = addDays(newStart, Math.max(1, Math.floor(Number(task.duration))) - 1);
//                       const tailEnd = computeCascadeTailEnd(taskIdx, newEnd);
//                       const canApply = await ensureStepRangeCoversTask(newStart, laterIsoDate(newEnd, tailEnd));
//                       if (!canApply) return;
//                       await onUpdateTask(subject.id, step.id, task.id, 'startDate', newStart);
//                       await onUpdateTask(subject.id, step.id, task.id, 'endDate', newEnd);
//                       await cascadeForwardFromParentEnd(taskIdx, newEnd);
//                       return;
//                     }

//                     // For endDate changes: batch endDate+duration behavior
//                     if (f === 'endDate') {
//                       const endVal = String(v);
//                       const start = toInputDate(task.startDate);
//                       const newDur = start ? Math.max(1, dateDiffDays(start, endVal) + 1) : task.duration;
//                       const rangeStart = start || endVal;
//                       const tailEnd = computeCascadeTailEnd(taskIdx, endVal);
//                       const canApply = await ensureStepRangeCoversTask(rangeStart, laterIsoDate(endVal, tailEnd));
//                       if (!canApply) return;
//                       await onUpdateTask(subject.id, step.id, task.id, 'endDate', endVal);
//                       await onUpdateTask(subject.id, step.id, task.id, 'duration', newDur);
//                       await cascadeForwardFromParentEnd(taskIdx, endVal);
//                       return;
//                     }

//                     // For duration changes: batch duration+endDate behavior
//                     if (f === 'duration') {
//                       const newDuration = Math.max(1, Math.floor(Number(v)));
//                       const start = toInputDate(task.startDate);
//                       const newEnd = start ? addDays(start, newDuration - 1) : String(task.endDate ?? '');
//                       if (!start || !newEnd) {
//                         await onUpdateTask(subject.id, step.id, task.id, 'duration', newDuration);
//                         await onUpdateTask(subject.id, step.id, task.id, 'endDate', task.endDate);
//                         return;
//                       }
//                       const tailEnd = computeCascadeTailEnd(taskIdx, newEnd);
//                       const canApply = await ensureStepRangeCoversTask(start, laterIsoDate(newEnd, tailEnd));
//                       if (!canApply) return;
//                       await onUpdateTask(subject.id, step.id, task.id, 'duration', newDuration);
//                       await onUpdateTask(subject.id, step.id, task.id, 'endDate', newEnd);
//                       await cascadeForwardFromParentEnd(taskIdx, newEnd);
//                       return;
//                     }

//                     await onUpdateTask(subject.id, step.id, task.id, f, v);
//                   })();
//                 }}
//                 onDelete={() => onDeleteTask(subject.id, step.id, task.id)}
//                 onOpenEmployees={() => onOpenTaskEmployees(step.id, task.id)}
//                 statusOptions={statusOptions}
//                 urgencyOptions={urgencyOptions}
//                 onWarn={onWarn}
//                 stepDuration={step.duration}
//                 onConfirmStepDuration={handleConfirmStepDuration}
//                 dragHandleProps={{}}
//               />
//             </div>
//           ))}
//           {/* Totals row */}
//           <div className="border border-purple-200 rounded-lg bg-purple-50">
//             <div className="overflow-x-auto">
//               <div className="min-w-max">
//                 <div className="flex items-center gap-1.5 px-2 py-1">
//                   <div className="w-5 shrink-0"/>
//                   <div className="w-10 shrink-0 text-right font-bold text-purple-800 text-xs">סה"כ</div>
//                   <div className="flex-1"/>
//                   <div className="w-16 shrink-0 text-center font-bold text-purple-800 bg-purple-100 rounded px-1 py-0.5 text-xs">{visibleTasks.reduce((s, t) => s + t.percentage, 0).toFixed(1)}%</div>
//                   <div className="w-16 shrink-0 text-center font-bold text-purple-800 bg-purple-100 rounded px-1 py-0.5 text-xs">{visibleTasks.reduce((s, t) => s + t.workHours, 0).toFixed(1)}</div>
//                   <div className="w-14 shrink-0 text-center font-bold text-purple-800 bg-purple-100 rounded px-1 py-0.5 text-xs">{visibleTasks.reduce((s, t) => s + t.workDays, 0).toFixed(1)}</div>
//                   <div className="w-28 shrink-0 text-center text-gray-300 text-xs">-</div>
//                   <div className="w-28 shrink-0 text-center text-gray-300 text-xs">-</div>
//                   <div className="w-12 shrink-0"/><div className="w-16 shrink-0"/><div className="w-24 shrink-0"/><div className="w-24 shrink-0"/><div className="w-24 shrink-0"/><div className="w-8 shrink-0"/><div className="w-8 shrink-0"/>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </>
//       )}
//       <button onClick={() => onAddTask(subject.id, step.id)}
//         className="w-full py-1.5 border border-dashed border-purple-400 text-purple-600 hover:bg-purple-100 rounded-lg text-xs font-semibold transition-all">
//         + הוסף משימה
//       </button>
//     </div>
//   );
// }