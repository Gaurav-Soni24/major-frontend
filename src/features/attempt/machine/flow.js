/**
 * The student flow as a pure state machine.
 *
 *   loading -> unavailable                      quiz missing / not published / network error
 *   loading -> landing                          instructions + Google sign-in
 *   landing -> details | ready                  details = password and custom fields
 *   details -> ready                            ready = device check (camera quizzes) and Start
 *   ready   -> starting -> attempt              resume or new attempt (server decides)
 *   attempt -> submitting -> result
 *   any     -> done                             ALREADY_SUBMITTED: point to the portal
 *
 * A stored session (sessionStorage) lets a reload skip sign-in and, when no password or camera is
 * needed, resume automatically (`autoStart`).
 */

export const PHASES = ["loading", "unavailable", "landing", "details", "ready", "starting", "attempt", "submitting", "result", "done"];

export const initialState = { phase: "loading", quiz: null, student: null, resuming: false, autoStart: false, error: null, notice: null, result: null, resultRef: null, expired: false, passwordError: null, fieldErrors: {} };

export function needsDetails(quiz) {
  return !!(quiz && (quiz.isPasswordProtected || (quiz.customFields && quiz.customFields.length > 0)));
}

export function needsCamera(quiz) {
  return !!(quiz && quiz.antiCheatSettings && quiz.antiCheatSettings.aiCamera);
}

/** Phase after the student is known. */
function afterIdentity(quiz, resuming) {
  if (needsDetails(quiz)) return { phase: "details", autoStart: false };
  return { phase: "ready", autoStart: !!resuming && !needsCamera(quiz) };
}

/**
 * @param {typeof initialState} state
 * @param {{ type: string, [k: string]: any }} event
 */
export function reduce(state, event) {
  switch (event.type) {
    case "QUIZ_LOADED": {
      const { quiz, student = null, resuming = false, resultRef = null } = event;
      if (resultRef) return { ...initialState, phase: "result", quiz, student, resultRef };
      if (student) return { ...initialState, quiz, student, resuming, ...afterIdentity(quiz, resuming) };
      return { ...initialState, phase: "landing", quiz };
    }
    case "QUIZ_FAILED":
      return state.phase === "loading" || state.phase === "unavailable" ? { ...state, phase: "unavailable", error: event.error } : state;
    case "RETRY_LOAD":
      return { ...initialState };

    case "IDENTIFIED": {
      if (state.phase !== "landing") return state;
      if (event.status === "submitted") return { ...state, phase: "done", student: event.student };
      const resuming = event.status === "in-progress";
      return { ...state, student: event.student, resuming, error: null, ...afterIdentity(state.quiz, resuming) };
    }
    case "ALREADY_SUBMITTED":
      return { ...state, phase: "done", error: null, autoStart: false };

    case "DETAILS_DONE":
      if (state.phase !== "details") return state;
      return { ...state, phase: "ready", passwordError: null, autoStart: false };

    case "START":
      if (state.phase !== "ready" && state.phase !== "details") return state;
      return { ...state, phase: "starting", error: null, passwordError: null, autoStart: false };
    case "STARTED":
      if (state.phase !== "starting") return state;
      return { ...state, phase: "attempt", error: null };
    case "START_FAILED": {
      if (state.phase !== "starting") return state;
      const code = event.code;
      if (code === "ALREADY_SUBMITTED") return { ...state, phase: "done" };
      if (code === "WRONG_PASSWORD") return { ...state, phase: "details", passwordError: event.message || "That password is not correct.", error: null };
      if (code === "STUDENT_TOKEN_INVALID" || code === "UNAUTHENTICATED") return { ...state, phase: "landing", student: null, error: null, notice: "Your sign-in expired. Please sign in again.", resuming: false };
      if (code === "VALIDATION_ERROR") return { ...state, phase: "details", error: event.message || "Check the details and try again.", fieldErrors: event.fieldErrors || {} };
      if (code === "QUIZ_NOT_PUBLISHED") return { ...state, phase: "unavailable", error: { kind: "not-published" } };
      return { ...state, phase: "ready", error: event.message || "Could not start. Try again." };
    }

    case "SUBMIT":
      if (state.phase !== "attempt") return state;
      return { ...state, phase: "submitting", error: null };
    case "SUBMIT_FAILED":
      if (state.phase !== "submitting") return state;
      return { ...state, phase: "attempt", error: event.message || "Could not submit. Your answers are saved. Try again." };
    case "SUBMITTED":
      if (state.phase !== "submitting" && state.phase !== "attempt") return state;
      return { ...state, phase: "result", result: event.result, expired: !!event.expired, error: null };

    case "SIGN_OUT":
      return { ...state, phase: "landing", student: null, resuming: false, autoStart: false, error: null, notice: null };
    case "BACK_TO_DETAILS":
      return state.phase === "ready" && needsDetails(state.quiz) ? { ...state, phase: "details" } : state;
    default:
      return state;
  }
}
