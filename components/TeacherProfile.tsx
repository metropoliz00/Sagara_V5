
import React, { useState, useEffect } from 'react';
import { Save, User, Building, Printer, FileText, Loader2, Code } from 'lucide-react';
import { TeacherProfileData, SchoolProfileData } from '../types';

// Import Sub-Components
import TeacherIdentityTab from './profile/TeacherIdentityTab';
import SchoolDataTab from './profile/SchoolDataTab';
import DeveloperInfoTab from './profile/DeveloperInfoTab';

interface TeacherProfileProps {
  initialTeacher: TeacherProfileData;
  initialSchool: SchoolProfileData;
  onSave: (type: 'teacher' | 'school', data: any) => Promise<void>;
  onShowNotification: (message: string, type: 'success' | 'error' | 'warning') => void;
  userRole?: string;
}

type ProfileTab = 'profile' | 'school' | 'developer';

const TeacherProfile: React.FC<TeacherProfileProps> = ({ initialTeacher, initialSchool, onSave, onShowNotification, userRole }) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('profile');
  const [isSaving, setIsSaving] = useState(false);
  
  const [profile, setProfile] = useState<TeacherProfileData>(initialTeacher);
  const [school, setSchool] = useState<SchoolProfileData>(initialSchool);

  // Sync state if props change (e.g., initial fetch completes)
  useEffect(() => {
    setProfile(initialTeacher);
  }, [initialTeacher]);

  useEffect(() => {
    setSchool(initialSchool);
  }, [initialSchool]);

  const canEditSchool = userRole === 'admin';

  const handlePrint = () => {
    const areaPrint = document.getElementById('printContent');
    if (areaPrint) {
        let printWindow = window.open('', '', 'width=900,height=600');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                <head>
                    <title>Cetak Cover Administrasi</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Tinos:wght@400;700&display=swap');
                        
                        @page { 
                            size: A4; 
                            margin: 0; /* Reset margin browser */
                        }
                        
                        body { 
                            font-family: 'Tinos', serif; 
                            background-color: white;
                            margin: 0;
                            padding: 0;
                            -webkit-print-color-adjust: exact;
                        }

                        /* Container Utama A4 - Margin 1cm (10mm) dari tepi kertas */
                        .page-container {
                            width: 210mm;
                            height: 297mm;
                            padding: 10mm; 
                            box-sizing: border-box;
                            position: relative;
                            display: flex;
                            flex-direction: column;
                        }

                        /* Border Garis Ganda di sekeliling konten */
                        .border-content {
                            border: 3px double #000;
                            width: 100%;
                            height: 100%;
                            display: flex;
                            flex-direction: column;
                            justify-content: space-between;
                            align-items: center;
                            padding: 20px 25px; /* Padding dalam dikurangi agar logo bisa lebih ke kiri */
                            position: relative;
                        }

                        /* Helper untuk Header agar Logo di Kiri & Teks Center */
                        .header-wrapper {
                            width: 100%;
                            position: relative;
                            display: flex;
                            justify-content: center; /* Teks di tengah */
                            align-items: center;
                            margin-bottom: 20px;
                            text-align: center;
                        }

                        .logo-kiri {
                            position: absolute;
                            left: 0;
                            top: 50%;
                            transform: translateY(-50%);
                            max-height: 100px;
                            width: auto;
                            margin-left: -10px; /* Geser sedikit lebih ke kiri mendekati garis border */
                        }
                    </style>
                </head>
                <body>
                    <div class="page-container">
                        <div class="border-content">
                            ${areaPrint.innerHTML}
                        </div>
                    </div>
                    <script>
                        setTimeout(() => {
                            window.print();
                            // window.close(); 
                        }, 1000); 
                    </script>
                </body>
                </html>
            `);
            printWindow.document.close();
        }
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      if (activeTab === 'profile') {
        await onSave('teacher', profile);
      } else if (activeTab === 'school' || activeTab === 'developer') {
        if (!canEditSchool) {
            onShowNotification('Anda tidak memiliki akses untuk mengubah data ini.', 'error');
            return;
        }
        await onSave('school', school);
      }
      onShowNotification('Data berhasil disimpan!', 'success');
    } catch (e) {
      console.error(e);
      onShowNotification('Gagal menyimpan data. Pastikan koneksi internet stabil.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Profil & Data Sekolah</h2>
          <p className="text-gray-500">Kelola identitas guru, informasi sekolah, dan cetak administrasi.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Navigation Cards - Hidden on Print */}
        <div className="col-span-1 space-y-4 no-print">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2">
            <button 
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'profile' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <User size={20} />
              <span>Identitas Guru</span>
            </button>
            
            {canEditSchool && (
                <button 
                  onClick={() => setActiveTab('school')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'school' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <Building size={20} />
                  <span>Data Sekolah</span>
                </button>
            )}

            {canEditSchool && (
              <button 
                onClick={() => setActiveTab('developer')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'developer' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Code size={20} />
                <span>Info Pengembang</span>
              </button>
            )}
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl shadow-lg p-6 text-white text-center">
             <div className="mx-auto w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-4">
                <FileText size={32} />
             </div>
             <h3 className="font-bold text-lg mb-1">Cover Administrasi</h3>
             <p className="text-indigo-100 text-sm mb-4">Cetak otomatis cover perangkat pembelajaran dengan data terbaru.</p>
             <button onClick={handlePrint} className="w-full bg-white text-indigo-700 font-bold py-2 rounded-lg hover:bg-indigo-50 transition-colors flex items-center justify-center">
               <Printer size={18} className="mr-2"/> Cetak Cover
             </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="col-span-1 lg:col-span-2 print:hidden">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:p-8 relative overflow-hidden">
             
             {activeTab === 'profile' && <TeacherIdentityTab profile={profile} setProfile={setProfile} onSave={handleSaveProfile} isSaving={isSaving} />}
             
             {activeTab === 'school' && canEditSchool && <SchoolDataTab school={school} setSchool={setSchool} onSave={handleSaveProfile} isSaving={isSaving} isReadOnly={!canEditSchool} />}
             
             {activeTab === 'developer' && canEditSchool && (
                <DeveloperInfoTab 
                    school={school}
                    setSchool={setSchool}
                    isReadOnly={!canEditSchool}
                />
             )}

             {/* General Save Button for Developer Tab */}
             {activeTab === 'developer' && canEditSchool && (
                <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                    <button 
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        <span>{isSaving ? 'Menyimpan...' : 'Simpan Info Pengembang'}</span>
                    </button>
                </div>
             )}
          </div>
        </div>
      </div>

      {/* --- HIDDEN PRINT CONTENT TEMPLATE --- */}
      <div style={{ display: 'none' }}>
         <div id="printContent">
            
            {/* 1. Header Section */}
            <div className="header-wrapper">
                {/* Logo Kabupaten (Kiri) */}
                {school.regencyLogo ? (
                    <img src={school.regencyLogo} alt="Logo Kab" className="logo-kiri" />
                ) : (
                    // Placeholder space if no logo
                    <div className="logo-kiri" style={{ width: '80px', height: '80px' }}></div> 
                )}
                
                {/* Teks Header (Tengah) */}
                <div>
                    <h2 className="text-xl font-bold uppercase tracking-wider text-black">PEMERINTAH KABUPATEN TUBAN</h2>
                    <h3 className="text-2xl font-bold uppercase tracking-widest mt-1 text-black">DINAS PENDIDIKAN</h3>
                    <p className="text-sm font-bold uppercase mt-1 text-black tracking-wide">{school.name || 'NAMA SEKOLAH'}</p>
                </div>
            </div>

            {/* Garis Header */}
            <div className="w-full border-b-4 border-double border-black mb-10"></div>

            {/* 2. Main Title */}
            <div className="text-center w-full">
                <h1 className="text-4xl font-extrabold uppercase tracking-wide leading-snug text-black">
                    PERANGKAT PEMBELAJARAN
                </h1>
                <div className="my-6">
                    <h2 className="text-2xl font-bold uppercase text-black mb-2">ADMINISTRASI GURU KELAS {profile.teachingClass}</h2>
                    <div className="w-1/2 mx-auto h-1 bg-black mb-4"></div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-xl font-bold uppercase text-black">TAHUN PELAJARAN {school.year || '20.../20...'}</p>
                  <p className="text-lg font-bold uppercase text-black">SEMESTER {school.semester === '1' ? '1 (GANJIL)' : school.semester === '2' ? '2 (GENAP)' : school.semester}</p>
                </div>
            </div>

            {/* 3. School Logo (Center Image) */}
            <div className="flex justify-center items-center my-8 flex-1">
               {school.schoolLogo ? (
                   <img src={school.schoolLogo} alt="Logo Sekolah" className="h-60 w-60 object-contain" />
               ) : (
                   <div className="w-48 h-48 border-4 border-dashed border-gray-300 flex items-center justify-center rounded-full">
                      <span className="text-gray-400 text-sm font-bold">Logo Sekolah</span>
                   </div>
               )}
            </div>

            {/* 4. Footer Info */}
            <div className="w-full text-center mt-auto mb-4">
                <div className="mb-8">
                    <p className="text-md font-bold text-black mb-2 uppercase tracking-widest">DISUSUN OLEH:</p>
                    <div className="inline-block border-2 border-black px-8 py-4 rounded-xl">
                        <p className="text-2xl font-bold text-black underline decoration-2 underline-offset-4">{(profile.name && profile.name !== 'undefined') ? profile.name : 'NAMA GURU'}</p>
                        <p className="text-lg font-bold text-black mt-2">NIP. {profile.nip || '.........................'}</p>
                    </div>
                </div>

                <div>
                    <h2 className="text-2xl font-bold uppercase text-black">{school.name || 'NAMA SEKOLAH'}</h2>
                    <p className="text-md uppercase max-w-xl mx-auto leading-relaxed font-bold text-black">{school.address || 'ALAMAT SEKOLAH'}</p>
                </div>
            </div>

         </div>
      </div>

    </div>
  );
};

export default TeacherProfile;
