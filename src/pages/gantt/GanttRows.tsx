import { STATUS_BG, STATUS_COLOR, STATUS_TEXT, datePct, formatShortDate } from './utils';
import styles from './GanttSteps.module.css';
import type { Phase, Project } from './types';

// ── Bar ──────────────────────────────────────────────────────────
interface BarProps {
  start: string; end: string; color: string; label: string;
  alpha?: number; rangeStart: Date; totalMs: number;
}
export function Bar({ start, end, color, label, alpha = 1, rangeStart, totalMs }: BarProps) {
  const left  = datePct(start, rangeStart, totalMs);
  const width = datePct(end, rangeStart, totalMs) - left;
  if (width <= 0) return null;
  return (
    <div
      className={styles.bar}
      style={{ right: `${left.toFixed(2)}%`, width: `${width.toFixed(2)}%`, background: color, opacity: alpha }}
      title={`${label}: ${start} → ${end}`}
    >
      {width > 10 ? label : ''}
    </div>
  );
}

// ── GridLines ────────────────────────────────────────────────────
export function GridLines({ numCols }: { numCols: number }) {
  return (
    <>
      {Array.from({ length: numCols }).map((_, i) => (
        <div key={i} className={styles.gridV}
          style={{ right: `${((i / numCols) * 100).toFixed(2)}%`, width: `${((1 / numCols) * 100).toFixed(2)}%` }}
        />
      ))}
    </>
  );
}

// ── TodayLine ────────────────────────────────────────────────────
export function TodayLine({ pct, visible }: { pct: number; visible: boolean }) {
  if (!visible) return null;
  return <div className={styles.todayLine} style={{ right: `${pct.toFixed(2)}%` }} />;
}

// ── ProjectRow ───────────────────────────────────────────────────
interface ProjectRowProps {
  project: Project; isOpen: boolean; numCols: number;
  rangeStart: Date; totalMs: number; todayPctValue: number;
  todayVisible: boolean; onToggle: (id: number) => void;
}
export function ProjectRow({ project, isOpen, numCols, rangeStart, totalMs, todayPctValue, todayVisible, onToggle }: ProjectRowProps) {
  const doneCount  = project.phases.filter(p => p.status === 'הושלם').length;
  const projStart  = project.phases.reduce((a, b) => a < b.start ? a : b.start, project.phases[0].start);
  const projEnd    = project.phases.reduce((a, b) => a > b.end   ? a : b.end,   project.phases[0].end);

  return (
    <tr className={styles.projRow} onClick={() => onToggle(project.id)}>
      <td className={`${styles.colLabel} ${styles.projColLabel}`}>
        <div className={styles.projHeader}>
          <div className={styles.projDot} style={{ background: project.color }} />
          <div>
            <div className={styles.projName}>{project.name}</div>
            <div className={styles.projMeta}>{doneCount}/{project.phases.length} שלבים הושלמו</div>
          </div>
          <span className={`${styles.chev} ${isOpen ? styles.chevOpen : ''}`}>▼</span>
        </div>
      </td>
      <td className={styles.barCell} colSpan={numCols}>
        <div className={styles.barWrap}>
          <GridLines numCols={numCols} />
          <TodayLine pct={todayPctValue} visible={todayVisible} />
          <Bar start={projStart} end={projEnd} color={project.color} label={project.name} alpha={0.2} rangeStart={rangeStart} totalMs={totalMs} />
          {project.phases.map((ph, i) => (
            <Bar key={i} start={ph.start} end={ph.end} color={STATUS_COLOR[ph.status]} label={ph.name} alpha={0.55} rangeStart={rangeStart} totalMs={totalMs} />
          ))}
        </div>
      </td>
    </tr>
  );
}

// ── PhaseRow ─────────────────────────────────────────────────────
interface PhaseRowProps {
  phase: Phase; numCols: number; rangeStart: Date;
  totalMs: number; todayPctValue: number; todayVisible: boolean;
}
export function PhaseRow({ phase, numCols, rangeStart, totalMs, todayPctValue, todayVisible }: PhaseRowProps) {
  return (
    <tr className={styles.phaseRow}>
      <td className={styles.colLabel}>
        <div className={styles.phaseLabel}>
          <div>
            <div className={styles.phaseNameRow}>
              <span className={`bright-surface ${styles.statusPill}`} style={{ background: STATUS_BG[phase.status], color: STATUS_TEXT[phase.status] }}>
                {phase.status}
              </span>
              <span className={styles.phaseNameText}>{phase.name}</span>
            </div>
            <div className={styles.phaseSub}>{phase.owner} · {formatShortDate(phase.start)} – {formatShortDate(phase.end)}</div>
          </div>
        </div>
      </td>
      <td className={styles.barCell} colSpan={numCols}>
        <div className={styles.barWrap}>
          <GridLines numCols={numCols} />
          <TodayLine pct={todayPctValue} visible={todayVisible} />
          <Bar start={phase.start} end={phase.end} color={STATUS_COLOR[phase.status]} label={phase.name} rangeStart={rangeStart} totalMs={totalMs} />
        </div>
      </td>
    </tr>
  );
}