import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, Plus, Edit2, Trash2, CheckCircle, XCircle, 
  ChevronRight, ChevronDown, Save, Loader2, AlertCircle,
  Key, BookOpen, Target, Settings, HelpCircle, Eye
} from 'lucide-react';
import { SumatifAssessment, Question, User } from '../types';
import { apiService } from '../services/apiService';
import { MOCK_SUBJECTS } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

interface SumatifAdminProps {
  currentUser: User | null;
  activeClassId: string;
}

const SumatifAdmin: React.FC<SumatifAdminProps> = ({ currentUser, activeClassId }) => {
  const [assessments, setAssessments] = useState<SumatifAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentAssessment, setCurrentAssessment] = useState<Partial<SumatifAssessment> | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isEditingQuestion, setIsEditingQuestion] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Partial<Question> | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'edit' | 'questions'>('list');

  useEffect(() => {
    fetchAssessments();
  }, [activeClassId]);

  const fetchAssessments = async () => {
    setLoading(true);
    try {
      const data = await apiService.getSumatifAssessments(activeClassId);
      setAssessments(data);
    } catch (error) {
      console.error("Error fetching assessments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAssessment?.title || !currentAssessment?.token) return;

    try {
      const data = await apiService.saveSumatifAssessment({
        ...currentAssessment,
        classId: activeClassId,
        isActive: currentAssessment.isActive ?? false,
        questionCount: currentAssessment.questionCount ?? 10
      });
      
      if (currentAssessment.id) {
        setAssessments(prev => prev.map(a => a.id === data.id ? data : a));
      } else {
        setAssessments(prev => [data, ...prev]);
      }
      
      setIsEditing(false);
      setCurrentAssessment(null);
      setActiveTab('list');
    } catch (error) {
      console.error("Error saving assessment:", error);
    }
  };

  const handleDeleteAssessment = async (id: string) => {
    if (!window.confirm("Hapus asesmen ini beserta semua pertanyaannya?")) return;
    try {
      await apiService.deleteSumatifAssessment(id);
      setAssessments(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error("Error deleting assessment:", error);
    }
  };

  const handleEditQuestions = async (assessment: SumatifAssessment) => {
    setCurrentAssessment(assessment);
    setLoading(true);
    try {
      const data = await apiService.getQuestions(assessment.id);
      setQuestions(data);
      setActiveTab('questions');
    } catch (error) {
      console.error("Error fetching questions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuestion?.text || !currentAssessment?.id) return;

    try {
      const data = await apiService.saveQuestion({
        ...currentQuestion,
        assessmentId: currentAssessment.id,
        order: currentQuestion.order ?? questions.length + 1
      });

      if (currentQuestion.id) {
        setQuestions(prev => prev.map(q => q.id === data.id ? data : q));
      } else {
        setQuestions(prev => [...prev, data]);
      }

      setIsEditingQuestion(false);
      setCurrentQuestion(null);
    } catch (error) {
      console.error("Error saving question:", error);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!window.confirm("Hapus pertanyaan ini?")) return;
    try {
      await apiService.deleteQuestion(id);
      setQuestions(prev => prev.filter(q => q.id !== id));
    } catch (error) {
      console.error("Error deleting question:", error);
    }
  };

  if (loading && activeTab === 'list') {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <ClipboardList className="mr-2 text-blue-500" /> Pengaturan Sumatif
          </h1>
          <p className="text-slate-500">Kelola asesmen sumatif untuk Kelas {activeClassId}</p>
        </div>
        {activeTab === 'list' && (
          <button 
            onClick={() => {
              setCurrentAssessment({ subjectId: MOCK_SUBJECTS[0].id, isActive: true, questionCount: 10 });
              setActiveTab('edit');
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center shadow-lg transition-all"
          >
            <Plus size={20} className="mr-2" /> Tambah Asesmen
          </button>
        )}
        {activeTab !== 'list' && (
          <button 
            onClick={() => {
              setActiveTab('list');
              setCurrentAssessment(null);
              setQuestions([]);
            }}
            className="text-slate-500 hover:text-slate-700 font-medium"
          >
            Kembali ke Daftar
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'list' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {assessments.length === 0 ? (
              <div className="col-span-full bg-white p-12 rounded-3xl border-2 border-dashed border-slate-200 text-center">
                <ClipboardList size={64} className="mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-bold text-slate-700">Belum ada asesmen</h3>
                <p className="text-slate-500">Mulai dengan membuat asesmen sumatif baru.</p>
              </div>
            ) : (
              assessments.map(assessment => (
                <div key={assessment.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${assessment.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {assessment.isActive ? 'Aktif' : 'Nonaktif'}
                    </div>
                    <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setCurrentAssessment(assessment); setActiveTab('edit'); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16}/></button>
                      <button onClick={() => handleDeleteAssessment(assessment.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1">{assessment.title}</h3>
                  <p className="text-sm text-slate-500 mb-4 flex items-center">
                    <BookOpen size={14} className="mr-1" /> {MOCK_SUBJECTS.find(s => s.id === assessment.subjectId)?.name || assessment.subjectId}
                  </p>
                  
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center text-sm text-slate-600">
                      <Key size={14} className="mr-2 text-blue-400" /> Token: <span className="ml-1 font-mono font-bold text-blue-600">{assessment.token}</span>
                    </div>
                    <div className="flex items-center text-sm text-slate-600">
                      <HelpCircle size={14} className="mr-2 text-blue-400" /> {assessment.questionCount} Pertanyaan
                    </div>
                  </div>

                  <button 
                    onClick={() => handleEditQuestions(assessment)}
                    className="w-full bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 py-3 rounded-2xl font-bold transition-all flex items-center justify-center border border-slate-100"
                  >
                    <Settings size={18} className="mr-2" /> Kelola Soal
                  </button>
                </div>
              ))
            )}
          </motion.div>
        )}

        {activeTab === 'edit' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 max-w-2xl mx-auto"
          >
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
              {currentAssessment?.id ? <Edit2 className="mr-2 text-blue-500"/> : <Plus className="mr-2 text-blue-500"/>}
              {currentAssessment?.id ? 'Edit Asesmen' : 'Tambah Asesmen Baru'}
            </h2>
            <form onSubmit={handleSaveAssessment} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Mata Pelajaran</label>
                  <select 
                    value={currentAssessment?.subjectId}
                    onChange={e => setCurrentAssessment(prev => ({ ...prev, subjectId: e.target.value }))}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {MOCK_SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Token Akses</label>
                  <div className="relative">
                    <input 
                      type="text"
                      value={currentAssessment?.token}
                      onChange={e => setCurrentAssessment(prev => ({ ...prev, token: e.target.value.toUpperCase() }))}
                      placeholder="CONTOH: MTK01"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold"
                      required
                    />
                    <Key className="absolute right-3 top-3 text-slate-400" size={20} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Judul Asesmen</label>
                <input 
                  type="text"
                  value={currentAssessment?.title}
                  onChange={e => setCurrentAssessment(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Contoh: Sumatif Akhir Semester Ganjil"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Tujuan Pembelajaran</label>
                <textarea 
                  value={currentAssessment?.learningObjectives}
                  onChange={e => setCurrentAssessment(prev => ({ ...prev, learningObjectives: e.target.value }))}
                  placeholder="Tuliskan tujuan pembelajaran yang akan diukur..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Jumlah Soal Ditampilkan</label>
                  <input 
                    type="number"
                    value={currentAssessment?.questionCount}
                    onChange={e => setCurrentAssessment(prev => ({ ...prev, questionCount: parseInt(e.target.value) }))}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="flex items-center space-x-3 pt-8">
                  <input 
                    type="checkbox"
                    id="isActive"
                    checked={currentAssessment?.isActive}
                    onChange={e => setCurrentAssessment(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isActive" className="text-sm font-bold text-slate-700">Aktifkan Asesmen</label>
                </div>
              </div>

              <div className="flex space-x-4 pt-4">
                <button 
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl shadow-lg transition-all flex items-center justify-center"
                >
                  <Save size={20} className="mr-2" /> Simpan Asesmen
                </button>
                <button 
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-8 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Batal
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {activeTab === 'questions' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-blue-800">{currentAssessment?.title}</h2>
                <p className="text-blue-600 text-sm">Kelola bank soal untuk asesmen ini</p>
              </div>
              <button 
                onClick={() => {
                  setCurrentQuestion({ type: 'pilihan-ganda', points: 1, options: ['', '', '', ''], correctAnswer: '' });
                  setIsEditingQuestion(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg flex items-center"
              >
                <Plus size={20} className="mr-2" /> Tambah Pertanyaan
              </button>
            </div>

            <div className="space-y-4">
              {questions.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-slate-200 text-center">
                  <HelpCircle size={48} className="mx-auto text-slate-300 mb-4" />
                  <h3 className="text-lg font-bold text-slate-700">Belum ada pertanyaan</h3>
                  <p className="text-slate-500">Klik tombol di atas untuk mulai menambah soal.</p>
                </div>
              ) : (
                questions.map((q, idx) => (
                  <div key={q.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:border-blue-200 transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-3">
                        <span className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-sm">
                          {idx + 1}
                        </span>
                        <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase">
                          {q.type.replace('-', ' ')}
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <button onClick={() => { setCurrentQuestion(q); setIsEditingQuestion(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16}/></button>
                        <button onClick={() => handleDeleteQuestion(q.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                      </div>
                    </div>
                    <p className="text-slate-800 font-medium mb-4">{q.text}</p>
                    
                    {q.type === 'pilihan-ganda' && q.options && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {q.options.map((opt, i) => (
                          <div key={i} className={`p-3 rounded-xl border text-sm ${opt === q.correctAnswer ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                            {String.fromCharCode(65 + i)}. {opt}
                            {opt === q.correctAnswer && <CheckCircle size={14} className="inline ml-2"/>}
                          </div>
                        ))}
                      </div>
                    )}

                    {q.type === 'pilihan-ganda-kompleks' && q.options && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {q.options.map((opt, i) => (
                          <div key={i} className={`p-3 rounded-xl border text-sm ${Array.isArray(q.correctAnswer) && q.correctAnswer.includes(opt) ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                            {opt}
                            {Array.isArray(q.correctAnswer) && q.correctAnswer.includes(opt) && <CheckCircle size={14} className="inline ml-2"/>}
                          </div>
                        ))}
                      </div>
                    )}

                    {q.type === 'benar-salah' && (
                      <div className="flex space-x-4">
                        <div className={`px-4 py-2 rounded-xl border text-sm ${q.correctAnswer === 'Benar' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                          Benar {q.correctAnswer === 'Benar' && <CheckCircle size={14} className="inline ml-2"/>}
                        </div>
                        <div className={`px-4 py-2 rounded-xl border text-sm ${q.correctAnswer === 'Salah' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                          Salah {q.correctAnswer === 'Salah' && <CheckCircle size={14} className="inline ml-2"/>}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Question Editor Modal */}
      <AnimatePresence>
        {isEditingQuestion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-blue-600 text-white">
                <h3 className="text-xl font-bold flex items-center">
                  <Plus className="mr-2" /> {currentQuestion?.id ? 'Edit Pertanyaan' : 'Tambah Pertanyaan'}
                </h3>
                <button onClick={() => setIsEditingQuestion(false)} className="text-white/80 hover:text-white"><XCircle size={24}/></button>
              </div>
              
              <form onSubmit={handleSaveQuestion} className="p-8 space-y-6 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Tipe Pertanyaan</label>
                    <select 
                      value={currentQuestion?.type}
                      onChange={e => {
                        const type = e.target.value as any;
                        setCurrentQuestion(prev => ({ 
                          ...prev, 
                          type, 
                          options: type === 'benar-salah' ? [] : ['', '', '', ''],
                          correctAnswer: type === 'pilihan-ganda-kompleks' ? [] : ''
                        }));
                      }}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pilihan-ganda">Pilihan Ganda</option>
                      <option value="pilihan-ganda-kompleks">Pilihan Ganda Kompleks</option>
                      <option value="benar-salah">Benar / Salah</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Poin</label>
                    <input 
                      type="number"
                      value={currentQuestion?.points}
                      onChange={e => setCurrentQuestion(prev => ({ ...prev, points: parseInt(e.target.value) }))}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Teks Pertanyaan</label>
                  <textarea 
                    value={currentQuestion?.text}
                    onChange={e => setCurrentQuestion(prev => ({ ...prev, text: e.target.value }))}
                    placeholder="Tuliskan pertanyaan di sini..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-none"
                    required
                  />
                </div>

                {currentQuestion?.type === 'pilihan-ganda' && (
                  <div className="space-y-4">
                    <label className="text-sm font-bold text-slate-700">Opsi Jawaban (Pilih satu yang benar)</label>
                    <div className="grid grid-cols-1 gap-3">
                      {currentQuestion.options?.map((opt, i) => (
                        <div key={i} className="flex items-center space-x-3">
                          <input 
                            type="radio" 
                            name="correct" 
                            checked={opt !== '' && opt === currentQuestion.correctAnswer}
                            onChange={() => setCurrentQuestion(prev => ({ ...prev, correctAnswer: opt }))}
                            className="w-5 h-5 text-blue-600"
                            disabled={!opt}
                          />
                          <input 
                            type="text"
                            value={opt}
                            onChange={e => {
                              const newOpts = [...(currentQuestion.options || [])];
                              newOpts[i] = e.target.value;
                              setCurrentQuestion(prev => ({ ...prev, options: newOpts }));
                            }}
                            placeholder={`Opsi ${String.fromCharCode(65 + i)}`}
                            className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {currentQuestion?.type === 'pilihan-ganda-kompleks' && (
                  <div className="space-y-4">
                    <label className="text-sm font-bold text-slate-700">Opsi Jawaban (Pilih semua yang benar)</label>
                    <div className="grid grid-cols-1 gap-3">
                      {currentQuestion.options?.map((opt, i) => (
                        <div key={i} className="flex items-center space-x-3">
                          <input 
                            type="checkbox" 
                            checked={Array.isArray(currentQuestion.correctAnswer) && currentQuestion.correctAnswer.includes(opt)}
                            onChange={e => {
                              const current = Array.isArray(currentQuestion.correctAnswer) ? [...currentQuestion.correctAnswer] : [];
                              if (e.target.checked) {
                                current.push(opt);
                              } else {
                                const idx = current.indexOf(opt);
                                if (idx > -1) current.splice(idx, 1);
                              }
                              setCurrentQuestion(prev => ({ ...prev, correctAnswer: current }));
                            }}
                            className="w-5 h-5 text-blue-600 rounded"
                            disabled={!opt}
                          />
                          <input 
                            type="text"
                            value={opt}
                            onChange={e => {
                              const newOpts = [...(currentQuestion.options || [])];
                              newOpts[i] = e.target.value;
                              setCurrentQuestion(prev => ({ ...prev, options: newOpts }));
                            }}
                            placeholder={`Opsi ${i + 1}`}
                            className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {currentQuestion?.type === 'benar-salah' && (
                  <div className="space-y-6">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start">
                      <AlertCircle size={18} className="text-blue-500 mr-3 mt-0.5" />
                      <p className="text-xs text-blue-700 leading-relaxed">
                        Tipe Benar-Salah sekarang mendukung 3 sub-pernyataan untuk 1 soal utama. 
                        Masukkan pernyataan di kolom "Pertanyaan" di atas, lalu isi 3 sub-pernyataan di bawah ini.
                      </p>
                    </div>
                    
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sub-Pernyataan {i + 1}</span>
                        </div>
                        <input 
                          type="text"
                          value={currentQuestion.options?.[i] || ''}
                          onChange={e => {
                            const newOpts = [...(currentQuestion.options || ['', '', ''])];
                            newOpts[i] = e.target.value;
                            setCurrentQuestion(prev => ({ ...prev, options: newOpts }));
                          }}
                          placeholder={`Isi sub-pernyataan ${i + 1}...`}
                          className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                        <div className="flex space-x-4">
                          {['Benar', 'Salah'].map(val => (
                            <label key={val} className="flex items-center space-x-2 cursor-pointer">
                              <input 
                                type="radio" 
                                name={`bs-${i}`} 
                                checked={(currentQuestion.correctAnswer as Record<string, string>)?.[i] === val}
                                onChange={() => {
                                  const current = (currentQuestion.correctAnswer as Record<string, string>) || {};
                                  setCurrentQuestion(prev => ({ 
                                    ...prev, 
                                    correctAnswer: { ...current, [i]: val } 
                                  }));
                                }}
                                className="w-4 h-4 text-blue-600"
                              />
                              <span className="text-sm font-medium text-slate-700">{val}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex space-x-4 pt-6">
                  <button 
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg transition-all"
                  >
                    Simpan Pertanyaan
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsEditingQuestion(false)}
                    className="px-8 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SumatifAdmin;
