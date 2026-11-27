/**
 * Proctoring rules as pure functions (the hooks only wire browser events to these).
 *
 * Policy (kept from the old player, now driven by the quiz's `toleranceStrikes`):
 * - Leaving the tab is counted. The tolerance-th switch submits the quiz automatically.
 * - Webcam problems (no face, several faces, large movement, a different face) are counted and
 *   shown as warnings. They never submit the quiz on their own (face detection can be wrong).
 * - Copy, paste and the context menu are blocked when the quiz asks for it, and counted.
 */

export const DEFAULT_TOLERANCE = 3;

export function toleranceOf(antiCheatSettings) {
  const n = Number(antiCheatSettings && antiCheatSettings.toleranceStrikes);
  return Number.isInteger(n) && n >= 1 && n <= 10 ? n : DEFAULT_TOLERANCE;
}

/** Which guards are on for this quiz. */
export function guardsOf(antiCheatSettings) {
  const s = antiCheatSettings || {};
  return { camera: !!s.aiCamera, tabSwitch: !!s.tabSwitch, copyPaste: !!s.copyPaste, tolerance: toleranceOf(s) };
}

/**
 * Message and outcome for a tab switch, given the count AFTER this switch.
 * @returns {{ title: string, body: string, autoSubmit: boolean, remaining: number }}
 */
export function tabSwitchOutcome(count, tolerance) {
  if (count >= tolerance) {
    return {
      title: "Quiz submitted automatically",
      body: `You left the quiz ${count === 1 ? "once" : `${count} times`}, which reached the limit of ${tolerance} set by your teacher. Your saved answers are being submitted.`,
      autoSubmit: true,
      remaining: 0,
    };
  }
  const remaining = tolerance - count;
  return {
    title: "You left the quiz tab",
    body: `This was recorded. If you leave ${remaining} more ${remaining === 1 ? "time" : "times"}, the quiz is submitted automatically. Your answers are saved and you can continue.`,
    autoSubmit: false,
    remaining,
  };
}

export const WEBCAM_MESSAGES = {
  "no-face": { title: "Face not detected", body: "Please keep your face clearly visible to the camera. This was recorded." },
  "multiple-faces": { title: "More than one face detected", body: "Only the person taking the quiz should be in view. This was recorded." },
  movement: { title: "Large movement detected", body: "Please stay in front of the screen. This was recorded." },
  "identity-swap": { title: "Face changed", body: "A different face appeared in the camera. This was recorded." },
};

export const COPY_PASTE_MESSAGE = {
  title: "Copy and paste are turned off",
  body: "Your teacher has disabled copying, pasting and the right-click menu for this quiz. You can keep typing your answers. This was recorded.",
};

export const COUNTER_FOR_WEBCAM = { "no-face": "webcamStrikes", "multiple-faces": "webcamStrikes", movement: "webcamStrikes", "identity-swap": "webcamStrikes" };

/** Reason text sent with a flag (<= 120 chars on the server). */
export function reasonFor(kind) {
  const map = {
    "tab-switch": "Tab switch",
    "copy-paste": "Copy, paste or context menu attempt",
    "no-face": "Face not detected",
    "multiple-faces": "Multiple faces detected",
    movement: "Excessive face movement",
    "identity-swap": "Different face detected",
  };
  return map[kind] || "Activity flagged";
}

// ------------------------------------------------------------------ face heuristics

/**
 * Tracks the tiny-face-detector results frame by frame (1 per second).
 *  - `no-face`: 0 faces for `missFrames` frames in a row (default 5)
 *  - `multiple-faces`: 2+ faces for `missFrames` frames in a row
 *  - `movement`: the face centre jumped more than `moveRatio` of the video width in one second
 *  - `identity-swap`: after the face was gone for 2+ frames, a face reappears with a clearly
 *    different size (area ratio outside 0.55..1.8) or far away from where it was
 * Boxes are `{ x, y, width, height }` in video pixels. `observe` returns the events for this frame.
 */
export function createFaceTracker({ missFrames = 5, moveRatio = 0.25, swapRatio = [0.55, 1.8], gapFrames = 2 } = {}) {
  let badFrames = 0;
  let badKind = null;
  let last = null; // { cx, cy, area }
  let goneFrames = 0;
  let lastGoneFrom = null;

  const center = (b) => ({ cx: b.x + b.width / 2, cy: b.y + b.height / 2, area: Math.max(1, b.width * b.height) });

  return {
    /** @param {Array<{x:number,y:number,width:number,height:number}>} boxes @param {number} videoWidth */
    observe(boxes, videoWidth) {
      const events = [];
      const width = videoWidth > 0 ? videoWidth : 640;

      if (boxes.length !== 1) {
        const kind = boxes.length === 0 ? "no-face" : "multiple-faces";
        badFrames = badKind === kind ? badFrames + 1 : 1;
        badKind = kind;
        if (boxes.length === 0) {
          goneFrames += 1;
          if (last) lastGoneFrom = last;
        }
        if (badFrames >= missFrames) {
          events.push({ kind });
          badFrames = 0;
        }
        if (boxes.length === 0) last = null;
        return events;
      }

      badFrames = 0;
      badKind = null;
      const c = center(boxes[0]);

      if (goneFrames >= gapFrames && lastGoneFrom) {
        const ratio = c.area / lastGoneFrom.area;
        const jump = Math.hypot(c.cx - lastGoneFrom.cx, c.cy - lastGoneFrom.cy);
        if (ratio < swapRatio[0] || ratio > swapRatio[1] || jump > width * moveRatio * 1.6) events.push({ kind: "identity-swap" });
      } else if (last) {
        const jump = Math.hypot(c.cx - last.cx, c.cy - last.cy);
        if (jump > width * moveRatio) events.push({ kind: "movement" });
      }
      goneFrames = 0;
      last = c;
      if (events.length) lastGoneFrom = null;
      return events;
    },
    reset() {
      badFrames = 0;
      badKind = null;
      last = null;
      goneFrames = 0;
      lastGoneFrom = null;
    },
  };
}

// ------------------------------------------------------------------ snapshots

export const SNAPSHOT_MAX_PER_ATTEMPT = 20;
export const SNAPSHOT_MAX_BYTES = 120 * 1024;

/** Approximate decoded size of a data URL in bytes. */
export function dataUrlBytes(dataUrl) {
  const i = typeof dataUrl === "string" ? dataUrl.indexOf(",") : -1;
  if (i < 0) return 0;
  const b64 = dataUrl.slice(i + 1);
  const pad = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((b64.length * 3) / 4) - pad);
}

/** Counts snapshots and refuses beyond the cap (the server only stores 20 too). */
export function createSnapshotBudget(max = SNAPSHOT_MAX_PER_ATTEMPT) {
  let used = 0;
  return {
    canTake: () => used < max,
    taken: () => {
      used += 1;
    },
    get used() {
      return used;
    },
  };
}

/** Plan for fitting an image under the byte cap: dimension then quality steps to try. */
export function snapshotAttempts(videoWidth, videoHeight, maxWidth = 480) {
  const scale = videoWidth > maxWidth ? maxWidth / videoWidth : 1;
  const w = Math.max(1, Math.round(videoWidth * scale));
  const h = Math.max(1, Math.round(videoHeight * scale));
  return [
    { width: w, height: h, quality: 0.5 },
    { width: Math.round(w * 0.75), height: Math.round(h * 0.75), quality: 0.45 },
    { width: Math.round(w * 0.5), height: Math.round(h * 0.5), quality: 0.4 },
  ];
}
