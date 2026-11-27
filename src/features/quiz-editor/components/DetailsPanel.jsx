"use client";

import { Button, Field, IconButton, Input, Textarea } from "@/components/ui";
import { LIMITS } from "../model/constants.js";
import { instructionKey } from "../model/validate.js";
import { useEditor } from "./EditorContext.jsx";
import styles from "./panels.module.css";

/** Quiz title, description and the instruction list students see before they start. */
export default function DetailsPanel() {
  const { draft, dispatch, errorFor, touch } = useEditor();
  const ctl = (key) => ({ "data-ik": key, onBlur: () => touch(key) });
  const set = (key, value) => dispatch({ type: "set", key, value });
  const setInstruction = (i, value) => set("instructions", draft.instructions.map((s, j) => (j === i ? value : s)));
  const addInstruction = () => set("instructions", [...draft.instructions, ""]);
  const removeInstruction = (i) => {
    const next = draft.instructions.filter((_, j) => j !== i);
    set("instructions", next.length ? next : [""]);
  };

  return (
    <section className={styles.panel} aria-labelledby="panel-details">
      <header className={styles.panelHead}>
        <h2 id="panel-details" className={styles.panelTitle}>
          Details
        </h2>
        <p className={styles.panelHint}>What students see before they start.</p>
      </header>

      <div className={styles.stack}>
        <Field label="Title" required error={errorFor("details:title")}>
          <Input value={draft.title} maxLength={LIMITS.titleMax + 20} placeholder="e.g. Midterm: Thermodynamics" onChange={(e) => set("title", e.target.value)} {...ctl("details:title")} />
        </Field>
        <Field label="Description" optional error={errorFor("details:description")} hint="One or two sentences about what the quiz covers.">
          <Textarea rows={3} value={draft.description} onChange={(e) => set("description", e.target.value)} {...ctl("details:description")} />
        </Field>

        <fieldset className={styles.group}>
          <legend className={styles.legend}>Instructions for students</legend>
          <p className={styles.panelHint}>Short rules shown before the quiz starts. Empty lines are ignored.</p>
          {errorFor("details:instructions") ? (
            <p className={styles.inlineError} role="alert">
              {errorFor("details:instructions")}
            </p>
          ) : null}
          <ol className={styles.rows}>
            {draft.instructions.map((text, i) => {
              const key = instructionKey(draft.instructions, i);
              return (
                <li key={i} className={styles.instructionRow}>
                  <Field label={`Instruction ${i + 1}`} hideLabel error={key ? errorFor(key) : undefined}>
                    <Input value={text} placeholder={`Instruction ${i + 1}`} onChange={(e) => setInstruction(i, e.target.value)} {...(key ? ctl(key) : {})} />
                  </Field>
                  <IconButton icon="x" label={`Remove instruction ${i + 1}`} size="sm" onClick={() => removeInstruction(i)} />
                </li>
              );
            })}
          </ol>
          <Button variant="ghost" size="sm" iconLeft="plus" onClick={addInstruction} disabled={draft.instructions.length >= LIMITS.instructionsMax}>
            Add instruction
          </Button>
        </fieldset>
      </div>
    </section>
  );
}
