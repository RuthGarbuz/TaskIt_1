import { useEffect, useState } from 'react';
import type { GanttFilters } from '../pages/gantt/types';

const isClosedTasks = (v: unknown): v is GanttFilters['closedTasks'] =>
  v === 'all' || v === 'yes' || v === 'no';

/**
 * Persists Gantt filter modal state across unmount/remount (e.g. navigating away from Gantt),
 * same pattern as {@link usePersistedDbFilters} for AllTasks.
 */
export function usePersistedGanttFilters(
  storageKey: string,
  defaultFactory: () => GanttFilters
): [GanttFilters, (next: GanttFilters) => void] {
  const [filters, setFilters] = useState<GanttFilters>(() => {
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
        'closedTasks' in parsed &&
        ('stepStatusId' in parsed || 'projectStatusId' in parsed || 'statusId' in parsed) &&
        'urgency' in parsed &&
        'teamLeadId' in parsed &&
        'studioDepartmentId' in parsed &&
        'projects' in parsed
      ) {
        const p = parsed as Partial<GanttFilters>;
        const urgency = Array.isArray(p.urgency)
          ? p.urgency.map(x => Number(x)).filter(n => Number.isFinite(n))
          : [];
        const projects = Array.isArray(p.projects)
          ? p.projects.map(x => Number(x)).filter(n => Number.isFinite(n) && n > 0)
          : [];
        const parseOptionalId = (v: unknown): number | null =>
          v == null || v === ''
            ? null
            : Number.isFinite(Number(v))
              ? Number(v)
              : null;
        const legacyStatusId = parseOptionalId((p as { statusId?: unknown }).statusId);
        const stepStatusId = parseOptionalId(p.stepStatusId) ?? legacyStatusId;
        const projectStatusId = parseOptionalId(p.projectStatusId);
        const teamLeadId =
          p.teamLeadId == null || p.teamLeadId === 0
            ? null
            : Number.isFinite(Number(p.teamLeadId))
              ? Number(p.teamLeadId)
              : null;
        const studioDepartmentId =
          p.studioDepartmentId == null || p.studioDepartmentId === 0
            ? null
            : Number.isFinite(Number(p.studioDepartmentId))
              ? Number(p.studioDepartmentId)
              : null;
        const closedTasks = isClosedTasks(p.closedTasks) ? p.closedTasks : base.closedTasks;

        return {
          ...base,
          ...p,
          dateFrom: typeof p.dateFrom === 'string' ? p.dateFrom : base.dateFrom,
          dateTo: typeof p.dateTo === 'string' ? p.dateTo : base.dateTo,
          closedTasks,
          stepStatusId,
          projectStatusId,
          urgency,
          teamLeadId,
          studioDepartmentId,
          projects,
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
      // ignore quota / disabled storage
    }
  }, [storageKey, filters]);

  return [filters, setFilters];
}
