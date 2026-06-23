import { Filter, LayoutGrid, Plus, List, RefreshCw, Printer } from 'lucide-react';
import { TASK_CONTROLS_PANEL, TASK_CTRL_BTN } from '../tasks/taskViewTheme';
import SearchInput from '../shared/SearchInput';

interface HoursReportHeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeFiltersCount: number;
  onShowViewModal: () => void;
  onShowFilterModal: () => void;
  onShowReportModal: () => void;
  onRefresh: () => void;
  onShowNewSelector: () => void;
  totalHours: number;
  filteredReportsCount: number;
  totalReportsCount?: number;
}

export default function HoursReportHeader({
  searchQuery,
  onSearchChange,
  activeFiltersCount,
  onShowViewModal,
  onShowFilterModal,
  onShowReportModal,
  onRefresh,
  onShowNewSelector,
  totalHours,
  filteredReportsCount,
  totalReportsCount,
}: HoursReportHeaderProps) {
  const showCount = filteredReportsCount !== undefined;
  const isFiltered = activeFiltersCount > 0 || (searchQuery && searchQuery.length > 0);

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}:${m.toString().padStart(2, '0')}` : `${h}`;
  };

  return (
    <div className={TASK_CONTROLS_PANEL}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Right side: רשימה, סה"כ שעות, סה"כ דיווחים */}
        <div className="flex gap-2 items-center">
          {/* <button
            disabled
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-gray-700 bg-gray-100 border border-gray-300"
          >
            <span>רשימה</span>
          </button> */}
<button
          disabled
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors 
              bg-emerald-500 text-white shadow-md 
            `}
          >
            <List size={18} />
            <span>רשימה</span>
          </button>
          {/* Total Hours Badge */}
          {showCount && (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-lg">
              <span className="text-xs text-teal-600 dark:text-teal-300 font-semibold">סה"כ שעות:</span>
              <span className="inline-flex items-center justify-center px-2 py-0.5 bg-teal-500 text-white rounded-full text-xs font-bold min-w-[32px]">
                {formatHours(totalHours)}
              </span>
            </div>
          )}

          {/* Total Reports Badge */}
          {showCount && (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg">
              <span className="text-xs text-blue-600 dark:text-blue-300 font-semibold">סה"כ דיווחים:</span>
              <span className="inline-flex items-center justify-center px-2 py-0.5 bg-blue-500 text-white rounded-full text-xs font-bold min-w-[32px]">
                {filteredReportsCount}
              </span>
              {isFiltered && totalReportsCount !== undefined && filteredReportsCount !== totalReportsCount && (
                <span className="text-xs text-gray-400 dark:text-gray-500">מתוך {totalReportsCount}</span>
              )}
            </div>
          )}
        </div>

        {/* Middle: Search */}
        <div className="flex-1 max-w-md">
          <SearchInput
            value={searchQuery}
            onChange={onSearchChange}
            placeholder="חפש דיווחים..."
            iconSize={20}
          />
        </div>

        {/* Left side: תצוגה, סינון, דיווח חדש */}
        <div className="flex items-center gap-3">
          <button
            onClick={onShowViewModal}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${TASK_CTRL_BTN}`}
          >
            <LayoutGrid size={18} />
            <span className="font-medium">תצוגה</span>
          </button>

          <button
            onClick={onShowFilterModal}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors border ${
              activeFiltersCount > 0
                ? 'bg-emerald-500 text-white border-emerald-600'
                : `${TASK_CTRL_BTN}`
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

          <button
            onClick={onRefresh}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${TASK_CTRL_BTN}`}
          >
            <RefreshCw size={20} />
          </button>
          <button
              onClick={onShowReportModal}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${TASK_CTRL_BTN}`}
              title="הדפסה"
            >
              <Printer size={18} />
            </button>
            {/* <button
              onClick={onShowReportModal}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg transition-colors border border-gray-300"
            >
              <FileText size={18} />
              <span className="font-medium">דוח</span>
            </button> */}

          <button
            onClick={onShowNewSelector}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg font-semibold text-sm hover:bg-emerald-600 transition-all shadow-sm border border-emerald-600"
          >
            <Plus size={16} />
            <span>דיווח חדש</span>
          </button>
        </div>
      </div>
    </div>
  );
}
