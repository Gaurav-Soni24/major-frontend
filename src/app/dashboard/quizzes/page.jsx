'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import styles from './quizzes.module.css';

export default function MyQuizzes() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true; 

    const fetchQuizzes = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          if (isMounted) setLoading(false);
          return;
        }

        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/quizzes/my-quizzes`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (isMounted) {
          setQuizzes(response.data.quizzes || []);
        }
      } catch (error) {
        console.error(error);
        if (isMounted) toast.error('Failed to load quizzes.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchQuizzes();
    return () => { isMounted = false; };
  }, []);

  const toggleVisibility = async (quizId, currentStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/quizzes/toggle-public`,
        { quizId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setQuizzes(quizzes.map(q => 
        q._id === quizId ? { ...q, isPublic: response.data.isPublic } : q
      ));

      toast.success(`Quiz is now ${response.data.isPublic ? 'Public' : 'Private'}`);
    } catch (error) {
      console.error(error);
      toast.error('Error updating visibility');
    }
  };

  const shareQuiz = (quizId) => {
    const shareLink = `${window.location.origin}/attempt/${quizId}`;
    navigator.clipboard.writeText(shareLink).then(() => {
      toast.success('Share link copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy link');
    });
  };

  const viewSubmissions = (quizId) => {
    router.push(`/dashboard/submissions/${quizId}`);
  };

  const deleteQuiz = async (quizId) => {
    if (!window.confirm('Are you sure you want to delete this assessment? All related submissions will be orphaned.')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/quizzes/${quizId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setQuizzes(quizzes.filter(q => q._id !== quizId));
      toast.success('Assessment deleted successfully');
    } catch (error) {
      console.error(error);
      toast.error('Error deleting assessment');
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loaderSpinner}></div>
        <p>Loading your assessments...</p>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.header}>
        <h1>My Assessments</h1>
        <p>Manage your created tests, adjust visibility, and view deep analytics for each cohort.</p>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2><i className="bi bi-collection-fill" style={{color: '#8b5cf6'}}></i> Active Assessments ({quizzes.length})</h2>
        </div>
        
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Assessment Name</th>
                <th>Date Created</th>
                <th>Status</th>
                <th style={{textAlign: 'right'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {quizzes.length === 0 ? (
                <tr>
                  <td colSpan="4">
                    <div className={styles.emptyState}>
                      <i className="bi bi-folder-plus"></i>
                      <h3>No Assessments Found</h3>
                      <p>You haven't created any assessments yet.</p>
                      <button className={styles.btnCreate} onClick={() => router.push('/dashboard/create-quiz')}>
                         Create New Assessment
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                quizzes.map((quiz) => (
                  <tr key={quiz._id}>
                    <td><strong className={styles.quizTitle}>{quiz.title}</strong></td>
                    <td className={styles.dateText}>{new Date(quiz.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                    <td>
                      <button 
                        type="button"
                        className={`${styles.statusBadge} ${quiz.isPublic ? styles.statusPublic : styles.statusPrivate}`}
                        onClick={() => toggleVisibility(quiz._id, quiz.isPublic)}
                      >
                        <i className={`bi ${quiz.isPublic ? 'bi-globe2' : 'bi-lock-fill'}`}></i> {quiz.isPublic ? 'Public' : 'Private'}
                      </button>
                    </td>
                    <td>
                      <div className={styles.actionBtns}>
                        <button type="button" className={styles.btnIcon} title="Copy Share Link" onClick={() => shareQuiz(quiz._id)}>
                          <i className="bi bi-link-45deg"></i>
                        </button>
                        <button type="button" className={styles.btnIcon} title="View Submissions" onClick={() => viewSubmissions(quiz._id)}>
                          <i className="bi bi-bar-chart-fill"></i>
                        </button>
                        <button type="button" className={`${styles.btnIcon} ${styles.btnDelete}`} title="Delete Quiz" onClick={() => deleteQuiz(quiz._id)}>
                          <i className="bi bi-trash3"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}