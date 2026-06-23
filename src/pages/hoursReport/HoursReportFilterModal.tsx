import { X, Calendar, User, Briefcase } from 'lucide-react';
import { DateInput } from '../shared/DateInput';
import { MODAL_CLOSE_BTN, MODAL_FIELD, MODAL_FOOTER, MODAL_HEADER, MODAL_LABEL, MODAL_TITLE, TASK_CTRL_BTN } from '../tasks/taskViewTheme';

export interface HoursReportFilters {
  projects: string[];
  reporters: string[];
  dateFrom: string;
  dateTo: string;
}

interface HoursReportFilterModalProps {
  filters: HoursReportFilters;
  allProjects: string[];
  allReporters: string[];
  onChange: (filters: HoursReportFilters) => void;
  onClear: () => void;
  onClose: () => void;
}

export const EMPTY_FILTERS: HoursReportFilters = {
  projects: [],
  reporters: [],
  dateFrom: '',
  dateTo: '',
};

export function countActiveFilters(f: HoursReportFilters): number {
  return f.projects.length + f.reporters.length + (f.dateFrom ? 1 : 0) + (f.dateTo ? 1 : 0);
}

export default function HoursReportFilterModal({
  filters, allProjects, allReporters, onChange, onClear, onClose,
}: HoursReportFilterModalProps) {

  const toggle = (field: 'projects' | 'reporters', value: string) => {
    const list = filters[field];
    onChange({
      ...filters,
      [field]: list.includes(value) ? list.filter(v => v !== value) : [...list, value],
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="modal-shell dark-surface bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl max-h-[85vh] overflow-y-auto">

        {/* Header */}
        <div className={`sticky top-0 ${MODAL_HEADER} bg-white dark:bg-gray-800 rounded-t-2xl z-10`}>
          <h2 className={MODAL_TITLE}>סינון דיווחי שעות</h2>
          <button onClick={onClose} className={MODAL_CLOSE_BTN}>
            <X size={20} className="text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* Projects + Reporters side by side */}
          <div className="grid grid-cols-2 gap-6">

            {/* Projects */}
            <div>
              <h3 className={`font-semibold mb-3 flex items-center gap-2 ${MODAL_LABEL} !text-sm text-gray-800 dark:text-white`}>
                <Briefcase size={16} className="text-teal-600" />
                פרויקט
              </h3>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {allProjects.map(p => (
                  <label key={p} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.projects.includes(p)}
                      onChange={() => toggle('projects', p)}
                      className="w-4 h-4 rounded text-teal-500 focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-200">{p}</span>
                  </label>
                ))}
                {allProjects.length === 0 && (
                  <p className="text-sm text-gray-400 p-2">לא נמצאו פרויקטים</p>
                )}
              </div>
            </div>

            {/* Reporters */}
            <div>
              <h3 className={`font-semibold mb-3 flex items-center gap-2 ${MODAL_LABEL} !text-sm text-gray-800 dark:text-white`}>
                <User size={16} className="text-teal-600" />
                עובד מדווח
              </h3>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {allReporters.map(r => (
                  <label key={r} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.reporters.includes(r)}
                      onChange={() => toggle('reporters', r)}
                      className="w-4 h-4 rounded text-teal-500 focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-200">{r}</span>
                  </label>
                ))}
                {allReporters.length === 0 && (
                  <p className="text-sm text-gray-400 p-2">לא נמצאו עובדים</p>
                )}
              </div>
            </div>
          </div>

          {/* Date Range */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
            <h3 className={`font-semibold mb-3 flex items-center gap-2 text-gray-800 dark:text-white`}>
              <Calendar size={16} className="text-teal-600" />
              טווח תאריכים
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block mb-1 ${MODAL_LABEL}`}>מתאריך</label>
                <DateInput
                  value={filters.dateFrom}
                  onChange={v => onChange({ ...filters, dateFrom: v })}
                  className={MODAL_FIELD}
                />
              </div>
              <div>
                <label className={`block mb-1 ${MODAL_LABEL}`}>עד תאריך</label>
                <DateInput
                  value={filters.dateTo}
                  onChange={v => onChange({ ...filters, dateTo: v })}
                  className={MODAL_FIELD}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className={`flex gap-3 pt-2 border-t border-gray-200 dark:border-gray-700 ${MODAL_FOOTER} !px-0`}>
            <button
              onClick={onClear}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors ${TASK_CTRL_BTN}`}
            >
              נקה הכל
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-teal-500 text-white py-2.5 rounded-lg hover:bg-teal-600 font-medium transition-colors shadow-sm"
            >
              החל
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}