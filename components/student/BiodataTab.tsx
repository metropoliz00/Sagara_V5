import React from 'react';
import { Student } from '../../types';
import { compressImage } from '../../utils/imageHelper';

interface BiodataTabProps {
  student: Student;
  onChange: (field: keyof Student, value: any) => void;
}

const BiodataTab: React.FC<BiodataTabProps> = ({ student, onChange }) => {
  return (
    <div className="space-y-6 animate-fade-in">
        <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Identitas Siswa</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
                <label className="block text-sm font-medium mb-1">Nama Lengkap</label>
                <input type="text" value={student.name} onChange={(e) => onChange('name', e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none print:border-none print:p-0" />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Gender</label>
                <select value={student.gender} onChange={(e) => onChange('gender', e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none print:appearance-none print:border-none print:p-0">
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">NIS</label>
                <input type="text" value={student.nis} onChange={(e) => onChange('nis', e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none print:border-none print:p-0" />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">NISN</label>
                <input type="text" value={student.nisn || ''} onChange={(e) => onChange('nisn', e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none print:border-none print:p-0" placeholder="-" />
            </div>
            
            <div>
                <label className="block text-sm font-medium mb-1">Agama</label>
                <select value={student.religion || 'Islam'} onChange={(e) => onChange('religion', e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none print:appearance-none print:border-none print:p-0">
                <option value="Islam">Islam</option>
                <option value="Kristen">Kristen</option>
                <option value="Katolik">Katolik</option>
                <option value="Hindu">Hindu</option>
                <option value="Buddha">Buddha</option>
                <option value="Konghucu">Konghucu</option>
                </select>
            </div>
            
            <div>
                <label className="block text-sm font-medium mb-1">Kelas</label>
                <input type="text" value={student.classId || ''} onChange={(e) => onChange('classId', e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none print:border-none print:p-0" />
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Tempat Lahir</label>
                <input type="text" value={student.birthPlace || ''} onChange={(e) => onChange('birthPlace', e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none print:border-none print:p-0" />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Tanggal Lahir</label>
                <input type="date" value={student.birthDate} onChange={(e) => onChange('birthDate', e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none print:border-none print:p-0" />
            </div>
            <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Alamat Domisili</label>
                <textarea value={student.address} onChange={(e) => onChange('address', e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none print:border-none print:p-0" rows={3} />
            </div>
            
            <div className="md:col-span-2 mt-4"><h4 className="font-bold text-gray-800 border-b pb-2">Data Orang Tua / Wali</h4></div>
            
            <div>
                <label className="block text-sm font-medium mb-1">Nama Ayah</label>
                <input type="text" value={student.fatherName || ''} onChange={(e) => onChange('fatherName', e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none print:border-none print:p-0" />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Pekerjaan Ayah</label>
                <input type="text" value={student.fatherJob || ''} onChange={(e) => onChange('fatherJob', e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none print:border-none print:p-0" />
            </div>
             <div>
                <label className="block text-sm font-medium mb-1">Pendidikan Ayah</label>
                <input type="text" value={student.fatherEducation || ''} onChange={(e) => onChange('fatherEducation', e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none print:border-none print:p-0" />
            </div>
            
            <div>
                <label className="block text-sm font-medium mb-1">Nama Ibu</label>
                <input type="text" value={student.motherName || ''} onChange={(e) => onChange('motherName', e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none print:border-none print:p-0" />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Pekerjaan Ibu</label>
                <input type="text" value={student.motherJob || ''} onChange={(e) => onChange('motherJob', e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none print:border-none print:p-0" />
            </div>
             <div>
                <label className="block text-sm font-medium mb-1">Pendidikan Ibu</label>
                <input type="text" value={student.motherEducation || ''} onChange={(e) => onChange('motherEducation', e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none print:border-none print:p-0" />
            </div>
            
            <div>
                <label className="block text-sm font-medium mb-1">Pekerjaan Wali</label>
                <input type="text" value={student.parentJob || ''} onChange={(e) => onChange('parentJob', e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none print:border-none print:p-0" />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">No. HP Wali</label>
                <input type="text" value={student.parentPhone} onChange={(e) => onChange('parentPhone', e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none print:border-none print:p-0" />
            </div>
        </div>
    </div>
  );
};

export default BiodataTab;