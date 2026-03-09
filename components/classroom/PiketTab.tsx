import React, { useState, useEffect, useMemo } from 'react';
import { User, PenTool, Check, X, Save, Search, UserCircle, GripVertical, Users, Loader2 } from 'lucide-react';
import { WEEKDAYS } from '../../constants';
import { Student, PiketGroup } from '../../types';

interface PiketTabProps {
  piketGroups: PiketGroup[];
  students: Student[];
  onSave: (groups: PiketGroup[]) => void;
  onShowNotification: (message: string, type: 'success' | 'error' | 'warning') => void;
}

const PiketTab: React.FC<PiketTabProps> = ({ piketGroups, students, onSave, onShowNotification }) => {
  const [localPiketGroups, setLocalPiketGroups] = useState<PiketGroup[]>(piketGroups);
  const [isSaving, setIsSaving] = useState(false);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  useEffect(() => {
    // Sync with parent state, but only on initial load or if parent data changes externally.
    setLocalPiketGroups(piketGroups);
  }, [piketGroups]);

  const { availableStudents, studentMap, studentDayCounts } = useMemo(() => {
    const counts: Record<string, number> = {};
    localPiketGroups.forEach(g => {
      g.studentIds.forEach(id => {
        counts[id] = (counts[id] || 0) + 1;
      });
    });

    const available = students.filter(s => (counts[s.id] || 0) < 3);
    const map = new Map(students.map(s => [s.id, s]));
    return { availableStudents: available, studentMap: map, studentDayCounts: counts };
  }, [students, localPiketGroups]);

  const handleDragStart = (e: React.DragEvent, studentId: string, sourceDay: string | null) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ studentId, sourceDay }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, day: string | null) => {
    e.preventDefault();
    if (dragOverDay !== day) {
        setDragOverDay(day);
    }
  };

  const handleDragLeave = () => {
    setDragOverDay(null);
  };
  
  const handleDrop = (e: React.DragEvent, targetDay: string | null) => {
    e.preventDefault();
    setDragOverDay(null);
    const { studentId, sourceDay } = JSON.parse(e.dataTransfer.getData('application/json'));

    if (!studentId || sourceDay === targetDay) return;

    let newGroups = [...localPiketGroups];

    // If dropping back to the list (targetDay is null), just remove from sourceDay
    if (!targetDay) {
        if (sourceDay) {
            const sourceGroupIdx = newGroups.findIndex(g => g.day === sourceDay);
            if (sourceGroupIdx > -1) {
                newGroups[sourceGroupIdx] = {
                    ...newGroups[sourceGroupIdx],
                    studentIds: newGroups[sourceGroupIdx].studentIds.filter(id => id !== studentId)
                };
            }
        }
        setLocalPiketGroups(newGroups);
        return;
    }

    // Check if student is already in targetDay
    const targetGroupIdx = newGroups.findIndex(g => g.day === targetDay);
    const isAlreadyInTarget = targetGroupIdx > -1 && newGroups[targetGroupIdx].studentIds.includes(studentId);
    
    if (isAlreadyInTarget) return;

    // 1. Remove from source (if moving from another day)
    let canProceed = false;
    if (sourceDay) {
        const sourceGroupIdx = newGroups.findIndex(g => g.day === sourceDay);
        if (sourceGroupIdx > -1 && newGroups[sourceGroupIdx].studentIds.includes(studentId)) {
            newGroups[sourceGroupIdx] = {
                ...newGroups[sourceGroupIdx],
                studentIds: newGroups[sourceGroupIdx].studentIds.filter(id => id !== studentId)
            };
            canProceed = true;
        }
    } else {
        // If coming from the list, verify they aren't already at the max limit
        let currentCount = 0;
        newGroups.forEach(g => {
            if (g.studentIds.includes(studentId)) currentCount++;
        });
        if (currentCount < 3) {
            canProceed = true;
        } else {
            onShowNotification("Maksimal 3 hari piket per siswa.", "warning");
        }
    }

    if (!canProceed) return;

    // 2. Add to target
    const newTargetGroupIdx = newGroups.findIndex(g => g.day === targetDay);
    if (newTargetGroupIdx > -1) {
        newGroups[newTargetGroupIdx] = {
            ...newGroups[newTargetGroupIdx],
            studentIds: [...newGroups[newTargetGroupIdx].studentIds, studentId]
        };
    } else {
        newGroups.push({ day: targetDay, studentIds: [studentId] });
    }
    
    setLocalPiketGroups(newGroups);
  };

  const removeStudentFromDay = (day: string, studentId: string) => {
    let newGroups = [...localPiketGroups];
    const groupIndex = newGroups.findIndex(g => g.day === day);
    if (groupIndex > -1) {
        newGroups[groupIndex].studentIds = newGroups[groupIndex].studentIds.filter(id => id !== studentId);
        setLocalPiketGroups(newGroups);
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const studentDayCounts: { [studentId: string]: number } = {};
      for (const group of localPiketGroups) {
        for (const studentId of group.studentIds) {
          studentDayCounts[studentId] = (studentDayCounts[studentId] || 0) + 1;
        }
      }

      const overAssignedStudents = Object.entries(studentDayCounts).filter(([, count]) => count > 3);

      if (overAssignedStudents.length > 0) {
        const studentNames = overAssignedStudents.map(([studentId]) => studentMap.get(studentId)?.name || studentId).join(', ');
        onShowNotification(`Siswa ${studentNames} ditugaskan lebih dari 3 hari piket. Mohon perbaiki.`, 'warning');
        return;
      }

      await onSave(localPiketGroups);
      onShowNotification('Jadwal piket berhasil disimpan!', 'success');
    } catch (e) {
      console.error(e);
      onShowNotification('Gagal menyimpan jadwal piket.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 print:block">
        {/* Left: Student Palette */}
        {isPanelOpen && (
          <div className="lg:w-72 shrink-0 space-y-4 no-print">
              <div 
                  className={`bg-white p-4 rounded-xl border shadow-sm flex flex-col h-full max-h-[75vh] transition-all ${dragOverDay === 'unassigned' ? 'border-indigo-400 border-dashed ring-2 ring-indigo-200' : 'border-gray-200'}`}
                  onDragOver={(e) => handleDragOver(e, 'unassigned')}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, null)}
              >
                  <h3 className="font-bold text-gray-800 mb-2 flex items-center justify-between">
                      <span className="flex items-center"><Users size={18} className="mr-2 text-indigo-600"/> Daftar Siswa</span>
                      <button onClick={() => setIsPanelOpen(false)} title="Tutup panel" className="p-1 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-700">
                          <X size={18} />
                      </button>
                  </h3>
                  <p className="text-xs text-gray-400 mb-3 border-b pb-3">Seret siswa ke kolom hari. Maksimal 3 hari per siswa.</p>

                  <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar p-1">
                      {availableStudents.map(student => (
                          <div 
                              key={student.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, student.id, null)}
                              className="bg-white border border-gray-200 p-2 rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:border-indigo-400 hover:shadow-md transition-all flex items-center justify-between group"
                          >
                              <div className="flex items-center space-x-2 overflow-hidden">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold shrink-0 ${student.gender === 'L' ? 'bg-blue-500' : 'bg-pink-500'}`}>
                                      {student.gender}
                                  </div>
                                  <span className="text-xs font-medium text-gray-700 truncate">{student.name} ({studentDayCounts[student.id] || 0}/3)</span>
                              </div>
                              <GripVertical size={14} className="text-gray-300" />
                          </div>
                      ))}
                      {availableStudents.length === 0 && <p className="text-xs text-gray-400 text-center italic py-10">Semua siswa sudah mencapai batas maksimal piket.</p>}
                  </div>
              </div>
          </div>
        )}
        
        {/* Right: Piket Board */}
        <div className="flex-1 print-container">
            <div className="flex justify-between items-center mb-4 no-print">
                {!isPanelOpen && (
                    <button onClick={() => setIsPanelOpen(true)} className="flex items-center gap-2 bg-white text-indigo-600 font-bold px-4 py-2 rounded-lg shadow-md border border-indigo-100 hover:bg-indigo-50">
                        <Users size={16} /> Tampilkan Daftar Siswa
                    </button>
                )}
                <button onClick={handleSaveAll} disabled={isSaving} className={`flex items-center bg-indigo-600 text-white py-2.5 px-5 rounded-lg font-bold hover:bg-indigo-700 shadow-md justify-center disabled:opacity-50 ${!isPanelOpen ? 'ml-auto' : ''}`}>
                    {isSaving ? <Loader2 className="animate-spin mr-2"/> : <Save size={16} className="mr-2"/>} 
                    {isSaving ? 'Menyimpan...' : 'Simpan Jadwal Piket'}
                </button>
            </div>
            
            <div className="hidden print-only text-center mb-6">
                <h2 className="text-xl font-bold uppercase">JADWAL PIKET KELAS</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-3">
                {WEEKDAYS.map((day, idx) => {
                    const group = localPiketGroups.find(g => g.day === day);
                    const members = group ? group.studentIds : [];
                    
                    // Theme Based Colors
                    const themeColors = ['#5AB2FF', '#A0DEFF', '#FFF9D0'];
                    const textColors = ['text-white', 'text-white', 'text-amber-900'];
                    const themeIndex = idx % themeColors.length;
                    const bgColor = themeColors[themeIndex];
                    const textColor = textColors[themeIndex];

                    return (
                        <div 
                            key={day} 
                            className={`rounded-2xl shadow-sm border flex flex-col print:border-black print:break-inside-avoid relative transition-all ${dragOverDay === day ? 'border-indigo-400 border-dashed ring-2 ring-indigo-200' : 'border-gray-200'}`}
                            onDragOver={(e) => handleDragOver(e, day)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, day)}
                        >
                            <div className="p-3 rounded-t-2xl font-bold uppercase text-center" style={{ backgroundColor: bgColor, color: textColor }}>
                                {day}
                            </div>
                            <div className="p-3 space-y-2 flex-1 bg-white rounded-b-2xl">
                                {members.map(studentId => {
                                    const student = studentMap.get(studentId);
                                    // FIX: Changed implicit `undefined` return to explicit `null` to satisfy ReactNode type.
                                    if (!student) return null;

                                    return (
                                        <div 
                                            key={student.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, student.id, day)}
                                            className="bg-white border border-gray-200 p-2 rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:border-indigo-400 hover:shadow-md transition-all flex items-center justify-between group"
                                        >
                                            <div className="flex items-center space-x-2 overflow-hidden">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold shrink-0 ${student.gender === 'L' ? 'bg-blue-500' : 'bg-pink-500'}`}>
                                                    {student.gender}
                                                </div>
                                                <span className="text-xs font-medium text-gray-700 truncate">{student.name}</span>
                                            </div>
                                            <button onClick={() => removeStudentFromDay(day, student.id)} className="p-1 rounded-full text-gray-300 group-hover:text-red-500 group-hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity no-print">
                                                <X size={14}/>
                                            </button>
                                        </div>
                                    )
                                })}
                                {members.length === 0 && <p className="text-xs text-gray-400 text-center italic py-10">Kosong</p>}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    </div>
  );
};

export default PiketTab;
