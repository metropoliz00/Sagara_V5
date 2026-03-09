import React from 'react';
import { Student } from '../../types';

interface TalentsTabProps {
  student: Student;
  onChange: (field: keyof Student, value: any) => void;
}

const TalentsTab: React.FC<TalentsTabProps> = ({ student, onChange }) => {
  return (
    <div className="space-y-6 animate-fade-in print:mt-6">
        <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Minat & Bakat</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
                <label className="block text-sm font-medium mb-1">Hobi</label>
                <input type="text" value={student.hobbies || ''} onChange={(e) => onChange('hobbies', e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none print:border-none print:p-0" />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Cita-cita</label>
                <input type="text" value={student.ambition || ''} onChange={(e) => onChange('ambition', e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none print:border-none print:p-0" />
            </div>
        </div>
    </div>
  );
};

export default TalentsTab;