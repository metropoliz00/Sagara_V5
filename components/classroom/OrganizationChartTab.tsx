import React, { useState, useEffect, useMemo } from 'react';
import { Student, TeacherProfileData, OrganizationStructure, User } from '../../types';
import { Users, User as UserIcon, GripVertical, Plus, Save, Trash2, PenTool, Loader2, X } from 'lucide-react';
import { useModal } from '../../context/ModalContext';

interface OrganizationChartTabProps {
  students: Student[];
  teacherProfile?: TeacherProfileData;
  initialStructure: OrganizationStructure;
  onSave: (structure: OrganizationStructure) => void;
  users?: User[]; // New prop to lookup teachers
  classId: string; // New prop to identify current class
}

const PREDEFINED_ROLES = [
    { id: 'president', label: 'Ketua Kelas' },
    { id: 'vicePresident', label: 'Wakil Ketua Kelas' },
    { id: 'secretary1', label: 'Sekretaris 1' },
    { id: 'secretary2', label: 'Sekretaris 2' },
    { id: 'treasurer1', label: 'Bendahara 1' },
    { id: 'treasurer2', label: 'Bendahara 2' },
];

const OrganizationChartTab: React.FC<OrganizationChartTabProps> = ({ students, teacherProfile, initialStructure, onSave, users, classId }) => {
    const [structure, setStructure] = useState<OrganizationStructure>(initialStructure || { roles: {}, sections: [] });
    const [editingSection, setEditingSection] = useState<{id: string, name: string} | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { showConfirm } = useModal();
    
    useEffect(() => {
        setStructure(initialStructure || { roles: {}, sections: [] });
    }, [initialStructure]);

    // Lookup the correct teacher for this specific class
    const classTeacher = useMemo(() => {
        if (users && users.length > 0) {
            // Normalize comparison to be case-insensitive just in case
            const foundTeacher = users.find(u => 
                u.role === 'guru' && 
                u.classId && 
                String(u.classId).toLowerCase() === String(classId).toLowerCase()
            );
            
            if (foundTeacher) {
                return {
                    name: foundTeacher.fullName,
                    photo: foundTeacher.photo,
                    // If we needed more fields we could map them here
                };
            }
        }
        // Fallback to the generic profile passed down (usually current user)
        // But only if we couldn't find a specific match, or if users list wasn't provided
        return teacherProfile;
    }, [users, classId, teacherProfile]);

    const { unassignedStudents, studentMap } = useMemo(() => {
        const assignedIds = new Set<string>();
        Object.values(structure.roles).forEach(val => {
            if (Array.isArray(val)) {
                val.forEach(id => assignedIds.add(id));
            } else if (val) {
                assignedIds.add(val);
            }
        });
        const unassigned = students.filter(s => !assignedIds.has(s.id));
        const map = new Map(students.map(s => [s.id, s]));
        return { unassignedStudents: unassigned, studentMap: map };
    }, [students, structure.roles]);

    const handleDragStart = (e: React.DragEvent, studentId: string, sourceRole: string) => {
        e.dataTransfer.setData('application/json', JSON.stringify({ studentId, sourceRole }));
        e.dataTransfer.effectAllowed = 'move';
    };

    const isSectionRole = (roleId: string) => structure.sections.some(s => s.id === roleId);

    const handleDrop = (e: React.DragEvent, targetRole: string) => {
        e.preventDefault();
        const { studentId, sourceRole } = JSON.parse(e.dataTransfer.getData('application/json'));
        if (!studentId) return;

        setStructure(prev => {
            const newRoles = { ...prev.roles };
            const studentInTarget = newRoles[targetRole]; // Student being replaced (if single)

            // 1. Remove from source
            if (sourceRole !== 'unassigned') {
                const sourceVal = newRoles[sourceRole];
                if (Array.isArray(sourceVal)) {
                    newRoles[sourceRole] = sourceVal.filter(id => id !== studentId);
                } else if (sourceVal === studentId) {
                    newRoles[sourceRole] = null;
                }
            }

            // 2. Add to target
            if (isSectionRole(targetRole)) {
                const currentVal = newRoles[targetRole];
                if (Array.isArray(currentVal)) {
                    if (!currentVal.includes(studentId)) {
                        newRoles[targetRole] = [...currentVal, studentId];
                    }
                } else if (currentVal && typeof currentVal === 'string') {
                    if (currentVal !== studentId) {
                        newRoles[targetRole] = [currentVal, studentId];
                    }
                } else {
                    newRoles[targetRole] = [studentId];
                }
            } else {
                // Single role
                newRoles[targetRole] = studentId;
                
                // Swap if possible (only if source was single and not unassigned)
                if (studentInTarget && typeof studentInTarget === 'string' && sourceRole !== 'unassigned' && !isSectionRole(sourceRole)) {
                    newRoles[sourceRole] = studentInTarget;
                }
            }
            
            return { ...prev, roles: newRoles };
        });
    };

    const removeStudentFromRole = (roleId: string, studentId?: string) => {
        setStructure(prev => {
            const newRoles = { ...prev.roles };
            const val = newRoles[roleId];
            if (Array.isArray(val) && studentId) {
                newRoles[roleId] = val.filter(id => id !== studentId);
            } else {
                delete newRoles[roleId];
            }
            return { ...prev, roles: newRoles };
        });
    };

    const handleAddSection = () => {
        const newId = `section_${Date.now()}`;
        setStructure(prev => ({
            ...prev,
            sections: [...prev.sections, { id: newId, name: 'Seksi Baru' }]
        }));
    };

    const handleUpdateSectionName = () => {
        if (!editingSection) return;
        setStructure(prev => ({
            ...prev,
            sections: prev.sections.map(s => s.id === editingSection.id ? { ...s, name: editingSection.name } : s)
        }));
        setEditingSection(null);
    };

    const handleDeleteSection = (id: string) => {
        showConfirm('Hapus seksi ini?', async () => {
            setStructure(prev => ({
                ...prev,
                roles: Object.fromEntries(Object.entries(prev.roles).filter(([key]) => key !== id)),
                sections: prev.sections.filter(s => s.id !== id)
            }));
        });
    };
    
    const handleSave = async () => {
        setIsSaving(true);
        await onSave(structure);
        setIsSaving(false);
    };
    
    const RoleBox = ({ roleId, label }: { roleId: string; label: string }) => {
        const roleValue = structure.roles[roleId];
        const studentIds = Array.isArray(roleValue) ? roleValue : (roleValue ? [roleValue] : []);
        
        return (
            <div 
                className="flex flex-col items-center"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, roleId)}
            >
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
                <div className={`w-32 min-h-[5rem] mt-1 rounded-lg flex flex-col items-center justify-center p-2 text-center transition-all ${studentIds.length > 0 ? 'bg-white shadow-md border-2 border-indigo-200' : 'bg-gray-100 border-2 border-dashed border-gray-300'}`}>
                    {studentIds.length > 0 ? (
                        <div className="flex flex-col gap-2 w-full">
                            {studentIds.map(sid => {
                                const student = studentMap.get(sid);
                                if (!student) return null;
                                return (
                                    <div 
                                        key={sid}
                                        className="w-full flex flex-col items-center cursor-grab active:cursor-grabbing hover:bg-gray-50 rounded p-1" 
                                        draggable 
                                        onDragStart={(e) => handleDragStart(e, student.id, roleId)}
                                        title={student.name}
                                    >
                                        {student.photo ? (
                                            <img src={student.photo} alt={student.name} className="w-8 h-8 rounded-full object-cover"/>
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500">
                                                <UserIcon size={16} />
                                            </div>
                                        )}
                                        <p className="text-xs font-bold text-gray-800 mt-1 leading-tight">{student.name.split(' ').slice(0, 2).join(' ')}</p>
                                    </div>
                                );
                            })}
                        </div>
                    ) : <span className="text-xs text-gray-400">Tarik Siswa</span>}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 print:block">
            {/* Student List */}
            <div className="lg:w-72 shrink-0 bg-white p-4 rounded-xl border border-gray-200 shadow-sm h-fit no-print">
                <h3 className="font-bold text-gray-800 mb-2">Siswa Belum Ditugaskan ({unassignedStudents.length})</h3>
                <div 
                    className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar p-1 bg-gray-50 rounded-lg"
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                    const data = JSON.parse(e.dataTransfer.getData('application/json'));
                    removeStudentFromRole(data.sourceRole, data.studentId);
                }}
                >
                    {unassignedStudents.map(student => (
                        <div key={student.id} draggable onDragStart={(e) => handleDragStart(e, student.id, 'unassigned')} className="bg-white border p-2 rounded-lg flex items-center gap-2 cursor-grab active:cursor-grabbing hover:shadow-md">
                            <GripVertical size={14} className="text-gray-400" />
                            <span className="text-xs font-medium">{student.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Organization Chart */}
            <div className="flex-1 print-container">
                <div className="flex justify-end mb-4 no-print">
                    <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 bg-indigo-600 text-white font-bold px-4 py-2 rounded-lg shadow-md hover:bg-indigo-700 disabled:opacity-50">
                        <Save size={16} /> {isSaving ? 'Menyimpan...' : 'Simpan Struktur'}
                    </button>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm min-h-[600px] text-center">
                    <h3 className="font-bold text-xl uppercase mb-8">STRUKTUR ORGANISASI KELAS {classId}</h3>
                    
                    {/* Level 1: Guru */}
                    <div className="flex justify-center mb-4">
                        <div className="flex flex-col items-center">
                            <span className="text-xs font-bold text-gray-400 uppercase">Guru Kelas {classId}</span>
                            <div className="w-40 h-24 mt-1 rounded-lg flex items-center justify-center p-2 text-center bg-amber-100 border-2 border-amber-200 shadow-lg">
                                <div className="flex flex-col items-center" title={classTeacher?.name || 'Belum ada guru'}>
                                    {classTeacher?.photo ? (
                                        <img src={classTeacher.photo} alt={classTeacher.name} className="w-10 h-10 rounded-full object-cover"/>
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-amber-300 flex items-center justify-center text-amber-700">
                                            <UserIcon size={20} />
                                        </div>
                                    )}
                                    <p className="text-xs font-bold text-gray-800 mt-1 leading-tight">
                                        {classTeacher?.name 
                                            ? classTeacher.name.split(' ').slice(0, 2).join(' ') 
                                            : 'Wali Kelas Belum Diatur'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Connecting Line */}
                    <div className="w-px h-8 bg-gray-300 mx-auto"></div>
                    
                    {/* Level 2: Ketua Kelas */}
                    <div className="flex justify-center mb-4">
                        <RoleBox roleId="president" label="Ketua Kelas" />
                    </div>

                    {/* Connecting Line */}
                    <div className="w-px h-8 bg-gray-300 mx-auto"></div>

                    {/* Level 3: Wakil Ketua Kelas */}
                    <div className="flex justify-center mb-4">
                        <RoleBox roleId="vicePresident" label="Wakil Ketua" />
                    </div>
                    
                    {/* Connecting Lines */}
                    <div className="w-1/2 h-8 border-l border-r border-t border-gray-300 mx-auto"></div>
                    
                    {/* Level 4: Sekretaris & Bendahara */}
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-gray-50 p-3 rounded-lg border">
                            <h4 className="font-bold mb-2">Sekretaris</h4>
                            <div className="flex justify-around"><RoleBox roleId="secretary1" label="Sekretaris 1" /><RoleBox roleId="secretary2" label="Sekretaris 2" /></div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg border">
                            <h4 className="font-bold mb-2">Bendahara</h4>
                            <div className="flex justify-around"><RoleBox roleId="treasurer1" label="Bendahara 1" /><RoleBox roleId="treasurer2" label="Bendahara 2" /></div>
                        </div>
                    </div>

                    {/* Level 5: Seksi */}
                    <div className="border-t pt-6">
                        <h4 className="font-bold mb-4">Seksi - Seksi</h4>
                        <div className="flex flex-wrap justify-center gap-6">
                            {structure.sections.map(section => (
                                <div key={section.id} className="relative group">
                                    <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity no-print">
                                        <button onClick={() => setEditingSection(section)} className="p-1 bg-white rounded-full shadow border text-gray-500 hover:text-indigo-600"><PenTool size={12}/></button>
                                        <button onClick={() => handleDeleteSection(section.id)} className="p-1 bg-white rounded-full shadow border text-gray-500 hover:text-red-600"><Trash2 size={12}/></button>
                                    </div>
                                    <RoleBox roleId={section.id} label={section.name} />
                                </div>
                            ))}
                            <div className="flex flex-col items-center no-print">
                                 <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">&nbsp;</span>
                                <button onClick={handleAddSection} className="w-32 h-20 mt-1 rounded-lg flex items-center justify-center p-2 text-center transition-all bg-gray-100 border-2 border-dashed border-gray-300 hover:border-indigo-400 hover:bg-white text-gray-400 hover:text-indigo-500">
                                    <Plus size={24}/>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {editingSection && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setEditingSection(null)}>
                    <div className="bg-white p-4 rounded-lg shadow-lg flex gap-2" onClick={e => e.stopPropagation()}>
                        <input 
                            value={editingSection.name} 
                            onChange={e => setEditingSection({...editingSection, name: e.target.value})}
                            className="border p-2 rounded"
                        />
                        <button onClick={handleUpdateSectionName} className="bg-indigo-500 text-white px-4 rounded">Simpan</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrganizationChartTab;
