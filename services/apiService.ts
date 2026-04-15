/// <reference types="vite/client" />
import { supabase } from './supabaseClient';
import { 
  Student, AgendaItem, GradeRecord, GradeData, BehaviorLog, Extracurricular, 
  TeacherProfileData, SchoolProfileData, User, Holiday, InventoryItem, Guest, 
  ScheduleItem, PiketGroup, SikapAssessment, KarakterAssessment, SeatingLayouts, 
  AcademicCalendarData, EmploymentLink, LearningReport, LiaisonLog, PermissionRequest, 
  LearningJournalEntry, SupportDocument, OrganizationStructure, SchoolAsset, 
  BOSTransaction, LearningDocumentation, BookLoan, BookInventory, Graduate, Material
} from '../types';

const isApiConfigured = () => {
  return !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;
};

export const apiService = {
  isConfigured: isApiConfigured,

  // --- Auth & Users ---
  login: async (username: string, password?: string): Promise<User | null> => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single();
    
    if (error || !data) return null;
    return {
      ...data,
      fullName: data.full_name,
      birthInfo: data.birth_info,
      classId: data.class_id,
      studentId: data.student_id
    } as User;
  },

  loginWithGoogle: async (email: string): Promise<User | null> => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error || !data) return null;
    return {
      ...data,
      fullName: data.full_name,
      birthInfo: data.birth_info,
      classId: data.class_id,
      studentId: data.student_id
    } as User;
  },

  getUsers: async (currentUser: User | null): Promise<User[]> => {
    const { data, error } = await supabase
      .from('users')
      .select('*');
    
    if (error) return [];
    return data.map((u: any) => ({
      ...u,
      fullName: u.full_name,
      birthInfo: u.birth_info,
      classId: u.class_id,
      studentId: u.student_id
    }));
  },

  saveUser: async (user: User): Promise<User> => {
    const dbUser = {
      username: user.username,
      password: user.password,
      role: user.role,
      full_name: user.fullName,
      nip: user.nip,
      nuptk: user.nuptk,
      birth_info: user.birthInfo,
      education: user.education,
      position: user.position,
      rank: user.rank,
      class_id: user.classId,
      email: user.email,
      phone: user.phone,
      address: user.address,
      photo: user.photo,
      signature: user.signature,
      student_id: user.studentId
    };

    if (user.id) {
      const { data, error } = await supabase
        .from('users')
        .update(dbUser)
        .eq('id', user.id)
        .select()
        .single();
      if (error) {
        console.error("Error updating user:", error);
        throw error;
      }
      return { ...data, fullName: data.full_name, classId: data.class_id };
    } else {
      const { data, error } = await supabase
        .from('users')
        .insert([dbUser])
        .select()
        .single();
      if (error) {
        console.error("Error inserting user:", error);
        throw error;
      }
      return { ...data, fullName: data.full_name, classId: data.class_id };
    }
  },

  saveUserBatch: async (users: Omit<User, 'id'>[]): Promise<void> => {
    const dbUsers = users.map(u => ({
      username: u.username,
      password: u.password,
      role: u.role,
      full_name: u.fullName,
      nip: u.nip,
      nuptk: u.nuptk,
      birth_info: u.birthInfo,
      education: u.education,
      position: u.position,
      rank: u.rank,
      class_id: u.classId,
      email: u.email,
      phone: u.phone,
      address: u.address,
      photo: u.photo,
      signature: u.signature,
      student_id: u.studentId
    }));
    await supabase.from('users').insert(dbUsers);
  },

  deleteUser: async (id: string): Promise<void> => {
    await supabase.from('users').delete().eq('id', id);
  },

  syncStudentAccounts: async (): Promise<{ status: string; message: string }> => {
    try {
      // 1. Get all students
      const { data: students, error: studentError } = await supabase.from('students').select('*');
      if (studentError) throw studentError;

      // 2. Get all existing student users
      const { data: users, error: userError } = await supabase.from('users').select('*').eq('role', 'siswa');
      if (userError) throw userError;

      let createdCount = 0;
      let updatedCount = 0;

      for (const student of students) {
        if (!student.nis) continue; // Skip if no NIS

        // Find existing user by student_id
        let existingUser = users.find((u: any) => u.student_id === student.id);

        // If not found by ID, try finding by username (NIS)
        if (!existingUser) {
           existingUser = users.find((u: any) => u.username === student.nis);
        }

        const userData = {
            username: student.nis,
            role: 'siswa',
            full_name: student.name,
            class_id: student.class_id,
            student_id: student.id,
        };

        if (existingUser) {
            // Update existing user to ensure data is in sync
            const { error } = await supabase.from('users').update(userData).eq('id', existingUser.id);
            if (!error) updatedCount++;
        } else {
            // Create new user
            const { error } = await supabase.from('users').insert([{
                ...userData,
                password: student.nis // Default password is NIS
            }]);
            if (!error) createdCount++;
        }
      }

      return { status: 'success', message: `Sinkronisasi berhasil. ${createdCount} akun dibuat, ${updatedCount} akun diperbarui.` };
    } catch (error: any) {
      console.error('Sync error:', error);
      return { status: 'error', message: 'Gagal melakukan sinkronisasi: ' + error.message };
    }
  },

  // --- Graduates ---
  getGraduates: async (): Promise<Graduate[]> => {
    const { data, error } = await supabase.from('graduates').select('*');
    if (error) return [];
    return data.map((g: any) => ({
      ...g,
      ijazahNumber: g.ijazah_number,
      graduationYear: g.graduation_year,
      continuedTo: g.continued_to
    }));
  },

  saveGraduate: async (graduate: Graduate): Promise<void> => {
    const dbGraduate = {
      id: graduate.id,
      nisn: graduate.nisn,
      name: graduate.name,
      ijazah_number: graduate.ijazahNumber,
      status: graduate.status,
      graduation_year: graduate.graduationYear,
      continued_to: graduate.continuedTo,
      created_at: graduate.createdAt,
      updated_at: graduate.updatedAt
    };
    await supabase.from('graduates').upsert(dbGraduate);
  },

  deleteGraduate: async (id: string): Promise<void> => {
    await supabase.from('graduates').delete().eq('id', id);
  },

  saveGraduateBatch: async (graduates: Graduate[]): Promise<void> => {
    const dbGraduates = graduates.map(g => ({
      id: g.id,
      nisn: g.nisn,
      name: g.name,
      ijazah_number: g.ijazahNumber,
      status: g.status,
      graduation_year: g.graduationYear,
      continued_to: g.continuedTo,
      created_at: g.createdAt || Date.now(),
      updated_at: g.updatedAt || Date.now()
    }));
    await supabase.from('graduates').upsert(dbGraduates);
  },

  // --- Students ---
  getStudents: async (currentUser: User | null): Promise<Student[]> => {
    const { data, error } = await supabase.from('students').select('*');
    if (error) return [];
    return data.map((s: any) => ({
      ...s,
      classId: s.class_id,
      birthPlace: s.birth_place,
      birthDate: s.birth_date,
      fatherName: s.father_name,
      fatherJob: s.father_job,
      fatherEducation: s.father_education,
      motherName: s.mother_name,
      motherJob: s.mother_job,
      motherEducation: s.mother_education,
      parentName: s.parent_name,
      parentPhone: s.parent_phone,
      parentJob: s.parent_job,
      economyStatus: s.economy_status,
      bloodType: s.blood_type,
      healthNotes: s.health_notes,
      behaviorScore: Number(s.behavior_score),
      attendance: {
        present: Number(s.present),
        sick: Number(s.sick),
        permit: Number(s.permit),
        alpha: Number(s.alpha)
      },
      teacherNotes: s.teacher_notes
    }));
  },

  createStudent: async (student: Omit<Student, 'id'>): Promise<Student> => {
    const dbStudent = {
      class_id: student.classId,
      nis: student.nis,
      nisn: student.nisn,
      name: student.name,
      gender: student.gender,
      birth_place: student.birthPlace,
      birth_date: student.birthDate,
      religion: student.religion,
      address: student.address,
      father_name: student.fatherName,
      father_job: student.fatherJob,
      father_education: student.fatherEducation,
      mother_name: student.motherName,
      mother_job: student.motherJob,
      mother_education: student.motherEducation,
      parent_name: student.parentName,
      parent_phone: student.parentPhone,
      parent_job: student.parentJob,
      economy_status: student.economyStatus,
      height: student.height,
      weight: student.weight,
      blood_type: student.bloodType,
      health_notes: student.healthNotes,
      hobbies: student.hobbies,
      ambition: student.ambition,
      achievements: student.achievements,
      violations: student.violations,
      behavior_score: student.behaviorScore,
      photo: student.photo,
      teacher_notes: student.teacherNotes
    };
    const { data, error } = await supabase.from('students').insert([dbStudent]).select().single();
    return error ? { ...student, id: 'temp' } as Student : { ...data, classId: data.class_id } as unknown as Student;
  },

  createStudentBatch: async (students: Omit<Student, 'id'>[]): Promise<any> => {
    const dbStudents = students.map(s => ({
      class_id: s.classId,
      nis: s.nis,
      nisn: s.nisn,
      name: s.name,
      gender: s.gender,
      birth_place: s.birthPlace,
      birth_date: s.birthDate,
      religion: s.religion,
      address: s.address,
      father_name: s.fatherName,
      father_job: s.fatherJob,
      father_education: s.fatherEducation,
      mother_name: s.motherName,
      mother_job: s.motherJob,
      mother_education: s.motherEducation,
      parent_name: s.parentName,
      parent_phone: s.parentPhone,
      parent_job: s.parentJob,
      economy_status: s.economyStatus,
      height: s.height,
      weight: s.weight,
      blood_type: s.bloodType,
      health_notes: s.healthNotes,
      hobbies: s.hobbies,
      ambition: s.ambition,
      achievements: s.achievements,
      violations: s.violations,
      behavior_score: s.behaviorScore,
      photo: s.photo,
      teacher_notes: s.teacherNotes
    }));
    return await supabase.from('students').insert(dbStudents);
  },

  updateStudent: async (student: Student): Promise<void> => {
    const dbStudent = {
      class_id: student.classId,
      nis: student.nis,
      nisn: student.nisn,
      name: student.name,
      gender: student.gender,
      birth_place: student.birthPlace,
      birth_date: student.birthDate,
      religion: student.religion,
      address: student.address,
      father_name: student.fatherName,
      father_job: student.fatherJob,
      father_education: student.fatherEducation,
      mother_name: student.motherName,
      mother_job: student.motherJob,
      mother_education: student.motherEducation,
      parent_name: student.parentName,
      parent_phone: student.parentPhone,
      parent_job: student.parentJob,
      economy_status: student.economyStatus,
      height: student.height,
      weight: student.weight,
      blood_type: student.bloodType,
      health_notes: student.healthNotes,
      hobbies: student.hobbies,
      ambition: student.ambition,
      achievements: student.achievements,
      violations: student.violations,
      behavior_score: student.behaviorScore,
      present: student.attendance.present,
      sick: student.attendance.sick,
      permit: student.attendance.permit,
      alpha: student.attendance.alpha,
      photo: student.photo,
      teacher_notes: student.teacherNotes
    };
    await supabase.from('students').update(dbStudent).eq('id', student.id);
  },

  deleteStudent: async (id: string): Promise<void> => {
    await supabase.from('students').delete().eq('id', id);
  },

  // --- Agendas ---
  getAgendas: async (currentUser: User | null): Promise<AgendaItem[]> => {
    const { data, error } = await supabase.from('agendas').select('*');
    if (error) return [];
    return data.map((a: any) => ({ 
      ...a, 
      classId: a.class_id,
      endDate: a.end_date 
    }));
  },
  createAgenda: async (agenda: AgendaItem): Promise<void> => {
    console.log("Creating agenda:", agenda);
    const { error } = await supabase.from('agendas').insert([{
      class_id: agenda.classId,
      title: agenda.title,
      date: agenda.date,
      end_date: agenda.endDate,
      time: agenda.time,
      type: agenda.type,
      completed: agenda.completed
    }]);
    if (error) console.error("Error creating agenda:", error);
  },
  updateAgenda: async (agenda: AgendaItem): Promise<void> => {
    await supabase.from('agendas').update({
      class_id: agenda.classId,
      title: agenda.title,
      date: agenda.date,
      end_date: agenda.endDate,
      time: agenda.time,
      type: agenda.type,
      completed: agenda.completed
    }).eq('id', agenda.id);
  },
  deleteAgenda: async (id: string): Promise<void> => {
    await supabase.from('agendas').delete().eq('id', id);
  },

  // --- Materials ---
  getMaterials: async (classId: string): Promise<Material[]> => {
    console.log("Fetching materials for classId:", classId);
    const { data, error } = await supabase.from('materials').select('*').eq('class_id', classId);
    if (error) {
      console.error("Error fetching materials:", error);
      return [];
    }
    console.log("Materials fetched from Supabase:", data);
    return data.map((m: any) => ({
      id: m.id,
      classId: m.class_id,
      subjectId: m.subject_id,
      title: m.title,
      description: m.description,
      link: m.link,
      isVisible: m.is_visible,
      createdAt: m.created_at
    }));
  },
  createMaterial: async (material: Omit<Material, 'id' | 'createdAt'>): Promise<void> => {
    const { error } = await supabase.from('materials').insert([{
      class_id: material.classId,
      subject_id: material.subjectId,
      title: material.title,
      description: material.description,
      link: material.link,
      is_visible: material.isVisible
    }]);
    if (error) {
      console.error("Error creating material:", error);
      throw error;
    }
  },
  updateMaterial: async (material: Material): Promise<void> => {
    const { error } = await supabase.from('materials').update({
      subject_id: material.subjectId,
      title: material.title,
      description: material.description,
      link: material.link,
      is_visible: material.isVisible
    }).eq('id', material.id);
    if (error) {
      console.error("Error updating material:", error);
      throw error;
    }
  },
  deleteMaterial: async (id: string): Promise<void> => {
    const { error } = await supabase.from('materials').delete().eq('id', id);
    if (error) {
      console.error("Error deleting material:", error);
      throw error;
    }
  },

  // --- Grades ---
  getGrades: async (currentUser: User | null): Promise<GradeRecord[]> => {
    const { data, error } = await supabase.from('grades').select('*');
    if (error) return [];
    
    const gradeMap: Record<string, GradeRecord> = {};
    data.forEach((row: any) => {
      if (!gradeMap[row.student_id]) {
        gradeMap[row.student_id] = {
          studentId: row.student_id,
          classId: row.class_id,
          subjects: {}
        };
      }
      gradeMap[row.student_id].subjects[row.subject_id] = {
        sum1: Number(row.sum1),
        sum2: Number(row.sum2),
        sum3: Number(row.sum3),
        sum4: Number(row.sum4),
        sas: Number(row.sas)
      };
    });
    return Object.values(gradeMap);
  },
  getGradesForStudent: async (studentId: string): Promise<GradeRecord | null> => {
    const { data, error } = await supabase.from('grades').select('*').eq('student_id', studentId);
    if (error || !data || data.length === 0) return null;
    
    const record: GradeRecord = {
      studentId,
      classId: data[0].class_id,
      subjects: {}
    };
    
    data.forEach((row: any) => {
      record.subjects[row.subject_id] = {
        sum1: Number(row.sum1),
        sum2: Number(row.sum2),
        sum3: Number(row.sum3),
        sum4: Number(row.sum4),
        sas: Number(row.sas)
      };
    });
    return record;
  },
  deleteGradesForStudent: async (studentId: string): Promise<void> => {
    const { error } = await supabase.from('grades').delete().eq('student_id', studentId);
    if (error) console.error('Error deleting grades:', error);
  },
  getGradeHistory: async (studentId: string): Promise<any[]> => {
    const { data, error } = await supabase.from('class_config').select('data').eq('class_id', `grade_history_${studentId}`).single();
    if (error || !data) return [];
    return data.data?.history || [];
  },
  saveGradeHistory: async (studentId: string, historyEntry: any): Promise<void> => {
    const historyId = `grade_history_${studentId}`;
    const { data: existing } = await supabase.from('class_config').select('data').eq('class_id', historyId).single();
    const currentData = existing?.data || { history: [] };
    
    // Check if entry already exists for this semester and year
    const existingIndex = currentData.history.findIndex((h: any) => h.id === historyEntry.id);
    if (existingIndex >= 0) {
      currentData.history[existingIndex] = historyEntry;
    } else {
      currentData.history.push(historyEntry);
    }
    
    await supabase.from('class_config').upsert({ class_id: historyId, data: currentData }, { onConflict: 'class_id' });
  },
  saveGrade: async (studentId: string, subjectId: string, gradeData: GradeData, classId: string): Promise<void> => {
    const { error } = await supabase.from('grades').upsert({
      student_id: studentId,
      subject_id: subjectId,
      class_id: classId,
      sum1: gradeData.sum1,
      sum2: gradeData.sum2,
      sum3: gradeData.sum3,
      sum4: gradeData.sum4,
      sas: gradeData.sas
    }, { onConflict: 'student_id,subject_id' });
    if (error) console.error('Error saving grade:', error);
  },

  // --- Counseling ---
  getCounselingLogs: async (currentUser: User | null): Promise<BehaviorLog[]> => {
    const { data, error } = await supabase.from('counseling').select('*');
    if (error) return [];
    return data.map((l: any) => ({
      ...l,
      classId: l.class_id,
      studentId: l.student_id,
      studentName: l.student_name
    }));
  },
  createCounselingLog: async (log: BehaviorLog): Promise<void> => {
    await supabase.from('counseling').insert([{
      class_id: log.classId,
      student_id: log.studentId,
      student_name: log.studentName,
      date: log.date,
      type: log.type,
      category: log.category,
      description: log.description,
      point: log.point,
      emotion: log.emotion,
      status: log.status
    }]);
  },

  // --- Extracurriculars ---
  getExtracurriculars: async (currentUser: User | null): Promise<Extracurricular[]> => {
    const { data, error } = await supabase.from('extracurriculars').select('*');
    if (error) return [];
    return data.map((e: any) => ({ ...e, classId: e.class_id }));
  },
  createExtracurricular: async (extra: Extracurricular): Promise<void> => {
    console.log("Creating extracurricular:", extra);
    const { error } = await supabase.from('extracurriculars').insert([{
      class_id: extra.classId,
      name: extra.name,
      category: extra.category,
      schedule: extra.schedule,
      coach: extra.coach,
      members: extra.members
    }]);
    if (error) console.error("Error creating extracurricular:", error);
  },
  updateExtracurricular: async (extra: Extracurricular): Promise<void> => {
    await supabase.from('extracurriculars').update({
      class_id: extra.classId,
      name: extra.name,
      category: extra.category,
      schedule: extra.schedule,
      coach: extra.coach,
      members: extra.members
    }).eq('id', extra.id);
  },
  deleteExtracurricular: async (id: string): Promise<void> => {
    await supabase.from('extracurriculars').delete().eq('id', id);
  },

  // --- Profiles ---
  getProfiles: async (): Promise<{ teacher?: TeacherProfileData, school?: SchoolProfileData }> => {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) return {};
    const profiles: any = {};
    data.forEach((p: any) => {
      profiles[p.id] = p.data;
    });
    return profiles;
  },
  saveProfile: async (type: 'teacher' | 'school', data: any): Promise<void> => {
    const { error } = await supabase.from('profiles').upsert({ id: type, data });
    if (error) {
      console.error("Error saving profile:", error);
      throw error;
    }
  },

  // --- Holidays ---
  getHolidays: async (currentUser: User | null): Promise<Holiday[]> => {
    const { data, error } = await supabase.from('holidays').select('*');
    if (error) return [];
    return data.map((h: any) => ({ ...h, classId: h.class_id }));
  },
  saveHolidayBatch: async (holidays: Omit<Holiday, 'id'>[]): Promise<void> => {
    if (holidays.length === 0) return;

    const dbHolidays = holidays.map(h => ({
      class_id: h.classId,
      date: h.date,
      description: h.description,
      type: h.type
    }));

    // Extract unique dates and class_ids to delete existing ones
    const dates = [...new Set(holidays.map(h => h.date))];
    const classIds = [...new Set(holidays.map(h => h.classId))];

    // Delete existing holidays for these dates and class_ids to prevent duplicates
    if (dates.length > 0 && classIds.length > 0) {
      await supabase
        .from('holidays')
        .delete()
        .in('date', dates)
        .in('class_id', classIds);
    }

    await supabase.from('holidays').insert(dbHolidays);
  },
  updateHoliday: async (holiday: Holiday): Promise<void> => {
    await supabase.from('holidays').update({
      class_id: holiday.classId,
      date: holiday.date,
      description: holiday.description,
      type: holiday.type
    }).eq('id', holiday.id);
  },
  deleteHoliday: async (id: string): Promise<void> => {
    await supabase.from('holidays').delete().eq('id', id);
  },

  // --- Attendance ---
  getAttendance: async (currentUser: User | null): Promise<any[]> => {
    const { data, error } = await supabase.from('attendance').select('*');
    if (error) return [];
    const allRecords: any[] = [];
    data.forEach((row: any) => {
      const parts = row.id.split('_');
      const classId = parts[0];
      const date = parts[1];
      if (Array.isArray(row.records)) {
        row.records.forEach((rec: any) => {
          allRecords.push({ ...rec, date, classId });
        });
      }
    });
    return allRecords;
  },
  saveAttendance: async (date: string, records: any[]): Promise<void> => {
    const classGroups: Record<string, any[]> = {};
    records.forEach(r => {
      if (!classGroups[r.classId]) classGroups[r.classId] = [];
      classGroups[r.classId].push({ studentId: r.studentId, status: r.status, notes: r.notes });
    });
    for (const classId in classGroups) {
      const id = `${classId}_${date}`;
      await supabase.from('attendance').upsert({ id, records: classGroups[classId] });
    }
  },
  saveAttendanceBatch: async (batchData: { date: string, records: any[] }[]): Promise<void> => {
    const upserts: any[] = [];
    const classGroupsByDate: Record<string, Record<string, any[]>> = {};

    batchData.forEach(d => {
      d.records.forEach(r => {
        if (!classGroupsByDate[d.date]) classGroupsByDate[d.date] = {};
        if (!classGroupsByDate[d.date][r.classId]) classGroupsByDate[d.date][r.classId] = [];
        classGroupsByDate[d.date][r.classId].push({ studentId: r.studentId, status: r.status, notes: r.notes });
      });
    });

    for (const date in classGroupsByDate) {
      for (const classId in classGroupsByDate[date]) {
        upserts.push({
          id: `${classId}_${date}`,
          records: classGroupsByDate[date][classId]
        });
      }
    }

    if (upserts.length > 0) {
      const { error } = await supabase.from('attendance').upsert(upserts);
      if (error) throw error;
    }
  },

  // --- Sikap & Karakter ---
  getSikapAssessments: async (currentUser: User | null): Promise<SikapAssessment[]> => {
    const { data, error } = await supabase.from('penilaian_sikap').select('*');
    if (error) return [];
    return data.map((s: any) => ({
      ...s,
      studentId: s.student_id,
      classId: s.class_id,
      penalaranKritis: Number(s.penalaran_kritis)
    }));
  },
  saveSikapAssessment: async (studentId: string, classId: string, assessment: any): Promise<void> => {
    await supabase.from('penilaian_sikap').upsert({
      student_id: studentId,
      class_id: classId,
      keimanan: assessment.keimanan,
      kewargaan: assessment.kewargaan,
      penalaran_kritis: assessment.penalaranKritis,
      kreativitas: assessment.kreativitas,
      kolaborasi: assessment.kolaborasi,
      kemandirian: assessment.kemandirian,
      kesehatan: assessment.kesehatan,
      komunikasi: assessment.komunikasi
    });
  },
  getKarakterAssessments: async (currentUser: User | null): Promise<KarakterAssessment[]> => {
    const { data, error } = await supabase.from('penilaian_karakter').select('*');
    if (error) return [];
    return data.map((k: any) => ({
      ...k,
      studentId: k.student_id,
      classId: k.class_id,
      bangunPagi: k.bangun_pagi,
      tidurAwal: k.tidur_awal
    }));
  },
  saveKarakterAssessment: async (studentId: string, classId: string, assessment: any): Promise<void> => {
    await supabase.from('penilaian_karakter').upsert({
      student_id: studentId,
      class_id: classId,
      bangun_pagi: assessment.bangunPagi,
      beribadah: assessment.beribadah,
      berolahraga: assessment.berolahraga,
      makan_sehat: assessment.makanSehat,
      gemar_belajar: assessment.gemarBelajar,
      bermasyarakat: assessment.bermasyarakat,
      tidur_awal: assessment.tidurAwal,
      catatan: assessment.catatan,
      afirmasi: assessment.afirmasi
    });
  },

  // --- Employment Links ---
  getEmploymentLinks: async (): Promise<EmploymentLink[]> => {
    const { data, error } = await supabase.from('employment_links').select('*');
    if (error) return [];
    return data;
  },
  saveEmploymentLink: async (link: any): Promise<void> => {
    if (link.id) {
      await supabase.from('employment_links').update(link).eq('id', link.id);
    } else {
      await supabase.from('employment_links').insert([link]);
    }
  },
  deleteEmploymentLink: async (id: string): Promise<void> => {
    await supabase.from('employment_links').delete().eq('id', id);
  },

  // --- Inventory ---
  getInventory: async (classId: string): Promise<InventoryItem[]> => {
    const query = supabase.from('inventory').select('*');
    if (classId !== 'ALL') query.eq('class_id', classId);
    const { data, error } = await query;
    if (error) return [];
    return data.map((i: any) => ({ ...i, classId: i.class_id }));
  },
  saveInventory: async (item: InventoryItem): Promise<void> => {
    const dbItem = { id: item.id, class_id: item.classId, name: item.name, condition: item.condition, qty: item.qty };
    const { data: existing } = await supabase.from('inventory').select('id').eq('id', item.id).single();
    
    if (existing) {
      await supabase.from('inventory').update({ ...dbItem, id: undefined }).eq('id', item.id);
    } else {
      await supabase.from('inventory').insert([dbItem]);
    }
  },
  deleteInventory: async (id: string, classId: string): Promise<any> => {
    return await supabase.from('inventory').delete().eq('id', id);
  },

  // --- Guests ---
  getGuests: async (classId: string): Promise<Guest[]> => {
    const { data, error } = await supabase.from('guests').select('*').eq('class_id', classId);
    if (error) return [];
    return data.map((g: any) => ({ ...g, classId: g.class_id }));
  },
  saveGuest: async (guest: Guest): Promise<void> => {
    const dbGuest = { id: guest.id, class_id: guest.classId, date: guest.date, time: guest.time, name: guest.name, agency: guest.agency, purpose: guest.purpose };
    const { data: existing } = await supabase.from('guests').select('id').eq('id', guest.id).single();
    
    if (existing) {
      await supabase.from('guests').update({ ...dbGuest, id: undefined }).eq('id', guest.id);
    } else {
      await supabase.from('guests').insert([dbGuest]);
    }
  },
  deleteGuest: async (id: string, classId: string): Promise<any> => {
    return await supabase.from('guests').delete().eq('id', id);
  },

  // --- Class Config (Schedule, Piket, Seating, KKTP) ---
  getClassConfig: async (classId: string): Promise<{
      schedule: ScheduleItem[], 
      piket: PiketGroup[], 
      seats: SeatingLayouts, 
      kktp?: Record<string, number>, 
      academicCalendar?: AcademicCalendarData, 
      timeSlots?: string[], 
      organization?: OrganizationStructure,
      settings?: { showStudentRecap?: boolean; showSummativeToStudents?: boolean } 
  }> => {
     const defaultConfig = {schedule: [], piket: [], seats: { classical: [], groups: [], ushape: [] }, academicCalendar: {}, timeSlots: [], organization: { roles: {}, sections: [] }, settings: {} };
     if (!classId) return defaultConfig;
     
     const { data, error } = await supabase.from('class_config').select('data').eq('class_id', classId).single();
     if (error || !data) return defaultConfig;
     return { ...defaultConfig, ...data.data };
  },
  saveClassConfig: async (key: string, data: any, classId: string): Promise<void> => {
     const { data: existing } = await supabase.from('class_config').select('data').eq('class_id', classId).single();
     const currentData = existing?.data || {};
     currentData[key] = data;
     await supabase.from('class_config').upsert({ class_id: classId, data: currentData }, { onConflict: 'class_id' });
  },

  // --- Learning Reports ---
  getLearningReports: async (classId: string): Promise<LearningReport[]> => {
    const { data, error } = await supabase.from('learning_reports').select('*').eq('class_id', classId);
    if (error) return [];
    return data.map((r: any) => ({ ...r, classId: r.class_id, documentLink: r.document_link, teacherName: r.teacher_name }));
  },
  saveLearningReport: async (report: any): Promise<void> => {
    console.log("Saving report:", report);
    const dbReport = {
      class_id: report.classId,
      school_id: report.schoolId,
      date: report.date,
      type: report.type,
      subject: report.subject,
      topic: report.topic,
      document_link: report.documentLink,
      teacher_name: report.teacherName
    };
    console.log("dbReport:", dbReport);
    if (report.id && !report.id.startsWith('report-')) {
      const { error } = await supabase.from('learning_reports').update(dbReport).eq('id', report.id);
      if (error) console.error("Update error:", error);
    } else {
      const { error } = await supabase.from('learning_reports').insert([dbReport]);
      if (error) console.error("Insert error:", error);
    }
  },
  deleteLearningReport: async (id: string, classId: string): Promise<void> => {
    await supabase.from('learning_reports').delete().eq('id', id);
  },

  // --- Learning Journal ---
  getLearningJournal: async (classId: string): Promise<LearningJournalEntry[]> => {
    const { data, error } = await supabase.from('jurnal_kelas').select('*').eq('class_id', classId);
    if (error) return [];
    
    const entries: LearningJournalEntry[] = [];
    data.forEach((row: any) => {
        if (Array.isArray(row.content)) {
            row.content.forEach((item: any) => {
                entries.push({
                    ...item,
                    classId: row.class_id,
                    date: row.date,
                    day: row.day
                });
            });
        }
    });
    return entries;
  },
  saveLearningJournalBatch: async (entries: any[]): Promise<void> => {
    // Group entries by date
    const entriesByDate: Record<string, any[]> = {};
    entries.forEach(e => {
        if (!entriesByDate[e.date]) {
            entriesByDate[e.date] = [];
        }
        entriesByDate[e.date].push(e);
    });

    const dbRows = Object.keys(entriesByDate).map(date => {
        const dateEntries = entriesByDate[date];
        const firstEntry = dateEntries[0];
        
        const content = dateEntries.map(e => ({
            id: (e.id && !e.id.startsWith('temp-') && !e.id.startsWith('manual-')) ? e.id : crypto.randomUUID(),
            timeSlot: e.timeSlot,
            subject: e.subject,
            topic: e.topic,
            activities: e.activities,
            evaluation: e.evaluation,
            reflection: e.reflection,
            followUp: e.followUp,
            model: e.model,
            pendekatan: e.pendekatan,
            metode: e.metode
        }));

        return {
            class_id: firstEntry.classId,
            date: date,
            day: firstEntry.day,
            content: content
        };
    });

    const { error } = await supabase.from('jurnal_kelas').upsert(dbRows, { onConflict: 'class_id, date' });
    if (error) throw error;
  },
  deleteLearningJournal: async (id: string, classId: string): Promise<void> => {
    // Find the row containing the entry
    const { data, error } = await supabase
      .from('jurnal_kelas')
      .select('*')
      .eq('class_id', classId)
      .filter('content', 'cs', `[{"id": "${id}"}]`);
    
    if (error || !data || data.length === 0) return;

    const row = data[0];
    const newContent = row.content.filter((entry: any) => entry.id !== id);

    await supabase
      .from('jurnal_kelas')
      .update({ content: newContent })
      .eq('id', row.id);
  },

  // --- Learning Documentation ---
  getLearningDocumentation: async (classId: string): Promise<LearningDocumentation[]> => {
    const { data, error } = await supabase.from('learning_documentation').select('*').eq('class_id', classId);
    if (error) return [];
    return data.map((d: any) => ({ ...d, classId: d.class_id, namaKegiatan: d.nama_kegiatan, linkFoto: d.link_foto }));
  },
  saveLearningDocumentation: async (doc: any): Promise<void> => {
    const dbDoc = { class_id: doc.classId, nama_kegiatan: doc.namaKegiatan, link_foto: doc.linkFoto };
    if (doc.id) {
      await supabase.from('learning_documentation').update(dbDoc).eq('id', doc.id);
    } else {
      await supabase.from('learning_documentation').insert([dbDoc]);
    }
  },
  deleteLearningDocumentation: async (id: string, classId: string): Promise<void> => {
    await supabase.from('learning_documentation').delete().eq('id', id);
  },

  // --- Liaison Logs ---
  getLiaisonLogs: async (currentUser: User | null): Promise<LiaisonLog[]> => {
    const { data, error } = await supabase.from('buku_penghubung').select('*');
    if (error) return [];
    return data.map((l: any) => ({ ...l, classId: l.class_id, studentId: l.student_id }));
  },
  saveLiaisonLog: async (log: any): Promise<void> => {
    await supabase.from('buku_penghubung').insert([{
      class_id: log.classId,
      student_id: log.studentId,
      date: log.date,
      sender: log.sender,
      message: log.message,
      status: log.status,
      category: log.category,
      response: log.response
    }]);
  },
  updateLiaisonStatus: async (ids: string[], status: string): Promise<void> => {
    await supabase.from('buku_penghubung').update({ status }).in('id', ids);
  },
  replyLiaisonLog: async (id: string, response: string): Promise<void> => {
    await supabase.from('buku_penghubung').update({ response, status: 'Diterima' }).eq('id', id);
  },

  // --- Permission Requests ---
  getPermissionRequests: async (currentUser: User | null): Promise<PermissionRequest[]> => {
    const { data, error } = await supabase.from('permission_requests').select('*');
    if (error) return [];
    return data.map((p: any) => ({ ...p, classId: p.class_id, studentId: p.student_id }));
  },
  savePermissionRequest: async (request: any): Promise<void> => {
    await supabase.from('permission_requests').insert([{
      class_id: request.classId,
      student_id: request.studentId,
      date: request.date,
      type: request.type,
      reason: request.reason,
      status: 'Pending'
    }]);
  },
  processPermissionRequest: async (id: string, actionStatus: string): Promise<void> => {
    const newStatus = actionStatus === 'approve' ? 'Approved' : 'Rejected';
    
    // 1. Get request details
    const { data: request, error: fetchError } = await supabase
        .from('permission_requests')
        .select('*')
        .eq('id', id)
        .single();
    
    if (fetchError || !request) throw fetchError || new Error('Request not found');

    // 2. Update status
    await supabase.from('permission_requests').update({ status: newStatus }).eq('id', id);

    // 3. If approved, add to attendance
    if (actionStatus === 'approve') {
        const attendanceId = `${request.class_id}_${request.date}`;
        
        // Get existing attendance
        const { data: attendance, error: attError } = await supabase
            .from('attendance')
            .select('*')
            .eq('id', attendanceId)
            .single();
        
        const newRecord = {
            studentId: request.student_id,
            status: request.type, // Maps to attendance status ('sick', 'permit', 'dispensation')
            notes: request.reason
        };

        if (attendance) {
            // Update existing - filter out old record for this student to avoid duplicates
            const otherRecords = (attendance.records || []).filter((r: any) => r.studentId !== request.student_id);
            const records = [...otherRecords, newRecord];
            await supabase.from('attendance').update({ records }).eq('id', attendanceId);
        } else {
            // Create new
            await supabase.from('attendance').insert([{
                id: attendanceId,
                records: [newRecord]
            }]);
        }
    } else if (actionStatus === 'reject') {
        // If rejected, ensure it's NOT in attendance (remove if exists)
        const attendanceId = `${request.class_id}_${request.date}`;
        const { data: attendance } = await supabase
            .from('attendance')
            .select('*')
            .eq('id', attendanceId)
            .single();
        
        if (attendance && attendance.records) {
            const filteredRecords = attendance.records.filter((r: any) => r.studentId !== request.student_id);
            if (filteredRecords.length !== attendance.records.length) {
                await supabase.from('attendance').update({ records: filteredRecords }).eq('id', attendanceId);
            }
        }
    }
  },

  // --- Support Documents ---
  getSupportDocuments: async (currentUser: User | null): Promise<SupportDocument[]> => {
    const { data, error } = await supabase.from('support_documents').select('*');
    if (error) return [];
    return data.map((d: any) => ({ ...d, classId: d.class_id }));
  },
  saveSupportDocument: async (doc: any): Promise<void> => {
    const dbDoc = { class_id: doc.classId, name: doc.name, url: doc.url };
    if (doc.id) {
      await supabase.from('support_documents').update(dbDoc).eq('id', doc.id);
    } else {
      await supabase.from('support_documents').insert([dbDoc]);
    }
  },
  deleteSupportDocument: async (id: string, classId: string): Promise<void> => {
    await supabase.from('support_documents').delete().eq('id', id);
  },

  // --- School Assets (Sarana Prasarana) ---
  getSchoolAssets: async (): Promise<SchoolAsset[]> => {
    const { data, error } = await supabase.from('school_assets').select('*');
    if (error) return [];
    return data;
  },
  saveSchoolAsset: async (asset: SchoolAsset): Promise<void> => {
    const dbAsset = {
      id: asset.id,
      name: asset.name,
      qty: asset.qty,
      condition: asset.condition,
      location: asset.location
    };
    
    const { data: existing } = await supabase.from('school_assets').select('id').eq('id', asset.id).single();

    if (existing) {
      await supabase.from('school_assets').update({ ...dbAsset, id: undefined }).eq('id', asset.id);
    } else {
      await supabase.from('school_assets').insert([dbAsset]);
    }
  },
  deleteSchoolAsset: async (id: string): Promise<void> => {
    await supabase.from('school_assets').delete().eq('id', id);
  },

  // --- Academic Calendar ---
  getAcademicCalendar: async (id: string = 'global'): Promise<AcademicCalendarData> => {
    const { data, error } = await supabase
      .from('academic_calendar')
      .select('data')
      .eq('id', id)
      .single();
    
    if (error) {
      // It's normal to not find a row if it hasn't been created yet
      if (error.code !== 'PGRST116') {
        console.error('Error fetching academic calendar:', error);
      }
      return {};
    }
    if (!data) return {};
    return data.data as AcademicCalendarData;
  },
  saveAcademicCalendar: async (data: AcademicCalendarData, id: string = 'global'): Promise<void> => {
    const { error } = await supabase
      .from('academic_calendar')
      .upsert({ id, data, updated_at: new Date().toISOString() });
    
    if (error) {
      console.error('Error saving academic calendar:', error);
      throw error;
    }
  },

  // --- Schedule ---
  getSchedule: async (classId: string): Promise<ScheduleItem[]> => {
    const { data, error } = await supabase.from('schedule').select('*').eq('class_id', classId);
    if (error) {
      console.error('Error fetching schedule:', error);
      return [];
    }
    return data.map((s: any) => ({ id: s.id, day: s.day, time: s.time, subject: s.subject }));
  },
  saveSchedule: async (classId: string, schedule: ScheduleItem[]): Promise<void> => {
    // First, delete existing schedule for this class
    const { error: deleteError } = await supabase.from('schedule').delete().eq('class_id', classId);
    if (deleteError) {
      console.error('Error deleting old schedule:', deleteError);
      throw deleteError;
    }

    if (schedule.length === 0) return;

    // Then insert new schedule
    const dbSchedule = schedule.map(s => ({
      class_id: classId,
      day: s.day,
      time: s.time,
      subject: s.subject
    }));

    const { error: insertError } = await supabase.from('schedule').insert(dbSchedule);
    if (insertError) {
      console.error('Error saving schedule:', insertError);
      throw insertError;
    }
  },

  // --- Book Loans ---
  getBookLoans: async (currentUser: User | null): Promise<BookLoan[]> => {
    const { data, error } = await supabase.from('book_loans').select('*');
    if (error) return [];
    return data.map((l: any) => ({ ...l, classId: l.class_id, studentId: l.student_id, studentName: l.student_name }));
  },
  saveBookLoan: async (loan: BookLoan): Promise<void> => {
    const dbLoan = {
      id: loan.id,
      student_id: loan.studentId,
      student_name: loan.studentName,
      class_id: loan.classId,
      books: loan.books,
      qty: loan.qty,
      status: loan.status,
      date: loan.date,
      notes: loan.notes
    };
    
    const { data: existing } = await supabase.from('book_loans').select('id').eq('id', loan.id).single();

    if (existing) {
      await supabase.from('book_loans').update({ ...dbLoan, id: undefined }).eq('id', loan.id);
    } else {
      await supabase.from('book_loans').insert([dbLoan]);
    }
  },
  deleteBookLoan: async (id: string): Promise<void> => {
    await supabase.from('book_loans').delete().eq('id', id);
  },

  // --- Book Inventory ---
  getBookInventory: async (classId: string): Promise<BookInventory[]> => {
    const { data, error } = await supabase.from('book_inventory').select('*').eq('class_id', classId);
    if (error) return [];
    return data.map((b: any) => ({
      ...b,
      classId: b.class_id,
      subjectId: b.subject_id,
      totalStock: Number(b.total_stock),
      coverUrl: b.cover_url
    }));
  },
  saveBookInventory: async (inventory: BookInventory[]): Promise<void> => {
    const dbInventory = inventory.map(b => ({
      id: b.id,
      class_id: b.classId,
      subject_id: b.subjectId,
      name: b.name,
      stock: b.stock,
      total_stock: b.totalStock,
      cover_url: b.coverUrl
    }));
    await supabase.from('book_inventory').upsert(dbInventory);
  },
  uploadBookCover: async (bookId: string, coverUrl: string): Promise<void> => {
    await supabase.from('book_inventory').update({ cover_url: coverUrl }).eq('id', bookId);
  },

  // --- BOS Management ---
  getBOS: async (): Promise<BOSTransaction[]> => {
    const { data, error } = await supabase.from('bos_management').select('*');
    if (error) return [];
    return data;
  },
  saveBOS: async (transaction: BOSTransaction): Promise<void> => {
    const dbTransaction = {
      id: transaction.id,
      date: transaction.date,
      type: transaction.type,
      category: transaction.category,
      description: transaction.description,
      amount: transaction.amount
    };

    const { data: existing } = await supabase.from('bos_management').select('id').eq('id', transaction.id).single();

    if (existing) {
      await supabase.from('bos_management').update({ ...dbTransaction, id: undefined }).eq('id', transaction.id);
    } else {
      await supabase.from('bos_management').insert([dbTransaction]);
    }
  },
  deleteBOS: async (id: string): Promise<void> => {
    await supabase.from('bos_management').delete().eq('id', id);
  },

  // --- Backup/Restore ---
  backupData: async (classId: string): Promise<any> => {
    return { message: 'Backup logic needs implementation' };
  },
  restoreData: async (data: any): Promise<any> => {
    return { message: 'Restore logic needs implementation' };
  },
};
