/**
 * Per-quiz session state in sessionStorage (tab-scoped, gone when the tab closes).
 *   quizify:student:<quizId>   { studentToken, email, name, customData }   (never the quiz password)
 *   quizify:attempt:<quizId>   { submissionId, attemptToken, submitted }   latest attempt token
 *   quizify:marks:<submissionId>  string[] of question ids marked for review
 * Every call is wrapped: private windows or blocked storage must never break the quiz.
 */

const P = "quizify:";

function defaultStorage() {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

export function createAttemptStorage(getStorage = defaultStorage) {
  const read = (key) => {
    try {
      const s = getStorage();
      const raw = s && s.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };
  const write = (key, value) => {
    try {
      const s = getStorage();
      if (s) s.setItem(key, JSON.stringify(value));
      return !!s;
    } catch {
      return false;
    }
  };
  const remove = (key) => {
    try {
      const s = getStorage();
      if (s) s.removeItem(key);
    } catch {
      /* ignore */
    }
  };

  const studentKey = (quizId) => `${P}student:${quizId}`;
  const attemptKey = (quizId) => `${P}attempt:${quizId}`;
  const marksKey = (submissionId) => `${P}marks:${submissionId}`;

  return {
    getStudent(quizId) {
      const v = read(studentKey(quizId));
      return v && typeof v.studentToken === "string" && v.studentToken && typeof v.email === "string" ? v : null;
    },
    setStudent(quizId, student) {
      return write(studentKey(quizId), student);
    },
    clearStudent(quizId) {
      remove(studentKey(quizId));
    },
    getAttempt(quizId) {
      const v = read(attemptKey(quizId));
      return v && typeof v.submissionId === "string" && typeof v.attemptToken === "string" ? v : null;
    },
    setAttempt(quizId, attempt) {
      return write(attemptKey(quizId), attempt);
    },
    clearAttempt(quizId) {
      remove(attemptKey(quizId));
    },
    getMarks(submissionId) {
      const v = read(marksKey(submissionId));
      return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
    },
    setMarks(submissionId, ids) {
      return write(marksKey(submissionId), Array.from(ids));
    },
    clearMarks(submissionId) {
      remove(marksKey(submissionId));
    },
  };
}

/** Shared instance for the app. */
export const attemptStorage = createAttemptStorage();
