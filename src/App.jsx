import React, { useState, useEffect, useMemo } from 'react';
import './App.css';

// --- DATA STRUCTURES ---
const EXAMS = {
  JEE: {
    subjects: {
      Physics: ["Mechanics", "Electrodynamics", "Modern Physics", "Optics"],
      Chemistry: ["Organic", "Inorganic", "Physical"],
      Maths: ["Calculus", "Algebra", "Coordinate Geometry", "Vectors/3D"]
    }
  },
  NEET: {
    subjects: {
      Biology: ["Genetics", "Human Physiology", "Plant Physiology", "Ecology"],
      Physics: ["Mechanics", "Optics", "Modern Physics"],
      Chemistry: ["Organic", "Physical", "Inorganic"]
    }
  }
};

const MOCK_QUESTIONS = [
  { id: 1, text: "What is the work done in an isochoric process?", options: ["PΔV", "0", "W = -Q", "VΔP"], answer: 1, idealTime: 45, topic: "Thermodynamics", weight: 4 },
  { id: 2, text: "Which of the following has the highest electronegativity?", options: ["Oxygen", "Chlorine", "Fluorine", "Nitrogen"], answer: 2, idealTime: 30, topic: "Atomic Structure", weight: 3 },
  { id: 3, text: "The derivative of sin(x^2) is:", options: ["2x cos(x^2)", "cos(x^2)", "2 sin(x)", "x^2 cos(x)"], answer: 0, idealTime: 60, topic: "Calculus", weight: 5 }
];

// --- ARCHITECTURAL UTILITIES (HEURISTICS) ---
const calculateConfidence = (dwell, changes, correct) => {
  if (!correct) return 0;
  // Formula: CI = (AccuracyBase / (1 + Log(Dwell))) * ChangePenalty
  const changePenalty = changes > 1 ? 0.7 : 1.0;
  const timeFactor = Math.max(1, dwell / 30); 
  return Math.round((100 / timeFactor) * changePenalty);
};

const App = () => {
  const [user, setUser] = useState(null); 
  const [view, setView] = useState('login'); 
  const [logs, setLogs] = useState([]); 
  const [exam, setExam] = useState('JEE');
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [isPressureMode, setIsPressureMode] = useState(false);

  // --- PART 1: INTERVENTION ENGINE ---
  const getIntervention = (analytics) => {
    const dominantBehavior = analytics.behavior[0]?.label; 
    if (dominantBehavior === "Overthinking") {
      return { type: "SPEED_DRILL", task: "Solve 10 Thermo questions in 5 mins", cta: "Start Speed Drill" };
    }
    if (dominantBehavior === "Guessing") {
      return { type: "CONCEPT_REINFORCE", task: "Review 'First Law' Video & Quiz", cta: "Fix Concepts" };
    }
    return { type: "MOCK_STEPUP", task: "Next level Mock Test ready", cta: "Attempt Level 2" };
  };

  const Login = () => {
    const [role, setRole] = useState('student');
    const [name, setName] = useState('');
    return (
      <div className="login-page">
        <div className="login-card">
          <h1 className="logo-ai">ABHYAS AI</h1>
          <p style={{ color: 'var(--text-sub)', marginBottom: '2rem' }}>Senior Architect Portal</p>
          <div className="role-selector">
            <button className={role === 'student' ? 'active' : ''} onClick={() => setRole('student')}>Student</button>
            <button className={role === 'instructor' ? 'active' : ''} onClick={() => setRole('instructor')}>Instructor</button>
          </div>
          <input 
            type="text" placeholder="Enter Name" className="opt-btn" style={{ width: '100%', marginBottom: '1rem' }}
            value={name} onChange={(e) => setName(e.target.value)}
          />
          <button className="finish-btn" style={{ width: '100%' }} onClick={() => { if(name) { setUser({ role, name }); setView(role === 'student' ? 'dashboard' : 'ins-dashboard'); } }}>
            Initialize System
          </button>
        </div>
      </div>
    );
  };

  const TestPortal = ({ onFinish, pressure }) => {
    const [curr, setCurr] = useState(0);
    const [selected, setSelected] = useState({});
    const [startTime, setStartTime] = useState(Date.now());
    const [telemetry, setTelemetry] = useState({}); 
    const [timeLeft, setTimeLeft] = useState(180); // 3 mins total for mock

    useEffect(() => {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) { clearInterval(timer); finish(); return 0; }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }, []);

    const handleSelect = (idx) => {
      const qId = MOCK_QUESTIONS[curr].id;
      const changes = (telemetry[qId]?.changes || 0) + 1;
      setSelected({ ...selected, [curr]: idx });
      setTelemetry({ ...telemetry, [qId]: { ...telemetry[qId], changes } });
    };

    const nextQ = () => {
      const qId = MOCK_QUESTIONS[curr].id;
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      setTelemetry({ ...telemetry, [qId]: { ...telemetry[qId], dwell: (telemetry[qId]?.dwell || 0) + timeSpent } });
      setStartTime(Date.now());
      if (curr < MOCK_QUESTIONS.length - 1) setCurr(curr + 1);
    };

    const finish = () => {
      const qId = MOCK_QUESTIONS[curr].id;
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      const finalTelemetry = { ...telemetry, [qId]: { ...telemetry[qId], dwell: (telemetry[qId]?.dwell || 0) + timeSpent } };
      
      const sessionLogs = MOCK_QUESTIONS.map(q => {
        const t = finalTelemetry[q.id] || { dwell: 0, changes: 0 };
        return {
          qId: q.id,
          dwell: t.dwell,
          changes: t.changes,
          correct: selected[MOCK_QUESTIONS.indexOf(q)] === q.answer,
          confIndex: calculateConfidence(t.dwell, t.changes, selected[MOCK_QUESTIONS.indexOf(q)] === q.answer)
        };
      });
      onFinish(sessionLogs);
    };

    const q = MOCK_QUESTIONS[curr];
    const isPanic = pressure && timeLeft < 30;

    return (
      <div className={`test-full-screen ${isPanic ? 'panic-bg' : ''}`}>
        <header className="test-header">
          <span>{exam} - {pressure ? 'PRESSURE MODE' : 'MOCK #1'}</span>
          <div style={{ color: isPanic ? 'red' : 'inherit' }}>Time: {Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}</div>
          <button className="finish-btn" onClick={finish}>Submit System</button>
        </header>
        <div className="test-grid">
          <div className="q-side">
            <div className="q-box">
              <span className="q-num">ID: {q.id} | Topic: {q.topic}</span>
              <p>{q.text}</p>
              <div className="opts">
                {q.options.map((opt, i) => (
                  <button key={i} className={`opt-btn ${selected[curr] === i ? 'selected' : ''}`} onClick={() => handleSelect(i)}>{opt}</button>
                ))}
              </div>
              <div className="nav-btns">
                <button onClick={() => setCurr(Math.max(0, curr - 1))}>Back</button>
                <button style={{ background: 'var(--primary)', color: 'white' }} onClick={nextQ}>Commit & Next</button>
              </div>
            </div>
          </div>
          <div className="nav-side">
            <h3>Matrix Status</h3>
            <div className="nav-grid">
              {MOCK_QUESTIONS.map((_, i) => (
                <div key={i} className={`nav-i ${curr === i ? 'current' : ''} ${selected[i] !== undefined ? 'answered' : ''}`}>{i + 1}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const StudentDashboard = () => {
    const analytics = useMemo(() => {
      if (logs.length === 0) return null;
      const correct = logs.filter(l => l.correct).length;
      const score = (correct * 4) - ((logs.length - correct) * 1);
      const avgConf = Math.round(logs.reduce((acc, l) => acc + l.confIndex, 0) / logs.length);
      
      const behavior = logs.map(l => {
        const q = MOCK_QUESTIONS.find(mq => mq.id === l.qId);
        if (l.dwell > q.idealTime * 1.5) return { topic: q.topic, label: "Overthinking", color: "var(--warning)" };
        if (l.dwell < 10 && l.changes > 1) return { topic: q.topic, label: "Guessing", color: "var(--danger)" };
        return { topic: q.topic, label: "Balanced", color: "var(--success)" };
      });

      return { score, behavior, accuracy: Math.round((correct / logs.length) * 100), avgConf };
    }, [logs]);

    const intervention = analytics ? getIntervention(analytics) : null;

    return (
      <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        <div className="navbar" style={{ marginBottom: '2rem', borderRadius: '1rem' }}>
          <h2 className="logo-ai">Architect Console: {user.name}</h2>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => { setIsPressureMode(true); setView('test'); }} className="finish-btn" style={{ background: 'var(--danger)' }}>Pressure Mode</button>
            <button onClick={() => { setIsPressureMode(false); setView('test'); }} className="finish-btn">Standard Test</button>
          </div>
        </div>

        <div className="intelligence-grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
          {/* SYLLABUS & CONFIDENCE */}
          <div className="intel-card">
            <h3>Confidence Matrix & Syllabus</h3>
            <div style={{ display: 'flex', gap: '5px', marginTop: '1rem' }}>
              {Object.keys(EXAMS[exam].subjects).map(sub => (
                <button key={sub} className={`tab ${selectedSubject === sub ? 'active' : ''}`} onClick={() => setSelectedSubject(sub)}>{sub}</button>
              ))}
            </div>
            {selectedSubject && (
              <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {EXAMS[exam].subjects[selectedSubject].map(topic => (
                  <div key={topic} className="beh-tag">
                    <span>{topic}</span>
                    <span style={{ color: 'var(--secondary)' }}>CI: {Math.floor(Math.random() * 40) + 60}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PART 3: PROJECTION ENGINE */}
          <div className="intel-card predictive">
            <p className="beh-type">Score/Rank Projection</p>
            <h2 className="pred-score">{analytics ? analytics.score + 180 : '---'}</h2>
            <p style={{ color: 'var(--text-sub)' }}>Predicted Rank: {analytics ? '~4,200' : 'N/A'}</p>
            <hr style={{ margin: '1rem 0', opacity: 0.1 }} />
            <p className="beh-type">Improvement Gap</p>
            <h4 style={{ color: 'red' }}>+85 Marks potential</h4>
            <small>Bottleneck: Speed in Physics Mechanics</small>
          </div>
        </div>

        {/* PART 1 & 2: INTERVENTION & PLANNER */}
        {analytics && (
          <div className="intelligence-grid" style={{ marginTop: '2rem' }}>
            <div className="intel-card improvement">
              <p className="beh-type">AI Intervention Triggered</p>
              <h3>{intervention.type}</h3>
              <p>{intervention.task}</p>
              <button className="finish-btn" style={{ marginTop: '1rem' }}>{intervention.cta}</button>
            </div>
            <div className="intel-card">
              <p className="beh-type">Daily Adaptive Plan</p>
              <div className="behavior-tags">
                <div className="beh-tag"><span>09:00 AM</span><span>Concepts: Calculus (Weak)</span></div>
                <div className="beh-tag"><span>11:30 AM</span><span>Speed Drill: Chemistry</span></div>
                <div className="beh-tag"><span>04:00 PM</span><span>Review: Wrong Answers</span></div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const InstructorDashboard = () => (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div className="navbar" style={{ marginBottom: '2rem' }}>
        <h1 className="logo-ai">Instructor Intervention System</h1>
        <button className="finish-btn" onClick={() => setView('login')}>Logout</button>
      </div>
      <div className="intelligence-grid">
        <div className="intel-card" style={{ borderLeft: '8px solid var(--danger)' }}>
          <p className="beh-type">At-Risk Students (Overthinkers)</p>
          <div className="behavior-tags">
            <div className="beh-tag"><span>Rahul Sharma</span><button className="tab" style={{ padding: '2px 8px' }}>Assign Drill</button></div>
            <div className="beh-tag"><span>Aditi Singh</span><button className="tab" style={{ padding: '2px 8px' }}>Assign Drill</button></div>
          </div>
        </div>
        <div className="intel-card">
          <p className="beh-type">Collective Confidence Index</p>
          <h2 className="impact-value">64%</h2>
          <p>Class is guessing 22% of Calculus questions.</p>
        </div>
        <div className="intel-card predictive">
          <p className="beh-type">Competitive Benchmarking</p>
          <p>Student vs Topper Time Gap</p>
          <h3 style={{ color: 'var(--primary)' }}>+42s / question</h3>
        </div>
      </div>
    </div>
  );

  return view === 'login' ? <Login /> : (
    view === 'dashboard' ? <StudentDashboard /> : (
      view === 'test' ? <TestPortal pressure={isPressureMode} onFinish={(l) => { setLogs(l); setView('dashboard'); }} /> : <InstructorDashboard />
    )
  );
};

export default App;
