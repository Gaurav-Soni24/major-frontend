"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { Icon } from "@/components/ui";
import menuStyles from "@/components/ui/Menu.module.css";
import styles from "./quizzes.module.css";

const MENU_W = 220;

/**
 * Row action menu. Same keyboard model and look as the ui Menu, but the list is `position: fixed`
 * so a table's scroll container never clips it. Closes on scroll, resize, outside click, Esc and Tab.
 * items: `{ label, icon?, onSelect?, href?, danger?, disabled? }` or `{ separator: true }`.
 * @param {{ label: string, items: Array<any> }} props
 */
export default function RowMenu({ label, items }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const itemRefs = useRef([]);
  const menuId = `rm${useId()}`;
  const actionable = items.map((it, i) => (it.separator || it.disabled ? -1 : i)).filter((i) => i >= 0);

  useEffect(() => {
    if (!open) return undefined;
    const close = () => setOpen(false);
    /** @param {MouseEvent} e */
    const onDown = (e) => {
      const t = /** @type {Node} */ (e.target);
      if (rootRef.current?.contains(t) || document.getElementById(menuId)?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open, menuId]);

  function focusItem(i) {
    requestAnimationFrame(() => itemRefs.current[i]?.focus());
  }

  function openMenu(first = true) {
    const r = triggerRef.current.getBoundingClientRect();
    const height = items.length * 36 + 16;
    const below = window.innerHeight - r.bottom;
    const top = below < height + 12 && r.top > height ? r.top - height - 6 : r.bottom + 6;
    const left = Math.max(8, Math.min(window.innerWidth - MENU_W - 8, r.right - MENU_W));
    setPos({ top, left });
    setOpen(true);
    focusItem(first ? actionable[0] : actionable[actionable.length - 1]);
  }

  function close(returnFocus = true) {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  function onTriggerKey(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      openMenu(true);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      openMenu(false);
    }
  }

  function onMenuKey(e) {
    const current = itemRefs.current.findIndex((el) => el === document.activeElement);
    const p = actionable.indexOf(current);
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") setOpen(false);
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      focusItem(actionable[(p + 1) % actionable.length]);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusItem(actionable[(p - 1 + actionable.length) % actionable.length]);
    } else if (e.key === "Home") {
      e.preventDefault();
      focusItem(actionable[0]);
    } else if (e.key === "End") {
      e.preventDefault();
      focusItem(actionable[actionable.length - 1]);
    }
  }

  return (
    <div className={styles.menuRoot} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.menuTrigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        onClick={() => (open ? close(false) : openMenu(true))}
        onKeyDown={onTriggerKey}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
          <circle cx="12" cy="5" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="12" cy="19" r="1.8" />
        </svg>
      </button>
      {open ? (
        <div id={menuId} role="menu" aria-label={label} className={cn(menuStyles.menu, styles.menuFixed)} style={{ top: pos.top, left: pos.left, width: MENU_W }} onKeyDown={onMenuKey}>
          {items.map((it, i) => {
            if (it.separator) return <div key={`sep${i}`} role="separator" className={menuStyles.sep} />;
            const cls = cn(menuStyles.item, it.danger && menuStyles.danger);
            const inner = (
              <>
                {it.icon ? <Icon name={it.icon} size={16} /> : null}
                <span>{it.label}</span>
              </>
            );
            const done = () => {
              setOpen(false);
              it.onSelect?.();
            };
            const setRef = (el) => {
              itemRefs.current[i] = el;
            };
            return it.href ? (
              <Link key={it.label} href={it.href} role="menuitem" tabIndex={-1} className={cls} ref={setRef} onClick={done}>
                {inner}
              </Link>
            ) : (
              <button key={it.label} type="button" role="menuitem" tabIndex={-1} disabled={it.disabled} className={cls} ref={setRef} onClick={done}>
                {inner}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
