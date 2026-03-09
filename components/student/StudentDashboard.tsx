
import React, { useMemo } from 'react';
import { Student, SchoolProfileData, TeacherProfileData, ViewState } from '../../types';
import { BarChart2, Calendar, Users, Briefcase, GraduationCap, Heart, Sparkles, DollarSign, Trophy, AlertTriangle, Bell } from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  Bar, XAxis, YAxis, CartesianGrid, BarChart as RechartsBarChart
} from 'recharts';

interface StudentDashboardProps {
    students: Student[];
    schoolProfile?: SchoolProfileData;
    teacherProfile?: TeacherProfileData;
    hasNewMessages?: boolean;
    unreadMessageCount?: number;
    onChangeView?: (view: ViewState) => void;
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#64748b'];
const POSITIVE_COLOR = '#10b981'; // green
const NEGATIVE_COLOR = '#ef4444'; // red

const StudentDashboard: React.FC<StudentDashboardProps> = ({ students, schoolProfile, teacherProfile, hasNewMessages = false, unreadMessageCount = 0, onChangeView }) => {

    const calculateAge = (birthDate: string): number => {
        if (!birthDate) return 0;
        try {
            const today = new Date();
            const birth = new Date(birthDate);
            let age = today.getFullYear() - birth.getFullYear();
            const monthDiff = today.getMonth() - birth.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
                age--;
            }
            return age;
        } catch (e) {
            return 0;
        }
    };
    
    const ageByMonthData = useMemo(() => {
        const months = Array.from({ length: 12 }, () => ({
            L: Array(13).fill(0), // Ages 6-18
            P: Array(13).fill(0),
            total: 0
        }));

        students.forEach(student => {
            if (student.birthDate) {
                const birthMonth = new Date(student.birthDate).getMonth();
                const age = calculateAge(student.birthDate);
                if (age >= 6 && age <= 18) {
                    const ageIndex = age - 6;
                    if (student.gender === 'L') {
                        months[birthMonth].L[ageIndex]++;
                    } else {
                        months[birthMonth].P[ageIndex]++;
                    }
                    months[birthMonth].total++;
                }
            }
        });
        return months;
    }, [students]);

    const countByYearData = useMemo(() => {
        const yearMap: Record<string, { L: number; P: number; total: number; age: number }> = {};
        students.forEach(s => {
            if (s.birthDate) {
                const year = new Date(s.birthDate).getFullYear();
                const age = calculateAge(s.birthDate);
                if (!yearMap[year]) {
                    yearMap[year] = { L: 0, P: 0, total: 0, age: age };
                }
                if (s.gender === 'L') yearMap[year].L++;
                else yearMap[year].P++;
                yearMap[year].total++;
            }
        });
        return Object.entries(yearMap).sort((a,b) => Number(b[0]) - Number(a[0]));
    }, [students]);

    const parentOccupationData = useMemo(() => {
        const jobs = students.flatMap(s => [s.fatherJob, s.motherJob]);
        
        const validJobs = jobs.filter((j): j is string => !!j && j.trim() !== '');
        
        const counts: Record<string, number> = {};
        validJobs.forEach(job => {
            const normalized = job.trim().toLowerCase();
            counts[normalized] = (counts[normalized] || 0) + 1;
        });
        
        const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a);
        const top5 = sorted.slice(0, 6);
        const others = sorted.slice(6).reduce((acc, [, count]) => acc + count, 0);

        const chartData = top5.map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
        if (others > 0) chartData.push({ name: 'Lainnya', value: others });
        
        return chartData;
    }, [students]);

    const parentEducationData = useMemo(() => {
        const educations = students.flatMap(s => [s.fatherEducation, s.motherEducation]);
        
        const validEducations = educations.filter((e): e is string => !!e && e.trim() !== '');

        const counts: Record<string, number> = {};
        validEducations.forEach(edu => {
            const normalized = edu.trim().toUpperCase();
            counts[normalized] = (counts[normalized] || 0) + 1;
        });
        return Object.entries(counts).sort(([, a], [, b]) => b - a).map(([name, value])=>({name, value}));
    }, [students]);

    // NEW: Talents Data
    const talentsData = useMemo(() => {
        const hobbies: Record<string, number> = {};
        const ambitions: Record<string, number> = {};
        students.forEach(s => {
            if (s.hobbies) {
                const hobby = s.hobbies.trim().charAt(0).toUpperCase() + s.hobbies.trim().slice(1).toLowerCase();
                hobbies[hobby] = (hobbies[hobby] || 0) + 1;
            }
            if (s.ambition) {
                const ambition = s.ambition.trim().charAt(0).toUpperCase() + s.ambition.trim().slice(1).toLowerCase();
                ambitions[ambition] = (ambitions[ambition] || 0) + 1;
            }
        });
        const topHobbies = Object.entries(hobbies).sort((a,b) => b[1] - a[1]).slice(0, 5);
        const topAmbitions = Object.entries(ambitions).sort((a,b) => b[1] - a[1]).slice(0, 5);
        return { topHobbies, topAmbitions };
    }, [students]);

    // NEW: Economy Data
    const economyData = useMemo(() => {
        const statuses: Record<string, number> = { 'Mampu': 0, 'Cukup': 0, 'Kurang Mampu': 0, 'KIP': 0 };
        students.forEach(s => {
            const status = s.economyStatus || 'Mampu';
            if (statuses[status] !== undefined) {
                statuses[status]++;
            }
        });
        return Object.entries(statuses).map(([name, value]) => ({ name, value }));
    }, [students]);

    // NEW: Records Data
    const recordsData = useMemo(() => {
        let totalAchievements = 0;
        let totalViolations = 0;
        students.forEach(s => {
            totalAchievements += s.achievements?.length || 0;
            totalViolations += s.violations?.length || 0;
        });
        return [
            { name: 'Prestasi', total: totalAchievements },
            { name: 'Pelanggaran', total: totalViolations }
        ];
    }, [students]);

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Dashboard Siswa</h2>
                {onChangeView && (
                <button 
                    onClick={() => onChangeView('liaison-book')}
                    className={`relative bg-white p-2.5 rounded-xl shadow-sm border border-gray-100 transition-all ${
                        hasNewMessages 
                        ? 'text-indigo-600 border-indigo-200 bg-indigo-50 animate-vibrate' 
                        : 'text-gray-500 hover:bg-gray-50 hover:text-indigo-600'
                    }`}
                    title="Buku Penghubung"
                >
                    <Bell size={24} />
                    {hasNewMessages && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-bounce border-2 border-white">
                            {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                        </div>
                    )}
                </button>
                )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 no-print-report">
                <div className="bg-white p-4 rounded-lg shadow-sm border col-span-1 lg:col-span-2">
                    <h3 className="font-bold text-gray-700 flex items-center mb-2"><Calendar size={16} className="mr-2 text-indigo-500" /> Daftar Umur Siswa Menurut Bulan Lahir</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-center border-collapse">
                            <thead className="bg-gray-50 font-semibold">
                                <tr>
                                    <th className="border p-1 w-24">Bulan Lahir</th>
                                    {Array.from({length: 13}, (_,i) => i+6).map(age => <th key={age} className="border p-1 w-12">{age}</th>)}
                                    <th className="border p-1 w-16 bg-gray-100">Jumlah</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ageByMonthData.map((monthData, monthIndex) => (
                                    <tr key={monthIndex}>
                                        <td className="border p-1 font-semibold">{new Date(0, monthIndex).toLocaleString('id-ID', {month: 'long'})}</td>
                                        {Array.from({length: 13}, (_,i) => i).map(ageIndex => (
                                            <td key={ageIndex} className="border p-1">
                                                {monthData.L[ageIndex] > 0 && <span className="text-blue-600">L:{monthData.L[ageIndex]}</span>}
                                                {monthData.P[ageIndex] > 0 && <span className="text-pink-600 ml-1">P:{monthData.P[ageIndex]}</span>}
                                            </td>
                                        ))}
                                        <td className="border p-1 font-bold bg-gray-50">{monthData.total}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                    <h3 className="font-bold text-gray-700 flex items-center mb-2"><Users size={16} className="mr-2 text-indigo-500" /> Daftar Jumlah Siswa Menurut Tahun Lahir</h3>
                    <div className="max-h-64 overflow-y-auto">
                        <table className="w-full text-xs text-center border-collapse">
                            <thead className="bg-gray-50 font-semibold sticky top-0">
                                <tr>
                                    <th className="border p-2">Tahun Kelahiran</th>
                                    <th className="border p-2">Umur</th>
                                    <th className="border p-2">L</th>
                                    <th className="border p-2">P</th>
                                    <th className="border p-2">Jumlah</th>
                                </tr>
                            </thead>
                            <tbody>
                                {countByYearData.map(([year, data]) => (
                                    <tr key={year}>
                                        <td className="border p-2">{year}</td>
                                        <td className="border p-2">{data.age} Th</td>
                                        <td className="border p-2">{data.L}</td>
                                        <td className="border p-2">{data.P}</td>
                                        <td className="border p-2 font-bold">{data.total}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                    <h3 className="font-bold text-gray-700 flex items-center mb-2"><Briefcase size={16} className="mr-2 text-indigo-500" /> Data Pekerjaan Orang Tua</h3>
                    <div style={{width: '100%', height: 250}}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie data={parentOccupationData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                    {parentOccupationData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(value) => [value, 'Jumlah']} />
                                <Legend iconSize={10} layout="vertical" verticalAlign="middle" align="right" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border col-span-1 lg:col-span-2">
                    <h3 className="font-bold text-gray-700 flex items-center mb-2"><GraduationCap size={16} className="mr-2 text-indigo-500" /> Data Pendidikan Orang Tua</h3>
                    <div style={{width: '100%', height: 250}}>
                        <ResponsiveContainer>
                            <RechartsBarChart data={parentEducationData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip formatter={(value) => [value, 'Jumlah']} />
                                <Bar dataKey="value" fill="#8884d8" />
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* NEW DASHBOARDS SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 no-print-report">
                {/* Health Dashboard */}
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                    <h3 className="font-bold text-gray-700 flex items-center mb-2"><Heart size={16} className="mr-2 text-red-500" /> Tabel Data Kesehatan</h3>
                    <div className="max-h-[250px] overflow-y-auto">
                        <table className="w-full text-xs text-left border-collapse">
                            <thead className="bg-gray-50 font-semibold sticky top-0">
                                <tr>
                                    <th className="border p-2 w-8">No</th>
                                    <th className="border p-2">Nama Siswa</th>
                                    <th className="border p-2 text-center">Tinggi (cm)</th>
                                    <th className="border p-2 text-center">Berat (kg)</th>
                                    <th className="border p-2 text-center">Gol. Darah</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {students.map((student, index) => (
                                    <tr key={student.id} className="hover:bg-gray-50">
                                        <td className="border p-2 text-center">{index + 1}</td>
                                        <td className="border p-2 font-medium">{student.name}</td>
                                        <td className="border p-2 text-center">{student.height || '-'}</td>
                                        <td className="border p-2 text-center">{student.weight || '-'}</td>
                                        <td className="border p-2 text-center">{student.bloodType || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Talents Dashboard */}
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                    <h3 className="font-bold text-gray-700 flex items-center mb-4"><Sparkles size={16} className="mr-2 text-yellow-500" /> Peta Minat & Bakat</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h4 className="font-semibold text-sm mb-2 text-center">Top 5 Hobi</h4>
                            <table className="w-full text-xs">
                                <tbody>
                                {talentsData.topHobbies.map(([name, count], i) => (
                                    <tr key={i} className="border-b"><td className="p-1 capitalize">{name}</td><td className="p-1 text-right font-bold">{count} siswa</td></tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                        <div>
                            <h4 className="font-semibold text-sm mb-2 text-center">Top 5 Cita-cita</h4>
                             <table className="w-full text-xs">
                                <tbody>
                                {talentsData.topAmbitions.map(([name, count], i) => (
                                    <tr key={i} className="border-b"><td className="p-1 capitalize">{name}</td><td className="p-1 text-right font-bold">{count} siswa</td></tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                
                {/* Economy Dashboard */}
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                    <h3 className="font-bold text-gray-700 flex items-center mb-2"><DollarSign size={16} className="mr-2 text-green-500" /> Diagram Sosial Ekonomi</h3>
                    <div style={{width: '100%', height: 250}}>
                        <ResponsiveContainer>
                            <RechartsBarChart data={economyData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis allowDecimals={false}/>
                                <Tooltip formatter={(value) => [value, 'Jumlah Siswa']} />
                                <Bar dataKey="value" fill="#10b981" name="Jumlah Siswa" />
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Records Dashboard */}
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                    <h3 className="font-bold text-gray-700 flex items-center mb-2"><BarChart2 size={16} className="mr-2 text-blue-500" /> Catatan Prestasi & Pelanggaran</h3>
                     <div style={{width: '100%', height: 250}}>
                        <ResponsiveContainer>
                            <RechartsBarChart data={recordsData} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" />
                                <Tooltip formatter={(value) => [value, 'Total Catatan']} />
                                <Bar dataKey="total" name="Total Catatan">
                                    {recordsData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.name === 'Prestasi' ? POSITIVE_COLOR : NEGATIVE_COLOR} />
                                    ))}
                                </Bar>
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default StudentDashboard;
