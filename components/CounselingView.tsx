
import React, { useState, useMemo, useRef } from 'react';
import { Student, BehaviorLog } from '../types';
import * as XLSX from 'xlsx';
import { 
  HeartHandshake, MessageCircle, AlertTriangle, Star, Calendar, 
  CheckCircle2, Plus, X, Printer, FileSpreadsheet, Upload, Download,
  TrendingUp, TrendingDown, Filter, LayoutDashboard, List
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend 
} from 'recharts';

interface CounselingViewProps {
  students: Student[];
  logs: BehaviorLog[];
  onCreateLog: (log: BehaviorLog) => void;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
  classId: string;
}

type LogType = 'positive' | 'negative' | 'counseling';
type FilterType = 'all' | LogType;

const CounselingView: React.FC<CounselingViewProps> = ({ students, logs, onCreateLog, onShowNotification, classId }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<LogType>('positive');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form State
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [point, setPoint] = useState(0);

  // --- ANALYTICS CALCULATION ---
  const stats = useMemo(() => {
    const positive = logs.filter(l => l.type === 'positive').length;
    const negative = logs.filter(l => l.type === 'negative').length;
    const counseling = logs.filter(l => l.type === 'counseling').length;
    const pending = logs.filter(l => l.status === 'Pending').length;
    return { positive, negative, counseling, pending, total: logs.length };
  }, [logs]);

  const studentScores = useMemo(() => {
    return students.map(s => {
       const sLogs = logs.filter(l => l.studentId === s.id);
       const achievementPoints = sLogs.filter(l => l.type === 'positive').reduce((acc, curr) => acc + Math.abs(curr.point), 0);
       const violationPoints = sLogs.filter(l => l.type === 'negative').reduce((acc, curr) => acc + Math.abs(curr.point), 0);
       const netScore = achievementPoints - violationPoints;
       return { name: s.name, score: netScore, achievementPoints, violationPoints };
    })
    .filter(s => s.score !== 0) 
    .sort((a,b) => b.score - a.score); 
  }, [students, logs]);

  const topStudents = studentScores.slice(0, 5);

  const pieData = [
    { name: 'Positif', value: stats.positive, color: '#10B981' }, 
    { name: 'Negatif', value: stats.negative, color: '#F43F5E' }, 
    { name: 'Konseling', value: stats.counseling, color: '#6366F1' }, 
  ].filter(d => d.value > 0);

  // --- HANDLERS ---
  const openModal = (type: LogType) => {
    setModalType(type);
    setPoint(type === 'positive' ? 5 : type === 'negative' ? 5 : 0);
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    if(!selectedStudentId || !description) {
        onShowNotification('Mohon lengkapi data jurnal', 'error');
        return;
    }
    const student = students.find(s => s.id === selectedStudentId);
    if(student) {
       const finalPoint = modalType === 'positive' ? Math.abs(point) : modalType === 'negative' ? -Math.abs(point) : 0;
       const newLog: BehaviorLog = {
          id: Date.now().toString(),
          classId: classId,
          studentId: student.id,
          studentName: student.name,
          date: new Date().toISOString().split('T')[0],
          type: modalType,
          category: category || 'Umum',
          description,
          point: finalPoint,
          emotion: modalType === 'positive' ? 'happy' : modalType === 'negative' ? 'sad' : 'neutral',
          status: modalType === 'counseling' ? 'Pending' : 'Done'
       };
       onCreateLog(newLog);
       setIsModalOpen(false);
       setSelectedStudentId(''); setDescription(''); setCategory('');
    }
  };

  const handlePrint = () => window.print();
  const handleDownloadTemplate = () => { /* ... */ };
  const handleExport = () => { /* ... */ };
  const handleImportClick = () => { if (fileInputRef.current) fileInputRef.current.click(); };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { /* ... */ };

  // Filter logs for list
  const filteredLogs = activeFilter === 'all' ? logs : logs.filter(l => l.type === activeFilter);

  // Helper for Row Colors
  const getRowVariant = (index: number) => {
      const variants = ['bg-white', 'bg-[#FFF9D0]/20', 'bg-[#CAF4FF]/20'];
      return variants[index % variants.length];
  };

  return (
    <div className="space-y-6 animate-fade-in relative page-portrait">
      
      {/* Header & Input Triggers */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
         <div>
            <h2 className="text-2xl font-bold text-gray-800">Dashboard Konseling</h2>
            <p className="text-gray-500">Monitoring perilaku, prestasi, dan bimbingan siswa.</p>
         </div>
         <div className="flex gap-2">
            <button onClick={()=>openModal('positive')} className="flex items-center bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-emerald-600 shadow-md transition-all">
                <Star size={18} className="mr-2"/> Input Prestasi
            </button>
            <button onClick={()=>openModal('negative')} className="flex items-center bg-rose-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-rose-600 shadow-md transition-all">
                <AlertTriangle size={18} className="mr-2"/> Input Pelanggaran
            </button>
            <button onClick={()=>openModal('counseling')} className="flex items-center bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-600 shadow-md transition-all">
                <HeartHandshake size={18} className="mr-2"/> Catat Konseling
            </button>
         </div>
      </div>

      {/* Analytics Widgets - Themed */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
         <div 
            onClick={() => setActiveFilter('all')}
            className={`bg-gradient-to-br from-[#5AB2FF] to-[#A0DEFF] text-white p-5 rounded-2xl shadow-lg shadow-blue-200 cursor-pointer transition-all hover:-translate-y-1`}
         >
            <div className="flex justify-between items-start">
               <div>
                  <p className="text-sm text-blue-100">Total Aktivitas</p>
                  <h3 className="text-3xl font-bold">{stats.total}</h3>
               </div>
               <div className="p-2 bg-white/20 rounded-lg"><List size={20} className="text-white"/></div>
            </div>
         </div>

         <div 
            onClick={() => setActiveFilter('positive')}
            className={`bg-emerald-500 text-white p-5 rounded-2xl shadow-lg shadow-emerald-200 cursor-pointer transition-all hover:-translate-y-1`}
         >
            <div className="flex justify-between items-start">
               <div>
                  <p className="text-sm text-emerald-100 font-medium">Perilaku Positif</p>
                  <h3 className="text-3xl font-bold">{stats.positive}</h3>
               </div>
               <div className="p-2 bg-white/20 rounded-lg"><TrendingUp size={20} className="text-white"/></div>
            </div>
         </div>

         <div 
            onClick={() => setActiveFilter('negative')}
            className={`bg-white border border-[#CAF4FF] p-5 rounded-2xl shadow-sm cursor-pointer transition-all hover:shadow-md`}
         >
            <div className="flex justify-between items-start">
               <div>
                  <p className="text-sm text-rose-600 font-medium">Perilaku Negatif</p>
                  <h3 className="text-3xl font-bold text-rose-700">{stats.negative}</h3>
               </div>
               <div className="p-2 bg-rose-50 rounded-lg"><TrendingDown size={20} className="text-rose-600"/></div>
            </div>
         </div>

         <div 
            onClick={() => setActiveFilter('counseling')}
            className={`bg-[#FFF9D0] text-amber-900 p-5 rounded-2xl shadow-md cursor-pointer transition-all hover:-translate-y-1 border border-amber-100`}
         >
            <div className="flex justify-between items-start">
               <div>
                  <p className="text-sm text-amber-700 font-medium">Kasus Pending</p>
                  <h3 className="text-3xl font-bold">{stats.pending}</h3>
               </div>
               <div className="p-2 bg-white/60 rounded-lg"><AlertTriangle size={20} className="text-amber-600"/></div>
            </div>
         </div>
      </div>

      {/* Interactive Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
         
         {/* Chart 1: Behavior Composition */}
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#CAF4FF] flex flex-col items-center">
            <h3 className="text-lg font-bold text-gray-800 w-full mb-2">Komposisi Perilaku</h3>
            {pieData.length > 0 ? (
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <RechartsTooltip />
                            <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="h-64 w-full flex items-center justify-center text-gray-400 text-sm">Belum ada data</div>
            )}
         </div>

         {/* Chart 2: Top Students */}
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#CAF4FF] col-span-1 lg:col-span-2">
            <div className="mb-2 border-b pb-2">
                <h3 className="text-lg font-bold text-gray-800 flex items-center">
                    <Star className="text-amber-400 mr-2" size={20} fill="currentColor"/>
                    Top 5 Siswa Teladan
                </h3>
            </div>
            <div className="h-64 w-full">
                {topStudents.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topStudents} layout="vertical" margin={{top: 5, right: 30, left: 40, bottom: 5}}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0"/>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 12, fontWeight: 500}} />
                            <RechartsTooltip />
                            <Bar dataKey="score" fill="#10B981" radius={[0, 4, 4, 0]} barSize={24} name="Skor Bersih" />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <p className="text-sm italic">Belum ada data prestasi/pelanggaran untuk dikalkulasi.</p>
                    </div>
                )}
            </div>
         </div>
      </div>

      {/* Recent Logs List */}
      <div className="bg-white rounded-2xl border border-[#CAF4FF] shadow-sm overflow-hidden print-container">
         <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 no-print bg-[#CAF4FF]/20">
            <div className="flex items-center gap-2">
               <h3 className="font-bold text-gray-800">Riwayat Jurnal {activeFilter !== 'all' ? `(${activeFilter})` : ''}</h3>
               <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full font-bold">{filteredLogs.length}</span>
            </div>
            <div className="flex gap-2">
                 <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx, .xls, .csv" />
                 <button onClick={handlePrint} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-indigo-600" title="Cetak"><Printer size={16}/></button>
            </div>
         </div>

         <div className="divide-y divide-gray-100">
            {filteredLogs.length === 0 ? (
                <div className="p-10 text-center text-gray-400">
                    <LayoutDashboard size={48} className="mx-auto mb-2 opacity-20"/>
                    <p>Tidak ada data jurnal untuk kategori ini.</p>
                </div>
            ) : (
                filteredLogs.map((log, index) => (
                <div key={log.id} className={`p-4 transition-colors flex flex-col md:flex-row gap-4 items-start print:border-b print:border-black print:break-inside-avoid ${getRowVariant(index)}`}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 shadow-sm border border-white no-print ${log.type==='positive'?'bg-emerald-100 text-emerald-600': log.type==='negative'?'bg-rose-100 text-rose-600':'bg-indigo-100 text-indigo-600'}`}>
                        {log.type==='positive' ? <Star size={20} fill="currentColor"/> : log.type==='negative' ? <AlertTriangle size={20}/> : <HeartHandshake size={20}/>}
                    </div>
                    <div className="flex-1 w-full">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-bold text-gray-800 text-base print:text-black">{log.studentName}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                                        log.type==='positive'?'bg-emerald-50 text-emerald-700 border-emerald-100':
                                        log.type==='negative'?'bg-rose-50 text-rose-700 border-rose-100':
                                        'bg-indigo-50 text-indigo-700 border-indigo-100'
                                    } print:text-black print:border-black`}>{log.category}</span>
                                    <span className="text-xs text-gray-400 flex items-center print:text-black"><Calendar size={12} className="mr-1"/> {log.date}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                {log.point !== 0 && (
                                    <span className={`font-bold text-sm ${log.point > 0 ? 'text-emerald-600' : 'text-rose-600'} print:text-black`}>
                                        {log.point > 0 ? '+' : ''}{log.point} Poin
                                    </span>
                                )}
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-2 bg-white/60 border-l-4 border-gray-200 p-3 rounded-r-md print:bg-white print:border-none print:p-0 print:pt-2">{log.description}</p>
                    </div>
                </div>
                ))
            )}
         </div>
      </div>

      {/* Modal Input */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm no-print">
              <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl">
                  <div className="p-5 border-b flex justify-between items-center">
                      <h3 className="font-bold text-lg">
                          {modalType === 'positive' ? 'Catat Prestasi / Perilaku Positif' : modalType === 'negative' ? 'Catat Pelanggaran / Perilaku Negatif' : 'Catat Sesi Bimbingan & Konseling'}
                      </h3>
                      <button onClick={()=>setIsModalOpen(false)}><X/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="text-sm font-medium mb-1 block">Siswa</label>
                          <select value={selectedStudentId} onChange={e=>setSelectedStudentId(e.target.value)} className="w-full border p-2 rounded-lg">
                              <option value="">-- Pilih Siswa --</option>
                              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="text-sm font-medium mb-1 block">Kategori</label>
                          <input value={category} onChange={e=>setCategory(e.target.value)} className="w-full border p-2 rounded-lg" placeholder="Contoh: Kedisiplinan, Akademik, Sosial"/>
                      </div>
                       <div>
                          <label className="text-sm font-medium mb-1 block">Deskripsi Kejadian</label>
                          <textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3} className="w-full border p-2 rounded-lg" placeholder="Jelaskan secara singkat..."></textarea>
                      </div>
                      {(modalType === 'positive' || modalType === 'negative') && (
                          <div>
                            <label className="text-sm font-medium mb-1 block">Poin Perilaku</label>
                            <input type="number" value={point} onChange={e=>setPoint(Number(e.target.value))} className="w-full border p-2 rounded-lg"/>
                          </div>
                      )}
                  </div>
                  <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
                      <button onClick={()=>setIsModalOpen(false)} className="px-4 py-2 rounded-lg border">Batal</button>
                      <button onClick={handleSubmit} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-lg">Simpan Jurnal</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default CounselingView;
