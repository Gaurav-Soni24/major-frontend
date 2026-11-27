"use client";

import { useId, useRef } from "react";
import { cn } from "@/lib/utils/cn";
import styles from "./Tabs.module.css";

/**
 * Underline tabs. Controlled: `value` + `onChange(id)`. Arrow keys / Home / End move and activate (roving tabindex).
 * Render the matching panel with `<TabPanel tabsId=... value=... active=...>`; ids are derived from `idPrefix`.
 *
 * @param {{ tabs: Array<{ id: string, label: string, count?: number }>, value: string, onChange: (id: string) => void, label: string, idPrefix?: string, className?: string }} props
 */
export function Tabs({ tabs, value, onChange, label, idPrefix, className }) {
  const uid = useId();
  const prefix = idPrefix || `tabs${uid}`;
  const refs = useRef([]);

  /** @param {import("react").KeyboardEvent} e @param {number} i */
  function onKeyDown(e, i) {
    const last = tabs.length - 1;
    let next = null;
    if (e.key === "ArrowRight") next = i === last ? 0 : i + 1;
    else if (e.key === "ArrowLeft") next = i === 0 ? last : i - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next === null) return;
    e.preventDefault();
    onChange(tabs[next].id);
    refs.current[next]?.focus();
  }

  return (
    <div role="tablist" aria-label={label} className={cn(styles.list, className)}>
      {tabs.map((t, i) => {
        const selected = t.id === value;
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${prefix}-tab-${t.id}`}
            aria-selected={selected}
            aria-controls={`${prefix}-panel-${t.id}`}
            tabIndex={selected ? 0 : -1}
            className={cn(styles.tab, selected && styles.selected)}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {t.label}
            {t.count !== undefined ? <span className={styles.count}>{t.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

/**
 * @param {{ idPrefix: string, tabId: string, active: boolean, className?: string, children: import("react").ReactNode }} props
 */
export function TabPanel({ idPrefix, tabId, active, className, children }) {
  return (
    <div role="tabpanel" id={`${idPrefix}-panel-${tabId}`} aria-labelledby={`${idPrefix}-tab-${tabId}`} hidden={!active} tabIndex={0} className={className}>
      {active ? children : null}
    </div>
  );
}

export default Tabs;
