import { useState, useEffect, useCallback } from 'react';
import type { MonthlyEmployee, MonthlyWorkloadRequest, MonthlyWorkloadRow, WeeklyEmployee, WeeklyWorkloadRequest, WeeklyWorkloadRow } from './Workload.types';


// ─── helpers ──────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

/** Return the Sunday of the week that contains `date` */
function getSundayOf(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return toDateStr(d);
}

/** Build the 5 week-days (Sun–Thu) starting from a Sunday string */
function buildWeekDates(sundayStr: string): string[] {
  const base = new Date(sundayStr);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return toDateStr(d);
  });
}

// ─── transform raw rows → component-friendly shapes ───────────────────────────

function transformWeekly(rows: WeeklyWorkloadRow[], weekDates: string[]): WeeklyEmployee[] {
  const map = new Map<number, WeeklyEmployee>();

  for (const row of rows) {
    if (!map.has(row.employeeID)) {
      map.set(row.employeeID, {
        employee: { id: row.employeeID, name: row.employee },
        days: weekDates.map(date => ({ date, hours: 0, percentage: 0, netCapacity: 0 })),
        weeklyTaskHours: row.weeklyTaskHours,
        weeklyNetCapacity: row.weeklyNetCapacity,
        weeklyWorkloadPct: row.weeklyWorkloadPct,
      });
    }

    const emp = map.get(row.employeeID)!;
    const dayIndex = weekDates.indexOf(row.workDay.split('T')[0]);
    if (dayIndex !== -1) {
      emp.days[dayIndex] = {
        date: row.workDay.split('T')[0],
        hours: row.dailyTaskHours,
        percentage: row.dailyWorkloadPct,
        netCapacity: row.netCapacityPerDay,
      };
    }

    // overwrite weekly totals (same value on every row for that employee)
    emp.weeklyTaskHours   = row.weeklyTaskHours;
    emp.weeklyNetCapacity = row.weeklyNetCapacity;
    emp.weeklyWorkloadPct = row.weeklyWorkloadPct;
  }

  return Array.from(map.values());
}

function transformMonthly(rows: MonthlyWorkloadRow[]): MonthlyEmployee[] {
  const map = new Map<number, MonthlyEmployee>();

  for (const row of rows) {
    if (!map.has(row.employeeID)) {
      map.set(row.employeeID, {
        employee: { id: row.employeeID, name: row.employee },
        months: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, hours: 0, percentage: 0 })),
        yearlyTaskHours: 0,
        avgWorkloadPct: 0,
      });
    }

    const emp = map.get(row.employeeID)!;
    const mi  = row.month - 1;
    emp.months[mi] = { month: row.month, hours: row.taskHoursMonth, percentage: row.workloadPct };
  }

  // compute yearly totals
  for (const emp of map.values()) {
    const active = emp.months.filter(m => m.percentage > 0);
    emp.yearlyTaskHours = parseFloat(emp.months.reduce((s, m) => s + m.hours, 0).toFixed(1));
    emp.avgWorkloadPct  = active.length
      ? Math.round(active.reduce((s, m) => s + m.percentage, 0) / active.length)
      : 0;
  }

  return Array.from(map.values());
}

// ─── hook state types ─────────────────────────────────────────────────────────

interface UseWeeklyWorkloadResult {
  data:    WeeklyEmployee[];
  loading: boolean;
  error:   string | null;
  refetch: () => void;
}

interface UseMonthlyWorkloadResult {
  data:    MonthlyEmployee[];
  loading: boolean;
  error:   string | null;
  refetch: () => void;
}

// ─── useWeeklyWorkload ────────────────────────────────────────────────────────

export function useWeeklyWorkload(
  employeeID:     number,
  permissionType: number,
  weekRef:        Date,
): UseWeeklyWorkloadResult {
  const [data,    setData]    = useState<WeeklyEmployee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const sundayStr = getSundayOf(weekRef);
  const weekDates = buildWeekDates(sundayStr);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const body: WeeklyWorkloadRequest = {
        employeeID,
        permissionType,
        weekStart: sundayStr,
      };

      const res = await fetch('/api/workload/weekly', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const rows: WeeklyWorkloadRow[] = await res.json();
      setData(transformWeekly(rows, weekDates));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה לא ידועה');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeID, permissionType, sundayStr]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { data, loading, error, refetch: fetch_ };
}

// ─── useMonthlyWorkload ───────────────────────────────────────────────────────

export function useMonthlyWorkload(
  employeeID:     number,
  permissionType: number,
  year:           number,
): UseMonthlyWorkloadResult {
  const [data,    setData]    = useState<MonthlyEmployee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all 12 months in parallel and merge
      const requests: MonthlyWorkloadRequest[] = Array.from({ length: 12 }, (_, i) => ({
        employeeID,
        permissionType,
        year,
        month: i + 1,
      }));

      const responses = await Promise.all(
        requests.map(body =>
          fetch('/api/workload/monthly', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(body),
          }).then(r => {
            if (!r.ok) throw new Error(`Server error: ${r.status}`);
            return r.json() as Promise<MonthlyWorkloadRow[]>;
          })
        )
      );

      const allRows = responses.flat();
      setData(transformMonthly(allRows));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה לא ידועה');
    } finally {
      setLoading(false);
    }
  }, [employeeID, permissionType, year]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { data, loading, error, refetch: fetch_ };
}