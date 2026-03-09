
import React from 'react';
import { SchoolProfileData } from '../../types';
import { compressImage } from '../../utils/imageHelper';
import { Code, Image as ImageIcon, MessageSquare, Edit } from 'lucide-react';

interface DeveloperInfoTabProps {
  school: SchoolProfileData;
  setSchool: React.Dispatch<React.SetStateAction<SchoolProfileData>>;
  isReadOnly?: boolean;
}

const DeveloperInfoTab: React.FC<DeveloperInfoTabProps> = ({ school, setSchool, isReadOnly }) => {
    const devInfo = school.developerInfo || { name: '', moto: '', photo: '' };

    const handleFieldChange = (field: 'name' | 'moto', value: string) => {
        if (isReadOnly) return;
        setSchool(prev => ({
            ...prev,
            developerInfo: { ...(prev.developerInfo || { name: '', moto: '', photo: '' }), [field]: value }
        }));
    };
    
    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isReadOnly) return;
        const file = e.target.files?.[0];
        if (file) {
            const base64 = await compressImage(file, 200, 0.7);
            setSchool(prev => ({
                ...prev,
                developerInfo: { ...(prev.developerInfo || { name: '', moto: '', photo: '' }), photo: base64 }
            }));
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <h3 className="text-lg font-bold text-gray-800 border-b pb-2 flex items-center">
                <Code size={20} className="mr-2 text-indigo-600"/>
                Info Pengembang Aplikasi
            </h3>
            
            <p className="text-sm text-gray-500 bg-indigo-50 border border-indigo-100 p-3 rounded-lg">
                Informasi ini akan ditampilkan dalam pop-up di halaman login untuk memberikan kredit kepada pengembang.
            </p>

            <div className="flex items-center gap-6">
                <div 
                    className="w-24 h-24 rounded-full bg-gray-100 border-4 border-white shadow-md overflow-hidden relative group cursor-pointer"
                    onClick={() => !isReadOnly && document.getElementById('dev-photo-upload')?.click()}
                >
                    {devInfo.photo ? (
                        <img src={devInfo.photo} alt="Developer" className="w-full h-full object-cover"/>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400"><ImageIcon size={32}/></div>
                    )}
                    {!isReadOnly && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Edit size={24} className="text-white"/>
                        </div>
                    )}
                </div>
                <div>
                    <h4 className="font-bold text-gray-700">Foto Pengembang</h4>
                    <p className="text-xs text-gray-500">Klik untuk mengubah. Disarankan foto persegi.</p>
                    {!isReadOnly && (
                        <input type="file" id="dev-photo-upload" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                    )}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pengembang</label>
                <input 
                    type="text" 
                    value={devInfo.name} 
                    onChange={e => handleFieldChange('name', e.target.value)} 
                    disabled={isReadOnly}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-50" 
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Moto / Kutipan</label>
                <textarea 
                    rows={2}
                    value={devInfo.moto}
                    onChange={e => handleFieldChange('moto', e.target.value)}
                    disabled={isReadOnly}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none disabled:bg-gray-50"
                />
            </div>
        </div>
    );
};

export default DeveloperInfoTab;
