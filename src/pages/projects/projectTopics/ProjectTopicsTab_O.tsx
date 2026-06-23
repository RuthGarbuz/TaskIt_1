// import { useState, useMemo, useEffect } from 'react';
// import {
//   Plus, Trash2, ChevronDown, ChevronRight,
//   Users, Save, CheckCircle, AlertCircle,
//   Search, Link,
// } from 'lucide-react';
// import type { EmployeeLink, PlanningStep, PlanningSubject, PlanningTask, SubContract, SubContractLink, SystemTable } from '../../../Data/projectsData';
// import { getPlanningHierarchy, getPlanningSystemLists, savePlanningHierarchy } from '../../../services/projectPlanningService';
// import LinkEmployeesToStageModal from '../../shared/LinkEmployeesToStageModal';
// import SubcontractsModal from './SubcontractsModal';
// import ImportSubjectTemplatesModal from './ImportSubjectTempLatesModal';
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

// const isTempId = (id: number) => id > 1_000_000_000_000;
// const WORK_HOURS_PER_DAY = 8;

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

// // ─── DateInput — תמיד DD/MM/YYYY ─────────────────────────────────────────────
// function DateInput({
//   value, onChange, className = '', ringColor = 'focus-within:ring-blue-300',
// }: {
//   value: string;
//   onChange: (v: string) => void;
//   className?: string;
//   ringColor?: string;
// }) {
//   const toDisplay = (iso: string) => {
//     if (!iso) return '';
//     const [y, m, d] = iso.split('-');
//     if (!y || !m || !d) return iso;
//     return `${d}/${m}/${y}`;
//   };

//   return (
//     <div className={`relative flex items-center border border-gray-300 rounded-lg bg-white overflow-hidden focus-within:ring-2 ${ringColor} ${className}`}>
//       {/* תצוגה גלויה DD/MM/YYYY */}
//       <span className="px-1.5 py-1.5 text-xs pointer-events-none select-none flex-1 whitespace-nowrap">
//         {toDisplay(value) || <span className="text-gray-400">dd/mm/yyyy</span>}
//       </span>
//       {/* input נסתר — שקוף אבל לחיץ */}
//       <input
//         type="date"
//         value={value}
//         onChange={e => onChange(e.target.value)}
//         className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
//       />
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
//       style={{
//         color: selectedColor || undefined,
//         borderColor: selectedColor || undefined,
//       }}
//     >
//       {options.map(o => (
//         <option key={o.id} value={o.id}>{o.name}</option>
//       ))}
//     </select>
//   );
// }

// // ─── Step Row ─────────────────────────────────────────────────────────────────
// function StepRow({
//   step, onChange, onDelete, onToggle, onOpenEmployees, statusOptions, urgencyOptions,
// }: {
//   step: PlanningStep;
//   subjectSteps: PlanningStep[];
//   onChange: (field: string, value: any) => void;
//   onDelete: () => void;
//   onToggle: () => void;
//   onOpenEmployees: () => void;
//   statusOptions: SystemTable[];
//   urgencyOptions: SystemTable[];
// }) {
//   const numInput = (field: string, val: number, min = 0, step2 = 1) => (
//     <input
//       type="number" min={min} step={step2}
//       value={val}
//       onChange={e => onChange(field, Number(e.target.value))}
//       className="w-full px-1.5 py-1.5 border border-gray-300 rounded-lg text-xs text-center focus:ring-2 focus:ring-blue-300"
//     />
//   );

//   const employeeCountForStage = (stage: PlanningStep): number => {
//     const stageEmployeeIds = new Set(stage.employees.filter(e => !e.isDeleted).map(e => e.employeeId));
//     const taskEmployeeIds = new Set(
//       stage.tasks.flatMap(t => t.employees.filter(e => !e.isDeleted).map(e => e.employeeId))
//     );
//     return new Set([...stageEmployeeIds, ...taskEmployeeIds]).size;
//   };

//   return (
//     <div className="border-2 border-blue-200 rounded-xl overflow-hidden bg-white shadow-sm">
//       <div className="flex items-center gap-1.5 px-2 py-2 bg-blue-50">
//         {/* expand toggle */}
//         <div className="w-6 shrink-0 flex items-center justify-center">
//           <button onClick={onToggle} className="p-1 hover:bg-blue-200 rounded">
//             {step.isExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
//           </button>
//         </div>

//         {/* מספר */}
//         <div className="w-10 text-center text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-lg py-1.5 shrink-0">
//           {step.orderNum}
//         </div>

//         {/* שם שלב */}
//         <input
//           type="text" value={step.name}
//           onChange={e => onChange('name', e.target.value)}
//           className="min-w-0 flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-300"
//           placeholder="שם שלב"
//         />

//         {/* אחוז */}
//         <div className="flex items-center gap-0.5 w-20 shrink-0">
//           {numInput('percentage', step.percentage)}
//           <span className="text-xs text-gray-400">%</span>
//         </div>

//         {/* שעות */}
//         <div className="w-16 shrink-0">{numInput('workHours', step.workHours, 0, 0.5)}</div>

//         {/* ימים */}
//         <div className="w-16 shrink-0">{numInput('workDays', step.workDays, 0, 0.5)}</div>

//         {/* משך */}
//         <div className="w-14 shrink-0">{numInput('duration', step.duration)}</div>

//         {/* תאריך התחלה */}
//         <div className="w-36 shrink-0">
//           <DateInput
//             value={toInputDate(step.startDate)}
//             onChange={v => onChange('startDate', v)}
//             ringColor="focus-within:ring-blue-300"
//             className="w-full"
//           />
//         </div>

//         {/* תאריך סיום */}
//         <div className="w-36 shrink-0">
//           <DateInput
//             value={toInputDate(step.endDate)}
//             onChange={v => onChange('endDate', v)}
//             ringColor="focus-within:ring-blue-300"
//             className="w-full"
//           />
//         </div>

//         {/* תלוי שלב */}
//         <div className="w-28 shrink-0 flex items-center justify-center">
//           <input
//             type="checkbox"
//             checked={step.dependsOnStepId ?? false}
//             onChange={e => onChange('dependsOnStepId', e.target.checked)}
//             className="w-4 h-4 accent-blue-500"
//             title="תלוי שלב"
//           />
//         </div>

//         {/* עובדים */}
//         <button
//           onClick={onOpenEmployees}
//           className="w-20 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-bold shrink-0 whitespace-nowrap"
//         >
//           <Users size={12}/>
//           עובדים
//           <span className="bg-white text-blue-700 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
//             {employeeCountForStage(step)}
//           </span>
//         </button>

//         {/* סטטוס */}
//         <InlineSelect value={step.statusId} options={statusOptions} onChange={v => onChange('statusId', v)} width="w-24"/>

//         {/* עדיפות */}
//         <InlineSelect value={step.urgencyId} options={urgencyOptions} onChange={v => onChange('urgencyId', v)} width="w-24"/>

//         {/* פעיל */}
//         <div className="w-10 shrink-0 flex items-center justify-center">
//           <input type="checkbox" checked={step.isActive} onChange={() => onChange('isActive', !step.isActive)}
//             className="w-4 h-4 accent-emerald-500" title="פעיל"/>
//         </div>

//         {/* מחק */}
//         <div className="w-10 shrink-0 flex items-center justify-center">
//           <button onClick={onDelete} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
//             <Trash2 size={14}/>
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─── Task Row ─────────────────────────────────────────────────────────────────
// function TaskRow({
//   task, onChange, onDelete, onOpenEmployees, statusOptions, urgencyOptions,
// }: {
//   task: PlanningTask;
//   steps: PlanningStep[];
//   onChange: (field: string, value: any) => void;
//   onDelete: () => void;
//   onOpenEmployees: () => void;
//   statusOptions: SelectOption[];
//   urgencyOptions: SelectOption[];
// }) {
//   const formatInputNumber = (value: number) => Number.isInteger(value) ? value : parseFloat(value.toFixed(2));

//   const numInput = (field: string, val: number, min = 0, step2 = 1) => (
//     <input
//       type="number" min={min} step={step2} value={formatInputNumber(val)}
//       onChange={e => onChange(field, Number(e.target.value))}
//       className="w-full px-1.5 py-1.5 border border-gray-200 rounded-lg text-xs text-center focus:ring-2 focus:ring-purple-300"
//     />
//   );

//   return (
//     <div className="flex items-center gap-1.5 px-2 py-1.5 bg-white rounded-lg border border-purple-100">

//       {/* מספר */}
//       <div className="w-10 text-center text-xs font-bold text-gray-400 shrink-0">{task.orderNum}</div>

//       {/* שם */}
//       <input
//         type="text" value={task.name}
//         onChange={e => onChange('name', e.target.value)}
//         className="min-w-0 flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-purple-300"
//         placeholder="שם משימה"
//       />

//       {/* אחוז */}
//       <div className="flex items-center gap-0.5 w-20 shrink-0">
//         {numInput('percentage', task.percentage)}
//         <span className="text-xs text-gray-400">%</span>
//       </div>

//       {/* שעות */}
//       <div className="w-16 shrink-0">{numInput('workHours', task.workHours, 0, 0.5)}</div>

//       {/* ימים */}
//       <div className="w-16 shrink-0">{numInput('workDays', task.workDays, 0, 0.5)}</div>

//       {/* משך */}
//       <div className="w-14 shrink-0">{numInput('duration', task.duration)}</div>

//       {/* תאריך התחלה */}
//       <div className="w-36 shrink-0">
//         <DateInput
//           value={toInputDate(task.startDate)}
//           onChange={v => onChange('startDate', v)}
//           ringColor="focus-within:ring-purple-300"
//           className="w-full"
//         />
//       </div>

//       {/* תאריך סיום */}
//       <div className="w-36 shrink-0">
//         <DateInput
//           value={toInputDate(task.endDate)}
//           onChange={v => onChange('endDate', v)}
//           ringColor="focus-within:ring-purple-300"
//           className="w-full"
//         />
//       </div>

//       {/* תלוי משימה */}
//       <div className="w-28 shrink-0 flex items-center justify-center">
//         <input
//           type="checkbox"
//           checked={task.dependsOnTaskId ?? false}
//           onChange={e => onChange('dependsOnTaskId', e.target.checked)}
//           className="w-4 h-4 accent-purple-500"
//           title="תלוי משימה"
//         />
//       </div>

//       {/* עובדים */}
//       <button
//         onClick={onOpenEmployees}
//         className="w-20 flex items-center justify-center gap-1 px-2 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-xs font-bold shrink-0 whitespace-nowrap"
//       >
//         <Users size={11}/>
//         עובדים
//         {task.employees.filter(e => !e.isDeleted).length > 0 && (
//           <span className="bg-white text-purple-700 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
//             {task.employees.filter(e => !e.isDeleted).length}
//           </span>
//         )}
//       </button>

//       {/* סטטוס */}
//       <InlineSelect value={task.statusId} options={statusOptions} onChange={v => onChange('statusId', v)} width="w-24"/>

//       {/* עדיפות */}
//       <InlineSelect value={task.urgencyId} options={urgencyOptions} onChange={v => onChange('urgencyId', v)} width="w-24"/>

//       {/* פעיל */}
//       <div className="w-10 shrink-0 flex items-center justify-center">
//         <input type="checkbox" checked={task.isActive} onChange={() => onChange('isActive', !task.isActive)}
//           className="w-4 h-4 accent-emerald-500" title="פעיל"/>
//       </div>

//       {/* מחק */}
//       <div className="w-10 shrink-0 flex items-center justify-center">
//         <button onClick={onDelete} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
//           <Trash2 size={13}/>
//         </button>
//       </div>
//     </div>
//   );
// }

// // ─── Column Headers ───────────────────────────────────────────────────────────
// function ColHeaders({ forStep }: { forStep?: boolean }) {
//   const cols = [
//     { label: 'מס׳',                                          w: 'w-10' },
//     { label: forStep ? 'שם שלב' : 'שם משימה',               w: 'flex-1' },
//     { label: 'אחוז',                                         w: 'w-20' },
//     { label: 'שעות עבודה',                                   w: 'w-16' },
//     { label: 'ימי עבודה',                                    w: 'w-16' },
//     { label: 'משך זמן',                                      w: 'w-14' },
//     { label: 'תאריך התחלה',                                  w: 'w-36' },
//     { label: 'תאריך סיום',                                   w: 'w-36' },
//     { label: forStep ? 'תלוי שלב' : 'תלוי משימה',           w: 'w-28' },
//     { label: 'עובדים',                                       w: 'w-20' },
//     { label: 'סטטוס',                                        w: 'w-24' },
//     { label: 'עדיפות',                                       w: 'w-24' },
//     { label: 'פעיל',                                         w: 'w-10' },
//     { label: '',                                             w: 'w-10' },
//   ];

//   return (
//     <div className={`flex items-center gap-1.5 px-2 py-2 rounded-lg text-xs font-bold text-gray-700 text-right ${
//       forStep ? 'bg-blue-100 pr-9' : 'bg-purple-100'
//     }`}>
//       {cols.map((c, i) => (
//         <div key={i} className={`${c.w} shrink-0 text-right`}>{c.label}</div>
//       ))}
//     </div>
//   );
// }

// // ─── Main Component ───────────────────────────────────────────────────────────
// interface ProjectTopicsTabProps { projectId?: number; }

// export default function ProjectTopicsTab({ projectId }: ProjectTopicsTabProps) {
//   const [subjects, setSubjects] = useState<PlanningSubject[]>([]);
//   const [statusOptions, setStatusOptions] = useState(DEFAULT_STATUS_OPTIONS);
//   const [urgencyOptions, setUrgencyOptions] = useState(DEFAULT_URGENCY_OPTIONS);
//   const [subContractsOptions, setSubContractsOptions] = useState<SubContract[]>([]);
//   const [openImport, setOpenImport] = useState(false);

//   const [deletedIds, setDeletedIds] = useState({
//     subjectIds: [] as number[],
//     stepIds:    [] as number[],
//     taskIds:    [] as number[],
//   });

//   const [saving, setSaving]           = useState(false);
//   const [saveSuccess, setSaveSuccess] = useState(false);
//   const [saveError, setSaveError]     = useState<string | null>(null);
//   const [isDirty, setIsDirty]         = useState(false);
//   const [search, setSearch]           = useState('');

//   const [empModal, setEmpModal] = useState<{
//     type: 'step' | 'task';
//     subjectId: number; stepId: number; taskId?: number;
//   } | null>(null);

//   const [subModal, setSubModal] = useState<{ subjectId: number; name: string } | null>(null);

//   const [messageBox, setMessageBox] = useState<{
//     isOpen: boolean;
//     title: string;
//     message: string;
//     type: 'alert' | 'success' | 'error' | 'warning';
//     confirmText?: string;
//     cancelText?: string;
//     showCancel?: boolean;
//     onConfirm?: () => void;
//     onCancel?: () => void;
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

//   // ── Load ───────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     const load = async () => {
//       if (!projectId) { setSubjects([]); return; }
//       try {
//         const data = await getPlanningHierarchy(projectId);
//         setSubjects(data.subjects ?? []);
//         setSubContractsOptions(data.subContracts ?? []);
//       } catch {
//         setSaveError('שגיאה בטעינת תכנון הפרויקט');
//       }
//     };
//     load();
//   }, [projectId]);

//   useEffect(() => {
//     const loadLists = async () => {
//       try {
//         const data = await getPlanningSystemLists();
//         setStatusOptions(data.statuses ?? DEFAULT_STATUS_OPTIONS);
//         setUrgencyOptions(data.priorities ?? DEFAULT_URGENCY_OPTIONS);
//       } catch { /* use defaults */ }
//     };
//     loadLists();
//   }, []);

//   // ── Filtered ───────────────────────────────────────────────────────────────
//   const filtered = useMemo(() => {
//     const visible = subjects.filter(s => !s.isDeleted);
//     if (!search.trim()) return visible;
//     return visible.filter(s =>
//       s.name.includes(search) ||
//       s.steps.some(st => !st.isDeleted && (
//         st.name.includes(search) ||
//         st.tasks.some(t => !t.isDeleted && t.name.includes(search))
//       ))
//     );
//   }, [subjects, search]);

//   // ── Helpers ────────────────────────────────────────────────────────────────
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
//     const id = -Date.now();
//     setSubjects(p => [...p, { id, name: `נושא תכנון ${p.length + 1}`, isActive: true, isExpanded: true, steps: [], subContractsLink: [], isNew: true }]);
//     dirty();
//   };

//   const updateSubject = (id: number, field: string, val: any) => {
//     setSubjects(p => p.map(s => s.id === id ? { ...s, [field]: val, isModified: true } : s));
//     dirty();
//   };

//   const deleteSubject = (id: number) => {
//     if (!window.confirm('למחוק נושא תכנון זה?')) return;
//     setSubjects(p => p.flatMap(s => {
//       if (s.id !== id) return [s];
//       if (isTempId(s.id) || s.isNew) return [];
//       trackDel('subjectIds', id);
//       return [{ ...s, isDeleted: true }];
//     }));
//     dirty();
//   };

//   // ── Step CRUD ──────────────────────────────────────────────────────────────
//   const addStep = (subjectId: number) => {
//     const defaultStatusId  = getDefaultId(statusOptions);
//     const defaultUrgencyId = getDefaultId(urgencyOptions);
//     setSubjects(p => p.map(s => s.id !== subjectId ? s : {
//       ...s, steps: [...s.steps, {
//         id: -Date.now(), PlanningSubjectID: subjectId, name: `שלב ${s.steps.length + 1}`,
//         orderNum: s.steps.length + 1,
//         percentage: 0, workHours: 0, workDays: 0, duration: 1,
//         dependsOnStepId: false, employees: [],
//         startDate: new Date().toISOString(), endDate: new Date().toISOString(),
//         statusId: defaultStatusId, urgencyId: defaultUrgencyId, isActive: true, isExpanded: false, tasks: [],
//         isNew: true,
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
//         if (field === 'workHours') { const h = Math.max(0, Number(val)); return { ...st, workHours: h, workDays: h / WORK_HOURS_PER_DAY, isModified: true }; }
//         if (field === 'workDays')  { const d = Math.max(0, Number(val)); return { ...st, workDays: d, workHours: d * WORK_HOURS_PER_DAY, isModified: true }; }
//         if (field === 'duration') {
//           const newDuration = Math.max(0, Math.floor(Number(val)));
//           return { ...st, duration: newDuration, tasks: st.tasks.map(t => t.duration > newDuration ? { ...t, duration: newDuration, isModified: !t.isNew } : t), isModified: true };
//         }
//         if (field === 'percentage') { return { ...st, percentage: Math.max(0, Math.min(100, Number(val))), isModified: true }; }
//         return { ...st, [field]: val, isModified: true };
//       })
//     }));
//     dirty();
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

//   // ── Task CRUD ──────────────────────────────────────────────────────────────
//   const addTask = (subjectId: number, stepId: number) => {
//     const defaultStatusId  = getDefaultId(statusOptions);
//     const defaultUrgencyId = getDefaultId(urgencyOptions);
//     setSubjects(p => p.map(s => s.id !== subjectId ? s : {
//       ...s, steps: s.steps.map(st => st.id !== stepId ? st : {
//         ...st, isExpanded: true,
//         tasks: [...st.tasks, {
//           id: -Date.now(), PlanningStepID: stepId, name: `משימה ${st.tasks.length + 1}`,
//           orderNum: st.tasks.length + 1,
//           percentage: 0, workHours: 0, workDays: 0, duration: st.duration || 1,
//           dependsOnTaskId: false, employees: [],
//           startDate: new Date().toISOString().split('T')[0],
//           endDate:   new Date().toISOString().split('T')[0],
//           statusId: defaultStatusId, urgencyId: defaultUrgencyId, isActive: true,
//           isNew: true,
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
//       nextTaskWorkHours = newH;
//       nextTaskWorkDays  = newH / WORK_HOURS_PER_DAY;
//       nextTaskPercentage = (updatedStepHours ?? step.workHours) > 0 ? (newH / (updatedStepHours ?? step.workHours)) * 100 : 0;
//     }

//     if (field === 'workDays') {
//       const newD = Math.max(0, Number(val));
//       const newH = newD * WORK_HOURS_PER_DAY;
//       const otherH = step.tasks.filter(x => x.id !== taskId && !x.isDeleted).reduce((a, x) => a + x.workHours, 0);
//       if (otherH + newH > step.workHours) {
//         const yes = await openConfirm(`סה"כ השעות במשימות (${(otherH + newH).toFixed(2)}) גדול משעות השלב (${step.workHours}).\n\nהאם לעדכן את שעות השלב?`);
//         if (!yes) return;
//         updatedStepHours = otherH + newH;
//       }
//       nextTaskWorkHours = newH;
//       nextTaskWorkDays  = newD;
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
//           if (field === 'duration') {
//             const newDuration = Math.max(0, Math.floor(Number(val)));
//             if (newDuration > st.duration) {
//               setMessageBox({ isOpen: true, title: 'אזהרה', message: `משך זמן המשימה (${newDuration}) לא יכול לעבור את משך זמן השלב (${st.duration}).`, type: 'warning' });
//               return t;
//             }
//             return { ...t, duration: newDuration, isModified: !t.isNew };
//           }
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
//   const saveStepEmployees = (subjectId: number, stepId: number, emps: EmployeeLink[]) => {
//     setSubjects(p => p.map(s => s.id !== subjectId ? s : {
//       ...s, steps: s.steps.map(st => st.id !== stepId ? st : { ...st, employees: emps }),
//     }));
//     dirty();
//   };

//   const saveTaskEmployees = (subjectId: number, stepId: number, taskId: number, emps: EmployeeLink[]) => {
//     setSubjects(p => p.map(s => s.id !== subjectId ? s : {
//       ...s, steps: s.steps.map(st => st.id !== stepId ? st : {
//         ...st, tasks: st.tasks.map(t => t.id !== taskId ? t : { ...t, employees: emps }),
//       }),
//     }));
//     dirty();
//   };

//   const getEmpModalProps = () => {
//     if (!empModal) return null;
//     const { type, subjectId, stepId, taskId } = empModal;
//     const step = subjects.find(s => s.id === subjectId)?.steps.find(st => st.id === stepId);
//     if (!step) return null;
//     if (type === 'step') return {
//       itemType: 'stage' as const, stageName: step.name,
//       stageDuration: step.duration, stageHours: step.workHours, statusId: step.statusId,
//       initialEmployees: step.employees.filter(e => !e.isDeleted),
//       onSave: (emps: EmployeeLink[]) => saveStepEmployees(subjectId, stepId, emps),
//     };
//     const task = step.tasks.find(t => t.id === taskId);
//     if (!task) return null;
//     return {
//       itemType: 'task' as const, stageName: task.name,
//       stageDuration: task.duration, stageHours: task.workHours, statusId: task.statusId,
//       initialEmployees: task.employees.filter(e => !e.isDeleted),
//       onSave: (emps: EmployeeLink[]) => saveTaskEmployees(subjectId, stepId, taskId!, emps),
//     };
//   };

//   const empModalProps = empModal ? getEmpModalProps() : null;

//   // ── Save ───────────────────────────────────────────────────────────────────
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

//   // ─── Render ────────────────────────────────────────────────────────────────
//   return (
//     <div className="space-y-4" dir="rtl">

//       {/* Save / Search bar */}
//       <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
//         <div className="relative flex-1">
//           <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"/>
//           <input type="text" value={search} onChange={e => setSearch(e.target.value)}
//             placeholder="חיפוש נושא / שלב / משימה..."
//             className="w-full pr-9 pl-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-300"
//           />
//         </div>
//         <span className="text-xs text-gray-400 font-medium whitespace-nowrap">{subjects.length} נושאים</span>
//         <button onClick={() => setOpenImport(true)}
//           className="flex items-center gap-1.5 px-4 py-2 border-2 border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-sm font-bold transition-all whitespace-nowrap">
//           <Plus size={15}/>ייבוא נושא תכנון
//         </button>
//         {saveError   && <span className="flex items-center gap-1 text-red-600 text-sm"><AlertCircle size={14}/>{saveError}</span>}
//         {saveSuccess && <span className="flex items-center gap-1 text-emerald-600 text-sm font-medium"><CheckCircle size={14}/>נשמר!</span>}
//         {isDirty     && <span className="text-xs text-orange-500 font-semibold">● שינויים שלא נשמרו</span>}
//         <button onClick={handleSave} disabled={saving || !isDirty}
//           className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold shadow-sm transition-all ${
//             saving        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
//             : saveSuccess ? 'bg-emerald-400 text-white'
//             : !isDirty    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
//             : 'bg-emerald-500 hover:bg-emerald-600 text-white'
//           }`}>
//           {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>שומר...</> : <><Save size={15}/>שמור הכל</>}
//         </button>
//       </div>

//       {/* Subjects */}
//       {filtered.map(subject => (
//         <div key={subject.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">

//           {/* Subject header */}
//           <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 border-b border-amber-200">
//             <button onClick={() => updateSubject(subject.id, 'isExpanded', !subject.isExpanded)} className="p-1 hover:bg-amber-200 rounded-lg shrink-0">
//               {subject.isExpanded ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}
//             </button>
//             <input type="text" value={subject.name} onChange={e => updateSubject(subject.id, 'name', e.target.value)}
//               className="flex-1 min-w-0 px-3 py-1.5 text-sm font-bold border-2 border-amber-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-400"
//             />
//             <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${subject.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
//               {subject.isActive ? 'פעיל' : 'לא פעיל'}
//             </span>
//             <label className="flex items-center gap-1.5 cursor-pointer shrink-0 text-xs text-gray-600">
//               <input type="checkbox" checked={subject.isActive} onChange={() => updateSubject(subject.id, 'isActive', !subject.isActive)} className="w-4 h-4 accent-emerald-500"/>
//               פעיל
//             </label>
//             <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold shrink-0">
//               {subject.steps.filter(st => !st.isDeleted).length} שלבים
//             </span>
//             <button onClick={() => setSubModal({ subjectId: subject.id, name: subject.name })}
//               className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-lg text-xs font-bold transition-all shrink-0">
//               <Link size={13}/>
//               תתי חוזים
//               {(subject.subContractsLink?.filter(l => !l.isDeleted).length ?? 0) > 0 && (
//                 <span className="bg-indigo-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
//                   {subject.subContractsLink?.filter(l => !l.isDeleted).length ?? 0}
//                 </span>
//               )}
//             </button>
//             <button onClick={() => deleteSubject(subject.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0">
//               <Trash2 size={16}/>
//             </button>
//           </div>

//           {/* Steps */}
//           {subject.isExpanded && (
//             <div className="p-3 space-y-2 bg-gray-50">
//               <div className="overflow-x-auto pb-1">
//                 <div className="min-w-max space-y-2">
//                   {subject.steps.some(st => !st.isDeleted) && <ColHeaders forStep/>}
//                   {subject.steps.filter(st => !st.isDeleted).map(step => (
//                     <div key={step.id}>
//                       <StepRow
//                         step={step}
//                         subjectSteps={subject.steps.filter(st => !st.isDeleted)}
//                         onChange={(f, v) => updateStep(subject.id, step.id, f, v)}
//                         onDelete={() => deleteStep(subject.id, step.id)}
//                         onToggle={() => toggleStep(subject.id, step.id)}
//                         onOpenEmployees={() => setEmpModal({ type: 'step', subjectId: subject.id, stepId: step.id })}
//                         statusOptions={statusOptions}
//                         urgencyOptions={urgencyOptions}
//                       />

//                       {step.isExpanded && (
//                         <div className="mr-6 mt-1 space-y-1 p-2 bg-purple-50 rounded-xl border border-purple-200">
//                           {step.tasks.some(t => !t.isDeleted) && (
//                             <>
//                               <ColHeaders/>
//                               {step.tasks.filter(t => !t.isDeleted).map(task => (
//                                 <TaskRow
//                                   key={task.id}
//                                   task={task}
//                                   steps={subject.steps.filter(st => !st.isDeleted)}
//                                   onChange={(f, v) => updateTask(subject.id, step.id, task.id, f, v)}
//                                   onDelete={() => deleteTask(subject.id, step.id, task.id)}
//                                   onOpenEmployees={() => setEmpModal({ type: 'task', subjectId: subject.id, stepId: step.id, taskId: task.id })}
//                                   statusOptions={statusOptions}
//                                   urgencyOptions={urgencyOptions}
//                                 />
//                               ))}
//                               <div className="border-2 border-purple-200 rounded-lg bg-purple-50 p-2">
//                                 <div className="overflow-x-auto">
//                                   <div className="min-w-max">
//                                     <div className="grid grid-cols-[40px_1fr_80px_64px_64px_56px_144px_144px_112px_80px_96px_96px_40px_18px] gap-2 items-center px-2 py-2">
//                                       <div/><div className="text-right font-bold text-purple-800">סה"כ משימות</div>
//                                       <div className="text-center font-bold text-purple-800 bg-purple-100 rounded py-1">{step.tasks.filter(t => !t.isDeleted).reduce((s, t) => s + t.percentage, 0).toFixed(1)}%</div>
//                                       <div className="text-center font-bold text-purple-800 bg-purple-100 rounded py-1">{step.tasks.filter(t => !t.isDeleted).reduce((s, t) => s + t.workHours, 0).toFixed(1)}</div>
//                                       <div className="text-center font-bold text-purple-800 bg-purple-100 rounded py-1">{step.tasks.filter(t => !t.isDeleted).reduce((s, t) => s + t.workDays, 0).toFixed(1)}</div>
//                                       <div className="text-center font-bold text-purple-800 bg-purple-100 rounded py-1">{step.tasks.filter(t => !t.isDeleted).reduce((s, t) => s + t.duration, 0).toFixed(1)}</div>
//                                       <div className="text-center text-gray-400">-</div><div className="text-center text-gray-400">-</div>
//                                       <div className="text-center text-gray-400">-</div><div/><div/><div/><div/><div/>
//                                     </div>
//                                   </div>
//                                 </div>
//                               </div>
//                             </>
//                           )}
//                           <button onClick={() => addTask(subject.id, step.id)}
//                             className="w-full py-1.5 border-2 border-dashed border-purple-400 text-purple-600 hover:bg-purple-100 rounded-lg text-xs font-bold transition-all">
//                             + הוסף משימה
//                           </button>
//                         </div>
//                       )}
//                     </div>
//                   ))}

//                   {subject.steps.length > 0 && (
//                     <div className="border-2 border-emerald-300 rounded-lg bg-emerald-50 p-2">
//                       <div className="overflow-x-auto">
//                         <div className="min-w-max">
//                           <div className="grid grid-cols-[24px_40px_1fr_80px_64px_64px_56px_144px_144px_112px_80px_96px_96px_40px_18px] gap-2 items-center px-2 py-2">
//                             <div/><div/><div className="text-right font-bold text-emerald-800">סה"כ</div>
//                             <div className="text-center font-bold text-emerald-800 bg-emerald-100 rounded py-1">{subject.steps.filter(st => !st.isDeleted).reduce((s, st) => s + st.percentage, 0).toFixed(1)}%</div>
//                             <div className="text-center font-bold text-emerald-800 bg-emerald-100 rounded py-1">{subject.steps.filter(st => !st.isDeleted).reduce((s, st) => s + st.workHours, 0).toFixed(1)}</div>
//                             <div className="text-center font-bold text-emerald-800 bg-emerald-100 rounded py-1">{subject.steps.filter(st => !st.isDeleted).reduce((s, st) => s + st.workDays, 0).toFixed(1)}</div>
//                             <div className="text-center text-gray-400">-</div><div className="text-center text-gray-400">-</div>
//                             <div className="text-center text-gray-400">-</div><div/><div/><div/><div/><div/><div/>
//                           </div>
//                         </div>
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               </div>

//               <button onClick={() => addStep(subject.id)}
//                 className="w-full py-2.5 border-2 border-dashed border-blue-400 text-blue-600 hover:bg-blue-50 rounded-xl text-sm font-bold transition-all">
//                 + הוסף שלב
//               </button>
//             </div>
//           )}
//         </div>
//       ))}

//       <button onClick={addSubject}
//         className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all">
//         <Plus size={18}/> הוסף נושא תכנון חדש
//       </button>

//       {empModal && empModalProps && (
//         <LinkEmployeesToStageModal
//           itemType={empModalProps.itemType}
//           stageName={empModalProps.stageName}
//           stageDuration={empModalProps.stageDuration}
//           stageHours={empModalProps.stageHours}
//           statusId={empModalProps.statusId}
//           hoursPerDay={WORK_HOURS_PER_DAY}
//           initialEmployees={empModalProps.initialEmployees}
//           onClose={() => setEmpModal(null)}
//           onSave={emps => { empModalProps.onSave(emps); setEmpModal(null); }}
//         />
//       )}

//       {subModal && (
//         <SubcontractsModal
//           subjectId={subModal.subjectId}
//           subjectName={subModal.name}
//           linkedIds={subjects.find(s => s.id === subModal.subjectId)?.subContractsLink?.filter(l => !l.isDeleted) ?? []}
//           onSave={items => {
//             setSubjects(p => p.map(s => s.id === subModal.subjectId
//               ? { ...s, subContractsLink: mergeSubContractLinks(s.subContractsLink ?? [], items), isModified: true }
//               : s));
//             dirty();
//           }}
//           onClose={() => setSubModal(null)}
//           subContractsOptions={subContractsOptions}
//         />
//       )}

//       {openImport && (
//         <ImportSubjectTemplatesModal
//           projectId={projectId!}
//           onImport={() => { setSubjects([]); }}
//           onClose={() => setOpenImport(false)}
//         />
//       )}

//       <MessageBox
//         isOpen={messageBox.isOpen}
//         onClose={closeMessageBox}
//         title={messageBox.title}
//         message={messageBox.message}
//         type={messageBox.type}
//         confirmText={messageBox.confirmText ?? 'אישור'}
//         cancelText={messageBox.cancelText ?? 'ביטול'}
//         showCancel={messageBox.showCancel}
//         onConfirm={messageBox.onConfirm}
//         onCancel={messageBox.onCancel}
//       />
//     </div>
//   );
// }