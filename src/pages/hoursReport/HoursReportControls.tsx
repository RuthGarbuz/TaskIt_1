import { Search, Filter, LayoutGrid } from 'lucide-react';

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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex items-center gap-4 flex-wrap">

        {/* Search - takes most space */}
        <div className="flex-1 min-w-[220px]">
          <div className="relative">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="חיפוש לפי משימה, שלב, פרויקט, עובד..."
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        {/* View button */}
        <button
          onClick={onShowViewModal}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors border border-gray-300 font-medium text-sm"
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
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'
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