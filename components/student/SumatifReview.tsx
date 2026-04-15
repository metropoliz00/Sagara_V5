import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, Award, Calendar, BookOpen, ChevronRight, 
  CheckCircle, XCircle, Loader2, Search, Filter
} from 'lucide-react';
import { StudentExamResult, SumatifAssessment, User } from '../../types';
import { apiService } from '../../services/apiService';
import { motion, AnimatePresence } from 'framer-motion';

interface SumatifReviewProps {
  currentUser: User | null;
  activeClassId: string;
}

const SumatifReview: React.FC<SumatifReviewProps> = ({ currentUser, activeClassId }) => {
  const [results, setResults] = useState<StudentExamResult[]>([]);
  const [assessments, setAssessments] = useState<Record<string, SumatifAssessment>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser, activeClassId]);

  const fetchData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [resultsData, assessmentsData] = await Promise.all([
        apiService.getStudentExamResults(currentUser.id),
        apiService.getSumatifAssessments(activeClassId)
      ]);
      
      console.log("Fetched resultsData:", resultsData);
      console.log("Fetched assessmentsData:", assessmentsData);
      
      setResults(resultsData.sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime()));
      
      const assessmentMap: Record<string, SumatifAssessment> = {};
      assessmentsData.forEach(a => {
        assessmentMap[a.id] = a;
      });
      setAssessments(assessmentMap);
    } catch (error) {
      console.error("Error fetching review data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = results.filter(r => {
    const assessment = assessments[r.assessmentId];
    const title = assessment?.title || '';
    const subject = assessment?.subjectId || '';
    return title.toLowerCase().includes(searchTerm.toLowerCase()) || 
           subject.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <Award className="mr-2 text-blue-500" /> Hasil Sumatif
          </h1>
          <p className="text-slate-500">Riwayat nilai dan evaluasi ujian Anda</p>
        </div>
        
        <div className="relative w-full md:w-64">
          <input 
            type="text"
            placeholder="Cari ujian..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
          />
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredResults.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center shadow-sm">
            <ClipboardList size={64} className="mx-auto text-slate-200 mb-4" />
            <h3 className="text-xl font-bold text-slate-700">Belum ada riwayat ujian</h3>
            <p className="text-slate-500">Hasil ujian Anda akan muncul di sini setelah Anda menyelesaikan ujian.</p>
          </div>
        ) : (
          filteredResults.map((result, idx) => {
            const assessment = assessments[result.assessmentId];
            const scorePercent = Math.round((result.score / result.totalPoints) * 100);
            
            return (
              <motion.div 
                key={result.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all flex flex-col md:flex-row items-center gap-6"
              >
                <div className="flex-1 w-full">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      {assessment?.subjectId || 'Mata Pelajaran'}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center">
                      <Calendar size={12} className="mr-1" /> {new Date(result.completedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">{assessment?.title || 'Judul Ujian'}</h3>
                </div>

                <div className="flex items-center space-x-8 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0">
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Skor</p>
                    <div className={`text-3xl font-black ${scorePercent >= 75 ? 'text-emerald-500' : scorePercent >= 60 ? 'text-blue-500' : 'text-red-500'}`}>
                      {scorePercent}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Benar</p>
                    <div className="text-xl font-bold text-slate-700">
                      {result.score} <span className="text-slate-300 font-normal">/ {result.totalPoints}</span>
                    </div>
                  </div>

                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${scorePercent >= 75 ? 'bg-emerald-50 text-emerald-500' : 'bg-blue-50 text-blue-500'}`}>
                    {scorePercent >= 75 ? <CheckCircle size={24} /> : <Award size={24} />}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SumatifReview;
