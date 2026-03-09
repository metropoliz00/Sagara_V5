
import React, { useState, useRef, useMemo } from 'react';
import { Student, AgendaItem, Extracurricular } from '../types';
import * as XLSX from 'xlsx';
import { 
  Tent, Trophy, Music, Palette, Calendar, Users, 
  ListTodo, Plus, CheckSquare, X, CheckCircle, Trash2,
  Printer, FileSpreadsheet, Upload, Download, PenTool, User, Clock,
  Search, UserPlus, BookOpen, Monitor, AlertCircle
} from 'lucide-react';
import CustomModal from './CustomModal';

interface ActivitiesViewProps {
  students: Student[];
  agendas: AgendaItem[];
  extracurriculars?: Extracurricular[];
  onAddAgenda: (item: AgendaItem) => void;
  onToggleAgenda: (id: string) => void;
  onDeleteAgenda: (id: string) => void;
  onUpdateExtracurricular?: (item: Extracurricular) => void;
  onAddExtracurricular?: (item: Extracurricular) => void;
  onShowNotification: (message: string, type: 'success' | 'error' | 'warning') => void;
  classId: string;
}

type ActivityType = 'ekskul' | 'agenda';

// 9 Default Activities Configuration
const DEFAULT_ACTIVITIES = [
    { name: 'PRAMUKA', category: 'Wajib', icon: Tent },
    { name: 'TONGKLEK', category: 'Seni', icon: Music },
    { name: 'HADROH', category: 'Seni', icon: Music }, 
    { name: 'MENGGAMBAR', category: 'Seni', icon: Palette },
    { name: 'TARI', category: 'Seni', icon: Users },
    { name: 'KARATE', category: 'Olahraga', icon: Trophy },
    { name: 'PENCAK SILAT', category: 'Olahraga', icon: Trophy },
    { name: 'TAHFIDZ JUZ 30', category: 'Keagamaan', icon: Calendar },
    { name: 'TIK', category: 'Teknologi', icon: Monitor }, // Changed Bus to Monitor for TIK
];

const CATEGORY_OPTIONS = ['Wajib', 'Seni', 'Keagamaan', 'Olahraga', 'Teknologi'];

const ActivitiesView: React.FC<ActivitiesViewProps> = ({ 
  students, agendas, extracurriculars = [], 
  onAddAgenda, onToggleAgenda, onDeleteAgenda, onUpdateExtracurricular, onAddExtracurricular,
  onShowNotification, classId
}) => {
  const [activeTab, setActiveTab] = useState<ActivityType>('ekskul');
  const [editingActivity, setEditingActivity] = useState<Extracurricular | null>(null);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal State for confirmations
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, action: () => void, message: string}>({
      isOpen: false, action: () => {}, message: ''
  });

  const [newAgenda, setNewAgenda] = useState<{title: string; date: string; type: 'urgent'|'warning'|'info'}>({
    title: '', date: '', type: 'info'
  });

  // --- MERGE LOGIC: Combine DB Data with Defaults ---
  const displayActivities = useMemo(() => {
      // 1. Map Defaults: Check if they exist in DB (match by name)
      const mappedDefaults = DEFAULT_ACTIVITIES.map((def, index) => {
          // Normalize check
          const existing = extracurriculars.find(e => e.name.trim().toUpperCase() === def.name.toUpperCase());
          
          if (existing) {
              return { ...existing, isVirtual: false }; // It exists in DB
          }

          // Return a "Virtual" item (Placeholder)
          return {
              id: `virtual-${index}`, // Temp ID
              classId,
              name: def.name,
              category: def.category,
              schedule: '-',
              coach: '-',
              members: [],
              color: '', 
              isVirtual: true // Flag to indicate it's not saved yet
          } as Extracurricular & { isVirtual: boolean };
      });

      // 2. Find Custom Items (In DB but not in Defaults)
      const customItems = extracurriculars.filter(e => 
          !DEFAULT_ACTIVITIES.some(def => def.name.trim().toUpperCase() === e.name.trim().toUpperCase())
      ).map(e => ({ ...e, isVirtual: false }));

      return [...mappedDefaults, ...customItems];
  }, [extracurriculars, classId]);

  const getCategoryIcon = (category: string) => {
      switch (category) {
          case 'Wajib': return Tent;
          case 'Seni': return Palette;
          case 'Keagamaan': return BookOpen;
          case 'Olahraga': return Trophy;
          case 'Teknologi': return Monitor;
          default: return Users;
      }
  };

  const formatLongDate = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr + 'T00:00:00');
      if (isNaN(date.getTime())) return dateStr;
      return new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(date);
    } catch (e) {
      return dateStr;
    }
  };

  const submitAgenda = () => {
    if (newAgenda.title && newAgenda.date) {
      onAddAgenda({
        id: Date.now().toString(),
        classId, 
        title: newAgenda.title, date: newAgenda.date, type: newAgenda.type, completed: false
      });
      setNewAgenda({ title: '', date: '', type: 'info' });
    }
  };

  const handleAddNewActivity = () => {
      setEditingActivity({
          id: '', 
          classId: classId,
          name: '',
          category: 'Wajib', 
          schedule: '',
          coach: '',
          members: [],
          color: ''
      });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingActivity) return;

    // Check if it's a new item OR a virtual item being saved for the first time
    const isNew = !editingActivity.id || String(editingActivity.id).startsWith('virtual-');
    
    const activityToSave = { ...editingActivity };

    if (isNew && onAddExtracurricular) {
        if (!editingActivity.name) {
            onShowNotification("Nama Ekskul wajib diisi.", 'error');
            return;
        }
        // If it was virtual, remove the flag and give it a real ID
        const newActivity = {
            ...activityToSave,
            id: Date.now().toString(),
            classId: classId 
        };
        // Remove temp props if any
        if ('isVirtual' in newActivity) delete (newActivity as any).isVirtual;

        onAddExtracurricular(newActivity);
        onShowNotification(String(editingActivity.id).startsWith('virtual-') ? "Ekskul berhasil diaktifkan!" : "Ekskul baru berhasil ditambahkan!", 'success');
    } else if (!isNew && onUpdateExtracurricular) {
        onUpdateExtracurricular({ ...activityToSave, classId: editingActivity.classId || classId });
        onShowNotification("Perubahan berhasil disimpan!", 'success');
    }

    setEditingActivity(null);
    setMemberSearchTerm('');
  };

  const toggleMemberInEdit = (studentId: string) => {
      if (!editingActivity) return;
      const currentMembers = editingActivity.members || [];
      const newMembers = currentMembers.includes(studentId)
        ? currentMembers.filter(id => id !== studentId)
        : [...currentMembers, studentId];
      setEditingActivity({ ...editingActivity, members: newMembers });
  };

  const handleQuickRemoveMember = (activity: Extracurricular, studentId: string) => {
      if (!onUpdateExtracurricular) return;
      const newMembers = activity.members.filter(id => id !== studentId);
      onUpdateExtracurricular({ ...activity, members: newMembers });
      onShowNotification('Anggota dihapus dari ekskul.', 'success');
  };

  const handleDeleteAgendaClick = (id: string) => {
      setConfirmModal({
          isOpen: true,
          message: "Hapus agenda ini?",
          action: () => {
              onDeleteAgenda(id);
              setConfirmModal(prev => ({...prev, isOpen: false}));
          }
      });
  };

  const handlePrint = () => window.print();

  // ... (Export/Import logic unchanged) ...
  const handleDownloadTemplate = () => { /* ... same ... */ };
  const handleExport = () => { /* ... same ... */ };
  const handleImportClick = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { /* ... same ... */ };
  
  const filteredStudentsForModal = useMemo(() => 
    students.filter(s => s.name.toLowerCase().includes(memberSearchTerm.toLowerCase())),
    [students, memberSearchTerm]
  );

  const allFilteredSelected = useMemo(() => 
    editingActivity && 
    filteredStudentsForModal.length > 0 && 
    filteredStudentsForModal.every(s => editingActivity.members.includes(s.id)),
    [editingActivity, filteredStudentsForModal]
  );

  const handleToggleAllMembers = () => {
    if (!editingActivity) return;
    const filteredIds = filteredStudentsForModal.map(s => s.id);
    const currentMembers = new Set(editingActivity.members);
    if (allFilteredSelected) {
      filteredIds.forEach(id => currentMembers.delete(id));
    } else {
      filteredIds.forEach(id => currentMembers.add(id));
    }
    setEditingActivity({ ...editingActivity, members: Array.from(currentMembers) });
  };

  // Helper for Theme-based Header Colors
  const getThemeHeaderColor = (index: number) => {
      const colors = ['bg-[#5AB2FF]', 'bg-[#A0DEFF]', 'bg-[#CAF4FF]', 'bg-amber-200'];
      const textColors = ['text-white', 'text-white', 'text-blue-900', 'text-amber-900'];
      const i = index % colors.length;
      return { bg: colors[i], text: textColors[i] };
  };

  return (
    <div className="space-y-6 animate-fade-in relative page-portrait">
      
      <CustomModal 
        isOpen={confirmModal.isOpen}
        type="confirm"
        message={confirmModal.message}
        onConfirm={confirmModal.action}
        onCancel={() => setConfirmModal(prev => ({...prev, isOpen: false}))}
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div><h2 className="text-2xl font-bold text-gray-800">Kegiatan & Agenda</h2><p className="text-gray-500">Manajemen ekskul dan agenda kelas.</p></div>
        <div className="flex flex-wrap items-center gap-2">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx, .xls, .csv" />
            <div className="flex bg-white p-1 rounded-xl border border-[#CAF4FF] shadow-sm mr-2">
              <button onClick={() => setActiveTab('ekskul')} className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'ekskul' ? 'bg-[#5AB2FF] text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}><Tent size={16} /><span>Ekskul</span></button>
              <button onClick={() => setActiveTab('agenda')} className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'agenda' ? 'bg-[#5AB2FF] text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}><ListTodo size={16} /><span>Agenda</span></button>
            </div>
            
            {activeTab === 'ekskul' && (
                <button 
                    onClick={handleAddNewActivity} 
                    className="p-2 bg-[#5AB2FF] text-white rounded-lg hover:bg-[#A0DEFF] shadow-md flex items-center gap-2"
                    title="Tambah Ekskul Manual"
                >
                    <Plus size={18} /> <span className="hidden sm:inline font-bold">Tambah Lainnya</span>
                </button>
            )}

            <button onClick={handlePrint} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"><Printer size={18}/></button>
        </div>
      </div>

      <div className="print-container">
        {activeTab === 'ekskul' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 print:grid-cols-2">
            {displayActivities.map((ekskul: any, index) => {
                const CategoryIcon = getCategoryIcon(ekskul.category);
                const { bg, text } = getThemeHeaderColor(index);
                const isVirtual = ekskul.isVirtual;
                
                return (
                <div 
                    key={ekskul.id} 
                    className={`bg-white rounded-2xl shadow-sm border ${isVirtual ? 'border-dashed border-gray-300' : 'border-[#CAF4FF]'} overflow-hidden hover:shadow-lg transition-all print:border-black print:break-inside-avoid flex flex-col relative`}
                >
                    <div className={`${isVirtual ? 'bg-gray-100 text-gray-500' : bg + ' ' + text} p-4 print:bg-gray-200 print:text-black flex justify-between items-start`}>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-lg">
                                <CategoryIcon size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg leading-tight">{ekskul.name}</h3>
                                <span className={`text-xs font-semibold opacity-90 px-2 py-0.5 rounded mt-1 inline-block ${isVirtual ? 'bg-gray-200' : 'bg-black/10'}`}>{ekskul.category}</span>
                            </div>
                        </div>
                        <button 
                            onClick={() => setEditingActivity(ekskul)} 
                            className={`${isVirtual ? 'bg-indigo-600 text-white shadow-md' : 'bg-white/20'} hover:opacity-90 px-3 py-1.5 rounded-lg text-xs no-print flex items-center gap-1 transition-colors font-bold`}
                        >
                            {isVirtual ? <><Plus size={12}/> Aktifkan</> : <><PenTool size={12}/> Edit</>}
                        </button>
                    </div>
                    
                    <div className="p-5 space-y-4 flex-1">
                        {isVirtual && (
                            <div className="bg-amber-50 border border-amber-100 p-2 rounded-lg text-xs text-amber-700 flex items-start">
                                <AlertCircle size={14} className="mr-1.5 mt-0.5 shrink-0"/>
                                <span>Ekskul ini adalah template default. Edit & Simpan untuk mulai menambahkan anggota.</span>
                            </div>
                        )}
                        <div className="space-y-3">
                            <div className="flex items-start text-sm group">
                                <Clock size={16} className="mr-3 text-gray-400 mt-0.5" />
                                <div><span className="text-xs text-gray-400 font-bold uppercase block">Jadwal</span><span className="font-medium text-gray-700">{ekskul.schedule || '-'}</span></div>
                            </div>
                            <div className="flex items-start text-sm group">
                                <User size={16} className="mr-3 text-gray-400 mt-0.5" />
                                <div><span className="text-xs text-gray-400 font-bold uppercase block">Pelatih</span><span className="font-medium text-gray-700">{ekskul.coach || '-'}</span></div>
                            </div>
                        </div>
                        <div className="border-t pt-3 mt-2">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-gray-500 uppercase flex items-center"><Users size={12} className="mr-1"/> Anggota ({ekskul.members.length})</span>
                                {!isVirtual && (
                                    <button 
                                        onClick={() => setEditingActivity(ekskul)} 
                                        className="text-[10px] text-[#5AB2FF] font-bold hover:underline flex items-center no-print"
                                    >
                                        <UserPlus size={10} className="mr-1"/> Kelola
                                    </button>
                                )}
                            </div>
                            {ekskul.members.length > 0 ? (
                                <div className="bg-[#FFF9D0]/50 rounded-lg p-2 max-h-[120px] overflow-y-auto custom-scrollbar border border-amber-100">
                                    <ul className="text-xs text-gray-700 space-y-1.5">
                                        {ekskul.members.map((mid: string, idx: number) => (
                                            <li key={idx} className="flex items-center justify-between group/item hover:bg-white p-1 rounded transition-colors">
                                                <div className="flex items-center overflow-hidden">
                                                    <span className="truncate max-w-[150px]">{students.find(st => st.id === mid)?.name || `ID: ${mid}`}</span>
                                                </div>
                                                <button 
                                                    onClick={() => handleQuickRemoveMember(ekskul, mid)}
                                                    className="text-gray-300 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-all no-print"
                                                    title="Hapus anggota"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : <div className="bg-gray-50 rounded-lg p-3 text-center border-dashed border text-xs text-gray-400 italic">Belum ada anggota.</div>}
                        </div>
                    </div>
                </div>
            )})}
            </div>
        )}

        {activeTab === 'agenda' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:block">
            <div className="bg-white p-6 rounded-2xl border border-[#CAF4FF] shadow-sm h-fit no-print">
                <h3 className="font-bold text-gray-800 mb-4">Tambah Agenda</h3>
                <div className="space-y-4">
                    <input className="w-full border p-2 rounded-lg" placeholder="Judul" value={newAgenda.title} onChange={e=>setNewAgenda({...newAgenda, title:e.target.value})}/>
                    <input type="date" className="w-full border p-2 rounded-lg" value={newAgenda.date} onChange={e=>setNewAgenda({...newAgenda, date:e.target.value})}/>
                    <div className="flex gap-2">{['info','warning','urgent'].map(t => <button key={t} onClick={()=>setNewAgenda({...newAgenda, type:t as any})} className={`flex-1 py-1 rounded border capitalize ${newAgenda.type===t?'bg-[#CAF4FF] font-bold':''}`}>{t}</button>)}</div>
                    <button onClick={submitAgenda} className="w-full bg-[#5AB2FF] text-white font-bold py-2 rounded-lg hover:bg-[#A0DEFF]">Simpan</button>
                </div>
            </div>
            <div className="lg:col-span-2 space-y-3 print:w-full">
                <div className="hidden print-only text-center mb-6"><h2 className="text-xl font-bold uppercase">AGENDA KELAS</h2></div>
                {agendas.map((item, index) => (
                    <div key={item.id} className={`flex items-center p-4 rounded-xl border border-gray-100 shadow-sm print:border-black print:mb-2 ${index % 2 === 0 ? 'bg-white' : 'bg-[#CAF4FF]/20'}`}>
                        <button onClick={() => onToggleAgenda(item.id)} className={`mr-4 ${item.completed ? 'text-emerald-500' : 'text-gray-300'} print:text-black`}><CheckCircle size={24} /></button>
                        <div className="flex-1"><h4 className={`font-bold text-gray-800 print:text-black ${item.completed ? 'line-through text-gray-400' : ''}`}>{item.title}</h4><p className="text-xs text-gray-500 print:text-black">{formatLongDate(item.date)}</p></div>
                        <button onClick={() => handleDeleteAgendaClick(item.id)} className="text-gray-300 hover:text-red-500 no-print"><Trash2/></button>
                    </div>
                ))}
            </div>
            </div>
        )}
      </div>

      {editingActivity && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm no-print">
            <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
               <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-[#CAF4FF]/30">
                   <div>
                       <h3 className="font-bold text-lg">
                           {(editingActivity as any).isVirtual ? `Aktifkan: ${editingActivity.name}` : editingActivity.id ? `Atur Kegiatan: ${editingActivity.name}` : 'Tambah Ekskul Baru'}
                       </h3>
                   </div>
                   <button onClick={()=>setEditingActivity(null)} className="p-1 hover:bg-gray-200 rounded-full"><X size={20}/></button>
               </div>
               <div className="flex-1 overflow-y-auto p-6">
                   <form onSubmit={handleSaveEdit} className="space-y-6">
                       <div className="bg-[#FFF9D0]/30 p-4 rounded-xl border border-amber-100">
                           <h4 className="font-bold text-gray-800 text-sm mb-3">Informasi Dasar</h4>
                           <div className="grid grid-cols-2 gap-4">
                               <div className="col-span-2 md:col-span-1">
                                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Ekskul</label>
                                   <input required value={editingActivity.name} onChange={e => setEditingActivity({...editingActivity, name: e.target.value})} className="w-full border p-2 rounded-lg text-sm" placeholder="Contoh: PRAMUKA"/>
                               </div>
                               <div className="col-span-2 md:col-span-1">
                                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Kategori</label>
                                   <select 
                                        value={editingActivity.category} 
                                        onChange={e => setEditingActivity({...editingActivity, category: e.target.value})} 
                                        className="w-full border p-2 rounded-lg text-sm bg-white"
                                   >
                                       {CATEGORY_OPTIONS.map(cat => (
                                           <option key={cat} value={cat}>{cat}</option>
                                       ))}
                                   </select>
                               </div>
                               <div className="col-span-2 md:col-span-1">
                                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Jadwal</label>
                                   <input value={editingActivity.schedule} onChange={e => setEditingActivity({...editingActivity, schedule: e.target.value})} className="w-full border p-2 rounded-lg text-sm" placeholder="Hari & Jam"/>
                               </div>
                               <div className="col-span-2 md:col-span-1">
                                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pelatih</label>
                                   <input value={editingActivity.coach} onChange={e => setEditingActivity({...editingActivity, coach: e.target.value})} className="w-full border p-2 rounded-lg text-sm" placeholder="Nama Pelatih"/>
                               </div>
                           </div>
                       </div>
                       
                       {/* Member management */}
                       <div>
                           <div className="flex justify-between items-center mb-2">
                               <h4 className="font-bold text-gray-800 text-sm">Kelola Anggota</h4>
                               <div className="flex items-center gap-4">
                                   <label className="flex items-center gap-2 text-xs font-medium text-gray-600 cursor-pointer">
                                      <input 
                                        type="checkbox"
                                        checked={!!allFilteredSelected}
                                        onChange={handleToggleAllMembers}
                                        className="w-4 h-4 rounded text-[#5AB2FF] focus:ring-[#A0DEFF] border-gray-300"
                                      />
                                      Pilih Semua
                                   </label>
                                   <div className="relative">
                                     <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"/>
                                     <input type="text" placeholder="Cari siswa..." value={memberSearchTerm} onChange={e => setMemberSearchTerm(e.target.value)} className="pl-7 pr-3 py-1 text-xs border rounded-full w-40"/>
                                   </div>
                               </div>
                           </div>
                           <div className="border border-gray-200 rounded-xl overflow-hidden">
                               <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                                   {filteredStudentsForModal.map(student => {
                                       const isSelected = editingActivity.members.includes(student.id);
                                       return (
                                           <div key={student.id} onClick={() => toggleMemberInEdit(student.id)} className={`flex justify-between items-center px-4 py-2 text-sm cursor-pointer border-b last:border-0 hover:bg-[#CAF4FF]/50 ${isSelected ? 'bg-[#CAF4FF]/50' : ''}`}>
                                               <span className="font-medium text-gray-700">{student.name} <span className="text-gray-400 text-xs">({student.nis})</span></span>
                                               <div className={`w-5 h-5 rounded flex items-center justify-center border ${isSelected ? 'bg-[#5AB2FF] border-[#5AB2FF]' : 'border-gray-300'}`}>{isSelected && <CheckSquare size={14} className="text-white"/>}</div>
                                           </div>
                                       );
                                   })}
                               </div>
                           </div>
                       </div>
                   </form>
               </div>
               <div className="p-4 border-t bg-gray-50 flex justify-end gap-3"><button onClick={()=>setEditingActivity(null)} className="px-5 py-2.5 rounded-lg border text-sm hover:bg-gray-100">Batal</button><button onClick={handleSaveEdit} className="px-5 py-2.5 rounded-lg bg-[#5AB2FF] text-white font-bold text-sm hover:bg-[#A0DEFF]">Simpan</button></div>
            </div>
         </div>
      )}
    </div>
  );
};
export default ActivitiesView;
