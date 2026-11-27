import { LIMITS, isChoice } from "./constants.js";
import { cleanInstructions, parseNumeric } from "./draft.js";

/**
 * Client-side validation that mirrors backend/validators/quiz.js exactly (docs/API_CONTRACT.md "Quizzes").
 *
 * An issue is `{ key, scope, qid?, field, message }`:
 *  - scope "details"  : title, description, instruction:<index of the non-blank instruction>
 *  - scope "settings" : timeLimit, passingScore, toleranceStrikes, password, field:<customFieldId>:name
 *  - scope "list"     : questions (the number of questions)
 *  - scope "question" : text, marks, options, option:<optionId>, correctAnswer, aiGradingRubric, codeLanguage, starterCode
 * `key` is `<qid|scope>:<field>` and is what the UI uses to find the control.
 */

const make = (scope, field, message, qid) => ({ key: `${qid || scope}:${field}`, scope, qid, field, message });

const INT_RE = /^[+-]?\d+$/;

/** Parses an integer from a string; NaN when it is not a plain integer. */
export function parseIntStrict(v) {
  if (typeof v === "number") return Number.isInteger(v) ? v : NaN;
  if (typeof v !== "string") return NaN;
  const t = v.trim();
  return INT_RE.test(t) ? Number(t) : NaN;
}

/** @returns {Array<ReturnType<typeof make>>} */
export function validateQuestion(q) {
  const out = [];
  const add = (field, message) => out.push(make("question", field, message, q.id));
  const text = q.text.trim();
  if (!text) add("text", "Write the question.");
  else if (text.length > LIMITS.questionTextMax) add("text", `Keep the question under ${LIMITS.questionTextMax} characters.`);

  const marks = parseNumeric(q.marks);
  if (Number.isNaN(marks) || marks <= 0 || marks > LIMITS.marksMax) add("marks", `Marks must be a number above 0 and at most ${LIMITS.marksMax}.`);

  if (isChoice(q.type)) {
    const n = q.options.length;
    if (n < LIMITS.optionsMin || n > LIMITS.optionsMax) add("options", `Use ${LIMITS.optionsMin} to ${LIMITS.optionsMax} options.`);
    const seen = new Set();
    for (const o of q.options) {
      const t = o.text.trim();
      if (!t) add(`option:${o.id}`, "Write this option or remove it.");
      else if (t.length > LIMITS.optionTextMax) add(`option:${o.id}`, `Keep options under ${LIMITS.optionTextMax} characters.`);
      else if (seen.has(t)) add(`option:${o.id}`, "Each option must be different.");
      seen.add(t);
    }
    const correct = q.options.filter((o) => o.isCorrect).length;
    if (q.type === "single" && correct !== 1) add("correct", "Mark exactly one option as correct.");
    if (q.type === "multiple" && correct < 1) add("correct", "Mark at least one option as correct.");
  } else if (q.type === "integer") {
    if (Number.isNaN(parseNumeric(q.correctAnswer))) add("correctAnswer", "Enter the correct answer as a number.");
  } else {
    const ref = q.correctAnswer.trim();
    const rubric = q.aiGradingRubric.trim();
    if (!ref && !rubric) add("correctAnswer", "Add a reference answer or a grading rubric so answers can be marked.");
    if (q.correctAnswer.length > LIMITS.referenceMax) add("correctAnswer", `Keep the reference answer under ${LIMITS.referenceMax} characters.`);
    if (q.aiGradingRubric.length > LIMITS.referenceMax) add("aiGradingRubric", `Keep the rubric under ${LIMITS.referenceMax} characters.`);
    if (q.type === "code") {
      if (q.codeLanguage !== "javascript" && q.codeLanguage !== "python") add("codeLanguage", "Choose JavaScript or Python.");
      if (q.starterCode.length > LIMITS.starterCodeMax) add("starterCode", `Keep the starter code under ${LIMITS.starterCodeMax} characters.`);
    }
  }
  return out;
}

/** Title, description, instructions. */
export function validateDetails(draft) {
  const out = [];
  const add = (field, message) => out.push(make("details", field, message));
  const title = draft.title.trim();
  if (title.length < LIMITS.titleMin) add("title", title ? `The title needs at least ${LIMITS.titleMin} characters.` : "Give the quiz a title.");
  else if (title.length > LIMITS.titleMax) add("title", `Keep the title under ${LIMITS.titleMax} characters.`);
  if (draft.description.trim().length > LIMITS.descriptionMax) add("description", `Keep the description under ${LIMITS.descriptionMax} characters.`);
  const instructions = cleanInstructions(draft);
  if (instructions.length > LIMITS.instructionsMax) add("instructions", `Use at most ${LIMITS.instructionsMax} instructions.`);
  instructions.forEach((s, i) => {
    if (s.length > LIMITS.instructionMax) add(`instruction:${i}`, `Keep each instruction under ${LIMITS.instructionMax} characters.`);
  });
  return out;
}

/** Time, scoring, proctoring, password, registration fields. */
export function validateSettings(draft) {
  const out = [];
  const add = (field, message) => out.push(make("settings", field, message));
  if (draft.timeLimitOn) {
    const t = parseIntStrict(draft.timeLimit);
    if (Number.isNaN(t) || t < LIMITS.timeLimitMin || t > LIMITS.timeLimitMax) add("timeLimit", `Time limit is a whole number of minutes from ${LIMITS.timeLimitMin} to ${LIMITS.timeLimitMax}.`);
  }
  const p = parseIntStrict(draft.passingScore);
  if (Number.isNaN(p) || p < LIMITS.passingMin || p > LIMITS.passingMax) add("passingScore", `Passing score is a whole percentage from ${LIMITS.passingMin} to ${LIMITS.passingMax}.`);
  const s = parseIntStrict(draft.antiCheat.toleranceStrikes);
  if (Number.isNaN(s) || s < LIMITS.strikesMin || s > LIMITS.strikesMax) add("toleranceStrikes", `Strikes is a whole number from ${LIMITS.strikesMin} to ${LIMITS.strikesMax}.`);
  if (draft.passwordMode === "set" && draft.passwordValue.length > LIMITS.passwordMax) add("password", `Keep the password under ${LIMITS.passwordMax} characters.`);
  if (draft.customFields.length > LIMITS.customFieldsMax) add("customFields", `Use at most ${LIMITS.customFieldsMax} registration fields.`);
  const names = new Set();
  for (const f of draft.customFields) {
    const name = f.name.trim();
    const field = `field:${f.id}:name`;
    if (!name) add(field, "Name this field or remove it.");
    else if (name.length > LIMITS.customFieldNameMax) add(field, `Keep names under ${LIMITS.customFieldNameMax} characters.`);
    else if (name.startsWith("$") || name.includes(".")) add(field, 'Names cannot start with "$" or contain ".".');
    else if (names.has(name.toLowerCase())) add(field, "Field names must be different.");
    names.add(name.toLowerCase());
  }
  return out;
}

/**
 * Everything that would make the API refuse the quiz.
 * @returns {{ issues: ReturnType<typeof make>[], byKey: Map<string, string>, byQuestion: Map<string, number>, details: number, settings: number, ok: boolean }}
 */
export function validateDraft(draft) {
  const issues = [...validateDetails(draft), ...validateSettings(draft)];
  const n = draft.questions.length;
  if (n < LIMITS.questionsMin) issues.push(make("list", "questions", "Add at least one question."));
  else if (n > LIMITS.questionsMax) issues.push(make("list", "questions", `A quiz can have at most ${LIMITS.questionsMax} questions.`));
  for (const q of draft.questions) issues.push(...validateQuestion(q));
  return summarise(issues);
}

/** Index issues by key and count per target. */
export function summarise(issues) {
  const byKey = new Map();
  const byQuestion = new Map();
  let details = 0;
  let settings = 0;
  for (const i of issues) {
    if (!byKey.has(i.key)) byKey.set(i.key, i.message);
    if (i.scope === "question") byQuestion.set(i.qid, (byQuestion.get(i.qid) || 0) + 1);
    if (i.scope === "details") details += 1;
    if (i.scope === "settings") settings += 1;
  }
  return { issues, byKey, byQuestion, details, settings, ok: issues.length === 0 };
}

/**
 * Maps `ApiError.details` (`[{ field, message }]`, paths like `questions[2].options[1].text`) onto editor issues.
 * Unknown paths are returned as `unmapped` so nothing is swallowed.
 * @returns {{ issues: ReturnType<typeof make>[], unmapped: Array<{field?: string, message: string}> }}
 */
export function mapServerDetails(details, draft) {
  const issues = [];
  const unmapped = [];
  const instructions = draft.instructions.map((s) => s.trim());
  // The payload drops blank instructions, so server indexes refer to the non-blank list.
  const nonBlank = instructions.map((s, i) => (s ? i : -1)).filter((i) => i >= 0);

  for (const d of Array.isArray(details) ? details : []) {
    const field = typeof d?.field === "string" ? d.field : "";
    const message = d?.message || "This value was rejected by the server.";
    const norm = field.replace(/\[(\d+)\]/g, ".$1");
    const parts = norm.split(".");
    let issue = null;

    if (parts[0] === "questions" && parts.length === 1) issue = make("list", "questions", message);
    else if (parts[0] === "questions" && /^\d+$/.test(parts[1] || "")) {
      const q = draft.questions[Number(parts[1])];
      if (q) {
        const sub = parts[2];
        if (sub === "options" && /^\d+$/.test(parts[3] || "")) {
          const o = q.options[Number(parts[3])];
          issue = o ? make("question", `option:${o.id}`, message, q.id) : make("question", "options", message, q.id);
        } else if (sub === "options") issue = make("question", "options", message, q.id);
        else if (sub === "text" || sub === "marks" || sub === "correctAnswer" || sub === "aiGradingRubric" || sub === "codeLanguage" || sub === "starterCode") {
          issue = make("question", sub, message, q.id);
        } else issue = make("question", "text", message, q.id);
      }
    } else if (parts[0] === "title" || parts[0] === "description") issue = make("details", parts[0], message);
    else if (parts[0] === "instructions") {
      issue = /^\d+$/.test(parts[1] || "") && nonBlank[Number(parts[1])] !== undefined
        ? make("details", `instruction:${Number(parts[1])}`, message)
        : make("details", "instructions", message);
    } else if (parts[0] === "timeLimit" || parts[0] === "passingScore" || parts[0] === "password") issue = make("settings", parts[0], message);
    else if (parts[0] === "antiCheatSettings") issue = make("settings", parts[1] === "toleranceStrikes" ? "toleranceStrikes" : "antiCheat", message);
    else if (parts[0] === "settings") issue = make("settings", "settings", message);
    else if (parts[0] === "customFields") {
      const f = /^\d+$/.test(parts[1] || "") ? draft.customFields[Number(parts[1])] : null;
      issue = f ? make("settings", `field:${f.id}:name`, message) : make("settings", "customFields", message);
    }

    if (issue) issues.push(issue);
    else unmapped.push({ field: field || undefined, message });
  }
  return { issues, unmapped };
}

/** Issue key of instruction row `rowIndex` (blank rows have no key because they are dropped from the payload). */
export function instructionKey(instructions, rowIndex) {
  if (!instructions[rowIndex] || !instructions[rowIndex].trim()) return null;
  let n = 0;
  for (let i = 0; i < rowIndex; i++) if (instructions[i].trim()) n += 1;
  return `details:instruction:${n}`;
}
