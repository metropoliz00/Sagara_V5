import React from 'react';
import { Student } from '../../types';

interface HealthTabProps {
  student: Student;
  onChange: (field: keyof Student, value: any) => void;
}

const HealthTab: React.FC<HealthTabProps> = ({ student, onChange }) => {
  return (
    <div className="space-y-6 animate-fade-in print:mt-6">
        <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Fisik & Kesehatan</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
                <label className="block text-sm font-medium mb-1">Tinggi Badan (cm)</label>
                <input type="number" value={student.height || 0} onChange={(e) => onChange('height', Number(e.target.value))} className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none print:border-none print:p-0" />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Berat Badan (kg)</label>
                <input type="number" value={student.weight || 0} onChange={(e) => onChange('weight', Number(e.target.value))} className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none print:border-none print:p-0" />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Golongan Darah</label>
                <input type="text" value={student.bloodType || ''} onChange={(e) => onChange('bloodType', e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none print:border-none print:p-0" />
            </div>
            <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Catatan Kesehatan / Riwayat Penyakit</label>
                <textarea value={student.healthNotes || ''} onChange={(e) => onChange('healthNotes', e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none print:border-none print:p-0" rows={3} />
            </div>
        </div>
    </div>
  );
};

export default HealthTab;