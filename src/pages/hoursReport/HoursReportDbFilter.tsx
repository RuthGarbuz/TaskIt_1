import { useState, useEffect } from 'react';
import { X, Database, RefreshCw, RotateCcw } from 'lucide-react';
import type { ProjectBasic } from '../../Data/projectInfoData';
import * as projectInfoService from '../../services/projectInfoService';
import type { EmployeeBasic } from '../../services/templatesSettingServices';
import { getEmployees } from '../../services/templatesSettingServices';
import { DateInput } from '../shared/DateInput';
import SearchInput from '../shared/SearchInput';
import { MODAL_CLOSE_BTN, MODAL_FIELD, MODAL_FOOTER, MODAL_HEADER_SM, MODAL_LABEL, MODAL_TITLE_SM, TASK_CTRL_BTN } from '../tasks/taskViewTheme';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HoursDBFilters {
  dateFrom: string;
  dateTo: string;
  /** Selected basic project ids from `getBasicProjects` */
  projects: number[];
  /** Selected employee names */
  employees: string[];
}

interface HoursReportDBFilterProps {
  onClose: () => void;
  onApply: (filters: HoursDBFilters) => void;
  currentFilters: HoursDBFilters;
}

let cachedBasicProjects: ProjectBasic[] | null = null;
let cachedEmployees: EmployeeBasic[] | null = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split('T')[0];
}

function today() {
  return new Date().toISOString().split('T')[0];
}

export function getDefaultHoursDBFilters(): HoursDBFilters {
  return {
    dateFrom: startOfMonth(),
    dateTo: today(),
    projects: [],
    employees: [],
  };
}

export function countActiveHoursDbFilters(f: HoursDBFilters): number {
  const defaults = getDefaultHoursDBFilters();
  let n = f.projects.length + f.employees.length;
  if (f.dateFrom !== defaults.dateFrom) n += 1;
  if (f.dateTo !== defaults.dateTo) n += 1;
  return n;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HoursReportDBFilter({
  onClose,
  onApply,
  currentFilters,
}: HoursReportDBFilterProps) {
  const defaults = getDefaultHoursDBFilters();
  const [draft, setDraft] = useState<HoursDBFilters>({ ...currentFilters });
  const [projectSearch, setProjectSearch] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [basicProjects, setBasicProjects] = useState<ProjectBasic[]>( []);
  const [employees, setEmployees] = useState<EmployeeBasic[]>([]);

  useEffect(() => {
    let isMounted = true;

    if (cachedBasicProjects) {
      setBasicProjects(cachedBasicProjects);
      return () => {
        isMounted = false;
      };
    }

    const loadProjects = async () => {
      try {
        const list: ProjectBasic[] = await projectInfoService.getBasicProjects();
        const next = list
          .filter((p) => Boolean(p.name?.trim()))
          .sort((a, b) => a.name.localeCompare(b.name, 'he'));

        if (!isMounted) return;
        cachedBasicProjects = next;
        setBasicProjects(next);
      } catch {
        if (!isMounted) return;
        setBasicProjects([]);
      }
    };

    void loadProjects();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (cachedEmployees) {
      setEmployees(cachedEmployees);
      return () => {
        isMounted = false;
      };
    }

    const loadEmployees = async () => {
      try {
        const list: EmployeeBasic[] = await getEmployees();
        const next = list
          .filter((e) => Boolean(e.name?.trim()))
          .sort((a, b) => a.name.localeCompare(b.name, 'he'));

        if (!isMounted) return;
        cachedEmployees = next;
        setEmployees(next);
      } catch {
        if (!isMounted) return;
        setEmployees([]);
      }
    };

    void loadEmployees();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredBasicProjects = basicProjects.filter(p =>
    p.name.toLowerCase().includes(projectSearch.toLowerCase())
  );
  const filteredEmployees = employees.filter(e =>
    e.name.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  const projectNameById = (id: number) => basicProjects.find(bp => bp.id === id)?.name ?? `#${id}`;

  const isDirty =
    draft.dateFrom !== currentFilters.dateFrom ||
    draft.dateTo   !== currentFilters.dateTo   ||
    JSON.stringify(draft.projects) !== JSON.stringify(currentFilters.projects) ||
    JSON.stringify(draft.employees) !== JSON.stringify(currentFilters.employees);

  const isDefault =
    draft.dateFrom        === defaults.dateFrom &&
    draft.dateTo          === defaults.dateTo   &&
    draft.projects.length === 0 &&
    draft.employees.length === 0;

  const toggleProject = (projectId: number) => {
    setDraft(d => ({
      ...d,
      projects: d.projects.includes(projectId)
        ? d.projects.filter(v => v !== projectId)
        : [...d.projects, projectId],
    }));
  };

  const toggleEmployee = (employeeName: string) => {
    setDraft(d => ({
      ...d,
      employees: d.employees.includes(employeeName)
        ? d.employees.filter(v => v !== employeeName)
        : [...d.employees, employeeName],
    }));
  };

  const handleReset = () => {
    setDraft({ ...defaults });
    setProjectSearch('');
    setEmployeeSearch('');
  };

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="modal-shell dark-surface bg-white dark:bg-gray-800 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]"
        dir="rtl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={MODAL_HEADER_SM}>
          <div className="flex items-center gap-2">
            <Database size={16} className="text-teal-600 dark:text-teal-400" />
            <h2 className={MODAL_TITLE_SM}>טעינת נתונים</h2>
          </div>
          <button
            onClick={onClose}
            className={MODAL_CLOSE_BTN}
          >
            <X size={16} />
          </button>
        </div>

        {/* Info banner */}
        <div className="mx-5 mt-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex-shrink-0 hidden">
          <p className="text-xs font-semibold text-blue-800 mb-1">פילטר על בסיס הנתונים</p>
          <p className="text-xs text-blue-600 leading-relaxed">
            הגדרות אלו משפיעות על הנתונים שנטענים מהשרת. לאחר שינוי לחץ "החל ורענן נתונים".
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Date range */}
          <div>
            <p className={`${MODAL_LABEL} mb-3`}>טווח תאריכים</p>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[10px] text-gray-400 dark:text-gray-500 block mb-1.5">מתאריך</label>
                <DateInput
                  value={draft.dateFrom}
                  onChange={v => setDraft(d => ({ ...d, dateFrom: v }))}
                  className={MODAL_FIELD}
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-gray-400 dark:text-gray-500 block mb-1.5">עד תאריך</label>
                <DateInput
                  value={draft.dateTo}
                  onChange={v => setDraft(d => ({ ...d, dateTo: v }))}
                  className={MODAL_FIELD}
                />
              </div>
            </div>

            {/* Range indicator */}
            {(draft.dateFrom || draft.dateTo) && (
              <div className="mt-2 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-lg px-3 py-2">
                <p className="text-[10px] text-teal-600 dark:text-teal-300 font-medium mb-0.5">טווח נבחר:</p>
                <p className="text-xs text-teal-800 dark:text-teal-200">
                  {draft.dateFrom || 'ללא הגבלה'} — {draft.dateTo || 'ללא הגבלה'}
                </p>
              </div>
            )}
          </div>

          {/* Projects */}
          <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className={MODAL_LABEL}>פרויקט</p>
              {draft.projects.length > 0 && (
                <button
                  onClick={() => setDraft(d => ({ ...d, projects: [] }))}
                  className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                >
                  נקה ({draft.projects.length})
                </button>
              )}
            </div>

            {/* Search */}
            <SearchInput
              value={projectSearch}
              onChange={setProjectSearch}
              placeholder="חפש פרויקט..."
              iconSize={13}
              dir="rtl"
              className="text-xs mb-2 border-gray-200 bg-gray-50 focus:ring-teal-400 py-2"
            />

            {/* Options */}
            <div className="max-h-44 overflow-y-auto flex flex-col gap-0.5">
              {filteredBasicProjects.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">לא נמצאו פרויקטים</p>
              ) : (
                filteredBasicProjects.map(p => {
                  const checked = draft.projects.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      onClick={() => toggleProject(p.id)}
                      className={`flex items-center gap-2.5 px-2 py-2 rounded-lg cursor-pointer transition-colors ${
                        checked ? 'bg-teal-50 dark:bg-teal-950/40' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-all ${
                        checked ? 'bg-teal-500 border-teal-500' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                      }`}>
                        {checked && (
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                      <span className={`text-xs ${checked ? 'text-teal-800 dark:text-teal-200 font-medium' : 'text-gray-700 dark:text-gray-200'}`}>
                        {p.name}
                      </span>
                    </label>
                  );
                })
              )}
            </div>

            {/* Selected chips */}
            {draft.projects.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {draft.projects.map(id => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-200 text-xs px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-700"
                  >
                    {projectNameById(id)}
                    <button type="button" onClick={() => toggleProject(id)} className="hover:text-teal-600">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Employees */}
          <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className={MODAL_LABEL}>עובד</p>
              {draft.employees.length > 0 && (
                <button
                  onClick={() => setDraft(d => ({ ...d, employees: [] }))}
                  className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                >
                  נקה ({draft.employees.length})
                </button>
              )}
            </div>

            {/* Search */}
            <SearchInput
              value={employeeSearch}
              onChange={setEmployeeSearch}
              placeholder="חפש עובד..."
              iconSize={13}
              dir="rtl"
              className="text-xs mb-2 border-gray-200 bg-gray-50 focus:ring-teal-400 py-2"
            />

            {/* Options */}
            <div className="max-h-44 overflow-y-auto flex flex-col gap-0.5">
              {filteredEmployees.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">לא נמצאו עובדים</p>
              ) : (
                filteredEmployees.map(e => {
                  const checked = draft.employees.includes(e.name);
                  return (
                    <label
                      key={e.id}
                      onClick={() => toggleEmployee(e.name)}
                      className={`flex items-center gap-2.5 px-2 py-2 rounded-lg cursor-pointer transition-colors ${
                        checked ? 'bg-teal-50 dark:bg-teal-950/40' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-all ${
                        checked ? 'bg-teal-500 border-teal-500' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                      }`}>
                        {checked && (
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                      <span className={`text-xs ${checked ? 'text-teal-800 dark:text-teal-200 font-medium' : 'text-gray-700 dark:text-gray-200'}`}>
                        {e.name}
                      </span>
                    </label>
                  );
                })
              )}
            </div>

            {/* Selected chips */}
            {draft.employees.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {draft.employees.map(name => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1 bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-200 text-xs px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-700"
                  >
                    {name}
                    <button type="button" onClick={() => toggleEmployee(name)} className="hover:text-teal-600">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`${MODAL_FOOTER} flex gap-2`}>
          <button
            onClick={handleReset}
            disabled={isDefault}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-xl border-2 transition-all ${
              isDefault
                ? 'border-gray-100 dark:border-gray-700 text-gray-300 dark:text-gray-600 cursor-not-allowed'
                : `${TASK_CTRL_BTN}`
            }`}
          >
            <RotateCcw size={12} />
            נקה הכל
          </button>

          <button
            onClick={handleApply}
            disabled={!isDirty}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all ${
              isDirty
                ? 'bg-teal-500 hover:bg-teal-600 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }`}
          >
            <RefreshCw size={13} />
            החל ורענן נתונים
          </button>
        </div>
      </div>
    </div>
  );
}