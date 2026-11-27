"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, EmptyState, Icon, Mark, Skeleton, toast } from "@/components/ui";
import { ai, ApiError } from "@/lib/api";
import { useQuizEditor } from "../hooks/useQuizEditor.js";
import { useEditorShortcuts, useUnsavedGuard } from "../hooks/useEditorEffects.js";
import { applyGeneration, describeAiError } from "../model/ai.js";
import { TYPE_LABEL } from "../model/constants.js";
import { newQuestion, parseNumeric, questionFromAi } from "../model/draft.js";
import AiDialog from "./AiDialog.jsx";
import { LockBanner, RestoreBanner, UnmappedErrors } from "./Banners.jsx";
import { IssuesDialog, LeaveDialog, ShareDialog } from "./Dialogs.jsx";
import { EditorProvider } from "./EditorContext.jsx";
import DetailsPanel from "./DetailsPanel.jsx";
import Outline from "./Outline.jsx";
import PreviewDialog from "./PreviewDialog.jsx";
import QuestionPanel from "./QuestionPanel.jsx";
import SettingsPanel from "./SettingsPanel.jsx";
import Sheet from "./Sheet.jsx";
import TopBar from "./TopBar.jsx";
import { actionToast } from "./toasts.jsx";
import EditorIcon, { TYPE_ICON } from "./EditorIcon.jsx";
import styles from "./editor.module.css";

function LoadingEditor() {
  return (
    <div className={styles.page} aria-busy="true">
      <span className="sr-only" role="status">
        Loading quiz
      </span>
      <div className={styles.skelBar}>
        <Skeleton width={160} height={20} />
        <Skeleton width={220} height={32} />
      </div>
      <div className={styles.body}>
        <div className={styles.skelList}>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} height={52} />
          ))}
        </div>
        <div className={styles.skelForm}>
          <Skeleton width="40%" height={24} />
          <Skeleton height={96} />
          <Skeleton height={44} />
          <Skeleton height={44} />
        </div>
      </div>
    </div>
  );
}

/**
 * The quiz editor: a sticky top bar over a two pane body (numbered question list, focused form).
 * `quizId` omitted = new quiz. Everything stateful lives in `useQuizEditor`; panels read it through context.
 */
export default function QuizEditor({ quizId }) {
  const ed = useQuizEditor(quizId);
  const { draft, dispatch, focus, setFocus, summary, status, meta, dirty } = ed;
  const [aiOpen, setAiOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [issuesOpen, setIssuesOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [regenId, setRegenId] = useState(null);
  const [textFocusId, setPendingFocusText] = useState(null);
  const guard = useUnsavedGuard(dirty);

  const save = ed.saveDraft;
  const { publish } = ed;
  const publishNow = useCallback(async () => {
    const r = await publish();
    if (r?.invalid) setIssuesOpen(true);
  }, [publish]);
  const undo = useCallback(() => dispatch({ type: "undo" }), [dispatch]);
  const redo = useCallback(() => dispatch({ type: "redo" }), [dispatch]);
  useEditorShortcuts({ onSave: save, onUndo: undo, onRedo: redo });

  // Open the share dialog once after publishing a new quiz (?share=1), then clean the URL.
  const { setShareOpen } = ed;
  useEffect(() => {
    if (status !== "ready" || !quizId || !meta.isPublic) return undefined;
    if (!new URLSearchParams(window.location.search).get("share")) return undefined;
    const t = setTimeout(() => {
      setShareOpen(true);
      window.history.replaceState(null, "", window.location.pathname);
    }, 0);
    return () => clearTimeout(t);
  }, [status, quizId, meta.isPublic, setShareOpen]);

  // Move keyboard focus to the first invalid control once its panel is on screen.
  const { pendingKey, clearPendingKey } = ed;
  useEffect(() => {
    if (!pendingKey) return undefined;
    let tries = 0;
    let raf = 0;
    const attempt = () => {
      const el = document.querySelector(`[data-ik="${CSS.escape(pendingKey)}"]`);
      if (el instanceof HTMLElement) {
        el.scrollIntoView({ block: "center", behavior: "auto" });
        el.focus({ preventScroll: true });
        clearPendingKey();
      } else if (tries++ < 20) raf = requestAnimationFrame(attempt);
      else clearPendingKey();
    };
    raf = requestAnimationFrame(attempt);
    return () => cancelAnimationFrame(raf);
  }, [pendingKey, focus, clearPendingKey]);

  const locked = meta.locked;

  const addQuestion = useCallback(
    (type) => {
      const q = newQuestion(type);
      dispatch({ type: "addQuestion", question: q });
      setFocus(q.id);
      setSheetOpen(false);
      setPendingFocusText(q.id);
    },
    [dispatch, setFocus],
  );
  // After adding, put the cursor in the question text.
  useEffect(() => {
    if (!textFocusId) return undefined;
    const raf = requestAnimationFrame(() => {
      const el = document.querySelector(`[data-ik="${CSS.escape(`${textFocusId}:text`)}"]`);
      if (el instanceof HTMLElement) el.focus();
      setPendingFocusText(null);
    });
    return () => cancelAnimationFrame(raf);
  }, [textFocusId]);

  const applyAi = useCallback(
    (result, opts) => {
      const before = ed.state.draft.questions.length;
      dispatch({ type: "loadDraft", draft: applyGeneration(ed.state.draft, result, opts) });
      if (result.questions[0]) setFocus(result.questions[0].id);
      toast.success(`${result.questions.length} ${result.questions.length === 1 ? "question" : "questions"} added${opts.mode === "replace" && before ? ` (replacing ${before})` : ""}. Review each one before publishing.`);
    },
    [dispatch, ed.state.draft, setFocus],
  );

  const runRegenerate = useCallback(
    async function run(q) {
      const ctx = ed.state.draft.aiContext;
      if (!ctx || regenId) return;
      setRegenId(q.id);
      try {
        const res = await ai.regenerateQuestion({ syllabus: ctx.syllabus, difficulty: ctx.difficulty, type: q.type, ...(ctx.field ? { field: ctx.field } : {}) });
        const fresh = { ...questionFromAi(res.data, q.type), type: q.type };
        dispatch({ type: "replaceQuestion", id: q.id, question: fresh });
        actionToast("Question regenerated", "Undo", () => dispatch({ type: "undo" }));
      } catch (err) {
        const d = describeAiError(err instanceof ApiError ? err : null);
        if (d.retry) actionToast(`${d.message} Your question is unchanged.`, "Retry", () => run(q), { error: true, duration: 9000 });
        else toast.error(d.message);
      } finally {
        setRegenId(null);
      }
    },
    [ed.state.draft.aiContext, regenId, dispatch],
  );

  const ctx = useMemo(
    () => ({
      draft,
      dispatch,
      errorFor: ed.errorFor,
      touch: ed.touch,
      summary,
      focus,
      setFocus,
      meta,
      locked,
      focusAfterRemove: ed.focusAfterRemove,
      regen: { available: !!draft.aiContext && !locked, busyId: regenId, run: runRegenerate },
    }),
    [draft, dispatch, ed.errorFor, ed.touch, summary, focus, setFocus, meta, locked, ed.focusAfterRemove, regenId, runRegenerate],
  );

  const stops = useMemo(() => ["details", "settings", ...draft.questions.map((q) => q.id)], [draft.questions]);
  const stopIndex = Math.max(0, stops.indexOf(focus));
  const go = (by) => setFocus(stops[Math.min(stops.length - 1, Math.max(0, stopIndex + by))]);

  if (status === "loading" || status === "idle") return <LoadingEditor />;
  if (status === "notfound") {
    return (
      <EmptyState title="Quiz not found" action={<Button href="/dashboard/quizzes">Back to my quizzes</Button>}>
        This quiz does not exist, or it belongs to another account.
      </EmptyState>
    );
  }
  if (status === "error") {
    return (
      <EmptyState title="Could not load this quiz" action={<Button onClick={ed.reload}>Try again</Button>}>
        {ed.error?.message || "Check your connection and try again."}
      </EmptyState>
    );
  }

  const activeQuestion = draft.questions.find((q) => q.id === focus);
  const qIndex = activeQuestion ? draft.questions.indexOf(activeQuestion) : -1;
  const stopLabel =
    focus === "details" ? "Details" : focus === "settings" ? "Settings" : activeQuestion ? `Question ${qIndex + 1} of ${draft.questions.length}` : "Questions";
  const stopMark = activeQuestion && !Number.isNaN(parseNumeric(activeQuestion.marks)) ? parseNumeric(activeQuestion.marks) : null;

  return (
    <EditorProvider value={ctx}>
      <div className={styles.page}>
        <TopBar ed={ed} onPreview={() => setPreviewOpen(true)} onIssues={() => setIssuesOpen(true)} onSave={save} onPublish={publishNow} />

        <div className={styles.banners}>
          {ed.restore ? <RestoreBanner restore={ed.restore} onRestore={ed.applyRestore} onDiscard={ed.discardRestore} /> : null}
          {locked ? <LockBanner busy={ed.busy} onDuplicate={ed.duplicateWithEdits} onRevert={ed.revertLocked} canRevert={dirty} /> : null}
          <UnmappedErrors items={ed.unmapped} />
        </div>

        <div className={styles.mobileNav}>
          <button type="button" className={styles.navStep} aria-label="Previous item" disabled={stopIndex === 0} onClick={() => go(-1)}>
            <Icon name="chevron-left" size={18} />
          </button>
          <button type="button" className={styles.navCurrent} onClick={() => setSheetOpen(true)} aria-haspopup="dialog">
            <span className={styles.navLabel}>
              {activeQuestion ? <EditorIcon name={TYPE_ICON[activeQuestion.type]} size={16} /> : null}
              {stopLabel}
              {activeQuestion ? <span className={styles.navType}>{TYPE_LABEL[activeQuestion.type]}</span> : null}
              {stopMark !== null ? <Mark value={stopMark} /> : null}
            </span>
            <span className={styles.navAll}>
              All <Icon name="chevron-down" size={16} />
            </span>
          </button>
          <button type="button" className={styles.navStep} aria-label="Next item" disabled={stopIndex === stops.length - 1} onClick={() => go(1)}>
            <Icon name="chevron-right" size={18} />
          </button>
        </div>

        <div className={styles.body}>
          <aside className={styles.side} aria-label="Quiz outline">
            <Outline onAdd={addQuestion} onGenerate={() => setAiOpen(true)} />
          </aside>
          <div className={styles.main}>
            {focus === "details" ? <DetailsPanel /> : null}
            {focus === "settings" ? <SettingsPanel /> : null}
            {activeQuestion ? <QuestionPanel key={activeQuestion.id} question={activeQuestion} /> : null}
            {!activeQuestion && focus !== "details" && focus !== "settings" ? (
              <EmptyState title="No question selected" action={<Button onClick={() => setFocus("details")}>Go to details</Button>}>
                Pick a question from the list, or add one.
              </EmptyState>
            ) : null}
            {draft.questions.length === 0 && focus === "details" ? (
              <div className={styles.nudge}>
                <p>
                  <strong>Next:</strong> add questions by hand, or let AI draft a set from your syllabus.
                </p>
                <div className={styles.nudgeActions}>
                  <Button size="sm" iconLeft="plus" onClick={() => addQuestion("single")} disabled={locked}>
                    Add a question
                  </Button>
                  <Button size="sm" variant="secondary" iconLeft="sparkle" onClick={() => setAiOpen(true)} disabled={locked}>
                    Generate with AI
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Quiz outline">
        <Outline onPick={() => setSheetOpen(false)} onAdd={addQuestion} onGenerate={() => { setSheetOpen(false); setAiOpen(true); }} />
      </Sheet>
      <AiDialog open={aiOpen} onClose={() => setAiOpen(false)} draft={draft} onApply={applyAi} />
      <PreviewDialog open={previewOpen} onClose={() => setPreviewOpen(false)} draft={draft} />
      <IssuesDialog open={issuesOpen} onClose={() => setIssuesOpen(false)} issues={summary.issues} questions={draft.questions} onJump={ed.focusIssue} title={`${summary.issues.length} ${summary.issues.length === 1 ? "issue" : "issues"} to fix`} />
      <ShareDialog open={ed.shareOpen} onClose={() => setShareOpen(false)} quizId={quizId} hasPassword={meta.hasPassword} />
      <LeaveDialog open={!!guard.pendingHref} onStay={guard.stay} onLeave={() => guard.leave(ed.flushDraft)} />
    </EditorProvider>
  );
}
