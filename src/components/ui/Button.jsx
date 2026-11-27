import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import Spinner from "./Spinner";
import Icon from "./Icon";
import styles from "./Button.module.css";

/**
 * Button. Renders a `<button>`, or a Next `<Link>` when `href` is given.
 * Loading keeps the label visible, shows a spinner and blocks clicks (aria-busy).
 *
 * @param {{
 *   variant?: "primary"|"secondary"|"ghost"|"danger",
 *   size?: "sm"|"md"|"lg",
 *   loading?: boolean,
 *   disabled?: boolean,
 *   block?: boolean,
 *   iconLeft?: string,
 *   iconRight?: string,
 *   href?: string,
 *   type?: "button"|"submit"|"reset",
 *   className?: string,
 *   children?: import("react").ReactNode,
 * } & Record<string, any>} props
 */
export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  block = false,
  iconLeft,
  iconRight,
  href,
  type = "button",
  className,
  children,
  onClick,
  ...rest
}) {
  const cls = cn(styles.btn, styles[variant], styles[size], block && styles.block, loading && styles.loading, className);
  const content = (
    <>
      {loading ? <Spinner size={size === "lg" ? 18 : 14} /> : iconLeft ? <Icon name={iconLeft} size={size === "sm" ? 15 : 17} /> : null}
      {children ? <span>{children}</span> : null}
      {iconRight && !loading ? <Icon name={iconRight} size={size === "sm" ? 15 : 17} /> : null}
    </>
  );

  if (href) {
    const off = disabled || loading;
    return (
      <Link
        href={href}
        className={cls}
        aria-disabled={off || undefined}
        tabIndex={off ? -1 : undefined}
        {...rest}
        onClick={off ? (e) => e.preventDefault() : onClick}
      >
        {content}
      </Link>
    );
  }

  return (
    <button type={type} className={cls} disabled={disabled} aria-busy={loading || undefined} {...rest} onClick={loading ? undefined : onClick}>
      {content}
    </button>
  );
}
