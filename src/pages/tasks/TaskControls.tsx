import { useEffect, useRef, useState } from 'react';
import { Search, Filter, BarChart3, List, Printer, RefreshCw, X } from 'lucide-react';
import SearchInput from '../shared/SearchInput';
import { TASK_CONTROLS_PANEL, TASK_CTRL_BTN } from './taskViewTheme';

interface TaskControlsProps {
  viewMode: 'list' | 'gantt';
  setViewMode: (mode: 'list' | 'gantt') => void;
  ganttTimeframe: 'weekly' | 'monthly' | 'yearly';
  setGanttTimeframe: (timeframe: 'weekly' | 'monthly' | 'yearly') => void;
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
  onRefresh?: () => void;
  refreshing?: boolean;
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
  onRefresh,
  refreshing = false,
  showFilterButton = true,
  totalTasks,
  filteredTasksCount,
}: TaskControlsProps) {
  const showCount = filteredTasksCount !== undefined;
  const isFiltered = activeFiltersCount > 0 || (searchQuery && searchQuery.length > 0);
  const [employeeSearch, setEmployeeSearch] = useState(selectedEmployee);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const employeeBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEmployeeSearch(selectedEmployee);
  }, [selectedEmployee]);

  useEffect(() => {
    if (!showEmployeeDropdown) return;
    const onDocClick = (e: MouseEvent) => {
      if (!employeeBoxRef.current?.contains(e.target as Node)) {
        setShowEmployeeDropdown(false);
        setEmployeeSearch(selectedEmployee);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showEmployeeDropdown, selectedEmployee]);

  const filteredEmployees = allEmployees.filter(employee =>
    employee.toLowerCase().includes(employeeSearch.trim().toLowerCase())
  );

  const selectEmployee = (employee: string) => {
    setSelectedEmployee(employee);
    setEmployeeSearch(employee);
    setShowEmployeeDropdown(false);
  };

  const clearEmployee = () => {
    setSelectedEmployee('');
    setEmployeeSearch('');
    setShowEmployeeDropdown(false);
  };

  return (
    <div className={TASK_CONTROLS_PANEL}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2">
         <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'list' ? 'bg-emerald-500 text-white shadow-md' : `${TASK_CTRL_BTN}`
            }`}
          >
             <List size={18} />
            <span>רשימה</span>
          </button>
          {currentView !== 'billTasks' && (
            <button
              onClick={() => setViewMode('gantt')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'gantt' ? 'bg-emerald-500 text-white shadow-md' : `${TASK_CTRL_BTN}`
              }`}
            >
              <BarChart3 size={18} />
              <span>גאנט</span>
            </button>
          )}

          {/* Task count badge — always visible */}
          {showCount && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg dark:bg-gray-900/50 dark:border-gray-600">
              <span className="text-xs text-gray-500 dark:text-gray-400">סה"כ:</span>
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
          <div className="flex gap-2 border-r border-gray-300 dark:border-gray-600 pr-4">
            <button
              onClick={() => setGanttTimeframe('weekly')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                ganttTimeframe === 'weekly' ? 'bg-blue-500 text-white' : TASK_CTRL_BTN
              }`}
            >
              שבועי
            </button>
            <button
              onClick={() => setGanttTimeframe('monthly')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                ganttTimeframe === 'monthly' ? 'bg-blue-500 text-white' : TASK_CTRL_BTN
              }`}
            >
              חודשי
            </button>
            <button
              onClick={() => setGanttTimeframe('yearly')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                ganttTimeframe === 'yearly' ? 'bg-blue-500 text-white' : TASK_CTRL_BTN
              }`}
            >
              רבעוני
            </button>
          </div>
        )}
 {viewMode!= 'gantt' && (
        <div className="flex-1 max-w-md">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="חפש משימות..."
            iconSize={20}
          />
        </div>
 )}

        <div className="flex items-center gap-3">
        {currentView === 'allTasks' && viewMode !== 'gantt' && (
          <div ref={employeeBoxRef} className="relative w-52">
            <div className="relative">
              <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={employeeSearch}
                onChange={e => {
                  setEmployeeSearch(e.target.value);
                  setShowEmployeeDropdown(true);
                  if (!e.target.value.trim()) setSelectedEmployee('');
                }}
                onFocus={() => setShowEmployeeDropdown(true)}
                placeholder="כל העובדים"
                className="w-full pr-9 pl-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder:text-gray-400"
              />
              {(employeeSearch || selectedEmployee) && (
                <button
                  type="button"
                  onClick={clearEmployee}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="נקה בחירה"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {showEmployeeDropdown && (
              <div className="absolute top-full right-0 left-0 mt-1 z-30 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                <button
                  type="button"
                  onClick={clearEmployee}
                  className={`w-full text-right px-3 py-2 text-sm transition-colors border-b border-gray-100 dark:border-gray-700 ${
                    !selectedEmployee ? 'bg-emerald-50 text-emerald-700 font-medium dark:bg-emerald-900/30 dark:text-emerald-300' : 'hover:bg-gray-50 text-gray-700 dark:hover:bg-gray-700 dark:text-gray-200'
                  }`}
                >
                  כל העובדים
                </button>
                {filteredEmployees.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-3">לא נמצאו עובדים</p>
                ) : (
                  filteredEmployees.map(employee => (
                    <button
                      key={employee}
                      type="button"
                      onClick={() => selectEmployee(employee)}
                      className={`w-full text-right px-3 py-2 text-sm transition-colors ${
                        selectedEmployee === employee
                          ? 'bg-emerald-50 text-emerald-700 font-medium dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'hover:bg-gray-50 text-gray-700 dark:hover:bg-gray-700 dark:text-gray-200'
                      }`}
                    >
                      {employee}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          )}

          {viewMode === 'list' && showFilterButton && (
            <button
              onClick={onShowViewModal}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${TASK_CTRL_BTN}`}
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
                  : TASK_CTRL_BTN
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

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${TASK_CTRL_BTN}`}
              title="רענון"
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            </button>
          )}

          {viewMode === 'list' && onOpenReportModal && (
            <button
              onClick={onOpenReportModal}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${TASK_CTRL_BTN}`}
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