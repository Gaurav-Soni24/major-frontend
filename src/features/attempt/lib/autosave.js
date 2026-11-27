/**
 * Autosave queue for the student player. Pure logic: the network call (`send`) and timers
 * (`scheduler`) are injected, so it is tested with fakes.
 *
 * Behaviour
 * - `set(questionId, value)` coalesces: only the latest value per question is ever sent.
 * - Saves go out after `debounceMs` of quiet, and a heartbeat every `heartbeatMs` keeps the
 *   server clock and connection fresh even with no changes.
 * - One request at a time (ordering); edits made while a request is in flight stay queued and
 *   go out right after it.
 * - A failed request keeps everything queued and retries with backoff. status 0 means offline.
 * - 409 / 410 / invalid attempt token are fatal: queue stops and `onFatal(err)` is called.
 * - Counters (anti-cheat) only ever go up and ride along with answers.
 */

export const DEFAULT_BACKOFF = [1000, 2000, 4000, 8000, 15000];
const FATAL_CODES = new Set(["ALREADY_SUBMITTED", "ATTEMPT_EXPIRED", "ATTEMPT_TOKEN_INVALID", "STUDENT_TOKEN_INVALID"]);

export function isFatalSaveError(err) {
  if (!err) return false;
  return err.status === 409 || err.status === 410 || FATAL_CODES.has(err.code) || err.status === 401;
}

const COUNTER_KEYS = ["tabSwitches", "webcamStrikes", "copyPasteAttempts"];

/**
 * @param {{
 *   send: (body: { answers: Array<{questionId:string,userAnswer:any}>, antiCheat: Record<string, any> }) => Promise<any>,
 *   scheduler?: { setTimeout: (fn: () => void, ms: number) => any, clearTimeout: (h: any) => void },
 *   debounceMs?: number, heartbeatMs?: number, backoff?: number[],
 *   initialCounters?: Record<string, number>,
 *   onStatus?: (s: { state: "idle"|"saving"|"saved"|"offline"|"error", savedAt: number|null, retryInMs?: number|null }) => void,
 *   onResponse?: (res: any) => void,
 *   onFatal?: (err: any) => void,
 *   now?: () => number,
 * }} opts
 */
export function createAutosaver({
  send,
  scheduler = { setTimeout: (fn, ms) => setTimeout(fn, ms), clearTimeout: (h) => clearTimeout(h) },
  debounceMs = 1500,
  heartbeatMs = 20000,
  backoff = DEFAULT_BACKOFF,
  initialCounters = {},
  onStatus = () => {},
  onResponse = () => {},
  onFatal = () => {},
  now = () => Date.now(),
} = /** @type {any} */ ({})) {
  /** @type {Map<string, { value: any, version: number }>} */
  const pending = new Map();
  let version = 0;
  const counters = { tabSwitches: 0, webcamStrikes: 0, copyPasteAttempts: 0 };
  const flags = {}; // booleans such as identitySwapDetected
  let counterVersion = 0;
  let sentCounterVersion = 0;
  let inflight = false;
  let failures = 0;
  let stopped = false;
  let held = false;
  let inflightPromise = null;
  let debounceTimer = null;
  let retryTimer = null;
  let heartbeatTimer = null;
  let idleWaiters = [];
  let status = { state: "idle", savedAt: null, retryInMs: null };

  const emit = (patch) => {
    status = { ...status, ...patch };
    onStatus({ ...status });
  };

  const clear = (h) => {
    if (h !== null) scheduler.clearTimeout(h);
    return null;
  };

  const mergeCounters = (c) => {
    let changed = false;
    for (const k of COUNTER_KEYS) {
      if (Number.isFinite(c && c[k]) && c[k] > counters[k]) {
        counters[k] = c[k];
        changed = true;
      }
    }
    for (const [k, v] of Object.entries(c || {})) {
      if (!COUNTER_KEYS.includes(k) && typeof v === "boolean" && v && !flags[k]) {
        flags[k] = true;
        changed = true;
      }
    }
    return changed;
  };
  mergeCounters(initialCounters);
  // Initial counters came from the server: nothing to send for them.

  const hasWork = () => pending.size > 0 || counterVersion !== sentCounterVersion;

  const notifyIdle = () => {
    if (inflight || hasWork()) return;
    const w = idleWaiters;
    idleWaiters = [];
    w.forEach((fn) => fn(true));
  };

  const scheduleHeartbeat = () => {
    heartbeatTimer = clear(heartbeatTimer);
    if (stopped || heartbeatMs <= 0) return;
    heartbeatTimer = scheduler.setTimeout(() => {
      heartbeatTimer = null;
      if (stopped) return;
      if (!inflight && retryTimer === null && !held) flush({ force: true });
      scheduleHeartbeat();
    }, heartbeatMs);
  };

  const scheduleDebounce = (ms = debounceMs) => {
    debounceTimer = clear(debounceTimer);
    if (stopped) return;
    debounceTimer = scheduler.setTimeout(() => {
      debounceTimer = null;
      flush();
    }, ms);
  };

  async function flush({ force = false } = {}) {
    if (stopped || held) return;
    debounceTimer = clear(debounceTimer);
    if (inflight) return; // the completion handler re-checks the queue
    if (!force && !hasWork()) {
      notifyIdle();
      return;
    }
    retryTimer = clear(retryTimer);

    const sentEntries = Array.from(pending.entries()).map(([questionId, e]) => ({ questionId, userAnswer: e.value, version: e.version }));
    const sentCv = counterVersion;
    const body = {
      answers: sentEntries.map(({ questionId, userAnswer }) => ({ questionId, userAnswer })),
      antiCheat: { ...counters, ...flags },
    };

    inflight = true;
    if (sentEntries.length || counterVersion !== sentCounterVersion) emit({ state: "saving", retryInMs: null });
    try {
      const call = send(body);
      inflightPromise = Promise.resolve(call).then(() => {}, () => {});
      const res = await call;
      inflight = false;
      failures = 0;
      for (const e of sentEntries) {
        const cur = pending.get(e.questionId);
        if (cur && cur.version === e.version) pending.delete(e.questionId);
      }
      sentCounterVersion = Math.max(sentCounterVersion, sentCv);
      const savedAt = res && res.savedAt ? Date.parse(res.savedAt) || now() : now();
      if (hasWork()) emit({ state: "saving", savedAt, retryInMs: null });
      else emit({ state: "saved", savedAt, retryInMs: null });
      try {
        onResponse(res);
      } catch {
        /* a UI callback must never break saving */
      }
      if (hasWork() && !stopped) scheduleDebounce(0);
      notifyIdle();
    } catch (err) {
      inflight = false;
      if (isFatalSaveError(err)) {
        stopped = true;
        debounceTimer = clear(debounceTimer);
        retryTimer = clear(retryTimer);
        heartbeatTimer = clear(heartbeatTimer);
        idleWaiters.splice(0).forEach((fn) => fn(false));
        onFatal(err);
        return;
      }
      failures += 1;
      const wait = backoff[Math.min(failures - 1, backoff.length - 1)];
      emit({ state: err && err.status === 0 ? "offline" : "error", retryInMs: wait });
      if (!stopped) {
        retryTimer = scheduler.setTimeout(() => {
          retryTimer = null;
          flush({ force: true });
        }, wait);
      }
    }
  }

  scheduleHeartbeat();

  return {
    /** Record the current value for a question (null clears it). */
    set(questionId, value) {
      if (stopped) return;
      version += 1;
      pending.set(String(questionId), { value, version });
      emit({ state: "saving", retryInMs: status.retryInMs });
      if (retryTimer === null) scheduleDebounce();
    },
    /** Raise anti-cheat counters (monotonic). Sent right away. */
    setCounters(c) {
      if (stopped) return;
      if (mergeCounters(c)) {
        counterVersion += 1;
        if (retryTimer === null) flush();
      }
    },
    /** Send now (question change, tab hidden, before submit). */
    flush: () => flush(),
    /**
     * Stop sending (before the final submit) and wait for a request already on the wire to finish,
     * so a late autosave can never arrive after the submit and come back as a conflict.
     */
    hold() {
      held = true;
      debounceTimer = clear(debounceTimer);
      retryTimer = clear(retryTimer);
      return inflightPromise && inflight ? inflightPromise : Promise.resolve();
    },
    /** Undo `hold()` (the submit failed): queued work goes out again. */
    release() {
      held = false;
      if (!stopped && hasWork()) scheduleDebounce(0);
    },
    /** The browser came back online: retry immediately instead of waiting out the backoff. */
    online() {
      if (stopped) return;
      if (retryTimer !== null) {
        retryTimer = clear(retryTimer);
        flush({ force: true });
      }
    },
    /** Resolves true when everything is saved, false on timeout or a fatal error. */
    drain(timeoutMs = 4000) {
      if (!inflight && !hasWork()) return Promise.resolve(true);
      flush();
      return new Promise((resolve) => {
        let done = false;
        const finish = (v) => {
          if (done) return;
          done = true;
          scheduler.clearTimeout(t);
          resolve(v);
        };
        const t = scheduler.setTimeout(() => finish(false), timeoutMs);
        idleWaiters.push(finish);
      });
    },
    /** Unsaved work exists (used for the beforeunload warning). */
    get dirty() {
      return inflight || hasWork();
    },
    get counters() {
      return { ...counters, ...flags };
    },
    get status() {
      return { ...status };
    },
    get pendingCount() {
      return pending.size;
    },
    stop() {
      stopped = true;
      debounceTimer = clear(debounceTimer);
      retryTimer = clear(retryTimer);
      heartbeatTimer = clear(heartbeatTimer);
      idleWaiters.splice(0).forEach((fn) => fn(false));
    },
  };
}
