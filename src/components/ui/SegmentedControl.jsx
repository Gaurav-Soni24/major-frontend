"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils/cn";
import styles from "./SegmentedControl.module.css";

/**
 * Single-choice toggle group (`role="radiogroup"`). Arrow keys move and select, Home/End jump.
 * @param {{ options: Array<{ value: string, label: string, count?: number }>, value: string, onChange: (v: string) => void, label: string, size?: "sm"|"md", className?: string }} props
 */
export default function SegmentedControl({ options, value, onChange, label, size = "md", className }) {
  const refs = useRef([]);

  /** @param {import("react").KeyboardEvent} e @param {number} i */
  function onKeyDown(e, i) {
    const last = options.length - 1;
    let next = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = i === last ? 0 : i + 1;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = i === 0 ? last : i - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next === null) return;
    e.preventDefault();
    onChange(options[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div role="radiogroup" aria-label={label} className={cn(styles.group, styles[size], className)}>
      {options.map((o, i) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            className={cn(styles.item, selected && styles.selected)}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {o.label}
            {o.count !== undefined ? <span className={styles.count}>{o.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
