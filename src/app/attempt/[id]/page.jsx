'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import * as faceapi from 'face-api.js';

import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { dracula } from '@uiw/codemirror-theme-dracula';

import styles from './attempt.module.css';

export default function AttemptQuiz() {
  const params = useParams();
  const quizId = params.quizId || params.id; 
  
  // App States
  const [step, setStep] = useState(1);
  const [quizData, setQuizData] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [submissionId, setSubmissionId] = useState(null);
  const [errorState, setErrorState] = useState(null);
  
  // Extra Details & Auth
  const [customData, setCustomData] = useState({});
  const [quizPassword, setQuizPassword] = useState('');

  // Quiz Engine States
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  
  // Mobile Palette State
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  // Camera Drag State
  const [camOffset, setCamOffset] = useState({ x: 0, y: 0 });
  const draggingInfo = useRef({ isDragging: false, startX: 0, startY: 0, initialOffsetX: 0, initialOffsetY: 0 });
  
  // Anti-Cheat & Monitoring States
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [acConfig, setAcConfig] = useState({ camera: false, tab: false, copy: false });
  const [warningModal, setWarningModal] = useState({ show: false, title: '', desc: '' });
  
  // Refs
  const videoRef = useRef(null);
  const streamRef = useRef(null); 
  const isQuizActiveRef = useRef(false);
  const tabSwitchCountRef = useRef(0);
  const webcamStrikesRef = useRef(0);
  const copyPasteAttemptsRef = useRef(0);
  const noFaceFramesRef = useRef(0);
  const lastFacePosRef = useRef(null); 

  const loadFaceAPIModels = async () => {
    try {
      const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      ]);
      setModelsLoaded(true);
    } catch (e) {
      toast.error("Failed to load AI monitoring models.");
    }
  };

  const submitQuiz = useCallback(async () => {
    isQuizActiveRef.current = false; 
    setIsSubmitting(true);
    setIsPaletteOpen(false);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) {}

    const formattedAnswers = quizData.shuffledQuestions.map((q, idx) => ({
      questionId: q._id || q.id, 
      originalIndex: q.originalIndex, 
      userAnswer: answers[idx] !== undefined ? answers[idx] : (q.type === 'multiple' ? [] : "")
    }));

    const payload = {
      submissionId, 
      answers: formattedAnswers,
      antiCheat: {
        tabSwitches: tabSwitchCountRef.current,
        webcamStrikes: webcamStrikesRef.current,
        copyPasteAttempts: copyPasteAttemptsRef.current,
        isFlagged: (tabSwitchCountRef.current > 0 || webcamStrikesRef.current > 2)
      }
    };

    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/submissions`, payload);
      setResult(res.data.score);
      setStep(4);
    } catch (err) {
      toast.error("Submission failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [quizData, submissionId, answers]); 

  const captureSnapshot = useCallback(() => {
    if (!videoRef.current) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.5); 
  }, []);

  const triggerStrike = useCallback(async (title, desc) => {
    if (!isQuizActiveRef.current) return;
    setWarningModal({ show: true, title, desc });
    
    if (submissionId) {
      const snapshot = acConfig.camera ? captureSnapshot() : null;
      try {
        await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/submissions/flag`, {
          submissionId, imageBase64: snapshot || 'NO_IMAGE', reason: title
        });
      } catch (e) {
        console.error("Failed to sync flag");
      }
    }
  }, [acConfig.camera, captureSnapshot, submissionId]);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/quizzes/public/${quizId}`);
        const qData = res.data.quiz;
        
        qData.questions = qData.questions.map((q, idx) => ({
          ...q,
          originalIndex: q.originalIndex !== undefined ? q.originalIndex : idx
        }));

        qData.shuffledQuestions = qData.settings?.shuffleQuestions 
            ? [...qData.questions].sort(() => Math.random() - 0.5) 
            : [...qData.questions];
            
        setQuizData(qData);
        setAcConfig({ camera: !!qData.antiCheatSettings?.aiCamera, tab: !!qData.antiCheatSettings?.tabSwitch, copy: !!qData.antiCheatSettings?.copyPaste });
        if (qData.antiCheatSettings?.aiCamera) loadFaceAPIModels();
      } catch (err) {
        setErrorState({ title: "Quiz Not Found", msg: "The quiz does not exist or is private." });
      }
    };
    if (quizId) fetchQuiz();
  }, [quizId]);

  const handleGoogleSuccess = async (response) => {
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/submissions/verify-google`, {
        quizId, credential: response.credential
      });
      setUserDetails({ email: res.data.email, name: res.data.name });
      
      if (quizData.isPasswordProtected || (quizData.customFields && quizData.customFields.length > 0)) {
        setStep(1.5);
      } else {
        setStep(2);
      }
    } catch (err) {
      setErrorState({ title: "Access Denied", msg: err.response?.data?.message || "Authentication failed." });
    }
  };

  const handleExtraDetailsSubmit = (e) => {
    e.preventDefault();
    setStep(2);
  };

  const enableWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraActive(true);
    } catch (err) {
      toast.error("Camera access is required to proceed.");
    }
  };

  useEffect(() => {
    if (step === 3 && cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [step, cameraActive]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isQuizActiveRef.current) {
        const message = "Warning: If you leave or refresh this page, your attempt will be abandoned and you will not be able to retake this assessment. Are you sure?";
        e.preventDefault();
        e.returnValue = message; 
        return message; 
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  useEffect(() => {
    if (step === 3 && acConfig.tab) {
      const handleVis = () => {
        if (document.hidden && isQuizActiveRef.current) {
          tabSwitchCountRef.current++;
          const currentSwitches = tabSwitchCountRef.current;
          
          if (currentSwitches >= 3) {
            triggerStrike("Quiz Auto-Submitted", "You exceeded the maximum allowed tab switches (3). Your quiz is being automatically submitted.");
            submitQuiz();
          } else {
            triggerStrike(
              "Tab Switch Detected", 
              `You minimized the browser or switched tabs. Warning ${currentSwitches} of 2. On the 3rd switch, your quiz will automatically be submitted.`
            );
          }
        }
      };
      document.addEventListener("visibilitychange", handleVis);
      return () => document.removeEventListener("visibilitychange", handleVis);
    }
  }, [step, acConfig.tab, triggerStrike, submitQuiz]);

  useEffect(() => {
    if (step === 3 && acConfig.copy) {
      const preventCopy = (e) => {
        if (isQuizActiveRef.current) { e.preventDefault(); copyPasteAttemptsRef.current++; triggerStrike("Illegal Action", "Copy/Paste is disabled."); }
      };
      document.addEventListener('copy', preventCopy); document.addEventListener('paste', preventCopy); document.addEventListener('contextmenu', preventCopy);
      return () => { document.removeEventListener('copy', preventCopy); document.removeEventListener('paste', preventCopy); document.removeEventListener('contextmenu', preventCopy); };
    }
  }, [step, acConfig.copy, triggerStrike]);

  // Face API Monitor
  useEffect(() => {
    let interval;
    if (step === 3 && acConfig.camera && cameraActive && modelsLoaded) {
      interval = setInterval(async () => {
        if (!isQuizActiveRef.current || !videoRef.current) return;
        const detections = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions());
        
        if (detections.length !== 1) {
          noFaceFramesRef.current++;
          if (noFaceFramesRef.current >= 5) {
            webcamStrikesRef.current++;
            triggerStrike(detections.length === 0 ? "Face Not Detected" : "Multiple Faces Detected", "Please ensure only your face is clearly visible.");
            noFaceFramesRef.current = 0; 
          }
          lastFacePosRef.current = null; 
        } else {
          noFaceFramesRef.current = 0;
          const box = detections[0].box;
          const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
          
          if (lastFacePosRef.current) {
            const dx = center.x - lastFacePosRef.current.x;
            const dy = center.y - lastFacePosRef.current.y;
            const distance = Math.sqrt(dx*dx + dy*dy);
            
            if (distance > 150) { 
              webcamStrikesRef.current++;
              triggerStrike("Excessive Face Movement Detected", "Significant abnormal movement detected. Please keep focused on the screen.");
            }
          }
          lastFacePosRef.current = center;
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, acConfig.camera, cameraActive, modelsLoaded, triggerStrike]);

  const startQuiz = async () => {
    try {
      const payload = { 
        quizId, 
        userDetails: { ...userDetails, customData },
        password: quizPassword 
      };
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/submissions/start-attempt`, payload);
      setSubmissionId(res.data.submissionId);
      
      isQuizActiveRef.current = true;
      setStep(3);
      if (quizData.timeLimit) setTimeLeft(quizData.timeLimit * 60);
      try { document.documentElement.requestFullscreen(); } catch (e) {}
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not start session.");
    }
  };

  useEffect(() => {
    let timerInterval;
    if (step === 3 && timeLeft !== null && timeLeft > 0) {
      timerInterval = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timerInterval);
  }, [step, timeLeft]);

  useEffect(() => {
    if (step === 3 && timeLeft === 0 && isQuizActiveRef.current) {
      submitQuiz();
    }
  }, [step, timeLeft, submitQuiz]);

  const handleAnswerChange = (qIndex, value, type) => {
    setAnswers(prev => {
      const updated = { ...prev };
      if (type === 'multiple') {
        const currentVals = updated[qIndex] || [];
        if (currentVals.includes(value)) updated[qIndex] = currentVals.filter(v => v !== value);
        else updated[qIndex] = [...currentVals, value];
      } else {
        updated[qIndex] = value;
      }
      return updated;
    });
  };

  // Camera Drag Handlers
  const handleCamDragStart = (e) => {
    draggingInfo.current.isDragging = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    draggingInfo.current.startX = clientX;
    draggingInfo.current.startY = clientY;
    draggingInfo.current.initialOffsetX = camOffset.x;
    draggingInfo.current.initialOffsetY = camOffset.y;
  };

  useEffect(() => {
    const handleCamDragMove = (e) => {
      if (!draggingInfo.current.isDragging) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      const dx = clientX - draggingInfo.current.startX;
      const dy = clientY - draggingInfo.current.startY;

      setCamOffset({
        x: draggingInfo.current.initialOffsetX + dx,
        y: draggingInfo.current.initialOffsetY + dy
      });
    };

    const handleCamDragEnd = () => {
      draggingInfo.current.isDragging = false;
    };

    if (step === 3 && acConfig.camera) {
      document.addEventListener('mousemove', handleCamDragMove);
      document.addEventListener('mouseup', handleCamDragEnd);
      document.addEventListener('touchmove', handleCamDragMove, { passive: false });
      document.addEventListener('touchend', handleCamDragEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleCamDragMove);
      document.removeEventListener('mouseup', handleCamDragEnd);
      document.removeEventListener('touchmove', handleCamDragMove);
      document.removeEventListener('touchend', handleCamDragEnd);
    };
  }, [step, acConfig.camera, camOffset]);


  if (errorState) {
    return (
      <div className={styles.container}>
        <div className={styles.card} style={{ textAlign: 'center', marginTop: '40px' }}>
          <i className="bi bi-x-octagon-fill" style={{ fontSize: '3rem', color: 'var(--danger-red)' }}></i>
          <h2>{errorState.title}</h2>
          <p>{errorState.msg}</p>
        </div>
      </div>
    );
  }

  if (!quizData) {
    return (
      <div className={styles.layout} style={{ flexDirection: 'column' }}>
        <div className={styles.spinner}></div>
        <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Loading Assessment...</p>
      </div>
    );
  }

  const currentQ = quizData.shuffledQuestions[currentQuestionIndex];
  const isPassed = result ? (result.percentage >= (quizData.passingScore || 0)) : false;

  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "YOUR_CLIENT_ID"}>
      <div className={styles.layout}>
        
        {step === 1 && (
          <div className={styles.container}>
            <div className={styles.card}>
              <div className={styles.sectionHeader}>
                <h1>{quizData.title}</h1>
                <p>{quizData.description}</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <h3>Student Verification</h3>
                <p className={styles.mutedText}>Sign in with your Google account. Do not reload the page after starting.</p>
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                  <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => toast.error('Auth Failed')} />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 1.5 && (
          <div className={styles.container}>
            <div className={styles.card}>
              <div className={styles.sectionHeader}>
                <h2>Additional Information</h2>
                <p>Please provide the required details to unlock the assessment.</p>
              </div>
              <form onSubmit={handleExtraDetailsSubmit} style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                {quizData.customFields?.map((field, i) => (
                  <div key={i} className={styles.formGroup}>
                    <label style={{fontWeight: 600, display: 'block', marginBottom: '6px'}}>{field.name}</label>
                    <input 
                      type={field.type === 'number' ? 'number' : 'text'} 
                      required 
                      className={styles.customInput}
                      value={customData[field.name] || ''}
                      onChange={e => setCustomData({...customData, [field.name]: e.target.value})}
                    />
                  </div>
                ))}

                {quizData.isPasswordProtected && (
                  <div className={styles.formGroup}>
                    <label style={{fontWeight: 600, display: 'block', marginBottom: '6px'}}><i className="bi bi-lock-fill"></i> Assessment Password</label>
                    <input 
                      type="password" 
                      required 
                      className={styles.customInput}
                      placeholder="Enter the password provided by your teacher"
                      value={quizPassword}
                      onChange={e => setQuizPassword(e.target.value)}
                    />
                  </div>
                )}
                
                <button type="submit" className={styles.btnPrimary} style={{marginTop: '12px'}}>Continue to Instructions</button>
              </form>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className={styles.container}>
            <div className={styles.card}>
              <div className={styles.sectionHeader}>
                <h1>Quiz Instructions</h1>
                <p>Please read carefully before starting.</p>
              </div>
              
              {(acConfig.camera || acConfig.tab || acConfig.copy) && (
                <div className={styles.acWarningBox}>
                  <h4><i className="bi bi-shield-lock-fill"></i> Monitored Exam</h4>
                  <ul>
                    {acConfig.camera && <li><strong>AI Face Tracking:</strong> Camera must remain on. Excessive movement and face absence will be flagged.</li>}
                    {acConfig.tab && <li><strong>Tab Lock:</strong> Leaving the quiz tab will be recorded. You will be automatically submitted after 3 tab switches.</li>}
                    {acConfig.copy && <li><strong>No Copy/Paste:</strong> Clipboard actions are disabled.</li>}
                  </ul>
                </div>
              )}

              <div className={styles.instructionsBox}>
                <ul>
                  <li><strong>Total Marks:</strong> {quizData.questions.reduce((s, q) => s + q.marks, 0)}</li>
                  <li><strong>Passing Score:</strong> {quizData.passingScore}%</li>
                  {quizData.timeLimit && <li><strong>Time Limit:</strong> {quizData.timeLimit} Minutes</li>}
                  {quizData.instructions?.map((inst, i) => <li key={i}>{inst}</li>)}
                </ul>
              </div>

              {acConfig.camera && !cameraActive ? (
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <button className={styles.btnSecondary} onClick={enableWebcam}>
                    <i className="bi bi-camera-video-fill"></i> Enable Webcam to Proceed
                  </button>
                  <video ref={videoRef} autoPlay muted playsInline style={{ display: 'none' }} />
                </div>
              ) : (
                <button className={styles.btnPrimary} onClick={startQuiz} disabled={acConfig.camera && !modelsLoaded}>
                  <i className="bi bi-play-circle-fill"></i> Start Quiz Now
                </button>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className={styles.quizLayout}>
            {timeLeft !== null && (
              <div className={styles.timerWidget}>
                <i className="bi bi-stopwatch"></i>
                {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
              </div>
            )}

            {acConfig.camera && (
              <div 
                className={styles.webcamContainer} 
                style={{ transform: `translate(${camOffset.x}px, ${camOffset.y}px)` }}
                onMouseDown={handleCamDragStart}
                onTouchStart={handleCamDragStart}
              >
                <video ref={videoRef} autoPlay muted playsInline className={styles.webcamVideo} />
                <div className={styles.webcamOverlay}>AI Monitoring Active</div>
              </div>
            )}

            {/* Mobile Toggle Button */}
            <button className={styles.mobilePaletteBtn} onClick={() => setIsPaletteOpen(true)}>
              <i className="bi bi-grid-3x3-gap-fill"></i> Questions Palette
            </button>

            {/* Backdrop for Mobile Overlay */}
            <div 
              className={`${styles.paletteBackdrop} ${isPaletteOpen ? styles.open : ''}`} 
              onClick={() => setIsPaletteOpen(false)} 
            />

            <aside className={`${styles.questionPalette} ${isPaletteOpen ? styles.open : ''}`}>
              <div className={styles.paletteHeader}>
                <h3>Palette</h3>
                <button className={styles.closePaletteBtn} onClick={() => setIsPaletteOpen(false)}>&times;</button>
              </div>
              <div className={styles.paletteGrid}>
                {quizData.shuffledQuestions.map((q, i) => (
                  <button 
                    key={i} 
                    className={`${styles.paletteBtn} ${currentQuestionIndex === i ? styles.active : ''} ${answers[i] && answers[i].length !== 0 ? styles.answered : ''}`}
                    onClick={() => {
                      setCurrentQuestionIndex(i);
                      setIsPaletteOpen(false); // Auto close on mobile after selection
                    }}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button className={styles.btnSuccess} onClick={() => { if(confirm("Submit Quiz?")) submitQuiz(); }} style={{ marginTop: '32px', width: '100%' }}>
                <i className="bi bi-check2-all"></i> Submit Quiz
              </button>
            </aside>

            <main className={styles.questionArea}>
              <div className={styles.card}>
                <div className={styles.qHeader}>
                  <span className={styles.qNumber}>Question {currentQuestionIndex + 1}</span>
                  <span className={styles.qMarks}>{currentQ.marks} Marks</span>
                </div>
                <div className={styles.qText}>{currentQ.text}</div>

                <div className={styles.qInputArea}>
                  {(currentQ.type === 'single' || currentQ.type === 'multiple') && (
                    <div className={styles.optionsList}>
                      {currentQ.options.map((opt, i) => (
                        <label key={`${currentQuestionIndex}-${i}`} className={styles.optionLabel}>
                          <input 
                            type={currentQ.type === 'single' ? 'radio' : 'checkbox'} 
                            name={`q-${currentQuestionIndex}`}
                            checked={currentQ.type === 'single' ? answers[currentQuestionIndex] === opt.text : (answers[currentQuestionIndex] || []).includes(opt.text)}
                            onChange={() => handleAnswerChange(currentQuestionIndex, opt.text, currentQ.type)}
                          />
                          <span>{opt.text}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {currentQ.type === 'text' && (
                    <textarea className={styles.customTextarea} rows="6" placeholder="Type your detailed answer here..." value={answers[currentQuestionIndex] || ''} onChange={(e) => handleAnswerChange(currentQuestionIndex, e.target.value, 'text')} />
                  )}

                  {currentQ.type === 'integer' && (
                    <input type="number" className={styles.customInput} placeholder="Enter numeric value..." value={answers[currentQuestionIndex] || ''} onChange={(e) => handleAnswerChange(currentQuestionIndex, e.target.value, 'integer')} />
                  )}

                  {currentQ.type === 'code' && (
                    <div className={styles.codeEditorWrapper}>
                      <CodeMirror value={answers[currentQuestionIndex] !== undefined ? answers[currentQuestionIndex] : (currentQ.starterCode || '')} height="300px" theme={dracula} extensions={[javascript({ jsx: true })]} onChange={(value) => handleAnswerChange(currentQuestionIndex, value, 'code')} className={styles.cmEditor} />
                    </div>
                  )}
                </div>

                <div className={styles.navButtons}>
                  <button className={styles.btnNav} disabled={currentQuestionIndex === 0} onClick={() => setCurrentQuestionIndex(i => i - 1)}>Previous</button>
                  <button className={styles.btnNav} disabled={currentQuestionIndex === quizData.shuffledQuestions.length - 1} onClick={() => setCurrentQuestionIndex(i => i + 1)}>Next</button>
                </div>
              </div>
            </main>
          </div>
        )}

        {step === 4 && result && (
          <div className={styles.container}>
            <div className={styles.card} style={{ textAlign: 'center' }}>
              <h1>Submission Received</h1>
              <p className={styles.mutedText}>Your assessment has been successfully recorded.</p>
              
              <div className={styles.resultPercentage}>{result.percentage}%</div>
              <div className={styles.resultFraction}>{result.obtainedMarks} / {result.totalMarks} Marks</div>

              {quizData.passingScore > 0 && (
                <div className={`${styles.statusBadge} ${isPassed ? styles.statusPass : styles.statusFail}`}>
                  {isPassed ? 'Passed' : 'Failed'}
                </div>
              )}
            </div>
          </div>
        )}

        {isSubmitting && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent} style={{ textAlign: 'center' }}>
              <div className={styles.spinner}></div>
              <h3>Evaluating Answers...</h3>
              <p>AI is currently grading your submission. Please do not close the window.</p>
            </div>
          </div>
        )}

        {warningModal.show && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '3rem', color: 'var(--warning-yellow)' }}></i>
              <h3>{warningModal.title}</h3>
              <p>{warningModal.desc}</p>
              <button className={styles.btnPrimary} onClick={() => setWarningModal({ show: false, title: '', desc: '' })}>I Understand</button>
            </div>
          </div>
        )}
        
      </div>
    </GoogleOAuthProvider>
  );
}