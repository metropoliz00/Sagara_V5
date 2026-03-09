import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LearningDocumentation } from '../types';
import { Camera, Plus, Trash2, Edit, X, Save, Loader2, ExternalLink, ChevronLeft, ChevronRight, Image as ImageIcon, Eye, EyeOff } from 'lucide-react';

interface LearningDocumentationViewProps {
  documentation: LearningDocumentation[];
  onSave: (doc: Omit<LearningDocumentation, 'id'> | LearningDocumentation) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onShowNotification: (message: string, type: 'success' | 'error' | 'warning') => void;
  classId: string;
}

const LearningDocumentationView: React.FC<LearningDocumentationViewProps> = ({ documentation, onSave, onDelete, onShowNotification, classId }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Partial<LearningDocumentation> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTableVisible, setIsTableVisible] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const images = useMemo(() => documentation.filter(doc => doc.linkFoto && doc.linkFoto.startsWith('http')), [documentation]);

  // Carousel Logic
  useEffect(() => {
    const resetTimeout = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
    resetTimeout();
    if (images.length > 1) {
      timeoutRef.current = window.setTimeout(
        () => setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length),
        5000 // Change image every 5 seconds
      );
    }
    return () => resetTimeout();
  }, [currentIndex, images.length]);

  const goToPrevious = () => setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
  const goToNext = () => setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);

  // Modal and Save Logic
  const openModal = (doc: LearningDocumentation | null = null) => {
    setEditingDoc(doc ? { ...doc } : { namaKegiatan: '', linkFoto: '', classId });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDoc(null);
  };

  const handleSave = async () => {
    if (!editingDoc || !editingDoc.namaKegiatan || !editingDoc.linkFoto) {
      onShowNotification('Nama Kegiatan dan Link Foto wajib diisi.', 'warning');
      return;
    }
    setIsSaving(true);
    try {
      await onSave(editingDoc as LearningDocumentation);
      onShowNotification('Dokumentasi berhasil disimpan.', 'success');
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
            <Camera className="mr-3 text-indigo-600" />
            Dokumentasi Pembelajaran
          </h2>
          <p className="text-gray-500">Galeri foto kegiatan belajar mengajar di kelas.</p>
        </div>
        <div className="flex items-center gap-2">
            <button 
                onClick={() => setIsTableVisible(!isTableVisible)}
                className="flex items-center gap-2 bg-white text-gray-600 border border-gray-200 px-4 py-2 rounded-lg shadow-sm hover:bg-gray-50"
                title={isTableVisible ? 'Sembunyikan Tabel' : 'Tampilkan Tabel'}
            >
                {isTableVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                <span className="hidden sm:inline">{isTableVisible ? 'Sembunyikan Tabel' : 'Tampilkan Tabel'}</span>
            </button>
            <button 
              onClick={() => openModal()} 
              className="flex items-center gap-2 bg-indigo-600 text-white font-bold px-4 py-2 rounded-lg shadow-md hover:bg-indigo-700"
            >
              <Plus size={18} /> Tambah
            </button>
        </div>
      </div>

      {/* Carousel */}
      <div className={`relative w-full mx-auto bg-black rounded-2xl shadow-lg border border-gray-200 overflow-hidden group transition-all duration-500 ease-in-out ${isTableVisible ? 'max-w-2xl h-96' : 'max-w-5xl h-[32rem]'}`}>
        {images.length > 0 ? (
          <>
            <div className="w-full h-full flex overflow-hidden">
                {images.map((image, index) => (
                    <div 
                        key={image.id}
                        className="w-full h-full flex-shrink-0 transition-transform duration-700 ease-in-out"
                        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
                    >
                        <img src={image.linkFoto} alt={image.namaKegiatan} className="w-full h-full object-contain" />
                    </div>
                ))}
            </div>
            
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-10">
                <p className="font-bold text-lg text-white drop-shadow-lg text-center">{images[currentIndex].namaKegiatan}</p>
            </div>

            {images.length > 1 && (
                <>
                    <button onClick={goToPrevious} className="absolute top-1/2 left-4 -translate-y-1/2 bg-white/50 p-2 rounded-full text-gray-800 hover:bg-white transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm">
                        <ChevronLeft size={24} />
                    </button>
                    <button onClick={goToNext} className="absolute top-1/2 right-4 -translate-y-1/2 bg-white/50 p-2 rounded-full text-gray-800 hover:bg-white transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm">
                        <ChevronRight size={24} />
                    </button>
                    <div className="absolute bottom-4 right-4 flex gap-2">
                        {images.map((_, i) => (
                            <div key={i} onClick={() => setCurrentIndex(i)} className={`w-2 h-2 rounded-full cursor-pointer transition-all ${currentIndex === i ? 'bg-white scale-125' : 'bg-white/50'}`}></div>
                        ))}
                    </div>
                </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
              <ImageIcon size={48} className="mb-2"/>
              <p>Belum ada foto dokumentasi.</p>
          </div>
        )}
      </div>

      {/* Table */}
      {isTableVisible && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-medium">
              <tr>
                <th className="p-4 w-12 text-center">No</th>
                <th className="p-4">Nama Kegiatan</th>
                <th className="p-4">Foto</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {documentation.map((doc, index) => (
                <tr key={doc.id} className="hover:bg-indigo-50/30">
                  <td className="p-4 text-center text-gray-500">{index + 1}</td>
                  <td className="p-4 font-semibold text-gray-800">{doc.namaKegiatan}</td>
                  <td className="p-2">
                    <a href={doc.linkFoto} target="_blank" rel="noopener noreferrer" className="group block">
                      <img 
                        src={doc.linkFoto} 
                        alt={doc.namaKegiatan} 
                        className="w-24 h-16 object-cover rounded-md border border-gray-200 group-hover:scale-105 transition-transform"
                      />
                    </a>
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => openModal(doc)} className="p-2 text-gray-500 hover:text-indigo-600"><Edit size={16} /></button>
                    <button onClick={() => onDelete(doc.id)} className="p-2 text-gray-500 hover:text-red-600"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-5 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg">{editingDoc.id ? 'Edit Dokumentasi' : 'Tambah Dokumentasi'}</h3>
              <button onClick={closeModal}><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">Nama Kegiatan</label>
                <input 
                  type="text" 
                  value={editingDoc.namaKegiatan || ''} 
                  onChange={e => setEditingDoc({...editingDoc, namaKegiatan: e.target.value})}
                  className="w-full border p-2 rounded-lg"
                  placeholder="Contoh: Belajar Kelompok Matematika"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">Link Foto</label>
                <input 
                  type="url" 
                  value={editingDoc.linkFoto || ''} 
                  onChange={e => setEditingDoc({...editingDoc, linkFoto: e.target.value})}
                  className="w-full border p-2 rounded-lg"
                  placeholder="https://... (Link foto dari Google Drive, dll)"
                />
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
              <button onClick={closeModal} className="px-4 py-2 rounded-lg border bg-white">Batal</button>
              <button 
                onClick={handleSave} 
                disabled={isSaving}
                className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg flex items-center gap-2"
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

export default LearningDocumentationView;