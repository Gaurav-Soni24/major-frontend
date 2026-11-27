/** URL <-> filter state for the Results page. Defaults are omitted from the URL to keep links short. */

export const STATUS_OPTIONS = ["all", "submitted", "in-progress", "graded"];
export const SORT_OPTIONS = ["newest", "score"];
export const TABS = ["submissions", "analytics"];
export const PAGE_SIZE = 20;

/** @param {{ get: (k: string) => string|null }} params */
export function parseFilters(params) {
  const pick = (k, allowed, fallback) => {
    const v = params.get(k);
    return allowed.includes(v) ? v : fallback;
  };
  const page = Number.parseInt(params.get("page") || "1", 10);
  return {
    tab: pick("tab", TABS, "submissions"),
    status: pick("status", STATUS_OPTIONS, "all"),
    sort: pick("sort", SORT_OPTIONS, "newest"),
    flagged: params.get("flagged") === "1",
    search: (params.get("q") || "").slice(0, 60),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/**
 * Serialise to a query string (no leading "?"), omitting defaults.
 * @param {{ tab?: string, status?: string, sort?: string, flagged?: boolean, search?: string, page?: number }} f
 */
export function buildQuery(f) {
  const q = new URLSearchParams();
  if (f.tab && f.tab !== "submissions") q.set("tab", f.tab);
  if (f.status && f.status !== "all") q.set("status", f.status);
  if (f.sort && f.sort !== "newest") q.set("sort", f.sort);
  if (f.flagged) q.set("flagged", "1");
  if (f.search) q.set("q", f.search);
  if (f.page && f.page > 1) q.set("page", String(f.page));
  return q.toString();
}

/** Params for `submissions.listQuizSubmissions`. @param {ReturnType<typeof parseFilters>} f @param {number} [limit] */
export function toApiParams(f, limit = PAGE_SIZE) {
  return { page: f.page, limit, status: f.status, flagged: f.flagged ? "true" : undefined, search: f.search, sort: f.sort };
}

/** True when any filter narrows the list. */
export const hasActiveFilters = (f) => f.status !== "all" || f.flagged || !!f.search;
