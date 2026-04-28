'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

export default function LandingPage() {
  const [menuActive, setMenuActive] = useState(false);

  const toggleMenu = () => {
    setMenuActive(!menuActive);
  };

  return (
    <>
      <header className={styles.header}>
        <nav className={styles.nav}>
          <div className={styles.logo}>
            <h2>Quizify</h2>
          </div>
          <div 
            className={`${styles.hamburger} ${menuActive ? styles.hamburgerActive : ''}`} 
            onClick={toggleMenu}
          >
            <span className={styles.bar}></span>
            <span className={styles.bar}></span>
            <span className={styles.bar}></span>
          </div>
          <ul className={`${styles.navMenu} ${menuActive ? styles.navMenuActive : ''}`}>
            <li className={styles.navItem}>
              <a href="#how-it-works" className={styles.navLink} onClick={toggleMenu}>How it works</a>
            </li>
            <li className={styles.navItem}>
              <a href="#features" className={styles.navLink} onClick={toggleMenu}>Features</a>
            </li>
            <li className={styles.navItem}>
              <a href="#pricing" className={styles.navLink} onClick={toggleMenu}>Pricing</a>
            </li>
            <li className={styles.navItem}>
              <Link href="/login" className={`${styles.navLink} ${styles.loginBtn}`} onClick={toggleMenu}>Login / Sign up</Link>
            </li>
          </ul>
        </nav>
      </header>

      <main className={styles.main}>
        {/* HERO SECTION */}
        <div className={styles.heroContainer}>
          <div className={styles.hero}>
            <div className={styles.heroContent}>
              <span className={styles.badge}><i className="bi bi-stars"></i> Unlimited Wallet Access Now Live</span>
              <h1>Sharpen your mind <br />one quiz at a time</h1>
              <p>Empower your teaching with our intuitive quiz creation platform. Build, share, and track assessments in minutes.</p>
              <div className={styles.ctaGroup}>
                <Link href="/register" className={styles.ctaBtn}>Start creating free</Link>
                <a href="#how-it-works" className={styles.knowMore}><i className="bi bi-play-circle"></i> See how it works</a>
              </div>
            </div>
          </div>
        </div>

        {/* STATS SECTION */}
        <div className={styles.statsSection}>
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span>Active Educators</span>
            </div>
            <div className={styles.statValue}>12,450</div>
            <div className={styles.statGrowth}><i className="bi bi-arrow-up-right"></i> +24.5% this month</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span>Quizzes Created</span>
            </div>
            <div className={styles.statValue}>845K</div>
            <div className={styles.statGrowth}><i className="bi bi-arrow-up-right"></i> +12.2% this year</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span>Global Reach</span>
            </div>
            <div className={styles.statValue}>136</div>
            <div className={styles.statGrowth}>Countries supported</div>
          </div>
        </div>

        {/* HOW IT WORKS SECTION */}
        <div id="how-it-works" className={styles.howItWorksSection}>
          <h2 className={styles.sectionTitle}>Create an assessment in 3 steps</h2>
          <div className={styles.stepsGrid}>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>1</div>
              <h3>Draft Your Questions</h3>
              <p>Use our block-editor to type out questions, add images, and set multiple choice or open-ended answers.</p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>2</div>
              <h3>Deploy to Students</h3>
              <p>Generate a unique link or class code. Students can access the quiz instantly from their portal without logging in.</p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>3</div>
              <h3>Analyze Results</h3>
              <p>Watch scores roll in live. Our analytics dashboard will highlight exactly which topics your class struggled with.</p>
            </div>
          </div>
        </div>

        {/* FEATURES SECTION */}
        <div id="features" className={styles.featuresSection}>
          <h2 className={styles.sectionTitle}>Everything you need to teach better</h2>
          <p className={styles.sectionSubtitle}>A complete suite of tools designed to make managing assessments effortless.</p>
          
          <div className={styles.featuresGrid}>
            <div className={styles.featureBox}>
              <i className="bi bi-lightning-charge"></i>
              <h3>Quick Create Editor</h3>
              <p>Build complex quizzes in minutes. Support for multiple choice, text matching, and visual questions.</p>
            </div>
            <div className={styles.featureBox}>
              <i className="bi bi-graph-up-arrow"></i>
              <h3>Advanced Analytics</h3>
              <p>Track student progress in real-time. Identify knowledge gaps with our beautiful reporting dashboards.</p>
            </div>
            <div className={styles.featureBox}>
              <i className="bi bi-palette"></i>
              <h3>Beautiful Customization</h3>
              <p>Add your own branding, colors, and imagery to match your school or personal educator profile.</p>
            </div>
            <div className={styles.featureBox}>
              <i className="bi bi-robot"></i>
              <h3>AI Question Generation</h3>
              <p>Stuck on what to ask? Let our AI suggest comprehensive questions based on your syllabus.</p>
            </div>
          </div>
        </div>

        {/* PRICING SECTION */}
        <div id="pricing" className={styles.pricingSection}>
          <h2 className={styles.sectionTitle}>Simple, transparent pricing</h2>
          <div className={styles.pricingGrid}>
            <div className={styles.pricingCard}>
              <h3>Starter</h3>
              <div className={styles.price}>Free</div>
              <ul>
                <li><i className="bi bi-check2"></i> Up to 50 students</li>
                <li><i className="bi bi-check2"></i> Basic quiz creation</li>
                <li><i className="bi bi-check2"></i> Standard analytics</li>
              </ul>
              <button className={styles.outlineBtn}>Get Started</button>
            </div>
            
            <div className={`${styles.pricingCard} ${styles.popularCard}`}>
              <div className={styles.popularBadge}>Most Popular</div>
              <h3>Max Plan</h3>
              <div className={styles.price}>
                $49 <span>/ promotional first-time</span>
              </div>
              <p className={styles.renewalText}>Renews at $100 for subsequent purchases</p>
              <ul>
                <li><i className="bi bi-check2"></i> Unlimited students</li>
                <li><i className="bi bi-check2"></i> Unlimited credit wallet</li>
                <li><i className="bi bi-check2"></i> Advanced analytics & exports</li>
                <li><i className="bi bi-check2"></i> Custom branding</li>
              </ul>
              <button className={styles.filledBtn}>Upgrade to Max</button>
            </div>
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerCopyright}>
          <p>&copy; 2026 Quizify. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}