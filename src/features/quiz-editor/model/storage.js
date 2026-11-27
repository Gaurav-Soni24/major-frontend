/**
 * Local draft safety net. The editor mirrors its in-progress state to `localStorage` (one key per quiz id, or `new`),
 * so a crash or reload can offer "Restore draft". The password the teacher is typing is never stored.
 * All functions take the storage object so they work in tests (and never throw when storage is blocked).
 */

const PREFIX = "quizify:editor:draft:";
const VERSION = 1;

export const draftKey = (quizId) => `${PREFIX}${quizId || "new"}`;

/** Content fingerprint that ignores client ids, passwords and AI context, to compare a stored draft with the server's. */
export function fingerprint(draft) {
  if (!draft) return "";
  const { passwordMode, passwordValue, aiContext, ...rest } = draft;
  return JSON.stringify(rest, (k, v) => (k === "id" ? undefined : v));
}

/** Draft without the password the teacher is typing. */
export function stripSecrets(draft) {
  return { ...draft, passwordMode: draft.passwordMode === "remove" ? "remove" : "keep", passwordValue: "" };
}

/** @returns {boolean} true when written */
export function saveStoredDraft(storage, quizId, draft, meta = {}) {
  try {
    const record = { v: VERSION, savedAt: Date.now(), baseUpdatedAt: meta.baseUpdatedAt || null, draft: stripSecrets(draft) };
    storage.setItem(draftKey(quizId), JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

/** @returns {{ draft: object, savedAt: number, baseUpdatedAt: string|null } | null} */
export function loadStoredDraft(storage, quizId) {
  try {
    const raw = storage.getItem(draftKey(quizId));
    if (!raw) return null;
    const rec = JSON.parse(raw);
    if (!rec || rec.v !== VERSION || !rec.draft || !Array.isArray(rec.draft.questions) || typeof rec.draft.title !== "string") return null;
    return { draft: rec.draft, savedAt: Number(rec.savedAt) || 0, baseUpdatedAt: rec.baseUpdatedAt || null };
  } catch {
    return null;
  }
}

export function clearStoredDraft(storage, quizId) {
  try {
    storage.removeItem(draftKey(quizId));
  } catch {
    /* storage blocked: nothing to clear */
  }
}

/** Browser storage or null (blocked, private mode, server render). */
export function getBrowserStorage() {
  try {
    if (typeof window === "undefined") return null;
    const s = window.localStorage;
    const probe = "__quizify_probe__";
    s.setItem(probe, "1");
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}
