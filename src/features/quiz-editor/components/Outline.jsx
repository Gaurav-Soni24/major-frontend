"use client";

import { useEffect, useRef, useState } from "react";
import { Icon, Mark, Menu, Button } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { formatQuestionNumber, pluralize } from "@/lib/utils/format";
import { QUESTION_TYPES, TYPE_LABEL, LIMITS } from "../model/constants.js";
import { parseNumeric, totalMarks } from "../model/draft.js";
import EditorIcon, { TYPE_ICON } from "./EditorIcon.jsx";
import { useEditor } from "./EditorContext.jsx";
import styles from "./outline.module.css";

function Validity({ issues }) {
  return issues > 0 ? (
    <span className={cn(styles.dot, styles.bad)} title={`${pluralize(issues, "issue")}`}>
      <Icon name="alert" size={14} />
      <span className="sr-only">{pluralize(issues, "issue")}</span>
    </span>
  ) : (
    <span className={cn(styles.dot, styles.good)} title="Complete">
      <Icon name="check" size={14} />
      <span className="sr-only">Complete</span>
    </span>
  );
}

/** Numbered list of questions with Details and Settings on top. Used inline on desktop and inside the sheet on mobile. */
export default function Outline({ onPick, onAdd, onGenerate }) {
  const { draft, focus, setFocus, summary, dispatch, locked } = useEditor();
  const [drag, setDrag] = useState(null); // { id, overId, after }
  const [announce, setAnnounce] = useState("");
  const gripFocus = useRef(null);
  const questions = draft.questions;

  // Moving a node in the DOM drops focus; give it back to the grip that was used.
  useEffect(() => {
    if (!gripFocus.current) return;
    const el = document.querySelector(`[data-grip="${gripFocus.current}"]`);
    if (el instanceof HTMLElement) el.focus();
    gripFocus.current = null;
  }, [questions]);

  const pick = (id) => {
    setFocus(id);
    onPick?.(id);
  };

  const moveBy = (id, by) => {
    const from = questions.findIndex((q) => q.id === id);
    const to = from + by;
    if (to < 0 || to >= questions.length) return;
    gripFocus.current = id;
    dispatch({ type: "moveQuestionBy", id, by });
    setAnnounce(`Question moved to position ${to + 1} of ${questions.length}`);
  };

  const endDrag = () => setDrag(null);

  const onDrop = (e, targetId) => {
    e.preventDefault();
    if (!drag) return;
    const from = questions.findIndex((q) => q.id === drag.id);
    const t = questions.findIndex((q) => q.id === targetId);
    if (from < 0 || t < 0) return endDrag();
    const slot = drag.after ? t + 1 : t; // insertion point in the current order
    const to = from < slot ? slot - 1 : slot; // index after the dragged item is taken out
    dispatch({ type: "moveQuestion", id: drag.id, to });
    setAnnounce(`Question moved to position ${to + 1} of ${questions.length}`);
    endDrag();
  };

  const typeItems = QUESTION_TYPES.map((t) => ({ label: TYPE_LABEL[t], onSelect: () => onAdd(t) }));
  const settingsSub = [draft.timeLimitOn ? `${draft.timeLimit || "?"} min` : "No time limit", `pass ${draft.passingScore || "?"}%`].join(" · ");
  const total = totalMarks(draft);
  const full = questions.length >= LIMITS.questionsMax;

  return (
    <nav className={styles.outline} aria-label="Quiz outline">
      <ul className={styles.fixed}>
        <li>
          <button type="button" className={cn(styles.item, styles.plain, focus === "details" && styles.current)} aria-current={focus === "details" ? "true" : undefined} onClick={() => pick("details")}>
            <span className={styles.icon}>
              <EditorIcon name="doc" size={16} />
            </span>
            <span className={styles.main}>
              <span className={styles.name}>Details</span>
              <span className={styles.sub}>{draft.title.trim() || "Untitled quiz"}</span>
            </span>
            <Validity issues={summary.details} />
          </button>
        </li>
        <li>
          <button type="button" className={cn(styles.item, styles.plain, focus === "settings" && styles.current)} aria-current={focus === "settings" ? "true" : undefined} onClick={() => pick("settings")}>
            <span className={styles.icon}>
              <EditorIcon name="sliders" size={16} />
            </span>
            <span className={styles.main}>
              <span className={styles.name}>Settings</span>
              <span className={styles.sub}>{settingsSub}</span>
            </span>
            <Validity issues={summary.settings} />
          </button>
        </li>
      </ul>

      <div className={styles.listHead}>
        <h2 className={styles.heading}>Questions</h2>
        <span className={styles.count}>
          {questions.length} · <Mark value={total} />
        </span>
      </div>

      {questions.length === 0 ? (
        <p className={styles.empty}>No questions yet. Add one, or draft a set with AI.</p>
      ) : (
        <ol className={styles.list}>
          {questions.map((q, i) => {
            const issues = summary.byQuestion.get(q.id) || 0;
            const marks = parseNumeric(q.marks);
            const isDrop = drag && drag.overId === q.id && drag.id !== q.id;
            return (
              <li
                key={q.id}
                className={cn(styles.row, drag?.id === q.id && styles.dragging, isDrop && (drag.after ? styles.dropAfter : styles.dropBefore))}
                draggable={!locked}
                onDragStart={(e) => {
                  if (locked) return;
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", q.id);
                  setDrag({ id: q.id, overId: null, after: false });
                }}
                onDragOver={(e) => {
                  if (!drag) return;
                  e.preventDefault();
                  const rect = e.currentTarget.getBoundingClientRect();
                  const after = e.clientY > rect.top + rect.height / 2;
                  if (drag.overId !== q.id || drag.after !== after) setDrag({ ...drag, overId: q.id, after });
                }}
                onDrop={(e) => onDrop(e, q.id)}
                onDragEnd={endDrag}
              >
                <button
                  type="button"
                  className={styles.grip}
                  data-grip={q.id}
                  disabled={locked}
                  aria-label={`Reorder question ${i + 1}. Use the Up and Down arrow keys to move it.`}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      moveBy(q.id, -1);
                    } else if (e.key === "ArrowDown") {
                      e.preventDefault();
                      moveBy(q.id, 1);
                    } else if (e.key === "Home") {
                      e.preventDefault();
                      moveBy(q.id, -i);
                    } else if (e.key === "End") {
                      e.preventDefault();
                      moveBy(q.id, questions.length - 1 - i);
                    }
                  }}
                >
                  <EditorIcon name="grip" size={16} />
                </button>
                <button type="button" className={cn(styles.item, focus === q.id && styles.current)} aria-current={focus === q.id ? "true" : undefined} onClick={() => pick(q.id)}>
                  <span className={styles.num}>{formatQuestionNumber(i + 1)}</span>
                  <span className={styles.main}>
                    <span className={cn(styles.name, !q.text.trim() && styles.untitled)}>{q.text.trim() || "Untitled question"}</span>
                    <span className={styles.sub}>
                      <EditorIcon name={TYPE_ICON[q.type]} size={13} /> {TYPE_LABEL[q.type]}
                    </span>
                  </span>
                  <span className={styles.marks}>{Number.isNaN(marks) ? "[?]" : <Mark value={marks} />}</span>
                  <Validity issues={issues} />
                </button>
              </li>
            );
          })}
        </ol>
      )}
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>

      <div className={styles.add}>
        <Menu
          label="Add a question"
          align="start"
          trigger={
            <>
              <Icon name="plus" size={16} /> Add question
            </>
          }
          triggerClassName={styles.addTrigger}
          items={full || locked ? [{ label: full ? "Question limit reached (100)" : "Locked", disabled: true }] : typeItems}
        />
        <Button variant="secondary" size="md" iconLeft="sparkle" onClick={onGenerate} disabled={locked}>
          Generate with AI
        </Button>
      </div>
    </nav>
  );
}
