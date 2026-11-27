"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Button, ConfirmDialog, Field, IconButton, Input, Select, Skeleton, Textarea, toast } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { formatQuestionNumber } from "@/lib/utils/format";
import { CODE_LANGUAGES, LIMITS, QUESTION_TYPES, TYPE_LABEL, isChoice } from "../model/constants.js";
import { cloneQuestion, switchType } from "../model/draft.js";
import { actionToast } from "./toasts.jsx";
import ToolButton from "./ToolButton.jsx";
import EditorIcon, { TYPE_ICON } from "./EditorIcon.jsx";
import { useEditor } from "./EditorContext.jsx";
import OptionsEditor from "./OptionsEditor.jsx";
import styles from "./question.module.css";

const CodeField = dynamic(() => import("./CodeField.jsx"), {
  ssr: false,
  loading: () => <Skeleton height={140} />,
});

/** The focused question: type, text, marks, type specific answer form, and the question actions. */
export default function QuestionPanel({ question }) {
  const { draft, dispatch, errorFor, touch, locked, setFocus, focusAfterRemove, regen } = useEditor();
  const [pendingType, setPendingType] = useState(null);
  const index = draft.questions.findIndex((q) => q.id === question.id);
  const total = draft.questions.length;
  const key = (f) => `${question.id}:${f}`;
  const ctl = (f) => ({ "data-ik": key(f), onBlur: () => touch(key(f)) });
  const update = (patch) => dispatch({ type: "updateQuestion", id: question.id, patch });
  const lost = pendingType ? switchType(question, pendingType).lost : [];

  const requestType = (to) => {
    if (to === question.type) return;
    const { lost: l } = switchType(question, to);
    if (l.length) setPendingType(to);
    else dispatch({ type: "switchType", id: question.id, to });
  };

  const remove = () => {
    const removed = question;
    const at = index;
    setFocus(focusAfterRemove(question.id));
    dispatch({ type: "removeQuestion", id: question.id });
    actionToast(`Question ${at + 1} deleted`, "Undo", () => {
      dispatch({ type: "addQuestion", question: removed, index: at });
      setFocus(removed.id);
    });
  };

  const duplicate = () => {
    const copy = cloneQuestion(question);
    dispatch({ type: "duplicateQuestion", id: question.id, copy });
    setFocus(copy.id);
    toast.success(`Question ${index + 1} duplicated`);
  };

  const busyRegen = regen.busyId === question.id;

  return (
    <section className={styles.panel} aria-labelledby="panel-question">
      <header className={styles.head}>
        <h2 id="panel-question" className={styles.title}>
          <span className={styles.number}>{formatQuestionNumber(index + 1)}</span>
          <span>Question {index + 1} of {total}</span>
        </h2>
        <div className={styles.actions} role="group" aria-label="Question actions">
          <ToolButton icon="arrow-up" label="Move question up" size="sm" disabled={locked || index === 0} onClick={() => dispatch({ type: "moveQuestionBy", id: question.id, by: -1 })} />
          <ToolButton icon="arrow-down" label="Move question down" size="sm" disabled={locked || index === total - 1} onClick={() => dispatch({ type: "moveQuestionBy", id: question.id, by: 1 })} />
          <IconButton icon="copy" label="Duplicate question" size="sm" disabled={locked || total >= LIMITS.questionsMax} onClick={duplicate} />
          <IconButton icon="trash" label="Delete question" size="sm" disabled={locked} onClick={remove} />
        </div>
      </header>

      <fieldset className={styles.form} disabled={locked}>
        <div role="radiogroup" aria-label="Question type" className={styles.types}>
          {QUESTION_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={question.type === t}
              className={cn(styles.type, question.type === t && styles.typeOn)}
              onClick={() => requestType(t)}
            >
              <EditorIcon name={TYPE_ICON[t]} size={16} />
              {TYPE_LABEL[t]}
            </button>
          ))}
        </div>

        <div className={styles.textRow}>
          <Field label="Question" required error={errorFor(key("text"))} className={styles.grow}>
            <Textarea rows={3} className={styles.questionText} value={question.text} placeholder="Write the question students will see" onChange={(e) => update({ text: e.target.value })} {...ctl("text")} />
          </Field>
          <Field label="Marks" error={errorFor(key("marks"))} className={styles.marks}>
            <Input type="number" inputMode="decimal" min="0" max={LIMITS.marksMax} step="0.5" value={question.marks} onChange={(e) => update({ marks: e.target.value })} {...ctl("marks")} />
          </Field>
        </div>

        {isChoice(question.type) ? <OptionsEditor question={question} /> : null}

        {question.type === "integer" ? (
          <Field label="Correct answer" error={errorFor(key("correctAnswer"))} hint="Any number. Student answers are compared as numbers, so 42 and 42.0 match." className={styles.narrow}>
            <Input inputMode="decimal" value={question.correctAnswer} placeholder="e.g. 42" onChange={(e) => update({ correctAnswer: e.target.value })} {...ctl("correctAnswer")} />
          </Field>
        ) : null}

        {question.type === "code" ? (
          <div className={styles.codeBlock}>
            <Field label="Language" className={styles.narrow} error={errorFor(key("codeLanguage"))}>
              <Select
                value={question.codeLanguage}
                onChange={(e) => update({ codeLanguage: e.target.value })}
                options={CODE_LANGUAGES.map((l) => ({ value: l, label: l === "python" ? "Python" : "JavaScript" }))}
                {...ctl("codeLanguage")}
              />
            </Field>
            <div className={styles.starter} data-ik={key("starterCode")} tabIndex={-1}>
              <span className={styles.legend}>Starter code (shown to the student)</span>
              <div className={cn(styles.codeWrap, errorFor(key("starterCode")) && styles.codeInvalid)}>
                <CodeField value={question.starterCode} language={question.codeLanguage} label="Starter code" readOnly={locked} onChange={(v) => update({ starterCode: v })} />
              </div>
              {errorFor(key("starterCode")) ? (
                <p className={styles.listError} role="alert">
                  {errorFor(key("starterCode"))}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {question.type === "text" || question.type === "code" ? (
          <div className={styles.refs}>
            <Field label="Reference answer" error={errorFor(key("correctAnswer"))} hint="An example of a full-marks answer. Add this, a rubric, or both: at least one is needed so answers can be marked.">
              <Textarea rows={3} value={question.correctAnswer} onChange={(e) => update({ correctAnswer: e.target.value })} {...ctl("correctAnswer")} />
            </Field>
            <Field label="Grading rubric" optional error={errorFor(key("aiGradingRubric"))} hint="What earns marks, for example “1 mark for naming the scope, 2 for the example”.">
              <Textarea rows={3} value={question.aiGradingRubric} onChange={(e) => update({ aiGradingRubric: e.target.value })} {...ctl("aiGradingRubric")} />
            </Field>
          </div>
        ) : null}

        {regen.available ? (
          <div className={styles.regen}>
            <Button variant="secondary" size="sm" iconLeft="sparkle" loading={busyRegen} disabled={locked || !!regen.busyId} onClick={() => regen.run(question)}>
              Regenerate with AI
            </Button>
            <span className={styles.regenHint}>Replaces this question with a new {TYPE_LABEL[question.type].toLowerCase()} question on the same syllabus. You can undo it.</span>
          </div>
        ) : null}
      </fieldset>

      <ConfirmDialog
        open={!!pendingType}
        onClose={() => setPendingType(null)}
        title={`Change to ${pendingType ? TYPE_LABEL[pendingType] : ""}?`}
        description="Some of what you entered does not exist in the new type. You can undo this straight away."
        confirmLabel="Change type"
        tone="danger"
        onConfirm={() => {
          dispatch({ type: "switchType", id: question.id, to: pendingType });
          setPendingType(null);
        }}
      >
        <p className={styles.lostLabel}>This will remove:</p>
        <ul className={styles.lostList}>
          {lost.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </ConfirmDialog>
    </section>
  );
}
