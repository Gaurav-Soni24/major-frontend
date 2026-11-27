"use client";

import BarChart from "./BarChart";

const TONE = { below: "wrong", above: "correct", mixed: "primary" };

/**
 * Score distribution: ten 10-point buckets with a pass-mark marker.
 * `bars` come from `histogramBars()` (features/results/logic/analytics).
 *
 * @param {{ bars: Array<{ key: string, label: string, count: number, from: number, to: number, state: "below"|"above"|"mixed" }>, marker: number|null, passingScore: number, total: number }} props
 */
export default function Histogram({ bars, marker, passingScore, total }) {
  const items = bars.map((b) => ({
    key: b.key,
    label: b.label,
    value: b.count,
    tone: TONE[b.state],
    tooltip: `${b.from}-${b.to}%: ${b.count} ${b.count === 1 ? "student" : "students"} (${b.state === "below" ? "below" : b.state === "above" ? "at or above" : "straddles"} the pass mark)`,
  }));
  const description = `${total} finished attempts in ten score ranges. ${items.map((i) => `${i.label} percent: ${i.value}`).join("; ")}. Pass mark ${passingScore} percent.`;
  return (
    <BarChart
      items={items}
      title="Score distribution"
      description={description}
      yLabel="Students"
      xLabel="Score (% of total marks)"
      marker={marker === null ? null : { at: marker, label: `Pass ${passingScore}%` }}
      legend={[
        { tone: "wrong", label: "Below pass mark" },
        { tone: "correct", label: "At or above pass mark" },
        ...(bars.some((b) => b.state === "mixed") ? [{ tone: "primary", label: "Contains the pass mark" }] : []),
      ]}
    />
  );
}
