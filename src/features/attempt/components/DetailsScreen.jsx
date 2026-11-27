"use client";

import { useState } from "react";
import { Button, Field, Input } from "@/components/ui";
import { isValidNumberText } from "../lib/answers.js";
import Shell, { Notice } from "./Shell";
import styles from "./screens.module.css";

/**
 * Quiz password (if protected) and the teacher's required fields. Validates before anything is sent.
 * `onSubmit({ password, customData })`; `passwordError` / `serverError` / `fieldErrors` come from the start call.
 */
export default function DetailsScreen({ quiz, student, initial, passwordError, serverError, fieldErrors, submitLabel, busy, onSubmit, onSignOut }) {
  const fields = quiz.customFields || [];
  const [password, setPassword] = useState("");
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((f) => [f.name, (initial && initial[f.name]) || ""])));
  const [errors, setErrors] = useState({});

  const validate = () => {
    const next = {};
    if (quiz.isPasswordProtected && !password) next.password = "Enter the quiz password your teacher gave you.";
    for (const f of fields) {
      const v = String(values[f.name] ?? "").trim();
      if (!v) next[`f:${f.name}`] = `${f.name} is required.`;
      else if (f.type === "number" && !isValidNumberText(v)) next[`f:${f.name}`] = `${f.name} must be a number.`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const customData = Object.fromEntries(fields.map((f) => [f.name, String(values[f.name]).trim()]));
    onSubmit({ password, customData });
  };

  return (
    <Shell student={student} onSignOut={onSignOut} narrow>
      <form className={styles.card} onSubmit={submit} noValidate>
        <div>
          <h1>Before you start</h1>
          <p className={styles.sub}>{quiz.title}</p>
        </div>
        {serverError ? <Notice tone="error">{serverError}</Notice> : null}
        <div className={styles.form}>
          {quiz.isPasswordProtected ? (
            <Field label="Quiz password" required error={errors.password || passwordError || undefined} hint="Your teacher shared this with you.">
              <Input type="password" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
          ) : null}
          {fields.map((f) => (
            <Field key={f.name} label={f.name} required error={errors[`f:${f.name}`] || (fieldErrors && fieldErrors[`customData.${f.name}`]) || undefined}>
              <Input
                type="text"
                inputMode={f.type === "number" ? "decimal" : "text"}
                autoComplete="off"
                maxLength={f.type === "number" ? 40 : 200}
                value={values[f.name]}
                onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
              />
            </Field>
          ))}
        </div>
        <div className={styles.actions}>
          <Button type="submit" size="lg" loading={busy}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Shell>
  );
}
