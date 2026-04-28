'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar/Sidebar';
import Header from '../../components/Header/Header';
import styles from './dashboardLayout.module.css';

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  // Basic client-side route protection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className={styles.layout}>
      <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(false)} />
      
      <main className={styles.mainContent}>
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        <div className={styles.contentWrapper}>
          {children}
        </div>

        <footer className={styles.dashboardFooter}>
          &copy; 2026 Quizify. All rights reserved.
        </footer>
      </main>
    </div>
  );
}