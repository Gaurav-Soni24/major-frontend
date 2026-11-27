import { cn } from "@/lib/utils/cn";
import styles from "./Panel.module.css";

/**
 * Surface container: white, 1px rule, 8px radius, no shadow. Never nest panels.
 * Give it a `title` (rendered as `headingLevel`, default h2) and optional `actions` for a header row.
 * @param {{ title?: string, description?: string, actions?: import("react").ReactNode, padded?: boolean, headingLevel?: 2|3|4, as?: any, className?: string, children?: import("react").ReactNode } & Record<string, any>} props
 */
export default function Panel({ title, description, actions, padded = true, headingLevel = 2, as: Tag = "section", className, children, ...rest }) {
  const H = `h${headingLevel}`;
  return (
    <Tag className={cn(styles.panel, className)} {...rest}>
      {title || actions ? (
        <header className={styles.header}>
          <div className={styles.titles}>
            {title ? <H className={styles.title}>{title}</H> : null}
            {description ? <p className={styles.description}>{description}</p> : null}
          </div>
          {actions ? <div className={styles.actions}>{actions}</div> : null}
        </header>
      ) : null}
      <div className={padded ? styles.body : undefined}>{children}</div>
    </Tag>
  );
}
