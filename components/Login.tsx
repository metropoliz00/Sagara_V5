
import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../services/apiService';
import { User, Lock, Loader2, ArrowRight, Sparkles, Eye, EyeOff, Code, X } from 'lucide-react';
import { User as UserType, SchoolProfileData } from '../types';

interface LoginProps {
  onLoginSuccess: (user: UserType) => void;
}

// Placeholder - User must replace this in Google Cloud Console
// NOTE: Google Sign In requires a valid Client ID and configured origin/redirect URI
// Cast to string to prevent TypeScript from inferring a literal type, which causes TS2367 in comparisons
const GOOGLE_CLIENT_ID = "188596791323-rf3gor7ompi1hn7086vp38rkths652te.apps.googleusercontent.com" as string; 

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);

  // Developer Info State
  const [devInfo, setDevInfo] = useState<{ name: string; moto: string; photo: string; } | null>(null);
  const [isDevModalOpen, setIsDevModalOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 1000);

    const fetchPublicInfo = async () => {
      if (apiService.isConfigured()) {
        try {
          const profiles = await apiService.getProfiles();
          if (profiles.school && profiles.school.developerInfo && profiles.school.developerInfo.name) {
            setDevInfo(profiles.school.developerInfo);
          }
        } catch (e) {
          // Suppress fetch error on login screen to avoid alarming users
          // console.warn("Could not fetch public info (offline or network error)");
        }
      }
    };
    fetchPublicInfo();

    return () => clearTimeout(timer);
  }, []);

  // --- GOOGLE SIGN IN LOGIC ---
  const handleGoogleResponse = async (response: any) => {
      try {
          setLoading(true);
          const token = response.credential;
          // Decode JWT to get email
          const payload = JSON.parse(atob(token.split('.')[1]));
          const email = payload.email;
          
          if (!email) {
              setError("Gagal mendapatkan email dari Google.");
              setLoading(false);
              return;
          }

          // Backend Verification
          const user = await apiService.loginWithGoogle(email);
          if (user) {
              onLoginSuccess(user);
          } else {
              setError("Email Google tidak terdaftar di sistem.");
          }
      } catch (e: any) {
          console.error("Google Login Error", e);
          setError(e.message || "Gagal login dengan Google.");
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      // Fungsi untuk merender tombol
      const renderGoogleButton = () => {
          if ((window as any).google && document.getElementById("google-btn")) {
              try {
                  // Ensure we don't try to init if ID is clearly invalid/placeholder
                  if (GOOGLE_CLIENT_ID === "YOUR_GOOGLE_CLIENT_ID_HERE") {
                      console.warn("Google Client ID not configured");
                      return true; // Stop interval
                  }

                  (window as any).google.accounts.id.initialize({
                      client_id: GOOGLE_CLIENT_ID,
                      callback: handleGoogleResponse
                  });
                  (window as any).google.accounts.id.renderButton(
                      document.getElementById("google-btn"),
                      { theme: "outline", size: "large", width: "100%", logo_alignment: "center" }
                  );
                  return true; // Berhasil render
              } catch (e) {
                  console.warn("Google Sign In failed to initialize", e);
                  return false;
              }
          }
          return false; // Belum siap
      };

      // Coba render langsung
      if (!renderGoogleButton()) {
          // Jika belum siap, cek setiap 500ms sampai script Google terload
          const intervalId = setInterval(() => {
              if (renderGoogleButton()) {
                  clearInterval(intervalId);
              }
          }, 500);

          // Bersihkan interval saat unmount
          return () => clearInterval(intervalId);
      }
  }, []);

  // Hidden backdoor logic for testing
  const handleDemoBypass = () => {
      setLoading(true);
      setTimeout(() => {
          const demoUser: UserType = {
              id: 'demo',
              username: 'demo',
              fullName: 'Bpk. Guru Demo',
              position: 'Wali Kelas 4B',
              role: 'guru'
          };
          onLoginSuccess(demoUser);
          setLoading(false);
      }, 1000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (username.toLowerCase() === 'demo' && password === 'demo') {
        handleDemoBypass();
        return;
    }

    try {
      const user = await apiService.login(username, password);
      if (user) {
        onLoginSuccess(user);
      } else {
        setError('Username atau Password tidak valid.');
      }
    } catch (err: any) {
      const msg = err.message || 'Gagal terhubung ke server.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white relative overflow-hidden">
      
      {/* Subtle Background Elements - Updated to new palette */}
      <div className="absolute inset-0 z-0 bg-white">
         <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#CAF4FF]/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
         <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#FFF9D0]/30 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4"></div>
      </div>

      {/* Watermark Logo */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
          <img 
            src="https://image2url.com/r2/default/images/1771068223735-6f3b5a3d-5a11-4f2e-9639-10adf921bb50.png" 
            alt="Watermark" 
            className="w-[500px] h-[500px] md:w-[700px] md:h-[700px] object-contain opacity-[0.03] grayscale animate-pulse-slow"
          />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        
        {initialLoading ? (
          <div className="flex flex-col items-center justify-center animate-fade-in">
             <div className="relative w-32 h-32 flex items-center justify-center mb-6 animate-bounce">
                <div className="absolute inset-0 bg-[#A0DEFF]/30 rounded-full blur-2xl opacity-60 animate-pulse"></div>
                <img 
                  src="https://image2url.com/r2/default/images/1770790148258-99f209ea-fd45-44cf-9576-9c5205ef8b20.png" 
                  alt="Logo SAGARA" 
                  className="w-full h-full object-contain drop-shadow-xl"
                />
             </div>
             <div className="flex items-center space-x-2 mt-4">
                <div className="w-2 h-2 bg-[#5AB2FF] rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-2 h-2 bg-[#5AB2FF] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-[#5AB2FF] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
             </div>
          </div>
        ) : (
          <div className="animate-fade-in-up">
            <div className="flex flex-col items-center mb-8">
                <div className="flex items-center justify-center gap-4 mb-4">
                    <div className="relative w-20 h-20 flex items-center justify-center">
                         <img 
                           src="https://image2url.com/r2/default/images/1770790148258-99f209ea-fd45-44cf-9576-9c5205ef8b20.png" 
                           alt="Logo SAGARA" 
                           className="w-full h-full object-contain drop-shadow-lg"
                         />
                    </div>
                    <div className="text-left">
                         <h1 className="text-5xl font-extrabold tracking-tight font-sans">
                             <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5AB2FF] to-blue-500">
                               SAGARA
                             </span>
                         </h1>
                         <div className="h-1.5 w-full bg-gradient-to-r from-[#FFF9D0] to-[#CAF4FF] rounded-full mt-1"></div>
                    </div>
                </div>
               
               <div className="text-center">
                  <p className="text-sm text-slate-500 font-medium tracking-wide">
                    Sistem Akademik & Administrasi Terintegrasi
                  </p>
                  <p className="inline-block bg-[#CAF4FF] text-blue-800 text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-full mt-4 border border-blue-200 shadow-sm">
                    UPT SD NEGERI REMEN 2
                  </p>
               </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-[#CAF4FF] p-8 md:p-10 relative overflow-hidden">
                {/* Glossy Effect */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#5AB2FF] via-[#A0DEFF] to-[#CAF4FF]"></div>
                
                <div className="text-center mb-6">
                    <h2 className="text-lg font-bold text-slate-700">Selamat Datang!</h2>
                    <p className="text-sm text-slate-500 mt-1">Masuk ke aplikasi dengan menggunakan akunmu</p>
                </div>

                {error && (
                <div className="mb-6 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm flex items-start animate-shake">
                    <div className="mr-2 mt-0.5"><Lock size={16} /></div> 
                    <span className="font-medium">{error}</span>
                </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Username</label>
                    <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#5AB2FF] transition-colors">
                            <User size={20} />
                        </div>
                        <input 
                        type="text" 
                        className="w-full bg-gray-50/50 border border-gray-200 rounded-xl py-3.5 pl-12 pr-4 text-slate-800 font-semibold placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#5AB2FF] focus:border-transparent transition-all outline-none"
                        placeholder="Masukan username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <div className="flex justify-between items-center ml-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
                    </div>
                    <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#5AB2FF] transition-colors">
                            <Lock size={20} />
                        </div>
                        <input 
                        type={showPassword ? "text" : "password"} 
                        className="w-full bg-gray-50/50 border border-gray-200 rounded-xl py-3.5 pl-12 pr-12 text-slate-800 font-semibold placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#5AB2FF] focus:border-transparent transition-all outline-none"
                        placeholder="Masukan password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        />
                        <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#5AB2FF] transition-colors focus:outline-none"
                        >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-[#5AB2FF] hover:bg-[#A0DEFF] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-[#CAF4FF] flex items-center justify-center group disabled:opacity-70 disabled:cursor-not-allowed mt-4 transform active:scale-[0.98]"
                >
                    {loading ? (
                    <Loader2 size={24} className="animate-spin" />
                    ) : (
                    <>
                        Masuk Aplikasi <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                    )}
                </button>
                </form>

                {/* --- GOOGLE LOGIN SECTION --- */}
                <div className="mt-6">
                    <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-gray-200"></div>
                        <span className="flex-shrink-0 mx-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Atau</span>
                        <div className="flex-grow border-t border-gray-200"></div>
                    </div>
                    
                    {/* Only render Google button container if configured (to avoid layout shift if empty) */}
                    {GOOGLE_CLIENT_ID !== "YOUR_GOOGLE_CLIENT_ID_HERE" && (
                        <div className="mt-2 h-12 flex justify-center" id="google-btn">
                            {/* Google Button renders here */}
                        </div>
                    )}
                </div>

                <div className="mt-8 text-center">
                <div className="flex items-center justify-center space-x-2 text-xs text-slate-400">
                    <span>&copy; 2026 | SAGARA Dev. Meyga</span>
                </div>
                </div>
            </div>
          </div>
        )}
      </div>

      {/* Developer Info FAB */}
      {devInfo && (
        <button 
            onClick={() => setIsDevModalOpen(true)}
            className="fixed bottom-6 right-6 z-20 w-14 h-14 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:text-indigo-600 hover:border-indigo-300 transition-all transform animate-slide-in-right animate-slide-rl"
            title="Tentang Pengembang"
        >
            <Code size={24} />
        </button>
      )}

      {/* Developer Info Modal */}
      {isDevModalOpen && devInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsDevModalOpen(false)}>
            <div 
              className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden transform transition-all scale-100 border-2 border-[#A0DEFF]" 
              onClick={e => e.stopPropagation()}
            >
                <div className="p-8 flex flex-col items-center text-center">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                        Pengembang Aplikasi
                    </p>
                    <img src={devInfo.photo} alt={devInfo.name} className="w-24 h-36 rounded-lg object-cover mb-4 border-4 border-[#CAF4FF] shadow-lg"/>
                    <h3 className="text-lg font-bold text-gray-800">{devInfo.name}</h3>
                    <p className="text-gray-500 mt-2 text-sm italic">"{devInfo.moto}"</p>
                    <button onClick={() => setIsDevModalOpen(false)} className="mt-6 bg-gray-100 text-gray-700 px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                        Tutup
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default Login;
