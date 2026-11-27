"use client";

import { useCallback, useEffect, useState } from "react";
import { auth } from "@/lib/api";
import { session } from "@/lib/auth";
import { Button, EmptyState, PageHeader, Panel, Skeleton } from "@/components/ui";
import DetailsForm from "./DetailsForm";
import PasswordForm from "./PasswordForm";
import { signInMethod, toFormValues } from "./logic";
import styles from "./profile.module.css";

/** `/dashboard/profile`: details, sign-in method and password. */
export default function ProfileView() {
  const [state, setState] = useState({ status: "loading", profile: null, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    auth
      .getProfile()
      .then((res) => {
        if (live) setState({ status: "ready", profile: res.data, error: null });
      })
      .catch((error) => {
        if (live) setState({ status: "error", profile: null, error });
      });
    return () => {
      live = false;
    };
  }, [attempt]);

  const load = useCallback(() => {
    setState({ status: "loading", profile: null, error: null });
    setAttempt((n) => n + 1);
  }, []);

  const { status, profile, error } = state;

  /** Called after a successful save: keep the shell's cached name and the local copy in step. */
  function onSaved(data) {
    setState((s) => ({ ...s, profile: { ...s.profile, ...data } }));
    const current = session.getSnapshot().user || {};
    session.saveUser({ ...current, name: data.name || current.name });
  }

  let body;
  if (status === "error") {
    body = (
      <Panel>
        <EmptyState
          title="We could not load your profile"
          action={
            <Button variant="secondary" onClick={load}>
              Try again
            </Button>
          }
        >
          {error?.message}
        </EmptyState>
      </Panel>
    );
  } else if (status === "loading" && !profile) {
    body = (
      <div className={styles.page} aria-busy="true">
        <span className="sr-only" role="status">
          Loading your profile
        </span>
        <Panel title="Account">
          <Skeleton height={14} width="50%" />
        </Panel>
        <Panel title="Your details">
          <div className={styles.skel}>
            <Skeleton height={40} />
            <Skeleton height={96} />
            <Skeleton height={40} />
          </div>
        </Panel>
      </div>
    );
  } else {
    const hasPassword = !!profile.isPasswordSet;
    body = (
      <div className={styles.page}>
        <Panel title="Account">
          <dl className={styles.account}>
            <div>
              <dt>Email</dt>
              <dd>{profile.email}</dd>
            </div>
            <div>
              <dt>Sign-in method</dt>
              <dd>{signInMethod(profile.authProvider, hasPassword)}</dd>
            </div>
          </dl>
          <p className={styles.note}>Your email is your sign-in and cannot be changed here.</p>
        </Panel>
        <DetailsForm key={`${profile.name}|${profile.profile?.bio}|${profile.profile?.department}|${profile.profile?.institution}`} initial={toFormValues(profile)} onSaved={onSaved} />
        <PasswordForm hasPassword={hasPassword} googleOnly={!hasPassword && profile.authProvider === "google"} onChanged={(data) => setState((s) => ({ ...s, profile: { ...s.profile, isPasswordSet: data?.isPasswordSet ?? true } }))} />
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Profile" description="How you appear to students and how you sign in." />
      {body}
    </>
  );
}
