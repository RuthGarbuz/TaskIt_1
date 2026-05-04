import { useEffect, useState } from 'react';
import type { HoursDBFilters } from '../pages/hoursReport/HoursReportDbFilter';

function normalizeProjectIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const ids: number[] = [];
  for (const x of value) {
    if (typeof x === 'number' && Number.isFinite(x)) ids.push(x);
    else if (typeof x === 'string' && x.trim() !== '') {
      const n = Number(x);
      if (Number.isFinite(n)) ids.push(n);
    }
  }
  return ids;
}

function normalizeEmployeeNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const names = new Set<string>();
  for (const x of value) {
    if (typeof x === 'string') {
      const trimmed = x.trim();
      if (trimmed) names.add(trimmed);
    }
  }
  return [...names];
}

/**
 * Persists hours-report DB filters (date range + server-side project pick list intent)
 * across component unmount/remount, same idea as usePersistedDbFilters for tasks.
 */
export function usePersistedHoursDbFilters(
  storageKey: string,
  defaultFactory: () => HoursDBFilters
): [HoursDBFilters, (next: HoursDBFilters) => void] {
  const [filters, setFilters] = useState<HoursDBFilters>(() => {
    const base = defaultFactory();

    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return base;

      const parsed: unknown = JSON.parse(raw);
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'dateFrom' in parsed &&
        'dateTo' in parsed &&
        'projects' in parsed
      ) {
        const partial = parsed as Partial<HoursDBFilters>;
        return {
          ...base,
          ...partial,
          projects: normalizeProjectIds(partial.projects),
          employees: normalizeEmployeeNames(partial.employees),
        };
      }
    } catch {
      // ignore
    }

    return base;
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(filters));
    } catch {
      // ignore
    }
  }, [storageKey, filters]);

  return [filters, setFilters];
}
