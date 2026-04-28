'use client';

import styles from './Header.module.css';

export default function Header({ toggleSidebar }) {
  // In a full implementation, you could fetch user details from context/state
  // For now, we keep the static styling matching your original UI
  return (
    <header className={styles.topHeader}>
      <div className={styles.hamburger} onClick={toggleSidebar}>
        <i className="bi bi-list"></i>
      </div>
      <div className={styles.headerActions}>
        <i className="bi bi-bell"></i>
        <div className={styles.avatar}>
          <i className="bi bi-person-fill"></i>
        </div>
      </div>
    </header>
  );
}