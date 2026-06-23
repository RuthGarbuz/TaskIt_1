import type { StatusType } from './types';

export const DEFAULT_STATUSES: StatusType[] = ['הושלם', 'פעיל', 'עתידי'];

export const STATUS_COLOR: Record<string, string> = {
  הושלם: '#639922',
  פעיל:  '#3266ad',
  עתידי: '#888780',
};

export const STATUS_BG: Record<string, string> = {
  הושלם: '#EAF3DE',
  פעיל:  '#E6F1FB',
  עתידי: '#F1EFE8',
};

export const STATUS_TEXT: Record<string, string> = {
  הושלם: '#3B6D11',
  פעיל:  '#185FA5',
  עתידי: '#5F5E5A',
};

export const COL_WIDTHS: Record<'month' | 'quarter', number> = {
  month: 58,
  quarter: 100,
};

export function getRangeStart(allStarts: Date[]): Date {
  const min = new Date(Math.min(...allStarts.map(d => d.getTime())));
  return new Date(min.getFullYear(), min.getMonth(), 1);
}

export function getRangeEnd(allEnds: Date[]): Date {
  const max = new Date(Math.max(...allEnds.map(d => d.getTime())));
  return new Date(max.getFullYear(), max.getMonth() + 1, 1);
}

export function getMonths(rangeStart: Date, rangeEnd: Date): Date[] {
  const months: Date[] = [];
  const cur = new Date(rangeStart);
  while (cur < rangeEnd) { months.push(new Date(cur)); cur.setMonth(cur.getMonth() + 1); }
  return months;
}

export function getQuarters(rangeStart: Date, rangeEnd: Date): Date[] {
  const quarters: Date[] = [];
  const cur = new Date(rangeStart.getFullYear(), Math.floor(rangeStart.getMonth() / 3) * 3, 1);
  while (cur < rangeEnd) { quarters.push(new Date(cur)); cur.setMonth(cur.getMonth() + 3); }
  return quarters;
}

export function datePct(dateStr: string, rangeStart: Date, totalMs: number): number {
  return Math.max(0, Math.min(100, ((new Date(dateStr).getTime() - rangeStart.getTime()) / totalMs) * 100));
}

export function todayPct(rangeStart: Date, totalMs: number): number {
  return Math.max(0, Math.min(100, ((new Date().getTime() - rangeStart.getTime()) / totalMs) * 100));
}

export function isTodayInRange(rangeStart: Date, rangeEnd: Date): boolean {
  const today = new Date();
  return today >= rangeStart && today <= rangeEnd;
}

export function formatShortDate(iso: string): string {
  return iso.slice(5).replace('-', '/');
}