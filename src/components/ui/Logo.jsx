import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import styles from "./Logo.module.css";

/** The logo mark alone: a ruled paper tile with the examiner's tick. Matches `app/icon.svg`. */
export function LogoMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect x="1.5" y="1.5" width="29" height="29" rx="5" fill="#fff" stroke="#1B2A8F" strokeWidth="2.5" />
      <path d="M7 11h18M7 25h10" stroke="#D3D8E1" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 17.2 13.4 23 25 8.2" fill="none" stroke="#E4302B" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Mark + wordmark. Links to `href` (default "/") unless `href={null}`.
 * @param {{ href?: string|null, size?: number, className?: string, wordmark?: boolean }} props
 */
export default function Logo({ href = "/", size = 28, className, wordmark = true }) {
  const inner = (
    <>
      <LogoMark size={size} />
      {wordmark ? <span className={styles.word}>Quizify</span> : <span className="sr-only">Quizify</span>}
    </>
  );
  if (href === null) return <span className={cn(styles.logo, className)}>{inner}</span>;
  return (
    <Link href={href} className={cn(styles.logo, className)} aria-label="Quizify home">
      {inner}
    </Link>
  );
}
