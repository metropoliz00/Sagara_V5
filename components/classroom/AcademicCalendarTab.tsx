import React, { useState, useEffect, useMemo } from 'react';
import { AcademicCalendarData, Holiday } from '../../types';
import { Calendar, Save, Loader2, RefreshCw, AlertTriangle, X, Lock, Edit2 } from 'lucide-react';
import { CALENDAR_CODES, PREFILLED_CALENDAR_2025, HOLIDAY_DESCRIPTIONS_2025_2026 } from '../../constants';

interface AcademicCalendarTabProps {
  initialData: AcademicCalendarData;
  onSave: (data: AcademicCalendarData) => Promise<void>;
  onAddHoliday: (holidays: Omit<Holiday, 'id'>[]) => Promise<void>;
  onShowNotification: (message: string, type: 'success' | 'error' | 'warning') => void;
  classId: string;
  isReadOnly?: boolean; // NEW PROP
}

const HOLIDAY_CODES = ['LHB', 'LU', 'LS1', 'LS2', 'CB', 'LHR'];

// ... (Holiday Descriptions and Prefilled Data remain the same)

const AcademicCalendarTab: React.FC<AcademicCalendarTabProps> = ({ initialData, onSave, onAddHoliday, onShowNotification, classId, isReadOnly = false }) => {
  const [startYear, setStartYear] = useState(2025);
  const [localData, setLocalData] = useState<AcademicCalendarData>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isActionsVisible, setIsActionsVisible] = useState(true);
  const [isLegendVisible, setIsLegendVisible] = useState(true);
  const [editingDescription, setEditingDescription] = useState<{date: string, code: string, currentDesc: string, defaultDesc: string} | null>(null);

  useEffect(() => {
    // Prioritaskan data dari backend.
    if (initialData && Object.keys(initialData).length > 0) {
      setLocalData(initialData);
    } 
    // Jika tidak ada data backend, putuskan apakah akan mengisi data contoh atau mengosongkan.
    else {
      // Hanya isi data contoh untuk tahun ajaran default sebagai titik awal.
      if (startYear === 2025) {
        setLocalData(PREFILLED_CALENDAR_2025);
      } else {
        // Untuk tahun ajaran lain yang tidak memiliki data, pastikan kalender kosong.
        setLocalData({});
      }
    }
  }, [initialData, startYear]);

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStartYear(Number(e.target.value));
  };
  
  const academicYearMonths = Array.from({ length: 12 }, (_, i) => {
    const month = (i + 6) % 12;
    const year = startYear + Math.floor((i + 6) / 12);
    return { year, month }; // month is 0-indexed
  });

  const handleCellChange = (year: number, month: number, day: number, value: string) => {
    if (isReadOnly) return; // Prevent edits in read-only mode
    
    const yearMonthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    const dayIndex = day - 1;

    setLocalData(prev => {
      const newData = { ...prev };
      if (!newData[yearMonthKey]) {
        newData[yearMonthKey] = Array(31).fill(null);
      }
      const newMonthData = [...newData[yearMonthKey]];
      newMonthData[dayIndex] = value.toUpperCase();
      newData[yearMonthKey] = newMonthData;
      return newData;
    });
  };

  const handleSaveCalendar = async () => {
    if (isReadOnly) return;
    setIsSaving(true);
    await onSave(localData);
    setIsSaving(false);
  };
  
  const handleSyncHolidays = async () => {
      if (isReadOnly) return;
      setIsSyncing(true);
      
      const newHolidays: Omit<Holiday, 'id'>[] = [];
      
      for (const yearMonthKey in localData) {
          if (yearMonthKey === '__descriptions__') continue;
          const [year, month] = yearMonthKey.split('-').map(Number);
          const dayContents = localData[yearMonthKey];
          
          dayContents.forEach((content: any, index: number) => {
              const day = index + 1;
              // FILTER UPDATE: Exclude 'LU' (Libur Umum/Minggu) from being synced to database
              if (content && HOLIDAY_CODES.includes(content) && content !== 'LU') {
                  const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const specificDescription = localData.__descriptions__?.[date] || HOLIDAY_DESCRIPTIONS_2025_2026[date];
                  const codeInfo = CALENDAR_CODES[content];
                  
                  newHolidays.push({
                      classId: "__SCHOOL_WIDE__",
                      date: date,
                      description: specificDescription || codeInfo.label,
                      type: codeInfo.type as Holiday['type'],
                  });
              }
          });
      }

      try {
          await onAddHoliday(newHolidays);
          onShowNotification(`${newHolidays.length} hari libur disinkronkan. Data duplikat akan diabaikan.`, 'success');
      } catch (e) {
          onShowNotification("Gagal menyinkronkan hari libur.", "error");
      } finally {
          setIsSyncing(false);
      }
  };

  const handleDescriptionChange = (date: string, description: string) => {
      setLocalData(prev => ({
          ...prev,
          __descriptions__: {
              ...(prev.__descriptions__ || {}),
              [date]: description
          }
      }));
  };

  const holidayDates = useMemo(() => {
      const dates: { date: string, code: string, defaultDesc: string, customDesc?: string }[] = [];
      for (const yearMonthKey in localData) {
          if (yearMonthKey === '__descriptions__') continue;
          const [year, month] = yearMonthKey.split('-').map(Number);
          const dayContents = localData[yearMonthKey] as (string | null)[];
          if (!dayContents) continue;
          
          dayContents.forEach((content, index) => {
              const day = index + 1;
              if (content && HOLIDAY_CODES.includes(content) && content !== 'LU') {
                  const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  dates.push({
                      date,
                      code: content,
                      defaultDesc: HOLIDAY_DESCRIPTIONS_2025_2026[date] || CALENDAR_CODES[content]?.label || '',
                      customDesc: localData.__descriptions__?.[date]
                  });
              }
          });
      }
      return dates.sort((a, b) => a.date.localeCompare(b.date));
  }, [localData]);

  return (
    <div className="flex flex-col xl:flex-row gap-6">
        <div className="flex-1 bg-white p-4 rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
            <div className="flex justify-between items-center mb-4 no-print">
                <div className="flex items-center gap-2">
                    <label htmlFor="year-select" className="font-bold text-gray-700">Tahun Ajaran:</label>
                    <select id="year-select" value={startYear} onChange={handleYearChange} className="p-2 border rounded-lg font-semibold">
                        {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}/{y+1}</option>)}
                    </select>
                </div>
                {isReadOnly && (
                    <div className="bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg border border-amber-200 text-xs font-bold flex items-center">
                        <Lock size={14} className="mr-1.5"/> Read Only (Global)
                    </div>
                )}
            </div>

            <table className="w-full border-collapse text-[10px] min-w-[1200px]">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="p-1 border text-left font-bold w-24">Bulan</th>
                        {Array.from({length: 31}, (_, i) => i + 1).map(day => (
                            <th key={day} className="p-1 border font-bold text-center w-8">{day}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {academicYearMonths.map(({ year, month }) => {
                        const monthName = new Date(year, month).toLocaleString('id-ID', { month: 'long' });
                        const daysInMonth = new Date(year, month + 1, 0).getDate();
                        const yearMonthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
                        const monthData = localData[yearMonthKey] || [];

                        return (
                            <tr key={yearMonthKey}>
                                <td className="p-1 border font-bold bg-gray-50 uppercase">{monthName} {year}</td>
                                {Array.from({length: 31}, (_, i) => i + 1).map(day => {
                                    const isDisabled = day > daysInMonth;
                                    const content = monthData[day - 1] || '';
                                    const codeInfo = CALENDAR_CODES[content];
                                    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                    const specificDescription = localData.__descriptions__?.[dateString] || HOLIDAY_DESCRIPTIONS_2025_2026[dateString];
                                    let tooltipText = '';
                                    if (codeInfo) {
                                        tooltipText = specificDescription || codeInfo.label;
                                    }

                                    return (
                                        <td key={day} className={`p-0 border relative group ${isDisabled ? 'bg-gray-200' : ''}`} title={tooltipText}>
                                            {!isDisabled && (
                                                <>
                                                    <input
                                                        type="text"
                                                        value={content}
                                                        onChange={(e) => handleCellChange(year, month, day, e.target.value)}
                                                        onDoubleClick={() => {
                                                            if (isReadOnly || !codeInfo || content === 'LU') return;
                                                            setEditingDescription({
                                                                date: dateString,
                                                                code: content,
                                                                currentDesc: localData.__descriptions__?.[dateString] || '',
                                                                defaultDesc: HOLIDAY_DESCRIPTIONS_2025_2026[dateString] || codeInfo.label
                                                            });
                                                        }}
                                                        className={`w-full h-full text-center outline-none focus:ring-2 focus:ring-indigo-500 font-bold ${codeInfo ? codeInfo.color : 'bg-white text-gray-700'} ${isReadOnly ? 'cursor-not-allowed' : ''}`}
                                                        disabled={isReadOnly}
                                                    />
                                                    {codeInfo && content !== 'LU' && !isReadOnly && (
                                                        <div 
                                                            className="absolute -top-1 -right-1 bg-white rounded-full shadow cursor-pointer hidden group-hover:flex items-center justify-center border border-gray-300 p-0.5 z-10 w-4 h-4"
                                                            onClick={() => {
                                                                setEditingDescription({
                                                                    date: dateString,
                                                                    code: content,
                                                                    currentDesc: localData.__descriptions__?.[dateString] || '',
                                                                    defaultDesc: HOLIDAY_DESCRIPTIONS_2025_2026[dateString] || codeInfo.label
                                                                });
                                                            }}
                                                            title="Edit Keterangan"
                                                        >
                                                            <Edit2 size={10} className="text-indigo-600" />
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
        <div className="xl:w-72 shrink-0 space-y-4 no-print">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                 <div className="flex justify-between items-center mb-3 border-b pb-2">
                    <h3 className="font-bold text-gray-800">Aksi Cepat</h3>
                    <button onClick={() => setIsActionsVisible(!isActionsVisible)} className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full" title={isActionsVisible ? "Sembunyikan" : "Tampilkan"}>
                        <X size={16} />
                    </button>
                 </div>
                 {isActionsVisible && (
                    <>
                        <div className="space-y-2">
                            {/* Hide Buttons if Read Only */}
                            {!isReadOnly ? (
                                <>
                                    <button onClick={handleSaveCalendar} disabled={isSaving} className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold px-4 py-2 rounded-lg shadow-md hover:bg-indigo-700 disabled:opacity-50">
                                        {isSaving ? <Loader2 className="animate-spin"/> : <Save size={16}/>}
                                        {isSaving ? 'Menyimpan...' : 'Simpan Kalender'}
                                    </button>
                                    <button onClick={handleSyncHolidays} disabled={isSyncing} className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white font-bold px-4 py-2 rounded-lg shadow-md hover:bg-emerald-700 disabled:opacity-50">
                                        {isSyncing ? <Loader2 className="animate-spin"/> : <RefreshCw size={16}/>}
                                        {isSyncing ? 'Menyinkronkan...' : 'Sinkronkan ke Atur Libur'}
                                    </button>
                                </>
                            ) : (
                                <p className="text-xs text-gray-500 italic text-center">Anda hanya memiliki akses melihat kalender ini.</p>
                            )}
                        </div>
                        <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs text-amber-800 mt-4 flex items-start">
                            <AlertTriangle size={24} className="mr-2 shrink-0" />
                            <span>Kalender ini berlaku untuk semua kelas. Hanya Admin yang dapat mengubahnya.</span>
                        </div>
                    </>
                 )}
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-3 border-b pb-2">
                    <h3 className="font-bold text-gray-800">Keterangan Kode</h3>
                     <button onClick={() => setIsLegendVisible(!isLegendVisible)} className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full" title={isLegendVisible ? "Sembunyikan" : "Tampilkan"}>
                        <X size={16} />
                    </button>
                </div>
                {isLegendVisible && (
                    <div className="space-y-2">
                        {Object.entries(CALENDAR_CODES).map(([code, {label, color}]) => (
                            <div key={code} className="flex items-center gap-2 text-xs">
                                <span className={`w-12 text-center font-bold p-1 rounded ${color}`}>{code}</span>
                                <span className="text-gray-600">{label}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>

        {editingDescription && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md">
                    <h3 className="text-lg font-bold mb-4 text-gray-800">Edit Keterangan Libur</h3>
                    <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-600 mb-2 flex justify-between">
                            <span>Tanggal:</span>
                            <span className="font-semibold text-gray-800">{editingDescription.date}</span>
                        </p>
                        <p className="text-sm text-gray-600 flex justify-between items-center">
                            <span>Kode:</span>
                            <span className={`text-xs px-2 py-1 rounded-full font-bold ${CALENDAR_CODES[editingDescription.code]?.color || 'bg-gray-200 text-gray-700'}`}>
                                {editingDescription.code}
                            </span>
                        </p>
                    </div>
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Keterangan Khusus</label>
                        <input 
                            type="text" 
                            value={editingDescription.currentDesc} 
                            onChange={(e) => setEditingDescription({...editingDescription, currentDesc: e.target.value})}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            placeholder={editingDescription.defaultDesc}
                            autoFocus
                        />
                        <p className="text-xs text-gray-500 mt-2">
                            Kosongkan untuk menggunakan keterangan default: <br/>
                            <span className="italic">{editingDescription.defaultDesc}</span>
                        </p>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button 
                            onClick={() => setEditingDescription(null)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                        >
                            Batal
                        </button>
                        <button 
                            onClick={() => {
                                handleDescriptionChange(editingDescription.date, editingDescription.currentDesc);
                                setEditingDescription(null);
                            }}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-sm"
                        >
                            Simpan Keterangan
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default AcademicCalendarTab;
