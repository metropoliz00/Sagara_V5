
import React, { useState } from 'react';
import { User, GripVertical, XCircle, Save, LayoutGrid, Users, BoxSelect, UserCircle, X, Loader2 } from 'lucide-react';
import { Student, TeacherProfileData, SeatingLayouts } from '../../types';

interface SeatingTabProps {
  seatingLayouts: SeatingLayouts;
  setSeatingLayouts: React.Dispatch<React.SetStateAction<SeatingLayouts>>;
  students: Student[];
  onSave: () => Promise<void>;
  teacherProfile?: TeacherProfileData;
}

type LayoutMode = 'classical' | 'groups' | 'ushape';

const SeatingTab: React.FC<SeatingTabProps> = ({ seatingLayouts, setSeatingLayouts, students, onSave, teacherProfile }) => {
  const [draggedStudentId, setDraggedStudentId] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('classical');
  const [isStudentPanelVisible, setIsStudentPanelVisible] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveClick = async () => {
    setIsSaving(true);
    try {
      await onSave();
    } finally {
      setIsSaving(false);
    }
  };

  // --- Helpers to get and set the active layout based on layoutMode ---
  const getActiveLayout = (): (string | null)[] => {
      switch(layoutMode) {
          case 'groups': return seatingLayouts.groups;
          case 'ushape': return seatingLayouts.ushape;
          default: return seatingLayouts.classical;
      }
  };

  const setActiveLayout = (newLayout: (string | null)[]) => {
      setSeatingLayouts(prev => {
          const newLayouts = { ...prev };
          switch(layoutMode) {
              case 'groups': newLayouts.groups = newLayout; break;
              case 'ushape': newLayouts.ushape = newLayout; break;
              default: newLayouts.classical = newLayout; break;
          }
          return newLayouts;
      });
  };
  
  const getShortenedTeacherName = (fullName?: string): string => {
    if (!fullName) {
      return 'Wali Kelas';
    }
    const nameParts = fullName.split(' ');
    if (nameParts.length <= 2) {
      return fullName;
    }
    return `${nameParts[0]} ${nameParts[1]}`;
  };

  const activeSeats = getActiveLayout();
  
  // --- Drag & Drop Logic ---
  const handleDragStart = (e: React.DragEvent, studentId: string) => {
    setDraggedStudentId(studentId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
  };

  const handleDrop = (index: number) => {
    if (index >= activeSeats.length) return;

    if (draggedStudentId) {
      const newLayout = [...activeSeats];
      const oldIndex = newLayout.indexOf(draggedStudentId);
      if (oldIndex !== -1) newLayout[oldIndex] = null;
      
      const existingStudentId = newLayout[index];
      if (existingStudentId && oldIndex !== -1) {
          newLayout[oldIndex] = existingStudentId;
      }

      newLayout[index] = draggedStudentId;
      setActiveLayout(newLayout);
      setDraggedStudentId(null);
    }
  };

  const removeFromSeat = (index: number) => {
    const newLayout = [...activeSeats];
    newLayout[index] = null;
    setActiveLayout(newLayout);
  };

  const getStudentBySeat = (seatId: string | null) => {
      if (!seatId) return null;
      return students.find(s => s.id === seatId);
  };

  // Filter siswa yang belum duduk in the current layout
  const seatedIds = activeSeats.filter(Boolean);
  const unseatedStudents = students.filter(s => !seatedIds.includes(s.id));

  // --- Core Render Seat Component ---
  const renderSeat = (globalIndex: number, label?: string) => {
      if (globalIndex >= activeSeats.length) return null;

      const seatId = activeSeats[globalIndex];
      const student = getStudentBySeat(seatId);
      const genderColor = student?.gender === 'L' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-pink-50 border-pink-200 text-pink-700';

      return (
        <div 
            key={`seat-${layoutMode}-${globalIndex}`}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(globalIndex)}
            onClick={() => seatId && removeFromSeat(globalIndex)}
            className={`
                relative w-16 h-16 rounded-lg flex flex-col items-center justify-center transition-all duration-200 group border
                ${seatId 
                ? `bg-white shadow-sm cursor-pointer hover:border-red-300 hover:bg-red-50 ${genderColor}` 
                : 'bg-slate-50 border-dashed border-gray-300 hover:border-indigo-400 hover:bg-white'}
            `}
        >
            {student ? (
                <>
                    {student.photo && !student.photo.startsWith('ERROR') ? (
                        <img src={student.photo} alt="" className="w-8 h-8 rounded-full object-cover border border-gray-200 mb-1 pointer-events-none" />
                    ) : (
                        <div className="w-8 h-8 mb-1 flex items-center justify-center text-gray-400 pointer-events-none">
                            <UserCircle size={24}/>
                        </div>
                    )}
                    <div className="text-[8px] font-bold text-center leading-tight px-1 w-full pointer-events-none">
                        <div className="truncate">{student.name.split(' ')[0]}</div>
                        <div className="truncate">{student.name.split(' ')[1] || '\u00A0'}</div>
                    </div>
                    
                    <div className="absolute inset-0 bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center no-print">
                        <XCircle size={16} className="text-red-500" />
                    </div>
                </>
            ) : (
                <span className="text-[8px] text-gray-400 font-medium text-center">{label || (globalIndex + 1)}</span>
            )}
        </div>
      );
  };

  // --- LAYOUT RENDERS ---

  // 1. Klasikal (4 Baris ke belakang)
  const renderClassicalLayout = () => {
      const totalSeats = activeSeats.length;
      const totalDesks = Math.ceil(totalSeats / 2);
      const desksPerRow = Math.ceil(totalDesks / 4);

      const getClassicalIndex = (rowIdx: number, deskIdx: number, pos: 0 | 1) => {
          return (rowIdx * (desksPerRow * 2)) + (deskIdx * 2) + pos;
      };

      return (
          <div className="space-y-8 w-full px-4 md:px-12 mt-8">
             {[0, 1, 2, 3].map((rowIdx) => (
                 <div key={rowIdx} className="flex justify-center gap-6 md:gap-10">
                     {Array.from({ length: desksPerRow }).map((_, deskIdx) => {
                         const seatIdx1 = getClassicalIndex(rowIdx, deskIdx, 0);
                         const seatIdx2 = getClassicalIndex(rowIdx, deskIdx, 1);
                         
                         if (seatIdx1 >= activeSeats.length && seatIdx2 >= activeSeats.length) return null;

                         return (
                             <div key={`desk-${rowIdx}-${deskIdx}`} className="bg-amber-100 border-2 border-amber-200 rounded-xl p-2 flex gap-2 shadow-sm relative print:bg-white print:border-black">
                                 {renderSeat(seatIdx1)}
                                 {renderSeat(seatIdx2)}
                                 <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-200 text-[8px] px-2 rounded-full text-amber-800 font-bold print:hidden border border-amber-300">
                                     Meja {rowIdx * desksPerRow + deskIdx + 1}
                                 </div>
                             </div>
                         );
                     })}
                 </div>
             ))}
          </div>
      );
  };

  // 2. Kelompok (Melingkar/Cluster)
  const renderGroupsLayout = () => {
      const groupConfigs = [5, 5, 5, 5, 5, 6];
      const currentCapacity = 31;
      if (activeSeats.length > currentCapacity) {
          const extraNeeded = activeSeats.length - currentCapacity;
          const extraGroups = Math.ceil(extraNeeded / 6);
          for (let i = 0; i < extraGroups; i++) {
              groupConfigs.push(6);
          }
      }

      let currentSeatIndex = 0;

      return (
          <div className="flex flex-wrap justify-center gap-12 mt-8 px-4">
              {groupConfigs.map((capacity, groupIdx) => {
                  const startIdx = currentSeatIndex;
                  currentSeatIndex += capacity;

                  return (
                  <div key={groupIdx} className="relative bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-3xl p-4 w-[280px] h-[240px] flex items-center justify-center print:bg-white print:border-black">
                      <div className="absolute -top-3 left-4 bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold border border-indigo-200 print:bg-white print:border-black print:text-black">
                          Kelompok {groupIdx + 1} <span className="text-[10px] opacity-70">({capacity} Kursi)</span>
                      </div>
                      
                      <div className="absolute inset-0 m-auto w-24 h-32 bg-amber-100 rounded-xl border border-amber-200 opacity-50 z-0 print:border-black"></div>

                      <div className="grid grid-cols-2 gap-x-12 gap-y-4 z-10">
                          {Array.from({ length: capacity }).map((_, sIdx) => {
                              const globalIdx = startIdx + sIdx;
                              return (
                                <div key={sIdx} className={sIdx % 2 === 0 ? '-ml-2' : '-mr-2'}>
                                    {renderSeat(globalIdx)}
                                </div>
                              );
                          })}
                      </div>
                  </div>
              )})}
          </div>
      );
  };

  // 3. Letter U (U-Shape) with Double Seats (Desks)
  const renderUShapeLayout = () => {
      const totalSeats = activeSeats.length;
      const totalDesks = Math.ceil(totalSeats / 2);
      
      const sideDeskCount = Math.floor(totalDesks / 3); 
      const backDeskCount = totalDesks - (sideDeskCount * 2);
      
      const pairs: number[][] = [];
      for (let i = 0; i < totalSeats; i += 2) {
          pairs.push([i, i + 1]);
      }
      
      const leftDesks = pairs.slice(0, sideDeskCount);
      const rightDesks = pairs.slice(sideDeskCount, sideDeskCount * 2);
      const backDesks = pairs.slice(sideDeskCount * 2);

      const DeskComponent = ({ seatIndices, vertical = false, label }: { seatIndices: number[], vertical?: boolean, label?: string }) => (
         <div className={`
             bg-amber-100 border-2 border-amber-200 rounded-xl p-2 flex gap-2 shadow-sm relative print:bg-white print:border-black
             ${vertical ? 'flex-col' : 'flex-row'}
         `}>
             {seatIndices.map(idx => renderSeat(idx))}
             {label && (
                <div className="absolute -top-2 -right-2 bg-amber-200 text-[8px] px-1.5 rounded-full text-amber-800 font-bold border border-amber-300 print:hidden">
                    {label}
                </div>
             )}
         </div>
      );

      return (
          <div className="w-full px-4 mt-8 relative min-h-[500px] flex flex-col justify-between">
              
              <div className="flex justify-between h-full px-4 md:px-12">
                  <div className="flex flex-col gap-6">
                      {leftDesks.map((pair, idx) => (
                          <div key={`left-${idx}`} className="flex items-center gap-2">
                              <DeskComponent seatIndices={pair} label={`L${idx+1}`} />
                          </div>
                      ))}
                  </div>

                  <div className="flex-1 flex items-center justify-center opacity-10">
                      <span className="text-4xl font-bold text-gray-300 transform -rotate-12 no-print select-none">AREA TENGAH</span>
                  </div>

                  <div className="flex flex-col gap-6">
                      {rightDesks.map((pair, idx) => (
                          <div key={`right-${idx}`} className="flex items-center gap-2">
                              <DeskComponent seatIndices={pair} label={`R${idx+1}`} />
                          </div>
                      ))}
                  </div>
              </div>

              <div className="flex justify-center flex-wrap gap-8 mt-16 px-4">
                  {backDesks.map((pair, idx) => (
                      <div key={`back-${idx}`} className="flex flex-col items-center gap-1">
                           <DeskComponent seatIndices={pair} label={`B${idx+1}`} />
                      </div>
                  ))}
              </div>
          </div>
      );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 print:block">
       {/* Sidebar: Unseated Students */}
       {isStudentPanelVisible && (
            <div className="lg:w-72 shrink-0 bg-white p-4 rounded-xl border border-gray-200 shadow-sm h-fit no-print flex flex-col max-h-[80vh]">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center justify-between">
                <span className="flex items-center"><User size={18} className="mr-2 text-indigo-600" /> Siswa ({unseatedStudents.length})</span>
                <button onClick={() => setIsStudentPanelVisible(false)} title="Tutup panel" className="p-1 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-700">
                    <X size={18} />
                </button>
            </h3>
            <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar p-1 min-h-[200px]">
                {unseatedStudents.map(student => (
                    <div 
                    key={student.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, student.id)}
                    className="bg-white border border-gray-200 p-2 rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:border-indigo-400 hover:shadow-md transition-all flex items-center justify-between group"
                    >
                    <div className="flex items-center space-x-2 overflow-hidden">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold shrink-0 ${student.gender === 'L' ? 'bg-blue-500' : 'bg-pink-500'}`}>
                            {student.gender}
                        </div>
                        <span className="text-xs font-medium text-gray-700 truncate">{student.name}</span>
                    </div>
                    <GripVertical size={14} className="text-gray-300" />
                    </div>
                ))}
                {unseatedStudents.length === 0 && <p className="text-xs text-gray-400 text-center italic py-10">Semua siswa sudah duduk.</p>}
            </div>
            
            <button 
                onClick={handleSaveClick} 
                disabled={isSaving}
                className="mt-4 w-full bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 shadow flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSaving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2"/>}
                {isSaving ? 'Menyimpan...' : 'Simpan Posisi'}
            </button>
            </div>
       )}

       {/* Main: Classroom Layout */}
       <div className="flex-1 bg-slate-100 p-6 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center min-h-[700px] print:bg-white print:border-2 print:border-black print:w-full print:p-0 relative overflow-auto">
          
          {/* Layout Controls & Show Panel Button */}
          <div className="absolute top-4 left-6 right-4 flex justify-between items-center no-print z-20">
              {!isStudentPanelVisible && (
                    <button onClick={() => setIsStudentPanelVisible(true)} className="flex items-center gap-2 bg-white text-indigo-600 font-bold px-4 py-2 rounded-lg shadow-md border border-indigo-100 hover:bg-indigo-50">
                        <Users size={16} /> Tampilkan Daftar Siswa
                    </button>
              )}
              <div className="flex bg-white rounded-lg shadow-sm border border-gray-200 p-1 gap-1 ml-auto">
                <button onClick={()=>setLayoutMode('classical')} className={`p-2 rounded ${layoutMode==='classical'?'bg-indigo-100 text-indigo-700':'text-gray-500 hover:bg-gray-50'}`} title="Mode Klasikal"><LayoutGrid size={18}/></button>
                <button onClick={()=>setLayoutMode('groups')} className={`p-2 rounded ${layoutMode==='groups'?'bg-indigo-100 text-indigo-700':'text-gray-500 hover:bg-gray-50'}`} title="Mode Kelompok"><Users size={18}/></button>
                <button onClick={()=>setLayoutMode('ushape')} className={`p-2 rounded ${layoutMode==='ushape'?'bg-indigo-100 text-indigo-700':'text-gray-500 hover:bg-gray-50'}`} title="Mode Letter U"><BoxSelect size={18}/></button>
              </div>
          </div>

          <div className="hidden print-only text-center mb-6 w-full">
             <h2 className="text-xl font-bold uppercase">DENAH TEMPAT DUDUK</h2>
             <p className="text-sm text-gray-500">Mode: {layoutMode === 'classical' ? 'Klasikal' : layoutMode === 'groups' ? 'Kelompok' : 'Letter U'}</p>
          </div>
          
          <div className="w-full min-w-[800px] py-4 pt-16 md:pt-4">
              {/* Papan Tulis */}
              <div className="w-1/2 h-8 bg-slate-700 rounded-b-lg shadow-lg mb-8 flex items-center justify-center border-b-4 border-slate-800 print:bg-white print:border-2 print:border-black print:text-black print:border-t-0 mx-auto">
                <span className="text-white font-bold tracking-[0.5em] text-xs print:text-black">PAPAN TULIS</span>
              </div>

              {/* Meja Guru (CENTERED & VISUAL UPDATE) */}
              <div className="mb-8 relative w-full flex justify-center px-10">
                <div className="w-48 h-20 bg-amber-800 rounded-lg shadow-md flex items-center gap-3 px-4 border border-amber-900 print:bg-white print:border-2 print:border-black">
                    {/* Visual Foto Guru */}
                    <div className="w-12 h-12 rounded-full bg-amber-200 border-2 border-white overflow-hidden shrink-0 print:border-black">
                      {teacherProfile?.photo ? (
                          <img src={teacherProfile.photo} alt="Guru" className="w-full h-full object-cover" />
                      ) : (
                          <div className="w-full h-full flex items-center justify-center text-amber-800"><UserCircle size={24}/></div>
                      )}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-amber-100 font-bold text-xs uppercase tracking-wider print:text-black">MEJA GURU</span>
                        <span className="text-white font-semibold text-xs truncate print:text-black">{getShortenedTeacherName(teacherProfile?.name)}</span>
                    </div>
                </div>
              </div>

              {/* Render Active Layout */}
              <div className="w-full flex-1">
                  {layoutMode === 'classical' && renderClassicalLayout()}
                  {layoutMode === 'groups' && renderGroupsLayout()}
                  {layoutMode === 'ushape' && renderUShapeLayout()}
              </div>
          </div>
          
          <div className="mt-8 text-center text-xs text-gray-400 italic print:hidden">
              Depan (Papan Tulis)
          </div>
       </div>
    </div>
  );
};

export default SeatingTab;
