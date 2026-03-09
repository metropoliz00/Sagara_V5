
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Book, Plus, Search, Trash2, CheckCircle, Clock, Filter, ChevronDown, ChevronUp, RotateCcw, Image as ImageIcon, Edit2, Save, X, Loader2 } from 'lucide-react';
import { Student, BookLoan, BookInventory } from '../types';
import { MOCK_SUBJECTS } from '../constants';
import { apiService } from '../services/apiService';

interface BookLoanViewProps {
  students: Student[];
  bookLoans: BookLoan[];
  onSaveLoan: (loan: BookLoan) => void;
  onDeleteLoan: (id: string) => void;
  isDemoMode: boolean;
  classId: string;
  onShowNotification: (message: string, type: 'success' | 'error' | 'warning') => void;
}

const BookLoanView: React.FC<BookLoanViewProps> = ({
  students,
  bookLoans,
  onSaveLoan,
  onDeleteLoan,
  isDemoMode,
  classId,
  onShowNotification
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'Semua' | 'Dipinjam' | 'Dikembalikan'>('Semua');

  // Form State
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const [qty, setQty] = useState(1);
  const [status, setStatus] = useState<'Dipinjam' | 'Dikembalikan'>('Dipinjam');
  const [notes, setNotes] = useState('');

  // Inventory State
  const [inventory, setInventory] = useState<BookInventory[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [editStockValue, setEditStockValue] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingBookId, setUploadingBookId] = useState<string | null>(null);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        setLoadingInventory(true);
        const data = await apiService.getBookInventory(classId);
        setInventory(data);
      } catch (error) {
        console.error("Failed to fetch book inventory:", error);
      } finally {
        setLoadingInventory(false);
      }
    };
    if (classId) {
      fetchInventory();
    }
  }, [classId, bookLoans]);

  // Use all subjects (10 items)
  const subjects = MOCK_SUBJECTS;

  const formatDateIndo = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(date);
    } catch (e) {
      return dateStr;
    }
  };

  const filteredLoans = useMemo(() => {
    return bookLoans.filter(loan => {
      const matchesClass = loan.classId === classId;
      const matchesSearch = loan.studentName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'Semua' || loan.status === filterStatus;
      return matchesClass && matchesSearch && matchesStatus;
    });
  }, [bookLoans, searchTerm, filterStatus, classId]);

  const handleToggleBook = (bookName: string) => {
    setSelectedBooks(prev => {
      const newSelection = prev.includes(bookName) 
        ? prev.filter(b => b !== bookName) 
        : [...prev, bookName];
      setQty(newSelection.length > 0 ? newSelection.length : 1);
      return newSelection;
    });
  };

  const handleSelectAllBooks = () => {
    if (selectedBooks.length === subjects.length) {
      setSelectedBooks([]);
      setQty(1);
    } else {
      const allBooks = subjects.map(s => s.name);
      setSelectedBooks(allBooks);
      setQty(allBooks.length);
    }
  };

  // Inventory Handlers
  const handleUpdateStock = (id: string) => {
    const updatedInventory = inventory.map(item => {
      if (item.id === id) {
        const diff = editStockValue - item.totalStock;
        return { ...item, totalStock: editStockValue, stock: item.stock + diff };
      }
      return item;
    });
    setInventory(updatedInventory);
    setEditingBookId(null);
  };

  const startEditing = (book: BookInventory) => {
    setEditingBookId(book.id);
    setEditStockValue(book.totalStock);
  };

  const triggerFileUpload = (id: string) => {
    setUploadingBookId(id);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const bookId = uploadingBookId;
    if (file && bookId) {
      try {
        // Compress image before saving to avoid Google Sheets 50k char limit
        const compressedBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const MAX_WIDTH = 300;
              const MAX_HEIGHT = 400;
              let width = img.width;
              let height = img.height;

              if (width > height) {
                if (width > MAX_WIDTH) {
                  height *= MAX_WIDTH / width;
                  width = MAX_WIDTH;
                }
              } else {
                if (height > MAX_HEIGHT) {
                  width *= MAX_HEIGHT / height;
                  height = MAX_HEIGHT;
                }
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, width, height);
              
              // Compress to JPEG with 0.6 quality to ensure it fits in a cell
              const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
              resolve(dataUrl);
            };
            img.onerror = (error) => reject(error);
          };
          reader.onerror = (error) => reject(error);
        });

        setInventory(prev => prev.map(item => 
          item.id === bookId ? { ...item, coverUrl: compressedBase64 } : item
        ));
      } catch (error) {
        console.error("Error compressing image:", error);
        onShowNotification('Gagal memproses gambar. Coba gambar lain.', 'error');
      } finally {
        setUploadingBookId(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = ''; // Reset input
        }
      }
    }
  };

  const handleSaveChanges = async () => {
    try {
      setLoadingInventory(true);
      await apiService.saveBookInventory(inventory);
      onShowNotification('Perubahan stok dan cover buku berhasil disimpan!', 'success');
    } catch (error) {
      console.error("Failed to save inventory:", error);
      onShowNotification('Gagal menyimpan perubahan. Silakan coba lagi.', 'error');
    } finally {
      setLoadingInventory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || selectedBooks.length === 0) return;

    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return;

    // Check Stock
    if (status === 'Dipinjam') {
      const selectedInventoryItems = inventory.filter(i => selectedBooks.includes(i.name));
      const outOfStock = selectedInventoryItems.filter(i => i.stock < qty);
      
      if (outOfStock.length > 0) {
        onShowNotification(`Stok tidak cukup untuk: ${outOfStock.map(i => i.name).join(', ')}`, 'error');
        return;
      }
    }

    const newLoan: BookLoan = {
      id: `loan-${Date.now()}`,
      studentId: selectedStudentId,
      studentName: student.name,
      classId: student.classId,
      books: selectedBooks,
      qty: qty,
      status: status,
      date: new Date().toISOString().split('T')[0],
      notes: notes
    };

    await onSaveLoan(newLoan);
    resetForm();
  };

  const handleReturnLoan = async (loan: BookLoan) => {
    const updatedLoan: BookLoan = {
      ...loan,
      status: 'Dikembalikan',
      notes: loan.notes ? `${loan.notes} (Dikembalikan pada ${formatDateIndo(new Date().toISOString())})` : `Dikembalikan pada ${formatDateIndo(new Date().toISOString())}`
    };
    await onSaveLoan(updatedLoan);
  };

  const handleDeleteLoanWrapper = async (loan: BookLoan) => {
    await onDeleteLoan(loan.id);
  };

  const resetForm = () => {
    setSelectedStudentId('');
    setSelectedBooks([]);
    setQty(1);
    setStatus('Dipinjam');
    setNotes('');
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*"
        onChange={handleFileChange}
      />

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <Book className="mr-2 text-indigo-600" /> Peminjaman Buku Paket
          </h2>
          <p className="text-gray-500">Kelola stok dan peminjaman buku paket siswa.</p>
        </div>
        <button 
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-all"
        >
          {isFormOpen ? <ChevronUp size={18} /> : <Plus size={18} />}
          <span>{isFormOpen ? 'Tutup Form' : 'Input Peminjaman'}</span>
        </button>
      </div>

      {/* Visual Stock Section */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800 flex items-center">
            <ImageIcon className="mr-2 text-indigo-500" size={20} /> Stok Buku Paket
          </h3>
          <button 
            onClick={handleSaveChanges}
            disabled={loadingInventory}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            <span>Simpan Perubahan</span>
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {loadingInventory ? (
            <div className="col-span-full flex justify-center items-center p-8">
              <Loader2 className="animate-spin text-indigo-600" size={32} />
              <span className="ml-2 text-gray-500">Memuat data stok...</span>
            </div>
          ) : inventory.map((book) => (
            <div key={book.id} className="group relative bg-gray-50 rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all">
              <div className="aspect-[3/4] bg-gray-200 relative overflow-hidden">
                {book.coverUrl ? (
                  <img src={book.coverUrl} alt={book.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">
                    <Book size={48} opacity={0.2} />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <button 
                    onClick={() => triggerFileUpload(book.id)}
                    className="p-2 bg-white rounded-full text-gray-700 hover:text-indigo-600 shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all"
                    title="Upload Cover"
                  >
                    <ImageIcon size={18} />
                  </button>
                </div>
              </div>
              <div className="p-3">
                <h4 className="font-bold text-gray-800 text-sm truncate" title={book.name}>{book.name}</h4>
                
                {editingBookId === book.id ? (
                  <div className="mt-2 flex items-center space-x-1">
                    <input 
                      type="number" 
                      value={editStockValue}
                      onChange={(e) => setEditStockValue(parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1 text-xs border rounded"
                      autoFocus
                    />
                    <button onClick={() => handleUpdateStock(book.id)} className="text-green-600 hover:bg-green-50 p-1 rounded">
                      <Save size={14} />
                    </button>
                    <button onClick={() => setEditingBookId(null)} className="text-red-600 hover:bg-red-50 p-1 rounded">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 flex justify-between items-end">
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase font-semibold">Stok</div>
                      <div className={`text-sm font-bold ${book.stock < 5 ? 'text-red-600' : 'text-indigo-600'}`}>
                        {book.stock} <span className="text-gray-400 text-xs font-normal">/ {book.totalStock}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => startEditing(book)}
                      className="text-gray-400 hover:text-indigo-600 p-1 rounded-md hover:bg-indigo-50 transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Input Form */}
      {isFormOpen && (
        <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-md animate-fade-in-down">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nama Siswa</label>
                <select 
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                >
                  <option value="">Pilih Siswa</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex justify-between items-center">
                  <span>Buku Paket yang Dipinjam</span>
                  <button 
                    type="button"
                    onClick={handleSelectAllBooks}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    {selectedBooks.length === subjects.length ? 'Hapus Semua' : 'Pilih Semua'}
                  </button>
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-100 rounded-lg bg-gray-50">
                  {subjects.map(subject => {
                    const bookStock = inventory.find(i => i.name === subject.name)?.stock || 0;
                    return (
                      <label key={subject.id} className={`flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors ${bookStock <= 0 && !selectedBooks.includes(subject.name) ? 'opacity-50 bg-gray-100' : 'hover:bg-white'}`}>
                        <input 
                          type="checkbox"
                          checked={selectedBooks.includes(subject.name)}
                          onChange={() => handleToggleBook(subject.name)}
                          disabled={bookStock <= 0 && !selectedBooks.includes(subject.name)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-700">{subject.name}</span>
                          <span className="text-[10px] text-gray-500">Sisa: {bookStock}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Jumlah Buku</label>
                  <input 
                    type="number"
                    min="1"
                    value={qty}
                    onChange={(e) => setQty(parseInt(e.target.value))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Status</label>
                  <select 
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="Dipinjam">Dipinjam</option>
                    <option value="Dikembalikan">Dikembalikan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Keterangan</label>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Kondisi buku baik, dipinjam untuk semester 1"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button 
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-md hover:bg-indigo-700 transition-all"
                >
                  Simpan Data
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Filter & Search */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            placeholder="Cari nama siswa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter size={18} className="text-gray-400" />
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="p-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
          >
            <option value="Semua">Semua Status</option>
            <option value="Dipinjam">Dipinjam</option>
            <option value="Dikembalikan">Dikembalikan</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-indigo-50 text-indigo-800 font-bold uppercase text-xs">
              <tr>
                <th className="p-4 text-center w-12">No</th>
                <th className="p-4">Siswa</th>
                <th className="p-4">Buku Paket</th>
                <th className="p-4 text-center">Jumlah</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4">Keterangan</th>
                <th className="p-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400 italic">
                    Belum ada data peminjaman buku.
                  </td>
                </tr>
              ) : (
                filteredLoans.map((loan, idx) => (
                  <tr key={loan.id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="p-4 text-center text-gray-500 font-mono">{idx + 1}</td>
                    <td className="p-4">
                      <div className="font-bold text-gray-800">{loan.studentName}</div>
                      <div className="text-xs text-gray-500">Pinjam pada {formatDateIndo(loan.date)}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {loan.books.map((book, bIdx) => (
                          <span 
                            key={bIdx} 
                            className="px-2 py-0.5 bg-white border border-indigo-100 text-indigo-700 rounded-full text-[10px] font-medium shadow-sm"
                          >
                            {book}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 text-center font-bold text-indigo-600">{loan.qty}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                        loan.status === 'Dipinjam' 
                          ? 'bg-amber-50 text-amber-700 border-amber-200' 
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {loan.status === 'Dipinjam' ? <Clock size={12} className="mr-1" /> : <CheckCircle size={12} className="mr-1" />}
                        {loan.status}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600 italic text-xs">
                      {loan.notes || '-'}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        {loan.status === 'Dipinjam' && (
                          <button 
                            onClick={() => handleReturnLoan(loan)}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Kembalikan Buku"
                          >
                            <RotateCcw size={18} />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDeleteLoanWrapper(loan)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus Data"
                        >
                          <Trash2 size={18} />
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
    </div>
  );
};

export default BookLoanView;

