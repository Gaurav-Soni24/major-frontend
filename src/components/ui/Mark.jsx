import { cn } from "@/lib/utils/cn";
import { formatMarks } from "@/lib/utils/format";
import styles from "./Mark.module.css";

/**
 * Marks in the printed bracket style: `[2]`. Pass `obtained` to show `[1.5 / 2]`.
 * @param {{ value: number, obtained?: number, className?: string }} props
 */
export default function Mark({ value, obtained, className }) {
  const label =
    obtained === undefined || obtained === null
      ? formatMarks(value)
      : `[${Math.round(obtained * 100) / 100} / ${Math.round(value * 100) / 100}]`;
  return (
    <span className={cn(styles.mark, className)} aria-label={`${obtained ?? ""}${obtained !== undefined ? " of " : ""}${value} marks`}>
      <span aria-hidden="true">{label}</span>
    </span>
  );
}
