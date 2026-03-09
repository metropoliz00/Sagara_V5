
import React, { useRef } from 'react';
import { Upload, Printer, Save, Loader2, Trash2 } from 'lucide-react';
import { TeacherProfileData } from '../../types';
import { compressImage } from '../../utils/imageHelper';
import { useModal } from '../../context/ModalContext';

interface TeacherIdentityTabProps {
  profile: TeacherProfileData;
  setProfile: React.Dispatch<React.SetStateAction<TeacherProfileData>>;
  onSave: () => Promise<void>;
  isSaving: boolean;
}

const TeacherIdentityTab: React.FC<TeacherIdentityTabProps> = ({ profile, setProfile, onSave, isSaving }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showAlert } = useModal();

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        // Kompres gambar menjadi thumbnail ringan (300px)
        const resizedBase64 = await compressImage(file, 300, 0.6);
        setProfile({ ...profile, photo: resizedBase64 });
      } catch (error) {
        console.error("Error compressing image", error);
        showAlert("Gagal memproses gambar. Format tidak didukung.", "error");
      }
    }
  };

  const handleSignatureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        // Kompres agresif untuk TTD agar muat di sheet (300px cukup untuk TTD)
        const resizedBase64 = await compressImage(file, 300, 0.6);
        setProfile({ ...profile, signature: resizedBase64 });
      } catch (error) {
        console.error("Gagal upload TTD", error);
        showAlert("Gagal memproses tanda tangan.", "error");
      }
    }
  };

  const handleRemoveSignature = () => {
    setProfile({ ...profile, signature: '' });
  };

  const triggerPhotoUpload = () => {
    fileInputRef.current?.click();
  };

  const printData = () => {
    const areaPrint = document.getElementById('areaPrint');
    if (areaPrint) {
        const printWindow = window.open('', '', 'width=800,height=600');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                <head>
                    <title>Cetak Biodata Guru</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Tinos:wght@400;700&display=swap');
                        body { 
                            font-family: 'Tinos', serif; 
                            padding: 40px; 
                            color: #000;
                        }
                        .header { 
                            text-align: center; 
                            margin-bottom: 40px; 
                        }
                        .header h1 {
                            font-size: 20px;
                            font-weight: bold;
                            text-transform: uppercase;
                            margin: 0;
                            text-decoration: underline;
                        }
                        .container {
                            display: flex;
                            align-items: flex-start;
                            gap: 30px;
                        }
                        .photo-box {
                            width: 4cm;
                            height: 6cm;
                            border: 1px solid #000;
                            object-fit: cover;
                            flex-shrink: 0;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            background: #f0f0f0;
                        }
                        .photo-box img {
                            width: 100%;
                            height: 100%;
                            object-fit: cover;
                        }
                        .data-table {
                            flex-grow: 1;
                            border-collapse: collapse;
                        }
                        .data-table td {
                            padding: 6px 4px;
                            font-size: 16px;
                            vertical-align: top;
                        }
                        .label {
                            width: 160px;
                        }
                        .separator {
                            width: 20px;
                            text-align: center;
                        }
                        .footer {
                            margin-top: 60px;
                            display: flex;
                            justify-content: flex-end;
                            padding-right: 20px;
                        }
                        .signature-box {
                            text-align: center;
                            width: 280px;
                        }
                        .signature-box p {
                            margin: 4px 0;
                            font-size: 16px;
                        }
                        .sig-img {
                            height: 80px;
                            margin: 10px auto;
                            display: block;
                            object-fit: contain;
                        }
                        .name {
                            font-weight: bold;
                            font-size: 16px;
                            margin-top: 5px;
                            /* Sesuai request: Tidak ada garis bawah */
                            text-decoration: none; 
                        }
                    </style>
                </head>
                <body>
                    ${areaPrint.innerHTML}
                    <script>
                        setTimeout(() => {
                            window.print();
                            window.close();
                        }, 500);
                    </script>
                </body>
                </html>
            `);
            printWindow.document.close();
        }
    }
  };

  // Helper date formatter
  const currentDate = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
  });

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-start">
            <div className="flex items-center space-x-4 mb-6">
                <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-4 border-indigo-50">
                    <img 
                        src={profile.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.name}`} 
                        alt="Profile" 
                        className="w-full h-full object-cover" 
                    />
                </div>
                <div>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handlePhotoUpload} 
                        className="hidden" 
                        accept="image/*"
                    />
                    <button 
                        onClick={triggerPhotoUpload}
                        className="text-sm text-indigo-600 font-medium hover:underline flex items-center"
                    >
                        <Upload size={14} className="mr-1" /> Ganti Foto
                    </button>
                    <p className="text-xs text-gray-400 mt-1">Maks. 2MB (JPG/PNG)</p>
                </div>
            </div>
            
            <button 
                onClick={printData}
                className="flex items-center space-x-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
                <Printer size={16} />
                <span>Cetak Biodata</span>
            </button>
        </div>

        {/* Layout Baru Sesuai Request */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                <input type="text" placeholder="Nama Lengkap" value={profile.name} onChange={(e) => setProfile({...profile, name: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">NIP</label>
                <input type="text" placeholder="NIP" value={profile.nip} onChange={(e) => setProfile({...profile, nip: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">NUPTK</label>
                <input type="text" placeholder="NUPTK" value={profile.nuptk || ''} onChange={(e) => setProfile({...profile, nuptk: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tempat, Tgl Lahir</label>
                <input type="text" placeholder="Tempat, dd-mm-yyyy" value={profile.birthInfo || ''} onChange={(e) => setProfile({...profile, birthInfo: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pendidikan Terakhir</label>
                <input type="text" placeholder="Pendidikan Terakhir" value={profile.education || ''} onChange={(e) => setProfile({...profile, education: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jabatan Guru</label>
                <input type="text" placeholder="Jabatan Guru" value={profile.position || ''} onChange={(e) => setProfile({...profile, position: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pangkat / Gol</label>
                <input type="text" placeholder="Pangkat / Gol" value={profile.rank || ''} onChange={(e) => setProfile({...profile, rank: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
            </div>

            <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tugas Mengajar Kelas (Sesuai ID Kelas)</label>
                <input type="text" placeholder="Tugas Mengajar Kelas" value={profile.teachingClass || ''} onChange={(e) => setProfile({...profile, teachingClass: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
                <p className="text-[10px] text-gray-400 mt-1">*Disarankan sesuai dengan Class ID akun Anda.</p>
            </div>
        </div>

        {/* Section Kontak & Alamat */}
        <div className="pt-6 border-t mt-4">
            <h4 className="text-sm font-bold text-gray-800 uppercase mb-4 border-l-4 border-indigo-600 pl-3">Kontak & Alamat</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input type="text" placeholder="Alamat Email" value={profile.email} onChange={(e) => setProfile({...profile, email: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">No HP</label>
                    <input type="text" placeholder="Nomor Handphone" value={profile.phone} onChange={(e) => setProfile({...profile, phone: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
                    <textarea rows={2} placeholder="Alamat Lengkap" value={profile.address} onChange={(e) => setProfile({...profile, address: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
                </div>
            </div>
        </div>

        {/* Section Tanda Tangan */}
        <div className="pt-6 border-t mt-4">
            <h4 className="text-sm font-bold text-gray-800 uppercase mb-4 border-l-4 border-indigo-600 pl-3">Tanda Tangan Digital</h4>
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center hover:bg-gray-100 transition-colors">
                {!profile.signature ? (
                    <label className="cursor-pointer flex flex-col items-center group">
                        <div className="p-3 bg-white rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">
                            <Upload size={24} className="text-indigo-500"/>
                        </div>
                        <span className="text-sm font-medium text-gray-600 group-hover:text-indigo-600 transition-colors">Upload Tanda Tangan</span>
                        <span className="text-xs text-gray-400 mt-1">Format PNG Transparan (Max 2MB)</span>
                        <input type="file" accept="image/*" onChange={handleSignatureUpload} className="hidden" />
                    </label>
                ) : (
                    <div className="relative group w-full max-w-xs flex justify-center">
                        <img src={profile.signature} alt="Signature" className="h-24 object-contain" />
                        <button 
                            onClick={handleRemoveSignature} 
                            className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-200 shadow-sm"
                            title="Hapus Tanda Tangan"
                        >
                            <Trash2 size={16}/>
                        </button>
                    </div>
                )}
            </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
            <button 
                onClick={onSave}
                disabled={isSaving}
                className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                <span>{isSaving ? 'Menyimpan...' : 'Simpan Identitas'}</span>
            </button>
        </div>

        {/* --- HIDDEN AREA FOR PRINTING --- */}
        <div id="areaPrint" style={{ display: 'none' }}>
            <div className="header">
                <h1>BIODATA GURU KELAS</h1>
            </div>
            <div className="container">
                {/* Kiri: Foto 4x6 */}
                <div className="photo-box">
                    {profile.photo ? (
                        <img src={profile.photo} alt="Foto Guru" />
                    ) : (
                        <span>4x6</span>
                    )}
                </div>

                {/* Kanan: Data Profil */}
                <table className="data-table">
                    <tbody>
                        <tr>
                            <td className="label">Nama Lengkap</td>
                            <td className="separator">:</td>
                            <td>{(profile.name && profile.name !== 'undefined') ? profile.name : '-'}</td>
                        </tr>
                        <tr>
                            <td className="label">NIP</td>
                            <td className="separator">:</td>
                            <td>{profile.nip}</td>
                        </tr>
                        <tr>
                            <td className="label">NUPTK</td>
                            <td className="separator">:</td>
                            <td>{profile.nuptk || '-'}</td>
                        </tr>
                        <tr>
                            <td className="label">Tempat, Tgl Lahir</td>
                            <td className="separator">:</td>
                            <td>{profile.birthInfo || '-'}</td>
                        </tr>
                        <tr>
                            <td className="label">Pendidikan Terakhir</td>
                            <td className="separator">:</td>
                            <td>{profile.education || '-'}</td>
                        </tr>
                         <tr>
                            <td className="label">Jabatan</td>
                            <td className="separator">:</td>
                            <td>{profile.position || '-'}</td>
                        </tr>
                        <tr>
                            <td className="label">Pangkat / Gol</td>
                            <td className="separator">:</td>
                            <td>{profile.rank || '-'}</td>
                        </tr>
                        <tr>
                            <td className="label">Tugas Mengajar</td>
                            <td className="separator">:</td>
                            <td>Kelas {profile.teachingClass}</td>
                        </tr>
                        <tr>
                            <td className="label">Email</td>
                            <td className="separator">:</td>
                            <td>{profile.email || '-'}</td>
                        </tr>
                        <tr>
                            <td className="label">No HP</td>
                            <td className="separator">:</td>
                            <td>{profile.phone || '-'}</td>
                        </tr>
                        <tr>
                            <td className="label">Alamat Rumah</td>
                            <td className="separator">:</td>
                            <td>{profile.address || '-'}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Footer Tanda Tangan */}
            <div className="footer">
                <div className="signature-box">
                    <p>Tuban, {currentDate}</p>
                    <p>Wali Kelas {profile.teachingClass}</p>
                    
                    {/* Space for Signature Image */}
                    <div style={{ minHeight: '80px', margin: '10px 0' }}>
                        {profile.signature && <img src={profile.signature} className="sig-img" alt="TTD"/>}
                    </div>
                    
                    {/* Nama dan NIP (Tanpa Garis Bawah) */}
                    <p className="name">{(profile.name && profile.name !== 'undefined') ? profile.name : '-'}</p>
                    <p>NIP. {profile.nip}</p>
                </div>
            </div>
        </div>

    </div>
  );
};

export default TeacherIdentityTab;
