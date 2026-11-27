/**
 * Public surface of the API layer. Screens should import from here:
 *   import { quizzes, submissions, ApiError } from "@/lib/api";
 */
import * as auth from "./auth.js";
import * as quizzes from "./quizzes.js";
import * as submissions from "./submissions.js";
import * as dashboard from "./dashboard.js";
import * as ai from "./ai.js";

export { auth, quizzes, submissions, dashboard, ai };
export { ApiError, isApiError, toApiError } from "./errors.js";
export { API_BASE_URL, normalizeBaseUrl } from "./config.js";
export { api, createApiClient, studentConfig } from "./client.js";
