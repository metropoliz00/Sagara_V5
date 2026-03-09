
import React from 'react';
import { Upload, Trash2, FileText, Save, Loader2 } from 'lucide-react';
import { TeacherProfileData } from '../../types';
import { compressImage } from '../../utils/imageHelper';
import { useModal } from '../../context/ModalContext';

interface SignatureTabProps {
  profile: TeacherProfileData;
  setProfile: React.Dispatch<React.SetStateAction<TeacherProfileData>>;
  onSave: () => Promise<void>;
  isSaving: boolean;
}

const SignatureTab: React.FC<SignatureTabProps> = ({ profile, setProfile, onSave, isSaving }) => {
  const { showAlert } = useModal();

  const handleSignatureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        // Kompres agresif untuk TTD agar muat di sheet (300px cukup untuk TTD)
        const resizedBase64 = await compressImage(file, 300, 0.6);
        setProfile({ ...profile, signature: resizedBase64 });
      } catch (error) {
        console.error("Gagal upload TTD", error);
        showAlert("Gagal memproses tanda tangan.", "error");
      }
    }
  };

  const handleRemoveSignature = () => {
    setProfile({ ...profile, signature: '' });
  };

  return (
    <div className="animate-fade-in">
      <div className="space-y-6 text-center py-10">
        {!profile.signature ? (
        <div className="relative group mx-auto w-64 h-32 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
            <input 
                type="file" 
                accept="image/*" 
                onChange={handleSignatureUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="flex flex-col items-center pointer-events-none">
                <div className="bg-white p-2 rounded-full shadow-sm mb-2">
                <Upload size={24} className="text-gray-600" />
                </div>
                <span className="text-sm font-medium text-gray-500 group-hover:text-indigo-600 transition-colors">Upload Tanda Tangan</span>
                <span className="text-xs text-gray-400 mt-1">PNG Transparan (Max 2MB)</span>
            </div>
        </div>
        ) : (
        <div className="flex flex-col items-center">
            <p className="text-sm font-medium text-gray-500 mb-3">Preview Tanda Tangan:</p>
            <div className="relative group w-64 h-32 border border-gray-200 rounded-xl flex items-center justify-center bg-white shadow-sm overflow-hidden">
                <img src={profile.signature} alt="Signature Preview" className="max-w-full max-h-full object-contain" />
                <button 
                onClick={handleRemoveSignature}
                className="absolute top-2 right-2 p-1.5 bg-red-100 text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200"
                title="Hapus Tanda Tangan"
                >
                    <Trash2 size={16} />
                </button>
            </div>
            <p className="text-xs text-green-600 mt-3 flex items-center justify-center">
                <FileText size={12} className="mr-1" />
                Tanda tangan siap digunakan untuk laporan
            </p>
        </div>
        )}
      </div>
      <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
            <button 
                onClick={onSave}
                disabled={isSaving}
                className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                <span>{isSaving ? 'Menyimpan...' : 'Simpan Tanda Tangan'}</span>
            </button>
        </div>
    </div>
  );
};

export default SignatureTab;
