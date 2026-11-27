/**
 * Normalised API failure. Every function in `lib/api/*` rejects with an ApiError, never a raw axios error.
 * - `status`  HTTP status, or 0 when the server could not be reached.
 * - `code`    machine code from the contract (VALIDATION_ERROR, WRONG_PASSWORD...) or a client code (NETWORK_ERROR, TIMEOUT, CANCELED, UNKNOWN).
 * - `message` text that is safe to show to a person.
 * - `details` per-field problems `[{ field, message }]` (empty array when none).
 */
export class ApiError extends Error {
  /**
   * @param {{status?:number, code?:string, message?:string, details?:Array<{field?:string,message:string}>}} [init]
   */
  constructor({ status = 0, code = "UNKNOWN", message = "Something went wrong. Please try again.", details = [] } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** Map of field -> first message, handy for inline form errors. */
  get fieldErrors() {
    /** @type {Record<string,string>} */
    const map = {};
    for (const d of this.details) {
      if (d && d.field && !(d.field in map)) map[d.field] = d.message;
    }
    return map;
  }
}

const STATUS_CODES = {
  400: "VALIDATION_ERROR",
  401: "UNAUTHENTICATED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  410: "ATTEMPT_EXPIRED",
  413: "PAYLOAD_TOO_LARGE",
  429: "RATE_LIMITED",
};

const STATUS_MESSAGES = {
  401: "Your session has ended. Please sign in again.",
  403: "You do not have permission to do that.",
  404: "We could not find that.",
  413: "That is too large to send.",
  429: "Too many attempts. Wait a moment and try again.",
};

/** @param {unknown} raw */
function normaliseDetails(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((d) => {
      if (typeof d === "string") return { message: d };
      if (d && typeof d === "object") {
        const message = d.message ?? d.msg;
        if (typeof message === "string") return { field: typeof d.field === "string" ? d.field : d.param, message };
      }
      return null;
    })
    .filter(Boolean);
}

/**
 * Convert anything thrown by axios (or elsewhere) into an ApiError.
 * Understands the contract shape `{ success:false, code, message, details }` and the old `{ success:false, message }` / `{ error }` shapes.
 * @param {any} err
 * @returns {ApiError}
 */
export function toApiError(err) {
  if (err instanceof ApiError) return err;

  const response = err && err.response;
  if (response) {
    const status = Number(response.status) || 0;
    const data = response.data && typeof response.data === "object" ? response.data : {};
    const message =
      (typeof data.message === "string" && data.message) ||
      (typeof data.error === "string" && data.error) ||
      STATUS_MESSAGES[status] ||
      (status >= 500 ? "The server had a problem. Please try again in a moment." : "Something went wrong. Please try again.");
    const code = (typeof data.code === "string" && data.code) || STATUS_CODES[status] || (status >= 500 ? "INTERNAL" : "UNKNOWN");
    return new ApiError({ status, code, message, details: normaliseDetails(data.details ?? data.errors) });
  }

  if (err && err.code === "ERR_CANCELED") {
    return new ApiError({ status: 0, code: "CANCELED", message: "Request cancelled." });
  }

  if (err && (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT")) {
    return new ApiError({ status: 0, code: "TIMEOUT", message: "The server took too long to respond. Please try again." });
  }

  if (err && (err.request || err.code === "ERR_NETWORK" || err.message === "Network Error")) {
    return new ApiError({
      status: 0,
      code: "NETWORK_ERROR",
      message: "Could not reach the server. Check your connection and try again.",
    });
  }

  return new ApiError({ message: (err && typeof err.message === "string" && err.message) || undefined });
}

/** @param {unknown} e @returns {boolean} */
export function isApiError(e) {
  return e instanceof ApiError;
}
