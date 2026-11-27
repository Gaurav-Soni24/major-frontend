import { cn } from "@/lib/utils/cn";
import styles from "./ProgressBar.module.css";

/**
 * Thin progress bar (ink on rule). Always give it a `label` (used as the accessible name).
 * @param {{ value: number, max?: number, label: string, tone?: "ink"|"correct"|"wrong"|"partial", className?: string }} props
 */
export default function ProgressBar({ value, max = 100, label, tone = "ink", className }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      className={cn(styles.track, className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value * 100) / 100}
    >
      <div className={cn(styles.fill, styles[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}
