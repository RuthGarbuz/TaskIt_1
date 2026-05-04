import { Search, Filter, BarChart3, List, Printer } from 'lucide-react';

interface TaskControlsProps {
  viewMode: 'list' | 'gantt';
  setViewMode: (mode: 'list' | 'gantt') => void;
  ganttTimeframe: 'weekly' | 'monthly';
  setGanttTimeframe: (timeframe: 'weekly' | 'monthly') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedEmployee: string;
  setSelectedEmployee: (employee: string) => void;
  allEmployees: string[];
  currentView: 'allTasks' | 'myTasks' | 'billTasks';
  activeFiltersCount: number;
  onShowViewModal: () => void;
  onShowFilterModal: () => void;
  onOpenReportModal?: () => void;
  /**
   * When viewing a single project, we hide the "סינון" button.
   */
  showFilterButton?: boolean;
  totalTasks?: number;
  filteredTasksCount?: number;
}

export default function TaskControls({
  viewMode,
  setViewMode,
  ganttTimeframe,
  setGanttTimeframe,
  searchQuery,
  setSearchQuery,
  selectedEmployee,
  setSelectedEmployee,
  allEmployees,
  currentView,
  activeFiltersCount,
  onShowViewModal,
  onShowFilterModal,
  onOpenReportModal,
  showFilterButton = true,
  totalTasks,
  filteredTasksCount,
}: TaskControlsProps) {
  const showCount = filteredTasksCount !== undefined;
  const isFiltered = activeFiltersCount > 0 || (searchQuery && searchQuery.length > 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2">
         <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'list' ? 'bg-emerald-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
             <List size={18} />
            <span>רשימה</span>
          </button>
          {currentView !== 'billTasks' && (
            <button
              onClick={() => setViewMode('gantt')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'gantt' ? 'bg-emerald-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <BarChart3 size={18} />
              <span>גאנט</span>
            </button>
          )}

          {/* Task count badge — always visible */}
          {showCount && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="text-xs text-gray-500">סה"כ:</span>
              <span className="inline-flex items-center justify-center px-2 py-0.5 bg-emerald-500 text-white rounded-full text-xs font-bold min-w-[22px]">
                {filteredTasksCount}
              </span>
              {isFiltered && totalTasks !== undefined && filteredTasksCount !== totalTasks && (
                <span className="text-xs text-gray-400">מתוך {totalTasks}</span>
              )}
            </div>
          )}
        </div>

        {/* Gantt Timeframe Selection */}
        {viewMode === 'gantt' && currentView !== 'billTasks' && (
          <div className="flex gap-2 border-r border-gray-300 pr-4">
            <button
              onClick={() => setGanttTimeframe('weekly')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                ganttTimeframe === 'weekly' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              שבועי
            </button>
            <button
              onClick={() => setGanttTimeframe('monthly')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                ganttTimeframe === 'monthly' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              חודשי
            </button>
          </div>
        )}

        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חפש משימות..."
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
        {currentView === 'allTasks' && viewMode !== 'gantt' && (
          <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
            >
              <option value="">כל העובדים</option>
              {allEmployees.map(employee => (
                <option key={employee} value={employee}>{employee}</option>
              ))}
            </select>
          )}

          {viewMode === 'list' && showFilterButton && (
            <button
              onClick={onShowViewModal}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors border border-gray-300"
            >
              <BarChart3 size={18} />
              <span className="font-medium">תצוגה</span>
            </button>
          )}

          {showFilterButton && (
            <button
              onClick={onShowFilterModal}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors border ${
                activeFiltersCount > 0
                  ? 'bg-emerald-500 text-white border-emerald-600'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'
              }`}
            >
              <Filter size={18} />
              <span className="font-medium">סינון</span>
              {activeFiltersCount > 0 && (
                <span className="bg-white text-emerald-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          )}

          {viewMode === 'list' && onOpenReportModal && (
            <button
              onClick={onOpenReportModal}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors border border-gray-300"
              title="הדפסה"
            >
              <Printer size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}