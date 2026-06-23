
import { useState, useEffect, useRef } from 'react';
import { X, Database, RefreshCw, RotateCcw } from 'lucide-react';
import * as projectInfoService from '../../services/projectInfoService';
import * as templatesSettingServices from '../../services/templatesSettingServices';
import * as settingService from '../../services/settingService';
import type { DBFilters } from '../../Data/tasksData';
import type { ProjectBasic } from '../../Data/projectInfoData';
import type { EmployeeBasic } from '../../services/templatesSettingServices';
import type { PriorityItem, StatusItem } from '../../types/settings';
import { DateInput } from '../shared/DateInput';
import {
  MODAL_CLOSE_BTN,
  MODAL_FIELD,
  MODAL_FOOTER,
  MODAL_HEADER_SM,
  MODAL_LABEL,
  MODAL_OVERLAY_SHEET,
  MODAL_SHELL_SHEET,
  MODAL_TITLE_SM,
  TASK_CTRL_BTN,
} from './taskViewTheme';

// ─── Types ────────────────────────────────────────────────────────────────────


interface DBFilterModalProps {
  onClose: () => void;
  onApply: (filters: DBFilters) => void;
  currentFilters: DBFilters;
  defaultClosedTasks?: DBFilters['closedTasks'];
  closedTasksLabel?: string;
  senderLabel?: string;
  hideUrgency?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tenDaysFromToday() {
  const d = new Date();
  d.setDate(d.getDate() + 10);
  return d.toISOString().split('T')[0];
}

export function getDefaultDBFilters(
  defaultStatusIds: number[] = [],
  defaultClosedTasks: DBFilters['closedTasks'] = 'all'
): DBFilters {
  return {
    dateFrom: '',
    dateTo: tenDaysFromToday(),
    closedTasks: defaultClosedTasks,
    status: defaultStatusIds,
    urgency: [],
    senders: [],
    projects: [],
  };
}

// ─── Static option types ─────────────────────────────────────────────────────

type SelectOption = { id: number; name: string };

const STATUS_CHIP_CLASS = 'bright-surface bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-700';
const URGENCY_CHIP_CLASS = 'bright-surface bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700';

let cachedListOptions: { projects: ProjectBasic[]; senders: EmployeeBasic[] } | null = null;
let cachedChipLists: { statusList: SelectOption[]; urgencyList: SelectOption[] } | null = null;

// ─── ChipSelect: colored chip toggles ────────────────────────────────────────

function ChipSelect({
  label,
  options,
  selected,
  onChange,
  chipClass,
}: {
  label: string;
  options: SelectOption[];
  selected: number[];
  onChange: (val: number[]) => void;
  chipClass: string;
}) {
  const toggle = (val: number) =>
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className={MODAL_LABEL}>{label}</p>
        {selected.length > 0 && (
          <button
            onClick={() => onChange([])}
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
          >
            נקה
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => {
          const active = selected.includes(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => toggle(opt.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150
                ${active
                  ? `${chipClass} ring-2 ring-offset-1 ring-emerald-400`
                  : `${chipClass} opacity-50 hover:opacity-80`
                }`}
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

// ─── Sub-component: Search+Select list ───────────────────────────────────────

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
  const filtered = options.filter(o =>
    normalizeForSearch(o.name).includes(normalizedSearch)
  );

  const toggle = (val: number) => {
    onChange(
      selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className={MODAL_LABEL}>{label}</p>
        {selected.length > 0 && (
          <button
            onClick={() => onChange([])}
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
          >
            נקה ({selected.length})
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-2">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={placeholder}
          dir="rtl"
          className={`${MODAL_FIELD} text-xs rounded-lg`}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Options */}
      <div className="max-h-36 overflow-y-auto flex flex-col gap-0.5">
        {filtered.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-3">לא נמצאו תוצאות</p>
        ) : (
          filtered.map(opt => {
            const checked = selected.includes(opt.id);
            return (
              <label
                key={opt.id}
                className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                  checked ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-all ${
                    checked
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
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
                  className={`text-xs ${checked ? 'text-emerald-800 dark:text-emerald-200 font-medium' : 'text-gray-700 dark:text-gray-200'}`}
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
          {selected.map((selectedId) => {
            const option = options.find((item) => item.id === selectedId);
            const labelText = option?.name ?? `#${selectedId}`;

            return (
            <span
              key={selectedId}
              className="inline-flex items-center gap-1 bright-surface bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 text-xs px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-700"
            >
              {labelText}
              <button onClick={() => toggle(selectedId)} className="hover:text-emerald-600 dark:hover:text-emerald-300">
                <X size={10} />
              </button>
            </span>
          );})}
        </div>
      )}
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function DBFilterModal({
  onClose,
  onApply,
  currentFilters,
  defaultClosedTasks = 'all',
  closedTasksLabel = 'משימה שנבדקה',
  senderLabel = 'שולח',
  hideUrgency = false,
}: DBFilterModalProps) {
  const modalTitle =
    closedTasksLabel === 'חשבונות שהוגשו' ? 'סינון חשבונות להגשה' : 'סינון משימות';

  const [chipLists, setChipLists] = useState({
    statusList: [] as SelectOption[],
    urgencyList: [] as SelectOption[]
  });
  const [listOptions, setListOptions] = useState({
    projects: [] as ProjectBasic[],
    senders: [] as EmployeeBasic[]
  });

  // Local draft — only committed on "החל ורענן נתונים"
  const [draft, setDraft] = useState<DBFilters>({ ...currentFilters });
  const didInitDefaultStatusRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    if (cachedListOptions && cachedChipLists) {
      setListOptions(cachedListOptions);
      setChipLists(cachedChipLists);
      return () => {
        isMounted = false;
      };
    }

    const loadLists = async () => {
      try {
        const [basicProjects, employees, statuses, priorities]: [ProjectBasic[], EmployeeBasic[], StatusItem[], PriorityItem[]] = await Promise.all([
          projectInfoService.getBasicProjects(),
          templatesSettingServices.getEmployees(),
          settingService.getTaskStatuses(),
          settingService.getTaskPriorities(),
        ]);

        const nextListOptions = {
          projects: basicProjects
            .filter((project: ProjectBasic) => Boolean(project.name?.trim()))
            .sort((a: ProjectBasic, b: ProjectBasic) => a.name.localeCompare(b.name, 'he')),
          senders: employees
            .filter((employee: EmployeeBasic) => Boolean(employee.name?.trim()))
            .sort((a: EmployeeBasic, b: EmployeeBasic) => a.name.localeCompare(b.name, 'he'))
        };

        const nextChipLists = {
          statusList: statuses
            .filter((status: StatusItem) => status.isActive)
            .map((status: StatusItem) => ({ id: status.id, name: status.name })),
          urgencyList: priorities
            .filter((priority: PriorityItem) => priority.isActive)
            .map((priority: PriorityItem) => ({ id: priority.id, name: priority.name }))
        };

        if (!isMounted) return;

        cachedListOptions = nextListOptions;
        cachedChipLists = nextChipLists;

        setListOptions(nextListOptions);
        setChipLists(nextChipLists);
      } catch {
        if (!isMounted) return;
        setListOptions({ projects: [], senders: [] });
        setChipLists({ statusList: [], urgencyList: [] });
      }
    };

    void loadLists();

    return () => {
      isMounted = false;
    };
  }, []);

  const isAllTasksDefaults = defaultClosedTasks === 'no';
  const defaultStatusIds = chipLists.statusList
    .map((status) => status.id)
    .filter((id) => isAllTasksDefaults || id !== 3);
  const defaults = getDefaultDBFilters(defaultStatusIds, defaultClosedTasks);

  useEffect(() => {
    if (didInitDefaultStatusRef.current) return;
    if (chipLists.statusList.length === 0) return;
    if (currentFilters.status.length > 0 || draft.status.length > 0) {
      didInitDefaultStatusRef.current = true;
      return;
    }
    setDraft((prev) => ({ ...prev, status: defaultStatusIds }));
    didInitDefaultStatusRef.current = true;
  }, [chipLists.statusList, currentFilters.status.length, draft.status.length, defaultStatusIds]);

  const isDirty =
    draft.dateFrom    !== currentFilters.dateFrom    ||
    draft.dateTo      !== currentFilters.dateTo      ||
    draft.closedTasks !== currentFilters.closedTasks ||
    JSON.stringify(draft.status)   !== JSON.stringify(currentFilters.status)   ||
    JSON.stringify(draft.urgency)  !== JSON.stringify(currentFilters.urgency)  ||
    JSON.stringify(draft.senders)  !== JSON.stringify(currentFilters.senders)  ||
    JSON.stringify(draft.projects) !== JSON.stringify(currentFilters.projects);

  const isDefault =
    draft.dateFrom    === defaults.dateFrom    &&
    draft.dateTo      === defaults.dateTo      &&
    draft.closedTasks === defaults.closedTasks &&
    JSON.stringify(draft.status)   === JSON.stringify(defaults.status) &&
    draft.urgency.length  === 0 &&
    draft.senders.length  === 0 &&
    draft.projects.length === 0;

  const handleReset = () => setDraft({ ...defaults });

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  return (
    <div
      className={MODAL_OVERLAY_SHEET}
      onClick={onClose}
    >
      <div
        className={`${MODAL_SHELL_SHEET}`}
        dir="rtl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={MODAL_HEADER_SM}>
          <div className="flex items-center gap-2">
            <Database size={16} className="text-emerald-600 dark:text-emerald-400" />
            <h2 className={MODAL_TITLE_SM}>{modalTitle}</h2>
          </div>
          <button onClick={onClose} className={MODAL_CLOSE_BTN}>
            <X size={16} />
          </button>
        </div>

        {/* Info banner */}
        <div className="mx-5 mt-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex-shrink-0 hidden">
          {/* <p className="text-xs font-semibold text-blue-800 mb-1">סינון</p> */}
          <p className="text-xs text-blue-600 leading-relaxed">
            הגדרות אלו משפיעות על הנתונים שנטענים מהשרת. לאחר שינוי לחץ "החל ורענן נתונים" כדי לשלוח את הבקשה מחדש.
          </p>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Date range */}
          <div>
            <p className={`${MODAL_LABEL} mb-3`}>טווח תאריכים</p>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[10px] text-gray-400 dark:text-gray-400 block mb-1.5">מתאריך</label>
                <DateInput
                  value={draft.dateFrom}
                  onChange={v => setDraft(d => ({ ...d, dateFrom: v }))}
                  className={`${MODAL_FIELD} text-xs border-2 rounded-xl`}
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-gray-400 dark:text-gray-400 block mb-1.5">עד תאריך</label>
                <DateInput
                  value={draft.dateTo}
                  onChange={v => setDraft(d => ({ ...d, dateTo: v }))}
                  className={`${MODAL_FIELD} text-xs border-2 rounded-xl`}
                />
              </div>
            </div>

            {/* Active range indicator */}
            {(draft.dateFrom || draft.dateTo) && (
              <div className="mt-2 bright-surface bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-lg px-3 py-2">
                <p className="text-[10px] text-emerald-600 dark:text-emerald-300 font-medium mb-0.5">טווח נבחר:</p>
                <p className="text-xs text-emerald-800 dark:text-emerald-200">
                  {draft.dateFrom || 'ללא הגבלה'} — {draft.dateTo || 'ללא הגבלה'}
                </p>
              </div>
            )}
          </div>

        

          {/* Status */}
          <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
            <ChipSelect
              label="סטטוס"
              options={chipLists.statusList}
              selected={draft.status}
              onChange={status => setDraft(d => ({ ...d, status }))}
              chipClass={STATUS_CHIP_CLASS}
            />
          </div>

          {/* Urgency */}
          {!hideUrgency && (
            <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
              <ChipSelect
                label="עדיפות"
                options={chipLists.urgencyList}
                selected={draft.urgency}
                onChange={urgency => setDraft(d => ({ ...d, urgency }))}
                chipClass={URGENCY_CHIP_CLASS}
              />
            </div>
          )}
  {/* Closed tasks */}
  <div>
            <p className={`${MODAL_LABEL} mb-2`}>{closedTasksLabel}</p>
            <div className="flex gap-2">
              {(['all', 'yes', 'no'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setDraft(d => ({ ...d, closedTasks: v }))}
                  className={`flex-1 py-2 text-xs font-medium rounded-xl border-2 transition-all ${
                    draft.closedTasks === v
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  {v === 'all' ? 'הכל' : v === 'yes' ? 'כן' : 'לא'}
                </button>
              ))}
            </div>
          </div>
          {/* Sender */}
          <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
            <SearchSelect
              label={senderLabel}
              placeholder="חפש שולח..."
              options={listOptions.senders}
              selected={draft.senders}
              onChange={senders => setDraft(d => ({ ...d, senders }))}
            />
          </div>

          {/* Project */}
          <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
            <SearchSelect
              label="פרויקט"
              placeholder="חפש פרויקט..."
              options={listOptions.projects}
             // options={basicProjects}

              selected={draft.projects}
              onChange={projects => setDraft(d => ({ ...d, projects }))}
            />
          </div>
        </div>

        {/* Footer */}
        <div className={`${MODAL_FOOTER} flex gap-2 !px-5`}>
          <button
            onClick={handleReset}
            disabled={isDefault}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-xl border-2 transition-all ${
              isDefault
                ? 'border-gray-100 dark:border-gray-700 text-gray-300 dark:text-gray-600 cursor-not-allowed'
                : `${TASK_CTRL_BTN} hover:bg-gray-50 dark:hover:bg-gray-600`
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
                ? 'bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white shadow-sm'
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
