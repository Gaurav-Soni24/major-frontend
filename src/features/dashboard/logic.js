/** Pure helpers for the teacher overview. No React, no browser APIs (unit tested in tests/dashboard-logic.test.js). */

/** @param {string|undefined|null} name @returns {string} first word of a display name, "" when none */
export function firstName(name) {
  return String(name || "").trim().split(/\s+/)[0] || "";
}

/** @param {number} hour 0-23 local hour @returns {string} */
export function greetingForHour(hour) {
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Round a maximum up to a "nice" axis maximum (at least 4 so tiny counts still get 4 gridlines). */
export function niceMax(max) {
  const m = Math.max(4, Math.ceil(Number(max) || 0));
  if (m <= 12) return Math.ceil(m / 4) * 4;
  const pow = 10 ** Math.floor(Math.log10(m));
  const step = [1, 2, 5, 10].map((s) => s * pow).find((s) => s * 4 >= m) || pow * 10;
  return Math.ceil(m / step) * step;
}

/** @param {number} axisMax @returns {number[]} 0..axisMax in 4 equal steps */
export function axisTicks(axisMax) {
  return [0, 1, 2, 3, 4].map((i) => (axisMax * i) / 4);
}

/**
 * Geometry for the 14-day grouped bar chart (attempts vs submitted), rendered at the real pixel width.
 * @param {Array<{ date: string, attempts: number, submitted: number }>} activity
 * @param {{ width: number, height?: number }} size
 */
export function chartModel(activity, { width, height = 220 }) {
  const margin = { top: 12, right: 8, bottom: 30, left: 34 };
  const innerW = Math.max(40, width - margin.left - margin.right);
  const innerH = height - margin.top - margin.bottom;
  const days = Array.isArray(activity) ? activity : [];
  const peak = days.reduce((m, d) => Math.max(m, d.attempts || 0, d.submitted || 0), 0);
  const axisMax = niceMax(peak);
  const slot = days.length ? innerW / days.length : innerW;
  const barW = Math.max(2, Math.min(14, (slot - 6) / 2));
  const y = (v) => margin.top + innerH - (innerH * (v || 0)) / axisMax;
  const bars = days.map((d, i) => {
    const cx = margin.left + slot * i + slot / 2;
    return {
      date: d.date,
      attempts: d.attempts || 0,
      submitted: d.submitted || 0,
      cx,
      slotX: margin.left + slot * i,
      slotW: slot,
      a: { x: cx - barW - 0.5, y: y(d.attempts), w: barW, h: margin.top + innerH - y(d.attempts) },
      s: { x: cx + 0.5, y: y(d.submitted), w: barW, h: margin.top + innerH - y(d.submitted) },
    };
  });
  return {
    width,
    height,
    margin,
    innerW,
    innerH,
    axisMax,
    empty: peak === 0,
    ticks: axisTicks(axisMax).map((v) => ({ value: v, y: y(v) })),
    bars,
    totals: days.reduce((t, d) => ({ attempts: t.attempts + (d.attempts || 0), submitted: t.submitted + (d.submitted || 0) }), { attempts: 0, submitted: 0 }),
  };
}

/** "27 Nov" for an ISO day key (UTC, matches the server's day buckets). */
export function dayLabel(key) {
  const d = new Date(`${key}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return key;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** Plain-language description of the chart for screen readers. */
export function describeActivity(activity) {
  const days = Array.isArray(activity) ? activity : [];
  const a = days.reduce((n, d) => n + (d.attempts || 0), 0);
  const s = days.reduce((n, d) => n + (d.submitted || 0), 0);
  if (!days.length || (a === 0 && s === 0)) return "No attempts in the last 14 days.";
  const top = days.reduce((best, d) => ((d.attempts || 0) > (best.attempts || 0) ? d : best), days[0]);
  return `${a} attempts started and ${s} submitted over the last ${days.length} days. Busiest day: ${dayLabel(top.date)} with ${top.attempts} attempts.`;
}

/**
 * "Needs your attention" items, derived only from fields the summary really has.
 * The summary has no "needs review" count, so review work is reached through each quiz's results page.
 * @param {any} summary result of dashboard.getDashboardSummary()
 * @returns {Array<{ id: string, tone: "wrong"|"partial"|"info", text: string, href: string, action: string }>}
 */
export function buildAttention(summary) {
  const items = [];
  if (!summary || !summary.totals) return items;
  const { totals, recentSubmissions = [], recentQuizzes = [] } = summary;

  const flaggedShown = recentSubmissions.filter((s) => s.isFlagged).slice(0, 3);
  for (const s of flaggedShown) {
    items.push({
      id: `flag-${s._id}`,
      tone: "wrong",
      text: `${s.name || s.email || "A student"} was flagged on "${s.quizTitle || "a quiz"}".`,
      href: `/dashboard/submissions/details/${s._id}`,
      action: "Review",
    });
  }
  const moreFlagged = (totals.flagged || 0) - flaggedShown.length;
  if (moreFlagged > 0) {
    items.push({
      id: "flagged-more",
      tone: "wrong",
      text: `${moreFlagged} ${flaggedShown.length ? "more " : ""}flagged ${moreFlagged === 1 ? "attempt" : "attempts"} across your quizzes.`,
      href: "/dashboard/quizzes",
      action: "Open quizzes",
    });
  }
  for (const q of recentQuizzes.filter((r) => r.isPublic && r.attempts === 0).slice(0, 2)) {
    items.push({
      id: `quiet-${q._id}`,
      tone: "info",
      text: `"${q.title}" is published but nobody has started it yet. Share its link with students.`,
      href: "/dashboard/quizzes?status=published",
      action: "Get link",
    });
  }
  if (totals.drafts > 0) {
    items.push({
      id: "drafts",
      tone: "partial",
      text: `${totals.drafts} ${totals.drafts === 1 ? "quiz is" : "quizzes are"} still a draft and cannot be opened by students.`,
      href: "/dashboard/quizzes?status=draft",
      action: "See drafts",
    });
  }
  if (totals.inProgress > 0) {
    items.push({
      id: "in-progress",
      tone: "info",
      text: `${totals.inProgress} ${totals.inProgress === 1 ? "attempt is" : "attempts are"} still in progress.`,
      href: "/dashboard/quizzes",
      action: "Open quizzes",
    });
  }
  return items;
}

/** @param {any} summary */
export function isFirstRun(summary) {
  return !!summary && !!summary.totals && summary.totals.quizzes === 0;
}

/**
 * Rows for the ledger strip. `fmt.percent` formats 0-100 values.
 * @param {any} totals
 * @param {{ percent: (n: number) => string }} fmt
 */
export function ledgerRows(totals, fmt) {
  const t = totals || {};
  const none = !t.submitted;
  return [
    { key: "quizzes", label: "Quizzes", value: String(t.quizzes ?? 0), hint: `${t.published ?? 0} published, ${t.drafts ?? 0} draft` },
    { key: "attempts", label: "Attempts", value: String(t.attempts ?? 0), hint: `${t.submitted ?? 0} submitted, ${t.inProgress ?? 0} in progress` },
    { key: "flagged", label: "Flagged", value: String(t.flagged ?? 0), hint: t.flagged ? "worth a look" : "none so far" },
    { key: "avg", label: "Average", value: none ? "—" : fmt.percent(t.avgPercentage), hint: none ? "no submissions yet" : "of submitted attempts" },
    { key: "pass", label: "Pass rate", value: none ? "—" : fmt.percent(t.passRate), hint: none ? "no submissions yet" : "at each quiz pass mark" },
  ];
}
