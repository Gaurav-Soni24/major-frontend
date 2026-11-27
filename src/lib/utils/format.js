/** Pure formatting helpers. Locale is fixed to en-IN and dates use UTC so output is stable in tests. */

const LOCALE = "en-IN";
const DASH = "—";

/**
 * @param {number} count
 * @param {string} singular
 * @param {string} [plural]
 * @returns {string} e.g. "1 question", "3 questions"
 */
export function pluralize(count, singular, plural) {
  const n = Number(count) || 0;
  return `${n} ${n === 1 ? singular : plural || `${singular}s`}`;
}

/** @param {unknown} value @returns {Date|null} */
function toDate(value) {
  if (value === null || value === undefined || value === "") return null;
  const d = value instanceof Date ? value : new Date(/** @type {any} */ (value));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** @returns {string} "27 Nov 2026", or a dash for invalid input */
export function formatDate(value) {
  const d = toDate(value);
  if (!d) return DASH;
  return d.toLocaleDateString(LOCALE, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** @returns {string} "27 Nov 2026, 14:02" in UTC */
export function formatDateTime(value) {
  const d = toDate(value);
  if (!d) return DASH;
  const time = d.toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });
  return `${formatDate(d)}, ${time}`;
}

/** Local-time clock "14:02:11" (used for the autosave indicator). */
export function formatClock(value) {
  const d = toDate(value);
  if (!d) return DASH;
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/**
 * Relative time ("5 min ago"). `now` is injectable for tests.
 * @param {string|number|Date} value
 * @param {number} [now]
 */
export function formatRelative(value, now = Date.now()) {
  const d = toDate(value);
  if (!d) return DASH;
  const diff = Math.round((now - d.getTime()) / 1000);
  if (diff < 45) return "just now";
  if (diff < 90) return "1 min ago";
  const min = Math.round(diff / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day} d ago`;
  return formatDate(d);
}

/**
 * Seconds to a clock. 75 -> "1:15", 3725 -> "1:02:05".
 * @param {number} totalSeconds
 */
export function formatTimer(totalSeconds) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${p(m)}:${p(sec)}` : `${m}:${p(sec)}`;
}

/**
 * Human duration. 75 -> "1 min 15 s", 7200 -> "2 h".
 * @param {number} totalSeconds
 */
export function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.round(Number(totalSeconds) || 0));
  if (s < 60) return `${s} s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts = [];
  if (h) parts.push(`${h} h`);
  if (m) parts.push(`${m} min`);
  if (sec && !h) parts.push(`${sec} s`);
  return parts.join(" ");
}

/**
 * Percent with at most one decimal and no trailing ".0".
 * @param {number} value 0-100
 */
export function formatPercent(value) {
  const n = Number(value);
  if (value === null || value === undefined || !Number.isFinite(n)) return DASH;
  return `${Math.round(n * 10) / 10}%`;
}

/**
 * Marks in the printed-bracket style: 2 -> "[2]", 0.5 -> "[0.5]".
 * @param {number} marks
 */
export function formatMarks(marks) {
  const n = Number(marks);
  if (marks === null || marks === undefined || !Number.isFinite(n)) return `[${DASH}]`;
  return `[${Math.round(n * 100) / 100}]`;
}

/** Zero padded question number: 1 -> "01". */
export function formatQuestionNumber(n) {
  return String(Math.max(0, Math.floor(Number(n) || 0))).padStart(2, "0");
}

/** "42 / 60" */
export function formatScore(obtained, total) {
  const f = (n) => Math.round((Number(n) || 0) * 100) / 100;
  return `${f(obtained)} / ${f(total)}`;
}
