import { cn } from "@/lib/utils/cn";
import styles from "./form.module.css";

/**
 * Native select with the Quizify arrow. Pass `<option>` children, or `options=[{value,label}]`.
 * @param {{ options?: Array<{ value: string|number, label: string, disabled?: boolean }>, className?: string, ref?: any } & import("react").SelectHTMLAttributes<HTMLSelectElement>} props
 */
export default function Select({ options, className, children, ...rest }) {
  return (
    <select className={cn(styles.control, styles.select, className)} {...rest}>
      {options
        ? options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))
        : children}
    </select>
  );
}
