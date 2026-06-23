import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

/**
 * Persists UI state in sessionStorage across route unmount/remount (sidebar navigation).
 */
export function usePersistedSessionState<T>(
  storageKey: string,
  defaultValue: T,
  validate?: (value: unknown) => value is T,
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw === null) return defaultValue;
      const parsed: unknown = JSON.parse(raw);
      if (validate && !validate(parsed)) return defaultValue;
      return parsed as T;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // ignore quota / disabled storage
    }
  }, [storageKey, state]);

  return [state, setState];
}

const isOneOf = <T extends string>(values: readonly T[]) =>
  (value: unknown): value is T =>
    typeof value === 'string' && (values as readonly string[]).includes(value);

export const isTaskListViewMode = isOneOf(['list', 'gantt'] as const);
export const isGanttTimeframe = isOneOf(['weekly', 'monthly', 'yearly'] as const);
export const isTasksActiveView = isOneOf(['all', 'status', 'urgency', 'project', 'date'] as const);
export const isBillTasksActiveView = isOneOf(['all', 'status', 'project', 'date'] as const);
export const isHoursReportViewMode = isOneOf(['all', 'date', 'employee', 'project'] as const);
export const isWorkloadViewMode = isOneOf(['weekly', 'monthly'] as const);
export const isGanttStepsViewMode = isOneOf(['month', 'quarter'] as const);
export const isSettingsTab = isOneOf(['general', 'workCapacity', 'templates', 'tables', 'users'] as const);
