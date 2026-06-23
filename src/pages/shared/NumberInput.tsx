import { forwardRef, useEffect, useRef, useState, type InputHTMLAttributes } from 'react';
import {
  formatNumberForInput,
  isIncompleteDecimalDraft,
  isValidPartialNumberInput,
  numberInputKeyDown,
  numberInputPaste,
  parseNumberFromInput,
} from './numberInputUtils';

export type NumberInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onChange' | 'inputMode'
> & {
  value: number;
  onChange: (value: number) => void;
  /** When true, only whole numbers (no decimal point). */
  integerOnly?: boolean;
  /** Decimal places for display when value is fractional. */
  decimals?: number;
};

const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput({
  value,
  onChange,
  integerOnly = false,
  decimals = 2,
  onKeyDown,
  onPaste,
  onFocus,
  onBlur,
  disabled,
  readOnly,
  ...rest
}, ref) {
  const [draft, setDraft] = useState<string | null>(null);
  const focusedRef = useRef(false);
  const valueRef = useRef(value);
  const focusValueRef = useRef(value);

  valueRef.current = value;

  const formatValue = (n: number) =>
    integerOnly
      ? String(Math.floor(Number(n) || 0))
      : String(
          Number.isInteger(n)
            ? n
            : formatNumberForInput(n, decimals),
        );

  useEffect(() => {
    if (draft === null || isIncompleteDecimalDraft(draft)) return;
    const committed = formatValue(value);
    if (draft !== '' && parseNumberFromInput(draft) === parseNumberFromInput(committed)) {
      setDraft(null);
    }
  }, [value, draft, integerOnly, decimals]);

  const displayValue = draft !== null ? draft : formatValue(value);

  const parseCommitted = (raw: string): number => {
    if (raw === '' || raw === '.' || raw === '0.') return 0;
    return parseNumberFromInput(raw);
  };

  const commitToParent = (raw: string) => {
    if (!isValidPartialNumberInput(raw, integerOnly) && raw !== '' && raw !== '.' && raw !== '0.') return;
    const next = parseCommitted(raw);
    if (next !== focusValueRef.current) onChange(next);
  };

  const commitDraft = (raw: string) => {
    if (!isValidPartialNumberInput(raw, integerOnly)) return;
    setDraft(raw);
  };

  return (
    <input
      ref={ref}
      type="text"
      inputMode={integerOnly ? 'numeric' : 'decimal'}
      value={displayValue}
      disabled={disabled}
      readOnly={readOnly}
      onChange={(e) => {
        if (readOnly || disabled) return;
        commitDraft(e.target.value);
      }}
      onFocus={(e) => {
        onFocus?.(e);
        if (readOnly || disabled) return;
        focusedRef.current = true;
        focusValueRef.current = valueRef.current;
        setDraft(displayValue);
      }}
      onBlur={(e) => {
        focusedRef.current = false;
        if (!readOnly && !disabled) {
          commitToParent(draft ?? displayValue);
        }
        setDraft(null);
        onBlur?.(e);
        requestAnimationFrame(() => {
          if (!focusedRef.current) setDraft(null);
        });
      }}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (e.defaultPrevented || readOnly || disabled) return;
        if (e.key === 'Enter') {
          e.currentTarget.blur();
          return;
        }
        numberInputKeyDown(e, integerOnly);
      }}
      onPaste={(e) => {
        onPaste?.(e);
        if (e.defaultPrevented || readOnly || disabled) return;
        numberInputPaste(e, integerOnly);
      }}
      {...rest}
    />
  );
});

export default NumberInput;
