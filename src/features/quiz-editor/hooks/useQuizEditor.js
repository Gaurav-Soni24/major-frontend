"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { quizzes, submissions, ApiError } from "@/lib/api";
import { toast } from "@/components/ui";
import { apiToDraft, emptyDraft, toPayload } from "../model/draft.js";
import { createState, isDirty, reducer, focusAfterRemove } from "../model/reducer.js";
import { mapServerDetails, summarise, validateDraft } from "../model/validate.js";
import { liveIssues, stampIssues } from "../model/serverIssues.js";
import { clearStoredDraft, fingerprint, getBrowserStorage, loadStoredDraft, saveStoredDraft } from "../model/storage.js";

const AUTOSAVE_MS = 700;

/** @param {ApiError|Error} e */
const isNotFound = (e) => e instanceof ApiError && (e.status === 404 || e.code === "NOT_FOUND" || (e.status === 400 && /id/i.test(e.message || "")));

/**
 * All editor state and actions. `quizId` is undefined for a new quiz.
 * The UI renders from this; nothing here touches the DOM except the focus request queue.
 */
export function useQuizEditor(quizId) {
  const router = useRouter();
  const requestKey = quizId || "new";
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState({ key: null, status: "idle", error: null });
  const [state, dispatch] = useReducer(reducer, null, () => createState(emptyDraft()));
  const [meta, setMeta] = useState({ isPublic: false, hasPassword: false, updatedAt: null, locked: false, hasSubmissions: false });
  const [stamped, setStamped] = useState([]);
  const [unmapped, setUnmapped] = useState([]);
  const [attempted, setAttempted] = useState(false);
  const [touched, setTouched] = useState(() => new Set());
  const [busy, setBusy] = useState(null);
  const [restore, setRestore] = useState(null);
  const [autosavedAt, setAutosavedAt] = useState(null);
  const [focus, setFocus] = useState("details");
  const [pendingKey, setPendingKey] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  const baseRef = useRef(null); // the draft as last known on the server (for "discard locked changes")
  const stateRef = useRef(state);
  const baseUpdatedRef = useRef(null);
  useEffect(() => {
    stateRef.current = state;
    baseUpdatedRef.current = meta.updatedAt;
  });

  const { draft } = state;
  const dirty = isDirty(state);

  /* ---------- load ---------- */
  useEffect(() => {
    let alive = true;
    const initial = quizId ? null : emptyDraft();
    const finish = (serverDraft, info) => {
      baseRef.current = serverDraft;
      // Restore offer: a stored draft that differs from what the server (or an empty quiz) has.
      const storage = getBrowserStorage();
      const rec = storage ? loadStoredDraft(storage, quizId) : null;
      const differs = rec && fingerprint(rec.draft) !== fingerprint(serverDraft);
      setRestore(
        differs
          ? { ...rec, serverNewer: !!(quizId && rec.baseUpdatedAt && info?.updatedAt && rec.baseUpdatedAt !== info.updatedAt) }
          : null,
      );
      if (rec && !differs && storage) clearStoredDraft(storage, quizId);
    };

    const timer = setTimeout(async () => {
      if (!quizId) {
        if (!alive) return;
        dispatch({ type: "reset", draft: initial });
        finish(initial, null);
        setLoaded({ key: requestKey, status: "ready", error: null });
        return;
      }
      try {
        const res = await quizzes.getQuiz(quizId);
        if (!alive) return;
        const quiz = res.quiz || res.data;
        const d = apiToDraft(quiz);
        let hasSubmissions = false;
        try {
          const subs = await submissions.listQuizSubmissions(quizId, { limit: 1 });
          hasSubmissions = (subs.pagination?.total ?? subs.summary?.count ?? 0) > 0;
        } catch {
          /* unknown: the server's 409 on save is the backstop */
        }
        if (!alive) return;
        dispatch({ type: "reset", draft: d });
        setMeta({ isPublic: !!quiz.isPublic, hasPassword: !!quiz.hasPassword, updatedAt: quiz.updatedAt || null, locked: hasSubmissions, hasSubmissions });
        finish(d, { updatedAt: quiz.updatedAt || null });
        setFocus(d.questions[0]?.id || "details");
        setLoaded({ key: requestKey, status: "ready", error: null });
      } catch (e) {
        if (!alive) return;
        setLoaded({ key: requestKey, status: isNotFound(e) ? "notfound" : "error", error: e });
      }
    }, 0);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [quizId, requestKey, attempt]);

  const status = loaded.key === requestKey ? loaded.status : "loading";
  const reload = useCallback(() => {
    setLoaded({ key: null, status: "idle", error: null });
    setAttempt((n) => n + 1);
  }, []);

  /* ---------- local draft autosave ---------- */
  useEffect(() => {
    if (status !== "ready" || restore) return undefined;
    const storage = getBrowserStorage();
    if (!storage) return undefined;
    if (!dirty) {
      clearStoredDraft(storage, quizId);
      return undefined;
    }
    const t = setTimeout(() => {
      if (saveStoredDraft(storage, quizId, draft, { baseUpdatedAt: meta.updatedAt })) setAutosavedAt(Date.now());
    }, AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [draft, dirty, status, restore, quizId, meta.updatedAt]);

  /* ---------- issues ---------- */
  const clientSummary = useMemo(() => validateDraft(draft), [draft]);
  const serverLive = useMemo(() => liveIssues(stamped, draft), [stamped, draft]);
  const summary = useMemo(() => {
    if (!serverLive.length) return clientSummary;
    const keys = new Set(clientSummary.issues.map((i) => `${i.key}|${i.message}`));
    return summarise([...clientSummary.issues, ...serverLive.filter((i) => !keys.has(`${i.key}|${i.message}`))]);
  }, [clientSummary, serverLive]);

  const serverKeys = useMemo(() => new Set(serverLive.map((i) => i.key)), [serverLive]);
  const errorFor = useCallback(
    (key) => (attempted || touched.has(key) || serverKeys.has(key) ? summary.byKey.get(key) : undefined),
    [attempted, touched, serverKeys, summary],
  );
  const touch = useCallback((key) => setTouched((s) => (s.has(key) ? s : new Set(s).add(key))), []);

  const focusIssue = useCallback((issue) => {
    if (!issue) return;
    setFocus(issue.scope === "question" ? issue.qid : issue.scope === "settings" ? "settings" : "details");
    setPendingKey(issue.key);
  }, []);

  /* ---------- persistence ---------- */
  const refreshMeta = useCallback(async (id) => {
    try {
      const res = await quizzes.getQuiz(id);
      const quiz = res.quiz || res.data;
      setMeta((m) => ({ ...m, isPublic: !!quiz.isPublic, hasPassword: !!quiz.hasPassword, updatedAt: quiz.updatedAt || m.updatedAt }));
    } catch {
      /* cosmetic only */
    }
  }, []);

  const handleSaveError = useCallback(
    (e, snapshot) => {
      if (e instanceof ApiError && e.code === "QUIZ_HAS_SUBMISSIONS") {
        setMeta((m) => ({ ...m, locked: true, hasSubmissions: true }));
        toast.error("This quiz already has submissions, so questions, time limit and passing score are locked.");
        return;
      }
      if (e instanceof ApiError && e.details.length) {
        const { issues, unmapped: rest } = mapServerDetails(e.details, snapshot);
        setStamped(stampIssues(issues, snapshot));
        setUnmapped(rest);
        setAttempted(true);
        if (issues[0]) focusIssue(issues[0]);
        toast.error(issues.length ? `The server found ${issues.length} ${issues.length === 1 ? "problem" : "problems"}. See the highlighted fields.` : e.message);
        return;
      }
      toast.error(e instanceof ApiError ? e.message : "Could not save. Try again.");
    },
    [focusIssue],
  );

  /** Validates, then creates or updates. Resolves with `{ id, created }` or null when nothing was saved. */
  const persist = useCallback(async () => {
    const snapshot = stateRef.current.draft;
    setAttempted(true);
    const v = validateDraft(snapshot);
    if (!v.ok) {
      focusIssue(v.issues[0]);
      return { invalid: true };
    }
    setStamped([]);
    setUnmapped([]);
    const payload = toPayload(snapshot);
    try {
      let id = quizId;
      let created = false;
      if (quizId) await quizzes.updateQuiz(quizId, payload);
      else {
        const res = await quizzes.createQuiz(payload);
        id = res.quizId;
        created = true;
      }
      baseRef.current = snapshot;
      dispatch({ type: "markSaved", draft: snapshot });
      const storage = getBrowserStorage();
      if (storage) clearStoredDraft(storage, quizId);
      if (!created) refreshMeta(id);
      setMeta((m) => ({ ...m, hasPassword: snapshot.passwordMode === "set" && snapshot.passwordValue ? true : snapshot.passwordMode === "remove" ? false : m.hasPassword }));
      return { id, created };
    } catch (e) {
      handleSaveError(e, snapshot);
      return null;
    }
  }, [quizId, focusIssue, handleSaveError, refreshMeta]);

  const goEdit = useCallback((id, query = "") => router.replace(`/dashboard/quizzes/${id}/edit${query}`), [router]);

  const saveDraft = useCallback(async () => {
    if (busy) return;
    setBusy("save");
    const r = await persist();
    setBusy(null);
    if (!r) return;
    if (r.invalid) {
      toast.error("Fix the highlighted issues first. Your work is kept on this device meanwhile.");
      return { invalid: true };
    }
    toast.success(r.created ? "Draft saved" : "Saved");
    if (r.created) goEdit(r.id);
  }, [busy, persist, goEdit]);

  const publish = useCallback(async () => {
    if (busy) return;
    setBusy("publish");
    const r = await persist();
    if (!r || r.invalid) {
      setBusy(null);
      return r;
    }
    try {
      const res = await quizzes.togglePublic(r.id);
      const isPublic = res.isPublic ?? res.data?.isPublic ?? true;
      setBusy(null);
      if (r.created) {
        goEdit(r.id, isPublic ? "?share=1" : "");
        return r;
      }
      setMeta((m) => ({ ...m, isPublic }));
      if (isPublic) setShareOpen(true);
      toast.success(isPublic ? "Published" : "Unpublished");
    } catch (e) {
      setBusy(null);
      toast.error(e instanceof ApiError ? `Saved, but publishing failed: ${e.message}` : "Saved, but publishing failed.");
      if (r.created) goEdit(r.id);
    }
    return r;
  }, [busy, persist, goEdit]);

  const unpublish = useCallback(async () => {
    if (busy || !quizId) return;
    setBusy("publish");
    try {
      const res = await quizzes.togglePublic(quizId);
      setMeta((m) => ({ ...m, isPublic: res.isPublic ?? false }));
      toast.success("Unpublished. Students can no longer open the link.");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not unpublish.");
    }
    setBusy(null);
  }, [busy, quizId]);

  /** Locked quiz: copy it as a draft (the API copies the saved version) and apply the teacher's edits to the copy. */
  const duplicateWithEdits = useCallback(async () => {
    if (busy || !quizId) return;
    const snapshot = stateRef.current.draft;
    setAttempted(true);
    const v = validateDraft(snapshot);
    if (!v.ok) {
      focusIssue(v.issues[0]);
      toast.error("Fix the highlighted issues first, then duplicate.");
      return;
    }
    setBusy("duplicate");
    try {
      const copy = await quizzes.duplicateQuiz(quizId);
      try {
        await quizzes.updateQuiz(copy.quizId, toPayload(snapshot));
      } catch (e) {
        toast.error(e instanceof ApiError ? `Copy created, but your edits were not applied: ${e.message}` : "Copy created, but your edits were not applied.");
        setBusy(null);
        goEdit(copy.quizId);
        return;
      }
      dispatch({ type: "markSaved", draft: snapshot });
      const storage = getBrowserStorage();
      if (storage) clearStoredDraft(storage, quizId);
      toast.success("Copy created with your edits. The original quiz is unchanged.");
      goEdit(copy.quizId);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not duplicate the quiz.");
    }
    setBusy(null);
  }, [busy, quizId, focusIssue, goEdit]);

  /** After a 409: put the locked parts (questions, time limit, passing score) back to the saved version. */
  const revertLocked = useCallback(() => {
    const base = baseRef.current;
    if (!base) return;
    const cur = stateRef.current.draft;
    dispatch({
      type: "loadDraft",
      draft: { ...cur, questions: base.questions, timeLimitOn: base.timeLimitOn, timeLimit: base.timeLimit, passingScore: base.passingScore },
    });
    toast.success("Question, time and score changes were discarded. You can now save the rest.");
  }, []);

  const applyRestore = useCallback(() => {
    if (!restore) return;
    dispatch({ type: "loadDraft", draft: { ...restore.draft, passwordMode: restore.draft.passwordMode === "remove" ? "remove" : "keep", passwordValue: "" } });
    // Restored questions carry their own ids, so a focused question has to move; Details and Settings stay put.
    setFocus((f) => (f === "details" || f === "settings" ? f : restore.draft.questions[0]?.id || "details"));
    setRestore(null);
    toast.success("Draft restored. It is not saved to the server yet.");
  }, [restore]);

  const discardRestore = useCallback(() => {
    const storage = getBrowserStorage();
    if (storage) clearStoredDraft(storage, quizId);
    setRestore(null);
  }, [quizId]);

  /** Writes the local draft right now (used just before leaving on purpose, so the debounce cannot lose it). */
  const flushDraft = useCallback(() => {
    const storage = getBrowserStorage();
    if (storage && isDirty(stateRef.current)) saveStoredDraft(storage, quizId, stateRef.current.draft, { baseUpdatedAt: baseUpdatedRef.current });
  }, [quizId]);

  // A reload or tab close inside the autosave debounce window must not lose the last keystrokes.
  useEffect(() => {
    window.addEventListener("pagehide", flushDraft);
    return () => window.removeEventListener("pagehide", flushDraft);
  }, [flushDraft]);

  return {
    status,
    error: loaded.error,
    reload,
    quizId,
    state,
    draft,
    dispatch,
    dirty,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    meta,
    summary,
    unmapped,
    errorFor,
    touch,
    attempted,
    focus,
    setFocus,
    pendingKey,
    clearPendingKey: () => setPendingKey(null),
    focusIssue,
    busy,
    restore,
    applyRestore,
    discardRestore,
    autosavedAt,
    shareOpen,
    setShareOpen,
    saveDraft,
    publish,
    unpublish,
    duplicateWithEdits,
    revertLocked,
    flushDraft,
    focusAfterRemove: (id) => focusAfterRemove(stateRef.current.draft.questions, id),
  };
}
