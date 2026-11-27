import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyDraft, newQuestion, newOption, apiToDraft, toPayload, switchType, moveItem, cloneQuestion, totalMarks, questionFromAi } from "../src/features/quiz-editor/model/draft.js";
import { validateDraft } from "../src/features/quiz-editor/model/validate.js";
import { createState, reducer, isDirty, focusAfterRemove, COALESCE_MS } from "../src/features/quiz-editor/model/reducer.js";
import { draftKey, saveStoredDraft, loadStoredDraft, clearStoredDraft, fingerprint, stripSecrets } from "../src/features/quiz-editor/model/storage.js";
import { validateAiForm, normaliseGenerated, applyGeneration, defaultAiForm, describeAiError } from "../src/features/quiz-editor/model/ai.js";

const apiQuiz = () => ({
  _id: "abc",
  title: "Physics",
  description: "Mechanics",
  instructions: ["Read carefully"],
  customFields: [{ name: "Roll no", type: "text" }, { name: "Age", type: "number" }],
  timeLimit: 20,
  passingScore: 55,
  hasPassword: true,
  settings: { shuffleQuestions: false, shuffleOptions: true, showAnswers: true },
  antiCheatSettings: { aiCamera: false, tabSwitch: true, copyPaste: false, toleranceStrikes: 4 },
  questions: [
    { type: "single", text: "S", marks: 2, options: [{ text: "a", isCorrect: true }, { text: "b", isCorrect: false }] },
    { type: "multiple", text: "M", marks: 3, options: [{ text: "a", isCorrect: true }, { text: "b", isCorrect: true }, { text: "c" }] },
    { type: "integer", text: "I", marks: 1, correctAnswer: "42" },
    { type: "text", text: "T", marks: 4, correctAnswer: "ref", aiGradingRubric: "rub" },
    { type: "code", text: "C", marks: 5, codeLanguage: "python", starterCode: "def f():\n  pass", correctAnswer: "returns 1", aiGradingRubric: "" },
  ],
});

test("API -> draft -> payload round trip keeps every field", () => {
  const src = apiQuiz();
  const payload = toPayload(apiToDraft(src));
  assert.equal(payload.title, "Physics");
  assert.equal(payload.description, "Mechanics");
  assert.deepEqual(payload.instructions, ["Read carefully"]);
  assert.deepEqual(payload.customFields, src.customFields);
  assert.equal(payload.timeLimit, 20);
  assert.equal(payload.passingScore, 55);
  assert.deepEqual(payload.settings, src.settings);
  assert.deepEqual(payload.antiCheatSettings, src.antiCheatSettings);
  assert.equal("password" in payload, false, "password is never echoed back");
  assert.equal(payload.questions.length, 5);
  assert.deepEqual(payload.questions[0], { type: "single", text: "S", marks: 2, options: [{ text: "a", isCorrect: true }, { text: "b", isCorrect: false }] });
  assert.deepEqual(payload.questions[2], { type: "integer", text: "I", marks: 1, correctAnswer: "42" });
  assert.deepEqual(payload.questions[3], { type: "text", text: "T", marks: 4, correctAnswer: "ref", aiGradingRubric: "rub" });
  assert.deepEqual(payload.questions[4], { type: "code", text: "C", marks: 5, correctAnswer: "returns 1", aiGradingRubric: "", codeLanguage: "python", starterCode: "def f():\n  pass" });
  assert.equal(validateDraft(apiToDraft(src)).ok, true);
});

test("payload has no client ids and no unused fields", () => {
  const p = JSON.stringify(toPayload(apiToDraft(apiQuiz())));
  assert.equal(/"id"/.test(p), false);
  const single = toPayload({ ...emptyDraft(), title: "abc", questions: [{ ...newQuestion("single"), text: "x", correctAnswer: "stale", starterCode: "stale" }] }).questions[0];
  assert.deepEqual(Object.keys(single).sort(), ["marks", "options", "text", "type"]);
});

test("time limit off becomes null; blank instructions are dropped", () => {
  const d = { ...emptyDraft(), title: "abc", timeLimitOn: false, instructions: ["", " a ", ""] };
  const p = toPayload(d);
  assert.equal(p.timeLimit, null);
  assert.deepEqual(p.instructions, ["a"]);
  assert.equal(apiToDraft({ ...apiQuiz(), timeLimit: null }).timeLimitOn, false);
});

test("password modes: keep omits, set sends, remove sends empty string", () => {
  const base = { ...emptyDraft(), title: "abc" };
  assert.equal("password" in toPayload(base), false);
  assert.equal(toPayload({ ...base, passwordMode: "set", passwordValue: "s3cret" }).password, "s3cret");
  assert.equal("password" in toPayload({ ...base, passwordMode: "set", passwordValue: "" }), false);
  assert.equal(toPayload({ ...base, passwordMode: "remove" }).password, "");
});

test("AI questions without a type or marks become valid drafts", () => {
  const q = questionFromAi({ text: "hi", options: [{ text: "a", isCorrect: true }, { text: "b" }] });
  assert.equal(q.type, "single");
  assert.equal(q.marks, "1");
  assert.equal(q.options.length, 2);
  assert.equal(questionFromAi({ type: "integer", text: "n", correctAnswer: 42 }).correctAnswer, "42");
});

test("totalMarks ignores invalid marks", () => {
  const d = { ...emptyDraft(), questions: [{ ...newQuestion(), marks: "2.5" }, { ...newQuestion(), marks: "x" }, { ...newQuestion(), marks: "1" }] };
  assert.equal(totalMarks(d), 3.5);
});

test("moveItem and cloneQuestion", () => {
  assert.deepEqual(moveItem([1, 2, 3, 4], 0, 2), [2, 3, 1, 4]);
  assert.deepEqual(moveItem([1, 2, 3], 2, 0), [3, 1, 2]);
  const same = [1, 2, 3];
  assert.equal(moveItem(same, 0, 3), same);
  assert.equal(moveItem(same, 1, 1), same);
  const q = { ...newQuestion("single"), text: "t" };
  const c = cloneQuestion(q);
  assert.notEqual(c.id, q.id);
  assert.notEqual(c.options[0].id, q.options[0].id);
  assert.equal(c.text, "t");
});

/* ---------- type switching ---------- */

const choice = (type, correct) => ({ ...newQuestion(type), text: "T", marks: "3", options: [newOption("a", correct[0]), newOption("b", correct[1]), newOption("c", correct[2])] });

test("single <-> multiple keeps options; multiple->single keeps the first correct and reports the rest", () => {
  const m = choice("multiple", [true, true, false]);
  const r = switchType(m, "single");
  assert.equal(r.question.type, "single");
  assert.deepEqual(r.question.options.map((o) => o.isCorrect), [true, false, false]);
  assert.deepEqual(r.lost, ["1 extra correct mark"]);
  const s = choice("single", [false, true, false]);
  const back = switchType(s, "multiple");
  assert.deepEqual(back.lost, []);
  assert.deepEqual(back.question.options.map((o) => o.isCorrect), [false, true, false]);
  assert.equal(back.question.text, "T");
  assert.equal(back.question.marks, "3");
});

test("choice -> text drops options and says how many; marks and text stay", () => {
  const r = switchType(choice("single", [true, false, false]), "text");
  assert.equal(r.question.options.length, 0);
  assert.deepEqual(r.lost, ["3 options"]);
  assert.equal(r.question.text, "T");
  assert.equal(r.question.marks, "3");
});

test("empty options are not reported as lost data", () => {
  assert.deepEqual(switchType(newQuestion("single"), "integer").lost, []);
});

test("text -> code keeps reference and rubric; code -> text drops starter code", () => {
  const t = { ...newQuestion("text"), correctAnswer: "ref", aiGradingRubric: "rub" };
  const c = switchType(t, "code");
  assert.equal(c.question.correctAnswer, "ref");
  assert.equal(c.question.aiGradingRubric, "rub");
  assert.deepEqual(c.lost, []);
  const withCode = { ...c.question, starterCode: "x = 1" };
  const back = switchType(withCode, "text");
  assert.deepEqual(back.lost, ["the starter code"]);
  assert.equal(back.question.starterCode, "");
  assert.equal(back.question.correctAnswer, "ref");
});

test("text -> integer keeps a numeric reference, drops a non numeric one and the rubric", () => {
  const num = switchType({ ...newQuestion("text"), correctAnswer: "42" }, "integer");
  assert.equal(num.question.correctAnswer, "42");
  assert.deepEqual(num.lost, []);
  const words = switchType({ ...newQuestion("text"), correctAnswer: "forty two", aiGradingRubric: "r" }, "integer");
  assert.equal(words.question.correctAnswer, "");
  assert.deepEqual(words.lost, ["the reference answer (it is not a number)", "the rubric"]);
});

test("integer/text -> choice gives two empty options and reports dropped answers", () => {
  const r = switchType({ ...newQuestion("integer"), correctAnswer: "5" }, "single");
  assert.equal(r.question.options.length, 2);
  assert.deepEqual(r.lost, ["the numeric answer"]);
  assert.equal(r.question.correctAnswer, "");
  assert.equal(switchType(newQuestion("text"), "multiple").lost.length, 0);
});

test("switching to the same type is a no-op", () => {
  const q = newQuestion("single");
  assert.equal(switchType(q, "single").question, q);
});

/* ---------- reducer ---------- */

const T0 = 1_000_000;
const start = () => createState({ ...emptyDraft(), title: "Start" });

test("set + undo + redo; dirty tracks the saved snapshot by reference", () => {
  let s = start();
  assert.equal(isDirty(s), false);
  s = reducer(s, { type: "set", key: "title", value: "Changed", now: T0 });
  assert.equal(isDirty(s), true);
  assert.equal(s.draft.title, "Changed");
  s = reducer(s, { type: "undo" });
  assert.equal(s.draft.title, "Start");
  assert.equal(isDirty(s), false, "undoing back to the saved draft is clean");
  s = reducer(s, { type: "redo" });
  assert.equal(s.draft.title, "Changed");
  assert.equal(s.future.length, 0);
});

test("typing coalesces into one undo step; a pause or another field starts a new one", () => {
  let s = start();
  s = reducer(s, { type: "set", key: "title", value: "A", now: T0 });
  s = reducer(s, { type: "set", key: "title", value: "AB", now: T0 + 100 });
  s = reducer(s, { type: "set", key: "title", value: "ABC", now: T0 + 200 });
  assert.equal(s.past.length, 1);
  s = reducer(s, { type: "set", key: "title", value: "ABCD", now: T0 + 200 + COALESCE_MS + 1 });
  assert.equal(s.past.length, 2);
  s = reducer(s, { type: "set", key: "description", value: "d", now: T0 + 5000 });
  assert.equal(s.past.length, 3);
  s = reducer(s, { type: "undo" });
  s = reducer(s, { type: "undo" });
  assert.equal(s.draft.title, "ABC");
});

test("a new edit clears the redo stack", () => {
  let s = start();
  s = reducer(s, { type: "set", key: "title", value: "X", now: T0 });
  s = reducer(s, { type: "undo" });
  s = reducer(s, { type: "set", key: "title", value: "Y", now: T0 + 5000 });
  assert.equal(s.future.length, 0);
});

test("undo/redo with nothing to do returns the same state", () => {
  const s = start();
  assert.equal(reducer(s, { type: "undo" }), s);
  assert.equal(reducer(s, { type: "redo" }), s);
});

test("add, update, duplicate, remove questions", () => {
  let s = start();
  s = reducer(s, { type: "addQuestion", questionType: "text", now: T0 });
  s = reducer(s, { type: "addQuestion", question: newQuestion("integer"), now: T0 + 5000 });
  assert.equal(s.draft.questions.length, 2);
  const [a, b] = s.draft.questions;
  s = reducer(s, { type: "updateQuestion", id: a.id, patch: { text: "Hello" }, now: T0 + 6000 });
  assert.equal(s.draft.questions[0].text, "Hello");
  assert.equal(s.draft.questions[1], b, "untouched questions keep their identity");
  s = reducer(s, { type: "duplicateQuestion", id: a.id, now: T0 + 7000 });
  assert.equal(s.draft.questions.length, 3);
  assert.equal(s.draft.questions[1].text, "Hello");
  assert.notEqual(s.draft.questions[1].id, a.id);
  assert.equal(s.draft.questions[2].id, b.id);
  s = reducer(s, { type: "removeQuestion", id: a.id, now: T0 + 8000 });
  assert.equal(s.draft.questions.length, 2);
  s = reducer(s, { type: "undo" });
  assert.equal(s.draft.questions.length, 3, "delete is undoable");
  assert.equal(s.draft.questions[0].id, a.id);
});

test("reorder by index and by step; edges are no-ops", () => {
  let s = start();
  for (let i = 0; i < 4; i++) s = reducer(s, { type: "addQuestion", question: { ...newQuestion(), text: `q${i}` }, now: T0 + i * 5000 });
  const ids = s.draft.questions.map((q) => q.id);
  s = reducer(s, { type: "moveQuestion", id: ids[0], to: 2, now: T0 + 30000 });
  assert.deepEqual(s.draft.questions.map((q) => q.text), ["q1", "q2", "q0", "q3"]);
  s = reducer(s, { type: "moveQuestionBy", id: ids[3], by: -1, now: T0 + 40000 });
  assert.deepEqual(s.draft.questions.map((q) => q.text), ["q1", "q2", "q3", "q0"]);
  const before = s;
  s = reducer(s, { type: "moveQuestionBy", id: ids[1], by: -1, now: T0 + 50000 });
  assert.equal(s, before, "moving the first question up changes nothing");
  s = reducer(s, { type: "moveQuestionBy", id: ids[0], by: 1, now: T0 + 60000 });
  assert.deepEqual(s.draft.questions.map((q) => q.text), ["q1", "q2", "q3", "q0"], "q0 is already last");
});

test("options: add up to 8, remove down to 2, single keeps exactly one correct, multiple toggles", () => {
  let s = start();
  const q = newQuestion("single");
  s = reducer(s, { type: "addQuestion", question: q, now: T0 });
  for (let i = 0; i < 10; i++) s = reducer(s, { type: "addOption", id: q.id, now: T0 + 5000 + i * 2000 });
  assert.equal(s.draft.questions[0].options.length, 8);
  for (let i = 0; i < 10; i++) s = reducer(s, { type: "removeOption", id: q.id, optionId: s.draft.questions[0].options.at(-1).id, now: T0 + 50000 + i * 2000 });
  assert.equal(s.draft.questions[0].options.length, 2);
  const [o1, o2] = s.draft.questions[0].options;
  s = reducer(s, { type: "toggleCorrect", id: q.id, optionId: o1.id, now: T0 + 90000 });
  s = reducer(s, { type: "toggleCorrect", id: q.id, optionId: o2.id, now: T0 + 91000 });
  assert.deepEqual(s.draft.questions[0].options.map((o) => o.isCorrect), [false, true]);
  s = reducer(s, { type: "switchType", id: q.id, to: "multiple", now: T0 + 92000 });
  s = reducer(s, { type: "toggleCorrect", id: q.id, optionId: o1.id, now: T0 + 93000 });
  assert.deepEqual(s.draft.questions[0].options.map((o) => o.isCorrect), [true, true]);
  s = reducer(s, { type: "toggleCorrect", id: q.id, optionId: o2.id, now: T0 + 94000 });
  assert.deepEqual(s.draft.questions[0].options.map((o) => o.isCorrect), [true, false]);
  s = reducer(s, { type: "moveOption", id: q.id, optionId: o1.id, by: 1, now: T0 + 95000 });
  assert.deepEqual(s.draft.questions[0].options.map((x) => x.id), [o2.id, o1.id]);
});

test("replaceQuestion keeps the id (AI regenerate) and is undoable", () => {
  let s = start();
  const q = { ...newQuestion("single"), text: "old" };
  s = reducer(s, { type: "addQuestion", question: q, now: T0 });
  s = reducer(s, { type: "replaceQuestion", id: q.id, question: { ...newQuestion("single"), text: "new" }, now: T0 + 5000 });
  assert.equal(s.draft.questions[0].id, q.id);
  assert.equal(s.draft.questions[0].text, "new");
  s = reducer(s, { type: "undo" });
  assert.equal(s.draft.questions[0].text, "old");
});

test("question count is capped at 100", () => {
  let s = start();
  s = reducer(s, { type: "appendQuestions", questions: Array.from({ length: 120 }, () => newQuestion()), now: T0 });
  assert.equal(s.draft.questions.length, 100);
  const same = s;
  assert.equal(reducer(s, { type: "addQuestion", now: T0 + 5000 }), same);
  assert.equal(reducer(s, { type: "duplicateQuestion", id: s.draft.questions[0].id, now: T0 + 5000 }), same);
});

test("markSaved: edits made while saving stay dirty; a saved password mode returns to keep", () => {
  let s = start();
  s = reducer(s, { type: "set", key: "passwordMode", value: "set", now: T0 });
  s = reducer(s, { type: "set", key: "passwordValue", value: "pw", now: T0 + 5000 });
  const sent = s.draft;
  s = reducer(s, { type: "set", key: "title", value: "typed during save", now: T0 + 9000 });
  s = reducer(s, { type: "markSaved", draft: sent });
  assert.equal(s.saved.passwordMode, "keep");
  assert.equal(s.saved.passwordValue, "");
  assert.equal(isDirty(s), true);
  let t = start();
  t = reducer(t, { type: "set", key: "passwordMode", value: "set", now: T0 });
  t = reducer(t, { type: "markSaved", draft: t.draft });
  assert.equal(isDirty(t), false);
  assert.equal(t.draft.passwordMode, "keep");
});

test("setIn updates one settings field", () => {
  let s = start();
  s = reducer(s, { type: "setIn", key: "settings", sub: "showAnswers", value: true, now: T0 });
  assert.equal(s.draft.settings.showAnswers, true);
  assert.equal(s.draft.settings.shuffleOptions, true);
});

test("focusAfterRemove picks the next, then previous, then details", () => {
  const qs = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.equal(focusAfterRemove(qs, "a"), "b");
  assert.equal(focusAfterRemove(qs, "c"), "b");
  assert.equal(focusAfterRemove([{ id: "a" }], "a"), "details");
});

/* ---------- local draft storage ---------- */

const memoryStorage = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};

test("stored draft round trip, per quiz key, without the password", () => {
  const st = memoryStorage();
  const d = { ...apiToDraft(apiQuiz()), passwordMode: "set", passwordValue: "secret" };
  assert.equal(saveStoredDraft(st, "abc", d, { baseUpdatedAt: "2026-01-01" }), true);
  assert.equal(draftKey(undefined), "quizify:editor:draft:new");
  assert.equal(loadStoredDraft(st, "other"), null);
  const rec = loadStoredDraft(st, "abc");
  assert.equal(rec.draft.title, "Physics");
  assert.equal(rec.baseUpdatedAt, "2026-01-01");
  assert.equal(rec.draft.passwordValue, "");
  assert.equal(JSON.stringify(rec).includes("secret"), false);
  clearStoredDraft(st, "abc");
  assert.equal(loadStoredDraft(st, "abc"), null);
});

test("corrupt, outdated or blocked storage never throws", () => {
  const st = memoryStorage();
  st.setItem(draftKey("x"), "{not json");
  assert.equal(loadStoredDraft(st, "x"), null);
  st.setItem(draftKey("x"), JSON.stringify({ v: 99, draft: {} }));
  assert.equal(loadStoredDraft(st, "x"), null);
  const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); }, removeItem() { throw new Error("blocked"); } };
  assert.equal(saveStoredDraft(blocked, "x", emptyDraft()), false);
  assert.equal(loadStoredDraft(blocked, "x"), null);
  assert.doesNotThrow(() => clearStoredDraft(blocked, "x"));
});

test("fingerprint ignores ids, passwords and AI context but sees content", () => {
  const a = apiToDraft(apiQuiz());
  const b = apiToDraft(apiQuiz());
  assert.notEqual(a.questions[0].id, b.questions[0].id);
  assert.equal(fingerprint(a), fingerprint({ ...b, passwordMode: "set", passwordValue: "x", aiContext: { syllabus: "s" } }));
  assert.notEqual(fingerprint(a), fingerprint({ ...b, title: "Other" }));
  assert.equal(stripSecrets({ ...a, passwordMode: "set", passwordValue: "pw" }).passwordValue, "");
});

/* ---------- AI helpers ---------- */

test("AI form validation mirrors the API", () => {
  const ok = validateAiForm(defaultAiForm());
  assert.ok(ok.errors.syllabus);
  const good = validateAiForm({ ...defaultAiForm(), syllabus: "Photosynthesis, cells" });
  assert.deepEqual(good.errors, {});
  assert.deepEqual(good.input.questionCounts, { single: 5, multiple: 2, integer: 1, text: 2, code: 0 });
  assert.equal(good.input.totalMarks, 20);
  assert.equal(good.total, 10);
  const zero = validateAiForm({ ...defaultAiForm(), syllabus: "abc", counts: { single: "0", multiple: "0", integer: "", text: "0", code: "0" } });
  assert.ok(zero.errors.counts);
  assert.ok(validateAiForm({ ...defaultAiForm(), syllabus: "abc", counts: { single: "51", multiple: "0", integer: "0", text: "0", code: "0" } }).errors["count:single"]);
  assert.ok(validateAiForm({ ...defaultAiForm(), syllabus: "abc", counts: { single: "50", multiple: "50", integer: "1", text: "0", code: "0" } }).errors.counts);
  assert.ok(validateAiForm({ ...defaultAiForm(), syllabus: "abc", totalMarks: "-1" }).errors.totalMarks);
  assert.equal("totalMarks" in validateAiForm({ ...defaultAiForm(), syllabus: "abc", totalMarks: "" }).input, false);
  assert.ok(validateAiForm({ ...defaultAiForm(), syllabus: "x".repeat(5001) }).errors.syllabus);
});

test("generated questions are normalised and applied append or replace; recommendations are opt in", () => {
  const result = normaliseGenerated({
    recommendedTimeLimit: 10,
    recommendedAntiCheat: { aiCamera: false, tabSwitch: true, copyPaste: true, toleranceStrikes: 99 },
    questions: [{ type: "integer", text: "n", marks: 1, correctAnswer: "42" }, { text: "no type", options: [{ text: "a", isCorrect: true }, { text: "b" }] }],
  });
  assert.equal(result.questions.length, 2);
  assert.equal(result.recommendedAntiCheat.toleranceStrikes, 10);
  const base = { ...emptyDraft(), questions: [newQuestion("text")] };
  const ctx = { syllabus: "Optics, lenses", field: "", difficulty: "medium" };
  const appended = applyGeneration(base, result, { mode: "append", context: ctx });
  assert.equal(appended.questions.length, 3);
  assert.equal(appended.timeLimitOn, false);
  assert.equal(appended.antiCheat.aiCamera, true, "recommendations are not applied unless accepted");
  assert.equal(appended.title, "Optics quiz");
  assert.deepEqual(appended.aiContext, ctx);
  const replaced = applyGeneration({ ...base, title: "Mine" }, result, { mode: "replace", useTime: true, useAntiCheat: true, context: ctx });
  assert.equal(replaced.questions.length, 2);
  assert.equal(replaced.timeLimitOn, true);
  assert.equal(replaced.timeLimit, "10");
  assert.equal(replaced.antiCheat.aiCamera, false);
  assert.equal(replaced.title, "Mine");
  assert.equal(normaliseGenerated(null).questions.length, 0);
});

test("AI errors map to calm messages", () => {
  assert.equal(describeAiError({ code: "AI_UNAVAILABLE" }).retry, true);
  assert.equal(describeAiError({ code: "RATE_LIMITED", status: 429 }).retry, false);
  assert.match(describeAiError({ code: "TIMEOUT" }).message, /90 seconds/);
  assert.match(describeAiError({ code: "NETWORK_ERROR" }).message, /untouched/);
});
