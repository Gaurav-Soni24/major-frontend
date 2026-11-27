"use client";

import { useId, useState } from "react";
import { countAxis, scaleLinear } from "./chartMath";
import { useChartWidth } from "./useChartWidth";
import styles from "./charts.module.css";

const TONES = { primary: "var(--primary)", correct: "var(--correct)", wrong: "var(--wrong)", partial: "var(--partial)", muted: "var(--ink-3)" };

/**
 * Vertical bar chart drawn in SVG at its real pixel width (text never shrinks).
 * Bars are keyboard focusable and show a tooltip on hover and focus. The figure carries a text alternative.
 * `marker` draws a vertical reference line at a position on the bar axis (0..items.length, e.g. the pass mark).
 *
 * @param {{
 *   items: Array<{ key: string, label: string, value: number, tone?: keyof typeof TONES, tooltip?: string }>,
 *   title: string,
 *   description: string,
 *   yLabel?: string,
 *   xLabel?: string,
 *   marker?: { at: number, label: string } | null,
 *   height?: number,
 *   legend?: Array<{ tone: keyof typeof TONES, label: string }>,
 * }} props
 */
export default function BarChart({ items, title, description, yLabel = "Count", xLabel, marker = null, height = 260, legend }) {
  const uid = useId();
  const [wrapRef, width] = useChartWidth();
  const [tip, setTip] = useState(null);

  const M = { top: 30, right: 12, bottom: xLabel ? 48 : 30, left: 44 };
  const innerW = width - M.left - M.right;
  const innerH = height - M.top - M.bottom;
  const axis = countAxis(Math.max(0, ...items.map((i) => i.value)));
  const y = scaleLinear(0, axis.max, innerH, 0);
  const band = innerW / Math.max(1, items.length);
  const barW = Math.max(6, Math.min(56, band * 0.64));
  const skip = band < 34 ? Math.ceil(34 / band) : 1; // thin out x labels on narrow charts

  function show(i, el) {
    const box = el.getBoundingClientRect();
    const host = wrapRef.current.getBoundingClientRect();
    setTip({ i, x: box.left - host.left + box.width / 2, y: box.top - host.top });
  }

  return (
    <figure className={styles.figure} ref={wrapRef} aria-labelledby={`${uid}t`} aria-describedby={`${uid}d`}>
      <figcaption className="sr-only">
        <span id={`${uid}t`}>{title}</span>
        <span id={`${uid}d`}>{description}</span>
      </figcaption>
      <svg width={width} height={height} className={styles.svg} role="group" aria-label={title}>
        <g transform={`translate(${M.left},${M.top})`}>
          {axis.ticks.map((t) => (
            <g key={t}>
              <line x1={0} x2={innerW} y1={y(t)} y2={y(t)} className={t === 0 ? styles.baseline : styles.grid} />
              <text x={-8} y={y(t)} dy="0.32em" textAnchor="end" className={styles.tick}>
                {t}
              </text>
            </g>
          ))}
          <text x={-M.left + 2} y={-18} className={styles.axisTitle}>
            {yLabel}
          </text>
          {items.map((it, i) => {
            const h = innerH - y(it.value);
            const x = i * band + (band - barW) / 2;
            const label = it.tooltip || `${it.label}: ${it.value}`;
            return (
              <g key={it.key}>
                {/* wide invisible hit area so thin or empty bars are still easy to target */}
                <rect x={i * band} y={0} width={band} height={innerH} fill="transparent" onMouseEnter={(e) => show(i, e.currentTarget)} onMouseLeave={() => setTip(null)} />
                <rect
                  x={x}
                  y={y(it.value)}
                  width={barW}
                  height={Math.max(it.value > 0 ? 1 : 0, h)}
                  fill={TONES[it.tone || "primary"]}
                  className={styles.bar}
                  style={{ animationDelay: `${Math.min(i, 12) * 12}ms` }}
                  tabIndex={0}
                  role="img"
                  aria-label={label}
                  onFocus={(e) => show(i, e.currentTarget)}
                  onBlur={() => setTip(null)}
                  onMouseEnter={(e) => show(i, e.currentTarget)}
                  onMouseLeave={() => setTip(null)}
                  onKeyDown={(e) => e.key === "Escape" && setTip(null)}
                />
                {it.value > 0 && band >= 34 ? (
                  <text x={i * band + band / 2} y={y(it.value) - 5} textAnchor="middle" className={styles.valueLabel}>
                    {it.value}
                  </text>
                ) : null}
                {i % skip === 0 ? (
                  <text x={i * band + band / 2} y={innerH + 18} textAnchor="middle" className={styles.tick}>
                    {it.label}
                  </text>
                ) : null}
              </g>
            );
          })}
          {marker && marker.at >= 0 && marker.at <= items.length ? (
            <g pointerEvents="none">
              <line x1={marker.at * band} x2={marker.at * band} y1={-8} y2={innerH} className={styles.marker} />
              <text x={marker.at * band + (marker.at > items.length - 3 ? -6 : 6)} y={-12} textAnchor={marker.at > items.length - 3 ? "end" : "start"} className={styles.markerLabel}>
                {marker.label}
              </text>
            </g>
          ) : null}
          {xLabel ? (
            <text x={innerW / 2} y={innerH + 40} textAnchor="middle" className={styles.axisTitle}>
              {xLabel}
            </text>
          ) : null}
        </g>
      </svg>
      {legend ? (
        <ul className={styles.legend} aria-label="Legend">
          {legend.map((l) => (
            <li key={l.label}>
              <span className={styles.swatch} style={{ background: TONES[l.tone] }} aria-hidden="true" />
              {l.label}
            </li>
          ))}
        </ul>
      ) : null}
      {tip ? (
        <div className={styles.tip} style={{ left: tip.x, top: tip.y }} role="presentation">
          {items[tip.i].tooltip || `${items[tip.i].label}: ${items[tip.i].value}`}
        </div>
      ) : null}
    </figure>
  );
}
