import { cn } from "@/lib/utils/cn";
import EditorIcon from "./EditorIcon.jsx";
import styles from "./toolbutton.module.css";

/**
 * Icon-only button for the editor's own icons (the ui kit's IconButton only knows the kit's icon names).
 * Same size, hover and disabled behaviour as IconButton; `label` is the accessible name and tooltip.
 * @param {{ icon: string, label: string, size?: "sm"|"md", className?: string } & Record<string, any>} props
 */
export default function ToolButton({ icon, label, size = "sm", className, type = "button", ...rest }) {
  return (
    <button type={type} aria-label={label} title={label} className={cn(styles.btn, styles[size], className)} {...rest}>
      <EditorIcon name={icon} size={size === "sm" ? 16 : 18} />
    </button>
  );
}
