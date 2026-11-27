"use client";

import { useState } from "react";
import { chartModel, dayLabel, describeActivity } from "./logic";
import { useElementWidth } from "./hooks";
import { pluralize } from "@/lib/utils/format";
import styles from "./ActivityChart.module.css";

/**
 * 14-day grouped bar chart: attempts started vs attempts submitted. Hand-built SVG, no chart library.
 * One keyboard stop on the plot: Left/Right/Home/End move between days, the tooltip and a polite live region follow.
 * A visually hidden table carries the same numbers for screen readers.
 * @param {{ activity: Array<{ date: string, attempts: number, submitted: number }> }} props
 */
export default function ActivityChart({ activity }) {
  const [ref, width] = useElementWidth(640);
  const [active, setActive] = useState(null);
  const model = chartModel(activity, { width, height: width < 480 ? 200 : 232 });
  const every = model.bars.length && model.bars[0].slotW < 30 ? 2 : 1;
  const current = active !== null ? model.bars[active] : null;
  const n = model.bars.length;

  /** @param {import("react").KeyboardEvent} e */
  function onKeyDown(e) {
    if (!n) return;
    let next = null;
    if (e.key === "ArrowRight") next = active === null ? 0 : Math.min(n - 1, active + 1);
    else if (e.key === "ArrowLeft") next = active === null ? n - 1 : Math.max(0, active - 1);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    else if (e.key === "Escape") next = null;
    else return;
    e.preventDefault();
    setActive(next);
  }

  const tipLeft = current ? Math.min(Math.max(current.cx, 80), width - 80) : 0;

  return (
    <div className={styles.root}>
      <ul className={styles.legend} role="list" aria-label="Legend">
        <li>
          <span className={`${styles.swatch} ${styles.swA}`} aria-hidden="true" /> Attempts started
        </li>
        <li>
          <span className={`${styles.swatch} ${styles.swS}`} aria-hidden="true" /> Submitted
        </li>
      </ul>

      <div
        ref={ref}
        className={styles.plot}
        tabIndex={0}
        role="group"
        aria-roledescription="chart"
        aria-label="Activity over the last 14 days. Use left and right arrow keys to read each day."
        onKeyDown={onKeyDown}
        onBlur={() => setActive(null)}
        onMouseLeave={() => setActive(null)}
      >
        <svg width={width} height={model.height} viewBox={`0 0 ${width} ${model.height}`} role="img" aria-label={describeActivity(activity)}>
          {model.ticks.map((t) => (
            <g key={t.value}>
              <line x1={model.margin.left} x2={width - model.margin.right} y1={t.y} y2={t.y} className={t.value === 0 ? styles.baseline : styles.grid} />
              <text x={model.margin.left - 8} y={t.y + 4} textAnchor="end" className={styles.tick}>
                {Number.isInteger(t.value) ? t.value : t.value.toFixed(1)}
              </text>
            </g>
          ))}

          {model.bars.map((b, i) => (
            <g key={b.date} onMouseEnter={() => setActive(i)}>
              <rect x={b.slotX} y={model.margin.top} width={b.slotW} height={model.innerH} className={i === active ? styles.hit : styles.hitIdle} />
              {b.attempts > 0 ? <rect x={b.a.x} y={b.a.y} width={b.a.w} height={b.a.h} className={styles.barA} /> : null}
              {b.submitted > 0 ? <rect x={b.s.x} y={b.s.y} width={b.s.w} height={b.s.h} className={styles.barS} /> : null}
              {i % every === 0 || i === n - 1 ? (
                <text x={b.cx} y={model.height - 10} textAnchor="middle" className={i === active ? styles.labelOn : styles.label}>
                  {i === 0 || b.date.endsWith("-01") ? dayLabel(b.date) : String(Number(b.date.slice(8)))}
                </text>
              ) : null}
            </g>
          ))}
        </svg>

        {current ? (
          <div className={styles.tip} style={{ left: tipLeft, top: 4 }} aria-hidden="true">
            <strong>{dayLabel(current.date)}</strong>
            <span>Started {current.attempts}</span>
            <span>Submitted {current.submitted}</span>
          </div>
        ) : null}

        {model.empty ? (
          <p className={styles.empty}>
            No attempts in the last 14 days.
            <span> Students show up here once they open a published quiz.</span>
          </p>
        ) : null}
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {current ? `${dayLabel(current.date)}: ${pluralize(current.attempts, "attempt")} started, ${current.submitted} submitted.` : ""}
      </p>

      <table className="sr-only">
        <caption>Attempts started and submitted per day, last 14 days</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Started</th>
            <th scope="col">Submitted</th>
          </tr>
        </thead>
        <tbody>
          {model.bars.map((b) => (
            <tr key={b.date}>
              <th scope="row">{dayLabel(b.date)}</th>
              <td>{b.attempts}</td>
              <td>{b.submitted}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
