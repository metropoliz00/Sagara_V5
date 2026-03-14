import React, { useState, useEffect } from 'react';
import { Material, Subject, User } from '../types';
import { 
  BookOpen, Plus, Search, ExternalLink, Trash2, Edit2, 
  Filter, Calendar, Link as LinkIcon, FileText, X
} from 'lucide-react';
import CustomModal from './CustomModal';

interface MaterialsViewProps {
  materials: Material[];
  subjects: Subject[];
  currentUser: User | null;
  classId: string;
  onAddMaterial: (material: Omit<Material, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateMaterial: (material: Material) => Promise<void>;
  onDeleteMaterial: (id: string) => Promise<void>;
  onShowNotification: (message: string, type: 'success' | 'error' | 'warning') => void;
}

const MaterialsView: React.FC<MaterialsViewProps> = ({
  materials, subjects, currentUser, classId,
  onAddMaterial, onUpdateMaterial, onDeleteMaterial, onShowNotification
}) => {
  console.log("MaterialsView received materials:", materials, "for classId:", classId);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [formData, setFormData] = useState({
    subjectId: '',
    title: '',
    description: '',
    link: '',
    isVisible: true
  });

  const isTeacher = currentUser?.role === 'guru' || currentUser?.role === 'admin';
  console.log("MaterialsView RENDER - CurrentUser:", currentUser, "isTeacher:", isTeacher);

  useEffect(() => {
    if (editingMaterial) {
      setFormData({
        subjectId: editingMaterial.subjectId,
        title: editingMaterial.title,
        description: editingMaterial.description || '',
        link: editingMaterial.link,
        isVisible: editingMaterial.isVisible
      });
    } else {
      setFormData({
        subjectId: subjects[0]?.id || '',
        title: '',
        description: '',
        link: '',
        isVisible: true
      });
    }
  }, [editingMaterial, subjects]);

  const filteredMaterials = materials.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (m.description?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSubject = selectedSubject === 'all' || m.subjectId === selectedSubject;
    const isVisibleToStudent = isTeacher || m.isVisible;
    console.log(`Material: ${m.title}, isVisible: ${m.isVisible}, isTeacher: ${isTeacher}, show: ${matchesSearch && matchesSubject && isVisibleToStudent}`);
    return matchesSearch && matchesSubject && isVisibleToStudent;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subjectId || !formData.title || !formData.link) {
      onShowNotification('Mohon lengkapi data materi', 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (editingMaterial) {
        await onUpdateMaterial({
          ...editingMaterial,
          ...formData
        });
        onShowNotification('Materi berhasil diperbarui', 'success');
      } else {
        await onAddMaterial({
          classId,
          ...formData
        });
        onShowNotification('Materi berhasil ditambahkan', 'success');
      }
      setIsModalOpen(false);
      setEditingMaterial(null);
    } catch (error) {
      // Error is handled in App.tsx but we catch it here to stop loading
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus materi ini?')) {
      onDeleteMaterial(id);
      onShowNotification('Materi berhasil dihapus', 'success');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Materi Pembelajaran</h2>
          <p className="text-gray-500">Kumpulan link materi pembelajaran yang dibagikan oleh guru.</p>
        </div>
        {isTeacher && (
          <button 
            onClick={() => { setEditingMaterial(null); setIsModalOpen(true); }}
            className="flex items-center space-x-2 px-4 py-2 bg-[#5AB2FF] text-white rounded-xl hover:bg-[#A0DEFF] transition-all shadow-md font-bold"
          >
            <Plus size={20} />
            <span>Tambah Materi</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-[#CAF4FF] shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Cari judul atau deskripsi..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5AB2FF] outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter size={18} className="text-gray-400" />
          <select 
            className="border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#5AB2FF]"
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
          >
            <option value="all">Semua Mata Pelajaran</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Materials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMaterials.length > 0 ? (
          filteredMaterials.map(material => {
            const subject = subjects.find(s => s.id === material.subjectId);
            return (
              <div key={material.id} className="bg-white rounded-2xl border border-[#CAF4FF] overflow-hidden shadow-sm hover:shadow-md transition-all group">
                <div className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="p-2 bg-[#CAF4FF]/30 rounded-lg text-[#5AB2FF]">
                      <BookOpen size={24} />
                    </div>
                    {isTeacher && (
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => onUpdateMaterial({...material, isVisible: !material.isVisible})}
                          className={`p-1.5 rounded-lg transition-colors ${material.isVisible ? 'text-[#5AB2FF] bg-[#5AB2FF]/10' : 'text-gray-400 bg-gray-100'}`}
                          title={material.isVisible ? 'Sembunyikan dari siswa' : 'Tampilkan ke siswa'}
                        >
                          {material.isVisible ? <div className="w-4 h-4 bg-current rounded-full" /> : <div className="w-4 h-4 bg-current rounded-full opacity-50" />}
                        </button>
                        <button 
                          onClick={() => { setEditingMaterial(material); setIsModalOpen(true); }}
                          className="p-1.5 text-gray-400 hover:text-[#5AB2FF] hover:bg-[#5AB2FF]/10 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(material.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <span className="text-xs font-bold text-[#5AB2FF] uppercase tracking-wider">
                      {subject?.name || 'Mata Pelajaran'}
                    </span>
                    <h3 className="text-lg font-bold text-gray-800 mt-1 line-clamp-2 group-hover:text-[#5AB2FF] transition-colors">
                      {material.title}
                    </h3>
                    {material.description && (
                      <p className="text-sm text-gray-500 mt-2 line-clamp-3">
                        {material.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                    <div className="flex items-center text-xs text-gray-400">
                      <Calendar size={14} className="mr-1" />
                      {new Date(material.createdAt).toLocaleDateString('id-ID')}
                    </div>
                    <a 
                      href={material.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#FFF9D0] text-amber-700 rounded-lg text-sm font-bold hover:bg-amber-200 transition-colors"
                    >
                      <ExternalLink size={14} />
                      <span>Klik Materi</span>
                    </a>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-400 bg-white rounded-3xl border-2 border-dashed border-gray-100">
            <FileText size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-medium">Belum ada materi yang tersedia</p>
            <p className="text-sm">Silakan hubungi guru untuk informasi lebih lanjut.</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-in">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-[#CAF4FF]/30">
              <h3 className="font-bold text-lg text-gray-800">
                {editingMaterial ? 'Edit Materi' : 'Tambah Materi Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mata Pelajaran</label>
                <select 
                  required
                  className="w-full border border-gray-200 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-[#5AB2FF] outline-none bg-white"
                  value={formData.subjectId}
                  onChange={e => setFormData({...formData, subjectId: e.target.value})}
                >
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Judul Materi</label>
                <input 
                  required
                  type="text" 
                  className="w-full border border-gray-200 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-[#5AB2FF] outline-none"
                  placeholder="Contoh: Bab 1 - Bilangan Bulat"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Deskripsi (Opsional)</label>
                <textarea 
                  className="w-full border border-gray-200 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-[#5AB2FF] outline-none h-24 resize-none"
                  placeholder="Penjelasan singkat tentang materi..."
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Link Materi (URL)</label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    required
                    type="url" 
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#5AB2FF] outline-none"
                    placeholder="https://example.com/materi"
                    value={formData.link}
                    onChange={e => setFormData({...formData, link: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                <label className="text-sm font-bold text-gray-700">Tampilkan ke Siswa</label>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, isVisible: !formData.isVisible})}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${formData.isVisible ? 'bg-[#5AB2FF]' : 'bg-gray-200'}`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData.isVisible ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
              <div className="pt-4 flex space-x-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 bg-[#5AB2FF] text-white rounded-xl text-sm font-bold hover:bg-[#A0DEFF] transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>{editingMaterial ? 'Simpan Perubahan' : 'Tambah Materi'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialsView;
