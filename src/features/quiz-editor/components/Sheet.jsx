"use client";

import { useEffect, useId, useRef } from "react";
import { IconButton } from "@/components/ui";
import styles from "./sheet.module.css";

/**
 * Bottom sheet on a native `<dialog>` (focus trap, Esc, inert page behind it). Used for the question list on phones.
 * Children are only mounted while open.
 * @param {{ open: boolean, onClose: () => void, title: string, children: import("react").ReactNode }} props
 */
export default function Sheet({ open, onClose, title, children }) {
  const ref = useRef(null);
  const titleId = `sheet${useId()}`;

  useEffect(() => {
    const el = ref.current;
    if (!el || !open || el.open) return undefined;
    const opener = document.activeElement;
    el.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      if (el.open) el.close();
      document.body.style.overflow = "";
      if (opener instanceof HTMLElement && document.contains(opener)) opener.focus();
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.sheet}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onMouseDown={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {open ? (
        <div className={styles.inner}>
          <header className={styles.head}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            <IconButton icon="x" label="Close" size="sm" onClick={onClose} />
          </header>
          <div className={styles.body}>{children}</div>
        </div>
      ) : null}
    </dialog>
  );
}
