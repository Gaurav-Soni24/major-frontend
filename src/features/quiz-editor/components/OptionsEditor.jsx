"use client";

import { Button, Field, IconButton, Input, Tick } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { LIMITS } from "../model/constants.js";
import { useEditor } from "./EditorContext.jsx";
import styles from "./question.module.css";

/** Answer options of a single or multiple choice question: correct marker, text, reorder, remove. */
export default function OptionsEditor({ question }) {
  const { dispatch, errorFor, touch } = useEditor();
  const multiple = question.type === "multiple";
  const count = question.options.length;
  const countError = errorFor(`${question.id}:options`);
  const listError = countError || errorFor(`${question.id}:correct`);
  const listKey = countError ? "options" : "correct";
  const act = (a) => dispatch({ ...a, id: question.id });

  return (
    <fieldset className={styles.options}>
      <legend className={styles.legend}>{multiple ? "Options (mark every correct one)" : "Options (mark the correct one)"}</legend>
      <div role={multiple ? "group" : "radiogroup"} aria-label="Answer options" className={styles.optionList}>
        {question.options.map((o, i) => {
          const key = `${question.id}:option:${o.id}`;
          return (
            <div key={o.id} className={cn(styles.option, o.isCorrect && styles.correct)}>
              <button
                type="button"
                role={multiple ? "checkbox" : "radio"}
                aria-checked={o.isCorrect}
                aria-label={`Option ${i + 1} is correct`}
                className={cn(styles.marker, multiple ? styles.square : styles.round, o.isCorrect && styles.markerOn)}
                onClick={() => act({ type: "toggleCorrect", optionId: o.id })}
              >
                {o.isCorrect ? <Tick size={16} color="#fff" /> : null}
              </button>
              <Field label={`Option ${i + 1}`} hideLabel error={errorFor(key)} className={styles.optionField}>
                <Input
                  value={o.text}
                  placeholder={`Option ${i + 1}`}
                  data-ik={key}
                  maxLength={LIMITS.optionTextMax + 50}
                  onChange={(e) => act({ type: "updateOption", optionId: o.id, text: e.target.value })}
                  onBlur={() => touch(key)}
                />
              </Field>
              <div className={styles.optionActions}>
                <IconButton icon="chevron-up" label={`Move option ${i + 1} up`} size="sm" disabled={i === 0} onClick={() => act({ type: "moveOption", optionId: o.id, by: -1 })} />
                <IconButton icon="chevron-down" label={`Move option ${i + 1} down`} size="sm" disabled={i === count - 1} onClick={() => act({ type: "moveOption", optionId: o.id, by: 1 })} />
                <IconButton icon="x" label={`Remove option ${i + 1}`} size="sm" disabled={count <= LIMITS.optionsMin} onClick={() => act({ type: "removeOption", optionId: o.id })} />
              </div>
            </div>
          );
        })}
      </div>
      {listError ? (
        <p className={styles.listError} role="alert" data-ik={`${question.id}:${listKey}`} tabIndex={-1}>
          {listError}
        </p>
      ) : null}
      <Button variant="ghost" size="sm" iconLeft="plus" disabled={count >= LIMITS.optionsMax} onClick={() => act({ type: "addOption" })}>
        Add option{count >= LIMITS.optionsMax ? ` (${LIMITS.optionsMax} max)` : ""}
      </Button>
    </fieldset>
  );
}
