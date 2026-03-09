
import React, { useRef, useState } from 'react';
import { Download, Upload, AlertTriangle, CheckCircle, Loader2, Database, FileJson } from 'lucide-react';
import { apiService } from '../services/apiService';
import { useModal } from '../context/ModalContext';

interface BackupRestoreProps {
  data: any; // Contains all application state to be backed up
  onRestore: (data: any) => Promise<void>;
}

const BackupRestore: React.FC<BackupRestoreProps> = ({ data, onRestore }) => {
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showAlert, showConfirm } = useModal();

  const handleDownloadBackup = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `SAGARA_BACKUP_${timestamp}.json`;
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUploadBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonContent = JSON.parse(event.target?.result as string);
        showConfirm(
          "PERINGATAN: Tindakan ini akan MENIMPA SEMUA DATA yang ada di database dengan data dari file backup. Apakah Anda yakin ingin melanjutkan?",
          async () => {
            setIsRestoring(true);
            setRestoreStatus('idle');
            try {
                await onRestore(jsonContent);
                setRestoreStatus('success');
                showAlert("Restore data berhasil! Silakan refresh halaman.", "success");
            } catch (err) {
                console.error(err);
                setRestoreStatus('error');
                showAlert("Gagal melakukan restore data.", "error");
            } finally {
                setIsRestoring(false);
            }
          }
        );
      } catch (err) {
        showAlert("File backup tidak valid.", "error");
      }
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <Database className="mr-2 text-indigo-600" /> Backup & Restore Data
          </h2>
          <p className="text-gray-500">Amankan data aplikasi atau pulihkan dari file cadangan sebelumnya.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* EXPORT CARD */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-indigo-600 p-6 text-white">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
                    <Download size={32} />
                </div>
                <h3 className="text-xl font-bold">Download Backup</h3>
                <p className="text-indigo-100 text-sm mt-1">Unduh seluruh data database ke dalam file JSON.</p>
            </div>
            <div className="p-6">
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6">
                    <h4 className="font-bold text-indigo-800 text-sm mb-2 flex items-center"><FileJson size={16} className="mr-2"/> Isi Backup:</h4>
                    <ul className="text-xs text-gray-600 grid grid-cols-2 gap-2 list-disc pl-4">
                        <li>Data Siswa & Orang Tua</li>
                        <li>Data Guru & Akun</li>
                        <li>Nilai & Absensi</li>
                        <li>Jurnal & Konseling</li>
                        <li>Inventaris & Tamu</li>
                        <li>Konfigurasi Kelas</li>
                    </ul>
                </div>
                <button 
                    onClick={handleDownloadBackup}
                    className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-md flex items-center justify-center"
                >
                    <Download size={20} className="mr-2" /> Download File .JSON
                </button>
            </div>
        </div>

        {/* IMPORT CARD */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-emerald-600 p-6 text-white">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
                    <Upload size={32} />
                </div>
                <h3 className="text-xl font-bold">Restore Database</h3>
                <p className="text-emerald-100 text-sm mt-1">Pulihkan data dari file backup JSON yang tersimpan.</p>
            </div>
            <div className="p-6">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-amber-800 text-sm">
                    <div className="flex items-center font-bold mb-1">
                        <AlertTriangle size={18} className="mr-2" /> PERHATIAN
                    </div>
                    <p className="text-xs">
                        Proses ini akan <strong>MENGHAPUS & MENIMPA</strong> seluruh data saat ini dengan data dari file backup. Pastikan Anda memilih file yang benar.
                    </p>
                </div>
                
                <input 
                    type="file" 
                    ref={fileInputRef}
                    accept=".json"
                    onChange={handleUploadBackup}
                    className="hidden"
                />
                
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isRestoring}
                    className={`w-full py-3 font-bold rounded-xl transition-colors shadow-md flex items-center justify-center ${
                        isRestoring 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                >
                    {isRestoring ? (
                        <>
                            <Loader2 size={20} className="mr-2 animate-spin" /> Memproses Restore...
                        </>
                    ) : (
                        <>
                            <Upload size={20} className="mr-2" /> Upload File Backup
                        </>
                    )}
                </button>

                {restoreStatus === 'success' && (
                    <div className="mt-4 p-3 bg-emerald-50 text-emerald-700 rounded-lg flex items-center justify-center text-sm font-bold animate-fade-in">
                        <CheckCircle size={18} className="mr-2"/> Data berhasil dipulihkan!
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default BackupRestore;
