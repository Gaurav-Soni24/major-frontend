import { cn } from "@/lib/utils/cn";
import Icon from "./Icon";
import styles from "./IconButton.module.css";

/**
 * Square icon-only button. `label` is required: it becomes the accessible name and the native tooltip.
 * @param {{ icon: string, label: string, size?: "sm"|"md"|"lg", variant?: "ghost"|"secondary", className?: string } & Record<string, any>} props
 */
export default function IconButton({ icon, label, size = "md", variant = "ghost", className, type = "button", ...rest }) {
  return (
    <button type={type} aria-label={label} title={label} className={cn(styles.btn, styles[size], styles[variant], className)} {...rest}>
      <Icon name={icon} size={size === "sm" ? 15 : 18} />
    </button>
  );
}
