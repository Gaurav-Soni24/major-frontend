import styles from "./Tick.module.css";

/**
 * The examiner's tick: a quick, slightly slanted check mark in pen red.
 * `animate` draws it in over 120ms (disabled for reduced motion). Decorative unless `title` is set.
 * @param {{ size?: number, color?: string, animate?: boolean, title?: string, className?: string, strokeWidth?: number }} props
 */
export default function Tick({ size = 20, color = "var(--pen)", animate = false, title, className, strokeWidth = 2.6 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      aria-label={title}
      focusable="false"
    >
      <path
        d="M3.5 13.2 8.4 19 21 4.2"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength="1"
        className={animate ? styles.draw : undefined}
      />
    </svg>
  );
}
