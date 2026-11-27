"use client";

import { Mark } from "@/components/ui";
import GoogleButton from "@/components/auth/GoogleButton";
import { pluralize } from "@/lib/utils/format";
import { guardsOf } from "../lib/proctor.js";
import Shell, { Notice } from "./Shell";
import styles from "./screens.module.css";

function Facts({ quiz }) {
  const total = (quiz.questions || []).reduce((s, q) => s + (Number(q.marks) || 0), 0);
  return (
    <dl className={styles.facts}>
      <div className={styles.fact}>
        <dt>Questions</dt>
        <dd>{quiz.questions.length}</dd>
      </div>
      <div className={styles.fact}>
        <dt>Total marks</dt>
        <dd>
          <Mark value={total} />
        </dd>
      </div>
      <div className={styles.fact}>
        <dt>Time limit</dt>
        <dd>{quiz.timeLimit ? `${quiz.timeLimit} min` : "None"}</dd>
      </div>
      <div className={styles.fact}>
        <dt>Pass mark</dt>
        <dd>{quiz.passingScore}%</dd>
      </div>
    </dl>
  );
}

/** What is monitored, from the quiz's own settings only. */
export function MonitoringList({ quiz }) {
  const g = guardsOf(quiz.antiCheatSettings);
  const items = [];
  if (g.camera) items.push("Your camera is used to check that one face is in view. Video is not recorded. A small snapshot is saved only when something looks wrong.");
  if (g.tabSwitch) items.push(`Leaving this tab or window is recorded. After ${pluralize(g.tolerance, "switch", "switches")} the quiz is submitted automatically.`);
  if (g.copyPaste) items.push("Copying, pasting and the right-click menu are turned off. You can still type your answers.");
  if (!items.length) return null;
  return (
    <section className={styles.section} aria-labelledby="monitor-h">
      <h2 id="monitor-h">What is monitored</h2>
      <ul className={styles.list}>
        {items.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </section>
  );
}

export default function LandingScreen({ quiz, onCredential, onSignInError, notice, error }) {
  const instructions = (quiz.instructions || []).filter(Boolean);
  return (
    <Shell>
      <div className={styles.grid}>
        <div className={styles.intro}>
          <h1 className={styles.title}>{quiz.title}</h1>
          {quiz.description ? <p className={styles.lede}>{quiz.description}</p> : null}
          <Facts quiz={quiz} />
        </div>

        <aside className={styles.signin} aria-labelledby="signin-h">
          <h2 id="signin-h">Sign in to start</h2>
          <p>Use your Google account. Your name and email are sent to your teacher with your answers.</p>
          {notice ? <Notice tone="warn">{notice}</Notice> : null}
          {error ? <Notice tone="error">{error}</Notice> : null}
          <GoogleButton onCredential={onCredential} onError={onSignInError} text="signin_with" />
          <p className={styles.fineprint}>{quiz.timeLimit ? `The ${quiz.timeLimit}-minute timer starts when you press Start quiz and does not pause.` : "There is no time limit."}</p>
        </aside>

        <div className={styles.body}>
          {instructions.length ? (
            <section className={styles.section} aria-labelledby="inst-h">
              <h2 id="inst-h">Instructions</h2>
              <ol className={styles.list}>
                {instructions.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ol>
            </section>
          ) : null}
          <MonitoringList quiz={quiz} />
          <section className={styles.section} aria-labelledby="save-h">
            <h2 id="save-h">Your answers are saved as you go</h2>
            <p className={styles.plain}>
              Answers are saved automatically. If you reload the page or lose your connection, sign in again and you continue where you left off. The timer keeps running while you are away.
            </p>
          </section>
        </div>
      </div>
    </Shell>
  );
}
