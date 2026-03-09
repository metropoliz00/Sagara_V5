import React, { useState, useEffect } from 'react';
import { AcademicCalendarData, Holiday } from '../../types';
import { Calendar, Save, Loader2, RefreshCw, AlertTriangle, X, Lock } from 'lucide-react';
import { CALENDAR_CODES } from '../../constants';

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
const HOLIDAY_DESCRIPTIONS_2025_2026: { [key: string]: string } = {
  '2025-08-17': 'HUT Republik Indonesia',
  '2025-09-05': 'Maulud Nabi Muhammad SAW',
  '2025-12-25': 'Hari Raya Natal',
  '2026-01-01': 'Tahun Baru Masehi',
  '2026-01-16': "Isro' Mi'roj Nabi Muhammad SAW",
  '2026-02-17': 'Tahun Baru Imlek 2577',
  '2026-03-19': 'Hari Raya Nyepi Tahun Saka 1948',
  '2026-03-20': 'Hari Raya Idul Fitri 1447 H',
  '2026-03-21': 'Hari Raya Idul Fitri 1447 H',
  '2026-04-03': 'Wafat Yesus Kristus',
  '2026-05-01': 'Hari Buruh Internasional',
  '2026-05-14': 'Kenaikan Yesus Kristus',
  '2026-05-27': 'Hari Raya Idul Adha',
  '2026-05-31': 'Hari Raya Waisak 2570',
  '2026-06-01': 'Hari Lahir Pancasila',
  '2026-06-16': 'Tahun Baru Hijriyah 1448',
};

const PREFILLED_CALENDAR_2025: AcademicCalendarData = {
  '2025-07': [null,null,null,null,null,null,'LU',null,null,null,null,null,'LU','1','2','3','4','5','6','LU','7','8','9','10','11','12','LU','13','14','15','16'],
  '2025-08': ['17','18','LU','19','20','21','22','23','24','LU','25','26','27','28','29','30','LHB','31','32','33','34','35','36','LU','37','38','39','40','41','42','LU'],
  '2025-09': ['43','44','45','46','LHB','47','LU','48','49','50','51','52','53','LU','54','55','56','57','58','59','LU','60','61','62','63','64','65','LU','66','67',null],
  '2025-10': ['68','69','70','71','LU','72','73','74','KTS','KTS','KTS','LU','75','76','77','78','79','80','LU','81','82','83','84','85','86','LU','87','88','89','90','91'],
  '2025-11': ['92','LU','93','94','95','96','97','98','LU','99','100','101','102','103','104','105','106','LU','107','108','109','110','111','112','LU','113','114','115','116','LU',null],
  '2025-12': ['117','118','119','120','121','122','LU','123','124','125','126','127','128','LU','129','130','131','132','133','134','LU','LS1','LS1','LS1','LHB','CB','LS1','LU','LS1','LS1','LS1'],
  '2026-01': ['LHB','1','2','LU','3','4','5','6','7','8','LU','9','10','11','12','LHB','13','LU','14','15','16','17','18','19','LU','20','21','22','23','24','25'],
  '2026-02': ['LU','26','27','28','29','30','31','LU','32','33','34','35','36','37','LU','38','LHB','39','40','KPP','KPP','LU','KPP','KPP','CB','CB','LHR','LHR',null,null,null],
  '2026-03': ['LU','41','42','43','44','45','46','LU','47','48','49','50','51','52','LU','53','54','55','56','LHB','LHB','LHB','LU','CB','CB','LHR','LHR','LHR','LU','57','58','59'],
  '2026-04': ['60','61','LHB','LU','62','63','64','65','66','67','LU','68','69','70','71','72','73','LU','74','75','76','77','78','79','LU','80','81','82','83','84',null],
  '2026-05': ['LHB','85','LU','86','87','88','89','90','91','LU','92','93','94','LHB','95','96','LU','97','98','99','100','101','102','LU','103','104','LHB','105','106','107','LHB'],
  '2026-06': ['LHB','108','109','110','111','LU','112','113','114','115','116','117','LU','118','119','LHB','120','121','122','LU','LS2','LS2','LS2','LS2','LS2','LS2','LS2','LU','LS2','LS2',null],
  '2026-07': ['LS2','LS2','LS2','LS2','LS2','LU','LS2','LS2','LS2','LS2','LS2','LU',null,null,null,null,null,null,'LU',null,null,null,null,null,null,'LU',null,null,null,null,null],
};


const AcademicCalendarTab: React.FC<AcademicCalendarTabProps> = ({ initialData, onSave, onAddHoliday, onShowNotification, classId, isReadOnly = false }) => {
  const [startYear, setStartYear] = useState(2025);
  const [localData, setLocalData] = useState<AcademicCalendarData>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isActionsVisible, setIsActionsVisible] = useState(true);
  const [isLegendVisible, setIsLegendVisible] = useState(true);

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
          const [year, month] = yearMonthKey.split('-').map(Number);
          const dayContents = localData[yearMonthKey];
          
          dayContents.forEach((content, index) => {
              const day = index + 1;
              // FILTER UPDATE: Exclude 'LU' (Libur Umum/Minggu) from being synced to database
              if (content && HOLIDAY_CODES.includes(content) && content !== 'LU') {
                  const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const specificDescription = HOLIDAY_DESCRIPTIONS_2025_2026[date];
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
                                    const specificDescription = HOLIDAY_DESCRIPTIONS_2025_2026[dateString];
                                    let tooltipText = '';
                                    if (codeInfo) {
                                        tooltipText = specificDescription || codeInfo.label;
                                    }

                                    return (
                                        <td key={day} className={`p-0 border ${isDisabled ? 'bg-gray-200' : ''}`} title={tooltipText}>
                                            {!isDisabled && (
                                                <input
                                                    type="text"
                                                    value={content}
                                                    onChange={(e) => handleCellChange(year, month, day, e.target.value)}
                                                    className={`w-full h-full text-center outline-none focus:ring-2 focus:ring-indigo-500 font-bold ${codeInfo ? codeInfo.color : 'bg-white text-gray-700'} ${isReadOnly ? 'cursor-not-allowed' : ''}`}
                                                    disabled={isReadOnly}
                                                />
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
    </div>
  );
};

export default AcademicCalendarTab;
