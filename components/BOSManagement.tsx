
import React, { useState, useMemo } from 'react';
import { BOSTransaction, SchoolProfileData } from '../types';
import { 
  Wallet, TrendingUp, TrendingDown, Plus, Filter, 
  Trash2, Printer, Loader2, Save, X, FileText, CalendarRange, Coins, Edit
} from 'lucide-react';
import { useModal } from '../context/ModalContext';

interface BOSManagementProps {
  transactions: BOSTransaction[];
  onSave: (transaction: BOSTransaction) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  schoolProfile?: SchoolProfileData;
  isReadOnly?: boolean;
}

const CATEGORIES = [
  // 'SiLPA Tahun Lalu', // Removed from default list to prevent overlap/duplication
  'BOS Reguler',
  'Standar Isi',
  'Standar Proses',
  'Standar Kompetensi Lulusan',
  'Standar Pendidik dan Tenaga Kependidikan',
  'Standar Sarana dan Prasarana',
  'Standar Pengelolaan',
  'Standar Pembiayaan',
  'Standar Penilaian Pendidikan'
];

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const BOSManagement: React.FC<BOSManagementProps> = ({ 
  transactions, onSave, onDelete, schoolProfile, isReadOnly = false 
}) => {
  const [viewMode, setViewMode] = useState<'monthly' | 'annual'>('monthly');
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { showAlert, showConfirm } = useModal();
  
  const [form, setForm] = useState<Partial<BOSTransaction>>({
    date: new Date().toISOString().split('T')[0],
    type: 'expense',
    category: 'Standar Isi',
    description: '',
    amount: 0
  });

  // --- Calculations ---

  // 0. Dynamic Years Calculation
  const availableYears = useMemo(() => {
    const currentY = new Date().getFullYear();
    const startY = 2019; // Start from 2019 or earlier if needed
    const endY = currentY + 5; // Allow planning 5 years ahead
    
    const yearSet = new Set<number>();
    // Add default range
    for (let y = startY; y <= endY; y++) {
        yearSet.add(y);
    }
    
    // Add years from existing transactions to ensure no data is hidden
    transactions.forEach(t => {
        const tDate = new Date(t.date);
        if (!isNaN(tDate.getTime())) {
            yearSet.add(tDate.getFullYear());
        }
    });

    return Array.from(yearSet).sort((a, b) => b - a); // Sort descending (newest first)
  }, [transactions]);

  // 1. Overall Balance (Exclude SiLPA as it is informational only)
  const currentBalance = useMemo(() => {
    const income = transactions
        .filter(t => t.type === 'income' && t.category !== 'SiLPA Tahun Lalu')
        .reduce((acc, curr) => acc + curr.amount, 0);
    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, curr) => acc + curr.amount, 0);
    return income - expense;
  }, [transactions]);

  // 2. SiLPA Tahun Lalu (Specific for the selected Filter Year)
  const silpaTahunLalu = useMemo(() => {
      return transactions
        .filter(t => 
            t.category === 'SiLPA Tahun Lalu' && 
            new Date(t.date).getFullYear() === filterYear
        )
        .reduce((acc, curr) => acc + curr.amount, 0);
  }, [transactions, filterYear]);

  // 3. Filtered Transactions (Based on View Mode)
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.date);
      const isYearMatch = d.getFullYear() === filterYear;
      
      if (viewMode === 'annual') {
          return isYearMatch;
      }
      return isYearMatch && d.getMonth() + 1 === filterMonth;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [transactions, filterMonth, filterYear, viewMode]);

  // 4. Report Data Structure (Grouping by Standards)
  const reportData = useMemo(() => {
    const groups: Record<string, number> = {};
    
    // Initialize with 0
    CATEGORIES.forEach(cat => groups[cat] = 0);

    // Sum amounts by category
    filteredTransactions.forEach(t => {
      if (groups[t.category] !== undefined) {
        groups[t.category] += t.amount;
      }
    });

    return groups;
  }, [filteredTransactions]);

  // 5. Period Totals
  // Note: periodIncomeTotal excludes SiLPA
  const periodIncomeTotal = filteredTransactions
    .filter(t => t.type === 'income' && t.category !== 'SiLPA Tahun Lalu')
    .reduce((a, b) => a + b.amount, 0);

  const periodExpenseTotal = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((a, b) => a + b.amount, 0);

  // Final Balance Calculation (Excluding SiLPA)
  const periodEndingBalance = periodIncomeTotal - periodExpenseTotal;

  // --- Handlers ---

  const handleOpenModal = () => {
    setForm({
        id: '',
        date: new Date().toISOString().split('T')[0],
        type: 'expense',
        category: 'Standar Isi',
        description: '',
        amount: 0
    });
    setIsModalOpen(true);
  };

  const handleEdit = (transaction: BOSTransaction) => {
      setForm(transaction);
      setIsModalOpen(true);
  };

  const handleEditSilpa = () => {
      // Find existing SiLPA transaction for this year
      const existingSilpa = transactions.find(t => 
          t.category === 'SiLPA Tahun Lalu' && 
          new Date(t.date).getFullYear() === filterYear
      );

      if (existingSilpa) {
          handleEdit(existingSilpa);
      } else {
          // If not exists, prepare a new one defaulted to Jan 1st of filter year
          setForm({
              id: '',
              date: `${filterYear}-01-01`,
              type: 'income',
              category: 'SiLPA Tahun Lalu',
              description: 'Sisa Lebih Perhitungan Anggaran Tahun Lalu',
              amount: 0
          });
          setIsModalOpen(true);
      }
  };

  const handleSave = async () => {
    if (!form.date || !form.category || !form.amount || form.amount <= 0) {
      showAlert("Mohon lengkapi data dengan benar.", "error");
      return;
    }
    
    // Auto-set type based on category
    // SiLPA Tahun Lalu and BOS Reguler are INCOME
    const finalType = (form.category === 'BOS Reguler' || form.category === 'SiLPA Tahun Lalu') ? 'income' : 'expense';

    setIsSaving(true);
    try {
      await onSave({
        id: form.id || `bos-${Date.now()}`,
        date: form.date,
        type: finalType,
        category: form.category as any,
        description: form.description || '-',
        amount: Number(form.amount)
      });
      setIsModalOpen(false);
    } catch (e) {
      showAlert("Gagal menyimpan data.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    showConfirm("Hapus transaksi ini?", async () => {
      await onDelete(id);
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  const handlePrint = () => {
      window.print();
  };

  const periodLabel = viewMode === 'monthly' ? 'Bulan Ini' : 'Tahun Ini';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <Wallet className="mr-3 text-indigo-600" />
            Pengelolaan BOS
          </h2>
          <p className="text-gray-500">Laporan realisasi anggaran Bantuan Operasional Sekolah.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            {!isReadOnly && (
                <button 
                    onClick={handleOpenModal} 
                    className="flex items-center gap-2 bg-indigo-600 text-white font-bold px-4 py-2 rounded-lg shadow-md hover:bg-indigo-700 whitespace-nowrap"
                >
                    <Plus size={18} /> Transaksi Baru
                </button>
            )}
            <button onClick={handlePrint} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50" title="Cetak Laporan">
                <Printer size={18} />
            </button>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">Total Pemasukan ({periodLabel})</p>
                  <h3 className="text-2xl font-black text-emerald-600">{formatCurrency(periodIncomeTotal)}</h3>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><TrendingUp size={24}/></div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">Total Pengeluaran ({periodLabel})</p>
                  <h3 className="text-2xl font-black text-red-600">{formatCurrency(periodExpenseTotal)}</h3>
              </div>
              <div className="p-3 bg-red-50 text-red-600 rounded-xl"><TrendingDown size={24}/></div>
          </div>
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-5 rounded-2xl shadow-lg flex items-center justify-between">
              <div>
                  <p className="text-xs font-bold uppercase mb-1 opacity-80">Sisa Saldo Tunai (Global)</p>
                  <h3 className="text-2xl font-black">{formatCurrency(currentBalance)}</h3>
              </div>
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm"><Wallet size={24}/></div>
          </div>
      </div>

      {/* FILTER & REPORT CONTAINER */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print-container">
          
          {/* Header & Filter */}
          <div className="p-4 border-b bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4 no-print">
              <div className="flex items-center gap-2">
                  <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
                      <button 
                        onClick={() => setViewMode('monthly')}
                        className={`px-3 py-1.5 rounded-md text-sm font-bold transition-colors ${viewMode === 'monthly' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                          Bulanan
                      </button>
                      <button 
                        onClick={() => setViewMode('annual')}
                        className={`px-3 py-1.5 rounded-md text-sm font-bold transition-colors ${viewMode === 'annual' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                          Tahunan
                      </button>
                  </div>
              </div>

              <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                      <CalendarRange size={16} className="text-gray-400"/>
                      <span className="text-xs font-bold text-gray-500 uppercase mr-1">Tahun Anggaran:</span>
                      <select 
                        value={filterYear} 
                        onChange={(e) => setFilterYear(Number(e.target.value))}
                        className="text-sm font-bold text-gray-800 outline-none cursor-pointer bg-transparent"
                      >
                          {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                  </div>

                  {viewMode === 'monthly' && (
                      <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                          <Filter size={16} className="text-gray-400"/>
                          <select 
                            value={filterMonth} 
                            onChange={(e) => setFilterMonth(Number(e.target.value))}
                            className="text-sm font-bold text-gray-800 outline-none cursor-pointer bg-transparent"
                          >
                              {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                          </select>
                      </div>
                  )}
              </div>
          </div>

          {/* PRINTABLE REPORT */}
          <div className="p-8 print:p-0">
              <div className="text-center mb-8 hidden print:block">
                  <h2 className="text-xl font-bold uppercase">Laporan Realisasi Penggunaan Dana BOS</h2>
                  <p className="text-sm uppercase font-bold">
                      {viewMode === 'monthly' 
                        ? `Periode: ${MONTHS[filterMonth-1]} ${filterYear}` 
                        : `Tahun Anggaran: ${filterYear}`
                      }
                  </p>
                  <p className="text-sm font-bold mt-1">{schoolProfile?.name || 'SEKOLAH DASAR'}</p>
              </div>

              {/* SiLPA DISPLAY BLOCK (OUTSIDE TABLE) */}
              <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-gray-50 border border-gray-200 p-4 rounded-xl print:border print:border-black print:bg-white print:rounded-none">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-full border border-gray-200 text-amber-500 print:hidden">
                          <Coins size={20} />
                      </div>
                      <div>
                          <h5 className="font-bold text-gray-700 text-sm uppercase">SiLPA Tahun Lalu</h5>
                          <p className="text-xs text-gray-500 print:hidden">Sisa anggaran thn. {filterYear - 1}</p>
                      </div>
                  </div>
                  <div className="flex items-center gap-3">
                      <div className="text-xl font-black text-gray-800 font-mono">
                          {formatCurrency(silpaTahunLalu)}
                      </div>
                      {!isReadOnly && (
                          <button 
                            onClick={handleEditSilpa}
                            className="p-1.5 bg-white border border-gray-300 text-gray-600 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors shadow-sm print:hidden"
                            title="Edit Nominal SiLPA"
                          >
                              <Edit size={16} />
                          </button>
                      )}
                  </div>
              </div>

              {/* REPORT TABLE */}
              <div className="mb-8">
                  <h4 className="font-bold text-gray-800 mb-3 border-l-4 border-indigo-500 pl-3">
                      Rekapitulasi Per Standar {viewMode === 'annual' ? `(Tahun ${filterYear})` : `(${MONTHS[filterMonth - 1]})`}
                  </h4>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="w-full text-sm text-left">
                          <thead className="bg-gray-50 text-gray-700 font-bold uppercase text-xs">
                              <tr>
                                  <th className="p-3 border-b">Uraian / Standar</th>
                                  <th className="p-3 border-b text-right w-48">Jumlah (Rp)</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                              
                              {/* A. PENERIMAAN */}
                              <tr>
                                  <td colSpan={2} className="p-2 bg-gray-100 font-bold text-xs">A. PENERIMAAN (TAHUN BERJALAN)</td>
                              </tr>
                              {/* Income Rows - ONLY BOS REGULER HERE */}
                              <tr className="bg-white hover:bg-gray-50">
                                  <td className="p-3 pl-6 text-gray-700">1. BOS Reguler</td>
                                  <td className="p-3 text-right font-mono text-gray-700">{formatCurrency(reportData['BOS Reguler'])}</td>
                              </tr>
                              <tr className="bg-emerald-50 font-bold">
                                  <td className="p-3 pl-6 text-emerald-800">Total Penerimaan</td>
                                  <td className="p-3 text-right text-emerald-800">{formatCurrency(periodIncomeTotal)}</td>
                              </tr>

                              {/* B. PENGELUARAN */}
                              <tr>
                                  <td colSpan={2} className="p-2 bg-gray-100 font-bold text-xs border-t">B. PENGELUARAN</td>
                              </tr>
                              {CATEGORIES.filter(c => c !== 'BOS Reguler' && c !== 'SiLPA Tahun Lalu').map((cat, index) => (
                                  <tr key={cat} className="bg-white hover:bg-gray-50">
                                      <td className="p-3 pl-6 text-gray-700">{index + 1}. {cat}</td>
                                      <td className="p-3 text-right font-mono text-gray-700">{formatCurrency(reportData[cat])}</td>
                                  </tr>
                              ))}
                              
                              <tr className="bg-red-50 font-bold">
                                  <td className="p-3 pl-6 text-red-800">Total Pengeluaran</td>
                                  <td className="p-3 text-right text-red-800">{formatCurrency(periodExpenseTotal)}</td>
                              </tr>

                              {/* C. SALDO */}
                              <tr className="bg-gray-200 font-bold border-t-2 border-gray-300">
                                  <td className="p-3 text-indigo-900">
                                      C. SISA DANA / SALDO <span className="text-[10px] font-normal block md:inline md:ml-2">(Penerimaan - Pengeluaran)</span>
                                  </td>
                                  <td className={`p-3 text-right ${periodEndingBalance >= 0 ? 'text-indigo-900' : 'text-red-700'}`}>
                                      {formatCurrency(periodEndingBalance)}
                                  </td>
                              </tr>
                          </tbody>
                      </table>
                  </div>
              </div>

              {/* DETAILED TRANSACTIONS (AUDIT TRAIL) */}
              <div>
                  <h4 className="font-bold text-gray-800 mb-3 border-l-4 border-amber-500 pl-3 no-print flex items-center gap-2">
                      <FileText size={16}/> Rincian Transaksi
                  </h4>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg no-print max-h-[500px]">
                      <table className="w-full text-xs text-left">
                          <thead className="bg-gray-50 text-gray-600 font-bold uppercase sticky top-0 z-10">
                              <tr>
                                  <th className="p-3 w-32 border-b">Tanggal</th>
                                  <th className="p-3 border-b">Kategori</th>
                                  <th className="p-3 border-b">Keterangan</th>
                                  <th className="p-3 border-b text-right">Masuk</th>
                                  <th className="p-3 border-b text-right">Keluar</th>
                                  {!isReadOnly && <th className="p-3 w-20 text-center border-b">Aksi</th>}
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                              {filteredTransactions.length === 0 ? (
                                  <tr><td colSpan={6} className="p-4 text-center text-gray-400 italic">Tidak ada transaksi pada periode ini.</td></tr>
                              ) : (
                                  filteredTransactions.map(t => (
                                      <tr key={t.id} className="hover:bg-gray-50">
                                          <td className="p-3 text-gray-500">{t.date}</td>
                                          <td className="p-3 font-medium">{t.category}</td>
                                          <td className="p-3 text-gray-600">{t.description}</td>
                                          <td className="p-3 text-right font-medium text-emerald-600">
                                              {t.type === 'income' ? formatCurrency(t.amount) : '-'}
                                          </td>
                                          <td className="p-3 text-right font-medium text-red-600">
                                              {t.type === 'expense' ? formatCurrency(t.amount) : '-'}
                                          </td>
                                          {!isReadOnly && (
                                              <td className="p-3 text-center flex justify-center gap-2">
                                                  <button onClick={() => handleEdit(t)} className="text-gray-400 hover:text-indigo-500"><Edit size={14}/></button>
                                                  <button onClick={() => handleDelete(t.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
                                              </td>
                                          )}
                                      </tr>
                                  ))
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>

              {/* Signature Section for Print */}
              <div className="hidden print:flex justify-between mt-16 px-8">
                  <div className="text-center">
                      <p className="mb-20">Mengetahui,<br/>Kepala Sekolah</p>
                      <p className="font-bold underline">{schoolProfile?.headmaster || '......................'}</p>
                      <p>NIP. {schoolProfile?.headmasterNip || '......................'}</p>
                  </div>
                  <div className="text-center">
                      <p className="mb-20">Bendahara BOS</p>
                      <p className="font-bold underline">......................</p>
                      <p>NIP. ......................</p>
                  </div>
              </div>
          </div>
      </div>

      {/* INPUT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm no-print">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col">
            <div className="p-5 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <h3 className="font-bold text-lg text-gray-800">{form.id ? 'Edit Transaksi' : 'Input Transaksi Baru'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tanggal</label>
                <input 
                  type="date" 
                  value={form.date} 
                  onChange={e => setForm({...form, date: e.target.value})}
                  className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Kategori (Standar)</label>
                <select 
                    value={form.category}
                    onChange={e => setForm({...form, category: e.target.value as any})}
                    className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                >
                    {(form.category === 'SiLPA Tahun Lalu') && <option value="SiLPA Tahun Lalu">SiLPA Tahun Lalu</option>}
                    {CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
                {(form.category === 'BOS Reguler' || form.category === 'SiLPA Tahun Lalu') ? (
                    <p className="text-xs text-emerald-600 mt-1 flex items-center"><TrendingUp size={12} className="mr-1"/> Akan dicatat sebagai Pemasukan</p>
                ) : (
                    <p className="text-xs text-red-600 mt-1 flex items-center"><TrendingDown size={12} className="mr-1"/> Akan dicatat sebagai Pengeluaran</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Uraian / Keterangan</label>
                <input 
                  type="text" 
                  value={form.description} 
                  onChange={e => setForm({...form, description: e.target.value})}
                  placeholder="Contoh: Pembelian ATK, Honor Guru..."
                  className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Jumlah (Rp)</label>
                <input 
                  type="number" 
                  min="0"
                  value={form.amount} 
                  onChange={e => setForm({...form, amount: Number(e.target.value)})}
                  className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono font-bold"
                />
              </div>
            </div>

            <div className="p-5 border-t bg-gray-50 flex justify-end gap-2 rounded-b-2xl">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium text-sm">Batal</button>
              <button 
                onClick={handleSave} 
                disabled={isSaving}
                className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg flex items-center gap-2 shadow-md hover:bg-indigo-700 disabled:opacity-50 text-sm"
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

export default BOSManagement;