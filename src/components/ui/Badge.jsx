import { cn } from "@/lib/utils/cn";
import styles from "./Badge.module.css";

/** Status presets: label + tone. Use `<Badge status="needs-review" />`. */
export const BADGE_STATUS = {
  published: { label: "Published", tone: "correct" },
  draft: { label: "Draft", tone: "neutral" },
  "in-progress": { label: "In progress", tone: "info" },
  submitted: { label: "Submitted", tone: "primary" },
  graded: { label: "Graded", tone: "correct" },
  "needs-review": { label: "Needs review", tone: "partial" },
  flagged: { label: "Flagged", tone: "wrong" },
  passed: { label: "Passed", tone: "correct" },
  failed: { label: "Failed", tone: "wrong" },
};

/**
 * "Tape" label: 2px radius, mono 11px, tinted background. Status is always conveyed by text, never colour alone.
 * @param {{ status?: keyof typeof BADGE_STATUS, tone?: "neutral"|"primary"|"correct"|"partial"|"wrong"|"info", className?: string, children?: import("react").ReactNode }} props
 */
export default function Badge({ status, tone = "neutral", className, children }) {
  const preset = status ? BADGE_STATUS[status] : null;
  const t = preset ? preset.tone : tone;
  return <span className={cn(styles.badge, styles[t], className)}>{children ?? preset?.label ?? status}</span>;
}
