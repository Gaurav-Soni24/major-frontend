"use client";

import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils/cn";
import IconButton from "./IconButton";
import Button from "./Button";
import styles from "./Dialog.module.css";

let lockCount = 0;

/**
 * Modal dialog built on the native `<dialog>` element: the browser traps focus inside, makes the page inert,
 * and handles Esc. We add scroll lock, backdrop click and focus return to the opener.
 * Children are only mounted while open.
 *
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   title: string,
 *   description?: string,
 *   footer?: import("react").ReactNode,
 *   size?: "sm"|"md"|"lg",
 *   dismissible?: boolean,
 *   className?: string,
 *   children?: import("react").ReactNode,
 * }} props
 * `dismissible={false}` disables Esc, backdrop click and the close button (use while a request is running).
 */
export function Dialog({ open, onClose, title, description, footer, size = "md", dismissible = true, className, children }) {
  const ref = useRef(null);
  const uid = useId();
  const titleId = `dlg${uid}`;
  const descId = `dlg${uid}d`;

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (open && !el.open) {
      const opener = document.activeElement;
      el.showModal();
      lockCount += 1;
      document.body.style.overflow = "hidden";
      return () => {
        if (el.open) el.close();
        lockCount = Math.max(0, lockCount - 1);
        if (lockCount === 0) document.body.style.overflow = "";
        if (opener instanceof HTMLElement && document.contains(opener)) opener.focus();
      };
    }
    return undefined;
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={cn(styles.dialog, styles[size], className)}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        if (dismissible) onClose();
      }}
      onMouseDown={(e) => {
        if (dismissible && e.target === ref.current) onClose();
      }}
    >
      {open ? (
        <div className={styles.inner}>
          <header className={styles.header}>
            <div>
              <h2 id={titleId} className={styles.title}>
                {title}
              </h2>
              {description ? (
                <p id={descId} className={styles.description}>
                  {description}
                </p>
              ) : null}
            </div>
            {dismissible ? <IconButton icon="x" label="Close" size="sm" onClick={onClose} /> : null}
          </header>
          {children ? <div className={styles.body}>{children}</div> : null}
          {footer ? <footer className={styles.footer}>{footer}</footer> : null}
        </div>
      ) : null}
    </dialog>
  );
}

/**
 * Confirm / cancel dialog. Use for destructive or irreversible actions. Buttons name the action ("Delete quiz", "Submit quiz").
 *
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   onConfirm: () => void,
 *   title: string,
 *   description?: string,
 *   confirmLabel?: string,
 *   cancelLabel?: string,
 *   tone?: "primary"|"danger",
 *   loading?: boolean,
 *   children?: import("react").ReactNode,
 * }} props
 */
export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = "Confirm", cancelLabel = "Cancel", tone = "primary", loading = false, children }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      dismissible={!loading}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  );
}

export default Dialog;
