
import React, { useState } from 'react';
import { Plus, CheckCircle, XCircle, PenTool, Trash2, Save, X } from 'lucide-react';
import { InventoryItem } from '../../types';
import { useModal } from '../../context/ModalContext';

interface InventoryTabProps {
  inventory: InventoryItem[];
  onSave: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
  onShowNotification: (message: string, type: 'success' | 'error' | 'warning') => void;
  classId: string;
}

const InventoryTab: React.FC<InventoryTabProps> = ({ inventory, onSave, onDelete, onShowNotification, classId }) => {
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const { showConfirm } = useModal();

  const startAdd = () => {
    setEditingItem({ id: `inv-${Date.now()}`, classId: classId, name: '', condition: 'Baik', qty: 1 });
  };

  const startEdit = (item: InventoryItem) => {
    setEditingItem(item);
  };

  const handleSave = () => {
    if (editingItem && editingItem.name) {
        onSave(editingItem);
        setEditingItem(null);
    } else {
        onShowNotification("Nama barang wajib diisi.", 'warning');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#CAF4FF] overflow-hidden print-container">
       <div className="p-4 border-b border-[#CAF4FF] flex justify-between items-center bg-[#CAF4FF]/20 no-print">
          <h3 className="font-bold text-gray-700">Daftar Aset Kelas</h3>
          <button onClick={startAdd} className="flex items-center text-xs bg-[#5AB2FF] text-white px-4 py-2 rounded-lg hover:bg-[#A0DEFF] transition-colors shadow-md">
             <Plus size={14} className="mr-1" /> Tambah Barang
          </button>
       </div>
       
       <div className="hidden print-only text-center py-4 border-b">
          <h2 className="text-xl font-bold uppercase">DAFTAR INVENTARIS KELAS</h2>
       </div>

       <div className="overflow-x-auto">
           <table className="w-full text-left text-sm">
             <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-xs print:bg-white print:border-b print:text-black">
               <tr>
                 <th className="px-6 py-3">Nama Barang</th>
                 <th className="px-6 py-3 text-center">Jumlah</th>
                 <th className="px-6 py-3 text-center">Kondisi</th>
                 <th className="px-6 py-3 text-right no-print">Aksi</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-100 print:divide-gray-300">
               {inventory.length === 0 ? (
                   <tr><td colSpan={4} className="p-6 text-center text-gray-400 italic">Belum ada data barang.</td></tr>
               ) : inventory.map((item, index) => (
                 <tr key={item.id} className={`hover:bg-[#CAF4FF]/20 print:hover:bg-transparent ${index % 2 === 0 ? 'bg-white' : 'bg-[#CAF4FF]/10'}`}>
                   <td className="px-6 py-4 font-medium text-gray-800 print:text-black">{item.name}</td>
                   <td className="px-6 py-4 text-center font-mono print:bg-white print:text-black">{item.qty}</td>
                   <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium print:border print:border-black print:bg-white print:text-black ${
                        item.condition === 'Baik' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        <span className="no-print">{item.condition === 'Baik' ? <CheckCircle size={12} className="mr-1" /> : <XCircle size={12} className="mr-1" />}</span>
                        {item.condition}
                      </span>
                   </td>
                   <td className="px-6 py-4 text-right no-print">
                      <button onClick={() => startEdit(item)} className="text-gray-400 hover:text-indigo-600 mr-3 p-1 hover:bg-gray-100 rounded"><PenTool size={16} /></button>
                      <button onClick={() => { showConfirm("Hapus barang ini?", async () => onDelete(item.id)); }} className="text-gray-400 hover:text-red-600 p-1 hover:bg-gray-100 rounded"><Trash2 size={16} /></button>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
       </div>

       {/* Edit/Add Modal */}
       {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm no-print">
              <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl flex flex-col">
                  <div className="p-5 border-b flex justify-between items-center bg-[#CAF4FF]/30 rounded-t-xl">
                      <h3 className="font-bold text-lg text-gray-800">{inventory.some(i=>i.id===editingItem.id) ? 'Edit Barang' : 'Input Barang Baru'}</h3>
                      <button onClick={() => setEditingItem(null)} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded-full"><X size={20}/></button>
                  </div>
                  
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Barang</label>
                          <input className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} placeholder="Contoh: Sapu Ijuk" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Jumlah</label>
                            <input type="number" className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={editingItem.qty} onChange={e => setEditingItem({...editingItem, qty: Number(e.target.value)})} />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Kondisi</label>
                            <select className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={editingItem.condition} onChange={e => setEditingItem({...editingItem, condition: e.target.value as any})}>
                                <option value="Baik">Baik</option>
                                <option value="Rusak">Rusak</option>
                            </select>
                          </div>
                      </div>
                  </div>

                  <div className="p-5 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3">
                      <button onClick={() => setEditingItem(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-medium">Batal</button>
                      <button onClick={handleSave} className="px-5 py-2 bg-[#5AB2FF] text-white rounded-lg hover:bg-[#A0DEFF] font-bold text-sm shadow-md">Simpan</button>
                  </div>
              </div>
          </div>
       )}
    </div>
  );
};

export default InventoryTab;
