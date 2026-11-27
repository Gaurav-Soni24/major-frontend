"use client";

import { useState } from "react";
import { Badge, Panel } from "@/components/ui";
import { formatDateTime, pluralize } from "@/lib/utils/format";
import { flagImageSrc } from "../logic/status";
import Lightbox from "./Lightbox";
import styles from "./detail.module.css";

function Counter({ label, value, off }) {
  return (
    <div className={styles.counter}>
      <dt>{label}</dt>
      <dd className={value > 0 && !off ? styles.counterHot : undefined}>{value}</dd>
      {off ? <dd className={styles.counterNote}>check was off</dd> : null}
    </div>
  );
}

/**
 * Anti-cheat counters and the flagged snapshots.
 * @param {{ antiCheat: any, settings?: { aiCamera?: boolean, tabSwitch?: boolean, copyPaste?: boolean, toleranceStrikes?: number } }} props
 */
export default function ProctoringPanel({ antiCheat, settings }) {
  const a = antiCheat || {};
  const events = a.flaggedImages || [];
  const images = events.map((e) => ({ ...e, src: flagImageSrc(e.imageBase64) })).filter((e) => e.src);
  const noPhoto = events.length - images.length;
  const [open, setOpen] = useState(null);
  const extra = Math.max(0, (a.flagCount || 0) - events.length);

  return (
    <Panel
      title="Proctoring"
      description={settings?.toleranceStrikes ? `Auto-submit after ${pluralize(settings.toleranceStrikes, "strike")}.` : undefined}
      actions={a.isFlagged ? <Badge status="flagged" /> : <Badge tone="correct">No flags</Badge>}
    >
      <dl className={styles.counters}>
        <Counter label="Tab switches" value={a.tabSwitches || 0} off={settings && settings.tabSwitch === false} />
        <Counter label="Webcam strikes" value={a.webcamStrikes || 0} off={settings && settings.aiCamera === false} />
        <Counter label="Copy / paste" value={a.copyPasteAttempts || 0} off={settings && settings.copyPaste === false} />
        <Counter label="Reloads" value={a.reloads || 0} />
        <div className={styles.counter}>
          <dt>Identity swap</dt>
          <dd className={a.identitySwapDetected ? styles.counterHot : undefined}>{a.identitySwapDetected ? "Detected" : "None"}</dd>
        </div>
      </dl>

      {images.length > 0 ? (
        <div className={styles.snaps} data-html2canvas-ignore="true">
          <h3 className={styles.subhead}>Flagged snapshots ({images.length})</h3>
          <ul className={styles.snapGrid}>
            {images.map((img, i) => (
              <li key={i}>
                <button type="button" className={styles.snap} onClick={() => setOpen(i)} aria-label={`Open snapshot ${i + 1}: ${img.reason}, ${formatDateTime(img.timestamp)}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- base64 data URL from the API */}
                  <img src={img.src} alt="" loading="lazy" decoding="async" width={160} height={120} />
                  <span className={styles.snapReason}>{img.reason}</span>
                  <span className={styles.snapTime}>{formatDateTime(img.timestamp)}</span>
                </button>
              </li>
            ))}
          </ul>
          {extra > 0 ? <p className={styles.note}>{pluralize(extra, "more flag event")} happened after the 20-entry limit and was not stored.</p> : null}
          <Lightbox images={images} index={open} onIndex={setOpen} />
        </div>
      ) : a.isFlagged ? (
        <p className={styles.note}>Flagged, but no snapshots were stored (for example a tab or copy/paste strike).</p>
      ) : null}
      {images.length > 0 && noPhoto > 0 ? <p className={styles.note}>{pluralize(noPhoto, "more flag event")} had no photo.</p> : null}
    </Panel>
  );
}
