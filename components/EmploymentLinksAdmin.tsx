
import React, { useState, useRef } from 'react';
import { EmploymentLink } from '../types';
import { Plus, Edit, Trash2, Save, X, ExternalLink, Link as LinkIcon, Loader2, Image as ImageIcon } from 'lucide-react';
import { compressImage } from '../utils/imageHelper';
import { useModal } from '../context/ModalContext';

interface EmploymentLinksAdminProps {
  links: EmploymentLink[];
  onSave: (link: Omit<EmploymentLink, 'id'> | EmploymentLink) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const EmploymentLinksAdmin: React.FC<EmploymentLinksAdminProps> = ({ links, onSave, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentLink, setCurrentLink] = useState<Partial<EmploymentLink>>({
    title: '',
    url: '',
    icon: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showAlert, showConfirm } = useModal();

  const openModal = (link?: EmploymentLink) => {
    if (link) {
      setCurrentLink({ ...link });
    } else {
      setCurrentLink({ title: '', url: '', icon: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentLink({});
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // Compress icon to be small (64px is usually enough for favicon style)
        const base64 = await compressImage(file, 64, 0.8);
        setCurrentLink(prev => ({ ...prev, icon: base64 }));
      } catch (error) {
        showAlert("Gagal memproses icon.", "error");
      }
    }
  };

  const handleSave = async () => {
    if (!currentLink.title || !currentLink.url) {
      showAlert("Judul dan URL wajib diisi.", "error");
      return;
    }
    setIsSaving(true);
    try {
      await onSave(currentLink as EmploymentLink);
      closeModal();
    } catch (e) {
      console.error(e);
      showAlert("Gagal menyimpan link.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    showConfirm("Hapus link ini?", async () => {
      await onDelete(id);
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Manajemen Link Kepegawaian</h2>
          <p className="text-gray-500 text-sm">Atur shortcut link yang muncul di dashboard guru.</p>
        </div>
        <button 
          onClick={() => openModal()} 
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 shadow-md transition-all"
        >
          <Plus size={18} /> Tambah Link
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {links.map(link => (
          <div key={link.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
            <div className="flex items-center gap-4 overflow-hidden">
              <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center shrink-0 border border-gray-100 p-1">
                {link.icon ? (
                  <img src={link.icon} alt={link.title} className="w-full h-full object-contain rounded" />
                ) : (
                  <LinkIcon className="text-gray-400" size={24} />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-gray-800 truncate" title={link.title}>{link.title}</h3>
                <a 
                  href={link.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-xs text-indigo-500 hover:underline flex items-center gap-1 truncate"
                >
                  {link.url} <ExternalLink size={10} />
                </a>
              </div>
            </div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => openModal(link)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                <Edit size={16} />
              </button>
              <button onClick={() => handleDelete(link.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {links.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            Belum ada link yang ditambahkan.
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-800">{currentLink.id ? 'Edit Link' : 'Tambah Link Baru'}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Icon Upload */}
              <div className="flex justify-center">
                <div 
                  className="w-20 h-20 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors relative overflow-hidden group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {currentLink.icon ? (
                    <img src={currentLink.icon} alt="Preview" className="w-full h-full object-contain p-2" />
                  ) : (
                    <div className="text-center text-gray-400">
                      <ImageIcon size={24} className="mx-auto mb-1"/>
                      <span className="text-[10px]">Icon</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Edit size={20} className="text-white"/>
                  </div>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleIconUpload} className="hidden" accept="image/*" />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">Judul Link</label>
                <input 
                  type="text" 
                  value={currentLink.title} 
                  onChange={(e) => setCurrentLink({ ...currentLink, title: e.target.value })}
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Contoh: SIM PKB"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">URL Tujuan</label>
                <input 
                  type="url" 
                  value={currentLink.url} 
                  onChange={(e) => setCurrentLink({ ...currentLink, url: e.target.value })}
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="p-5 border-t bg-gray-50 flex justify-end gap-2">
              <button onClick={closeModal} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg">Batal</button>
              <button 
                onClick={handleSave} 
                disabled={isSaving}
                className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving && <Loader2 size={16} className="animate-spin" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmploymentLinksAdmin;
