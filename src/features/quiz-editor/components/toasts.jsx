"use client";

import { toast } from "@/components/ui";
import styles from "./toasts.module.css";

/** A toast with one action button ("Undo", "Retry"). The action dismisses the toast. */
export function actionToast(message, label, onAction, { error = false, duration = 7000 } = {}) {
  return toast(
    (t) => (
      <span className={styles.row} role={error ? "alert" : "status"}>
        <span>{message}</span>
        <button
          type="button"
          className={styles.btn}
          onClick={() => {
            toast.dismiss(t.id);
            onAction();
          }}
        >
          {label}
        </button>
      </span>
    ),
    { duration },
  );
}
