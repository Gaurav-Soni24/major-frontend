/** Shapes the analytics response for the charts. */

/**
 * Ten histogram bars with the passing-score marker position (0-10 on the bar axis).
 * @param {Array<{ range: string, count: number }>} distribution
 * @param {number} passingScore percent
 */
export function histogramBars(distribution, passingScore) {
  const bars = (distribution || []).map((d, i) => {
    const from = i * 10;
    const to = i === 9 ? 100 : from + 9;
    return { key: d.range, label: d.range, from, to, count: Number(d.count) || 0, state: to < passingScore ? "below" : from >= passingScore ? "above" : "mixed" };
  });
  const marker = Number.isFinite(passingScore) ? Math.min(10, Math.max(0, passingScore / 10)) : null;
  return { bars, marker };
}

/**
 * Question rows for the table. "hardest" = lowest correct rate first (questions nobody answered go last).
 * @param {Array<any>} questions @param {"order"|"hardest"} mode
 */
export function orderQuestions(questions, mode) {
  const list = (questions || []).map((q, i) => ({ ...q, number: (Number.isInteger(q.index) ? q.index : i) + 1 }));
  if (mode === "hardest") {
    list.sort((a, b) => {
      const an = a.answered > 0 ? 0 : 1;
      const bn = b.answered > 0 ? 0 : 1;
      return an - bn || a.correctRate - b.correctRate || a.number - b.number;
    });
  }
  return list;
}

/** correctRate is 0-100 in the API. Returns text like "62.5%". */
export const rateText = (v) => `${Math.round((Number(v) || 0) * 10) / 10}%`;

export const typeLabel = (t) => ({ single: "Single choice", multiple: "Multiple choice", text: "Text", integer: "Number", code: "Code" })[t] || t;
