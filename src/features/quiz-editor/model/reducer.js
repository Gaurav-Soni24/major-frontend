import { cloneQuestion, moveItem, newOption, newQuestion, switchType, uid } from "./draft.js";
import { LIMITS } from "./constants.js";

/**
 * Editor state: `{ draft, past, future, saved }`.
 *  - `draft`  current document (plain JSON, structurally shared between versions)
 *  - `past` / `future`  undo and redo stacks of earlier drafts (max HISTORY)
 *  - `saved`  the draft that matches the server; `isDirty` is a reference comparison, so undoing back to it is clean again
 * Typing coalesces: consecutive edits with the same `group` within COALESCE_MS share one undo step.
 */

export const HISTORY = 100;
export const COALESCE_MS = 900;

export function createState(draft) {
  return { draft, past: [], future: [], saved: draft, group: null, at: 0 };
}

export const isDirty = (state) => state.draft !== state.saved;

/** Applies `next` as a new history step (or merges into the last one when `group` repeats quickly). */
function commit(state, next, group, now) {
  if (next === state.draft) return state;
  const merge = group && state.group === group && now - state.at < COALESCE_MS && state.past.length > 0;
  const past = merge ? state.past : [...state.past, state.draft].slice(-HISTORY);
  return { ...state, draft: next, past, future: [], group: group || null, at: now };
}

const mapQuestion = (draft, id, fn) => {
  let changed = false;
  const questions = draft.questions.map((q) => {
    if (q.id !== id) return q;
    const n = fn(q);
    if (n !== q) changed = true;
    return n;
  });
  return changed ? { ...draft, questions } : draft;
};

const indexOfQuestion = (draft, id) => draft.questions.findIndex((q) => q.id === id);

/**
 * Pure reducer. Every action may carry `now` (ms) so tests are deterministic.
 * Actions:
 *  set {key, value, group?}          top level field (title, description, instructions, customFields, timeLimit...)
 *  setIn {key, sub, value}           settings / antiCheat sub field
 *  addQuestion {questionType?|question?, index?}
 *  updateQuestion {id, patch}        text, marks, correctAnswer, aiGradingRubric, codeLanguage, starterCode
 *  replaceQuestion {id, question}    keeps the id (AI regenerate)
 *  switchType {id, to}
 *  addOption {id} / removeOption {id, optionId} / updateOption {id, optionId, text} / toggleCorrect {id, optionId} / moveOption {id, optionId, by}
 *  moveQuestion {id, to} / moveQuestionBy {id, by}
 *  duplicateQuestion {id} / removeQuestion {id}
 *  appendQuestions {questions} / replaceQuestions {questions}
 *  undo / redo / markSaved {draft?} / reset {draft} / loadDraft {draft}
 */
export function reducer(state, action) {
  const now = action.now ?? Date.now();
  const { draft } = state;
  switch (action.type) {
    case "undo": {
      if (!state.past.length) return state;
      const prev = state.past[state.past.length - 1];
      return { ...state, draft: prev, past: state.past.slice(0, -1), future: [draft, ...state.future].slice(0, HISTORY), group: null };
    }
    case "redo": {
      if (!state.future.length) return state;
      const [next, ...rest] = state.future;
      return { ...state, draft: next, past: [...state.past, draft].slice(-HISTORY), future: rest, group: null };
    }
    case "markSaved": {
      // `draft` is the snapshot that was sent to the server; edits made while saving keep the editor dirty.
      // A saved password is never kept in the draft: the mode goes back to "keep".
      const snap = action.draft || draft;
      const clean = snap.passwordMode === "keep" && !snap.passwordValue ? snap : { ...snap, passwordMode: "keep", passwordValue: "" };
      return { ...state, saved: clean, draft: draft === snap ? clean : draft };
    }
    case "reset":
      return createState(action.draft);
    case "loadDraft":
      return commit(state, action.draft, null, now);

    case "set": {
      if (draft[action.key] === action.value) return state;
      return commit(state, { ...draft, [action.key]: action.value }, action.group ?? `set:${action.key}`, now);
    }
    case "setIn": {
      const cur = draft[action.key];
      if (cur[action.sub] === action.value) return state;
      return commit(state, { ...draft, [action.key]: { ...cur, [action.sub]: action.value } }, `setIn:${action.key}.${action.sub}`, now);
    }

    case "addQuestion": {
      if (draft.questions.length >= LIMITS.questionsMax) return state;
      const q = action.question || newQuestion(action.questionType || "single");
      const at = Number.isInteger(action.index) ? Math.min(Math.max(action.index, 0), draft.questions.length) : draft.questions.length;
      const questions = [...draft.questions.slice(0, at), q, ...draft.questions.slice(at)];
      return commit(state, { ...draft, questions }, null, now);
    }
    case "appendQuestions": {
      const room = LIMITS.questionsMax - draft.questions.length;
      const add = action.questions.slice(0, Math.max(0, room));
      if (!add.length) return state;
      return commit(state, { ...draft, questions: [...draft.questions, ...add] }, null, now);
    }
    case "replaceQuestions": {
      return commit(state, { ...draft, questions: action.questions.slice(0, LIMITS.questionsMax) }, null, now);
    }
    case "updateQuestion": {
      const next = mapQuestion(draft, action.id, (q) => {
        const keys = Object.keys(action.patch);
        return keys.every((k) => q[k] === action.patch[k]) ? q : { ...q, ...action.patch };
      });
      const field = Object.keys(action.patch).join(",");
      return commit(state, next, `q:${action.id}:${field}`, now);
    }
    case "replaceQuestion": {
      const next = mapQuestion(draft, action.id, () => ({ ...action.question, id: action.id }));
      return commit(state, next, null, now);
    }
    case "switchType": {
      const next = mapQuestion(draft, action.id, (q) => switchType(q, action.to).question);
      return commit(state, next, null, now);
    }
    case "addOption": {
      const next = mapQuestion(draft, action.id, (q) =>
        q.options.length >= LIMITS.optionsMax ? q : { ...q, options: [...q.options, newOption()] },
      );
      return commit(state, next, null, now);
    }
    case "removeOption": {
      const next = mapQuestion(draft, action.id, (q) =>
        q.options.length <= LIMITS.optionsMin ? q : { ...q, options: q.options.filter((o) => o.id !== action.optionId) },
      );
      return commit(state, next, null, now);
    }
    case "updateOption": {
      const next = mapQuestion(draft, action.id, (q) => ({
        ...q,
        options: q.options.map((o) => (o.id === action.optionId && o.text !== action.text ? { ...o, text: action.text } : o)),
      }));
      return commit(state, next, `opt:${action.optionId}`, now);
    }
    case "toggleCorrect": {
      const next = mapQuestion(draft, action.id, (q) => ({
        ...q,
        options: q.options.map((o) => {
          if (q.type === "single") return { ...o, isCorrect: o.id === action.optionId };
          return o.id === action.optionId ? { ...o, isCorrect: !o.isCorrect } : o;
        }),
      }));
      return commit(state, next, null, now);
    }
    case "moveOption": {
      const next = mapQuestion(draft, action.id, (q) => {
        const from = q.options.findIndex((o) => o.id === action.optionId);
        const options = moveItem(q.options, from, from + action.by);
        return options === q.options ? q : { ...q, options };
      });
      return commit(state, next, null, now);
    }
    case "moveQuestion": {
      const from = indexOfQuestion(draft, action.id);
      const questions = moveItem(draft.questions, from, action.to);
      return commit(state, questions === draft.questions ? draft : { ...draft, questions }, null, now);
    }
    case "moveQuestionBy": {
      const from = indexOfQuestion(draft, action.id);
      const questions = moveItem(draft.questions, from, from + action.by);
      return commit(state, questions === draft.questions ? draft : { ...draft, questions }, null, now);
    }
    case "duplicateQuestion": {
      if (draft.questions.length >= LIMITS.questionsMax) return state;
      const i = indexOfQuestion(draft, action.id);
      if (i < 0) return state;
      const copy = action.copy || cloneQuestion(draft.questions[i]);
      const questions = [...draft.questions.slice(0, i + 1), copy, ...draft.questions.slice(i + 1)];
      return commit(state, { ...draft, questions }, null, now);
    }
    case "removeQuestion": {
      if (indexOfQuestion(draft, action.id) < 0) return state;
      return commit(state, { ...draft, questions: draft.questions.filter((q) => q.id !== action.id) }, null, now);
    }
    default:
      return state;
  }
}

/** Where focus should go after `id` is removed from `questions`: the next question, else the previous, else the details panel. */
export function focusAfterRemove(questions, id) {
  const i = questions.findIndex((q) => q.id === id);
  if (i < 0) return "details";
  return (questions[i + 1] || questions[i - 1])?.id || "details";
}

export { uid };
