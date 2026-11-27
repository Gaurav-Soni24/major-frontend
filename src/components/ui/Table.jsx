import { cn } from "@/lib/utils/cn";
import styles from "./Table.module.css";

/**
 * Ruled marking-grid table: column rules, double rule under the header, sticky header, row hover.
 * Compose: Table > TableHead > TableRow > TableHeaderCell, and Table > TableBody > TableRow > TableCell.
 * Use `numeric` on cells holding numbers (right aligned, tabular figures). `caption` is required for accessibility
 * (visually hidden unless `showCaption`).
 *
 * @param {{ caption: string, showCaption?: boolean, maxHeight?: number|string, className?: string, children: import("react").ReactNode }} props
 */
export function Table({ caption, showCaption = false, maxHeight, className, children }) {
  return (
    <div className={cn(styles.scroll, className)} style={maxHeight ? { maxHeight } : undefined} tabIndex={0} role="region" aria-label={caption}>
      <table className={styles.table}>
        <caption className={showCaption ? styles.caption : "sr-only"}>{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export const TableHead = ({ children }) => <thead className={styles.head}>{children}</thead>;
export const TableBody = ({ children }) => <tbody>{children}</tbody>;

/** @param {{ onClick?: () => void, selected?: boolean, className?: string, children: import("react").ReactNode }} props */
export const TableRow = ({ onClick, selected, className, children }) => (
  <tr className={cn(styles.row, onClick && styles.clickable, selected && styles.selected, className)} onClick={onClick}>
    {children}
  </tr>
);

/** @param {{ numeric?: boolean, sort?: "ascending"|"descending"|"none", width?: number|string, className?: string, children?: import("react").ReactNode }} props */
export const TableHeaderCell = ({ numeric, sort, width, className, children }) => (
  <th scope="col" aria-sort={sort} className={cn(styles.th, numeric && styles.numeric, className)} style={width ? { width } : undefined}>
    {children}
  </th>
);

/** @param {{ numeric?: boolean, mono?: boolean, className?: string, children?: import("react").ReactNode } & Record<string, any>} props */
export const TableCell = ({ numeric, mono, className, children, ...rest }) => (
  <td className={cn(styles.td, numeric && styles.numeric, mono && styles.mono, className)} {...rest}>
    {children}
  </td>
);

export default Table;
