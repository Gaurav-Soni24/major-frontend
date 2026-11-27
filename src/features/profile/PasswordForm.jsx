"use client";

import { useState } from "react";
import { auth } from "@/lib/api";
import PasswordInput from "@/components/auth/PasswordInput";
import { Button, Field, Icon, Panel, toast } from "@/components/ui";
import { passwordHint, validatePasswordChange } from "./logic";
import styles from "./profile.module.css";

const EMPTY = { currentPassword: "", newPassword: "", confirmPassword: "" };

/**
 * Change a password, or set the first one for a Google-only account.
 * @param {{ hasPassword: boolean, googleOnly: boolean, onChanged: (data: any) => void }} props
 */
export default function PasswordForm({ hasPassword, googleOnly, onChanged }) {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState(/** @type {Record<string,string>} */ ({}));
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const hint = passwordHint(values.newPassword);

  const set = (field) => (e) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    if (errors[field]) setErrors((x) => ({ ...x, [field]: "" }));
  };

  async function submit(e) {
    e.preventDefault();
    setFormError("");
    const found = validatePasswordChange({ hasPassword, current: values.currentPassword, next: values.newPassword, confirm: values.confirmPassword });
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      const res = await auth.updateProfile({ newPassword: values.newPassword, ...(hasPassword ? { currentPassword: values.currentPassword } : {}) });
      toast.success(hasPassword ? "Password changed." : "Password set. You can now sign in with your email and password.");
      setValues(EMPTY);
      onChanged(res.data);
    } catch (err) {
      const fe = err.fieldErrors || {};
      if (err.status === 403 || err.code === "FORBIDDEN") setErrors({ currentPassword: "That is not your current password." });
      else if (Object.keys(fe).length) setErrors(fe);
      else setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate aria-label={hasPassword ? "Change password" : "Set a password"}>
      <Panel
        title={hasPassword ? "Change password" : "Set a password"}
        description={
          hasPassword
            ? "You will stay signed in on this device."
            : googleOnly
              ? "You sign in with Google. A password lets you also sign in with your email."
              : "Add a password to sign in with your email."
        }
      >
        <div className={styles.fields}>
          {hasPassword ? (
            <Field label="Current password" required error={errors.currentPassword}>
              <PasswordInput value={values.currentPassword} onChange={set("currentPassword")} autoComplete="current-password" />
            </Field>
          ) : null}
          <Field label="New password" required error={errors.newPassword} hint={hint.text}>
            <PasswordInput value={values.newPassword} onChange={set("newPassword")} autoComplete="new-password" />
          </Field>
          <div className={styles.meter} aria-hidden="true">
            {[1, 2, 3].map((n) => (
              <span key={n} className={hint.level >= n ? styles.meterOn : undefined} data-level={hint.level >= n ? hint.level : undefined} />
            ))}
          </div>
          <Field label="Confirm new password" required error={errors.confirmPassword}>
            <PasswordInput value={values.confirmPassword} onChange={set("confirmPassword")} autoComplete="new-password" />
          </Field>
          {formError ? (
            <p className={styles.formError} role="alert">
              <Icon name="alert" size={16} /> {formError}
            </p>
          ) : null}
          <div>
            <Button type="submit" loading={saving} variant="secondary">
              {hasPassword ? "Change password" : "Set password"}
            </Button>
          </div>
        </div>
      </Panel>
    </form>
  );
}
