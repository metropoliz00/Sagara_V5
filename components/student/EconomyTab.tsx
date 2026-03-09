import React from 'react';
import { Student } from '../../types';

interface EconomyTabProps {
  student: Student;
  onChange: (field: keyof Student, value: any) => void;
}

const EconomyTab: React.FC<EconomyTabProps> = ({ student, onChange }) => {
  return (
    <div className="space-y-6 animate-fade-in print:mt-6">
        <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Sosial Ekonomi</h3>
        <div>
            <label className="block text-sm font-medium mb-1">Status Ekonomi</label>
            <select value={student.economyStatus} onChange={(e) => onChange('economyStatus', e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none print:appearance-none print:border-none print:p-0">
                <option value="Mampu">Mampu</option>
                <option value="Cukup">Cukup</option>
                <option value="Kurang Mampu">Kurang Mampu</option>
                <option value="KIP">Pemegang KIP/KPS</option>
            </select>
        </div>
    </div>
  );
};

export default EconomyTab;