import Link from "next/link";
import { Button, Tick } from "@/components/ui";
import SampleQuestion from "./SampleQuestion";
import styles from "./landing.module.css";

/** Hero: three headline lines rise from masks, then the examiner's tick draws itself. One h1. */
export default function Hero() {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.heroText}>
        <h1 id="hero-title" className={styles.h1}>
          <span className={styles.mask}>
            <span className={styles.line} style={{ "--i": 0 }}>
              Set the paper.
            </span>
          </span>
          <span className={styles.mask}>
            <span className={styles.line} style={{ "--i": 1 }}>
              Share the link.
            </span>
          </span>
          <span className={styles.mask}>
            <span className={styles.line} style={{ "--i": 2 }}>
              Read the marks.
              <Tick size={56} strokeWidth={2.6} className={styles.heroTick} />
            </span>
          </span>
        </h1>
        <p className={styles.lede}>
          Quizify is an online assessment platform. Write questions yourself or generate them from a syllabus, let students attempt in a quiet, proctored player, and review scored submissions with AI grading for written and code answers.
        </p>
        <div className={styles.ctas}>
          <Button href="/register" size="lg" iconRight="arrow-right">
            Create a quiz
          </Button>
          <Button href="/login" variant="secondary" size="lg">
            Sign in
          </Button>
        </div>
        <p className={styles.heroNote}>
          Taking a quiz? Open the link your teacher sent you. <Link href="/student">Look up past results</Link>.
        </p>
      </div>
      <div className={styles.heroSheet}>
        <SampleQuestion />
      </div>
    </section>
  );
}
