import { test } from "node:test";
import assert from "node:assert/strict";
import { hashSeed, seededShuffle, orderQuestions, orderOptions, prepareQuestions } from "../src/features/attempt/lib/shuffle.js";
import { isAnswered, toApiAnswer, toggleOption, toEntries, restoreAnswers, isValidNumberText, isAllowedNumberInput, emptyAnswerFor } from "../src/features/attempt/lib/answers.js";
import { buildPalette, summarize, cellStatus, listNumbers } from "../src/features/attempt/lib/palette.js";
import { createServerClock, remainingSeconds, crossedThreshold, announcementFor, timerTone } from "../src/features/attempt/lib/timer.js";
import { createAttemptStorage } from "../src/features/attempt/lib/storage.js";

const Q = (id, type, extra = {}) => ({ _id: id, type, text: `Q ${id}`, marks: 1, originalIndex: Number(id.replace(/\D/g, "")) - 1, ...extra });
const quiz = {
  settings: { shuffleQuestions: true, shuffleOptions: true },
  questions: [
    Q("q1", "single", { options: [{ text: "a" }, { text: "b" }, { text: "c" }, { text: "d" }] }),
    Q("q2", "multiple", { options: [{ text: "w" }, { text: "x" }, { text: "y" }] }),
    Q("q3", "integer"),
    Q("q4", "text"),
    Q("q5", "code", { starterCode: "function f() {}" }),
    Q("q6", "single", { options: [{ text: "p" }, { text: "q" }] }),
    Q("q7", "single", { options: [{ text: "m" }, { text: "n" }] }),
    Q("q8", "text"),
  ],
};

// ---------------------------------------------------------------- shuffle
test("same seed gives the same order, different seeds differ", () => {
  const items = Array.from({ length: 20 }, (_, i) => i);
  assert.deepEqual(seededShuffle(items, "s1"), seededShuffle(items, "s1"));
  assert.notDeepEqual(seededShuffle(items, "s1"), seededShuffle(items, "s2"));
  assert.deepEqual(seededShuffle(items, "s1").sort((a, b) => a - b), items);
  assert.equal(hashSeed("x"), hashSeed("x"));
});

test("question order is stable across reloads and ignores the order the server used", () => {
  const a = orderQuestions(quiz.questions, { shuffle: true, seed: "sub-1" }).map((q) => q._id);
  const reversed = quiz.questions.slice().reverse();
  const b = orderQuestions(reversed, { shuffle: true, seed: "sub-1" }).map((q) => q._id);
  assert.deepEqual(a, b);
  assert.deepEqual(orderQuestions(reversed, { shuffle: false, seed: "x" }).map((q) => q._id), quiz.questions.map((q) => q._id));
});

test("option order is stable even when the server shuffles options differently each time", () => {
  const q = quiz.questions[0];
  const serverOrderA = { ...q, options: [{ text: "d" }, { text: "a" }, { text: "c" }, { text: "b" }] };
  const serverOrderB = { ...q, options: [{ text: "b" }, { text: "c" }, { text: "d" }, { text: "a" }] };
  const a = orderOptions(serverOrderA, { shuffle: true, seed: "sub-1" }).map((o) => o.text);
  const b = orderOptions(serverOrderB, { shuffle: true, seed: "sub-1" }).map((o) => o.text);
  assert.deepEqual(a, b);
  // without shuffling the author's order from the server is kept
  assert.deepEqual(orderOptions(q, { shuffle: false, seed: "x" }).map((o) => o.text), ["a", "b", "c", "d"]);
});

test("prepareQuestions keeps every question and option exactly once", () => {
  const prepared = prepareQuestions(quiz, "sub-9");
  assert.equal(prepared.length, 8);
  assert.deepEqual(prepared.map((q) => q._id).sort(), quiz.questions.map((q) => q._id).sort());
  assert.deepEqual(prepared.find((q) => q._id === "q1").options.map((o) => o.text).sort(), ["a", "b", "c", "d"]);
  assert.deepEqual(prepareQuestions(quiz, "sub-9").map((q) => q._id), prepared.map((q) => q._id));
});

// ---------------------------------------------------------------- answers
test("answer shape and emptiness per type", () => {
  assert.equal(isAnswered({ type: "single" }, "a"), true);
  assert.equal(isAnswered({ type: "single" }, ""), false);
  assert.equal(isAnswered({ type: "multiple" }, []), false);
  assert.equal(isAnswered({ type: "multiple" }, ["a"]), true);
  assert.equal(isAnswered({ type: "integer" }, " 4 "), true);
  assert.equal(isAnswered({ type: "integer" }, "  "), false);
  assert.equal(isAnswered({ type: "text" }, "   "), false);
  assert.equal(isAnswered({ type: "code", starterCode: "x" }, "x"), false, "starter code alone is not an answer");
  assert.equal(isAnswered({ type: "code", starterCode: "x" }, "x\ny"), true);
  assert.deepEqual(emptyAnswerFor("multiple"), []);
  assert.equal(emptyAnswerFor("text"), "");
});

test("toApiAnswer clears empties with null and normalises", () => {
  assert.equal(toApiAnswer({ type: "text" }, "  "), null);
  assert.equal(toApiAnswer({ type: "integer" }, " -3.5 "), "-3.5");
  assert.deepEqual(toApiAnswer({ type: "multiple" }, ["a", "a", "b"]), ["a", "b"]);
  assert.equal(toApiAnswer({ type: "multiple" }, []), null);
});

test("toggleOption adds, removes and keeps display order", () => {
  const order = ["a", "b", "c"];
  assert.deepEqual(toggleOption([], "c", order), ["c"]);
  assert.deepEqual(toggleOption(["c"], "a", order), ["a", "c"]);
  assert.deepEqual(toggleOption(["a", "c"], "c", order), ["a"]);
});

test("numbers: decimals, negatives and exponents are accepted, letters are not", () => {
  for (const ok of ["42", "-3", "+7", "3.14", ".5", "-0.25", "1e3", "2E-2"]) assert.equal(isValidNumberText(ok), true, ok);
  for (const bad of ["", "abc", "1,5", "--1", "1.2.3", "e5", "-"]) assert.equal(isValidNumberText(bad), false, bad);
  for (const typing of ["", "-", "3.", "1e", "1e-"]) assert.equal(isAllowedNumberInput(typing), true, typing);
  assert.equal(isAllowedNumberInput("12a"), false);
});

test("entries follow question order and restoreAnswers round-trips", () => {
  const qs = prepareQuestions(quiz, "sub-1");
  const answers = { q1: "b", q2: ["x", "y"], q3: "42", q5: "function f() { return 1 }" };
  const entries = toEntries(qs, answers);
  assert.equal(entries.length, qs.length);
  assert.deepEqual(entries.map((e) => e.questionId), qs.map((q) => q._id));
  assert.equal(entries.find((e) => e.questionId === "q4").userAnswer, null);
  const restored = restoreAnswers(qs, entries.filter((e) => e.userAnswer !== null).concat([{ questionId: "unknown", userAnswer: "z" }]));
  assert.deepEqual(restored, answers);
});

// ---------------------------------------------------------------- palette
test("palette status derivation and summary", () => {
  const qs = quiz.questions;
  const answers = { q1: "a", q3: "5" };
  const palette = buildPalette(qs, answers, new Set(["q2", "q3"]), 1);
  assert.equal(palette[0].state, "answered");
  assert.equal(palette[1].current, true);
  assert.equal(palette[1].marked, true);
  assert.equal(palette[1].state, "unanswered");
  assert.equal(palette[2].marked, true);
  assert.equal(palette[2].state, "answered");
  assert.match(palette[1].label, /marked for review, current/);
  const s = summarize(palette);
  assert.equal(s.answered, 2);
  assert.deepEqual(s.unanswered, [2, 4, 5, 6, 7, 8]);
  assert.deepEqual(s.marked, [2, 3]);
  assert.equal(cellStatus({ answered: false, marked: false, current: false }).label, "not answered");
  assert.equal(listNumbers([3]), "3");
  assert.equal(listNumbers([3, 5, 9]), "3, 5 and 9");
  assert.equal(listNumbers([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], 12), "1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 and 2 more");
});

// ---------------------------------------------------------------- timer
test("server clock follows the server, not the device clock, and re-anchors", () => {
  let mono = 1000;
  const clock = createServerClock({ nowFn: () => mono });
  assert.equal(clock.synced, false);
  clock.sync("2026-11-27T10:00:00.000Z");
  const base = Date.parse("2026-11-27T10:00:00.000Z");
  mono += 5000;
  assert.equal(clock.now(), base + 5000);
  // the device clock jumping does not matter: only the monotonic reading is used
  clock.sync(new Date(base + 6000).toISOString());
  mono += 1000;
  assert.equal(clock.now(), base + 7000);
  assert.equal(clock.sync("garbage"), false);
  assert.equal(clock.now(), base + 7000);
});

test("remainingSeconds rounds up, floors at 0, null when untimed", () => {
  const dl = "2026-11-27T10:10:00.000Z";
  const t = Date.parse("2026-11-27T10:00:00.000Z");
  assert.equal(remainingSeconds(dl, t), 600);
  assert.equal(remainingSeconds(dl, t + 599500), 1);
  assert.equal(remainingSeconds(dl, t + 700000), 0);
  assert.equal(remainingSeconds(null, t), null);
  assert.equal(remainingSeconds("nope", t), null);
});

test("threshold announcements fire once at 5 min, 1 min and 30 s", () => {
  assert.equal(crossedThreshold(301, 300), 300);
  assert.equal(crossedThreshold(300, 299), null);
  assert.equal(crossedThreshold(61, 60), 60);
  assert.equal(crossedThreshold(31, 30), 30);
  assert.equal(crossedThreshold(400, 20), 30, "a long pause announces the smallest threshold reached");
  assert.equal(crossedThreshold(null, 20), null);
  assert.equal(announcementFor(300), "5 minutes remaining.");
  assert.equal(announcementFor(60), "1 minute remaining.");
  assert.equal(announcementFor(30), "30 seconds remaining.");
  assert.equal(timerTone(null), "none");
  assert.equal(timerTone(45), "urgent");
  assert.equal(timerTone(200), "soon");
  assert.equal(timerTone(900), "normal");
});

// ---------------------------------------------------------------- storage
test("attempt storage round-trips and survives blocked storage", () => {
  const mem = new Map();
  const fake = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };
  const s = createAttemptStorage(() => fake);
  assert.equal(s.getStudent("z"), null);
  s.setStudent("z", { studentToken: "t", email: "a@b.c", name: "A" });
  assert.equal(s.getStudent("z").email, "a@b.c");
  s.setAttempt("z", { submissionId: "s1", attemptToken: "tok" });
  assert.equal(s.getAttempt("z").attemptToken, "tok");
  s.setMarks("s1", new Set(["q1", "q2"]));
  assert.deepEqual(s.getMarks("s1"), ["q1", "q2"]);
  s.clearStudent("z");
  assert.equal(s.getStudent("z"), null);
  assert.equal(s.getAttempt("z").submissionId, "s1");
  mem.set("quizify:student:bad", "{not json");
  assert.equal(s.getStudent("bad"), null);

  const blocked = createAttemptStorage(() => { throw new Error("blocked"); });
  assert.equal(blocked.setStudent("z", { studentToken: "t", email: "e" }), false);
  assert.equal(blocked.getStudent("z"), null);
  assert.deepEqual(blocked.getMarks("s"), []);
});
