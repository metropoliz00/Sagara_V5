
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

export const HOLIDAY_DESCRIPTIONS_2025_2026: { [key: string]: string } = {
  '2025-08-17': 'HUT Republik Indonesia',
  '2025-09-05': 'Maulud Nabi Muhammad SAW',
  '2025-12-25': 'Hari Raya Natal',
  '2026-01-01': 'Tahun Baru Masehi',
  '2026-01-16': "Isro' Mi'roj Nabi Muhammad SAW",
  '2026-02-17': 'Tahun Baru Imlek 2577',
  '2026-03-19': 'Hari Raya Nyepi Tahun Saka 1948',
  '2026-03-20': 'Hari Raya Idul Fitri 1447 H',
  '2026-03-21': 'Hari Raya Idul Fitri 1447 H',
  '2026-04-03': 'Wafat Yesus Kristus',
  '2026-05-01': 'Hari Buruh Internasional',
  '2026-05-14': 'Kenaikan Yesus Kristus',
  '2026-05-27': 'Hari Raya Idul Adha',
  '2026-05-31': 'Hari Raya Waisak 2570',
  '2026-06-01': 'Hari Lahir Pancasila',
  '2026-06-16': 'Tahun Baru Hijriyah 1448',
};

export const PREFILLED_CALENDAR_2025: any = {
  '2025-07': [null,null,null,null,null,null,'LU',null,null,null,null,null,'LU','1','2','3','4','5','6','LU','7','8','9','10','11','12','LU','13','14','15','16'],
  '2025-08': ['17','18','LU','19','20','21','22','23','24','LU','25','26','27','28','29','30','LHB','31','32','33','34','35','36','LU','37','38','39','40','41','42','LU'],
  '2025-09': ['43','44','45','46','LHB','47','LU','48','49','50','51','52','53','LU','54','55','56','57','58','59','LU','60','61','62','63','64','65','LU','66','67',null],
  '2025-10': ['68','69','70','71','LU','72','73','74','KTS','KTS','KTS','LU','75','76','77','78','79','80','LU','81','82','83','84','85','86','LU','87','88','89','90','91'],
  '2025-11': ['92','LU','93','94','95','96','97','98','LU','99','100','101','102','103','104','105','106','LU','107','108','109','110','111','112','LU','113','114','115','116','LU',null],
  '2025-12': ['117','118','119','120','121','122','LU','123','124','125','126','127','128','LU','129','130','131','132','133','134','LU','LS1','LS1','LS1','LHB','CB','LS1','LU','LS1','LS1','LS1'],
  '2026-01': ['LHB','1','2','LU','3','4','5','6','7','8','LU','9','10','11','12','LHB','13','LU','14','15','16','17','18','19','LU','20','21','22','23','24','25'],
  '2026-02': ['LU','26','27','28','29','30','31','LU','32','33','34','35','36','37','LU','38','LHB','39','40','KPP','KPP','LU','KPP','KPP','CB','CB','LHR','LHR',null,null,null],
  '2026-03': ['LU','41','42','43','44','45','46','LU','47','48','49','50','51','52','LU','53','54','55','56','LHB','LHB','LHB','LU','CB','CB','LHR','LHR','LHR','LU','57','58','59'],
  '2026-04': ['60','61','LHB','LU','62','63','64','65','66','67','LU','68','69','70','71','72','73','LU','74','75','76','77','78','79','LU','80','81','82','83','84',null],
  '2026-05': ['LHB','85','LU','86','87','88','89','90','91','LU','92','93','94','LHB','95','96','LU','97','98','99','100','101','102','LU','103','104','LHB','105','106','107','LHB'],
  '2026-06': ['LHB','108','109','110','111','LU','112','113','114','115','116','117','LU','118','119','LHB','120','121','122','LU','LS2','LS2','LS2','LS2','LS2','LS2','LS2','LU','LS2','LS2',null],
  '2026-07': ['LS2','LS2','LS2','LS2','LS2','LU','LS2','LS2','LS2','LS2','LS2','LU',null,null,null,null,null,null,'LU',null,null,null,null,null,null,'LU',null,null,null,null,null],
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
