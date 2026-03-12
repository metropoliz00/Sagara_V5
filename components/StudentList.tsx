import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Student, TeacherProfileData, SchoolProfileData, Graduate } from '../types';
import * as XLSX from 'xlsx';
import { compressImage } from '../utils/imageHelper';
import QRCode from 'react-qr-code';
import { 
  Search, Plus, ArrowLeft, Save, User, Heart, Activity, DollarSign, 
  AlertTriangle, UserCircle, Trash2, X, FileSpreadsheet, Printer, Upload, Download,
  LayoutGrid, List as ListIcon,
  Image as ImageIcon, PieChart as PieChartIcon,
  QrCode as QrCodeIcon, Users, ArrowUpCircle, GraduationCap, ChevronDown
} from 'lucide-react';
import { useModal } from '../context/ModalContext';
import { apiService } from '../services/apiService';
import { MOCK_SUBJECTS } from '../constants';

import BiodataTab from './student/BiodataTab';
import HealthTab from './student/HealthTab';
import TalentsTab from './student/TalentsTab';
import EconomyTab from './student/EconomyTab';
import RecordsTab from './student/RecordsTab';
import StudentDashboard from './student/StudentDashboard';

interface StudentListProps {
  students: Student[];
  teacherProfile?: TeacherProfileData;
  schoolProfile?: SchoolProfileData;
  classId: string;
  allAttendanceRecords: any[];
  onAdd: (student: Omit<Student, 'id'>) => void;
  onBatchAdd?: (students: Omit<Student, 'id'>[]) => void;
  onUpdate: (student: Student) => void;
  onDelete: (id: string) => void;
  onShowNotification: (message: string, type: 'success' | 'error' | 'warning') => void;
  isReadOnly?: boolean;
}

type TabType = 'biodata' | 'health' | 'talents' | 'economy' | 'records' | 'history';
type ViewType = 'grid' | 'list' | 'dashboard' | 'qr-codes' | 'health-data' | 'parent-data' | 'talents-data';

const StudentList: React.FC<StudentListProps> = ({ 
  students, teacherProfile, schoolProfile, classId, allAttendanceRecords,
  onAdd, onBatchAdd, onUpdate, onDelete, onShowNotification, isReadOnly = false
}) => {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('biodata');
  const [viewType, setViewType] = useState<ViewType>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalTab, setAddModalTab] = useState<TabType>('biodata');
  const { showAlert, showConfirm } = useModal();
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyViewMode, setHistoryViewMode] = useState<'list' | 'rekap'>('list');
  const [historyFormData, setHistoryFormData] = useState({
    academicYear: '',
    semester: '1',
    classId: '',
    subjects: {} as Record<string, any>
  });
  const historyFileInputRef = useRef<HTMLInputElement>(null);
  const rekapFileInputRef = useRef<HTMLInputElement>(null);
  const bulkHistoryFileInputRef = useRef<HTMLInputElement>(null);
  const bulkRekapFileInputRef = useRef<HTMLInputElement>(null);

  // Helper completeness functions
  const calculateCompleteness = (s: Student) => {
    const fields: (keyof Student)[] = [
      'nis', 'name', 'gender', 'birthPlace', 'birthDate', 'address', 'photo', 'religion',
      'fatherName', 'fatherJob', 'fatherEducation', 'motherName', 'motherJob', 'motherEducation',
      'parentName', 'parentPhone', 'parentJob',
      'height', 'weight', 'bloodType', 'healthNotes',
      'hobbies', 'ambition', 'economyStatus'
    ];
    let filledCount = 0;
    fields.forEach(field => {
      const val = s[field];
      if (typeof val === 'number' && val > 0) filledCount++;
      else if (typeof val === 'string' && val.trim().length > 0 && !val.startsWith('ERROR')) filledCount++;
    });
    return Math.round((filledCount / fields.length) * 100);
  };

  const getCompletenessColor = (pct: number) => {
    if (pct === 100) return 'text-emerald-600 bg-emerald-100';
    if (pct >= 80) return 'text-[#5AB2FF] bg-[#CAF4FF]';
    if (pct >= 50) return 'text-amber-600 bg-amber-100';
    return 'text-rose-600 bg-rose-100';
  };
  
  const getCompletenessBarColor = (pct: number) => {
    if (pct === 100) return 'bg-emerald-500';
    if (pct >= 80) return 'bg-[#5AB2FF]'; 
    if (pct >= 50) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const isPhotoError = (url?: string) => url && (url.startsWith('ERROR') || url.startsWith('error'));

  const handlePrint = () => {
    let title = "DAFTAR SISWA";
    let headers = "";
    let rows = "";

    if (viewType === 'health-data') {
      title = "DATA KESEHATAN";
      headers = `
        <tr>
          <th>No</th>
          <th>NIS</th>
          <th>Nama</th>
          <th>Berat (kg)</th>
          <th>Tinggi (cm)</th>
          <th>Riwayat Penyakit</th>
        </tr>
      `;
      rows = filteredStudents.map((s, index) => `
        <tr style="background-color: ${index % 2 === 0 ? '#f8f9fa' : '#ffffff'};">
          <td style="text-align: center;">${index + 1}</td>
          <td style="text-align: center;">${s.nis}</td>
          <td>${s.name}</td>
          <td style="text-align: center;">${s.weight || '-'}</td>
          <td style="text-align: center;">${s.height || '-'}</td>
          <td>${s.healthNotes || '-'}</td>
        </tr>
      `).join('');
    } else if (viewType === 'parent-data') {
      title = "DATA ORANG TUA";
      headers = `
        <tr>
          <th>No</th>
          <th>NIS</th>
          <th>Nama</th>
          <th>Nama Ayah</th>
          <th>Pendidikan Ayah</th>
          <th>Pekerjaan Ayah</th>
          <th>Nama Ibu</th>
          <th>Pendidikan Ibu</th>
          <th>Pekerjaan Ibu</th>
          <th>Alamat</th>
        </tr>
      `;
      rows = filteredStudents.map((s, index) => `
        <tr style="background-color: ${index % 2 === 0 ? '#f8f9fa' : '#ffffff'};">
          <td style="text-align: center;">${index + 1}</td>
          <td style="text-align: center;">${s.nis}</td>
          <td>${s.name}</td>
          <td>${s.fatherName || '-'}</td>
          <td>${s.fatherEducation || '-'}</td>
          <td>${s.fatherJob || '-'}</td>
          <td>${s.motherName || '-'}</td>
          <td>${s.motherEducation || '-'}</td>
          <td>${s.motherJob || '-'}</td>
          <td>${s.address}</td>
        </tr>
      `).join('');
    } else if (viewType === 'talents-data') {
      title = "DATA BAKAT MINAT";
      headers = `
        <tr>
          <th>No</th>
          <th>NIS</th>
          <th>NISN</th>
          <th>Nama</th>
          <th>Tempat Lahir</th>
          <th>Tanggal Lahir</th>
          <th>Hobi</th>
          <th>Cita-cita</th>
        </tr>
      `;
      rows = filteredStudents.map((s, index) => `
        <tr style="background-color: ${index % 2 === 0 ? '#f8f9fa' : '#ffffff'};">
          <td style="text-align: center;">${index + 1}</td>
          <td style="text-align: center;">${s.nis}</td>
          <td style="text-align: center;">${s.nisn || '-'}</td>
          <td>${s.name}</td>
          <td>${s.birthPlace || '-'}</td>
          <td style="text-align: center;">${s.birthDate}</td>
          <td>${s.hobbies || '-'}</td>
          <td>${s.ambition || '-'}</td>
        </tr>
      `).join('');
    } else {
      // Default list view
      headers = `
        <tr>
          <th>No</th>
          <th>Nama</th>
          <th>NIS</th>
          <th>NISN</th>
          <th>L/P</th>
          <th>Tempat Lahir</th>
          <th>Tanggal Lahir</th>
          <th>Agama</th>
          <th>Nama Ayah</th>
          <th>Nama Ibu</th>
          <th>Alamat</th>
        </tr>
      `;
      rows = filteredStudents.map((s, index) => `
        <tr style="background-color: ${index % 2 === 0 ? '#f8f9fa' : '#ffffff'};">
          <td style="text-align: center;">${index + 1}</td>
          <td>${s.name}</td>
          <td>${s.nis}</td>
          <td>${s.nisn || '-'}</td>
          <td style="text-align: center;">${s.gender}</td>
          <td>${s.birthPlace || '-'}</td>
          <td>${s.birthDate}</td>
          <td>${s.religion || '-'}</td>
          <td>${s.fatherName || '-'}</td>
          <td>${s.motherName || '-'}</td>
          <td>${s.address}</td>
        </tr>
      `).join('');
    }

    const printContent = `
      <div style="text-align: center; margin-bottom: 20px; line-height: 1;">
        <h2 style="margin: 0; text-transform: uppercase;">${title}</h2>
        <h3 style="margin: 5px 0 0 0;">KELAS: ${classId}</h3>
        <h4 style="margin: 5px 0 0 0;">TAHUN AJARAN: ${schoolProfile?.year || new Date().getFullYear()}</h4>
      </div>
      <table>
        <thead style="background-color: #e9ecef;">
          ${headers}
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <div style="margin-top: 30px; display: flex; justify-content: space-between; font-size: 12px; line-height: 1;">
        <div style="text-align: center;">
          <p>Mengetahui,</p>
          <p>Kepala ${schoolProfile?.name || 'Sekolah'}</p>
          <br/><br/><br/>
          <p style="text-decoration: underline; font-weight: bold;">${schoolProfile?.headmaster || '.........................'}</p>
          <p>NIP. ${schoolProfile?.headmasterNip || '.........................'}</p>
        </div>
        <div style="text-align: center;">
          <p>Remen, ${new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
          <p>Guru Kelas ${classId}</p>
          <br/><br/><br/>
          <p style="text-decoration: underline; font-weight: bold;">${teacherProfile?.name || '.........................'}</p>
          <p>NIP. ${teacherProfile?.nip || '.........................'}</p>
        </div>
      </div>
    `;

    const newWindow = window.open("", "", "width=1200,height=800");
    newWindow?.document.write(`
      <html>
        <head>
          <title>${title} Kelas ${classId}</title>
          <style>
            body { font-family: 'Times New Roman', serif; line-height: 1; padding: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; }
            th, td { border: 1px solid black; padding: 4px; text-align: left; }
            th { text-align: center; background-color: #f2f2f2 !important; -webkit-print-color-adjust: exact; }
            @page { size: A4 landscape; margin: 10mm; }
            @media print {
              th { background-color: #f2f2f2 !important; }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);
    newWindow?.document.close();
    setTimeout(() => {
      newWindow?.focus();
      newWindow?.print();
      newWindow?.close();
    }, 500);
  };

  const handleDeleteClick = (id: string) => {
      showConfirm("Apakah Anda yakin ingin menghapus data siswa ini? Tindakan ini tidak dapat dibatalkan.", async () => {
          onDelete(id);
          setSelectedStudent(null);
      });
  };

  const handleNaikKelas = async (student: Student) => {
    const currentClass = student.classId || classId;
    const match = currentClass.match(/^(.*?)(\d+)(.*)$/);
    if (match) {
      const prefix = match[1];
      const num = parseInt(match[2], 10);
      const suffix = match[3];
      if (num < 6) {
        const newClassId = `${prefix}${num + 1}${suffix}`;
        showConfirm(`Apakah Anda yakin ingin menaikkan kelas siswa ini ke kelas ${newClassId}?`, async () => {
          try {
            // Save grade history
            const currentGrades = await apiService.getGradesForStudent(student.id);
            if (currentGrades && Object.keys(currentGrades.subjects).length > 0) {
              const historyEntry = {
                id: `${schoolProfile?.year || new Date().getFullYear()}-Semester ${schoolProfile?.semester || '1'}-${currentClass}`,
                academicYear: schoolProfile?.year || new Date().getFullYear().toString(),
                semester: schoolProfile?.semester || '1',
                classId: currentClass,
                timestamp: Date.now(),
                subjects: currentGrades.subjects
              };
              await apiService.saveGradeHistory(student.id, historyEntry);
              await apiService.deleteGradesForStudent(student.id);
            }
            
            onUpdate({ ...student, classId: newClassId });
            onShowNotification(`Siswa berhasil dinaikkan ke kelas ${newClassId}`, 'success');
            setSelectedStudent(null);
          } catch (error) {
            console.error("Error during naik kelas:", error);
            onShowNotification("Terjadi kesalahan saat menaikkan kelas siswa.", 'error');
          }
        });
      } else {
        onShowNotification("Siswa sudah berada di kelas tertinggi (Kelas 6).", 'warning');
      }
    } else {
      onShowNotification("Format kelas tidak dikenali untuk naik kelas otomatis.", 'warning');
    }
  };

  const handleLulus = (student: Student) => {
    showConfirm("Apakah Anda yakin ingin meluluskan siswa ini? Data akan dipindah ke Data Lulusan.", async () => {
      try {
        const currentClass = student.classId || classId;
        // Save grade history
        const currentGrades = await apiService.getGradesForStudent(student.id);
        if (currentGrades && Object.keys(currentGrades.subjects).length > 0) {
          const historyEntry = {
            id: `${schoolProfile?.year || new Date().getFullYear()}-Semester ${schoolProfile?.semester || '1'}-${currentClass}`,
            academicYear: schoolProfile?.year || new Date().getFullYear().toString(),
            semester: schoolProfile?.semester || '1',
            classId: currentClass,
            timestamp: Date.now(),
            subjects: currentGrades.subjects
          };
          await apiService.saveGradeHistory(student.id, historyEntry);
          await apiService.deleteGradesForStudent(student.id);
        }

        const graduate: Graduate = {
          id: crypto.randomUUID(),
          nisn: student.nisn || student.nis,
          name: student.name,
          ijazahNumber: '',
          status: 'Lulus',
          graduationYear: new Date().getFullYear().toString(),
          continuedTo: '',
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        await apiService.saveGraduate(graduate);
        onDelete(student.id);
        onShowNotification("Siswa berhasil diluluskan dan dipindah ke Data Lulusan.", 'success');
        setSelectedStudent(null);
      } catch (error) {
        console.error("Error graduating student:", error);
        onShowNotification("Gagal meluluskan siswa.", 'error');
      }
    });
  };

  const handleDownloadTemplate = () => {
    const headers = ["Class ID", "NIS", "NISN", "Nama Lengkap", "Gender (L/P)", "Tempat Lahir", "Tanggal Lahir (YYYY-MM-DD)", "Agama", "Alamat", "Nama Ayah", "Pekerjaan Ayah", "Pendidikan Ayah", "Nama Ibu", "Pekerjaan Ibu", "Pendidikan Ibu", "Nama Wali", "No HP Wali", "Pekerjaan Wali", "Status Ekonomi", "Tinggi (cm)", "Berat (kg)", "Gol Darah", "Riwayat Penyakit", "Hobi", "Cita-cita", "Prestasi", "Pelanggaran"];
    const example = ["1A", "2024001", "0012345678", "Ahmad Santoso", "L", "Surabaya", "2015-05-20", "Islam", "Jl. Merpati No. 10", "Budi Santoso", "Wiraswasta", "SMA", "Siti Aminah", "Ibu Rumah Tangga", "SMP", "Budi Santoso", "081234567890", "Wiraswasta", "Mampu", "145", "38", "O", "Tidak ada", "Sepak Bola", "Polisi", "Juara 1 Lari", "-"];
    const worksheet = XLSX.utils.aoa_to_sheet([headers, example]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template Input Siswa");
    XLSX.writeFile(workbook, "template_input_siswa.xlsx");
  };

  const handleExport = () => {
    const headers = ["Class ID", "NIS", "NISN", "Nama Lengkap", "Gender (L/P)", "Tempat Lahir", "Tanggal Lahir (YYYY-MM-DD)", "Agama", "Alamat", "Nama Ayah", "Pekerjaan Ayah", "Pendidikan Ayah", "Nama Ibu", "Pekerjaan Ibu", "Pendidikan Ibu", "Nama Wali", "No HP Wali", "Pekerjaan Wali", "Status Ekonomi", "Tinggi (cm)", "Berat (kg)", "Gol Darah", "Riwayat Penyakit", "Hobi", "Cita-cita", "Prestasi", "Pelanggaran", "Kelengkapan Data (%)"];
    const rows = students.map(s => [s.classId, s.nis, s.nisn || '-', s.name, s.gender, s.birthPlace || '-', s.birthDate, s.religion || '-', s.address, s.fatherName, s.fatherJob || '-', s.fatherEducation || '-', s.motherName, s.motherJob || '-', s.motherEducation || '-', s.parentName, s.parentPhone, s.parentJob || '-', s.economyStatus || 'Mampu', s.height || 0, s.weight || 0, s.bloodType || '-', s.healthNotes || '-', s.hobbies || '-', s.ambition || '-', s.achievements?.join(', ') || '-', s.violations?.join(', ') || '-', calculateCompleteness(s) + '%']);
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Siswa Lengkap");
    XLSX.writeFile(workbook, "data_siswa_lengkap.xlsx");
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      const rows = data.slice(1) as any[];
      let importedCount = 0;
      const newStudentsBatch: Omit<Student, 'id'>[] = [];
      rows.forEach((row) => {
        if (row.length === 0) return;
        const classIdInput = row[0] ? String(row[0]) : classId;
        const nis = row[1] ? String(row[1]) : '';
        const name = row[3] ? String(row[3]) : '';
        if (nis && name) {
          const newStudent: Omit<Student, 'id'> = {
            classId: classIdInput, nis: nis, nisn: row[2] ? String(row[2]) : '', name: name, gender: (row[4] && String(row[4]).toUpperCase().includes('P')) ? 'P' : 'L', birthPlace: row[5] ? String(row[5]) : '', birthDate: row[6] ? String(row[6]) : '', religion: row[7] ? String(row[7]) : 'Islam', address: row[8] ? String(row[8]) : '',
            fatherName: row[9] ? String(row[9]) : '', fatherJob: row[10] ? String(row[10]) : '', fatherEducation: row[11] ? String(row[11]) : '', motherName: row[12] ? String(row[12]) : '', motherJob: row[13] ? String(row[13]) : '', motherEducation: row[14] ? String(row[14]) : '',
            parentName: row[15] ? String(row[15]) : (row[9] ? String(row[9]) : (row[12] ? String(row[12]) : '')), parentPhone: row[16] ? String(row[16]) : '', parentJob: row[17] ? String(row[17]) : '',
            economyStatus: (row[18] as any) || 'Mampu', height: Number(row[19]) || 0, weight: Number(row[20]) || 0, bloodType: row[21] ? String(row[21]) : '', healthNotes: row[22] ? String(row[22]) : '', hobbies: row[23] ? String(row[23]) : '', ambition: row[24] ? String(row[24]) : '',
            achievements: row[25] ? String(row[25]).split(',').map(s=>s.trim()) : [], violations: row[26] ? String(row[26]).split(',').map(s=>s.trim()) : [], behaviorScore: 100, attendance: { present: 0, sick: 0, permit: 0, alpha: 0 }
          };
          if (onBatchAdd) newStudentsBatch.push(newStudent); else onAdd(newStudent);
          importedCount++;
        }
      });
      if (onBatchAdd && newStudentsBatch.length > 0) { onBatchAdd(newStudentsBatch); onShowNotification(`Memproses impor ${importedCount} data siswa...`, 'warning'); } else if (!onBatchAdd) { onShowNotification(`Berhasil mengirim ${importedCount} request data siswa.`, 'success'); }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, isNew: boolean) => {
    if (isReadOnly) return;
    const file = e.target.files?.[0];
    if (file) {
      try {
        const resizedBase64 = await compressImage(file, 300, 0.6);
        if (isNew) { setNewStudent(prev => ({ ...prev, photo: resizedBase64 })); } else if (selectedStudent) { handleChange('photo', resizedBase64); }
      } catch (error) { onShowNotification("Gagal memproses gambar.", 'error'); }
    }
  };

  const [detailTempAchievements, setDetailTempAchievements] = useState('');
  const [detailTempViolations, setDetailTempViolations] = useState('');
  const [gradeHistory, setGradeHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const rekapData = useMemo(() => {
    if (!gradeHistory || gradeHistory.length === 0) return null;

    // 1. Get all unique periods and sort them
    const periodsMap = new Map();
    gradeHistory.forEach(h => {
      const id = `${h.academicYear}-${h.semester}`;
      if (!periodsMap.has(id)) {
        periodsMap.set(id, {
          id,
          label: `${h.academicYear} Smt ${h.semester}`,
          year: h.academicYear,
          semester: h.semester,
          classId: h.classId
        });
      }
    });

    const periods = Array.from(periodsMap.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year.localeCompare(b.year);
      return a.semester.localeCompare(b.semester);
    });

    // 2. Get all unique subjects
    const subjectsSet = new Set<string>();
    gradeHistory.forEach(h => {
      Object.keys(h.subjects).forEach(s => subjectsSet.add(s));
    });

    return {
      periods,
      subjects: Array.from(subjectsSet).sort(),
      history: gradeHistory
    };
  }, [gradeHistory]);

  useEffect(() => {
    if (selectedStudent) {
      setDetailTempAchievements(selectedStudent.achievements?.join(', ') || '');
      setDetailTempViolations(selectedStudent.violations?.join(', ') || '');
      
      const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
          const history = await apiService.getGradeHistory(selectedStudent.id);
          setGradeHistory(history);
        } catch (error) {
          console.error("Error fetching grade history:", error);
        } finally {
          setLoadingHistory(false);
        }
      };
      fetchHistory();
    }
  }, [selectedStudent]);

  const handleSaveDetail = () => {
    if (isReadOnly) return;
    if (selectedStudent) {
      const achievementsArray = detailTempAchievements ? detailTempAchievements.split(',').map(s => s.trim()) : [];
      const violationsArray = detailTempViolations ? detailTempViolations.split(',').map(s => s.trim()) : [];
      onUpdate({ ...selectedStudent, achievements: achievementsArray, violations: violationsArray });
      onShowNotification("Data siswa berhasil disimpan!", 'success');
      setSelectedStudent(null);
    }
  };

  const handleChange = (field: keyof Student, value: any) => {
    if (isReadOnly) return;
    if(selectedStudent) {
      let updated = { ...selectedStudent, [field]: value };
      if (field === 'fatherName' || field === 'motherName') { const f = field === 'fatherName' ? value : updated.fatherName; const m = field === 'motherName' ? value : updated.motherName; updated.parentName = f ? f : m; }
      setSelectedStudent(updated);
    }
  };

  const [tempAchievements, setTempAchievements] = useState('');
  const [tempViolations, setTempViolations] = useState('');
  const [newStudent, setNewStudent] = useState<Partial<Student>>({
     name: '', nis: '', nisn: '', classId: classId, gender: 'L', religion: 'Islam', birthPlace: '', birthDate: '', address: '', photo: '',
     fatherName: '', fatherJob: '', fatherEducation: '', motherName: '', motherJob: '', motherEducation: '', parentName: '', parentPhone: '', parentJob: '',
     height: 0, weight: 0, bloodType: '', healthNotes: '', hobbies: '', ambition: '', economyStatus: 'Mampu', behaviorScore: 100, attendance: {present:0, sick:0, permit:0, alpha:0}, achievements: [], violations: []
  });

  const handleSubmitNew = (e: React.FormEvent) => {
    if (isReadOnly) return;
    e.preventDefault();
    if(newStudent.name && newStudent.nis) {
       const achievementsArray = tempAchievements ? tempAchievements.split(',').map(s => s.trim()) : [];
       const violationsArray = tempViolations ? tempViolations.split(',').map(s => s.trim()) : [];
       onAdd({ ...newStudent, achievements: achievementsArray, violations: violationsArray } as Omit<Student, 'id'>);
       setIsAddModalOpen(false);
       setNewStudent({ 
         name: '', nis: '', nisn: '', classId: classId, gender: 'L', religion: 'Islam', birthPlace: '', birthDate: '', address: '', photo: '',
         fatherName: '', fatherJob: '', fatherEducation: '', motherName: '', motherJob: '', motherEducation: '', parentName: '', parentPhone: '', parentJob: '',
         height: 0, weight: 0, bloodType: '', healthNotes: '', hobbies: '', ambition: '', economyStatus: 'Mampu', behaviorScore: 100, attendance: {present:0,sick:0,permit:0,alpha:0},
         achievements: [], violations: []
       });
       setTempAchievements(''); setTempViolations(''); setAddModalTab('biodata');
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter(student =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.nis.includes(searchTerm) ||
      (student.nisn && student.nisn.includes(searchTerm)) ||
      student.classId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [students, searchTerm]);

  // --- QR Code Downloader Logic ---
  const handleDownloadQR = (student: Student) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      // Set to 300 DPI for high quality print
      const dpi = 300;
      // Target: 65mm x 102mm
      const width = Math.round((65 / 25.4) * dpi);  // ~768 px
      const height = Math.round((102 / 25.4) * dpi); // ~1205 px

      canvas.width = width;
      canvas.height = height;

      if (ctx) {
          // 1. Background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);

          // 2. Decorative Border/Frame
          ctx.strokeStyle = '#5AB2FF'; // Ocean Blue
          ctx.lineWidth = 30;
          ctx.strokeRect(0, 0, width, height);
          
          // Inner thin border
          ctx.strokeStyle = '#A0DEFF';
          ctx.lineWidth = 5;
          ctx.strokeRect(30, 30, width - 60, height - 60);

          const centerX = width / 2;

          // 3. Header Text (School Name)
          ctx.fillStyle = '#1e3a8a'; // Dark Blue
          ctx.font = 'bold 45px Arial, sans-serif';
          ctx.textAlign = 'center';
          const schoolName = (schoolProfile?.name || 'SEKOLAH').toUpperCase();
          ctx.fillText(schoolName, centerX, 120);

          // 4. Sub Header
          ctx.fillStyle = '#64748b'; // Slate 500
          ctx.font = '35px Arial, sans-serif';
          ctx.fillText('KARTU IDENTITAS DIGITAL', centerX, 180);

          // 5. Draw QR Code Image from SVG
          const svgElement = document.getElementById(`qr-code-${student.id}`);
          if (svgElement) {
              const svgData = new XMLSerializer().serializeToString(svgElement);
              const img = new Image();
              // Encode SVG to base64
              img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
              
              img.onload = () => {
                  // Center the QR code
                  const qrSize = 500; // Large QR for clarity
                  const qrY = 250;
                  ctx.drawImage(img, centerX - (qrSize / 2), qrY, qrSize, qrSize);

                  // 6. Student Name
                  ctx.fillStyle = '#000000';
                  ctx.font = 'bold 50px Arial, sans-serif';
                  
                  const maxWidth = width - 120;
                  const words = student.name.split(' ');
                  let line = '';
                  const lines = [];
                  
                  for (let n = 0; n < words.length; n++) {
                      const testLine = line + words[n] + ' ';
                      const metrics = ctx.measureText(testLine);
                      const testWidth = metrics.width;
                      if (testWidth > maxWidth && n > 0) {
                          lines.push(line.trim());
                          line = words[n] + ' ';
                      } else {
                          line = testLine;
                      }
                  }
                  lines.push(line.trim());

                  // Draw lines
                  const lineHeight = 60;
                  // Base Y position for the name section
                  const nameBaseY = height - 280;
                  // Adjust startY based on number of lines to keep it centered around nameBaseY
                  const startY = nameBaseY - ((lines.length - 1) * lineHeight / 2);

                  lines.forEach((l, i) => {
                      ctx.fillText(l, centerX, startY + (i * lineHeight));
                  });

                  // 7. NIS & NISN Box
                  const boxY = height - 220;
                  const boxHeight = 150;
                  const boxWidth = width - 100;
                  
                  ctx.fillStyle = '#f0f9ff'; // Very light blue bg
                  ctx.fillRect((width - boxWidth)/2, boxY, boxWidth, boxHeight);
                  
                  ctx.fillStyle = '#0369a1'; // Sky 700
                  ctx.font = 'bold 40px monospace';
                  ctx.fillText(`NIS : ${student.nis}`, centerX, boxY + 60);
                  
                  if (student.nisn) {
                      ctx.fillText(`NISN: ${student.nisn}`, centerX, boxY + 110);
                  } else {
                      ctx.fillText(`KELAS: ${student.classId}`, centerX, boxY + 110);
                  }

                  // 8. Trigger Download
                  const link = document.createElement('a');
                  const safeName = student.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                  link.download = `${safeName}_QR.jpg`;
                  link.href = canvas.toDataURL('image/jpeg', 0.9);
                  link.click();
              };
          }
      }
  };


  // -- RENDER --
  if (viewType === 'dashboard') {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 no-print no-print-report">
                <div><h2 className="text-2xl font-bold text-gray-800">Manajemen Siswa</h2><p className="text-gray-500">Statistik dan database lengkap profil siswa.</p></div>
                <div className="flex flex-wrap gap-2 justify-end">
                    <div className="bg-white p-1 rounded-lg border border-gray-200 flex shadow-sm mr-2">
                        <button onClick={() => setViewType('dashboard')} className="p-2 rounded-md transition-all bg-[#5AB2FF] text-white shadow-sm" title="Dashboard"><PieChartIcon size={18} /></button>
                        <button onClick={() => setViewType('list')} className="p-2 rounded-md transition-all text-gray-400 hover:text-gray-600" title="Tampilan Tabel"><ListIcon size={18} /></button>
                        <button onClick={() => setViewType('grid')} className="p-2 rounded-md transition-all text-gray-400 hover:text-gray-600" title="Tampilan Grid"><LayoutGrid size={18} /></button>
                        <button onClick={() => setViewType('qr-codes')} className="p-2 rounded-md transition-all text-gray-400 hover:text-gray-600" title="QR Code Siswa"><QrCodeIcon size={18} /></button>
                        <button onClick={() => setViewType('health-data')} className="p-2 rounded-md transition-all text-gray-400 hover:text-gray-600" title="Data Kesehatan"><Heart size={18} /></button>
                        <button onClick={() => setViewType('parent-data')} className="p-2 rounded-md transition-all text-gray-400 hover:text-gray-600" title="Data Orang Tua"><Users size={18} /></button>
                        <button onClick={() => setViewType('talents-data')} className="p-2 rounded-md transition-all text-gray-400 hover:text-gray-600" title="Data Bakat Minat"><Activity size={18} /></button>
                    </div>
                </div>
            </div>
            <StudentDashboard students={students} allAttendanceRecords={allAttendanceRecords} schoolProfile={schoolProfile} teacherProfile={teacherProfile} />
        </div>
    );
  }

  const handleAddManualHistory = () => {
    setHistoryFormData({
      academicYear: schoolProfile?.year || new Date().getFullYear().toString(),
      semester: schoolProfile?.semester || '1',
      classId: selectedStudent?.classId || '',
      subjects: MOCK_SUBJECTS.reduce((acc, sub) => {
        acc[sub.name] = { sum1: '', sum2: '', sum3: '', sum4: '', sas: '' };
        return acc;
      }, {} as Record<string, any>)
    });
    setIsHistoryModalOpen(true);
  };

  const handleSaveManualHistory = async () => {
    if (!selectedStudent) return;
    if (!historyFormData.academicYear || !historyFormData.classId) {
      onShowNotification("Tahun Ajaran dan Kelas wajib diisi.", "warning");
      return;
    }

    try {
      const historyEntry = {
        id: `${historyFormData.academicYear}-S${historyFormData.semester}-${historyFormData.classId}-${Date.now()}`,
        academicYear: historyFormData.academicYear,
        semester: historyFormData.semester,
        classId: historyFormData.classId,
        timestamp: Date.now(),
        subjects: historyFormData.subjects
      };
      await apiService.saveGradeHistory(selectedStudent.id, historyEntry);
      setGradeHistory(prev => [historyEntry, ...prev]);
      setIsHistoryModalOpen(false);
      onShowNotification("History nilai berhasil disimpan!", "success");
    } catch (error) {
      console.error("Error saving manual history:", error);
      onShowNotification("Gagal menyimpan history nilai.", "error");
    }
  };

  const handleImportHistoryExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedStudent) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const data = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (data.length === 0) {
          onShowNotification("File Excel kosong.", "warning");
          return;
        }

        const subjects: Record<string, any> = {};
        data.forEach(row => {
          const subjectName = row['Mata Pelajaran'] || row['Subject'];
          if (subjectName) {
            subjects[subjectName] = {
              sum1: row['S1'] || row['Sumatif 1'] || '',
              sum2: row['S2'] || row['Sumatif 2'] || '',
              sum3: row['S3'] || row['Sumatif 3'] || '',
              sum4: row['S4'] || row['Sumatif 4'] || '',
              sas: row['SAS'] || ''
            };
          }
        });

        setHistoryFormData(prev => ({
          ...prev,
          subjects: { ...prev.subjects, ...subjects }
        }));
        
        onShowNotification("Data Excel berhasil dibaca. Silakan periksa dan simpan.", "success");
        setIsHistoryModalOpen(true);
      } catch (error) {
        console.error("Error importing history excel:", error);
        onShowNotification("Gagal membaca file Excel.", "error");
      }
    };
    reader.readAsBinaryString(file);
    if (historyFileInputRef.current) historyFileInputRef.current.value = '';
  };

  const handleBulkImportHistoryExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const data = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (data.length === 0) {
          onShowNotification("File Excel kosong.", "warning");
          return;
        }

        onShowNotification(`Memproses ${data.length} baris history nilai...`, "warning");

        // Group by student (NIS or Name) and (Year, Semester, Class)
        const groupedHistory: Record<string, any> = {};

        data.forEach(row => {
          const nis = row['NIS'] ? String(row['NIS']) : '';
          const name = row['Nama'] || row['Nama Lengkap'] || '';
          const academicYear = row['Tahun Ajaran'] || row['Year'] || '';
          const semester = String(row['Semester'] || '1');
          const classIdVal = row['Kelas'] || row['Class'] || '';
          const subjectName = row['Mata Pelajaran'] || row['Subject'];

          if ((nis || name) && academicYear && classIdVal && subjectName) {
            // Find student ID
            const student = students.find(s => (nis && s.nis === nis) || (name && s.name.toLowerCase() === name.toLowerCase()));
            if (student) {
              const key = `${student.id}_${academicYear}_${semester}_${classIdVal}`;
              if (!groupedHistory[key]) {
                groupedHistory[key] = {
                  studentId: student.id,
                  id: `${academicYear}-S${semester}-${classIdVal}-${Date.now()}`,
                  academicYear,
                  semester,
                  classId: classIdVal,
                  timestamp: Date.now(),
                  subjects: {}
                };
              }
              groupedHistory[key].subjects[subjectName] = {
                sum1: row['S1'] || row['Sumatif 1'] || '',
                sum2: row['S2'] || row['Sumatif 2'] || '',
                sum3: row['S3'] || row['Sumatif 3'] || '',
                sum4: row['S4'] || row['Sumatif 4'] || '',
                sas: row['SAS'] || ''
              };
            }
          }
        });

        const entries = Object.values(groupedHistory);
        if (entries.length === 0) {
          onShowNotification("Tidak ada data history valid yang ditemukan atau siswa tidak cocok.", "warning");
          return;
        }

        // Save each entry
        let successCount = 0;
        for (const entry of entries) {
          try {
            await apiService.saveGradeHistory(entry.studentId, entry);
            successCount++;
          } catch (err) {
            console.error("Error saving bulk entry:", err);
          }
        }

        onShowNotification(`Berhasil mengimpor ${successCount} history nilai siswa.`, "success");
        if (selectedStudent) {
          // Refresh history if current student was updated
          const history = await apiService.getGradeHistory(selectedStudent.id);
          setGradeHistory(history);
        }
      } catch (error) {
        console.error("Error bulk importing history excel:", error);
        onShowNotification("Gagal memproses impor bulk history.", "error");
      }
    };
    reader.readAsBinaryString(file);
    if (bulkHistoryFileInputRef.current) bulkHistoryFileInputRef.current.value = '';
  };

  const handleImportRekapExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedStudent) return;

    onShowNotification("Memproses file rekap...", "warning");
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const data = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (data.length === 0) {
          onShowNotification("File Excel kosong.", "warning");
          return;
        }

        const historyEntries: Record<string, any> = {};

        data.forEach(row => {
          const subjectName = row['Mata Pelajaran'] || row['Subject'];
          if (!subjectName) return;

          Object.keys(row).forEach(key => {
            if (key === 'Mata Pelajaran' || key === 'Subject') return;

            // Try to parse "2023/2024 Smt 1" or similar
            const match = key.match(/(\d{4}\/\d{4})\s+Smt\s+(\d)/i);
            if (match) {
              const academicYear = match[1];
              const semester = match[2];
              const periodKey = `${academicYear}-${semester}`;

              if (!historyEntries[periodKey]) {
                historyEntries[periodKey] = {
                  id: `${academicYear}-S${semester}-${selectedStudent.classId}-${Date.now()}`,
                  academicYear,
                  semester,
                  classId: selectedStudent.classId,
                  timestamp: Date.now(),
                  subjects: {}
                };
              }

              historyEntries[periodKey].subjects[subjectName] = {
                sum1: '', sum2: '', sum3: '', sum4: '',
                sas: row[key] || ''
              };
            }
          });
        });

        const entries = Object.values(historyEntries);
        if (entries.length === 0) {
          onShowNotification("Tidak ada data rekap valid ditemukan. Pastikan header kolom menggunakan format 'Tahun Smt' (Contoh: 2023/2024 Smt 1)", "warning");
          return;
        }

        let successCount = 0;
        for (const entry of entries) {
          try {
            await apiService.saveGradeHistory(selectedStudent.id, entry);
            successCount++;
          } catch (err) {
            console.error("Error saving rekap entry:", err);
          }
        }

        onShowNotification(`Berhasil mengimpor ${successCount} semester rekap nilai.`, "success");
        const history = await apiService.getGradeHistory(selectedStudent.id);
        setGradeHistory(history);
      } catch (error) {
        console.error("Error importing rekap excel:", error);
        onShowNotification("Gagal memproses file rekap.", "error");
      }
    };
    reader.readAsBinaryString(file);
    if (rekapFileInputRef.current) rekapFileInputRef.current.value = '';
  };

  const handleDownloadRekapTemplate = () => {
    if (!selectedStudent) return;

    const periods = [
      '2021/2022 Smt 1', '2021/2022 Smt 2',
      '2022/2023 Smt 1', '2022/2023 Smt 2',
      '2023/2024 Smt 1', '2023/2024 Smt 2'
    ];

    const templateData = MOCK_SUBJECTS.map(sub => {
      const row: any = { 'Mata Pelajaran': sub.name };
      periods.forEach(p => { row[p] = ''; });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Rekap");
    XLSX.writeFile(wb, `Template_Rekap_Nilai_${selectedStudent.name.replace(/\s+/g, '_')}.xlsx`);
  };

  const handleDownloadBulkHistoryTemplate = () => {
    const templateData = students.flatMap(s => 
      MOCK_SUBJECTS.map(sub => ({
        'NIS': s.nis,
        'Nama': s.name,
        'Tahun Ajaran': schoolProfile?.year || '2023/2024',
        'Semester': schoolProfile?.semester || '1',
        'Kelas': s.classId,
        'Mata Pelajaran': sub.name,
        'S1': '',
        'S2': '',
        'S3': '',
        'S4': '',
        'SAS': ''
      }))
    );

    if (templateData.length === 0) {
      // If no students, just show headers with one example
      MOCK_SUBJECTS.forEach(sub => {
        templateData.push({
          'NIS': '2024001',
          'Nama': 'Ahmad Santoso',
          'Tahun Ajaran': '2023/2024',
          'Semester': '1',
          'Kelas': '1A',
          'Mata Pelajaran': sub.name,
          'S1': '', 'S2': '', 'S3': '', 'S4': '', 'SAS': ''
        });
      });
    }
    
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Bulk History");
    XLSX.writeFile(wb, "template_bulk_history_nilai.xlsx");
  };

  const handleDownloadBulkRekapTemplate = () => {
    const periods = [
      '2021/2022 Smt 1', '2021/2022 Smt 2',
      '2022/2023 Smt 1', '2022/2023 Smt 2',
      '2023/2024 Smt 1', '2023/2024 Smt 2'
    ];

    const templateData = students.flatMap(s => 
      MOCK_SUBJECTS.map(sub => {
        const row: any = { 
          'NIS': s.nis,
          'Nama': s.name,
          'Mata Pelajaran': sub.name 
        };
        periods.forEach(p => { row[p] = ''; });
        return row;
      })
    );

    if (templateData.length === 0) {
      MOCK_SUBJECTS.forEach(sub => {
        const row: any = { 
          'NIS': '2024001',
          'Nama': 'Ahmad Santoso',
          'Mata Pelajaran': sub.name 
        };
        periods.forEach(p => { row[p] = ''; });
        templateData.push(row);
      });
    }

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Rekap Masal");
    XLSX.writeFile(wb, `Template_Rekap_Nilai_Masal.xlsx`);
  };

  const handleBulkImportRekapExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
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

        if (data.length === 0) {
          onShowNotification("File kosong atau tidak valid.", "warning");
          return;
        }

        // Group data by student (NIS or Name)
        const studentGroups: { [key: string]: any[] } = {};
        data.forEach(row => {
          const key = row['NIS'] || row['Nama'];
          if (key) {
            if (!studentGroups[key]) studentGroups[key] = [];
            studentGroups[key].push(row);
          }
        });

        let totalSuccess = 0;
        let studentCount = 0;

        for (const [key, rows] of Object.entries(studentGroups)) {
          // Find student
          const student = students.find(s => s.nis?.toString() === key?.toString() || s.name === key);
          if (!student) continue;

          studentCount++;
          const historyEntries: { [key: string]: any } = {};

          rows.forEach(row => {
            const subjectName = row['Mata Pelajaran'];
            if (!subjectName) return;

            Object.keys(row).forEach(colKey => {
              const match = colKey.match(/(\d{4}\/\d{4})\s+Smt\s+(\d+)/i);
              if (match) {
                const academicYear = match[1];
                const semester = match[2];
                const periodKey = `${academicYear}-${semester}`;

                if (!historyEntries[periodKey]) {
                  historyEntries[periodKey] = {
                    id: `${academicYear}-S${semester}-${student.classId}-${Date.now()}`,
                    academicYear,
                    semester,
                    classId: student.classId,
                    timestamp: Date.now(),
                    subjects: {}
                  };
                }

                historyEntries[periodKey].subjects[subjectName] = {
                  sum1: '', sum2: '', sum3: '', sum4: '',
                  sas: row[colKey] || ''
                };
              }
            });
          });

          const entries = Object.values(historyEntries);
          for (const entry of entries) {
            try {
              await apiService.saveGradeHistory(student.id, entry);
              totalSuccess++;
            } catch (err) {
              console.error(`Error saving rekap for student ${student.name}:`, err);
            }
          }
        }

        onShowNotification(`Berhasil mengimpor rekap untuk ${studentCount} siswa (${totalSuccess} entri semester).`, "success");
      } catch (error) {
        console.error("Error bulk importing rekap:", error);
        onShowNotification("Gagal memproses file rekap masal.", "error");
      }
    };
    reader.readAsBinaryString(file);
    if (bulkRekapFileInputRef.current) bulkRekapFileInputRef.current.value = '';
  };

  const handleDownloadHistoryTemplate = () => {
    const templateData = MOCK_SUBJECTS.map(sub => ({
      'Mata Pelajaran': sub.name,
      'S1': '',
      'S2': '',
      'S3': '',
      'S4': '',
      'SAS': ''
    }));
    
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template History Nilai");
    XLSX.writeFile(wb, `Template_History_Nilai.xlsx`);
  };

  if (selectedStudent) {
    const completeness = calculateCompleteness(selectedStudent);
    return (
      <div className="space-y-6 animate-fade-in print-container">
        
        <div className="flex items-center justify-between no-print">
          <button onClick={() => setSelectedStudent(null)} className="flex items-center text-gray-500 hover:text-[#5AB2FF] transition-colors">
            <ArrowLeft size={20} className="mr-2" /> <span className="font-medium">Kembali ke Daftar</span>
          </button>
          <div className="flex space-x-2">
            <button onClick={handlePrint} className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg hover:bg-[#FFF9D0] font-medium flex items-center shadow-sm">
               <Printer size={18} className="mr-2"/> Cetak Biodata
            </button>
            {!isReadOnly && (
              <>
                {selectedStudent.classId?.startsWith('6') ? (
                  <button 
                    onClick={() => handleLulus(selectedStudent)} 
                    className="flex items-center bg-emerald-50 text-emerald-600 px-4 py-2 rounded-lg hover:bg-emerald-100 font-medium"
                    title="Luluskan Siswa"
                  >
                    <GraduationCap size={18} className="mr-2" /> Lulus
                  </button>
                ) : (
                  <button 
                    onClick={() => handleNaikKelas(selectedStudent)} 
                    className="flex items-center bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-100 font-medium"
                    title="Naik Kelas"
                  >
                    <ArrowUpCircle size={18} className="mr-2" /> Naik Kelas
                  </button>
                )}
                <button 
                    onClick={() => handleDeleteClick(selectedStudent.id)} 
                    className="bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 font-medium"
                >
                  <Trash2 size={18} />
                </button>
                <button onClick={handleSaveDetail} className="flex items-center bg-[#5AB2FF] text-white px-4 py-2 rounded-lg hover:bg-[#A0DEFF] font-medium shadow-sm">
                  <Save size={16} className="mr-2" /> Simpan Data
                </button>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#CAF4FF] flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6 print:shadow-none print:border-none">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full bg-[#CAF4FF]/50 flex items-center justify-center border-4 border-white shadow-md overflow-hidden print:border-gray-300">
               {selectedStudent.photo && !isPhotoError(selectedStudent.photo) ? (
                 <img src={selectedStudent.photo} alt={selectedStudent.name} className="w-full h-full object-cover" />
               ) : (
                 <div className="flex flex-col items-center text-center">
                    <UserCircle size={80} className="text-[#A0DEFF]" />
                 </div>
               )}
            </div>
            {!isReadOnly && (
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer no-print">
                <label className="cursor-pointer text-white text-xs font-bold flex flex-col items-center">
                    <Upload size={20} className="mb-1" />
                    <span>Ubah Foto</span>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handlePhotoUpload(e, false)} />
                </label>
                </div>
            )}
            <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-sm no-print pointer-events-none">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white ${getCompletenessColor(completeness)}`}>
                    {completeness}%
                </div>
            </div>
          </div>
          <div className="text-center md:text-left flex-1">
                <input className="text-2xl font-bold text-gray-800 border-b border-dashed border-transparent hover:border-gray-300 focus:border-[#5AB2FF] outline-none w-full md:w-auto bg-transparent print:border-none" value={selectedStudent.name} onChange={(e) => handleChange('name', e.target.value)} />
            <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-2 text-sm text-gray-500">
               <span className="bg-gray-100 px-3 py-1 rounded-full font-medium">NIS: {selectedStudent.nis}</span>
               {selectedStudent.nisn && <span className="bg-[#CAF4FF] text-[#5AB2FF] px-3 py-1 rounded-full font-medium">NISN: {selectedStudent.nisn}</span>}
               <span className="bg-[#FFF9D0] text-amber-700 px-3 py-1 rounded-full font-medium">Kelas: {selectedStudent.classId}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 no-print">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 space-y-1 sticky top-6">
               {[{ id: 'biodata', label: 'Biodata & Ortu', icon: User }, { id: 'health', label: 'Fisik & Kesehatan', icon: Heart }, { id: 'talents', label: 'Minat & Bakat', icon: Activity }, { id: 'economy', label: 'Sosial Ekonomi', icon: DollarSign }, { id: 'records', label: 'Prestasi & Pelanggaran', icon: AlertTriangle }, { id: 'history', label: 'History Nilai', icon: FileSpreadsheet }].map((tab) => (
                 <button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-[#CAF4FF] text-[#5AB2FF] shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}>
                   <tab.icon size={18} /> <span>{tab.label}</span>
                 </button>
               ))}
            </div>
          </div>
          <div className="lg:col-span-3 print:col-span-4">
             <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 min-h-[500px] print:shadow-none print:border-none print:p-0">
                <div className={activeTab === 'biodata' ? '' : 'hidden print:block'}><BiodataTab student={selectedStudent} onChange={handleChange} /></div>
                <div className={activeTab === 'health' ? '' : 'hidden print:block'}><HealthTab student={selectedStudent} onChange={handleChange} /></div>
                <div className={activeTab === 'talents' ? '' : 'hidden print:block'}><TalentsTab student={selectedStudent} onChange={handleChange} /></div>
                <div className={activeTab === 'economy' ? '' : 'hidden print:block'}><EconomyTab student={selectedStudent} onChange={handleChange} /></div>
                <div className={activeTab === 'records' ? '' : 'hidden print:block'}><RecordsTab student={selectedStudent} tempAchievements={detailTempAchievements} setTempAchievements={setDetailTempAchievements} tempViolations={detailTempViolations} setTempViolations={setDetailTempViolations}/></div>
                <div className={activeTab === 'history' ? '' : 'hidden print:block'}>
                  <div className="flex flex-col space-y-4 mb-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-bold text-gray-800 flex items-center">
                        <FileSpreadsheet className="mr-2 text-[#5AB2FF]" size={20} /> History Nilai
                      </h3>
                      {!isReadOnly && (
                        <div className="flex space-x-2 no-print">
                          <input type="file" ref={historyFileInputRef} onChange={handleImportHistoryExcel} className="hidden" accept=".xlsx, .xls" />
                          <input type="file" ref={rekapFileInputRef} onChange={handleImportRekapExcel} className="hidden" accept=".xlsx, .xls" />
                          
                          {historyViewMode === 'list' ? (
                            <>
                              <button 
                                onClick={handleDownloadHistoryTemplate}
                                className="text-xs flex items-center space-x-1 bg-white border border-gray-200 text-gray-600 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                                title="Download Template Excel"
                              >
                                <Download size={14} /> <span>Template</span>
                              </button>
                              <button 
                                onClick={() => historyFileInputRef.current?.click()}
                                className="text-xs flex items-center space-x-1 bg-white border border-gray-200 text-gray-600 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                                title="Import dari Excel"
                              >
                                <Upload size={14} /> <span>Import</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <button 
                                onClick={handleDownloadRekapTemplate}
                                className="text-xs flex items-center space-x-1 bg-white border border-gray-200 text-gray-600 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                                title="Download Template Rekap"
                              >
                                <Download size={14} /> <span>Template Rekap</span>
                              </button>
                              <button 
                                onClick={() => rekapFileInputRef.current?.click()}
                                className="text-xs flex items-center space-x-1 bg-white border border-gray-200 text-gray-600 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                                title="Import Rekap dari Excel"
                              >
                                <Upload size={14} /> <span>Import Rekap</span>
                              </button>
                            </>
                          )}
                          
                          <button 
                            onClick={handleAddManualHistory}
                            className="text-xs flex items-center space-x-1 bg-[#5AB2FF] text-white px-3 py-1.5 rounded-lg hover:bg-[#A0DEFF] transition-colors shadow-sm"
                          >
                            <Plus size={14} /> <span>Tambah Manual</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-lg self-start no-print">
                      <button 
                        onClick={() => setHistoryViewMode('list')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${historyViewMode === 'list' ? 'bg-white text-[#5AB2FF] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        List History
                      </button>
                      <button 
                        onClick={() => setHistoryViewMode('rekap')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${historyViewMode === 'rekap' ? 'bg-white text-[#5AB2FF] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        Rekap Raport
                      </button>
                    </div>
                  </div>

                  {loadingHistory ? (
                    <div className="flex justify-center items-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5AB2FF]"></div>
                    </div>
                  ) : gradeHistory.length === 0 ? (
                    <div className="text-center text-gray-500 py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <FileSpreadsheet size={48} className="mx-auto text-gray-300 mb-3" />
                      <p>Belum ada history nilai untuk siswa ini.</p>
                      <p className="text-sm mt-1">History nilai akan tersimpan otomatis saat siswa naik kelas atau lulus.</p>
                    </div>
                  ) : historyViewMode === 'list' ? (
                    <div className="space-y-6">
                      {gradeHistory.sort((a, b) => b.timestamp - a.timestamp).map((history, index) => (
                        <div key={index} className="border border-gray-200 rounded-xl overflow-hidden">
                          <div className="bg-[#CAF4FF]/30 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                            <div>
                              <h4 className="font-bold text-gray-800">Tahun Ajaran: {history.academicYear}</h4>
                              <p className="text-sm text-gray-600">Semester {history.semester} • Kelas {history.classId}</p>
                            </div>
                            <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-md border border-gray-200">
                              {new Date(history.timestamp).toLocaleDateString('id-ID')}
                            </span>
                          </div>
                          <div className="p-4 overflow-x-auto">
                            <table className="w-full text-sm text-left">
                              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                  <th className="px-4 py-2">Mata Pelajaran</th>
                                  <th className="px-4 py-2 text-center">Sumatif 1</th>
                                  <th className="px-4 py-2 text-center">Sumatif 2</th>
                                  <th className="px-4 py-2 text-center">Sumatif 3</th>
                                  <th className="px-4 py-2 text-center">Sumatif 4</th>
                                  <th className="px-4 py-2 text-center">SAS</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.entries(history.subjects).map(([subjectId, grades]: [string, any]) => (
                                  <tr key={subjectId} className="border-b">
                                    <td className="px-4 py-2 font-medium text-gray-900">{subjectId}</td>
                                    <td className="px-4 py-2 text-center">{grades.sum1 || '-'}</td>
                                    <td className="px-4 py-2 text-center">{grades.sum2 || '-'}</td>
                                    <td className="px-4 py-2 text-center">{grades.sum3 || '-'}</td>
                                    <td className="px-4 py-2 text-center">{grades.sum4 || '-'}</td>
                                    <td className="px-4 py-2 text-center font-bold text-[#5AB2FF]">{grades.sas || '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="bg-[#CAF4FF]/30 px-4 py-3 border-b border-gray-200">
                        <h4 className="font-bold text-gray-800">Rekap Nilai Raport (SAS)</h4>
                        <p className="text-xs text-gray-500">Kumpulan nilai akhir semester dari seluruh history.</p>
                      </div>
                      <div className="p-0 overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 border-b border-r sticky left-0 bg-gray-50 z-10 min-w-[150px]">Mata Pelajaran</th>
                              {rekapData?.periods.map(period => (
                                <th key={period.id} className="px-4 py-3 border-b text-center min-w-[120px]">
                                  <div className="font-bold">{period.year}</div>
                                  <div className="text-[10px] text-gray-500">Smt {period.semester} • Klp {period.classId}</div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rekapData?.subjects.map(subject => (
                              <tr key={subject} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 border-b border-r font-medium text-gray-900 sticky left-0 bg-white z-10">{subject}</td>
                                {rekapData.periods.map(period => {
                                  const historyEntry = rekapData.history.find(h => h.academicYear === period.year && h.semester === period.semester);
                                  const grade = historyEntry?.subjects[subject]?.sas;
                                  return (
                                    <td key={period.id} className="px-4 py-3 border-b text-center">
                                      {grade ? (
                                        <span className={`font-bold ${Number(grade) >= 75 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                          {grade}
                                        </span>
                                      ) : (
                                        <span className="text-gray-300">-</span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
             </div>
          </div>
        </div>

        {/* Manual History Modal */}
        {isHistoryModalOpen && !isReadOnly && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm no-print">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-[#CAF4FF]/30">
                 <div>
                   <h3 className="font-bold text-xl text-gray-800">Input Manual History Nilai</h3>
                   <p className="text-sm text-gray-500">{selectedStudent.name}</p>
                 </div>
                 <button onClick={() => setIsHistoryModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full"><X size={20}/></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tahun Ajaran</label>
                    <input 
                      type="text" 
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#5AB2FF]" 
                      placeholder="Contoh: 2023/2024"
                      value={historyFormData.academicYear}
                      onChange={e => setHistoryFormData({...historyFormData, academicYear: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Semester</label>
                    <select 
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#5AB2FF]"
                      value={historyFormData.semester}
                      onChange={e => setHistoryFormData({...historyFormData, semester: e.target.value})}
                    >
                      <option value="1">Semester 1 (Ganjil)</option>
                      <option value="2">Semester 2 (Genap)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Kelas Saat Itu</label>
                    <input 
                      type="text" 
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#5AB2FF]" 
                      placeholder="Contoh: 4A"
                      value={historyFormData.classId}
                      onChange={e => setHistoryFormData({...historyFormData, classId: e.target.value})}
                    />
                  </div>
                </div>

                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-700 font-bold border-b">
                      <tr>
                        <th className="px-4 py-3">Mata Pelajaran</th>
                        <th className="px-4 py-3 text-center">S1</th>
                        <th className="px-4 py-3 text-center">S2</th>
                        <th className="px-4 py-3 text-center">S3</th>
                        <th className="px-4 py-3 text-center">S4</th>
                        <th className="px-4 py-3 text-center">SAS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {Object.entries(historyFormData.subjects).map(([subjectName, grades]) => (
                        <tr key={subjectName}>
                          <td className="px-4 py-2 font-medium">{subjectName}</td>
                          <td className="px-4 py-2">
                            <input 
                              type="number" 
                              className="w-16 p-1 border rounded text-center"
                              value={grades.sum1}
                              onChange={e => setHistoryFormData({
                                ...historyFormData,
                                subjects: {
                                  ...historyFormData.subjects,
                                  [subjectName]: { ...grades, sum1: e.target.value }
                                }
                              })}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input 
                              type="number" 
                              className="w-16 p-1 border rounded text-center"
                              value={grades.sum2}
                              onChange={e => setHistoryFormData({
                                ...historyFormData,
                                subjects: {
                                  ...historyFormData.subjects,
                                  [subjectName]: { ...grades, sum2: e.target.value }
                                }
                              })}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input 
                              type="number" 
                              className="w-16 p-1 border rounded text-center"
                              value={grades.sum3}
                              onChange={e => setHistoryFormData({
                                ...historyFormData,
                                subjects: {
                                  ...historyFormData.subjects,
                                  [subjectName]: { ...grades, sum3: e.target.value }
                                }
                              })}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input 
                              type="number" 
                              className="w-16 p-1 border rounded text-center"
                              value={grades.sum4}
                              onChange={e => setHistoryFormData({
                                ...historyFormData,
                                subjects: {
                                  ...historyFormData.subjects,
                                  [subjectName]: { ...grades, sum4: e.target.value }
                                }
                              })}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input 
                              type="number" 
                              className="w-16 p-1 border rounded text-center font-bold text-[#5AB2FF]"
                              value={grades.sas}
                              onChange={e => setHistoryFormData({
                                ...historyFormData,
                                subjects: {
                                  ...historyFormData.subjects,
                                  [subjectName]: { ...grades, sas: e.target.value }
                                }
                              })}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                 <button onClick={() => setIsHistoryModalOpen(false)} className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100">Batal</button>
                 <button onClick={handleSaveManualHistory} className="px-5 py-2.5 rounded-lg bg-[#5AB2FF] text-white font-bold hover:bg-[#A0DEFF] shadow-md">Simpan History</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- Main List View (Grid) ---
  return (
    <div className={`space-y-6 animate-fade-in relative ${viewType === 'qr-codes' ? '' : 'page-portrait'}`}>
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 no-print">
        <div><h2 className="text-2xl font-bold text-gray-800">Manajemen Siswa</h2><p className="text-gray-500">Database lengkap profil siswa.</p></div>
        <div className="flex flex-wrap gap-2 justify-end">
           <div className="bg-white p-1 rounded-lg border border-gray-200 flex shadow-sm mr-2">
              <button onClick={() => setViewType('dashboard')} className="p-2 rounded-md transition-all text-gray-400 hover:text-gray-600" title="Dashboard"><PieChartIcon size={18} /></button>
              <button onClick={() => setViewType('list')} className={`p-2 rounded-md transition-all ${viewType === 'list' ? 'bg-[#5AB2FF] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`} title="Tampilan Tabel"><ListIcon size={18} /></button>
              <button onClick={() => setViewType('grid')} className={`p-2 rounded-md transition-all ${viewType === 'grid' ? 'bg-[#5AB2FF] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`} title="Tampilan Grid"><LayoutGrid size={18} /></button>
              <button onClick={() => setViewType('qr-codes')} className={`p-2 rounded-md transition-all ${viewType === 'qr-codes' ? 'bg-[#5AB2FF] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`} title="QR Code Siswa"><QrCodeIcon size={18} /></button>
              <button onClick={() => setViewType('health-data')} className={`p-2 rounded-md transition-all ${viewType === 'health-data' ? 'bg-[#5AB2FF] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`} title="Data Kesehatan"><Heart size={18} /></button>
              <button onClick={() => setViewType('parent-data')} className={`p-2 rounded-md transition-all ${viewType === 'parent-data' ? 'bg-[#5AB2FF] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`} title="Data Orang Tua"><Users size={18} /></button>
              <button onClick={() => setViewType('talents-data')} className={`p-2 rounded-md transition-all ${viewType === 'talents-data' ? 'bg-[#5AB2FF] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`} title="Data Bakat Minat"><Activity size={18} /></button>
           </div>
           
            {!isReadOnly && <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx, .xls, .csv" />}
            {!isReadOnly && <input type="file" ref={bulkHistoryFileInputRef} onChange={handleBulkImportHistoryExcel} className="hidden" accept=".xlsx, .xls" />}
            {!isReadOnly && <input type="file" ref={bulkRekapFileInputRef} onChange={handleBulkImportRekapExcel} className="hidden" accept=".xlsx, .xls" />}
            
            <div className="flex flex-wrap gap-2 no-print">
              <div className="relative group">
                <button className="flex items-center space-x-2 bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                  <FileSpreadsheet size={16} /> <span className="hidden sm:inline">Template</span> <ChevronDown size={14} />
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 hidden group-hover:block">
                  <button onClick={handleDownloadTemplate} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center">
                    <Users size={14} className="mr-2" /> Template Siswa
                  </button>
                  <button onClick={handleDownloadBulkHistoryTemplate} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center">
                    <FileSpreadsheet size={14} className="mr-2" /> Template History
                  </button>
                  <button onClick={handleDownloadBulkRekapTemplate} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center">
                    <FileSpreadsheet size={14} className="mr-2 text-emerald-500" /> Template Rekap
                  </button>
                </div>
              </div>

              <div className="relative group">
                <button className="flex items-center space-x-2 bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                  <Upload size={16} /> <span className="hidden sm:inline">Import</span> <ChevronDown size={14} />
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 hidden group-hover:block">
                  <button onClick={handleImportClick} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center">
                    <Users size={14} className="mr-2" /> Import Siswa
                  </button>
                  <button onClick={() => bulkHistoryFileInputRef.current?.click()} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center">
                    <FileSpreadsheet size={14} className="mr-2" /> Import History
                  </button>
                  <button onClick={() => bulkRekapFileInputRef.current?.click()} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center">
                    <FileSpreadsheet size={14} className="mr-2 text-emerald-500" /> Import Rekap
                  </button>
                </div>
              </div>
              
              <button onClick={handleExport} className="flex items-center space-x-2 bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"><Download size={16} /> <span className="hidden sm:inline">Export</span></button>
              <button onClick={handlePrint} className="flex items-center space-x-2 bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"><Printer size={16} /> <span>Cetak</span></button>
              {!isReadOnly && <button onClick={() => { setIsAddModalOpen(true); setAddModalTab('biodata'); }} className="flex items-center space-x-2 bg-[#5AB2FF] hover:bg-[#A0DEFF] text-white px-4 py-2 rounded-lg transition-colors shadow-md"><Plus size={18} /><span>Tambah</span></button>}
            </div>
        </div>
      </div>

      <div className={`bg-white rounded-xl shadow-sm border border-[#CAF4FF] overflow-hidden ${viewType === 'qr-codes' ? 'print-container border-none shadow-none' : 'print-container'}`}>
        <div className="p-4 border-b border-gray-100 flex items-center bg-[#CAF4FF]/20 no-print">
            <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="Cari nama, NIS, NISN, atau Kelas..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5AB2FF]" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
        </div>

        {viewType === 'grid' ? (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-gray-50/30">
             {filteredStudents.map((student, index) => {
                const completeness = calculateCompleteness(student);
                // Rotate colors: White, Cream, Baby Blue
                const cardVariants = [
                    'bg-white border-gray-100',
                    'bg-[#FFF9D0]/40 border-amber-100',
                    'bg-[#CAF4FF]/30 border-blue-100',
                ];
                const variant = cardVariants[index % cardVariants.length];

                return (
                <div key={student.id} onClick={() => setSelectedStudent(student)} className={`${variant} rounded-xl border shadow-sm hover:shadow-lg hover:border-[#A0DEFF] hover:-translate-y-1 transition-all duration-300 cursor-pointer group overflow-hidden`}>
                   <div className="p-5 flex items-start space-x-4">
                      <div className="relative shrink-0">
                         <div className="w-16 h-16 rounded-full bg-white/80 flex items-center justify-center text-2xl font-bold text-[#5AB2FF] border-2 border-white shadow-sm overflow-hidden">
                            {student.photo && !isPhotoError(student.photo) ? (
                                <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                            ) : ( student.gender === 'L' ? '👦' : '👧' )}
                         </div>
                      </div>
                      <div className="flex-1 min-w-0 min-h-16">
                         <h3 className={`font-bold text-gray-800 group-hover:text-[#5AB2FF] transition-colors ${student.name.length > 22 ? 'text-base leading-tight' : 'text-lg'}`}>{student.name}</h3>
                         <div className="flex flex-wrap gap-1.5 mt-2">
                            <span className="bg-white/80 text-gray-600 text-[10px] px-2 py-0.5 rounded font-mono border border-gray-200 shadow-sm flex items-center" title="NIS">
                                NIS: {student.nis}
                            </span>
                            {student.nisn && (
                                <span className="bg-indigo-50 text-indigo-600 text-[10px] px-2 py-0.5 rounded font-mono border border-indigo-100 shadow-sm flex items-center" title="NISN">
                                    NISN: {student.nisn}
                                </span>
                            )}
                            <span className="bg-amber-50 text-amber-700 text-[10px] px-2 py-0.5 rounded font-bold border border-amber-100 shadow-sm flex items-center" title="Kelas">
                                Kls {student.classId}
                            </span>
                         </div>
                      </div>
                   </div>
                   <div className="bg-white/50 px-5 py-3 border-t border-gray-100 flex flex-col justify-center">
                      <div className="flex justify-between items-center mb-1"><span className="text-xs font-semibold text-gray-500">Kelengkapan Data</span><span className={`text-xs font-bold ${getCompletenessColor(completeness)} px-2 py-0.5 rounded`}>{completeness}%</span></div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5"><div className={`h-1.5 rounded-full ${getCompletenessBarColor(completeness)}`} style={{width: `${completeness}%`}}></div></div>
                   </div>
                </div>
             )})}
          </div>
        ) : viewType === 'qr-codes' ? (
            /* QR CODE CARD LAYOUT */
            <div className="p-6 bg-gray-50">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {filteredStudents.map((student) => (
                        <div key={student.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 flex flex-col items-center text-center">
                            <h3 className="font-bold text-gray-800 text-sm mb-1 truncate w-full">{student.name}</h3>
                            <span className="text-xs font-mono text-gray-500 mb-3 bg-gray-100 px-2 py-0.5 rounded">NIS: {student.nis}</span>
                            
                            <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-inner mb-3">
                                <QRCode 
                                    id={`qr-code-${student.id}`} // Unique ID for finding SVG
                                    value={student.id} 
                                    size={120} 
                                    viewBox={`0 0 256 256`} 
                                    style={{ height: "auto", maxWidth: "100%", width: "120px" }}
                                />
                            </div>

                            <button 
                                onClick={() => handleDownloadQR(student)}
                                className="w-full py-2 bg-indigo-50 text-indigo-600 font-bold text-xs rounded-lg hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
                            >
                                <Download size={14}/> Download JPG
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        ) : viewType === 'health-data' ? (
            /* HEALTH DATA TABLE VIEW */
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-[#CAF4FF]/50 text-gray-700 font-medium border-b border-[#A0DEFF]">
                        <tr>
                            <th className="px-4 py-3">NIS</th>
                            <th className="px-4 py-3">Nama</th>
                            <th className="px-4 py-3 text-center">Berat (kg)</th>
                            <th className="px-4 py-3 text-center">Tinggi (cm)</th>
                            <th className="px-4 py-3">Riwayat Penyakit</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredStudents.map((student, index) => (
                            <tr key={student.id} className={`hover:bg-[#CAF4FF]/20 cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-[#CAF4FF]/10'}`} onClick={() => setSelectedStudent(student)}>
                                <td className="px-4 py-3 font-mono text-gray-500 whitespace-nowrap">{student.nis}</td>
                                <td className="px-4 py-3 font-medium flex items-center whitespace-nowrap">
                                    {student.photo && !isPhotoError(student.photo) && <img src={student.photo} className="w-8 h-8 rounded-full mr-3 object-cover" alt=""/>}
                                    {student.name}
                                </td>
                                <td className="px-4 py-3 text-center font-mono">{student.weight || '-'}</td>
                                <td className="px-4 py-3 text-center font-mono">{student.height || '-'}</td>
                                <td className="px-4 py-3 text-gray-600 italic">{student.healthNotes || 'Tidak ada'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        ) : viewType === 'parent-data' ? (
            /* PARENT DATA TABLE VIEW */
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-[#CAF4FF]/50 text-gray-700 font-medium border-b border-[#A0DEFF]">
                        <tr>
                            <th className="px-4 py-3">NIS</th>
                            <th className="px-4 py-3">Nama</th>
                            <th className="px-4 py-3">Nama Ayah</th>
                            <th className="px-4 py-3">Pendidikan Ayah</th>
                            <th className="px-4 py-3">Pekerjaan Ayah</th>
                            <th className="px-4 py-3">Nama Ibu</th>
                            <th className="px-4 py-3">Pendidikan Ibu</th>
                            <th className="px-4 py-3">Pekerjaan Ibu</th>
                            <th className="px-4 py-3">Alamat</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredStudents.map((student, index) => (
                            <tr key={student.id} className={`hover:bg-[#CAF4FF]/20 cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-[#CAF4FF]/10'}`} onClick={() => setSelectedStudent(student)}>
                                <td className="px-4 py-3 font-mono text-gray-500 whitespace-nowrap">{student.nis}</td>
                                <td className="px-4 py-3 font-medium flex items-center whitespace-nowrap">
                                    {student.photo && !isPhotoError(student.photo) && <img src={student.photo} className="w-8 h-8 rounded-full mr-3 object-cover" alt=""/>}
                                    {student.name}
                                </td>
                                <td className="px-4 py-3">{student.fatherName || '-'}</td>
                                <td className="px-4 py-3">{student.fatherEducation || '-'}</td>
                                <td className="px-4 py-3">{student.fatherJob || '-'}</td>
                                <td className="px-4 py-3">{student.motherName || '-'}</td>
                                <td className="px-4 py-3">{student.motherEducation || '-'}</td>
                                <td className="px-4 py-3">{student.motherJob || '-'}</td>
                                <td className="px-4 py-3 truncate max-w-[200px]">{student.address}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        ) : viewType === 'talents-data' ? (
            /* TALENTS DATA TABLE VIEW */
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-[#CAF4FF]/50 text-gray-700 font-medium border-b border-[#A0DEFF]">
                        <tr>
                            <th className="px-4 py-3">NIS</th>
                            <th className="px-4 py-3">NISN</th>
                            <th className="px-4 py-3">Nama</th>
                            <th className="px-4 py-3">Tempat Lahir</th>
                            <th className="px-4 py-3">Tanggal Lahir</th>
                            <th className="px-4 py-3">Hobi</th>
                            <th className="px-4 py-3">Cita-cita</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredStudents.map((student, index) => (
                            <tr key={student.id} className={`hover:bg-[#CAF4FF]/20 cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-[#CAF4FF]/10'}`} onClick={() => setSelectedStudent(student)}>
                                <td className="px-4 py-3 font-mono text-gray-500 whitespace-nowrap">{student.nis}</td>
                                <td className="px-4 py-3 font-mono text-gray-500 whitespace-nowrap">{student.nisn || '-'}</td>
                                <td className="px-4 py-3 font-medium flex items-center whitespace-nowrap">
                                    {student.photo && !isPhotoError(student.photo) && <img src={student.photo} className="w-8 h-8 rounded-full mr-3 object-cover" alt=""/>}
                                    {student.name}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">{student.birthPlace || '-'}</td>
                                <td className="px-4 py-3 whitespace-nowrap">{student.birthDate}</td>
                                <td className="px-4 py-3">{student.hobbies || '-'}</td>
                                <td className="px-4 py-3">{student.ambition || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        ) : (
           <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#CAF4FF]/50 text-gray-700 font-medium border-b border-[#A0DEFF]">
                <tr>
                    <th className="px-4 py-3">NIS</th>
                    <th className="px-4 py-3">NISN</th>
                    <th className="px-4 py-3">Nama</th>
                    <th className="px-4 py-3 text-center">L/P</th>
                    <th className="px-4 py-3">Tempat Lahir</th>
                    <th className="px-4 py-3">Tanggal Lahir</th>
                    <th className="px-4 py-3">Agama</th>
                    <th className="px-4 py-3">Nama Ayah</th>
                    <th className="px-4 py-3">Nama Ibu</th>
                    <th className="px-4 py-3">Alamat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.map((student, index) => (
                  <tr key={student.id} className={`hover:bg-[#CAF4FF]/20 cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-[#CAF4FF]/10'}`} onClick={() => setSelectedStudent(student)}>
                    <td className="px-4 py-3 font-mono text-gray-500 whitespace-nowrap">{student.nis}</td>
                    <td className="px-4 py-3 font-mono text-gray-500 whitespace-nowrap">{student.nisn || '-'}</td>
                    <td className="px-4 py-3 font-medium flex items-center whitespace-nowrap">{student.photo && !isPhotoError(student.photo) && <img src={student.photo} className="w-8 h-8 rounded-full mr-3 object-cover"/>}{student.name}</td>
                    <td className="px-4 py-3 text-center">{student.gender}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{student.birthPlace || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{student.birthDate}</td>
                    <td className="px-4 py-3">{student.religion || '-'}</td>
                    <td className="px-4 py-3">{student.fatherName || '-'}</td>
                    <td className="px-4 py-3">{student.motherName || '-'}</td>
                    <td className="px-4 py-3 truncate max-w-[150px]">{student.address}</td>
                  </tr>
                ))}
              </tbody>
            </table>
           </div>
        )}
      </div>

      {isAddModalOpen && !isReadOnly && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm no-print">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-[#CAF4FF]/30">
               <div><h3 className="font-bold text-xl text-gray-800">Tambah Data Siswa</h3></div>
               <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full"><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmitNew} className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                    <div className="flex justify-center mb-4">
                       <div className="relative group w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer hover:bg-gray-200">
                          {newStudent.photo ? <img src={newStudent.photo} className="w-full h-full object-cover"/> : <ImageIcon size={24} className="text-gray-400"/>}
                          <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={(e) => handlePhotoUpload(e, true)} />
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <input required className="border p-2 rounded" placeholder="Nama" value={newStudent.name} onChange={e=>setNewStudent({...newStudent, name:e.target.value})}/>
                        <input required className="border p-2 rounded" placeholder="NIS" value={newStudent.nis} onChange={e=>setNewStudent({...newStudent, nis:e.target.value})}/>
                        <input className="border p-2 rounded" placeholder="Kelas" value={newStudent.classId} onChange={e=>setNewStudent({...newStudent, classId:e.target.value})}/>
                        <select className="border p-2 rounded" value={newStudent.gender} onChange={e=>setNewStudent({...newStudent, gender:e.target.value as any})}><option value="L">Laki-laki</option><option value="P">Perempuan</option></select>
                    </div>
                </div>
            </form>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
               <button onClick={() => setIsAddModalOpen(false)} className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100">Batal</button>
               <button onClick={handleSubmitNew} className="px-5 py-2.5 rounded-lg bg-[#5AB2FF] text-white font-bold hover:bg-[#A0DEFF] shadow-md">Simpan Data Siswa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default StudentList;