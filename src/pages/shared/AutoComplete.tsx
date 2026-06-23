import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

type AutoCompleteProps<T> = {
  items: T[];
  selectedItem: T | null;
  onSelect: (item: T | null) => void;
  getItemId: (item: T) => number | string;
  getItemLabel: (item: T) => string;
  placeholder?: string;
  disabled?: boolean;
};

type ListRect = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const getItemIdRef = useRef(getItemId);
  const getItemLabelRef = useRef(getItemLabel);
  const focusedRef = useRef(false);
  const lastSelectedIdRef = useRef<number | string | null>(null);

  getItemIdRef.current = getItemId;
  getItemLabelRef.current = getItemLabel;

  const [filterText, setFilterText] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [listRect, setListRect] = useState<ListRect | null>(null);

  useEffect(() => {
    const nextId = selectedItem ? getItemIdRef.current(selectedItem) : null;
    if (nextId === lastSelectedIdRef.current) return;
    lastSelectedIdRef.current = nextId;
    if (focusedRef.current) return;
    setFilterText(selectedItem ? getItemLabelRef.current(selectedItem) : '');
  }, [selectedItem]);

  const measureListRect = (): ListRect | null => {
    const el = inputRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const viewportPad = 8;
    const spaceBelow = window.innerHeight - rect.bottom - viewportPad;
    const spaceAbove = rect.top - viewportPad;
    const openBelow = spaceBelow >= 100 || spaceBelow >= spaceAbove;

    if (openBelow) {
      return {
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        maxHeight: Math.min(280, Math.max(120, spaceBelow - 4)),
      };
    }

    const maxHeight = Math.min(280, Math.max(120, spaceAbove - 4));
    return {
      top: Math.max(viewportPad, rect.top - maxHeight - 4),
      left: rect.left,
      width: rect.width,
      maxHeight,
    };
  };

  const syncListRect = () => {
    const next = measureListRect();
    if (next) setListRect(next);
  };

  useLayoutEffect(() => {
    if (!isOpen) {
      setListRect(null);
      return;
    }

    syncListRect();
    let rafId = 0;
    const onScrollOrResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(syncListRect);
    };

    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [isOpen, filterText, items.length]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (wrapperRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setIsOpen(false);
      focusedRef.current = false;
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const filteredItems = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return items;
    return items.filter(item => {
      const label = getItemLabelRef.current(item) ?? '';
      return label.toLowerCase().includes(q);
    });
  }, [items, filterText]);

  const clearInput = () => {
    setFilterText('');
    lastSelectedIdRef.current = null;
    onSelect(null);
  };

  const handleSelect = (item: T) => {
    const label = getItemLabelRef.current(item);
    setFilterText(label);
    setIsOpen(false);
    focusedRef.current = false;
    lastSelectedIdRef.current = getItemIdRef.current(item);
    onSelect(item);
  };

  const openList = () => {
    if (disabled) return;
    setIsOpen(true);
    requestAnimationFrame(syncListRect);
    inputRef.current?.focus();
  };

  const handleChevronClick = () => {
    if (disabled) return;

    if (filterText.trim()) {
      clearInput();
      setIsOpen(true);
      requestAnimationFrame(syncListRect);
      inputRef.current?.focus();
      return;
    }

    if (isOpen) {
      setIsOpen(false);
      focusedRef.current = false;
      return;
    }

    openList();
  };

  const dropdown = isOpen && listRect ? (
    <ul
      ref={listRef}
      className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg overscroll-contain"
      style={{
        position: 'fixed',
        top: listRect.top,
        left: listRect.left,
        width: listRect.width,
        maxHeight: listRect.maxHeight,
        overflowY: 'auto',
        zIndex: 10050,
      }}
      onWheel={e => e.stopPropagation()}
    >
      {filteredItems.length > 0 ? (
        filteredItems.map(item => (
          <li
            key={getItemIdRef.current(item)}
            onMouseDown={e => e.preventDefault()}
            onClick={() => handleSelect(item)}
            className="px-3 py-2 cursor-pointer text-sm text-gray-800 dark:text-gray-100 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white"
          >
            {getItemLabelRef.current(item)}
          </li>
        ))
      ) : (
        <li className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">לא נמצאו פריטים</li>
      )}
    </ul>
  ) : null;

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        ref={inputRef}
        disabled={disabled}
        type="text"
        value={filterText}
        onFocus={() => {
          if (disabled) return;
          focusedRef.current = true;
          setIsOpen(true);
          requestAnimationFrame(syncListRect);
        }}
        onBlur={() => {
          focusedRef.current = false;
        }}
        onChange={e => {
          setFilterText(e.target.value);
          setIsOpen(true);
          if (selectedItem) {
            lastSelectedIdRef.current = null;
            onSelect(null);
          }
          requestAnimationFrame(syncListRect);
        }}
        placeholder={placeholder}
        className={`w-full pl-9 pr-3 py-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all ${
          disabled ? 'bg-gray-50 dark:bg-gray-800 cursor-not-allowed opacity-70' : ''
        }`}
      />
      <button
        disabled={disabled}
        type="button"
        onMouseDown={e => e.preventDefault()}
        onClick={handleChevronClick}
        title={filterText.trim() ? 'נקה' : isOpen ? 'סגור' : 'פתח רשימה'}
        className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400"
      >
        <ChevronDown size={18} className={isOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>
      {dropdown && createPortal(dropdown, document.body)}
    </div>
  );
}

export default AutoComplete;
