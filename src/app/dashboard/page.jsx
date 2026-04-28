'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Filler,
  RadialLinearScale // Added for Radar chart
} from 'chart.js';
import { Doughnut, Line, Bar, Radar } from 'react-chartjs-2'; // Added Radar
import styles from './dashboard.module.css';

// Register all required Chart.js components
ChartJS.register(
  ArcElement, Tooltip, Legend, CategoryScale, LinearScale, 
  PointElement, LineElement, BarElement, Title, Filler, RadialLinearScale
);

export default function Dashboard() {
  const [data, setData] = useState({
    quizzes: [],
    submissions: [],
    topStudents: [],
    avgScore: 0,
    totalFlagged: 0,
    flagBreakdown: { webcam: 0, tabs: 0, copyPaste: 0 },
    // New state variables
    uniqueStudents: 0,
    passRate: 0,
    riskByQuiz: [],
    dayData: [0, 0, 0, 0, 0, 0, 0]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const config = { headers: { Authorization: `Bearer ${token}` } };

        // 1. Fetch Quizzes
        const quizRes = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/quizzes/my-quizzes`, config);
        const quizzes = quizRes.data.quizzes || [];

        // 2. Fetch Submissions concurrently
        const submissionPromises = quizzes.map(q => 
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/submissions/quiz/${q._id}`, config)
               .catch(() => ({ data: { submissions: [] } }))
        );
        
        const submissionResponses = await Promise.all(submissionPromises);
        const allSubmissions = submissionResponses.flatMap(res => res.data.submissions || []);

        // 3. Calculate Platform Averages & Specific Flags
        let avgScore = 0;
        let totalFlagged = 0;
        const flagBreakdown = { webcam: 0, tabs: 0, copyPaste: 0 };
        let passedCount = 0;
        
        if (allSubmissions.length > 0) {
          const sum = allSubmissions.reduce((acc, sub) => acc + (sub.score?.percentage || 0), 0);
          avgScore = sum / allSubmissions.length;
          
          allSubmissions.forEach(sub => {
            if (sub.score?.percentage >= 60) passedCount++;

            const ac = sub.antiCheat;
            if (ac) {
              if (ac.isFlagged || ac.tabSwitches > 0 || ac.webcamStrikes > 0 || ac.copyPasteAttempts > 0) {
                totalFlagged++;
              }
              flagBreakdown.webcam += ac.webcamStrikes || 0;
              flagBreakdown.tabs += ac.tabSwitches || 0;
              flagBreakdown.copyPaste += ac.copyPasteAttempts || 0;
            }
          });
        }

        const passRate = allSubmissions.length > 0 ? (passedCount / allSubmissions.length) * 100 : 0;

        // 4. Calculate Top Students & Unique Students
        const studentMap = {};
        allSubmissions.forEach(sub => {
          if (!sub.score) return;
          const email = sub.userDetails?.email || 'Unknown';
          if (!studentMap[email]) {
            studentMap[email] = {
              name: sub.userDetails?.name || 'Unknown',
              email: email,
              totalScore: 0,
              count: 0
            };
          }
          studentMap[email].totalScore += sub.score.percentage;
          studentMap[email].count += 1;
        });

        const uniqueStudents = Object.keys(studentMap).length;

        const studentArr = Object.values(studentMap).map(s => ({
          ...s,
          avgScore: s.totalScore / s.count
        }));

        studentArr.sort((a, b) => b.avgScore - a.avgScore);
        const topStudents = studentArr.slice(0, 5);

        // 5. Calculate Risk by Quiz (Top 5 most flagged quizzes)
        const riskByQuiz = quizzes.map(q => {
          const subs = allSubmissions.filter(s => s.quizId === q._id && s.antiCheat);
          let flags = 0;
          subs.forEach(s => {
            const ac = s.antiCheat;
            if (ac.isFlagged || ac.tabSwitches > 0 || ac.webcamStrikes > 0 || ac.copyPasteAttempts > 0) {
              flags++;
            }
          });
          return { title: q.title, flags };
        }).sort((a, b) => b.flags - a.flags).slice(0, 5);

        // 6. Calculate Submissions by Day of Week
        const dayData = [0, 0, 0, 0, 0, 0, 0]; // Sun to Sat
        allSubmissions.forEach(s => {
          if (s.submittedAt) {
            const d = new Date(s.submittedAt).getDay();
            dayData[d]++;
          }
        });

        setData({ 
          quizzes, 
          submissions: allSubmissions, 
          topStudents, 
          avgScore, 
          totalFlagged, 
          flagBreakdown,
          uniqueStudents,
          passRate,
          riskByQuiz,
          dayData
        });
      } catch (error) {
        console.error(error);
        toast.error('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // --- Chart Configurations ---

  const getDoughnutData = () => {
    let failed = 0, passed = 0, excellent = 0;
    data.submissions.forEach(s => {
      if (!s.score) return;
      if (s.score.percentage < 60) failed++;
      else if (s.score.percentage < 80) passed++;
      else excellent++;
    });

    return {
      labels: ['Needs Review (<60%)', 'Proficient (60-79%)', 'Excellent (≥80%)'],
      datasets: [{
        data: [failed, passed, excellent],
        backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
        borderWidth: 0,
        hoverOffset: 4
      }],
    };
  };

  const getFlagData = () => {
    return {
      labels: ['Webcam Flags', 'Tab Switches', 'Copy/Paste'],
      datasets: [{
        data: [data.flagBreakdown.webcam, data.flagBreakdown.tabs, data.flagBreakdown.copyPaste],
        backgroundColor: ['#f43f5e', '#8b5cf6', '#f59e0b'],
        borderWidth: 0,
      }],
    };
  };

  const getLineData = () => {
    const timeData = {};
    data.submissions.forEach(s => {
      if (!s.submittedAt) return;
      const date = new Date(s.submittedAt).toLocaleDateString();
      timeData[date] = (timeData[date] || 0) + 1;
    });

    const labels = Object.keys(timeData).sort((a, b) => new Date(a) - new Date(b));
    const counts = labels.map(l => timeData[l]);

    return {
      labels,
      datasets: [{
        label: 'Submissions Recorded',
        data: counts,
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.15)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#8b5cf6',
      }],
    };
  };

  const getBarData = () => {
    const quizAverages = {};
    data.quizzes.forEach(q => {
      const subs = data.submissions.filter(s => s.quizId === q._id && s.score);
      if (subs.length > 0) {
        const sum = subs.reduce((acc, sub) => acc + sub.score.percentage, 0);
        quizAverages[q.title] = sum / subs.length;
      }
    });

    const labels = Object.keys(quizAverages).map(title => title.length > 15 ? title.substring(0, 15) + '...' : title);
    const scores = Object.values(quizAverages);

    return {
      labels,
      datasets: [{
        label: 'Average Score (%)',
        data: scores,
        backgroundColor: '#3b82f6',
        borderRadius: 6,
      }]
    };
  };

  // NEW: Horizontal Bar Chart Data
  const getRiskData = () => {
    const labels = data.riskByQuiz.map(r => r.title.length > 15 ? r.title.substring(0, 15) + '...' : r.title);
    const values = data.riskByQuiz.map(r => r.flags);
    return {
      labels,
      datasets: [{
        label: 'Security Flags Triggered',
        data: values,
        backgroundColor: '#ef4444',
        borderRadius: 6,
      }]
    };
  };

  // NEW: Radar Chart Data
  const getRadarData = () => {
    return {
      labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      datasets: [{
        label: 'Submissions by Day',
        data: data.dayData,
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: '#3b82f6',
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#3b82f6'
      }]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } } }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loaderSpinner}></div>
        <p>Compiling Analytics Engine...</p>
      </div>
    );
  }

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.dashboardHeader}>
        <div>
          <h1>Quiz Summary </h1>
          <p>Monitor real-time performance and integrity across your assessments.</p>
        </div>
      </div>

      <div className={styles.analyticsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#eff6ff', color: '#3b82f6' }}><i className="bi bi-journal-check"></i></div>
          <div>
            <div className={styles.statTitle}>Active Assessments</div>
            <div className={styles.statValue}>{data.quizzes.length}</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#f5f3ff', color: '#8b5cf6' }}><i className="bi bi-inboxes"></i></div>
          <div>
            <div className={styles.statTitle}>Total Submissions</div>
            <div className={styles.statValue}>{data.submissions.length}</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#ecfdf5', color: '#10b981' }}><i className="bi bi-check2-circle"></i></div>
          <div>
            <div className={styles.statTitle}>Global Pass Rate</div>
            <div className={styles.statValue}>{data.passRate.toFixed(1)}%</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#f0fdf4', color: '#16a34a' }}><i className="bi bi-graph-up-arrow"></i></div>
          <div>
            <div className={styles.statTitle}>Global Avg Score</div>
            <div className={styles.statValue}>{data.avgScore.toFixed(1)}%</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#fef2f2', color: '#ef4444' }}><i className="bi bi-shield-exclamation"></i></div>
          <div>
            <div className={styles.statTitle}>Flagged Attempts</div>
            <div className={styles.statValue} style={{color: data.totalFlagged > 0 ? '#ef4444' : 'inherit'}}>{data.totalFlagged}</div>
          </div>
        </div>
      </div>

      <div className={styles.chartsGrid}>
        <div className={styles.chartWrapper}>
          <h3><i className="bi bi-pie-chart" style={{color: '#8b5cf6'}}></i> Score Distribution</h3>
          <div className={styles.chartContainer}>
            <Doughnut data={getDoughnutData()} options={chartOptions} />
          </div>
        </div>

        <div className={styles.chartWrapper}>
          <h3><i className="bi bi-shield-lock" style={{color: '#ef4444'}}></i> Security Trigger Breakdown</h3>
          <div className={styles.chartContainer}>
            <Doughnut data={getFlagData()} options={chartOptions} />
          </div>
        </div>

        <div className={styles.chartWrapper}>
          <h3><i className="bi bi-activity" style={{color: '#3b82f6'}}></i> Submission Timeline</h3>
          <div className={styles.chartContainer}>
            <Line data={getLineData()} options={chartOptions} />
          </div>
        </div>

        <div className={styles.chartWrapper}>
          <h3><i className="bi bi-bar-chart" style={{color: '#10b981'}}></i> Average Score by Assessment</h3>
          <div className={styles.chartContainer}>
            <Bar data={getBarData()} options={{...chartOptions, scales: { y: { max: 100 } }}} />
          </div>
        </div>

        {/* New Charts */}
        <div className={styles.chartWrapper}>
          <h3><i className="bi bi-exclamation-triangle" style={{color: '#ef4444'}}></i> Highest Risk Assessments</h3>
          <div className={styles.chartContainer}>
            <Bar data={getRiskData()} options={{...chartOptions, indexAxis: 'y'}} />
          </div>
        </div>

        <div className={styles.chartWrapper}>
          <h3><i className="bi bi-calendar-week" style={{color: '#3b82f6'}}></i> Activity by Day of Week</h3>
          <div className={styles.chartContainer}>
            <Radar data={getRadarData()} options={{
              ...chartOptions, 
              scales: { r: { ticks: { display: false } } } 
            }} />
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2><i className="bi bi-trophy" style={{color: '#f59e0b'}}></i> Top Performing Students</h2>
        </div>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr className={styles.tr}>
                <th className={styles.th}>Student Name</th>
                <th className={styles.th}>Email Address</th>
                <th className={styles.th} style={{textAlign: 'center'}}>Assessments Completed</th>
                <th className={styles.th} style={{textAlign: 'right'}}>Avg Score</th>
              </tr>
            </thead>
            <tbody>
              {data.topStudents.length === 0 ? (
                <tr className={styles.tr}>
                  <td colSpan="4" className={styles.td} style={{textAlign: 'center', padding: '40px', color: '#94a3b8'}}>
                    <i className="bi bi-inboxes" style={{fontSize: '2.5rem', display: 'block', marginBottom: '12px'}}></i>
                    No submissions available to calculate top performers.
                  </td>
                </tr>
              ) : (
                data.topStudents.map((student, idx) => (
                  <tr key={idx} className={styles.tr}>
                    <td className={styles.td}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                        <div className={styles.avatarMini}>{student.name.charAt(0)}</div>
                        <strong style={{fontSize: '1.05rem'}}>{student.name}</strong>
                      </div>
                    </td>
                    <td className={styles.td} style={{ color: '#64748b' }}>{student.email}</td>
                    <td className={styles.td} style={{textAlign: 'center'}}>
                      <span className={styles.countBadge}>{student.count}</span>
                    </td>
                    <td className={styles.td} style={{textAlign: 'right'}}>
                      <strong style={{ color: '#10b981', fontSize: '1.15rem' }}>{student.avgScore.toFixed(1)}%</strong>
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