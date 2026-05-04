import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

type AutoCompleteProps<T> = {
  items: T[];
  selectedItem: T | null;
  onSelect: (item: T) => void;
  getItemId: (item: T) => number | string;
  getItemLabel: (item: T) => string;
  placeholder?: string;
  disabled?: boolean;
};

function AutoComplete<T>({
  items,
  selectedItem,
  onSelect,
  getItemId,
  getItemLabel,
  placeholder = 'בחר...',
  disabled = false,
}: AutoCompleteProps<T>) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [searchText, setSearchText] = useState(selectedItem ? getItemLabel(selectedItem) : '');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (selectedItem) {
      setSearchText(getItemLabel(selectedItem));
    } else {
      setSearchText('');
    }
  }, [selectedItem, getItemLabel]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const filteredItems = useMemo(
    () => items.filter((item) => getItemLabel(item).toLowerCase().includes(searchText.toLowerCase())),
    [items, getItemLabel, searchText],
  );

  const handleSelect = (item: T) => {
    setSearchText(getItemLabel(item));
    setIsOpen(false);
    onSelect(item);
  };

  const handleToggle = () => {
    if (disabled) return;
    setSearchText("");

    setIsOpen((prev) => !prev);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        disabled={disabled}
        type="text"
        value={searchText}
        onFocus={() => !disabled && setIsOpen(true)}
        onChange={(e) => {
          setSearchText(e.target.value);
          setIsOpen(true);
        }}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all ${
          disabled ? 'bg-gray-50 cursor-not-allowed opacity-70' : ''
        }`}
      />
      <button
        disabled={disabled}
        type="button"
        onClick={handleToggle}
        className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 hover:text-emerald-600"
      >
        <ChevronDown size={18} />
      </button>

      {isOpen && filteredItems.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filteredItems.map((item) => (
            <li
              key={getItemId(item)}
              onClick={() => handleSelect(item)}
              className="px-3 py-2 cursor-pointer text-sm hover:bg-emerald-500 hover:text-white"
            >
              {getItemLabel(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default AutoComplete;
