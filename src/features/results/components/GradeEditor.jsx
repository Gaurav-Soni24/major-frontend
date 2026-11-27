"use client";

import { useState } from "react";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { parseMarks } from "../logic/grading";
import styles from "./detail.module.css";

/**
 * Inline grading form for one question.
 * `onSave({ marksObtained, feedback })` resolves `{ ok: true }` or `{ ok: false, errors: { marksObtained?, feedback?, form? } }`.
 *
 * @param {{ question: any, number: number, onSave: (g: { marksObtained: number, feedback: string }) => Promise<{ ok: boolean, errors?: Record<string,string> }>, onCancel: () => void }} props
 */
export default function GradeEditor({ question, number, onSave, onCancel }) {
  const [marks, setMarks] = useState(String(question.needsReview ? "" : question.marksObtained ?? ""));
  const [feedback, setFeedback] = useState(question.teacherFeedback || "");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const parsed = parseMarks(marks, question.marks);
    if (parsed.error) {
      setErrors({ marksObtained: parsed.error });
      return;
    }
    if (feedback.length > 1000) {
      setErrors({ feedback: "Feedback can be at most 1000 characters." });
      return;
    }
    setErrors({});
    setSaving(true);
    const res = await onSave({ marksObtained: parsed.value, feedback: feedback.trim() });
    setSaving(false);
    if (!res.ok) setErrors(res.errors || { form: "Could not save the grade." });
  }

  return (
    <form className={styles.grade} onSubmit={submit} noValidate aria-label={`Grade question ${number}`}>
      <div className={styles.gradeFields}>
        <Field label={`Marks (out of ${question.marks})`} error={errors.marksObtained} required>
          <Input type="number" inputMode="decimal" min={0} max={question.marks} step={0.5} value={marks} onChange={(e) => setMarks(e.target.value)} autoFocus />
        </Field>
        <Field label="Feedback to keep with this grade" optional error={errors.feedback} hint={`${feedback.length} / 1000`}>
          <Textarea rows={2} value={feedback} maxLength={1000} onChange={(e) => setFeedback(e.target.value)} />
        </Field>
      </div>
      {errors.form ? (
        <p role="alert" className={styles.formError}>
          {errors.form}
        </p>
      ) : null}
      <div className={styles.gradeActions}>
        <Button type="submit" size="sm" loading={saving}>
          Save grade
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
