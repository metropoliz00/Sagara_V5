
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Student, GradeRecord, AgendaItem, 
  LiaisonLog, User, BehaviorLog, PermissionRequest
} from '../types';
import { MOCK_SUBJECTS } from '../constants';
import { 
  UserCheck, BookOpen, Calendar, Send, 
  PieChart as PieIcon, List, FileText, ChevronDown, CheckCircle, XCircle, Clock,
  MapPin, TrendingUp, ListTodo, Award, Star, AlertTriangle, HeartHandshake, LayoutDashboard, Medal,
  Activity, Trophy, User as UserIcon, Save, Loader2, GraduationCap, Heart, Sparkles, AlertCircle
} from 'lucide-react';
import { useModal } from '../context/ModalContext';

interface StudentMonitorProps {
  students: Student[];
  allAttendance: any[];
  grades: GradeRecord[];
  agendas: AgendaItem[];
  liaisonLogs: LiaisonLog[];
  onSaveLiaison: (log: Omit<LiaisonLog, 'id'>) => Promise<void>;
  onSavePermission: (date: string, records: any[]) => Promise<void>;
  onUpdateLiaisonStatus: (ids: string[], status: 'Diterima' | 'Ditolak' | 'Selesai') => Promise<void>;
  classId: string;
  onUpdateStudent: (student: Student) => Promise<void>; // New prop
}

type MonitorTab = 'profile';

const StudentMonitor: React.FC<StudentMonitorProps> = ({
  students, allAttendance, grades, agendas, liaisonLogs,
  onSaveLiaison, onSavePermission, onUpdateLiaisonStatus, classId,
  onUpdateStudent
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<MonitorTab>('profile');
  const [teacherNotes, setTeacherNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const { showAlert } = useModal();
  
  // Grade Selection State
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(MOCK_SUBJECTS[0]?.id || 'pai');

  useEffect(() => {
    if (students.length > 0 && !selectedStudentId) {
      const firstStudentId = students[0].id;
      setSelectedStudentId(firstStudentId);
      setTeacherNotes(students[0].teacherNotes || '');
    }
  }, [students]);

  const selectedStudent = useMemo(() => students.find(s => s.id === selectedStudentId), [students, selectedStudentId]);

  useEffect(() => {
    if (selectedStudent) {
        setTeacherNotes(selectedStudent.teacherNotes || '');
    }
  }, [selectedStudent]);

  // -- CALCULATE ATTENDANCE STATS --
  const attendanceStats = useMemo(() => {
    if (!selectedStudent) return { counts: { sick: 0, permit: 0, alpha: 0 }, monthName: '' };
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const records = allAttendance.filter((r: any) => {
        const rDate = new Date(r.date);
        return String(r.studentId) === String(selectedStudent.id) &&
               rDate.getMonth() === currentMonth &&
               rDate.getFullYear() === currentYear;
    });

    const counts = { sick: 0, permit: 0, alpha: 0 };
    records.forEach((r: any) => {
        if (r.status === 'sick') counts.sick++;
        else if (r.status === 'permit') counts.permit++;
        else if (r.status === 'alpha') counts.alpha++;
    });

    return { 
        counts, 
        monthName: now.toLocaleString('id-ID', { month: 'long' }) 
    };
  }, [selectedStudent, allAttendance]);

  // -- CALCULATE GRADES --
  const selectedGradeData = useMemo(() => {
      if (!selectedStudent) return { sum1: 0, sum2: 0, sum3: 0, sum4: 0, sas: 0, average: 0 };
      const studentGrades = grades.find(g => g.studentId === selectedStudent.id);
      const subjectData = studentGrades?.subjects[selectedSubjectId] || { sum1: 0, sum2: 0, sum3: 0, sum4: 0, sas: 0 };
      
      const scores = [subjectData.sum1, subjectData.sum2, subjectData.sum3, subjectData.sum4, subjectData.sas];
      const filledScores = scores.filter(s => s > 0);
      const average = filledScores.length > 0 
          ? Math.round(filledScores.reduce((a, b) => a + b, 0) / filledScores.length) 
          : 0;

      return { ...subjectData, average };
  }, [grades, selectedStudent, selectedSubjectId]);

  const handleSaveNotes = async () => {
    if (!selectedStudent) return;
    setIsSavingNotes(true);
    try {
      await onUpdateStudent({ ...selectedStudent, teacherNotes: teacherNotes });
      showAlert('Catatan berhasil disimpan.', 'success');
    } catch (e) {
      showAlert('Gagal menyimpan catatan.', 'error');
    } finally {
      setIsSavingNotes(false);
    }
  };

  if (students.length === 0) {
      return <div className="p-8 text-center text-gray-500">Tidak ada data siswa di kelas ini untuk dimonitor.</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
        
        {/* TOP: SELECTOR */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                    <UserCheck className="mr-2 text-indigo-600" /> Monitoring Siswa
                </h2>
                <p className="text-sm text-gray-500">Pilih siswa untuk melihat detail profil, nilai, dan catatan.</p>
            </div>
            <div className="relative min-w-[250px]">
                <select 
                    value={selectedStudentId} 
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full p-2.5 pl-4 pr-10 bg-indigo-50 border-indigo-100 border rounded-lg font-bold text-indigo-700 outline-none appearance-none cursor-pointer hover:bg-indigo-100 transition-colors"
                >
                    {students.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none" size={18}/>
            </div>
        </div>

        {selectedStudent && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* --- LEFT COLUMN: PROFILE CARD --- */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex flex-col items-center">
                            <div className="w-24 h-24 rounded-full border-4 border-white shadow-md overflow-hidden bg-gray-100 mb-4">
                                {selectedStudent.photo && !selectedStudent.photo.startsWith('ERROR') ? (
                                    <img src={selectedStudent.photo} alt={selectedStudent.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-indigo-300 bg-indigo-50"><UserIcon size={48}/></div>
                                )}
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 text-center leading-tight">{selectedStudent.name}</h3>
                            
                            {/* NIS & NISN Badges */}
                            <div className="flex flex-wrap gap-2 justify-center mt-2 mb-4">
                                <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded font-bold border border-gray-200">
                                    NIS: {selectedStudent.nis}
                                </span>
                                <span className="text-[10px] bg-[#CAF4FF] text-[#5AB2FF] px-2 py-1 rounded font-bold border border-blue-100">
                                    NISN: {selectedStudent.nisn || '-'}
                                </span>
                            </div>

                            {/* Quick Stats (Attendance & Behavior) */}
                            <div className="w-full bg-gray-50 rounded-xl p-3 mb-4 border border-gray-100">
                                <p className="text-[10px] font-bold text-gray-400 uppercase text-center mb-2">Laporan Bulan {attendanceStats.monthName}</p>
                                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                                    <div className="bg-amber-100 rounded-lg p-1">
                                        <span className="block text-xs font-bold text-amber-700">Sakit</span>
                                        <span className="block text-sm font-black text-amber-800">{attendanceStats.counts.sick}</span>
                                    </div>
                                    <div className="bg-blue-100 rounded-lg p-1">
                                        <span className="block text-xs font-bold text-blue-700">Izin</span>
                                        <span className="block text-sm font-black text-blue-800">{attendanceStats.counts.permit}</span>
                                    </div>
                                    <div className="bg-red-100 rounded-lg p-1">
                                        <span className="block text-xs font-bold text-red-700">Alpha</span>
                                        <span className="block text-sm font-black text-red-800">{attendanceStats.counts.alpha}</span>
                                    </div>
                                </div>
                                <div className="bg-white border border-gray-200 rounded-lg p-2 flex justify-between items-center">
                                    <span className="text-xs font-bold text-gray-600">Poin Sikap</span>
                                    <span className="text-sm font-black text-indigo-600">{selectedStudent.behaviorScore}</span>
                                </div>
                            </div>

                            <div className="mt-2 text-xs space-y-2 text-left w-full border-t pt-4 text-gray-600">
                                <p className="flex justify-between border-b border-dashed pb-1"><span>Jenis Kelamin:</span> <span className="font-semibold text-gray-800">{selectedStudent.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span></p>
                                <p className="flex justify-between border-b border-dashed pb-1"><span>Tgl Lahir:</span> <span className="font-semibold text-gray-800">{selectedStudent.birthDate}</span></p>
                                <p className="flex justify-between border-b border-dashed pb-1"><span>Wali:</span> <span className="font-semibold text-gray-800">{selectedStudent.parentName}</span></p>
                                <p className="flex justify-between border-b border-dashed pb-1"><span>No. HP:</span> <span className="font-semibold text-gray-800">{selectedStudent.parentPhone}</span></p>
                                <div className="pt-1">
                                    <span className="block mb-1">Alamat:</span>
                                    <span className="font-semibold text-gray-800 block leading-tight">{selectedStudent.address}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- RIGHT COLUMN: DETAILS --- */}
                <div className="md:col-span-2 space-y-6">
                    
                    {/* 1. Nilai Akademik */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
                            <h3 className="font-bold text-gray-800 flex items-center">
                                <GraduationCap className="mr-2 text-indigo-500" size={20}/> Hasil Belajar (Sumatif)
                            </h3>
                            <div className="relative">
                                <select 
                                    value={selectedSubjectId} 
                                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                                    className="appearance-none bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold py-1.5 pl-3 pr-8 rounded-lg outline-none text-xs cursor-pointer"
                                >
                                    {MOCK_SUBJECTS.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none"/>
                            </div>
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                            {['sum1', 'sum2', 'sum3', 'sum4'].map((key, idx) => (
                                <div key={key} className="bg-gray-50 border border-gray-100 p-2 rounded-lg text-center">
                                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">LM {idx + 1}</span>
                                    <span className={`text-lg font-bold ${selectedGradeData[key as keyof typeof selectedGradeData] > 0 ? 'text-gray-700' : 'text-gray-300'}`}>
                                        {selectedGradeData[key as keyof typeof selectedGradeData] || '-'}
                                    </span>
                                </div>
                            ))}
                            <div className="bg-blue-50 border border-blue-100 p-2 rounded-lg text-center">
                                <span className="text-[10px] text-blue-400 font-bold uppercase block mb-1">SAS</span>
                                <span className={`text-lg font-bold ${selectedGradeData.sas > 0 ? 'text-blue-700' : 'text-gray-300'}`}>
                                    {selectedGradeData.sas || '-'}
                                </span>
                            </div>
                        </div>
                        <div className="mt-3 flex justify-between items-center bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100">
                            <span className="text-xs font-bold text-indigo-600">Rata-rata Nilai</span>
                            <span className="text-lg font-black text-indigo-700">{selectedGradeData.average || '-'}</span>
                        </div>
                    </div>

                    {/* 2. Kesehatan & Minat */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Kesehatan */}
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                            <h3 className="font-bold text-gray-800 flex items-center mb-3">
                                <Heart className="mr-2 text-rose-500" size={18}/> Data Kesehatan
                            </h3>
                            <div className="grid grid-cols-3 gap-2 mb-3">
                                <div className="text-center bg-rose-50 rounded-lg p-2">
                                    <span className="block text-[10px] text-rose-400 font-bold">Tinggi</span>
                                    <span className="font-bold text-rose-700">{selectedStudent.height || '-'} <span className="text-[10px]">cm</span></span>
                                </div>
                                <div className="text-center bg-rose-50 rounded-lg p-2">
                                    <span className="block text-[10px] text-rose-400 font-bold">Berat</span>
                                    <span className="font-bold text-rose-700">{selectedStudent.weight || '-'} <span className="text-[10px]">kg</span></span>
                                </div>
                                <div className="text-center bg-rose-50 rounded-lg p-2">
                                    <span className="block text-[10px] text-rose-400 font-bold">Darah</span>
                                    <span className="font-bold text-rose-700">{selectedStudent.bloodType || '-'}</span>
                                </div>
                            </div>
                            <div className="text-xs">
                                <span className="font-bold text-gray-500 block mb-1">Riwayat Penyakit:</span>
                                <p className="bg-gray-50 p-2 rounded border border-gray-200 text-gray-700 italic min-h-[40px]">
                                    {selectedStudent.healthNotes || 'Tidak ada catatan.'}
                                </p>
                            </div>
                        </div>

                        {/* Minat & Bakat */}
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                            <h3 className="font-bold text-gray-800 flex items-center mb-3">
                                <Sparkles className="mr-2 text-yellow-500" size={18}/> Minat & Bakat
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Hobi</span>
                                    <p className="font-medium text-gray-800 border-b border-gray-100 pb-1">{selectedStudent.hobbies || '-'}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Cita-cita</span>
                                    <p className="font-medium text-gray-800 border-b border-gray-100 pb-1">{selectedStudent.ambition || '-'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. Prestasi & Pelanggaran */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-bold text-sm text-emerald-600 mb-2 flex items-center">
                                    <Trophy size={16} className="mr-2"/> Prestasi
                                </h4>
                                <ul className="text-xs space-y-1 list-disc pl-4 text-gray-600">
                                    {selectedStudent.achievements && selectedStudent.achievements.length > 0 ? (
                                        selectedStudent.achievements.map((a, i) => <li key={i}>{a}</li>)
                                    ) : (
                                        <li className="text-gray-400 italic list-none">Belum ada data prestasi.</li>
                                    )}
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-rose-600 mb-2 flex items-center">
                                    <AlertCircle size={16} className="mr-2"/> Pelanggaran
                                </h4>
                                <ul className="text-xs space-y-1 list-disc pl-4 text-gray-600">
                                    {selectedStudent.violations && selectedStudent.violations.length > 0 ? (
                                        selectedStudent.violations.map((v, i) => <li key={i}>{v}</li>)
                                    ) : (
                                        <li className="text-gray-400 italic list-none">Belum ada data pelanggaran.</li>
                                    )}
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* 4. Catatan Guru */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h3 className="font-bold text-gray-800 text-lg flex items-center mb-4">
                            <FileText className="mr-2 text-indigo-500" size={20}/> Catatan Wali Kelas
                        </h3>
                        <p className="text-sm text-gray-500 mb-4 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                            Catatan ini akan muncul di halaman dashboard siswa. Gunakan untuk memberi motivasi, pengingat, atau apresiasi kepada siswa.
                        </p>
                        <textarea
                            value={teacherNotes}
                            onChange={(e) => setTeacherNotes(e.target.value)}
                            rows={4}
                            className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                            placeholder="Tulis catatan untuk siswa..."
                        />
                        <div className="flex justify-end mt-4">
                            <button
                                onClick={handleSaveNotes}
                                disabled={isSavingNotes}
                                className="flex items-center gap-2 bg-indigo-600 text-white font-bold px-5 py-2.5 rounded-lg shadow-md hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {isSavingNotes ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
                                {isSavingNotes ? 'Menyimpan...' : 'Simpan Catatan'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default StudentMonitor;
