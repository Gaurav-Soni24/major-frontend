import { useId } from "react";
import { cn } from "@/lib/utils/cn";
import Tick from "./Tick";
import styles from "./choice.module.css";

/**
 * Radio with a visible label (round bubble, navy dot).
 * @param {{ label: import("react").ReactNode, hint?: string, className?: string } & import("react").InputHTMLAttributes<HTMLInputElement>} props
 */
export function Radio({ label, hint, className, id, ...rest }) {
  const uid = useId();
  const inputId = id || `rd${uid}`;
  return (
    <label className={cn(styles.row, className)} htmlFor={inputId}>
      <input id={inputId} type="radio" className={styles.input} {...rest} />
      <span className={cn(styles.box, styles.round)} aria-hidden="true">
        <span className={styles.dot} />
      </span>
      <span className={styles.text}>
        {label}
        {hint ? <span className={styles.hint}>{hint}</span> : null}
      </span>
    </label>
  );
}

/**
 * Answer bubble used by the student player and the results review.
 * Round bubble for single answer, square for multiple. The selected bubble carries the examiner's tick (pen red).
 * `state` is for review screens: "correct" (ticked), "wrong" (cross, shown by colour + text), "missed" (should have been picked).
 * Text uses the reading face. Hit area is at least 44px tall.
 *
 * @param {{
 *   multiple?: boolean,
 *   children: import("react").ReactNode,
 *   state?: "correct"|"wrong"|"missed",
 *   stateLabel?: string,
 *   className?: string,
 * } & import("react").InputHTMLAttributes<HTMLInputElement>} props
 */
export function AnswerOption({ multiple = false, children, state, stateLabel, className, id, ...rest }) {
  const uid = useId();
  const inputId = id || `ao${uid}`;
  const labels = { correct: "Correct", wrong: "Incorrect", missed: "Correct answer" };
  return (
    <label className={cn(styles.answer, state && styles[`state_${state}`], className)} htmlFor={inputId}>
      <input id={inputId} type={multiple ? "checkbox" : "radio"} className={styles.input} {...rest} />
      <span className={cn(styles.bubble, multiple ? styles.square : styles.round)} aria-hidden="true">
        <Tick size={16} animate key={rest.checked ? "on" : "off"} className={styles.bubbleTick} />
      </span>
      <span className={styles.answerText}>{children}</span>
      {state ? <span className={styles.stateLabel}>{stateLabel || labels[state]}</span> : null}
    </label>
  );
}

export default Radio;
