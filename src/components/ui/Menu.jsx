"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import Icon from "./Icon";
import styles from "./Menu.module.css";

/**
 * Dropdown menu (`role="menu"`). The trigger is rendered for you: pass `trigger` content and an accessible `label`.
 * Keyboard: Enter / Space / ArrowDown opens, ArrowUp/Down and Home/End move, Esc closes and returns focus, Tab closes.
 * Click outside closes.
 *
 * items: `{ label, onSelect?, href?, icon?, danger?, disabled? }`, or `{ separator: true }`.
 *
 * @param {{
 *   label: string,
 *   trigger: import("react").ReactNode,
 *   items: Array<{ label?: string, onSelect?: () => void, href?: string, icon?: string, danger?: boolean, disabled?: boolean, separator?: boolean }>,
 *   align?: "start"|"end",
 *   triggerClassName?: string,
 * }} props
 */
export default function Menu({ label, trigger, items, align = "end", triggerClassName }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const itemRefs = useRef([]);
  const [pos, setPos] = useState(null);
  const uid = useId();
  const menuId = `menu${uid}`;
  const actionable = items.map((it, i) => (it.separator || it.disabled ? -1 : i)).filter((i) => i >= 0);

  useEffect(() => {
    if (!open) return undefined;
    /** @param {MouseEvent} e */
    const onDown = (e) => {
      const inRoot = rootRef.current && rootRef.current.contains(e.target);
      const inMenu = menuRef.current && menuRef.current.contains(e.target);
      if (!inRoot && !inMenu) setOpen(false);
    };
    // The menu is portalled to <body> (so tables and scroll containers cannot clip it): close it if the page moves under it.
    const onMove = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open]);

  // Position under (or above, when there is no room) the trigger, aligned to its start/end edge.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const h = menuRef.current ? menuRef.current.offsetHeight : 0;
    const flip = h > 0 && r.bottom + 6 + h > window.innerHeight - 8 && r.top - 6 - h > 8;
    setPos({
      top: flip ? r.top - 6 - h : r.bottom + 6,
      ...(align === "end" ? { right: Math.max(8, window.innerWidth - r.right) } : { left: Math.max(8, r.left) }),
    });
  }, [open, align, items.length]);

  function focusItem(index) {
    requestAnimationFrame(() => itemRefs.current[index]?.focus());
  }

  function openMenu(first = true) {
    setOpen(true);
    focusItem(first ? actionable[0] : actionable[actionable.length - 1]);
  }

  function close(returnFocus = true) {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  /** @param {import("react").KeyboardEvent} e */
  function onTriggerKey(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      openMenu(true);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      openMenu(false);
    }
  }

  /** @param {import("react").KeyboardEvent} e */
  function onMenuKey(e) {
    const current = itemRefs.current.findIndex((el) => el === document.activeElement);
    const pos = actionable.indexOf(current);
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      focusItem(actionable[(pos + 1) % actionable.length]);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusItem(actionable[(pos - 1 + actionable.length) % actionable.length]);
    } else if (e.key === "Home") {
      e.preventDefault();
      focusItem(actionable[0]);
    } else if (e.key === "End") {
      e.preventDefault();
      focusItem(actionable[actionable.length - 1]);
    }
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={cn(styles.trigger, triggerClassName)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        onClick={() => (open ? close(false) : openMenu(true))}
        onKeyDown={onTriggerKey}
      >
        {trigger}
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
        <div
          id={menuId}
          ref={menuRef}
          role="menu"
          aria-label={label}
          className={styles.menu}
          style={pos ? { top: pos.top, right: pos.right, left: pos.left } : { visibility: "hidden", top: 0, left: 0 }}
          onKeyDown={onMenuKey}
        >
          {items.map((it, i) => {
            if (it.separator) return <div key={`sep${i}`} role="separator" className={styles.sep} />;
            const cls = cn(styles.item, it.danger && styles.danger);
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
            return it.href ? (
              <Link
                key={it.label}
                href={it.href}
                role="menuitem"
                tabIndex={-1}
                className={cls}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                onClick={done}
              >
                {inner}
              </Link>
            ) : (
              <button
                key={it.label}
                type="button"
                role="menuitem"
                tabIndex={-1}
                disabled={it.disabled}
                className={cls}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                onClick={done}
              >
                {inner}
              </button>
            );
          })}
        </div>,
            document.body,
          )
        : null}
    </div>
  );
}
