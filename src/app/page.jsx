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
            <img src="/images/svg/logo.svg" alt="Quizify Logo" />
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
              <a href="#how-it-works" className={`${styles.navLink} ${styles.active}`} onClick={toggleMenu}>How it works</a>
            </li>
            <li className={styles.navItem}>
              <a href="#features" className={styles.navLink} onClick={toggleMenu}>Features</a>
            </li>
            <li className={styles.navItem}>
              <Link href="/student" className={styles.navLink} onClick={toggleMenu}>Student Portal</Link>
            </li>
            <li className={styles.navItem}>
              <Link href="/login" className={`${styles.navLink} ${styles.loginBtn}`} onClick={toggleMenu}>Login / Sign up</Link>
            </li>
          </ul>
        </nav>
      </header>

      <main className={styles.main}>
        <div className={styles.heroContainer}>
          <div className={styles.hero}>
            <div className={styles.heroContent}>
              <span className={styles.badge}><i className="bi bi-stars"></i> New: AI Quiz Generation</span>
              <h1>Sharpen your mind <br />one quiz at a time</h1>
              <p>Empower your teaching with our intuitive quiz creation platform. Build, share, and track assessments in minutes.</p>
              <div className={styles.ctaGroup}>
                <Link href="/register" className={styles.ctaBtn}>Start creating free</Link>
                <a href="#how-it-works" className={styles.knowMore}><i className="bi bi-play-circle"></i> See how it works</a>
              </div>
            </div>
            <div className={styles.heroImage}>
              <img src="/images/svg/landing_page_image.svg" alt="Quiz creation illustration" />
            </div>
          </div>
        </div>

        <div className={styles.statsSection}>
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span>Active Educators</span>
              <div className={styles.statIcon} style={{ background: 'rgba(85, 66, 246, 0.1)', color: 'var(--primary-purple)' }}>
                <i className="bi bi-people-fill"></i>
              </div>
            </div>
            <div className={styles.statValue}>12,450</div>
            <div className={`${styles.statGrowth} ${styles.growthPositive}`}>
              <i className="bi bi-arrow-up-right"></i> +24.5% this month
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span>Quizzes Created</span>
              <div className={styles.statIcon} style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-orange)' }}>
                <i className="bi bi-file-earmark-text"></i>
              </div>
            </div>
            <div className={styles.statValue}>845K</div>
            <div className={`${styles.statGrowth} ${styles.growthPositive}`}>
              <i className="bi bi-arrow-up-right"></i> +12.2% this year
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span>Global Reach</span>
              <div className={styles.statIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-green)' }}>
                <i className="bi bi-globe"></i>
              </div>
            </div>
            <div className={styles.statValue}>136</div>
            <div className={`${styles.statGrowth} ${styles.growthNeutral}`}>
              Countries supported
            </div>
          </div>
        </div>

        <div id="features" className={styles.featuresSection}>
          <h2 className={styles.sectionTitle}>Everything you need to teach better</h2>
          <p className={styles.sectionSubtitle}>A complete suite of tools designed to make creating and managing assessments effortless.</p>
          
          <div className={styles.featuresGrid}>
            <div className={styles.featureBox}>
              <i className="bi bi-lightning-charge"></i>
              <h3>Quick Create</h3>
              <p>Use our powerful editor to build complex quizzes in minutes. Support for multiple choice, text matching, and visual questions.</p>
            </div>
            <div className={styles.featureBox}>
              <i className="bi bi-graph-up-arrow"></i>
              <h3>Advanced CRM & Analytics</h3>
              <p>Track student progress in real-time. Identify knowledge gaps with our beautiful, intuitive reporting dashboards.</p>
            </div>
            <div className={styles.featureBox}>
              <i className="bi bi-palette"></i>
              <h3>Beautiful Customization</h3>
              <p>Make your quizzes look professional. Add your own branding, colors, and imagery to match your school or company.</p>
            </div>
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerSocial}>
            <a href="#facebook"><i className="bi bi-facebook"></i></a>
            <a href="#instagram"><i className="bi bi-instagram"></i></a>
            <a href="#twitter"><i className="bi bi-twitter"></i></a>
            <a href="#github"><i className="bi bi-github"></i></a>
            <a href="#youtube"><i className="bi bi-youtube"></i></a>
          </div>
        </div>
        <div className={styles.footerLinks}>
          <a href="#home">Home</a>
          <a href="#news">News</a>
          <a href="#about">About</a>
          <a href="#contact">Contact Us</a>
          <a href="#team">Our Team</a>
        </div>
        <div className={styles.footerCopyright}>
          <p>&copy; 2026 Quizify. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}