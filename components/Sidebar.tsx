import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, Users, CalendarCheck, GraduationCap, School, LogOut, X, ChevronRight, ChevronLeft,
  UserCog, HeartHandshake, Tent, BookText, Smile, Link2, FileText, Contact, BookOpen, 
  UserCheck, Database, NotebookPen, Files, Activity, Building, Wallet, Camera, Book,
  Star, FolderOpen, BookOpenCheck, UsersRound, Briefcase, Settings, Award, ListTodo
} from 'lucide-react';
import { ViewState, User } from '../types';

interface SidebarProps {
  currentUser: User | null;
  currentView: ViewState;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

// 1. Dashboard dipisahkan sebagai item mandiri
const dashboardItem = { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'guru', 'siswa'] };

// 2. Overview KS dipisahkan sebagai item mandiri (Moved from Utama)
const supervisorItem = { id: 'supervisi', label: 'Overview KS', icon: Activity, roles: ['supervisor', 'admin'] };

// 3. Menu Groups (Updated)
const menuGroups = [
  {
    title: 'Utama',
    icon: Star,
    items: [
      { id: 'pendahuluan', label: 'Pendahuluan', icon: BookText, roles: ['admin', 'guru', 'supervisor'] },
    ]
  },
  {
    title: 'Data Induk',
    icon: FolderOpen,
    items: [
      { id: 'siswa', label: 'Data Siswa', icon: Users, roles: ['admin', 'guru', 'supervisor'] },
      { id: 'data-lulusan', label: 'Data Lulusan', icon: Award, roles: ['admin', 'guru', 'supervisor'] },
    ]
  },
  {
    title: 'Akademik',
    icon: BookOpenCheck,
    items: [
      { id: 'absensi', label: 'Absensi', icon: CalendarCheck, roles: ['admin', 'guru', 'supervisor'] },
      { id: 'agenda', label: 'Agenda', icon: ListTodo, roles: ['admin', 'guru', 'supervisor', 'siswa'] },
      { id: 'materi', label: 'Materi', icon: BookOpen, roles: ['admin', 'guru', 'supervisor', 'siswa'] },
      { id: 'nilai', label: 'Nilai & Rapor', icon: GraduationCap, roles: ['admin', 'guru', 'supervisor'] },
      { id: 'sikap', label: 'DPL & 7KAIH', icon: Smile, roles: ['admin', 'guru', 'supervisor'] },
      { id: 'jurnal-pembelajaran', label: 'Jurnal Pembelajaran', icon: NotebookPen, roles: ['admin', 'guru', 'supervisor'] },
      { id: 'laporan-pembelajaran', label: 'Laporan Pembelajaran', icon: FileText, roles: ['admin', 'guru', 'supervisor'] },
      { id: 'dokumentasi-pembelajaran', label: 'Dokumentasi Pembelajaran', icon: Camera, roles: ['admin', 'guru', 'supervisor'] },
    ]
  },
  {
    title: 'Kesiswaan',
    icon: UsersRound,
    items: [
      { id: 'monitor-siswa', label: 'Monitoring Siswa', icon: UserCheck, roles: ['admin', 'guru', 'supervisor'] },
      { id: 'konseling', label: 'Konseling & Perilaku', icon: HeartHandshake, roles: ['admin', 'guru', 'supervisor'] },
      { id: 'kegiatan', label: 'Ekstrakurikuler', icon: Tent, roles: ['admin', 'guru', 'supervisor', 'siswa'] },
      { id: 'buku-penghubung', label: 'Buku Penghubung', icon: BookOpen, roles: ['admin', 'guru', 'supervisor'] },
    ]
  },
  {
    title: 'Administrasi',
    icon: Briefcase,
    items: [
      { id: 'administrasi/kelas', label: 'Administrasi Kelas', icon: School, roles: ['admin', 'guru', 'supervisor'] },
      { id: 'administrasi/peminjaman-buku', label: 'Peminjaman Buku', icon: Book, roles: ['admin', 'guru', 'supervisor'] },
      { id: 'administrasi/sarana-prasarana', label: 'Sarana Prasarana', icon: Building, roles: ['admin', 'supervisor'] },
      { id: 'administrasi/dana-bos', label: 'Pengelolaan BOS', icon: Wallet, roles: ['admin', 'supervisor'] },
      { id: 'administrasi/bukti-dukung', label: 'Bukti Dukung', icon: Files, roles: ['admin', 'guru', 'supervisor'] },
    ]
  },
  {
    title: 'Pengaturan',
    icon: Settings,
    items: [
       { id: 'profil', label: 'Profil', icon: UserCog, roles: ['admin', 'guru', 'supervisor'] },
       { id: 'manajemen-akun', label: 'Manajemen Akun', icon: UserCog, roles: ['admin'] },
       { id: 'tautan-kepegawaian', label: 'Link Kepegawaian', icon: Link2, roles: ['admin'] },
       { id: 'cadangan-pemulihan', label: 'Backup & Restore', icon: Database, roles: ['admin'] },
    ]
  }
];

const Sidebar: React.FC<SidebarProps> = ({ currentUser, currentView, isOpen, onClose, onLogout }) => {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    let activeGroup = '';
    for (const group of menuGroups) {
        if (group.items.some(item => item.id === currentView || currentView.startsWith(item.id + '/'))) {
            activeGroup = group.title;
            break;
        }
    }
    if (activeGroup) {
        setOpenGroups({ [activeGroup]: true });
    } else {
        // Jika tampilan aktif (seperti Dashboard) tidak ada di grup manapun, tutup semua grup.
        setOpenGroups({});
    }
  }, [currentView]);

  const toggleGroup = (title: string) => {
      if (isCollapsed) {
          setIsCollapsed(false);
          setOpenGroups({ [title]: true });
      } else {
          setOpenGroups(prev => ({ ...prev, [title]: !prev[title] }));
      }
  };

  const renderMenuItem = (item: { id: string, label: string, icon: any, roles: string[] }) => {
    const Icon = item.icon;
    let isVisible = currentUser && item.roles.includes(currentUser.role);
    
    if (item.id === 'data-lulusan' && currentUser) {
      if (currentUser.role === 'guru') {
        const position = currentUser.position?.toLowerCase() || '';
        if (!position.includes('kelas 6')) {
          isVisible = false;
        }
      }
    }
    
    if (!isVisible) return null;

    const path = item.id === 'dashboard' ? '/' : `/${item.id}`;

    return (
      <NavLink
        key={item.id}
        to={path}
        onClick={onClose}
        title={isCollapsed ? item.label : undefined}
        className={({ isActive }) => `w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} text-left ${isCollapsed ? 'px-2' : 'px-4'} py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden ${
          isActive 
            ? 'bg-gradient-to-r from-[#5AB2FF] to-[#A0DEFF] text-white shadow-lg shadow-[#5AB2FF]/30 translate-x-1' 
            : 'text-slate-500 hover:bg-[#FFF9D0]/50 hover:text-[#5AB2FF] hover:translate-x-1'
        }`}
      >
        {({ isActive }) => (
          <>
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} relative z-10 w-full`}>
              <Icon size={20} className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-[#5AB2FF] transition-colors'} ${isCollapsed ? 'mx-auto' : ''}`} />
              {!isCollapsed && (
                <span className={`font-medium whitespace-nowrap ${isActive ? 'text-white' : 'text-slate-600 group-hover:text-[#5AB2FF]'}`}>{item.label}</span>
              )}
            </div>
            {isActive && !isCollapsed && <ChevronRight size={16} className="text-[#CAF4FF] animate-pulse shrink-0" />}
          </>
        )}
      </NavLink>
    );
  };


  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 z-20 bg-gray-900/50 backdrop-blur-sm transition-opacity lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sidebar Container */}
      <div className={`fixed inset-y-0 left-0 z-30 ${isCollapsed ? 'w-20' : 'w-72'} bg-white border-r border-[#CAF4FF] text-slate-600 transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto flex flex-col shadow-xl lg:shadow-none ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Header Logo */}
        <div className={`p-8 pb-4 relative ${isCollapsed ? 'px-4' : ''}`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} mb-8`}>
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
              <div className="w-12 h-12 flex items-center justify-center shrink-0">
                <img 
                  src="https://png.pngtree.com/png-clipart/20230928/original/pngtree-education-school-logo-design-kids-student-learning-vector-png-image_12898111.png" 
                  alt="Logo SAGARA" 
                  className="w-full h-full object-contain animate-float"
                />
              </div>
              {!isCollapsed && (
                <div className="flex flex-col overflow-hidden">
                  <h1 className="text-xl font-extrabold tracking-tight text-slate-800 flex items-center">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5AB2FF] to-[#A0DEFF]">SAGARA</span>
                  </h1>
                  <span className="text-xs font-medium text-slate-400 mt-0.5 truncate">
                      UPT SD Negeri Remen 2
                  </span>
                </div>
              )}
            </div>
            <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-slate-600 transition-colors">
              <X size={24} />
            </button>
          </div>
          
          {/* Desktop Collapse Toggle */}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex absolute top-10 -right-3 bg-white border border-[#CAF4FF] rounded-full p-1 text-slate-400 hover:text-[#5AB2FF] shadow-sm z-50 transition-colors"
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          
          {/* Render item Dashboard & Overview KS sebagai tombol mandiri */}
          <div className="py-1 space-y-1">
            {renderMenuItem(dashboardItem)}
            {renderMenuItem(supervisorItem)}
          </div>

          {menuGroups.map((group) => {
            const visibleItems = group.items.filter(item => currentUser && item.roles.includes(currentUser.role));
            if (visibleItems.length === 0) return null;

            const isGroupOpen = openGroups[group.title] || false;

            return (
              <div key={group.title} className="py-1">
                <button
                  onClick={() => toggleGroup(group.title)}
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase tracking-wider rounded-lg hover:bg-gray-50 transition-colors`}
                  title={isCollapsed ? group.title : undefined}
                >
                  {isCollapsed ? (
                    <group.icon size={18} className="text-slate-400 hover:text-[#5AB2FF] transition-colors" />
                  ) : (
                    <>
                      <div className="flex items-center space-x-2">
                        <group.icon size={14} className="text-slate-400" />
                        <span>{group.title}</span>
                      </div>
                      <ChevronRight size={14} className={`transform transition-transform duration-200 ${isGroupOpen ? 'rotate-90' : ''}`} />
                    </>
                  )}
                </button>
                
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isGroupOpen ? 'max-h-96' : 'max-h-0'}`}>
                  <div className="pt-1 space-y-1">
                    {visibleItems.map(item => renderMenuItem(item))}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>
      </div>
    </>
  );
};

export default Sidebar;