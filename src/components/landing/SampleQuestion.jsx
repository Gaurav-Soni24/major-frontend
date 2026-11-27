"use client";

import { useState } from "react";
import { AnswerOption, Button, Field, Input, Mark, SegmentedControl, Tick } from "@/components/ui";
import styles from "./landing.module.css";

/** Two sample questions the visitor can answer. Marking runs entirely in the browser; nothing is sent anywhere. */
const QUESTIONS = [
  {
    id: "single",
    tab: "Single answer",
    no: "01",
    marks: 1,
    text: "Which HTTP status code tells a client that the page it asked for does not exist?",
    options: ["200 OK", "301 Moved Permanently", "404 Not Found", "500 Internal Server Error"],
    correct: 2,
    why: "404 means the server was reached but has nothing at that address.",
  },
  {
    id: "number",
    tab: "Number",
    no: "02",
    marks: 2,
    text: "A quiz has 12 questions worth 2 marks each. What is the maximum score?",
    correct: 24,
    why: "12 × 2 = 24. Number answers are compared as numbers, so 24 and 24.0 both count.",
  },
];

/**
 * Hero demo: answer a sample question and see it marked with the examiner's tick.
 * Clearly labelled as a sample; client-only.
 */
export default function SampleQuestion() {
  const [qid, setQid] = useState("single");
  const [picked, setPicked] = useState({ single: null, number: "" });
  const [marked, setMarked] = useState({ single: false, number: false });
  const q = QUESTIONS.find((x) => x.id === qid);
  const isMarked = marked[qid];

  const answer = picked[qid];
  const correct = q.id === "single" ? answer === q.correct : answer !== "" && Math.abs(Number(answer) - q.correct) < 1e-9;
  const canMark = q.id === "single" ? answer !== null : String(answer).trim() !== "" && Number.isFinite(Number(answer));
  const earned = isMarked && correct ? q.marks : 0;

  function mark(e) {
    e.preventDefault();
    if (canMark) setMarked((m) => ({ ...m, [qid]: true }));
  }
  function retry() {
    setMarked((m) => ({ ...m, [qid]: false }));
    setPicked((p) => ({ ...p, [qid]: qid === "single" ? null : "" }));
  }

  return (
    <section className={styles.sheet} aria-labelledby="sample-title">
      <header className={styles.sheetHead}>
        <h2 id="sample-title" className={styles.sheetTitle}>
          Sample question
        </h2>
        <span className={styles.sheetNote}>Try it. Marked in your browser.</span>
      </header>

      <div className={styles.sheetTabs}>
        <SegmentedControl label="Sample question type" size="sm" value={qid} onChange={setQid} options={QUESTIONS.map((x) => ({ value: x.id, label: x.tab }))} />
      </div>

      <form className={styles.sheetBody} onSubmit={mark} key={qid}>
        <div className={styles.margin} aria-hidden="true">
          <span className={styles.qno}>{q.no}</span>
          {isMarked && correct ? <Tick size={34} animate strokeWidth={2.8} className={styles.bigTick} /> : null}
        </div>
        <div className={styles.qcol}>
          <p className={styles.qtext}>
            <span className="sr-only">Question {q.no}. </span>
            {q.text}
          </p>
          <div className={styles.qmarks}>
            <Mark value={q.marks} />
          </div>

          {q.id === "single" ? (
            <fieldset className={styles.opts}>
              <legend className="sr-only">Choose one answer</legend>
              {q.options.map((o, i) => (
                <AnswerOption
                  key={o}
                  name="sample"
                  value={i}
                  checked={answer === i}
                  disabled={isMarked}
                  onChange={() => setPicked((p) => ({ ...p, single: i }))}
                  state={isMarked ? (i === q.correct ? (answer === i ? "correct" : "missed") : answer === i ? "wrong" : undefined) : undefined}
                  stateLabel={isMarked && i === q.correct && answer !== i ? "Correct answer" : undefined}
                >
                  {o}
                </AnswerOption>
              ))}
            </fieldset>
          ) : (
            <div className={styles.numberField}>
              <Field label="Your answer">
                <Input
                  inputMode="decimal"
                  autoComplete="off"
                  value={answer}
                  disabled={isMarked}
                  onChange={(e) => setPicked((p) => ({ ...p, number: e.target.value }))}
                  placeholder="Type a number"
                  size="lg"
                />
              </Field>
            </div>
          )}

          <div className={styles.markRow}>
            {!isMarked ? (
              <Button type="submit" disabled={!canMark}>
                Mark my answer
              </Button>
            ) : (
              <>
                <p className={styles.verdict} role="status">
                  <span className={correct ? styles.ok : styles.no}>{correct ? "Correct" : "Not quite"}</span>
                  <span className={styles.score}>
                    [{earned} / {q.marks}]
                  </span>
                </p>
                <Button type="button" variant="secondary" onClick={retry}>
                  Try again
                </Button>
              </>
            )}
          </div>
          {isMarked ? <p className={styles.why}>{q.why}</p> : <p className={styles.hintLine}>Pick an answer, then mark it.</p>}
        </div>
      </form>
    </section>
  );
}
