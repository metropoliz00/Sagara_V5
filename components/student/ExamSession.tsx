import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Key, Play, ChevronRight, ChevronLeft, 
  CheckCircle, AlertCircle, Loader2, Timer, Award,
  Flag, Monitor, ClipboardList
} from 'lucide-react';
import { SumatifAssessment, Question, User, StudentExamResult } from '../../types';
import { apiService } from '../../services/apiService';
import { motion, AnimatePresence } from 'framer-motion';

interface ExamSessionProps {
  assessmentId?: string;
  onClose?: () => void;
}

const ExamSession: React.FC<ExamSessionProps> = ({ assessmentId: propAssessmentId, onClose }) => {
  const { assessmentId: paramAssessmentId } = useParams<{ assessmentId: string }>();
  const assessmentId = propAssessmentId || paramAssessmentId;
  const navigate = useNavigate();
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [assessment, setAssessment] = useState<SumatifAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [examState, setExamState] = useState<'token' | 'intro' | 'active' | 'finished'>('token');
  const [tokenInput, setTokenInput] = useState('');
  const [tokenError, setTokenError] = useState('');
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [doubtful, setDoubtful] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState<Partial<StudentExamResult> | null>(null);
  const [violationCount, setViolationCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [showQuestionList, setShowQuestionList] = useState(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');

  const [studentName, setStudentName] = useState<string>('');

  useEffect(() => {
    const user = localStorage.getItem('sagara_user');
    if (user) {
      const parsedUser = JSON.parse(user);
      setCurrentUser(parsedUser);
      setStudentName(parsedUser.fullName || parsedUser.username || 'Siswa');
      
      // If fullName is missing, try to fetch from students list
      if (!parsedUser.fullName && parsedUser.studentId) {
        apiService.getStudents(parsedUser).then(students => {
          const student = students.find(s => s.id === parsedUser.studentId);
          if (student && student.name) {
            setStudentName(student.name);
            // Update local storage to prevent future fetches
            const updatedUser = { ...parsedUser, fullName: student.name };
            localStorage.setItem('sagara_user', JSON.stringify(updatedUser));
            setCurrentUser(updatedUser);
          }
        });
      }
    } else {
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    if (assessmentId && currentUser) {
      fetchAssessment();
    }
  }, [assessmentId, currentUser]);

  const fetchAssessment = async () => {
    setLoading(true);
    try {
      const data = await apiService.getSumatifAssessments(currentUser?.classId || '');
      const found = data.find(a => a.id === assessmentId);
      if (found) {
        setAssessment(found);
      } else {
        alert("Ujian tidak ditemukan.");
        window.close();
      }
    } catch (error) {
      console.error("Error fetching assessment:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (examState === 'active' && !document.fullscreenElement) {
        setViolationCount(prev => {
          const newCount = prev + 1;
          if (newCount >= 3) {
            handleSubmitExam(true);
          } else {
            setShowWarning(true);
          }
          return newCount;
        });
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [examState]);

  const handleValidateToken = () => {
    if (!assessment) return;
    if (tokenInput.toUpperCase() === assessment.token.toUpperCase()) {
      setExamState('intro');
      setTokenError('');
    } else {
      setTokenError('Token yang Anda masukkan salah.');
    }
  };

  const handleStartExam = async () => {
    if (!assessment) return;
    setLoading(true);
    try {
      const allQuestions = await apiService.getQuestions(assessment.id);
      const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, assessment.questionCount).map(q => {
        if (q.type === 'pilihan-ganda' && q.options) {
          const validOptions = q.options
            .map((opt, idx) => ({ opt, img: q.optionImages?.[idx] || '' }))
            .filter(o => o.opt && o.opt.trim() !== '');
          const shuffledOptions = validOptions.sort(() => 0.5 - Math.random());
          return {
            ...q,
            options: shuffledOptions.map(o => o.opt),
            optionImages: shuffledOptions.map(o => o.img)
          } as Question;
        }
        return q as Question;
      });
      setQuestions(selected);
      setAnswers({});
      setDoubtful({});
      setCurrentQuestionIdx(0);
      setViolationCount(0);
      setExamState('active');
      
      const duration = assessment.durationMinutes || 60;
      setTimeLeft(duration * 60);

      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen().catch(e => console.warn("Fullscreen error:", e));
      }
    } catch (error) {
      console.error("Error starting exam:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId: string, answer: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const toggleDoubtful = (questionId: string) => {
    setDoubtful(prev => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const handleSubmitExam = async (force = false) => {
    if (!assessment || !currentUser) return;
    if (!force && !window.confirm("Apakah Anda yakin ingin mengakhiri ujian?")) return;

    setLoading(true);
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(e => console.warn("Exit fullscreen error:", e));
      }
      let score = 0;
      let totalPoints = 0;

      questions.forEach(q => {
        totalPoints += q.points;
        const studentAnswer = answers[q.id];
        
        if (q.type === 'pilihan-ganda') {
          if (studentAnswer === q.correctAnswer) score += q.points;
        } else if (q.type === 'benar-salah') {
          const correct = q.correctAnswer as Record<string, string>;
          const student = studentAnswer as Record<string, string>;
          let allCorrect = true;
          [0, 1, 2].forEach(i => {
            if (!student || student[i] !== correct[i]) allCorrect = false;
          });
          if (allCorrect) score += q.points;
        } else if (q.type === 'pilihan-ganda-kompleks') {
          const correct = Array.isArray(q.correctAnswer) ? q.correctAnswer : [];
          const student = Array.isArray(studentAnswer) ? studentAnswer : [];
          if (correct.length === student.length && correct.every(val => student.includes(val))) {
            score += q.points;
          }
        }
      });

      const finalResult: Omit<StudentExamResult, 'id' | 'completedAt'> = {
        assessmentId: assessment.id,
        studentId: currentUser.id,
        studentName: studentName,
        score,
        totalPoints,
        answers
      };

      await apiService.saveExamResult(finalResult);

      const title = assessment.title || '';
      const fieldMap: Record<string, string> = {
        'SUM 1': 'sum1',
        'SUM 2': 'sum2',
        'SUM 3': 'sum3',
        'SUM 4': 'sum4',
        'SAS': 'sas'
      };
      const field = fieldMap[title];
      if (field) {
        try {
          await apiService.saveGrade(currentUser.id, assessment.subjectId, {
            [field]: Math.round(score)
          } as any, currentUser.classId || '');
        } catch (e) {
          console.warn("Failed to auto-sync score to grades:", e);
        }
      }

      setResult(finalResult);
      setExamState('finished');
    } catch (error) {
      console.error("Error submitting exam:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (examState === 'active' && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (examState === 'active' && timeLeft === 0) {
      handleSubmitExam(true);
    }
  }, [examState, timeLeft]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')} : ${m.toString().padStart(2, '0')} : ${s.toString().padStart(2, '0')}`;
  };

  if (loading && examState === 'token') {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  if (examState === 'token') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Key size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Masukkan Token</h2>
          <p className="text-slate-500 mb-8">Silakan masukkan token ujian yang diberikan oleh guru Anda.</p>
          
          <div className="space-y-4">
            <input 
              type="text"
              value={tokenInput}
              onChange={e => setTokenInput(e.target.value.toUpperCase())}
              placeholder="TOKEN"
              className="w-full text-center text-2xl tracking-[0.5em] font-mono font-bold bg-slate-50 border border-slate-200 rounded-2xl py-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none uppercase"
            />
            {tokenError && <p className="text-red-500 text-sm font-bold animate-shake">{tokenError}</p>}
            <button 
              onClick={handleValidateToken}
              disabled={!tokenInput}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
            >
              Validasi Token
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (examState === 'intro') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 max-w-2xl w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full mb-4">
              <CheckCircle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Token Valid!</h2>
            <p className="text-slate-500">Anda siap untuk memulai ujian.</p>
          </div>

          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-8 space-y-4">
            <div className="grid grid-cols-3 gap-4 border-b border-slate-200 pb-4">
              <div className="text-slate-500 text-sm">Mata Pelajaran</div>
              <div className="col-span-2 font-bold text-slate-800 uppercase">{assessment?.subjectId}</div>
            </div>
            <div className="grid grid-cols-3 gap-4 border-b border-slate-200 pb-4">
              <div className="text-slate-500 text-sm">Nama Siswa</div>
              <div className="col-span-2 font-bold text-slate-800 uppercase">{studentName}</div>
            </div>
            <div className="grid grid-cols-3 gap-4 border-b border-slate-200 pb-4">
              <div className="text-slate-500 text-sm">NISN</div>
              <div className="col-span-2 font-bold text-slate-800">{currentUser?.nisn || '-'}</div>
            </div>
            <div className="grid grid-cols-3 gap-4 border-b border-slate-200 pb-4">
              <div className="text-slate-500 text-sm">Jumlah Soal</div>
              <div className="col-span-2 font-bold text-slate-800">{assessment?.questionCount} Butir</div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-slate-500 text-sm">Waktu</div>
              <div className="col-span-2 font-bold text-slate-800">{assessment?.durationMinutes || 60} Menit</div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-8 flex items-start">
            <AlertCircle className="text-amber-600 mr-3 shrink-0 mt-0.5" size={20} />
            <div className="text-sm text-amber-800">
              <p className="font-bold mb-1">Perhatian!</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Ujian akan berjalan dalam mode layar penuh (fullscreen).</li>
                <li>Menekan tombol ESC atau keluar dari layar penuh akan dicatat sebagai pelanggaran.</li>
                <li>Jika Anda melakukan 3 kali pelanggaran, ujian akan otomatis diakhiri.</li>
              </ul>
            </div>
          </div>

          <button 
            onClick={handleStartExam}
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-emerald-200 flex items-center justify-center text-lg"
          >
            {loading ? <Loader2 className="animate-spin mr-2" /> : <Play className="mr-2" />}
            Mulai Kerjakan
          </button>
        </div>
      </div>
    );
  }

  if (examState === 'finished') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-12 rounded-3xl shadow-xl border border-slate-100 max-w-lg w-full text-center">
          <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Award size={48} />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Ujian Selesai!</h2>
          <p className="text-slate-500 mb-8">Terima kasih telah menyelesaikan ujian ini.</p>
          
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-8">
            <div className="text-sm text-slate-500 mb-1">Skor Anda</div>
            <div className="text-5xl font-black text-blue-600">{Math.round(result?.score || 0)}</div>
          </div>

          <button 
            onClick={() => onClose ? onClose() : navigate('/')}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 rounded-2xl transition-all"
          >
            Tutup Jendela
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestionIdx];
  const textSizeClass = fontSize === 'normal' ? 'text-base' : fontSize === 'large' ? 'text-lg' : 'text-xl';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
            <Monitor size={20} />
          </div>
          <h1 className="text-xl font-bold text-indigo-600">Computer Based Test</h1>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="flex items-center bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full font-mono font-bold border border-indigo-100">
            <Timer size={18} className="mr-2" />
            {formatTime(timeLeft)}
          </div>
          
          <div className="flex items-center text-right">
            <div className="mr-3">
              <div className="font-bold text-slate-800 text-sm">{studentName}</div>
              <div className="text-xs text-slate-500">{assessment?.subjectId}</div>
            </div>
            <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-600">
              {(studentName || 'S')[0].toUpperCase()}
            </div>
          </div>

          <button 
            onClick={() => setShowQuestionList(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold flex items-center transition-colors"
          >
            <ClipboardList size={18} className="mr-2" />
            Daftar Soal
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 flex flex-col">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg font-bold text-sm">
                SOAL NO. {currentQuestionIdx + 1}
              </div>
              <div className="text-slate-400 text-sm font-medium">
                (Total: {questions.length})
              </div>
              {currentQ?.type === 'pilihan-ganda-kompleks' && (
                <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">
                  Pilih Jawaban Lebih Dari Satu
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded-lg p-1">
              <button onClick={() => setFontSize('normal')} className={`px-3 py-1 rounded text-sm font-bold ${fontSize === 'normal' ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}>A-</button>
              <button onClick={() => setFontSize('large')} className={`px-3 py-1 rounded text-sm font-bold ${fontSize === 'large' ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}>A</button>
              <button onClick={() => setFontSize('xlarge')} className={`px-3 py-1 rounded text-sm font-bold ${fontSize === 'xlarge' ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}>A+</button>
            </div>
          </div>

          {/* Question Content */}
          <div className="p-8 flex-1 overflow-y-auto">
            {currentQ && (
              <div className={`space-y-8 ${textSizeClass} text-slate-800`}>
                {currentQ.imageUrl && (
                  <div className="mb-6">
                    <img src={currentQ.imageUrl} alt="Soal" className="max-h-80 rounded-xl object-contain" referrerPolicy="no-referrer" />
                    {currentQ.imageCaption && <p className="text-sm text-slate-500 mt-2 italic">{currentQ.imageCaption}</p>}
                  </div>
                )}
                
                <div className="leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: currentQ.text }} />

                {/* Options */}
                <div className="mt-8">
                  {currentQ.type === 'pilihan-ganda' && currentQ.options && (
                    <div className="space-y-4">
                      {currentQ.options.map((opt, idx) => (
                        <label key={idx} className={`flex items-center p-4 rounded-xl border cursor-pointer transition-all ${answers[currentQ.id] === opt ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}`}>
                          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mr-4 shrink-0 font-bold ${answers[currentQ.id] === opt ? 'border-indigo-600 text-indigo-600' : 'border-slate-300 text-slate-500'}`}>
                            {String.fromCharCode(65 + idx)}
                          </div>
                          <div className="flex-1">
                            {currentQ.optionImages?.[idx] && (
                              <img src={currentQ.optionImages[idx]} alt={`Opsi ${idx}`} className="h-32 object-contain mb-2 rounded-lg" referrerPolicy="no-referrer" />
                            )}
                            <span>{opt}</span>
                          </div>
                          <input 
                            type="radio" 
                            name={`q-${currentQ.id}`} 
                            value={opt}
                            checked={answers[currentQ.id] === opt}
                            onChange={() => handleAnswer(currentQ.id, opt)}
                            className="hidden"
                          />
                        </label>
                      ))}
                    </div>
                  )}

                  {currentQ.type === 'pilihan-ganda-kompleks' && currentQ.options && (
                    <div className="space-y-4">
                      {currentQ.options.map((opt, idx) => {
                        const isChecked = Array.isArray(answers[currentQ.id]) && answers[currentQ.id].includes(opt);
                        return (
                          <label key={idx} className={`flex items-center p-4 rounded-xl border cursor-pointer transition-all ${isChecked ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}`}>
                            <div className={`w-6 h-6 rounded border-2 flex items-center justify-center mr-4 shrink-0 ${isChecked ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'}`}>
                              {isChecked && <CheckCircle size={16} />}
                            </div>
                            <div className="flex-1">
                              {currentQ.optionImages?.[idx] && (
                                <img src={currentQ.optionImages[idx]} alt={`Opsi ${idx}`} className="h-32 object-contain mb-2 rounded-lg" referrerPolicy="no-referrer" />
                              )}
                              <span>{opt}</span>
                            </div>
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={(e) => {
                                const currentAnswers = Array.isArray(answers[currentQ.id]) ? [...answers[currentQ.id]] : [];
                                if (e.target.checked) {
                                  handleAnswer(currentQ.id, [...currentAnswers, opt]);
                                } else {
                                  handleAnswer(currentQ.id, currentAnswers.filter(a => a !== opt));
                                }
                              }}
                              className="hidden"
                            />
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {currentQ.type === 'benar-salah' && currentQ.options && (
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="p-4 font-bold text-slate-600 text-sm uppercase">Pernyataan</th>
                            <th className="p-4 font-bold text-slate-600 text-sm uppercase text-center w-24">Benar</th>
                            <th className="p-4 font-bold text-slate-600 text-sm uppercase text-center w-24">Salah</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {currentQ.options.map((stmt: string, idx: number) => {
                            if (!stmt) return null;
                            const currentAns = answers[currentQ.id]?.[idx];
                            return (
                              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4">{stmt}</td>
                                <td className="p-4 text-center">
                                  <label className="inline-flex items-center justify-center w-full h-full cursor-pointer">
                                    <input 
                                      type="radio" 
                                      name={`q-${currentQ.id}-stmt-${idx}`} 
                                      checked={currentAns === 'Benar'}
                                      onChange={() => {
                                        const newAns = { ...(answers[currentQ.id] || {}) };
                                        newAns[idx] = 'Benar';
                                        handleAnswer(currentQ.id, newAns);
                                      }}
                                      className="w-5 h-5 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                                    />
                                  </label>
                                </td>
                                <td className="p-4 text-center">
                                  <label className="inline-flex items-center justify-center w-full h-full cursor-pointer">
                                    <input 
                                      type="radio" 
                                      name={`q-${currentQ.id}-stmt-${idx}`} 
                                      checked={currentAns === 'Salah'}
                                      onChange={() => {
                                        const newAns = { ...(answers[currentQ.id] || {}) };
                                        newAns[idx] = 'Salah';
                                        handleAnswer(currentQ.id, newAns);
                                      }}
                                      className="w-5 h-5 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                                    />
                                  </label>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer Controls */}
      <footer className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between">
        <button 
          onClick={() => setCurrentQuestionIdx(prev => Math.max(0, prev - 1))}
          disabled={currentQuestionIdx === 0}
          className="bg-[#E53935] hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold flex items-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={20} className="mr-2" /> SEBELUMNYA
        </button>

        <label className="flex items-center bg-[#FFCA28] hover:bg-yellow-500 text-yellow-900 px-6 py-3 rounded-lg font-bold cursor-pointer transition-colors">
          <input 
            type="checkbox" 
            className="w-5 h-5 mr-3 rounded border-yellow-600 text-yellow-600 focus:ring-yellow-500"
            checked={!!doubtful[currentQ?.id]}
            onChange={() => toggleDoubtful(currentQ?.id)}
          />
          RAGU <Flag size={18} className="ml-2" />
        </label>

        {currentQuestionIdx === questions.length - 1 ? (
          <button 
            onClick={() => handleSubmitExam()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-bold flex items-center transition-colors"
          >
            SELESAI <CheckCircle size={20} className="ml-2" />
          </button>
        ) : (
          <button 
            onClick={() => setCurrentQuestionIdx(prev => Math.min(questions.length - 1, prev + 1))}
            className="bg-[#2962FF] hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold flex items-center transition-colors"
          >
            BERIKUTNYA <ChevronRight size={20} className="ml-2" />
          </button>
        )}
      </footer>

      {/* Warning Modal */}
      <AnimatePresence>
        {showWarning && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={40} />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Peringatan Pelanggaran!</h3>
              <p className="text-slate-600 mb-6">
                Anda telah keluar dari mode layar penuh. Ini dicatat sebagai pelanggaran ke-{violationCount}.
                <br/><br/>
                <strong className="text-red-600">Jika mencapai 3 pelanggaran, ujian akan otomatis diakhiri.</strong>
              </p>
              <button 
                onClick={async () => {
                  setShowWarning(false);
                  if (document.documentElement.requestFullscreen) {
                    await document.documentElement.requestFullscreen().catch(e => console.warn("Fullscreen error:", e));
                  }
                }}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-2xl transition-all"
              >
                Kembali ke Ujian
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Daftar Soal Modal */}
      <AnimatePresence>
        {showQuestionList && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 pt-20"
          >
            <motion.div 
              initial={{ scale: 0.9, y: -20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h3 className="font-bold text-slate-800 flex items-center">
                  <ClipboardList size={20} className="mr-2 text-indigo-600" />
                  Daftar Soal
                </h3>
                <button 
                  onClick={() => setShowQuestionList(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 transition-colors"
                >
                  <span className="font-bold">X</span>
                </button>
              </div>
              <div className="p-6 overflow-y-auto">
                <div className="flex items-center space-x-6 mb-6 text-sm">
                  <div className="flex items-center"><div className="w-4 h-4 bg-blue-600 rounded mr-2"></div> Dijawab</div>
                  <div className="flex items-center"><div className="w-4 h-4 bg-yellow-400 rounded mr-2"></div> Ragu-ragu</div>
                  <div className="flex items-center"><div className="w-4 h-4 bg-white border border-slate-300 rounded mr-2"></div> Belum Dijawab</div>
                </div>
                <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-3">
                  {questions.map((q, idx) => {
                    const isAnswered = answers[q.id] !== undefined && 
                      (q.type === 'benar-salah' ? Object.keys(answers[q.id] || {}).length === q.options?.filter((s: string) => s).length : 
                       q.type === 'pilihan-ganda-kompleks' ? answers[q.id].length > 0 : true);
                    const isDoubtful = doubtful[q.id];
                    const isCurrent = currentQuestionIdx === idx;
                    
                    let bgColor = 'bg-white border-slate-300 text-slate-600';
                    if (isDoubtful) bgColor = 'bg-yellow-400 border-yellow-500 text-yellow-900';
                    else if (isAnswered) bgColor = 'bg-blue-600 border-blue-700 text-white';

                    return (
                      <button
                        key={q.id}
                        onClick={() => {
                          setCurrentQuestionIdx(idx);
                          setShowQuestionList(false);
                        }}
                        className={`
                          h-12 rounded-lg font-bold text-sm transition-all border
                          ${isCurrent ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}
                          ${bgColor} hover:opacity-80
                        `}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExamSession;
