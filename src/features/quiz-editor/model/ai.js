import { DIFFICULTIES } from "./constants.js";
import { questionFromAi } from "./draft.js";

/** Default form of the "Generate with AI" dialog. */
export function defaultAiForm(aiContext) {
  return {
    syllabus: aiContext?.syllabus || "",
    field: aiContext?.field || "",
    difficulty: aiContext?.difficulty || "medium",
    totalMarks: "20",
    counts: { single: "5", multiple: "2", integer: "1", text: "2", code: "0" },
  };
}

const toInt = (v) => {
  const t = String(v ?? "").trim();
  return t === "" ? 0 : /^\d+$/.test(t) ? Number(t) : NaN;
};

/** Mirrors backend/validators/ai.js. Returns `{ errors: {field: message}, input }`; `input` is the API body when valid. */
export function validateAiForm(form) {
  const errors = {};
  const syllabus = form.syllabus.trim();
  if (syllabus.length < 3) errors.syllabus = "Describe the topics (at least 3 characters).";
  else if (syllabus.length > 5000) errors.syllabus = "Keep the syllabus under 5000 characters.";
  if (form.field.trim().length > 100) errors.field = "Keep the subject under 100 characters.";
  if (!DIFFICULTIES.includes(form.difficulty)) errors.difficulty = "Choose a difficulty.";
  const marksText = String(form.totalMarks ?? "").trim();
  let totalMarks;
  if (marksText !== "") {
    totalMarks = Number(marksText);
    if (!Number.isFinite(totalMarks) || totalMarks <= 0 || totalMarks > 10000) errors.totalMarks = "Total marks must be a positive number.";
  }
  const counts = {};
  let sum = 0;
  for (const k of ["single", "multiple", "integer", "text", "code"]) {
    const n = toInt(form.counts[k]);
    if (!Number.isInteger(n) || n < 0 || n > 50) errors[`count:${k}`] = "0 to 50.";
    else {
      counts[k] = n;
      sum += n;
    }
  }
  if (!Object.keys(errors).some((k) => k.startsWith("count:")) && (sum < 1 || sum > 100)) errors.counts = "Ask for between 1 and 100 questions in total.";
  const input = { syllabus, difficulty: form.difficulty, questionCounts: counts };
  if (form.field.trim()) input.field = form.field.trim();
  if (totalMarks !== undefined) input.totalMarks = totalMarks;
  return { errors, input, total: sum };
}

/** API result -> `{ questions, recommendedTimeLimit, recommendedAntiCheat }` in draft shape. */
export function normaliseGenerated(data) {
  const d = data || {};
  const questions = Array.isArray(d.questions) ? d.questions.map((q) => questionFromAi(q)) : [];
  const t = Number(d.recommendedTimeLimit);
  const rec = d.recommendedAntiCheat && typeof d.recommendedAntiCheat === "object" ? d.recommendedAntiCheat : null;
  return {
    questions,
    recommendedTimeLimit: Number.isInteger(t) && t >= 1 && t <= 600 ? t : null,
    recommendedAntiCheat: rec
      ? {
          aiCamera: rec.aiCamera === true,
          tabSwitch: rec.tabSwitch === true,
          copyPaste: rec.copyPaste === true,
          toleranceStrikes: Number.isInteger(Number(rec.toleranceStrikes)) ? Math.min(10, Math.max(1, Number(rec.toleranceStrikes))) : 3,
        }
      : null,
  };
}

/** Applies a generation result to a draft. `mode` is "append" or "replace". The teacher's other fields are never touched. */
export function applyGeneration(draft, result, { mode = "append", useTime = false, useAntiCheat = false, context = null } = {}) {
  const questions = mode === "replace" ? result.questions : [...draft.questions, ...result.questions];
  const next = { ...draft, questions, aiContext: context || draft.aiContext };
  if (useTime && result.recommendedTimeLimit) {
    next.timeLimitOn = true;
    next.timeLimit = String(result.recommendedTimeLimit);
  }
  if (useAntiCheat && result.recommendedAntiCheat) {
    next.antiCheat = {
      aiCamera: result.recommendedAntiCheat.aiCamera,
      tabSwitch: result.recommendedAntiCheat.tabSwitch,
      copyPaste: result.recommendedAntiCheat.copyPaste,
      toleranceStrikes: String(result.recommendedAntiCheat.toleranceStrikes),
    };
  }
  if (!draft.title.trim() && context?.syllabus) {
    const first = context.syllabus.split(/[,\n]/)[0].trim().slice(0, 100);
    if (first.length >= 3) next.title = `${first} quiz`;
  }
  return next;
}

/** A person-readable message and whether retrying makes sense, for the AI errors in the contract. */
export function describeAiError(err) {
  const code = err?.code;
  if (code === "AI_UNAVAILABLE") return { message: "The AI service could not answer right now. Nothing in your quiz was changed.", retry: true };
  if (code === "RATE_LIMITED" || err?.status === 429) return { message: "You have used the AI generation limit (10 every 10 minutes). Wait a few minutes, or write questions by hand meanwhile.", retry: false };
  if (code === "TIMEOUT") return { message: "The AI took longer than 90 seconds. Nothing in your quiz was changed. Try fewer questions, or try again.", retry: true };
  if (code === "NETWORK_ERROR") return { message: "Could not reach the server. Check your connection and try again. Your quiz is untouched.", retry: true };
  if (code === "VALIDATION_ERROR") return { message: err.message || "Check the form and try again.", retry: false };
  if (code === "CANCELED") return { message: "Cancelled.", retry: true };
  return { message: err?.message || "Generation failed. Your quiz is untouched.", retry: true };
}
