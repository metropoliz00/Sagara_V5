
import React, { useState, useEffect } from 'react';
import { Clock, Save, X, Coffee, GripVertical, Flag, BookOpen, BrainCircuit, Users, Plus, Trash2 } from 'lucide-react';
import { WEEKDAYS, MOCK_SUBJECTS } from '../../constants';
import { ScheduleItem } from '../../types';

interface ScheduleTabProps {
  schedule: ScheduleItem[];
  timeSlots: string[];
  onSave: (schedule: ScheduleItem[], timeSlots: string[]) => Promise<void>;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
}

const SUBJECT_COLORS: { [key: string]: string } = {
  'default': 'bg-gray-200 text-gray-800',
  'PAI': 'bg-green-200 text-green-800',
  'Pend. Pancasila': 'bg-emerald-200 text-emerald-800',
  'Bahasa Indonesia': 'bg-blue-200 text-blue-800',
  'Matematika': 'bg-yellow-200 text-yellow-800',
  'IPAS': 'bg-slate-300 text-slate-800',
  'Seni dan Budaya': 'bg-purple-200 text-purple-800',
  'PJOK': 'bg-cyan-200 text-cyan-800',
  'Bahasa Jawa': 'bg-orange-200 text-orange-800',
  'Bahasa Inggris': 'bg-rose-200 text-rose-800',
  'KKA': 'bg-lime-200 text-lime-800',
  'Upacara': 'bg-red-200 text-red-800',
  'Pembiasaan': 'bg-sky-200 text-sky-800',
  'Ko-Kurikuler': 'bg-teal-200 text-teal-800',
  'Literasi/Numerasi': 'bg-fuchsia-200 text-fuchsia-800',
};

const getSubjectColor = (subjectName: string) => {
    return SUBJECT_COLORS[subjectName] || SUBJECT_COLORS['default'];
};

const SUBJECT_PALETTE_ITEMS = MOCK_SUBJECTS.map(s => ({ subject: s.name, isBreak: false }));

const ACTIVITY_PALETTE_ITEMS = [
    { subject: 'Upacara', icon: Flag, color: 'bg-red-200 text-red-800' },
    { subject: 'Pembiasaan', icon: BookOpen, color: 'bg-sky-200 text-sky-800' },
    { subject: 'Ko-Kurikuler', icon: Users, color: 'bg-teal-200 text-teal-800' },
    { subject: 'Literasi/Numerasi', icon: BrainCircuit, color: 'bg-fuchsia-200 text-fuchsia-800' },
    { subject: 'Istirahat', icon: Coffee, color: 'bg-slate-600 text-white' }
];

const ScheduleTab: React.FC<ScheduleTabProps> = ({ schedule, timeSlots, onSave, onShowNotification }) => {
  const [localSchedule, setLocalSchedule] = useState<ScheduleItem[]>(schedule);
  const [localTimeSlots, setLocalTimeSlots] = useState<string[]>(timeSlots);
  const [isSaving, setIsSaving] = useState(false);
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [dragOverCell, setDragOverCell] = useState<{ day: string, time: string } | null>(null);

  useEffect(() => {
    setLocalSchedule(schedule);
  }, [schedule]);

  useEffect(() => {
    setLocalTimeSlots(timeSlots);
  }, [timeSlots]);

  const handleTimeChange = (index: number, newValue: string) => {
    const oldTime = localTimeSlots[index];
    
    // Update time slots array
    const newTimeSlots = [...localTimeSlots];
    newTimeSlots[index] = newValue;
    setLocalTimeSlots(newTimeSlots);

    // Update corresponding schedule items
    const newSchedule = localSchedule.map(item => {
        if (item.time === oldTime) {
            return { ...item, time: newValue };
        }
        return item;
    });
    setLocalSchedule(newSchedule);
  };

  const handleDragStart = (e: React.DragEvent, item: any, source?: {day: string, time: string}) => {
    const payload = { ...item, source };
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    setDraggedItem(payload);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, day: string, time: string) => {
    e.preventDefault();
    if (!dragOverCell || dragOverCell.day !== day || dragOverCell.time !== time) {
      setDragOverCell({ day, time });
    }
  };

  const handleDrop = (e: React.DragEvent, day: string, time: string) => {
    e.preventDefault();
    const droppedItem = JSON.parse(e.dataTransfer.getData('application/json'));
    setDragOverCell(null);
    setDraggedItem(null);

    let newSchedule = [...localSchedule];

    // Find if target cell is already occupied
    const targetCellIndex = newSchedule.findIndex(item => item.day === day && item.time === time);
    const itemInTargetCell = targetCellIndex !== -1 ? newSchedule[targetCellIndex] : null;

    // Case 1: Moving an item from another cell (source is defined)
    if (droppedItem.source) {
      const sourceCellIndex = newSchedule.findIndex(item => item.day === droppedItem.source.day && item.time === droppedItem.source.time);
      
      if (sourceCellIndex !== -1) {
        // Swap items if target is occupied
        if (itemInTargetCell) {
          newSchedule[sourceCellIndex] = { ...itemInTargetCell, day: droppedItem.source.day, time: droppedItem.source.time };
          newSchedule[targetCellIndex] = { ...newSchedule[sourceCellIndex], day, time };
        } else { // Move to empty cell
          newSchedule[sourceCellIndex] = { ...newSchedule[sourceCellIndex], day, time };
        }
      }
    } 
    // Case 2: Dropping a new item from palette
    else {
      const newItem: ScheduleItem = {
        id: `sch-${Date.now()}`,
        day, time,
        subject: droppedItem.subject
      };
      
      // If target cell has an item, remove it before placing the new one
      if (itemInTargetCell) {
        newSchedule = newSchedule.filter(item => item.id !== itemInTargetCell.id);
      }
      newSchedule.push(newItem);
    }

    setLocalSchedule(newSchedule);
  };

  const removeItem = (id: string) => {
      setLocalSchedule(localSchedule.filter(item => item.id !== id));
  };
  
  const handleGlobalSave = async () => {
    setIsSaving(true);
    try {
      await onSave(localSchedule, localTimeSlots);
    } catch(e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddRow = () => {
    setLocalTimeSlots([...localTimeSlots, '00:00 - 00:00']);
  };

  const handleRemoveRow = (indexToRemove: number) => {
    const timeToRemove = localTimeSlots[indexToRemove];
    
    // Remove the time slot
    const newTimeSlots = localTimeSlots.filter((_, index) => index !== indexToRemove);
    setLocalTimeSlots(newTimeSlots);

    // Remove any schedule items associated with this time slot
    const newSchedule = localSchedule.filter(item => item.time !== timeToRemove);
    setLocalSchedule(newSchedule);
  };

  const findItemForCell = (day: string, time: string) => {
    return localSchedule.find(item => item.day === day && item.time === time);
  };
  
  return (
    <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Palette */}
        <div className="lg:w-64 shrink-0 space-y-4 no-print">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-3">Mata Pelajaran</h3>
                <div className="space-y-2">
                    {SUBJECT_PALETTE_ITEMS.map((item, idx) => (
                        <div 
                            key={`pal-${idx}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, item)}
                            className={`p-2 rounded-lg text-xs font-bold cursor-grab active:cursor-grabbing flex items-center gap-2 transition-all hover:scale-105 hover:shadow-md ${getSubjectColor(item.subject)}`}
                        >
                            <GripVertical size={14} className="opacity-50"/>
                            {item.subject}
                        </div>
                    ))}
                </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-3">Aktivitas</h3>
                 <div className="space-y-2">
                    {ACTIVITY_PALETTE_ITEMS.map((item, idx) => {
                        const Icon = item.icon;
                        return (
                            <div 
                                key={`act-${idx}`}
                                draggable
                                onDragStart={(e) => handleDragStart(e, { subject: item.subject, isBreak: item.subject === 'Istirahat' })}
                                className={`p-2 rounded-lg text-xs font-bold cursor-grab active:cursor-grabbing flex items-center gap-2 transition-all hover:scale-105 hover:shadow-md ${item.color}`}
                            >
                                <GripVertical size={14} className="opacity-50"/>
                                {Icon && <Icon size={14}/>}
                                {item.subject}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>

        {/* Right: Schedule Grid */}
        <div className="flex-1 print-container">
            <div className="flex justify-between items-center mb-4 no-print">
                <p className="text-sm text-gray-500">Seret & lepas mata pelajaran ke dalam jadwal.</p>
                <div className="flex gap-2">
                    <button onClick={handleAddRow} className="flex items-center gap-2 bg-emerald-600 text-white font-bold px-4 py-2 rounded-lg shadow-md hover:bg-emerald-700">
                        <Plus size={16} /> Tambah Baris
                    </button>
                    <button onClick={handleGlobalSave} disabled={isSaving} className="flex items-center gap-2 bg-indigo-600 text-white font-bold px-4 py-2 rounded-lg shadow-md hover:bg-indigo-700 disabled:opacity-50">
                        <Save size={16} /> {isSaving ? 'Menyimpan...' : 'Simpan Semua Jadwal'}
                    </button>
                </div>
            </div>
            <div className="hidden print-only text-center mb-6">
                <h2 className="text-xl font-bold uppercase">JADWAL PELAJARAN</h2>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                <table className="w-full border-collapse text-xs min-w-[1000px]">
                    <thead>
                        <tr className="bg-indigo-50 print:bg-indigo-50">
                            <th className="p-2 border font-bold text-indigo-900 w-32 print:text-indigo-900">Waktu</th>
                            {WEEKDAYS.map(day => (
                                <th key={day} className="p-2 border font-bold text-indigo-900 print:text-indigo-900">{day}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {localTimeSlots.map((time, index) => (
                            <tr key={index}>
                                <td className="p-1 border text-center font-semibold text-gray-600 bg-gray-50 print:bg-white relative group">
                                    <div className="flex items-center justify-center gap-1">
                                        <input 
                                            type="text" 
                                            value={time}
                                            onChange={(e) => handleTimeChange(index, e.target.value)}
                                            className="w-full text-center font-semibold text-gray-600 bg-gray-50 outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded p-1 print:bg-transparent print:p-0 print:border-none no-print"
                                            aria-label={`Edit time slot ${index + 1}`}
                                        />
                                        <button 
                                            onClick={() => handleRemoveRow(index)}
                                            className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity no-print"
                                            title="Hapus Baris"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <span className="hidden print:inline">{time}</span>
                                </td>
                                {WEEKDAYS.map(day => {
                                    const item = findItemForCell(day, time);
                                    const isDragOver = dragOverCell?.day === day && dragOverCell?.time === time;
                                    const isBreak = item?.subject.toLowerCase().includes('istirahat');

                                    return (
                                        <td 
                                            key={`${day}-${time}`} 
                                            onDragOver={(e) => handleDragOver(e, day, time)}
                                            onDrop={(e) => handleDrop(e, day, time)}
                                            onDragLeave={() => setDragOverCell(null)}
                                            className={`p-1 border align-top h-20 transition-colors ${isDragOver ? 'bg-indigo-100 border-2 border-dashed border-indigo-400' : ''}`}
                                        >
                                            {item && (
                                                <div 
                                                  draggable
                                                  onDragStart={(e) => handleDragStart(e, {subject: item.subject, isBreak}, {day, time})}
                                                  className={`relative group p-2 rounded-lg h-full flex flex-col justify-center text-center font-bold text-xs cursor-grab active:cursor-grabbing shadow-sm
                                                    ${isBreak ? 'bg-slate-600 text-white' : getSubjectColor(item.subject)}`}
                                                >
                                                  {isBreak && <Coffee size={14} className="mx-auto mb-1"/>}
                                                  {item.subject}
                                                  <button 
                                                    onClick={() => removeItem(item.id)}
                                                    className="absolute top-1 right-1 w-4 h-4 bg-black/20 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity no-print"
                                                  >
                                                    <X size={10}/>
                                                  </button>
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};

export default ScheduleTab;