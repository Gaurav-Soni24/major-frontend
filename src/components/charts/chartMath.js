/** Axis maths for the SVG charts. */

/** Smallest "nice" number >= v from 1, 2, 2.5, 5, 10 x 10^n. */
export function niceCeil(v) {
  if (!(v > 0)) return 1;
  const exp = Math.floor(Math.log10(v));
  const f = v / 10 ** exp;
  const nice = [1, 2, 2.5, 5, 10].find((n) => f <= n + 1e-9);
  return nice * 10 ** exp;
}

/**
 * Y axis for counts: integer ticks from 0 to a nice max.
 * @param {number} maxValue @param {number} [target] roughly how many intervals
 * @returns {{ max: number, ticks: number[] }}
 */
export function countAxis(maxValue, target = 4) {
  const m = Math.max(1, Math.ceil(maxValue));
  if (m <= target) return { max: m, ticks: Array.from({ length: m + 1 }, (_, i) => i) };
  const step = Math.max(1, Math.ceil(niceCeil(m / target)));
  const max = Math.ceil(m / step) * step;
  const ticks = [];
  for (let t = 0; t <= max; t += step) ticks.push(t);
  return { max, ticks };
}

/** Linear scale factory. */
export const scaleLinear = (d0, d1, r0, r1) => (v) => (d1 === d0 ? r0 : r0 + ((v - d0) / (d1 - d0)) * (r1 - r0));
