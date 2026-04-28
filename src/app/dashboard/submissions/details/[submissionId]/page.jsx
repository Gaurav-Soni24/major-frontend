'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import styles from './details.module.css';

export default function SubmissionDetail() {
  const { submissionId } = useParams();
  const router = useRouter();
  
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const reportRef = useRef(null);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/submissions/details/${submissionId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSubmission(res.data.submission);
      } catch (error) {
        toast.error("Failed to load submission details.");
      } finally {
        setLoading(false);
      }
    };

    if (submissionId) fetchDetails();
  }, [submissionId]);

  const handleDownloadPDF = async () => {
    const element = reportRef.current;
    if (!element) return;

    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Handle multi-page PDF if content is long
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${submission.userDetails.name}_Response.pdf`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF.");
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading submission data...</p>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className={styles.emptyState}>
        <i className="bi bi-file-earmark-x"></i>
        <h2>Submission Not Found</h2>
        <p>This record may have been deleted or doesn't exist.</p>
        <button className={styles.btnSecondary} onClick={() => router.back()}>Go Back</button>
      </div>
    );
  }

  const { userDetails, score, antiCheat, questions, submittedAt, startedAt, status } = submission;
  
  // Calculate time or handle abandoned states
  const isAbandoned = status === 'in-progress';
  const timeTaken = submittedAt && startedAt 
    ? Math.round((new Date(submittedAt) - new Date(startedAt)) / 60000) 
    : 'Incomplete';
  
  // Extract custom fields if any exist
  const customDataKeys = userDetails.customData ? Object.keys(userDetails.customData) : [];

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.headerControls}>
        <button className={styles.btnBack} onClick={() => router.back()}>
          <i className="bi bi-arrow-left"></i> Back to List
        </button>
        <button className={styles.btnSecondary} onClick={handleDownloadPDF} style={{marginLeft: 'auto'}}>
          <i className="bi bi-download"></i> Download PDF Response
        </button>
      </div>

      {/* The ref is attached here to only capture the content, not the buttons above */}
      <div ref={reportRef} style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '8px' }}>
        <div className={styles.header}>
          <div>
            <h1>{userDetails.name}'s Submission</h1>
            <p>{userDetails.email}</p>
          </div>
          <div className={styles.scoreHighlight}>
            {isAbandoned ? (
              <span className={styles.scoreText} style={{ color: '#ef4444' }}>Abandoned</span>
            ) : (
              <>
                <span className={styles.scoreText}>{score.percentage}%</span>
                <span className={styles.scoreSubtext}>{score.obtainedMarks} / {score.totalMarks} pts</span>
              </>
            )}
          </div>
        </div>

        {isAbandoned && (
          <div className={styles.alertDanger} style={{ marginBottom: '24px' }}>
            <i className="bi bi-exclamation-triangle-fill"></i> 
            <strong> Attempt Abandoned:</strong> The student started the assessment but refreshed the page, closed the tab, or failed to submit. They have been permanently locked out from retaking it.
          </div>
        )}

        <div className={styles.grid}>
          <div className={styles.metaCol}>
            <div className={styles.card}>
              <h3><i className="bi bi-info-circle"></i> Session & Student Details</h3>
              <ul className={styles.metaList}>
                <li><span>Status:</span> <strong style={{textTransform: 'capitalize', color: isAbandoned ? '#ef4444' : 'inherit'}}>{isAbandoned ? 'Abandoned' : status}</strong></li>
                <li><span>Started:</span> <strong>{new Date(startedAt).toLocaleString()}</strong></li>
                <li><span>Submitted:</span> <strong>{submittedAt ? new Date(submittedAt).toLocaleString() : 'N/A'}</strong></li>
                <li><span>Time Taken:</span> <strong>{timeTaken} {timeTaken !== 'Incomplete' && 'mins'}</strong></li>
                
                {/* Render dynamic Custom Student Info */}
                {customDataKeys.map(key => (
                   <li key={key}><span>{key}:</span> <strong>{userDetails.customData[key]}</strong></li>
                ))}
              </ul>
            </div>

            <div className={`${styles.card} ${antiCheat?.isFlagged ? styles.cardDanger : ''}`}>
              <h3><i className="bi bi-shield-exclamation"></i> Proctoring Report</h3>
              {antiCheat?.isFlagged ? (
                <div className={styles.alertDanger}>This session was flagged for suspicious activity.</div>
              ) : (
                <div className={styles.alertSuccess}>No suspicious activity detected.</div>
              )}
              
              <ul className={styles.metaList} style={{ marginTop: '16px' }}>
                <li><span>Tab Switches:</span> <strong className={antiCheat?.tabSwitches > 0 ? styles.textDanger : ''}>{antiCheat?.tabSwitches || 0}</strong></li>
                <li><span>Webcam Strikes:</span> <strong className={antiCheat?.webcamStrikes > 0 ? styles.textDanger : ''}>{antiCheat?.webcamStrikes || 0}</strong></li>
                <li><span>Copy/Paste Attempts:</span> <strong className={antiCheat?.copyPasteAttempts > 0 ? styles.textDanger : ''}>{antiCheat?.copyPasteAttempts || 0}</strong></li>
              </ul>
            </div>

            {antiCheat?.flaggedImages && antiCheat.flaggedImages.length > 0 && (
              <div className={`${styles.card} ${styles.hideOnPrint}`}>
                <h3><i className="bi bi-camera-video"></i> Flagged Snapshots</h3>
                <p className={styles.helperText}>Images captured automatically during proctoring strikes.</p>
                <div className={styles.snapshotGrid}>
                  {antiCheat.flaggedImages.map((img, idx) => (
                    <div key={idx} className={styles.snapshotWrapper}>
                      <img src={img.imageBase64} alt={img.reason} className={styles.snapshotImg} />
                      <div className={styles.snapshotMeta}>
                        <span className={styles.snapshotReason}>{img.reason}</span>
                        <span className={styles.snapshotTime}>{new Date(img.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {!isAbandoned && questions && questions.length > 0 && (
            <div className={styles.questionsCol}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3><i className="bi bi-list-check"></i> Question Breakdown</h3>
                </div>
                
                <div className={styles.questionsList}>
                  {questions.map((q, i) => (
                    <div key={i} className={`${styles.questionItem} ${q.isCorrect ? styles.qCorrect : styles.qIncorrect}`}>
                      <div className={styles.qHeader}>
                        <span className={styles.qNum}>Q{i + 1}. {q.questionText}</span>
                        <span className={styles.qScore}>{q.marksObtained} / {q.marks} pts</span>
                      </div>

                      <div className={styles.qBody}>
                        <div className={styles.answerBlock}>
                          <span className={styles.label}>Student's Answer:</span>
                          {q.questionType === 'code' ? (
                            <pre className={styles.codeBlock}>{q.userAnswer || '// No code submitted'}</pre>
                          ) : (
                            <div className={styles.answerText}>
                              {Array.isArray(q.userAnswer) ? q.userAnswer.join(', ') : (q.userAnswer || 'Skipped')}
                            </div>
                          )}
                        </div>

                        {!q.isCorrect && (
                          <div className={styles.answerBlock}>
                            <span className={styles.label}>Target Answer / Rubric:</span>
                            <div className={styles.correctText}>
                              {Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : q.correctAnswer}
                            </div>
                          </div>
                        )}

                        {q.aiFeedback && (
                          <div className={styles.aiFeedbackBox}>
                            <i className="bi bi-robot"></i> <strong>AI Evaluation:</strong> {q.aiFeedback}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}