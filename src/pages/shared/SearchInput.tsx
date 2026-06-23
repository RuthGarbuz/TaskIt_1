import { Search, X } from 'lucide-react';
import type { InputHTMLAttributes } from 'react';

export type SearchInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onChange'
> & {
  value: string;
  onChange: (value: string) => void;
  /** Search icon size in px. Default 16 */
  iconSize?: number;
  /** When false, only the clear button is shown (if text exists). Default true */
  showSearchIcon?: boolean;
  /** `right` = Hebrew default (icon right, clear left). `left` = e.g. dark sidebar. */
  iconPosition?: 'left' | 'right';
  clearTitle?: string;
  wrapperClassName?: string;
};

export default function SearchInput({
  value,
  onChange,
  className = '',
  wrapperClassName = '',
  iconSize = 16,
  showSearchIcon = true,
  iconPosition = 'right',
  clearTitle = 'נקה חיפוש',
  disabled,
  ...rest
}: SearchInputProps) {
  const hasText = value.length > 0;
  const iconOnRight = iconPosition === 'right';
  const clearOnLeft = iconOnRight;

  const padStart = iconOnRight
    ? showSearchIcon
      ? 'pr-10'
      : 'pr-4'
    : showSearchIcon
      ? 'pl-9'
      : 'pl-4';
  const padEnd = hasText
    ? clearOnLeft
      ? 'pl-8'
      : 'pr-8'
    : clearOnLeft
      ? 'pl-4'
      : 'pr-4';

  return (
    <div className={`relative ${wrapperClassName}`.trim()}>
      {showSearchIcon && (
        <Search
          size={iconSize}
          className={`absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none ${
            iconOnRight ? 'right-3' : 'left-3'
          }`}
        />
      )}
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full ${padStart} ${padEnd} py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder:text-gray-400 ${className}`.trim()}
        {...rest}
      />
      {hasText && !disabled && (
        <button
          type="button"
          onClick={() => onChange('')}
          className={`absolute top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 ${
            clearOnLeft ? 'left-2' : 'right-2'
          }`}
          title={clearTitle}
          tabIndex={-1}
        >
          <X size={Math.max(12, iconSize - 2)} />
        </button>
      )}
    </div>
  );
}
