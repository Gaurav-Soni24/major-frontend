"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Warns before unsaved work is lost:
 *  - closing/reloading the tab (`beforeunload`)
 *  - clicking any in-app link (sidebar, back link): intercepted, `pendingHref` is set so the UI can ask
 * The Next.js App Router has no route-change blocking, so browser Back/Forward is not intercepted;
 * the local draft (see model/storage.js) is the safety net for that case.
 */
export function useUnsavedGuard(dirty) {
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState(null);

  useEffect(() => {
    if (!dirty) return undefined;
    /** @param {BeforeUnloadEvent} e */
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    /** @param {MouseEvent} e */
    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      e.preventDefault();
      e.stopPropagation();
      setPendingHref(url.pathname + url.search + url.hash);
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  const stay = useCallback(() => setPendingHref(null), []);
  const leave = useCallback(
    (beforeLeave) => {
      const href = pendingHref;
      setPendingHref(null);
      if (beforeLeave) beforeLeave();
      if (href) router.push(href);
    },
    [pendingHref, router],
  );
  return { pendingHref, stay, leave };
}

const isEditable = (el) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || !!el.closest(".cm-editor"));

/**
 * Keyboard shortcuts. Ctrl/Cmd+S saves. Ctrl/Cmd+Z and Shift+Z undo/redo question edits, except while typing in a
 * field (the browser's own text undo wins there; the Undo and Redo buttons are always available).
 */
export function useEditorShortcuts({ onSave, onUndo, onRedo }) {
  useEffect(() => {
    /** @param {KeyboardEvent} e */
    const onKey = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      if (k === "s") {
        e.preventDefault();
        onSave();
      } else if (k === "z" && !isEditable(document.activeElement)) {
        e.preventDefault();
        if (e.shiftKey) onRedo();
        else onUndo();
      } else if (k === "y" && !isEditable(document.activeElement)) {
        e.preventDefault();
        onRedo();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onSave, onUndo, onRedo]);
}
