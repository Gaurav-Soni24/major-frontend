import { cn } from "@/lib/utils/cn";
import styles from "./form.module.css";

/**
 * Text input. Usually placed inside `<Field>`, which supplies id and aria attributes.
 * `leading` / `trailing` are small slots (icon, button) shown inside the box.
 * @param {{ size?: "md"|"lg", leading?: import("react").ReactNode, trailing?: import("react").ReactNode, className?: string, ref?: any } & import("react").InputHTMLAttributes<HTMLInputElement>} props
 */
export default function Input({ size = "md", leading, trailing, className, type = "text", ...rest }) {
  const control = (
    <input
      type={type}
      className={cn(styles.control, size === "lg" && styles.lg, leading && styles.hasLeading, trailing && styles.hasTrailing, !leading && !trailing && className)}
      {...rest}
    />
  );
  if (!leading && !trailing) return control;
  return (
    <div className={cn(styles.wrap, className)}>
      {leading ? <span className={styles.leading}>{leading}</span> : null}
      {control}
      {trailing ? <span className={styles.trailing}>{trailing}</span> : null}
    </div>
  );
}
