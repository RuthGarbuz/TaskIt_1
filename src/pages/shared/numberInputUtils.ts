import type { ChangeEventHandler, ClipboardEvent, KeyboardEvent } from 'react';

/**
 * Decimal input while typing:
 * - Allowed: empty, 0, 0., 0.8, 10, 1.5
 * - Blocked: 08, 098, 01 (digit after 0 without a dot first)
 */
const DECIMAL_PARTIAL_RE = /^(0(\.\d*)?|[1-9]\d*\.?\d*)$/;

/** True when the user is mid-typing a decimal (e.g. "0." or "12.") — do not sync to parent yet. */
export function isIncompleteDecimalDraft(raw: string): boolean {
  return raw.endsWith('.');
}

/** Integer-only partial input (no decimal point). */
const INTEGER_PARTIAL_RE = /^(0|[1-9]\d*)$/;

export function isValidPartialNumberInput(raw: string, integerOnly = false): boolean {
  if (raw === '') return true;
  return (integerOnly ? INTEGER_PARTIAL_RE : DECIMAL_PARTIAL_RE).test(raw);
}

export function parseNumberFromInput(raw: string): number {
  if (raw === '' || raw === '.' || raw === '0.') return 0;
  return Number(raw);
}

export function formatNumberForInput(value: number, decimals = 2): number {
  const n = Number(value) || 0;
  return Number.isInteger(n) ? n : parseFloat(n.toFixed(decimals));
}

export function tryNumberInputChange(
  raw: string,
  onNumber: (n: number) => void,
  integerOnly = false,
): boolean {
  if (!isValidPartialNumberInput(raw, integerOnly)) return false;
  onNumber(parseNumberFromInput(raw));
  return true;
}

const NAV_KEYS = new Set([
  'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End',
]);

export function numberInputKeyDown(
  e: KeyboardEvent<HTMLInputElement>,
  integerOnly = false,
): void {
  if (NAV_KEYS.has(e.key) || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key.length !== 1) return;

  const input = e.currentTarget;
  const start = input.selectionStart ?? 0;
  const end = input.selectionEnd ?? 0;
  const next = input.value.slice(0, start) + e.key + input.value.slice(end);
  if (!isValidPartialNumberInput(next, integerOnly)) {
    e.preventDefault();
  }
}

export function numberInputPaste(
  e: ClipboardEvent<HTMLInputElement>,
  integerOnly = false,
): void {
  const pasted = e.clipboardData.getData('text');
  const input = e.currentTarget;
  const start = input.selectionStart ?? 0;
  const end = input.selectionEnd ?? 0;
  const next = input.value.slice(0, start) + pasted + input.value.slice(end);
  if (!isValidPartialNumberInput(next, integerOnly)) {
    e.preventDefault();
  }
}

/** Wraps a numeric onChange for plain `<input type="number" />` usage. */
export function guardedNumberChange(
  onNumber: (n: number) => void,
  integerOnly = false,
): ChangeEventHandler<HTMLInputElement> {
  return (e) => {
    tryNumberInputChange(e.target.value, onNumber, integerOnly);
  };
}
