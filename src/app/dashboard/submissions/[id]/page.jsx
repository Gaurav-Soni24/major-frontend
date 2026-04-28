'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import styles from './submissions.module.css';

export default function SubmissionsList({ params }) {
  const unwrappedParams = use(params);
  // FIX: Extract 'id' based on your folder structure [id]
  const quizId = unwrappedParams.id;
  const router = useRouter();

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/submissions/quiz/${quizId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSubmissions(res.data.submissions);
      } catch (error) {
        toast.error('Failed to load submissions.');
        router.push('/dashboard/quizzes');
      } finally {
        setLoading(false);
      }
    };

    if (quizId) {
      fetchSubmissions();
    }
  }, [quizId, router]);

  if (loading) {
    return <div className={styles.loadingState}><div className={styles.spinner}></div></div>;
  }

  return (
    <div className={styles.pageWrapper}>
      <header className={styles.header}>
        <button onClick={() => router.back()} className={styles.btnBack}>
          <i className="bi bi-arrow-left"></i> Back
        </button>
        <div>
          <h1>Assessment Results</h1>
          <p>Review student performance and proctoring flags.</p>
        </div>
      </header>

      <div className={styles.tableCard}>
        {submissions.length === 0 ? (
          <div className={styles.emptyState}>
            <i className="bi bi-inboxes"></i>
            <h3>No Submissions Yet</h3>
            <p>Students have not completed this assessment.</p>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Email</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Proctoring Flags</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => (
                  <tr key={sub._id} className={sub.antiCheat?.isFlagged ? styles.rowFlagged : ''}>
                    <td><strong>{sub.userDetails?.name}</strong></td>
                    <td className={styles.textMuted}>{sub.userDetails?.email}</td>
                    <td>
                      {sub.status === 'submitted' ? (
                        <span className={styles.scoreText}>{sub.score?.percentage.toFixed(1)}%</span>
                      ) : (
                        <span className={styles.textMuted}>In Progress</span>
                      )}
                    </td>
                    <td>
                      <span className={`${styles.badge} ${sub.status === 'submitted' ? styles.badgeSuccess : styles.badgeWarning}`}>
                        {sub.status}
                      </span>
                    </td>
                    <td>
                      {sub.antiCheat?.isFlagged ? (
                        <span className={styles.flagAlert}>
                          <i className="bi bi-shield-exclamation"></i> Flagged
                        </span>
                      ) : (
                        <span className={styles.flagClean}>
                          <i className="bi bi-shield-check"></i> Clean
                        </span>
                      )}
                    </td>
                    <td>
                      <button 
                        className={styles.btnView} 
                        onClick={() => router.push(`/dashboard/submissions/details/${sub._id}`)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}