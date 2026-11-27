"use client";

import { useState } from "react";
import { Button, Field, IconButton, Input, Select, Switch } from "@/components/ui";
import { LIMITS } from "../model/constants.js";
import { uid } from "../model/draft.js";
import { useEditor } from "./EditorContext.jsx";
import styles from "./panels.module.css";

function PasswordControl() {
  const { draft, dispatch, meta, errorFor, touch } = useEditor();
  const [show, setShow] = useState(false);
  const set = (key, value) => dispatch({ type: "set", key, value });
  const mode = draft.passwordMode;

  if (mode === "set") {
    return (
      <Field label="Quiz password" error={errorFor("settings:password")} hint="Students must enter this before they can start. It is stored hashed and can never be shown again.">
        <Input
          type={show ? "text" : "password"}
          autoComplete="new-password"
          value={draft.passwordValue}
          onChange={(e) => set("passwordValue", e.target.value)}
          data-ik="settings:password"
          onBlur={() => touch("settings:password")}
          trailing={<IconButton icon={show ? "eye-off" : "eye"} label={show ? "Hide password" : "Show password"} size="sm" onClick={() => setShow((v) => !v)} />}
        />
        <div className={styles.inlineActions}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              set("passwordMode", "keep");
              set("passwordValue", "");
            }}
          >
            Cancel
          </Button>
        </div>
      </Field>
    );
  }

  const startSet = () => {
    set("passwordMode", "set");
    set("passwordValue", "");
  };
  if (mode === "remove") {
    return (
      <div className={styles.passwordState}>
        <p>The password will be removed when you save.</p>
        <Button variant="ghost" size="sm" onClick={() => set("passwordMode", "keep")}>
          Keep it
        </Button>
      </div>
    );
  }
  return meta.hasPassword ? (
    <div className={styles.passwordState}>
      <p>
        <strong>A password is set.</strong> It is stored hashed, so it cannot be shown.
      </p>
      <div className={styles.inlineActions}>
        <Button variant="secondary" size="sm" onClick={startSet}>
          Change password
        </Button>
        <Button variant="ghost" size="sm" onClick={() => set("passwordMode", "remove")}>
          Remove password
        </Button>
      </div>
    </div>
  ) : (
    <div className={styles.passwordState}>
      <p>No password. Anyone with the link can start (after Google sign-in).</p>
      <Button variant="secondary" size="sm" onClick={startSet}>
        Set a password
      </Button>
    </div>
  );
}

/** Timing, shuffling, proctoring, password, and the details students enter at registration. */
export default function SettingsPanel() {
  const { draft, dispatch, errorFor, touch, locked } = useEditor();
  const ctl = (key) => ({ "data-ik": key, onBlur: () => touch(key) });
  const set = (key, value) => dispatch({ type: "set", key, value });
  const setIn = (key, sub, value) => dispatch({ type: "setIn", key, sub, value });
  const lockedHint = locked ? "Locked because this quiz has submissions." : undefined;

  const setField = (id, patch) => set("customFields", draft.customFields.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  return (
    <section className={styles.panel} aria-labelledby="panel-settings">
      <header className={styles.panelHead}>
        <h2 id="panel-settings" className={styles.panelTitle}>
          Settings
        </h2>
        <p className={styles.panelHint}>How the quiz runs, and who can start it.</p>
      </header>

      <div className={styles.stack}>
        <fieldset className={styles.group}>
          <legend className={styles.legend}>Time and scoring</legend>
          <Switch label="Time limit" hint={lockedHint || "The attempt ends automatically when time is up."} checked={draft.timeLimitOn} disabled={locked} onChange={(v) => set("timeLimitOn", v)} />
          {draft.timeLimitOn ? (
            <Field label="Minutes" error={errorFor("settings:timeLimit")} className={styles.narrow}>
              <Input type="number" inputMode="numeric" min={LIMITS.timeLimitMin} max={LIMITS.timeLimitMax} value={draft.timeLimit} disabled={locked} onChange={(e) => set("timeLimit", e.target.value)} {...ctl("settings:timeLimit")} />
            </Field>
          ) : null}
          <Field label="Passing score (%)" error={errorFor("settings:passingScore")} hint={lockedHint} className={styles.narrow}>
            <Input type="number" inputMode="numeric" min={LIMITS.passingMin} max={LIMITS.passingMax} value={draft.passingScore} disabled={locked} onChange={(e) => set("passingScore", e.target.value)} {...ctl("settings:passingScore")} />
          </Field>
        </fieldset>

        <fieldset className={styles.group}>
          <legend className={styles.legend}>What students get</legend>
          <Switch label="Shuffle questions" hint="Each student sees the questions in a different order." checked={draft.settings.shuffleQuestions} onChange={(v) => setIn("settings", "shuffleQuestions", v)} />
          <Switch label="Shuffle answer options" hint="Options of choice questions are mixed per student." checked={draft.settings.shuffleOptions} onChange={(v) => setIn("settings", "shuffleOptions", v)} />
          <Switch label="Show answers after submitting" hint="Students see the correct answers and feedback on their result page." checked={draft.settings.showAnswers} onChange={(v) => setIn("settings", "showAnswers", v)} />
        </fieldset>

        <fieldset className={styles.group}>
          <legend className={styles.legend}>Proctoring</legend>
          <Switch label="Camera monitoring" hint="Checks that a face is visible. Snapshots of flagged moments are saved for you." checked={draft.antiCheat.aiCamera} onChange={(v) => setIn("antiCheat", "aiCamera", v)} />
          <Switch label="Detect tab switching" hint="Counts a strike when the student leaves the quiz tab." checked={draft.antiCheat.tabSwitch} onChange={(v) => setIn("antiCheat", "tabSwitch", v)} />
          <Switch label="Block copy and paste" hint="Copy and paste attempts count as strikes." checked={draft.antiCheat.copyPaste} onChange={(v) => setIn("antiCheat", "copyPaste", v)} />
          <Field label="Strikes before auto-submit" hint="1 to 10. The quiz is submitted when a student reaches this many strikes." error={errorFor("settings:toleranceStrikes")} className={styles.narrow}>
            <Input type="number" inputMode="numeric" min={LIMITS.strikesMin} max={LIMITS.strikesMax} value={draft.antiCheat.toleranceStrikes} onChange={(e) => setIn("antiCheat", "toleranceStrikes", e.target.value)} {...ctl("settings:toleranceStrikes")} />
          </Field>
        </fieldset>

        <fieldset className={styles.group}>
          <legend className={styles.legend}>Access</legend>
          <PasswordControl />
          <div className={styles.subgroup}>
            <h3 className={styles.subTitle}>Registration fields</h3>
            <p className={styles.panelHint}>Extra details students fill in before starting, such as a roll number. Up to {LIMITS.customFieldsMax}.</p>
            {errorFor("settings:customFields") ? (
              <p className={styles.inlineError} role="alert">
                {errorFor("settings:customFields")}
              </p>
            ) : null}
            <ul className={styles.rows}>
              {draft.customFields.map((f, i) => (
                <li key={f.id} className={styles.fieldRow}>
                  <Field label={`Field ${i + 1} name`} hideLabel error={errorFor(`settings:field:${f.id}:name`)}>
                    <Input value={f.name} placeholder="e.g. Roll number" onChange={(e) => setField(f.id, { name: e.target.value })} {...ctl(`settings:field:${f.id}:name`)} />
                  </Field>
                  <Field label={`Field ${i + 1} type`} hideLabel>
                    <Select
                      value={f.type}
                      onChange={(e) => setField(f.id, { type: e.target.value })}
                      options={[
                        { value: "text", label: "Text" },
                        { value: "number", label: "Number" },
                      ]}
                    />
                  </Field>
                  <IconButton icon="x" label={`Remove field ${i + 1}`} size="sm" onClick={() => set("customFields", draft.customFields.filter((x) => x.id !== f.id))} />
                </li>
              ))}
            </ul>
            <Button variant="ghost" size="sm" iconLeft="plus" disabled={draft.customFields.length >= LIMITS.customFieldsMax} onClick={() => set("customFields", [...draft.customFields, { id: uid("c"), name: "", type: "text" }])}>
              Add field
            </Button>
          </div>
        </fieldset>
      </div>
    </section>
  );
}
