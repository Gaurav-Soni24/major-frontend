"use client";

import { Button, Icon } from "@/components/ui";
import { formatClock } from "@/lib/utils/format";
import styles from "./banners.module.css";

/** A draft from a previous session was found on this device. */
export function RestoreBanner({ restore, onRestore, onDiscard }) {
  return (
    <div className={styles.banner} data-tone="info" role="status">
      <Icon name="info" size={18} />
      <div className={styles.text}>
        <p>
          <strong>Unsaved draft found.</strong> You have changes from {formatClock(restore.savedAt)} on this device that were not saved to the server.
        </p>
        {restore.serverNewer ? <p className={styles.warn}>This quiz was changed on the server after that draft was made. Restoring only loads it here; nothing is overwritten until you save.</p> : null}
      </div>
      <div className={styles.actions}>
        <Button size="sm" onClick={onRestore}>
          Restore draft
        </Button>
        <Button size="sm" variant="secondary" onClick={onDiscard}>
          Discard it
        </Button>
      </div>
    </div>
  );
}

/** The quiz has submissions: questions, time and passing score are read only. */
export function LockBanner({ onDuplicate, onRevert, busy, canRevert }) {
  return (
    <div className={styles.banner} data-tone="warn" role="status">
      <Icon name="alert" size={18} />
      <div className={styles.text}>
        <p>
          <strong>Questions are locked.</strong> Students have already attempted this quiz, so changing questions, the time limit or the passing score would change results that already exist.
        </p>
        <p>You can still edit the title, description, instructions, password, settings and registration fields. To change the questions, make a copy.</p>
      </div>
      <div className={styles.actions}>
        <Button size="sm" iconLeft="copy" loading={busy === "duplicate"} onClick={onDuplicate}>
          Duplicate quiz to edit questions
        </Button>
        {canRevert ? (
          <Button size="sm" variant="secondary" onClick={onRevert}>
            Discard my question changes
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/** Server messages that did not match a field. */
export function UnmappedErrors({ items }) {
  if (!items.length) return null;
  return (
    <div className={styles.banner} data-tone="error" role="alert">
      <Icon name="alert" size={18} />
      <div className={styles.text}>
        <p>
          <strong>The server also reported:</strong>
        </p>
        <ul>
          {items.map((d, i) => (
            <li key={i}>
              {d.field ? <code>{d.field}</code> : null} {d.message}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
