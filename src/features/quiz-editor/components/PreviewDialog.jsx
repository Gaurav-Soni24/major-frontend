"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { AnswerOption, Badge, Button, Dialog, Input, Mark, Skeleton, Textarea } from "@/components/ui";
import { formatQuestionNumber, pluralize } from "@/lib/utils/format";
import { cleanInstructions, parseNumeric, totalMarks } from "../model/draft.js";
import { isChoice } from "../model/constants.js";
import styles from "./preview.module.css";

const CodeField = dynamic(() => import("./CodeField.jsx"), { ssr: false, loading: () => <Skeleton height={140} /> });

/**
 * "Preview as student": the draft rendered with the student look. Purely local: no requests, no attempt is created.
 * Inputs work so the teacher can feel the quiz, but nothing is kept.
 */
export default function PreviewDialog({ open, onClose, draft }) {
  const [answers, setAnswers] = useState({});
  const instructions = cleanInstructions(draft);
  const timeLine = draft.timeLimitOn ? `${draft.timeLimit || "?"} minutes` : "No time limit";
  const set = (id, value) => setAnswers((a) => ({ ...a, [id]: value }));
  const toggle = (q, optionId) => {
    const cur = answers[q.id] || [];
    if (q.type === "single") set(q.id, [optionId]);
    else set(q.id, cur.includes(optionId) ? cur.filter((x) => x !== optionId) : [...cur, optionId]);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="Preview as student"
      description="This is how the quiz looks to students. Nothing you type here is saved or sent."
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close preview
        </Button>
      }
    >
      <article className={styles.sheet} aria-label="Student view preview">
        <div className={styles.banner}>
          <Badge tone="info">Preview</Badge>
          <span>Students never see this label.</span>
        </div>
        <header className={styles.top}>
          <h3 className={styles.title}>{draft.title.trim() || "Untitled quiz"}</h3>
          {draft.description.trim() ? <p className={styles.desc}>{draft.description.trim()}</p> : null}
          <p className={styles.meta}>
            {pluralize(draft.questions.length, "question")} · <Mark value={totalMarks(draft)} /> · {timeLine} · pass at {draft.passingScore || "?"}%
          </p>
          {draft.settings.shuffleQuestions || draft.settings.shuffleOptions ? (
            <p className={styles.note}>
              {draft.settings.shuffleQuestions ? "Questions" : ""}
              {draft.settings.shuffleQuestions && draft.settings.shuffleOptions ? " and " : ""}
              {draft.settings.shuffleOptions ? (draft.settings.shuffleQuestions ? "answer options" : "Answer options") : ""} appear in a different order for each student. You see them in your order.
            </p>
          ) : null}
        </header>

        {instructions.length ? (
          <section className={styles.instructions} aria-label="Instructions">
            <h4>Instructions</h4>
            <ul>
              {instructions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {draft.questions.length === 0 ? <p className={styles.empty}>There are no questions yet.</p> : null}
        <ol className={styles.questions}>
          {draft.questions.map((q, i) => {
            const marks = parseNumeric(q.marks);
            return (
              <li key={q.id} className={styles.question}>
                <div className={styles.margin}>
                  <span className={styles.num}>{formatQuestionNumber(i + 1)}</span>
                  {Number.isNaN(marks) ? <span className={styles.badMarks}>[?]</span> : <Mark value={marks} />}
                </div>
                <div className={styles.body}>
                  <p className={styles.text}>{q.text.trim() || "(This question has no text yet.)"}</p>
                  {isChoice(q.type) ? (
                    <div role={q.type === "single" ? "radiogroup" : "group"} aria-label={`Answer to question ${i + 1}`} className={styles.options}>
                      {q.options.map((o) => (
                        <AnswerOption key={o.id} multiple={q.type === "multiple"} name={`pv-${q.id}`} checked={(answers[q.id] || []).includes(o.id)} onChange={() => toggle(q, o.id)}>
                          {o.text.trim() || "(empty option)"}
                        </AnswerOption>
                      ))}
                    </div>
                  ) : null}
                  {q.type === "integer" ? (
                    <div className={styles.numeric}>
                      <Input inputMode="decimal" aria-label={`Answer to question ${i + 1}`} placeholder="Type a number" value={answers[q.id] || ""} onChange={(e) => set(q.id, e.target.value)} />
                    </div>
                  ) : null}
                  {q.type === "text" ? <Textarea rows={4} aria-label={`Answer to question ${i + 1}`} placeholder="Type your answer" value={answers[q.id] || ""} onChange={(e) => set(q.id, e.target.value)} /> : null}
                  {q.type === "code" ? (
                    <CodeField value={answers[q.id] ?? q.starterCode} language={q.codeLanguage} label={`Code answer to question ${i + 1}`} onChange={(v) => set(q.id, v)} />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </article>
    </Dialog>
  );
}
