'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import styles from './student.module.css';

export default function StudentPortal() {
  const [loading, setLoading] = useState(false);
  const [submissions, setSubmissions] = useState(null);
  const [error, setError] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});
  const [verifiedStudent, setVerifiedStudent] = useState(null);

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setError(null);
    setSubmissions(null);

    try {
      // 1. Verify Google Token securely
      const authRes = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/submissions/verify-google`, {
        quizId: 'portal-auth', // Dummy ID for validation extraction
        credential: credentialResponse.credential
      });

      const { email, name } = authRes.data;
      setVerifiedStudent({ email, name });

      // 2. Fetch submissions for this verified email
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/submissions/student/${encodeURIComponent(email)}`);
      
      const data = res.data.submissions;
      if (!data || data.length === 0) {
        throw new Error("No records found.");
      }

      // Sort by most recent
      data.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
      setSubmissions(data);
      toast.success("Academic records retrieved successfully!");

    } catch (err) {
      if (err.response?.status === 404 || err.message === "No records found.") {
        setError({
          title: "No Submissions Found",
          msg: "We couldn't find any completed assessments tied to this Google account."
        });
      } else {
        setError({
          title: "Verification Error",
          msg: "Failed to authenticate or retrieve records. Please try again."
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleDetails = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Quick Analytics
  let totalQuizzes = 0;
  let avgScore = 0;
  let highestScore = 0;

  if (submissions && submissions.length > 0) {
    totalQuizzes = submissions.length;
    let totalPercentage = 0;
    submissions.forEach(sub => {
      const perc = sub.score?.percentage || 0;
      totalPercentage += perc;
      if (perc > highestScore) highestScore = perc;
    });
    avgScore = (totalPercentage / totalQuizzes).toFixed(1);
  }

  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "YOUR_CLIENT_ID"}>
      <nav className={styles.navbar}>
        <Link href="/" className={styles.brand}>
          <i className="bi bi-mortarboard-fill"></i> Quizify Student
        </Link>
      </nav>

      <div className={styles.pageWrapper}>
        <div className={styles.container}>
          
          {/* Login State */}
          {!verifiedStudent && !loading && !error && (
            <div className={`${styles.glassPanel} ${styles.searchCard} ${styles.glowEffect}`}>
              <div className={styles.iconWrapper}><i className="bi bi-person-badge-fill"></i></div>
              <h1>Student Portal</h1>
              <p>Sign in securely with Google to view your assessment history, AI feedback, and official scores.</p>
              
              <div className={styles.googleBtnWrapper}>
                <GoogleLogin 
                  onSuccess={handleGoogleSuccess} 
                  onError={() => toast.error('Verification Failed')} 
                  shape="pill" 
                  size="large" 
                />
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner}></div>
              <p>Verifying identity and securely retrieving records...</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className={`${styles.glassPanel} ${styles.emptyState}`}>
              <i className="bi bi-folder-x"></i>
              <h3>{error.title}</h3>
              <p>{error.msg}</p>
              <button className={styles.btnSecondary} onClick={() => {setError(null); setVerifiedStudent(null);}}>Try Another Account</button>
            </div>
          )}

          {/* Submissions View */}
          {submissions && !loading && (
            <div className={styles.resultsSection}>
              <div className={`${styles.glassPanel} ${styles.studentHeader}`}>
                <div className={styles.studentAvatar}>
                  {verifiedStudent.name.charAt(0).toUpperCase()}
                </div>
                <div className={styles.studentInfo}>
                  <h2>{verifiedStudent.name}</h2>
                  <p><i className="bi bi-patch-check-fill" style={{color: '#10b981'}}></i> Verified Account: {verifiedStudent.email}</p>
                </div>
                <button className={styles.btnLogout} onClick={() => {setSubmissions(null); setVerifiedStudent(null);}}>
                  Sign Out
                </button>
              </div>

              <div className={styles.statsGrid}>
                <div className={`${styles.glassPanel} ${styles.statCard}`}>
                  <h3>Assessments Taken</h3>
                  <div className={styles.value}>{totalQuizzes}</div>
                </div>
                <div className={`${styles.glassPanel} ${styles.statCard}`}>
                  <h3>Average Score</h3>
                  <div className={styles.value}>{avgScore}%</div>
                </div>
                <div className={`${styles.glassPanel} ${styles.statCard}`}>
                  <h3>Highest Score</h3>
                  <div className={styles.value} style={{color: '#10b981'}}>{highestScore}%</div>
                </div>
              </div>

              <div className={`${styles.glassPanel} ${styles.tableCard}`}>
                <div className={styles.tableHeader}>
                  <h3><i className="bi bi-journal-text" style={{color: '#8b5cf6'}}></i> Academic History</h3>
                </div>
                <div className={styles.tableContainer}>
                  <table>
                    <thead>
                      <tr>
                        <th>Assessment</th>
                        <th>Date Completed</th>
                        <th>Final Score</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.map((sub, index) => {
                        const perc = sub.score?.percentage || 0;
                        let badgeClass = styles.scorePoor;
                        let icon = 'bi-x-circle';
                        
                        if (perc >= 80) { badgeClass = styles.scoreExcellent; icon = 'bi-patch-check'; }
                        else if (perc >= 60) { badgeClass = styles.scoreAverage; icon = 'bi-check-circle'; }

                        return (
                          <React.Fragment key={sub._id || index}>
                            <tr className={styles.mainRow}>
                              <td><strong>{sub.quizDescription || 'Assessment'}</strong></td>
                              <td style={{color: '#64748b'}}>
                                {new Date(sub.submittedAt).toLocaleDateString(undefined, { 
                                  year: 'numeric', month: 'short', day: 'numeric', 
                                  hour: '2-digit', minute:'2-digit' 
                                })}
                              </td>
                              <td>
                                <span className={`${styles.scoreBadge} ${badgeClass}`}>
                                  <i className={`bi ${icon}`}></i> {perc.toFixed(1)}%
                                </span>
                              </td>
                              <td>
                                <button type="button" className={styles.btnView} onClick={() => toggleDetails(index)}>
                                  Review <i className={`bi bi-chevron-${expandedRows[index] ? 'up' : 'down'}`}></i>
                                </button>
                              </td>
                            </tr>
                            
                            {expandedRows[index] && (
                              <tr>
                                <td colSpan="4" style={{ padding: 0, borderBottom: 'none' }}>
                                  <div className={styles.detailsContent}>
                                    <h4 style={{ marginBottom: '20px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <i className="bi bi-list-check"></i> Evaluation Feedback
                                    </h4>
                                    {sub.questions.map((q, qIdx) => (
                                      <div key={qIdx} className={`${styles.qItem} ${q.isCorrect ? styles.qItemCorrect : styles.qItemIncorrect}`}>
                                        <div className={styles.qHeader}>
                                           <span className={styles.qText}>Q{qIdx + 1}: {q.questionText}</span>
                                           <span className={styles.qMarks}>{q.marksObtained} / {q.marks} pts</span>
                                        </div>
                                        <div className={styles.qAns}>
                                          <div className={styles.ansGrid}>
                                            <div className={styles.ansBlock}>
                                              <span className={styles.ansLabel}>Your Submission:</span>
                                              <strong className={styles.studentAns}>
                                                {Array.isArray(q.userAnswer) ? q.userAnswer.join(', ') : (q.userAnswer || 'Skipped')}
                                              </strong>
                                            </div>
                                            {!q.isCorrect && (
                                              <div className={styles.ansBlock}>
                                                <span className={styles.ansLabel}>Correct Answer/Rubric:</span>
                                                <strong className={styles.correctAns}>
                                                  {Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : q.correctAnswer}
                                                </strong>
                                              </div>
                                            )}
                                          </div>
                                          {q.aiFeedback && (
                                            <div className={styles.aiFeedbackBox}>
                                              <i className="bi bi-robot"></i> <strong>AI Notes:</strong> {q.aiFeedback}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}