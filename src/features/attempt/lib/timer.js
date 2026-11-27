/**
 * Time. The server is the authority: a clock is anchored to the server's `serverTime` with a
 * monotonic reading (performance.now by default), so changing the device clock or time zone does
 * not move the deadline. Every autosave response re-anchors it.
 */

/** @param {{ nowFn?: () => number }} [opts] nowFn must be monotonic (default performance.now) */
export function createServerClock({ nowFn } = {}) {
  const mono = nowFn || (() => (typeof performance !== "undefined" ? performance.now() : Date.now()));
  let serverAtAnchor = null;
  let monoAtAnchor = 0;
  return {
    /** Anchor to a server timestamp (ISO string or ms). Ignores unparsable input. */
    sync(serverTime) {
      const ms = typeof serverTime === "number" ? serverTime : Date.parse(serverTime);
      if (!Number.isFinite(ms)) return false;
      serverAtAnchor = ms;
      monoAtAnchor = mono();
      return true;
    },
    /** Server time now in ms (falls back to the device clock until synced). */
    now() {
      return serverAtAnchor === null ? Date.now() : serverAtAnchor + (mono() - monoAtAnchor);
    },
    get synced() {
      return serverAtAnchor !== null;
    },
  };
}

/** Whole seconds left (rounded up, never negative); null when the quiz is untimed. */
export function remainingSeconds(deadlineAt, serverNowMs) {
  if (deadlineAt === null || deadlineAt === undefined || deadlineAt === "") return null;
  const d = typeof deadlineAt === "number" ? deadlineAt : Date.parse(deadlineAt);
  if (!Number.isFinite(d)) return null;
  return Math.max(0, Math.ceil((d - serverNowMs) / 1000));
}

export const ANNOUNCE_AT = [300, 60, 30];

/**
 * Spoken thresholds: returns the threshold (300, 60 or 30) crossed between two readings, or null.
 * Crossing several at once (a long background pause) announces the smallest one reached.
 */
export function crossedThreshold(prev, next, thresholds = ANNOUNCE_AT) {
  if (prev === null || prev === undefined || next === null || next === undefined) return null;
  const hit = thresholds.filter((t) => prev > t && next <= t);
  return hit.length ? Math.min(...hit) : null;
}

/** Text read out by the polite live region. */
export function announcementFor(threshold) {
  if (threshold === 300) return "5 minutes remaining.";
  if (threshold === 60) return "1 minute remaining.";
  if (threshold === 30) return "30 seconds remaining.";
  return "";
}

/** Visual emphasis only (the number is always shown as text). */
export function timerTone(seconds) {
  if (seconds === null || seconds === undefined) return "none";
  if (seconds <= 60) return "urgent";
  if (seconds <= 300) return "soon";
  return "normal";
}
