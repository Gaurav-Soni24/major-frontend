import axios from "axios";
import { API_BASE_URL } from "./config.js";
import { toApiError } from "./errors.js";
import { session as defaultSession } from "../auth/storage.js";
import { loginUrl } from "../auth/redirect.js";

/**
 * Per-request options understood by the interceptors (pass them in the axios config):
 * - `public: true`          do not attach the teacher token and never treat a 401 as "session expired" (login, register, student calls)
 * - `studentToken: string`  sends `Authorization: Student <token>` (instead of the teacher Bearer token)
 * - `attemptToken: string`  sends `X-Attempt-Token`
 */

/** Default 401 handler: forget the session and go to /login?next=... (browser only). */
function redirectToLogin() {
  if (typeof window === "undefined") return;
  const { pathname, search } = window.location;
  if (pathname === "/login") return;
  window.location.assign(loginUrl(pathname + search));
}

/**
 * Create an axios client wired with auth headers and normalised errors.
 * Exported as a factory so tests can inject a fake session, adapter and 401 handler.
 * @param {{ baseURL?: string, session?: ReturnType<typeof import("../auth/storage.js").createSessionStore>, onUnauthorized?: () => void, adapter?: any, timeout?: number }} [options]
 */
export function createApiClient({ baseURL = API_BASE_URL, session = defaultSession, onUnauthorized, adapter, timeout = 30000 } = {}) {
  const instance = axios.create({ baseURL, timeout, headers: { Accept: "application/json" }, ...(adapter ? { adapter } : {}) });

  instance.interceptors.request.use((config) => {
    const c = /** @type {any} */ (config);
    if (c.studentToken) config.headers.set("Authorization", `Student ${c.studentToken}`);
    else if (!c.public) {
      const token = session.getToken();
      if (token) {
        config.headers.set("Authorization", `Bearer ${token}`);
        c.sentTeacherToken = true;
      }
    }
    if (c.attemptToken) config.headers.set("X-Attempt-Token", c.attemptToken);
    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      const apiError = toApiError(error);
      const c = /** @type {any} */ (error && error.config) || {};
      if (apiError.status === 401 && c.sentTeacherToken) {
        session.clear();
        (onUnauthorized || redirectToLogin)();
      }
      return Promise.reject(apiError);
    },
  );

  return instance;
}

/** Shared client used by all `lib/api/*` modules. */
export const api = createApiClient();

/**
 * Per-request config for student calls (no teacher token, no session redirect).
 * @param {string|null|undefined} studentToken from `verifyGoogle`
 * @param {string|null|undefined} [attemptToken] from `startAttempt`
 */
export function studentConfig(studentToken, attemptToken) {
  return { public: true, studentToken: studentToken || undefined, attemptToken: attemptToken || undefined };
}

/** Config marker for unauthenticated calls. */
export const PUBLIC = Object.freeze({ public: true });

/**
 * Run a request and return `response.data`. Rejections are always ApiError.
 * @template T
 * @param {Promise<{data:T}>} promise
 * @returns {Promise<T>}
 */
export async function unwrap(promise) {
  const res = await promise;
  return res.data;
}
