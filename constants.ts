
import { Student, Subject, ScheduleItem, GradeRecord, Extracurricular } from './types';

export const CALENDAR_CODES: { [key: string]: { label: string; color: string; type: string } } = {
  'LHB': { label: 'Libur Hari Besar', color: 'bg-red-500 text-white', type: 'nasional' },
  'LU': { label: 'Libur Umum', color: 'bg-red-400 text-white', type: 'nasional' },
  'LS1': { label: 'Libur Semester 1', color: 'bg-blue-500 text-white', type: 'semester' },
  'LS2': { label: 'Libur Semester 2', color: 'bg-blue-400 text-white', type: 'semester' },
  'CB': { label: 'Cuti Bersama', color: 'bg-yellow-500 text-black', type: 'cuti' },
  'KPP': { label: 'Kegiatan Permulaan Puasa', color: 'bg-green-500 text-white', type: 'event' },
  'LHR': { label: 'Libur Sekitar Hari Raya', color: 'bg-green-400 text-white', type: 'haribesar' },
  'KTS': { label: 'Kegiatan Tengah Semester', color: 'bg-purple-500 text-white', type: 'event' },
  'MPLS': { label: 'MPLS', color: 'bg-indigo-500 text-white', type: 'event' },
};

export const MOCK_STUDENTS: Student[] = [];

// Daftar Kelas untuk Filter Admin
export const CLASS_LIST = [
  '1A', '1B', 
  '2A', '2B', 
  '3A', '3B', 
  '4A', '4B', 
  '5A', '5B', 
  '6A', '6B'
];

// Konfigurasi Mata Pelajaran (Tetap ada sebagai referensi struktur kurikulum)
export const MOCK_SUBJECTS: Subject[] = [
  { id: 'pai', name: 'PAI', kkm: 75 },
  { id: 'pancasila', name: 'Pend. Pancasila', kkm: 75 },
  { id: 'indo', name: 'Bahasa Indonesia', kkm: 70 },
  { id: 'mat', name: 'Matematika', kkm: 70 },
  { id: 'ipas', name: 'IPAS', kkm: 75 },
  { id: 'senibudaya', name: 'Seni dan Budaya', kkm: 75 },
  { id: 'pjok', name: 'PJOK', kkm: 75 },
  { id: 'jawa', name: 'Bahasa Jawa', kkm: 70 },
  { id: 'inggris', name: 'Bahasa Inggris', kkm: 70 },
  { id: 'kka', name: 'KKA', kkm: 0 },
];

export const WEEKDAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export const DEFAULT_TIME_SLOTS = [
  "07.00 - 07.35", "07.35 - 08.10", "08.10 - 08.45", "08.45 - 09.20",
  "09.20 - 09.50", "09.50 - 10.25", "10.25 - 11.00", "11.00 - 11.35",
  "11.35 - 12.10"
];

export const MOCK_SCHEDULE: ScheduleItem[] = [];

export const MOCK_GRADES: GradeRecord[] = [];

export const MOCK_EXTRACURRICULARS: Extracurricular[] = [];
