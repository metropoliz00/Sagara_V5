import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Graduate } from '../types';
import * as XLSX from 'xlsx';
import { 
  Search, Plus, Save, Trash2, X, FileSpreadsheet, Printer, Upload, Download, Edit, RotateCcw
} from 'lucide-react';
import { useModal } from '../context/ModalContext';
import { apiService } from '../services/apiService';

interface GraduatesViewProps {
  onShowNotification: (message: string, type: 'success' | 'error' | 'warning') => void;
  isReadOnly?: boolean;
  onRestore?: (student: any) => void;
}

const GraduatesView: React.FC<GraduatesViewProps> = ({ onShowNotification, isReadOnly = false, onRestore }) => {
  const [graduates, setGraduates] = useState<Graduate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGraduate, setEditingGraduate] = useState<Graduate | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedGraduateHistory, setSelectedGraduateHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedGraduateName, setSelectedGraduateName] = useState('');
  const { showConfirm } = useModal();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<Graduate>>({
    nisn: '',
    name: '',
    ijazahNumber: '',
    status: 'Lulus',
    graduationYear: new Date().getFullYear().toString(),
    continuedTo: ''
  });

  useEffect(() => {
    fetchGraduates();
  }, []);

  const fetchGraduates = async () => {
    setLoading(true);
    try {
      const data = await apiService.getGraduates();
      setGraduates(data);
    } catch (error) {
      console.error("Error fetching graduates:", error);
      onShowNotification("Gagal memuat data lulusan", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredGraduates = useMemo(() => {
    return graduates.filter(g => {
      const matchSearch = g.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          g.nisn.toLowerCase().includes(searchTerm.toLowerCase());
      const matchYear = filterYear ? g.graduationYear === filterYear : true;
      return matchSearch && matchYear;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [graduates, searchTerm, filterYear]);

  const uniqueYears = useMemo(() => {
    const years = new Set(graduates.map(g => g.graduationYear));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [graduates]);

  const handleOpenModal = (graduate?: Graduate) => {
    if (graduate) {
      setEditingGraduate(graduate);
      setFormData(graduate);
    } else {
      setEditingGraduate(null);
      setFormData({
        nisn: '',
        name: '',
        ijazahNumber: '',
        status: 'Lulus',
        graduationYear: new Date().getFullYear().toString(),
        continuedTo: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingGraduate(null);
  };

  const handleViewHistory = async (graduate: Graduate) => {
    setSelectedGraduateName(graduate.name);
    setIsHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const history = await apiService.getGradeHistory(graduate.id);
      setSelectedGraduateHistory(history);
    } catch (error) {
      console.error("Error fetching grade history:", error);
      onShowNotification("Gagal mengambil history nilai.", 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCloseHistoryModal = () => {
    setIsHistoryModalOpen(false);
    setSelectedGraduateHistory([]);
    setSelectedGraduateName('');
  };

  const handleSave = async () => {
    if (!formData.name || !formData.nisn || !formData.graduationYear) {
      onShowNotification("Nama, NISN, dan Tahun Lulus wajib diisi", "warning");
      return;
    }

    try {
      const graduateToSave: Graduate = {
        id: editingGraduate?.id || crypto.randomUUID(),
        nisn: formData.nisn || '',
        name: formData.name || '',
        ijazahNumber: formData.ijazahNumber || '',
        status: formData.status || 'Lulus',
        graduationYear: formData.graduationYear || '',
        continuedTo: formData.continuedTo || '',
        createdAt: editingGraduate?.createdAt || Date.now(),
        updatedAt: Date.now()
      };

      await apiService.saveGraduate(graduateToSave);
      
      if (editingGraduate) {
        setGraduates(prev => prev.map(g => g.id === graduateToSave.id ? graduateToSave : g));
        onShowNotification("Data lulusan berhasil diperbarui", "success");
      } else {
        setGraduates(prev => [...prev, graduateToSave]);
        onShowNotification("Data lulusan berhasil ditambahkan", "success");
      }
      handleCloseModal();
    } catch (error) {
      console.error("Error saving graduate:", error);
      onShowNotification("Gagal menyimpan data lulusan", "error");
    }
  };

  const handleDelete = (id: string) => {
    showConfirm(
      "Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.",
      async () => {
        try {
          await apiService.deleteGraduate(id);
          setGraduates(prev => prev.filter(g => g.id !== id));
          onShowNotification("Data lulusan berhasil dihapus", "success");
        } catch (error) {
          console.error("Error deleting graduate:", error);
          onShowNotification("Gagal menghapus data lulusan", "error");
        }
      },
      "Hapus Data Lulusan"
    );
  };

  const handleRestore = (graduate: Graduate) => {
    showConfirm(
      "Apakah Anda yakin ingin mengembalikan data ini ke Data Siswa (Kelas 6)?",
      async () => {
        try {
          const newStudent = {
            classId: '6',
            nis: graduate.nisn || `NIS-${Date.now()}`,
            nisn: graduate.nisn || '',
            name: graduate.name,
            gender: 'L' as 'L' | 'P',
            birthPlace: '',
            birthDate: '',
            religion: '',
            address: '',
            fatherName: '',
            fatherJob: '',
            fatherEducation: '',
            motherName: '',
            motherJob: '',
            motherEducation: '',
            parentName: '',
            parentPhone: '',
            parentJob: '',
            economyStatus: 'Cukup' as 'Mampu' | 'Cukup' | 'Kurang Mampu' | 'KIP',
            height: 0,
            weight: 0,
            bloodType: '',
            healthNotes: '',
            hobbies: '',
            ambition: '',
            achievements: [],
            violations: [],
            behaviorScore: 100,
            attendance: {
              present: 0,
              sick: 0,
              permit: 0,
              alpha: 0
            },
            photo: '',
            teacherNotes: ''
          };
          
          const createdStudent = await apiService.createStudent(newStudent);
          await apiService.deleteGraduate(graduate.id);
          
          setGraduates(prev => prev.filter(g => g.id !== graduate.id));
          if (onRestore) {
            onRestore(createdStudent);
          }
          onShowNotification("Data lulusan berhasil dikembalikan ke Data Siswa (Kelas 6)", "success");
        } catch (error) {
          console.error("Error restoring graduate:", error);
          onShowNotification("Gagal mengembalikan data lulusan", "error");
        }
      },
      "Restore Data Lulusan"
    );
  };

  const handleExport = () => {
    const dataToExport = filteredGraduates.map((g, index) => ({
      'No': index + 1,
      'NISN': g.nisn,
      'Nama': g.name,
      'No. Ijazah': g.ijazahNumber,
      'Status Kelulusan': g.status,
      'Tahun Lulus': g.graduationYear,
      'Melanjutkan Ke': g.continuedTo
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Lulusan");
    XLSX.writeFile(wb, `Data_Lulusan_${filterYear || 'Semua'}.xlsx`);
  };

  const handleDownloadTemplate = () => {
    const templateData = [{
      'NISN': '1234567890',
      'Nama': 'Contoh Siswa',
      'No. Ijazah': 'DN-01/D-SD/13/0000001',
      'Status Kelulusan': 'Lulus',
      'Tahun Lulus': '2026',
      'Melanjutkan Ke': 'SMPN 1 Contoh'
    }];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Lulusan");
    XLSX.writeFile(wb, "Template_Data_Lulusan.xlsx");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const newGraduates: Graduate[] = data.map(row => ({
          id: crypto.randomUUID(),
          nisn: String(row['NISN'] || ''),
          name: String(row['Nama'] || ''),
          ijazahNumber: String(row['No. Ijazah'] || ''),
          status: String(row['Status Kelulusan'] || 'Lulus'),
          graduationYear: String(row['Tahun Lulus'] || new Date().getFullYear().toString()),
          continuedTo: String(row['Melanjutkan Ke'] || ''),
          createdAt: Date.now(),
          updatedAt: Date.now()
        })).filter(g => g.name && g.nisn);

        if (newGraduates.length > 0) {
          await apiService.saveGraduateBatch(newGraduates);
          setGraduates(prev => [...prev, ...newGraduates]);
          onShowNotification(`${newGraduates.length} data lulusan berhasil diimpor`, "success");
        } else {
          onShowNotification("Tidak ada data valid untuk diimpor", "warning");
        }
      } catch (error) {
        console.error("Import error:", error);
        onShowNotification("Gagal mengimpor file", "error");
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>Data Lulusan</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            @media print {
              @page { margin: 1cm; }
            }
          </style>
        </head>
        <body>
          <h1>Data Lulusan ${filterYear ? `Tahun ${filterYear}` : ''}</h1>
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>NISN</th>
                <th>Nama</th>
                <th>No. Ijazah</th>
                <th>Status</th>
                <th>Tahun Lulus</th>
                <th>Melanjutkan Ke</th>
              </tr>
            </thead>
            <tbody>
              ${filteredGraduates.map((g, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${g.nisn}</td>
                  <td>${g.name}</td>
                  <td>${g.ijazahNumber}</td>
                  <td>${g.status}</td>
                  <td>${g.graduationYear}</td>
                  <td>${g.continuedTo}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            window.onload = () => { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5AB2FF]"></div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Data Lulusan</h1>
          <p className="text-slate-500 text-sm mt-1">Kelola data alumni dan lulusan sekolah</p>
        </div>
        
        {!isReadOnly && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors flex items-center space-x-2 text-sm font-medium"
            >
              <Download size={18} />
              <span className="hidden sm:inline">Template</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors flex items-center space-x-2 text-sm font-medium"
            >
              <Upload size={18} />
              <span className="hidden sm:inline">Import</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImport}
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              className="hidden"
            />
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors flex items-center space-x-2 text-sm font-medium"
            >
              <FileSpreadsheet size={18} />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors flex items-center space-x-2 text-sm font-medium"
            >
              <Printer size={18} />
              <span className="hidden sm:inline">Cetak</span>
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="px-4 py-2 bg-gradient-to-r from-[#5AB2FF] to-[#A0DEFF] text-white rounded-xl hover:shadow-lg hover:shadow-[#5AB2FF]/30 transition-all flex items-center space-x-2 text-sm font-medium"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Tambah Data</span>
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Cari nama atau NISN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#5AB2FF] focus:border-transparent outline-none transition-all"
            />
          </div>
          <div className="w-full sm:w-48">
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#5AB2FF] focus:border-transparent outline-none transition-all"
            >
              <option value="">Semua Tahun</option>
              {uniqueYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">No</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">NISN</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Nama</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">No. Ijazah</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Tahun Lulus</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Melanjutkan Ke</th>
                {!isReadOnly && (
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-right">Aksi</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredGraduates.length === 0 ? (
                <tr>
                  <td colSpan={isReadOnly ? 7 : 8} className="px-6 py-8 text-center text-slate-500">
                    Tidak ada data lulusan ditemukan
                  </td>
                </tr>
              ) : (
                filteredGraduates.map((graduate, index) => (
                  <tr key={graduate.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600">{index + 1}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-800">{graduate.nisn}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-800">{graduate.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{graduate.ijazahNumber || '-'}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
                        {graduate.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{graduate.graduationYear}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{graduate.continuedTo || '-'}</td>
                    {!isReadOnly && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleViewHistory(graduate)}
                            className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="History Nilai"
                          >
                            <FileSpreadsheet size={18} />
                          </button>
                          <button
                            onClick={() => handleRestore(graduate)}
                            className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Restore ke Data Siswa"
                          >
                            <RotateCcw size={18} />
                          </button>
                          <button
                            onClick={() => handleOpenModal(graduate)}
                            className="p-2 text-slate-400 hover:text-[#5AB2FF] hover:bg-[#CAF4FF]/50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(graduate.id)}
                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Hapus"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">
                {editingGraduate ? 'Edit Data Lulusan' : 'Tambah Data Lulusan'}
              </h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">NISN *</label>
                <input
                  type="text"
                  value={formData.nisn}
                  onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#5AB2FF] focus:border-transparent outline-none transition-all"
                  placeholder="Masukkan NISN"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#5AB2FF] focus:border-transparent outline-none transition-all"
                  placeholder="Masukkan Nama Lengkap"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">No. Ijazah</label>
                <input
                  type="text"
                  value={formData.ijazahNumber}
                  onChange={(e) => setFormData({ ...formData, ijazahNumber: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#5AB2FF] focus:border-transparent outline-none transition-all"
                  placeholder="Contoh: DN-01/D-SD/13/0000001"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#5AB2FF] focus:border-transparent outline-none transition-all"
                  >
                    <option value="Lulus">Lulus</option>
                    <option value="Tidak Lulus">Tidak Lulus</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tahun Lulus *</label>
                  <input
                    type="text"
                    value={formData.graduationYear}
                    onChange={(e) => setFormData({ ...formData, graduationYear: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#5AB2FF] focus:border-transparent outline-none transition-all"
                    placeholder="Contoh: 2026"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Melanjutkan Ke</label>
                <input
                  type="text"
                  value={formData.continuedTo}
                  onChange={(e) => setFormData({ ...formData, continuedTo: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#5AB2FF] focus:border-transparent outline-none transition-all"
                  placeholder="Nama sekolah lanjutan"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end space-x-3">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors font-medium"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-gradient-to-r from-[#5AB2FF] to-[#A0DEFF] text-white rounded-xl hover:shadow-lg hover:shadow-[#5AB2FF]/30 transition-all flex items-center space-x-2 font-medium"
              >
                <Save size={18} />
                <span>Simpan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">History Nilai</h3>
                  <p className="text-sm text-slate-500">{selectedGraduateName}</p>
                </div>
              </div>
              <button onClick={handleCloseHistoryModal} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar">
              {loadingHistory ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-4"></div>
                  <p className="text-slate-500">Mengambil data history...</p>
                </div>
              ) : selectedGraduateHistory.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <FileSpreadsheet size={48} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-600 font-medium">Tidak ada history nilai ditemukan.</p>
                  <p className="text-sm text-slate-400 mt-1">History nilai hanya tersedia jika disimpan saat proses kelulusan.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {selectedGraduateHistory.sort((a, b) => b.timestamp - a.timestamp).map((history, idx) => (
                    <div key={idx} className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                        <div>
                          <h4 className="font-bold text-slate-800">Tahun Ajaran: {history.academicYear}</h4>
                          <p className="text-sm text-slate-500">Semester {history.semester} • Kelas {history.classId}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Tanggal Simpan</span>
                          <p className="text-sm font-semibold text-slate-700">{new Date(history.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs text-slate-500 uppercase bg-slate-50/50">
                            <tr>
                              <th className="px-6 py-3 font-semibold">Mata Pelajaran</th>
                              <th className="px-6 py-3 text-center font-semibold">S1</th>
                              <th className="px-6 py-3 text-center font-semibold">S2</th>
                              <th className="px-6 py-3 text-center font-semibold">S3</th>
                              <th className="px-6 py-3 text-center font-semibold">S4</th>
                              <th className="px-6 py-3 text-center font-semibold text-emerald-600">SAS</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {Object.entries(history.subjects).map(([subjectId, grades]: [string, any]) => (
                              <tr key={subjectId} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-3 font-medium text-slate-700">{subjectId}</td>
                                <td className="px-6 py-3 text-center text-slate-600">{grades.sum1 || '-'}</td>
                                <td className="px-6 py-3 text-center text-slate-600">{grades.sum2 || '-'}</td>
                                <td className="px-6 py-3 text-center text-slate-600">{grades.sum3 || '-'}</td>
                                <td className="px-6 py-3 text-center text-slate-600">{grades.sum4 || '-'}</td>
                                <td className="px-6 py-3 text-center font-bold text-emerald-600 bg-emerald-50/30">{grades.sas || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                onClick={handleCloseHistoryModal}
                className="px-6 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors font-medium shadow-md"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GraduatesView;
