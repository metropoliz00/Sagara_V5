
import React, { useState } from 'react';
import { BookOpen, Save, Calendar, Clock, Plus, PenTool, Trash2, X } from 'lucide-react';
import { Guest } from '../../types';
import { useModal } from '../../context/ModalContext';

interface GuestBookTabProps {
  guests: Guest[];
  onSave: (guest: Guest) => void;
  onDelete: (id: string) => void;
  onShowNotification: (message: string, type: 'success' | 'error' | 'warning') => void;
  classId: string;
}

const GuestBookTab: React.FC<GuestBookTabProps> = ({ guests, onSave, onDelete, onShowNotification, classId }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { showConfirm } = useModal();
  const [editingGuest, setEditingGuest] = useState<Partial<Guest>>({
    date: new Date().toISOString().split('T')[0],
    time: '',
    name: '',
    purpose: '',
    agency: ''
  });

  const formatLongDate = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr + 'T00:00:00');
      if (isNaN(date.getTime())) return dateStr;
      return new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(date);
    } catch (e) {
      return dateStr;
    }
  };

  const handleOpenModal = (guest?: Guest) => {
    if (guest) {
        setEditingGuest(guest);
    } else {
        setEditingGuest({
            id: '',
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}),
            name: '',
            purpose: '',
            agency: ''
        });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (editingGuest.name && editingGuest.date && editingGuest.time) {
        onSave({
            id: editingGuest.id || `gst-${Date.now()}`,
            classId,
            date: editingGuest.date!,
            time: editingGuest.time!,
            name: editingGuest.name!,
            purpose: editingGuest.purpose || '-',
            agency: editingGuest.agency || 'Wali Murid'
        });
        setIsModalOpen(false);
    } else {
        onShowNotification("Mohon lengkapi Tanggal, Jam, dan Nama Tamu.", 'warning');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#CAF4FF] overflow-hidden print-container">
       <div className="p-4 border-b border-[#CAF4FF] flex justify-between items-center bg-[#CAF4FF]/20 no-print">
          <h3 className="font-bold text-gray-700 flex items-center">
             <BookOpen size={18} className="mr-2 text-indigo-600" /> Buku Tamu Digital
          </h3>
          <button onClick={() => handleOpenModal()} className="flex items-center text-xs bg-[#5AB2FF] text-white px-4 py-2 rounded-lg hover:bg-[#A0DEFF] transition-colors shadow-md">
             <Plus size={14} className="mr-1" /> Catat Tamu
          </button>
       </div>

       <div className="hidden print-only text-center py-4 border-b">
          <h2 className="text-xl font-bold uppercase">BUKU TAMU KELAS</h2>
       </div>

       <div className="overflow-x-auto">
           <table className="w-full text-left text-sm">
             <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-xs print:bg-white print:border-b print:text-black">
               <tr>
                 <th className="px-6 py-3">Tanggal & Waktu</th>
                 <th className="px-6 py-3">Nama Tamu</th>
                 <th className="px-6 py-3">Instansi / Asal</th>
                 <th className="px-6 py-3">Keperluan</th>
                 <th className="px-6 py-3 text-right no-print">Aksi</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-100 print:divide-gray-300">
               {guests.length === 0 ? (
                   <tr><td colSpan={5} className="p-8 text-center text-gray-400 italic">Belum ada data tamu tercatat.</td></tr>
               ) : guests.map((guest, index) => (
                 <tr key={guest.id} className={`hover:bg-[#CAF4FF]/20 print:hover:bg-transparent ${index % 2 === 0 ? 'bg-white' : 'bg-[#CAF4FF]/10'}`}>
                   <td className="px-6 py-4 text-gray-600 whitespace-nowrap print:text-black">
                      <div className="font-medium">{formatLongDate(guest.date)}</div>
                      <div className="text-xs text-gray-400 print:text-black">{guest.time}</div>
                   </td>
                   <td className="px-6 py-4 font-bold text-gray-800 print:text-black">{guest.name}</td>
                   <td className="px-6 py-4 text-indigo-600 font-medium print:text-black">{guest.agency}</td>
                   <td className="px-6 py-4 text-gray-600 print:text-black italic">{guest.purpose}</td>
                   <td className="px-6 py-4 text-right no-print">
                      <button onClick={() => handleOpenModal(guest)} className="text-gray-400 hover:text-indigo-600 mr-3 p-1 rounded hover:bg-gray-100"><PenTool size={16} /></button>
                      <button 
                        onClick={() => { showConfirm("Hapus data tamu ini?", async () => onDelete(guest.id)); }} 
                        className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-gray-100"
                      >
                        <Trash2 size={16} />
                      </button>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
       </div>

       {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm no-print">
              <div className="bg-white rounded-xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
                  <div className="p-5 border-b flex justify-between items-center bg-[#CAF4FF]/30 rounded-t-xl">
                      <h3 className="font-bold text-lg text-gray-800">{editingGuest.id ? 'Edit Tamu' : 'Tambah Tamu Baru'}</h3>
                      <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded-full"><X size={20}/></button>
                  </div>
                  
                  <div className="p-6 space-y-4 overflow-y-auto">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tanggal & Waktu</label>
                          <div className="grid grid-cols-2 gap-3">
                             <input type="date" value={editingGuest.date} onChange={e=>setEditingGuest({...editingGuest, date:e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                             <input type="text" placeholder="HH:mm" value={editingGuest.time} onChange={e=>setEditingGuest({...editingGuest, time:e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                          </div>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Lengkap</label>
                          <input type="text" value={editingGuest.name} onChange={e=>setEditingGuest({...editingGuest, name:e.target.value})} placeholder="Nama Tamu..." className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Instansi / Hubungan</label>
                          <input type="text" value={editingGuest.agency} onChange={e=>setEditingGuest({...editingGuest, agency:e.target.value})} placeholder="Contoh: Dinas Pendidikan / Wali Murid" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Keperluan</label>
                          <textarea rows={3} value={editingGuest.purpose} onChange={e=>setEditingGuest({...editingGuest, purpose:e.target.value})} placeholder="Tujuan kunjungan..." className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"></textarea>
                      </div>
                  </div>

                  <div className="p-5 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3">
                      <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-medium">Batal</button>
                      <button onClick={handleSave} className="px-5 py-2 bg-[#5AB2FF] text-white rounded-lg hover:bg-[#A0DEFF] font-bold text-sm shadow-md">Simpan Data</button>
                  </div>
              </div>
          </div>
       )}
    </div>
  );
};

export default GuestBookTab;
