/** Answer shapes per question type, emptiness, and conversion to the API format. */

const NUMBER_CHARS = /^[+-]?(\d+\.?\d*|\.\d+)?([eE][+-]?\d*)?$/;

/** What the input holds when nothing was answered. */
export function emptyAnswerFor(type) {
  return type === "multiple" ? [] : "";
}

/** True for numbers like "42", "-3.5", ".5", "1e3". */
export function isValidNumberText(text) {
  const t = String(text ?? "").trim();
  if (t === "") return false;
  return NUMBER_CHARS.test(t) && Number.isFinite(Number(t));
}

/** Lets the student type partial numbers ("-", "3.", "1e") but nothing else. */
export function isAllowedNumberInput(text) {
  const t = String(text ?? "");
  return t === "" || NUMBER_CHARS.test(t.trim());
}

/** Does this value count as an answer? Code equal to the starter code does not. */
export function isAnswered(question, value) {
  if (value === null || value === undefined) return false;
  switch (question.type) {
    case "multiple":
      return Array.isArray(value) && value.length > 0;
    case "single":
      return typeof value === "string" && value !== "";
    case "integer":
      return typeof value === "string" && value.trim() !== "";
    case "code":
      return typeof value === "string" && value.trim() !== "" && value !== (question.starterCode || "");
    default:
      return typeof value === "string" && value.trim() !== "";
  }
}

/** Value to send to the API: empty answers become null (clears the saved one). */
export function toApiAnswer(question, value) {
  if (!isAnswered(question, value)) return null;
  if (question.type === "multiple") return Array.from(new Set(value));
  if (question.type === "integer") return String(value).trim();
  return value;
}

/** Toggle one option text in a multiple answer, keeping the order the options are shown in. */
export function toggleOption(current, optionText, optionOrder = []) {
  const set = new Set(Array.isArray(current) ? current : []);
  if (set.has(optionText)) set.delete(optionText);
  else set.add(optionText);
  if (!optionOrder.length) return Array.from(set);
  return optionOrder.filter((t) => set.has(t)).concat(Array.from(set).filter((t) => !optionOrder.includes(t)));
}

/** Entries for the API from a map questionId -> value, following question order. */
export function toEntries(questions, answers) {
  return questions.map((q) => ({ questionId: String(q._id), userAnswer: toApiAnswer(q, answers[String(q._id)]) }));
}

/** Turn the server's saved list into the answers map; ignores unknown questions and bad shapes. */
export function restoreAnswers(questions, saved) {
  const byId = new Map(questions.map((q) => [String(q._id), q]));
  const out = {};
  for (const entry of saved || []) {
    const q = byId.get(String(entry && entry.questionId));
    if (!q) continue;
    const v = entry.userAnswer;
    if (v === null || v === undefined) continue;
    if (q.type === "multiple") {
      if (Array.isArray(v) && v.length) out[String(q._id)] = v.filter((x) => typeof x === "string");
    } else if (typeof v === "string" || typeof v === "number") {
      out[String(q._id)] = String(v);
    }
  }
  return out;
}
