import { cn } from "@/lib/utils/cn";
import styles from "./Stat.module.css";

/**
 * One figure with its label. Use several inside a `<StatStrip>` (a ruled row), never as big-number cards.
 * `value` is shown as given (format it first); use real data only, `"—"` when unknown.
 * `delta` is optional small text such as "+3 this week" with `deltaTone` for colour (text always carries the meaning).
 * @param {{ label: string, value: import("react").ReactNode, hint?: string, delta?: string, deltaTone?: "correct"|"wrong"|"neutral", className?: string }} props
 */
export default function Stat({ label, value, hint, delta, deltaTone = "neutral", className }) {
  return (
    <div className={cn(styles.stat, className)}>
      <dt className={styles.label}>{label}</dt>
      <dd className={styles.value}>{value}</dd>
      {delta ? <dd className={cn(styles.delta, styles[deltaTone])}>{delta}</dd> : null}
      {hint ? <dd className={styles.hint}>{hint}</dd> : null}
    </div>
  );
}

/** Ruled row of stats: `<StatStrip label="Summary"><Stat .../><Stat .../></StatStrip>`. */
export function StatStrip({ label, className, children }) {
  return (
    <dl className={cn(styles.strip, className)} aria-label={label}>
      {children}
    </dl>
  );
}
