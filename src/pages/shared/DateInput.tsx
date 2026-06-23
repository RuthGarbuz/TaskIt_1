import {
  forwardRef,
  useRef,
  useState,
  useEffect,
  useCallback,
  type FocusEvent,
  type KeyboardEvent,
  type InputHTMLAttributes,
} from 'react';

export const DATE_SEGMENT_COUNT = 3;

const calendarPickerClass =
  '[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100 dark:[&::-webkit-calendar-picker-indicator]:invert';

export type DateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> & {
  value: string;
  onChange: (value: string) => void;
};

function useDateSegmentTab() {
  const segmentTabCountRef = useRef(0);

  const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
    const related = e.relatedTarget;
    if (related instanceof HTMLElement) {
      const position = related.compareDocumentPosition(e.currentTarget);
      segmentTabCountRef.current =
        position & Node.DOCUMENT_POSITION_FOLLOWING ? DATE_SEGMENT_COUNT - 1 : 0;
    } else {
      segmentTabCountRef.current = 0;
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, userHandler?: (e: KeyboardEvent<HTMLInputElement>) => void) => {
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (segmentTabCountRef.current > 0) {
          segmentTabCountRef.current -= 1;
          return;
        }
        segmentTabCountRef.current = 0;
      } else if (segmentTabCountRef.current < DATE_SEGMENT_COUNT - 1) {
        segmentTabCountRef.current += 1;
        return;
      } else {
        segmentTabCountRef.current = 0;
      }
    }
    userHandler?.(e);
  };

  return { handleFocus, handleKeyDown };
}

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(function DateInput(
  { value, onChange, className = '', onFocus, onBlur, onKeyDown, ...rest },
  ref,
) {
  const { handleFocus, handleKeyDown } = useDateSegmentTab();
  const innerRef = useRef<HTMLInputElement | null>(null);
  const focusedRef = useRef(false);
  const valueRef = useRef(value);
  const focusValueRef = useRef(value);
  const [draft, setDraft] = useState(value);

  valueRef.current = value;

  useEffect(() => {
    if (!focusedRef.current) setDraft(value);
  }, [value]);

  const commit = useCallback(
    (next: string) => {
      if (next !== valueRef.current) onChange(next);
    },
    [onChange],
  );

  const setRef = (el: HTMLInputElement | null) => {
    innerRef.current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) ref.current = el;
  };

  return (
    <input
      ref={setRef}
      type="date"
      value={draft}
      onInput={e => setDraft(e.currentTarget.value)}
      onFocus={e => {
        focusedRef.current = true;
        focusValueRef.current = valueRef.current;
        handleFocus(e);
        onFocus?.(e);
      }}
      onBlur={e => {
        focusedRef.current = false;
        const next = e.currentTarget.value;
        if (next !== focusValueRef.current) {
          commit(next);
        }
        onBlur?.(e);
        requestAnimationFrame(() => {
          if (!focusedRef.current) setDraft(valueRef.current);
        });
      }}
      onKeyDown={e => handleKeyDown(e, onKeyDown)}
      className={`${calendarPickerClass} ${className}`.trim()}
      {...rest}
    />
  );
});

export function CompactDateInput({
  value,
  onChange,
  ringColor = 'focus-within:ring-blue-300',
  className = '',
  min,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  ringColor?: string;
  className?: string;
  min?: string;
  disabled?: boolean;
}) {
  return (
    <div
      className={`relative flex items-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 overflow-hidden focus-within:ring-2 ${ringColor} ${className} ${disabled ? 'opacity-60' : ''}`}
    >
      <DateInput
        value={value}
        onChange={onChange}
        min={min}
        disabled={disabled}
        className="flex-1 min-w-0 px-1.5 py-1.5 text-xs border-0 focus:ring-0 rounded-none bg-transparent text-gray-800 dark:text-white dark:[color-scheme:dark]"
      />
    </div>
  );
}
