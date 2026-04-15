import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardList, ChevronRight, Loader2, Timer, BookOpen, HelpCircle
} from 'lucide-react';
import { SumatifAssessment, User } from '../../types';
import { apiService } from '../../services/apiService';
import { motion, AnimatePresence } from 'framer-motion';

interface SumatifExamProps {
  currentUser: User | null;
  activeClassId: string;
}

const SumatifExam: React.FC<SumatifExamProps> = ({ currentUser, activeClassId }) => {
  const [assessments, setAssessments] = useState<SumatifAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAssessments();
  }, [activeClassId]);

  const fetchAssessments = async () => {
    setLoading(true);
    try {
      const data = await apiService.getSumatifAssessments(activeClassId);
      setAssessments(data.filter(a => a.isActive));
    } catch (error) {
      console.error("Error fetching assessments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenExam = (assessmentId: string) => {
    navigate(`/exam/${assessmentId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <AnimatePresence mode="wait">
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
                    onClick={() => handleOpenExam(assessment.id)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl transition-all flex items-center justify-center"
                  >
                    Mulai Ujian <ChevronRight size={18} className="ml-2" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default SumatifExam;
