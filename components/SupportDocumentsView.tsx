
import React, { useState } from 'react';
import { SupportDocument } from '../types';
import { FileCheck, Plus, Trash2, Edit, X, Save, Loader2, ExternalLink } from 'lucide-react';

interface SupportDocumentsViewProps {
  documents: SupportDocument[];
  onSave: (doc: Omit<SupportDocument, 'id'> | SupportDocument) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onShowNotification: (message: string, type: 'success' | 'error' | 'warning') => void;
  classId: string;
  isReadOnly?: boolean;
}

const SupportDocumentsView: React.FC<SupportDocumentsViewProps> = ({ 
  documents, onSave, onDelete, onShowNotification, classId, isReadOnly 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Partial<SupportDocument> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const openModal = (doc: SupportDocument | null = null) => {
    if (isReadOnly) return;
    setEditingDoc(doc ? { ...doc } : { name: '', url: '', classId });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDoc(null);
  };

  const handleSave = async () => {
    if (!editingDoc || !editingDoc.name || !editingDoc.url) {
      onShowNotification('Nama File dan Link URL wajib diisi.', 'warning');
      return;
    }
    setIsSaving(true);
    try {
      await onSave(editingDoc as SupportDocument);
      onShowNotification('Bukti dukung berhasil disimpan.', 'success');
      closeModal();
    } catch (e) {
      onShowNotification('Gagal menyimpan data.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <FileCheck className="mr-3 text-indigo-600" />
            Bukti Dukung Administrasi
          </h2>
          <p className="text-gray-500">Kumpulan tautan untuk dokumen pendukung administrasi kelas.</p>
        </div>
        {!isReadOnly && (
          <button 
            onClick={() => openModal()} 
            className="flex items-center gap-2 bg-indigo-600 text-white font-bold px-4 py-2 rounded-lg shadow-md hover:bg-indigo-700"
          >
            <Plus size={18} /> Tambah Bukti
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-medium">
              <tr>
                <th className="p-4 w-12 text-center">No</th>
                <th className="p-4">Nama File</th>
                <th className="p-4">Link File</th>
                {!isReadOnly && <th className="p-4 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={isReadOnly ? 3 : 4} className="p-8 text-center text-gray-400">
                    Belum ada bukti dukung yang ditambahkan.
                  </td>
                </tr>
              ) : (
                documents.map((doc, index) => (
                  <tr key={doc.id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="p-4 text-center text-gray-500">{index + 1}</td>
                    <td className="p-4 font-semibold text-gray-800">{doc.name}</td>
                    <td className="p-4">
                      <a 
                        href={doc.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline flex items-center gap-1.5 text-xs max-w-xs truncate"
                      >
                        {doc.url} <ExternalLink size={12} />
                      </a>
                    </td>
                    {!isReadOnly && (
                      <td className="p-4 text-right flex justify-end gap-2">
                        <button onClick={() => openModal(doc)} className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => onDelete(doc.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-800">{editingDoc.id ? 'Edit Bukti Dukung' : 'Tambah Bukti Dukung'}</h3>
              <button onClick={closeModal}><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">Nama File</label>
                <input 
                  type="text" 
                  value={editingDoc.name || ''} 
                  onChange={e => setEditingDoc({...editingDoc, name: e.target.value})}
                  className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Contoh: SK Pembagian Tugas Mengajar"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">Link URL</label>
                <input 
                  type="url" 
                  value={editingDoc.url || ''} 
                  onChange={e => setEditingDoc({...editingDoc, url: e.target.value})}
                  className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="https://docs.google.com/..."
                />
                 <p className="text-xs text-gray-400 mt-1">Pastikan link dapat diakses oleh publik (siapa saja yang memiliki link).</p>
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
              <button onClick={closeModal} className="px-4 py-2 rounded-lg border bg-white text-gray-600 hover:bg-gray-100">Batal</button>
              <button 
                onClick={handleSave} 
                disabled={isSaving}
                className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg flex items-center gap-2 shadow-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportDocumentsView;
