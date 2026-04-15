import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, Plus, Edit2, Trash2, CheckCircle, XCircle, 
  ChevronRight, ChevronDown, Save, Loader2, AlertCircle,
  Key, BookOpen, Target, Settings, HelpCircle, Eye, Upload, Image as ImageIcon, FileSpreadsheet, Download
} from 'lucide-react';
import { SumatifAssessment, Question, User, StudentExamResult } from '../types';
import { apiService } from '../services/apiService';
import { MOCK_SUBJECTS } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { useRef } from 'react';
import CustomModal from './CustomModal';

const generateToken = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const ASSESSMENT_TITLES = ['SUM 1', 'SUM 2', 'SUM 3', 'SUM 4', 'SAS'];

interface SumatifAdminProps {
  currentUser: User | null;
  activeClassId: string;
}

const SumatifAdmin: React.FC<SumatifAdminProps> = ({ currentUser, activeClassId }) => {
  const [assessments, setAssessments] = useState<SumatifAssessment[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentAssessment, setCurrentAssessment] = useState<Partial<SumatifAssessment> | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [examResults, setExamResults] = useState<StudentExamResult[]>([]);
  const [isEditingQuestion, setIsEditingQuestion] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Partial<Question> | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'edit' | 'questions' | 'results'>('list');
  const [isSyncing, setIsSyncing] = useState(false);
  const excelInputRef = useRef<HTMLInputElement>(null);

  // Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    type: 'alert' | 'confirm' | 'success' | 'error';
    title?: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    type: 'alert',
    message: '',
    onConfirm: () => {}
  });

  const showAlert = (message: string, type: 'success' | 'error' | 'alert' = 'alert', title?: string) => {
    setModalConfig({
      isOpen: true,
      type,
      title,
      message,
      onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
    });
  };

  const showConfirm = (message: string, onConfirm: () => void, title?: string) => {
    setModalConfig({
      isOpen: true,
      type: 'confirm',
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setModalConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentAssessment?.id) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const newQuestions: Omit<Question, 'id'>[] = data.map((row, idx) => {
          const type = row.Tipe || 'pilihan-ganda';
          let options: string[] = [];
          let correctAnswer: any = row.JawabanBenar;

          if (type === 'pilihan-ganda' || type === 'pilihan-ganda-kompleks') {
            options = [row.OpsiA, row.OpsiB, row.OpsiC, row.OpsiD].filter(Boolean);
            if (type === 'pilihan-ganda-kompleks') {
              correctAnswer = String(row.JawabanBenar).split(',').map(s => s.trim());
            }
          } else if (type === 'benar-salah') {
            options = [row.Pernyataan1, row.Pernyataan2, row.Pernyataan3].filter(Boolean);
            const bsAnswers = String(row.JawabanBenar).split(',').map(s => s.trim());
            correctAnswer = {
              0: bsAnswers[0] || 'Benar',
              1: bsAnswers[1] || 'Benar',
              2: bsAnswers[2] || 'Benar'
            };
          }

          return {
            assessmentId: currentAssessment.id!,
            type,
            text: row.Pertanyaan || 'Pertanyaan Baru',
            imageUrl: row.LinkGambar || '',
            imageCaption: row.CaptionGambar || '',
            options,
            optionImages: [row.LinkGambarA, row.LinkGambarB, row.LinkGambarC, row.LinkGambarD].filter(Boolean),
            correctAnswer,
            points: parseInt(row.Poin) || 1,
            order: questions.length + idx + 1
          };
        });

        showConfirm(`Impor ${newQuestions.length} soal dari Excel?`, async () => {
          setLoading(true);
          try {
            for (const q of newQuestions) {
              await apiService.saveQuestion(q as any);
            }
            const updatedQuestions = await apiService.getQuestions(currentAssessment.id!);
            setQuestions(updatedQuestions);
            showAlert("Impor berhasil!", "success");
          } catch (err) {
            console.error("Error saving imported questions:", err);
            showAlert("Gagal menyimpan soal hasil impor.", "error");
          } finally {
            setLoading(false);
          }
        });
      } catch (err) {
        console.error("Error importing excel:", err);
        showAlert("Gagal mengimpor file. Pastikan format kolom sesuai.", "error");
      } finally {
        if (excelInputRef.current) excelInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDownloadTemplate = () => {
    const template = [
      {
        'Tipe': 'pilihan-ganda',
        'Pertanyaan': 'Ibu kota Indonesia adalah...',
        'OpsiA': 'Jakarta',
        'OpsiB': 'Bandung',
        'OpsiC': 'Surabaya',
        'OpsiD': 'Medan',
        'Pernyataan1': '',
        'Pernyataan2': '',
        'Pernyataan3': '',
        'JawabanBenar': 'Jakarta',
        'LinkGambar': '',
        'CaptionGambar': '',
        'LinkGambarA': '',
        'LinkGambarB': '',
        'LinkGambarC': '',
        'LinkGambarD': '',
        'Poin': 1
      },
      {
        'Tipe': 'pilihan-ganda-kompleks',
        'Pertanyaan': 'Pilih kota yang berada di Pulau Jawa:',
        'OpsiA': 'Jakarta',
        'OpsiB': 'Bandung',
        'OpsiC': 'Medan',
        'OpsiD': 'Makassar',
        'Pernyataan1': '',
        'Pernyataan2': '',
        'Pernyataan3': '',
        'JawabanBenar': 'Jakarta, Bandung',
        'LinkGambar': '',
        'CaptionGambar': '',
        'LinkGambarA': '',
        'LinkGambarB': '',
        'LinkGambarC': '',
        'LinkGambarD': '',
        'Poin': 1
      },
      {
        'Tipe': 'benar-salah',
        'Pertanyaan': 'Tentukan pernyataan berikut benar atau salah:',
        'OpsiA': '',
        'OpsiB': '',
        'OpsiC': '',
        'OpsiD': '',
        'Pernyataan1': 'Matahari terbit dari timur',
        'Pernyataan2': '1 + 1 = 3',
        'Pernyataan3': 'Indonesia merdeka tahun 1945',
        'JawabanBenar': 'Benar, Salah, Benar',
        'LinkGambar': '',
        'CaptionGambar': '',
        'LinkGambarA': '',
        'LinkGambarB': '',
        'LinkGambarC': '',
        'LinkGambarD': '',
        'Poin': 1
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Soal");
    XLSX.writeFile(wb, "Template_Soal_Sumatif.xlsx");
  };

  const handleSyncToGrades = async () => {
    if (!currentAssessment?.id || !currentAssessment?.subjectId || examResults.length === 0) return;
    
    const title = currentAssessment.title || '';
    const fieldMap: Record<string, string> = {
      'SUM 1': 'sum1',
      'SUM 2': 'sum2',
      'SUM 3': 'sum3',
      'SUM 4': 'sum4',
      'SAS': 'sas'
    };
    
    const field = fieldMap[title];
    if (!field) {
      showAlert("Judul asesmen tidak valid untuk sinkronisasi nilai (Harus SUM 1-4 atau SAS)", "error");
      return;
    }

    showConfirm(`Sinkronisasi ${examResults.length} nilai ke buku nilai (Kolom ${title})?`, async () => {
      setIsSyncing(true);
      try {
        for (const result of examResults) {
          await apiService.saveGrade(result.studentId, currentAssessment.subjectId!, {
            [field]: Math.round(result.score)
          } as any, activeClassId);
        }
        showAlert("Sinkronisasi berhasil!", "success");
      } catch (error) {
        console.error("Error syncing grades:", error);
        showAlert("Gagal melakukan sinkronisasi.", "error");
      } finally {
        setIsSyncing(false);
      }
    });
  };

  useEffect(() => {
    fetchAssessments();
    fetchStudents();
  }, [activeClassId]);

  const fetchStudents = async () => {
    try {
      const data = await apiService.getStudents(currentUser);
      setStudents(data);
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

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
    showConfirm("Hapus asesmen ini beserta semua pertanyaannya?", async () => {
      try {
        await apiService.deleteSumatifAssessment(id);
        setAssessments(prev => prev.filter(a => a.id !== id));
      } catch (error) {
        console.error("Error deleting assessment:", error);
        showAlert("Gagal menghapus asesmen.", "error");
      }
    });
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
    showConfirm("Hapus pertanyaan ini?", async () => {
      try {
        await apiService.deleteQuestion(id);
        setQuestions(prev => prev.filter(q => q.id !== id));
      } catch (error) {
        console.error("Error deleting question:", error);
        showAlert("Gagal menghapus pertanyaan.", "error");
      }
    });
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
              setCurrentAssessment({ 
                subjectId: MOCK_SUBJECTS[0].id, 
                isActive: true, 
                questionCount: 20,
                token: generateToken(),
                title: ASSESSMENT_TITLES[0]
              });
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
                      <button 
                        onClick={async () => {
                          setLoading(true);
                          setCurrentAssessment(assessment);
                          try {
                            const [qData, rData] = await Promise.all([
                              apiService.getQuestions(assessment.id),
                              apiService.getExamResults(assessment.id)
                            ]);
                            setQuestions(qData);
                            setExamResults(rData);
                            setActiveTab('results');
                          } catch (e) {
                            console.error(e);
                          } finally {
                            setLoading(false);
                          }
                        }} 
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                        title="Lihat Hasil & Analisis"
                      >
                        <Eye size={16}/>
                      </button>
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
                  <div className="relative flex space-x-2">
                    <input 
                      type="text"
                      value={currentAssessment?.token}
                      onChange={e => setCurrentAssessment(prev => ({ ...prev, token: e.target.value.toUpperCase() }))}
                      placeholder="CONTOH: MTK01"
                      className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold"
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setCurrentAssessment(prev => ({ ...prev, token: generateToken() }))}
                      className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                      title="Generate Token Baru"
                    >
                      <Key size={20} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Judul Asesmen</label>
                <select 
                  value={currentAssessment?.title}
                  onChange={e => setCurrentAssessment(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                >
                  {ASSESSMENT_TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Jumlah Soal Ditampilkan</label>
                  <input 
                    type="number"
                    value={currentAssessment?.questionCount}
                    onChange={e => setCurrentAssessment(prev => ({ ...prev, questionCount: parseInt(e.target.value) }))}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Durasi (Menit)</label>
                  <input 
                    type="number"
                    value={currentAssessment?.durationMinutes || 60}
                    onChange={e => setCurrentAssessment(prev => ({ ...prev, durationMinutes: parseInt(e.target.value) }))}
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
              <div className="flex flex-wrap gap-3">
                <input 
                  type="file" 
                  ref={excelInputRef} 
                  onChange={handleImportExcel} 
                  accept=".xlsx, .xls" 
                  className="hidden" 
                />
                <button 
                  onClick={handleDownloadTemplate}
                  className="bg-white text-slate-600 hover:bg-slate-50 px-6 py-3 rounded-2xl font-bold border border-slate-200 flex items-center transition-all"
                >
                  <Download size={20} className="mr-2" /> Template
                </button>
                <button 
                  onClick={() => excelInputRef.current?.click()}
                  className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-6 py-3 rounded-2xl font-bold border border-emerald-200 flex items-center transition-all"
                >
                  <FileSpreadsheet size={20} className="mr-2" /> Impor Excel
                </button>
                <button 
                  onClick={() => {
                    setCurrentQuestion({ 
                      type: 'pilihan-ganda', 
                      points: 1, 
                      options: ['', '', '', ''], 
                      optionImages: ['', '', '', ''],
                      correctAnswer: '',
                      imageUrl: '',
                      imageCaption: ''
                    });
                    setIsEditingQuestion(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg flex items-center transition-all"
                >
                  <Plus size={20} className="mr-2" /> Tambah Pertanyaan
                </button>
              </div>
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

                    {q.imageUrl && (
                      <div className="mb-4 space-y-2">
                        <img 
                          src={q.imageUrl} 
                          alt="Question" 
                          className="max-h-64 rounded-2xl border border-slate-100 object-contain bg-slate-50"
                          referrerPolicy="no-referrer"
                        />
                        {q.imageCaption && (
                          <p className="text-xs text-slate-500 italic px-2">{q.imageCaption}</p>
                        )}
                      </div>
                    )}

                    <p className="text-slate-800 font-medium mb-4">{q.text}</p>
                    
                    {q.type === 'pilihan-ganda' && q.options && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {q.options.map((opt, i) => (
                          <div key={i} className={`p-3 rounded-xl border text-sm flex flex-col gap-2 ${opt === q.correctAnswer ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                            {q.optionImages?.[i] && (
                              <img 
                                src={q.optionImages[i]} 
                                alt={`Option ${i}`} 
                                className="h-24 rounded-lg object-contain bg-white"
                                referrerPolicy="no-referrer"
                              />
                            )}
                            <div>{String.fromCharCode(65 + i)}. {opt}</div>
                            {opt === q.correctAnswer && <CheckCircle size={14} className="inline ml-2"/>}
                          </div>
                        ))}
                      </div>
                    )}

                    {q.type === 'pilihan-ganda-kompleks' && q.options && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {q.options.map((opt, i) => (
                          <div key={i} className={`p-3 rounded-xl border text-sm flex flex-col gap-2 ${Array.isArray(q.correctAnswer) && q.correctAnswer.includes(opt) ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                            {q.optionImages?.[i] && (
                              <img 
                                src={q.optionImages[i]} 
                                alt={`Option ${i}`} 
                                className="h-24 rounded-lg object-contain bg-white"
                                referrerPolicy="no-referrer"
                              />
                            )}
                            <div>{opt}</div>
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

        {activeTab === 'results' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-emerald-800">Rekap & Analisis: {currentAssessment?.title}</h2>
                <p className="text-emerald-600 text-sm">{examResults.length} Siswa telah mengerjakan</p>
              </div>
              <button 
                onClick={handleSyncToGrades}
                disabled={isSyncing || examResults.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg flex items-center disabled:opacity-50"
              >
                {isSyncing ? <Loader2 className="animate-spin mr-2" size={20}/> : <Save size={20} className="mr-2" />}
                Integrasikan ke Buku Nilai
              </button>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase sticky left-0 bg-slate-50 z-10">Nama Siswa</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center">Skor</th>
                      {questions.map((_, i) => (
                        <th key={i} className="p-4 text-xs font-bold text-slate-500 uppercase text-center border-l border-slate-100">S{i+1}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {examResults.map((result, rIdx) => {
                      const student = students.find(s => s.id === result.studentId);
                      const displayName = student?.name || result.studentName;
                      return (
                      <tr key={result.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="p-4 text-sm font-bold text-slate-700 sticky left-0 bg-white z-10">{displayName}</td>
                        <td className="p-4 text-sm font-bold text-blue-600 text-center">{Math.round(result.score)}</td>
                        {questions.map((q) => {
                          const studentAnswer = result.answers[q.id];
                          let isCorrect = false;
                          
                          if (q.type === 'pilihan-ganda' || q.type === 'benar-salah') {
                            isCorrect = studentAnswer === q.correctAnswer;
                          } else if (q.type === 'pilihan-ganda-kompleks') {
                            const correct = Array.isArray(q.correctAnswer) ? q.correctAnswer : [];
                            const student = Array.isArray(studentAnswer) ? studentAnswer : [];
                            isCorrect = correct.length === student.length && correct.every(val => student.includes(val));
                          }
                          
                          return (
                            <td key={q.id} className={`p-4 text-center border-l border-slate-50 font-mono font-bold ${isCorrect ? 'text-emerald-600' : 'text-red-400'}`}>
                              {isCorrect ? '1' : '0'}
                            </td>
                          );
                        })}
                      </tr>
                    )})}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold">
                    <tr>
                      <td className="p-4 text-xs text-slate-500 uppercase sticky left-0 bg-slate-50 z-10">Persentase Benar</td>
                      <td className="p-4"></td>
                      {questions.map((q) => {
                        const correctCount = examResults.filter(r => {
                          const studentAnswer = r.answers[q.id];
                          if (q.type === 'pilihan-ganda' || q.type === 'benar-salah') {
                            return studentAnswer === q.correctAnswer;
                          } else if (q.type === 'pilihan-ganda-kompleks') {
                            const correct = Array.isArray(q.correctAnswer) ? q.correctAnswer : [];
                            const student = Array.isArray(studentAnswer) ? studentAnswer : [];
                            return correct.length === student.length && correct.every(val => student.includes(val));
                          }
                          return false;
                        }).length;
                        const percent = examResults.length > 0 ? Math.round((correctCount / examResults.length) * 100) : 0;
                        return (
                          <td key={q.id} className="p-4 text-center border-l border-slate-100 text-blue-600 text-xs">
                            {percent}%
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td className="p-4 text-xs text-slate-500 uppercase sticky left-0 bg-slate-50 z-10">Tingkat Kesulitan</td>
                      <td className="p-4"></td>
                      {questions.map((q) => {
                        const correctCount = examResults.filter(r => {
                          const studentAnswer = r.answers[q.id];
                          if (q.type === 'pilihan-ganda' || q.type === 'benar-salah') {
                            return studentAnswer === q.correctAnswer;
                          } else if (q.type === 'pilihan-ganda-kompleks') {
                            const correct = Array.isArray(q.correctAnswer) ? q.correctAnswer : [];
                            const student = Array.isArray(studentAnswer) ? studentAnswer : [];
                            return correct.length === student.length && correct.every(val => student.includes(val));
                          }
                          return false;
                        }).length;
                        const percent = examResults.length > 0 ? (correctCount / examResults.length) * 100 : 0;
                        
                        let difficulty = 'Sedang';
                        let color = 'text-amber-600';
                        if (percent > 70) {
                          difficulty = 'Mudah';
                          color = 'text-emerald-600';
                        } else if (percent < 40) {
                          difficulty = 'Sulit';
                          color = 'text-red-600';
                        }
                        
                        return (
                          <td key={q.id} className={`p-4 text-center border-l border-slate-100 text-[10px] ${color}`}>
                            {difficulty}
                          </td>
                        );
                      })}
                    </tr>
                  </tfoot>
                </table>
              </div>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 flex items-center">
                      <ImageIcon size={14} className="mr-1" /> Link Gambar Soal (Opsional)
                    </label>
                    <input 
                      type="text"
                      value={currentQuestion?.imageUrl || ''}
                      onChange={e => setCurrentQuestion(prev => ({ ...prev, imageUrl: e.target.value }))}
                      placeholder="https://example.com/image.jpg"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Caption / Keterangan Gambar</label>
                    <input 
                      type="text"
                      value={currentQuestion?.imageCaption || ''}
                      onChange={e => setCurrentQuestion(prev => ({ ...prev, imageCaption: e.target.value }))}
                      placeholder="Contoh: Gambar 1.1 Struktur Sel"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {currentQuestion?.type === 'pilihan-ganda' && (
                  <div className="space-y-4">
                    <label className="text-sm font-bold text-slate-700">Opsi Jawaban (Pilih satu yang benar)</label>
                    <div className="grid grid-cols-1 gap-4">
                      {currentQuestion.options?.map((opt, i) => (
                        <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                          <div className="flex items-center space-x-3">
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
                              placeholder={`Teks Opsi ${String.fromCharCode(65 + i)}`}
                              className="flex-1 p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="pl-8">
                            <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center mb-1">
                              <ImageIcon size={10} className="mr-1" /> Link Gambar Opsi (Opsional)
                            </label>
                            <input 
                              type="text"
                              value={currentQuestion.optionImages?.[i] || ''}
                              onChange={e => {
                                const newImgs = [...(currentQuestion.optionImages || ['', '', '', ''])];
                                newImgs[i] = e.target.value;
                                setCurrentQuestion(prev => ({ ...prev, optionImages: newImgs }));
                              }}
                              placeholder="https://example.com/option-image.jpg"
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {currentQuestion?.type === 'pilihan-ganda-kompleks' && (
                  <div className="space-y-4">
                    <label className="text-sm font-bold text-slate-700">Opsi Jawaban (Pilih semua yang benar)</label>
                    <div className="grid grid-cols-1 gap-4">
                      {currentQuestion.options?.map((opt, i) => (
                        <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                          <div className="flex items-center space-x-3">
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
                              placeholder={`Teks Opsi ${i + 1}`}
                              className="flex-1 p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="pl-8">
                            <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center mb-1">
                              <ImageIcon size={10} className="mr-1" /> Link Gambar Opsi (Opsional)
                            </label>
                            <input 
                              type="text"
                              value={currentQuestion.optionImages?.[i] || ''}
                              onChange={e => {
                                const newImgs = [...(currentQuestion.optionImages || ['', '', '', ''])];
                                newImgs[i] = e.target.value;
                                setCurrentQuestion(prev => ({ ...prev, optionImages: newImgs }));
                              }}
                              placeholder="https://example.com/option-image.jpg"
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
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

      <CustomModal 
        isOpen={modalConfig.isOpen}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
        onConfirm={modalConfig.onConfirm}
        onCancel={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default SumatifAdmin;
