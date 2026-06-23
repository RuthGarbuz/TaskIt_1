import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Database, RefreshCw, RotateCcw } from 'lucide-react';
import * as projectInfoService from '../../services/projectInfoService.ts';
import * as templatesSettingServices from '../../services/templatesSettingServices.ts';
import * as settingService from '../../services/settingService.ts';
import type { SystemTable } from '../../Data/projectsData.ts';
import type { ProjectBasic } from '../../Data/projectInfoData.ts';
import type { EmployeeBasic } from '../../services/templatesSettingServices.ts';
import type { StudioDepartmentType } from '../../types/settings.ts';
import type { GanttFilters } from './types.ts';

type SelectOption = { id: number; name: string };

const STATUS_CHIP_CLASS = 'bg-blue-100 text-blue-700 border-blue-300';

let cachedGanttLists: {
  projects: ProjectBasic[];
  employees: EmployeeBasic[];
  studioDepartments: SelectOption[];
  statusList: SelectOption[];
  urgencyList: SelectOption[];
} | null = null;

export function tenDaysFromToday() {
  const d = new Date();
  d.setDate(d.getDate() + 10);
  return d.toISOString().split('T')[0];
}

export function getDefaultGanttFilters(): GanttFilters {
  return {
    dateFrom: '',
    dateTo: tenDaysFromToday(),
    closedTasks: 'all',
    stepStatusId: null,
    projectStatusId: null,
    urgency: [],
    teamLeadId: null,
    studioDepartmentId: null,
    projects: [],
  };
}

/** סטטוס יחיד — צ׳יפים כמו Db אבל רק אחד פעיל (או הכל) */
function SingleStatusChipSelect({
  label,
  options,
  selectedId,
  onChange,
}: {
  label: string;
  options: SelectOption[];
  selectedId: number | null;
  onChange: (id: number | null) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-600">{label}</p>
        {selectedId != null && (
          <button type="button" onClick={() => onChange(null)} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
            נקה
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150
            ${selectedId === null ? `${STATUS_CHIP_CLASS} ring-2 ring-offset-1 ring-emerald-400` : `${STATUS_CHIP_CLASS} opacity-50 hover:opacity-80`}`}
        >
          {selectedId === null && (
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          הכל
        </button>
        {options.map(opt => {
          const active = selectedId === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(active ? null : opt.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150
                ${active ? `${STATUS_CHIP_CLASS} ring-2 ring-offset-1 ring-emerald-400` : `${STATUS_CHIP_CLASS} opacity-50 hover:opacity-80`}`}
            >
              {active && (
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {opt.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SearchSelect({
  label,
  placeholder,
  options,
  selected,
  onChange,
}: {
  label: string;
  placeholder: string;
  options: SelectOption[];
  selected: number[];
  onChange: (val: number[]) => void;
}) {
  const [search, setSearch] = useState('');
  const normalizeForSearch = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9\u0590-\u05ff]/g, '');
  const normalizedSearch = normalizeForSearch(search);
  const filtered = options.filter(o => normalizeForSearch(o.name).includes(normalizedSearch));

  const toggle = (val: number) => {
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-600">{label}</p>
        {selected.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
            נקה ({selected.length})
          </button>
        )}
      </div>

      <div className="relative mb-2">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={placeholder}
          dir="rtl"
          className="w-full text-xs px-3 py-2 pr-3 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
        />
        {search && (
          <button type="button" onClick={() => setSearch('')} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={12} />
          </button>
        )}
      </div>

      <div className="max-h-36 overflow-y-auto flex flex-col gap-0.5">
        {filtered.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-3">לא נמצאו תוצאות</p>
        ) : (
          filtered.map(opt => {
            const checked = selected.includes(opt.id);
            return (
              <label
                key={opt.id}
                className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                  checked ? 'bg-emerald-50' : 'hover:bg-gray-50'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-all ${
                    checked ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 bg-white'
                  }`}
                  onClick={() => toggle(opt.id)}
                >
                  {checked && (
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <span
                  className={`text-xs ${checked ? 'text-emerald-800 font-medium' : 'text-gray-700'}`}
                  onClick={() => toggle(opt.id)}
                >
                  {opt.name}
                </span>
              </label>
            );
          })
        )}
      </div>

      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {selected.map(selectedId => {
            const option = options.find(item => item.id === selectedId);
            const labelText = option?.name ?? `#${selectedId}`;
            return (
              <span
                key={selectedId}
                className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full border border-emerald-200"
              >
                {labelText}
                <button type="button" onClick={() => toggle(selectedId)} className="hover:text-emerald-600">
                  <X size={10} />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SingleAutocompleteSelect({
  label,
  placeholder,
  options,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  options: SelectOption[];
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const [search, setSearch] = useState('');
  const normalizeForSearch = (text: string) =>
    text.toLowerCase().replace(/[^a-z0-9\u0590-\u05ff]/g, '');

  const selectedOption = options.find(o => o.id === value) ?? null;
  const normalizedSearch = normalizeForSearch(search);
  const filtered = options.filter(o => normalizeForSearch(o.name).includes(normalizedSearch));

  useEffect(() => {
    if (selectedOption) {
      setSearch(selectedOption.name);
      return;
    }
    setSearch('');
  }, [value, selectedOption?.name]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-600">{label}</p>
        {value != null && (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setSearch('');
            }}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
          >
            נקה
          </button>
        )}
      </div>

      <div className="relative mb-2">
        <input
          type="text"
          value={search}
          onChange={e => {
            const q = e.target.value;
            setSearch(q);
            if (q.trim() === '') onChange(null);
          }}
          placeholder={placeholder}
          dir="rtl"
          className="w-full text-xs px-3 py-2 pr-3 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
        />
        {search && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              onChange(null);
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={12} />
          </button>
        )}
      </div>

      <div className="max-h-36 overflow-y-auto flex flex-col gap-0.5 border border-gray-100 rounded-lg p-1 bg-white">
        {filtered.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-3">לא נמצאו תוצאות</p>
        ) : (
          filtered.map(opt => {
            const active = value === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onChange(opt.id);
                  setSearch(opt.name);
                }}
                className={`w-full text-right px-2 py-1.5 rounded-lg text-xs transition-colors ${
                  active
                    ? 'bg-emerald-100 text-emerald-800 font-medium'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                {opt.name}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export interface GanttFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: GanttFilters) => void;
  currentFilters: GanttFilters;
}

export function GanttFilterModal({ isOpen, onClose, onApply, currentFilters }: GanttFilterModalProps) {
  const [chipLists, setChipLists] = useState({
    statusList: [] as SelectOption[],
    urgencyList: [] as SelectOption[],
  });
  const [listOptions, setListOptions] = useState({
    projects: [] as ProjectBasic[],
    employees: [] as EmployeeBasic[],
    studioDepartments: [] as SelectOption[],
  });

  const [draft, setDraft] = useState<GanttFilters>({ ...currentFilters });

  useEffect(() => {
    let isMounted = true;

    if (cachedGanttLists) {
      setListOptions({
        projects: cachedGanttLists.projects,
        employees: cachedGanttLists.employees,
        studioDepartments: cachedGanttLists.studioDepartments,
      });
      setChipLists({ statusList: cachedGanttLists.statusList, urgencyList: cachedGanttLists.urgencyList });
      return () => {
        isMounted = false;
      };
    }

    const loadLists = async () => {
      try {
        const [basicProjects, employees, statuses, priorities, studioDepartments]: [
          ProjectBasic[],
          EmployeeBasic[],
          SystemTable[],
          SystemTable[],
          StudioDepartmentType[],
        ] = await Promise.all([
          projectInfoService.getBasicProjects(),
          templatesSettingServices.getEmployees(),
          settingService.getTaskStatuses(),
          settingService.getTaskPriorities(),
          settingService.getStudioDepartments(),
        ]);

        const nextListOptions = {
          projects: basicProjects
            .filter((project: ProjectBasic) => Boolean(project.name?.trim()))
            .sort((a: ProjectBasic, b: ProjectBasic) => a.name.localeCompare(b.name, 'he')),
          employees: employees
            .filter((employee: EmployeeBasic) => Boolean(employee.name?.trim()))
            .sort((a: EmployeeBasic, b: EmployeeBasic) => a.name.localeCompare(b.name, 'he')),
          studioDepartments: studioDepartments
            .filter((department: StudioDepartmentType) => Boolean(department.name?.trim()))
            .map((department: StudioDepartmentType) => ({ id: department.id, name: department.name.trim() }))
            .sort((a: SelectOption, b: SelectOption) => a.name.localeCompare(b.name, 'he')),
        };

        const nextChipLists = {
          statusList: statuses
            .filter((status: SystemTable) => (status as { isActive?: boolean }).isActive !== false)
            .map((status: SystemTable) => ({ id: status.id, name: status.name })),
          urgencyList: priorities
            .filter((priority: SystemTable) => (priority as { isActive?: boolean }).isActive !== false)
            .map((priority: SystemTable) => ({ id: priority.id, name: priority.name })),
        };

        if (!isMounted) return;

        cachedGanttLists = {
          projects: nextListOptions.projects,
          employees: nextListOptions.employees,
          studioDepartments: nextListOptions.studioDepartments,
          statusList: nextChipLists.statusList,
          urgencyList: nextChipLists.urgencyList,
        };

        setListOptions(nextListOptions);
        setChipLists(nextChipLists);
      } catch {
        if (!isMounted) return;
        setListOptions({ projects: [], employees: [], studioDepartments: [] });
        setChipLists({ statusList: [], urgencyList: [] });
      }
    };

    void loadLists();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setDraft({ ...currentFilters });
  }, [isOpen, currentFilters]);

  const studioDepartmentOptions: SelectOption[] = listOptions.studioDepartments;

  const teamLeadOptions: SelectOption[] = listOptions.employees.map(e => ({ id: e.id, name: e.name }));

  const defaults = getDefaultGanttFilters();

  const isDirty =
    draft.dateFrom !== currentFilters.dateFrom ||
    draft.dateTo !== currentFilters.dateTo ||
    draft.closedTasks !== currentFilters.closedTasks ||
    draft.stepStatusId !== currentFilters.stepStatusId ||
    draft.projectStatusId !== currentFilters.projectStatusId ||
    JSON.stringify([...draft.urgency].sort()) !== JSON.stringify([...currentFilters.urgency].sort()) ||
    draft.teamLeadId !== currentFilters.teamLeadId ||
    draft.studioDepartmentId !== currentFilters.studioDepartmentId ||
    JSON.stringify([...draft.projects].sort()) !== JSON.stringify([...currentFilters.projects].sort());

  const isDefault =
    draft.dateFrom === defaults.dateFrom &&
    draft.dateTo === defaults.dateTo &&
    draft.closedTasks === defaults.closedTasks &&
    draft.stepStatusId === defaults.stepStatusId &&
    draft.projectStatusId === defaults.projectStatusId &&
    draft.urgency.length === 0 &&
    draft.teamLeadId === defaults.teamLeadId &&
    draft.studioDepartmentId === defaults.studioDepartmentId &&
    draft.projects.length === 0;

  const handleReset = () => setDraft({ ...getDefaultGanttFilters() });

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="modal-shell dark-surface bg-white dark:bg-gray-800 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[92vh]"
        dir="rtl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Database size={16} className="text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-bold text-gray-900 dark:text-white text-base">סינון גאנט שלבים</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500 dark:text-gray-400">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* טווח תאריכים */}
          {/* <div>
            <p className="text-xs font-semibold text-gray-600 mb-3">טווח תאריכים</p>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[10px] text-gray-400 block mb-1.5">מתאריך</label>
                <input
                  type="date"
                  value={draft.dateFrom}
                  onChange={e => setDraft(d => ({ ...d, dateFrom: e.target.value }))}
                  className="w-full text-xs px-3 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-gray-400 block mb-1.5">עד תאריך</label>
                <input
                  type="date"
                  value={draft.dateTo}
                  onChange={e => setDraft(d => ({ ...d, dateTo: e.target.value }))}
                  className="w-full text-xs px-3 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                />
              </div>
            </div>
            {(draft.dateFrom || draft.dateTo) && (
              <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                <p className="text-[10px] text-emerald-600 font-medium mb-0.5">טווח נבחר:</p>
                <p className="text-xs text-emerald-800">
                  {draft.dateFrom || 'ללא הגבלה'} — {draft.dateTo || 'ללא הגבלה'}
                </p>
              </div>
            )}
          </div> */}

          {/* משימה שנבדקה / סגורה */}
          {/* <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">משימה שנבדקה</p>
            <div className="flex gap-2">
              {(['all', 'yes', 'no'] as const).map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setDraft(d => ({ ...d, closedTasks: v }))}
                  className={`flex-1 py-2 text-xs font-medium rounded-xl border-2 transition-all ${
                    draft.closedTasks === v
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {v === 'all' ? 'הכל' : v === 'yes' ? 'כן' : 'לא'}
                </button>
              ))}
            </div>
          </div> */}

          {/* סטטוס שלב — צ׳יפים */}
          <div className="border-t border-gray-100 pt-4">
            <SingleStatusChipSelect
              label="סטטוס שלב"
              options={chipLists.statusList}
              selectedId={draft.stepStatusId}
              onChange={stepStatusId => setDraft(d => ({ ...d, stepStatusId }))}
            />
          </div>

          {/* סטודיו / מחלקה — יחיד */}
          <div className="border-t border-gray-100 pt-4">
            <SingleAutocompleteSelect
              label="סטודיו / מחלקה"
              placeholder={studioDepartmentOptions.length === 0 ? 'אין נתוני מחלקה בפרויקטים' : 'כל הסטודיוים והמחלקות'}
              options={studioDepartmentOptions}
              value={draft.studioDepartmentId}
              onChange={studioDepartmentId => setDraft(d => ({ ...d, studioDepartmentId }))}
            />
          </div>

          {/* ראש צוות — יחיד */}
          <div className="border-t border-gray-100 pt-4">
            <SingleAutocompleteSelect
              label="ראש צוות"
              placeholder="כל ראשי הצוות"
              options={teamLeadOptions}
              value={draft.teamLeadId}
              onChange={teamLeadId => setDraft(d => ({ ...d, teamLeadId }))}
            />
          </div>

          <div className="border-t border-gray-100 pt-4">
            <SingleAutocompleteSelect
              label="סטטוס פרויקט"
              placeholder={chipLists.statusList.length === 0 ? 'אין סטטוסים זמינים' : 'כל הסטטוסים'}
              options={chipLists.statusList}
              value={draft.projectStatusId}
              onChange={projectStatusId => setDraft(d => ({ ...d, projectStatusId }))}
            />
          </div>

          {/* פרויקטים — רב */}
          <div className="border-t border-gray-100 pt-4">
            <SearchSelect
              label="פרויקט"
              placeholder="חפש פרויקט..."
              options={listOptions.projects.map(p => ({ id: p.id, name: p.name }))}
              selected={draft.projects}
              onChange={projIds => setDraft(d => ({ ...d, projects: projIds }))}
            />
          </div>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 flex-shrink-0">
          <button
            type="button"
            onClick={handleReset}
            disabled={isDefault}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-xl border-2 transition-all ${
              isDefault
                ? 'border-gray-100 text-gray-300 cursor-not-allowed'
                : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <RotateCcw size={12} />
            נקה הכל
          </button>

          <button
            type="button"
            onClick={handleApply}
            disabled={!isDirty}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all ${
              isDirty
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <RefreshCw size={13} />
            החל ורענן נתונים
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default GanttFilterModal;
