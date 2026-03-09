
import React, { useState } from 'react';
import { SchoolAsset } from '../types';
import { Building, Plus, Trash2, Edit, Save, X, Search, CheckCircle, AlertTriangle, XCircle, PenTool } from 'lucide-react';
import { useModal } from '../context/ModalContext';

interface SchoolAssetsAdminProps {
  assets: SchoolAsset[];
  onSave: (asset: SchoolAsset) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const SchoolAssetsAdmin: React.FC<SchoolAssetsAdminProps> = ({ assets, onSave, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Partial<SchoolAsset>>({
    name: '',
    condition: 'Baik',
    qty: 1,
    location: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { showAlert, showConfirm } = useModal();

  const filteredAssets = assets.filter(asset => 
    asset.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (asset.location && asset.location.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenModal = (asset?: SchoolAsset) => {
    if (asset) {
      setEditingAsset(asset);
    } else {
      setEditingAsset({
        id: '',
        name: '',
        condition: 'Baik',
        qty: 1,
        location: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingAsset.name || !editingAsset.condition || (editingAsset.qty !== undefined && editingAsset.qty < 0)) {
      showAlert("Mohon lengkapi data dengan benar.", "error");
      return;
    }
    setIsSaving(true);
    try {
      await onSave({
        id: editingAsset.id || `asset-${Date.now()}`,
        name: editingAsset.name,
        condition: editingAsset.condition as 'Baik' | 'Rusak Ringan' | 'Rusak Berat',
        qty: Number(editingAsset.qty),
        location: editingAsset.location || ''
      });
      setIsModalOpen(false);
    } catch (e) {
      showAlert("Gagal menyimpan data.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    showConfirm("Hapus data sarana prasarana ini?", async () => {
      await onDelete(id);
    });
  };

  const getConditionBadge = (condition: string) => {
      switch(condition) {
          case 'Baik': return <span className="flex items-center text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full w-fit"><CheckCircle size={12} className="mr-1"/> Baik</span>;
          case 'Rusak Ringan': return <span className="flex items-center text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-full w-fit"><AlertTriangle size={12} className="mr-1"/> Rusak Ringan</span>;
          case 'Rusak Berat': return <span className="flex items-center text-xs font-bold text-rose-700 bg-rose-100 px-2 py-1 rounded-full w-fit"><XCircle size={12} className="mr-1"/> Rusak Berat</span>;
          default: return <span className="text-gray-500">{condition}</span>;
      }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <Building className="mr-3 text-indigo-600" />
            Sarana & Prasarana Sekolah
          </h2>
          <p className="text-gray-500">Manajemen inventaris dan fasilitas umum sekolah.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input 
                    type="text" 
                    placeholder="Cari aset..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
            </div>
            <button 
                onClick={() => handleOpenModal()} 
                className="flex items-center gap-2 bg-indigo-600 text-white font-bold px-4 py-2 rounded-lg shadow-md hover:bg-indigo-700 whitespace-nowrap"
            >
                <Plus size={18} /> Tambah
            </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-medium uppercase text-xs">
              <tr>
                <th className="p-4 w-12 text-center">No</th>
                <th className="p-4">Jenis Sarana / Prasarana</th>
                <th className="p-4">Lokasi</th>
                <th className="p-4 text-center">Jumlah</th>
                <th className="p-4 text-center">Keadaan</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400 italic">
                    Belum ada data sarana prasarana.
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset, index) => (
                  <tr key={asset.id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="p-4 text-center text-gray-500">{index + 1}</td>
                    <td className="p-4 font-semibold text-gray-800">{asset.name}</td>
                    <td className="p-4 text-gray-600">{asset.location || '-'}</td>
                    <td className="p-4 text-center font-mono font-bold text-indigo-600">{asset.qty}</td>
                    <td className="p-4 flex justify-center">
                        {getConditionBadge(asset.condition)}
                    </td>
                    <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                            <button onClick={() => handleOpenModal(asset)} className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                <PenTool size={16} />
                            </button>
                            <button onClick={() => handleDelete(asset.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-800">{editingAsset.id ? 'Edit Data' : 'Tambah Sarana Prasarana'}</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">Nama Sarana / Prasarana</label>
                <input 
                  type="text" 
                  value={editingAsset.name} 
                  onChange={e => setEditingAsset({...editingAsset, name: e.target.value})}
                  className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Contoh: Meja Guru, Papan Tulis..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Jumlah</label>
                    <input 
                      type="number" 
                      value={editingAsset.qty} 
                      onChange={e => setEditingAsset({...editingAsset, qty: Number(e.target.value)})}
                      className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Kondisi</label>
                    <select 
                        value={editingAsset.condition}
                        onChange={e => setEditingAsset({...editingAsset, condition: e.target.value as any})}
                        className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    >
                        <option value="Baik">Baik</option>
                        <option value="Rusak Ringan">Rusak Ringan</option>
                        <option value="Rusak Berat">Rusak Berat</option>
                    </select>
                  </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">Lokasi (Opsional)</label>
                <input 
                  type="text" 
                  value={editingAsset.location} 
                  onChange={e => setEditingAsset({...editingAsset, location: e.target.value})}
                  className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Contoh: R. Kelas 1, Gudang..."
                />
              </div>
            </div>
            <div className="p-5 border-t bg-gray-50 flex justify-end gap-2 rounded-b-2xl">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg border bg-white text-gray-600 hover:bg-gray-100">Batal</button>
              <button 
                onClick={handleSave} 
                disabled={isSaving}
                className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolAssetsAdmin;
