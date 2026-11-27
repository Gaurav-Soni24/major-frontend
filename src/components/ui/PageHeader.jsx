import { cn } from "@/lib/utils/cn";
import styles from "./PageHeader.module.css";

/**
 * Page title (the page's single `h1`), a one-line description and the page's primary action(s).
 * @param {{ title: string, description?: string, actions?: import("react").ReactNode, className?: string }} props
 */
export default function PageHeader({ title, description, actions, className }) {
  return (
    <header className={cn(styles.header, className)}>
      <div className={styles.text}>
        <h1 className={styles.title}>{title}</h1>
        {description ? <p className={styles.description}>{description}</p> : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  );
}
