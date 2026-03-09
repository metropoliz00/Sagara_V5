import React from 'react';
import { Student } from '../../types';
import { Trophy, AlertTriangle } from 'lucide-react';

interface RecordsTabProps {
  student: Student;
  tempAchievements: string;
  setTempAchievements: (val: string) => void;
  tempViolations: string;
  setTempViolations: (val: string) => void;
}

const RecordsTab: React.FC<RecordsTabProps> = ({ 
  student, 
  tempAchievements, 
  setTempAchievements,
  tempViolations,
  setTempViolations
}) => {
  return (
    <div className="space-y-6 animate-fade-in print:mt-6">
        <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Catatan Prestasi & Pelanggaran</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                <h4 className="font-bold text-emerald-700 mb-2 flex items-center"><Trophy size={16} className="mr-2"/> Prestasi</h4>
                <div className="no-print mb-2">
                    <label className="text-xs font-semibold text-emerald-600 block mb-1">Edit Prestasi (Pisahkan dengan koma)</label>
                    <textarea 
                    value={tempAchievements} 
                    onChange={(e) => setTempAchievements(e.target.value)}
                    className="w-full text-sm p-2 rounded border border-emerald-200 focus:outline-emerald-500" 
                    rows={3}
                    />
                </div>
                <ul className="list-disc pl-5 text-sm space-y-1 text-emerald-800">
                    {student.achievements?.map((ach, idx) => <li key={idx}>{ach}</li>)}
                </ul>
            </div>
            <div className="bg-rose-50 p-4 rounded-xl border border-rose-100">
                <h4 className="font-bold text-rose-700 mb-2 flex items-center"><AlertTriangle size={16} className="mr-2"/> Pelanggaran</h4>
                <div className="no-print mb-2">
                    <label className="text-xs font-semibold text-rose-600 block mb-1">Edit Pelanggaran (Pisahkan dengan koma)</label>
                    <textarea 
                    value={tempViolations} 
                    onChange={(e) => setTempViolations(e.target.value)}
                    className="w-full text-sm p-2 rounded border border-rose-200 focus:outline-rose-500" 
                    rows={3}
                    />
                </div>
                <ul className="list-disc pl-5 text-sm space-y-1 text-rose-800">
                    {student.violations?.map((vio, idx) => <li key={idx}>{vio}</li>)}
                </ul>
            </div>
        </div>
    </div>
  );
};

export default RecordsTab;