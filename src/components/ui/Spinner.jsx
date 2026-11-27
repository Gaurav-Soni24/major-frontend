import styles from "./Spinner.module.css";

/**
 * Small ring spinner. Inherits the text colour. Pass `label` to announce it to screen readers.
 * @param {{ size?: number, label?: string, className?: string }} props
 */
export default function Spinner({ size = 16, label, className }) {
  return (
    <span
      className={`${styles.spinner} ${className || ""}`}
      style={{ width: size, height: size }}
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
