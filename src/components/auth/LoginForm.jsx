"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, ApiError } from "@/lib/api";
import { useAuth, safeNext } from "@/lib/auth";
import { loginRules, validateFields } from "@/lib/validation";
import { Button, Field, Icon, Input } from "@/components/ui";
import AuthLayout from "./AuthLayout";
import GoogleButton from "./GoogleButton";
import PasswordInput from "./PasswordInput";
import styles from "./auth.module.css";

/** Sign-in form. Reads `?next=` (same-site paths only) and `?registered=1` (shows a success notice). */
export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const registered = params.get("registered") === "1";
  const { status, login } = useAuth();

  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const formRef = useRef(null);

  // Already signed in: leave this page.
  useEffect(() => {
    if (status === "authenticated" && !loading) router.replace(next);
  }, [status, loading, next, router]);

  /** @param {{ token: string, userId?: string, user?: any }} res */
  function finish(res) {
    login({ token: res.token, userId: res.userId, user: res.user });
    router.replace(next);
  }

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
    const errs = validateFields(values, loginRules);
    setErrors(errs);
    const first = Object.keys(errs)[0];
    if (first) {
      formRef.current?.elements[first]?.focus();
      return;
    }
    setLoading(true);
    try {
      finish(await auth.login(values));
    } catch (err) {
      failed(err);
    }
  }

  async function onGoogle(credential) {
    setFormError("");
    setLoading(true);
    try {
      finish(await auth.googleLogin(credential));
    } catch (err) {
      failed(err);
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Sign in to manage your quizzes and review submissions."
      footer={
        <>
          New to Quizify? <Link href="/register">Create an account</Link>
        </>
      }
    >
      {registered ? (
        <p className={styles.notice} role="status">
          <Icon name="check" size={18} />
          <span>Account created. Sign in to continue.</span>
        </p>
      ) : null}

      <GoogleButton text="signin_with" disabled={loading} onCredential={onGoogle} onError={(m) => setFormError(m)} />
      <div className={styles.divider}>or use your email</div>

      <form ref={formRef} className={styles.form} onSubmit={onSubmit} noValidate>
        {formError ? (
          <p className={styles.formError} role="alert">
            <Icon name="alert" size={18} />
            <span>{formError}</span>
          </p>
        ) : null}
        <Field label="Email" error={errors.email} required>
          <Input name="email" type="email" autoComplete="email" inputMode="email" placeholder="you@school.edu" value={values.email} onChange={onChange} size="lg" />
        </Field>
        <Field label="Password" error={errors.password} required>
          <PasswordInput name="password" autoComplete="current-password" value={values.password} onChange={onChange} size="lg" />
        </Field>
        <Button type="submit" size="lg" block loading={loading}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
