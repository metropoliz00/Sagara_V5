
import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  Calendar, ClipboardList, Map, CheckCircle, BookOpen, Users,
  Printer, FileSpreadsheet, Upload, Download, Loader2, CalendarDays, RefreshCw
} from 'lucide-react';
import { apiService } from '../services/apiService';
import { Student, InventoryItem, Guest, ScheduleItem, PiketGroup, TeacherProfileData, SeatingLayouts, AcademicCalendarData, Holiday, OrganizationStructure, User, SchoolProfileData } from '../types';
import { DEFAULT_TIME_SLOTS, CALENDAR_CODES } from '../constants';

// Import Sub-Components
import ScheduleTab from './classroom/ScheduleTab';
import PiketTab from './classroom/PiketTab';
import SeatingTab from './classroom/SeatingTab';
import InventoryTab from './classroom/InventoryTab';
import GuestBookTab from './classroom/GuestBookTab';
import AcademicCalendarTab from './classroom/AcademicCalendarTab';
import OrganizationChartTab from './classroom/OrganizationChartTab'; // NEW IMPORT

interface ClassroomAdminProps {
  students?: Student[];
  teacherProfile?: TeacherProfileData;
  onShowNotification: (message: string, type: 'success' | 'error' | 'warning') => void;
  holidays: Holiday[];
  onAddHoliday: (holidays: Omit<Holiday, 'id'>[]) => Promise<void>;
  classId: string;
  userRole?: string; // NEW PROP
  users?: User[]; // NEW: To find class teacher
  schoolProfile?: SchoolProfileData; // NEW PROP
}

const ClassroomAdmin: React.FC<ClassroomAdminProps> = ({ 
  students = [], 
  teacherProfile, 
  onShowNotification, 
  holidays, 
  onAddHoliday, 
  classId,
  userRole, // Destructure new prop
  users,
  schoolProfile
}) => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'piket' | 'seating' | 'inventory' | 'guestbook' | 'calendar' | 'organization'>('schedule');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  // --- Data States ---
  const [guests, setGuests] = useState<Guest[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [piketGroups, setPiketGroups] = useState<PiketGroup[]>([]);
  const [seatingLayouts, setSeatingLayouts] = useState<SeatingLayouts>({ classical: [], groups: [], ushape: [] });
  const [academicCalendar, setAcademicCalendar] = useState<AcademicCalendarData>({});
  const [timeSlots, setTimeSlots] = useState<string[]>(DEFAULT_TIME_SLOTS);
  const [organization, setOrganization] = useState<OrganizationStructure>({ roles: {}, sections: [] }); // NEW STATE

  // --- Initial Fetch ---
  useEffect(() => {
    if(classId) fetchClassroomData();
  }, [classId]);

  // --- Sync Seats with Student Count for ALL layouts ---
  const resizeLayouts = (layouts: SeatingLayouts, studentCount: number): SeatingLayouts => {
    const resizeArray = (arr: (string | null)[]) => {
      if (arr.length === studentCount) return arr;
      const newArr = Array(studentCount).fill(null);
      // Copy old values, preserving student placements
      for (let i = 0; i < Math.min(arr.length, studentCount); i++) {
        newArr[i] = arr[i];
      }
      return newArr;
    };
    return {
      classical: resizeArray(layouts.classical || []),
      groups: resizeArray(layouts.groups || []),
      ushape: resizeArray(layouts.ushape || []),
    };
  };

  useEffect(() => {
    if (students.length > 0) {
      const anyLayoutMismatched =
        seatingLayouts.classical.length !== students.length ||
        seatingLayouts.groups.length !== students.length ||
        seatingLayouts.ushape.length !== students.length;

      if (anyLayoutMismatched) {
        setSeatingLayouts(prevLayouts => resizeLayouts(prevLayouts, students.length));
      }
    }
  }, [students, seatingLayouts]);


  const fetchClassroomData = async () => {
    if (!classId) return;
    setIsLoading(true);
    try {
        const [invData, guestData, configData, calendarData, scheduleData] = await Promise.all([
            apiService.getInventory(classId),
            apiService.getGuests(classId),
            apiService.getClassConfig(classId),
            apiService.getAcademicCalendar('global'),
            apiService.getSchedule(classId)
        ]);
        setInventory(invData);
        setGuests(guestData.sort((a,b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time)));
        
        // Use schedule from dedicated table if available, otherwise fallback to config
        if (scheduleData && scheduleData.length > 0) {
            setSchedule(scheduleData);
        } else if (configData.schedule) {
            setSchedule(configData.schedule);
        }

        if (configData.piket) setPiketGroups(configData.piket);
        if (configData.seats) setSeatingLayouts(configData.seats);
        if (calendarData && Object.keys(calendarData).length > 0) {
            setAcademicCalendar(calendarData);
        } else if (configData.academicCalendar) {
            setAcademicCalendar(configData.academicCalendar);
        }
        if (configData.timeSlots && configData.timeSlots.length > 0) setTimeSlots(configData.timeSlots);
        if (configData.organization) setOrganization(configData.organization); // NEW: Set organization data

    } catch (e) {
        console.error("Failed to load classroom data", e);
        onShowNotification("Gagal memuat data administrasi kelas. Coba Refresh.", 'error');
    } finally {
        setIsLoading(false);
    }
  };

  // --- Save Handlers ---
  const handleSaveInventory = async (item: InventoryItem) => {
    const isNew = !inventory.some(i => i.id === item.id);
    const originalInventory = [...inventory];
    const payload = item;
    
    // Optimistic Update
    if(isNew) setInventory(prev => [...prev, payload]);
    else setInventory(prev => prev.map(i => i.id === item.id ? payload : i));
    
    try {
      await apiService.saveInventory(payload);
      onShowNotification(`Inventaris "${item.name}" berhasil disimpan.`, 'success');
      // Refetch to get consistent IDs from backend if needed, or stick with optimistic
    } catch {
      onShowNotification('Gagal menyimpan inventaris.', 'error');
      setInventory(originalInventory); // revert
    }
  };

  const handleDeleteInventory = async (id: string) => {
    setIsLoading(true);
    try {
        const result = await apiService.deleteInventory(id, classId);
        if (result.status === 'success') {
            setInventory(prev => prev.filter(i => i.id !== id));
            onShowNotification('Data inventaris berhasil dihapus', 'success');
        } else {
            throw new Error(result.message || 'Gagal menghapus dari server.');
        }
    } catch (e: any) {
       onShowNotification(e.message || 'Gagal menghapus barang dari database.', 'error');
    } finally {
        setIsLoading(false);
    }
  };

  const handleSaveGuest = async (guest: Guest) => {
    const isNew = !guests.some(g => g.id === guest.id);
    const originalGuests = [...guests];
    const payload = guest;

    if(isNew) setGuests(prev => [payload, ...prev].sort((a,b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time)));
    else setGuests(prev => prev.map(g => g.id === guest.id ? payload : g));

    try {
      await apiService.saveGuest(payload);
      onShowNotification('Data tamu berhasil disimpan.', 'success');
    } catch {
       onShowNotification('Gagal menyimpan data tamu.', 'error');
       setGuests(originalGuests);
    }
  };

  const handleDeleteGuest = async (id: string) => {
    setIsLoading(true);
    try {
        const result = await apiService.deleteGuest(id, classId);
        if (result.status === 'success') {
            setGuests(prev => prev.filter(g => g.id !== id));
            onShowNotification('Data tamu berhasil dihapus', 'success');
        } else {
            throw new Error(result.message || 'Gagal menghapus data tamu dari server.');
        }
    } catch (e: any) {
      onShowNotification(e.message || 'Gagal menghapus data tamu dari database.', 'error');
    } finally {
        setIsLoading(false);
    }
  };

  const handleSaveScheduleAndTimes = async (newSchedule: ScheduleItem[], newTimeSlots: string[]) => {
    setSchedule(newSchedule);
    setTimeSlots(newTimeSlots);
    try {
        await Promise.all([
            apiService.saveSchedule(classId, newSchedule),
            apiService.saveClassConfig('timeSlots', newTimeSlots, classId)
        ]);
        onShowNotification('Jadwal pelajaran berhasil disimpan!', 'success');
    } catch (e) {
        console.error("Error saving schedule:", e);
        onShowNotification('Gagal menyimpan jadwal.', 'error');
    }
  };

  const handleSavePiket = async (newPiket: PiketGroup[]) => {
    setPiketGroups(newPiket);
    await apiService.saveClassConfig('piket', newPiket, classId);
  };

  const handleSaveSeating = async () => {
    try {
      await apiService.saveClassConfig('seats', seatingLayouts, classId);
      onShowNotification("Semua denah tempat duduk berhasil disimpan!", 'success');
    } catch {
      onShowNotification("Gagal menyimpan denah.", 'error');
    }
  };

  const handleSaveAcademicCalendar = async (newData: AcademicCalendarData) => {
    setAcademicCalendar(newData);
    try {
      await apiService.saveAcademicCalendar(newData, 'global');
      onShowNotification("Kalender Pendidikan berhasil disimpan!", 'success');
    } catch {
      onShowNotification("Gagal menyimpan Kalender Pendidikan.", 'error');
    }
  };

  const handleSaveOrganization = async (newOrganization: OrganizationStructure) => {
    setOrganization(newOrganization);
    try {
      await apiService.saveClassConfig('organization', newOrganization, classId);
      onShowNotification("Struktur organisasi berhasil disimpan!", 'success');
    } catch {
      onShowNotification("Gagal menyimpan struktur organisasi.", 'error');
    }
  };

  // --- NEW FILE OPERATIONS ---
  const handleExport = () => {
    let data: any[], fileName: string, sheetName: string;

    switch(activeTab) {
        case 'inventory':
            if (inventory.length === 0) return onShowNotification('Tidak ada data inventaris untuk diekspor.', 'warning');
            data = inventory.map(({ id, classId, ...rest }) => rest);
            fileName = `inventaris_kelas_${classId}.xlsx`;
            sheetName = "Inventaris";
            break;
        case 'guestbook':
            if (guests.length === 0) return onShowNotification('Tidak ada data buku tamu untuk diekspor.', 'warning');
            data = guests.map(({ id, classId, ...rest }) => ({
                Tanggal: rest.date,
                Waktu: rest.time,
                "Nama Tamu": rest.name,
                Instansi: rest.agency,
                Keperluan: rest.purpose
            }));
            fileName = `buku_tamu_kelas_${classId}.xlsx`;
            sheetName = "Buku Tamu";
            break;
        default:
            // FIX: The `onShowNotification` function only accepts 'success', 'error', or 'warning' as the type. Changed 'info' to 'warning'.
            onShowNotification('Ekspor tidak tersedia untuk tab ini.', 'warning');
            return;
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, fileName);
  };

  const handleDownloadTemplate = () => {
      let headers: string[], example: any[], fileName: string;

      switch(activeTab) {
          case 'inventory':
              headers = ["Nama Barang", "Jumlah", "Kondisi (Baik/Rusak)"];
              example = ["Papan Tulis", 1, "Baik"];
              fileName = "template_inventaris.xlsx";
              break;
          case 'guestbook':
              headers = ["Tanggal (YYYY-MM-DD)", "Waktu (HH:mm)", "Nama Tamu", "Instansi/Asal", "Keperluan"];
              example = ["2024-07-20", "10:30", "Orang Tua Siswa", "Wali Murid", "Konsultasi nilai"];
              fileName = "template_buku_tamu.xlsx";
              break;
          default:
              onShowNotification('Template tidak tersedia untuk tab ini.', 'warning');
              return;
      }

      const ws = XLSX.utils.aoa_to_sheet([headers, example]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template");
      XLSX.writeFile(wb, fileName);
  };

  const handleImportClick = () => {
      if (['inventory', 'guestbook'].includes(activeTab)) {
          fileInputRef.current?.click();
      } else {
          onShowNotification('Import tidak tersedia untuk tab ini.', 'warning');
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
        setIsLoading(true);
        try {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(ws) as any[];

            if (activeTab === 'inventory') {
                for (const row of data) {
                    const newItem: InventoryItem = { id: `inv-${Date.now()}-${Math.random()}`, classId: classId, name: row['Nama Barang'] || '', qty: Number(row['Jumlah'] || 1), condition: (row['Kondisi'] === 'Rusak') ? 'Rusak' : 'Baik' };
                    if (newItem.name) await handleSaveInventory(newItem);
                }
            } else if (activeTab === 'guestbook') {
                for (const row of data) {
                     const newGuest: Guest = { id: `gst-${Date.now()}-${Math.random()}`, classId: classId, date: row['Tanggal (YYYY-MM-DD)'] || new Date().toISOString().split('T')[0], time: row['Waktu (HH:mm)'] || new Date().toLocaleTimeString('id-ID'), name: row['Nama Tamu'] || '', agency: row['Instansi/Asal'] || '', purpose: row['Keperluan'] || '' };
                     if (newGuest.name) await handleSaveGuest(newGuest);
                }
            }
            onShowNotification(`Import data selesai.`, 'success');
            await fetchClassroomData();
        } catch (err) {
            onShowNotification("Gagal memproses file. Pastikan format sesuai template.", 'error');
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };
    reader.readAsBinaryString(file);
  };

  // --- Utility Functions ---
  const handlePrint = () => {
    const printContent = document.getElementById("print-area");
    if (!printContent) return;

    // Determine Title based on active tab
    let title = "ADMINISTRASI KELAS";
    switch(activeTab) {
        case 'schedule': title = "JADWAL PELAJARAN"; break;
        case 'piket': title = "JADWAL PIKET"; break;
        case 'seating': title = "DENAH TEMPAT DUDUK"; break;
        case 'organization': title = "STRUKTUR ORGANISASI KELAS"; break;
        case 'calendar': title = "KALENDER AKADEMIK"; break;
        case 'inventory': title = "INVENTARIS KELAS"; break;
        case 'guestbook': title = "BUKU TAMU KELAS"; break;
    }

    const className = classId || "Unknown";
    // Try to get academic year from school profile first, then calendar, or default to current year
    const currentYear = new Date().getFullYear();
    const academicYear = schoolProfile?.year || academicCalendar?.year || `${currentYear}/${currentYear + 1}`;

    // Footer Data
    const schoolName = schoolProfile?.name || "[Nama Sekolah]";
    const principalName = schoolProfile?.headmaster || "[Nama Kepala Sekolah]";
    const principalNIP = schoolProfile?.headmasterNip || "[NIP Kepala Sekolah]";
    const teacherName = teacherProfile?.name || "[Nama Guru]";
    const teacherNIP = teacherProfile?.nip || "[NIP Guru]";
    const location = schoolProfile?.address?.split(',')[0] || "Tempat";
    const date = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    // Clone to safely manipulate for printing without affecting React DOM
    const clone = printContent.cloneNode(true) as HTMLElement;
    
    // Sync input values to clone attributes
    const originalInputs = printContent.querySelectorAll('input, textarea, select');
    const clonedInputs = clone.querySelectorAll('input, textarea, select');

    originalInputs.forEach((input: any, index) => {
        const clonedInput = clonedInputs[index] as any;
        if (input.type === 'checkbox' || input.type === 'radio') {
             if (input.checked) clonedInput.setAttribute('checked', 'checked');
        } else {
             clonedInput.setAttribute('value', input.value);
        }
        if (input.tagName === 'SELECT') {
             const options = clonedInput.querySelectorAll('option');
             options.forEach((opt: any, i: number) => {
                 if (i === input.selectedIndex) opt.setAttribute('selected', 'selected');
             });
        }
    });

    // Handle Canvas elements (cloneNode doesn't copy canvas content)
    const originalCanvases = printContent.querySelectorAll('canvas');
    const clonedCanvases = clone.querySelectorAll('canvas');
    originalCanvases.forEach((canvas, index) => {
        const clonedCanvas = clonedCanvases[index];
        const ctx = clonedCanvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(canvas, 0, 0);
        }
    });

    const newWindow = window.open("", "", "width=800,height=600");
    
    // Copy styles from current document to ensure Tailwind/layout works
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(node => node.outerHTML)
      .join('');

    newWindow?.document.write(`
      <html>
        <head>
          ${styles}
          <style>
            /* Reset for Print */
            html, body {
                height: auto !important;
                overflow: visible !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
                color: black !important;
            }
            
            body { font-family: 'Times New Roman', serif; padding: 20px !important; }
            table { width: 100% !important; border-collapse: collapse; }
            th, td { border: 1px solid black; padding: 4px; }
            @page { size: A4 ${activeTab === 'schedule' || activeTab === 'calendar' ? 'landscape' : ''}; margin: 20mm; }

            /* Custom Styles for Header/Footer & Colors */
            .print-header { text-align: center; margin-bottom: 20px; font-weight: bold; }
            .print-header h1 { font-size: 18px; margin: 0; text-transform: uppercase; }
            .print-header p { font-size: 12px; margin: 2px 0 0; }
            
            .print-footer { display: flex; justify-content: space-between; margin-top: 30px; page-break-inside: avoid; font-size: 12px; }
            .footer-section { text-align: center; width: 40%; }
            .signature-space { height: 60px; }
            .name { font-weight: bold; text-decoration: underline; }

            /* Force background colors for print */
            .bg-indigo-50 { background-color: #eef2ff !important; }
            .text-indigo-900 { color: #312e81 !important; }
            .bg-red-500 { background-color: #ef4444 !important; color: white !important; }
            .bg-red-400 { background-color: #f87171 !important; color: white !important; }
            .bg-blue-500 { background-color: #3b82f6 !important; color: white !important; }
            .bg-blue-400 { background-color: #60a5fa !important; color: white !important; }
            .bg-yellow-500 { background-color: #eab308 !important; color: black !important; }
            .bg-green-500 { background-color: #22c55e !important; color: white !important; }
            .bg-green-400 { background-color: #4ade80 !important; color: white !important; }
            .bg-purple-500 { background-color: #a855f7 !important; color: white !important; }
            .bg-indigo-500 { background-color: #6366f1 !important; color: white !important; }
            .text-white, .text-black { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            
            /* Hide no-print elements */
            .no-print { display: none !important; }
            
            /* Ensure full width */
            .w-full { width: 100% !important; }
            .overflow-x-auto { overflow: visible !important; }
            
            /* Force visibility */
            * { visibility: visible !important; }
            .hidden { display: block !important; }
            
            /* Adjust grid for A4 */
            @media print {
                html, body {
                    zoom: 85%; /* Try to fit content */
                }
                .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)) !important; }
                .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
                .lg\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
                
                /* Hide duplicate titles inside components */
                .print-only h2 { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <h1>${title}</h1>
            <p>KELAS: ${className}</p>
            <p>TAHUN AJARAN: ${academicYear}</p>
          </div>
          <div style="display: block !important; width: 100% !important;">
            ${clone.innerHTML}
          </div>

          ${activeTab === 'calendar' ? `
            <div class="print-legend" style="page-break-inside: avoid; margin-top: 20px;">
              <h3 style="font-size: 14px; font-weight: bold; margin-bottom: 10px;">Keterangan Kode Kalender:</h3>
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px 15px; font-size: 11px;">
                ${Object.entries(CALENDAR_CODES).map(([code, { label }]: [string, {label: string}]) => `
                  <div style="display: flex; align-items: center;">
                    <span style="font-weight: bold; width: 40px;">${code}</span>
                    <span>: ${label}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <div class="print-footer">
            <div class="footer-section">
                <p>Mengetahui,</p>
                <p>Kepala ${schoolName}</p>
                <div class="signature-space"></div>
                <p class="name">${principalName}</p>
                <p>NIP. ${principalNIP}</p>
            </div>
            <div class="footer-section">
                <p>Remen, ${date}</p>
                <p>Guru Kelas ${className}</p>
                <div class="signature-space"></div>
                <p class="name">${teacherName}</p>
                <p>NIP. ${teacherNIP}</p>
            </div>
          </div>
          <script>
             // Wait for resources to load
             window.onload = function() {
                 setTimeout(function() {
                     window.print();
                     window.close();
                 }, 1000);
             };
          </script>
        </body>
      </html>
    `);

    newWindow?.document.close();
  };

  return (
    <div className="space-y-6 animate-fade-in page-landscape">
      
      {/* Header & Tabs */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 no-print">
        <div>
           <h2 className="text-2xl font-bold text-gray-800 flex items-center">
               Administrasi Kelas Digital
               {isLoading && <Loader2 className="animate-spin ml-2 text-indigo-500" size={18} />}
           </h2>
           <p className="text-gray-500">Buku administrasi dengan sistem digital terintegrasi</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
           <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm mr-2">
              {[
                { id: 'schedule', label: 'Jadwal', icon: Calendar },
                { id: 'piket', label: 'Piket', icon: ClipboardList },
                { id: 'seating', label: 'Denah', icon: Map },
                { id: 'organization', label: 'Struktur', icon: Users },
                { id: 'calendar', label: 'Kalender', icon: CalendarDays },
                { id: 'inventory', label: 'Inventaris', icon: CheckCircle },
                { id: 'guestbook', label: 'Buku Tamu', icon: BookOpen },
              ].map((tab) => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon size={16} />
                  <span>{tab.label}</span>
                </button>
              ))}
           </div>
           
           {/* Action Buttons */}
           <div className="flex space-x-1">
             <button onClick={fetchClassroomData} title="Refresh Data" className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 hover:text-indigo-600">
                <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
             </button>
             <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx, .xls, .csv" />
             <button onClick={handleDownloadTemplate} title="Download Template" className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"><FileSpreadsheet size={18} /></button>
             <button onClick={handleImportClick} title="Import" className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"><Upload size={18} /></button>
             <button onClick={handleExport} title="Export Excel" className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"><Download size={18} /></button>
             <button onClick={handlePrint} title="Cetak" className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"><Printer size={18} /></button>
           </div>
        </div>
      </div>

      {/* --- CONTENT RENDERER --- */}
      <div id="print-area" className="w-full">
        {activeTab === 'schedule' && <ScheduleTab schedule={schedule} timeSlots={timeSlots} onSave={handleSaveScheduleAndTimes} onShowNotification={onShowNotification} />}
        {activeTab === 'piket' && <PiketTab piketGroups={piketGroups} students={students} onSave={handleSavePiket} onShowNotification={onShowNotification} />}
        {activeTab === 'seating' && <SeatingTab seatingLayouts={seatingLayouts} setSeatingLayouts={setSeatingLayouts} students={students} onSave={handleSaveSeating} teacherProfile={teacherProfile} />}
        {activeTab === 'organization' && (
            <OrganizationChartTab 
                students={students} 
                teacherProfile={teacherProfile} 
                users={users} 
                classId={classId}
                initialStructure={organization} 
                onSave={handleSaveOrganization} 
            />
        )}
        {activeTab === 'calendar' && (
            <AcademicCalendarTab 
                initialData={academicCalendar} 
                onSave={handleSaveAcademicCalendar} 
                onAddHoliday={onAddHoliday} 
                onShowNotification={onShowNotification} 
                classId={classId}
                isReadOnly={userRole !== 'admin'} // ONLY ADMIN CAN EDIT CALENDAR
            />
        )}
        {activeTab === 'inventory' && <InventoryTab inventory={inventory} onSave={handleSaveInventory} onDelete={handleDeleteInventory} onShowNotification={onShowNotification} classId={classId} />}
        {activeTab === 'guestbook' && <GuestBookTab guests={guests} onSave={handleSaveGuest} onDelete={handleDeleteGuest} onShowNotification={onShowNotification} classId={classId} />}
      </div>

    </div>
  );
};

export default ClassroomAdmin;
