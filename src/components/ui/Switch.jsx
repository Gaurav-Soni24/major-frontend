"use client";

import { useId } from "react";
import { cn } from "@/lib/utils/cn";
import styles from "./Switch.module.css";

/**
 * On/off switch (`role="switch"`). Controlled: pass `checked` and `onChange(nextBoolean)`.
 * @param {{ checked: boolean, onChange: (next: boolean) => void, label: import("react").ReactNode, hint?: string, disabled?: boolean, className?: string }} props
 */
export default function Switch({ checked, onChange, label, hint, disabled, className }) {
  const uid = useId();
  const labelId = `sw${uid}`;
  return (
    <div className={cn(styles.row, className)}>
      <span className={styles.text}>
        <span id={labelId} className={styles.label}>
          {label}
        </span>
        {hint ? <span className={styles.hint}>{hint}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        disabled={disabled}
        className={cn(styles.track, checked && styles.on)}
        onClick={() => onChange(!checked)}
      >
        <span className={styles.thumb} />
      </button>
    </div>
  );
}
