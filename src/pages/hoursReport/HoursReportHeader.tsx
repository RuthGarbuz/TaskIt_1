import { Search, Filter, LayoutGrid, Plus, List, RefreshCw, FileText, Printer } from 'lucide-react';

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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
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
            <div className="flex items-center gap-1.5 px-3 py-2 bg-teal-50 border border-teal-200 rounded-lg">
              <span className="text-xs text-teal-600 font-semibold">סה"כ שעות:</span>
              <span className="inline-flex items-center justify-center px-2 py-0.5 bg-teal-500 text-white rounded-full text-xs font-bold min-w-[32px]">
                {formatHours(totalHours)}
              </span>
            </div>
          )}

          {/* Total Reports Badge */}
          {showCount && (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-xs text-blue-600 font-semibold">סה"כ דיווחים:</span>
              <span className="inline-flex items-center justify-center px-2 py-0.5 bg-blue-500 text-white rounded-full text-xs font-bold min-w-[32px]">
                {filteredReportsCount}
              </span>
              {isFiltered && totalReportsCount !== undefined && filteredReportsCount !== totalReportsCount && (
                <span className="text-xs text-gray-400">מתוך {totalReportsCount}</span>
              )}
            </div>
          )}
        </div>

        {/* Middle: Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="חפש דיווחים..."
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Left side: תצוגה, סינון, דיווח חדש */}
        <div className="flex items-center gap-3">
          <button
            onClick={onShowViewModal}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors border border-gray-300"
          >
            <LayoutGrid size={18} />
            <span className="font-medium">תצוגה</span>
          </button>

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

          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors border border-gray-300"
          >
            <RefreshCw size={20} />
          </button>
          <button
              onClick={onShowReportModal}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors border border-gray-300"
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
