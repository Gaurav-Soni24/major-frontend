"use client";

import { useEffect, useRef } from "react";
import { Button, Icon, IconButton } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import styles from "./player.module.css";

function Legend() {
  return (
    <ul className={styles.legend} aria-label="Legend">
      <li>
        <span className={cn(styles.swatch, styles.swatchOn)} /> Answered
      </li>
      <li>
        <span className={styles.swatch} /> Not answered
      </li>
      <li>
        <span className={cn(styles.swatch, styles.swatchCur)} /> Current question
      </li>
      <li>
        <Icon name="flag" size={14} /> Marked for review
      </li>
    </ul>
  );
}

function Grid({ palette, onPick }) {
  return (
    <ol className={styles.grid} aria-label="Questions">
      {palette.map((c) => (
        <li key={c.id}>
          <button
            type="button"
            className={cn(styles.cell, c.state === "answered" && styles.cellAnswered, c.current && styles.cellCurrent)}
            aria-label={`Question ${c.number}, ${c.label}`}
            aria-current={c.current ? "true" : undefined}
            onClick={() => onPick(c.index)}
          >
            {c.number}
            {c.marked ? <Icon name="flag" size={12} className={styles.cellFlag} /> : null}
          </button>
        </li>
      ))}
    </ol>
  );
}

/** Desktop side column. */
export function PalettePanel({ palette, onPick, onSubmit }) {
  return (
    <aside className={styles.palette} aria-labelledby="pal-h">
      <h2 id="pal-h" className={styles.paletteTitle}>
        Questions
      </h2>
      <Grid palette={palette} onPick={onPick} />
      <Legend />
      <Button variant="secondary" block onClick={onSubmit}>
        Submit quiz
      </Button>
    </aside>
  );
}

/** Mobile bottom sheet on a native <dialog> (focus trap, Esc and inert page come from the browser). */
export function PaletteSheet({ open, onClose, palette, onPick, onSubmit }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (open && !el.open) {
      el.showModal();
      return () => {
        if (el.open) el.close();
      };
    }
    return undefined;
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.sheetDlg}
      aria-labelledby="palsheet-h"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onMouseDown={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {open ? (
        <div className={styles.sheetInner}>
          <div className={styles.sheetHeader}>
            <h2 id="palsheet-h" className={styles.paletteTitle}>
              Questions
            </h2>
            <IconButton icon="x" label="Close questions" onClick={onClose} />
          </div>
          <Grid
            palette={palette}
            onPick={(i) => {
              onPick(i);
              onClose();
            }}
          />
          <Legend />
          <Button
            variant="secondary"
            block
            onClick={() => {
              onClose();
              onSubmit();
            }}
          >
            Submit quiz
          </Button>
        </div>
      ) : null}
    </dialog>
  );
}
