'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import styles from './create-quiz.module.css';

export default function CreateQuiz() {
  const router = useRouter();
  
  // Calculate date purely on the client/server without state or effects
  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState(['']); 
  
  // New Features States
  const [customFields, setCustomFields] = useState([]);
  const [password, setPassword] = useState('');

  const [enableTimeLimit, setEnableTimeLimit] = useState(false);
  const [timeLimit, setTimeLimit] = useState('');
  const [passingScore, setPassingScore] = useState(60);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [showAnswers, setShowAnswers] = useState(false);
  
  const [acCamera, setAcCamera] = useState(true);
  const [acTab, setAcTab] = useState(true);
  const [acCopy, setAcCopy] = useState(true);

  const [questions, setQuestions] = useState([]);

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  
  const [aiForm, setAiForm] = useState({ 
    syllabus: '', field: '', difficulty: 'medium', totalMarks: 100,
    counts: { single: 5, multiple: 2, text: 2, integer: 1, code: 0 }
  });

  const [reviewQueue, setReviewQueue] = useState([]);
  const [isReviewing, setIsReviewing] = useState(false);
  const [regeneratingIndex, setRegeneratingIndex] = useState(null);

  const handleInstructionChange = (index, value) => {
    const updated = [...instructions];
    updated[index] = value;
    setInstructions(updated);
  };
  const addInstruction = () => setInstructions([...instructions, '']);
  const removeInstruction = (index) => {
    if (instructions.length > 1) {
      setInstructions(instructions.filter((_, i) => i !== index));
    } else {
      setInstructions(['']); 
    }
  };

  const addCustomField = () => setCustomFields([...customFields, { name: '', type: 'text' }]);
  const updateCustomField = (index, key, value) => {
    const updated = [...customFields];
    updated[index][key] = value;
    setCustomFields(updated);
  };
  const removeCustomField = (index) => setCustomFields(customFields.filter((_, i) => i !== index));

  const addQuestion = (prefill = null) => {
    const newQuestion = {
      id: Date.now() + Math.random(),
      type: prefill ? prefill.type : 'single',
      text: prefill ? prefill.text : '',
      marks: prefill ? prefill.marks : 1,
      options: prefill?.options ? prefill.options : [{ text: '', isCorrect: false }, { text: '', isCorrect: false }],
      correctAnswer: prefill ? prefill.correctAnswer : '',
      codeLanguage: prefill?.codeLanguage || 'javascript',
      starterCode: prefill?.starterCode || ''
    };
    setQuestions(prev => [...prev, newQuestion]);
  };

  const removeQuestion = (index) => setQuestions(prev => prev.filter((_, i) => i !== index));

  const updateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index][field] = value;
    if (field === 'type') {
      if (value === 'single' || value === 'multiple') {
        updated[index].options = [{ text: '', isCorrect: false }, { text: '', isCorrect: false }];
        updated[index].correctAnswer = '';
      } else {
        updated[index].options = [];
        updated[index].correctAnswer = '';
      }
    }
    setQuestions(updated);
  };

  const addOption = (qIndex) => {
    const updated = [...questions];
    updated[qIndex].options.push({ text: '', isCorrect: false });
    setQuestions(updated);
  };

  const removeOption = (qIndex, optIndex) => {
    const updated = [...questions];
    updated[qIndex].options = updated[qIndex].options.filter((_, i) => i !== optIndex);
    setQuestions(updated);
  };

  const updateOption = (qIndex, optIndex, field, value) => {
    const updated = [...questions];
    if (field === 'isCorrect' && updated[qIndex].type === 'single') {
      updated[qIndex].options.forEach(opt => opt.isCorrect = false);
    }
    updated[qIndex].options[optIndex][field] = value;
    setQuestions(updated);
  };

  const handleAiCountChange = (type, value) => {
    setAiForm(prev => ({ ...prev, counts: { ...prev.counts, [type]: parseInt(value) || 0 } }));
  };

  const handleAiGenerate = async (e) => {
    e.preventDefault();
    setIsGenerating(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/ai/generate-quiz`, {
        syllabus: aiForm.syllabus,
        field: aiForm.field,
        difficulty: aiForm.difficulty,
        totalMarks: aiForm.totalMarks,
        questionCounts: aiForm.counts
      }, { headers: { Authorization: `Bearer ${token}` } });

      const data = response.data.data;
      const processedQuestions = data.questions.map(q => ({
        id: Date.now() + Math.random(),
        ...q,
        type: q.type || 'single', // CRITICAL FIX: Fallback if AI forgets type
        correctAnswer: q.correctAnswer || q.aiGradingRubric || ''
      }));

      setReviewQueue(processedQuestions);
      setIsReviewing(true);
      setIsGenerating(false);

      if (!title) setTitle(`${aiForm.syllabus.split(',')[0]} Assessment`);
      if (data.recommendedTimeLimit && !timeLimit) {
        setEnableTimeLimit(true);
        setTimeLimit(data.recommendedTimeLimit);
      }

      toast.success('Generation complete. Please review the questions.');
    } catch (error) {
      toast.error(error.response?.data?.message || "Generation failed.");
      setIsGenerating(false);
    }
  };

  const handleAcceptQuestion = (q, index) => {
    setQuestions(prev => [...prev, q]);
    setReviewQueue(prev => prev.filter((_, i) => i !== index));
    toast.success('Added to assessment');
  };

  const handleRejectQuestion = (index) => setReviewQueue(prev => prev.filter((_, i) => i !== index));

  const handleAcceptAll = () => {
    setQuestions(prev => [...prev, ...reviewQueue]);
    setReviewQueue([]);
    setIsReviewing(false);
    setIsAiModalOpen(false);
    toast.success('All questions added to assessment!');
  };

  const handleRegenerateSingle = async (q, index) => {
    setRegeneratingIndex(index);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/ai/regenerate-question`, {
        syllabus: aiForm.syllabus, field: aiForm.field, difficulty: aiForm.difficulty, type: q.type
      }, { headers: { Authorization: `Bearer ${token}` } });

      const newQ = response.data.data;
      const processed = {
        id: Date.now() + Math.random(),
        ...newQ,
        type: q.type, // CRITICAL FIX: Explicitly inherit the exact type from the previous question
        correctAnswer: newQ.correctAnswer || newQ.aiGradingRubric || ''
      };

      setReviewQueue(prev => {
        const updated = [...prev];
        updated[index] = processed;
        return updated;
      });
      toast.success('Question regenerated');
    } catch (error) {
      toast.error("Failed to regenerate question");
    } finally {
      setRegeneratingIndex(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (questions.length === 0) return toast.error('Please add at least one question.');

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if ((q.type === 'single' || q.type === 'multiple') && (!q.options || !q.options.some(o => o.isCorrect))) {
        return toast.error(`Question ${i + 1} needs a correct option selected.`);
      }
    }

    // Filter out empty custom fields
    const validCustomFields = customFields.filter(cf => cf.name.trim() !== '');

    setIsPublishing(true);

    const payload = {
      title, description,
      instructions: instructions.filter(i => i.trim() !== ''),
      customFields: validCustomFields,
      password: password,
      timeLimit: enableTimeLimit ? parseInt(timeLimit) : null,
      passingScore: parseInt(passingScore),
      settings: { shuffleQuestions, shuffleOptions, showAnswers },
      antiCheatSettings: { aiCamera: acCamera, tabSwitch: acTab, copyPaste: acCopy },
      questions
    };

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/quizzes/create`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Assessment Published Successfully!');
      router.push('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to publish assessment.');
      setIsPublishing(false);
    }
  };

  return (
    <div className={styles.studioWrapper}>
      <div className={styles.studioHeader}>
        <div>
          <h1>Create Assessment</h1>
          <p suppressHydrationWarning>{currentDate}</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.btnPurple} onClick={() => setIsAiModalOpen(true)}>
            <i className="bi bi-magic"></i> AI Generator
          </button>
          <button type="button" className={styles.btnGreen} onClick={handleSubmit} disabled={isPublishing}>
            {isPublishing ? 'Publishing...' : <><i className="bi bi-cloud-arrow-up-fill"></i> Publish</>}
          </button>
        </div>
      </div>

      <div className={styles.scrollContainer}>
        <form onSubmit={handleSubmit}>
          <div className={styles.layoutGrid}>
            <div className={styles.mainCol}>
              
              <div className={styles.adminCard}>
                <div className={styles.cardHeader}>
                  <h3><i className="bi bi-info-circle-fill" style={{color: '#3b82f6'}}></i> Basic Information</h3>
                </div>
                <div className={styles.formGroup}>
                  <label>Assessment Title</label>
                  <input type="text" className={styles.customInput} placeholder="e.g., Midterm Physics Assessment" required value={title} onChange={e => setTitle(e.target.value)} />
                </div>
                <div className={styles.formGroup}>
                  <label>Description</label>
                  <textarea className={styles.customTextarea} rows="2" placeholder="Provide a brief overview..." required value={description} onChange={e => setDescription(e.target.value)} />
                </div>
              </div>

              <div className={styles.adminCard}>
                <div className={styles.cardHeader}>
                  <h3><i className="bi bi-list-check" style={{color: '#f59e0b'}}></i> Teacher Instructions</h3>
                  <span className={styles.badgeOrange}>Student Facing</span>
                </div>
                <p className={styles.helperText} style={{marginBottom: '12px'}}>Add specific rules or guidance for the students before they start.</p>
                <div className={styles.instructionsList}>
                  {instructions.map((inst, index) => (
                    <div key={index} className={styles.instructionRow}>
                      <div className={styles.dragHandle}><i className="bi bi-grip-vertical"></i></div>
                      <input 
                        type="text" className={styles.customInput} placeholder={`Instruction point ${index + 1}`} 
                        value={inst} onChange={(e) => handleInstructionChange(index, e.target.value)} 
                      />
                      <button type="button" className={styles.btnIconDanger} onClick={() => removeInstruction(index)} title="Remove point">
                        <i className="bi bi-x-lg"></i>
                      </button>
                    </div>
                  ))}
                  <button type="button" className={styles.btnTextBlue} onClick={addInstruction}>
                    <i className="bi bi-plus-lg"></i> Add another instruction
                  </button>
                </div>
              </div>

              <div className={`${styles.adminCard} ${styles.transparentCard}`}>
                <div className={styles.cardHeader}>
                  <h3>Questions ({questions.length})</h3>
                  <button type="button" className={styles.btnBlue} onClick={() => addQuestion()}>
                    <i className="bi bi-plus-lg"></i> Add Empty
                  </button>
                </div>
                
                {questions.length === 0 && (
                  <div className={styles.emptyState}>
                    <i className="bi bi-inboxes"></i>
                    No questions added. Add one manually or use the AI Generator.
                  </div>
                )}
                
                {questions.map((q, qIndex) => (
                  <div key={q.id} className={`${styles.adminCard} ${styles.questionCard}`}>
                    <div className={styles.qHeaderTools}>
                      <div className={styles.qNumber}>Q{qIndex + 1}.</div>
                      
                      <div className={styles.qInputGroup}>
                        <label>Type:</label>
                        <select className={styles.customSelect} value={q.type} onChange={e => updateQuestion(qIndex, 'type', e.target.value)}>
                          <option value="single">Single Choice</option>
                          <option value="multiple">Multiple Choice</option>
                          <option value="text">Subjective Text</option>
                          <option value="integer">Numeric/Math</option>
                          <option value="code">Coding Task</option>
                        </select>
                      </div>

                      <div className={styles.qInputGroup}>
                        <label>Pts:</label>
                        <input type="number" className={styles.customInput} style={{ width: '60px', textAlign: 'center', padding: '6px' }} min="0.5" step="0.5" required value={q.marks} onChange={e => updateQuestion(qIndex, 'marks', e.target.value)} />
                      </div>

                      <button type="button" className={styles.btnIconDanger} style={{marginLeft: 'auto'}} onClick={() => removeQuestion(qIndex)}>
                        <i className="bi bi-trash3"></i>
                      </button>
                    </div>

                    <textarea className={styles.customTextarea} placeholder="Enter the question text here..." rows="2" required style={{ resize: 'vertical' }} value={q.text} onChange={e => updateQuestion(qIndex, 'text', e.target.value)} />

                    {q.type === 'code' && (
                      <div className={styles.codeSetupBox}>
                        <div className={styles.formGroup}>
                          <label>Language</label>
                          <input type="text" className={styles.customInput} placeholder="javascript, python, cpp..." value={q.codeLanguage} onChange={e => updateQuestion(qIndex, 'codeLanguage', e.target.value)} />
                        </div>
                        <div className={styles.formGroup}>
                          <label>Starter Code</label>
                          <textarea className={styles.customTextarea} rows="3" placeholder="function solve() { ... }" style={{fontFamily: 'monospace'}} value={q.starterCode} onChange={e => updateQuestion(qIndex, 'starterCode', e.target.value)} />
                        </div>
                      </div>
                    )}

                    <div className={styles.optionsWrapper}>
                      {(q.type === 'single' || q.type === 'multiple') ? (
                        <>
                          {q.options.map((opt, optIndex) => (
                            <div key={optIndex} className={styles.customOptionRow}>
                              <label className={styles.customRadioCheckbox}>
                                <input type={q.type === 'single' ? 'radio' : 'checkbox'} name={`correct-${q.id}`} checked={opt.isCorrect} onChange={e => updateOption(qIndex, optIndex, 'isCorrect', e.target.checked)} />
                                <span className={styles.checkmark}></span>
                              </label>
                              <input type="text" className={styles.transparentInput} placeholder={`Option ${optIndex + 1}`} required value={opt.text} onChange={e => updateOption(qIndex, optIndex, 'text', e.target.value)} />
                              <button type="button" className={styles.btnIconDanger} onClick={() => removeOption(qIndex, optIndex)}><i className="bi bi-x-lg"></i></button>
                            </div>
                          ))}
                          <button type="button" className={styles.btnTextBlue} onClick={() => addOption(qIndex)}><i className="bi bi-plus-circle"></i> Add Option</button>
                        </>
                      ) : (
                        <div className={styles.rubricBox}>
                          <i className="bi bi-robot"></i>
                          <input type="text" className={styles.transparentInput} placeholder={q.type === 'code' ? 'AI Expected Logic / Rubric' : 'Exact answer or AI grading rubric'} required value={q.correctAnswer} onChange={e => updateQuestion(qIndex, 'correctAnswer', e.target.value)} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.sideCol}>
              <div className={styles.adminCard}>
                <div className={styles.cardHeader}>
                  <h3><i className="bi bi-sliders" style={{color: '#8b5cf6'}}></i> Configuration</h3>
                </div>
                
                {/* Custom Fields Config */}
                <div className={styles.configItem} style={{ borderBottom: 'none', paddingBottom: 0 }}>
                  <div className={styles.configLabel} style={{ marginBottom: '8px' }}>
                    <span>Extra Student Fields</span>
                  </div>
                  <div className={styles.helperText} style={{ marginBottom: '8px' }}>Ask for Roll No, Age, Section, etc.</div>
                  {customFields.map((cf, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                      <input type="text" className={styles.customInput} placeholder="Field Name" value={cf.name} onChange={e => updateCustomField(idx, 'name', e.target.value)} />
                      <select className={styles.customSelect} style={{ width: '100px', padding: '6px' }} value={cf.type} onChange={e => updateCustomField(idx, 'type', e.target.value)}>
                        <option value="text">Text</option>
                        <option value="number">Num</option>
                      </select>
                      <button type="button" className={styles.btnIconDanger} onClick={() => removeCustomField(idx)}><i className="bi bi-x"></i></button>
                    </div>
                  ))}
                  <button type="button" className={styles.btnTextBlue} onClick={addCustomField}><i className="bi bi-plus"></i> Add Field</button>
                </div>
                
                {/* Quiz Password Lock */}
                <div className={styles.configItem} style={{ marginTop: '16px' }}>
                  <div className={styles.configLabel}><span>Quiz Password</span></div>
                  <input type="text" className={styles.customInput} style={{ marginTop: '8px' }} placeholder="Optional password to lock" value={password} onChange={e => setPassword(e.target.value)} />
                  <div className={styles.helperText}>Leave blank for open access.</div>
                </div>

                <div className={styles.configItem}>
                  <div className={styles.configLabel}>
                    <span>Time Limit</span>
                    <label className={styles.switch}>
                      <input type="checkbox" checked={enableTimeLimit} onChange={e => setEnableTimeLimit(e.target.checked)} />
                      <span className={styles.slider}></span>
                    </label>
                  </div>
                  {enableTimeLimit && <input type="number" className={styles.customInput} min="1" max="300" placeholder="Duration in mins" style={{ marginTop: '8px' }} required value={timeLimit} onChange={e => setTimeLimit(e.target.value)} />}
                </div>

                <div className={styles.configItem}>
                  <div className={styles.configLabel}><span>Passing Score (%)</span></div>
                  <input type="number" className={styles.customInput} style={{ marginTop: '8px' }} min="1" max="100" required value={passingScore} onChange={e => setPassingScore(e.target.value)} />
                </div>

                <div className={styles.configItem}>
                  <div className={styles.configLabel}>
                    <span>Shuffle Questions</span>
                    <label className={styles.switch}><input type="checkbox" checked={shuffleQuestions} onChange={e => setShuffleQuestions(e.target.checked)} /><span className={styles.slider}></span></label>
                  </div>
                </div>

                <div className={styles.configItem}>
                  <div className={styles.configLabel}>
                    <span>Shuffle Options</span>
                    <label className={styles.switch}><input type="checkbox" checked={shuffleOptions} onChange={e => setShuffleOptions(e.target.checked)} /><span className={styles.slider}></span></label>
                  </div>
                </div>

                <div className={styles.configItem}>
                  <div className={styles.configLabel}>
                    <span>Show Answers</span>
                    <label className={styles.switch}><input type="checkbox" checked={showAnswers} onChange={e => setShowAnswers(e.target.checked)} /><span className={styles.slider}></span></label>
                  </div>
                  <div className={styles.helperText}>Allow students to view and print correct answers post-submission.</div>
                </div>
              </div>

              <div className={`${styles.adminCard} ${styles.dangerCard}`}>
                <div className={styles.cardHeader}>
                  <h3><i className="bi bi-shield-lock-fill" style={{color: '#ef4444'}}></i> Proctoring</h3>
                </div>
                
                <div className={styles.configItem}>
                  <div className={styles.configLabel}>
                    <div>
                      <span style={{display: 'block'}}>AI Camera Tracking</span>
                      <small className={styles.helperText}>Detects face movement/absence</small>
                    </div>
                    <label className={styles.switchDanger}><input type="checkbox" checked={acCamera} onChange={e => setAcCamera(e.target.checked)} /><span className={styles.sliderDanger}></span></label>
                  </div>
                </div>

                <div className={styles.configItem}>
                  <div className={styles.configLabel}>
                    <div>
                      <span style={{display: 'block'}}>Tab Lock Tracking</span>
                      <small className={styles.helperText}>Flags window switching</small>
                    </div>
                    <label className={styles.switchDanger}><input type="checkbox" checked={acTab} onChange={e => setAcTab(e.target.checked)} /><span className={styles.sliderDanger}></span></label>
                  </div>
                </div>

                <div className={styles.configItem}>
                  <div className={styles.configLabel}>
                    <div>
                      <span style={{display: 'block'}}>Restrict Clipboard</span>
                      <small className={styles.helperText}>Blocks copy/paste actions</small>
                    </div>
                    <label className={styles.switchDanger}><input type="checkbox" checked={acCopy} onChange={e => setAcCopy(e.target.checked)} /><span className={styles.sliderDanger}></span></label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* AI Generator Modal */}
      <div className={`${styles.modalOverlay} ${isAiModalOpen ? styles.show : ''}`}>
        <div className={styles.modalContainer}>
          <div className={styles.modalHeader}>
            <h3><i className="bi bi-stars" style={{color: '#8b5cf6', marginRight: '8px'}}></i> {isReviewing ? 'Review Queue' : 'AI Generator'}</h3>
            <button type="button" className={styles.btnIconMuted} onClick={() => {setIsAiModalOpen(false); setIsReviewing(false); setReviewQueue([]);}}><i className="bi bi-x-lg"></i></button>
          </div>
          
          <div className={styles.modalBody}>
            {!isReviewing ? (
              <form onSubmit={handleAiGenerate} style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
                <div className={styles.formGroup}>
                  <label>Syllabus Topics</label>
                  <textarea className={styles.customTextarea} rows="2" placeholder="e.g., Arrays, HashMaps, Big-O Notation" required value={aiForm.syllabus} onChange={e => setAiForm({...aiForm, syllabus: e.target.value})} />
                </div>
                
                <div className={styles.grid2}>
                  <div className={styles.formGroup}>
                    <label>Target Total Marks</label>
                    <input type="number" className={styles.customInput} required value={aiForm.totalMarks} onChange={e => setAiForm({...aiForm, totalMarks: e.target.value})} />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Difficulty</label>
                    <select className={styles.customSelect} value={aiForm.difficulty} onChange={e => setAiForm({...aiForm, difficulty: e.target.value})}>
                      <option value="easy">Beginner</option>
                      <option value="medium">Intermediate</option>
                      <option value="hard">Advanced</option>
                    </select>
                  </div>
                </div>

                <div className={styles.countsWrapper}>
                  <label style={{marginBottom: '12px', display: 'block', fontWeight: '700', fontSize: '0.95rem', color: '#0f172a'}}>Question Breakdown Request</label>
                  <div className={styles.countsGrid}>
                    <div className={styles.countItem}>
                      <span className={styles.countLabel}>Single Choice</span>
                      <input type="number" className={styles.countInput} min="0" value={aiForm.counts.single} onChange={(e) => handleAiCountChange('single', e.target.value)} />
                    </div>
                    <div className={styles.countItem}>
                      <span className={styles.countLabel}>Multi Choice</span>
                      <input type="number" className={styles.countInput} min="0" value={aiForm.counts.multiple} onChange={(e) => handleAiCountChange('multiple', e.target.value)} />
                    </div>
                    <div className={styles.countItem}>
                      <span className={styles.countLabel}>Integer</span>
                      <input type="number" className={styles.countInput} min="0" value={aiForm.counts.integer} onChange={(e) => handleAiCountChange('integer', e.target.value)} />
                    </div>
                    <div className={styles.countItem}>
                      <span className={styles.countLabel}>Subj. Text</span>
                      <input type="number" className={styles.countInput} min="0" value={aiForm.counts.text} onChange={(e) => handleAiCountChange('text', e.target.value)} />
                    </div>
                    <div className={styles.countItem} style={{background: '#faf5ff', borderColor: '#e9d5ff'}}>
                      <span className={styles.countLabel} style={{color: '#7e22ce'}}><i className="bi bi-code-slash"></i> Coding</span>
                      <input type="number" className={styles.countInput} style={{borderColor: '#d8b4fe'}} min="0" value={aiForm.counts.code} onChange={(e) => handleAiCountChange('code', e.target.value)} />
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
                  <button type="submit" className={styles.btnPurple} disabled={isGenerating} style={{ width: '100%', padding: '12px', fontSize: '0.95rem', justifyContent: 'center' }}>
                    {isGenerating ? <><i className="bi bi-arrow-repeat spin"></i> Generating Draft...</> : 'Generate Queue'}
                  </button>
                </div>
              </form>

            ) : (
              
              <div className={styles.reviewWrapper}>
                {reviewQueue.length === 0 ? (
                  <div className={styles.emptyState} style={{marginTop: '40px'}}>
                    <i className="bi bi-check2-circle" style={{color: '#10b981'}}></i>
                    All generated questions reviewed!
                  </div>
                ) : (
                  <>
                    <div className={styles.reviewActionsTop}>
                      <span style={{fontSize: '1rem', fontWeight: '700', color: '#1e293b'}}>{reviewQueue.length} Pending Approval</span>
                      <button type="button" onClick={handleAcceptAll} className={styles.btnGreen}>
                        <i className="bi bi-check-all"></i> Accept All
                      </button>
                    </div>

                    <div className={styles.reviewScrollContent}>
                      {reviewQueue.map((q, idx) => (
                        <div key={idx} className={`${styles.adminCard} ${styles.reviewCard}`}>
                          <div className={styles.cardHeader} style={{marginBottom: '12px'}}>
                            <span className={styles.badgePurple}>{q.type}</span>
                            <span style={{fontWeight: 700, color: '#334155', fontSize: '0.95rem'}}>{q.marks} pts</span>
                          </div>
                          <div className={styles.qTextPreview}>{q.text}</div>
                          
                          {(q.type === 'single' || q.type === 'multiple') && q.options && (
                            <div className={styles.previewOptions}>
                              {q.options.map((o, oIdx) => (
                                <div key={oIdx} style={{color: o.isCorrect ? '#059669' : '#64748b', fontSize: '0.875rem', fontWeight: o.isCorrect ? '600': '400', display: 'flex', alignItems: 'center', gap: '6px'}}>
                                  {o.isCorrect ? <i className="bi bi-check-circle-fill"></i> : <i className="bi bi-circle"></i>} {o.text}
                                </div>
                              ))}
                            </div>
                          )}

                          {q.type === 'code' && (
                            <div className={styles.previewCode}>
                              <span className={styles.codeLang}>{q.codeLanguage}</span>
                              <code>{q.starterCode || '// No starter code provided'}</code>
                            </div>
                          )}

                          <div className={styles.previewRubric}>
                            <i className="bi bi-robot" style={{marginTop: '2px'}}></i>
                            <div>
                              <strong style={{display: 'block', marginBottom: '2px', fontSize: '0.85rem'}}>AI Target Logic:</strong>
                              {q.correctAnswer}
                            </div>
                          </div>

                          <div className={styles.reviewBtnGroup}>
                            <button type="button" className={styles.btnGreen} onClick={() => handleAcceptQuestion(q, idx)}><i className="bi bi-check2"></i> Keep Question</button>
                            <button type="button" className={styles.btnPurpleOutline} onClick={() => handleRegenerateSingle(q, idx)} disabled={regeneratingIndex === idx}>
                              {regeneratingIndex === idx ? 'Regenerating...' : <><i className="bi bi-arrow-repeat"></i> Remake</>}
                            </button>
                            <button type="button" className={styles.btnRedOutline} style={{marginLeft: 'auto'}} onClick={() => handleRejectQuestion(idx)}><i className="bi bi-trash3"></i> Drop</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}