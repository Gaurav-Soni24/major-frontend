'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import styles from './Sidebar.module.css';

export default function Sidebar({ isOpen, toggleSidebar }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    router.push('/login');
  };

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
      <Link href="/dashboard" className={styles.brand} onClick={toggleSidebar}>
        <img src="/images/svg/logo.svg" alt="QuizGrad Logo" />
      </Link>
      
      <Link href="/dashboard/create-quiz" className={styles.btnQuickCreate} onClick={toggleSidebar}>
        <i className="bi bi-plus-circle"></i> Create New Quiz
      </Link>

      <div className={styles.navSection}>
        <div className={styles.navSectionTitle}>Menu</div>
        
        <Link 
          href="/dashboard" 
          className={`${styles.navItem} ${pathname === '/dashboard' ? styles.active : ''}`}
          onClick={toggleSidebar}
        >
          <div><i className="bi bi-grid"></i> Dashboard Analytics</div>
        </Link>
        
        <Link 
          href="/dashboard/quizzes" 
          className={`${styles.navItem} ${pathname.includes('/dashboard/quizzes') ? styles.active : ''}`}
          onClick={toggleSidebar}
        >
          <div><i className="bi bi-journal-check"></i> My Quizzes</div>
        </Link>
        
        <Link 
          href="/dashboard/profile" 
          className={`${styles.navItem} ${pathname === '/dashboard/profile' ? styles.active : ''}`}
          onClick={toggleSidebar}
        >
          <div><i className="bi bi-person"></i> Profile</div>
        </Link>
      </div>

      <div className={styles.navSection} style={{ marginTop: 'auto' }}>
        <a href="#" onClick={handleLogout} className={styles.navItem}>
          <div><i className="bi bi-box-arrow-left"></i> Logout</div>
        </a>
      </div>
    </aside>
  );
}