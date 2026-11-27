import { QUESTION_TYPES, isChoice } from "./constants.js";

/**
 * The editor works on a "draft": plain, JSON-safe, every row has a stable client `id` (never sent to the API).
 * Numbers that the teacher types are kept as strings so half-typed values survive; `toPayload` converts them.
 */

let counter = 0;
/** Short unique id for client-side rows. */
export function uid(prefix = "x") {
  counter += 1;
  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

export function newOption(text = "", isCorrect = false) {
  return { id: uid("o"), text, isCorrect };
}

/** A blank question of the given type. */
export function newQuestion(type = "single", overrides = {}) {
  const t = QUESTION_TYPES.includes(type) ? type : "single";
  return {
    id: uid("q"),
    type: t,
    text: "",
    marks: "1",
    options: isChoice(t) ? [newOption(), newOption()] : [],
    correctAnswer: "",
    aiGradingRubric: "",
    codeLanguage: "javascript",
    starterCode: "",
    ...overrides,
  };
}

/** Defaults for a brand-new quiz (match the previous create page). */
export function emptyDraft() {
  return {
    title: "",
    description: "",
    instructions: [""],
    customFields: [],
    timeLimitOn: false,
    timeLimit: "30",
    passingScore: "60",
    settings: { shuffleQuestions: true, shuffleOptions: true, showAnswers: false },
    antiCheat: { aiCamera: true, tabSwitch: true, copyPaste: true, toleranceStrikes: "3" },
    // "keep" = leave the stored password alone (omitted from the payload), "set" = use passwordValue, "remove" = clear it.
    passwordMode: "keep",
    passwordValue: "",
    questions: [],
    aiContext: null,
  };
}

const str = (v) => (typeof v === "string" ? v : v === undefined || v === null ? "" : String(v));

/** One API/AI question -> draft question. Tolerant: the AI sometimes omits `type`. */
export function questionFromApi(q, fallbackType = "single") {
  const type = QUESTION_TYPES.includes(q?.type) ? q.type : fallbackType;
  const options = Array.isArray(q?.options) ? q.options.map((o) => newOption(str(o?.text), o?.isCorrect === true)) : [];
  const base = newQuestion(type);
  return {
    ...base,
    text: str(q?.text),
    marks: q?.marks === undefined || q?.marks === null ? "1" : String(q.marks),
    options: isChoice(type) ? (options.length ? options : base.options) : [],
    correctAnswer: str(q?.correctAnswer),
    aiGradingRubric: str(q?.aiGradingRubric),
    codeLanguage: q?.codeLanguage === "python" ? "python" : "javascript",
    starterCode: str(q?.starterCode),
  };
}

/** A question from the AI. Same as the API shape; the AI sometimes omits `type`, `marks` or sends a numeric answer. */
export function questionFromAi(q, fallbackType = "single") {
  return questionFromApi(q, fallbackType);
}

/** GET /quizzes/:id -> draft. */
export function apiToDraft(quiz) {
  const q = quiz || {};
  const base = emptyDraft();
  const instructions = Array.isArray(q.instructions) && q.instructions.length ? q.instructions.map(str) : [""];
  return {
    ...base,
    title: str(q.title),
    description: str(q.description),
    instructions,
    customFields: Array.isArray(q.customFields)
      ? q.customFields.map((f) => ({ id: uid("c"), name: str(f?.name), type: f?.type === "number" ? "number" : "text" }))
      : [],
    timeLimitOn: q.timeLimit !== null && q.timeLimit !== undefined && q.timeLimit !== "",
    timeLimit: q.timeLimit ? String(q.timeLimit) : "30",
    passingScore: q.passingScore === undefined || q.passingScore === null ? "60" : String(q.passingScore),
    settings: {
      shuffleQuestions: q.settings?.shuffleQuestions !== false,
      shuffleOptions: q.settings?.shuffleOptions !== false,
      showAnswers: q.settings?.showAnswers === true,
    },
    antiCheat: {
      aiCamera: q.antiCheatSettings?.aiCamera !== false,
      tabSwitch: q.antiCheatSettings?.tabSwitch !== false,
      copyPaste: q.antiCheatSettings?.copyPaste !== false,
      toleranceStrikes: String(q.antiCheatSettings?.toleranceStrikes ?? 3),
    },
    passwordMode: "keep",
    passwordValue: "",
    questions: Array.isArray(q.questions) ? q.questions.map((x) => questionFromApi(x)) : [],
    aiContext: null,
  };
}

/** The non-blank instructions, trimmed. The API rejects blank ones, so they are dropped from the payload. */
export function cleanInstructions(draft) {
  return draft.instructions.map((s) => s.trim()).filter(Boolean);
}

/** Parses a numeric string; NaN when it is not a plain finite number (same rule as the backend). */
export function parseNumeric(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : NaN;
  if (typeof v !== "string") return NaN;
  const t = v.trim();
  if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t)) return NaN;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

/** Question -> API shape. Only fields that belong to the type are sent. */
export function questionToPayload(q) {
  const out = { type: q.type, text: q.text.trim(), marks: parseNumeric(q.marks) };
  if (isChoice(q.type)) {
    out.options = q.options.map((o) => ({ text: o.text.trim(), isCorrect: o.isCorrect === true }));
  } else if (q.type === "integer") {
    out.correctAnswer = q.correctAnswer.trim();
  } else {
    out.correctAnswer = q.correctAnswer.trim();
    out.aiGradingRubric = q.aiGradingRubric.trim();
    if (q.type === "code") {
      out.codeLanguage = q.codeLanguage === "python" ? "python" : "javascript";
      out.starterCode = q.starterCode;
    }
  }
  return out;
}

/** Draft -> POST/PUT body. Call on a draft that passed validation (or deliberately, to see the server's answer). */
export function toPayload(draft) {
  const payload = {
    title: draft.title.trim(),
    description: draft.description.trim(),
    instructions: cleanInstructions(draft),
    customFields: draft.customFields.map((f) => ({ name: f.name.trim(), type: f.type })),
    timeLimit: draft.timeLimitOn ? parseInt(draft.timeLimit, 10) : null,
    passingScore: parseInt(draft.passingScore, 10),
    settings: { ...draft.settings },
    antiCheatSettings: {
      aiCamera: draft.antiCheat.aiCamera,
      tabSwitch: draft.antiCheat.tabSwitch,
      copyPaste: draft.antiCheat.copyPaste,
      toleranceStrikes: parseInt(draft.antiCheat.toleranceStrikes, 10),
    },
    questions: draft.questions.map(questionToPayload),
  };
  if (draft.passwordMode === "set" && draft.passwordValue) payload.password = draft.passwordValue;
  else if (draft.passwordMode === "remove") payload.password = "";
  return payload;
}

export function totalMarks(draft) {
  const sum = draft.questions.reduce((s, q) => {
    const n = parseNumeric(q.marks);
    return s + (Number.isNaN(n) ? 0 : n);
  }, 0);
  return Math.round(sum * 100) / 100;
}

/* ---------- list helpers (pure, return new arrays) ---------- */

export function moveItem(list, from, to) {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Copy of a question with fresh ids (the reducer inserts it right after the original). */
export function cloneQuestion(q) {
  return { ...q, id: uid("q"), options: q.options.map((o) => ({ ...o, id: uid("o") })) };
}

/**
 * Switches a question's type. Compatible data is kept; incompatible data is dropped and listed in `lost`
 * so the UI can warn before it happens.
 * @returns {{ question: object, lost: string[] }}
 */
export function switchType(q, type) {
  if (!QUESTION_TYPES.includes(type) || type === q.type) return { question: q, lost: [] };
  const lost = [];
  const next = { ...q, type };
  const filled = q.options.filter((o) => o.text.trim());

  if (isChoice(type)) {
    if (isChoice(q.type)) {
      if (type === "single") {
        const correct = q.options.filter((o) => o.isCorrect);
        if (correct.length > 1) {
          const extra = correct.length - 1;
          lost.push(`${extra} extra correct ${extra === 1 ? "mark" : "marks"}`);
          let seen = false;
          next.options = q.options.map((o) => {
            if (!o.isCorrect) return o;
            if (seen) return { ...o, isCorrect: false };
            seen = true;
            return o;
          });
        }
      }
    } else {
      next.options = [newOption(), newOption()];
      if (q.type === "integer" && q.correctAnswer.trim()) lost.push("the numeric answer");
      if ((q.type === "text" || q.type === "code") && (q.correctAnswer.trim() || q.aiGradingRubric.trim())) lost.push("the reference answer and rubric");
      if (q.type === "code" && q.starterCode.trim()) lost.push("the starter code");
      next.correctAnswer = "";
      next.aiGradingRubric = "";
      next.starterCode = "";
    }
  } else {
    if (isChoice(q.type) && filled.length) lost.push(`${filled.length} ${filled.length === 1 ? "option" : "options"}`);
    next.options = [];
    if (type === "integer") {
      if (Number.isNaN(parseNumeric(q.correctAnswer))) {
        if (q.correctAnswer.trim()) lost.push("the reference answer (it is not a number)");
        next.correctAnswer = "";
      }
      if (q.aiGradingRubric.trim()) lost.push("the rubric");
      next.aiGradingRubric = "";
      if (q.starterCode.trim()) lost.push("the starter code");
      next.starterCode = "";
    } else if (type === "text") {
      if (q.starterCode.trim()) lost.push("the starter code");
      next.starterCode = "";
    }
    // text <-> code keep the reference answer and rubric; anything -> text/code keeps the question text and marks.
  }
  return { question: next, lost };
}
