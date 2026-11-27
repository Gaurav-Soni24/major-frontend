"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { registerRules, validateFields } from "@/lib/validation";
import { Button, Field, Icon, Input } from "@/components/ui";
import AuthLayout from "./AuthLayout";
import GoogleButton from "./GoogleButton";
import PasswordInput from "./PasswordInput";
import styles from "./auth.module.css";

/** Teacher registration. Never sends a role: the server always creates teacher accounts. */
export default function RegisterForm() {
  const router = useRouter();
  const { status, login } = useAuth();
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const formRef = useRef(null);

  useEffect(() => {
    if (status === "authenticated" && !loading) router.replace("/dashboard");
  }, [status, loading, router]);

  function onChange(e) {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    if (errors[name]) setErrors((er) => ({ ...er, [name]: "" }));
  }

  function failed(err) {
    const e = err instanceof ApiError ? err : new ApiError();
    setErrors(e.fieldErrors);
    setFormError(Object.keys(e.fieldErrors).length ? "" : e.message);
    setLoading(false);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setFormError("");
    const errs = validateFields(values, registerRules);
    setErrors(errs);
    const first = Object.keys(errs)[0];
    if (first) {
      formRef.current?.elements[first]?.focus();
      return;
    }
    setLoading(true);
    try {
      await auth.register(values);
      router.replace("/login?registered=1");
    } catch (err) {
      failed(err);
    }
  }

  async function onGoogle(credential) {
    setFormError("");
    setLoading(true);
    try {
      const res = await auth.googleLogin(credential);
      login({ token: res.token, userId: res.userId, user: res.user });
      router.replace("/dashboard");
    } catch (err) {
      failed(err);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="For teachers and trainers. Students do not need an account."
      footer={
        <>
          Already have an account? <Link href="/login">Sign in</Link>
        </>
      }
    >
      <GoogleButton text="signup_with" disabled={loading} onCredential={onGoogle} onError={(m) => setFormError(m)} />
      <div className={styles.divider}>or use your email</div>

      <form ref={formRef} className={styles.form} onSubmit={onSubmit} noValidate>
        {formError ? (
          <p className={styles.formError} role="alert">
            <Icon name="alert" size={18} />
            <span>{formError}</span>
          </p>
        ) : null}
        <Field label="Full name" error={errors.name} required>
          <Input name="name" autoComplete="name" placeholder="Asha Verma" value={values.name} onChange={onChange} size="lg" />
        </Field>
        <Field label="Email" error={errors.email} required>
          <Input name="email" type="email" autoComplete="email" inputMode="email" placeholder="you@school.edu" value={values.email} onChange={onChange} size="lg" />
        </Field>
        <Field label="Password" hint="8 to 72 characters." error={errors.password} required>
          <PasswordInput name="password" autoComplete="new-password" value={values.password} onChange={onChange} size="lg" />
        </Field>
        <Button type="submit" size="lg" block loading={loading}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
