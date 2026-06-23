import { TASK_CONTROLS_PANEL, TASK_CTRL_BTN } from '../tasks/taskViewTheme';
import { Filter, LayoutGrid } from 'lucide-react';
import SearchInput from '../shared/SearchInput';

//type ViewMode = 'date' | 'employee' | 'project';

interface HoursReportControlsProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeFiltersCount: number;
  onShowViewModal: () => void;
  onShowFilterModal: () => void;
}

export default function HoursReportControls({
  searchQuery,
  onSearchChange,
  activeFiltersCount,
  onShowViewModal,
  onShowFilterModal,
}: HoursReportControlsProps) {
  return (
    <div className={TASK_CONTROLS_PANEL}>
      <div className="flex items-center gap-4 flex-wrap">

        {/* Search - takes most space */}
        <div className="flex-1 min-w-[220px]">
          <SearchInput
            value={searchQuery}
            onChange={onSearchChange}
            placeholder="חיפוש לפי משימה, שלב, פרויקט, עובד..."
            iconSize={18}
            className="text-sm focus:ring-teal-500"
          />
        </div>

        {/* View button */}
        <button
          onClick={onShowViewModal}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium text-sm ${TASK_CTRL_BTN}`}
        >
          <LayoutGrid size={17} />
          <span>תצוגה</span>
        </button>

        {/* Filter button */}
        <button
          onClick={onShowFilterModal}
          className={`relative flex items-center gap-2 px-4 py-2 rounded-lg transition-colors border font-medium text-sm ${
            activeFiltersCount > 0
              ? 'bg-teal-500 text-white border-teal-600'
              : `${TASK_CTRL_BTN}`
          }`}
        >
          <Filter size={17} />
          <span>סינון</span>
          {activeFiltersCount > 0 && (
            <span className="bg-white text-teal-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
              {activeFiltersCount}
            </span>
          )}
        </button>

      </div>
    </div>
  );
}