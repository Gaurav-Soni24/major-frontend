const DEFAULT_BASE = "http://localhost:5000/api";

/**
 * Normalise the API base URL so it works whether NEXT_PUBLIC_API_URL ends with "/api" or not.
 * "http://x:5000" -> "http://x:5000/api", "http://x/api/" -> "http://x/api".
 * @param {string|undefined|null} raw
 * @returns {string}
 */
export function normalizeBaseUrl(raw) {
  let url = String(raw ?? "").trim();
  if (!url) return DEFAULT_BASE;
  url = url.replace(/\/+$/, "");
  if (!/\/api$/i.test(url)) url += "/api";
  return url;
}

export const API_BASE_URL = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL);
