import { DateInput } from './DateInput';

interface DateFilterProps {
  fromDate: string;
  toDate: string;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  onClear: () => void;
  fromLabel?: string;
  toLabel?: string;
  todayLabel?: string;
  clearLabel?: string;
}

export default function DateFilter({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  onClear,
  fromLabel = 'מתאריך',
  toLabel = 'עד תאריך',
  todayLabel = 'היום',
  clearLabel = 'נקה סינון'
}: DateFilterProps) {
  const todayDate = new Date().toISOString().split('T')[0];
  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400';

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">{fromLabel}</label>
        <DateInput
          value={fromDate}
          onChange={onFromDateChange}
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">{toLabel}</label>
        <DateInput
          value={toDate}
          onChange={onToDateChange}
          className={inputClass}
        />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            onFromDateChange(todayDate);
            onToDateChange(todayDate);
          }}
          className="flex-1 py-2 text-sm font-semibold border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-50"
        >
          {todayLabel}
        </button>

        <button
          type="button"
          onClick={onClear}
          className="flex-1 py-2 text-sm font-semibold border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          {clearLabel}
        </button>
      </div>
    </div>
  );
}
