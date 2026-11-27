"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, ConfirmDialog, Dialog, Icon, Mark, Spinner } from "@/components/ui";
import { formatQuestionNumber, formatTimer } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { useAttemptEngine } from "../hooks/useAttemptEngine.js";
import { useCopyPasteGuard, useFaceMonitor, useFullscreenGuard, useTabSwitchGuard } from "../hooks/useProctoring.js";
import { buildPalette, listNumbers, summarize } from "../lib/palette.js";
import { toggleOption } from "../lib/answers.js";
import CameraPreview from "./CameraPreview";
import { PalettePanel, PaletteSheet } from "./Palette";
import PlayerBar from "./PlayerBar";
import QuestionInput from "./QuestionInput";
import { Notice } from "./Shell";
import styles from "./player.module.css";

function isTextEntry(el) {
  if (!el || !el.tagName) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") return !["radio", "checkbox", "button", "submit"].includes(el.type);
  return false;
}

/** True on a phone with its on-screen keyboard open (visual viewport much shorter than the layout viewport). */
function useKeyboardOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;
    const update = () => setOpen(window.innerHeight - vv.height > 140 && window.innerWidth < 960);
    update();
    vv.addEventListener("resize", update);
    return () => vv.removeEventListener("resize", update);
  }, []);
  return open;
}

export default function Player({ quizId, quiz, start, guards, anyGuard, camera, submitting, submitError, onSubmitStart, onSubmitted, onSubmitFailed, onDismissError }) {
  const videoRef = useRef(null);
  const setVideoEl = useCallback((el) => {
    videoRef.current = el;
  }, []);
  const headingRef = useRef(null);
  const firstRender = useRef(true);
  const keyboardOpen = useKeyboardOpen();
  const fullscreen = useFullscreenGuard({ enabled: anyGuard });

  const engine = useAttemptEngine({
    quizId,
    quiz,
    start,
    guards,
    getVideo: () => videoRef.current,
    onSubmitStart,
    onSubmitted,
    onSubmitFailed,
  });
  const { questions, answers, marked, index, remaining, timed } = engine;

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [cameraLost, setCameraLost] = useState(false);

  useTabSwitchGuard({ enabled: guards.tabSwitch && !submitting, onSwitch: engine.onTabSwitch });
  useCopyPasteGuard({ enabled: guards.copyPaste && !submitting, onAttempt: engine.onCopyPaste });
  useFaceMonitor({ enabled: guards.camera && !submitting && !!camera.stream, videoRef, onEvent: engine.onFaceEvent, onLoadError: () => setCameraLost(true) });

  const palette = useMemo(() => buildPalette(questions, answers, marked, index), [questions, answers, marked, index]);
  const summary = useMemo(() => summarize(palette), [palette]);
  const q = questions[index];
  const isLast = index === questions.length - 1;

  // move focus to the question heading when the question changes (not on first render)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (headingRef.current) headingRef.current.focus();
  }, [index]);

  // keep a focused field visible above the on-screen keyboard
  useEffect(() => {
    if (!keyboardOpen) return;
    const el = document.activeElement;
    if (el && isTextEntry(el) && el.scrollIntoView) el.scrollIntoView({ block: "center" });
  }, [keyboardOpen]);

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey) return;
      if (document.querySelector("dialog[open]")) return;
      const typing = isTextEntry(e.target);
      if (e.altKey && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
        e.preventDefault();
        engine.goTo(index + (e.key === "ArrowRight" ? 1 : -1));
        return;
      }
      if (typing || e.altKey) return;
      const onRadio = e.target && e.target.tagName === "INPUT" && e.target.type === "radio";
      if (/^[1-9]$/.test(e.key) && q && q.options) {
        const opt = q.options[Number(e.key) - 1];
        if (opt) {
          e.preventDefault();
          const cur = answers[String(q._id)];
          engine.setAnswer(q, q.type === "multiple" ? toggleOption(cur, opt.text, q.options.map((o) => o.text)) : opt.text);
        }
      } else if (e.key === "n" || e.key === "N" || (e.key === "ArrowRight" && !onRadio) || (e.key === "ArrowDown" && !onRadio && e.target === document.body)) {
        e.preventDefault();
        engine.goTo(index + 1);
      } else if (e.key === "p" || e.key === "P" || (e.key === "ArrowLeft" && !onRadio)) {
        e.preventDefault();
        engine.goTo(index - 1);
      }
    };
    // capture phase so Alt + arrows also work inside the code editor, which binds them itself
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [engine, index, q, answers]);

  const confirmSubmit = () => {
    setConfirmOpen(false);
    engine.submit({ reason: "manual" });
  };

  const warningOpen = !!engine.warning && !submitting;
  const showFullscreenNote = anyGuard && fullscreen.supported && !fullscreen.isFullscreen && !submitting;

  return (
    <div className={cn(styles.page, keyboardOpen && styles.keyboardOpen)}>
      <a href="#question" className="skip-link">
        Skip to question
      </a>
      <PlayerBar
        title={quiz.title}
        remaining={remaining}
        timed={timed}
        answered={summary.answered}
        total={summary.total}
        saveStatus={engine.saveStatus}
        announcement={engine.announcement}
        onSubmit={() => setConfirmOpen(true)}
      />

      <div className={styles.body}>
        <main id="question" className={styles.main} tabIndex={-1}>
          {engine.fatalMessage ? (
            <div className={styles.banner}>
              <Notice tone="error">{engine.fatalMessage}</Notice>
            </div>
          ) : null}
          {submitError ? (
            <div className={styles.banner}>
              <Notice tone="error">
                {submitError}{" "}
                <Button size="sm" variant="secondary" onClick={() => { onDismissError(); engine.submit({ reason: "manual" }); }}>
                  Try submitting again
                </Button>
              </Notice>
            </div>
          ) : null}
          {showFullscreenNote ? (
            <div className={styles.banner}>
              <Notice tone="info">
                You left full screen. This is not counted against you.{" "}
                <Button size="sm" variant="secondary" onClick={fullscreen.enter}>
                  Return to full screen
                </Button>
              </Notice>
            </div>
          ) : null}
          {cameraLost ? (
            <div className={styles.banner}>
              <Notice tone="warn">Face monitoring could not start on this device. You can keep answering.</Notice>
            </div>
          ) : null}

          {q ? (
            <section className={styles.sheet} aria-labelledby="qhead">
              <div className={styles.sheetHead}>
                <h2 id="qhead" ref={headingRef} tabIndex={-1} className={styles.qHeading} style={{ scrollMarginTop: "var(--bar-h)" }}>
                  <span className={styles.qNum}>{formatQuestionNumber(index + 1)}</span>
                  <span>
                    Question {index + 1} <span className={styles.qOf}>of {questions.length}</span>
                  </span>
                </h2>
                <Mark value={q.marks} className={styles.marks} />
              </div>
              <div className={styles.sheetBody}>
                <p id={`qtext-${q._id}`} className={styles.qText}>
                  {q.text}
                </p>
                <QuestionInput key={q._id} question={q} value={answers[String(q._id)]} onChange={(v) => engine.setAnswer(q, v)} />
              </div>
              <div className={styles.sheetFoot}>
                <Button variant="secondary" className={styles.footNav} disabled={index === 0} onClick={() => engine.goTo(index - 1)}>
                  Previous
                </Button>
                <Button
                  variant="ghost"
                  iconLeft="flag"
                  className={styles.markBtn}
                  aria-pressed={marked.has(String(q._id))}
                  onClick={() => engine.toggleMark(q)}
                >
                  {marked.has(String(q._id)) ? "Marked for review" : "Mark for review"}
                </Button>
                {isLast ? (
                  <Button className={styles.footNav} onClick={() => setConfirmOpen(true)}>
                    Review and submit
                  </Button>
                ) : (
                  <Button className={styles.footNav} onClick={() => engine.goTo(index + 1)}>
                    Next
                  </Button>
                )}
              </div>
            </section>
          ) : null}
          <p className={styles.shortcuts}>
            Shortcuts: <kbd>1</kbd>-<kbd>9</kbd> choose an option, <kbd>N</kbd> next, <kbd>P</kbd> previous, <kbd>Alt</kbd> + <kbd>&larr;</kbd>/<kbd>&rarr;</kbd> also work while typing.
          </p>
        </main>

        <PalettePanel palette={palette} onPick={engine.goTo} onSubmit={() => setConfirmOpen(true)} />
      </div>

      <nav className={styles.bottom} aria-label="Question navigation">
        <Button variant="secondary" disabled={index === 0} onClick={() => engine.goTo(index - 1)}>
          Previous
        </Button>
        <Button variant="ghost" iconLeft="grid" onClick={() => setSheetOpen(true)} aria-haspopup="dialog">
          {index + 1} / {questions.length}
        </Button>
        {isLast ? <Button onClick={() => setConfirmOpen(true)}>Finish</Button> : <Button onClick={() => engine.goTo(index + 1)}>Next</Button>}
      </nav>

      <PaletteSheet open={sheetOpen} onClose={() => setSheetOpen(false)} palette={palette} onPick={engine.goTo} onSubmit={() => setConfirmOpen(true)} />

      {guards.camera && camera.stream ? <CameraPreview stream={camera.stream} onVideo={setVideoEl} /> : null}

      <ConfirmDialog
        open={confirmOpen && !submitting}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmSubmit}
        title="Submit your quiz?"
        description="You cannot change your answers after you submit."
        confirmLabel="Submit quiz"
        cancelLabel="Keep working"
      >
        <div className={styles.review}>
          <dl>
            <dt>Answered</dt>
            <dd>
              {summary.answered} of {summary.total}
            </dd>
            {timed ? (
              <>
                <dt>Time left</dt>
                <dd>{formatTimer(remaining ?? 0)}</dd>
              </>
            ) : null}
            {summary.marked.length ? (
              <>
                <dt>Marked for review</dt>
                <dd>{listNumbers(summary.marked)}</dd>
              </>
            ) : null}
          </dl>
          {summary.unanswered.length ? (
            <p className={styles.reviewWarn}>
              <Icon name="alert" size={16} />
              <span>
                {summary.unanswered.length === 1 ? "1 question has" : `${summary.unanswered.length} questions have`} no answer: {listNumbers(summary.unanswered)}.
              </span>
            </p>
          ) : null}
        </div>
      </ConfirmDialog>

      <Dialog
        open={warningOpen}
        onClose={engine.dismissWarning}
        title={engine.warning ? engine.warning.title : ""}
        size="sm"
        footer={<Button onClick={engine.dismissWarning}>Continue quiz</Button>}
      >
        <p>{engine.warning ? engine.warning.body : null}</p>
      </Dialog>

      <Dialog open={submitting} onClose={() => {}} title="Submitting your quiz" description="Keep this page open. Written and code answers are marked by AI, which can take a few seconds." size="sm" dismissible={false}>
        <div className={styles.submitting} role="status">
          <Spinner size={28} label="Submitting" />
        </div>
      </Dialog>
    </div>
  );
}
