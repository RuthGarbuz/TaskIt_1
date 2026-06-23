import SearchInput from './SearchInput';

type FilterOption<T extends string | number> = {
  value: T;
  label: string;
};

interface SearchableCheckboxFilterProps<T extends string | number> {
  searchValue: string;
  onSearchChange: (value: string) => void;
  options: FilterOption<T>[];
  selectedValues: T[];
  onToggle: (value: T) => void;
  onClear: () => void;
  searchPlaceholder: string;
  emptyMessage: string;
  clearLabel?: string;
}

export default function SearchableCheckboxFilter<T extends string | number>({
  searchValue,
  onSearchChange,
  options,
  selectedValues,
  onToggle,
  onClear,
  searchPlaceholder,
  emptyMessage,
  clearLabel = 'נקה סינון'
}: SearchableCheckboxFilterProps<T>) {
  const normalizedSearch = searchValue.toLowerCase();
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(normalizedSearch)
  );

  return (
    <div className="space-y-3">
      <SearchInput
        value={searchValue}
        onChange={onSearchChange}
        placeholder={searchPlaceholder}
        iconSize={14}
        className="text-sm focus:ring-emerald-400"
      />

      <div className="max-h-56 overflow-y-auto space-y-1">
        {filteredOptions.map((option) => (
          <label
            key={`${String(option.value)}-${option.label}`}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-700"
          >
            <input
              type="checkbox"
              checked={selectedValues.includes(option.value)}
              onChange={() => onToggle(option.value)}
              className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400"
            />
            <span>{option.label}</span>
          </label>
        ))}

        {filteredOptions.length === 0 && (
          <div className="text-xs text-gray-400 text-center py-3">{emptyMessage}</div>
        )}
      </div>

      <button
        type="button"
        onClick={onClear}
        className="w-full py-2 text-sm font-semibold border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        {clearLabel}
      </button>
    </div>
  );
}
