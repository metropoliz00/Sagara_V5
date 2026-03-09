
import React, { useState, useMemo } from 'react';
import { LearningReport, Subject, User } from '../types';
import { 
  FileText, Plus, Search, Trash2, ExternalLink, Calendar, 
  BookOpen, Filter, X, Save, Loader2, BarChart2, PieChart as PieIcon, List, Users, CheckCircle
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { useModal } from '../context/ModalContext';

interface LearningReportsViewProps {
  reports: LearningReport[];
  subjects: Subject[];
  onSave: (report: Omit<LearningReport, 'id'> | LearningReport) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  classId: string;
  teachers?: User[]; // List of users with role 'guru'
  onNavigateToJournal?: (date: string) => void; // New Prop for navigation
}

const REPORT_TYPES = ['Jurnal Harian', 'RPP/Modul Ajar', 'Dokumentasi', 'Lainnya'];
const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444'];

const LearningReportsView: React.FC<LearningReportsViewProps> = ({ 
  reports, subjects, onSave, onDelete, classId, teachers = [], onNavigateToJournal
}) => {
  const [viewMode, setViewMode] = useState<'dashboard' | 'list'>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingReport, setEditingReport] = useState<Partial<LearningReport> | null>(null);
  const { showAlert, showConfirm } = useModal();
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterType, setFilterType] = useState('all');

  // --- ANALYTICS DATA ---
  // UPDATED: Chart now shows Top 10 Teachers
  const reportsByTeacher = useMemo(() => {
    const counts: Record<string, number> = {};
    reports.forEach(r => {
      const teacherName = r.teacherName || 'Tanpa Nama';
      counts[teacherName] = (counts[teacherName] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 Teachers
  }, [reports]);

  const reportsByClass = useMemo(() => {
    const counts: Record<string, number> = {};
    reports.forEach(r => {
      const cId = r.classId || 'Umum';
      counts[cId] = (counts[cId] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [reports]);

  const reportsByType = useMemo(() => {
    const counts: Record<string, number> = {};
    reports.forEach(r => {
      counts[r.type] = (counts[r.type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [reports]);

  const recentActivity = useMemo(() => {
    return [...reports].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
  }, [reports]);

  // --- FILTERED LIST ---
  const filteredReports = reports.filter(r => {
    const matchSearch = r.topic.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        r.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (r.teacherName && r.teacherName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchSubject = filterSubject === 'all' || r.subject === filterSubject;
    const matchType = filterType === 'all' || r.type === filterType;
    return matchSearch && matchSubject && matchType;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // --- HANDLERS ---
  const handleOpenModal = (report?: LearningReport) => {
    if (report) {
      setEditingReport(report);
    } else {
      setEditingReport({
        date: new Date().toISOString().split('T')[0],
        type: 'Jurnal Harian',
        subject: subjects[0]?.name || '',
        topic: '',
        documentLink: '',
        classId,
        schoolId: '', // Will be populated from user profile in App.tsx
        teacherName: (teachers.length > 0 && teachers[0].fullName && teachers[0].fullName !== 'undefined') ? teachers[0].fullName : '' // Default to first teacher if available
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingReport?.subject || !editingReport?.topic || !editingReport?.date) {
      showAlert("Mohon lengkapi data wajib (Mapel, Materi, Tanggal).", "error");
      return;
    }
    setIsSaving(true);
    try {
      await onSave(editingReport as LearningReport);
      setIsModalOpen(false);
      setEditingReport(null);
    } catch (e) {
      console.error(e);
      showAlert("Gagal menyimpan laporan.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    showConfirm("Yakin ingin menghapus laporan ini?", async () => {
      await onDelete(id);
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Laporan Pembelajaran</h2>
          <p className="text-gray-500 text-sm">Rekapitulasi aktivitas belajar mengajar di kelas.</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
            <button 
                onClick={() => setViewMode('dashboard')} 
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'dashboard' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
            >
                <BarChart2 size={16} className="mr-2"/> Dashboard
            </button>
            <button 
                onClick={() => setViewMode('list')} 
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
            >
                <List size={16} className="mr-2"/> Daftar Laporan
            </button>
        </div>
      </div>

      {viewMode === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stats Cards */}
            <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase">Total Laporan</p>
                        <h3 className="text-2xl font-bold text-indigo-600">{reports.length}</h3>
                    </div>
                    <div className="p-3 bg-indigo-50 rounded-full text-indigo-600"><FileText size={20}/></div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase">Bulan Ini</p>
                        <h3 className="text-2xl font-bold text-emerald-600">
                            {reports.filter(r => new Date(r.date).getMonth() === new Date().getMonth()).length}
                        </h3>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-full text-emerald-600"><Calendar size={20}/></div>
                </div>
            </div>

            {/* Charts - UPDATED TITLE & DATA */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center"><Users size={18} className="mr-2 text-indigo-500"/> Perbandingan Guru Teraktif (Top 10)</h3>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={reportsByTeacher} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={140} tick={{fontSize: 11}} />
                            <Tooltip />
                            <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} name="Jumlah Laporan" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center"><PieIcon size={18} className="mr-2 text-pink-500"/> Jenis Laporan</h3>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={reportsByType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} fill="#8884d8" label>
                                {reportsByType.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center"><BookOpen size={18} className="mr-2 text-emerald-500"/> Distribusi Laporan per Kelas</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={reportsByClass} margin={{ top: 5, right: 30, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{fontSize: 12}} angle={-45} textAnchor="end" height={60} />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} name="Jumlah Laporan" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Recent Activity Timeline */}
            <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-gray-800">Aktivitas Terbaru</h3>
                    <button onClick={() => setViewMode('list')} className="text-sm text-indigo-600 hover:underline">Lihat Semua</button>
                </div>
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                    {recentActivity.map((report) => (
                        <div key={report.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                                <FileText size={16} className="text-indigo-500"/>
                            </div>
                            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-800 text-sm">{report.subject} <span className="text-indigo-600 ml-1">(Kelas {report.classId})</span></span>
                                        <span className="text-xs text-gray-500 font-semibold">{(report.teacherName && report.teacherName !== 'undefined') ? report.teacherName : 'Guru'}</span>
                                    </div>
                                    <span className="text-[10px] text-gray-400">{report.date}</span>
                                </div>
                                <p className="text-xs text-gray-600 mb-2 line-clamp-2">{report.topic}</p>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium`}>{report.type}</span>
                            </div>
                        </div>
                    ))}
                    {recentActivity.length === 0 && <p className="text-center text-gray-400 text-sm py-4 italic">Belum ada laporan.</p>}
                </div>
            </div>
        </div>
      )}

      {viewMode === 'list' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex flex-1 gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:max-w-xs">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                        <input 
                            type="text" 
                            placeholder="Cari materi, guru..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div className="relative">
                        <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                        <select 
                            value={filterSubject}
                            onChange={(e) => setFilterSubject(e.target.value)}
                            className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white"
                        >
                            <option value="all">Semua Mapel</option>
                            {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </select>
                    </div>
                </div>
                <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-md">
                    <Plus size={16}/> Buat Laporan
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600 font-medium uppercase text-xs">
                        <tr>
                            <th className="px-6 py-3">Tanggal</th>
                            <th className="px-6 py-3">Kelas</th>
                            <th className="px-6 py-3">Nama Guru</th>
                            <th className="px-6 py-3">Mata Pelajaran</th>
                            <th className="px-6 py-3">Materi / Topik</th>
                            <th className="px-6 py-3 min-w-[150px]">Jenis</th>
                            <th className="px-6 py-3 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredReports.map((report) => (
                            <tr key={report.id} className="hover:bg-indigo-50/30 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-gray-500 font-mono text-xs">{report.date}</td>
                                <td className="px-6 py-4 font-bold text-indigo-600">{report.classId}</td>
                                <td className="px-6 py-4 font-semibold text-gray-700">
                        {report.teacherName && report.teacherName !== 'undefined' ? report.teacherName : '-'}
                      </td>
                                <td className="px-6 py-4 font-medium text-gray-800">{report.subject}</td>
                                <td className="px-6 py-4 text-gray-600 max-w-xs truncate">{report.topic}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium border border-gray-200">{report.type}</span>
                                </td>
                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                    {report.documentLink && (
                                        <a href={report.documentLink} target="_blank" rel="noreferrer" className="p-1.5 text-blue-500 hover:bg-blue-50 rounded" title="Buka Dokumen">
                                            <ExternalLink size={16}/>
                                        </a>
                                    )}
                                    {/* NEW: Navigate to Journal Button */}
                                    {report.type === 'Jurnal Harian' && onNavigateToJournal && (
                                        <button 
                                            onClick={() => onNavigateToJournal(report.date)} 
                                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded" 
                                            title="Lihat di Jurnal"
                                        >
                                            <CheckCircle size={16}/>
                                        </button>
                                    )}
                                    <button onClick={() => handleOpenModal(report)} className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded" title="Edit">
                                        <FileText size={16}/>
                                    </button>
                                    <button onClick={() => handleDelete(report.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Hapus">
                                        <Trash2 size={16}/>
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredReports.length === 0 && (
                            <tr><td colSpan={6} className="p-8 text-center text-gray-400 italic">Tidak ada laporan yang sesuai.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* Input Modal */}
      {isModalOpen && editingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-5 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                    <h3 className="font-bold text-lg text-gray-800">{editingReport.id ? 'Edit Laporan' : 'Buat Laporan Baru'}</h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                </div>
                
                <div className="p-6 space-y-4 overflow-y-auto">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tanggal</label>
                        <input 
                            type="date" 
                            value={editingReport.date} 
                            onChange={e => setEditingReport({...editingReport, date: e.target.value})}
                            className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    {/* NEW: Teacher Dropdown */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Guru</label>
                        <select 
                            value={editingReport.teacherName || ''}
                            onChange={e => setEditingReport({...editingReport, teacherName: e.target.value})}
                            className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                        >
                            <option value="">-- Pilih Guru --</option>
                            {teachers.map(t => (
                                <option key={t.id} value={t.fullName}>{t.fullName}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mata Pelajaran</label>
                            <select 
                                value={editingReport.subject} 
                                onChange={e => setEditingReport({...editingReport, subject: e.target.value})}
                                className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                            >
                                {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Jenis Laporan</label>
                            <select 
                                value={editingReport.type} 
                                onChange={e => setEditingReport({...editingReport, type: e.target.value as any})}
                                className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                            >
                                {REPORT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Materi / Topik Pembelajaran</label>
                        <textarea 
                            rows={3}
                            value={editingReport.topic} 
                            onChange={e => setEditingReport({...editingReport, topic: e.target.value})}
                            placeholder="Ringkasan materi yang diajarkan..."
                            className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Link Dokumen / Foto (Opsional)</label>
                        <input 
                            type="url" 
                            value={editingReport.documentLink} 
                            onChange={e => setEditingReport({...editingReport, documentLink: e.target.value})}
                            placeholder="https://drive.google.com/..."
                            className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">Masukkan link Google Drive atau folder dokumentasi.</p>
                    </div>
                </div>

                <div className="p-5 border-t bg-gray-50 flex justify-end gap-2 rounded-b-2xl">
                    <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium">Batal</button>
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
                        Simpan
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default LearningReportsView;
