import { cn } from "@/lib/utils/cn";
import styles from "./Skeleton.module.css";

/**
 * Placeholder block (surface-2, 1.2s pulse). Decorative: wrap lists in `aria-busy` and give the region a visible or sr-only "Loading" text.
 * @param {{ width?: number|string, height?: number|string, className?: string, style?: import("react").CSSProperties }} props
 */
export function Skeleton({ width = "100%", height = 16, className, style }) {
  return <span className={cn(styles.block, className)} style={{ width, height, ...style }} aria-hidden="true" />;
}

/** A few stacked text lines. @param {{ lines?: number, className?: string }} props */
export function SkeletonText({ lines = 3, className }) {
  return (
    <span className={cn(styles.text, className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} height={12} width={i === lines - 1 ? "60%" : "100%"} />
      ))}
    </span>
  );
}

export default Skeleton;
