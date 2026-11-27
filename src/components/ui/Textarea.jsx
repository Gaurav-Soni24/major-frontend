import { cn } from "@/lib/utils/cn";
import styles from "./form.module.css";

/**
 * Multi-line input. Vertical resize only. Set `mono` for code and answers shown in monospace.
 * @param {{ mono?: boolean, className?: string, ref?: any } & import("react").TextareaHTMLAttributes<HTMLTextAreaElement>} props
 */
export default function Textarea({ mono, className, rows = 4, ...rest }) {
  return (
    <textarea
      rows={rows}
      className={cn(styles.control, styles.textarea, className)}
      style={mono ? { fontFamily: "var(--font-mono)", fontSize: "var(--fs-13)" } : undefined}
      {...rest}
    />
  );
}
