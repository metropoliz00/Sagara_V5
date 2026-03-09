import React from 'react';
import StudentPortal from './StudentPortal'; 
import SupervisorOverview from './SupervisorOverview'; 
import Dashboard from './Dashboard';
import { AlertCircle } from 'lucide-react';
import { 
    ViewState, Student, AgendaItem, BehaviorLog, GradeRecord, 
    TeacherProfileData, SchoolProfileData, User, Holiday, KarakterAssessment, 
    EmploymentLink, LiaisonLog, PermissionRequest, InventoryItem, SchoolAsset, BOSTransaction, Extracurricular, LearningDocumentation, BookLoan,
    Subject, LearningReport
} from '../types';
import { MOCK_SUBJECTS } from '../constants';

interface DashboardContainerProps {
  isStudentRole: boolean;
  isSupervisor: boolean;
  myStudentData: Student | null;
  allAttendanceRecords: any[];
  grades: GradeRecord[];
  liaisonLogs: LiaisonLog[];
  permissionRequests: PermissionRequest[];
  karakterAssessments: KarakterAssessment[];
  onSavePermission: (date: string, records: any[]) => Promise<void>;
  onSaveLiaison: (log: Omit<LiaisonLog, 'id'>) => Promise<void>;
  onSaveKarakter: (studentId: string, assessment: Omit<KarakterAssessment, 'studentId' | 'classId'>) => Promise<void>;
  onUpdateStudent: (student: Student) => Promise<void>;
  students: Student[];
  users: User[];
  extracurriculars: Extracurricular[];
  inventory: InventoryItem[];
  schoolAssets: SchoolAsset[];
  bosTransactions: BOSTransaction[];
  filteredStudents: Student[];
  filteredAgendas: AgendaItem[];
  filteredAttendance: any[];
  filteredCounseling: BehaviorLog[];
  holidays: Holiday[];
  teacherProfile: TeacherProfileData;
  activeClassId: string;
  onChangeView: (view: ViewState) => void;
  adminCompleteness: number;
  employmentLinks: EmploymentLink[];
  pendingPermissions: PermissionRequest[];
  onOpenPermissionModal: () => void;
  schoolProfile: SchoolProfileData;
  learningDocumentation?: LearningDocumentation[];
  learningReports?: LearningReport[];
  hasNewMessages?: boolean;
  unreadMessageCount?: number;
  bookLoans: BookLoan[];
  kktpMap?: Record<string, number>;
  subjects: Subject[];
}

const DashboardContainer: React.FC<DashboardContainerProps> = ({
  isStudentRole,
  isSupervisor,
  myStudentData,
  allAttendanceRecords,
  grades,
  liaisonLogs,
  permissionRequests,
  karakterAssessments,
  onSavePermission,
  onSaveLiaison,
  onSaveKarakter,
  onUpdateStudent,
  students,
  users,
  extracurriculars,
  inventory,
  schoolAssets,
  bosTransactions,
  filteredStudents,
  filteredAgendas,
  filteredAttendance,
  filteredCounseling,
  holidays,
  teacherProfile,
  activeClassId,
  onChangeView,
  adminCompleteness,
  employmentLinks,
  pendingPermissions,
  onOpenPermissionModal,
  schoolProfile,
  learningDocumentation,
  learningReports,
  hasNewMessages = false,
  unreadMessageCount = 0,
  bookLoans,
  kktpMap,
  subjects
}) => {
  if (isStudentRole) {
    if (!myStudentData) {
      return (
        <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center h-full">
          <AlertCircle size={48} className="text-[#A0DEFF] mb-4"/>
          <h3 className="text-lg font-bold text-gray-700">Data siswa tidak ditemukan.</h3>
          <p className="max-w-md mt-2 text-sm">
            Pastikan akun Anda terhubung dengan data siswa yang benar. 
            Hubungi operator sekolah untuk memverifikasi "Student ID" pada akun Anda.
          </p>
        </div>
      );
    }
    return (
      <StudentPortal 
        student={myStudentData}
        allAttendance={allAttendanceRecords}
        grades={grades}
        liaisonLogs={liaisonLogs.filter(l => l.studentId === myStudentData?.id)}
        agendas={filteredAgendas}
        behaviorLogs={filteredCounseling.filter(c => c.studentId === myStudentData?.id)}
        permissionRequests={permissionRequests.filter(p => p.studentId === myStudentData?.id)}
        karakterAssessments={karakterAssessments.filter(k => k.studentId === myStudentData?.id)}
        onSavePermission={onSavePermission}
        onSaveLiaison={onSaveLiaison}
        onSaveKarakter={onSaveKarakter}
        onUpdateStudent={onUpdateStudent}
        learningDocumentation={learningDocumentation || []}
        bookLoans={bookLoans.filter(loan => loan.studentId === myStudentData?.id)}
      />
    );
  }
  
  if (isSupervisor) {
    return (
      <SupervisorOverview
        students={students} 
        users={users}       
        attendanceRecords={allAttendanceRecords}
        grades={grades}
        liaisonLogs={liaisonLogs}
        permissionRequests={permissionRequests}
        // FIX: Pass 'filteredCounseling' to the 'counselingLogs' prop. The 'counselingLogs' variable was not defined in this scope.
        counselingLogs={filteredCounseling}
        extracurriculars={extracurriculars}
        inventory={inventory}
        schoolAssets={schoolAssets}
        bosTransactions={bosTransactions}
      />
    );
  }

  return (
    <Dashboard 
      students={filteredStudents} 
      agendas={filteredAgendas} 
      holidays={holidays} 
      allAttendanceRecords={filteredAttendance} 
      teacherName={teacherProfile.name} 
      teachingClass={activeClassId}
      onChangeView={onChangeView} 
      grades={grades}
      subjects={subjects}
      adminCompleteness={adminCompleteness}
      employmentLinks={employmentLinks}
      pendingPermissions={pendingPermissions} 
      onOpenPermissionModal={onOpenPermissionModal} 
      schoolProfile={schoolProfile} 
      learningDocumentation={learningDocumentation || []}
      learningReports={learningReports || []}
      hasNewMessages={hasNewMessages}
      unreadMessageCount={unreadMessageCount}
      kktpMap={kktpMap}
    />
  );
};

export default DashboardContainer;