import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, RadialBarChart, RadialBar, Legend 
} from 'recharts';
import PaperPlaneIcon from './PaperPlaneIcon';
import { Student, AgendaItem, Holiday, ViewState, GradeRecord, Subject, EmploymentLink, PermissionRequest, SchoolProfileData, LearningDocumentation, LearningReport } from '../types';
import { 
  Users, UserCheck, Calendar, FileText, TrendingUp, 
  Plus, Send, Bell, ChevronRight, CheckCircle, AlertCircle, 
  GraduationCap, BookOpen, Clock, CalendarRange,
  Activity, XCircle, ExternalLink, Link as LinkIcon, Mail, Info, Camera, ChevronLeft,
  Sun, Moon, CloudSun, Sunset
} from 'lucide-react';

interface DashboardProps {
  students: Student[];
  agendas: AgendaItem[];
  holidays: Holiday[];
  allAttendanceRecords: any[];
  teacherName?: string;
  teachingClass?: string;
  grades: GradeRecord[];
  subjects: Subject[];
  adminCompleteness?: number;
  employmentLinks?: EmploymentLink[];
  pendingPermissions?: PermissionRequest[];
  onOpenPermissionModal?: () => void;
  schoolProfile?: SchoolProfileData; // Added schoolProfile prop
  learningDocumentation?: LearningDocumentation[];
  learningReports?: LearningReport[];
  hasNewMessages?: boolean;
  unreadMessageCount?: number;
  kktpMap?: Record<string, number>;
}

const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#14B8A6', '#6366F1', '#84CC16', '#D946EF'];

const Dashboard: React.FC<DashboardProps> = ({ 
  students, agendas, holidays, allAttendanceRecords, 
  teacherName, teachingClass, grades, subjects, adminCompleteness = 0,
  employmentLinks = [], pendingPermissions = [], onOpenPermissionModal, schoolProfile,
  learningDocumentation = [],
  learningReports = [],
  hasNewMessages = false, unreadMessageCount = 0,
  kktpMap = {}
}) => {
  const navigate = useNavigate();
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showRunningText, setShowRunningText] = useState(false); // State for delayed running text

  // Carousel State
  const [carouselIndex, setCarouselIndex] = useState(0);
  const carouselTimeoutRef = useRef<number | null>(null);
  const imagesForCarousel = useMemo(() => learningDocumentation.filter(doc => doc.linkFoto && doc.linkFoto.startsWith('http')), [learningDocumentation]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 1000);
    
    // Delay running text appearance by 300ms
    const textTimer = setTimeout(() => {
        setShowRunningText(true);
    }, 300);

    return () => {
        clearInterval(timer);
        clearTimeout(textTimer);
    };
  }, []);

  // Carousel Logic
  useEffect(() => {
    const resetTimeout = () => {
      if (carouselTimeoutRef.current) clearTimeout(carouselTimeoutRef.current);
    };
    resetTimeout();
    if (imagesForCarousel.length > 1) {
      carouselTimeoutRef.current = window.setTimeout(
        () => setCarouselIndex((prev) => (prev + 1) % imagesForCarousel.length), 5000
      );
    }
    return () => resetTimeout();
  }, [carouselIndex, imagesForCarousel.length]);

  const goToPreviousSlide = () => setCarouselIndex((prev) => (prev - 1 + imagesForCarousel.length) % imagesForCarousel.length);
  const goToNextSlide = () => setCarouselIndex((prev) => (prev + 1) % imagesForCarousel.length);

  const formattedDate = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(currentDate);
  const formattedTime = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(currentDate).replace(/\./g, ':');
  const getLocalISODate = (date: Date) => { const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0'); const d = String(date.getDate()).padStart(2, '0'); return `${y}-${m}-${d}`; };
  const formatLongDate = (dateStr: string) => { if (!dateStr) return "-"; try { const date = new Date(dateStr + 'T00:00:00'); if (isNaN(date.getTime())) return dateStr; return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date); } catch (e) { return dateStr; } };
  const getGreeting = () => { 
    const hour = currentDate.getHours(); 
    if (hour >= 5 && hour < 11) return "Pagi"; 
    if (hour >= 11 && hour < 15) return "Siang"; 
    if (hour >= 15 && hour < 19) return "Sore"; 
    return "Malam"; 
  };

  const getGreetingIcon = (greeting: string) => {
    switch (greeting) {
      case 'Pagi': return <CloudSun className="text-yellow-400 mr-3 inline-block animate-pulse-slow" size={32} />;
      case 'Siang': return <Sun className="text-orange-500 mr-3 inline-block animate-spin-slow" size={32} />;
      case 'Sore': return <Sunset className="text-orange-400 mr-3 inline-block" size={32} />;
      case 'Malam': return <Moon className="text-indigo-400 mr-3 inline-block" size={32} />;
      default: return <Sun className="text-yellow-500 mr-3 inline-block" size={32} />;
    }
  };

  const totalStudents = students.length;
  const maleStudents = students.filter(s => s.gender === 'L').length;
  const femaleStudents = students.filter(s => s.gender === 'P').length;

  const classAttendanceRecords = useMemo(() => {
      const studentIds = students.map(s => s.id);
      return (allAttendanceRecords as any[]).filter(record => studentIds.includes(record.studentId));
  }, [allAttendanceRecords, students]);

  const todayStats = useMemo(() => {
    const todayStr = getLocalISODate(new Date());
    const todayRecords = classAttendanceRecords.filter(r => r.date === todayStr);
    return {
        present: new Set(todayRecords.filter(r => r.status === 'present').map(r => r.studentId)).size,
        sick: new Set(todayRecords.filter(r => r.status === 'sick').map(r => r.studentId)).size,
        permit: new Set(todayRecords.filter(r => r.status === 'permit').map(r => r.studentId)).size,
        alpha: new Set(todayRecords.filter(r => r.status === 'alpha').map(r => r.studentId)).size,
    };
  }, [classAttendanceRecords]);

  const attendanceTrendData = useMemo(() => {
    const daysShort = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const today = new Date();
    const todayStr = getLocalISODate(today);
    const dayOfWeek = today.getDay(); 
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    const weekData = [];

    for (let i = 0; i < 6; i++) { // Monday to Saturday
      const targetDate = new Date(monday);
      targetDate.setDate(monday.getDate() + i);
      const dateStr = getLocalISODate(targetDate);
      const isHoliday = holidays.some(h => h.date === dateStr);
      
      let presentCount = 0;
      let sickCount = 0;
      let permitCount = 0;
      let alphaCount = 0;

      if (dateStr <= todayStr && !isHoliday) {
        const dayRecords = classAttendanceRecords.filter(r => r.date === dateStr);
        presentCount = new Set(dayRecords.filter(r => r.status === 'present').map(r => r.studentId)).size;
        sickCount = new Set(dayRecords.filter(r => r.status === 'sick').map(r => r.studentId)).size;
        permitCount = new Set(dayRecords.filter(r => r.status === 'permit').map(r => r.studentId)).size;
        
        const recordedCount = presentCount + sickCount + permitCount;
        alphaCount = students.length - recordedCount;
        if (alphaCount < 0) alphaCount = 0;
      }

      const total = presentCount + sickCount + permitCount + alphaCount;
      const divisor = total > 0 ? total : 1;

      const presentPercent = Math.round((presentCount / divisor) * 100);
      const sickPercent = Math.round((sickCount / divisor) * 100);
      const permitPercent = Math.round((permitCount / divisor) * 100);
      const alphaPercent = total > 0 ? 100 - (presentPercent + sickPercent + permitPercent) : 0;

      weekData.push({
        name: daysShort[targetDate.getDay()],
        H: presentCount,
        S: sickCount,
        I: permitCount,
        A: alphaCount,
        H_percent: presentPercent,
        S_percent: sickPercent,
        I_percent: permitPercent,
        A_percent: alphaPercent
      });
    }
    return weekData;
  }, [classAttendanceRecords, students, holidays]);

  const absentToday = useMemo(() => {
    const todayStr = getLocalISODate(new Date());
    return classAttendanceRecords.filter(record => record.date === todayStr && record.status !== 'present').map(record => {
            const student = students.find(s => s.id === record.studentId);
            return { ...record, name: student?.name || 'Siswa tidak ditemukan' };
        });
  }, [classAttendanceRecords, students]);

  const priorityAgenda = agendas.find(a => a.type === 'urgent' && !a.completed) || agendas.find(a => !a.completed);
  const incompleteAgendas = agendas.filter(a => !a.completed);
  const upcomingHolidays = holidays.map(h => ({...h, dateObj: new Date(h.date + 'T00:00:00')})).filter(h => h.dateObj >= new Date(new Date().setHours(0, 0, 0, 0))).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime()).slice(0, 4);
  const getDaysRemaining = (dateObj: Date) => { const today = new Date(); today.setHours(0, 0, 0, 0); const diffTime = dateObj.getTime() - today.getTime(); const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); if (diffDays === 0) return 'Hari ini'; if (diffDays === 1) return 'Besok'; return `dalam ${diffDays} hari`; };
  
  // Theme Helpers for List Rows
  const getRowVariant = (index: number) => {
      const variants = ['bg-white border-gray-100', 'bg-[#FFF9D0]/30 border-amber-100', 'bg-[#CAF4FF]/20 border-blue-100'];
      return variants[index % variants.length];
  };

  const monthlyLineChartData = useMemo(() => {
    const now = new Date();
    const todayStr = getLocalISODate(now);
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const data = [];

    const monthlyRecords = classAttendanceRecords.filter(record => {
        const recordDate = new Date(record.date + 'T00:00:00');
        return recordDate.getFullYear() === year && recordDate.getMonth() === month;
    });

    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const targetDate = new Date(dateStr + 'T00:00:00');
        const isSunday = targetDate.getDay() === 0;
        const isHoliday = holidays.some(h => h.date === dateStr);
        
        let presentCount = 0;
        let sickCount = 0;
        let permitCount = 0;
        let alphaCount = 0;

        if (dateStr <= todayStr && !isSunday && !isHoliday) {
            const dayRecords = monthlyRecords.filter(r => r.date === dateStr);
            presentCount = new Set(dayRecords.filter(r => r.status === 'present').map(r => r.studentId)).size;
            sickCount = new Set(dayRecords.filter(r => r.status === 'sick').map(r => r.studentId)).size;
            permitCount = new Set(dayRecords.filter(r => r.status === 'permit').map(r => r.studentId)).size;
            
            const recordedCount = presentCount + sickCount + permitCount;
            alphaCount = students.length - recordedCount;
            if (alphaCount < 0) alphaCount = 0;
        }

        const total = presentCount + sickCount + permitCount + alphaCount;
        const divisor = total > 0 ? total : 1;

        const presentPercent = Math.round((presentCount / divisor) * 100);
        const sickPercent = Math.round((sickCount / divisor) * 100);
        const permitPercent = Math.round((permitCount / divisor) * 100);
        const alphaPercent = total > 0 ? 100 - (presentPercent + sickPercent + permitPercent) : 0;

        data.push({
            name: `${i}`,
            Hadir: presentPercent,
            Sakit: sickPercent,
            Izin: permitPercent,
            Alpha: alphaPercent,
            rawH: presentCount,
            rawS: sickCount,
            rawI: permitCount,
            rawA: alphaCount
        });
    }
    return data;
  }, [classAttendanceRecords, students, holidays]);

  const curriculumProgress = useMemo(() => {
    if (!subjects || !grades || students.length === 0) return [];
    return subjects.map((subject) => {
        const subjectId = subject.id;
        const kkm = kktpMap[subjectId] || subject.kkm; // Use kktpMap value if available
        let totalAverageScore = 0;
        let gradedStudentsCount = 0;
        students.forEach(student => {
            const studentGradeRecord = grades.find(g => g.studentId === student.id);
            const subjectGrade = studentGradeRecord?.subjects[subjectId];
            if (subjectGrade) {
                const scores = [subjectGrade.sum1, subjectGrade.sum2, subjectGrade.sum3, subjectGrade.sum4, subjectGrade.sas];
                const validScores = scores.filter(score => score > 0);
                if (validScores.length > 0) {
                    const studentAverage = validScores.reduce((acc, score) => acc + score, 0) / validScores.length;
                    totalAverageScore += studentAverage;
                    gradedStudentsCount++;
                }
            }
        });
        const classAverage = gradedStudentsCount > 0 ? Math.round(totalAverageScore / gradedStudentsCount) : 0;
        const progress = kkm > 0 ? Math.min(100, Math.round((classAverage / kkm) * 100)) : 0;
        const nameParts = subject.name.split(' ');
        const shortName = nameParts.length > 1 ? `${nameParts[0].charAt(0)}. ${nameParts.slice(1).join(' ')}` : subject.name;
        return { id: subject.id, name: subject.name, shortName, progress, classAverage, kkm };
    });
  }, [subjects, grades, students]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-bold text-gray-800 text-sm">{data.name}</p>
          <p className={`text-lg font-bold ${data.classAverage >= data.kkm ? 'text-emerald-600' : 'text-amber-600'}`}>{data.progress}% Tercapai</p>
          <div className="mt-2 text-xs text-gray-600 space-y-1">
            <p>Rata-rata Kelas: <span className="font-bold">{data.classAverage.toFixed(1)}</span></p>
            <p>Target KKTP: <span className="font-bold">{data.kkm}</span></p>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomAttendanceTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-bold text-gray-800 text-sm mb-2">{label}</p>
          <div className="mt-2 text-xs text-gray-600 grid grid-cols-2 gap-x-4 gap-y-1">
            <p>Hadir: <span className="font-bold">{data.H} ({data.H_percent}%)</span></p>
            <p>Sakit: <span className="font-bold">{data.S} ({data.S_percent}%)</span></p>
            <p>Izin: <span className="font-bold">{data.I} ({data.I_percent}%)</span></p>
            <p>Alpha: <span className="font-bold">{data.A} ({data.A_percent}%)</span></p>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomMonthlyTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-bold text-gray-800 text-sm mb-2">Tanggal {label}</p>
          <div className="mt-2 text-xs text-gray-600 grid grid-cols-2 gap-x-4 gap-y-1">
            <p>Hadir: <span className="font-bold">{data.rawH} ({data.Hadir}%)</span></p>
            <p>Sakit: <span className="font-bold">{data.rawS} ({data.Sakit}%)</span></p>
            <p>Izin: <span className="font-bold">{data.rawI} ({data.Izin}%)</span></p>
            <p>Alpha: <span className="font-bold">{data.rawA} ({data.Alpha}%)</span></p>
          </div>
        </div>
      );
    }
    return null;
  };

  const hasPendingPermissions = pendingPermissions.length > 0;
  // Updated Priority Card Color to be more distinct for alerts
  const priorityCardStyle = hasPendingPermissions 
    ? 'bg-gradient-to-br from-orange-400 to-rose-500 shadow-orange-200' 
    : 'bg-gradient-to-br from-[#CAF4FF] to-[#A0DEFF] shadow-sky-200';
  const priorityCardText = hasPendingPermissions ? 'text-white' : 'text-slate-800';

  const handlePriorityClick = () => {
      if (hasPendingPermissions && onOpenPermissionModal) {
          onOpenPermissionModal();
      } else {
          navigate('/kegiatan');
      }
  };

  const runningTextContent = schoolProfile?.runningText || "Selamat datang di UPT SD Negeri Remen 2 ✦ Sistem Administrasi Guru & Akademik (SAGARA) ✦ Mewujudkan Pendidikan Berkualitas & Berkarakter";
  const runningTextSpeed = schoolProfile?.runningTextSpeed || 20;

  return (
    <div className="space-y-6 pb-20 animate-fade-in relative min-h-screen">
      {/* Running Text Banner */}
      <div className="w-full bg-gradient-to-r from-[#5AB2FF] to-[#A0DEFF] text-white py-2.5 px-4 rounded-xl shadow-md overflow-hidden flex items-center mb-2">
         <div className="flex items-center justify-center bg-white/20 p-1.5 rounded-full mr-3 shrink-0">
            <Info size={16} className="text-white"/>
         </div>
         <div className="overflow-hidden w-full relative h-6">
            {showRunningText && (
                <div 
                    className="animate-marquee font-bold text-sm tracking-wide whitespace-nowrap absolute top-0 left-0 animate-fade-in"
                    style={{ animationDuration: `${runningTextSpeed}s` }}
                >
                    {runningTextContent}
                </div>
            )}
         </div>
      </div>

      <div className="relative z-10 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center">
              {getGreetingIcon(getGreeting())}
              <span>Selamat {getGreeting()}, <span className="text-[#5AB2FF]">{(teacherName && teacherName !== 'undefined') ? teacherName : 'Bapak/Ibu Guru'}</span> 👋</span>
            </h1>
            <p className="text-gray-500 text-sm mt-1">Selamat datang di Aplikasi SAGARA | Sistem Akademik & Administrasi Terintegrasi. Berikut adalah ringkasan aktivitas {teachingClass ? `Kelas ${teachingClass}` : 'Sekolah'} hari ini.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
            <button 
                onClick={() => navigate('/buku-penghubung')}
                className={`relative bg-white p-2.5 rounded-xl shadow-sm border border-gray-100 transition-all ${
                    hasNewMessages 
                    ? 'text-purple-600 border-purple-200 bg-purple-50 animate-vibrate' 
                    : 'text-gray-500 hover:bg-gray-50 hover:text-purple-600'
                }`}
                title="Buku Penghubung"
            >
                <PaperPlaneIcon size={24} color={hasNewMessages ? "#9333EA" : "currentColor"} />
                {hasNewMessages && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-bounce border-2 border-white">
                        {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                    </div>
                )}
            </button>
            <div className="flex items-center space-x-2 bg-[#5AB2FF] text-white px-4 py-2 rounded-xl shadow-md">
                <BookOpen size={18} />
                <span className="text-sm font-bold">{teachingClass ? `Kelas ${teachingClass}` : 'ALL'}</span>
            </div>
            <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
                <Calendar size={24} className="text-[#5AB2FF] shrink-0" />
                <div>
                    <p className="text-lg font-bold text-gray-800 tabular-nums tracking-wider">{formattedTime}</p>
                    <p className="text-xs font-medium text-gray-500 capitalize">{formattedDate}</p>
                </div>
            </div>
            </div>
        </div>

        {/* Links Grid - UPDATED COLORS */}
        {employmentLinks.length > 0 && (
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#CAF4FF]">
             <div className="flex flex-wrap gap-4 justify-center">
                {employmentLinks.map((link, index) => (
                  <a 
                    key={link.id} 
                    href={link.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center p-3 w-24 h-24 rounded-xl transition-all border-2 bg-white border-[#CAF4FF] hover:border-[#5AB2FF] shadow-sm hover:-translate-y-1 hover:shadow-lg group text-center"
                  >
                    <div className="w-10 h-10 mb-2 rounded-lg bg-white shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden group-hover:scale-110 transition-transform">
                       {link.icon ? (
                         <img src={link.icon} alt={link.title} className="w-full h-full object-contain" />
                       ) : (
                         <LinkIcon className="text-gray-400" size={20} />
                       )}
                    </div>
                    <span className="text-xs font-semibold text-gray-600 leading-tight line-clamp-2 group-hover:text-[#5AB2FF] transition-colors">{link.title}</span>
                  </a>
                ))}
             </div>
          </div>
        )}

        {/* Summary Widgets - Themed */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Total Siswa (Ocean Blue Gradient) */}
            <div onClick={() => navigate('/siswa')} className="bg-gradient-to-br from-[#5AB2FF] to-[#A0DEFF] text-white p-5 rounded-2xl shadow-lg shadow-blue-200 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group">
                <div className="flex justify-between items-start">
                    <div>
                    <p className="text-sm font-medium text-blue-100 mb-1">Total Siswa</p>
                    <h3 className="text-3xl font-bold">{totalStudents}</h3>
                    </div>
                    <div className="p-2 bg-white/20 rounded-lg"><Users size={20} className="text-white" /></div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs font-bold">
                    <span className="px-2.5 py-1 bg-blue-600 rounded-md border border-blue-400 shadow-sm">L: {maleStudents}</span>
                    <span className="px-2.5 py-1 bg-pink-500 rounded-md border border-pink-400 shadow-sm">P: {femaleStudents}</span>
                </div>
            </div>

            {/* 2. Attendance (Sky Blue Gradient - Dark Text) */}
            <div onClick={() => navigate('/absensi')} className="bg-gradient-to-br from-[#A0DEFF] to-white text-slate-800 p-5 rounded-2xl shadow-lg shadow-sky-200 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="flex justify-between items-start">
                    <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Kehadiran Hari Ini</p>
                    <div className="flex items-end gap-2">
                        <h3 className="text-3xl font-bold">
                        {totalStudents > 0 ? (100 - (Math.round((todayStats.sick / totalStudents) * 100) + Math.round((todayStats.permit / totalStudents) * 100) + Math.round((todayStats.alpha / totalStudents) * 100))) : 0}%
                        </h3>
                    </div>
                    </div>
                    <div className="p-2 bg-slate-800/10 rounded-lg"><UserCheck size={20} className="text-slate-700" /></div>
                </div>
                <div className="mt-4 flex space-x-1 text-[10px] font-bold text-white">
                    <div className="flex-1 bg-emerald-500 rounded-l-md py-1 text-center truncate shadow-sm">H: {totalStudents - (todayStats.sick + todayStats.permit + todayStats.alpha)}</div>
                    <div className="w-10 bg-amber-400 py-1 text-center shadow-sm">S: {todayStats.sick}</div>
                    <div className="w-10 bg-indigo-500 py-1 text-center shadow-sm">I: {todayStats.permit}</div>
                    <div className="w-8 bg-rose-500 rounded-r-md py-1 text-center shadow-sm">A: {todayStats.alpha}</div>
                </div>
            </div>

            {/* 3. Admin Completeness (Cream - Dark Text) */}
            <div onClick={() => navigate('/administrasi/kelas')} className="bg-[#FFF9D0] text-amber-900 p-5 rounded-2xl shadow-lg shadow-amber-100 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl border border-amber-200">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm font-bold text-amber-700 mb-1">Administrasi</p>
                        <h3 className="text-3xl font-bold">{adminCompleteness}%</h3>
                    </div>
                    <div className="p-2 bg-white/60 rounded-lg"><FileText size={20} className="text-amber-600"/></div>
                </div>
                <div className="mt-4 w-full bg-white/50 rounded-full h-2 overflow-hidden">
                    <div className="bg-amber-500 h-2 transition-all duration-1000" style={{ width: `${adminCompleteness}%` }}></div>
                </div>
                <div className="mt-2 text-xs text-amber-800 font-medium flex justify-between">
                    <span>Kelengkapan</span>
                    <span>{adminCompleteness === 100 ? 'Sempurna!' : 'Lengkapi'}</span>
                </div>
            </div>

            {/* 4. Priority / Notification (Dynamic Gradient) */}
            <div 
                onClick={handlePriorityClick} 
                className={`${priorityCardStyle} ${priorityCardText} p-5 rounded-2xl shadow-lg cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl relative overflow-hidden`}
            >
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-3">
                        <p className={`text-sm font-medium ${hasPendingPermissions ? 'text-white/90' : 'text-slate-600'}`}>
                            {hasPendingPermissions ? 'Menunggu Konfirmasi' : 'Prioritas'}
                        </p>
                        <Bell size={18} className={`${hasPendingPermissions ? 'text-white animate-bounce' : 'text-slate-600 animate-pulse'}`} />
                    </div>
                    
                    {hasPendingPermissions ? (
                        <>
                            <h3 className="text-lg font-bold leading-tight mb-2">
                                {pendingPermissions.length} Permintaan Ijin
                            </h3>
                            <div className="flex items-center text-xs text-white mt-4 bg-white/30 w-fit px-3 py-1.5 rounded-lg border border-white/40 font-bold backdrop-blur-sm">
                                <Mail size={12} className="mr-1.5" />
                                Klik untuk memproses
                            </div>
                        </>
                    ) : priorityAgenda ? (
                        <>
                            <h3 className="text-lg font-bold leading-tight mb-2 line-clamp-2 text-slate-800">{priorityAgenda.title}</h3>
                            <div className="flex items-center text-xs text-slate-600 mt-4 bg-white/40 w-fit px-2 py-1 rounded-lg">
                                <Clock size={12} className="mr-1.5" />
                                Deadline: {formatLongDate(priorityAgenda.date)}
                            </div>
                        </>
                    ) : (
                        <>
                            <h3 className="text-lg font-bold mb-2 text-slate-800">Semua Aman!</h3>
                            <p className="text-xs text-slate-600">Tidak ada agenda mendesak.</p>
                        </>
                    )}
                </div>
            </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
            <div onClick={() => navigate('/absensi')} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-800">Tren Kehadiran Minggu Ini</h3>
                    <p className="text-sm text-gray-400">Monitoring partisipasi siswa (Senin - Sabtu)</p>
                </div>
                </div>
                <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={attendanceTrendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} domain={[0, 100]} unit="%" />
                    <Tooltip content={<CustomAttendanceTooltip />} cursor={{ fill: 'rgba(90, 178, 255, 0.1)' }} />
                    <Legend iconType="circle"/>
                    <Area type="monotone" dataKey="H_percent" name="Hadir" stroke="#10B981" fill="#10B981" fillOpacity={0.1} strokeWidth={2}/>
                    <Area type="monotone" dataKey="S_percent" name="Sakit" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.1} strokeWidth={2}/>
                    <Area type="monotone" dataKey="I_percent" name="Izin" stroke="#6366F1" fill="#6366F1" fillOpacity={0.1} strokeWidth={2}/>
                    <Area type="monotone" dataKey="A_percent" name="Alpha" stroke="#EF4444" fill="#EF4444" fillOpacity={0.1} strokeWidth={2}/>
                    </AreaChart>
                </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Rekap Absensi Bulan Ini</h3>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={monthlyLineChartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6"/>
                            <XAxis dataKey="name" tick={{fill: '#9CA3AF', fontSize: 12}}/>
                            <YAxis tick={{fill: '#9CA3AF', fontSize: 12}} domain={[0, 100]} unit="%"/>
                            <Tooltip content={<CustomMonthlyTooltip />} cursor={{ fill: 'rgba(90, 178, 255, 0.1)' }}/>
                            <Legend iconType="circle"/>
                            <Area type="monotone" dataKey="Hadir" stroke="#10B981" fill="#10B981" fillOpacity={0.1} strokeWidth={2}/>
                            <Area type="monotone" dataKey="Sakit" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.1} strokeWidth={2}/>
                            <Area type="monotone" dataKey="Izin" stroke="#6366F1" fill="#6366F1" fillOpacity={0.1} strokeWidth={2}/>
                            <Area type="monotone" dataKey="Alpha" stroke="#EF4444" fill="#EF4444" fillOpacity={0.1} strokeWidth={2}/>
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                onClick={() => navigate('/laporan-pembelajaran')}
            >
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><FileText size={18} className="mr-2 text-indigo-500"/> Laporan Pembelajaran</h3>
                <div className="space-y-3">
                    {learningReports.slice(0, 5).map(report => (
                        <div key={report.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <div>
                                <p className="text-sm font-bold text-gray-800">{report.subject}</p>
                                <p className="text-xs text-gray-500">{report.teacherName || 'Guru'}</p>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full">{report.type}</span>
                        </div>
                    ))}
                    {learningReports.length === 0 && <p className="text-sm text-gray-400 italic text-center py-4">Belum ada laporan.</p>}
                </div>
            </div>
            </div>

            {/* Side Lists with Alternating Colors */}
            <div className="space-y-6">
            <div 
                onClick={() => navigate('/absensi')}
                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
            >
                <h3 className="text-lg font-bold text-gray-800 mb-4">Absensi Hari Ini</h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {absentToday.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center py-8">
                            <UserCheck size={32} className="text-emerald-500 mb-2" />
                            <p className="font-semibold text-emerald-700">Semua siswa hadir!</p>
                        </div>
                    ) : (
                        absentToday.map((record: any, idx) => {
                            // Definisi konfigurasi status dengan tipe data yang jelas
                            const statusConfig: { [key: string]: { icon: any, color: string, label: string } } = {
                                sick: { icon: Activity, color: 'text-amber-600 bg-amber-100', label: 'Sakit' },
                                permit: { icon: FileText, color: 'text-blue-600 bg-blue-100', label: 'Izin' },
                                alpha: { icon: XCircle, color: 'text-rose-600 bg-rose-100', label: 'Alpha' }
                            };
                            
                            const defaultConfig = { icon: AlertCircle, color: 'text-gray-600 bg-gray-100', label: '?' };
                            const config = statusConfig[record.status as string] || defaultConfig;
                            const Icon = config.icon;

                            return (
                                <div key={record.studentId} className={`flex items-start space-x-3 p-3 rounded-xl border border-transparent ${getRowVariant(idx)}`}>
                                    <div className={`p-2 rounded-full ${config.color}`}>
                                        <Icon size={16} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-sm font-semibold text-gray-800">{record.name}</h4>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${config.color}`}>
                                                {config.label}
                                            </span>
                                        </div>
                                        {record.notes && (
                                            <p className="text-xs text-gray-500 mt-1 italic">"{record.notes}"</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Kalender Libur</h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {upcomingHolidays.map((holiday, idx) => (
                        <div key={holiday.id} className={`flex items-start space-x-4 p-3 rounded-xl ${getRowVariant(idx)}`}>
                            <div className="p-2 rounded-full bg-[#5AB2FF] text-white shrink-0 mt-1"><CalendarRange size={16} /></div>
                            <div className="flex-1">
                                <h4 className="text-sm font-semibold text-gray-800 line-clamp-2">{holiday.description}</h4>
                                <div className="flex items-center justify-between mt-1">
                                    <p className="text-xs text-gray-500 font-medium">{formatLongDate(holiday.date)}</p>
                                    <p className="text-xs text-[#5AB2FF] font-bold bg-white px-2 py-0.5 rounded-full border border-[#5AB2FF]">{getDaysRemaining(holiday.dateObj)}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Reminder</h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {incompleteAgendas.map((rem, idx) => (
                    <div key={rem.id} className={`flex items-start space-x-3 p-3 rounded-xl ${getRowVariant(idx)}`}>
                        <div className={`mt-1 p-1.5 rounded-full ${rem.type === 'urgent' ? 'bg-red-100 text-red-600' : rem.type === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                            {rem.type === 'urgent' ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-semibold text-gray-800 line-clamp-2">{rem.title}</h4>
                            <p className="text-xs text-gray-500 mt-0.5">{formatLongDate(rem.date)}</p>
                        </div>
                    </div>
                    ))}
                </div>
            </div>
            </div>
        </div>

        {/* Bottom Section: Target Kurikulum & Dokumentasi Pembelajaran */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className={imagesForCarousel.length > 0 ? "" : "lg:col-span-2"}>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 h-full" onClick={() => navigate('/nilai')}>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">Target Kurikulum</h3>
                            <p className="text-sm text-gray-400">Pencapaian rata-rata kelas terhadap target KKTP</p>
                        </div>
                    </div>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={curriculumProgress} margin={{ top: 5, right: 20, left: -10, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis 
                                    dataKey="shortName" 
                                    tick={{ fill: '#6B7280', fontSize: 12 }} 
                                    interval={0}
                                    angle={-35}
                                    textAnchor="end"
                                    height={50}
                                />
                                <YAxis domain={[0, 100]} unit="%" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
                                <Bar dataKey="progress" radius={[4, 4, 0, 0]}>
                                    {curriculumProgress.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {imagesForCarousel.length > 0 && (
                <div 
                    className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 h-full"
                    onClick={() => navigate('/dokumentasi-pembelajaran')}
                >
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><Camera size={18} className="mr-2 text-indigo-500"/> Dokumentasi Pembelajaran</h3>
                    <div className="relative w-full h-64 bg-gray-100 rounded-xl shadow-inner border border-gray-200 overflow-hidden group">
                        <div className="w-full h-full flex overflow-hidden">
                            {imagesForCarousel.map((image) => (
                                <div 
                                    key={image.id}
                                    className="w-full h-full flex-shrink-0 transition-transform duration-700 ease-in-out"
                                    style={{ transform: `translateX(-${carouselIndex * 100}%)` }}
                                >
                                    <img src={image.linkFoto} alt={image.namaKegiatan} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                                </div>
                            ))}
                        </div>
                        
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>

                        <div className="absolute bottom-4 left-4 text-white drop-shadow-lg max-w-[calc(100%-60px)]">
                            <p className="font-bold text-md truncate">{imagesForCarousel[carouselIndex]?.namaKegiatan}</p>
                        </div>

                        {imagesForCarousel.length > 1 && (
                            <>
                                <button onClick={(e) => { e.stopPropagation(); goToPreviousSlide(); }} className="absolute top-1/2 left-3 -translate-y-1/2 bg-white/60 p-1.5 rounded-full text-gray-800 hover:bg-white transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm">
                                    <ChevronLeft size={20} />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); goToNextSlide(); }} className="absolute top-1/2 right-3 -translate-y-1/2 bg-white/60 p-1.5 rounded-full text-gray-800 hover:bg-white transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm">
                                    <ChevronRight size={20} />
                                </button>
                                <div className="absolute bottom-3 right-3 flex gap-1.5">
                                    {imagesForCarousel.map((_, i) => (
                                        <div 
                                            key={i} 
                                            onClick={(e) => { e.stopPropagation(); setCarouselIndex(i); }} 
                                            className={`w-2 h-2 rounded-full cursor-pointer transition-all ${carouselIndex === i ? 'bg-white scale-125' : 'bg-white/50'}`}
                                        ></div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>

        <div className="fixed bottom-8 right-8 z-40 flex flex-col items-end space-y-4">
            {isFabOpen && (
            <div className="flex flex-col space-y-3 animate-fade-in-up">
                <button onClick={() => navigate('/nilai')} className="flex items-center space-x-2 bg-white text-gray-700 px-4 py-2 rounded-full shadow-lg border border-gray-100 hover:scale-105 transition-transform">
                <span className="text-sm font-medium">Input Nilai</span><div className="bg-purple-100 p-1 rounded-full"><GraduationCap size={16} className="text-purple-600"/></div>
                </button>
                <button onClick={() => navigate('/absensi')} className="flex items-center space-x-2 bg-white text-gray-700 px-4 py-2 rounded-full shadow-lg border border-gray-100 hover:scale-105 transition-transform">
                <span className="text-sm font-medium">Catat Absen</span><div className="bg-emerald-100 p-1 rounded-full"><UserCheck size={16} className="text-emerald-600"/></div>
                </button>
                <button onClick={() => navigate('/siswa')} className="flex items-center space-x-2 bg-white text-gray-700 px-4 py-2 rounded-full shadow-lg border border-gray-100 hover:scale-105 transition-transform">
                <span className="text-sm font-medium">Tambah Siswa</span><div className="bg-blue-100 p-1 rounded-full"><Users size={16} className="text-blue-600"/></div>
                </button>
            </div>
            )}
            <button onClick={() => setIsFabOpen(!isFabOpen)} className={`p-4 rounded-full shadow-xl text-white transition-all transform hover:scale-110 ${isFabOpen ? 'bg-red-500 rotate-45' : 'bg-gradient-to-r from-[#5AB2FF] to-[#A0DEFF]'}`}><Plus size={28} /></button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
