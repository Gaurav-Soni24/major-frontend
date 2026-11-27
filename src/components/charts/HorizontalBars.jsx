"use client";

import { useId } from "react";
import styles from "./charts.module.css";

const TONES = { primary: "var(--primary)", correct: "var(--correct)", wrong: "var(--wrong)", partial: "var(--partial)", muted: "var(--ink-3)" };

/**
 * Ranked horizontal bars: one row per item with a label, an SVG bar on a 0..max scale and a tabular value.
 * Rows are focusable (tooltip text is the accessible name). Pass `max` (default 100) so bars share one scale.
 *
 * @param {{
 *   items: Array<{ key: string, label: import("react").ReactNode, sub?: string, value: number, valueLabel: string, tone?: keyof typeof TONES, description: string }>,
 *   title: string,
 *   max?: number,
 *   ticks?: number[],
 *   tickSuffix?: string,
 * }} props
 */
export default function HorizontalBars({ items, title, max = 100, ticks = [0, 50, 100], tickSuffix = "%" }) {
  const uid = useId();
  return (
    <figure className={styles.hfigure} aria-labelledby={`${uid}t`}>
      <figcaption id={`${uid}t`} className="sr-only">
        {title}
      </figcaption>
      <div className={styles.hscale} aria-hidden="true">
        <span />
        <div className={styles.hticks}>
          {ticks.map((t) => (
            <span key={t} style={{ left: `${(t / max) * 100}%` }}>
              {t}
              {tickSuffix}
            </span>
          ))}
        </div>
        <span />
      </div>
      <ol className={styles.hlist}>
        {items.map((it, i) => {
          const pct = Math.max(0, Math.min(100, (it.value / max) * 100));
          return (
            <li key={it.key} className={styles.hrow} tabIndex={0} aria-label={it.description} title={it.description}>
              <div className={styles.hlabel}>{it.label}</div>
              <svg className={styles.htrack} width="100%" height="14" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                {ticks.map((t) => (
                  <line key={t} x1={`${(t / max) * 100}%`} x2={`${(t / max) * 100}%`} y1="0" y2="14" className={styles.hgrid} />
                ))}
                <rect x="0" y="3" height="8" width={`${pct}%`} fill={TONES[it.tone || "primary"]} className={styles.hbar} style={{ animationDelay: `${Math.min(i, 12) * 12}ms` }} />
              </svg>
              <div className={styles.hvalue}>{it.valueLabel}</div>
            </li>
          );
        })}
      </ol>
    </figure>
  );
}
