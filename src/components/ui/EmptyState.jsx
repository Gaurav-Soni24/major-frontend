import { cn } from "@/lib/utils/cn";
import styles from "./EmptyState.module.css";

/** A drawn blank answer sheet: ruled lines, empty bracket for marks. */
function BlankSheet() {
  return (
    <svg width="96" height="112" viewBox="0 0 96 112" fill="none" aria-hidden="true" focusable="false">
      <rect x="1" y="1" width="94" height="110" rx="4" fill="#fff" stroke="#9AA3B5" strokeWidth="2" />
      <path d="M14 24h48M14 44h68M14 60h68M14 76h68M14 92h40" stroke="#D3D8E1" strokeWidth="2" strokeLinecap="round" />
      <path d="M68 20h-4v10h4M80 20h4v10h-4" stroke="#9AA3B5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * One sentence and one action. `title` states what is missing; `children` (optional) is the single sentence of help; `action` is a Button.
 * @param {{ title: string, action?: import("react").ReactNode, compact?: boolean, className?: string, children?: import("react").ReactNode }} props
 */
export default function EmptyState({ title, action, compact = false, className, children }) {
  return (
    <div className={cn(styles.root, compact && styles.compact, className)}>
      {!compact ? <BlankSheet /> : null}
      <p className={styles.title}>{title}</p>
      {children ? <p className={styles.text}>{children}</p> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
