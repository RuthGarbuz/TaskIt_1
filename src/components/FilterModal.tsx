import { useState } from 'react';
import { X, Calendar } from 'lucide-react';
import type { Task } from '../types/index';
import type { TaskReview } from '../Data/projectsData';
import { getStatusText } from '../Data/tasksData';
import { DateInput } from '../pages/shared/DateInput';
import SearchInput from '../pages/shared/SearchInput';

interface Filters {
  status: string[];
  urgency: string[];
  project: string[];
  dateFrom: string;
  dateTo: string;
  sender: string[];
  completed: 'all' | 'yes' | 'no';
  projectActive: 'all' | 'active' | 'inactive';
}

interface FilterModalProps {
  filters: Filters;
  onFilterToggle: (type: 'status' | 'urgency' | 'project' | 'sender', value: string) => void;
  onFiltersChange: (filters: Filters) => void;
  onClearFilters: () => void;
  onClose: () => void;
  baseTasks: Array<Task | TaskReview>;
  projectSearchQuery: string;
  setProjectSearchQuery: (query: string) => void;
}

export default function FilterModal({
  filters,
  onFilterToggle,
  onFiltersChange,
  onClearFilters,
  onClose,
  baseTasks,
  projectSearchQuery,
  setProjectSearchQuery,
}: FilterModalProps) {
  const getSender = (task: Task | TaskReview) =>
    'sender' in task ? (task.sender ?? '') : (task.senderName ?? '');
  const getProject = (task: Task | TaskReview) =>
    'project' in task ? task.project : (task.projectName ?? '');
  const getCompleted = (task: Task | TaskReview) =>
    'completed' in task ? task.completed : task.isClosed;

  const allSenders = [...new Set(baseTasks.map(getSender).filter(Boolean))].sort() as string[];
  const [senderSearchQuery, setSenderSearchQuery] = useState('');
  const filteredSenders = allSenders.filter(s =>
    s.toLowerCase().includes(senderSearchQuery.toLowerCase())
  );
  const allProjects = [...new Set(baseTasks.map(getProject))];

  // projectActive filter — since Task has no projectActive field,
  // we treat a project as "active" if it has at least one non-completed task
  const filteredProjects = allProjects.filter(project => {
    const matchesSearch = project.toLowerCase().includes(projectSearchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (filters.projectActive === 'all') return true;
    const hasActiveTasks = baseTasks.some(t => getProject(t) === project && !getCompleted(t));
    return filters.projectActive === 'active' ? hasActiveTasks : !hasActiveTasks;
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="modal-shell dark-surface bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl flex flex-col" style={{ maxHeight: '85vh' }}>
        <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">סינון משימות</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* Status + Urgency */}
          <div className="grid grid-cols-2 gap-6 mb-6 pb-6 border-b">
            <div>
              <h3 className="font-semibold mb-3 text-gray-800">סטטוס</h3>
              <div className="space-y-2">
                {['todo', 'inProgress', 'done'].map(status => (
                  <label key={status} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.status.includes(status)}
                      onChange={() => onFilterToggle('status', status)}
                      className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-sm">{getStatusText(status)}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-3 text-gray-800">עדיפות</h3>
              <div className="space-y-2">
                {['high', 'medium', 'low'].map(urgency => (
                  <label key={urgency} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.urgency.includes(urgency)}
                      onChange={() => onFilterToggle('urgency', urgency)}
                      className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-sm">{urgency}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Sender filter */}
          <div className="mb-6 pb-6 border-b">
            <h3 className="font-semibold mb-3 text-gray-800">שולח</h3>
            <SearchInput
              value={senderSearchQuery}
              onChange={setSenderSearchQuery}
              placeholder="חפש שולח..."
              showSearchIcon={false}
              className="text-sm mb-3 px-3"
            />
            <div className="max-h-32 overflow-y-auto space-y-2 pr-1">
              {filteredSenders.length > 0 ? (
                filteredSenders.map(sender => (
                  <label key={sender} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.sender.includes(sender)}
                      onChange={() => onFilterToggle('sender', sender)}
                      className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-sm">{sender}</span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-gray-500 p-2">אין שולחים</p>
              )}
            </div>
          </div>

          {/* Completed filter */}
          <div className="mb-6 pb-6 border-b">
            <h3 className="font-semibold mb-3 text-gray-800">משימה סגורה</h3>
            <div className="flex gap-2">
              {([
                { value: 'all', label: 'הכל' },
                { value: 'yes', label: 'כן' },
                { value: 'no', label: 'לא' },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => onFiltersChange({ ...filters, completed: opt.value })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    filters.completed === opt.value
                      ? 'bg-emerald-500 text-white border-emerald-600'
                      : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Projects */}
          <div className="mb-6 pb-6 border-b">
            <h3 className="font-semibold mb-3 text-gray-800">פרויקט</h3>
            <div className="flex gap-2 mb-3">
              {([
                { value: 'all', label: 'הכל' },
                { value: 'active', label: 'פעיל' },
                { value: 'inactive', label: 'לא פעיל' },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => onFiltersChange({ ...filters, projectActive: opt.value })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    filters.projectActive === opt.value
                      ? 'bg-blue-500 text-white border-blue-600'
                      : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <SearchInput
              value={projectSearchQuery}
              onChange={setProjectSearchQuery}
              placeholder="חפש פרויקט..."
              showSearchIcon={false}
              className="text-sm mb-3 px-3"
            />
            <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
              {filteredProjects.length > 0 ? (
                filteredProjects.map(project => (
                  <label key={project} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.project.includes(project)}
                      onChange={() => onFilterToggle('project', project)}
                      className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-sm">{project}</span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-gray-500 p-2">לא נמצאו פרויקטים</p>
              )}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <h3 className="font-semibold mb-3 text-gray-800 flex items-center gap-2">
              <Calendar size={18} />
              טווח תאריכים
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">מתאריך</label>
                <DateInput
                  value={filters.dateFrom}
                  onChange={v => onFiltersChange({ ...filters, dateFrom: v })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">עד תאריך</label>
                <DateInput
                  value={filters.dateTo}
                  onChange={v => onFiltersChange({ ...filters, dateTo: v })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer — fixed */}
        <div className="flex-shrink-0 border-t px-6 py-4 flex gap-3 rounded-b-2xl bg-white">
          <button
            onClick={onClearFilters}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            נקה הכל
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-emerald-500 text-white py-2.5 rounded-lg hover:bg-emerald-600 font-medium transition-colors shadow-sm"
          >
            החל
          </button>
        </div>
      </div>
    </div>
  );
}