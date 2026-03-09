
import React, { useState } from 'react';
import { BookText, Award, Briefcase, ClipboardCheck, Printer } from 'lucide-react';

const IntroductionView: React.FC = () => {
  const [activeTab, setActiveTab] = useState('pengantar');

  const tabs = [
    { id: 'pengantar', label: 'Kata Pengantar', icon: BookText },
    { id: 'pancasila', label: 'Pancasila', iconUrl: 'https://image2url.com/r2/default/images/1770891208664-89a55582-b8dd-40b7-9070-0821d605db0f.png' },
    { id: 'ikrar', label: 'Ikrar Guru', icon: Award },
    { id: 'tugas', label: 'Tugas Guru', icon: Briefcase },
    { id: 'tatib', label: 'Tata Tertib', icon: ClipboardCheck },
  ];

  const handlePrint = () => {
    const areaPrint = document.getElementById('areaPrint');
    if (areaPrint) {
        let printWindow = window.open('', '', 'width=800,height=600');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                <head>
                    <title>Cetak Dokumen</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Tinos:wght@400;700&display=swap');
                        @page { size: A4; margin: 2.54cm; }
                        body { 
                            font-family: 'Tinos', serif;
                            margin: 0;
                            padding: 20px;
                        }
                        /* Restore list styles and spacing for print */
                        ol { list-style-type: decimal; margin-left: 1.5rem; }
                        ul { list-style-type: disc; margin-left: 1.5rem; }
                        li { margin-bottom: 0.5rem; }
                        p { margin-bottom: 1rem; text-align: justify; }
                        .text-center { text-align: center; }
                        .font-bold { font-weight: bold; }
                    </style>
                </head>
                <body>
                    ${areaPrint.innerHTML}
                    <script>
                        setTimeout(() => {
                            window.print();
                            window.close();
                        }, 1000);
                    </script>
                </body>
                </html>
            `);
            printWindow.document.close();
        }
    }
  };

  const renderContent = () => {
    return (
        <div className="font-serif text-black leading-relaxed">
            {activeTab === 'pengantar' && (
                <>
                    <h2 className="text-2xl font-bold text-center mb-8 uppercase tracking-wider">Kata Pengantar</h2>
                    <p className="text-justify indent-8 mb-4">Sejalan dengan tuntutan masyarakat dan perkembangan global pendidikan di Indonesia mengalami perubahan yang mendasar. Sekolah Dasar merupakan salah satu jenis pendidikan diantara bermacam-macam jenis lembaga pendidikan dalam masyarakat dan merupakan wadah pelaksanaan tugas-tugas yang berhubungan dengan teknis edukatif dan tugas-tugas administrasi ke arah pencapaian tujuan pendidikan.</p>
                    <p className="text-justify indent-8 mb-4">Maju mundurnya suatu bangsa tergantung pada tingkat pendidikan masyarakatnya, dan semakin maju tingkat pendidikan masyarakatnya semakin maju pula bangsa tersebut.</p>
                    <p className="text-justify indent-8 mb-4">Sebagaimana yang diamanatkan dalam program pendidikan nasional khususnya dalam peningkatan kwalitas mutu pendidikan suatu Sekolah Dasar dasar terlepas dari pembenaran administrasinya untuk dapat mengetahui sampai seberapa jauh hasil kemajuan yang telah dicapai pada tiap-tiap Sekolah Dasar untuk dijadikan tolak ukur untuk mencapai arah pencapaian tujuan.</p>
                    <p className="text-justify indent-8 mb-4">Karena begitu pentingnya Administrasi Sekolah Dasar sebagai penunjang dalam penyelenggaraan pendidikan pengajaran kami menyusun/menyajikan buku “Kumpulan Administrasi Kelas” dengan harapan buku ini dapat membantu/meringankan para guru/kepala Sekolah Dasar dalam menjalankan tugasnya meningkatkan kwalitas pendidikan yang diharapkan.</p>
                    <p className="text-justify indent-8">Demikian harapan kami, semoga bermanfaat.</p>
                </>
            )}

            {activeTab === 'pancasila' && (
                <>
                    <div className="flex justify-center mb-6">
                        <img 
                            src="https://image2url.com/r2/default/images/1770891208664-89a55582-b8dd-40b7-9070-0821d605db0f.png" 
                            alt="Garuda Pancasila" 
                            className="h-32 w-auto object-contain"
                        />
                    </div>
                    <h2 className="text-2xl font-bold text-center mb-8 uppercase tracking-wider">Pancasila</h2>
                    <ol className="list-decimal list-inside space-y-4 text-lg">
                        <li>Ketuhanan Yang Maha Esa</li>
                        <li>Kemanusiaan yang adil dan beradab</li>
                        <li>Persatuan Indonesia</li>
                        <li>Kerakyatan yang dipimpin oleh hikmat kebijaksanaan dalam permusyawaratan perwakilan</li>
                        <li>Keadilan sosial bagi seluruh rakyat Indonesia</li>
                    </ol>
                </>
            )}

            {activeTab === 'ikrar' && (
                <>
                    <h2 className="text-2xl font-bold text-center mb-8 uppercase tracking-wider">Ikrar Guru Indonesia</h2>
                    <ol className="list-decimal list-inside space-y-3">
                        <li>Kami Guru Indonesia adalah insan pendidik bangsa yang beriman dan bertakwa kepada Tuhan Yang Maha Esa.</li>
                        <li>Kami Guru Indonesia adalah Pengembang dan Pelaksana cita-cita proklamasi kemerdekaan Republik Indonesia, Pembela dan pengamal Undang-Undang Dasar 1945.</li>
                        <li>Kami Guru Indonesia bertekad bulat mewujudkan tujuan nasional dalam mencerdasakan kehidupan bangsa.</li>
                        <li>Kami Guru Indonesia bersatu dalam suatu wadah organisasi perjuangan Persatuan Guru Republik Indonesia membina persatuan dan kesatuan bangsa yang berwatak kekeluargaan.</li>
                        <li>Kami Guru Indonesia menjungjung tinggi Kode Etik Guru Indonesia sebagai pedoman tingkah laku profesi dalam pengabdian terhadap Bangsa, Negara serta Kemanusiaan.</li>
                    </ol>
                </>
            )}

            {activeTab === 'tugas' && (
                <>
                    <h2 className="text-2xl font-bold text-center mb-8 uppercase tracking-wider">Tugas dan Kewajiban Guru</h2>
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-bold mb-2">1. Dalam memelihara wibawa dan keteladanan, guru wajib:</h3>
                            <ol className="list-[lower-alpha] list-inside pl-6 space-y-1">
                                <li>Menempatkan diri sebagai suri teladan bagi siswa dan masyarakat.</li>
                                <li>Cinta dan bangga terhadap sekolahnya.</li>
                                <li>Bangga atas profesinya sebagai guru.</li>
                                <li>Selalu Kreatif dan Inovatif dalam mengelola kelas.</li>
                                <li>Selalu berpenampilan sopan, rapi dan bersih.</li>
                                <li>Meningkatkan kecakapan dan kemampuan profesional guru.</li>
                                <li>Selalu menjaga nama baik Sekolah Dasar dan memegang teguh rahasia jabatan.</li>
                            </ol>
                        </div>
                        <div>
                            <h3 className="font-bold mb-2">2. Dalam sikap dan disiplin kerja, guru wajib:</h3>
                            <ol className="list-[lower-alpha] list-inside pl-6 space-y-1">
                                <li>Hadir di Sekolah Dasar 15 menit sebelum pelajaran dimulai dan pulang setelah selesai.</li>
                                <li>Menandatangani daftar hadir.</li>
                                <li>Memberitahukan kepada kepala Sekolah Dasar apabila berhalangan hadir.</li>
                                <li>Menyerahkan persiapan harian kepada kepala sekolah untuk ditandatangani.</li>
                                <li>Tidak meninggalkan sekolah, tanpa izin kepala sekolah.</li>
                                <li>Tidak meninggalkan Sekolah Dasar sebelum libur dan kembali sebelum hari Sekolah Dasar dimulai.</li>
                                <li>Tidak mengajar di Sekolah Dasar lain tanpa izin resmi dari pejabat yang berwenang.</li>
                                <li>Tidak merokok dan makan di dalam kelas pada waktu mengajar.</li>
                                <li>Bertanggung jawab atas ketertiban sekolah.</li>
                                <li>Ikut mengawasi dana dan fasilitas sekolah.</li>
                                <li>Berpartisipasi aktif dalam melaksanakan program sekolah.</li>
                                <li>Mematuhi dan melaksanakan tata tertib sekolah.</li>
                                <li>Mematuhi semua peraturan yang berlaku bagi PNS.</li>
                                <li>Loyal terhadap atasan.</li>
                            </ol>
                        </div>
                        <div>
                            <h3 className="font-bold mb-2">3. Dalam tertib pelaksanaan tugas, guru wajib:</h3>
                            <ol className="list-[lower-alpha] list-inside pl-6 space-y-1">
                                <li>Memiliki rasa kasih sayang terhadap semua siswa.</li>
                                <li>Membuat Program Semester.</li>
                                <li>Membuat design pembelajaran/silabus, menguasai materi, dan metode mengajar serta terampil menggunakan alat peraga.</li>
                                <li>Memeriksa dan menilai setiap tugas siswa.</li>
                                <li>Melaksanakan program perbaikan dan pengayaan bagi siswa.</li>
                                <li>Ikut serta dan berperan aktif dalam semua program kegiatan KKG dalam gugus sekolah.</li>
                                <li>Ikut serta dalam Upacara bendera, peringatan hari besar yang diselenggarakan sekolah.</li>
                                <li>Mengawasi siswa dalam melaksanakan tugas kebersihan.</li>
                                <li>Membiasakan siswa berbaris sebelum masuk dan memeriksa kebersihan rambut, badan, gigi, kuku, pakaian, sepatu, dll.</li>
                                <li>Mengerjakan administrasi kelas secara baik dan rutin.</li>
                                <li>Mengisi Catatan pribadi siswa.</li>
                            </ol>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'tatib' && (
                <>
                    <h2 className="text-2xl font-bold text-center mb-8 uppercase tracking-wider">Tata Tertib Kelas</h2>
                    <ol className="list-decimal list-inside space-y-2">
                        <li>Anak-anak harus sudah hadir di Sekolah sebelum jam pelajaran dimulai.</li>
                        <li>Anak-anak harus berseragam yang rapi dan bersih.</li>
                        <li>Sebelum lonceng/bel berbunyi petugas kebersihan kelas harus sudah selesai membersihkan kelasnya.</li>
                        <li>Setelah lonceng/bel berbunyi mulai belajar, anak-anak harus berbaris dengan tertib dan teratur di depan kelas masing-masing yang dipimpin oleh ketua kelas.</li>
                        <li>Sebelum belajar diawali dengan membaca do’a dan penghormatan kepada guru.</li>
                        <li>Akhir pelajaran ditutup dengan membaca do’a dan penghormatan kepada guru.</li>
                        <li>Setiap hari senin harus mengikuti upacara bendera.</li>
                        <li>Anak-anak harus sopan, taat dan patuh kepada guru/kepala sekolah.</li>
                        <li>Anak-anak harus memelihara ketertiban, keindahan dan kebersihan alat-alat pelajaran dan kelasnya.</li>
                        <li>Anak-anak dilarang mencoreti bangku, meja, pintu, jendela dan tembok Sekolah Dasar dan kelasnya.</li>
                        <li>Anak-anak harus memelihara tanam-tanaman di sekolah.</li>
                        <li>Anak-anak dilarang mengganggu kelas lain yang sedang belajar.</li>
                        <li>Anak-anak harus berjiwa jujur dan satria dalam setiap tindakan dan perbuatan.</li>
                        <li>Bila tidak masuk Sekolah harus memberitahukan kepada guru/kepala sekolah.</li>
                        <li>Bila hendak keluar kelas harus meminta izin.</li>
                    </ol>
                </>
            )}
        </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Pendahuluan</h2>
          <p className="text-gray-500">Dasar-dasar dan landasan kerja guru kelas.</p>
        </div>
        
        <button 
            onClick={handlePrint}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
        >
            <Printer size={18} />
            <span>Cetak Dokumen</span>
        </button>
      </div>
      
      <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-200 shadow-sm overflow-x-auto no-print">
        {tabs.map(tab => {
          const Icon = (tab as any).icon;
          const iconUrl = (tab as any).iconUrl;
          return (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              {Icon && <Icon size={16} />}
              {iconUrl && <img src={iconUrl} alt={`${tab.label} icon`} className="w-4 h-4 object-contain" />}
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      <div className="w-full overflow-x-auto">
        {/* Wrapped content in areaPrint for printing logic */}
        <div id="areaPrint" className="bg-white shadow-2xl w-[210mm] min-h-[297mm] p-[20mm] mx-auto">
            {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default IntroductionView;
