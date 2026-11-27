import { cloneElement, isValidElement, useId } from "react";
import Icon from "./Icon";
import styles from "./form.module.css";

/**
 * Label + control + hint + error. Wires `id`, `aria-describedby`, `aria-invalid` and `required` for you.
 * Pass a single control as children, or a render function `(props) => <Input {...props} />`.
 * Errors render with `role="alert"` so they are announced.
 *
 * @param {{
 *   label: string,
 *   hint?: string,
 *   error?: string,
 *   required?: boolean,
 *   optional?: boolean,
 *   hideLabel?: boolean,
 *   className?: string,
 *   children: import("react").ReactElement | ((p: { id: string, "aria-describedby"?: string, "aria-invalid"?: boolean, required?: boolean }) => import("react").ReactNode),
 * }} props
 */
export default function Field({ label, hint, error, required, optional, hideLabel, className, children }) {
  const uid = useId();
  const id = `f${uid}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  const controlProps = { id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined, required: required || undefined };

  return (
    <div className={`${styles.field} ${className || ""}`}>
      <label htmlFor={id} className={hideLabel ? "sr-only" : styles.label}>
        {label}
        {optional ? <span className={styles.optional}> (optional)</span> : null}
      </label>
      {typeof children === "function" ? children(controlProps) : isValidElement(children) ? cloneElement(children, controlProps) : children}
      {hint && !error ? (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className={styles.error} role="alert">
          <Icon name="alert" size={15} />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
