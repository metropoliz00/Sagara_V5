import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Student, GradeRecord, LiaisonLog, AgendaItem, Material, BehaviorLog, PermissionRequest, KarakterAssessment, KARAKTER_INDICATORS, KarakterIndicatorKey, LearningDocumentation, BookLoan } from '../types';
import { MOCK_SUBJECTS, CALENDAR_CODES, PREFILLED_CALENDAR_2025, HOLIDAY_DESCRIPTIONS_2025_2026 } from '../constants';
import { 
  User, Calendar, Send, FileText, CheckCircle, XCircle, 
  BookOpen, LayoutDashboard, Clock,
  Star, HeartHandshake, ListTodo,
  MapPin, CheckSquare, X, Medal, Heart, MessageCircle, Trophy,
  Edit, Save, Loader2, PlusCircle, History, MessageSquare,
  ClipboardList, Bell, Activity, Sparkles, GraduationCap, ChevronDown,
  Camera, ChevronLeft, ChevronRight,
  Sun, Moon, CloudSun, Sunset
} from 'lucide-react';
import { apiService } from '../services/apiService';
import { useModal } from '../context/ModalContext';

interface StudentPortalProps {
  student: Student;
  allAttendance: any[];
  grades: GradeRecord[];
  liaisonLogs: LiaisonLog[];
  agendas: AgendaItem[];
  behaviorLogs: BehaviorLog[];
  permissionRequests: PermissionRequest[];
  karakterAssessments: KarakterAssessment[];
  onSaveLiaison: (log: Omit<LiaisonLog, 'id'>) => Promise<void>;
  onSavePermission: (date: string, records: any[]) => Promise<void>;
  onSaveKarakter: (studentId: string, assessment: Omit<KarakterAssessment, 'studentId' | 'classId'>) => Promise<void>;
  onUpdateStudent: (student: Student) => Promise<void>;
  learningDocumentation?: LearningDocumentation[];
  bookLoans: BookLoan[];
  materials?: Material[];
}

type PortalTab = 'dashboard' | 'attendance' | 'liaison' | 'profile' | 'character' | 'materi';

const StudentPortal: React.FC<StudentPortalProps> = ({
  student, allAttendance, grades, liaisonLogs, agendas, behaviorLogs, permissionRequests, karakterAssessments,
  onSaveLiaison, onSavePermission, onSaveKarakter, onUpdateStudent, learningDocumentation = [], bookLoans = [], materials = []
}) => {
  const [activeTab, setActiveTab] = useState<PortalTab>('dashboard');
  const { showAlert } = useModal();
  
  // -- STATES FOR DASHBOARD GRADES --
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(MOCK_SUBJECTS[0]?.id || 'pai');
  const [showRecapReport, setShowRecapReport] = useState(false);
  const [showSummative, setShowSummative] = useState(false);
  const [kktpMap, setKktpMap] = useState<Record<string, number>>({});
  const [academicCalendar, setAcademicCalendar] = useState<any>({});

  // -- STATES FOR FORMS --
  const [permissionForm, setPermissionForm] = useState({
      date: new Date().toISOString().split('T')[0],
      type: 'sick',
      reason: ''
  });
  const [isSubmittingPermission, setIsSubmittingPermission] = useState(false);

  const [liaisonForm, setLiaisonForm] = useState({
      category: 'Informasi',
      message: ''
  });
  const [isSubmittingLiaison, setIsSubmittingLiaison] = useState(false);

  // Character Assessment State
  const [karakterForm, setKarakterForm] = useState<Partial<KarakterAssessment>>({});
  const [isSavingKarakter, setIsSavingKarakter] = useState(false);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState<Partial<Student>>(student);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // -- NOTIFICATION STATE --
  const [lastSeenLiaisonId, setLastSeenLiaisonId] = useState<string>(() => {
    return localStorage.getItem(`last_seen_liaison_${student.id}`) || '';
  });

  const hasNewTeacherMessage = useMemo(() => {
    const teacherLogs = liaisonLogs.filter(l => l.studentId === student.id && l.sender === 'Guru');
    if (teacherLogs.length === 0) return false;
    const latestId = teacherLogs[0].id; // logs are sorted by date desc in myLiaisonLogs, but here we check raw liaisonLogs
    
    // Sort to get the actual latest
    const sortedTeacherLogs = [...teacherLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const actualLatestId = sortedTeacherLogs[0].id;
    
    return actualLatestId !== lastSeenLiaisonId;
  }, [liaisonLogs, student.id, lastSeenLiaisonId]);

  // -- STATE FOR CLOCK --
  const [currentDate, setCurrentDate] = useState(new Date());

  // Carousel State
  const [carouselIndex, setCarouselIndex] = useState(0);
  const carouselTimeoutRef = useRef<number | null>(null);
  const imagesForCarousel = useMemo(() => learningDocumentation.filter(doc => doc.linkFoto && doc.linkFoto.startsWith('http')), [learningDocumentation]);

  // -- EFFECTS --
  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setProfileData(student);
  }, [student]);

  useEffect(() => {
      // Load existing character assessment if available
      if (karakterAssessments && karakterAssessments.length > 0) {
          const myAssessment = karakterAssessments.find(k => k.studentId === student.id);
          if (myAssessment) {
              setKarakterForm(myAssessment);
          }
      }
  }, [karakterAssessments, student.id]);

  // NEW: Check if Recap Report is enabled and load KKTP for this class
  useEffect(() => {
      const checkConfig = async () => {
          if (student.classId) {
              try {
                  const config = await apiService.getClassConfig(student.classId);
                  if (config) {
                      if (config.settings?.showStudentRecap) {
                          setShowRecapReport(true);
                      } else {
                          setShowRecapReport(false);
                      }
                      
                      if (config.settings?.showSummativeToStudents) {
                          setShowSummative(true);
                      } else {
                          setShowSummative(false);
                      }
                      
                      // Load KKTP data
                      let finalKktp: Record<string, number> = {};
                      const fetchedKktp = (config as any).KKTP || config.kktp;
                      if (fetchedKktp && Object.keys(fetchedKktp).length > 0) {
                          finalKktp = fetchedKktp;
                      } else {
                          // Fallback to MOCK_SUBJECTS if not configured
                          MOCK_SUBJECTS.forEach(s => {
                              finalKktp[s.id] = s.kkm;
                          });
                      }
                      setKktpMap(finalKktp);
                      
                      if (config.academicCalendar && Object.keys(config.academicCalendar).length > 0) {
                          setAcademicCalendar(config.academicCalendar);
                      } else {
                          // Try fetching global academic calendar
                          try {
                              const globalCalendar = await apiService.getAcademicCalendar('global');
                              if (globalCalendar && Object.keys(globalCalendar).length > 0) {
                                  setAcademicCalendar(globalCalendar);
                              } else {
                                  setAcademicCalendar(PREFILLED_CALENDAR_2025);
                              }
                          } catch (err) {
                              console.error("Failed to load global academic calendar", err);
                              setAcademicCalendar(PREFILLED_CALENDAR_2025);
                          }
                      }
                  }
              } catch (e) {
                  console.error("Failed to load class config for student");
              }
          }
      };
      checkConfig();
  }, [student.classId]);
  
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

  useEffect(() => {
    if (activeTab === 'liaison' && hasNewTeacherMessage) {
        const teacherLogs = liaisonLogs.filter(l => l.studentId === student.id && l.sender === 'Guru');
        if (teacherLogs.length > 0) {
            const sortedTeacherLogs = [...teacherLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            const actualLatestId = sortedTeacherLogs[0].id;
            setLastSeenLiaisonId(actualLatestId);
            localStorage.setItem(`last_seen_liaison_${student.id}`, actualLatestId);
        }
    }
  }, [activeTab, hasNewTeacherMessage, liaisonLogs, student.id]);

  // -- HANDLERS --

  const handleProfileChange = (field: keyof Student, value: any) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
        await onUpdateStudent(profileData as Student);
        showAlert('Data berhasil diperbarui!', 'success');
        setIsEditingProfile(false);
    } catch (e) {
        showAlert('Gagal menyimpan profil.', 'error');
    } finally {
        setIsSavingProfile(false);
    }
  };

  const handleSubmitPermission = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!permissionForm.reason) {
          showAlert("Mohon isi alasan.", "error");
          return;
      }
      setIsSubmittingPermission(true);
      try {
          const records = [{
              studentId: student.id,
              classId: student.classId,
              status: permissionForm.type,
              notes: permissionForm.reason
          }];
          await onSavePermission(permissionForm.date, records);
          setPermissionForm({ ...permissionForm, reason: '' });
      } catch (e) {
          showAlert("Gagal mengirim pengajuan.", "error");
      } finally {
          setIsSubmittingPermission(false);
      }
  };

  const handleSubmitLiaison = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!liaisonForm.message) {
          showAlert("Pesan tidak boleh kosong.", "error");
          return;
      }
      setIsSubmittingLiaison(true);
      try {
          await onSaveLiaison({
              classId: student.classId,
              studentId: student.id,
              date: new Date().toISOString().split('T')[0],
              sender: 'Wali Murid',
              category: liaisonForm.category,
              message: liaisonForm.message,
              status: 'Pending'
          });
          setLiaisonForm({ ...liaisonForm, message: '' });
      } catch (e) {
          showAlert("Gagal mengirim pesan.", "error");
      } finally {
          setIsSubmittingLiaison(false);
      }
  };

  const handleSaveKarakterLocal = async () => {
      setIsSavingKarakter(true);
      try {
          const assessmentToSave: Omit<KarakterAssessment, 'studentId' | 'classId'> = {
              bangunPagi: karakterForm.bangunPagi || '',
              beribadah: karakterForm.beribadah || '',
              berolahraga: karakterForm.berolahraga || '',
              makanSehat: karakterForm.makanSehat || '',
              gemarBelajar: karakterForm.gemarBelajar || '',
              bermasyarakat: karakterForm.bermasyarakat || '',
              tidurAwal: karakterForm.tidurAwal || '',
              catatan: karakterForm.catatan,
              afirmasi: karakterForm.afirmasi
          };
          await onSaveKarakter(student.id, assessmentToSave);
          showAlert("Self-assessment 7 Kebiasaan berhasil disimpan.", "success");
      } catch (e) {
          showAlert("Gagal menyimpan.", "error");
      } finally {
          setIsSavingKarakter(false);
      }
  };

  const handleKarakterChange = (key: KarakterIndicatorKey, value: string) => {
      setKarakterForm(prev => ({ ...prev, [key]: value }));
  };

  const goToPreviousSlide = () => setCarouselIndex((prev) => (prev - 1 + imagesForCarousel.length) % imagesForCarousel.length);
  const goToNextSlide = () => setCarouselIndex((prev) => (prev + 1) % imagesForCarousel.length);

  // -- COMPUTED DATA --

  const formattedTime = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(currentDate).replace(/\./g, ':');

  const formattedDate = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(currentDate);

  const getGreeting = useMemo(() => {
    const hour = currentDate.getHours();
    if (hour >= 5 && hour < 11) return "Pagi";
    if (hour >= 11 && hour < 15) return "Siang";
    if (hour >= 15 && hour < 19) return "Sore";
    return "Malam";
  }, [currentDate]);

  const getGreetingIcon = useMemo(() => {
    switch (getGreeting) {
      case 'Pagi': return <CloudSun className="text-yellow-400 mr-3 inline-block animate-pulse-slow" size={32} />;
      case 'Siang': return <Sun className="text-orange-500 mr-3 inline-block animate-spin-slow" size={32} />;
      case 'Sore': return <Sunset className="text-orange-400 mr-3 inline-block" size={32} />;
      case 'Malam': return <Moon className="text-indigo-400 mr-3 inline-block" size={32} />;
      default: return <Sun className="text-yellow-500 mr-3 inline-block" size={32} />;
    }
  }, [getGreeting]);

  const getLocalISODate = (date: Date) => { const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0'); const d = String(date.getDate()).padStart(2, '0'); return `${y}-${m}-${d}`; };

  const attendanceStats = useMemo(() => {
    // Filter for accumulated data based on academic semester
    // Semester 1 (Ganjil): July (6) - December (11)
    // Semester 2 (Genap): January (0) - June (5)
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const todayStr = getLocalISODate(now);

    const isSemester1 = currentMonth >= 6;
    const startMonth = isSemester1 ? 6 : 0;
    const endMonth = isSemester1 ? 11 : 5;

    const accumulatedRecords = allAttendance.filter((r: any) => {
        if (!r.date) return false;
        // Parse date manually to avoid timezone shifts
        const parts = r.date.split('-');
        if (parts.length !== 3) return false;
        const y = parseInt(parts[0]);
        const m = parseInt(parts[1]) - 1; // 0-indexed
        
        return String(r.studentId) === String(student.id) && 
               y === currentYear &&
               m >= startMonth &&
               m <= endMonth;
    });

    const counts = { present: 0, sick: 0, permit: 0, alpha: 0, dispensation: 0 };
    accumulatedRecords.forEach((r: any) => {
        if (counts[r.status as keyof typeof counts] !== undefined) {
            counts[r.status as keyof typeof counts]++;
        }
    });
    
    // Total Presence Percentage (Global) for the Header Badge
    const globalRecords = allAttendance.filter((r: any) => String(r.studentId) === String(student.id));
    const globalPresent = globalRecords.filter((r: any) => r.status === 'present' || r.status === 'dispensation').length;
    const globalTotal = globalRecords.length || 1;
    const percentage = Math.round((globalPresent / globalTotal) * 100);

    // Today's status
    const todayRecord = allAttendance.find((r: any) => String(r.studentId) === String(student.id) && r.date === todayStr);
    const todayStatus = todayRecord ? todayRecord.status : null;

    return { 
        percentage, 
        counts, 
        monthName: new Date(currentYear, currentMonth).toLocaleString('id-ID', { month: 'long' }), 
        startMonthName: new Date(currentYear, startMonth).toLocaleString('id-ID', { month: 'long' }),
        semesterName: isSemester1 ? 'Ganjil' : 'Genap',
        year: currentYear,
        todayStatus 
    };
  }, [student, allAttendance]);

  const upcomingAgendas = useMemo(() => {
      return agendas
        .filter(a => !a.completed)
        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [agendas]);

  const myLiaisonLogs = useMemo(() => {
      return liaisonLogs
        .filter(l => l.studentId === student.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [liaisonLogs, student.id]);

  const myPermissions = useMemo(() => {
      return permissionRequests
        .filter(p => p.studentId === student.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [permissionRequests, student.id]);

  // -- GRADES CALCULATION FOR DASHBOARD --
  const selectedGradeData = useMemo(() => {
      const studentGrades = grades.find(g => g.studentId === student.id);
      const subjectData = studentGrades?.subjects[selectedSubjectId] || { sum1: 0, sum2: 0, sum3: 0, sum4: 0, sas: 0 };
      
      const scores = [subjectData.sum1, subjectData.sum2, subjectData.sum3, subjectData.sum4, subjectData.sas];
      const filledScores = scores.filter(s => s > 0);
      const average = filledScores.length > 0 
          ? Math.round(filledScores.reduce((a, b) => a + b, 0) / filledScores.length) 
          : 0;

      return { ...subjectData, average };
  }, [grades, student.id, selectedSubjectId]);

  // -- RECAP DATA CALCULATION (If Enabled) --
  const myRecapData = useMemo(() => {
      if (!showRecapReport) return null;

      // 1. Calculate scores for all students in class to determine rank
      const classScores = grades
          .filter(g => g.classId === student.classId)
          .map(record => {
              let total = 0;
              MOCK_SUBJECTS.forEach(subj => {
                  const sData = record.subjects[subj.id];
                  if (sData) {
                      const vals = [sData.sum1, sData.sum2, sData.sum3, sData.sum4, sData.sas].filter(v => v > 0);
                      if (vals.length > 0) {
                          total += Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
                      }
                  }
              });
              return { studentId: record.studentId, total };
          })
          .sort((a, b) => b.total - a.total);

      const myRankIndex = classScores.findIndex(s => s.studentId === student.id);
      const rank = myRankIndex !== -1 ? myRankIndex + 1 : '-';
      
      // 2. Prepare My Detailed Data
      const myRecord = grades.find(g => g.studentId === student.id);
      const subjectsData = MOCK_SUBJECTS.map(subj => {
          const sData = myRecord?.subjects[subj.id] || { sum1: 0, sum2: 0, sum3: 0, sum4: 0, sas: 0 };
          const vals = [sData.sum1, sData.sum2, sData.sum3, sData.sum4, sData.sas].filter(v => v > 0);
          const final = vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
          return {
              id: subj.id,
              name: subj.name,
              ...sData,
              final
          };
      });

      const myTotal = classScores.find(s => s.studentId === student.id)?.total || 0;

      return { subjects: subjectsData, rank, total: myTotal };
  }, [showRecapReport, grades, student.id, student.classId]);


  // -- CALENDAR STATE --
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const calendarDays = useMemo(() => {
      const year = calendarMonth.getFullYear();
      const month = calendarMonth.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
      const monthCalendarData = academicCalendar?.[monthKey] || [];
      
      const days = [];
      // Pad start (0 = Sunday, 1 = Monday, etc.)
      for (let i = 0; i < firstDay.getDay(); i++) {
          days.push(null);
      }
      
      for (let i = 1; i <= lastDay.getDate(); i++) {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
          const record = allAttendance.find((r: any) => String(r.studentId) === String(student.id) && r.date === dateStr);
          
          let holidayCode = null;
          let holidayLabel = null;
          let isSunday = new Date(year, month, i).getDay() === 0;
          
          if (monthCalendarData[i - 1]) {
              const code = monthCalendarData[i - 1];
              if (CALENDAR_CODES[code]) {
                  holidayCode = code;
                  const specificDescription = academicCalendar?.__descriptions__?.[dateStr] || HOLIDAY_DESCRIPTIONS_2025_2026[dateStr];
                  holidayLabel = specificDescription || CALENDAR_CODES[code].label;
              }
          } else if (isSunday) {
              holidayCode = 'LU';
              holidayLabel = 'Libur Akhir Pekan';
          }
          
          days.push({
              day: i,
              dateStr,
              status: record ? record.status : null,
              reason: record ? record.reason : null,
              holidayCode,
              holidayLabel
          });
      }
      return days;
  }, [calendarMonth, allAttendance, student.id, academicCalendar]);

  const prevMonth = () => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
  const nextMonth = () => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));

  const TABS = [
    { id: 'dashboard', label: 'Ringkasan', icon: LayoutDashboard },
    { id: 'attendance', label: 'Izin & Absensi', icon: Calendar },
    { id: 'materi', label: 'Materi', icon: BookOpen },
    { id: 'liaison', label: 'Buku Penghubung', icon: MessageSquare },
    { id: 'profile', label: 'Profil Siswa', icon: User },
    { id: 'character', label: 'Karakter', icon: HeartHandshake },
  ];

  const currentKktp = kktpMap[selectedSubjectId] || MOCK_SUBJECTS.find(s => s.id === selectedSubjectId)?.kkm || 75;

  // Updated with short labels for mobile
  const scoreItems = [
      { key: 'sum1', label: 'Sumatif 1', short: 'S1' },
      { key: 'sum2', label: 'Sumatif 2', short: 'S2' },
      { key: 'sum3', label: 'Sumatif 3', short: 'S3' },
      { key: 'sum4', label: 'Sumatif 4', short: 'S4' },
      { key: 'sas', label: 'SAS', short: 'SAS' },
  ];

  const average = selectedGradeData.average;
  const hasAverage = average > 0;
  const isAverageBelowKktp = hasAverage && average < currentKktp;

  return (
    <div className="animate-fade-in pb-24 space-y-4 font-sans text-slate-800 max-w-[1280px] mx-auto">
      
      {/* 1. HEADER PROFILE */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-[#5AB2FF] to-[#A0DEFF] z-0"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-center md:justify-between items-center mb-6 gap-4">
            <div className="flex items-center space-x-3 bg-white/70 backdrop-blur-sm px-4 py-2 rounded-xl shadow-sm border border-gray-100">
                <Calendar size={24} className="text-[#5AB2FF] shrink-0" />
                <div>
                    <p className="text-lg font-bold text-gray-800 tabular-nums tracking-wider">{formattedTime}</p>
                    <p className="text-xs font-medium text-gray-500 capitalize">{formattedDate}</p>
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-white drop-shadow-md hidden md:flex items-center">
                  {getGreetingIcon} Selamat {getGreeting}! 👋
                </h1>
                
                {/* Notification Bell for Students */}
                <button 
                    onClick={() => setActiveTab('liaison')}
                    className={`p-2.5 rounded-full transition-all relative shadow-sm border ${
                        hasNewTeacherMessage 
                        ? 'bg-red-500 text-white border-red-400 animate-vibrate' 
                        : 'bg-white/80 text-[#5AB2FF] border-white/50 hover:bg-white'
                    }`}
                    title="Pesan dari Guru"
                >
                    <Bell size={22} />
                    {hasNewTeacherMessage && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-pulse"></span>
                    )}
                </button>
            </div>
          </div>

          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-6">
              <div className="w-28 h-28 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white shrink-0">
                  {student.photo && !student.photo.startsWith('ERROR') ? (
                      <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                  ) : (
                      <div className="w-full h-full flex items-center justify-center text-indigo-300 bg-indigo-50"><User size={48}/></div>
                  )}
              </div>

              <div className="flex-1 text-center md:text-left mb-1">
                  <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#5AB2FF] to-blue-500 mb-2">
                      {student.name}
                  </h1>
                  <div className="inline-flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm text-gray-600">
                      <span className="bg-gray-100 px-3 py-1 rounded-full font-bold border border-gray-200 shadow-sm flex items-center text-slate-700">
                          NIS: {student.nis}
                      </span>
                      {/* ADDED NISN */}
                      <span className="bg-[#CAF4FF] text-[#5AB2FF] px-3 py-1 rounded-full font-bold border border-blue-100 shadow-sm flex items-center">
                          NISN: {student.nisn || '-'}
                      </span>
                      <span className="flex items-center font-medium bg-white/50 px-2 py-1 rounded-lg">
                          <BookOpen size={16} className="mr-1.5 text-gray-400"/> Kelas {student.classId}
                      </span>
                  </div>
              </div>

              <div className="flex gap-3 mb-2 shrink-0 md:self-end">
                  <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl text-center min-w-[80px] shadow-sm">
                      <span className="block text-[10px] font-bold text-emerald-600 uppercase mb-1">Hadir (Total)</span>
                      <span className="text-xl font-black text-emerald-700">{attendanceStats.percentage}%</span>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl text-center min-w-[80px] shadow-sm">
                      <span className="block text-[10px] font-bold text-amber-600 uppercase mb-1">Poin Sikap</span>
                      <span className="text-xl font-black text-amber-700">{student.behaviorScore}</span>
                  </div>
              </div>
          </div>
      </div>

      {/* 2. STICKY NAVIGATION */}
      <div className="sticky top-0 z-30 bg-gray-50/95 backdrop-blur-md py-2 -mx-4 px-4 border-b border-gray-200 shadow-sm overflow-x-auto no-scrollbar">
        <div className="flex gap-2 min-w-max pb-1">
            {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as PortalTab)} 
                        className={`flex items-center px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap border ${
                            isActive 
                            ? 'bg-[#5AB2FF] text-white border-[#5AB2FF] shadow-md' 
                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'
                        }`}
                    >
                        <Icon size={16} className="mr-2"/> {tab.label}
                    </button>
                )
            })}
        </div>
      </div>

      {/* 3. MAIN CONTENT */}
      <div className="min-h-[500px]">
          
          {/* --- DASHBOARD TAB --- */}
          {activeTab === 'dashboard' && (
              <div className="space-y-6">
                  {/* 1. Catatan Guru - HIGHLIGHTED */}
                  {student.teacherNotes && (
                      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 rounded-2xl shadow-lg text-white animate-fade-in relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
                          <h4 className="font-bold text-lg mb-3 flex items-center relative z-10">
                              <MessageCircle size={22} className="mr-2"/> Catatan Wali Kelas
                          </h4>
                          <div className="relative z-10 bg-white/10 p-4 rounded-xl border border-white/20 backdrop-blur-sm">
                              <p className="text-sm text-white leading-relaxed italic">
                                  "{student.teacherNotes}"
                              </p>
                          </div>
                      </div>
                  )}

                  {/* 2. Accumulated Attendance Stats */}
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                      <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                          <Activity className="mr-2 text-[#5AB2FF]" size={18}/> Rekap Laporan Absensi Semester {attendanceStats.semesterName} ({attendanceStats.startMonthName} - {attendanceStats.monthName} {attendanceStats.year})
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-center">
                              <span className="text-2xl font-black text-emerald-600 block mb-1">{attendanceStats.counts.present + attendanceStats.counts.dispensation}</span>
                              <span className="text-xs font-bold text-emerald-700 uppercase">Hadir</span>
                          </div>
                          <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl text-center">
                              <span className="text-2xl font-black text-amber-600 block mb-1">{attendanceStats.counts.sick}</span>
                              <span className="text-xs font-bold text-amber-700 uppercase">Sakit</span>
                          </div>
                          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-center">
                              <span className="text-2xl font-black text-blue-600 block mb-1">{attendanceStats.counts.permit}</span>
                              <span className="text-xs font-bold text-blue-700 uppercase">Izin</span>
                          </div>
                          <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-center">
                              <span className="text-2xl font-black text-red-600 block mb-1">{attendanceStats.counts.alpha}</span>
                              <span className="text-xs font-bold text-red-700 uppercase">Alpha</span>
                          </div>
                      </div>
                      <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl flex items-center justify-between">
                          <span className="text-sm font-bold text-gray-700">Status Kehadiran Hari Ini:</span>
                          <span className={`text-sm font-bold px-3 py-1 rounded-lg ${
                              attendanceStats.todayStatus === 'present' ? 'bg-emerald-100 text-emerald-700' :
                              attendanceStats.todayStatus === 'sick' ? 'bg-amber-100 text-amber-700' :
                              attendanceStats.todayStatus === 'permit' ? 'bg-blue-100 text-blue-700' :
                              attendanceStats.todayStatus === 'alpha' ? 'bg-red-100 text-red-700' :
                              attendanceStats.todayStatus === 'dispensation' ? 'bg-purple-100 text-purple-700' :
                              'bg-gray-200 text-gray-600'
                          }`}>
                              {attendanceStats.todayStatus === 'present' ? 'Hadir' :
                               attendanceStats.todayStatus === 'sick' ? 'Sakit' :
                               attendanceStats.todayStatus === 'permit' ? 'Izin' :
                               attendanceStats.todayStatus === 'alpha' ? 'Alpha' :
                               attendanceStats.todayStatus === 'dispensation' ? 'Dispensasi' :
                               'Belum Tercatat'}
                          </span>
                      </div>
                  </div>
                  
                  {/* Split view for Grades and Agenda */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* 3. Academic Summary (Nilai Sumatif) - UPDATED 1 ROW MOBILE */}
                      {showSummative && (
                      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                              <h3 className="font-bold text-gray-800 flex items-center">
                                  <GraduationCap className="mr-2 text-indigo-500" size={20}/> Hasil Belajar (Sumatif)
                              </h3>
                              <div className="relative w-full sm:w-auto">
                                  <select 
                                    value={selectedSubjectId} 
                                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                                    className="w-full sm:w-48 appearance-none bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold py-2 pl-4 pr-10 rounded-xl outline-none focus:ring-2 focus:ring-indigo-200 cursor-pointer text-sm"
                                  >
                                      {MOCK_SUBJECTS.map(s => (
                                          <option key={s.id} value={s.id}>{s.name}</option>
                                      ))}
                                  </select>
                                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none"/>
                              </div>
                          </div>

                          {/* Grid Layout for compact row on mobile */}
                          <div className="grid grid-cols-6 gap-1 sm:gap-3">
                              {scoreItems.map(item => {
                                  const score = selectedGradeData[item.key as keyof typeof selectedGradeData] as number;
                                  const isSas = item.key === 'sas';
                                  const hasScore = score > 0;
                                  const isBelowKktp = hasScore && score < currentKktp;
                                  
                                  const defaultBg = isSas ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100';
                                  const successBg = 'bg-emerald-50 border-emerald-200';
                                  const failBg = 'bg-red-50 border-red-200';

                                  const successText = 'text-emerald-700';
                                  const failText = 'text-red-700';

                                  const successLabel = 'text-emerald-600';
                                  const failLabel = 'text-red-500';

                                  return (
                                      <div key={item.key} className={`p-1 sm:p-3 rounded-lg sm:rounded-xl text-center flex flex-col justify-center border transition-all ${
                                          !hasScore ? defaultBg : isBelowKktp ? failBg : successBg
                                      }`}>
                                          <span className={`text-[10px] font-bold uppercase mb-1 ${
                                              !hasScore ? 'text-gray-400' : isBelowKktp ? failLabel : successLabel
                                          }`}>
                                              <span className="sm:hidden">{item.short}</span>
                                              <span className="hidden sm:inline">{item.label}</span>
                                          </span>
                                          <span className={`text-sm sm:text-xl font-bold ${
                                              !hasScore ? 'text-gray-300' : isBelowKktp ? failText : successText
                                          }`}>
                                              {hasScore ? score : '-'}
                                          </span>
                                          {hasScore && (
                                              <span className={`hidden sm:block text-[9px] font-bold mt-1 ${isBelowKktp ? 'text-red-500' : 'text-emerald-600'}`}>
                                                  {isBelowKktp ? 'Remedial' : 'Pengayaan'}
                                              </span>
                                          )}
                                      </div>
                                  );
                              })}
                              
                              {/* Final Grade Card Integrated into Row */}
                              <div className={`p-1 sm:p-3 rounded-lg sm:rounded-xl text-center flex flex-col justify-center border transition-all ${
                                !hasAverage ? 'bg-gray-50 border-gray-100' :
                                isAverageBelowKktp ? 'bg-red-600 text-white border-red-600' : 'bg-emerald-600 text-white border-emerald-600'
                              }`}>
                                  <span className={`text-[10px] font-bold uppercase mb-1 ${!hasAverage ? 'text-gray-400' : 'text-white/80'}`}>
                                      <span className="sm:hidden">NA</span>
                                      <span className="hidden sm:inline">Nilai Akhir</span>
                                  </span>
                                  <span className={`text-base sm:text-2xl font-black ${!hasAverage ? 'text-gray-300' : 'text-white'}`}>
                                      {hasAverage ? average : '-'}
                                  </span>
                                  {hasAverage && (
                                      <span className="hidden sm:block text-[9px] font-bold mt-1 text-white/90">
                                          {isAverageBelowKktp ? 'Perlu Perbaikan' : 'Tercapai'}
                                      </span>
                                  )}
                              </div>
                          </div>
                      </div>
                      )}

                      {/* 5. Agenda */}
                      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full">
                          <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                              <ListTodo className="mr-2 text-[#5AB2FF]" size={18}/> Agenda Kegiatan
                          </h3>
                          <div className="space-y-3 flex-1">
                              {upcomingAgendas.length === 0 ? (
                                  <div className="text-center text-gray-400 text-sm py-8 italic">Tidak ada agenda mendatang.</div>
                              ) : (
                                  upcomingAgendas.slice(0, 5).map(agenda => (
                                      <div key={agenda.id} className="flex items-start p-3 bg-gray-50 rounded-xl border border-gray-100">
                                          <div className={`mt-1.5 w-2.5 h-2.5 rounded-full mr-3 shrink-0 ${agenda.type==='urgent'?'bg-red-500': agenda.type==='warning'?'bg-amber-500':'bg-blue-500'}`}></div>
                                          <div>
                                              <h4 className="text-sm font-bold text-gray-800">{agenda.title}</h4>
                                              <p className="text-xs text-gray-500 mt-1 flex items-center">
                                                  <Calendar size={10} className="mr-1"/> {new Date(agenda.date).toLocaleDateString('id-ID', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'})}
                                              </p>
                                          </div>
                                      </div>
                                  ))
                              )}
                          </div>
                      </div>
                  </div>

                  {/* 4. REKAP RAPOR TABLE (CONDITIONAL) */}
                  {showRecapReport && myRecapData && (
                      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-fade-in-up">
                          <div className="flex justify-between items-center mb-4">
                              <h3 className="font-bold text-gray-800 flex items-center">
                                  <Trophy className="mr-2 text-amber-500" size={20}/> Rekapitulasi Nilai Rapor
                              </h3>
                              <div className="flex items-center gap-2">
                                  <span className="text-xs bg-amber-50 text-amber-700 px-3 py-1 rounded-full font-bold border border-amber-100">
                                      Ranking: {myRecapData.rank}
                                  </span>
                                  <span className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-bold border border-emerald-100">
                                      Total: {myRecapData.total}
                                  </span>
                              </div>
                          </div>
                          
                          <div className="overflow-x-auto">
                              <table className="w-full text-sm text-left border-collapse rounded-lg overflow-hidden">
                                  <thead className="bg-slate-50 text-slate-600 font-bold text-xs uppercase">
                                      <tr>
                                          <th className="p-3">Mata Pelajaran</th>
                                          <th className="p-3 text-center">Sum 1</th>
                                          <th className="p-3 text-center">Sum 2</th>
                                          <th className="p-3 text-center">Sum 3</th>
                                          <th className="p-3 text-center">Sum 4</th>
                                          <th className="p-3 text-center bg-blue-50/50">SAS</th>
                                          <th className="p-3 text-center bg-emerald-50 text-emerald-700">Akhir</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                      {myRecapData.subjects.map((subj, idx) => {
                                          const kktp = kktpMap[subj.id] || MOCK_SUBJECTS.find(s => s.id === subj.id)?.kkm || 75;
                                          const isBelowKktp = subj.final > 0 && subj.final < kktp;
                                          return (
                                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-3 font-medium text-gray-700">{subj.name}</td>
                                                <td className="p-3 text-center text-gray-500">{subj.sum1 || '-'}</td>
                                                <td className="p-3 text-center text-gray-500">{subj.sum2 || '-'}</td>
                                                <td className="p-3 text-center text-gray-500">{subj.sum3 || '-'}</td>
                                                <td className="p-3 text-center text-gray-500">{subj.sum4 || '-'}</td>
                                                <td className="p-3 text-center font-semibold bg-blue-50/30 text-blue-700">{subj.sas || '-'}</td>
                                                <td className={`p-3 text-center font-bold bg-emerald-50/50 text-emerald-700`}>
                                                    <div className="flex flex-col items-center">
                                                        <span>{subj.final || '-'}</span>
                                                        {subj.final > 0 && (
                                                            <span className={`text-[9px] font-bold mt-1 ${isBelowKktp ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                                {isBelowKktp ? 'Remedial' : 'Pengayaan'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                      })}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  )}

                  {/* Carousel Dokumentasi */}
                  {imagesForCarousel.length > 0 && (
                      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-fade-in-up">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                            <Camera className="mr-2 text-indigo-500" size={20}/> Dokumentasi Kegiatan Kelas
                        </h3>
                        <div className="relative w-full h-72 bg-gray-100 rounded-xl shadow-inner border border-gray-200 overflow-hidden group">
                          <div className="w-full h-full flex overflow-hidden">
                            {imagesForCarousel.map((image) => (
                                <div 
                                    key={image.id}
                                    className="w-full h-full flex-shrink-0 transition-transform duration-700 ease-in-out"
                                    style={{ transform: `translateX(-${carouselIndex * 100}%)` }}
                                >
                                    <img src={image.linkFoto} alt={image.namaKegiatan} className="w-full h-full object-contain" />
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

                  {/* 6. Peminjaman Buku Paket */}
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-fade-in-up">
                      <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                          <BookOpen className="mr-2 text-indigo-500" size={20}/> Informasi Peminjaman Buku Paket
                      </h3>
                      <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left border-collapse rounded-lg overflow-hidden">
                              <thead className="bg-indigo-50 text-indigo-800 font-bold text-xs uppercase">
                                  <tr>
                                      <th className="p-3 text-center w-12">No</th>
                                      <th className="p-3">Buku Paket</th>
                                      <th className="p-3 text-center">Jumlah</th>
                                      <th className="p-3 text-center">Status</th>
                                      <th className="p-3">Keterangan</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                  {bookLoans.length === 0 ? (
                                      <tr>
                                          <td colSpan={5} className="p-8 text-center text-gray-400 italic">
                                              Tidak ada data peminjaman buku.
                                          </td>
                                      </tr>
                                  ) : (
                                      bookLoans.map((loan, idx) => (
                                          <tr key={loan.id} className="hover:bg-indigo-50/30 transition-colors">
                                              <td className="p-3 text-center text-gray-500 font-mono">{idx + 1}</td>
                                              <td className="p-3">
                                                  <div className="flex flex-wrap gap-1">
                                                      {loan.books.map((book: string, bIdx: number) => (
                                                          <span 
                                                              key={bIdx} 
                                                              className="px-2 py-0.5 bg-white border border-indigo-100 text-indigo-700 rounded-full text-[10px] font-medium shadow-sm"
                                                          >
                                                              {book}
                                                          </span>
                                                      ))}
                                                  </div>
                                                  <div className="text-[10px] text-gray-400 mt-1">
                                                      Pinjam pada {new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(loan.date))}
                                                  </div>
                                              </td>
                                              <td className="p-3 text-center font-bold text-indigo-600">{loan.qty}</td>
                                              <td className="p-3 text-center">
                                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                                                      loan.status === 'Dipinjam' 
                                                          ? 'bg-amber-50 text-amber-700 border-amber-200' 
                                                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                  }`}>
                                                      {loan.status === 'Dipinjam' ? <Clock size={12} className="mr-1" /> : <CheckCircle size={12} className="mr-1" />}
                                                      {loan.status}
                                                  </span>
                                              </td>
                                              <td className="p-3 text-gray-600 italic text-xs">
                                                  {loan.notes || '-'}
                                              </td>
                                          </tr>
                                      ))
                                  )}
                              </tbody>
                          </table>
                      </div>
                  </div>
              </div>
          )}

          {/* --- ATTENDANCE & PERMISSION TAB --- */}
          {activeTab === 'attendance' && (
              <div className="space-y-6">
                  {/* Accumulated Attendance Stats (Also shown here for clarity) */}
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                      <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                          <Activity className="mr-2 text-[#5AB2FF]" size={18}/> Rekap Laporan Absensi Semester {attendanceStats.semesterName} ({attendanceStats.startMonthName} - {attendanceStats.monthName} {attendanceStats.year})
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-center">
                              <span className="text-2xl font-black text-emerald-600 block mb-1">{attendanceStats.counts.present + attendanceStats.counts.dispensation}</span>
                              <span className="text-xs font-bold text-emerald-700 uppercase">Hadir</span>
                          </div>
                          <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl text-center">
                              <span className="text-2xl font-black text-amber-600 block mb-1">{attendanceStats.counts.sick}</span>
                              <span className="text-xs font-bold text-amber-700 uppercase">Sakit</span>
                          </div>
                          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-center">
                              <span className="text-2xl font-black text-blue-600 block mb-1">{attendanceStats.counts.permit}</span>
                              <span className="text-xs font-bold text-blue-700 uppercase">Izin</span>
                          </div>
                          <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-center">
                              <span className="text-2xl font-black text-red-600 block mb-1">{attendanceStats.counts.alpha}</span>
                              <span className="text-xs font-bold text-red-700 uppercase">Alpha</span>
                          </div>
                      </div>
                  </div>

                  {/* Calendar View */}
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                          <h3 className="font-bold text-gray-800 flex items-center">
                              <Calendar className="mr-2 text-[#5AB2FF]" size={18}/> Kalender Kehadiran
                          </h3>
                          <div className="flex items-center space-x-2">
                              <button onClick={prevMonth} className="p-1 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
                                  <ChevronLeft size={20} />
                              </button>
                              <span className="font-bold text-sm text-gray-700 w-32 text-center">
                                  {calendarMonth.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}
                              </span>
                              <button onClick={nextMonth} className="p-1 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
                                  <ChevronRight size={20} />
                              </button>
                          </div>
                      </div>
                      
                      <div className="grid grid-cols-7 gap-1 mb-2">
                          {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(day => (
                              <div key={day} className="text-center text-xs font-bold text-gray-400 py-2">{day}</div>
                          ))}
                      </div>
                      <div className="grid grid-cols-7 gap-2">
                          {calendarDays.map((dayData, index) => {
                              if (!dayData) {
                                  return <div key={`empty-${index}`} className="h-12 rounded-lg bg-gray-50/50"></div>;
                              }
                              
                              let bgColor = 'bg-gray-50 hover:bg-gray-100';
                              let textColor = 'text-gray-700';
                              let borderColor = 'border-gray-100';
                              
                              if (dayData.holidayCode) {
                                  bgColor = 'bg-red-50 hover:bg-red-100';
                                  textColor = 'text-red-700';
                                  borderColor = 'border-red-200';
                              }
                              
                              if (dayData.status === 'sick') {
                                  bgColor = 'bg-amber-100';
                                  textColor = 'text-amber-800';
                                  borderColor = 'border-amber-200';
                              } else if (dayData.status === 'permit') {
                                  bgColor = 'bg-blue-100';
                                  textColor = 'text-blue-800';
                                  borderColor = 'border-blue-200';
                              } else if (dayData.status === 'alpha') {
                                  bgColor = 'bg-red-100';
                                  textColor = 'text-red-800';
                                  borderColor = 'border-red-200';
                              } else if (dayData.status === 'present' || dayData.status === 'dispensation') {
                                  bgColor = 'bg-emerald-50';
                                  textColor = 'text-emerald-700';
                                  borderColor = 'border-emerald-100';
                              }

                              const isToday = dayData.dateStr === new Date().toISOString().split('T')[0];

                              return (
                                  <div 
                                      key={dayData.dateStr} 
                                      className={`relative h-14 rounded-xl border flex flex-col items-center justify-center transition-all group cursor-default ${bgColor} ${borderColor} ${isToday ? 'ring-2 ring-[#5AB2FF] ring-offset-1' : ''}`}
                                  >
                                      <span className={`text-sm font-bold ${textColor}`}>{dayData.day}</span>
                                      {dayData.status && dayData.status !== 'present' && dayData.status !== 'dispensation' && (
                                          <span className="text-[9px] font-bold uppercase mt-0.5 opacity-80">
                                              {dayData.status === 'sick' ? 'Sakit' : dayData.status === 'permit' ? 'Izin' : 'Alpha'}
                                          </span>
                                      )}
                                      {!dayData.status && dayData.holidayCode && (
                                          <span className="text-[9px] font-bold uppercase mt-0.5 opacity-80 text-red-600 truncate w-full text-center px-1">
                                              Libur
                                          </span>
                                      )}
                                      
                                      {/* Tooltip for reason or holiday */}
                                      {(dayData.reason || dayData.holidayLabel) && (
                                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 pointer-events-none shadow-xl">
                                              <div className="font-bold mb-1 border-b border-gray-600 pb-1">Keterangan:</div>
                                              <p className="line-clamp-3">{dayData.reason || dayData.holidayLabel}</p>
                                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-800"></div>
                                          </div>
                                      )}
                                  </div>
                              );
                          })}
                      </div>
                      
                      <div className="mt-4 flex flex-wrap gap-3 justify-center text-xs">
                          <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-emerald-50 border border-emerald-100 mr-1.5"></div><span className="text-gray-600">Hadir</span></div>
                          <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-amber-100 border border-amber-200 mr-1.5"></div><span className="text-gray-600">Sakit</span></div>
                          <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-blue-100 border border-blue-200 mr-1.5"></div><span className="text-gray-600">Izin</span></div>
                          <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-red-100 border border-red-200 mr-1.5"></div><span className="text-gray-600">Alpha / Libur</span></div>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Form Pengajuan */}
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                      <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                          <PlusCircle size={18} className="mr-2 text-[#5AB2FF]"/> Ajukan Izin / Sakit
                      </h3>
                      <form onSubmit={handleSubmitPermission} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-xs font-bold text-gray-500 mb-1">Tanggal</label>
                                  <input 
                                    type="date" 
                                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#5AB2FF] outline-none"
                                    value={permissionForm.date}
                                    onChange={e => setPermissionForm({...permissionForm, date: e.target.value})}
                                    required
                                  />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-gray-500 mb-1">Jenis Izin</label>
                                  <select 
                                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#5AB2FF] outline-none bg-white"
                                    value={permissionForm.type}
                                    onChange={e => setPermissionForm({...permissionForm, type: e.target.value})}
                                  >
                                      <option value="sick">Sakit</option>
                                      <option value="permit">Izin</option>
                                      <option value="dispensation">Dispensasi</option>
                                  </select>
                              </div>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1">Alasan / Keterangan</label>
                              <textarea 
                                rows={2}
                                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#5AB2FF] outline-none resize-none"
                                placeholder="Jelaskan alasan ketidakhadiran..."
                                value={permissionForm.reason}
                                onChange={e => setPermissionForm({...permissionForm, reason: e.target.value})}
                                required
                              />
                          </div>
                          <div className="flex justify-end">
                              <button 
                                type="submit" 
                                disabled={isSubmittingPermission}
                                className="bg-[#5AB2FF] text-white px-6 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-[#A0DEFF] transition-all flex items-center disabled:opacity-70"
                              >
                                  {isSubmittingPermission ? <Loader2 size={16} className="animate-spin"/> : <Send size={16} className="mr-2"/>}
                                  Kirim Pengajuan
                              </button>
                          </div>
                      </form>
                  </div>

                  {/* Riwayat Pengajuan */}
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                      <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                          <History size={18} className="mr-2 text-gray-500"/> Riwayat Pengajuan
                      </h3>
                      <div className="space-y-3">
                          {myPermissions.length === 0 ? (
                              <p className="text-center text-gray-400 text-sm py-4 italic">Belum ada riwayat pengajuan.</p>
                          ) : (
                              myPermissions.map(req => (
                                  <div key={req.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                                      <div>
                                          <div className="flex items-center gap-2 mb-1">
                                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                                  req.type==='sick'?'bg-amber-100 text-amber-700':
                                                  req.type==='dispensation'?'bg-teal-100 text-teal-700':
                                                  'bg-blue-100 text-blue-700'
                                              }`}>
                                                  {req.type === 'sick' ? 'Sakit' : req.type === 'dispensation' ? 'Dispen' : 'Izin'}
                                              </span>
                                              <span className="text-xs text-gray-500 font-medium">
                                                  {new Date(req.date).toLocaleDateString('id-ID', {day: 'numeric', month: 'long'})}
                                              </span>
                                          </div>
                                          <p className="text-sm text-gray-700 font-medium line-clamp-1">{req.reason}</p>
                                      </div>
                                      <div className="text-right">
                                          <span className={`text-xs font-bold px-2 py-1 rounded-full border ${
                                              req.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                              req.status === 'Rejected' ? 'bg-red-50 text-red-600 border-red-200' :
                                              'bg-gray-100 text-gray-500 border-gray-200'
                                          }`}>
                                              {req.status === 'Approved' ? 'Diterima' : req.status === 'Rejected' ? 'Ditolak' : 'Menunggu'}
                                          </span>
                                      </div>
                                  </div>
                              ))
                          )}
                      </div>
                  </div>
              </div>
          </div>
          )}

          {/* --- MATERI TAB --- */}
          {activeTab === 'materi' && (
              <div className="space-y-6">
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                      <h3 className="font-bold text-gray-800 flex items-center text-lg mb-6">
                          <BookOpen size={20} className="mr-2 text-blue-500"/> Materi Pembelajaran
                      </h3>
                      
                      {materials.length === 0 ? (
                          <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                              <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
                              <p className="text-gray-500 font-medium">Belum ada materi yang dibagikan.</p>
                          </div>
                      ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {materials
                                .filter(m => m.classId === student.classId && m.isVisible)
                                .map((material) => {
                                  const subject = MOCK_SUBJECTS.find(s => s.id === material.subjectId);
                                  return (
                                      <div key={material.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all group">
                                          <div className="flex justify-between items-start mb-2">
                                              <span className="text-[10px] font-bold uppercase px-2 py-1 bg-blue-100 text-blue-700 rounded-md">
                                                  {subject?.name || material.subjectId}
                                              </span>
                                              <span className="text-[10px] text-gray-400">
                                                  {new Date(material.createdAt).toLocaleDateString('id-ID')}
                                              </span>
                                          </div>
                                          <h4 className="font-bold text-gray-800 mb-1 group-hover:text-blue-600 transition-colors">{material.title}</h4>
                                          <p className="text-xs text-gray-500 mb-4 line-clamp-2">{material.description}</p>
                                          <a 
                                              href={material.link} 
                                              target="_blank" 
                                              rel="noopener noreferrer"
                                              className="w-full flex items-center justify-center py-2 bg-white border border-blue-200 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-50 transition-colors"
                                          >
                                              <PlusCircle size={16} className="mr-2"/> Klik Materi
                                          </a>
                                      </div>
                                  );
                              })}
                          </div>
                      )}
                  </div>
              </div>
          )}

          {/* --- LIAISON BOOK TAB --- */}
          {activeTab === 'liaison' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                      <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                          <MessageSquare size={18} className="mr-2 text-[#5AB2FF]"/> Tulis Pesan ke Wali Kelas
                      </h3>
                      <form onSubmit={handleSubmitLiaison} className="space-y-4">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1">Kategori</label>
                              <select 
                                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#5AB2FF] outline-none bg-white"
                                value={liaisonForm.category}
                                onChange={e => setLiaisonForm({...liaisonForm, category: e.target.value})}
                              >
                                  <option value="Informasi">Informasi</option>
                                  <option value="Keluhan">Keluhan / Masalah</option>
                                  <option value="Konsultasi">Konsultasi</option>
                                  <option value="Lainnya">Lainnya</option>
                              </select>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1">Pesan</label>
                              <textarea 
                                rows={3}
                                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#5AB2FF] outline-none resize-none"
                                placeholder="Tulis pesan Anda di sini..."
                                value={liaisonForm.message}
                                onChange={e => setLiaisonForm({...liaisonForm, message: e.target.value})}
                                required
                              />
                          </div>
                          <div className="flex justify-end">
                              <button 
                                type="submit" 
                                disabled={isSubmittingLiaison}
                                className="bg-[#5AB2FF] text-white px-6 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-[#A0DEFF] transition-all flex items-center disabled:opacity-70"
                              >
                                  {isSubmittingLiaison ? <Loader2 size={16} className="animate-spin"/> : <Send size={16} className="mr-2"/>}
                                  Kirim Pesan
                              </button>
                          </div>
                      </form>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                      <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                          <History size={18} className="mr-2 text-gray-500"/> Riwayat Pesan
                      </h3>
                      <div className="space-y-4">
                          {myLiaisonLogs.length === 0 ? (
                              <p className="text-center text-gray-400 text-sm py-4 italic">Belum ada pesan.</p>
                          ) : (
                              myLiaisonLogs.map(log => (
                                  <div key={log.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                      <div className="flex justify-between items-start mb-2">
                                          <div className="flex items-center gap-2">
                                              <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100 uppercase">
                                                  {log.category || 'Umum'}
                                              </span>
                                              <span className="text-xs text-gray-400">
                                                  {new Date(log.date).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}
                                              </span>
                                          </div>
                                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                              log.status === 'Selesai' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                              log.status === 'Ditolak' ? 'bg-red-50 text-red-700 border-red-200' :
                                              log.status === 'Diterima' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                              'bg-amber-50 text-amber-700 border-amber-200'
                                          }`}>
                                              {log.status || 'Terkirim'}
                                          </span>
                                      </div>
                                      <p className="text-sm text-gray-700 leading-relaxed mb-1">{log.message}</p>
                                      
                                      {/* Teacher Response */}
                                      {log.response && (
                                          <div className="mt-3 bg-emerald-50 p-3 rounded-lg border border-emerald-100 text-sm text-gray-800 relative">
                                              <div className="flex items-center gap-1 mb-1">
                                                  <MessageCircle size={12} className="text-emerald-600"/>
                                                  <span className="text-xs font-bold text-emerald-700">Respon Guru:</span>
                                              </div>
                                              {log.response}
                                          </div>
                                      )}

                                      <p className="text-xs text-gray-400 italic text-right mt-2">Pengirim: {log.sender}</p>
                                  </div>
                              ))
                          )}
                      </div>
                  </div>
              </div>
          )}

          {/* --- PROFILE TAB (Separate from Character) --- */}
          {activeTab === 'profile' && (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  {/* Left Card: Data Pokok */}
                  <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-fit">
                      <h3 className="font-bold text-gray-800 text-lg flex items-center mb-4">
                          <User size={18} className="mr-2 text-indigo-500"/> Data Pokok
                      </h3>
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                          <div className="space-y-4 text-sm">
                              <div><strong className="block text-xs text-gray-500">Nama Lengkap</strong> <span className="font-semibold text-gray-800">{student.name}</span></div>
                              <div><strong className="block text-xs text-gray-500">NIS / NISN</strong> <span className="font-semibold text-gray-800">{student.nis} / {student.nisn || '-'}</span></div>
                              <div><strong className="block text-xs text-gray-500">Alamat</strong> <span className="font-semibold text-gray-800">{student.address}</span></div>
                              <div><strong className="block text-xs text-gray-500">No. HP Wali</strong> <span className="font-semibold text-gray-800">{student.parentPhone}</span></div>
                          </div>
                      </div>
                  </div>

                  {/* Right Card: Editable Data */}
                  <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                      <div className="flex justify-between items-center mb-6">
                          <h3 className="font-bold text-gray-800 text-lg flex items-center">
                              <Edit size={18} className="mr-2 text-indigo-500"/> Edit Profil Siswa
                          </h3>
                          {!isEditingProfile ? (
                              <button onClick={() => setIsEditingProfile(true)} className="flex items-center gap-2 bg-white text-indigo-600 font-bold px-4 py-2 rounded-lg border border-indigo-200 hover:bg-indigo-50 shadow-sm text-xs">
                                  <Edit size={14}/> Ubah Data
                              </button>
                          ) : (
                              <div className="flex gap-2">
                                  <button onClick={() => { setIsEditingProfile(false); setProfileData(student); }} className="px-3 py-1.5 text-gray-600 font-medium rounded-lg hover:bg-gray-100 text-xs">Batal</button>
                                  <button onClick={handleSaveProfile} disabled={isSavingProfile} className="flex items-center gap-2 bg-indigo-600 text-white font-bold px-3 py-1.5 rounded-lg shadow-md hover:bg-indigo-700 disabled:opacity-50 text-xs">
                                      {isSavingProfile ? <Loader2 size={12} className="animate-spin"/> : <Save size={12}/>} Simpan
                                  </button>
                              </div>
                          )}
                      </div>

                      <div className="space-y-6 text-sm">
                          <div>
                              <h4 className="text-xs font-bold text-indigo-600 uppercase mb-2 border-b border-indigo-100 pb-1">Data Fisik & Kesehatan</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mt-2">
                                  <div>
                                      <label className="block text-xs font-bold text-gray-500 mb-1">Tinggi Badan (cm)</label>
                                      <input type="number" value={profileData.height || 0} onChange={e => handleProfileChange('height', Number(e.target.value))} disabled={!isEditingProfile} className="w-full border p-2 rounded-lg bg-white disabled:bg-gray-50 disabled:text-gray-500 outline-none focus:ring-2 focus:ring-indigo-500"/>
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-gray-500 mb-1">Berat Badan (kg)</label>
                                      <input type="number" value={profileData.weight || 0} onChange={e => handleProfileChange('weight', Number(e.target.value))} disabled={!isEditingProfile} className="w-full border p-2 rounded-lg bg-white disabled:bg-gray-50 disabled:text-gray-500 outline-none focus:ring-2 focus:ring-indigo-500"/>
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-gray-500 mb-1">Golongan Darah</label>
                                      <input type="text" value={profileData.bloodType || ''} onChange={e => handleProfileChange('bloodType', e.target.value)} disabled={!isEditingProfile} className="w-full border p-2 rounded-lg bg-white disabled:bg-gray-50 disabled:text-gray-500 outline-none focus:ring-2 focus:ring-indigo-500"/>
                                  </div>
                                  <div className="md:col-span-2">
                                      <label className="block text-xs font-bold text-gray-500 mb-1">Riwayat Penyakit / Catatan Kesehatan</label>
                                      <textarea rows={2} value={profileData.healthNotes || ''} onChange={e => handleProfileChange('healthNotes', e.target.value)} disabled={!isEditingProfile} className="w-full border p-2 rounded-lg bg-white disabled:bg-gray-50 disabled:text-gray-500 outline-none focus:ring-2 focus:ring-indigo-500 resize-none"/>
                                  </div>
                              </div>
                          </div>

                          <div>
                              <h4 className="text-xs font-bold text-indigo-600 uppercase mb-2 border-b border-indigo-100 pb-1">Minat & Impian</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mt-2">
                                  <div>
                                      <label className="block text-xs font-bold text-gray-500 mb-1">Hobi</label>
                                      <input type="text" value={profileData.hobbies || ''} onChange={e => handleProfileChange('hobbies', e.target.value)} disabled={!isEditingProfile} className="w-full border p-2 rounded-lg bg-white disabled:bg-gray-50 disabled:text-gray-500 outline-none focus:ring-2 focus:ring-indigo-500"/>
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-gray-500 mb-1">Cita-cita</label>
                                      <input type="text" value={profileData.ambition || ''} onChange={e => handleProfileChange('ambition', e.target.value)} disabled={!isEditingProfile} className="w-full border p-2 rounded-lg bg-white disabled:bg-gray-50 disabled:text-gray-500 outline-none focus:ring-2 focus:ring-indigo-500"/>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {/* --- CHARACTER TAB (Separated with Toggle Buttons) --- */}
          {activeTab === 'character' && (
              <div className="space-y-6">
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                      <div className="flex justify-between items-center mb-6">
                          <h3 className="font-bold text-gray-800 flex items-center text-lg">
                              <HeartHandshake size={20} className="mr-2 text-pink-500"/> 7 Kebiasaan Anak Indonesia Hebat
                          </h3>
                          <button 
                            onClick={handleSaveKarakterLocal}
                            disabled={isSavingKarakter}
                            className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow hover:bg-emerald-600 transition-colors flex items-center disabled:opacity-70"
                          >
                              {isSavingKarakter ? <Loader2 size={16} className="animate-spin mr-1"/> : <Save size={16} className="mr-2"/>}
                              Simpan Penilaian
                          </button>
                      </div>
                      
                      {/* NEW: Attractive Toggle List Layout */}
                      <div className="grid grid-cols-1 gap-4">
                          {(Object.keys(KARAKTER_INDICATORS) as KarakterIndicatorKey[]).map((key) => {
                              const value = karakterForm[key];
                              return (
                                  <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 transition-all hover:border-blue-200 hover:shadow-sm">
                                      <span className="font-bold text-gray-700 text-sm mb-3 sm:mb-0 flex items-center">
                                          <div className="w-2 h-2 rounded-full bg-blue-400 mr-3"></div>
                                          {KARAKTER_INDICATORS[key]}
                                      </span>
                                      
                                      <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm w-full sm:w-auto">
                                          <button
                                              onClick={() => handleKarakterChange(key, 'Terbiasa')}
                                              className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-xs font-bold transition-all ${
                                                  value === 'Terbiasa'
                                                  ? 'bg-emerald-500 text-white shadow-sm ring-1 ring-emerald-600'
                                                  : 'text-gray-500 hover:bg-gray-50'
                                              }`}
                                          >
                                              <CheckCircle size={14} className={`mr-1.5 ${value === 'Terbiasa' ? 'text-white' : 'text-emerald-500'}`}/> 
                                              Terbiasa
                                          </button>
                                          <button
                                              onClick={() => handleKarakterChange(key, 'Belum Terbiasa')}
                                              className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-xs font-bold transition-all ml-1 ${
                                                  value === 'Belum Terbiasa'
                                                  ? 'bg-amber-500 text-white shadow-sm ring-1 ring-amber-600'
                                                  : 'text-gray-500 hover:bg-gray-50'
                                              }`}
                                          >
                                              <XCircle size={14} className={`mr-1.5 ${value === 'Belum Terbiasa' ? 'text-white' : 'text-amber-500'}`}/> 
                                              Belum
                                          </button>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                      
                      <div className="mt-6">
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Catatan Tambahan (Opsional)</label>
                          <textarea
                              rows={2}
                              value={karakterForm.catatan || ''}
                              onChange={(e) => setKarakterForm({...karakterForm, catatan: e.target.value})}
                              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-gray-50 focus:bg-white transition-colors"
                              placeholder="Tulis catatan refleksi..."
                          />
                      </div>

                      {karakterForm.catatan && (
                          <div className="mt-4 p-3 bg-yellow-50 rounded-xl border border-yellow-100 text-sm text-yellow-800 flex items-start">
                              <Sparkles size={16} className="mr-2 mt-0.5 text-yellow-600"/>
                              <div>
                                  <strong>Catatan Guru:</strong> {karakterForm.catatan}
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};

export default StudentPortal;