import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyDraft, newQuestion, newOption } from "../src/features/quiz-editor/model/draft.js";
import { mapServerDetails } from "../src/features/quiz-editor/model/validate.js";
import { stampIssues, liveIssues } from "../src/features/quiz-editor/model/serverIssues.js";
import { createState, reducer } from "../src/features/quiz-editor/model/reducer.js";

const base = () => ({ ...emptyDraft(), title: "Quiz", questions: [{ ...newQuestion("single"), text: "q", options: [newOption("a", true), newOption("b")] }] });

test("a server issue stays while its question is unchanged and goes away when it is edited", () => {
  const d = base();
  const { issues } = mapServerDetails([{ field: "questions[0].marks", message: "bad" }], d);
  const stamped = stampIssues(issues, d);
  assert.equal(liveIssues(stamped, d).length, 1);
  let s = createState(d);
  s = reducer(s, { type: "updateQuestion", id: d.questions[0].id, patch: { text: "changed" }, now: 1 });
  assert.equal(liveIssues(stamped, s.draft).length, 0, "editing the question clears the issue");
  s = reducer(s, { type: "undo" });
  assert.equal(liveIssues(stamped, s.draft).length, 1, "undo back to the rejected version shows it again");
});

test("details and settings issues follow their own field only", () => {
  const d = base();
  const { issues } = mapServerDetails(
    [
      { field: "title", message: "short" },
      { field: "timeLimit", message: "range" },
    ],
    d,
  );
  const stamped = stampIssues(issues, d);
  const edited = { ...d, description: "something else" };
  assert.equal(liveIssues(stamped, edited).length, 2, "unrelated edits keep them");
  assert.deepEqual(liveIssues(stamped, { ...d, title: "Longer title" }).map((i) => i.field), ["timeLimit"]);
  assert.deepEqual(liveIssues(stamped, { ...d, timeLimit: "20" }).map((i) => i.field), ["title"]);
});

test("a removed question's issues disappear", () => {
  const d = base();
  const { issues } = mapServerDetails([{ field: "questions[0].text", message: "x" }], d);
  const stamped = stampIssues(issues, d);
  assert.equal(liveIssues(stamped, { ...d, questions: [] }).length, 0);
});
