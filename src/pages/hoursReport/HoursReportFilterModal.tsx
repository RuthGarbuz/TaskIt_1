import { X, Calendar, User, Briefcase } from 'lucide-react';

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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-xl font-bold text-gray-800">סינון דיווחי שעות</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* Projects + Reporters side by side */}
          <div className="grid grid-cols-2 gap-6">

            {/* Projects */}
            <div>
              <h3 className="font-semibold mb-3 text-gray-800 flex items-center gap-2">
                <Briefcase size={16} className="text-teal-600" />
                פרויקט
              </h3>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {allProjects.map(p => (
                  <label key={p} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.projects.includes(p)}
                      onChange={() => toggle('projects', p)}
                      className="w-4 h-4 rounded text-teal-500 focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-700">{p}</span>
                  </label>
                ))}
                {allProjects.length === 0 && (
                  <p className="text-sm text-gray-400 p-2">לא נמצאו פרויקטים</p>
                )}
              </div>
            </div>

            {/* Reporters */}
            <div>
              <h3 className="font-semibold mb-3 text-gray-800 flex items-center gap-2">
                <User size={16} className="text-teal-600" />
                עובד מדווח
              </h3>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {allReporters.map(r => (
                  <label key={r} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.reporters.includes(r)}
                      onChange={() => toggle('reporters', r)}
                      className="w-4 h-4 rounded text-teal-500 focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-700">{r}</span>
                  </label>
                ))}
                {allReporters.length === 0 && (
                  <p className="text-sm text-gray-400 p-2">לא נמצאו עובדים</p>
                )}
              </div>
            </div>
          </div>

          {/* Date Range */}
          <div className="border-t pt-5">
            <h3 className="font-semibold mb-3 text-gray-800 flex items-center gap-2">
              <Calendar size={16} className="text-teal-600" />
              טווח תאריכים
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">מתאריך</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={e => onChange({ ...filters, dateFrom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">עד תאריך</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={e => onChange({ ...filters, dateTo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t">
            <button
              onClick={onClear}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors text-gray-700"
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