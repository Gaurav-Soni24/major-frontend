"use client";

import { useEffect } from "react";
import { Button, Dialog } from "@/components/ui";
import { formatDateTime } from "@/lib/utils/format";
import styles from "./detail.module.css";

/**
 * Snapshot viewer. Built on the ui Dialog (native modal: focus trap, Esc, focus returns to the thumbnail).
 * Left / Right arrows (and the buttons) move between images. Never opens by itself.
 *
 * @param {{ images: Array<{ src: string, reason: string, timestamp: string }>, index: number|null, onIndex: (i: number|null) => void }} props
 */
export default function Lightbox({ images, index, onIndex }) {
  const open = index !== null && index >= 0 && index < images.length;

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === "Tab") {
        // keep Tab / Shift+Tab inside the dialog even when the browser would move focus to its own chrome
        const box = document.querySelector("dialog[open]");
        const items = box ? [...box.querySelectorAll("button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")] : [];
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && (document.activeElement === first || !box.contains(document.activeElement))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (document.activeElement === last || !box.contains(document.activeElement))) {
          e.preventDefault();
          first.focus();
        }
        return;
      }
      if (e.key === "ArrowRight") onIndex((index + 1) % images.length);
      else if (e.key === "ArrowLeft") onIndex((index - 1 + images.length) % images.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, index, images.length, onIndex]);

  const img = open ? images[index] : null;
  return (
    <Dialog
      open={open}
      onClose={() => onIndex(null)}
      title={open ? `Snapshot ${index + 1} of ${images.length}` : "Snapshot"}
      description={img ? `${img.reason} at ${formatDateTime(img.timestamp)}` : undefined}
      size="lg"
      footer={
        images.length > 1 ? (
          <>
            <Button variant="secondary" iconLeft="chevron-left" onClick={() => onIndex((index - 1 + images.length) % images.length)}>
              Previous
            </Button>
            <Button variant="secondary" iconRight="chevron-right" onClick={() => onIndex((index + 1) % images.length)}>
              Next
            </Button>
          </>
        ) : null
      }
    >
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element -- base64 data URL from the API, nothing for next/image to optimise
        <img src={img.src} alt={`Webcam snapshot: ${img.reason}`} className={styles.lightImg} />
      ) : null}
    </Dialog>
  );
}
