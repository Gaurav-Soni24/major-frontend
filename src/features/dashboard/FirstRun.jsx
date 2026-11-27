import { Button, Panel } from "@/components/ui";
import styles from "./dashboard.module.css";

const STEPS = [
  {
    title: "Create or generate a quiz",
    text: "Write the questions yourself, or describe a topic and let AI draft them for you to edit.",
  },
  {
    title: "Publish it",
    text: "A quiz stays a draft until you publish it. Students cannot open a draft.",
  },
  {
    title: "Share the link",
    text: "Copy the student link from the Quizzes page and send it. Students sign in with Google, then attempt.",
  },
];

/** First-run guide for a teacher with no quizzes yet. */
export default function FirstRun() {
  return (
    <Panel title="Get your first quiz out" description="You have not created a quiz yet.">
      <ol className={styles.steps} role="list">
        {STEPS.map((s, i) => (
          <li key={s.title} className={styles.step}>
            <span className={styles.stepNo} aria-hidden="true">
              [{i + 1}]
            </span>
            <div>
              <h3 className={styles.stepTitle}>{s.title}</h3>
              <p className={styles.stepText}>{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className={styles.firstActions}>
        <Button href="/dashboard/create-quiz" iconLeft="plus">
          Create quiz
        </Button>
      </div>
    </Panel>
  );
}
