import { test } from "node:test";
import assert from "node:assert/strict";
import { reduce, initialState, needsDetails, needsCamera } from "../src/features/attempt/machine/flow.js";
import {
  toleranceOf, guardsOf, tabSwitchOutcome, createFaceTracker, dataUrlBytes, createSnapshotBudget, snapshotAttempts, reasonFor,
} from "../src/features/attempt/lib/proctor.js";

const plain = { _id: "z", title: "T", questions: [], antiCheatSettings: {} };
const protectedQuiz = { ...plain, isPasswordProtected: true };
const cameraQuiz = { ...plain, antiCheatSettings: { aiCamera: true } };
const run = (events, s = initialState) => events.reduce((st, e) => reduce(st, e), s);

test("helpers", () => {
  assert.equal(needsDetails(plain), false);
  assert.equal(needsDetails(protectedQuiz), true);
  assert.equal(needsDetails({ customFields: [{ name: "Roll", type: "text" }] }), true);
  assert.equal(needsCamera(cameraQuiz), true);
  assert.equal(needsCamera(plain), false);
});

test("loading -> landing -> ready -> starting -> attempt -> submitting -> result (plain quiz)", () => {
  let s = run([{ type: "QUIZ_LOADED", quiz: plain }]);
  assert.equal(s.phase, "landing");
  s = run([{ type: "IDENTIFIED", status: "new", student: { email: "a@b.c" } }], s);
  assert.equal(s.phase, "ready");
  assert.equal(s.autoStart, false);
  s = run([{ type: "START" }, { type: "STARTED" }], s);
  assert.equal(s.phase, "attempt");
  s = run([{ type: "SUBMIT" }], s);
  assert.equal(s.phase, "submitting");
  s = run([{ type: "SUBMITTED", result: { score: {} } }], s);
  assert.equal(s.phase, "result");
  assert.deepEqual(s.result, { score: {} });
});

test("protected quiz goes through details; wrong password returns to details with a message", () => {
  let s = run([{ type: "QUIZ_LOADED", quiz: protectedQuiz }, { type: "IDENTIFIED", status: "new", student: { email: "a@b.c" } }]);
  assert.equal(s.phase, "details");
  s = run([{ type: "START" }, { type: "START_FAILED", code: "WRONG_PASSWORD", message: "Incorrect quiz password." }], s);
  assert.equal(s.phase, "details");
  assert.equal(s.passwordError, "Incorrect quiz password.");
  s = run([{ type: "START" }, { type: "STARTED" }], s);
  assert.equal(s.phase, "attempt");
  assert.equal(s.passwordError, null);
});

test("camera quiz: details then device check before start", () => {
  let s = run([{ type: "QUIZ_LOADED", quiz: { ...cameraQuiz, isPasswordProtected: true } }, { type: "IDENTIFIED", status: "new", student: {} }]);
  assert.equal(s.phase, "details");
  s = run([{ type: "DETAILS_DONE" }], s);
  assert.equal(s.phase, "ready");
});

test("in-progress status means resume; reload with a stored session resumes automatically when nothing is needed", () => {
  let s = run([{ type: "QUIZ_LOADED", quiz: plain }, { type: "IDENTIFIED", status: "in-progress", student: {} }]);
  assert.equal(s.phase, "ready");
  assert.equal(s.resuming, true);
  assert.equal(s.autoStart, true);
  s = run([{ type: "QUIZ_LOADED", quiz: plain, student: { email: "a@b.c" }, resuming: true }]);
  assert.equal(s.phase, "ready");
  assert.equal(s.autoStart, true);
  s = run([{ type: "QUIZ_LOADED", quiz: cameraQuiz, student: { email: "a@b.c" }, resuming: true }]);
  assert.equal(s.autoStart, false, "camera needs a user gesture");
  s = run([{ type: "QUIZ_LOADED", quiz: protectedQuiz, student: { email: "a@b.c" }, resuming: true }]);
  assert.equal(s.phase, "details", "the password is asked again on resume");
});

test("already submitted leads to done, from identification and from start", () => {
  assert.equal(run([{ type: "QUIZ_LOADED", quiz: plain }, { type: "IDENTIFIED", status: "submitted", student: {} }]).phase, "done");
  let s = run([{ type: "QUIZ_LOADED", quiz: plain, student: {} }, { type: "START" }, { type: "START_FAILED", code: "ALREADY_SUBMITTED" }]);
  assert.equal(s.phase, "done");
  s = run([{ type: "QUIZ_LOADED", quiz: plain }, { type: "ALREADY_SUBMITTED" }]);
  assert.equal(s.phase, "done");
});

test("expired student token on start sends the student back to sign-in", () => {
  const s = run([{ type: "QUIZ_LOADED", quiz: plain, student: {} }, { type: "START" }, { type: "START_FAILED", code: "STUDENT_TOKEN_INVALID" }]);
  assert.equal(s.phase, "landing");
  assert.equal(s.student, null);
  assert.match(s.notice, /sign in again/i);
});

test("submit failure returns to the attempt with a message; result refresh goes straight to result", () => {
  let s = run([{ type: "QUIZ_LOADED", quiz: plain, student: {} }, { type: "START" }, { type: "STARTED" }, { type: "SUBMIT" }, { type: "SUBMIT_FAILED", message: "Network" }]);
  assert.equal(s.phase, "attempt");
  assert.equal(s.error, "Network");
  s = run([{ type: "QUIZ_LOADED", quiz: plain, resultRef: { submissionId: "s1" } }]);
  assert.equal(s.phase, "result");
  assert.equal(s.result, null);
  assert.deepEqual(s.resultRef, { submissionId: "s1" });
});

test("unavailable quiz and retry; events in the wrong phase are ignored", () => {
  let s = run([{ type: "QUIZ_FAILED", error: { kind: "not-found" } }]);
  assert.equal(s.phase, "unavailable");
  s = run([{ type: "RETRY_LOAD" }], s);
  assert.equal(s.phase, "loading");
  const att = run([{ type: "QUIZ_LOADED", quiz: plain, student: {} }, { type: "START" }, { type: "STARTED" }]);
  assert.equal(reduce(att, { type: "IDENTIFIED", status: "new", student: {} }), att);
  assert.equal(reduce(att, { type: "START" }), att);
});

test("expiry during an attempt ends in a result flagged as expired", () => {
  const s = run([{ type: "QUIZ_LOADED", quiz: plain, student: {} }, { type: "START" }, { type: "STARTED" }, { type: "SUBMIT" }, { type: "SUBMITTED", result: { score: {} }, expired: true }]);
  assert.equal(s.expired, true);
});

// ---------------------------------------------------------------- proctoring rules
test("tolerance comes from the quiz, with a safe default", () => {
  assert.equal(toleranceOf({ toleranceStrikes: 5 }), 5);
  assert.equal(toleranceOf({}), 3);
  assert.equal(toleranceOf({ toleranceStrikes: 0 }), 3);
  assert.equal(toleranceOf({ toleranceStrikes: 99 }), 3);
  assert.deepEqual(guardsOf({ aiCamera: true, tabSwitch: false, copyPaste: true, toleranceStrikes: 2 }), { camera: true, tabSwitch: false, copyPaste: true, tolerance: 2 });
});

test("tab switch warns until the limit, then submits", () => {
  assert.deepEqual([1, 2, 3].map((c) => tabSwitchOutcome(c, 3).autoSubmit), [false, false, true]);
  assert.equal(tabSwitchOutcome(1, 3).remaining, 2);
  assert.match(tabSwitchOutcome(2, 3).body, /1 more time,/);
  assert.equal(tabSwitchOutcome(1, 1).autoSubmit, true, "tolerance 1 submits on the first switch");
  assert.equal(tabSwitchOutcome(4, 3).autoSubmit, true);
});

const box = (x, y, w = 100, h = 100) => ({ x, y, width: w, height: h });

test("face tracker: no face for 5 frames is one strike, then counting restarts", () => {
  const t = createFaceTracker();
  const kinds = [];
  for (let i = 0; i < 11; i++) kinds.push(...t.observe([], 640).map((e) => e.kind));
  assert.deepEqual(kinds, ["no-face", "no-face"]);
});

test("face tracker: a brief miss is forgiven; several faces counted separately", () => {
  const t = createFaceTracker();
  for (let i = 0; i < 4; i++) assert.deepEqual(t.observe([], 640), []);
  assert.deepEqual(t.observe([box(100, 100)], 640), []);
  let ev = [];
  for (let i = 0; i < 5; i++) ev = t.observe([box(100, 100), box(300, 100)], 640);
  assert.equal(ev[0].kind, "multiple-faces");
});

test("face tracker: large movement is flagged, normal movement is not", () => {
  const t = createFaceTracker();
  t.observe([box(100, 100)], 640);
  assert.deepEqual(t.observe([box(120, 110)], 640), []);
  assert.equal(t.observe([box(400, 100)], 640)[0].kind, "movement");
});

test("face tracker: a different-sized face after a gap is an identity swap", () => {
  const t = createFaceTracker();
  t.observe([box(100, 100)], 640);
  t.observe([], 640);
  t.observe([], 640);
  assert.equal(t.observe([box(110, 100, 200, 200)], 640)[0].kind, "identity-swap");
  const t2 = createFaceTracker();
  t2.observe([box(100, 100)], 640);
  t2.observe([], 640);
  t2.observe([], 640);
  assert.deepEqual(t2.observe([box(102, 101, 104, 98)], 640), [], "the same person coming back is fine");
});

test("snapshots: byte size, budget of 20, shrinking plan", () => {
  assert.equal(dataUrlBytes("data:image/jpeg;base64,AAAA"), 3);
  assert.equal(dataUrlBytes("data:image/jpeg;base64,AA=="), 1);
  assert.equal(dataUrlBytes("nope"), 0);
  const b = createSnapshotBudget(20);
  for (let i = 0; i < 20; i++) {
    assert.equal(b.canTake(), true);
    b.taken();
  }
  assert.equal(b.canTake(), false);
  const plan = snapshotAttempts(1280, 720);
  assert.equal(plan[0].width, 480);
  assert.equal(plan[0].quality, 0.5);
  assert.ok(plan[2].width < plan[0].width);
  assert.equal(reasonFor("tab-switch"), "Tab switch");
});
