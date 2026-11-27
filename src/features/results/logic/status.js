/** Pure helpers that turn a submission document into what the results screens show. */

export const DONE_STATUSES = ["submitted", "graded"];

/** @param {any} sub */
export const isDone = (sub) => DONE_STATUSES.includes(sub?.status);

/**
 * Pass/fail against the quiz passing score. `null` when the attempt is not finished.
 * @param {any} sub @param {number} passingScore
 * @returns {boolean|null}
 */
export function passedOf(sub, passingScore) {
  if (!isDone(sub)) return null;
  const pct = Number(sub?.score?.percentage);
  if (!Number.isFinite(pct) || !Number.isFinite(Number(passingScore))) return null;
  return pct >= passingScore;
}

/**
 * Badges for one submission, in reading order. Each item is `{ key, status?, tone?, label }`
 * (`status` maps to a ui Badge preset, otherwise `tone` + `label`).
 * @param {any} sub
 */
export function statusBadges(sub) {
  const out = [];
  const s = sub?.status;
  if (s === "in-progress") out.push({ key: "in-progress", status: "in-progress", label: "In progress" });
  else if (s === "abandoned") out.push({ key: "abandoned", tone: "neutral", label: "Abandoned" });
  else if (s === "graded") out.push({ key: "graded", status: "graded", label: "Graded" });
  else if (s === "submitted") out.push({ key: "submitted", status: "submitted", label: "Submitted" });
  if (sub?.needsReview) out.push({ key: "needs-review", status: "needs-review", label: "Needs review" });
  if (sub?.antiCheat?.isFlagged) out.push({ key: "flagged", status: "flagged", label: "Flagged" });
  if (sub?.late) out.push({ key: "late", tone: "partial", label: "Late" });
  if (sub?.antiCheat?.wasAutoSubmitted) out.push({ key: "auto", tone: "neutral", label: "Auto-submitted" });
  return out;
}

/** Seconds between start and submit, or `null`. @param {any} sub */
export function durationSeconds(sub) {
  if (!sub?.startedAt || !sub?.submittedAt) return null;
  const ms = new Date(sub.submittedAt).getTime() - new Date(sub.startedAt).getTime();
  return Number.isFinite(ms) && ms >= 0 ? Math.round(ms / 1000) : null;
}

/** Strike counters for the list column. @param {any} sub */
export function strikeCounts(sub) {
  const a = sub?.antiCheat || {};
  return { tab: a.tabSwitches || 0, webcam: a.webcamStrikes || 0, copy: a.copyPasteAttempts || 0 };
}

/**
 * Usable `src` for a stored flag image, or `null` when the event has no photo
 * (the API stores the literal "NO_IMAGE" for flags without a snapshot; raw base64 without a data: prefix is accepted too).
 * @param {unknown} value
 */
export function flagImageSrc(value) {
  if (typeof value !== "string" || value === "" || value === "NO_IMAGE") return null;
  if (/^data:image\/(png|jpe?g|webp);base64,/i.test(value)) return value;
  if (/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return `data:image/jpeg;base64,${value}`;
  return null;
}
