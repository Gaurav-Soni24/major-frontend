/** Pure helpers for the quizzes list (unit tested in tests/quizzes-list-logic.test.js). */

export const STATUSES = ["all", "published", "draft"];
export const SORTS = ["newest", "oldest", "title"];
export const PAGE_SIZE = 10;

/**
 * Read list state from URLSearchParams (or anything with `get`). Unknown values fall back to defaults.
 * @param {{ get: (k: string) => string|null }} params
 */
export function parseListQuery(params) {
  const q = (params.get("q") || "").slice(0, 80);
  const rawStatus = params.get("status") || "";
  const rawSort = params.get("sort") || "";
  const status = STATUSES.includes(rawStatus) ? rawStatus : "all";
  const sort = SORTS.includes(rawSort) ? rawSort : "newest";
  const page = Math.max(1, Math.floor(Number(params.get("page"))) || 1);
  return { q, status, sort, page };
}

/**
 * Query string without defaults ("" when everything is default).
 * @param {{ q: string, status: string, sort: string, page: number }} s
 */
export function buildListQuery(s) {
  const p = new URLSearchParams();
  if (s.q.trim()) p.set("q", s.q.trim());
  if (s.status !== "all") p.set("status", s.status);
  if (s.sort !== "newest") p.set("sort", s.sort);
  if (s.page > 1) p.set("page", String(s.page));
  const out = p.toString();
  return out ? `?${out}` : "";
}

/** Parameters for `quizzes.listMyQuizzes`. @param {{ q: string, status: string, sort: string, page: number }} s */
export function toApiParams(s) {
  return { page: s.page, limit: PAGE_SIZE, search: s.q.trim(), status: s.status, sort: s.sort };
}

/** Is any filter (not sort or page) active? @param {{ q: string, status: string }} s */
export function hasFilters(s) {
  return !!s.q.trim() || s.status !== "all";
}

/** Optimistically set `isPublic` on one quiz. Returns a new array. */
export function withPublished(list, id, isPublic) {
  return list.map((q) => (q._id === id ? { ...q, isPublic, status: isPublic ? "published" : "draft" } : q));
}

/** The link students open. @param {string} origin @param {string} id */
export function studentLink(origin, id) {
  return `${String(origin || "").replace(/\/$/, "")}/attempt/${id}`;
}

/** Sentence for the delete confirmation, from the row's real stats. */
export function deleteImpact(stats) {
  const n = (stats && stats.attempts) || 0;
  if (n === 0) return "No student has attempted it, so only the quiz itself is deleted.";
  const parts = [];
  if (stats.submitted) parts.push(`${stats.submitted} submitted`);
  if (stats.inProgress) parts.push(`${stats.inProgress} in progress`);
  const detail = parts.length ? ` (${parts.join(", ")})` : "";
  return `This also permanently deletes ${n} ${n === 1 ? "attempt" : "attempts"}${detail} with their scores and flagged snapshots.`;
}

/** Message shown when publishing is refused by the server. @param {any} err ApiError */
export function publishFailureMessage(err) {
  const base = (err && err.message) || "Could not change the publish status.";
  if (err && (err.status === 400 || err.status === 409 || err.code === "VALIDATION_ERROR")) {
    const first = err.details && err.details[0] && err.details[0].message;
    return first && !base.includes(first) ? `${base} ${first}` : `${base} Open the quiz in the editor to fix it.`;
  }
  return base;
}
