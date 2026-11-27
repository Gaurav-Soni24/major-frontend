import Link from "next/link";
import Logo from "@/components/ui/Logo";
import Tick from "@/components/ui/Tick";
import styles from "./AuthLayout.module.css";

/** Decorative answer slip shown beside the form on wide screens. Clearly a sample. */
function SampleSlip() {
  return (
    <figure className={styles.slip} aria-label="Sample marked question">
      <figcaption className={styles.slipLabel}>Sample question, marked</figcaption>
      <div className={styles.slipRow}>
        <span className={styles.slipNo}>03</span>
        <p className={styles.slipQ}>Which of these numbers is prime?</p>
        <span className={styles.slipMarks}>[1]</span>
      </div>
      <ul className={styles.slipOpts} role="list">
        <li>
          <span className={styles.bubble} />
          21
        </li>
        <li className={styles.picked}>
          <span className={styles.bubble}>
            <Tick size={15} />
          </span>
          23
        </li>
        <li>
          <span className={styles.bubble} />
          27
        </li>
      </ul>
      <p className={styles.slipFoot}>
        <Tick size={14} /> 1 / 1
      </p>
    </figure>
  );
}

/**
 * Shared frame for /login and /register: logo, a single heading, the form, and a footer line.
 * @param {{ title: string, subtitle?: string, footer?: import("react").ReactNode, children: import("react").ReactNode }} props
 */
export default function AuthLayout({ title, subtitle, footer, children }) {
  return (
    <div className={styles.page}>
      <a href="#main" className="skip-link">
        Skip to form
      </a>
      <div className={styles.formSide}>
        <header className={styles.top}>
          <Logo />
        </header>
        <main id="main" className={styles.main} tabIndex={-1}>
          <h1 className={styles.title}>{title}</h1>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
          {children}
          {footer ? <p className={styles.footer}>{footer}</p> : null}
        </main>
        <p className={styles.legal}>
          Students do not need an account: open the quiz link you were sent. <Link href="/">Back to home</Link>
        </p>
      </div>
      <aside className={styles.aside} aria-hidden="true">
        <SampleSlip />
      </aside>
    </div>
  );
}
