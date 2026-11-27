"use client";

import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { submissions } from "@/lib/api";
import { attemptStorage } from "../lib/storage.js";
import { createAutosaver } from "../lib/autosave.js";
import { prepareQuestions } from "../lib/shuffle.js";
import { restoreAnswers, toApiAnswer, toEntries } from "../lib/answers.js";
import { createServerClock, remainingSeconds, crossedThreshold, announcementFor } from "../lib/timer.js";
import { createSnapshotBudget, reasonFor, tabSwitchOutcome, COPY_PASTE_MESSAGE, WEBCAM_MESSAGES } from "../lib/proctor.js";
import { captureSnapshot } from "./useProctoring.js";

const RETRY_WAITS = [1000, 2000, 4000, 8000, 15000, 15000];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Everything that happens while the student is answering: answers, navigation, marks for review,
 * server-anchored timer, autosave, proctoring counters and the final submit.
 *
 * @param {{
 *   quizId: string, quiz: any, start: any, guards: { camera: boolean, tabSwitch: boolean, copyPaste: boolean, tolerance: number },
 *   getVideo: () => HTMLVideoElement | null,
 *   onSubmitStart: (reason: string) => void,
 *   onSubmitted: (result: any, info: { reason: string }) => void,
 *   onSubmitFailed: (message: string, reason: string) => void,
 * }} opts
 */
export function useAttemptEngine({ quizId, quiz, start, guards, getVideo, onSubmitStart, onSubmitted, onSubmitFailed }) {
  const { submissionId, attemptToken } = start;
  const questions = useMemo(() => prepareQuestions(quiz, submissionId), [quiz, submissionId]);

  const [answers, setAnswers] = useState(() => restoreAnswers(questions, start.answers));
  const answersRef = useRef(answers);
  const [marked, setMarked] = useState(() => new Set(attemptStorage.getMarks(submissionId)));
  const [index, setIndex] = useState(0);
  const [saveStatus, setSaveStatus] = useState({ state: "idle", savedAt: null, retryInMs: null });
  const [warning, setWarning] = useState(null);
  const [fatalMessage, setFatalMessage] = useState(null);
  const [announcement, setAnnouncement] = useState("");
  const [clock] = useState(() => {
    const c = createServerClock();
    c.sync(start.serverTime);
    return c;
  });
  const [remaining, setRemaining] = useState(() => remainingSeconds(start.deadlineAt, clock.now()));

  const saverRef = useRef(null);
  const submittingRef = useRef(false);
  const budgetRef = useRef(createSnapshotBudget());
  const lastFlagRef = useRef({});

  // ------------------------------------------------------------------ submit
  const submit = useCallback(
    async ({ reason = "manual" } = {}) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      onSubmitStart(reason);
      const auto = reason !== "manual";
      if (saverRef.current) await saverRef.current.hold();
      const body = {
        submissionId,
        answers: toEntries(questions, answersRef.current),
        antiCheat: { ...(saverRef.current ? saverRef.current.counters : {}), wasAutoSubmitted: auto ? true : undefined },
      };
      if (body.antiCheat.wasAutoSubmitted === undefined) delete body.antiCheat.wasAutoSubmitted;
      const attempts = auto ? RETRY_WAITS.length + 1 : 1;
      let lastError = null;
      for (let n = 0; n < attempts; n++) {
        try {
          const res = await submissions.submitAttempt(body, attemptToken);
          if (saverRef.current) saverRef.current.stop();
          onSubmitted(res, { reason });
          return;
        } catch (err) {
          lastError = err;
          if (err && err.status === 0 && n < attempts - 1) {
            await sleep(RETRY_WAITS[n]);
            continue;
          }
          break;
        }
      }
      submittingRef.current = false;
      if (saverRef.current) saverRef.current.release();
      const offline = lastError && lastError.status === 0;
      onSubmitFailed(offline ? "You seem to be offline. Your answers are saved on this page; reconnect and submit again." : (lastError && lastError.message) || "Could not submit. Try again.", reason);
    },
    [submissionId, attemptToken, questions, onSubmitStart, onSubmitted, onSubmitFailed],
  );

  // ------------------------------------------------------------------ autosave
  const handleFatal = useEffectEvent(async (err) => {
    if (submittingRef.current) return;
    if (err && err.code === "ATTEMPT_EXPIRED") {
      submit({ reason: "expired" });
    } else if (err && err.code === "ALREADY_SUBMITTED") {
      submittingRef.current = true;
      onSubmitStart("already");
      try {
        const res = await submissions.getResult(submissionId, { attemptToken });
        onSubmitted(res, { reason: "already" });
      } catch (e) {
        submittingRef.current = false;
        onSubmitFailed((e && e.message) || "Could not load your result.", "already");
      }
    } else {
      setFatalMessage("We could not verify this attempt any more. Your answers on this page are kept. Reload the page and sign in again to continue.");
    }
  });

  useEffect(() => {
    const saver = createAutosaver({
      send: (body) => submissions.saveAnswers(submissionId, body, attemptToken),
      initialCounters: start.antiCheat || {},
      onStatus: setSaveStatus,
      onResponse: (res) => {
        if (res && res.serverTime) clock.sync(res.serverTime);
      },
      onFatal: (e) => handleFatal(e),
    });
    saverRef.current = saver;
    return () => {
      saver.stop();
      if (saverRef.current === saver) saverRef.current = null;
    };
  }, [submissionId, attemptToken, start.antiCheat, clock]);

  // flush when the page is hidden, retry when the browser says it is back online, warn on unload while unsaved
  useEffect(() => {
    const onHidden = () => {
      if (document.hidden && saverRef.current) saverRef.current.flush();
    };
    const onOnline = () => saverRef.current && saverRef.current.online();
    const onBeforeUnload = (e) => {
      if (saverRef.current && saverRef.current.dirty && !submittingRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("online", onOnline);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, []);

  // ------------------------------------------------------------------ timer
  const autoSubmitOnTime = useEffectEvent(() => submit({ reason: "time" }));
  const lastRemainingRef = useRef(remaining);
  useEffect(() => {
    if (start.deadlineAt === null || start.deadlineAt === undefined) return undefined;
    const tick = () => {
      const rem = remainingSeconds(start.deadlineAt, clock.now());
      setRemaining(rem);
      const crossed = crossedThreshold(lastRemainingRef.current, rem);
      lastRemainingRef.current = rem;
      if (crossed) setAnnouncement(announcementFor(crossed));
      if (rem === 0) autoSubmitOnTime();
    };
    const id = setInterval(tick, 500);
    tick();
    return () => clearInterval(id);
  }, [start.deadlineAt, clock]);

  // ------------------------------------------------------------------ answers and navigation
  const setAnswer = useCallback(
    (question, value) => {
      const id = String(question._id);
      const next = { ...answersRef.current, [id]: value };
      answersRef.current = next;
      setAnswers(next);
      if (saverRef.current) saverRef.current.set(id, toApiAnswer(question, value));
    },
    [],
  );

  const toggleMark = useCallback(
    (question) => {
      setMarked((prev) => {
        const next = new Set(prev);
        const id = String(question._id);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        attemptStorage.setMarks(submissionId, next);
        return next;
      });
    },
    [submissionId],
  );

  const goTo = useCallback(
    (i) => {
      setIndex((cur) => {
        const target = Math.max(0, Math.min(questions.length - 1, i));
        return target === cur ? cur : target;
      });
      if (saverRef.current) saverRef.current.flush();
    },
    [questions.length],
  );

  // ------------------------------------------------------------------ proctoring
  const flag = useCallback(
    (kind) => {
      const now = Date.now();
      if (now - (lastFlagRef.current[kind] || 0) < 2000) return;
      lastFlagRef.current[kind] = now;
      let imageBase64;
      if (guards.camera && budgetRef.current.canTake()) {
        const image = captureSnapshot(getVideo());
        if (image) {
          budgetRef.current.taken();
          imageBase64 = image;
        }
      }
      submissions.flagActivity({ submissionId, reason: reasonFor(kind), ...(imageBase64 ? { imageBase64 } : {}) }, attemptToken).catch(() => {
        /* 413 / 429 and network errors are not shown to the student */
      });
    },
    [guards.camera, getVideo, submissionId, attemptToken],
  );

  const raise = useCallback(
    (key, patch) => {
      const saver = saverRef.current;
      if (!saver) return 0;
      const value = (saver.counters[key] || 0) + 1;
      saver.setCounters({ [key]: value, ...(patch || {}) });
      return value;
    },
    [],
  );

  const onTabSwitch = useCallback(() => {
    if (submittingRef.current) return;
    const count = raise("tabSwitches");
    flag("tab-switch");
    const out = tabSwitchOutcome(count, guards.tolerance);
    setWarning({ title: out.title, body: out.body, kind: "tab-switch" });
    if (out.autoSubmit) submit({ reason: "strikes" });
  }, [raise, flag, guards.tolerance, submit]);

  const onCopyPaste = useCallback(() => {
    if (submittingRef.current) return;
    raise("copyPasteAttempts");
    flag("copy-paste");
    setWarning((cur) => cur || { ...COPY_PASTE_MESSAGE, kind: "copy-paste" });
  }, [raise, flag]);

  const onFaceEvent = useCallback(
    (kind) => {
      if (submittingRef.current) return;
      raise("webcamStrikes", kind === "identity-swap" ? { identitySwapDetected: true } : undefined);
      flag(kind);
      const m = WEBCAM_MESSAGES[kind];
      if (m) setWarning((cur) => cur || { ...m, kind });
    },
    [raise, flag],
  );

  const dismissWarning = useCallback(() => setWarning(null), []);

  return {
    questions,
    answers,
    setAnswer,
    marked,
    toggleMark,
    index,
    goTo,
    remaining,
    timed: start.deadlineAt !== null && start.deadlineAt !== undefined,
    announcement,
    saveStatus,
    warning,
    dismissWarning,
    fatalMessage,
    submit,
    onTabSwitch,
    onCopyPaste,
    onFaceEvent,
    clock,
  };
}
