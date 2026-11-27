"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Icon } from "@/components/ui";
import { attachStream, loadFaceApi } from "../hooks/useProctoring.js";
import { MonitoringList } from "./LandingScreen";
import Shell, { Notice } from "./Shell";
import styles from "./screens.module.css";

const CAMERA_HELP = {
  denied: "Camera access was blocked. This quiz needs your camera. Allow camera access for this site in your browser's address bar, then try again.",
  unavailable: "No camera could be opened. Check that a camera is connected and not used by another app, then try again.",
};

function Check({ label, state, text }) {
  const cls = state === "ok" ? styles.checkOk : state === "bad" ? styles.checkBad : "";
  return (
    <li>
      <Icon name={state === "ok" ? "check" : state === "bad" ? "alert" : "clock"} size={16} />
      <span>{label}</span>
      <span className={`${styles.checkState} ${cls}`}>{text}</span>
    </li>
  );
}

/**
 * Last step before the timer starts. For camera quizzes this is the device check:
 * camera permission, models loaded, one face in view. Fullscreen is requested by the Start click itself.
 */
export default function ReadyScreen({ quiz, student, resuming, camera, needsCamera, anyGuard, error, busy, onStart, onSignOut }) {
  const videoRef = useRef(null);
  const [models, setModels] = useState("idle"); // idle | loading | ready | failed
  const [faces, setFaces] = useState(null); // null = not checked yet, else count
  const [tries, setTries] = useState(0);
  const [stuck, setStuck] = useState(false); // no face found for 10 s: allow starting anyway (poor light, old webcam)

  // Load the detector as soon as the camera is on (and again when the student presses "Try again").
  useEffect(() => {
    if (!needsCamera || camera.status !== "on") return undefined;
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setModels("loading");
    loadFaceApi().then(
      () => alive && setModels("ready"),
      () => alive && setModels("failed"),
    );
    return () => {
      alive = false;
    };
  }, [needsCamera, camera.status, tries]);

  // Look for a face once a second while on this screen.
  useEffect(() => {
    if (models !== "ready") return undefined;
    let alive = true;
    let timer;
    const tick = async () => {
      try {
        const faceapi = await loadFaceApi();
        const video = videoRef.current;
        if (alive && video && video.readyState >= 2) {
          const found = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions());
          if (alive) setFaces(found.length);
        }
      } catch {
        /* skip frame */
      }
      if (alive) timer = setTimeout(tick, 1000);
    };
    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [models]);

  // After 10 s without a single face the student may start anyway; the monitor still records what it sees.
  useEffect(() => {
    if (models !== "ready" || faces === 1) return undefined;
    const id = setTimeout(() => setStuck(true), 10000);
    return () => clearTimeout(id);
  }, [models, faces]);

  const retryModels = () => setTries((n) => n + 1);
  const cameraOn = camera.status === "on";
  const canStart = !needsCamera || (cameraOn && models === "ready" && (faces === 1 || stuck));

  let faceState = "wait";
  let faceText = "Waiting";
  if (faces === 1) {
    faceState = "ok";
    faceText = "One face in view";
  } else if (faces === 0) {
    faceState = "bad";
    faceText = "No face in view";
  } else if (faces > 1) {
    faceState = "bad";
    faceText = "More than one face";
  }

  return (
    <Shell student={student} onSignOut={onSignOut} narrow>
      <section className={styles.card} aria-labelledby="ready-h">
        <div>
          <h1 id="ready-h">{resuming ? "Continue your attempt" : needsCamera ? "Check your camera" : "Ready to start"}</h1>
          <p className={styles.sub}>{quiz.title}</p>
        </div>

        {resuming ? <Notice tone="info">Your saved answers will be restored. The timer kept running while you were away.</Notice> : null}
        {error ? <Notice tone="error">{error}</Notice> : null}

        {needsCamera ? (
          <>
            <div className={styles.camBox}>
              {cameraOn ? <video ref={videoRef} muted playsInline autoPlay aria-label="Your camera preview" /> : <span>Camera is off</span>}
            </div>
            {cameraOn ? <CameraAttach videoRef={videoRef} stream={camera.stream} /> : null}
            <ul className={styles.checks} aria-label="Device checks">
              <Check label="Camera" state={cameraOn ? "ok" : camera.status === "denied" || camera.status === "unavailable" ? "bad" : "wait"} text={cameraOn ? "On" : camera.status === "requesting" ? "Asking" : camera.status === "denied" ? "Blocked" : camera.status === "unavailable" ? "Not found" : "Off"} />
              <Check label="Face detector" state={models === "ready" ? "ok" : models === "failed" ? "bad" : "wait"} text={models === "ready" ? "Loaded" : models === "failed" ? "Could not load" : cameraOn ? "Loading" : "Waiting"} />
              <Check label="Face check" state={faceState === "wait" ? "wait" : faceState} text={faceText} />
            </ul>
            {CAMERA_HELP[camera.status] ? <Notice tone="error">{CAMERA_HELP[camera.status]}</Notice> : null}
            {models === "failed" ? (
              <Notice tone="error">
                The face detector could not be loaded. Check your connection and try again.{" "}
                <Button variant="secondary" size="sm" onClick={retryModels}>
                  Try again
                </Button>
              </Notice>
            ) : null}
            {cameraOn && models === "ready" && faces !== 1 ? (
              <Notice tone="warn">
                Sit in good light with your face in the middle of the picture. You can start as soon as one face is in view.
                {stuck ? " Still no face? You can start anyway; your teacher will see that the camera could not find a face." : ""}
              </Notice>
            ) : null}
          </>
        ) : null}

        <div className={styles.actions}>
          {needsCamera && !cameraOn ? (
            <Button size="lg" iconLeft="camera" loading={camera.status === "requesting"} onClick={camera.request}>
              Turn on camera
            </Button>
          ) : null}
          <Button size="lg" iconLeft="play" disabled={!canStart} loading={busy} onClick={onStart}>
            {resuming ? "Resume quiz" : "Start quiz"}
          </Button>
        </div>
        {anyGuard ? <p className={styles.fineprint}>Pressing Start quiz also asks your browser to go full screen. You can stay in it for the whole quiz.</p> : null}
        <MonitoringList quiz={quiz} />
      </section>
    </Shell>
  );
}

/** Attaches the shared stream to the preview video (kept out of render for the compiler). */
function CameraAttach({ videoRef, stream }) {
  useEffect(() => {
    const el = videoRef.current;
    if (el) attachStream(stream)(el);
  }, [videoRef, stream]);
  return null;
}
