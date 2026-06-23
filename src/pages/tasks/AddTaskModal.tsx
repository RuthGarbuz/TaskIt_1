// AddTaskModal.tsx
import { useState, useEffect } from 'react';
import { X, ChevronDown, AlertCircle, Check } from 'lucide-react';
import { getPlanningStepsByProjectId } from '../../services/projectPlanningService';
import NumberInput from '../shared/NumberInput';
import { DateInput } from '../shared/DateInput';

export interface Project {
  id: number;
  name: string;
}

export interface PlanningTopic {
  id: number;
  projectId: number;
  name: string;
}

export interface Stage {
  id: number;
  planningTopicId: number;
  name: string;
  startDate?: string;
  endDate?: string;
  durationDays?: number;
  totalHours?: number;
  tasks?: { id: number }[];
}

export interface Employee {
  id: number;
  name: string;
  avatar?: string;
  role?: string;
}

export interface NewTaskData {
  projectId: number;
  planningTopicId: number;
  stageId: number;
  title: string;
  percentOfStage: number;
  workHours: number;
  workDays: number;
  durationDays: number;
  startDate: string;
  endDate: string;
  dependsOnTask: boolean;
  assignedEmployeeIds: number[];
  status: string;
  priority: string;
}

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: NewTaskData) => void;
  onOpenProjectTopicStep?: (payload: {
    projectId: number;
    projectName: string;
    planningTopicId: number;
    stageId: number;
  }) => void;
  projects?: Project[];
  planningTopics?: PlanningTopic[];
  stages?: Stage[];
  employees?: Employee[];
  defaultStatus?: string;
  defaultPriority?: string;
  hoursPerDay?: number;
}

const STATUSES = ['טרם בוצע', 'בביצוע', 'הושלם', 'מושהה', 'בוטל'];
const PRIORITIES = ['נמוכה', 'בינונית', 'גבוהה', 'דחופה'];

export default function AddTaskModal({
  isOpen,
  onClose,
  onSubmit,
  onOpenProjectTopicStep,
  projects = [],
  planningTopics = [],
  stages = [],
  employees = [],
  defaultStatus = 'טרם בוצע',
  defaultPriority = 'בינונית',
  hoursPerDay = 8,
}: AddTaskModalProps) {

  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
  const [selectedPlanningTopicId, setSelectedPlanningTopicId] = useState<number | ''>('');
  const [selectedStageId, setSelectedStageId] = useState<number | ''>('');
  const [title, setTitle] = useState('');
  const [percentOfStage, setPercentOfStage] = useState(0);
  const [workHours, setWorkHours] = useState(0);
  const [workDays, setWorkDays] = useState(0);
  const [durationDays, setDurationDays] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dependsOnTask, setDependsOnTask] = useState(false);
  const [assignedIds, setAssignedIds] = useState<number[]>([]);
  const [status, setStatus] = useState(defaultStatus);
  const [priority, setPriority] = useState(defaultPriority);
  const [activeTab, setActiveTab] = useState<'general' | 'employees'>('general');
  const [hierarchyDone, setHierarchyDone] = useState(false);
  const [serverPlanningTopics, setServerPlanningTopics] = useState<PlanningTopic[]>([]);
  const [serverStages, setServerStages] = useState<Stage[]>([]);
  const [hierarchyLoading, setHierarchyLoading] = useState(false);
  const [hierarchyError, setHierarchyError] = useState('');
  const [useServerHierarchy, setUseServerHierarchy] = useState(false);

  const safeProjects = projects ?? [];
  const safeTopics = planningTopics ?? [];
  const safeStages = stages ?? [];
  const safeEmployees = employees ?? [];

  const filteredTopics = useServerHierarchy
    ? serverPlanningTopics
    : safeTopics.filter(t => t.projectId === selectedProjectId);
  const filteredStages = useServerHierarchy
    ? serverStages.filter(s => s.planningTopicId === selectedPlanningTopicId)
    : safeStages.filter(s => s.planningTopicId === selectedPlanningTopicId);
  const selectedStage = (useServerHierarchy ? serverStages : safeStages).find(s => s.id === selectedStageId);
  const selectedProject = safeProjects.find(p => p.id === selectedProjectId);
  const selectedTopic = (useServerHierarchy ? serverPlanningTopics : safeTopics).find(t => t.id === selectedPlanningTopicId);
  const hasOtherTasks = (selectedStage?.tasks?.length ?? 0) > 0;
  const nextTaskNumber = (selectedStage?.tasks?.length ?? 0) + 1;
  const defaultTitle = `משימה ${nextTaskNumber}`;

  const canProceed = selectedProjectId !== '' && selectedPlanningTopicId !== '' && selectedStageId !== '';
  const noTopics = selectedProjectId !== '' && filteredTopics.length === 0;
  const noStages = selectedPlanningTopicId !== '' && filteredStages.length === 0;
  const blocked = noTopics || noStages;

  useEffect(() => {
    if (selectedStage) {
      setDurationDays(selectedStage.durationDays ?? 0);
      setStartDate(selectedStage.startDate ?? '');
      setEndDate(selectedStage.endDate ?? '');
      setWorkHours(0);
      setWorkDays(0);
      setPercentOfStage(0);
      setTitle('');
    }
  }, [selectedStage]);

  useEffect(() => {
    const loadPlanningByProject = async () => {
      setHierarchyError('');
      setServerPlanningTopics([]);
      setServerStages([]);
      setUseServerHierarchy(false);
      if (selectedProjectId === '') return;
      setHierarchyLoading(true);
      try {
        const data = await getPlanningStepsByProjectId(Number(selectedProjectId), null);
        const topics: PlanningTopic[] = (data.subjects ?? []).map((s) => ({
          id: s.id,
          projectId: Number(selectedProjectId),
          name: s.name,
        }));
        const stages: Stage[] = (data.steps ?? []).map((st) => ({
          id: st.id,
          planningTopicId: st.planningSubjectId,
          name: st.name,
        }));
        setServerPlanningTopics(topics);
        setServerStages(stages);
        setUseServerHierarchy(true);
      } catch (error) {
        setUseServerHierarchy(false);
        setHierarchyError(error instanceof Error ? error.message : 'שגיאה בטעינת נושאים ושלבים');
      } finally {
        setHierarchyLoading(false);
      }
    };
    void loadPlanningByProject();
  }, [selectedProjectId]);

  const handlePercentChange = (val: number) => {
    setPercentOfStage(val);
    if (selectedStage?.totalHours) {
      const h = (val / 100) * selectedStage.totalHours;
      setWorkHours(parseFloat(h.toFixed(2)));
      setWorkDays(parseFloat((h / hoursPerDay).toFixed(2)));
    }
  };

  const handleHoursChange = (val: number) => {
    setWorkHours(val);
    setWorkDays(parseFloat((val / hoursPerDay).toFixed(2)));
    if (selectedStage?.totalHours) {
      setPercentOfStage(parseFloat(((val / selectedStage.totalHours) * 100).toFixed(2)));
    }
  };

  const handleDaysChange = (val: number) => {
    setWorkDays(val);
    const h = val * hoursPerDay;
    setWorkHours(h);
    if (selectedStage?.totalHours) {
      setPercentOfStage(parseFloat(((h / selectedStage.totalHours) * 100).toFixed(2)));
    }
  };

  const toggleEmployee = (id: number) => {
    setAssignedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleClose = () => {
    setSelectedProjectId(''); setSelectedPlanningTopicId(''); setSelectedStageId('');
    setTitle(''); setPercentOfStage(0); setWorkHours(0); setWorkDays(0);
    setDurationDays(0); setStartDate(''); setEndDate('');
    setDependsOnTask(false); setAssignedIds([]);
    setStatus(defaultStatus); setPriority(defaultPriority);
    setActiveTab('general'); setHierarchyDone(false);
    setServerPlanningTopics([]); setServerStages([]);
    setHierarchyLoading(false); setHierarchyError(''); setUseServerHierarchy(false);
    onClose();
  };

  const handleSubmit = () => {
    if (!canProceed) return;
    onSubmit({
      projectId: selectedProjectId as number,
      planningTopicId: selectedPlanningTopicId as number,
      stageId: selectedStageId as number,
      title: title.trim() || defaultTitle,
      percentOfStage, workHours, workDays, durationDays,
      startDate, endDate, dependsOnTask,
      assignedEmployeeIds: assignedIds,
      status, priority,
    });
    handleClose();
  };

  const handleOpenSelectedStepInTopics = () => {
    if (!canProceed || blocked) return;
    if (!onOpenProjectTopicStep) {
      setHierarchyDone(true);
      return;
    }
    const projectName = selectedProject?.name ?? '';
    onOpenProjectTopicStep({
      projectId: Number(selectedProjectId),
      projectName,
      planningTopicId: Number(selectedPlanningTopicId),
      stageId: Number(selectedStageId),
    });
    handleClose();
  };

  if (!isOpen) return null;

  const modalTitle = hierarchyDone && selectedStage
    ? `כרטיס משימה – ${selectedStage.name}`
    : 'כרטיס משימה חדשה';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative modal-shell dark-surface bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl mx-4 flex flex-col max-h-[92vh]" dir="rtl">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-emerald-500 rounded-t-xl flex-shrink-0">
          <h2 className="text-white font-semibold text-base">{modalTitle}</h2>
          <button onClick={handleClose} className="p-1 rounded text-white/80 hover:text-white hover:bg-white/20 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* ── Hierarchy step (שלב א׳) ── */}
        {!hierarchyDone && (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <p className="text-sm text-gray-500 mb-2"> בחר פרויקט, נושא תכנון ושלב</p>

            <FormField label="פרויקט *">
              <StyledSelect
                value={selectedProjectId}
                onChange={v => { setSelectedProjectId(v === '' ? '' : Number(v)); setSelectedPlanningTopicId(''); setSelectedStageId(''); }}
                options={safeProjects.map(p => ({ value: p.id, label: p.name }))}
                placeholder="בחר פרויקט..."
              />
            </FormField>
            {hierarchyError && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {hierarchyError}
              </div>
            )}

            <FormField label="נושא תכנון *">
              <StyledSelect
                value={selectedPlanningTopicId}
                onChange={v => { setSelectedPlanningTopicId(v === '' ? '' : Number(v)); setSelectedStageId(''); }}
                options={filteredTopics.map(t => ({ value: t.id, label: t.name }))}
                placeholder={
                  selectedProjectId === ''
                    ? 'בחר פרויקט תחילה'
                    : hierarchyLoading
                      ? 'טוען נושאי תכנון...'
                      : noTopics
                        ? 'אין נושאי תכנון'
                        : 'בחר נושא תכנון...'
                }
                disabled={selectedProjectId === '' || hierarchyLoading || noTopics}
              />
            </FormField>

            <FormField label="שלב *">
              <StyledSelect
                value={selectedStageId}
                onChange={v => setSelectedStageId(v === '' ? '' : Number(v))}
                options={filteredStages.map(s => ({ value: s.id, label: s.name }))}
                placeholder={
                  selectedPlanningTopicId === ''
                    ? 'בחר נושא תכנון תחילה'
                    : hierarchyLoading
                      ? 'טוען שלבים...'
                      : noStages
                        ? 'אין שלבים'
                        : 'בחר שלב...'
                }
                disabled={selectedPlanningTopicId === '' || hierarchyLoading || noStages}
              />
            </FormField>

            {blocked && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-amber-700 text-sm">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>יש לפתוח נושא תכנון ושלב בבורד הפרויקט לפני הוספת משימה חדשה</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleOpenSelectedStepInTopics}
                disabled={!canProceed || blocked}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
              >
                המשך
              </button>
              <button onClick={handleClose} className="px-5 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-sm">
                ביטול
              </button>
            </div>
          </div>
        )}

        {/* ── Task details (שלב ב׳) ── */}
        {hierarchyDone && (
          <>
            {/* Created date row */}
            <div className="flex items-center justify-between px-6 py-2 border-b border-gray-100 bg-gray-50 text-xs text-gray-400 flex-shrink-0">
              <span>נוצר: {new Date().toLocaleDateString('he-IL')} {new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
              <span className="text-gray-500">תיאור המשימה</span>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">

              {/* Title textarea */}
              <textarea
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={defaultTitle}
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 resize-none focus:ring-2 focus:ring-emerald-400 focus:outline-none placeholder-gray-300"
              />

              {/* Row: status / priority / depends / creator */}
              <div className="grid grid-cols-4 gap-3">
                <FormField label="סטטוס">
                  <StyledSelect value={status} onChange={v => setStatus(v)}
                    options={STATUSES.map(s => ({ value: s, label: s }))} />
                </FormField>
                <FormField label="עדיפות">
                  <StyledSelect value={priority} onChange={v => setPriority(v)}
                    options={PRIORITIES.map(p => ({ value: p, label: p }))} />
                </FormField>
                <FormField label="תלוי שלב">
                  <div className="flex items-center h-[38px]">
                    <button
                      onClick={() => setDependsOnTask(!dependsOnTask)}
                      disabled={!hasOtherTasks}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-sm transition-colors ${
                        dependsOnTask
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                          : 'border-gray-200 text-gray-400 hover:border-gray-300'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      {dependsOnTask && <Check size={12} />}
                      {dependsOnTask ? 'כן' : 'לא'}
                    </button>
                  </div>
                </FormField>
                <FormField label="שעות עבודה">
                  <NumberInput value={workHours} onChange={v => handleHoursChange(v)} min={0} step={0.5} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-emerald-400 focus:outline-none" />
                </FormField>
              </div>

              {/* Row: duration / dates / work days */}
              <div className="grid grid-cols-4 gap-3">
                <FormField label="משך זמן">
                  <NumberInput value={durationDays} onChange={v => setDurationDays(v)} min={0} integerOnly className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-emerald-400 focus:outline-none" />
                </FormField>
                <FormField label="מתאריך">
                  <DateInput value={startDate} onChange={setStartDate} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-emerald-400 focus:outline-none" />
                </FormField>
                <FormField label="עד תאריך">
                  <DateInput value={endDate} onChange={setEndDate} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-emerald-400 focus:outline-none" />
                </FormField>
                <FormField label="ימי עבודה">
                  <NumberInput value={workDays} onChange={v => handleDaysChange(v)} min={0} step={0.5} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-emerald-400 focus:outline-none" />
                </FormField>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200">
                <div className="flex gap-0">
                  <TabButton active={activeTab === 'general'} onClick={() => setActiveTab('general')}>
                    מידע כללי
                  </TabButton>
                  <TabButton active={activeTab === 'employees'} onClick={() => setActiveTab('employees')}>
                    עובדים
                    {assignedIds.length > 0 && (
                      <span className="mr-1.5 bg-emerald-500 text-white text-xs rounded-full w-4 h-4 inline-flex items-center justify-center">
                        {assignedIds.length}
                      </span>
                    )}
                  </TabButton>
                </div>
              </div>

              {/* Tab: General */}
              {activeTab === 'general' && (
                <div className="grid grid-cols-3 gap-3">
                  <FormField label="שם פרויקט">
                    <ReadonlyField value={selectedProject?.name ?? ''} />
                  </FormField>
                  <FormField label="מספר פרויקט">
                    <ReadonlyField value={`P-${String(selectedProjectId).padStart(4, '0')}`} />
                  </FormField>
                  <FormField label="פרויקט פעיל">
                    <ReadonlyField value="פעיל ✓" className="text-emerald-600" />
                  </FormField>
                  <FormField label="נושא תכנון">
                    <ReadonlyField value={selectedTopic?.name ?? ''} />
                  </FormField>
                  <FormField label="שלב">
                    <ReadonlyField value={selectedStage?.name ?? ''} />
                  </FormField>
                  <FormField label="% מהשלב">
                    <NumberInput value={percentOfStage}
                      onChange={v => handlePercentChange(v)} min={0} max={100} step={0.5} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-emerald-400 focus:outline-none" />
                  </FormField>
                </div>
              )}

              {/* Tab: Employees */}
              {activeTab === 'employees' && (
                <div>
                  {safeEmployees.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">אין עובדים זמינים</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {safeEmployees.map(emp => {
                        const selected = assignedIds.includes(emp.id);
                        return (
                          <button
                            key={emp.id}
                            onClick={() => toggleEmployee(emp.id)}
                            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-sm transition-all text-right ${
                              selected
                                ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                                : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${selected ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                              {emp.avatar
                                ? <img src={emp.avatar} className="w-7 h-7 rounded-full object-cover" alt={emp.name} />
                                : emp.name.charAt(0)
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{emp.name}</div>
                              {emp.role && <div className="text-xs text-gray-400 truncate">{emp.role}</div>}
                            </div>
                            {selected && <Check size={14} className="text-emerald-500 flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <button
                onClick={handleSubmit}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm shadow-sm"
              >
                שמירה
              </button>
              <button
                onClick={handleClose}
                className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium py-2.5 rounded-lg transition-colors text-sm"
              >
                ביטול
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Helper components ────────────────────────────────────────────────

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1 text-right">{label}</label>
      {children}
    </div>
  );
}

function StyledSelect({ value, onChange, options, placeholder, disabled }: {
  value: number | string;
  onChange: (v: string) => void;
  options: { value: number | string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-emerald-400 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );
}

// function StyledInput({ type = 'text', value, onChange, min, max, step, className = '' }: {
//   type?: string;
//   value: string | number;
//   onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
//   min?: number;
//   max?: number;
//   step?: number;
//   className?: string;
// }) {
//   return (
//     <input
//       type={type}
//       value={value}
//       onChange={onChange}
//       min={min} max={max} step={step}
//       className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-emerald-400 focus:outline-none ${className}`}
//     />
//   );
// }

function ReadonlyField({ value, className = '' }: { value: string; className?: string }) {
  return (
    <div className={`border border-gray-100 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600 ${className}`}>
      {value || <span className="text-gray-300">—</span>}
    </div>
  );
}

function TabButton({ active, onClick, children }: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${
        active
          ? 'border-emerald-500 text-emerald-600'
          : 'border-transparent text-gray-400 hover:text-gray-600'
      }`}
    >
      {children}
    </button>
  );
}