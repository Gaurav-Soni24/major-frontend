"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { quizzes, submissions } from "@/lib/api";
import { attemptStorage as storage } from "./lib/storage.js";
import { guardsOf } from "./lib/proctor.js";
import { initialState, needsCamera, needsDetails, reduce } from "./machine/flow.js";
import { useCameraStream, useFullscreenGuard } from "./hooks/useProctoring.js";
import DetailsScreen from "./components/DetailsScreen";
import LandingScreen from "./components/LandingScreen";
import Player from "./components/Player";
import ReadyScreen from "./components/ReadyScreen";
import { ResultLoader, ResultView } from "./components/ResultView";
import Shell from "./components/Shell";
import { AlreadySubmittedScreen, LoadingScreen, UnavailableScreen } from "./components/StatusScreens";

function loadErrorKind(err) {
  if (!err) return "other";
  if (err.status === 0 || err.code === "NETWORK_ERROR" || err.code === "TIMEOUT") return "network";
  if (err.code === "QUIZ_NOT_PUBLISHED") return "not-published";
  if (err.status === 404 || err.status === 400) return "not-found";
  return "other";
}

/** Orchestrates the student flow: state machine, storage, API calls and the screens. */
export default function AttemptApp({ quizId }) {
  const [state, dispatch] = useReducer(reduce, initialState);
  const [start, setStart] = useState(null);
  const [details, setDetails] = useState({ password: "", customData: {} });
  const [signInError, setSignInError] = useState(null);
  const [submitReason, setSubmitReason] = useState("manual");
  const camera = useCameraStream();
  const fullscreen = useFullscreenGuard({ enabled: false });
  const startingRef = useRef(false);

  const { quiz, student, phase } = state;
  const guards = quiz ? guardsOf(quiz.antiCheatSettings) : null;
  const anyGuard = !!guards && (guards.camera || guards.tabSwitch || guards.copyPaste);
  const cameraNeeded = needsCamera(quiz);

  // ------------------------------------------------------------------ start / resume
  const startAttempt = useCallback(
    async (input, { gesture = true, who = student } = {}) => {
      if (startingRef.current || !who) return;
      startingRef.current = true;
      setDetails(input);
      dispatch({ type: "START" });
      if (gesture && anyGuard) fullscreen.enter();
      try {
        const res = await submissions.startAttempt({ quizId, customData: input.customData, password: input.password || undefined }, who.studentToken);
        if (!res.attemptToken) throw Object.assign(new Error("The server did not return an attempt token."), { code: "UNKNOWN" });
        storage.setAttempt(quizId, { submissionId: res.submissionId, attemptToken: res.attemptToken, email: who.email });
        storage.setStudent(quizId, { ...who, customData: input.customData });
        setStart(res);
        dispatch({ type: "STARTED" });
      } catch (err) {
        fullscreen.exit();
        dispatch({ type: "START_FAILED", code: err && err.code, message: err && err.message, fieldErrors: err && err.fieldErrors });
      } finally {
        startingRef.current = false;
      }
    },
    [anyGuard, fullscreen, quizId, student],
  );

  // ------------------------------------------------------------------ load the public quiz
  useEffect(() => {
    if (phase !== "loading") return undefined;
    let alive = true;
    quizzes.getPublicQuiz(quizId).then(
      (res) => {
        if (!alive) return;
        const q = res.quiz;
        const attempt = storage.getAttempt(quizId);
        const saved = storage.getStudent(quizId);
        if (attempt && attempt.submitted) {
          dispatch({ type: "QUIZ_LOADED", quiz: q, resultRef: { submissionId: attempt.submissionId, attemptToken: attempt.attemptToken } });
        } else if (saved) {
          setDetails((d) => ({ ...d, customData: saved.customData || {} }));
          const who = { studentToken: saved.studentToken, email: saved.email, name: saved.name };
          dispatch({ type: "QUIZ_LOADED", quiz: q, student: who, resuming: !!attempt });
          if (attempt && !needsDetails(q) && !needsCamera(q)) startAttempt({ password: "", customData: saved.customData || {} }, { gesture: false, who });
        } else {
          dispatch({ type: "QUIZ_LOADED", quiz: q });
        }
      },
      (err) => alive && dispatch({ type: "QUIZ_FAILED", error: { kind: loadErrorKind(err) } }),
    );
    return () => {
      alive = false;
    };
  }, [phase, quizId, startAttempt]);

  // ------------------------------------------------------------------ identity
  const onCredential = useCallback(
    async (credential) => {
      setSignInError(null);
      try {
        const res = await submissions.verifyGoogle({ quizId, credential });
        const who = { studentToken: res.studentToken, email: res.email, name: res.name };
        const attempt = storage.getAttempt(quizId);
        if (attempt && attempt.email && attempt.email !== res.email) storage.clearAttempt(quizId);
        storage.setStudent(quizId, who);
        dispatch({ type: "IDENTIFIED", student: who, status: res.status });
        if (res.status === "in-progress" && quiz && !needsDetails(quiz) && !needsCamera(quiz)) startAttempt({ password: "", customData: {} }, { gesture: false, who });
      } catch (err) {
        if (err && err.code === "ALREADY_SUBMITTED") dispatch({ type: "ALREADY_SUBMITTED" });
        else setSignInError((err && err.message) || "Sign-in failed. Try again.");
      }
    },
    [quizId, quiz, startAttempt],
  );

  const signOut = useCallback(() => {
    storage.clearStudent(quizId);
    storage.clearAttempt(quizId);
    camera.stop();
    dispatch({ type: "SIGN_OUT" });
  }, [quizId, camera]);

  // ------------------------------------------------------------------ submit callbacks (called by the player)
  const onSubmitStart = useCallback(() => dispatch({ type: "SUBMIT" }), []);
  const onSubmitted = useCallback(
    (result, info) => {
      const attempt = storage.getAttempt(quizId);
      if (attempt) storage.setAttempt(quizId, { ...attempt, submitted: true });
      if (start) storage.clearMarks(start.submissionId);
      storage.clearStudent(quizId);
      camera.stop();
      fullscreen.exit();
      setSubmitReason(info.reason);
      dispatch({ type: "SUBMITTED", result, expired: info.reason === "expired" || info.reason === "time" });
    },
    [quizId, start, camera, fullscreen],
  );
  const onSubmitFailed = useCallback((message) => dispatch({ type: "SUBMIT_FAILED", message }), []);

  // ------------------------------------------------------------------ screens
  if (phase === "loading") return <LoadingScreen />;
  if (phase === "unavailable") return <UnavailableScreen error={state.error} onRetry={() => dispatch({ type: "RETRY_LOAD" })} />;

  if (phase === "landing") {
    return <LandingScreen quiz={quiz} onCredential={onCredential} onSignInError={(m) => setSignInError(m)} notice={state.notice} error={signInError} />;
  }

  if (phase === "done") return <AlreadySubmittedScreen quiz={quiz} student={student} onSignOut={student ? signOut : undefined} />;

  if (phase === "details") {
    return (
      <DetailsScreen
        quiz={quiz}
        student={student}
        initial={details.customData}
        passwordError={state.passwordError}
        serverError={state.error}
        fieldErrors={state.fieldErrors}
        submitLabel={cameraNeeded ? "Continue" : state.resuming ? "Resume quiz" : "Start quiz"}
        onSignOut={signOut}
        onSubmit={(input) => {
          if (cameraNeeded) {
            setDetails(input);
            dispatch({ type: "DETAILS_DONE" });
          } else {
            startAttempt(input);
          }
        }}
      />
    );
  }

  if (phase === "ready" || phase === "starting") {
    return (
      <ReadyScreen
        quiz={quiz}
        student={student}
        resuming={state.resuming}
        camera={camera}
        needsCamera={cameraNeeded}
        anyGuard={anyGuard}
        error={state.error}
        busy={phase === "starting"}
        onStart={() => startAttempt(details)}
        onSignOut={signOut}
      />
    );
  }

  if ((phase === "attempt" || phase === "submitting") && start) {
    return (
      <Player
        key={start.submissionId}
        quizId={quizId}
        quiz={quiz}
        start={start}
        guards={guards}
        anyGuard={anyGuard}
        camera={camera}
        submitting={phase === "submitting"}
        submitError={state.error}
        onSubmitStart={onSubmitStart}
        onSubmitted={onSubmitted}
        onSubmitFailed={onSubmitFailed}
        onDismissError={() => {}}
      />
    );
  }

  if (phase === "result") {
    return (
      <Shell>
        {state.result ? (
          <ResultView result={state.result} title={quiz.title} reason={submitReason} />
        ) : state.resultRef ? (
          <ResultLoader submissionId={state.resultRef.submissionId} tokens={{ attemptToken: state.resultRef.attemptToken }} title={quiz.title} reason="already" />
        ) : null}
      </Shell>
    );
  }

  return <LoadingScreen />;
}
