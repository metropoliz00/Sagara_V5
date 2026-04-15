import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, Key, Play, ChevronRight, ChevronLeft, 
  CheckCircle, AlertCircle, Loader2, Timer, Award,
  BookOpen, HelpCircle, Send
} from 'lucide-react';
import { SumatifAssessment, Question, User, StudentExamResult } from '../../types';
import { apiService } from '../../services/apiService';
import { motion, AnimatePresence } from 'framer-motion';

interface SumatifExamProps {
  currentUser: User | null;
  activeClassId: string;
}

const SumatifExam: React.FC<SumatifExamProps> = ({ currentUser, activeClassId }) => {
  const [assessments, setAssessments] = useState<SumatifAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [examState, setExamState] = useState<'list' | 'token' | 'intro' | 'active' | 'finished'>('list');
  const [selectedAssessment, setSelectedAssessment] = useState<SumatifAssessment | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState(0); // In seconds
  const [result, setResult] = useState<Partial<StudentExamResult> | null>(null);
  const [violationCount, setViolationCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    fetchAssessments();
  }, [activeClassId]);

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

  const fetchAssessments = async () => {
    setLoading(true);
    try {
      const data = await apiService.getSumatifAssessments(activeClassId);
      // Only show active assessments
      setAssessments(data.filter(a => a.isActive));
    } catch (error) {
      console.error("Error fetching assessments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleValidateToken = () => {
    if (!selectedAssessment) return;
    if (tokenInput.toUpperCase() === selectedAssessment.token.toUpperCase()) {
      setExamState('intro');
      setTokenError('');
    } else {
      setTokenError('Token yang Anda masukkan salah.');
    }
  };

  const handleStartExam = async () => {
    if (!selectedAssessment) return;
    setLoading(true);
    try {
      const allQuestions = await apiService.getQuestions(selectedAssessment.id);
      // Shuffle and limit questions
      const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, selectedAssessment.questionCount).map(q => {
        if (q.type === 'pilihan-ganda' && q.options) {
          // Filter empty options and shuffle
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
      setCurrentQuestionIdx(0);
      setViolationCount(0);
      setExamState('active');
      
      // Set timer based on durationMinutes or fallback
      const duration = selectedAssessment.durationMinutes || 60;
      setTimeLeft(duration * 60);

      // Request fullscreen
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

  const handleSubmitExam = async (force = false) => {
    if (!selectedAssessment || !currentUser) return;
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
          // Multiple sub-questions scoring
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
        assessmentId: selectedAssessment.id,
        studentId: currentUser.id,
        studentName: currentUser.fullName || currentUser.username || 'Siswa',
        score,
        totalPoints,
        answers
      };

      await apiService.saveExamResult(finalResult);

      // Automatically sync to grades if title matches SUM 1-4 or SAS
      const title = selectedAssessment.title || '';
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
          // Get the subject ID from the assessment
          const subjectId = selectedAssessment.subjectId;
          // Save to grades
          await apiService.saveGrade(currentUser.id, subjectId, {
            [field]: Math.round(score)
          } as any, activeClassId);
          console.log(`Successfully synced ${title} score to grades.`);
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

  // Timer effect
  useEffect(() => {
    if (examState === 'active' && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (examState === 'active' && timeLeft === 0) {
      handleSubmitExam();
    }
  }, [examState, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading && examState === 'list') {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <AnimatePresence mode="wait">
        {examState === 'list' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-slate-800 mb-2">Ujian Sumatif</h1>
              <p className="text-slate-500">Pilih ujian yang tersedia untuk dikerjakan</p>
            </div>

            {assessments.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center shadow-sm">
                <ClipboardList size={64} className="mx-auto text-slate-200 mb-4" />
                <h3 className="text-xl font-bold text-slate-700">Tidak ada ujian aktif</h3>
                <p className="text-slate-500">Belum ada jadwal ujian sumatif untuk kelas Anda saat ini.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {assessments.map(assessment => (
                  <div key={assessment.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all group">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                        <BookOpen size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">{assessment.title}</h3>
                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">{assessment.subjectId}</p>
                      </div>
                    </div>
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center text-sm text-slate-600">
                        <HelpCircle size={14} className="mr-2 text-blue-400" /> {assessment.questionCount} Pertanyaan
                      </div>
                      <div className="flex items-center text-sm text-slate-600">
                        <Timer size={14} className="mr-2 text-blue-400" /> {assessment.durationMinutes || 60} Menit
                      </div>
                    </div>
                    <button 
                      onClick={() => { setSelectedAssessment(assessment); setExamState('token'); }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl transition-all flex items-center justify-center"
                    >
                      Mulai Ujian <ChevronRight size={18} className="ml-2" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {examState === 'token' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 max-w-md mx-auto text-center"
          >
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
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-2xl font-mono font-bold tracking-widest focus:ring-2 focus:ring-blue-500 outline-none"
                autoFocus
              />
              {tokenError && (
                <p className="text-red-500 text-sm font-medium flex items-center justify-center">
                  <AlertCircle size={14} className="mr-1" /> {tokenError}
                </p>
              )}
              <div className="flex space-x-3 pt-4">
                <button 
                  onClick={handleValidateToken}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg transition-all"
                >
                  Verifikasi
                </button>
                <button 
                  onClick={() => setExamState('list')}
                  className="px-6 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Batal
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {examState === 'intro' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100"
          >
            <div className="flex items-center space-x-4 mb-8">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                <CheckCircle size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">{selectedAssessment?.title}</h2>
                <p className="text-slate-500">Token Terverifikasi</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-4">
                <h3 className="font-bold text-slate-700 border-b pb-2">Informasi Ujian</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Nama Siswa:</span>
                    <span className="font-bold text-slate-800">{currentUser?.fullName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">NISN:</span>
                    <span className="font-bold text-slate-800">{currentUser?.nisn || '-'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Mata Pelajaran:</span>
                    <span className="font-bold text-slate-800 uppercase">{selectedAssessment?.subjectId}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Jumlah Soal:</span>
                    <span className="font-bold text-slate-800">{selectedAssessment?.questionCount} Soal</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Waktu Pengerjaan:</span>
                    <span className="font-bold text-slate-800">{selectedAssessment?.durationMinutes || 60} Menit</span>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="font-bold text-slate-700 border-b pb-2">Instruksi</h3>
                <ul className="text-sm text-slate-600 space-y-2 list-disc pl-4">
                  <li>Pastikan koneksi internet Anda stabil.</li>
                  <li>Ujian akan berjalan dalam mode layar penuh (Fullscreen).</li>
                  <li><strong>DILARANG</strong> keluar dari mode layar penuh. Keluar dari layar penuh akan dihitung sebagai pelanggaran.</li>
                  <li>Jika melakukan pelanggaran sebanyak 3 kali, ujian akan otomatis diselesaikan.</li>
                  <li>Ujian akan berakhir otomatis jika waktu habis.</li>
                  <li>Klik tombol "Selesai" jika sudah yakin dengan semua jawaban.</li>
                </ul>
              </div>
            </div>

            <button 
              onClick={handleStartExam}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin mr-2" /> : <Play size={20} className="mr-2" />}
              Mulai Mengerjakan
            </button>
          </motion.div>
        )}

        {examState === 'active' && questions.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Warning Modal */}
            {showWarning && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center">
                  <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle size={40} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Peringatan Pelanggaran!</h2>
                  <p className="text-slate-600 mb-4">
                    Anda telah keluar dari mode layar penuh. Ini adalah pelanggaran ke-{violationCount} dari maksimal 3 pelanggaran.
                  </p>
                  <p className="text-sm text-red-500 font-bold mb-8">
                    Jika Anda melakukan 3 pelanggaran, ujian akan otomatis diakhiri.
                  </p>
                  <button 
                    onClick={async () => {
                      setShowWarning(false);
                      if (document.documentElement.requestFullscreen) {
                        await document.documentElement.requestFullscreen().catch(e => console.warn(e));
                      }
                    }}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-2xl transition-all"
                  >
                    Kembali ke Ujian
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center sticky top-4 z-10 gap-4">
              <div className="flex items-center space-x-4 w-full md:w-auto">
                {currentUser?.photo ? (
                  <img src={currentUser.photo} alt="Student" className="w-12 h-12 rounded-full object-cover border-2 border-blue-100" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">
                    {currentUser?.fullName?.charAt(0) || 'S'}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-slate-800">{currentUser?.fullName}</h3>
                  <p className="text-xs text-slate-500">NISN: {currentUser?.nisn || '-'}</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 w-full md:w-auto justify-between md:justify-end">
                <div className="flex flex-col items-end mr-4">
                  <span className="text-sm font-bold text-slate-500 mb-1">Soal {currentQuestionIdx + 1} dari {questions.length}</span>
                  <div className="h-2 w-32 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-300" 
                      style={{ width: `${((currentQuestionIdx + 1) / questions.length) * 100}%` }}
                    />
                  </div>
                </div>
                <div className={`flex items-center px-4 py-2 rounded-xl font-mono font-bold ${timeLeft < 60 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-blue-50 text-blue-600'}`}>
                  <Timer size={18} className="mr-2" /> {formatTime(timeLeft)}
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 min-h-[400px] flex flex-col">

              <div className="flex-1">
                {questions[currentQuestionIdx].imageUrl && (
                  <div className="mb-6 space-y-2">
                    <img 
                      src={questions[currentQuestionIdx].imageUrl} 
                      alt="Question" 
                      className="max-h-72 rounded-2xl border border-slate-100 object-contain bg-slate-50 w-full"
                      referrerPolicy="no-referrer"
                    />
                    {questions[currentQuestionIdx].imageCaption && (
                      <p className="text-xs text-slate-500 italic px-2">{questions[currentQuestionIdx].imageCaption}</p>
                    )}
                  </div>
                )}
                <p className="text-xl text-slate-800 font-medium leading-relaxed mb-8">
                  {questions[currentQuestionIdx].text}
                </p>

                {/* Question Options */}
                <div className="space-y-3">
                  {questions[currentQuestionIdx].type === 'pilihan-ganda' && questions[currentQuestionIdx].options?.map((opt, i) => (
                    <button 
                      key={i}
                      onClick={() => handleAnswer(questions[currentQuestionIdx].id, opt)}
                      className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex flex-col gap-3 ${answers[questions[currentQuestionIdx].id] === opt ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-100 hover:border-slate-200 text-slate-600'}`}
                    >
                      <div className="flex items-center w-full">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center mr-4 font-bold ${answers[questions[currentQuestionIdx].id] === opt ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="flex-1">{opt}</span>
                      </div>
                      {questions[currentQuestionIdx].optionImages?.[i] && (
                        <div className="pl-12 w-full">
                          <img 
                            src={questions[currentQuestionIdx].optionImages![i]} 
                            alt={`Option ${i}`} 
                            className="max-h-32 rounded-xl border border-slate-100 object-contain bg-white"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                    </button>
                  ))}

                  {questions[currentQuestionIdx].type === 'pilihan-ganda-kompleks' && questions[currentQuestionIdx].options?.map((opt, i) => (
                    <button 
                      key={i}
                      onClick={() => {
                        const current = Array.isArray(answers[questions[currentQuestionIdx].id]) ? [...answers[questions[currentQuestionIdx].id]] : [];
                        const idx = current.indexOf(opt);
                        if (idx > -1) current.splice(idx, 1);
                        else current.push(opt);
                        handleAnswer(questions[currentQuestionIdx].id, current);
                      }}
                      className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex flex-col gap-3 ${Array.isArray(answers[questions[currentQuestionIdx].id]) && answers[questions[currentQuestionIdx].id].includes(opt) ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-100 hover:border-slate-200 text-slate-600'}`}
                    >
                      <div className="flex items-center w-full">
                        <div className={`w-6 h-6 rounded border-2 mr-4 flex items-center justify-center ${Array.isArray(answers[questions[currentQuestionIdx].id]) && answers[questions[currentQuestionIdx].id].includes(opt) ? 'bg-blue-500 border-blue-500' : 'border-slate-300'}`}>
                          {Array.isArray(answers[questions[currentQuestionIdx].id]) && answers[questions[currentQuestionIdx].id].includes(opt) && <CheckCircle size={14} className="text-white"/>}
                        </div>
                        <span className="flex-1">{opt}</span>
                      </div>
                      {questions[currentQuestionIdx].optionImages?.[i] && (
                        <div className="pl-10 w-full">
                          <img 
                            src={questions[currentQuestionIdx].optionImages![i]} 
                            alt={`Option ${i}`} 
                            className="max-h-32 rounded-xl border border-slate-100 object-contain bg-white"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                    </button>
                  ))}

                  {questions[currentQuestionIdx].type === 'benar-salah' && (
                    <div className="space-y-4">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                          <p className="text-sm font-bold text-slate-700 mb-3">
                            {i + 1}. {questions[currentQuestionIdx].options?.[i] || `Pernyataan ${i + 1}`}
                          </p>
                          <div className="flex space-x-3">
                            {['Benar', 'Salah'].map(opt => (
                              <button 
                                key={opt}
                                onClick={() => {
                                  const current = (answers[questions[currentQuestionIdx].id] as Record<string, string>) || {};
                                  handleAnswer(questions[currentQuestionIdx].id, { ...current, [i]: opt });
                                }}
                                className={`flex-1 p-3 rounded-xl border-2 text-sm font-bold transition-all flex items-center justify-center ${
                                  (answers[questions[currentQuestionIdx].id] as Record<string, string>)?.[i] === opt 
                                    ? 'bg-blue-50 border-blue-500 text-blue-700' 
                                    : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center pt-8 border-t border-slate-100 mt-8">
                <button 
                  onClick={() => setCurrentQuestionIdx(prev => Math.max(0, prev - 1))}
                  disabled={currentQuestionIdx === 0}
                  className="px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all flex items-center disabled:opacity-0"
                >
                  <ChevronLeft size={20} className="mr-2" /> Sebelumnya
                </button>
                
                {currentQuestionIdx === questions.length - 1 ? (
                  <button 
                    onClick={() => handleSubmitExam()}
                    disabled={loading}
                    className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center"
                  >
                    {loading ? <Loader2 className="animate-spin mr-2" /> : <Send size={20} className="mr-2" />}
                    Selesai & Kumpulkan
                  </button>
                ) : (
                  <button 
                    onClick={() => setCurrentQuestionIdx(prev => Math.min(questions.length - 1, prev + 1))}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center"
                  >
                    Selanjutnya <ChevronRight size={20} className="ml-2" />
                  </button>
                )}
              </div>
            </div>

            {/* Question Navigator */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h4 className="text-sm font-bold text-slate-700 mb-4">Navigasi Soal</h4>
              <div className="flex flex-wrap gap-2">
                {questions.map((q, i) => (
                  <button 
                    key={q.id}
                    onClick={() => setCurrentQuestionIdx(i)}
                    className={`w-10 h-10 rounded-xl font-bold text-sm transition-all border-2 ${
                      currentQuestionIdx === i 
                        ? 'bg-blue-600 border-blue-600 text-white' 
                        : answers[q.id] 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                          : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {examState === 'finished' && result && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-12 rounded-[40px] shadow-2xl border border-slate-100 text-center max-w-lg mx-auto"
          >
            <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8">
              <Award size={48} />
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Ujian Selesai!</h2>
            <p className="text-slate-500 mb-8">Terima kasih telah mengerjakan ujian dengan jujur.</p>
            
            <div className="bg-slate-50 p-8 rounded-3xl mb-8">
              <p className="text-sm text-slate-500 uppercase font-bold tracking-widest mb-2">Skor Anda</p>
              <div className="text-6xl font-black text-blue-600">
                {Math.round((result.score || 0) / (result.totalPoints || 1) * 100)}
              </div>
              <p className="text-slate-400 mt-2 font-medium">{result.score} benar dari {questions.length} soal</p>
            </div>

            <button 
              onClick={() => {
                setExamState('list');
                setSelectedAssessment(null);
                setResult(null);
              }}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl shadow-lg transition-all"
            >
              Kembali ke Dashboard
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SumatifExam;
