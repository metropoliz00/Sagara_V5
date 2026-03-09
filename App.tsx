// ... (imports remain the same)
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import DashboardContainer from './components/DashboardContainer';
import StudentList from './components/StudentList';
import ClassroomAdmin from './components/ClassroomAdmin';
import TeacherProfile from './components/TeacherProfile';
import AttendanceView from './components/AttendanceView';
import GradesView from './components/GradesView';
import CounselingView from './components/CounselingView';
import ActivitiesView from './components/ActivitiesView';
import IntroductionView from './components/IntroductionView';
import AttitudeView from './components/AttitudeView';
import Login from './components/Login';
import Notification from './components/Notification';
import AccountManagement from './components/AccountManagement';
import EmploymentLinksAdmin from './components/EmploymentLinksAdmin';
import LearningReportsView from './components/LearningReportsView'; 
import LearningJournalView from './components/LearningJournalView'; 
import LearningDocumentationView from './components/LearningDocumentationView';
import StudentMonitor from './components/StudentMonitor'; 
import LiaisonBookView from './components/LiaisonBookView'; 
import BackupRestore from './components/BackupRestore';
import SupportDocumentsView from './components/SupportDocumentsView';
import SupervisorOverview from './components/SupervisorOverview'; 
import SchoolAssetsAdmin from './components/SchoolAssetsAdmin'; 
import BOSManagement from './components/BOSManagement'; // NEW IMPORT
import BookLoanView from './components/BookLoanView';
import CustomModal from './components/CustomModal'; 
import { ViewState, Student, AgendaItem, Extracurricular, BehaviorLog, GradeRecord, TeacherProfileData, SchoolProfileData, User, Holiday, SikapAssessment, KarakterAssessment, EmploymentLink, LearningReport, LiaisonLog, PermissionRequest, LearningJournalEntry, SupportDocument, InventoryItem, SchoolAsset, BOSTransaction, LearningDocumentation, BookLoan, BookInventory } from './types';
import { MOCK_SUBJECTS, MOCK_STUDENTS, MOCK_EXTRACURRICULARS } from './constants';
import { apiService } from './services/apiService';
import { cacheService } from './src/services/cacheService';
import { Menu, Loader2, RefreshCw, AlertCircle, CheckCircle, WifiOff, ChevronDown, UserCog, LogOut, Filter, Bell, X, XCircle, MessageSquare } from 'lucide-react';

const App: React.FC = () => {
  // -- STATE PERSISTENCE INIT --
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
      try {
          const saved = localStorage.getItem('sagara_user');
          return saved ? JSON.parse(saved) : null;
      } catch (e) { return null; }
  });

  const [currentView, setCurrentView] = useState<ViewState>(() => {
      return (localStorage.getItem('sagara_view') as ViewState) || 'dashboard';
  });

  // Effect to update document title based on current view
  useEffect(() => {
    const viewTitles: Record<ViewState, string> = {
      'dashboard': 'Dashboard',
      'students': 'Data Siswa',
      'attendance': 'Absensi',
      'grades': 'Nilai & Rapor',
      'admin': 'Administrasi Kelas',
      'counseling': 'Konseling & Pelanggaran',
      'activities': 'Ekstrakurikuler',
      'profile': 'Profil Guru',
      'pendahuluan': 'Pendahuluan',
      'attitude': 'Penilaian Sikap',
      'accounts': 'Manajemen Akun',
      'employment-links': 'Tautan Kepegawaian',
      'learning-reports': 'Laporan Pembelajaran',
      'learning-journal': 'Jurnal Pembelajaran',
      'learning-documentation': 'Dokumentasi Pembelajaran',
      'student-monitor': 'Monitor Siswa',
      'liaison-book': 'Buku Penghubung',
      'backup-restore': 'Backup & Restore',
      'support-docs': 'Dokumen Pendukung',
      'supervisor-overview': 'Supervisi',
      'school-assets': 'Sarana Prasarana',
      'bos-admin': 'Manajemen BOS',
      'book-loan': 'Peminjaman Buku'
    };

    const title = viewTitles[currentView] || 'Sistem Akademik';
    document.title = `${title} | Sistem Akademik & Administrasi Terintegrasi`;
  }, [currentView]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  
  // -- ADMIN CLASS FILTER STATE --
  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
      return localStorage.getItem('sagara_classId') || '';
  });

  // State Global
  const [users, setUsers] = useState<User[]>(() => cacheService.get<User[]>('users') || []);
  const [students, setStudents] = useState<Student[]>(() => cacheService.get<Student[]>('students') || []);
  const [agendas, setAgendas] = useState<AgendaItem[]>(() => cacheService.get<AgendaItem[]>('agendas') || []);
  const [extracurriculars, setExtracurriculars] = useState<Extracurricular[]>(() => cacheService.get<Extracurricular[]>('extracurriculars') || []);
  const [counselingLogs, setCounselingLogs] = useState<BehaviorLog[]>(() => cacheService.get<BehaviorLog[]>('counselingLogs') || []);
  const [grades, setGrades] = useState<GradeRecord[]>(() => cacheService.get<GradeRecord[]>('grades') || []);
  const [holidays, setHolidays] = useState<Holiday[]>(() => cacheService.get<Holiday[]>('holidays') || []);
  const [allAttendanceRecords, setAllAttendanceRecords] = useState<any[]>(() => cacheService.get<any[]>('allAttendanceRecords') || []);
  const [sikapAssessments, setSikapAssessments] = useState<SikapAssessment[]>(() => cacheService.get<SikapAssessment[]>('sikapAssessments') || []);
  const [karakterAssessments, setKarakterAssessments] = useState<KarakterAssessment[]>(() => cacheService.get<KarakterAssessment[]>('karakterAssessments') || []);
  const [employmentLinks, setEmploymentLinks] = useState<EmploymentLink[]>(() => cacheService.get<EmploymentLink[]>('employmentLinks') || []);
  const [learningReports, setLearningReports] = useState<LearningReport[]>(() => cacheService.get<LearningReport[]>('learningReports') || []);
  const [learningDocumentation, setLearningDocumentation] = useState<LearningDocumentation[]>(() => cacheService.get<LearningDocumentation[]>('learningDocumentation') || []);
  const [liaisonLogs, setLiaisonLogs] = useState<LiaisonLog[]>(() => cacheService.get<LiaisonLog[]>('liaisonLogs') || []);
  const [permissionRequests, setPermissionRequests] = useState<PermissionRequest[]>(() => cacheService.get<PermissionRequest[]>('permissionRequests') || []);
  const [supportDocuments, setSupportDocuments] = useState<SupportDocument[]>(() => cacheService.get<SupportDocument[]>('supportDocuments') || []);
  const [inventory, setInventory] = useState<InventoryItem[]>(() => cacheService.get<InventoryItem[]>('inventory') || []);
  const [schoolAssets, setSchoolAssets] = useState<SchoolAsset[]>(() => cacheService.get<SchoolAsset[]>('schoolAssets') || []);
  const [bosTransactions, setBosTransactions] = useState<BOSTransaction[]>(() => cacheService.get<BOSTransaction[]>('bosTransactions') || []);
  const [bookLoans, setBookLoans] = useState<BookLoan[]>(() => cacheService.get<BookLoan[]>('bookLoans') || []);
  const [kktpMap, setKktpMap] = useState<Record<string, number>>({});
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'warning'} | null>(null);
  
  // ... (Rest of existing state code)
  
  // -- NEW STATE: Navigation Target for Journal --
  const [journalTargetDate, setJournalTargetDate] = useState<string | null>(null);

  // -- CUSTOM MODAL STATE --
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
    onConfirm: () => {},
  });

  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [processingPermissionId, setProcessingPermissionId] = useState<string | null>(null);
  const [adminPercentage, setAdminPercentage] = useState<number>(0);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfileData>({
    name: 'Guru', nip: '', nuptk: '', birthInfo: '', education: '', position: '', rank: '', teachingClass: '', phone: '', email: '', address: ''
  });
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfileData>({
    name: 'Sekolah', npsn: '', address: '', headmaster: '', headmasterNip: '', headmasterSignature: '', year: new Date().getFullYear().toString(), semester: '1',
    developerInfo: { name: '', moto: '', photo: '' }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // ... (Rest of Modal Helper Functions and Persistence Effects) ...
  const showAlert = (message: string, type: 'success' | 'error' | 'alert' = 'alert', title?: string) => {
    setModalConfig({
      isOpen: true,
      type,
      title,
      message,
      onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
    });
  };

  const showConfirm = (message: string, onConfirmAction: () => void, title: string = 'Konfirmasi') => {
    setModalConfig({
      isOpen: true,
      type: 'confirm',
      title,
      message,
      onConfirm: () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }));
        onConfirmAction();
      }
    });
  };

  // ... (PERSISTENCE EFFECTS Code) ...
  useEffect(() => {
      if (currentUser) {
          localStorage.setItem('sagara_user', JSON.stringify(currentUser));
      } else {
          localStorage.removeItem('sagara_user');
      }
  }, [currentUser]);

  useEffect(() => {
      if (currentUser) {
          localStorage.setItem('sagara_view', currentView);
      }
  }, [currentView, currentUser]);

  const canSelectClass = useMemo(() => {
    if (!currentUser) return false;
    const pos = (currentUser.position || '').toLowerCase();
    return currentUser.role === 'admin' || 
           currentUser.role === 'supervisor' || 
           (currentUser.role === 'guru' && String(currentUser.classId).toUpperCase() === 'ALL') ||
           (currentUser.role === 'guru' && (pos.includes('pai') || pos.includes('agama') || pos.includes('pjok') || pos.includes('olahraga') || pos.includes('inggris')));
  }, [currentUser]);

  useEffect(() => {
      if (canSelectClass && selectedClassId) {
          localStorage.setItem('sagara_classId', selectedClassId);
      }
  }, [selectedClassId, canSelectClass]);

  useEffect(() => {
      if (currentUser?.role === 'supervisor' && currentView === 'dashboard') {
          setCurrentView('supervisor-overview');
      }
  }, [currentUser, currentView]);

  const handleLogout = () => {
      setCurrentUser(null);
      setStudents([]); 
      setExtracurriculars([]);
      setAgendas([]);
      localStorage.removeItem('sagara_user');
      localStorage.removeItem('sagara_view');
      localStorage.removeItem('sagara_classId');
      localStorage.removeItem('sagara_student_tab');
      setCurrentView('dashboard');
  };
  
  const handleShowNotification = (message: string, type: 'success' | 'error' | 'warning') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Auto-refresh effect
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => {
        fetchData(false, true);
    }, 60000);
    return () => clearInterval(interval);
  }, [currentUser]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  const availableClasses = useMemo(() => {
    const studentClasses = students.map(s => String(s.classId || '').trim().toUpperCase()).filter(Boolean);
    const userClasses = users.map(u => String(u.classId || '').trim().toUpperCase()).filter(Boolean);
    const combinedSet = new Set([...studentClasses, ...userClasses]);
    combinedSet.delete('ALL');
    combinedSet.delete('');
    return Array.from(combinedSet).sort((a, b) => {
        const strA = String(a || '');
        const strB = String(b || '');
        const numA = parseInt(strA.replace(/\D/g, '')) || 0;
        const numB = parseInt(strB.replace(/\D/g, '')) || 0;
        if (numA !== numB) return numA - numB;
        return strA.localeCompare(strB);
    });
  }, [students, users]);
  
  const activeClassId = useMemo(() => {
    if (!currentUser) return '';
    return canSelectClass ? selectedClassId : String(currentUser.classId || '');
  }, [currentUser, selectedClassId, canSelectClass]);

  useEffect(() => {
    if (currentUser) {
        if (canSelectClass) {
            const currentStr = String(selectedClassId || '');
            const isValid = selectedClassId && availableClasses.some(c => String(c).toUpperCase() === currentStr.toUpperCase());
            if (!isValid && availableClasses.length > 0 && !selectedClassId) {
                setSelectedClassId(String(availableClasses[0]));
            }
        } else if (currentUser.role === 'siswa') {
            setCurrentView('dashboard'); 
            if (currentUser.classId) setSelectedClassId(String(currentUser.classId));
        } else {
            setSelectedClassId(String(currentUser.classId || ''));
        }
    }
  }, [currentUser, availableClasses, selectedClassId, canSelectClass]);

  useEffect(() => {
    const fetchAdminStats = async () => {
        if (!activeClassId || String(activeClassId).toLowerCase() === 'all' || isDemoMode) {
            setAdminPercentage(0);
            return;
        }
        try {
            const [inv, config, globalCalendar] = await Promise.all([
                apiService.getInventory(activeClassId),
                apiService.getClassConfig(activeClassId),
                apiService.getAcademicCalendar('global')
            ]);
            let score = 0;
            if (config.schedule && config.schedule.length > 0) score++;
            if (config.piket && config.piket.length > 0) score++;
            const hasSeats = config.seats && (
                (config.seats.classical && config.seats.classical.some(s => s !== null)) ||
                (config.seats.groups && config.seats.groups.some(s => s !== null)) ||
                (config.seats.ushape && config.seats.ushape.some(s => s !== null))
            );
            if (hasSeats) score++;
            const hasCalendar = (config.academicCalendar && Object.keys(config.academicCalendar).length > 0) || 
                               (globalCalendar && Object.keys(globalCalendar).length > 0);
            if (hasCalendar) score++;
            if (inv && inv.length > 0) score++;
            setAdminPercentage(Math.round((score / 5) * 100));
        } catch (e) {
            setAdminPercentage(0);
        }
    };
    fetchAdminStats();
  }, [activeClassId, isDemoMode]); 

  const { isGlobalReadOnly, allowedSubjects } = useMemo(() => {
    if (!currentUser) return { isGlobalReadOnly: true, allowedSubjects: [] };
    if (currentUser.role === 'admin') return { isGlobalReadOnly: false, allowedSubjects: ['all'] };
    if (currentUser.role === 'supervisor') return { isGlobalReadOnly: true, allowedSubjects: ['all'] }; 
    if (currentUser.role === 'siswa') return { isGlobalReadOnly: true, allowedSubjects: [] };
    
    const pos = (currentUser.position || '').toLowerCase();
    
    if (pos.includes('pai') || pos.includes('agama')) return { isGlobalReadOnly: false, allowedSubjects: ['pai'] };
    if (pos.includes('pjok') || pos.includes('olahraga')) return { isGlobalReadOnly: false, allowedSubjects: ['pjok'] };
    if (pos.includes('inggris')) return { isGlobalReadOnly: false, allowedSubjects: ['inggris'] };
    
    // Check if Wali Kelas
    const isWaliKelas = currentUser.classId && currentUser.classId !== 'ALL' && currentUser.classId !== '';
    if (currentUser.role === 'guru' && !isWaliKelas) {
        return { isGlobalReadOnly: true, allowedSubjects: [] };
    }

    return { isGlobalReadOnly: false, allowedSubjects: ['all'] };
  }, [currentUser]);

  const isClassMatch = (id1?: string, id2?: string) => {
      const s1 = String(id1 || '').trim().toLowerCase();
      const s2 = String(id2 || '').trim().toLowerCase();
      return s1 === s2;
  };

  const filteredStudents = useMemo(() => students.filter(s => isClassMatch(s.classId, activeClassId)), [students, activeClassId]);
  const filteredAgendas = useMemo(() => agendas.filter(a => isClassMatch(a.classId, activeClassId)), [agendas, activeClassId]);
  const filteredExtracurriculars = useMemo(() => extracurriculars.filter(e => isClassMatch(e.classId, activeClassId)), [extracurriculars, activeClassId]);
  const filteredGrades = useMemo(() => grades.filter(g => isClassMatch(g.classId, activeClassId)), [grades, activeClassId]);
  
  const filteredAttendance = useMemo(() => {
      return allAttendanceRecords.filter(a => {
          if (isClassMatch(a.classId, activeClassId)) return true;
          if (!a.classId || a.classId === 'undefined' || a.classId === 'null') {
              const student = students.find(s => String(s.id).trim() === String(a.studentId).trim());
              if (student && isClassMatch(student.classId, activeClassId)) return true;
          }
          return false;
      });
  }, [allAttendanceRecords, activeClassId, students]);

  const filteredCounseling = useMemo(() => counselingLogs.filter(c => isClassMatch(c.classId, activeClassId)), [counselingLogs, activeClassId]);
  const filteredSikap = useMemo(() => sikapAssessments.filter(s => isClassMatch(s.classId, activeClassId)), [sikapAssessments, activeClassId]);
  const filteredKarakter = useMemo(() => karakterAssessments.filter(k => isClassMatch(k.classId, activeClassId)), [karakterAssessments, activeClassId]);
  const filteredHolidays = holidays;
  const filteredReports = useMemo(() => learningReports.filter(r => isClassMatch(r.classId, activeClassId)), [learningReports, activeClassId]);
  const filteredLearningDocumentation = useMemo(() => learningDocumentation.filter(d => isClassMatch(d.classId, activeClassId)), [learningDocumentation, activeClassId]);
  const filteredSupportDocuments = useMemo(() => supportDocuments.filter(d => isClassMatch(d.classId, activeClassId)), [supportDocuments, activeClassId]);
  
  const filteredLiaison = useMemo(() => {
      return liaisonLogs.filter(l => {
          if (isClassMatch(l.classId, activeClassId)) return true;
          if (!l.classId || l.classId === 'undefined' || l.classId === 'null') {
               const student = students.find(s => String(s.id).trim() === String(l.studentId).trim());
               if (student && isClassMatch(student.classId, activeClassId)) return true;
          }
          return false;
      });
  }, [liaisonLogs, activeClassId, students]);

  const pendingPermissions = useMemo(() => {
      const raw = permissionRequests.filter(p => p.status === 'Pending');
      if (currentUser?.role === 'admin' || currentUser?.role === 'supervisor') return raw; 
      return raw.filter(p => isClassMatch(p.classId, activeClassId));
  }, [permissionRequests, activeClassId, currentUser]);

  // NEW: Check for unread liaison messages for teachers
  const unreadLiaisonCount = useMemo(() => {
    if (currentUser?.role === 'siswa') return 0;
    return liaisonLogs.filter(log => 
      log.sender === 'Wali Murid' && 
      (log.status === 'Pending' || !log.status) &&
      (currentUser?.role === 'admin' || log.classId === currentUser?.classId)
    ).length;
  }, [liaisonLogs, currentUser]);

  // ... (Existing Handlers: Auto Report, Restore, Permission, Student, Agenda, etc.) ...
  
  // -- LEARNING DOCUMENTATION HANDLERS --
  const handleSaveLearningDocumentation = async (doc: Omit<LearningDocumentation, 'id'> | LearningDocumentation) => {
    const optimisticId = `ldoc-${Date.now()}`;
    const newDoc = { ...doc, id: (doc as LearningDocumentation).id || optimisticId } as LearningDocumentation;

    const oldDocs = learningDocumentation;
    const newDocs = oldDocs.find(d => String(d.id).trim() === String(newDoc.id).trim())
      ? oldDocs.map(d => d.id === newDoc.id ? newDoc : d)
      : [newDoc, ...oldDocs];

    setLearningDocumentation(newDocs);
    cacheService.set('learningDocumentation', newDocs);
    handleShowNotification('Dokumentasi berhasil disimpan.', 'success');

    if (isDemoMode) return;

    try {
      await apiService.saveLearningDocumentation(doc);
      await fetchData(); // Refresh to get server-side IDs
    } catch (error) {
      setLearningDocumentation(oldDocs);
      cacheService.set('learningDocumentation', oldDocs);
      handleShowNotification('Gagal menyimpan dokumentasi.', 'error');
    }
  };

  const handleDeleteLearningDocumentation = async (id: string) => {
    showConfirm('Hapus dokumentasi ini?', () => {
      const oldDocs = learningDocumentation;
      const newDocs = oldDocs.filter(d => d.id !== id);
      setLearningDocumentation(newDocs);
      cacheService.set('learningDocumentation', newDocs);
      handleShowNotification('Dokumentasi berhasil dihapus.', 'success');

      if (isDemoMode) return;

      apiService.deleteLearningDocumentation(id, activeClassId).catch(() => {
        setLearningDocumentation(oldDocs);
        cacheService.set('learningDocumentation', oldDocs);
        handleShowNotification('Gagal menghapus dokumentasi.', 'error');
      });
    });
  };
  
  // --- BOS HANDLERS ---
  const handleSaveBOS = async (transaction: BOSTransaction) => {
    const optimisticId = `bos-${Date.now()}`;
    const newTransaction = { ...transaction, id: transaction.id || optimisticId };

    const oldTransactions = bosTransactions;
    const newTransactions = oldTransactions.find(t => String(t.id).trim() === String(newTransaction.id).trim())
      ? oldTransactions.map(t => t.id === newTransaction.id ? newTransaction : t)
      : [...oldTransactions, newTransaction];

    setBosTransactions(newTransactions);
    cacheService.set('bosTransactions', newTransactions);
    handleShowNotification('Transaksi BOS berhasil disimpan.', 'success');

    if (isDemoMode) return;

    try {
      await apiService.saveBOS(transaction);
      await fetchData(); // Refresh for server-side ID
    } catch (error) {
      setBosTransactions(oldTransactions);
      cacheService.set('bosTransactions', oldTransactions);
      handleShowNotification('Gagal menyimpan transaksi BOS.', 'error');
    }
  };

  const handleDeleteBOS = async (id: string) => {
    showConfirm('Hapus transaksi BOS ini?', () => {
      const oldTransactions = bosTransactions;
      const newTransactions = oldTransactions.filter(t => t.id !== id);
      setBosTransactions(newTransactions);
      cacheService.set('bosTransactions', newTransactions);
      handleShowNotification('Transaksi BOS berhasil dihapus.', 'success');

      if (isDemoMode) return;

      apiService.deleteBOS(id).catch(() => {
        setBosTransactions(oldTransactions);
        cacheService.set('bosTransactions', oldTransactions);
        handleShowNotification('Gagal menghapus transaksi BOS.', 'error');
      });
    });
  };

  // ... (Other handlers unchanged)
  // Re-inserting required handlers for completeness
  const handleSaveJournalAndAutoReport = async (entries: Partial<LearningJournalEntry>[]) => {
      if (isDemoMode) { handleShowNotification('Jurnal & Laporan otomatis disimpan (Demo)', 'success'); return; }
      try {
          await apiService.saveLearningJournalBatch(entries);
          handleShowNotification('Jurnal pembelajaran berhasil disimpan.', 'success');
          if (entries.length > 0 && entries[0].date) {
              const reportDate = entries[0].date;
              const uniqueSubjects = [...new Set(entries.map(e => e.subject).filter(Boolean))].join(', ');
              const combinedTopics = entries.map(e => e.topic).filter(Boolean).join('; ');
              if (uniqueSubjects) {
                  const autoReport: LearningReport = {
                      id: `jurnal-${reportDate}-${activeClassId}`, classId: activeClassId, date: reportDate,
                      type: 'Jurnal Harian', subject: uniqueSubjects, topic: combinedTopics || 'Kegiatan Pembelajaran Harian',
                      documentLink: '', teacherName: (currentUser?.fullName && currentUser?.fullName !== 'undefined') ? currentUser.fullName : 'Guru Kelas'
                  };
                  await apiService.saveLearningReport(autoReport);
                  const newReports = await apiService.getLearningReports(activeClassId);
                  setLearningReports(newReports);
              }
          }
      } catch (e) { console.error("Auto report error:", e); handleShowNotification('Jurnal disimpan, namun gagal membuat laporan otomatis.', 'warning'); }
  };

  const handleNavigateToJournal = (date: string) => { setJournalTargetDate(date); setCurrentView('learning-journal'); };
  
  const handleRestoreData = async (data: any) => {
      try {
          if(isDemoMode) { showAlert("Restore tidak tersedia di mode demo.", "error"); return; }
          const res = await apiService.restoreData(data);
          if (res.status === 'success') { window.location.reload(); } else { throw new Error(res.message); }
      } catch (e: any) { throw new Error(e.message || "Gagal restore data."); }
  };

  const handleProcessPermission = async (id: string, action: 'approve' | 'reject') => {
      setProcessingPermissionId(id);
      try {
          const req = permissionRequests.find(p => String(p.id).trim() === String(id).trim());
          if (isDemoMode) {
              setPermissionRequests(prev => prev.map(p => p.id === id ? { ...p, status: action === 'approve' ? 'Approved' : 'Rejected' } : p));
              if (action === 'approve' && req) {
                  setAllAttendanceRecords(prev => [...prev, { studentId: req.studentId, classId: req.classId, date: req.date, status: req.type, reason: req.reason }]);
              }
              handleShowNotification(`Ijin berhasil di${action === 'approve' ? 'terima' : 'tolak'} (Demo).`, 'success');
          } else {
              await apiService.processPermissionRequest(id, action);
              handleShowNotification(`Ijin berhasil di${action === 'approve' ? 'terima' : 'tolak'}.`, 'success');
              await fetchData();
          }
      } catch (e) { handleShowNotification('Gagal memproses ijin.', 'error'); } finally { setProcessingPermissionId(null); }
  };

  // Add/Update/Delete Student handlers
  const handleAddStudent = async (student: Omit<Student, 'id'>) => {
    const targetClassId = String(activeClassId || student.classId || '1A');
    const studentWithClass = { ...student, classId: targetClassId };
    const optimisticId = `student-${Date.now()}`;
    const newStudent = { ...studentWithClass, id: optimisticId };

    const oldStudents = students;
    const newStudents = [...oldStudents, newStudent];
    setStudents(newStudents);
    cacheService.set('students', newStudents);
    handleShowNotification('Siswa berhasil ditambahkan.', 'success');

    if (isDemoMode) return;

    try {
      const res = await apiService.createStudent(studentWithClass);
      if (res.id) {
        // Replace optimistic ID with server ID
        setStudents(prev => prev.map(s => s.id === optimisticId ? { ...newStudent, id: res.id } : s));
        cacheService.set('students', students.map(s => s.id === optimisticId ? { ...newStudent, id: res.id } : s));
        if (currentUser?.role === 'admin' && !availableClasses.includes(targetClassId.toUpperCase())) {
          setSelectedClassId(targetClassId.toUpperCase());
        }
      } else {
        throw new Error('No ID returned from server');
      }
    } catch (error) {
      setStudents(oldStudents);
      cacheService.set('students', oldStudents);
      handleShowNotification('Gagal menambahkan siswa.', 'error');
    }
  };
  const handleBatchAddStudents = async (newStudents: Omit<Student, 'id'>[]) => { 
    const batchWithClass = newStudents.map(s => ({ ...s, classId: s.classId || activeClassId || '1A' }));
    if (isDemoMode) { const demoStudents = batchWithClass.map((s, i) => ({ ...s, id: Date.now().toString() + i })); setStudents([...students, ...demoStudents]); return; }
    try { const res = await apiService.createStudentBatch(batchWithClass); if (res.status === 'success') { fetchData(); handleShowNotification(`Berhasil menambahkan ${newStudents.length} siswa!`, 'success'); } } catch (e) { handleShowNotification('Gagal upload batch siswa', 'error'); }
  };
  const handleUpdateStudent = async (updatedStudent: Student) => {
    const oldStudents = students;
    const newStudents = oldStudents.map(s => s.id === updatedStudent.id ? updatedStudent : s);
    setStudents(newStudents);
    cacheService.set('students', newStudents);
    // No notification for updates to keep UI quiet

    if (isDemoMode) return;

    try {
      await apiService.updateStudent(updatedStudent);
    } catch (error) {
      setStudents(oldStudents);
      cacheService.set('students', oldStudents);
      handleShowNotification('Gagal memperbarui data siswa.', 'error');
    }
  };
  const handleDeleteStudent = async (id: string) => {
    showConfirm('Apakah Anda yakin ingin menghapus data siswa ini?', () => {
      const oldStudents = students;
      const newStudents = oldStudents.filter(s => s.id !== id);
      setStudents(newStudents);
      cacheService.set('students', newStudents);
      handleShowNotification('Data siswa berhasil dihapus.', 'success');

      if (isDemoMode) return;

      apiService.deleteStudent(id).catch(() => {
        setStudents(oldStudents);
        cacheService.set('students', oldStudents);
        handleShowNotification('Gagal menghapus data siswa.', 'error');
      });
    });
  };

  // Agendas & Extras
  const handleAddAgenda = async (newItem: AgendaItem) => {
    const agendaWithClass = { ...newItem, classId: activeClassId };
    const optimisticId = `agenda-${Date.now()}`;
    const newAgenda = { ...agendaWithClass, id: optimisticId };

    const oldAgendas = agendas;
    const newAgendas = [newAgenda, ...oldAgendas];
    setAgendas(newAgendas);
    cacheService.set('agendas', newAgendas);

    if (isDemoMode) return;

    try {
      await apiService.createAgenda(agendaWithClass);
      // Instead of full fetchData, just fetch agendas to avoid overwriting other states
      const updatedAgendas = await apiService.getAgendas(currentUser);
      setAgendas(updatedAgendas.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      cacheService.set('agendas', updatedAgendas);
    } catch (error) {
      setAgendas(oldAgendas);
      cacheService.set('agendas', oldAgendas);
      handleShowNotification('Gagal menyimpan agenda.', 'error');
    }
  };
  const handleToggleAgenda = async (id: string) => {
    const oldAgendas = agendas;
    const newAgendas = oldAgendas.map(item => item.id === id ? { ...item, completed: !item.completed } : item);
    setAgendas(newAgendas);
    cacheService.set('agendas', newAgendas);

    if (isDemoMode) return;

    const toggledItem = newAgendas.find(a => String(a.id).trim() === String(id).trim());
    if (toggledItem) {
      try {
        await apiService.updateAgenda(toggledItem);
      } catch (error) {
        setAgendas(oldAgendas);
        cacheService.set('agendas', oldAgendas);
        handleShowNotification('Gagal memperbarui status agenda.', 'error');
      }
    }
  };
  const handleDeleteAgenda = (id: string) => {
    showConfirm('Hapus agenda ini?', () => {
      const oldAgendas = agendas;
      const newAgendas = oldAgendas.filter(item => item.id !== id);
      setAgendas(newAgendas);
      cacheService.set('agendas', newAgendas);

      if (isDemoMode) return;

      apiService.deleteAgenda(id).catch(() => {
        setAgendas(oldAgendas);
        cacheService.set('agendas', oldAgendas);
        handleShowNotification('Gagal menghapus agenda.', 'error');
      });
    });
  };
  const handleAddExtracurricular = async (item: Extracurricular) => {
    const itemWithClass = { ...item, classId: activeClassId };
    const optimisticId = `extra-${Date.now()}`;
    const newExtra = { ...itemWithClass, id: optimisticId };

    const oldExtras = extracurriculars;
    const newExtras = [...oldExtras, newExtra];
    setExtracurriculars(newExtras);
    cacheService.set('extracurriculars', newExtras);
    handleShowNotification('Ekskul berhasil ditambahkan', 'success');

    if (isDemoMode) return;

    try {
      await apiService.createExtracurricular(itemWithClass);
      const updatedExtras = await apiService.getExtracurriculars(currentUser);
      setExtracurriculars(updatedExtras);
      cacheService.set('extracurriculars', updatedExtras);
    } catch (error) {
      setExtracurriculars(oldExtras);
      cacheService.set('extracurriculars', oldExtras);
      handleShowNotification('Gagal menambahkan ekskul.', 'error');
    }
  };
  // FIX: Use `updatedItem` which is passed as an argument, instead of `editingActivity` which is not defined in this scope.
  const handleUpdateExtracurricular = async (updatedItem: Extracurricular) => {
    const itemWithClass = { ...updatedItem, classId: updatedItem.classId || activeClassId };
    const oldExtras = extracurriculars;
    const newExtras = oldExtras.map(ex => ex.id === itemWithClass.id ? itemWithClass : ex);
    setExtracurriculars(newExtras);
    cacheService.set('extracurriculars', newExtras);

    if (isDemoMode) return;

    try {
      await apiService.updateExtracurricular(itemWithClass);
    } catch (error) {
      setExtracurriculars(oldExtras);
      cacheService.set('extracurriculars', oldExtras);
      handleShowNotification('Gagal memperbarui ekskul.', 'error');
    }
  };
  
  // General & Logs
  const handleSaveGrade = async (studentId: string, subjectId: string, gradeData: any, classId: string) => { if(!isDemoMode) await apiService.saveGrade(studentId, subjectId, gradeData, classId); };
  const handleCreateLog = async (log: BehaviorLog) => { setCounselingLogs([log, ...counselingLogs]); if(log.point !== 0) { const student = students.find(s => String(s.id).trim() === String(log.studentId).trim()); if(student) { const newScore = Math.min(100, Math.max(0, student.behaviorScore + log.point)); handleUpdateStudent({ ...student, behaviorScore: newScore }); } } if(!isDemoMode) await apiService.createCounselingLog(log); handleShowNotification('Data konseling berhasil disimpan!', 'success'); };
  const handleUpdateProfile = async (type: 'teacher' | 'school', data: any) => { 
    if (type === 'teacher') { 
      setTeacherProfile(data); 
      if (!currentUser) return; 
      const updatedUser: User = { ...currentUser, fullName: data.name, nip: data.nip, nuptk: data.nuptk, birthInfo: data.birthInfo, education: data.education, position: data.position, rank: data.rank, classId: data.teachingClass, email: data.email, phone: data.phone, address: data.address, photo: data.photo, signature: data.signature }; 
      setCurrentUser(updatedUser); 
      if (!isDemoMode) {
        try {
          await apiService.saveUser(updatedUser);
          handleShowNotification('Profil guru berhasil disimpan!', 'success');
        } catch (e) {
          handleShowNotification('Gagal menyimpan profil guru.', 'error');
        }
      }
    } else { 
      setSchoolProfile(data); 
      if (!isDemoMode) {
        try {
          await apiService.saveProfile('school', data);
          handleShowNotification('Profil sekolah berhasil disimpan!', 'success');
        } catch (e) {
          handleShowNotification('Gagal menyimpan profil sekolah.', 'error');
        }
      }
    } 
  };
  
  // Holidays & Assessments
  const handleAddHoliday = async (holidaysToAdd: Omit<Holiday, 'id'>[]) => { if (isDemoMode) { const newHolidays = holidaysToAdd.map(h => ({ ...h, id: Date.now().toString() + Math.random() })); setHolidays(prev => [...prev, ...newHolidays].sort((a,b) => a.date.localeCompare(b.date))); handleShowNotification("Hari libur berhasil ditambahkan (Demo).", "success"); return; } try { await apiService.saveHolidayBatch(holidaysToAdd); handleShowNotification("Hari libur berhasil disimpan!", "success"); await fetchData(); } catch (e) { handleShowNotification("Gagal menyimpan hari libur.", "error"); } };
  const handleUpdateHoliday = async (updatedHoliday: Holiday) => { if (isDemoMode) { setHolidays(prev => prev.map(h => h.id === updatedHoliday.id ? updatedHoliday : h).sort((a,b) => a.date.localeCompare(b.date))); handleShowNotification("Hari libur diperbarui (Demo).", "success"); return; } try { await apiService.updateHoliday(updatedHoliday); handleShowNotification("Hari libur berhasil diperbarui.", "success"); await fetchData(); } catch(e) { handleShowNotification("Gagal memperbarui hari libur.", "error"); } };
  const handleDeleteHoliday = async (id: string) => { showConfirm('Hapus hari libur ini?', async () => { if (isDemoMode) { setHolidays(prev => prev.filter(h => h.id !== id)); handleShowNotification("Hari libur dihapus (Demo).", "success"); return; } try { await apiService.deleteHoliday(id); handleShowNotification("Hari libur berhasil dihapus.", "success"); await fetchData(); } catch (e) { handleShowNotification("Gagal menghapus hari libur.", "error"); } }); };
  const handleSaveSikap = async (studentId: string, assessment: Omit<SikapAssessment, 'studentId' | 'classId'>) => { setSikapAssessments(prev => { const existing = prev.find(a => String(a.studentId).trim() === String(studentId).trim()); if (existing) return prev.map(a => String(a.studentId).trim() === String(studentId).trim() ? { ...existing, ...assessment } : a); return [...prev, { studentId, classId: activeClassId, ...assessment }]; }); if (!isDemoMode) await apiService.saveSikapAssessment(studentId, activeClassId, assessment); };
  const handleSaveKarakter = async (studentId: string, assessment: Omit<KarakterAssessment, 'studentId' | 'classId'>) => { setKarakterAssessments(prev => { const existing = prev.find(a => String(a.studentId).trim() === String(studentId).trim()); if (existing) return prev.map(a => String(a.studentId).trim() === String(studentId).trim() ? { ...existing, ...assessment } : a); return [...prev, { studentId, classId: activeClassId, ...assessment }]; }); if (!isDemoMode) await apiService.saveKarakterAssessment(studentId, activeClassId, assessment); };
  
  // Accounts
  const handleAddUserAccount = async (user: Omit<User, 'id'>) => {
    const optimisticId = `user-${Date.now()}`;
    const newUser = { ...user, id: optimisticId } as User;

    const oldUsers = users;
    const newUsers = [...oldUsers, newUser];
    setUsers(newUsers);
    cacheService.set('users', newUsers);
    handleShowNotification('Akun berhasil ditambahkan.', 'success');

    if (isDemoMode) return;

    try {
      const res = await apiService.saveUser(user as User);
      if (res.id) {
        setUsers(prev => prev.map(u => u.id === optimisticId ? { ...newUser, id: res.id } : u));
        cacheService.set('users', users.map(u => u.id === optimisticId ? { ...newUser, id: res.id } : u));
      } else {
        throw new Error('No ID returned');
      }
    } catch (error) {
      setUsers(oldUsers);
      cacheService.set('users', oldUsers);
      handleShowNotification('Gagal menambahkan akun.', 'error');
    }
  };
  const handleBatchAddUserAccount = async (users: Omit<User, 'id'>[]) => { if (isDemoMode) { const newUsers = users.map((u, i) => ({ ...u, id: `user-${Date.now()}-${i}` })); setUsers(prev => [...prev, ...newUsers as User[]]); handleShowNotification('Akun ditambahkan (Mode Demo).', 'success'); return; } await apiService.saveUserBatch(users); handleShowNotification(`Berhasil menambahkan ${users.length} akun!`, 'success'); await fetchData(); };
  const handleUpdateUserAccount = async (user: User) => {
    const oldUsers = users;
    const newUsers = oldUsers.map(u => u.id === user.id ? user : u);
    setUsers(newUsers);
    cacheService.set('users', newUsers);

    if (isDemoMode) return;

    try {
      await apiService.saveUser(user);
    } catch (error) {
      setUsers(oldUsers);
      cacheService.set('users', oldUsers);
      handleShowNotification('Gagal memperbarui akun.', 'error');
    }
  };
  const handleDeleteUserAccount = async (id: string) => {
    showConfirm('Hapus akun ini?', () => {
      const oldUsers = users;
      const newUsers = oldUsers.filter(u => u.id !== id);
      setUsers(newUsers);
      cacheService.set('users', newUsers);
      handleShowNotification('Akun berhasil dihapus.', 'success');

      if (isDemoMode) return;

      apiService.deleteUser(id).catch(() => {
        setUsers(oldUsers);
        cacheService.set('users', oldUsers);
        handleShowNotification('Gagal menghapus akun.', 'error');
      });
    });
  };
  
  // Employment Links
  const handleSaveEmploymentLink = async (link: Omit<EmploymentLink, 'id'> | EmploymentLink) => {
    const optimisticId = `link-${Date.now()}`;
    const newLink = { ...link, id: (link as EmploymentLink).id || optimisticId } as EmploymentLink;

    const oldLinks = employmentLinks;
    const newLinks = oldLinks.find(l => String(l.id).trim() === String(newLink.id).trim())
      ? oldLinks.map(l => l.id === newLink.id ? newLink : l)
      : [...oldLinks, newLink];

    setEmploymentLinks(newLinks);
    cacheService.set('employmentLinks', newLinks);
    handleShowNotification('Link berhasil disimpan.', 'success');

    if (isDemoMode) return;

    try {
      await apiService.saveEmploymentLink(link);
      await fetchData(); // Refresh for server-side ID
    } catch (error) {
      setEmploymentLinks(oldLinks);
      cacheService.set('employmentLinks', oldLinks);
      handleShowNotification('Gagal menyimpan link.', 'error');
    }
  };
  const handleDeleteEmploymentLink = async (id: string) => {
    showConfirm('Hapus link ini?', () => {
      const oldLinks = employmentLinks;
      const newLinks = oldLinks.filter(l => l.id !== id);
      setEmploymentLinks(newLinks);
      cacheService.set('employmentLinks', newLinks);
      handleShowNotification('Link berhasil dihapus.', 'success');

      if (isDemoMode) return;

      apiService.deleteEmploymentLink(id).catch(() => {
        setEmploymentLinks(oldLinks);
        cacheService.set('employmentLinks', oldLinks);
        handleShowNotification('Gagal menghapus link.', 'error');
      });
    });
  };
  
  // Learning Reports
  const handleSaveReport = async (report: Omit<LearningReport, 'id'> | LearningReport) => {
    const optimisticId = `report-${Date.now()}`;
    const newReport = { 
        ...report, 
        id: (report as LearningReport).id || optimisticId,
        schoolId: schoolProfile.npsn
    } as LearningReport;

    const oldReports = learningReports;
    const newReports = oldReports.find(r => String(r.id).trim() === String(newReport.id).trim())
      ? oldReports.map(r => r.id === newReport.id ? newReport : r)
      : [...oldReports, newReport];

    setLearningReports(newReports);
    cacheService.set('learningReports', newReports);
    handleShowNotification('Laporan berhasil disimpan.', 'success');

    if (isDemoMode) return;

    try {
      await apiService.saveLearningReport(newReport);
      await fetchData(); // Refresh for server-side ID
    } catch (error) {
      setLearningReports(oldReports);
      cacheService.set('learningReports', oldReports);
      handleShowNotification('Gagal menyimpan laporan.', 'error');
    }
  };
  const handleDeleteReport = async (id: string) => {
    showConfirm('Hapus laporan ini?', () => {
      const oldReports = learningReports;
      const newReports = oldReports.filter(r => r.id !== id);
      setLearningReports(newReports);
      cacheService.set('learningReports', newReports);
      handleShowNotification('Laporan berhasil dihapus.', 'success');

      if (isDemoMode) return;

      apiService.deleteLearningReport(id, activeClassId).catch(() => {
        setLearningReports(oldReports);
        cacheService.set('learningReports', oldReports);
        handleShowNotification('Gagal menghapus laporan.', 'error');
      });
    });
  };
  
  // Liaison
  const handleSaveLiaison = async (log: Omit<LiaisonLog, 'id'>) => { if (isDemoMode) { const newLog = { ...log, id: Date.now().toString(), status: 'Pending' } as LiaisonLog; setLiaisonLogs(prev => [...prev, newLog]); handleShowNotification('Pesan terkirim (Demo).', 'success'); return; } await apiService.saveLiaisonLog(log); handleShowNotification('Pesan berhasil dikirim!', 'success'); const newLog = { ...log, id: 'temp-' + Date.now(), status: 'Pending' } as LiaisonLog; setLiaisonLogs(prev => [...prev, newLog]); const fetchedLogs = await apiService.getLiaisonLogs(currentUser); setLiaisonLogs(fetchedLogs); };
  const handleUpdateLiaisonStatus = async (ids: string[], status: 'Diterima' | 'Ditolak' | 'Selesai') => { if (isDemoMode) { setLiaisonLogs(prev => prev.map(l => ids.includes(l.id) ? { ...l, status: status } : l)); handleShowNotification(`Status diperbarui menjadi ${status} (Demo).`, 'success'); return; } await apiService.updateLiaisonStatus(ids, status); handleShowNotification(`Status laporan diperbarui: ${status}`, 'success'); const fetchedLogs = await apiService.getLiaisonLogs(currentUser); setLiaisonLogs(fetchedLogs); };

  // Permissions
  const handleSavePermissionRequest = async (date: string, records: any[]) => { 
      const typeStr = records[0]?.status; 
      const typeLabel = typeStr === 'sick' ? 'Sakit' : typeStr === 'dispensation' ? 'Dispensasi' : 'Ijin'; 
      
      if (isDemoMode) { 
          handleShowNotification(`Pengajuan ${typeLabel} tersimpan (Demo).`, 'success'); 
          return; 
      } 
      
      for (const rec of records) { 
          await apiService.savePermissionRequest({ 
              studentId: rec.studentId, 
              classId: rec.classId, 
              date: date, 
              type: rec.status, 
              reason: rec.notes 
          }); 
      } 
      
      // Automatically add to attendance
      const attendanceRecords = records.map(rec => ({
          studentId: rec.studentId,
          status: rec.status,
          notes: rec.notes
      }));
      await apiService.saveAttendance(date, attendanceRecords.map(r => ({...r, classId: records[0].classId})));

      handleShowNotification(`Pengajuan ${typeLabel} dikirim dan dicatat di absensi.`, 'success'); 
      const reqs = await apiService.getPermissionRequests(currentUser); 
      setPermissionRequests(reqs); 
      const att = await apiService.getAttendance(currentUser);
      setAllAttendanceRecords(att);
  };

  // Support Docs
  const handleSaveSupportDocument = async (doc: Omit<SupportDocument, 'id'> | SupportDocument) => {
    const optimisticId = `sdoc-${Date.now()}`;
    const newDoc = { ...doc, id: (doc as SupportDocument).id || optimisticId } as SupportDocument;

    const oldDocs = supportDocuments;
    const newDocs = oldDocs.find(d => String(d.id).trim() === String(newDoc.id).trim())
      ? oldDocs.map(d => d.id === newDoc.id ? newDoc : d)
      : [newDoc, ...oldDocs];

    setSupportDocuments(newDocs);
    cacheService.set('supportDocuments', newDocs);
    handleShowNotification('Dokumen berhasil disimpan.', 'success');

    if (isDemoMode) return;

    try {
      await apiService.saveSupportDocument(doc);
      await fetchData(); // Refresh for server-side ID
    } catch (error) {
      setSupportDocuments(oldDocs);
      cacheService.set('supportDocuments', oldDocs);
      handleShowNotification('Gagal menyimpan dokumen.', 'error');
    }
  };
  const handleDeleteSupportDocument = async (id: string) => {
    showConfirm('Hapus dokumen ini?', () => {
      const oldDocs = supportDocuments;
      const newDocs = oldDocs.filter(d => d.id !== id);
      setSupportDocuments(newDocs);
      cacheService.set('supportDocuments', newDocs);
      handleShowNotification('Dokumen berhasil dihapus.', 'success');

      if (isDemoMode) return;

      apiService.deleteSupportDocument(id, activeClassId).catch(() => {
        setSupportDocuments(oldDocs);
        cacheService.set('supportDocuments', oldDocs);
        handleShowNotification('Gagal menghapus dokumen.', 'error');
      });
    });
  };

  // School Assets
  const handleSaveSchoolAsset = async (asset: SchoolAsset) => {
    const optimisticId = `asset-${Date.now()}`;
    const newAsset = { ...asset, id: asset.id || optimisticId };

    const oldAssets = schoolAssets;
    const newAssets = oldAssets.find(a => String(a.id).trim() === String(newAsset.id).trim())
      ? oldAssets.map(a => a.id === newAsset.id ? newAsset : a)
      : [...oldAssets, newAsset];

    setSchoolAssets(newAssets);
    cacheService.set('schoolAssets', newAssets);
    handleShowNotification('Data aset berhasil disimpan.', 'success');

    if (isDemoMode) return;

    try {
      await apiService.saveSchoolAsset(asset);
      await fetchData(); // Refresh for server-side ID
    } catch (error) {
      setSchoolAssets(oldAssets);
      cacheService.set('schoolAssets', oldAssets);
      handleShowNotification('Gagal menyimpan data aset.', 'error');
    }
  };
  const handleDeleteSchoolAsset = async (id: string) => {
    showConfirm('Hapus data aset ini?', () => {
      const oldAssets = schoolAssets;
      const newAssets = oldAssets.filter(a => a.id !== id);
      setSchoolAssets(newAssets);
      cacheService.set('schoolAssets', newAssets);
      handleShowNotification('Data aset berhasil dihapus.', 'success');

      if (isDemoMode) return;

      apiService.deleteSchoolAsset(id).catch(() => {
        setSchoolAssets(oldAssets);
        cacheService.set('schoolAssets', oldAssets);
        handleShowNotification('Gagal menghapus data aset.', 'error');
      });
    });
  };
  
  // Book Loans
  const handleSaveBookLoan = async (loan: BookLoan) => {
    const actionMsg = loan.status === 'Dipinjam' ? 'dipinjam' : 'dikembalikan';
    const optimisticId = `loan-${Date.now()}`;
    const newLoan = { ...loan, id: loan.id || optimisticId };

    const oldLoans = bookLoans;
    const newLoans = oldLoans.find(l => String(l.id).trim() === String(newLoan.id).trim())
      ? oldLoans.map(l => l.id === newLoan.id ? newLoan : l)
      : [newLoan, ...oldLoans];

    setBookLoans(newLoans);
    cacheService.set('bookLoans', newLoans);
    handleShowNotification(`Buku berhasil ${actionMsg}.`, 'success');

    if (isDemoMode) return;

    try {
      // Fetch latest inventory to ensure we don't overwrite concurrent edits
      const currentInventory = await apiService.getBookInventory(loan.classId);
      let inventoryChanged = false;

      // Logic for stock update
      const isNew = !oldLoans.find(l => l.id === loan.id);
      const oldLoan = oldLoans.find(l => l.id === loan.id);

      // Scenario 1: New Loan (Dipinjam)
      if (isNew && loan.status === 'Dipinjam') {
          loan.books.forEach(bookName => {
              const itemIndex = currentInventory.findIndex(i => i.name === bookName);
              if (itemIndex !== -1) {
                  // Decrease by 1 per book, as requested
                  currentInventory[itemIndex].stock = Math.max(0, currentInventory[itemIndex].stock - 1);
                  inventoryChanged = true;
              }
          });
      }
      // Scenario 2: Returning a Loan (Dipinjam -> Dikembalikan)
      else if (!isNew && oldLoan?.status === 'Dipinjam' && loan.status === 'Dikembalikan') {
          loan.books.forEach(bookName => {
              const itemIndex = currentInventory.findIndex(i => i.name === bookName);
              if (itemIndex !== -1) {
                  // Increase by 1 per book
                  currentInventory[itemIndex].stock = currentInventory[itemIndex].stock + 1;
                  inventoryChanged = true;
              }
          });
      }

      // Save inventory if changed
      if (inventoryChanged) {
          await apiService.saveBookInventory(currentInventory);
      }

      await apiService.saveBookLoan(loan);
      await fetchData(); // Refresh for server-side ID
    } catch (error) {
      setBookLoans(oldLoans);
      cacheService.set('bookLoans', oldLoans);
      handleShowNotification('Gagal menyimpan data peminjaman.', 'error');
    }
  };
  const handleDeleteBookLoan = async (id: string) => {
    showConfirm('Hapus data peminjaman ini?', () => {
      const oldLoans = bookLoans;
      const loanToDelete = oldLoans.find(l => l.id === id);
      const newLoans = oldLoans.filter(l => l.id !== id);
      
      setBookLoans(newLoans);
      cacheService.set('bookLoans', newLoans);
      handleShowNotification('Data peminjaman berhasil dihapus.', 'success');

      if (isDemoMode) return;

      const processDelete = async () => {
          try {
              if (loanToDelete && loanToDelete.status === 'Dipinjam') {
                  const currentInventory = await apiService.getBookInventory(loanToDelete.classId);
                  let inventoryChanged = false;
                  
                  loanToDelete.books.forEach(bookName => {
                      const itemIndex = currentInventory.findIndex(i => i.name === bookName);
                      if (itemIndex !== -1) {
                          // Increase by 1 per book
                          currentInventory[itemIndex].stock = currentInventory[itemIndex].stock + 1;
                          inventoryChanged = true;
                      }
                  });

                  if (inventoryChanged) {
                      await apiService.saveBookInventory(currentInventory);
                  }
              }
              
              await apiService.deleteBookLoan(id);
              await fetchData(); // Refresh data
          } catch (error) {
              setBookLoans(oldLoans);
              cacheService.set('bookLoans', oldLoans);
              handleShowNotification('Gagal menghapus data peminjaman.', 'error');
          }
      };

      processDelete();
    });
  };

  const fetchData = async (forceRefresh = false, silent = false) => {
    if (!currentUser) return;

    const isCacheEmpty = !cacheService.get('students');
    if ((isCacheEmpty || forceRefresh) && !silent) {
      setLoading(true);
    }
    setError(null);
    setIsDemoMode(false);

    // Pastikan loading tampil minimal 1 detik agar transisi halus
    const minDelay = !silent ? new Promise(resolve => setTimeout(resolve, 1000)) : Promise.resolve();

    if (!apiService.isConfigured()) {
      setStudents(MOCK_STUDENTS);
      setExtracurriculars(MOCK_EXTRACURRICULARS);
      setAgendas([]);
      setTeacherProfile({name: 'Budi Santoso (Demo)', nip:'123', email:'demo@guru.com', phone:'-', address:''});
      setIsDemoMode(true);
      await minDelay;
      if (!silent) setLoading(false);
      handleShowNotification("Mode Demo Aktif: Backend belum dikonfigurasi.", "warning");
      return;
    }

    try {
      const classIdToFetch = activeClassId;

      const promises: Promise<any>[] = [
        currentUser?.role === 'admin' || currentUser?.role === 'supervisor' ? apiService.getUsers(currentUser) : Promise.resolve([]),
        apiService.getStudents(currentUser),
        apiService.getAgendas(currentUser),
        apiService.getGrades(currentUser),
        apiService.getCounselingLogs(currentUser),
        apiService.getExtracurriculars(currentUser),
        apiService.getProfiles(),
        apiService.getHolidays(currentUser),
        apiService.getAttendance(currentUser),
        apiService.getSikapAssessments(currentUser),
        apiService.getKarakterAssessments(currentUser),
        apiService.getEmploymentLinks(),
        apiService.getLearningReports(classIdToFetch),
        apiService.getLearningDocumentation(classIdToFetch),
        apiService.getLiaisonLogs(currentUser), 
        apiService.getPermissionRequests(currentUser),
        apiService.getSupportDocuments(currentUser),
        apiService.getBookLoans(currentUser),
        apiService.getClassConfig(classIdToFetch),
      ];

      // Add inventory fetch if admin/supervisor
      if (currentUser?.role === 'admin' || currentUser?.role === 'supervisor') {
          promises.push(apiService.getInventory('ALL'));
      } else {
          promises.push(Promise.resolve([]));
      }

      // Add School Assets Fetch
      if (currentUser?.role === 'admin' || currentUser?.role === 'supervisor') {
          promises.push(apiService.getSchoolAssets());
      } else {
          promises.push(Promise.resolve([]));
      }

      // Add BOS Fetch
      if (currentUser?.role === 'admin' || currentUser?.role === 'supervisor') {
          promises.push(apiService.getBOS());
      } else {
          promises.push(Promise.resolve([]));
      }

      // Add minDelay to ensure at least 1s loading
      promises.push(minDelay);

      const results = await Promise.all(promises.map(p => p.catch(e => {
          console.warn("Individual fetch error:", e);
          return null; // Return null to indicate failure
      })));
      
      const [
          fUsers, fStudents, fAgendas, fGrades, fCounseling, fExtracurriculars, 
          fProfiles, fHolidays, fAttendance, fSikap, fKarakter, fLinks, fReports, 
          fLearningDocs, fLiaison, fPermissions, fSupportDocs, fBookLoans, fClassConfig, fInventory, fSchoolAssets, fBOS,
          _delay // Placeholder for minDelay
      ] = results;
      
      if (fUsers !== null) setUsers(Array.isArray(fUsers) ? fUsers as User[] : []);
      if (fStudents !== null) setStudents(Array.isArray(fStudents) ? fStudents as Student[] : []);
      if (fAgendas !== null) setAgendas(Array.isArray(fAgendas) ? (fAgendas as AgendaItem[]).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()) : []);
      if (fGrades !== null) setGrades(Array.isArray(fGrades) ? fGrades as GradeRecord[] : []);
      if (fCounseling !== null) setCounselingLogs(Array.isArray(fCounseling) ? (fCounseling as BehaviorLog[]).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()) : []);
      if (fHolidays !== null) setHolidays(Array.isArray(fHolidays) ? (fHolidays as Holiday[]).sort((a,b) => a.date.localeCompare(b.date)) : []);
      if (fAttendance !== null) setAllAttendanceRecords(Array.isArray(fAttendance) ? fAttendance as any[] : []);
      if (fSikap !== null) setSikapAssessments(Array.isArray(fSikap) ? fSikap as SikapAssessment[] : []);
      if (fKarakter !== null) setKarakterAssessments(Array.isArray(fKarakter) ? fKarakter as KarakterAssessment[] : []);
      if (fLinks !== null) setEmploymentLinks(Array.isArray(fLinks) ? fLinks as EmploymentLink[] : []);
      if (fReports !== null) setLearningReports(Array.isArray(fReports) ? fReports as LearningReport[] : []);
      if (fLearningDocs !== null) setLearningDocumentation(Array.isArray(fLearningDocs) ? fLearningDocs as LearningDocumentation[] : []);
      if (fLiaison !== null) setLiaisonLogs(Array.isArray(fLiaison) ? fLiaison as LiaisonLog[] : []);
      if (fSupportDocs !== null) setSupportDocuments(Array.isArray(fSupportDocs) ? fSupportDocs as SupportDocument[] : []);
      if (fBookLoans !== null) setBookLoans(Array.isArray(fBookLoans) ? fBookLoans as BookLoan[] : []);
      
      // Set global inventory state
      if (fInventory !== null && Array.isArray(fInventory)) {
          setInventory(fInventory as InventoryItem[]);
      }

      // Set global school assets state
      if (fSchoolAssets !== null && Array.isArray(fSchoolAssets)) {
          setSchoolAssets(fSchoolAssets as SchoolAsset[]);
      }

      // Set BOS state
      if (fBOS !== null && Array.isArray(fBOS)) {
          setBosTransactions(fBOS as BOSTransaction[]);
      }

      if (fClassConfig !== null) {
          const fetchedKktp = fClassConfig?.KKTP || fClassConfig?.kktp;
          if (fetchedKktp && Object.keys(fetchedKktp).length > 0) {
            setKktpMap(fetchedKktp);
            console.log("KKTP Map set from fetched config:", fetchedKktp);
          } else {
            const defaults: Record<string, number> = {};
            MOCK_SUBJECTS.forEach(s => { defaults[s.id] = s.kkm; });
            setKktpMap(defaults);
            console.log("KKTP Map set to defaults:", defaults);
          }
      }
      
      if (fPermissions !== null && fStudents !== null) {
          const hydratedPermissions = (fPermissions as PermissionRequest[]).map((p: any) => ({
              ...p,
              studentName: (fStudents as Student[]).find((s: Student) => String(s.id).trim() === String(p.studentId).trim())?.name || 'Siswa Tidak Dikenal'
          }));
          setPermissionRequests(hydratedPermissions);
          cacheService.set('permissionRequests', hydratedPermissions);
      }

      // Cache the new data (only if not null)
      if (fUsers !== null) cacheService.set('users', fUsers as User[]);
      if (fStudents !== null) cacheService.set('students', fStudents as Student[]);
      if (fAgendas !== null) cacheService.set('agendas', (fAgendas as AgendaItem[]).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      if (fGrades !== null) cacheService.set('grades', fGrades as GradeRecord[]);
      if (fCounseling !== null) cacheService.set('counselingLogs', (fCounseling as BehaviorLog[]).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      if (fHolidays !== null) cacheService.set('holidays', (fHolidays as Holiday[]).sort((a,b) => a.date.localeCompare(b.date)));
      if (fAttendance !== null) cacheService.set('allAttendanceRecords', fAttendance as any[]);
      if (fSikap !== null) cacheService.set('sikapAssessments', fSikap as SikapAssessment[]);
      if (fKarakter !== null) cacheService.set('karakterAssessments', fKarakter as KarakterAssessment[]);
      if (fLinks !== null) cacheService.set('employmentLinks', fLinks as EmploymentLink[]);
      if (fReports !== null) cacheService.set('learningReports', fReports as LearningReport[]);
      if (fLearningDocs !== null) cacheService.set('learningDocumentation', fLearningDocs as LearningDocumentation[]);
      if (fLiaison !== null) cacheService.set('liaisonLogs', fLiaison as LiaisonLog[]);
      if (fSupportDocs !== null) cacheService.set('supportDocuments', fSupportDocs as SupportDocument[]);
      if (fInventory !== null) cacheService.set('inventory', fInventory as InventoryItem[]);
      if (fSchoolAssets !== null) cacheService.set('schoolAssets', fSchoolAssets as SchoolAsset[]);
      if (fBOS !== null) cacheService.set('bosTransactions', fBOS as BOSTransaction[]);
      if (fBookLoans !== null) cacheService.set('bookLoans', fBookLoans as BookLoan[]);
      
      if (fExtracurriculars !== null) {
          setExtracurriculars(Array.isArray(fExtracurriculars) ? fExtracurriculars as Extracurricular[] : []);
          cacheService.set('extracurriculars', Array.isArray(fExtracurriculars) ? fExtracurriculars as Extracurricular[] : []);
      }
      
      const profilesTyped = (fProfiles || {}) as { teacher?: TeacherProfileData, school?: SchoolProfileData };

      if (profilesTyped.teacher) {
          setTeacherProfile(prev => ({
              ...prev,
              ...profilesTyped.teacher
          }));
      }

      if (currentUser) {
          setTeacherProfile(prev => ({
              ...prev,
              name: (currentUser.fullName && currentUser.fullName !== 'undefined') ? currentUser.fullName : (prev.name || 'Guru'),
              nip: currentUser.nip || prev.nip,
              nuptk: currentUser.nuptk || prev.nuptk,
              position: currentUser.position,
              teachingClass: currentUser.classId || prev.teachingClass,
              birthInfo: currentUser.birthInfo || prev.birthInfo,
              education: currentUser.education || prev.education,
              rank: currentUser.rank || prev.rank,
              email: currentUser.email || prev.email,
              phone: currentUser.phone || prev.phone,
              address: currentUser.address || prev.address,
              photo: currentUser.photo || prev.photo,
              signature: currentUser.signature || prev.signature
          }));
      }

      if(profilesTyped.school) {
          setSchoolProfile(prev => ({
              ...prev,
              ...profilesTyped.school,
              developerInfo: { 
                  name: profilesTyped.school?.developerInfo?.name || prev.developerInfo?.name || '',
                  moto: profilesTyped.school?.developerInfo?.moto || prev.developerInfo?.moto || '',
                  photo: profilesTyped.school?.developerInfo?.photo || prev.developerInfo?.photo || ''
              }
          }));
      }

    } catch (err: any) {
      console.warn("Gagal memuat data:", err);
      handleShowNotification("Gagal terhubung ke server. Mode Offline (Data Kosong).", 'warning');
      setError(null);
      setStudents([]);
      setExtracurriculars([]);
      setTeacherProfile({name: 'Guru (Offline)', nip:'', email:'', phone:'', address:''});
      setIsDemoMode(true);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
       fetchData();
    }
  }, [currentUser, activeClassId]);

  useEffect(() => {
    if (currentUser) {
       // Check for new messages in liaisonLogs
       const pendingLiaison = liaisonLogs.filter(log => 
         log.sender === 'Wali Murid' && 
         (log.status === 'Pending' || !log.status) &&
         (currentUser.role === 'admin' || log.classId === currentUser.classId)
       );

       if (pendingLiaison.length > 0) {
           setHasNewMessages(true);
           setUnreadMessageCount(pendingLiaison.length);
       } else {
           setHasNewMessages(false);
           setUnreadMessageCount(0);
       }
    }
  }, [currentUser, activeClassId, liaisonLogs]);

  if (!currentUser) {
      return <Login onLoginSuccess={setCurrentUser} />;
  }

  const isStudentRole = currentUser.role === 'siswa';
  const isAdminRole = currentUser.role === 'admin';
  const isSupervisor = currentUser.role === 'supervisor';

  const myStudentData = isStudentRole 
    ? (students.find(s => String(s.id).trim() === String(currentUser.studentId).trim()) || null)
    : null;

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[80vh] text-gray-500 animate-fade-in overflow-hidden relative">
           
           <div className="relative w-24 h-24 flex items-center justify-center mb-6 animate-bounce">
              <div className="absolute inset-0 bg-[#A0DEFF]/30 rounded-full blur-2xl opacity-60 animate-pulse"></div>
              <img 
                src="https://image2url.com/r2/default/images/1770790148258-99f209ea-fd45-44cf-9576-9c5205ef8b20.png" 
                alt="Logo SAGARA" 
                className="w-full h-full object-contain drop-shadow-xl"
              />
           </div>
           <h2 className="text-xl font-bold text-slate-700 mb-2">Menyiapkan Data Kelas...</h2>
           <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-[#5AB2FF] rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
              <div className="w-2 h-2 bg-[#5AB2FF] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-[#5AB2FF] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
           </div>
        </div>
      );
    }

    switch (currentView) {
      case 'dashboard':
        return <DashboardContainer
            isStudentRole={isStudentRole}
            isSupervisor={isSupervisor}
            myStudentData={myStudentData}
            allAttendanceRecords={allAttendanceRecords}
            grades={grades}
            liaisonLogs={liaisonLogs}
            filteredCounseling={filteredCounseling}
            permissionRequests={permissionRequests}
            karakterAssessments={karakterAssessments}
            onSavePermission={handleSavePermissionRequest}
            onSaveLiaison={handleSaveLiaison}
            onSaveKarakter={handleSaveKarakter}
            onUpdateStudent={handleUpdateStudent}
            students={students}
            users={users}
            extracurriculars={extracurriculars}
            inventory={inventory}
            schoolAssets={schoolAssets}
            bosTransactions={bosTransactions}
            filteredStudents={filteredStudents}
            filteredAgendas={filteredAgendas}
            filteredAttendance={filteredAttendance}
            holidays={filteredHolidays}
            teacherProfile={teacherProfile}
            activeClassId={activeClassId}
            onChangeView={setCurrentView}
            adminCompleteness={adminPercentage}
            employmentLinks={employmentLinks}
            pendingPermissions={pendingPermissions}
            onOpenPermissionModal={() => setIsPermissionModalOpen(true)}
            schoolProfile={schoolProfile}
            learningDocumentation={filteredLearningDocumentation}
            learningReports={filteredReports}
            hasNewMessages={hasNewMessages}
            unreadMessageCount={unreadMessageCount}
            bookLoans={bookLoans}
            subjects={MOCK_SUBJECTS}
            kktpMap={kktpMap}
        />;
      case 'learning-documentation':
        if (isStudentRole) { setCurrentView('dashboard'); return null; }
        return <LearningDocumentationView 
          documentation={filteredLearningDocumentation}
          onSave={handleSaveLearningDocumentation}
          onDelete={handleDeleteLearningDocumentation}
          onShowNotification={handleShowNotification}
          classId={activeClassId}
        />;
      case 'supervisor-overview':
        if (!isSupervisor && !isAdminRole) { setCurrentView('dashboard'); return null; }
        return <SupervisorOverview
                  students={students}
                  users={users}
                  attendanceRecords={allAttendanceRecords}
                  grades={grades}
                  liaisonLogs={liaisonLogs}
                  permissionRequests={permissionRequests}
                  counselingLogs={counselingLogs}
                  extracurriculars={extracurriculars}
                  inventory={inventory} 
                  schoolAssets={schoolAssets}
                  bosTransactions={bosTransactions}
               />;
      case 'school-assets':
        if (!isAdminRole && !isSupervisor) { setCurrentView('dashboard'); return null; }
        return <SchoolAssetsAdmin 
                  assets={schoolAssets}
                  onSave={handleSaveSchoolAsset}
                  onDelete={handleDeleteSchoolAsset}
               />;
      case 'book-loan':
        if (isStudentRole) { setCurrentView('dashboard'); return null; }
        return <BookLoanView 
                  students={filteredStudents}
                  bookLoans={bookLoans}
                  onSaveLoan={handleSaveBookLoan}
                  onDeleteLoan={handleDeleteBookLoan}
                  isDemoMode={isDemoMode}
                  classId={activeClassId}
                  onShowNotification={handleShowNotification}
               />;
      case 'bos-admin': // NEW CASE
        if (!isAdminRole && !isSupervisor) { setCurrentView('dashboard'); return null; }
        return <BOSManagement
                  transactions={bosTransactions}
                  onSave={handleSaveBOS}
                  onDelete={handleDeleteBOS}
                  schoolProfile={schoolProfile}
                  isReadOnly={isSupervisor} // Supervisor Read Only
               />;
      case 'student-monitor':
        if (!isAdminRole && !isSupervisor && currentUser.role !== 'guru') { setCurrentView('dashboard'); return null; }
        return <StudentMonitor 
                  students={filteredStudents}
                  allAttendance={allAttendanceRecords}
                  grades={filteredGrades}
                  agendas={filteredAgendas}
                  liaisonLogs={filteredLiaison}
                  onSaveLiaison={handleSaveLiaison}
                  onSavePermission={handleSavePermissionRequest}
                  onUpdateLiaisonStatus={handleUpdateLiaisonStatus}
                  classId={activeClassId}
                  onUpdateStudent={handleUpdateStudent}
               />;
      case 'liaison-book': 
        if (isStudentRole) { setCurrentView('dashboard'); return null; }
        return <LiaisonBookView
                  logs={filteredLiaison}
                  students={students} 
                  onReply={handleSaveLiaison}
                  onUpdateStatus={handleUpdateLiaisonStatus}
                  classId={activeClassId}
               />;
      case 'pendahuluan':
        if (isStudentRole) { setCurrentView('dashboard'); return null; }
        return <IntroductionView />;
      case 'profile':
        if (isStudentRole) { setCurrentView('dashboard'); return null; }
        return <TeacherProfile 
                  initialTeacher={teacherProfile} 
                  initialSchool={schoolProfile} 
                  onSave={handleUpdateProfile}
                  onShowNotification={handleShowNotification}
                  userRole={currentUser?.role}
                />;
      case 'students':
        if (isStudentRole) { setCurrentView('dashboard'); return null; }
        return <StudentList 
          students={filteredStudents} 
          teacherProfile={teacherProfile} 
          schoolProfile={schoolProfile}
          classId={activeClassId}
          onAdd={handleAddStudent}
          onBatchAdd={handleBatchAddStudents} 
          onUpdate={handleUpdateStudent} 
          onDelete={handleDeleteStudent} 
          onShowNotification={handleShowNotification}
          isReadOnly={isGlobalReadOnly} 
        />;
      case 'attendance':
        if (isStudentRole) { setCurrentView('dashboard'); return null; }
        return <AttendanceView 
                  students={filteredStudents}
                  allStudents={students}
                  allAttendanceRecords={filteredAttendance}
                  holidays={filteredHolidays}
                  onRefreshData={fetchData}
                  onAddHoliday={handleAddHoliday}
                  onUpdateHoliday={handleUpdateHoliday}
                  onDeleteHoliday={handleDeleteHoliday}
                  isDemoMode={isDemoMode}
                  onShowNotification={handleShowNotification}
                  teacherProfile={teacherProfile}
                  schoolProfile={schoolProfile}
                  classId={activeClassId}
                  isReadOnly={isGlobalReadOnly}
                  userRole={currentUser?.role}
                />;
      case 'grades':
        if (isStudentRole) { setCurrentView('dashboard'); return null; }
        return <GradesView 
                  students={filteredStudents} 
                  initialGrades={filteredGrades} 
                  onSave={handleSaveGrade} 
                  onShowNotification={handleShowNotification} 
                  classId={activeClassId}
                  isReadOnly={isGlobalReadOnly}
                  allowedSubjects={allowedSubjects}
                  schoolProfile={schoolProfile}
                  teacherProfile={teacherProfile}
                />;
      case 'attitude':
          if (isStudentRole) { setCurrentView('dashboard'); return null; }
          return <AttitudeView 
                    students={filteredStudents}
                    initialSikap={filteredSikap}
                    initialKarakter={filteredKarakter}
                    onSaveSikap={handleSaveSikap}
                    onSaveKarakter={handleSaveKarakter}
                    onShowNotification={handleShowNotification}
                    classId={activeClassId}
                    isReadOnly={isGlobalReadOnly}
                  />;
      case 'learning-reports': 
        if (isStudentRole) { setCurrentView('dashboard'); return null; }
        const allTeachers = users.filter(u => u.role === 'guru');
        return <LearningReportsView 
                  reports={learningReports}
                  subjects={MOCK_SUBJECTS}
                  onSave={handleSaveReport}
                  onDelete={handleDeleteReport}
                  classId={activeClassId}
                  teachers={allTeachers}
                  onNavigateToJournal={handleNavigateToJournal}
               />;
      case 'learning-journal':
        if (isStudentRole) { setCurrentView('dashboard'); return null; }
        return <LearningJournalView 
                  classId={activeClassId}
                  isReadOnly={isGlobalReadOnly}
                  targetDate={journalTargetDate}
                  onSaveBatch={handleSaveJournalAndAutoReport}
                  schoolProfile={schoolProfile}
                  teacherProfile={teacherProfile}
                  currentUser={currentUser}
               />;
      case 'counseling':
        if (isStudentRole) { setCurrentView('dashboard'); return null; }
        return <CounselingView 
          students={filteredStudents} 
          logs={filteredCounseling} 
          onCreateLog={handleCreateLog} 
          onShowNotification={handleShowNotification} 
          classId={activeClassId}
        />;
      case 'activities':
        if (isStudentRole) { setCurrentView('dashboard'); return null; }
        return (
          <ActivitiesView 
            students={filteredStudents} 
            agendas={filteredAgendas}
            extracurriculars={filteredExtracurriculars}
            onAddAgenda={handleAddAgenda}
            onToggleAgenda={handleToggleAgenda}
            onDeleteAgenda={handleDeleteAgenda}
            onUpdateExtracurricular={handleUpdateExtracurricular}
            onAddExtracurricular={handleAddExtracurricular}
            onShowNotification={handleShowNotification}
            classId={activeClassId}
          />
        );
      case 'admin':
        if (isStudentRole) { setCurrentView('dashboard'); return null; }
        return <ClassroomAdmin 
                  students={filteredStudents} 
                  teacherProfile={teacherProfile} 
                  onShowNotification={handleShowNotification}
                  holidays={filteredHolidays}
                  onAddHoliday={handleAddHoliday}
                  classId={activeClassId}
                  userRole={currentUser.role}
                  users={users}
                  schoolProfile={schoolProfile}
                />;
      case 'support-docs':
        if (isStudentRole) { setCurrentView('dashboard'); return null; }
        return <SupportDocumentsView
                  documents={filteredSupportDocuments}
                  onSave={handleSaveSupportDocument}
                  onDelete={handleDeleteSupportDocument}
                  onShowNotification={handleShowNotification}
                  classId={activeClassId}
                  isReadOnly={isGlobalReadOnly}
                />;
      case 'employment-links': 
        if (currentUser.role !== 'admin') {
           setCurrentView('dashboard');
           return null;
        }
        return <EmploymentLinksAdmin 
                  links={employmentLinks}
                  onSave={handleSaveEmploymentLink}
                  onDelete={handleDeleteEmploymentLink}
               />;
      case 'accounts':
        if (currentUser.role !== 'admin') {
           setCurrentView('dashboard');
           return null;
        }
        return <AccountManagement
                  users={users}
                  students={students}
                  onAdd={handleAddUserAccount}
                  onBatchAdd={handleBatchAddUserAccount}
                  onUpdate={handleUpdateUserAccount}
                  onDelete={handleDeleteUserAccount}
                />;
      case 'backup-restore':
        if (currentUser.role !== 'admin') {
           setCurrentView('dashboard');
           return null;
        }
        const fullBackupData = {
            users,
            students,
            agendas,
            extracurriculars,
            counselingLogs,
            grades,
            holidays,
            allAttendanceRecords,
            sikapAssessments,
            karakterAssessments,
            employmentLinks,
            learningReports,
            liaisonLogs,
            permissionRequests,
            schoolProfile,
            schoolAssets,
            bosTransactions // Include BOS
        };
        return <BackupRestore 
                  data={fullBackupData} 
                  onRestore={handleRestoreData} 
               />;
      default:
        // Fallback to Dashboard Container
        return <DashboardContainer
            isStudentRole={isStudentRole}
            isSupervisor={isSupervisor}
            myStudentData={myStudentData}
            allAttendanceRecords={allAttendanceRecords}
            grades={grades}
            liaisonLogs={liaisonLogs}
            filteredCounseling={filteredCounseling}
            permissionRequests={permissionRequests}
            karakterAssessments={karakterAssessments}
            onSavePermission={handleSavePermissionRequest}
            onSaveLiaison={handleSaveLiaison}
            onSaveKarakter={handleSaveKarakter}
            onUpdateStudent={handleUpdateStudent}
            students={students}
            users={users}
            extracurriculars={extracurriculars}
            inventory={inventory}
            schoolAssets={schoolAssets}
            bosTransactions={bosTransactions}
            filteredStudents={filteredStudents}
            filteredAgendas={filteredAgendas}
            filteredAttendance={filteredAttendance}
            holidays={filteredHolidays}
            teacherProfile={teacherProfile}
            activeClassId={activeClassId}
            onChangeView={setCurrentView}
            adminCompleteness={adminPercentage}
            employmentLinks={employmentLinks}
            pendingPermissions={pendingPermissions}
            onOpenPermissionModal={() => setIsPermissionModalOpen(true)}
            schoolProfile={schoolProfile}
            learningDocumentation={filteredLearningDocumentation}
            hasNewMessages={hasNewMessages}
            unreadMessageCount={unreadMessageCount}
            bookLoans={bookLoans}
            subjects={MOCK_SUBJECTS}
            kktpMap={kktpMap}
        />;
    }
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden font-sans text-slate-800">
      {!isStudentRole && (
        <Sidebar 
          currentUser={currentUser}
          currentView={currentView} 
          onChangeView={setCurrentView} 
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onLogout={handleLogout}
        />
      )}

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden">
            <img 
              src="https://image2url.com/r2/default/images/1771068223735-6f3b5a3d-5a11-4f2e-9639-10adf921bb50.png"
              alt="Watermark"
              className="w-[500px] h-[500px] object-contain opacity-5"
            />
        </div>

        <header className="bg-white/80 backdrop-blur-md border-b border-[#CAF4FF] h-16 flex items-center justify-between px-4 lg:px-8 z-20 shrink-0 sticky top-0 no-print">
          <div className="flex items-center gap-4">
            {!isStudentRole && (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 -ml-2 rounded-lg lg:hidden hover:bg-[#CAF4FF] text-gray-600 transition-colors"
              >
                <Menu size={24} />
              </button>
            )}
            <div className="flex items-center gap-2 lg:hidden">
                <img 
                    src="https://image2url.com/r2/default/images/1770790148258-99f209ea-fd45-44cf-9576-9c5205ef8b20.png" 
                    alt="Logo SAGARA"
                    className="h-8 w-8 object-contain"
                />
                <h1 className="text-xl font-extrabold tracking-tight flex items-center">
                    <span className="text-gradient-brand">SAGARA</span>
                </h1>
            </div>

            {canSelectClass && (
                <div className="hidden lg:flex items-center bg-[#CAF4FF]/30 border border-[#A0DEFF]/50 rounded-lg px-3 py-1.5 shadow-sm">
                    <Filter size={14} className="text-[#5AB2FF] mr-2" />
                    <span className="text-xs font-bold text-gray-50 uppercase mr-2">Pilih Kelas:</span>
                    <select 
                        value={selectedClassId} 
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="bg-transparent text-sm font-bold text-[#5AB2FF] outline-none cursor-pointer"
                    >
                        {availableClasses.map(cls => (
                            <option key={cls} value={cls}>Kelas {cls}</option>
                        ))}
                    </select>
                </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
             {!isStudentRole && (
                 <div className="flex items-center space-x-2">
                     {/* Liaison Notification Bell */}
                     <button 
                        onClick={() => setCurrentView('liaison-book')}
                        className={`p-2 rounded-full transition-all relative ${
                            unreadLiaisonCount > 0 
                            ? 'text-amber-500 bg-amber-50 animate-vibrate' 
                            : 'text-gray-500 hover:text-[#5AB2FF] hover:bg-[#CAF4FF]/50'
                        }`}
                        title="Buku Penghubung"
                     >
                         <MessageSquare size={20} />
                         {unreadLiaisonCount > 0 && (
                             <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
                                 {unreadLiaisonCount}
                             </span>
                         )}
                     </button>

                     {/* Permission Notification Bell */}
                     <button 
                        onClick={() => setIsPermissionModalOpen(true)}
                        className="p-2 text-gray-500 hover:text-[#5AB2FF] hover:bg-[#CAF4FF]/50 rounded-full transition-colors relative"
                        title="Izin & Sakit"
                     >
                         <Bell size={20} />
                         {pendingPermissions.length > 0 && (
                             <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                         )}
                     </button>
                 </div>
             )}

             {isDemoMode && (
               <div className="hidden lg:flex items-center text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full mr-2">
                 <WifiOff size={14} className="mr-1.5" /> Offline Mode
               </div>
             )}
             <button onClick={() => fetchData(true)} className="p-2 text-gray-400 hover:text-[#5AB2FF] rounded-full hover:bg-[#CAF4FF]/50" title="Refresh Data">
               <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
             </button>

             <div className="relative" ref={profileDropdownRef}>
                <button 
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="flex items-center space-x-2 bg-[#CAF4FF]/30 hover:bg-[#CAF4FF] p-1.5 rounded-full transition-colors border border-[#A0DEFF]/30"
                >
                    <div className="w-8 h-8 rounded-full bg-white border-2 border-white overflow-hidden">
                        <img 
                          src={teacherProfile.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.fullName}`} 
                          alt="Avatar" 
                          className="w-full h-full object-cover" 
                        />
                    </div>
                    <div className="hidden md:flex flex-col items-start mr-2">
                        <span className="text-xs font-bold text-[#5AB2FF]">{currentUser?.fullName}</span>
                        <span className="text-[10px] text-gray-500 capitalize">{currentUser?.role}</span>
                    </div>
                    <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 hidden md:block ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isProfileDropdownOpen && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-[#CAF4FF] overflow-hidden animate-fade-in-up z-20">
                        <div className="p-2">
                            {!isStudentRole && (
                                <button 
                                    onClick={() => { setCurrentView('profile'); setIsProfileDropdownOpen(false); }}
                                    className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-[#CAF4FF]/50"
                                >
                                    <UserCog size={16} />
                                    <span>Profil {isAdminRole ? 'Sekolah' : 'Guru'}</span>
                                </button>
                            )}
                            <button 
                                onClick={handleLogout}
                                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 rounded-lg hover:bg-red-50"
                            >
                                <LogOut size={16} />
                                <span>Keluar</span>
                            </button>
                        </div>
                    </div>
                )}
             </div>

          </div>
        </header>

        {canSelectClass && (
            <div className="lg:hidden bg-white border-b px-4 py-2 flex items-center justify-center shadow-sm relative z-20">
                <span className="text-xs font-bold text-gray-500 uppercase mr-2">Kelas Aktif:</span>
                <select 
                    value={selectedClassId} 
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="bg-[#CAF4FF]/50 border border-[#A0DEFF] rounded px-2 py-1 text-sm font-bold text-[#5AB2FF] outline-none"
                >
                    {availableClasses.map(cls => (
                        <option key={cls} value={cls}>Kelas {cls}</option>
                    ))}
                </select>
            </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 lg:p-8 scroll-smooth print:p-0 relative z-10">
           <div className="max-w-[1440px] mx-auto print:w-full">
             {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between no-print">
                   <span className="text-sm flex items-center"><AlertCircle size={16} className="mr-2" /> {error}</span>
                   <button onClick={() => setError(null)} className="text-red-500 font-bold">&times;</button>
                </div>
             )}
             
             {renderContent()}
           </div>
        </main>
      </div>

      {isPermissionModalOpen && !isStudentRole && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsPermissionModalOpen(false)}>
              <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                  <div className="p-5 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                      <h3 className="font-bold text-lg text-gray-800">Permintaan Ijin / Sakit</h3>
                      <button onClick={() => setIsPermissionModalOpen(false)} className="p-1 hover:bg-gray-200 rounded-full"><X size={20}/></button>
                  </div>
                  <div className="overflow-y-auto p-0">
                      <table className="w-full text-sm text-left">
                          <thead className="bg-blue-50 text-blue-800 text-xs uppercase font-bold sticky top-0">
                              <tr>
                                  <th className="p-4">Siswa</th>
                                  <th className="p-4">Tanggal</th>
                                  <th className="p-4">Alasan</th>
                                  <th className="p-4 text-center">Aksi</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                              {pendingPermissions.length === 0 ? (
                                  <tr><td colSpan={4} className="p-6 text-center text-gray-400">Tidak ada permintaan baru.</td></tr>
                              ) : (
                                  pendingPermissions.map(req => (
                                      <tr key={req.id} className="hover:bg-gray-50">
                                          <td className="p-4">
                                              <span className="font-bold block">{req.studentName}</span>
                                              <span className="text-xs text-gray-500">Kelas {req.classId}</span>
                                          </td>
                                          <td className="p-4 whitespace-nowrap">{new Date(req.date).toLocaleDateString('id-ID')}</td>
                                          <td className="p-4 text-gray-600 italic">{req.reason}</td>
                                          <td className="p-4 flex justify-center gap-2">
                                              <button 
                                                  onClick={() => handleProcessPermission(req.id, 'approve')} 
                                                  disabled={processingPermissionId === req.id}
                                                  className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors"
                                                  title="Terima"
                                              >
                                                  {processingPermissionId === req.id ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle size={16}/>}
                                              </button>
                                              <button 
                                                  onClick={() => handleProcessPermission(req.id, 'reject')}
                                                  disabled={processingPermissionId === req.id}
                                                  className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                                                  title="Tolak"
                                              >
                                                  <XCircle size={16}/>
                                              </button>
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

      <Notification notification={notification} onClear={() => setNotification(null)} />
      
      <CustomModal 
        isOpen={modalConfig.isOpen}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
        onConfirm={modalConfig.onConfirm}
        onCancel={() => setModalConfig(prev => ({...prev, isOpen: false}))}
      />
    </div>
  );
};

export default App;
