"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Dialog, Field, Input, Mark, Radio, Checkbox, Select, Spinner, Textarea } from "@/components/ui";
import { ai, ApiError } from "@/lib/api";
import { pluralize } from "@/lib/utils/format";
import { DIFFICULTIES, QUESTION_TYPES, TYPE_LABEL } from "../model/constants.js";
import { parseNumeric, totalMarks } from "../model/draft.js";
import { defaultAiForm, describeAiError, normaliseGenerated, validateAiForm } from "../model/ai.js";
import styles from "./dialogs.module.css";

const STILL_WORKING_AT = 45;

/**
 * "Generate with AI": syllabus form -> progress -> review -> add to the quiz.
 * Nothing touches the quiz until the teacher presses "Add". Errors keep everything the teacher wrote.
 * @param {{ open: boolean, onClose: () => void, draft: object, onApply: (result: object, opts: object) => void }} props
 */
export default function AiDialog({ open, onClose, draft, onApply }) {
  const [form, setForm] = useState(() => defaultAiForm(draft.aiContext));
  const [step, setStep] = useState("form"); // form | working | result | error
  const [errors, setErrors] = useState({});
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState(null);
  const [failure, setFailure] = useState(null);
  const [mode, setMode] = useState("append");
  const [useTime, setUseTime] = useState(false);
  const [useAntiCheat, setUseAntiCheat] = useState(false);
  const request = useRef(0);
  const existing = draft.questions.length;

  useEffect(() => {
    if (step !== "working") return undefined;
    const started = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(t);
  }, [step]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setCount = (type, value) => setForm((f) => ({ ...f, counts: { ...f.counts, [type]: value } }));

  async function generate(e) {
    e?.preventDefault();
    const { errors: errs, input } = validateAiForm(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const id = ++request.current;
    setElapsed(0);
    setFailure(null);
    setStep("working");
    try {
      const res = await ai.generateQuiz(input);
      if (id !== request.current) return; // cancelled meanwhile
      const norm = normaliseGenerated(res.data);
      if (!norm.questions.length) {
        setFailure({ message: "The AI returned no questions. Nothing in your quiz was changed. Try again, or describe the topics in more detail.", retry: true });
        setStep("error");
        return;
      }
      setResult({ ...norm, context: { syllabus: input.syllabus, field: input.field || "", difficulty: input.difficulty } });
      setMode(existing ? "append" : "replace");
      setUseTime(false);
      setUseAntiCheat(false);
      setStep("result");
    } catch (err) {
      if (id !== request.current) return;
      const d = describeAiError(err instanceof ApiError ? err : null);
      setFailure(d);
      if (err instanceof ApiError && err.details?.length) {
        const map = {};
        for (const x of err.details) if (x.field) map[x.field.replace(/^questionCounts\./, "count:")] = x.message;
        setErrors(map);
      }
      setStep("error");
    }
  }

  function cancelWork() {
    request.current += 1; // ignore the late answer
    setStep("form");
  }

  function apply() {
    onApply(result, { mode, useTime, useAntiCheat, context: result.context });
    setResult(null);
    setStep("form");
    onClose();
  }

  const working = step === "working";
  const { total } = validateAiForm(form);
  const replaceTotal = result ? totalMarks({ questions: result.questions }) : 0;

  let footer;
  if (step === "form" || step === "error") {
    footer = (
      <>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button iconLeft="sparkle" type="submit" form="ai-form">
          {step === "error" && failure?.retry ? "Try again" : "Generate"}
        </Button>
      </>
    );
  } else if (working) {
    footer = (
      <Button variant="secondary" onClick={cancelWork}>
        Cancel request
      </Button>
    );
  } else {
    footer = (
      <>
        <Button variant="secondary" onClick={() => setStep("form")}>
          Back
        </Button>
        <Button onClick={apply}>{mode === "replace" && existing ? `Replace with ${pluralize(result.questions.length, "question")}` : `Add ${pluralize(result.questions.length, "question")}`}</Button>
      </>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} title="Generate with AI" size="lg" dismissible={!working} description={step === "result" ? "Review the draft. Nothing is added until you confirm." : "Describe what to cover. The AI drafts the questions; you review and edit them."} footer={footer}>
      {step === "result" && result ? (
        <div className={styles.result}>
          <ol className={styles.preview}>
            {result.questions.map((q, i) => (
              <li key={q.id}>
                <span className={styles.previewNum}>{String(i + 1).padStart(2, "0")}</span>
                <span className={styles.previewText}>
                  <span className={styles.previewType}>{TYPE_LABEL[q.type]}</span>
                  {q.text || "(empty)"}
                </span>
                <span className={styles.previewMarks}>{Number.isNaN(parseNumeric(q.marks)) ? "[?]" : <Mark value={parseNumeric(q.marks)} />}</span>
              </li>
            ))}
          </ol>
          <p className={styles.totals}>
            {pluralize(result.questions.length, "question")} · <Mark value={replaceTotal} /> in total
          </p>
          {existing ? (
            <fieldset className={styles.choice}>
              <legend className={styles.legend}>You already have {pluralize(existing, "question")}</legend>
              <Radio name="ai-mode" label="Add after my questions" checked={mode === "append"} onChange={() => setMode("append")} />
              <Radio name="ai-mode" label={`Replace my ${pluralize(existing, "question")}`} hint="Your current questions are removed. You can undo this." checked={mode === "replace"} onChange={() => setMode("replace")} />
            </fieldset>
          ) : null}
          {result.recommendedTimeLimit || result.recommendedAntiCheat ? (
            <fieldset className={styles.choice}>
              <legend className={styles.legend}>Suggested settings (optional)</legend>
              {result.recommendedTimeLimit ? <Checkbox label={`Set the time limit to ${result.recommendedTimeLimit} minutes`} checked={useTime} onChange={(e) => setUseTime(e.target.checked)} /> : null}
              {result.recommendedAntiCheat ? (
                <Checkbox
                  label="Apply the suggested proctoring"
                  hint={`Camera ${result.recommendedAntiCheat.aiCamera ? "on" : "off"}, tab switch ${result.recommendedAntiCheat.tabSwitch ? "on" : "off"}, copy and paste ${result.recommendedAntiCheat.copyPaste ? "on" : "off"}, ${result.recommendedAntiCheat.toleranceStrikes} strikes`}
                  checked={useAntiCheat}
                  onChange={(e) => setUseAntiCheat(e.target.checked)}
                />
              ) : null}
            </fieldset>
          ) : null}
        </div>
      ) : (
        <form id="ai-form" onSubmit={generate} className={styles.form} noValidate>
          {working ? (
            <div className={styles.working} role="status" aria-live="polite">
              <Spinner size={20} />
              <div>
                <p className={styles.workingTitle}>Drafting {pluralize(total, "question")}…</p>
                <p className={styles.workingHint}>
                  {elapsed >= STILL_WORKING_AT
                    ? `Still working (${elapsed}s). This can take up to 90 seconds; after that we stop and nothing changes.`
                    : `${elapsed}s. Larger sets take longer.`}
                </p>
              </div>
            </div>
          ) : null}
          {step === "error" && failure ? (
            <div className={styles.failure} role="alert">
              <p>{failure.message}</p>
              <p className={styles.failureNote}>Your quiz and the form below are unchanged.</p>
            </div>
          ) : null}
          <fieldset className={styles.fields} disabled={working}>
            <Field label="Syllabus or topics" required error={errors.syllabus} hint="For example: “Newton’s laws, friction, circular motion”.">
              <Textarea rows={4} value={form.syllabus} onChange={(e) => set({ syllabus: e.target.value })} />
            </Field>
            <div className={styles.twoCols}>
              <Field label="Subject" optional error={errors.field}>
                <Input value={form.field} placeholder="e.g. Physics" onChange={(e) => set({ field: e.target.value })} />
              </Field>
              <Field label="Difficulty" error={errors.difficulty}>
                <Select value={form.difficulty} onChange={(e) => set({ difficulty: e.target.value })} options={DIFFICULTIES.map((d) => ({ value: d, label: d[0].toUpperCase() + d.slice(1) }))} />
              </Field>
              <Field label="Total marks" optional error={errors.totalMarks}>
                <Input type="number" inputMode="decimal" min="1" value={form.totalMarks} onChange={(e) => set({ totalMarks: e.target.value })} />
              </Field>
            </div>
            <fieldset className={styles.counts}>
              <legend className={styles.legend}>How many of each ({pluralize(total, "question")})</legend>
              <div className={styles.countGrid}>
                {QUESTION_TYPES.map((t) => (
                  <Field key={t} label={TYPE_LABEL[t]} error={errors[`count:${t}`]}>
                    <Input type="number" inputMode="numeric" min="0" max="50" value={form.counts[t]} onChange={(e) => setCount(t, e.target.value)} />
                  </Field>
                ))}
              </div>
              {errors.counts ? (
                <p className={styles.inlineError} role="alert">
                  {errors.counts}
                </p>
              ) : null}
            </fieldset>
          </fieldset>
        </form>
      )}
    </Dialog>
  );
}
