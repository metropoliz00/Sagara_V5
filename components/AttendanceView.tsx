
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Student, Holiday, TeacherProfileData, SchoolProfileData } from '../types';
import { apiService } from '../services/apiService';
import { 
  Calendar, Check, X, Save, FileText, Activity, Printer, 
  FileSpreadsheet, Upload, Download, PieChart, Users, 
  CalendarRange, Trash2, Plus, AlertCircle, CheckSquare,
  CalendarClock, ArrowRight, Loader2, CloudDownload,
  AlertTriangle, Filter, Edit, ChevronDown, XCircle, Pencil,
  ChevronLeft, ChevronRight, RefreshCw, Scan, Camera, CheckCircle, Medal,
  RotateCcw
} from 'lucide-react';
import CustomModal from './CustomModal';

interface AttendanceViewProps {
  students: Student[];
  allStudents?: Student[];
  isDemoMode: boolean;
  allAttendanceRecords: any[];
  holidays: Holiday[];
  onRefreshData: () => void;
  onAddHoliday: (holidays: Omit<Holiday, 'id'>[]) => Promise<void>;
  onUpdateHoliday: (holiday: Holiday) => void;
  onDeleteHoliday: (id: string) => void;
  onShowNotification: (message: string, type: 'success' | 'error' | 'warning') => void;
  teacherProfile?: TeacherProfileData;
  schoolProfile?: SchoolProfileData;
  classId: string;
  isReadOnly?: boolean;
  userRole?: string;
}

type AttendanceStatus = 'present' | 'sick' | 'permit' | 'alpha' | 'dispensation';
type ViewMode = 'rekap' | 'daily' | 'range' | 'holiday';

const HOLIDAY_TYPE_LEGEND: { [key: string]: { label: string; color: string; style: { bg: string, text: string } } } = {
    nasional: { label: 'Libur Nasional', color: 'bg-red-500', style: { bg: 'bg-red-50', text: 'text-red-700' } },
    haribesar: { label: 'Libur Hari Besar', color: 'bg-purple-500', style: { bg: 'bg-purple-50', text: 'text-purple-700' } },
    cuti: { label: 'Cuti Bersama', color: 'bg-amber-500', style: { bg: 'bg-amber-50', text: 'text-amber-700' } },
    semester: { label: 'Libur Semester', color: 'bg-blue-500', style: { bg: 'bg-blue-50', text: 'text-blue-700' } },
};
const SUNDAY_STYLE = { bg: 'bg-rose-50', text: 'text-rose-700' };
const STATUS_TEXT: { [key in AttendanceStatus]: string } = {
  present: 'Hadir',
  sick: 'Sakit',
  permit: 'Izin',
  alpha: 'Alpha',
  dispensation: 'Dispensasi'
};


const AttendanceView: React.FC<AttendanceViewProps> = ({ 
  students, allStudents, isDemoMode, allAttendanceRecords, holidays, 
  onRefreshData, onAddHoliday, onUpdateHoliday, onDeleteHoliday, onShowNotification,
  teacherProfile, schoolProfile, classId, isReadOnly = false, userRole
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('rekap');
  const canManageHolidays = userRole === 'admin' && !isReadOnly;
  
  const toLocalISOString = (date: Date): string => {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().split('T')[0];
  };

  const [selectedDate, setSelectedDate] = useState(toLocalISOString(new Date())); 
  const [dailyAttendance, setDailyAttendance] = useState<Record<string, {status: AttendanceStatus, notes: string}>>({});
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rangeStart, setRangeStart] = useState(toLocalISOString(new Date()));
  const [rangeEnd, setRangeEnd] = useState(toLocalISOString(new Date()));
  const [rangeAttendance, setRangeAttendance] = useState<Record<string, {status: AttendanceStatus, notes: string}>>({});
  const [skipHolidays, setSkipHolidays] = useState(true);
  const [savingBatch, setSavingBatch] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const [rekapEditData, setRekapEditData] = useState<{studentId: string, date: string, status: string, notes: string, name: string} | null>(null);
  const [isSavingRekapCell, setIsSavingRekapCell] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // FAB & Scanner State
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<"user" | "environment">("environment");
  const [lastScannedStudent, setLastScannedStudent] = useState<{name: string, time: string} | null>(null);
  const scannerRef = useRef<any>(null);

  // Replaced Modal state with Inline Form state
  const [isSavingHoliday, setIsSavingHoliday] = useState(false);
  const [isHolidayRange, setIsHolidayRange] = useState(false);
  const [holidayEndDate, setHolidayEndDate] = useState(toLocalISOString(new Date()));
  const [holidayForm, setHolidayForm] = useState<Partial<Holiday>>({
      date: toLocalISOString(new Date()),
      description: '',
      type: 'nasional',
      id: '' 
  });
  
  // Custom Modal for Delete Confirmation
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, action: () => void, message: string}>({
      isOpen: false, action: () => {}, message: ''
  });

  // Pagination State
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  const rekapStudents = useMemo(() => {
      // If printing (detected via check or just logic), we might want all students.
      // However, for screen we paginate. 
      // The print logic in CSS hides everything else, but we need to ensure the TABLE inside #print-area renders ALL students if needed.
      // For now, we keep pagination for screen. Users should ideally select "Show All" or 100 before printing for full list.
      const startIndex = (currentPage - 1) * rowsPerPage;
      return students.slice(startIndex, startIndex + rowsPerPage);
  }, [students, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(students.length / rowsPerPage);

  useEffect(() => {
      setCurrentPage(1);
  }, [rowsPerPage, viewMode]);

  const attendanceMap = useMemo(() => {
      const newMap: Record<string, { status: string; notes: string }> = {};
      if (allAttendanceRecords && Array.isArray(allAttendanceRecords)) {
          allAttendanceRecords.forEach((record: any) => {
              if (record.studentId && record.date) {
                  const sId = String(record.studentId).trim();
                  
                  let dateStr = String(record.date).trim();
                  if (dateStr.includes('T')) {
                      dateStr = dateStr.split('T')[0];
                  }
                  
                  const parts = dateStr.split('-');
                  if (parts.length === 3) {
                      const y = parts[0];
                      const m = parts[1].padStart(2, '0');
                      const d = parts[2].padStart(2, '0');
                      dateStr = `${y}-${m}-${d}`;
                  }

                  const key = `${sId}_${dateStr}`;
                  newMap[key] = { status: String(record.status).toLowerCase(), notes: record.notes || '' };
              }
          });
      }
      return newMap;
  }, [allAttendanceRecords]);

  useEffect(() => {
    const records = (allAttendanceRecords as any[]).filter((r: any) => r.date === selectedDate);
    const mappedState: Record<string, {status: AttendanceStatus, notes: string}> = {};
    for (const record of records) {
        const r = record as any;
        if (r.studentId) {
            mappedState[r.studentId] = { 
                status: r.status as AttendanceStatus, 
                notes: r.notes || '' 
            };
        }
    }
    setDailyAttendance(mappedState);
  }, [selectedDate, allAttendanceRecords]);

  const getRealClassId = (sId: string): string => {
      if (classId && classId.toLowerCase() !== 'all') return classId;
      const targetStudent = (allStudents || students).find(s => s.id === sId);
      return targetStudent ? targetStudent.classId : classId;
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    if (isReadOnly) return;
    setDailyAttendance(prev => ({ ...prev, [studentId]: { status, notes: prev[studentId]?.notes || '' } }));
  };

  const handleNotesChange = (studentId: string, notes: string) => {
    if (isReadOnly) return;
    setDailyAttendance(prev => ({ ...prev, [studentId]: { status: prev[studentId]?.status || 'present', notes } }));
  };

  const handleMarkAllPresent = () => {
      if (isReadOnly) return;
      const newAttendance: Record<string, {status: AttendanceStatus, notes: string}> = { ...dailyAttendance };
      students.forEach(s => {
          if (!newAttendance[s.id]) newAttendance[s.id] = { status: 'present', notes: '' };
          else newAttendance[s.id] = { ...newAttendance[s.id], status: 'present' };
      });
      setDailyAttendance(newAttendance);
  };

  const handleResetAttendance = () => {
      if (isReadOnly) return;
      setDailyAttendance({});
      onShowNotification("Tanda kehadiran dikosongkan.", 'warning');
  };

  const handleSaveDaily = async () => {
    if (isReadOnly) return;
    setSaving(true);
    const records = Object.entries(dailyAttendance).map(([id, data]: [string, any]) => ({
      studentId: id,
      classId: getRealClassId(id), 
      status: data.status, 
      notes: data.notes
    }));
    try {
      if(!isDemoMode) await apiService.saveAttendance(selectedDate, records);
      onRefreshData();
      onShowNotification('Absensi Harian berhasil disimpan!', 'success');
    } catch(e) {
      onShowNotification('Gagal menyimpan absensi.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRangeStatusChange = (studentId: string, status: AttendanceStatus) => {
    if (isReadOnly) return;
    setRangeAttendance(prev => ({ ...prev, [studentId]: { status, notes: prev[studentId]?.notes || '' } }));
  };

  const handleRangeMarkAll = (status: AttendanceStatus) => {
      if (isReadOnly) return;
      const newAttendance = students.reduce((acc, s) => {
          acc[s.id] = { status: status, notes: '' };
          return acc;
      }, {} as Record<string, {status: AttendanceStatus, notes: string}>);
      setRangeAttendance(newAttendance);
  };

  const getDaysArray = (start: string, end: string) => {
      for(var arr=[],dt=new Date(start); dt<=new Date(end); dt.setDate(dt.getDate()+1)){
          arr.push(toLocalISOString(new Date(dt)));
      }
      return arr;
  };

  const isHolidayOrSunday = (dateString: string) => {
      const date = new Date(dateString + 'T00:00:00');
      const isSunday = date.getDay() === 0;
      const holiday = holidays.find(h => h.date === dateString);
      return isSunday || !!holiday;
  };

  const handleDownloadTemplate = () => {
    const headers = ["NIS", "Nama", "Tanggal (YYYY-MM-DD)", "Status (Hadir/Sakit/Izin/Alpha/Dispensasi)", "Catatan"];
    const example = [
      students[0]?.nis || "12345",
      students[0]?.name || "Nama Siswa",
      toLocalISOString(new Date()),
      "Hadir",
      "Keterangan opsional"
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet([headers, example]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template Absensi");
    XLSX.writeFile(workbook, "template_absensi_siswa.xlsx");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      setIsUploading(true);
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[];

        // Skip header row
        const rows = data.slice(1);
        const batchMap: Record<string, any[]> = {};

        rows.forEach(row => {
          if (!row[0] || !row[2]) return; // Skip if NIS or Date is missing

          const nis = String(row[0]).trim();
          const student = (allStudents || students).find(s => String(s.nis).trim() === nis);
          
          if (student) {
            let dateStr = String(row[2]).trim();
            // Handle Excel date serial number if necessary
            if (!isNaN(Number(dateStr)) && dateStr.length > 5) {
                const excelDate = new Date((Number(dateStr) - (25567 + 1)) * 86400 * 1000);
                dateStr = toLocalISOString(excelDate);
            }

            const statusInput = String(row[3] || 'Hadir').toLowerCase();
            let status: AttendanceStatus = 'present';
            if (statusInput.includes('sakit')) status = 'sick';
            else if (statusInput.includes('izin')) status = 'permit';
            else if (statusInput.includes('alpha') || statusInput.includes('alfa')) status = 'alpha';
            else if (statusInput.includes('dispensasi') || statusInput.includes('dispen')) status = 'dispensation';

            const notes = String(row[4] || '').trim();

            if (!batchMap[dateStr]) batchMap[dateStr] = [];
            batchMap[dateStr].push({
              studentId: student.id,
              classId: student.classId,
              status,
              notes
            });
          }
        });

        const batchPayload = Object.entries(batchMap).map(([date, records]) => ({ date, records }));
        
        if (batchPayload.length > 0) {
          if (!isDemoMode) await apiService.saveAttendanceBatch(batchPayload);
          onRefreshData();
          onShowNotification(`Berhasil mengunggah absensi untuk ${batchPayload.length} tanggal.`, 'success');
        } else {
          onShowNotification("Tidak ada data valid yang ditemukan.", 'warning');
        }
      } catch (err) {
        console.error(err);
        onShowNotification("Gagal memproses file. Pastikan format benar.", 'error');
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSaveBatch = async () => {
    if (isReadOnly) return;
    if (Object.keys(rangeAttendance).length === 0 || !rangeStart || !rangeEnd) {
      onShowNotification("Silakan isi status absensi dan rentang tanggal.", 'warning');
      return;
    }
    setSavingBatch(true);
    try {
      let dateList = getDaysArray(rangeStart, rangeEnd);
      if (skipHolidays) dateList = dateList.filter(d => !isHolidayOrSunday(d));
      const recordsToSave = Object.entries(rangeAttendance).map(([studentId, data]: [string, any]) => ({
        studentId, 
        classId: getRealClassId(studentId), 
        status: data.status, 
        notes: data.notes
      }));
      const batchPayload = dateList.map(date => ({ date, records: recordsToSave }));
      if (!isDemoMode) await apiService.saveAttendanceBatch(batchPayload);
      onRefreshData();
      onShowNotification(`Berhasil menyimpan absensi untuk ${dateList.length} hari.`, 'success');
      setRangeAttendance({});
    } catch (e) {
      onShowNotification("Gagal menyimpan data rentang waktu.", 'error');
    } finally {
      setSavingBatch(false);
    }
  };

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  
  const getDateKeyForDay = useCallback((day: number) => 
      `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  [selectedYear, selectedMonth]);

  const getHolidayForDay = useCallback((day: number) => {
      const dateString = getDateKeyForDay(day);
      const date = new Date(dateString + 'T00:00:00');
      const isSunday = date.getDay() === 0;
      const holiday = holidays.find(h => h.date === dateString);
      if (isSunday && !holiday) return { isRed: true, holidayDesc: 'Minggu' };
      if (holiday) return { isRed: true, holidayDesc: holiday.description, type: holiday.type };
      return { isRed: false };
  }, [getDateKeyForDay, holidays]);

  const getAttendanceForDay = (studentId: string, day: number) => {
      const key = `${String(studentId).trim()}_${getDateKeyForDay(day)}`;
      return attendanceMap[key];
  };

  // --- REKAP STATS CALCULATION ---
  const effectiveDaysCount = useMemo(() => {
      let count = 0;
      daysArray.forEach(d => {
          const { isRed } = getHolidayForDay(d);
          if (!isRed) count++;
      });
      return count;
  }, [daysArray, getHolidayForDay]);

  const rekapStats = useMemo(() => {
      let sakit = 0, izin = 0, alpha = 0;
      const studentCount = students.length;
      
      students.forEach(s => {
          daysArray.forEach(d => {
              const { isRed } = getHolidayForDay(d);
              if (!isRed) {
                  const dateStr = getDateKeyForDay(d);
                  const key = `${String(s.id).trim()}_${dateStr}`;
                  const record = attendanceMap[key];
                  if (record) {
                      const status = String(record.status).toLowerCase();
                      if (status === 'sick') sakit++;
                      else if (status === 'permit') izin++;
                      else if (status === 'alpha') alpha++;
                  }
              }
          });
      });

      const totalEffectiveStudentDays = studentCount * effectiveDaysCount;
      const getPct = (val: number) => totalEffectiveStudentDays === 0 ? 0 : (val / totalEffectiveStudentDays) * 100;

      return {
          sakit: getPct(sakit),
          izin: getPct(izin),
          alpha: getPct(alpha)
      };
  }, [students, daysArray, effectiveDaysCount, attendanceMap, getHolidayForDay, getDateKeyForDay]);

  // NEW: Filter holidays for the selected month for print display
  const currentMonthHolidays = useMemo(() => {
      return holidays.filter(h => {
          if (!h.date) return false;
          const [yStr, mStr] = h.date.split('-');
          return Number(yStr) === selectedYear && Number(mStr) === selectedMonth;
      }).sort((a, b) => a.date.localeCompare(b.date));
  }, [holidays, selectedMonth, selectedYear]);


  const handleRecapCellClick = (student: Student, date: string, currentStatus?: string, currentNotes?: string) => {
      if (isReadOnly) return;
      setRekapEditData({
          studentId: student.id,
          name: student.name,
          date: date,
          status: currentStatus || '',
          notes: currentNotes || ''
      });
  };

  const handleSaveRecapEdit = async (newStatus: string | null) => {
      if (!rekapEditData || isReadOnly) return;
      setIsSavingRekapCell(true);
      try {
          const targetDate = rekapEditData.date;
          const existingRecordsForDate = allAttendanceRecords.filter(r => r.date === targetDate);
          const recordsMap: Record<string, any> = {};
          existingRecordsForDate.forEach(r => {
              recordsMap[r.studentId] = { status: r.status, notes: r.notes || '' };
          });
          if (newStatus) {
              recordsMap[rekapEditData.studentId] = { status: newStatus, notes: rekapEditData.notes };
          } else {
              delete recordsMap[rekapEditData.studentId];
          }
          const payloadRecords = Object.entries(recordsMap).map(([sid, val]: [string, any]) => ({
              studentId: sid, 
              classId: getRealClassId(sid), 
              status: val.status, 
              notes: val.notes
          }));
          if (!isDemoMode) await apiService.saveAttendance(targetDate, payloadRecords);
          onRefreshData();
          onShowNotification('Data absensi diperbarui.', 'success');
          setRekapEditData(null);
      } catch (e) {
          onShowNotification('Gagal update data.', 'error');
      } finally {
          setIsSavingRekapCell(false);
      }
  };

  const resetHolidayForm = () => {
      setHolidayForm({
          date: toLocalISOString(new Date()),
          description: '',
          type: 'nasional',
          id: ''
      });
      setIsHolidayRange(false);
      setHolidayEndDate(toLocalISOString(new Date()));
  };

  const handleEditHolidayClick = (holiday: Holiday) => {
      setHolidayForm({ ...holiday });
      setIsHolidayRange(false); // Disable range when editing
  };
  
  const handleSaveHolidayInline = async () => {
    if (!canManageHolidays) return;
    if (!holidayForm.date || !holidayForm.description) {
      onShowNotification("Mohon lengkapi tanggal dan keterangan.", 'warning');
      return;
    }

    // Validate range if enabled
    if (!holidayForm.id && isHolidayRange && holidayEndDate < holidayForm.date!) {
         onShowNotification("Tanggal akhir tidak boleh sebelum tanggal awal.", 'warning');
         return;
    }

    setIsSavingHoliday(true);
    try {
      if (!holidayForm.id) {
        if (isHolidayRange) {
            const dateList = getDaysArray(holidayForm.date!, holidayEndDate);
            const batchHolidays = dateList.map(d => ({
                classId: "__SCHOOL_WIDE__",
                date: d,
                description: holidayForm.description!,
                type: holidayForm.type as Holiday['type']
            }));
            await onAddHoliday(batchHolidays);
        } else {
            await onAddHoliday([{ classId: "__SCHOOL_WIDE__", date: holidayForm.date!, description: holidayForm.description!, type: holidayForm.type as Holiday['type'] }]);
        }
      } else {
        await onUpdateHoliday({ ...holidayForm, classId: "__SCHOOL_WIDE__" } as Holiday);
      }
      resetHolidayForm();
    } catch (e) { console.error(e); } finally { setIsSavingHoliday(false); }
  };

  const handleDeleteHolidayClick = (id: string) => {
     if (!canManageHolidays) return;
     setConfirmModal({
         isOpen: true,
         message: "Hapus hari libur ini?",
         action: () => {
             onDeleteHoliday(id);
             setConfirmModal(prev => ({...prev, isOpen: false}));
         }
     });
  };

  const getHolidayColorStyle = (type?: string) => { return (type && HOLIDAY_TYPE_LEGEND[type]?.style) || SUNDAY_STYLE; };
  const getHolidayPillColor = (type: string) => { return HOLIDAY_TYPE_LEGEND[type]?.color || 'bg-gray-500'; };
  
  // Date helpers for footer
  const getLastDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 0).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  };
  
  const tanggalAkhirBulan = getLastDayOfMonth(selectedYear, selectedMonth);
  const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('id-ID', { month: 'long' });

  // UPDATED PRINT FUNCTION
  const handlePrint = () => {
    const printContent = document.getElementById('print-area');
    if (printContent) {
      const printWindow = window.open('', '', 'width=1000,height=800');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Cetak Rekap Absensi</title>
              <script src="https://cdn.tailwindcss.com"></script>
              <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
                
                body {
                  font-family: 'Inter', sans-serif;
                  background-color: white;
                  margin: 0;
                  padding: 20px;
                }

                @media print {
                  @page {
                    size: A4 landscape;
                    margin: 1cm;
                  }
                  body {
                    margin: 0;
                    padding: 0;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                  }
                  
                  /* Force visibility of print-specific elements */
                  .print-header { display: block !important; }
                  .print-footer { display: block !important; }
                  .hidden { display: block !important; }
                  
                  /* Hide elements marked as no-print */
                  .no-print { display: none !important; }
                  
                  table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 10px;
                  }
                  
                  th, td {
                    border: 1px solid #000;
                    padding: 4px;
                    text-align: center;
                  }
                  
                  /* Adjust header colors for print */
                  thead th {
                    background-color: #f3f4f6 !important;
                    color: #000 !important;
                  }
                }

                /* Screen styles for the popup window */
                .print-header { text-align: center; margin-bottom: 20px; }
                .print-footer { margin-top: 30px; padding: 0 40px; font-size: 14px; }
                
                table { width: 100%; border-collapse: collapse; font-size: 12px; }
                th, td { border: 1px solid #e5e7eb; padding: 4px; text-align: center; }
                .hidden { display: block; } /* Show hidden elements in the new window */
                .no-print { display: none; }
              </style>
            </head>
            <body>
              ${printContent.innerHTML}
              <script>
                // Auto print when loaded
                setTimeout(() => {
                  window.print();
                  window.close();
                }, 1500); 
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  };

  // --- BARCODE SCANNER LOGIC ---
  const handleScanSuccess = async (decodedText: string, decodedResult: any) => {
      if (scannerRef.current?.isPaused) return;
      if (scannerRef.current) {
          scannerRef.current.isPaused = true;
      }

      const cleanCode = String(decodedText).trim();
      const searchScope = (allStudents && allStudents.length > 0) ? allStudents : students;
      const student = searchScope.find(s => String(s.id).trim() === cleanCode || String(s.nis).trim() === cleanCode);
      
      if (student) {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          oscillator.start();
          setTimeout(() => oscillator.stop(), 200);

          setLastScannedStudent({ name: student.name, time: new Date().toLocaleTimeString() });
          
          try {
              const today = toLocalISOString(new Date());
              const targetClassId = student.classId || getRealClassId(student.id);
              const payload = [{ studentId: student.id, classId: targetClassId, status: 'present', notes: 'Via Scan' }];

              if (!isDemoMode) {
                  await apiService.saveAttendance(today, payload as any);
                  onRefreshData(); 
                  onShowNotification(`Absensi ${student.name} (${targetClassId}) berhasil dicatat.`, 'success');
              } else {
                  onShowNotification(`(Demo) ${student.name} Hadir`, 'success');
              }
          } catch (e) {
              onShowNotification("Gagal menyimpan presensi scan.", 'error');
          }
      } else {
          onShowNotification(`Siswa tidak ditemukan. Kode: ${cleanCode}`, 'warning');
      }

      setTimeout(() => {
          if (scannerRef.current) scannerRef.current.isPaused = false;
      }, 2000);
  };

  const handleScanSuccessRef = useRef(handleScanSuccess);
  useEffect(() => { handleScanSuccessRef.current = handleScanSuccess; }, [handleScanSuccess]);

  useEffect(() => {
      let isMounted = true;
      if (isScannerOpen) {
          const timer = setTimeout(() => {
              if (!isMounted) return;
              if (scannerRef.current?.scanner) {
                  scannerRef.current.scanner.stop().catch(() => {}).then(() => {
                      if (scannerRef.current?.scanner) scannerRef.current.scanner.clear().catch(() => {});
                      scannerRef.current = null;
                  });
              }
              const html5QrCode = new (window as any).Html5Qrcode("reader");
              // Use wider aspect ratio or larger box for full frame feel
              const config = { fps: 10, qrbox: { width: 300, height: 300 } };
              
              html5QrCode.start(
                  { facingMode: cameraFacingMode }, 
                  config,
                  (decodedText: string, decodedResult: any) => {
                      if (handleScanSuccessRef.current) handleScanSuccessRef.current(decodedText, decodedResult);
                  },
                  (errorMessage: any) => {}
              ).then(() => {
                  if (isMounted) scannerRef.current = { scanner: html5QrCode, isPaused: false };
                  else html5QrCode.stop().then(() => html5QrCode.clear()).catch((err: any) => console.log("Stop failed", err));
              }).catch((err: any) => {
                  if (isMounted) {
                      if (typeof err === 'string' && err.includes("already under transition")) return;
                      onShowNotification("Gagal membuka kamera. Pastikan izin diberikan.", "error");
                      setIsScannerOpen(false);
                  }
              });
          }, 300);

          return () => {
              isMounted = false;
              clearTimeout(timer);
              if (scannerRef.current?.scanner) {
                  const scannerToStop = scannerRef.current.scanner;
                  scannerRef.current = null;
                  scannerToStop.stop().then(() => scannerToStop.clear()).catch((err: any) => console.log("Failed to stop scanner", err));
              }
          };
      }
  }, [isScannerOpen, cameraFacingMode]);

  return (
    <div className="space-y-6 animate-fade-in page-landscape relative">
       
       <CustomModal 
        isOpen={confirmModal.isOpen}
        type="confirm"
        message={confirmModal.message}
        onConfirm={confirmModal.action}
        onCancel={() => setConfirmModal(prev => ({...prev, isOpen: false}))}
      />

       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
          <div>
              <h2 className="text-2xl font-bold text-gray-800">Manajemen Absensi</h2>
              <p className="text-gray-500">
                  {isReadOnly ? 'Pantau kehadiran Anda.' : 'Kelola kehadiran harian, input rentang, rekap bulanan, dan hari libur.'}
              </p>
          </div>
          <div className="flex bg-white p-1 rounded-xl border border-[#CAF4FF] shadow-sm overflow-x-auto">
             <button onClick={() => setViewMode('rekap')} className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${viewMode === 'rekap' ? 'bg-[#5AB2FF] text-white shadow-md' : 'text-gray-600 hover:bg-[#FFF9D0]'}`}><FileSpreadsheet size={16} className="mr-2" /> Rekap Bulanan</button>
             {!isReadOnly && <button onClick={() => setViewMode('daily')} className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${viewMode === 'daily' ? 'bg-[#5AB2FF] text-white shadow-md' : 'text-gray-600 hover:bg-[#FFF9D0]'}`}><Calendar size={16} className="mr-2" /> Input Harian</button>}
             {!isReadOnly && <button onClick={() => setViewMode('range')} className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${viewMode === 'range' ? 'bg-[#5AB2FF] text-white shadow-md' : 'text-gray-600 hover:bg-[#FFF9D0]'}`}><CalendarClock size={16} className="mr-2" /> Input Rentang</button>}
             {!isReadOnly && <button onClick={() => setViewMode('holiday')} className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${viewMode === 'holiday' ? 'bg-[#5AB2FF] text-white shadow-md' : 'text-gray-600 hover:bg-[#FFF9D0]'}`}><CalendarRange size={16} className="mr-2" /> Setelan Libur</button>}
          </div>
       </div>

       {viewMode === 'rekap' && (
           <>
             <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm no-print">
                 <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                     <div className="flex items-center gap-4">
                        <select value={selectedMonth} onChange={e=>setSelectedMonth(Number(e.target.value))} className="bg-[#FFF9D0]/50 border border-amber-100 rounded-lg p-2 font-semibold text-gray-700">
                            {['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'].map((m,i) => (<option key={i} value={i+1}>{m}</option>))}
                        </select>
                        <select value={selectedYear} onChange={e=>setSelectedYear(Number(e.target.value))} className="bg-[#FFF9D0]/50 border border-amber-100 rounded-lg p-2 font-semibold text-gray-700">
                            {[2024, 2025, 2026, 2027].map(y => (<option key={y} value={y}>{y}</option>))}
                        </select>
                     </div>
                     <div className="flex items-center gap-2">
                        {!isReadOnly && (
                            <>
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx, .xls, .csv" />
                                <button 
                                    onClick={() => fileInputRef.current?.click()} 
                                    disabled={isUploading}
                                    className="flex items-center space-x-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg shadow-sm hover:bg-gray-50 disabled:opacity-50"
                                >
                                    {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                    <span>{isUploading ? 'Mengunggah...' : 'Upload CSV'}</span>
                                </button>
                                <button 
                                    onClick={handleDownloadTemplate} 
                                    className="flex items-center space-x-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg shadow-sm hover:bg-gray-50"
                                >
                                    <Download size={16} />
                                    <span>Template</span>
                                </button>
                            </>
                        )}
                        <button onClick={handlePrint} className="flex items-center space-x-2 bg-[#5AB2FF] text-white px-4 py-2 rounded-lg shadow-md hover:bg-[#A0DEFF]"><Printer size={16} /> <span>Cetak</span></button>
                     </div>
                 </div>
             </div>
             
             {/* Print Area Wrapper */}
             <div id="print-area">
                
                {/* Print Header */}
                <div className="print-header hidden print:block mb-8 text-center font-serif text-black">
                    <h2 className="text-2xl font-bold uppercase mb-1">REKAP ABSENSI</h2>
                    <p className="text-lg">Kelas {classId}</p>
                    <p className="text-lg">Bulan {monthName} {selectedYear}</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border overflow-visible print-container">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left border-collapse">
                            <thead className="bg-[#CAF4FF]/50 font-bold uppercase text-[10px]">
                                <tr>
                                    <th className="p-2 border sticky left-0 bg-[#CAF4FF]/50 z-10 w-48">Nama Siswa</th>
                                    {daysArray.map(d => {
                                        const {isRed, type} = getHolidayForDay(d);
                                        const {bg, text} = getHolidayColorStyle(type);
                                        return <th key={d} className={`p-1 border text-center w-8 ${isRed ? `${bg} ${text}` : ''}`}>{d}</th>;
                                    })}
                                    <th className="p-1 border text-center w-8 bg-emerald-100">H</th>
                                    <th className="p-1 border text-center w-8 bg-amber-100">S</th>
                                    <th className="p-1 border text-center w-8 bg-blue-100">I</th>
                                    <th className="p-1 border text-center w-8 bg-rose-200">A</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rekapStudents.map(s => {
                                    let h=0, sk=0, i=0, a=0;
                                    for (const d of daysArray) {
                                        const {isRed} = getHolidayForDay(d);
                                        const record = getAttendanceForDay(s.id, d);
                                        const status = record?.status;
                                        if(!isRed) {
                                            if(status === 'present' || status === 'dispensation') h++;
                                        }
                                        if(status === 'sick') sk++;
                                        if(status === 'permit') i++;
                                        if(status === 'alpha') a++;
                                    }

                                    return (
                                        <tr key={s.id} className="hover:bg-gray-50 group">
                                            <td className="p-2 border font-medium sticky left-0 bg-white z-10 whitespace-nowrap group-hover:bg-gray-50">{s.name}</td>
                                            {daysArray.map(d => {
                                                const dateStr = getDateKeyForDay(d);
                                                const {isRed, holidayDesc, type} = getHolidayForDay(d);
                                                const attendanceRecord = getAttendanceForDay(s.id, d);
                                                const status = attendanceRecord?.status;
                                                const notes = attendanceRecord?.notes;
                                                const hasNote = notes && notes.trim() !== '';
                                                const {bg} = getHolidayColorStyle(type);

                                                // Determine holiday code
                                                let holidayCode = '-';
                                                if (isRed) {
                                                    if (holidayDesc === 'Minggu') holidayCode = 'LU';
                                                    else if (type === 'cuti') holidayCode = 'CB';
                                                    else if (type === 'semester') holidayCode = 'LS';
                                                    else holidayCode = 'LHB';
                                                }

                                                return (
                                                    <td 
                                                        key={d} 
                                                        className={`p-1 border text-center ${!isReadOnly ? 'cursor-pointer hover:bg-gray-200' : ''} transition-colors ${isRed ? bg : ''}`} 
                                                        title={holidayDesc || (status ? `${STATUS_TEXT[status as AttendanceStatus]}${hasNote ? `: ${notes}` : ''}` : '')}
                                                        onClick={() => !isRed && !isReadOnly && handleRecapCellClick(s, dateStr, status, notes)}
                                                    >
                                                        {isRed ? <span className="text-[9px] font-bold text-gray-500/80">{holidayCode}</span> : 
                                                        (status === 'present' ? <span className="text-emerald-600 font-bold">H{hasNote && <sup className="text-rose-500 font-bold">*</sup>}</span> :
                                                        status === 'sick' ? <span className="text-amber-600 font-bold">S{hasNote && <sup className="text-rose-500 font-bold">*</sup>}</span> :
                                                        status === 'permit' ? <span className="text-blue-600 font-bold">I{hasNote && <sup className="text-rose-500 font-bold">*</sup>}</span> :
                                                        status === 'alpha' ? <span className="text-rose-600 font-bold">A{hasNote && <sup className="text-rose-500 font-bold">*</sup>}</span> : 
                                                        status === 'dispensation' ? <span className="text-emerald-600 font-bold">D{hasNote && <sup className="text-rose-500 font-bold">*</sup>}</span> :
                                                        <span className="opacity-0 group-hover:opacity-30 text-gray-400">.</span>)}
                                                    </td>
                                                );
                                            })}
                                            <td className="p-1 border text-center font-bold bg-emerald-50">{h}</td>
                                            <td className="p-1 border text-center font-bold bg-amber-50">{sk}</td>
                                            <td className="p-1 border text-center font-bold bg-blue-50">{i}</td>
                                            <td className="p-1 border text-center font-bold bg-rose-50">{a}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Recap Summary Section - SCREEN ONLY (keep no-print) */}
                    <div className="mt-8 flex flex-col sm:flex-row justify-end gap-4 break-inside-avoid px-4 pb-6 border-t pt-4 no-print">
                        {/* Hari Efektif Table */}
                        <div className="border border-gray-300 rounded-lg overflow-hidden text-sm w-full sm:w-auto">
                            <div className="bg-gray-100 p-2 font-bold text-center border-b border-gray-300">Hari Efektif</div>
                            <div className="p-4 text-center font-bold text-xl bg-white text-gray-800">
                                {effectiveDaysCount} <span className="text-xs font-normal text-gray-500">Hari</span>
                            </div>
                        </div>

                        {/* Absensi Table */}
                        <div className="border border-gray-300 rounded-lg overflow-hidden text-sm w-full sm:w-64">
                            <div className="bg-gray-100 p-2 font-bold text-left border-b border-gray-300 px-4">Absensi</div>
                            <div className="bg-white">
                                <div className="flex justify-between px-4 py-2 border-b border-gray-100">
                                    <span className="text-gray-600">Izin</span>
                                    <span className="font-bold text-blue-600">{rekapStats.izin.toFixed(1).replace('.', ',')}%</span>
                                </div>
                                <div className="flex justify-between px-4 py-2 border-b border-gray-100">
                                    <span className="text-gray-600">Sakit</span>
                                    <span className="font-bold text-amber-600">{rekapStats.sakit.toFixed(1).replace('.', ',')}%</span>
                                </div>
                                <div className="flex justify-between px-4 py-2">
                                    <span className="text-gray-600">Alpha</span>
                                    <span className="font-bold text-rose-600">{rekapStats.alpha.toFixed(1).replace('.', ',')}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* PRINT FOOTER */}
                <div className="print-footer hidden print:block mt-10 text-black font-serif text-sm px-10">

                  <div className="flex justify-between items-start">

                    {/* ===== KIRI : HARI EFEKTIF & ABSENSI ===== */}
                    <div className="w-[30%]">
                      <p className="mb-2 font-bold">Hari Efektif : {effectiveDaysCount} Hari</p>

                      <p className="font-bold text-xs mb-1">Absensi</p>
                      <table className="w-full border-collapse border border-black text-xs">
                        <tbody>
                          <tr>
                            <td className="border border-black px-2 py-1 font-bold bg-blue-100 print:bg-blue-100">Izin</td>
                            <td className="border border-black text-center px-2">{rekapStats.izin.toFixed(1).replace('.', ',')}%</td>
                          </tr>
                          <tr>
                            <td className="border border-black px-2 py-1 font-bold bg-amber-100 print:bg-amber-100">Sakit</td>
                            <td className="border border-black text-center px-2">{rekapStats.sakit.toFixed(1).replace('.', ',')}%</td>
                          </tr>
                          <tr>
                            <td className="border border-black px-2 py-1 font-bold bg-rose-100 print:bg-rose-100">Alpha</td>
                            <td className="border border-black text-center px-2">{rekapStats.alpha.toFixed(1).replace('.', ',')}%</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>


                    {/* ===== TENGAH : KEPALA SEKOLAH ===== */}
                    <div className="w-[35%] text-center">
                      <p>Mengetahui</p>
                      <p>Kepala {schoolProfile?.name || 'Sekolah'}</p>

                      <div className="h-20 flex items-end justify-center">
                         {schoolProfile?.headmasterSignature && <img src={schoolProfile.headmasterSignature} alt="TTD" className="h-full object-contain"/>}
                      </div>

                      <p className="font-bold underline">{schoolProfile?.headmaster || '.........................'}</p>
                      <p>NIP. {schoolProfile?.headmasterNip || '.........................'}</p>
                    </div>


                    {/* ===== KANAN : WALI KELAS ===== */}
                    <div className="w-[30%] text-center">
                      <p>Remen, {tanggalAkhirBulan}</p>
                      <p>Wali Kelas {classId}</p>

                      <div className="h-20 flex items-end justify-center">
                         {teacherProfile?.signature && <img src={teacherProfile.signature} alt="TTD" className="h-full object-contain"/>}
                      </div>

                      <p className="font-bold underline">{teacherProfile?.name || '.........................'}</p>
                      <p>NIP. {teacherProfile?.nip || '.........................'}</p>
                    </div>

                  </div>
                </div>
             </div>

             <div className="flex flex-col md:flex-row justify-between items-center mt-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200 no-print">
                <div className="font-medium">
                    Menampilkan <span className="font-bold text-[#5AB2FF]">{(currentPage - 1) * rowsPerPage + 1}</span> - <span className="font-bold text-[#5AB2FF]">{Math.min(currentPage * rowsPerPage, students.length)}</span> dari <span className="font-bold">{students.length}</span> siswa
                </div>
                
                <div className="flex items-center gap-4 mt-2 md:mt-0">
                    <div className="flex items-center gap-2">
                        <span>Tampilkan:</span>
                        <select 
                            value={rowsPerPage} 
                            onChange={(e) => setRowsPerPage(Number(e.target.value))}
                            className="border rounded p-1 font-bold text-gray-700 outline-none focus:ring-1 focus:ring-[#5AB2FF]"
                        >
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                            <option value={200}>200</option>
                        </select>
                    </div>
                    
                    <div className="flex items-center gap-1">
                        <button 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-1.5 border rounded-md hover:bg-white bg-white shadow-sm disabled:opacity-50 disabled:shadow-none transition-all"
                        >
                            <ChevronLeft size={16}/>
                        </button>
                        <span className="mx-2 font-medium">Hal {currentPage} / {totalPages}</span>
                        <button 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-1.5 border rounded-md hover:bg-white bg-white shadow-sm disabled:opacity-50 disabled:shadow-none transition-all"
                        >
                            <ChevronRight size={16}/>
                        </button>
                    </div>
                </div>
            </div>
           </>
       )}

       {viewMode === 'daily' && !isReadOnly && (
          <div className="space-y-4">
             <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-[#CAF4FF]">
                 <label className="font-bold">Tanggal:</label>
                 <input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} className="border p-2 rounded-lg"/>
                 <div className="flex items-center gap-2">
                     <button onClick={handleMarkAllPresent} className="bg-emerald-100 text-emerald-700 px-3 py-2 rounded-lg font-bold text-sm hover:bg-emerald-200 transition-colors"><CheckSquare size={16} className="inline mr-1"/> Isi Hadir</button>
                     <button onClick={handleResetAttendance} className="bg-rose-100 text-rose-700 px-3 py-2 rounded-lg font-bold text-sm hover:bg-rose-200 transition-colors"><RotateCcw size={16} className="inline mr-1"/> Reset</button>
                 </div>
                 <button onClick={handleSaveDaily} disabled={saving} className="bg-gradient-to-r from-[#5AB2FF] to-[#A0DEFF] text-white px-6 py-2 rounded-lg font-bold disabled:opacity-50 shadow-md"><Save size={18} className="inline mr-2"/> {saving ? 'Menyimpan...' : 'Simpan'}</button>
             </div>
             <div className="bg-white rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                    <thead><tr className="bg-[#FFF9D0]"><th className="p-4">Nama Siswa</th><th className="p-4 text-center">H</th><th className="p-4 text-center">D</th><th className="p-4 text-center">S</th><th className="p-4 text-center">I</th><th className="p-4 text-center">A</th><th className="p-4">Catatan</th></tr></thead>
                    <tbody>
                        {students.map(s => (
                            <tr key={s.id} className="border-t">
                                <td className="p-4 font-medium">{s.name}</td>
                                {['present','dispensation','sick','permit','alpha'].map(type => (
                                    <td key={type} className="p-2 text-center">
                                        <button onClick={()=>handleStatusChange(s.id, type as AttendanceStatus)} className={`p-2 rounded-lg ${dailyAttendance[s.id]?.status === type ? 'bg-[#5AB2FF] text-white' : 'bg-gray-100'}`} title={type === 'dispensation' ? 'Dispensasi' : type}>
                                            {type==='present'?<Check/>:type==='dispensation'?<Medal/>:type==='sick'?<Activity/>:type==='permit'?<FileText/>:<X/>}
                                        </button>
                                    </td>
                                ))}
                                <td className="p-4"><input value={dailyAttendance[s.id]?.notes || ''} onChange={e=>handleNotesChange(s.id, e.target.value)} className="w-full border-b outline-none" placeholder="Ket..."/></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
          </div>
       )}

       {viewMode === 'range' && !isReadOnly && (
          <div className="space-y-6">
             <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                    <CalendarRange className="mr-2 text-[#5AB2FF]" size={20} /> Tentukan Rentang Waktu
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-600">Dari Tanggal</label>
                        <div className="relative">
                            <input 
                                type="date" 
                                value={rangeStart} 
                                onChange={e=>setRangeStart(e.target.value)} 
                                className="w-full border border-gray-300 p-3 pl-4 rounded-xl focus:ring-2 focus:ring-[#5AB2FF] outline-none transition-all shadow-sm bg-gray-50 focus:bg-white text-gray-700 font-medium"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-600">Sampai Tanggal</label>
                        <div className="relative">
                            <input 
                                type="date" 
                                value={rangeEnd} 
                                onChange={e=>setRangeEnd(e.target.value)} 
                                className="w-full border border-gray-300 p-3 pl-4 rounded-xl focus:ring-2 focus:ring-[#5AB2FF] outline-none transition-all shadow-sm bg-gray-50 focus:bg-white text-gray-700 font-medium"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center bg-[#FFF9D0]/50 p-4 rounded-xl border border-amber-100 gap-4">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                        <div className="relative">
                            <input type="checkbox" checked={skipHolidays} onChange={e=>setSkipHolidays(e.target.checked)} className="sr-only peer"/>
                            <div className="w-10 h-6 bg-gray-300 rounded-full peer-checked:bg-[#5AB2FF] transition-colors"></div>
                            <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4"></div>
                        </div>
                        <span className="text-sm font-medium text-gray-700">Lewati Hari Libur & Minggu</span>
                    </label>
                    <button onClick={handleSaveBatch} disabled={savingBatch} className="flex items-center bg-gradient-to-r from-[#5AB2FF] to-[#A0DEFF] text-white px-6 py-2.5 rounded-xl font-bold shadow-lg transition-transform active:scale-95 w-full md:w-auto justify-center">
                        {savingBatch ? <Loader2 className="animate-spin mr-2" size={18}/> : <Save className="mr-2" size={18}/>}
                        Simpan Rentang
                    </button>
                </div>
             </div>

             <div className="flex flex-wrap items-center gap-2 p-3 bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                  <span className="text-xs font-bold uppercase text-gray-500 mr-2 shrink-0">Set Massal:</span>
                  <button onClick={() => handleRangeMarkAll('present')} className="px-4 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg hover:bg-emerald-200 transition-colors">Hadir Semua</button>
                  <button onClick={() => handleRangeMarkAll('dispensation')} className="px-4 py-1.5 bg-teal-100 text-teal-700 text-xs font-bold rounded-lg hover:bg-teal-200 transition-colors">Dispensasi Semua</button>
                  <button onClick={() => handleRangeMarkAll('sick')} className="px-4 py-1.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-lg hover:bg-amber-200 transition-colors">Sakit Semua</button>
                  <button onClick={() => handleRangeMarkAll('permit')} className="px-4 py-1.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-200 transition-colors">Izin Semua</button>
                  <button onClick={() => handleRangeMarkAll('alpha')} className="px-4 py-1.5 bg-rose-100 text-rose-700 text-xs font-bold rounded-lg hover:bg-rose-200 transition-colors">Alpha Semua</button>
             </div>

             <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                 <table className="w-full text-sm">
                     <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-bold">
                         <tr>
                             <th className="p-4 text-left">Nama Siswa</th>
                             <th className="p-4 text-left">Status untuk Rentang Ini</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                         {students.map(s => (
                             <tr key={s.id} className="hover:bg-[#CAF4FF]/30 transition-colors">
                                 <td className="p-4 font-medium text-gray-800">{s.name}</td>
                                 <td className="p-4">
                                     <div className="relative">
                                         <select 
                                            value={rangeAttendance[s.id]?.status || ''} 
                                            onChange={e => handleRangeStatusChange(s.id, e.target.value as AttendanceStatus)} 
                                            className={`w-full p-2.5 rounded-lg border appearance-none outline-none font-medium cursor-pointer transition-colors ${
                                                !rangeAttendance[s.id]?.status ? 'border-gray-300 text-gray-500' :
                                                rangeAttendance[s.id]?.status === 'present' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                                                rangeAttendance[s.id]?.status === 'dispensation' ? 'border-teal-200 bg-teal-50 text-teal-700' :
                                                rangeAttendance[s.id]?.status === 'sick' ? 'border-amber-200 bg-amber-50 text-amber-700' :
                                                rangeAttendance[s.id]?.status === 'permit' ? 'border-blue-200 bg-blue-50 text-blue-700' :
                                                'border-rose-200 bg-rose-50 text-rose-700'
                                            }`}
                                         >
                                             <option value="">-- Pilih Status --</option>
                                             <option value="present">Hadir</option>
                                             <option value="dispensation">Dispensasi</option>
                                             <option value="sick">Sakit</option>
                                             <option value="permit">Izin</option>
                                             <option value="alpha">Alpha</option>
                                         </select>
                                         <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                                             <ChevronDown size={16} />
                                         </div>
                                     </div>
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
          </div>
       )}

       {viewMode === 'holiday' && !isReadOnly && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-6">
                  {canManageHolidays && (
                      <div className="bg-white p-6 rounded-xl border border-gray-200 h-fit shadow-sm sticky top-6">
                          <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                              {holidayForm.id ? <Edit size={18} className="mr-2 text-[#5AB2FF]"/> : <Plus size={18} className="mr-2 text-[#5AB2FF]"/>}
                              {holidayForm.id ? 'Edit Data Libur' : 'Tambah Hari Libur'}
                          </h3>
                          
                          <div className="space-y-4">
                              {!holidayForm.id && (
                                  <label className="flex items-center gap-2 cursor-pointer mb-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                                    <div className="relative">
                                        <input type="checkbox" checked={isHolidayRange} onChange={e=>setIsHolidayRange(e.target.checked)} className="sr-only peer"/>
                                        <div className="w-9 h-5 bg-gray-300 rounded-full peer-checked:bg-[#5AB2FF] transition-colors"></div>
                                        <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform peer-checked:translate-x-4"></div>
                                    </div>
                                    <span className="text-xs font-bold text-gray-600">Input Rentang Tanggal</span>
                                  </label>
                              )}

                              <div>
                                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{isHolidayRange ? 'Dari Tanggal' : 'Tanggal'}</label>
                                  <input 
                                    type="date" 
                                    value={holidayForm.date} 
                                    onChange={(e) => setHolidayForm({...holidayForm, date: e.target.value})}
                                    className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                  />
                              </div>

                              {isHolidayRange && (
                                  <div className="animate-fade-in-up">
                                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sampai Tanggal</label>
                                      <input 
                                        type="date" 
                                        value={holidayEndDate} 
                                        onChange={(e) => setHolidayEndDate(e.target.value)}
                                        className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                      />
                                  </div>
                              )}
                              
                              <div>
                                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Keterangan</label>
                                  <input 
                                    type="text" 
                                    value={holidayForm.description} 
                                    onChange={(e) => setHolidayForm({...holidayForm, description: e.target.value})}
                                    placeholder="Contoh: HUT RI ke-79"
                                    className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                  />
                              </div>

                              <div>
                                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipe Libur</label>
                                  <select 
                                    value={holidayForm.type} 
                                    onChange={(e) => setHolidayForm({...holidayForm, type: e.target.value as Holiday['type']})}
                                    className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                  >
                                      {Object.entries(HOLIDAY_TYPE_LEGEND).map(([key, val]) => (
                                          <option key={key} value={key}>{val.label}</option>
                                      ))}
                                  </select>
                              </div>

                              <div className="flex gap-2 pt-2">
                                  {holidayForm.id && (
                                      <button 
                                        onClick={resetHolidayForm}
                                        className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-50"
                                      >
                                          Batal
                                      </button>
                                  )}
                                  <button 
                                    onClick={handleSaveHolidayInline}
                                    disabled={isSavingHoliday}
                                    className={`flex-1 flex items-center justify-center py-2.5 bg-gradient-to-r from-[#5AB2FF] to-[#A0DEFF] text-white rounded-lg text-sm font-bold shadow-md disabled:opacity-50 ${!holidayForm.id ? 'w-full' : ''}`}
                                  >
                                      {isSavingHoliday ? <Loader2 className="animate-spin mr-2" size={16}/> : <Save className="mr-2" size={16}/>}
                                      Simpan
                                  </button>
                              </div>
                          </div>
                      </div>
                  )}

                  {!canManageHolidays && (
                       <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-blue-800 text-sm shadow-sm flex items-start">
                           <AlertTriangle size={20} className="mr-2 shrink-0 mt-0.5" />
                           <p>Pengaturan hari libur sekolah hanya dapat dilakukan oleh Administrator. Data ini berlaku untuk semua kelas.</p>
                       </div>
                  )}

                   <div className="bg-white p-6 rounded-xl border border-gray-200 h-fit shadow-sm">
                        <h3 className="font-bold text-gray-800 mb-3 text-sm uppercase">Keterangan Warna</h3>
                        <div className="space-y-3">
                            {Object.values(HOLIDAY_TYPE_LEGEND).map(({ label, color }) => (
                                <div key={label} className="flex items-center gap-3">
                                    <span className={`w-4 h-4 rounded-md ${color} shadow-sm`}></span>
                                    <span className="text-sm text-gray-600">{label}</span>
                                </div>
                            ))}
                        </div>
                   </div>
              </div>

              <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                      <h3 className="font-bold text-gray-800">Daftar Hari Libur</h3>
                      <span className="text-xs bg-[#CAF4FF] text-[#5AB2FF] px-2 py-1 rounded-full font-bold">{holidays.length} Data</span>
                  </div>
                  <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                      {holidays.length === 0 ? (
                          <div className="p-8 text-center text-gray-400 italic">Belum ada data libur.</div>
                      ) : (
                          holidays.map(h => (
                            <div key={h.id} className="p-4 flex justify-between items-center group hover:bg-[#CAF4FF]/30 transition-colors">
                                <div>
                                    <p className="font-bold text-gray-800">{h.description}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-sm text-gray-500 flex items-center">
                                            <Calendar size={14} className="mr-1"/>
                                            {new Date(h.date + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                        </span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full text-white font-bold ${getHolidayPillColor(h.type)}`}>{h.type}</span>
                                    </div>
                                </div>
                                {canManageHolidays && (
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEditHolidayClick(h)} className="p-2 text-gray-400 hover:text-[#5AB2FF] rounded-full hover:bg-white"><Edit size={16}/></button>
                                        <button onClick={() => handleDeleteHolidayClick(h.id)} className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-white"><Trash2 size={16}/></button>
                                    </div>
                                )}
                            </div>
                          ))
                      )}
                  </div>
              </div>
          </div>
       )}

       {rekapEditData && !isReadOnly && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm no-print">
               <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
                   <div className="p-5 border-b bg-[#CAF4FF]/30 flex justify-between items-center">
                       <div>
                           <h3 className="font-bold text-lg text-gray-800">Edit Absensi</h3>
                           <p className="text-xs text-gray-500">{rekapEditData.name} • {new Date(rekapEditData.date).toLocaleDateString('id-ID', {day:'numeric', month:'long'})}</p>
                       </div>
                       <button onClick={()=>setRekapEditData(null)} className="p-1 hover:bg-gray-200 rounded-full transition-colors"><X size={20}/></button>
                   </div>
                   <div className="p-6 space-y-4">
                       <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Status Kehadiran</label>
                           <div className="grid grid-cols-2 gap-2">
                               {['present','sick','permit','alpha','dispensation'].map(s => (
                                   <button 
                                     key={s} 
                                     onClick={() => setRekapEditData({...rekapEditData, status: s})}
                                     className={`py-2 px-3 rounded-lg text-sm font-bold border transition-all ${
                                         rekapEditData.status === s 
                                         ? 'bg-[#5AB2FF] text-white border-[#5AB2FF] shadow-md transform scale-105' 
                                         : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                     }`}
                                   >
                                       {STATUS_TEXT[s as AttendanceStatus]}
                                   </button>
                               ))}
                           </div>
                       </div>
                       <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Catatan (Opsional)</label>
                           <textarea 
                             rows={3} 
                             className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#5AB2FF] outline-none resize-none"
                             placeholder="Keterangan tambahan..."
                             value={rekapEditData.notes}
                             onChange={e => setRekapEditData({...rekapEditData, notes: e.target.value})}
                           />
                       </div>
                   </div>
                   <div className="p-5 border-t bg-gray-50 flex justify-between items-center">
                       <button 
                         onClick={() => setRekapEditData({...rekapEditData, status: '', notes: ''})} 
                         className="text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                         title="Kosongkan Data Absen"
                       >
                           <Trash2 size={18} />
                       </button>
                       <div className="flex gap-2">
                           <button onClick={()=>setRekapEditData(null)} className="px-4 py-2 rounded-lg border bg-white text-gray-600 hover:bg-gray-100 text-sm font-medium">Batal</button>
                           <button 
                             onClick={() => handleSaveRecapEdit(rekapEditData.status)} 
                             disabled={isSavingRekapCell}
                             className="px-6 py-2 bg-[#5AB2FF] text-white font-bold rounded-lg hover:bg-[#A0DEFF] shadow-md flex items-center gap-2 disabled:opacity-50"
                           >
                               {isSavingRekapCell && <Loader2 size={16} className="animate-spin"/>}
                               Simpan
                           </button>
                       </div>
                   </div>
               </div>
           </div>
       )}

       {/* --- NEW FULL FRAME SCANNER UI --- */}
       {!isReadOnly && (
        <>
            <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end space-y-3 no-print">
                {isFabOpen && (
                    <div className="flex flex-col space-y-3 animate-fade-in-up">
                        <button 
                            onClick={() => { setIsScannerOpen(true); setIsFabOpen(false); }} 
                            className="flex items-center space-x-2 bg-white text-gray-700 px-4 py-2 rounded-full shadow-lg border border-gray-100 hover:scale-105 transition-transform"
                        >
                            <span className="text-sm font-bold">Scan QR Code</span>
                            <div className="bg-indigo-100 p-2 rounded-full text-indigo-600"><Scan size={20}/></div>
                        </button>
                    </div>
                )}
                <button 
                    onClick={() => setIsFabOpen(!isFabOpen)} 
                    className={`p-4 rounded-full shadow-xl text-white transition-all transform hover:scale-110 ${isFabOpen ? 'bg-red-500 rotate-45' : 'bg-gradient-to-r from-[#5AB2FF] to-[#A0DEFF]'}`}
                >
                    <Plus size={28} />
                </button>
            </div>

            {isScannerOpen && (
                <div className="fixed inset-0 z-[60] bg-black flex flex-col animate-fade-in">
                    {/* Header / Controls */}
                    <div className="p-4 flex justify-between items-center z-20 absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent">
                        <button 
                            onClick={() => setCameraFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                            className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-all border border-white/10"
                        >
                            <Camera size={24} />
                        </button>
                        <h3 className="font-bold text-white tracking-wider flex items-center gap-2 drop-shadow-md">
                            <Scan size={20} /> SCAN QR
                        </h3>
                        <button 
                            onClick={() => setIsScannerOpen(false)} 
                            className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-all border border-white/10"
                        >
                            <X size={24}/>
                        </button>
                    </div>
                    
                    {/* Main Scanner Area - Full Screen/Square */}
                    <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
                        <div id="reader" className="w-full h-full object-cover"></div>
                        
                        {/* Visual Feedback Line (Full Width) */}
                        <div className="absolute inset-0 pointer-events-none flex flex-col justify-center">
                             <div className="w-full h-0.5 bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-scan"></div>
                        </div>
                        
                        {/* Result Feedback Overlay */}
                        {lastScannedStudent && (
                            <div className="absolute bottom-20 left-4 right-4 mx-auto max-w-sm bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-2xl animate-fade-in-up z-20 flex items-center border border-emerald-100">
                                <div className="bg-emerald-100 p-3 rounded-full mr-4 text-emerald-600">
                                    <CheckCircle size={32} />
                                </div>
                                <div>
                                    <p className="text-xs text-emerald-600 font-bold uppercase tracking-wide">Berhasil Scan</p>
                                    <p className="font-bold text-gray-900 text-lg">{lastScannedStudent.name}</p>
                                    <p className="text-sm text-gray-500">{lastScannedStudent.time}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Hint Text */}
                    <div className="p-6 bg-black text-center z-20 pb-8">
                        <p className="text-white/70 text-sm">Arahkan kamera ke QR Code Siswa</p>
                    </div>
                </div>
            )}
        </>
       )}
    </div>
  );
};

export default AttendanceView;
