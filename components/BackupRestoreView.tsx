import React, { useState } from 'react';
import { apiService } from '../services/apiService';
import { User } from '../types';

interface BackupRestoreViewProps {
  currentUser: User | null;
}

const BackupRestoreView: React.FC<BackupRestoreViewProps> = ({ currentUser }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleBackup = async () => {
    if (!currentUser?.classId) {
      setError('Tidak ada kelas yang dipilih.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const backupData = await apiService.backupData(currentUser.classId);
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-kelasku-${currentUser.classId}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccess('Data berhasil di-backup.');
    } catch (err) {
      setError('Gagal melakukan backup data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        setLoading(true);
        setError(null);
        setSuccess(null);

        await apiService.restoreData(data);
        setSuccess('Data berhasil di-restore. Silakan muat ulang halaman.');
      } catch (err) {
        setError('Gagal me-restore data. Pastikan file backup valid.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Backup & Restore Data</h2>
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Backup Data</h3>
          <p className="text-sm text-gray-600 mb-2">Simpan semua data kelas Anda ke dalam sebuah file JSON.</p>
          <button
            onClick={handleBackup}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loading ? 'Memproses...' : 'Backup Data'}
          </button>
        </div>
        <div>
          <h3 className="text-lg font-semibold">Restore Data</h3>
          <p className="text-sm text-gray-600 mb-2">Pulihkan data dari file backup JSON. Ini akan menimpa data yang ada.</p>
          <input
            type="file"
            accept=".json"
            onChange={handleRestore}
            disabled={loading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
        {error && <div className="text-red-500">{error}</div>}
        {success && <div className="text-green-500">{success}</div>}
      </div>
    </div>
  );
};

export default BackupRestoreView;
