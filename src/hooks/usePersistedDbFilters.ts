import { useEffect, useState } from 'react';
import type { DBFilters } from '../Data/tasksData';

/**
 * Persists DB filters across component unmount/remount (e.g. navigating back).
 * We persist per-view via `storageKey`, so `AllTasks` and `MyTasks` don't overwrite each other.
 */
export function usePersistedDbFilters(
  storageKey: string,
  defaultFactory: () => DBFilters
): [DBFilters, (next: DBFilters) => void] {
  const [filters, setFilters] = useState<DBFilters>(() => {
    const base = defaultFactory();

    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return base;

      const parsed: unknown = JSON.parse(raw);
      // Minimal runtime validation; if shape differs, fallback to defaults.
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'dateFrom' in parsed &&
        'dateTo' in parsed &&
        'closedTasks' in parsed &&
        'status' in parsed &&
        'urgency' in parsed &&
        'senders' in parsed &&
        'projects' in parsed
      ) {
        return { ...base, ...(parsed as Partial<DBFilters>) };
      }
    } catch {
      // ignore storage errors and fallback to defaults
    }

    return base;
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(filters));
    } catch {
      // ignore quota / disabled storage
    }
  }, [storageKey, filters]);

  return [filters, setFilters];
}

