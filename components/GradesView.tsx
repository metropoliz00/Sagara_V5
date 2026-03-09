
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Student, GradeRecord, GradeData, Subject, SchoolProfileData, TeacherProfileData } from '../types';
import { MOCK_SUBJECTS } from '../constants';
import { apiService } from '../services/apiService';
import * as XLSX from 'xlsx';
import { Save, FileSpreadsheet, Printer, Upload, Download, Calculator, CheckCircle, AlertCircle, Settings2, Lock, ChevronDown, Trophy, List, Grid, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useModal } from '../context/ModalContext';

interface GradesViewProps {
  students: Student[];
  initialGrades: GradeRecord[];
  onSave: (studentId: string, subjectId: string, data: GradeData, classId: string) => void;
  onShowNotification: (message: string, type: 'success' | 'error' | 'warning') => void;
  classId: string;
  isReadOnly?: boolean;
  allowedSubjects?: string[];
  schoolProfile?: SchoolProfileData;
  teacherProfile?: TeacherProfileData;
}

const GradesView: React.FC<GradesViewProps> = ({ 
  students, initialGrades, onSave, onShowNotification, classId, 
  isReadOnly = false, allowedSubjects = ['all'], schoolProfile, teacherProfile
}) => {
  const [viewMode, setViewMode] = useState<'input' | 'recap'>('input');
  const [selectedSubject, setSelectedSubject] = useState<string>(MOCK_SUBJECTS[0].id);
  const [grades, setGrades] = useState<GradeRecord[]>(initialGrades);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [kktpMap, setKktpMap] = useState<Record<string, number>>({});
  const [isSavingKktp, setIsSavingKktp] = useState(false);
  const { showConfirm } = useModal();
  
  // New State for Student Recap Visibility
  const [showRecapToStudents, setShowRecapToStudents] = useState(false);
  const [isTogglingRecap, setIsTogglingRecap] = useState(false);

  // New State for Summative Scores Visibility
  const [showSummativeToStudents, setShowSummativeToStudents] = useState(false);
  const [isTogglingSummative, setIsTogglingSummative] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setGrades(initialGrades); }, [initialGrades]);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await apiService.getClassConfig(classId);
        if (config) {
           const fetchedKktp = (config as any).KKTP || config.kktp;
           if (fetchedKktp) setKktpMap(fetchedKktp);
           if (config.settings?.showStudentRecap !== undefined) {
               setShowRecapToStudents(config.settings.showStudentRecap);
           }
           if (config.settings?.showSummativeToStudents !== undefined) {
               setShowSummativeToStudents(config.settings.showSummativeToStudents);
           }
        }
        
        // Fill defaults if empty
        const fetchedKktp = config ? ((config as any).KKTP || config.kktp) : null;
        if (!fetchedKktp || Object.keys(fetchedKktp).length === 0) {
           const defaults: Record<string, number> = {};
           MOCK_SUBJECTS.forEach((s: Subject) => { defaults[s.id] = s.kkm; });
           setKktpMap(defaults);
        }
      } catch (e) {
        console.error("Gagal memuat konfigurasi", e);
      }
    };
    if (classId) loadConfig();
  }, [classId]);

  const toggleStudentRecapVisibility = async () => {
      if (isReadOnly) return;
      const newValue = !showRecapToStudents;
      setIsTogglingRecap(true);
      try {
          await apiService.saveClassConfig('RECAP_SETTINGS', { showStudentRecap: newValue }, classId);
          setShowRecapToStudents(newValue);
          onShowNotification(newValue ? "Rekap rapor sekarang muncul di portal siswa." : "Rekap rapor disembunyikan dari portal siswa.", 'success');
      } catch (e) {
          onShowNotification("Gagal mengubah pengaturan.", 'error');
      } finally {
          setIsTogglingRecap(false);
      }
  };

  const toggleSummativeVisibility = async () => {
      if (isReadOnly) return;
      const newValue = !showSummativeToStudents;
      setIsTogglingSummative(true);
      try {
          await apiService.saveClassConfig('SUMMATIVE_VISIBILITY', { showSummativeToStudents: newValue }, classId);
          setShowSummativeToStudents(newValue);
          onShowNotification(newValue ? "Nilai sumatif sekarang muncul di portal siswa." : "Nilai sumatif disembunyikan dari portal siswa.", 'success');
      } catch (e) {
          onShowNotification("Gagal mengubah pengaturan.", 'error');
      } finally {
          setIsTogglingSummative(false);
      }
  };

  const isSubjectEditable = useMemo(() => {
      if (isReadOnly) return false; 
      if (!allowedSubjects || allowedSubjects.includes('all')) return true; 
      return allowedSubjects.includes(selectedSubject);
  }, [isReadOnly, allowedSubjects, selectedSubject]);

  const activeSubject = useMemo(() => MOCK_SUBJECTS.find((s: Subject) => s.id === selectedSubject), [selectedSubject]);
  const currentKktp = kktpMap[selectedSubject] || activeSubject?.kkm || 75;

  const getInputColor = (score: number) => {
    if (!score || score === 0) return 'bg-transparent text-gray-800';
    if (score < currentKktp) return 'bg-rose-50 text-rose-700';
    return 'bg-emerald-50 text-emerald-700';
  };

  const recapData = useMemo(() => {
      const computed = students.map(student => {
          const studentRecord = grades.find(g => g.studentId === student.id);
          const scores: Record<string, number> = {};
          let totalScore = 0;
          let subjectsCount = 0;

          MOCK_SUBJECTS.forEach(subj => {
              const gData = studentRecord?.subjects[subj.id];
              let finalScore = 0;
              if (gData) {
                  const vals = [gData.sum1, gData.sum2, gData.sum3, gData.sum4, gData.sas].filter(v => v > 0);
                  if (vals.length > 0) {
                      finalScore = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
                  }
              }
              scores[subj.id] = finalScore;
              if (finalScore > 0) {
                  totalScore += finalScore;
                  subjectsCount++;
              }
          });

          return {
              ...student,
              scores,
              totalScore,
              subjectsCount
          };
      });

      computed.sort((a, b) => b.totalScore - a.totalScore);

      return computed.map((item, index) => ({
          ...item,
          rank: item.totalScore > 0 ? index + 1 : '-' 
      }));
  }, [students, grades]);

  const handleKktpChange = (newVal: number) => {
    if (!isSubjectEditable) return;
    setKktpMap(prev => ({...prev, [selectedSubject]: newVal}));
  };

  const saveKktp = async () => {
    if (!isSubjectEditable) return;
    setIsSavingKktp(true);
    try {
      await apiService.saveClassConfig('KKTP', kktpMap, classId);
      onShowNotification(`KKTP untuk ${activeSubject?.name} berhasil diperbarui menjadi ${currentKktp}`, 'success');
    } catch (e) {
      onShowNotification("Gagal menyimpan KKTP", 'error');
    } finally {
      setIsSavingKktp(false);
    }
  };

  const getStudentGrade = (studentId: string): GradeData => {
    const record = grades.find(g => g.studentId === studentId);
    return record?.subjects[selectedSubject] || { sum1: 0, sum2: 0, sum3: 0, sum4: 0, sas: 0 };
  };

  const updateLocalGrade = (studentId: string, field: keyof GradeData, value: number) => {
    if (!isSubjectEditable) return;
    const val = Math.min(100, Math.max(0, value));
    setGrades(prevGrades => {
        const newGrades = [...prevGrades];
        let record = newGrades.find(g => g.studentId === studentId);
        if (!record) {
          record = { studentId, classId, subjects: {} };
          newGrades.push(record);
        }
        if (!record.subjects[selectedSubject]) {
          record.subjects[selectedSubject] = { sum1: 0, sum2: 0, sum3: 0, sum4: 0, sas: 0 };
        }
        record.subjects[selectedSubject] = { ...record.subjects[selectedSubject], [field]: val };
        return newGrades;
    });
  };
  
  const calculateFinalAverage = (g: GradeData) => {
    const scores = [g.sum1, g.sum2, g.sum3, g.sum4, g.sas];
    const filledScores = scores.filter(s => s > 0);
    if (filledScores.length === 0) return 0;
    const sum = filledScores.reduce((acc, curr) => acc + curr, 0);
    return Math.round(sum / filledScores.length);
  };

  const handleSaveRow = (studentId: string) => {
    if (!isSubjectEditable) return;
    const gradeData = getStudentGrade(studentId);
    onSave(studentId, selectedSubject, gradeData, classId);
    onShowNotification('Nilai individu berhasil disimpan!', 'success');
  };

  const handleSaveAll = async () => {
    if (!isSubjectEditable) return;
    showConfirm(`Simpan seluruh nilai untuk mata pelajaran ${activeSubject?.name}?`, async () => {
        setIsSavingAll(true);
        try {
            for (const student of students) {
                const gradeData = getStudentGrade(student.id);
                await onSave(student.id, selectedSubject, gradeData, classId);
            }
            onShowNotification('Seluruh data nilai kelas berhasil disinkronkan!', 'success');
        } catch (e) {
            onShowNotification('Gagal menyimpan beberapa data. Cek koneksi Anda.', 'error');
        } finally {
            setIsSavingAll(false);
        }
    });
  };

  const getSubjectInitials = (name: string) => {
      const ignore = ['pendidikan', 'dan', 'bahasa'];
      const parts = name.split(' ').filter(p => !ignore.includes(p.toLowerCase()));
      if (parts.length === 1) return parts[0].substring(0, 3).toUpperCase();
      return parts.map(p => p[0]).join('').toUpperCase();
  };

  const handlePrint = () => {
      const signatureBlock = `
        <div class="print-footer clearfix">
            <div class="signature-box signature-left">
                <p>Mengetahui,</p>
                <p>Kepala ${schoolProfile?.name || 'Sekolah'}</p>
                <div class="signature-space"></div>
                <p class="underline">${schoolProfile?.headmaster || '.........................'}</p>
                <p>NIP. ${schoolProfile?.headmasterNip || '.........................'}</p>
            </div>
            <div class="signature-box signature-right">
                <p>Remen, ${new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
                <p>Guru Kelas ${classId}</p>
                <div class="signature-space"></div>
                <p class="underline">${teacherProfile?.name || '.........................'}</p>
                <p>NIP. ${teacherProfile?.nip || '.........................'}</p>
            </div>
        </div>
      `;

      let content = '';

      if (viewMode === 'input') {
          // Summative Recap
          const subjectName = activeSubject?.name || selectedSubject;
          content = `
            <div class="print-header">
                <h2>REKAP NILAI SUMATIF</h2>
                <p>KELAS ${classId}</p>
                <p>TAHUN AJARAN ${schoolProfile?.year || new Date().getFullYear()}</p>
                <p>MATA PELAJARAN: ${subjectName.toUpperCase()}</p>
            </div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 5%">No</th>
                        <th style="width: 25%">Nama Siswa</th>
                        <th style="width: 10%">NIS</th>
                        <th style="width: 10%">NISN</th>
                        <th style="width: 8%">SUM 1</th>
                        <th style="width: 8%">SUM 2</th>
                        <th style="width: 8%">SUM 3</th>
                        <th style="width: 8%">SUM 4</th>
                        <th style="width: 8%">SAS</th>
                        <th style="width: 10%">NILAI AKHIR</th>
                    </tr>
                </thead>
                <tbody>
                    ${students.map((s, idx) => {
                        const g = getStudentGrade(s.id);
                        const avg = calculateFinalAverage(g);
                        return `
                        <tr>
                            <td style="text-align: center">${idx + 1}</td>
                            <td>${s.name}</td>
                            <td>${s.nis}</td>
                            <td>${s.nisn || '-'}</td>
                            <td style="text-align: center">${g.sum1 || '-'}</td>
                            <td style="text-align: center">${g.sum2 || '-'}</td>
                            <td style="text-align: center">${g.sum3 || '-'}</td>
                            <td style="text-align: center">${g.sum4 || '-'}</td>
                            <td style="text-align: center">${g.sas || '-'}</td>
                            <td style="text-align: center; font-weight: bold;">${avg || '-'}</td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
            ${signatureBlock}
          `;
      } else {
          // Report Card Recap
          content = `
            <div class="print-header">
                <h2>REKAP NILAI RAPOR</h2>
                <p>KELAS ${classId}</p>
                <p>TAHUN AJARAN ${schoolProfile?.year || new Date().getFullYear()}</p>
            </div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 5%">No</th>
                        <th style="width: 20%">Nama Siswa</th>
                        <th style="width: 10%">NIS</th>
                        <th style="width: 10%">NISN</th>
                        ${MOCK_SUBJECTS.map(s => `<th style="width: 5%">${getSubjectInitials(s.name)}</th>`).join('')}
                        <th style="width: 8%">Total</th>
                        <th style="width: 8%">Rank</th>
                    </tr>
                </thead>
                <tbody>
                    ${recapData.map((s, idx) => `
                        <tr>
                            <td style="text-align: center">${idx + 1}</td>
                            <td>${s.name}</td>
                            <td>${s.nis}</td>
                            <td>${s.nisn || '-'}</td>
                            ${MOCK_SUBJECTS.map(subj => `<td style="text-align: center">${s.scores[subj.id] || '-'}</td>`).join('')}
                            <td style="text-align: center; font-weight: bold;">${s.totalScore}</td>
                            <td style="text-align: center">${s.rank}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            ${signatureBlock}
          `;
      }

      const newWindow = window.open("", "", "width=1200,height=800");
  
      newWindow?.document.write(`
        <html>
          <head>
            <title>Rekap Nilai - Kelas ${classId}</title>
            <style>
              body { font-family: 'Times New Roman', Times, serif; padding: 20px; font-size: 10pt; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
              th, td { border: 1px solid black; padding: 4px; text-align: left; vertical-align: middle; }
              th { text-align: center; font-weight: bold; background-color: #f0f0f0; }
              .print-header { text-align: center; margin-bottom: 20px; line-height: 1.2; font-weight: bold; }
              .print-header h2, .print-header p { margin: 0; padding: 0; text-transform: uppercase; }
              .print-footer { margin-top: 30px; width: 100%; font-size: 11pt; page-break-inside: avoid; }
              .signature-box { width: 45%; text-align: center; }
              .signature-box p { margin: 0; line-height: 1.4; }
              .signature-left { float: left; }
              .signature-right { float: right; }
              .signature-space { height: 60px; }
              .underline { text-decoration: underline; font-weight: bold; }
              .clearfix::after { content: ""; clear: both; display: table; }
              @page { size: A4 landscape; margin: 1.5cm; }
              @media print {
                body { -webkit-print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>
            ${content}
          </body>
        </html>
      `);
    
      newWindow?.document.close();
      setTimeout(() => {
          newWindow?.focus();
          newWindow?.print();
          newWindow?.close();
      }, 500);
  };

  const handleDownloadTemplate = () => { 
      const headers = ["NIS", "Nama Siswa", "Mata Pelajaran(ID)", "SUM 1", "SUM 2", "SUM 3", "SUM 4", "SAS"];
      const example = ["2024001", "Contoh Siswa", selectedSubject, "80", "85", "90", "88", "85"];
      const worksheet = XLSX.utils.aoa_to_sheet([headers, example]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Template Nilai");
      XLSX.writeFile(workbook, `template_nilai_${selectedSubject}.xlsx`);
  };
  
  const handleExport = () => { 
      if (viewMode === 'recap') {
          const headers = ["Rank", "NIS", "NISN", "Nama Siswa", ...MOCK_SUBJECTS.map(s => s.name), "Total Nilai"];
          const rows = recapData.map(s => [
              s.rank, 
              s.nis, 
              s.nisn || '-',
              s.name, 
              ...MOCK_SUBJECTS.map(subj => s.scores[subj.id] || 0),
              s.totalScore
          ]);
          const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Rapor");
          XLSX.writeFile(workbook, `rekap_nilai_rapor_kelas_${classId}.xlsx`);
      } else {
          const subjectName = activeSubject?.name || selectedSubject;
          const headers = ["NIS", "Nama Siswa", "Mata Pelajaran", "SUM 1", "SUM 2", "SUM 3", "SUM 4", "SAS", "Nilai Akhir", "Status"];
          const rows = students.map(s => {
             const g = getStudentGrade(s.id);
             const avg = calculateFinalAverage(g);
             const status = avg >= currentKktp ? 'Tuntas' : 'Belum Tuntas';
             return [s.nis, s.name, subjectName, g.sum1, g.sum2, g.sum3, g.sum4, g.sas, avg, status];
          });
          const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, `Nilai ${selectedSubject}`);
          XLSX.writeFile(workbook, `nilai_${selectedSubject}.xlsx`);
      }
  };
  
  const handleImportClick = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { 
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const rows = data.slice(1) as any[]; 
        let updateCount = 0;
        rows.forEach((row) => {
          if (!row || row.length === 0) return;
          const nis = row[0] ? String(row[0]) : '';
          const student = students.find(s => s.nis === nis);
          if (student) {
              const newData = {
                  sum1: Number(row[3]) || 0,
                  sum2: Number(row[4]) || 0,
                  sum3: Number(row[5]) || 0,
                  sum4: Number(row[6]) || 0,
                  sas: Number(row[7]) || 0,
              };
              onSave(student.id, selectedSubject, newData, classId);
              updateCount++;
          }
        });
        onShowNotification(`Berhasil memproses impor untuk ${updateCount} siswa. Data sedang disimpan...`, 'success');
        if(fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6 animate-fade-in page-landscape">
       <div className="flex flex-col xl:flex-row justify-between gap-4 no-print">
          <div>
             <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                {viewMode === 'input' 
                    ? (isReadOnly ? 'Lihat Nilai Saya' : `Input Nilai ${activeSubject?.name}`) 
                    : 'Rekap Nilai Rapor & Peringkat'
                }
                {!isSubjectEditable && !isReadOnly && viewMode === 'input' && <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded border border-gray-200 flex items-center"><Lock size={12} className="mr-1"/> Read Only</span>}
             </h2>
             <p className="text-gray-500 text-sm">
                {viewMode === 'input' 
                    ? `Kelola nilai sumatif & formatif. Ambang batas (KKTP): ${currentKktp}.` 
                    : 'Ringkasan nilai akhir semua mapel dan kalkulasi peringkat siswa.'
                }
             </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
              {/* NEW TOGGLE FOR SUMMATIVE VISIBILITY */}
              {viewMode === 'input' && !isReadOnly && (
                  <button 
                    onClick={toggleSummativeVisibility}
                    disabled={isTogglingSummative}
                    className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        showSummativeToStudents 
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                    }`}
                    title={showSummativeToStudents ? "Sembunyikan nilai sumatif dari siswa" : "Tampilkan nilai sumatif ke siswa"}
                  >
                      {isTogglingSummative ? <Loader2 size={14} className="animate-spin mr-1.5"/> : showSummativeToStudents ? <Eye size={14} className="mr-1.5"/> : <EyeOff size={14} className="mr-1.5"/>}
                      <span>Portal Siswa (Sumatif): {showSummativeToStudents ? 'ON' : 'OFF'}</span>
                  </button>
              )}
              
              
              {/* NEW TOGGLE FOR STUDENT VISIBILITY */}
              {viewMode === 'recap' && !isReadOnly && (
                  <button 
                    onClick={toggleStudentRecapVisibility}
                    disabled={isTogglingRecap}
                    className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        showRecapToStudents 
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                    }`}
                    title={showRecapToStudents ? "Sembunyikan dari siswa" : "Tampilkan ke siswa"}
                  >
                      {isTogglingRecap ? <Loader2 size={14} className="animate-spin mr-1.5"/> : showRecapToStudents ? <Eye size={14} className="mr-1.5"/> : <EyeOff size={14} className="mr-1.5"/>}
                      <span>Portal Siswa: {showRecapToStudents ? 'ON' : 'OFF'}</span>
                  </button>
              )}

              {/* View Toggle */}
              <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                  <button 
                    onClick={() => setViewMode('input')}
                    className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'input' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                      <Grid size={14} className="mr-1.5"/> Per Mapel
                  </button>
                  <button 
                    onClick={() => setViewMode('recap')}
                    className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'recap' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                      <List size={14} className="mr-1.5"/> Rekap Rapor
                  </button>
              </div>

              {viewMode === 'input' && (
                  <>
                    {/* KKTP Section */}
                    <div className="flex items-center bg-white border border-indigo-100 p-1 rounded-xl shadow-sm">
                        <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600 mr-2"> <Settings2 size={16} /> </div>
                        <div className="flex flex-col mr-3">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">KKTP</span>
                            {!isSubjectEditable ? (
                                <span className="font-bold text-indigo-700">{currentKktp}</span>
                            ) : (
                                <input type="number" min="0" max="100" value={currentKktp} onChange={(e) => handleKktpChange(Number(e.target.value))} className="w-16 font-bold text-indigo-700 outline-none bg-transparent"/>
                            )}
                        </div>
                        {isSubjectEditable && (
                            <button onClick={saveKktp} disabled={isSavingKktp} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50">
                                {isSavingKktp ? '...' : 'Simpan'}
                            </button>
                        )}
                    </div>
                    
                    {/* Subject Selection */}
                    <div className="relative">
                        <select
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            className="appearance-none bg-white border border-gray-200 text-gray-700 py-2.5 pl-4 pr-10 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm cursor-pointer min-w-[200px]"
                        >
                            {MOCK_SUBJECTS.map((s: Subject) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                            <ChevronDown size={16} />
                        </div>
                    </div>

                    {isSubjectEditable && (
                        <button onClick={handleSaveAll} disabled={isSavingAll} className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 shadow-md font-bold disabled:opacity-50">
                            <Save size={18}/> <span className="hidden sm:inline">{isSavingAll ? 'Proses...' : 'Simpan Semua'}</span>
                        </button>
                    )}
                  </>
              )}

              <div className="flex gap-1">
                {isSubjectEditable && viewMode === 'input' && (
                    <>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx, .xls, .csv" />
                        <button onClick={handleDownloadTemplate} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50" title="Download Template"><FileSpreadsheet size={18}/></button>
                        <button onClick={handleImportClick} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50" title="Import Excel"><Upload size={18}/></button>
                        <button onClick={handleExport} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50" title="Export Excel"><Download size={18}/></button>
                    </>
                )}
                <button onClick={handlePrint} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50" title="Cetak"><Printer size={18}/></button>
              </div>
          </div>
       </div>

       {viewMode === 'input' ? (
           <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto print-container">
              <table className="w-full text-sm text-left border-collapse">
                 <thead className="bg-slate-50 text-slate-700 font-bold print:bg-white print:border-b print:text-black">
                    <tr className="border-b">
                       <th className="p-4 sticky left-0 bg-slate-50 print:bg-white min-w-[220px] border-r">Nama Siswa</th>
                       <th className="p-2 w-20 text-center border-r">SUM 1</th>
                       <th className="p-2 w-20 text-center border-r">SUM 2</th>
                       <th className="p-2 w-20 text-center border-r">SUM 3</th>
                       <th className="p-2 w-20 text-center border-r">SUM 4</th>
                       <th className="p-2 w-24 text-center border-r bg-blue-50/50 print:bg-white">SAS</th>
                       <th className="p-2 w-28 text-center bg-indigo-600 text-white print:bg-white print:text-black border-l">Nilai Akhir</th>
                       {isSubjectEditable && <th className="p-2 w-16 text-center no-print">Aksi</th>}
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100 print:divide-gray-300">
                    {students.map(s => {
                       const g = getStudentGrade(s.id);
                       const finalAvg = calculateFinalAverage(g);
                       
                       return (
                          <tr key={s.id} className="hover:bg-indigo-50/30 transition-colors print:hover:bg-transparent border-b">
                             <td className="p-4 sticky left-0 bg-white font-medium print:text-black border-r whitespace-nowrap">
                                <div className="flex flex-col">
                                    <span>{s.name}</span>
                                    <div className="flex gap-2 text-[10px] text-gray-400 no-print">
                                        <span>NIS: {s.nis}</span>
                                        {s.nisn && <span>• NISN: {s.nisn}</span>}
                                    </div>
                                </div>
                             </td>
                             {(['sum1','sum2','sum3','sum4','sas'] as (keyof GradeData)[]).map(f => {
                                const score = g[f] || 0;
                                const colorClass = getInputColor(score);
                                return (
                                   <td key={String(f)} className={`p-1 border-r align-top ${f === 'sas' ? 'bg-blue-50/30 print:bg-white' : ''}`}>
                                       {!isSubjectEditable ? (
                                         <div>
                                            <div className={`w-full text-center py-2 font-bold rounded-lg ${colorClass}`}>{score > 0 ? score : '-'}</div>
                                            {f !== 'sas' && score > 0 && (
                                                <div className="text-center text-[9px] font-bold mt-1">
                                                    {score < currentKktp ? <span className="text-rose-600">Remedial</span> : <span className="text-emerald-600">Pengayaan</span>}
                                                </div>
                                            )}
                                         </div>
                                       ) : (
                                        <div>
                                            <input type="number" min="0" max="100" value={score} onChange={e=>updateLocalGrade(s.id, f, Number(e.target.value))} className={`w-full text-center py-2 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none rounded-lg print:border-none print:p-0 ${f === 'sas' ? 'font-bold' : ''} ${colorClass}`}/>
                                            {f !== 'sas' && score > 0 && (
                                                <div className="text-center text-[9px] font-bold mt-1">
                                                    {score < currentKktp ? <span className="text-rose-600">Remedial</span> : <span className="text-emerald-600">Pengayaan</span>}
                                                </div>
                                            )}
                                        </div>
                                       )}
                                    </td>
                                );
                             })}
                             <td className={`p-2 text-center border-l font-black text-lg bg-indigo-50 text-indigo-700 print:bg-white print:text-black`}>
                                <div className="flex flex-col items-center">
                                    <span>{finalAvg > 0 ? finalAvg : '-'}</span>
                                </div>
                             </td>
                             {isSubjectEditable && (
                                <td className="p-2 text-center no-print">
                                    <button onClick={()=>handleSaveRow(s.id)} className="text-gray-400 hover:text-emerald-600 transition-colors" title="Simpan Baris"><Save size={18}/></button>
                                </td>
                             )}
                          </tr>
                       );
                    })}
                 </tbody>
              </table>
           </div>
       ) : (
           /* RECAP TABLE VIEW */
           <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto print-container">
               <div className="hidden print-only text-center py-4 border-b">
                   <h2 className="text-xl font-bold uppercase">REKAP NILAI RAPOR</h2>
                   <p className="text-sm">Kelas {classId} • Tahun Ajaran {new Date().getFullYear()}</p>
               </div>
               <table className="w-full text-xs text-left border-collapse min-w-[1000px]">
                   <thead className="bg-indigo-50 text-indigo-900 font-bold uppercase print:bg-gray-100 print:text-black">
                       <tr className="border-b border-indigo-100">
                           <th className="p-3 w-10 text-center border-r border-indigo-100 sticky left-0 bg-indigo-50 z-20">No</th>
                           <th className="p-3 min-w-[200px] border-r border-indigo-100 sticky left-10 bg-indigo-50 z-20">Nama Siswa</th>
                           {MOCK_SUBJECTS.map(subj => (
                               <th key={subj.id} className="p-2 w-16 text-center border-r border-indigo-100" title={subj.name}>
                                   {getSubjectInitials(subj.name)}
                               </th>
                           ))}
                           <th className="p-3 w-20 text-center border-r border-indigo-100 bg-emerald-50 text-emerald-800">Jumlah</th>
                           <th className="p-3 w-20 text-center bg-amber-50 text-amber-800">Peringkat</th>
                       </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                       {recapData.map((s, idx) => {
                           const rank = Number(s.rank);
                           const isTop3 = rank > 0 && rank <= 3;
                           
                           return (
                               <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                                   <td className="p-3 text-center text-gray-500 border-r sticky left-0 bg-white group-hover:bg-gray-50 z-10">{idx + 1}</td>
                                   <td className="p-3 font-medium text-gray-800 border-r sticky left-10 bg-white group-hover:bg-gray-50 z-10 truncate max-w-[200px]">
                                       <div className="flex flex-col">
                                           <span>{s.name}</span>
                                           <div className="flex items-center gap-1 text-[9px] text-gray-500 no-print">
                                               <span>{s.nis}</span>
                                               {s.nisn && <span className="text-indigo-600 font-mono">• {s.nisn}</span>}
                                           </div>
                                       </div>
                                   </td>
                                   {MOCK_SUBJECTS.map(subj => (
                                       <td key={subj.id} className="p-2 text-center border-r font-medium text-gray-600">
                                           {s.scores[subj.id] || '-'}
                                       </td>
                                   ))}
                                   <td className="p-3 text-center font-bold text-emerald-600 bg-emerald-50/30 border-r border-emerald-100">
                                       {s.totalScore > 0 ? s.totalScore : '-'}
                                   </td>
                                   <td className={`p-3 text-center font-black ${isTop3 ? 'bg-amber-50 text-amber-600' : 'text-gray-500'}`}>
                                       <div className="flex items-center justify-center gap-1">
                                           {rank === 1 && <Trophy size={14} className="text-yellow-500 fill-yellow-500"/>}
                                           {rank === 2 && <Trophy size={14} className="text-gray-400 fill-gray-400"/>}
                                           {rank === 3 && <Trophy size={14} className="text-amber-700 fill-amber-700"/>}
                                           {s.rank}
                                       </div>
                                   </td>
                               </tr>
                           );
                       })}
                   </tbody>
               </table>
           </div>
       )}

       {viewMode === 'input' && (
           <div className="flex flex-wrap items-center gap-4 text-xs no-print">
              <div className="flex items-center text-gray-400 italic"> <Calculator size={12} className="mr-1" /> Nilai Akhir = Rata-rata dari kolom yang terisi. </div>
              <div className="flex items-center text-rose-500 font-bold"> <AlertCircle size={12} className="mr-1" /> Merah = Di bawah KKTP ({currentKktp}). </div>
              <div className="flex items-center text-emerald-500 font-bold"> <CheckCircle size={12} className="mr-1" /> Hijau = Tuntas. </div>
              {!isSubjectEditable && !isReadOnly && (
                  <div className="flex items-center text-indigo-600 font-bold ml-auto bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                      <Lock size={12} className="mr-1" /> Akses Terbatas (Hanya Guru Mapel Terkait)
                  </div>
              )}
           </div>
       )}
    </div>
  );
};
export default GradesView;
