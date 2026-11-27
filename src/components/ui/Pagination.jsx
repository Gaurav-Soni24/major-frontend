"use client";

import { cn } from "@/lib/utils/cn";
import Icon from "./Icon";
import styles from "./Pagination.module.css";

/**
 * Compact page list with prev/next. `page` is 1-based. Renders nothing when there is a single page.
 * @param {{ page: number, pages: number, onChange: (page: number) => void, total?: number, className?: string }} props
 */
export default function Pagination({ page, pages, onChange, total, className }) {
  if (!pages || pages <= 1) return null;

  /** @type {Array<number|"gap-l"|"gap-r">} */
  const list = [];
  for (let p = 1; p <= pages; p += 1) {
    if (pages <= 7 || p === 1 || p === pages || Math.abs(p - page) <= 1) list.push(p);
    else if (p === 2) list.push("gap-l");
    else if (p === pages - 1) list.push("gap-r");
  }

  return (
    <nav className={cn(styles.nav, className)} aria-label="Pagination">
      <p className={styles.summary}>
        Page <span className="tnum">{page}</span> of <span className="tnum">{pages}</span>
        {total !== undefined ? <> ({total} total)</> : null}
      </p>
      <ul className={styles.list} role="list">
        <li>
          <button type="button" className={styles.btn} onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
            <Icon name="chevron-left" size={16} />
          </button>
        </li>
        {list.map((p) =>
          typeof p === "string" ? (
            <li key={p} className={styles.gap} aria-hidden="true">
              ...
            </li>
          ) : (
            <li key={p}>
              <button type="button" className={cn(styles.btn, p === page && styles.current)} onClick={() => onChange(p)} aria-current={p === page ? "page" : undefined} aria-label={`Page ${p}`}>
                {p}
              </button>
            </li>
          ),
        )}
        <li>
          <button type="button" className={styles.btn} onClick={() => onChange(page + 1)} disabled={page >= pages} aria-label="Next page">
            <Icon name="chevron-right" size={16} />
          </button>
        </li>
      </ul>
    </nav>
  );
}
