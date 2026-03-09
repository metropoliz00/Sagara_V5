
export interface User {
  id: string;
  username: string;
  password?: string;
  role: 'admin' | 'guru' | 'siswa' | 'supervisor';
  fullName: string;
  nip?: string;
  nuptk?: string;
  birthInfo?: string;
  education?: string;
  position: string;
  rank?: string;
  classId?: string;
  email?: string;
  phone?: string;
  address?: string;
  photo?: string;
  signature?: string;
  studentId?: string;
}

export interface Student {
  id: string;
  classId: string;
  nis: string;
  nisn?: string;
  name: string;
  gender: 'L' | 'P';
  birthDate: string;
  birthPlace?: string;
  religion?: string;
  address: string;
  photo?: string;
  
  fatherName: string; 
  fatherJob?: string; 
  fatherEducation?: string;
  motherName: string;
  motherJob?: string;
  motherEducation?: string;
  parentName: string;
  parentJob?: string;
  parentPhone: string;
  
  bloodType?: string;
  height?: number;
  weight?: number;
  healthNotes?: string;
  hobbies?: string;
  ambition?: string;
  economyStatus?: 'Mampu' | 'Cukup' | 'Kurang Mampu' | 'KIP';
  
  achievements?: string[];
  violations?: string[];
  behaviorScore: number;
  attendance: {
    present: number;
    sick: number;
    permit: number;
    alpha: number;
  };
  
  teacherNotes?: string;
}

export interface Subject {
  id: string;
  name: string;
  kkm: number;
}

export interface GradeData {
  sum1: number;
  sum2: number;
  sum3: number;
  sum4: number;
  sas: number;
}

export interface GradeRecord {
  studentId: string;
  classId: string;
  subjects: Record<string, GradeData>;
}

export interface ScheduleItem {
  id: string;
  day: string;
  time: string;
  subject: string;
}

export interface PiketGroup {
  day: string;
  studentIds: string[];
}

export interface SeatingLayouts {
  classical: (string | null)[];
  groups: (string | null)[];
  ushape: (string | null)[];
}

export interface InventoryItem {
  id: string;
  classId: string;
  name: string;
  condition: 'Baik' | 'Rusak';
  qty: number;
}

export interface SchoolAsset {
  id: string;
  name: string; // Jenis Sarana/Prasarana
  condition: 'Baik' | 'Rusak Ringan' | 'Rusak Berat';
  qty: number;
  location?: string; // Optional location
}

export interface Guest {
  id: string;
  classId: string;
  date: string;
  time: string;
  name: string;
  purpose: string;
  agency: string;
}

export interface AgendaItem {
  id: string;
  classId: string;
  title: string;
  date: string;
  time?: string;
  type: 'urgent' | 'warning' | 'info';
  completed: boolean;
}

export interface BehaviorLog {
  id: string;
  classId: string;
  studentId: string;
  studentName: string;
  date: string;
  type: 'positive' | 'negative' | 'counseling';
  category: string;
  description: string;
  point: number;
  emotion: 'happy' | 'proud' | 'neutral' | 'sad' | 'angry';
  status: 'Done' | 'Pending';
}

export interface Extracurricular {
  id: string;
  classId: string;
  name: string;
  category: string;
  schedule: string;
  coach: string;
  members: string[];
  color: string;
}

export interface Holiday {
  id: string;
  classId: string;
  date: string;
  description: string;
  type: 'nasional' | 'haribesar' | 'cuti' | 'semester';
}

export interface EmploymentLink {
  id: string;
  title: string;
  url: string;
  icon?: string;
}

export interface SupportDocument {
  id: string;
  classId: string;
  name: string;
  url: string;
}

export interface LearningReport {
  id: string;
  classId: string;
  date: string;
  type: 'Jurnal Harian' | 'RPP/Modul Ajar' | 'Dokumentasi' | 'Lainnya';
  subject: string;
  topic: string;
  documentLink: string;
  teacherName?: string;
}

export interface LearningJournalEntry {
  id: string;
  classId: string;
  date: string;
  day: string;
  subject: string;
  timeSlot?: string;
  topic: string;
  activities: string;
  evaluation: string;
  reflection: string;
  followUp: string;
}

export interface LiaisonLog {
  id: string;
  classId: string;
  studentId: string;
  date: string;
  sender: 'Guru' | 'Wali Murid';
  category?: string;
  message: string;
  status?: 'Pending' | 'Diterima' | 'Ditolak' | 'Selesai';
  response?: string;
}

export interface PermissionRequest {
  id: string;
  studentId: string;
  studentName?: string;
  classId: string;
  date: string;
  type: 'sick' | 'permit' | 'dispensation';
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export interface TeacherProfileData {
  name: string;
  nip: string;
  nuptk?: string;
  birthInfo?: string;
  education?: string;
  position?: string;
  rank?: string;
  teachingClass?: string;
  phone: string;
  email: string;
  address: string;
  signature?: string;
  photo?: string;
}

export interface SchoolProfileData {
  name: string;
  npsn: string;
  address: string;
  headmaster: string;
  headmasterNip: string;
  year: string;
  semester: string;
  regencyLogo?: string;
  schoolLogo?: string;
  runningText?: string;
  runningTextSpeed?: number;
  headmasterSignature?: string;
  developerInfo?: {
    name: string;
    moto: string;
    photo: string;
  };
}

export interface AcademicCalendarData {
  [yearMonth: string]: (string | null)[];
}

export interface OrganizationStructure {
  roles: Record<string, string | null>;
  sections: { id: string; name: string }[];
}

// NEW: BOS Interface
export interface BOSTransaction {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category: 
    | 'SiLPA Tahun Lalu'
    | 'BOS Reguler' 
    | 'Standar Isi' 
    | 'Standar Proses' 
    | 'Standar Kompetensi Lulusan' 
    | 'Standar Pendidik dan Tenaga Kependidikan' 
    | 'Standar Sarana dan Prasarana' 
    | 'Standar Pengelolaan' 
    | 'Standar Pembiayaan' 
    | 'Standar Penilaian Pendidikan';
  description: string;
  amount: number;
}

export const SIKAP_INDICATORS = {
  keimanan: 'Keimanan & Ketakwaan',
  kewargaan: 'Kewargaan',
  penalaranKritis: 'Penalaran Kritis',
  kreativitas: 'Kreativitas',
  kolaborasi: 'Kolaborasi',
  kemandirian: 'Kemandirian',
  kesehatan: 'Kesehatan',
  komunikasi: 'Komunikasi',
} as const;

export type SikapIndicatorKey = keyof typeof SIKAP_INDICATORS;

export interface SikapAssessment {
  studentId: string;
  classId: string;
  keimanan: number;
  kewargaan: number;
  penalaranKritis: number;
  kreativitas: number;
  kolaborasi: number;
  kemandirian: number;
  kesehatan: number;
  komunikasi: number;
}

export const KARAKTER_INDICATORS = {
  bangunPagi: 'Bangun Pagi',
  beribadah: 'Beribadah',
  berolahraga: 'Berolahraga',
  makanSehat: 'Makan Sehat & Bergizi',
  gemarBelajar: 'Gemar Belajar',
  bermasyarakat: 'Bermasyarakat',
  tidurAwal: 'Tidur Lebih Awal',
} as const;

export type KarakterIndicatorKey = keyof typeof KARAKTER_INDICATORS;

export interface KarakterAssessment {
  studentId: string;
  classId: string;
  bangunPagi: string;
  beribadah: string;
  berolahraga: string;
  makanSehat: string;
  gemarBelajar: string;
  bermasyarakat: string;
  tidurAwal: string;
  catatan?: string;
  afirmasi?: string;
}

export type ViewState = 
  | 'dashboard' 
  | 'students' 
  | 'attendance' 
  | 'grades' 
  | 'admin' 
  | 'counseling' 
  | 'activities' 
  | 'profile' 
  | 'pendahuluan' 
  | 'attitude' 
  | 'accounts' 
  | 'employment-links' 
  | 'learning-reports' 
  | 'learning-journal' 
  | 'student-monitor' 
  | 'liaison-book' 
  | 'backup-restore' 
  | 'support-docs' 
  | 'supervisor-overview'
  | 'school-assets'
  | 'bos-admin';
