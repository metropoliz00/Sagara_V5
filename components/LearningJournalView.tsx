import React, { useState, useEffect, useMemo } from 'react';
import { LearningJournalEntry, ScheduleItem, SchoolProfileData, TeacherProfileData, User } from '../types';
import { apiService } from '../services/apiService';
import { useModal } from '../context/ModalContext';
import { 
  Save, Calendar, Printer, Plus, Trash2, Loader2, 
  ChevronLeft, ChevronRight, NotebookPen, RefreshCw,
  LayoutList, CalendarRange, Coffee
} from 'lucide-react';

interface LearningJournalViewProps {
  classId: string;
  isReadOnly?: boolean;
  targetDate?: string | null;
  onSaveBatch?: (entries: Partial<LearningJournalEntry>[]) => Promise<void>;
  schoolProfile?: SchoolProfileData;
  teacherProfile?: TeacherProfileData;
  currentUser?: User | null; // New prop
}

const WEEKDAYS_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MODEL_OPTIONS = ['Problem-Based Learning (PBL)', 'Project-Based Learning (PjBL)', 'Inquiry', 'Discovery Learning', 'Lainnya'];
const PENDEKATAN_OPTIONS = ['Pendekatan kontekstual', 'konstruktivisme', 'saintifik', 'gamifiaksi', 'lainnya'];
const METODE_OPTIONS = ['Tanya jawab', 'Ceramah', 'Diskusi kelompok', 'Demonstrasi', 'Simulasi/bermain peran', 'Presentasi', 'Lainnya'];
const EVALUASI_OPTIONS = {
  Formatif: [
    'Kuis singkat',
    'Diskusi Kelompok',
    'Lembar Refleksi',
    'Presentasi',
    'Observasi'
  ],
  Sumatif: [
    'Tes Lisan/Tulis',
    'Proyek/Tugas Besar',
    'Ujian Praktik/Kinerja',
    'Portofolio',
    'Uji Kompetensi'
  ]
};


const LearningJournalView: React.FC<LearningJournalViewProps> = ({ 
  classId, isReadOnly, targetDate, onSaveBatch, schoolProfile, teacherProfile, currentUser 
}) => {
  // State
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [entries, setEntries] = useState<LearningJournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, rowIndex: number } | null>(null);
  const [copiedRow, setCopiedRow] = useState<Partial<LearningJournalEntry> | null>(null);
  const { showAlert, showConfirm } = useModal();

  // Handle Target Date Navigation
  useEffect(() => {
      if (targetDate) {
          setCurrentDate(targetDate);
          setViewMode('daily'); // Force switch to daily view to see the specific date
      }
  }, [targetDate]);

  // Load Data
  const loadData = async () => {
    setLoading(true);
    try {
      const [journalData, scheduleData, configData] = await Promise.all([
        apiService.getLearningJournal(classId),
        apiService.getSchedule(classId),
        apiService.getClassConfig(classId)
      ]);
      setEntries(journalData);
      
      // Use schedule from dedicated table if available, otherwise fallback to config
      if (scheduleData && scheduleData.length > 0) {
          setSchedule(scheduleData);
      } else if (configData.schedule) {
          setSchedule(configData.schedule);
      } else {
          setSchedule([]);
      }
    } catch (e) {
      console.error("Failed to load journal data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (classId) loadData();
  }, [classId]);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // --- Helper Functions ---

  const getDayName = (dateStr: string) => {
    const d = new Date(dateStr);
    return WEEKDAYS_ID[d.getDay()];
  };

  const getEntriesForDate = (dateStr: string) => {
    return entries.filter(e => e.date === dateStr);
  };

  const getMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(date.setDate(diff));
  }

  const getSaturday = (monday: Date) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + 5);
      return date;
  }

  // --- Weekly Logic ---
  
  const currentMonday = useMemo(() => getMonday(new Date(currentDate)), [currentDate]);
  const currentSaturday = useMemo(() => getSaturday(currentMonday), [currentMonday]);
  
  const weekDates = useMemo(() => {
      const days = [];
      for(let i=0; i<6; i++) { // Mon-Sat
          const d = new Date(currentMonday);
          d.setDate(currentMonday.getDate() + i);
          days.push(d.toISOString().split('T')[0]);
      }
      return days;
  }, [currentMonday]);
  
  const generateActivitiesString = (pendekatan?: string, model?: string, metode?: string[]) => {
      const metodeStr = metode && metode.length > 0 ? metode.join(', ') : '-';
      return `Pendahuluan (apersepsi), kegiatan inti (${pendekatan || '-'}, ${model || '-'}, ${metodeStr}), dan penutup (evaluasi/kesimpulan).`;
  };

  // Logic to merge Schedule with Entries for a SPECIFIC date
  const getRowsForDate = (targetDate: string) => {
    const dayName = getDayName(targetDate);
    const existingEntries = getEntriesForDate(targetDate);
    
    // Subjects scheduled for that day
    const scheduledToday = schedule.filter(s => s.day === dayName);
    
    const rows: Partial<LearningJournalEntry>[] = existingEntries.map(e => ({...e}));

    scheduledToday.forEach(sch => {
        const covered = existingEntries.some(e => e.subject === sch.subject && e.timeSlot === sch.time);
        if (!covered) {
            rows.push({
                id: `temp-${targetDate}-${sch.id}`, 
                classId,
                date: targetDate,
                day: dayName,
                timeSlot: sch.time,
                subject: sch.subject,
                topic: '',
                activities: generateActivitiesString(PENDEKATAN_OPTIONS[0], MODEL_OPTIONS[0], [METODE_OPTIONS[0]]),
                evaluation: 'Kuis singkat',
                reflection: '',
                followUp: '',
                pendekatan: PENDEKATAN_OPTIONS[0],
                model: MODEL_OPTIONS[0],
                metode: [METODE_OPTIONS[0]],
            });
        }
    });

    return rows.sort((a, b) => (a.timeSlot || '').localeCompare(b.timeSlot || ''));
  };

  // --- Daily Logic (Draft State) ---
  const activeRows = useMemo(() => getRowsForDate(currentDate), [currentDate, entries, schedule, classId]);
  
  const [draftData, setDraftData] = useState<Partial<LearningJournalEntry>[]>([]);

  useEffect(() => {
      setDraftData(activeRows);
  }, [activeRows]);

  const isRowEditable = (row: Partial<LearningJournalEntry>): boolean => {
    if (isReadOnly) return false; // Global override
    if (!currentUser) return false;

    // Admin & Supervisor can edit anything
    if (currentUser.role === 'admin' || currentUser.role === 'supervisor') {
        return true;
    }

    // Subject-specific teachers
    if (currentUser.role === 'guru') {
        const pos = (currentUser.position || '').toLowerCase();
        const rowSubject = (row.subject || '').toLowerCase();

        const isPaiTeacher = pos.includes('pai') || pos.includes('agama');
        const isPjokTeacher = pos.includes('pjok') || pos.includes('olahraga');
        const isSubjectTeacher = isPaiTeacher || isPjokTeacher;

        if (!isSubjectTeacher) return true; // Class teacher can edit all

        // For a subject teacher:
        // 1. Can edit if row has no subject (new row) or if subject matches specialty
        if (!row.subject) return true;
        if (isPaiTeacher && rowSubject.includes('pai')) return true;
        if (isPjokTeacher && rowSubject.includes('pjok')) return true;

        return false; // Subject teacher, but subject doesn't match
    }

    return true; // Default case
  };

  const updateDraft = (index: number, field: keyof LearningJournalEntry, value: string | string[]) => {
    const newData = [...draftData];
    if (!isRowEditable(newData[index])) return;

    let updatedRow = { ...newData[index], [field]: value };

    const pbmFields: (keyof LearningJournalEntry)[] = ['model', 'pendekatan', 'metode'];

    if (pbmFields.includes(field)) {
        updatedRow.activities = generateActivitiesString(updatedRow.pendekatan, updatedRow.model, updatedRow.metode);
    }

    // Auto-fill logic for the same subject
    if (updatedRow.subject) {
        for (let i = 0; i < newData.length; i++) {
            if (newData[i].subject === updatedRow.subject) {
                newData[i] = { ...newData[i], [field]: value };
                if (pbmFields.includes(field)) {
                    const thisRow = newData[i];
                    newData[i].activities = generateActivitiesString(thisRow.pendekatan, thisRow.model, thisRow.metode);
                }
            }
        }
    } else {
        newData[index] = updatedRow;
    }

    setDraftData(newData);
  };

  const handleMetodeChange = (index: number, metode: string) => {
    const currentMetode = draftData[index]?.metode || [];
    const newMetode = currentMetode.includes(metode)
      ? currentMetode.filter(m => m !== metode)
      : [...currentMetode, metode];
    updateDraft(index, 'metode', newMetode);
  };

  const addManualRow = () => {
      if (isReadOnly) return;
      const dayName = getDayName(currentDate);
      const defaultPendekatan = PENDEKATAN_OPTIONS[0];
      const defaultModel = MODEL_OPTIONS[0];
      const defaultMetode = METODE_OPTIONS[0];

      setDraftData([
          ...draftData,
          {
              id: `manual-${Date.now()}`,
              classId,
              date: currentDate,
              day: dayName,
              subject: '',
              timeSlot: '',
              topic: '',
              activities: generateActivitiesString(defaultPendekatan, defaultModel, [defaultMetode]),
              evaluation: 'Kuis singkat',
              reflection: '',
              followUp: '',
              pendekatan: defaultPendekatan,
              model: defaultModel,
              metode: [defaultMetode],
          }
      ]);
  };

  const removeRow = async (index: number) => {
      const row = draftData[index];
      if (!isRowEditable(row)) return;

      if (row.id && !row.id.startsWith('temp-') && !row.id.startsWith('manual-')) {
          const rowId = row.id;
          showConfirm("Hapus jurnal tersimpan ini?", async () => {
              await apiService.deleteLearningJournal(rowId, classId);
              setEntries(prev => prev.filter(e => e.id !== rowId));
          });
      } else {
          const newData = [...draftData];
          newData.splice(index, 1);
          setDraftData(newData);
      }
  };

  const handleSave = async () => {
      if (isReadOnly) return;
      setSaving(true);
      try {
          const validRows = draftData.filter(d => d.subject && d.subject.trim() !== '');
          
          if (onSaveBatch) {
              await onSaveBatch(validRows);
          } else {
              await apiService.saveLearningJournalBatch(validRows);
              showAlert('Jurnal berhasil disimpan.', 'success');
          }
          
          const newJournalData = await apiService.getLearningJournal(classId);
          setEntries(newJournalData);
      } catch (e) {
          console.error(e);
          if (!onSaveBatch) showAlert('Gagal menyimpan jurnal.', 'error');
      } finally {
          setSaving(false);
      }
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

    if (viewMode === 'daily') {
        content = `
            <div class="print-header">
                <h2>JURNAL HARIAN PEMBELAJARAN</h2>
                <p>KELAS ${classId}</p>
                <p>HARI/TANGGAL: ${getDayName(currentDate).toUpperCase()}, ${new Date(currentDate).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'}).toUpperCase()}</p>
            </div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 5%">No</th>
                        <th style="width: 15%">Jam</th>
                        <th style="width: 20%">Mata Pelajaran</th>
                        <th style="width: 20%">Materi / Topik</th>
                        <th style="width: 40%">Kegiatan Pembelajaran</th>
                        <th style="width: 10%">Ket.</th>
                    </tr>
                </thead>
                <tbody>
                    ${draftData.map((row, idx) => `
                        <tr>
                            <td style="text-align: center">${idx + 1}</td>
                            <td>${row.timeSlot || ''}</td>
                            <td>${row.subject || ''}</td>
                            <td>${row.topic || ''}</td>
                            <td>${row.activities || ''}</td>
                            <td>${row.followUp ? 'TL: '+row.followUp : (row.reflection ? 'Ref: '+row.reflection : '')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            ${signatureBlock}
        `;
    } else {
        const weekContent = weekDates.map(dateStr => {
            const rows = getRowsForDate(dateStr);
            if (rows.length === 0) return '';
            
            return `
                <div style="page-break-inside: avoid; margin-bottom: 20px;">
                    <div style="font-weight: bold; margin-bottom: 5px; border-bottom: 1px solid #000; padding-bottom: 2px;">
                        ${getDayName(dateStr)}, ${new Date(dateStr).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 5%">No</th>
                                <th style="width: 10%">Jam</th>
                                <th style="width: 15%">Mapel</th>
                                <th style="width: 15%">Materi</th>
                                <th style="width: 25%">Kegiatan</th>
                                <th style="width: 10%">Evaluasi</th>
                                <th style="width: 10%">Refleksi</th>
                                <th style="width: 10%">Tindak Lanjut</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows.map((row, idx) => `
                                <tr>
                                    <td style="text-align: center">${idx + 1}</td>
                                    <td>${row.timeSlot || ''}</td>
                                    <td>${row.subject || ''}</td>
                                    <td>${row.topic || ''}</td>
                                    <td>${row.activities || ''}</td>
                                    <td>${row.evaluation || ''}</td>
                                    <td>${row.reflection || ''}</td>
                                    <td>${row.followUp || ''}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }).join('');

        content = `
            <div class="print-header">
                <h2>JURNAL PEMBELAJARAN MINGGUAN</h2>
                <p>KELAS ${classId}</p>
                <p>PERIODE: ${currentMonday.toLocaleDateString('id-ID', {day:'numeric', month:'long'})} - ${currentSaturday.toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</p>
            </div>
            ${weekContent}
            ${signatureBlock}
        `;
    }
  
    const newWindow = window.open("", "", "width=1200,height=800");
  
    newWindow?.document.write(`
      <html>
        <head>
          <title>Jurnal Pembelajaran - Kelas ${classId}</title>
          <style>
            body { font-family: 'Times New Roman', Times, serif; padding: 20px; font-size: 10pt; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
            th, td { border: 1px solid black; padding: 4px; text-align: left; vertical-align: top; }
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

  // Navigation Handlers
  const handlePrev = () => {
      const d = new Date(currentDate);
      if (viewMode === 'daily') d.setDate(d.getDate() - 1);
      else d.setDate(d.getDate() - 7);
      setCurrentDate(d.toISOString().split('T')[0]);
  };

  const handleNext = () => {
      const d = new Date(currentDate);
      if (viewMode === 'daily') d.setDate(d.getDate() + 1);
      else d.setDate(d.getDate() + 7);
      setCurrentDate(d.toISOString().split('T')[0]);
  };

  const handleContextMenu = (e: React.MouseEvent, rowIndex: number) => {
    e.preventDefault();
    setContextMenu({ x: e.pageX, y: e.pageY, rowIndex });
  };

  const handleCopy = (rowIndex: number) => {
    const { id, date, day, subject, timeSlot, ...rest } = draftData[rowIndex];
    setCopiedRow(rest);
    showAlert('Baris disalin!', 'success');
  };

  const handlePaste = (rowIndex: number) => {
    if (!copiedRow) return;
    const newData = [...draftData];
    const originalRow = newData[rowIndex];
    newData[rowIndex] = { ...originalRow, ...copiedRow };
    setDraftData(newData);
  };

  const handleCopyYesterday = () => {
    if (isReadOnly) return;

    const yesterday = new Date(currentDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const yesterdaySavedEntries = entries.filter(e => e.date === yesterdayStr);

    if (yesterdaySavedEntries.length === 0) {
      showAlert('Tidak ada data jurnal tersimpan dari hari kemarin untuk disalin.', 'error');
      return;
    }

    const todayScheduledRows = getRowsForDate(currentDate);

    const newDraft = todayScheduledRows.map(todayRow => {
      const correspondingYesterdayEntry = yesterdaySavedEntries.find(
        yesterdayEntry => yesterdayEntry.subject === todayRow.subject && yesterdayEntry.timeSlot === todayRow.timeSlot
      );

      if (correspondingYesterdayEntry) {
        const { id, date, day, ...dataToCopy } = correspondingYesterdayEntry;
        return {
          ...todayRow, // Keep today's date, day, id
          ...dataToCopy, // Copy topic, activities, etc.
        };
      }
      return todayRow; // Keep today's scheduled row as is if no match
    });

    setDraftData(newDraft);
    showAlert(`Berhasil menyalin data dari jurnal kemarin.`, 'success');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {contextMenu && (
        <div style={{ top: contextMenu.y, left: contextMenu.x }} className="absolute z-50 bg-white border border-gray-200 rounded-md shadow-lg py-1 w-48">
          <button onClick={() => handleCopy(contextMenu.rowIndex)} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Salin</button>
          <button onClick={() => handlePaste(contextMenu.rowIndex)} disabled={!copiedRow} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50">Tempel</button>
          <div className="border-t my-1"></div>
          <button onClick={() => removeRow(contextMenu.rowIndex)} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Hapus Baris Ini</button>
        </div>
      )}
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
            <div>
                <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                    <NotebookPen className="mr-2 text-indigo-600" /> Jurnal Pembelajaran
                </h2>
                <p className="text-gray-500 text-sm">Catatan harian aktivitas belajar mengajar di kelas.</p>
            </div>
            <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                <button 
                    onClick={() => setViewMode('daily')}
                    className={`flex items-center px-3 py-1.5 rounded-md text-sm font-bold transition-colors ${viewMode === 'daily' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                    <LayoutList size={16} className="mr-2"/> Harian
                </button>
                <button 
                    onClick={() => setViewMode('weekly')}
                    className={`flex items-center px-3 py-1.5 rounded-md text-sm font-bold transition-colors ${viewMode === 'weekly' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                    <CalendarRange size={16} className="mr-2"/> Mingguan
                </button>
            </div>
            <div className="flex items-center gap-2">
                <button 
                    onClick={loadData} 
                    className="p-2 text-gray-500 hover:text-indigo-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                    title="Refresh Data"
                >
                    <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                </button>
                <button onClick={handlePrint} className="flex items-center gap-2 bg-white text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50">
                    <Printer size={18}/> Cetak
                </button>
            </div>
        </div>

        {/* Controls */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 no-print">
            <div className="flex items-center gap-3">
                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg p-1">
                    <button onClick={handlePrev} className="p-1 hover:bg-white rounded shadow-sm transition-colors text-gray-600 hover:text-indigo-600"><ChevronLeft size={20}/></button>
                    
                    <div className="relative mx-2 group">
                        {/* Hidden Input for Date Selection Flexibility */}
                        <input 
                            type="date" 
                            value={currentDate} 
                            onChange={(e) => setCurrentDate(e.target.value)} 
                            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                            title="Klik untuk memilih tanggal"
                        />
                        <div className="mx-2 text-sm font-bold text-gray-700 min-w-[200px] text-center px-4 py-1.5 rounded group-hover:bg-indigo-50 group-hover:text-indigo-700 transition-colors flex items-center justify-center border border-transparent group-hover:border-indigo-100">
                            <Calendar size={14} className="mr-2 opacity-50 group-hover:opacity-100"/>
                            {viewMode === 'daily' ? (
                                <>
                                    <span className="text-indigo-600 mr-2">{getDayName(currentDate)},</span>
                                    {new Date(currentDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </>
                            ) : (
                                <>
                                    {currentMonday.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - {currentSaturday.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </>
                            )}
                        </div>
                    </div>
                    
                    <button onClick={handleNext} className="p-1 hover:bg-white rounded shadow-sm transition-colors text-gray-600 hover:text-indigo-600"><ChevronRight size={20}/></button>
                </div>
            </div>

            {viewMode === 'daily' && (
                <div className="flex gap-2"> 
                    {!isReadOnly && (
                        <button onClick={addManualRow} className="flex items-center gap-2 bg-white text-indigo-600 border border-indigo-200 px-4 py-2 rounded-lg hover:bg-indigo-50 font-bold text-sm transition-colors">
                            <Plus size={16}/> Tambah Baris
                        </button>
                    )}
                    {!isReadOnly && (
                        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 font-bold text-sm shadow-md disabled:opacity-50 transition-all hover:shadow-lg transform active:scale-95">
                            {saving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>}
                            Simpan Jurnal
                        </button>
                    )}
                </div>
            )}
        </div>

        {/* --- DAILY VIEW --- */}
        {viewMode === 'daily' && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto print-container">
                <div className="hidden print-only p-4 text-center border-b">
                    <h2 className="text-xl font-bold uppercase">JURNAL PEMBELAJARAN KELAS</h2>
                    <p className="text-sm">Hari/Tanggal: {getDayName(currentDate)}, {new Date(currentDate).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
                </div>

                <table className="w-full text-sm text-left border-collapse min-w-[1200px]">
                    <thead>
                        <tr className="bg-gray-50 text-gray-700 font-bold uppercase text-xs print:bg-white print:border-b print:text-black">
                            <th className="p-3 border text-center w-10">No</th>
                            <th className="p-3 border w-32 min-w-[120px]">Jam</th>
                            <th className="p-3 border w-48">Mata Pelajaran</th>
                            <th className="p-3 border w-48">Materi / Topik</th>
                            <th className="p-3 border min-w-[300px]">Kegiatan Pembelajaran</th>
                            <th className="p-3 border w-40">Evaluasi</th>
                            <th className="p-3 border w-40">Refleksi</th>
                            <th className="p-3 border w-40">Tindak Lanjut</th>
                            {!isReadOnly && <th className="p-3 border w-10 text-center no-print"></th>}
                        </tr>
                    </thead>
                    <tbody className="align-top">
                        {draftData.length === 0 ? (
                            <tr><td colSpan={9} className="p-8 text-center text-gray-400 italic">Tidak ada jadwal atau jurnal untuk hari ini.</td></tr>
                        ) : (
                            draftData.map((row, idx) => {
                                const specialActivities = ['upacara', 'pembiasaan', 'literasi/numerasi', 'istirahat'];
                                const subjectLower = row.subject?.toLowerCase() || '';
                                const isSpecialActivity = specialActivities.some(activity => subjectLower.includes(activity));
                                const isBreak = subjectLower.includes('istirahat');
                                const disabled = !isRowEditable(row) || isSpecialActivity;
                                return (
                                <tr onContextMenu={(e) => handleContextMenu(e, idx)} key={row.id || idx} className={`transition-colors print:break-inside-avoid ${isBreak ? 'bg-orange-50/60' : 'hover:bg-indigo-50/20'}`}>
                                    <td className="p-3 border text-center text-gray-500">{idx + 1}</td>
                                    <td className="p-3 border"><input value={row.timeSlot || ''} onChange={e => updateDraft(idx, 'timeSlot', e.target.value)} className="w-full bg-transparent outline-none text-gray-700 placeholder-gray-300 font-medium" placeholder="07.00 - ..." disabled={disabled}/></td>
                                    <td className="p-3 border font-semibold"><div className="flex items-center">{isBreak && <Coffee size={14} className="mr-2 text-orange-600 no-print"/>}<input value={row.subject || ''} onChange={e => updateDraft(idx, 'subject', e.target.value)} className={`w-full bg-transparent outline-none text-gray-800 placeholder-gray-300 font-bold ${isBreak ? 'text-orange-700' : ''}`} placeholder="Mapel..." disabled={disabled}/></div></td>
                                    <td className="p-3 border">{isSpecialActivity ? <span className="text-gray-400">-</span> : <textarea value={row.topic || ''} onChange={e => updateDraft(idx, 'topic', e.target.value)} className="w-full bg-transparent outline-none resize-none text-gray-700 placeholder-gray-300 h-full min-h-[40px]" placeholder="Tulis materi..." rows={2} disabled={disabled}/>}</td>
                                    <td className="p-3 border">{isSpecialActivity ? <span className="text-gray-400">-</span> : 
                                        <div className="space-y-2">
                                            <div><label className="text-[10px] font-bold text-gray-400">Pendekatan</label><select value={row.pendekatan || ''} onChange={e => updateDraft(idx, 'pendekatan', e.target.value)} disabled={disabled} className="w-full bg-transparent text-xs outline-none p-1 border-b"><option value="">-Pilih-</option>{PENDEKATAN_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>
                                            <div><label className="text-[10px] font-bold text-gray-400">Model</label><select value={row.model || ''} onChange={e => updateDraft(idx, 'model', e.target.value)} disabled={disabled} className="w-full bg-transparent text-xs outline-none p-1 border-b"><option value="">-Pilih-</option>{MODEL_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400">Metode</label>
                                                <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1">
                                                    {METODE_OPTIONS.map(opt => (
                                                        <label key={opt} className="flex items-center text-xs text-gray-600">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={(row.metode || []).includes(opt)}
                                                                onChange={() => handleMetodeChange(idx, opt)}
                                                                disabled={disabled}
                                                                className="mr-1 h-3 w-3 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                            />
                                                            {opt}
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                            <textarea value={row.activities || ''} readOnly className="mt-2 w-full bg-gray-50/50 p-1 text-[10px] text-gray-500 rounded border-none outline-none resize-none" rows={3}/>
                                        </div>
                                    }</td>
                                    <td className="p-3 border">{isSpecialActivity ? <span className="text-gray-400">-</span> : 
                                        <select value={row.evaluation || ''} onChange={e => updateDraft(idx, 'evaluation', e.target.value)} disabled={disabled} className="w-full bg-transparent outline-none text-gray-700 placeholder-gray-300 font-medium p-1 border-b">
                                            {Object.entries(EVALUASI_OPTIONS).map(([group, options]) => (
                                                <optgroup label={group} key={group}>
                                                    {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                </optgroup>
                                            ))}
                                        </select>
                                    }</td>
                                    <td className="p-3 border">{isSpecialActivity ? <span className="text-gray-400">-</span> : 
                                        <textarea value={row.reflection || ''} onChange={e => updateDraft(idx, 'reflection', e.target.value)} className="w-full bg-transparent outline-none resize-none text-gray-700 placeholder-gray-300 h-full min-h-[40px]" placeholder="Refleksi..." rows={5} disabled={disabled}/>
                                    }</td>
                                    <td className="p-3 border">{isSpecialActivity ? <span className="text-gray-400">-</span> : 
                                        <textarea value={row.followUp || ''} onChange={e => updateDraft(idx, 'followUp', e.target.value)} className="w-full bg-transparent outline-none resize-none text-gray-700 placeholder-gray-300 h-full min-h-[40px]" placeholder="Tindak Lanjut..." rows={5} disabled={disabled}/>
                                    }</td>
                                    {!isReadOnly && (<td className="p-3 border text-center no-print align-middle"><button onClick={() => removeRow(idx)} className={`transition-colors ${disabled ? 'text-gray-200 cursor-not-allowed' : 'text-gray-300 hover:text-red-500'}`} disabled={disabled}><Trash2 size={16} /></button></td>)}
                                </tr>
                            )})
                        )}
                    </tbody>
                </table>
            </div>
        )}

        {/* --- WEEKLY VIEW --- */}
        {viewMode === 'weekly' && (
            <div className="space-y-8 print-container">
                <div className="hidden print-only text-center border-b pb-4 mb-4">
                    <h2 className="text-xl font-bold uppercase">JURNAL PEMBELAJARAN MINGGUAN</h2>
                    <p className="text-sm uppercase">PERIODE: {currentMonday.toLocaleDateString('id-ID', {day:'numeric', month:'long'})} - {currentSaturday.toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</p>
                </div>

                {weekDates.map((dateStr) => {
                    const dayName = getDayName(dateStr);
                    const rows = getRowsForDate(dateStr);
                    
                    if (rows.length === 0) return null;

                    return (
                        <div key={dateStr} className="break-inside-avoid">
                            <div className="bg-indigo-50 px-4 py-2 border border-indigo-100 rounded-t-xl font-bold text-indigo-800 text-sm flex justify-between items-center print:bg-gray-100 print:text-black print:border-gray-400">
                                <span>{dayName}, {new Date(dateStr).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</span>
                            </div>
                            <div className="bg-white border-x border-b border-gray-200 rounded-b-xl shadow-sm overflow-hidden mb-6 print:border-gray-400 print:shadow-none">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-white border-b border-gray-100 text-gray-500 print:border-gray-400 print:text-black">
                                        <tr>
                                            <th className="p-2 w-24 min-w-[100px]">Jam</th>
                                            <th className="p-2 w-40">Mata Pelajaran</th>
                                            <th className="p-2 w-40">Materi</th>
                                            <th className="p-2">Kegiatan Pembelajaran</th>
                                            <th className="p-2 w-32">Evaluasi</th>
                                            <th className="p-2 w-32">Refleksi</th>
                                            <th className="p-2 w-32">Tindak Lanjut</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 print:divide-gray-400">
                                        {rows.map((row, rIdx) => {
                                            const isBreak = row.subject?.toLowerCase().includes('istirahat');
                                            return (
                                            <tr key={rIdx} className={isBreak ? 'bg-orange-50/60' : ''}>
                                                <td className="p-2 align-top text-gray-500">{row.timeSlot || '-'}</td>
                                                <td className={`p-2 align-top font-semibold ${isBreak ? 'text-orange-700' : ''}`}>
                                                    {isBreak && <Coffee size={12} className="inline mr-1 text-orange-600 no-print"/>}
                                                    {row.subject}
                                                </td>
                                                <td className="p-2 align-top">{row.topic || '-'}</td>
                                                <td className="p-2 align-top">{row.activities || '-'}</td>
                                                <td className="p-2 align-top text-gray-600">{row.evaluation || '-'}</td>
                                                <td className="p-2 align-top text-gray-600">{row.reflection || '-'}</td>
                                                <td className="p-2 align-top text-gray-600">{row.followUp || '-'}</td>
                                            </tr>
                                        )})}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })}
                {weekDates.every(d => getRowsForDate(d).length === 0) && (
                    <div className="text-center py-12 text-gray-400 italic bg-gray-50 rounded-xl border-dashed border-2">
                        Tidak ada data jurnal atau jadwal untuk minggu ini.
                    </div>
                )}
            </div>
        )}
        
        {/* Footer info */}
        {viewMode === 'daily' && (
            <div className="mt-4 text-xs text-gray-400 italic no-print flex items-center gap-2">
                <span>* Mata pelajaran otomatis terisi sesuai jadwal hari ini ({getDayName(currentDate)}). Anda dapat menambah baris manual jika diperlukan.</span>
            </div>
        )}
    </div>
  );
};

export default LearningJournalView;