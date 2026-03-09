
import React, { useState, useEffect, useRef } from 'react';
import { Student, SikapAssessment, KarakterAssessment, SIKAP_INDICATORS, KARAKTER_INDICATORS, SikapIndicatorKey, KarakterIndicatorKey } from '../types';
import * as XLSX from 'xlsx';
import { Save, FileSpreadsheet, Printer, Upload, Download, Smile, Heart, Loader2, CheckSquare, Settings } from 'lucide-react';

interface AttitudeViewProps {
  students: Student[];
  initialSikap: SikapAssessment[];
  initialKarakter: KarakterAssessment[];
  onSaveSikap: (studentId: string, assessment: Omit<SikapAssessment, 'studentId' | 'classId'>) => void;
  onSaveKarakter: (studentId: string, assessment: Omit<KarakterAssessment, 'studentId' | 'classId'>) => void;
  onShowNotification: (message: string, type: 'success' | 'error' | 'warning') => void;
  classId: string;
  isReadOnly?: boolean;
}

const AttitudeView: React.FC<AttitudeViewProps> = ({ students, initialSikap, initialKarakter, onSaveSikap, onSaveKarakter, onShowNotification, classId, isReadOnly = false }) => {
  const [activeTab, setActiveTab] = useState<'sikap' | 'karakter'>('sikap');
  const [sikapData, setSikapData] = useState<SikapAssessment[]>(initialSikap);
  const [karakterData, setKarakterData] = useState<KarakterAssessment[]>(initialKarakter);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // -- DPL Selection State --
  const [selectedIndicators, setSelectedIndicators] = useState<SikapIndicatorKey[]>(Object.keys(SIKAP_INDICATORS) as SikapIndicatorKey[]);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  useEffect(() => setSikapData(initialSikap), [initialSikap]);
  useEffect(() => setKarakterData(initialKarakter), [initialKarakter]);

  // --- Sikap Helpers ---
  const getSikapPredicate = (score: number) => {
    if (score >= 3.51) return { text: 'Sangat Baik (SB)', color: 'bg-blue-100 text-blue-800' };
    if (score >= 2.51) return { text: 'Baik (B)', color: 'bg-green-100 text-green-800' };
    if (score >= 1.51) return { text: 'Cukup (C)', color: 'bg-yellow-100 text-yellow-800' };
    if (score >= 1.00) return { text: 'Kurang (K)', color: 'bg-red-100 text-red-800' };
    return { text: '-', color: 'bg-gray-100 text-gray-800' };
  };

  const getStudentSikap = (studentId: string): SikapAssessment => {
    return sikapData.find(s => s.studentId === studentId) || { studentId, classId, keimanan: 0, kewargaan: 0, penalaranKritis: 0, kreativitas: 0, kolaborasi: 0, kemandirian: 0, kesehatan: 0, komunikasi: 0 };
  };

  const updateSikap = (studentId: string, indicator: SikapIndicatorKey, value: number) => {
    setSikapData(prev => {
        const existing = prev.find(s => s.studentId === studentId);
        if (existing) {
            return prev.map(s => s.studentId === studentId ? { ...s, [indicator]: value } : s);
        }
        const newEntry: SikapAssessment = { studentId, classId, keimanan: 0, kewargaan: 0, penalaranKritis: 0, kreativitas: 0, kolaborasi: 0, kemandirian: 0, kesehatan: 0, komunikasi: 0, [indicator]: value };
        return [...prev, newEntry];
    });
  };

  const calculateSikapAverage = (assessment: SikapAssessment) => {
      if (selectedIndicators.length === 0) return 0;
      const sum = selectedIndicators.reduce((acc, key) => acc + (assessment[key] || 0), 0);
      const avg = sum / selectedIndicators.length;
      return parseFloat(avg.toFixed(2));
  };

  const toggleIndicator = (key: SikapIndicatorKey) => {
      setSelectedIndicators(prev => {
          if (prev.includes(key)) return prev.filter(k => k !== key);
          return [...prev, key];
      });
  };

  // --- Karakter Helpers ---
  const getStudentKarakter = (studentId: string): KarakterAssessment => {
    return karakterData.find(k => k.studentId === studentId) || { 
        studentId, classId, 
        bangunPagi: '', beribadah: '', berolahraga: '', makanSehat: '', gemarBelajar: '', bermasyarakat: '', tidurAwal: '', catatan: '', afirmasi: ''
    };
  };

  const updateKarakter = (studentId: string, indicator: KarakterIndicatorKey, value: string) => {
    setKarakterData(prev => {
        const existing = prev.find(k => k.studentId === studentId);
        if (existing) {
            return prev.map(k => k.studentId === studentId ? { ...k, [indicator]: value } : k);
        }
        const newEntry: KarakterAssessment = { 
            studentId, classId, 
            bangunPagi: '', beribadah: '', berolahraga: '', makanSehat: '', gemarBelajar: '', bermasyarakat: '', tidurAwal: '', catatan: '', afirmasi: '',
            [indicator]: value 
        };
        return [...prev, newEntry];
    });
  };

  const updateKarakterNotes = (studentId: string, value: string) => {
      setKarakterData(prev => {
          const existing = prev.find(k => k.studentId === studentId);
          if (existing) {
              return prev.map(k => k.studentId === studentId ? { ...k, catatan: value } : k);
          }
          return [...prev, { studentId, classId, bangunPagi: '', beribadah: '', berolahraga: '', makanSehat: '', gemarBelajar: '', bermasyarakat: '', tidurAwal: '', catatan: value }];
      });
  };

  const countTerbiasa = (assessment: KarakterAssessment) => {
      let count = 0;
      const keys = Object.keys(KARAKTER_INDICATORS) as KarakterIndicatorKey[];
      keys.forEach(key => {
          if (assessment[key] === 'Terbiasa') count++;
      });
      return count;
  };

  // --- General Handlers ---
  const handleSaveAll = async () => {
    setIsSavingAll(true);
    try {
      if (activeTab === 'sikap') {
        for (const assessment of sikapData) {
          const { studentId, classId, ...dataToSave } = assessment;
          await onSaveSikap(studentId, dataToSave);
        }
      } else {
        for (const assessment of karakterData) {
          const { studentId, classId, ...dataToSave } = assessment;
          await onSaveKarakter(studentId, dataToSave);
        }
      }
      onShowNotification('Semua data berhasil disimpan!', 'success');
    } catch (e) {
      onShowNotification('Terjadi kesalahan saat menyimpan.', 'error');
    } finally {
      setIsSavingAll(false);
    }
  };

  const handlePrint = () => window.print();
  const handleExport = () => { /* Implement Export Logic */ };
  const handleImport = () => fileInputRef.current?.click();

  return (
    <div className="space-y-6 animate-fade-in page-landscape">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Penilaian DPL & 7KAIH</h2>
          <p className="text-gray-500">Formulir penilaian formatif untuk aspek non-akademis.</p>
        </div>
        <div className="flex items-center gap-2">
            <input type="file" ref={fileInputRef} className="hidden" />
            <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm mr-2">
              <button onClick={() => setActiveTab('sikap')} className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'sikap' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}><Smile size={16} /><span>DPL</span></button>
              <button onClick={() => setActiveTab('karakter')} className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'karakter' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}><Heart size={16} /><span>7 Kebiasaan</span></button>
            </div>
            <div className="flex gap-1">
                {!isReadOnly && (
                  <button onClick={handleSaveAll} disabled={isSavingAll} className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 shadow-md font-bold disabled:opacity-50">
                      {isSavingAll ? <Loader2 className="animate-spin"/> : <Save size={18}/>} <span className="hidden sm:inline">{isSavingAll ? 'Proses...' : 'Simpan Semua'}</span>
                  </button>
                )}
                <button onClick={handlePrint} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50" title="Cetak"><Printer size={18}/></button>
            </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-visible print-container relative">
        {activeTab === 'sikap' && (
            <>
                <div className="p-4 border-b bg-gray-50 no-print flex justify-between items-center">
                    <h3 className="font-bold text-gray-700">Dimensi 8 Profil Lulusan</h3>
                    <div className="relative">
                        <button 
                            onClick={() => setIsSelectorOpen(!isSelectorOpen)} 
                            className="flex items-center space-x-2 bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-sm"
                        >
                            <Settings size={14}/> <span>Pilih Indikator</span>
                        </button>
                        
                        {isSelectorOpen && (
                            <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-20 p-3 animate-fade-in-up">
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Pilih Indikator Penilaian</h4>
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {(Object.keys(SIKAP_INDICATORS) as SikapIndicatorKey[]).map((key) => (
                                        <label key={key} className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedIndicators.includes(key)} 
                                                onChange={() => toggleIndicator(key)}
                                                className="rounded text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span>{SIKAP_INDICATORS[key]}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto pb-4">
                    <table className="w-full text-xs text-left border-collapse min-w-[1000px]">
                        <thead className="bg-slate-50 text-slate-700 font-bold sticky top-0">
                            <tr className="border-b">
                                <th className="p-2 border sticky left-0 bg-slate-50 z-10 w-48">Nama Siswa</th>
                                {selectedIndicators.map(key => (
                                    <th key={key} className="p-2 border text-center">{SIKAP_INDICATORS[key]}</th>
                                ))}
                                <th className="p-2 border text-center bg-indigo-50 w-20">Rata-rata</th>
                                <th className="p-2 border text-center bg-indigo-50 w-24">Predikat</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {students.map(student => {
                                const assessment = getStudentSikap(student.id);
                                const avg = calculateSikapAverage(assessment);
                                const predicate = getSikapPredicate(avg);
                                
                                return (
                                <tr key={student.id} className="hover:bg-gray-50">
                                    <td className="p-2 border font-medium sticky left-0 bg-white z-10 group-hover:bg-gray-50">{student.name}</td>
                                    {selectedIndicators.map(key => {
                                        const value = assessment[key] || 0;
                                        return (
                                            <td key={key} className="p-1 border text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    {[1,2,3,4].map(score => (
                                                        <button 
                                                            key={score} 
                                                            onClick={() => !isReadOnly && updateSikap(student.id, key, score)} 
                                                            disabled={isReadOnly}
                                                            className={`w-6 h-6 rounded-full text-xs font-bold transition-transform ${!isReadOnly ? 'hover:scale-110' : ''} ${value === score ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'} ${isReadOnly ? 'cursor-not-allowed' : ''}`}
                                                        >
                                                            {score}
                                                        </button>
                                                    ))}
                                                </div>
                                            </td>
                                        );
                                    })}
                                    <td className="p-2 border text-center font-bold bg-indigo-50 text-indigo-700">{avg > 0 ? avg : '-'}</td>
                                    <td className="p-2 border text-center font-bold bg-indigo-50">
                                        <span className={`px-2 py-0.5 rounded text-[10px] ${predicate.color}`}>{predicate.text}</span>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </>
        )}

        {activeTab === 'karakter' && (
             <>
             <div className="p-4 border-b bg-gray-50 no-print">
                <h3 className="font-bold text-gray-700">7 Kebiasaan Anak Indonesia Hebat</h3>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse min-w-[1200px]">
                    <thead className="bg-slate-50 text-slate-700 font-bold sticky top-0">
                        <tr className="border-b">
                            <th className="p-3 border sticky left-0 bg-slate-50 z-10 w-48">Nama Siswa</th>
                            {Object.values(KARAKTER_INDICATORS).map(label => (
                                <th key={label} className="p-3 border text-center min-w-[120px]">{label}</th>
                            ))}
                            <th className="p-3 border text-center bg-indigo-50 w-24">Skor</th>
                            <th className="p-3 border text-left bg-fuchsia-50 min-w-[200px]">Afirmasi Positif</th>
                            <th className="p-3 border text-left bg-yellow-50 min-w-[200px]">Catatan Guru</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {students.map(student => {
                            const assessment = getStudentKarakter(student.id);
                            const score = countTerbiasa(assessment);
                            return (
                            <tr key={student.id} className="hover:bg-gray-50">
                                <td className="p-3 border font-medium sticky left-0 bg-white z-10 group-hover:bg-gray-50">{student.name}</td>
                                {(Object.keys(KARAKTER_INDICATORS) as KarakterIndicatorKey[]).map(key => (
                                    <td key={key} className="p-1 border text-center">
                                        <select 
                                            value={assessment[key] || ''}
                                            onChange={(e) => !isReadOnly && updateKarakter(student.id, key, e.target.value)}
                                            disabled={isReadOnly}
                                            className={`w-full p-2 rounded text-xs font-semibold outline-none appearance-none text-center transition-colors ${
                                                isReadOnly ? 'cursor-not-allowed' : 'cursor-pointer'
                                            } ${
                                                assessment[key] === 'Terbiasa' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                                                assessment[key] === 'Belum Terbiasa' ? 'bg-gray-100 text-gray-500 border border-gray-200' :
                                                'bg-white border border-dashed border-gray-300 text-gray-400'
                                            }`}
                                        >
                                            <option value="">- Pilih -</option>
                                            <option value="Terbiasa">Terbiasa</option>
                                            <option value="Belum Terbiasa">Belum</option>
                                        </select>
                                    </td>
                                ))}
                                <td className="p-1 border bg-indigo-50 text-center font-bold text-indigo-700">
                                    {score} / 7
                                </td>
                                <td className="p-2 border bg-fuchsia-50 text-fuchsia-800 italic">
                                    "{assessment.afirmasi || '-'}"
                                </td>
                                <td className="p-1 border bg-yellow-50">
                                    <textarea 
                                        rows={1}
                                        value={assessment.catatan || ''}
                                        onChange={(e) => !isReadOnly && updateKarakterNotes(student.id, e.target.value)}
                                        disabled={isReadOnly}
                                        className={`w-full bg-transparent border-none outline-none resize-none text-gray-700 placeholder-gray-400 focus:bg-white focus:ring-1 focus:ring-yellow-300 rounded p-1 ${isReadOnly ? 'cursor-not-allowed' : ''}`}
                                        placeholder={isReadOnly ? '' : "Tulis catatan..."}
                                    />
                                </td>
                            </tr>
                        )})}
                    </tbody>
                </table>
             </div>
             </>
        )}
      </div>
    </div>
  );
};

export default AttitudeView;
