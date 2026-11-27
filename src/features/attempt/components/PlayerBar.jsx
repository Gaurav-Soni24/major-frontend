"use client";

import { Button, Icon, ProgressBar } from "@/components/ui";
import { formatClock, formatTimer } from "@/lib/utils/format";
import { timerTone } from "../lib/timer.js";
import { cn } from "@/lib/utils/cn";
import styles from "./player.module.css";

/** Text for the save indicator. The live region only changes when the state changes, not every heartbeat. */
export function saveLabel(status) {
  switch (status.state) {
    case "saving":
      return "Saving...";
    case "saved":
      return status.savedAt ? `Saved ${formatClock(status.savedAt)}` : "Saved";
    case "offline":
      return "Offline, will retry";
    case "error":
      return "Could not save, retrying";
    default:
      return "Answers save automatically";
  }
}

export function SaveStatus({ status }) {
  const bad = status.state === "offline" || status.state === "error";
  const spoken = { saving: "Saving your answers.", saved: "All changes saved.", offline: "You are offline. Your answers will be saved when you reconnect.", error: "Saving failed. Retrying.", idle: "" }[status.state];
  return (
    <span className={cn(styles.saveStatus, bad && styles.saveBad)}>
      <span className={cn(styles.dot, status.state === "saving" && styles.dotWarn, bad && styles.dotBad)} aria-hidden="true" />
      <span aria-hidden="true" data-testid="save-status">
        {saveLabel(status)}
      </span>
      <span className="sr-only" role="status" aria-live="polite">
        {spoken}
      </span>
    </span>
  );
}

export default function PlayerBar({ title, remaining, timed, answered, total, saveStatus, onSubmit, announcement }) {
  const tone = timerTone(remaining);
  return (
    <header className={styles.bar}>
      <div className={styles.barMain}>
        <h1 className={styles.barTitle}>{title}</h1>
        {timed ? (
          <span className={cn(styles.timer, tone === "soon" && styles.timerSoon, tone === "urgent" && styles.timerUrgent)} role="timer" aria-live="off" aria-label={`Time remaining ${formatTimer(remaining ?? 0)}`}>
            <Icon name="clock" size={16} />
            <span data-testid="timer">{formatTimer(remaining ?? 0)}</span>
          </span>
        ) : null}
        <Button size="sm" variant="secondary" onClick={onSubmit}>
          Submit
        </Button>
      </div>
      <div className={styles.barSub}>
        <span className={styles.progressText}>
          Answered {answered} of {total}
        </span>
        <ProgressBar value={answered} max={Math.max(1, total)} label="Questions answered" />
        <SaveStatus status={saveStatus} />
      </div>
      <p className="sr-only" role="status" aria-live="polite" data-testid="time-announce">
        {announcement}
      </p>
    </header>
  );
}
