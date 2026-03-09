
import React, { useState, useRef, useMemo } from 'react';
import { User, Student } from '../types';
import * as XLSX from 'xlsx';
import { 
  UserCog, Plus, X, Save, Trash2, PenTool, Loader2, Download, Upload, 
  RefreshCw, LayoutGrid, Shield, Briefcase, GraduationCap, CheckSquare, Square, FileSpreadsheet
} from 'lucide-react';
import { apiService } from '../services/apiService';
import { useModal } from '../context/ModalContext';

interface AccountManagementProps {
  users: User[];
  students: Student[];
  onAdd: (user: Omit<User, 'id'>) => Promise<void>;
  onBatchAdd?: (users: Omit<User, 'id'>[]) => Promise<void>;
  onUpdate: (user: User) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

type TabType = 'all' | 'admin' | 'supervisor' | 'guru' | 'siswa';

const AccountManagement: React.FC<AccountManagementProps> = ({ users, students, onAdd, onBatchAdd, onUpdate, onDelete }) => {
  // UI State
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [password, setPassword] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const { showAlert, showConfirm } = useModal();
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Filtering Logic ---
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // 1. Filter by Role Tab
      if (activeTab !== 'all' && user.role !== activeTab) return false;
      
      // 2. Filter by Search
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          user.fullName.toLowerCase().includes(term) ||
          user.username.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [users, activeTab, searchTerm]);

  // --- Selection Logic ---
  const isAllSelected = filteredUsers.length > 0 && selectedIds.length === filteredUsers.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < filteredUsers.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredUsers.map(u => u.id));
    }
  };

  const handleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // --- Modal Logic ---
  // Filter students based on selected class in modal
  const modalFilteredStudents = useMemo(() => {
      if (!editingUser || editingUser.role !== 'siswa' || !editingUser.classId) return [];
      return students.filter(s => s.classId === editingUser.classId);
  }, [students, editingUser?.classId, editingUser?.role]);

  const openModal = (user: Partial<User> | null = null) => {
    setEditingUser(user ? { ...user } : { role: 'guru' });
    setPassword('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleStudentSelect = (studentId: string) => {
      const selectedStudent = students.find(s => s.id === studentId);
      if (selectedStudent && editingUser) {
          setEditingUser({
              ...editingUser,
              username: selectedStudent.nis,
              fullName: selectedStudent.name,
              studentId: selectedStudent.id,
              password: selectedStudent.nis,
          });
          setPassword(selectedStudent.nis);
      }
  };

  // --- Actions ---
  const handleSyncStudentIds = async () => {
      // Direct sync without confirmation dialog
      setIsSyncing(true);
      try {
          const result = await apiService.syncStudentAccounts();
          showAlert(result.message || 'Sinkronisasi selesai.', 'success');
          window.location.reload();
      } catch (e) {
          showAlert("Gagal melakukan sinkronisasi.", "error");
      } finally {
          setIsSyncing(false);
      }
  };

  const handleSave = async () => {
    if (!editingUser || !editingUser.username || !editingUser.fullName || !editingUser.role) {
      showAlert('Username, Nama Lengkap, dan Role wajib diisi.', 'error');
      return;
    }
    if (!editingUser.id && !password) {
      showAlert('Password wajib diisi untuk akun baru.', 'error');
      return;
    }

    setIsSaving(true);
    const payload = { ...editingUser };
    if (password) {
      payload.password = password;
    }

    try {
      if (payload.id) {
        await onUpdate(payload as User);
      } else {
        await onAdd(payload as Omit<User, 'id'>);
      }
      closeModal();
    } catch (error) {
      console.error('Failed to save user:', error);
      showAlert('Gagal menyimpan akun.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    showConfirm('Anda yakin ingin menghapus akun ini?', async () => {
        await onDelete(id);
        setSelectedIds(prev => prev.filter(pid => pid !== id));
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    showConfirm(`Hapus ${selectedIds.length} akun yang dipilih?`, async () => {
      setIsSaving(true);
      try {
        // Sequential delete to ensure stability (can be optimized to batch in backend later)
        for (const id of selectedIds) {
          await onDelete(id);
        }
        setSelectedIds([]);
      } catch (e) {
        showAlert("Terjadi kesalahan saat menghapus beberapa data.", "error");
      } finally {
        setIsSaving(false);
      }
    });
  };

  const handleFieldChange = (field: keyof User, value: string) => {
    if (editingUser) {
      setEditingUser({ ...editingUser, [field]: value });
    }
  };

  // --- Export/Import ---
  const handleDownloadTemplate = () => {
    const headers = ["Username *", "Password *", "Role (admin/guru/siswa/supervisor) *", "Nama Lengkap *", "NIP", "NUPTK", "Tempat, Tgl Lahir", "Pendidikan Terakhir", "Jabatan", "Pangkat / Gol", "Class ID", "Email", "No HP", "Alamat"];
    const example = ["guru01", "123456", "guru", "Budi Santoso, S.Pd", "19800101...", "1234...", "Jakarta, 01-01-1980", "S1 PGSD", "Guru Kelas", "III/a", "1A", "budi@email.com", "081...", "Jl. Merdeka"];
    const worksheet = XLSX.utils.aoa_to_sheet([headers, example]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template User");
    XLSX.writeFile(workbook, "template_akun_pengguna.xlsx");
  };

  const handleExport = () => {
    const headers = ["Username", "Role", "Nama Lengkap", "NIP", "Class ID", "Status Link"];
    const rows = users.map(u => [u.username, u.role, u.fullName, u.nip, u.classId, u.role === 'siswa' ? (u.studentId ? 'Linked' : 'Unlinked') : '-']);
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Akun");
    XLSX.writeFile(workbook, "data_akun_pengguna.xlsx");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      const rows = data.slice(1) as any[];
      
      setIsSaving(true);
      const newUsersBatch: Omit<User, 'id'>[] = [];
      for (const row of rows) {
        if (!row[0] || !row[3]) continue; 
        newUsersBatch.push({
          username: String(row[0]), password: String(row[1] || '123456'), role: String(row[2] || 'guru').toLowerCase() as any, fullName: String(row[3]),
          nip: row[4] ? String(row[4]) : '', nuptk: row[5] ? String(row[5]) : '', birthInfo: row[6] ? String(row[6]) : '', education: row[7] ? String(row[7]) : '',
          position: row[8] ? String(row[8]) : 'Guru Kelas', rank: row[9] ? String(row[9]) : '', classId: row[10] ? String(row[10]) : '', email: row[11] ? String(row[11]) : '',
          phone: row[12] ? String(row[12]) : '', address: row[13] ? String(row[13]) : ''
        });
      }
      if (newUsersBatch.length > 0 && onBatchAdd) {
          try { await onBatchAdd(newUsersBatch); } catch (e) { showAlert("Gagal import batch.", "error"); }
      }
      setIsSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Header & Global Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Manajemen Akun</h2>
          <p className="text-gray-500">Kelola pengguna yang dapat mengakses aplikasi.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx, .xls, .csv" />
            
            {selectedIds.length > 0 && (
                <button onClick={handleBulkDelete} disabled={isSaving} className="flex items-center gap-2 bg-red-100 text-red-700 font-bold px-4 py-2 rounded-lg hover:bg-red-200 transition-colors">
                    {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Trash2 size={16} />} 
                    Hapus ({selectedIds.length})
                </button>
            )}

            <button onClick={handleExport} className="p-2 bg-white border rounded-lg hover:bg-gray-50 text-gray-600" title="Export"><Download size={18} /></button>
            <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-white border rounded-lg hover:bg-gray-50 text-gray-600" title="Import"><Upload size={18} /></button>
            <button onClick={handleDownloadTemplate} className="p-2 bg-white border rounded-lg hover:bg-gray-50 text-gray-600" title="Template"><FileSpreadsheet size={18} /></button>
            
            <button onClick={() => openModal()} className="flex items-center gap-2 bg-indigo-600 text-white font-bold px-4 py-2 rounded-lg shadow-md hover:bg-indigo-700">
                <Plus size={18} /> <span className="hidden sm:inline">Tambah Akun</span>
            </button>
        </div>
      </div>

      {/* 2. Role Tabs */}
      <div className="flex overflow-x-auto gap-2 bg-white p-2 rounded-xl border border-gray-200 shadow-sm no-scrollbar">
          {[
              { id: 'all', label: 'Semua', icon: LayoutGrid },
              { id: 'admin', label: 'Admin', icon: Shield },
              { id: 'supervisor', label: 'Supervisor', icon: Briefcase },
              { id: 'guru', label: 'Guru', icon: UserCog },
              { id: 'siswa', label: 'Siswa', icon: GraduationCap },
          ].map(tab => {
              const Icon = tab.icon;
              const count = tab.id === 'all' ? users.length : users.filter(u => u.role === tab.id).length;
              return (
                  <button 
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id as TabType); setSelectedIds([]); }}
                    className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                        activeTab === tab.id 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                      <Icon size={16} className="mr-2"/> {tab.label} 
                      <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-white/20' : 'bg-gray-100'}`}>
                          {count}
                      </span>
                  </button>
              )
          })}
      </div>

      {/* 3. Contextual Actions (Sync for Students) */}
      {activeTab === 'siswa' && (
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4 animate-fade-in">
              <div className="text-blue-800 text-sm">
                  <p className="font-bold flex items-center"><RefreshCw size={16} className="mr-2"/> Sinkronisasi Data Siswa</p>
                  <p className="text-xs opacity-80 mt-1">Gunakan fitur ini jika status "Linked" pada akun siswa masih berwarna merah (Unlinked).</p>
              </div>
              <button 
                onClick={handleSyncStudentIds} 
                disabled={isSyncing} 
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 text-sm font-bold whitespace-nowrap"
              >
                  {isSyncing ? <Loader2 size={16} className="animate-spin mr-2"/> : <RefreshCw size={16} className="mr-2" />} 
                  Sinkronkan ID Siswa
              </button>
          </div>
      )}

      {/* 4. Data Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
        <div className="p-3 border-b bg-gray-50 flex items-center">
            <input 
                type="text" 
                placeholder="Cari nama atau username..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full md:w-64 border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 font-medium">
            <tr>
              <th className="p-4 w-10">
                  <button onClick={handleSelectAll} className="flex items-center justify-center text-gray-500 hover:text-indigo-600">
                      {isAllSelected ? <CheckSquare size={20} className="text-indigo-600"/> : isIndeterminate ? <CheckSquare size={20} className="text-indigo-400 opacity-50"/> : <Square size={20}/>}
                  </button>
              </th>
              <th className="p-4">Nama Lengkap</th>
              <th className="p-4">Username</th>
              <th className="p-4">Role</th>
              <th className="p-4">Class ID</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredUsers.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-gray-400">Tidak ada data akun.</td></tr>
            ) : filteredUsers.map(user => (
              <tr key={user.id} className={selectedIds.includes(user.id) ? 'bg-indigo-50/50' : ''}>
                <td className="p-4">
                    <button onClick={() => handleSelectRow(user.id)} className="flex items-center justify-center text-gray-400 hover:text-indigo-600">
                        {selectedIds.includes(user.id) ? <CheckSquare size={20} className="text-indigo-600"/> : <Square size={20}/>}
                    </button>
                </td>
                <td className="p-4 font-semibold text-gray-800">{user.fullName}</td>
                <td className="p-4 text-gray-600 font-mono text-xs">{user.username}</td>
                <td className="p-4">
                    <span className={`px-2 py-1 text-xs font-bold rounded-full border ${
                        user.role === 'admin' ? 'bg-red-50 text-red-700 border-red-200' : 
                        user.role === 'supervisor' ? 'bg-purple-50 text-purple-700 border-purple-200' : 
                        user.role === 'guru' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                        'bg-green-50 text-green-700 border-green-200'
                    }`}>
                        {user.role}
                    </span>
                </td>
                <td className="p-4 font-mono text-xs">{user.classId || '-'}</td>
                <td className="p-4">
                    {user.role === 'siswa' && (
                        user.studentId 
                        ? <span className="text-emerald-600 text-xs font-bold flex items-center bg-emerald-50 px-2 py-0.5 rounded w-fit"><RefreshCw size={10} className="mr-1"/> Linked</span> 
                        : <span className="text-red-500 text-xs font-bold bg-red-50 px-2 py-0.5 rounded w-fit">Unlinked</span>
                    )}
                </td>
                <td className="p-4 text-right flex justify-end gap-1">
                  <button onClick={() => openModal(user)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"><PenTool size={16} /></button>
                  <button onClick={() => handleDelete(user.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 5. Edit Modal (Keep existing logic, just re-rendering to ensure closure validity) */}
      {isModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg">{editingUser.id ? 'Edit Akun' : 'Tambah Akun Baru'}</h3>
              <button onClick={closeModal}><X size={20}/></button>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Form Content - Same as before */}
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <h4 className="font-bold text-blue-800 text-sm mb-3">Kredensial Login</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Role *</label>
                        <select value={editingUser.role || 'guru'} onChange={(e) => handleFieldChange('role', e.target.value as any)} className="w-full border p-2 rounded-lg bg-white">
                        <option value="admin">Admin</option>
                        <option value="supervisor">Supervisor</option>
                        <option value="guru">Guru</option>
                        <option value="siswa">Siswa</option>
                        </select>
                    </div>
                    {editingUser.role === 'siswa' ? (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Kelas Siswa</label>
                                <input value={editingUser.classId || ''} onChange={(e) => handleFieldChange('classId', e.target.value)} className="w-full border p-2 rounded-lg bg-white" placeholder="Contoh: 1A" />
                            </div>
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 mb-1">Pilih Siswa (Auto-Fill)</label>
                                <select 
                                    className="w-full border p-2 rounded-lg bg-white"
                                    onChange={(e) => handleStudentSelect(e.target.value)}
                                    defaultValue=""
                                >
                                    <option value="">-- Pilih Siswa dari Data Kelas --</option>
                                    {modalFilteredStudents.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.nis})</option>
                                    ))}
                                </select>
                            </div>
                        </>
                    ) : ( <div className="col-span-1 md:col-span-2"></div> )}

                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">Username {editingUser.role === 'siswa' ? '(NIS)' : ''} *</label>
                      <input value={editingUser.username || ''} onChange={(e) => handleFieldChange('username', e.target.value)} className="w-full border p-2 rounded-lg bg-white" placeholder="Username" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">Password {editingUser.id ? '(Opsional)' : '*'}</label>
                      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border p-2 rounded-lg bg-white" placeholder="Password" />
                    </div>
                  </div>
              </div>

              <div>
                  <h4 className="font-bold text-gray-800 text-sm mb-3">Data Profil Lengkap</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 mb-1">Nama Lengkap *</label>
                        <input value={editingUser.fullName || ''} onChange={(e) => handleFieldChange('fullName', e.target.value)} className="w-full border p-2 rounded-lg" placeholder="Nama Lengkap" />
                    </div>
                    
                    {editingUser.role !== 'siswa' && (
                        <>
                            <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">NIP</label>
                            <input value={editingUser.nip || ''} onChange={(e) => handleFieldChange('nip', e.target.value)} className="w-full border p-2 rounded-lg" placeholder="NIP" />
                            </div>
                            <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">NUPTK</label>
                            <input value={editingUser.nuptk || ''} onChange={(e) => handleFieldChange('nuptk', e.target.value)} className="w-full border p-2 rounded-lg" placeholder="NUPTK" />
                            </div>
                            {editingUser.role !== 'admin' && (
                                <div className="col-span-1 md:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 mb-1">
                                    {editingUser.role === 'guru' ? 'Tugas Mengajar (Class ID)' : 'Kelas Awal (Opsional)'}
                                </label>
                                <input value={editingUser.classId || ''} onChange={(e) => handleFieldChange('classId', e.target.value)} className="w-full border p-2 rounded-lg bg-gray-50" placeholder="Contoh: 4B" />
                                </div>
                            )}
                        </>
                    )}
                  </div>
              </div>
            </div>

            <div className="p-5 bg-gray-50 border-t flex justify-end gap-3 rounded-b-2xl">
              <button onClick={closeModal} className="px-4 py-2 rounded-lg border bg-white text-gray-600 hover:bg-gray-100">Batal</button>
              <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg flex items-center shadow-md hover:bg-indigo-700">
                {isSaving && <Loader2 size={16} className="animate-spin mr-2"/>}
                Simpan Akun
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountManagement;
