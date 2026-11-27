"use client";

import { useRef, useState } from "react";
import Button from "./Button";
import styles from "./CopyField.module.css";

/**
 * Read-only value with a Copy button (share links). Falls back to selecting the text when the Clipboard API is unavailable.
 * Announces "Copied" politely to screen readers.
 * @param {{ value: string, label: string, className?: string }} props
 */
export default function CopyField({ value, label, className }) {
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);
  const timer = useRef(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      inputRef.current?.select();
      try {
        document.execCommand("copy");
      } catch {
        return;
      }
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className={`${styles.root} ${className || ""}`}>
      <label className={styles.label}>
        <span className="sr-only">{label}</span>
        <input ref={inputRef} readOnly value={value} className={styles.input} onFocus={(e) => e.target.select()} aria-label={label} />
      </label>
      <Button variant="secondary" size="md" iconLeft={copied ? "check" : "copy"} onClick={copy}>
        {copied ? "Copied" : "Copy"}
      </Button>
      <span className="sr-only" role="status">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </div>
  );
}
