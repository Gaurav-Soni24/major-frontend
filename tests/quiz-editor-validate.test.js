import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyDraft, newQuestion, newOption } from "../src/features/quiz-editor/model/draft.js";
import { validateDraft, validateQuestion, mapServerDetails, instructionKey, parseIntStrict } from "../src/features/quiz-editor/model/validate.js";

const q = (type, over = {}) => ({ ...newQuestion(type), text: "Question?", ...over });
const opts = (...list) => list.map(([t, c]) => newOption(t, !!c));
const fields = (issues) => issues.map((i) => i.field);
const valid = () => ({
  ...emptyDraft(),
  title: "Quiz one",
  questions: [q("single", { options: opts(["a", true], ["b"]) })],
});

test("a minimal valid quiz has no issues", () => {
  assert.equal(validateDraft(valid()).ok, true);
});

test("title 3-120 characters", () => {
  const d = valid();
  assert.deepEqual(fields(validateDraft({ ...d, title: "" }).issues), ["title"]);
  assert.deepEqual(fields(validateDraft({ ...d, title: "ab" }).issues), ["title"]);
  assert.deepEqual(fields(validateDraft({ ...d, title: "   ab  " }).issues), ["title"]);
  assert.equal(validateDraft({ ...d, title: "abc" }).ok, true);
  assert.equal(validateDraft({ ...d, title: "x".repeat(120) }).ok, true);
  assert.deepEqual(fields(validateDraft({ ...d, title: "x".repeat(121) }).issues), ["title"]);
});

test("description at most 1000", () => {
  const d = valid();
  assert.equal(validateDraft({ ...d, description: "x".repeat(1000) }).ok, true);
  assert.deepEqual(fields(validateDraft({ ...d, description: "x".repeat(1001) }).issues), ["description"]);
});

test("instructions: blanks are ignored, at most 20 of up to 300 chars", () => {
  const d = valid();
  assert.equal(validateDraft({ ...d, instructions: ["", "  ", "ok"] }).ok, true);
  assert.deepEqual(fields(validateDraft({ ...d, instructions: ["x".repeat(301)] }).issues), ["instruction:0"]);
  assert.equal(validateDraft({ ...d, instructions: Array.from({ length: 20 }, () => "x") }).ok, true);
  assert.deepEqual(fields(validateDraft({ ...d, instructions: Array.from({ length: 21 }, () => "x") }).issues), ["instructions"]);
  assert.equal(instructionKey(["", "a", "", "b"], 3), "details:instruction:1");
  assert.equal(instructionKey(["", "a"], 0), null);
});

test("time limit: off is fine, on needs an integer 1-600", () => {
  const d = valid();
  assert.equal(validateDraft({ ...d, timeLimitOn: false, timeLimit: "junk" }).ok, true);
  for (const bad of ["", "0", "601", "1.5", "abc", "-3"]) {
    assert.deepEqual(fields(validateDraft({ ...d, timeLimitOn: true, timeLimit: bad }).issues), ["timeLimit"], bad);
  }
  for (const good of ["1", "600", "45"]) assert.equal(validateDraft({ ...d, timeLimitOn: true, timeLimit: good }).ok, true, good);
});

test("passing score integer 1-100", () => {
  const d = valid();
  for (const bad of ["0", "101", "", "50.5", "x"]) assert.deepEqual(fields(validateDraft({ ...d, passingScore: bad }).issues), ["passingScore"], bad);
  for (const good of ["1", "100", "60"]) assert.equal(validateDraft({ ...d, passingScore: good }).ok, true);
});

test("tolerance strikes integer 1-10", () => {
  const d = valid();
  for (const bad of ["0", "11", "", "2.5"]) {
    assert.deepEqual(fields(validateDraft({ ...d, antiCheat: { ...d.antiCheat, toleranceStrikes: bad } }).issues), ["toleranceStrikes"], bad);
  }
  assert.equal(validateDraft({ ...d, antiCheat: { ...d.antiCheat, toleranceStrikes: "10" } }).ok, true);
});

test("password at most 64 when being set", () => {
  const d = valid();
  assert.equal(validateDraft({ ...d, passwordMode: "set", passwordValue: "x".repeat(64) }).ok, true);
  assert.deepEqual(fields(validateDraft({ ...d, passwordMode: "set", passwordValue: "x".repeat(65) }).issues), ["password"]);
});

test("custom fields: max 5, name 1-40, unique, no $ prefix or dot", () => {
  const d = valid();
  const f = (name, id = name) => ({ id, name, type: "text" });
  assert.equal(validateDraft({ ...d, customFields: [f("Roll no"), f("Section")] }).ok, true);
  assert.deepEqual(fields(validateDraft({ ...d, customFields: [f("")] }).issues), ["field:" + "" + ":name"]);
  assert.deepEqual(fields(validateDraft({ ...d, customFields: [f("a", "1"), f("A", "2")] }).issues), ["field:2:name"]);
  assert.deepEqual(fields(validateDraft({ ...d, customFields: [f("$x", "1")] }).issues), ["field:1:name"]);
  assert.deepEqual(fields(validateDraft({ ...d, customFields: [f("a.b", "1")] }).issues), ["field:1:name"]);
  assert.deepEqual(fields(validateDraft({ ...d, customFields: [f("x".repeat(41), "1")] }).issues), ["field:1:name"]);
  const six = Array.from({ length: 6 }, (_, i) => f(`n${i}`, String(i)));
  assert.ok(fields(validateDraft({ ...d, customFields: six }).issues).includes("customFields"));
});

test("questions: 1 to 100", () => {
  const d = valid();
  assert.deepEqual(fields(validateDraft({ ...d, questions: [] }).issues), ["questions"]);
  const many = Array.from({ length: 101 }, () => q("integer", { correctAnswer: "1" }));
  assert.ok(fields(validateDraft({ ...d, questions: many }).issues).includes("questions"));
  assert.equal(validateDraft({ ...d, questions: many.slice(0, 100) }).ok, true);
});

test("question text 1-4000 and marks > 0 and <= 100", () => {
  assert.deepEqual(fields(validateQuestion(q("integer", { text: "  ", correctAnswer: "1" }))), ["text"]);
  assert.deepEqual(fields(validateQuestion(q("integer", { text: "x".repeat(4001), correctAnswer: "1" }))), ["text"]);
  assert.deepEqual(validateQuestion(q("integer", { text: "x".repeat(4000), correctAnswer: "1" })), []);
  for (const bad of ["", "0", "-1", "101", "abc", "1e999"]) {
    assert.deepEqual(fields(validateQuestion(q("integer", { marks: bad, correctAnswer: "1" }))), ["marks"], bad);
  }
  for (const good of ["0.5", "100", "2"]) assert.deepEqual(validateQuestion(q("integer", { marks: good, correctAnswer: "1" })), [], good);
});

test("single: 2-8 options, exactly one correct, unique non-empty text", () => {
  assert.deepEqual(validateQuestion(q("single", { options: opts(["a", true], ["b"]) })), []);
  assert.ok(fields(validateQuestion(q("single", { options: opts(["a", true]) }))).includes("options"));
  const nine = Array.from({ length: 9 }, (_, i) => [`o${i}`, i === 0]);
  assert.ok(fields(validateQuestion(q("single", { options: opts(...nine) }))).includes("options"));
  assert.equal(validateQuestion(q("single", { options: opts(...nine.slice(0, 8)) })).length, 0);
  assert.deepEqual(fields(validateQuestion(q("single", { options: opts(["a"], ["b"]) }))), ["correct"]);
  assert.deepEqual(fields(validateQuestion(q("single", { options: opts(["a", true], ["b", true]) }))), ["correct"]);
  const blank = q("single", { options: opts(["a", true], [" "]) });
  assert.deepEqual(fields(validateQuestion(blank)), [`option:${blank.options[1].id}`]);
  const dup = q("single", { options: opts(["a", true], [" a "]) });
  assert.deepEqual(fields(validateQuestion(dup)), [`option:${dup.options[1].id}`]);
  const long = q("single", { options: opts(["x".repeat(501), true], ["b"]) });
  assert.equal(validateQuestion(long).length, 1);
});

test("multiple: at least one correct", () => {
  assert.deepEqual(validateQuestion(q("multiple", { options: opts(["a", true], ["b", true]) })), []);
  assert.deepEqual(fields(validateQuestion(q("multiple", { options: opts(["a"], ["b"]) }))), ["correct"]);
});

test("integer: the answer must be a finite number", () => {
  for (const good of ["42", "-3", "3.14", "  7 ", "1e3", ".5"]) assert.deepEqual(validateQuestion(q("integer", { correctAnswer: good })), [], good);
  for (const bad of ["", "abc", "1,5", "Infinity", "NaN", "0x10", "1e999"]) assert.deepEqual(fields(validateQuestion(q("integer", { correctAnswer: bad }))), ["correctAnswer"], bad);
});

test("text and code need a reference answer or a rubric", () => {
  for (const type of ["text", "code"]) {
    assert.deepEqual(fields(validateQuestion(q(type))), ["correctAnswer"]);
    assert.deepEqual(validateQuestion(q(type, { correctAnswer: "ref" })), []);
    assert.deepEqual(validateQuestion(q(type, { aiGradingRubric: "rubric" })), []);
    assert.deepEqual(fields(validateQuestion(q(type, { correctAnswer: "x".repeat(4001) }))), ["correctAnswer"]);
    assert.deepEqual(fields(validateQuestion(q(type, { correctAnswer: "ok", aiGradingRubric: "x".repeat(4001) }))), ["aiGradingRubric"]);
  }
});

test("code: language javascript|python, starter code <= 8000", () => {
  assert.deepEqual(validateQuestion(q("code", { correctAnswer: "r", codeLanguage: "python", starterCode: "x".repeat(8000) })), []);
  assert.deepEqual(fields(validateQuestion(q("code", { correctAnswer: "r", codeLanguage: "ruby" }))), ["codeLanguage"]);
  assert.deepEqual(fields(validateQuestion(q("code", { correctAnswer: "r", starterCode: "x".repeat(8001) }))), ["starterCode"]);
});

test("summary indexes issues per question", () => {
  const d = { ...valid(), title: "", questions: [q("integer"), q("integer", { correctAnswer: "1" })] };
  const s = validateDraft(d);
  assert.equal(s.byQuestion.get(d.questions[0].id), 1);
  assert.equal(s.byQuestion.has(d.questions[1].id), false);
  assert.equal(s.details, 1);
  assert.ok(s.byKey.has("details:title"));
});

test("parseIntStrict", () => {
  assert.equal(parseIntStrict("12"), 12);
  assert.ok(Number.isNaN(parseIntStrict("1.2")));
  assert.ok(Number.isNaN(parseIntStrict("")));
});

test("server details map onto the right question, option and field", () => {
  const d = {
    ...valid(),
    instructions: ["", "keep me"],
    customFields: [{ id: "c1", name: "Roll", type: "text" }],
    questions: [q("single", { options: opts(["a", true], ["b"]) }), q("multiple", { options: opts(["x", true], ["y"], ["z"]) })],
  };
  const r = mapServerDetails(
    [
      { field: "questions[1].options", message: "needs correct" },
      { field: "questions[1].options[2].text", message: "dup" },
      { field: "questions[0].marks", message: "bad marks" },
      { field: "title", message: "short" },
      { field: "instructions[0]", message: "too long" },
      { field: "customFields[0].name", message: "bad" },
      { field: "antiCheatSettings.toleranceStrikes", message: "range" },
      { field: "timeLimit", message: "range" },
      { field: "questions", message: "count" },
      { field: "mystery.path", message: "?" },
    ],
    d,
  );
  const keys = r.issues.map((i) => i.key);
  assert.deepEqual(keys, [
    `${d.questions[1].id}:options`,
    `${d.questions[1].id}:option:${d.questions[1].options[2].id}`,
    `${d.questions[0].id}:marks`,
    "details:title",
    "details:instruction:0",
    "settings:field:c1:name",
    "settings:toleranceStrikes",
    "settings:timeLimit",
    "list:questions",
  ]);
  assert.equal(r.unmapped.length, 1);
  assert.equal(r.unmapped[0].field, "mystery.path");
});

test("server details also accept dotted index paths", () => {
  const d = valid();
  const r = mapServerDetails([{ field: "questions.0.text", message: "x" }], d);
  assert.equal(r.issues[0].key, `${d.questions[0].id}:text`);
});
