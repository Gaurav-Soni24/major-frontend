import { test } from "node:test";
import assert from "node:assert/strict";
import { createAutosaver, isFatalSaveError } from "../src/features/attempt/lib/autosave.js";

/** Manual scheduler: time only moves when advance() is called. */
function fakeScheduler() {
  let now = 0;
  let id = 0;
  const timers = new Map();
  return {
    scheduler: {
      setTimeout(fn, ms) {
        const h = ++id;
        timers.set(h, { at: now + ms, fn });
        return h;
      },
      clearTimeout(h) {
        timers.delete(h);
      },
    },
    get now() {
      return now;
    },
    async advance(ms) {
      const end = now + ms;
      for (;;) {
        const due = [...timers.entries()].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
        if (!due) break;
        now = due[1].at;
        timers.delete(due[0]);
        due[1].fn();
        await settle();
      }
      now = end;
      await settle();
    },
    get pending() {
      return timers.size;
    },
  };
}
const settle = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};

function setup(over = {}) {
  const clock = fakeScheduler();
  const calls = [];
  const statuses = [];
  const fatals = [];
  const impl = { fn: async () => ({ savedAt: new Date(clock.now).toISOString(), serverTime: new Date(clock.now).toISOString(), remainingSeconds: null }) };
  const saver = createAutosaver({
    send: async (body) => {
      calls.push(JSON.parse(JSON.stringify(body)));
      return impl.fn(body, calls.length);
    },
    scheduler: clock.scheduler,
    now: () => clock.now,
    onStatus: (s) => statuses.push(s.state),
    onFatal: (e) => fatals.push(e),
    ...over,
  });
  return { clock, calls, statuses, fatals, impl, saver };
}

test("debounce: many edits within 1.5 s become one request", async () => {
  const { clock, calls, saver } = setup();
  saver.set("q1", "a");
  await clock.advance(1000);
  saver.set("q1", "ab");
  await clock.advance(1000); // 1 s after the last edit: not yet
  assert.equal(calls.length, 0);
  await clock.advance(600);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].answers, [{ questionId: "q1", userAnswer: "ab" }]);
  assert.equal(saver.dirty, false);
  saver.stop();
});

test("coalescing: only the latest value per question, different questions travel together", async () => {
  const { clock, calls, saver } = setup();
  saver.set("q1", "x");
  saver.set("q2", ["a"]);
  saver.set("q1", "y");
  saver.set("q3", null);
  await clock.advance(1500);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].answers, [
    { questionId: "q1", userAnswer: "y" },
    { questionId: "q2", userAnswer: ["a"] },
    { questionId: "q3", userAnswer: null },
  ]);
  saver.stop();
});

test("ordering: edits during an in-flight request are sent after it, never lost or reordered", async () => {
  const { clock, calls, impl, saver } = setup();
  let release;
  impl.fn = (body, n) => (n === 1 ? new Promise((r) => (release = () => r({ savedAt: new Date().toISOString() }))) : Promise.resolve({ savedAt: new Date().toISOString() }));
  saver.set("q1", "one");
  await clock.advance(1500);
  assert.equal(calls.length, 1);
  saver.set("q1", "two"); // while request 1 is in flight
  saver.set("q2", "other");
  await clock.advance(1500);
  assert.equal(calls.length, 1, "no second request while the first is still in flight");
  release();
  await settle();
  await clock.advance(10);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1].answers, [{ questionId: "q1", userAnswer: "two" }, { questionId: "q2", userAnswer: "other" }]);
  assert.equal(saver.dirty, false);
  saver.stop();
});

test("offline: failed save keeps the answer, shows offline, retries with backoff and then syncs", async () => {
  const { clock, calls, statuses, impl, saver } = setup({ heartbeatMs: 0 });
  let online = false;
  impl.fn = async () => {
    if (!online) throw Object.assign(new Error("net"), { status: 0, code: "NETWORK_ERROR" });
    return { savedAt: new Date().toISOString() };
  };
  saver.set("q1", "keep me");
  await clock.advance(1500);
  assert.equal(calls.length, 1);
  assert.equal(saver.status.state, "offline");
  assert.equal(saver.dirty, true);
  await clock.advance(1000); // backoff 1 s
  assert.equal(calls.length, 2);
  await clock.advance(2000); // backoff 2 s
  assert.equal(calls.length, 3);
  await clock.advance(4000); // backoff 4 s
  assert.equal(calls.length, 4);
  saver.set("q2", "typed while offline");
  online = true;
  await clock.advance(8000);
  const last = calls[calls.length - 1];
  assert.deepEqual(last.answers.map((a) => a.questionId).sort(), ["q1", "q2"]);
  assert.equal(saver.status.state, "saved");
  assert.equal(saver.dirty, false);
  assert.ok(statuses.includes("offline"));
  saver.stop();
});

test("online event retries immediately instead of waiting out the backoff", async () => {
  const { clock, calls, impl, saver } = setup({ heartbeatMs: 0 });
  let online = false;
  impl.fn = async () => {
    if (!online) throw Object.assign(new Error("net"), { status: 0 });
    return { savedAt: new Date().toISOString() };
  };
  saver.set("q1", "a");
  await clock.advance(1500);
  assert.equal(saver.status.state, "offline");
  online = true;
  saver.online();
  await settle();
  assert.equal(calls.length, 2);
  assert.equal(saver.status.state, "saved");
  saver.stop();
});

test("server errors (5xx) use the error state and retry; backoff is capped", async () => {
  const { clock, calls, impl, saver } = setup({ heartbeatMs: 0, backoff: [100, 200] });
  impl.fn = async () => {
    throw Object.assign(new Error("boom"), { status: 503 });
  };
  saver.set("q1", "a");
  await clock.advance(1500);
  assert.equal(saver.status.state, "error");
  await clock.advance(100);
  await clock.advance(200);
  await clock.advance(200);
  assert.equal(calls.length, 4);
  saver.stop();
});

test("heartbeat: an empty save every 20 s keeps the server in sync", async () => {
  const { clock, calls, saver } = setup();
  await clock.advance(20000);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].answers, []);
  await clock.advance(20000);
  assert.equal(calls.length, 2);
  saver.stop();
});

test("counters are monotonic and ride along; initial counters are not resent", async () => {
  const { clock, calls, saver } = setup({ initialCounters: { tabSwitches: 2 }, heartbeatMs: 0 });
  assert.equal(saver.dirty, false);
  saver.setCounters({ tabSwitches: 1 }); // lower than stored: ignored
  await settle();
  assert.equal(calls.length, 0);
  saver.setCounters({ tabSwitches: 3, copyPasteAttempts: 1 });
  await settle();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].antiCheat.tabSwitches, 3);
  assert.equal(calls[0].antiCheat.copyPasteAttempts, 1);
  saver.setCounters({ identitySwapDetected: true });
  await settle();
  assert.equal(calls[1].antiCheat.identitySwapDetected, true);
  await clock.advance(0);
  saver.stop();
});

test("flush sends immediately and drain resolves when everything is saved", async () => {
  const { calls, saver } = setup();
  saver.set("q1", "a");
  const ok = await saver.drain(1000);
  assert.equal(ok, true);
  assert.equal(calls.length, 1);
  assert.equal(saver.dirty, false);
  saver.stop();
});

test("fatal errors (expired, already submitted) stop the queue and report once", async () => {
  const { clock, calls, fatals, impl, saver } = setup();
  impl.fn = async () => {
    throw Object.assign(new Error("late"), { status: 410, code: "ATTEMPT_EXPIRED" });
  };
  saver.set("q1", "a");
  await clock.advance(1500);
  assert.equal(fatals.length, 1);
  assert.equal(fatals[0].code, "ATTEMPT_EXPIRED");
  saver.set("q1", "b");
  await clock.advance(5000);
  assert.equal(calls.length, 1, "nothing is sent after a fatal error");
  assert.equal(isFatalSaveError({ status: 409 }), true);
  assert.equal(isFatalSaveError({ status: 0 }), false);
  assert.equal(isFatalSaveError({ status: 500 }), false);
});

test("an edit made during a successful in-flight save is not dropped", async () => {
  const { clock, calls, impl, saver } = setup({ heartbeatMs: 0 });
  let release;
  impl.fn = (b, n) => (n === 1 ? new Promise((r) => (release = () => r({ savedAt: new Date().toISOString() }))) : Promise.resolve({ savedAt: new Date().toISOString() }));
  saver.set("q1", "v1");
  await clock.advance(1500);
  saver.set("q1", "v2");
  release();
  await settle();
  await clock.advance(10);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].answers[0].userAnswer, "v2");
  saver.stop();
});

test("hold waits for the request on the wire and blocks new ones until release (final submit)", async () => {
  const { clock, calls, impl, saver } = setup();
  let release;
  impl.fn = (b, n) => (n === 1 ? new Promise((r) => (release = () => r({ savedAt: new Date().toISOString() }))) : Promise.resolve({ savedAt: new Date().toISOString() }));
  saver.set("q1", "a");
  await clock.advance(1500);
  assert.equal(calls.length, 1);
  let held = false;
  const p = saver.hold().then(() => (held = true));
  await settle();
  assert.equal(held, false, "still waiting for the in-flight save");
  release();
  await p;
  assert.equal(held, true);
  saver.set("q2", "b");
  await clock.advance(30000);
  assert.equal(calls.length, 1, "nothing is sent while held, not even the heartbeat");
  saver.release();
  await clock.advance(10);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].answers[0].questionId, "q2");
  saver.stop();
});
