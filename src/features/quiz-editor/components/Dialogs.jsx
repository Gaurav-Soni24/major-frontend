"use client";

import { Button, ConfirmDialog, CopyField, Dialog, Icon } from "@/components/ui";
import { pluralize } from "@/lib/utils/format";
import styles from "./dialogs.module.css";

const where = (i) => {
  if (i.scope === "question") return "Question";
  if (i.scope === "details") return "Details";
  if (i.scope === "settings") return "Settings";
  return "Quiz";
};

/** List of everything that blocks saving or publishing; each row jumps to the field. */
export function IssuesDialog({ open, onClose, issues, questions, onJump, title = "Fix these before publishing" }) {
  const label = (i) => {
    if (i.scope !== "question") return where(i);
    const n = questions.findIndex((q) => q.id === i.qid);
    return `Question ${n + 1}`;
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={`${pluralize(issues.length, "issue")}. Select one to go to it.`}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <ul className={styles.issues}>
        {issues.map((i, n) => (
          <li key={`${i.key}-${n}`}>
            <button
              type="button"
              className={styles.issue}
              onClick={() => {
                onClose();
                onJump(i);
              }}
            >
              <Icon name="alert" size={16} />
              <span className={styles.issueWhere}>{label(i)}</span>
              <span className={styles.issueMsg}>{i.message}</span>
              <Icon name="chevron-right" size={16} />
            </button>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}

/** Shown after publishing: the link students open. */
export function ShareDialog({ open, onClose, quizId, hasPassword }) {
  const url = quizId && typeof window !== "undefined" ? `${window.location.origin}/attempt/${quizId}` : "";
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Your quiz is published"
      description="Share this link with students. They sign in with Google, then start."
      footer={
        <Button onClick={onClose}>Done</Button>
      }
    >
      <CopyField label="Quiz link" value={url} />
      {hasPassword ? <p className={styles.shareNote}>This quiz has a password. Share it separately from the link.</p> : null}
    </Dialog>
  );
}

/** Leaving with unsaved changes. */
export function LeaveDialog({ open, onStay, onLeave }) {
  return (
    <ConfirmDialog
      open={open}
      onClose={onStay}
      onConfirm={onLeave}
      title="Leave without saving?"
      description="Your changes are not saved to the server. They are kept as a draft on this device, and you can restore them when you come back."
      confirmLabel="Leave"
      cancelLabel="Stay and keep editing"
      tone="danger"
    />
  );
}
