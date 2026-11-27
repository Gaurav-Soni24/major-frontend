/**
 * Only allow same-site relative paths as a post-login destination (prevents open redirects).
 * @param {string|null|undefined} next
 * @param {string} [fallback]
 * @returns {string}
 */
export function safeNext(next, fallback = "/dashboard") {
  if (typeof next !== "string") return fallback;
  const v = next.trim();
  if (!v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\") || /[\u0000-\u001f]/.test(v)) return fallback;
  if (v === "/login" || v.startsWith("/login?") || v.startsWith("/register")) return fallback;
  return v;
}

/**
 * Build the login URL for a protected page.
 * @param {string} [path] current path including query string
 */
export function loginUrl(path) {
  const safe = safeNext(path, "");
  return safe ? `/login?next=${encodeURIComponent(safe)}` : "/login";
}
