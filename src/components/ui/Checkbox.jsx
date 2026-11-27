import { useId } from "react";
import { cn } from "@/lib/utils/cn";
import styles from "./choice.module.css";

/**
 * Checkbox with a visible label (square box, navy fill). For answer options in the quiz player use `AnswerOption`.
 * @param {{ label: import("react").ReactNode, hint?: string, className?: string } & import("react").InputHTMLAttributes<HTMLInputElement>} props
 */
export default function Checkbox({ label, hint, className, id, ...rest }) {
  const uid = useId();
  const inputId = id || `cb${uid}`;
  return (
    <label className={cn(styles.row, className)} htmlFor={inputId}>
      <input id={inputId} type="checkbox" className={styles.input} {...rest} />
      <span className={cn(styles.box, styles.checkbox)} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5 10 17.5 19 7" />
        </svg>
      </span>
      <span className={styles.text}>
        {label}
        {hint ? <span className={styles.hint}>{hint}</span> : null}
      </span>
    </label>
  );
}
