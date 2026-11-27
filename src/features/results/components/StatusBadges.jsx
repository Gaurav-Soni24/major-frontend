import { Badge, Icon, Tick } from "@/components/ui";
import { statusBadges } from "../logic/status";
import styles from "./results.module.css";

/** All status tapes for one submission (In progress / Submitted / Graded / Needs review / Flagged / Late / Auto-submitted). */
export function StatusBadges({ submission }) {
  return (
    <span className={styles.badges}>
      {statusBadges(submission).map((b) => (
        <Badge key={b.key} status={b.status} tone={b.tone}>
          {b.label}
        </Badge>
      ))}
    </span>
  );
}

/** Pass or fail with an icon and text (never colour alone). `null` renders a dash. */
export function PassMark({ passed }) {
  if (passed === null || passed === undefined) return <span className={styles.muted}>—</span>;
  return passed ? (
    <span className={styles.pass}>
      <Tick size={16} />
      Pass
    </span>
  ) : (
    <span className={styles.fail}>
      <Icon name="x" size={16} />
      Fail
    </span>
  );
}
