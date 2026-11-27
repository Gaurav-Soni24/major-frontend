"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { createFaceTracker, snapshotAttempts, dataUrlBytes, SNAPSHOT_MAX_BYTES } from "../lib/proctor.js";

/** Counts every time the student leaves the tab (visibilitychange to hidden). */
export function useTabSwitchGuard({ enabled, onSwitch }) {
  const handle = useEffectEvent(onSwitch);
  useEffect(() => {
    if (!enabled) return undefined;
    const onVis = () => {
      if (document.hidden) handle();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [enabled]);
}

/**
 * Blocks copy, cut, paste and the context menu while enabled and reports each attempt.
 * Capture phase + stopPropagation so editors such as CodeMirror cannot handle the paste first.
 * Typing is never blocked.
 */
export function useCopyPasteGuard({ enabled, onAttempt }) {
  const handle = useEffectEvent(onAttempt);
  useEffect(() => {
    if (!enabled) return undefined;
    const block = (e) => {
      e.preventDefault();
      e.stopPropagation();
      handle();
    };
    const events = ["copy", "cut", "paste", "contextmenu"];
    events.forEach((n) => document.addEventListener(n, block, true));
    return () => events.forEach((n) => document.removeEventListener(n, block, true));
  }, [enabled]);
}

/** Tracks fullscreen state and offers `enter()` (needs a user gesture). Never counts as a strike. */
export function useFullscreenGuard({ enabled }) {
  const [isFullscreen, setIsFullscreen] = useState(true);
  const supported = typeof document !== "undefined" && !!document.documentElement.requestFullscreen;

  useEffect(() => {
    if (!enabled || !supported) return undefined;
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [enabled, supported]);

  const enter = useCallback(async () => {
    try {
      if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    } catch {
      /* not allowed or not supported: carry on */
    }
  }, []);
  const exit = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      /* ignore */
    }
  }, []);

  return { supported, isFullscreen: enabled && supported ? isFullscreen : true, enter, exit };
}

// ---------------------------------------------------------------- camera + face

let facePromise = null;

/** Load face-api.js on demand (not part of the initial bundle) and the vendored tiny detector weights. */
export function loadFaceApi() {
  if (!facePromise) {
    facePromise = (async () => {
      const faceapi = await import("face-api.js");
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      return faceapi;
    })().catch((e) => {
      facePromise = null;
      throw e;
    });
  }
  return facePromise;
}

/** Camera stream owned by the attempt page so the device check and the player share one stream. */
export function useCameraStream() {
  const [stream, setStream] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | requesting | on | denied | unavailable
  const streamRef = useRef(null);

  const stop = useCallback(() => {
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
    setStatus("idle");
  }, []);

  const request = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus("unavailable");
      return false;
    }
    setStatus("requesting");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      streamRef.current = s;
      setStream(s);
      setStatus("on");
      return true;
    } catch (e) {
      setStatus(e && (e.name === "NotAllowedError" || e.name === "SecurityError") ? "denied" : "unavailable");
      return false;
    }
  }, []);

  useEffect(
    () => () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  return { stream, status, request, stop };
}

/** Attach a MediaStream to a video element (callback ref). */
export function attachStream(stream) {
  return (el) => {
    if (el && el.srcObject !== stream) {
      el.srcObject = stream;
      const p = el.play && el.play();
      if (p && p.catch) p.catch(() => {});
    }
  };
}

/** Detect faces once a second while `enabled`; reports events from the face tracker. */
export function useFaceMonitor({ enabled, videoRef, onEvent, onLoadError }) {
  const handle = useEffectEvent(onEvent);
  const loadFailed = useEffectEvent(onLoadError || (() => {}));
  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    let timer = null;
    const tracker = createFaceTracker();
    (async () => {
      let faceapi;
      try {
        faceapi = await loadFaceApi();
      } catch {
        loadFailed();
        return;
      }
      if (cancelled) return;
      const options = new faceapi.TinyFaceDetectorOptions();
      const tick = async () => {
        const video = videoRef.current;
        if (!cancelled && video && video.readyState >= 2 && !document.hidden) {
          try {
            const found = await faceapi.detectAllFaces(video, options);
            const boxes = found.map((d) => ({ x: d.box.x, y: d.box.y, width: d.box.width, height: d.box.height }));
            tracker.observe(boxes, video.videoWidth).forEach((ev) => handle(ev.kind));
          } catch {
            /* a failed frame is skipped */
          }
        }
        if (!cancelled) timer = setTimeout(tick, 1000);
      };
      timer = setTimeout(tick, 1000);
    })();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [enabled, videoRef]);
}

/** Grab a small JPEG (<= ~120 KB) from the video. Returns a data URL or null. */
export function captureSnapshot(video) {
  try {
    if (!video || !video.videoWidth) return null;
    const canvas = document.createElement("canvas");
    for (const step of snapshotAttempts(video.videoWidth, video.videoHeight)) {
      canvas.width = step.width;
      canvas.height = step.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0, step.width, step.height);
      const url = canvas.toDataURL("image/jpeg", step.quality);
      if (dataUrlBytes(url) <= SNAPSHOT_MAX_BYTES) return url;
    }
    return null;
  } catch {
    return null;
  }
}
