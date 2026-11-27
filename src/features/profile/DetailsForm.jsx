"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/api";
import { Button, Field, Icon, Input, Panel, Textarea, toast } from "@/components/ui";
import { LIMITS, detailsPayload, isDirty, validateDetails } from "./logic";
import styles from "./profile.module.css";

/**
 * Name, bio, department, institution. Save bar appears only when something changed.
 * Remounted by the parent (via `key`) after a save, so `initial` is always the saved state.
 * @param {{ initial: Record<string,string>, onSaved: (data: any) => void }} props
 */
export default function DetailsForm({ initial, onSaved }) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState(/** @type {Record<string,string>} */ ({}));
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const dirty = isDirty(initial, values);

  useEffect(() => {
    if (!dirty) return undefined;
    /** @param {BeforeUnloadEvent} e */
    const warn = (e) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = (field) => (e) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    if (errors[field]) setErrors((x) => ({ ...x, [field]: "" }));
  };

  async function submit(e) {
    e.preventDefault();
    const found = validateDetails(values);
    setErrors(found);
    setFormError("");
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      const res = await auth.updateProfile(detailsPayload(initial, values));
      toast.success("Profile saved.");
      onSaved(res.data || {});
    } catch (err) {
      const fe = err.fieldErrors || {};
      if (Object.keys(fe).length) setErrors(fe);
      else setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const bioLeft = LIMITS.bio - values.bio.length;

  return (
    <form onSubmit={submit} noValidate aria-label="Your details">
      <Panel title="Your details" description="Shown on your quizzes. Only your name is required.">
        <div className={styles.fields}>
          <Field label="Name" required error={errors.name}>
            <Input value={values.name} onChange={set("name")} autoComplete="name" maxLength={LIMITS.name.max + 20} />
          </Field>
          <Field label="Bio" optional error={errors.bio} hint={`${bioLeft} characters left`}>
            <Textarea value={values.bio} onChange={set("bio")} rows={4} />
          </Field>
          <div className={styles.two}>
            <Field label="Department" optional error={errors.department}>
              <Input value={values.department} onChange={set("department")} />
            </Field>
            <Field label="Institution" optional error={errors.institution}>
              <Input value={values.institution} onChange={set("institution")} />
            </Field>
          </div>
          {formError ? (
            <p className={styles.formError} role="alert">
              <Icon name="alert" size={16} /> {formError}
            </p>
          ) : null}
        </div>
        <div className={styles.saveBar} data-visible={dirty || undefined} aria-hidden={dirty ? undefined : true} inert={dirty ? undefined : true}>
          <span className={styles.dirty}>You have unsaved changes.</span>
          <span className={styles.barActions}>
            <Button
              variant="ghost"
              onClick={() => {
                setValues(initial);
                setErrors({});
                setFormError("");
              }}
              disabled={saving}
            >
              Discard
            </Button>
            <Button type="submit" loading={saving} disabled={!dirty}>
              Save changes
            </Button>
          </span>
        </div>
      </Panel>
    </form>
  );
}
