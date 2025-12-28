"use client";

import { Plus, X, Edit, Trash2, ChevronDown, BookOpen, Users, Loader2, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

// ==================== Types ====================
interface SectionSubject {
  id: string;
  name: string;
  tutor?: { id: string; name: string } | null;
}

interface Section {
  id: string;
  name: string;
  classTutor?: { id: string; name: string } | null;
  subjects: SectionSubject[];
}

interface Grade {
  id: string;
  name: string;
  order: number;
  sectionsCount: number;
  sections: Section[];
}

interface Tutor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface School {
  id: string;
  name: string;
  code: string;
  district?: string;
  isChainedSchool?: boolean;
  studentCount?: number;
}

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

interface Assignment {
  id: string;
  tutorId: string;
  tutorName: string;
  assignments: Record<string, string[]>;
  classGrade?: string;
  classSection?: string;
}

export default function SchoolAdminDashboard() {
  const router = useRouter();
  
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);

  const [isCreateClassOpen, setIsCreateClassOpen] = useState(false);
  const [isCreateTutorOpen, setIsCreateTutorOpen] = useState(false);
  const [isAssignTutorOpen, setIsAssignTutorOpen] = useState(false);
  const [isManageSubjectsOpen, setIsManageSubjectsOpen] = useState<{
    sectionId: string;
    sectionName: string;
    gradeName: string;
    gradeId: string;
  } | null>(null);

  const [classData, setClassData] = useState({
    id: null as string | null,
    name: "",
    sections: [""],
    sectionSubjects: { "": [] as string[] } as Record<string, string[]>,
  });
  const [tutorData, setTutorData] = useState({ id: null as string | null, name: "", email: "", phone: "" });
  const [assignmentData, setAssignmentData] = useState({ tutorId: "", assignments: {} as Record<string, string[]>, classGrade: "", classSection: "" });
  const [newSubjectName, setNewSubjectName] = useState("");
  const [sectionSubjectInputs, setSectionSubjectInputs] = useState<Record<number, string>>({});

  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingTutorId, setEditingTutorId] = useState<string | null>(null);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [savedAssignments, setSavedAssignments] = useState<Assignment[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [toastCounter, setToastCounter] = useState(0);

  const defaultSubjects = ["English", "Maths", "Science", "History", "Geography", "Social Studies", "Computer Science", "Physical Education", "Art", "Music"];

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = toastCounter;
    setToastCounter((prev) => prev + 1);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  };

  useEffect(() => {
    api.get("/auth/me").then((res) => {
      const { role, schoolId: userSchoolId } = res.data.data;
      if (role !== "SCHOOL_ADMIN") { router.push("/login"); return; }
      if (!userSchoolId) { showToast("No school assigned", "error"); router.push("/login"); return; }
      setSchoolId(userSchoolId);
    }).catch(() => router.push("/login"));
  }, [router]);

  const loadDashboard = async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const res = await api.get(`/schools/${schoolId}/dashboard`);
      setSchool(res.data.school);
      setGrades(res.data.grades || []);
      setTutors(res.data.tutors || []);
      try {
        const assignmentsRes = await api.get(`/schools/${schoolId}/assignments`);
        setSavedAssignments(assignmentsRes.data || []);
      } catch { setSavedAssignments([]); }
    } catch (error: any) {
      showToast("Failed to load school data", "error");
    } finally { setLoading(false); }
  };

  useEffect(() => { if (schoolId) loadDashboard(); }, [schoolId]);

  const handleLogout = () => { localStorage.removeItem("accessToken"); localStorage.removeItem("refreshToken"); router.push("/login"); };

  const handleCreateClass = async () => {
    if (!classData.name.trim()) { showToast("Please enter a class name", "error"); return; }
    const validSections = classData.sections.filter(s => s.trim());
    if (validSections.length === 0) { showToast("Please add at least one section", "error"); return; }
    try {
      setActionLoading(true);
      const sections = validSections.map((section) => ({ name: section.trim(), subjects: classData.sectionSubjects[section] || [] }));
      if (editingClassId) {
        await api.put(`/schools/${schoolId}/grades/${editingClassId}`, { name: classData.name, sections });
        showToast("Class updated successfully");
      } else {
        await api.post(`/schools/${schoolId}/grades`, { gradeName: classData.name, sections });
        showToast("Class created successfully");
      }
      setIsCreateClassOpen(false); setEditingClassId(null);
      setClassData({ id: null, name: "", sections: [""], sectionSubjects: { "": [] } });
      setSectionSubjectInputs({});
      await loadDashboard();
    } catch (error: any) { showToast(error.response?.data?.message || "Failed to save class", "error"); }
    finally { setActionLoading(false); }
  };

  const handleDeleteClass = async (gradeId: string) => {
    if (!confirm("Delete this class?")) return;
    try { setActionLoading(true); await api.delete(`/schools/${schoolId}/grades/${gradeId}`); showToast("Class deleted"); await loadDashboard(); }
    catch (error: any) { showToast(error.response?.data?.message || "Failed", "error"); }
    finally { setActionLoading(false); }
  };

  const handleEditClass = (grade: Grade) => {
    const sectionSubjects: Record<string, string[]> = {};
    grade.sections.forEach((s) => { sectionSubjects[s.name] = s.subjects.map((sub) => sub.name); });
    setClassData({ id: grade.id, name: grade.name, sections: grade.sections.map((s) => s.name), sectionSubjects });
    setEditingClassId(grade.id); setSectionSubjectInputs({}); setIsCreateClassOpen(true);
  };

  const handleCreateTutor = async () => {
    if (!tutorData.name.trim() || !tutorData.email.trim() || !tutorData.phone.trim()) { showToast("Please fill all fields", "error"); return; }
    try {
      setActionLoading(true);
      if (editingTutorId) { await api.put(`/schools/${schoolId}/tutors/${editingTutorId}`, tutorData); showToast("Tutor updated"); }
      else { const res = await api.post(`/schools/${schoolId}/tutors`, tutorData); showToast(`Tutor created! Password: ${res.data.temporaryPassword || 'Check email'}`); }
      setIsCreateTutorOpen(false); setEditingTutorId(null); setTutorData({ id: null, name: "", email: "", phone: "" });
      await loadDashboard();
    } catch (error: any) { showToast(error.response?.data?.message || "Failed", "error"); }
    finally { setActionLoading(false); }
  };

  const handleDeleteTutor = async (tutorId: string) => {
    if (!confirm("Delete this tutor?")) return;
    try { setActionLoading(true); await api.delete(`/schools/${schoolId}/tutors/${tutorId}`); showToast("Tutor deleted"); await loadDashboard(); }
    catch (error: any) { showToast(error.response?.data?.message || "Failed", "error"); }
    finally { setActionLoading(false); }
  };

  const handleEditTutor = (tutor: Tutor) => {
    setTutorData({ id: tutor.id, name: tutor.name, email: tutor.email || "", phone: tutor.phone || "" });
    setEditingTutorId(tutor.id); setIsCreateTutorOpen(true);
  };

  const getAssignmentKey = (gradeName: string, section: string) => `${gradeName}-${section}`;

  const toggleSubjectForSection = (gradeName: string, section: string, subject: string) => {
    const key = getAssignmentKey(gradeName, section);
    const current = assignmentData.assignments[key] || [];
    setAssignmentData({ ...assignmentData, assignments: { ...assignmentData.assignments, [key]: current.includes(subject) ? current.filter((s) => s !== subject) : [...current, subject] } });
  };

  const handleAssignTutor = async () => {
    if (!assignmentData.tutorId) { showToast("Please select a tutor", "error"); return; }
    const hasAny = Object.values(assignmentData.assignments).some((s) => Array.isArray(s) && s.length > 0);
    if (!hasAny && !assignmentData.classGrade) { showToast("Please assign at least one subject or class tutor role", "error"); return; }
    try {
      setActionLoading(true);
      await api.post(`/schools/${schoolId}/assignments`, { tutorId: assignmentData.tutorId, assignments: assignmentData.assignments, classGrade: assignmentData.classGrade || undefined, classSection: assignmentData.classSection || undefined });
      showToast("Tutor assigned"); setIsAssignTutorOpen(false);
      setAssignmentData({ tutorId: "", assignments: {}, classGrade: "", classSection: "" }); setEditingAssignmentId(null);
      await loadDashboard();
    } catch (error: any) { showToast(error.response?.data?.message || "Failed", "error"); }
    finally { setActionLoading(false); }
  };

  const handleEditAssignment = (a: Assignment) => {
    setAssignmentData({ tutorId: a.tutorId, assignments: a.assignments, classGrade: a.classGrade || "", classSection: a.classSection || "" });
    setEditingAssignmentId(a.id); setIsAssignTutorOpen(true);
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!confirm("Delete this assignment?")) return;
    try { setActionLoading(true); await api.delete(`/schools/${schoolId}/assignments/${id}`); showToast("Assignment deleted"); await loadDashboard(); }
    catch (error: any) { showToast(error.response?.data?.message || "Failed", "error"); }
    finally { setActionLoading(false); }
  };

  const handleAddSubjectToSection = async () => {
    if (!isManageSubjectsOpen || !newSubjectName.trim()) { showToast("Please enter a subject name", "error"); return; }
    try {
      setActionLoading(true);
      await api.post(`/schools/${schoolId}/grades/sections/${isManageSubjectsOpen.sectionId}/subjects`, { name: newSubjectName.trim() });
      showToast("Subject added"); setNewSubjectName(""); await loadDashboard();
    } catch (error: any) { showToast(error.response?.data?.message || "Failed", "error"); }
    finally { setActionLoading(false); }
  };

  const handleDeleteSubjectFromSection = async (subjectId: string) => {
    if (!confirm("Remove this subject?")) return;
    try { setActionLoading(true); await api.delete(`/schools/${schoolId}/grades/section-subjects/${subjectId}`); showToast("Subject removed"); await loadDashboard(); }
    catch (error: any) { showToast(error.response?.data?.message || "Failed", "error"); }
    finally { setActionLoading(false); }
  };

  const handleAssignTutorToSubject = async (sectionSubjectId: string, tutorId: string) => {
    try {
      setActionLoading(true);
      let targetSection: Section | null = null, targetGrade: Grade | null = null;
      for (const grade of grades) { for (const section of grade.sections) { if (section.subjects.some((s) => s.id === sectionSubjectId)) { targetSection = section; targetGrade = grade; break; } } if (targetSection) break; }
      if (!targetSection || !targetGrade) { showToast("Section not found", "error"); return; }
      const subject = targetSection.subjects.find((s) => s.id === sectionSubjectId);
      if (!subject) { showToast("Subject not found", "error"); return; }
      await api.post(`/schools/${schoolId}/assignments`, { tutorId, assignments: { [`${targetGrade.name}-${targetSection.name}`]: [subject.name] } });
      showToast("Tutor assigned to subject"); await loadDashboard();
    } catch (error: any) { showToast(error.response?.data?.message || "Failed", "error"); }
    finally { setActionLoading(false); }
  };

  const addMoreSection = () => { setClassData({ ...classData, sections: [...classData.sections, ""], sectionSubjects: { ...classData.sectionSubjects, "": [] } }); };

  const removeSection = (index: number) => {
    if (classData.sections.length > 1) {
      const toRemove = classData.sections[index];
      const newSubjects = { ...classData.sectionSubjects }; delete newSubjects[toRemove];
      setClassData({ ...classData, sections: classData.sections.filter((_, i) => i !== index), sectionSubjects: newSubjects });
      const newInputs = { ...sectionSubjectInputs }; delete newInputs[index]; setSectionSubjectInputs(newInputs);
    }
  };

  const updateSectionName = (index: number, newName: string) => {
    const oldName = classData.sections[index];
    const newSections = [...classData.sections]; newSections[index] = newName;
    const newSubjects = { ...classData.sectionSubjects }; newSubjects[newName] = newSubjects[oldName] || [];
    if (oldName !== newName) delete newSubjects[oldName];
    setClassData({ ...classData, sections: newSections, sectionSubjects: newSubjects });
  };

  const toggleSubjectForClass = (section: string, subject: string) => {
    const current = classData.sectionSubjects[section] || [];
    setClassData({ ...classData, sectionSubjects: { ...classData.sectionSubjects, [section]: current.includes(subject) ? current.filter((s) => s !== subject) : [...current, subject] } });
  };

  const addCustomSubjectToSection = (sectionIndex: number, section: string) => {
    const customSubject = sectionSubjectInputs[sectionIndex]?.trim();
    if (!customSubject) return;
    const current = classData.sectionSubjects[section] || [];
    if (!current.includes(customSubject)) { setClassData({ ...classData, sectionSubjects: { ...classData.sectionSubjects, [section]: [...current, customSubject] } }); }
    setSectionSubjectInputs({ ...sectionSubjectInputs, [sectionIndex]: "" });
  };

  const removeSubjectFromClassData = (section: string, subject: string) => {
    const current = classData.sectionSubjects[section] || [];
    setClassData({ ...classData, sectionSubjects: { ...classData.sectionSubjects, [section]: current.filter((s) => s !== subject) } });
  };

  if (loading) {
    return (<div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="flex items-center gap-3 text-gray-600"><Loader2 className="h-6 w-6 animate-spin" /><span>Loading school data...</span></div></div>);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="fixed top-4 right-4 z-[100] space-y-2">
        {toasts.map((toast) => (<div key={toast.id} className={`px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${toast.type === "success" ? "bg-green-600" : toast.type === "error" ? "bg-red-600" : "bg-blue-600"}`}>{toast.message}</div>))}
      </div>

      <header className="bg-black text-white px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <span className="text-xl font-semibold">🏫 {school?.name || "School Dashboard"}</span>
          {school?.code && <span className="bg-gray-800 text-gray-300 px-3 py-1 rounded text-sm">{school.code}</span>}
        </div>
        <div className="flex items-center gap-4">
          <span className="bg-white text-black px-3 py-1 rounded text-sm font-medium">School Admin</span>
          <button onClick={handleLogout} className="flex items-center gap-2 text-gray-300 hover:text-white text-sm"><LogOut className="h-4 w-4" /> Logout</button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-6 sm:px-8 sm:py-10">
        <div className="mb-8">
          <h1 className="mb-3 text-3xl font-semibold text-gray-900">{school?.name || "School Dashboard"}</h1>
          <div className="flex flex-wrap gap-2">
            {school?.code && <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-900">{school.code}</span>}
            {school?.district && <span className="inline-flex rounded-full bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">📍 {school.district}</span>}
            <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-900">Classes: {grades.length}</span>
            <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-900">Sections: {grades.reduce((acc, g) => acc + g.sections.length, 0)}</span>
            <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-900">Tutors: {tutors.length}</span>
          </div>
        </div>

        <div className="mb-8">
          <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-lg font-semibold text-gray-900">Management</h2>
            <div className="flex gap-3 flex-wrap">
              <button onClick={() => setIsCreateClassOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg hover:bg-gray-800"><Plus className="h-4 w-4" /> Create Class</button>
              <button onClick={() => setIsCreateTutorOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg hover:bg-gray-800"><Users className="h-4 w-4" /> Create Tutor</button>
              <button onClick={() => { setEditingAssignmentId(null); setAssignmentData({ tutorId: "", assignments: {}, classGrade: "", classSection: "" }); setIsAssignTutorOpen(true); }} className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg hover:bg-gray-800">👤 Assign Tutor</button>
            </div>
          </div>

          {savedAssignments.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-gray-900">Assigned Teachers</h3>
              {savedAssignments.map((assignment) => {
                const isExpanded = expandedCardId === assignment.id;
                return (
                  <div key={assignment.id} className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-5 py-4 flex items-center justify-between">
                      <div className="flex-1"><h3 className="text-base font-semibold text-gray-900">{assignment.tutorName}</h3>{assignment.classGrade && <p className="text-sm text-gray-500">Class Tutor: {assignment.classGrade} - {assignment.classSection}</p>}</div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEditAssignment(assignment)} className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"><Edit className="h-4 w-4" /></button>
                        <button onClick={() => handleDeleteAssignment(assignment.id)} className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                        <button onClick={() => setExpandedCardId(isExpanded ? null : assignment.id)} className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"><ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} /></button>
                      </div>
                    </div>
                    {isExpanded && Object.entries(assignment.assignments).length > 0 && (
                      <div className="px-5 pb-4 border-t border-gray-100 pt-3">
                        {Object.entries(assignment.assignments).map(([key, subjects]) => (Array.isArray(subjects) && subjects.length > 0 && (<div key={key} className="mb-2"><p className="text-sm font-medium text-gray-700">{key}</p><div className="flex flex-wrap gap-1 mt-1">{subjects.map((subject) => <span key={subject} className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">{subject}</span>)}</div></div>)))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {tutors.length > 0 && (
          <div className="mb-8">
            <h3 className="mb-4 text-base font-semibold text-gray-900">Tutors</h3>
            <div className="space-y-3">
              {tutors.map((tutor) => (
                <div key={tutor.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex-1"><h4 className="text-base font-semibold text-gray-900">{tutor.name}</h4><div className="mt-2 space-y-1">{tutor.email && <p className="text-sm text-gray-600"><span className="font-medium">Email:</span> {tutor.email}</p>}{tutor.phone && <p className="text-sm text-gray-600"><span className="font-medium">Phone:</span> {tutor.phone}</p>}</div></div>
                    <div className="flex items-center gap-2 ml-4">
                      <button onClick={() => handleEditTutor(tutor)} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"><Edit className="h-4 w-4" /> Edit</button>
                      <button onClick={() => handleDeleteTutor(tutor.id)} className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /> Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6"><h2 className="text-lg font-semibold text-gray-900">Classes & Sections</h2></div>

        {grades.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <p className="text-gray-500 mb-4">No classes created yet</p>
            <button onClick={() => setIsCreateClassOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg hover:bg-gray-800"><Plus className="h-4 w-4" /> Create First Class</button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {grades.map((grade) => (
              <div key={grade.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-gray-900">{grade.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">{grade.sections.length} Section{grade.sections.length !== 1 ? "s" : ""}</span>
                    <button onClick={() => handleEditClass(grade)} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"><Edit className="h-4 w-4" /></button>
                    <button onClick={() => handleDeleteClass(grade.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                {grade.sections.map((section) => {
                  const sectionKey = `grade-${grade.id}-${section.id}`;
                  const isExpanded = expandedSections[sectionKey];
                  return (
                    <div key={section.id} className="mb-3">
                      <button onClick={() => setExpandedSections({ ...expandedSections, [sectionKey]: !isExpanded })} className="w-full rounded-lg bg-gray-50 p-3 text-left hover:bg-gray-100 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white text-xs font-medium text-gray-900">{section.name}</div>
                            <div className="flex flex-col"><p className="text-xs text-gray-500">Section</p><p className="text-sm font-medium text-gray-900">{section.classTutor?.name || "No Class Tutor"}</p></div>
                          </div>
                          <div className="flex items-center gap-2"><span className="text-xs text-gray-500">{section.subjects.length} subject{section.subjects.length !== 1 ? "s" : ""}</span><ChevronDown className={`h-5 w-5 text-gray-500 transition-transform ${isExpanded ? "rotate-180" : ""}`} /></div>
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="mt-2 ml-3 pl-3 border-l-2 border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-gray-500">Subjects</p>
                            <button onClick={(e) => { e.stopPropagation(); setIsManageSubjectsOpen({ sectionId: section.id, sectionName: section.name, gradeName: grade.name, gradeId: grade.id }); }} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"><BookOpen className="h-3 w-3" /> Manage Subjects</button>
                          </div>
                          {section.subjects.length === 0 ? (<p className="text-xs text-gray-400 italic py-2">No subjects added yet</p>) : (
                            <div className="flex flex-wrap gap-1.5">
                              {section.subjects.map((subject) => (
                                <div key={subject.id} className="group relative rounded-lg bg-gray-50 px-2.5 py-1.5 border border-gray-200 hover:border-gray-300">
                                  <p className="text-xs text-gray-600 font-medium">{subject.name}</p>
                                  <p className="text-xs text-gray-500">{subject.tutor?.name || "Unassigned"}</p>
                                  {!subject.tutor && tutors.length > 0 && (
                                    <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-10">
                                      <select className="text-xs border rounded px-2 py-1 bg-white shadow-lg" onChange={(e) => { if (e.target.value) handleAssignTutorToSubject(subject.id, e.target.value); }} onClick={(e) => e.stopPropagation()} defaultValue="">
                                        <option value="">Assign tutor...</option>
                                        {tutors.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                      </select>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Class Modal */}
        {isCreateClassOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-lg">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">{editingClassId ? "Edit Class" : "Create Class"}</h3>
                <button onClick={() => { setIsCreateClassOpen(false); setEditingClassId(null); setClassData({ id: null, name: "", sections: [""], sectionSubjects: { "": [] } }); setSectionSubjectInputs({}); }} className="text-gray-500 hover:text-gray-900"><X className="h-5 w-5" /></button>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Class Name</label>
                  <input type="text" value={classData.name} onChange={(e) => setClassData({ ...classData, name: e.target.value })} placeholder="Enter class name (e.g., Grade 1)" className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-3">Sections & Subjects</label>
                  <div className="space-y-4">
                    {classData.sections.map((section, index) => (
                      <div key={index} className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Section Name</label>
                            <input type="text" value={section} onChange={(e) => updateSectionName(index, e.target.value)} placeholder="Enter section name (e.g., A, B, 1)" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900" />
                          </div>
                          {classData.sections.length > 1 && (<button onClick={() => removeSection(index)} className="ml-3 mt-5 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">Remove</button>)}
                        </div>
                        <div className="mb-3">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Add Subject</label>
                          <div className="flex gap-2">
                            <input type="text" value={sectionSubjectInputs[index] || ""} onChange={(e) => setSectionSubjectInputs({ ...sectionSubjectInputs, [index]: e.target.value })} placeholder="Enter subject name" className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomSubjectToSection(index, section); } }} />
                            <button onClick={() => addCustomSubjectToSection(index, section)} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800" disabled={!sectionSubjectInputs[index]?.trim()}>Add</button>
                          </div>
                        </div>
                        <div className="mb-3">
                          <p className="text-xs font-medium text-gray-600 mb-2">Quick Add</p>
                          <div className="flex flex-wrap gap-1.5">
                            {defaultSubjects.map((subject) => {
                              const isAdded = (classData.sectionSubjects[section] || []).includes(subject);
                              return (<button key={subject} onClick={() => !isAdded && toggleSubjectForClass(section, subject)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isAdded ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "border border-gray-300 bg-white text-gray-600 hover:border-blue-400 hover:bg-blue-50"}`} disabled={isAdded}>{subject}</button>);
                            })}
                          </div>
                        </div>
                        {(classData.sectionSubjects[section] || []).length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-gray-600 mb-2">Selected Subjects</p>
                            <div className="flex flex-wrap gap-1.5">
                              {(classData.sectionSubjects[section] || []).map((subject) => (
                                <span key={subject} className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">{subject}<button onClick={() => removeSubjectFromClassData(section, subject)} className="hover:text-blue-900"><X className="h-3 w-3" /></button></span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <button onClick={addMoreSection} className="mt-4 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"><Plus className="h-4 w-4" /> Add Another Section</button>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button onClick={() => { setIsCreateClassOpen(false); setEditingClassId(null); setClassData({ id: null, name: "", sections: [""], sectionSubjects: { "": [] } }); setSectionSubjectInputs({}); }} className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50" disabled={actionLoading}>Cancel</button>
                <button onClick={handleCreateClass} className="flex-1 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50" disabled={actionLoading}>{actionLoading ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Saving...</span> : editingClassId ? "Update" : "Create"}</button>
              </div>
            </div>
          </div>
        )}

        {/* Create/Edit Tutor Modal */}
        {isCreateTutorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-lg">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">{editingTutorId ? "Edit Tutor" : "Create Tutor"}</h3>
                <button onClick={() => { setIsCreateTutorOpen(false); setEditingTutorId(null); setTutorData({ id: null, name: "", email: "", phone: "" }); }} className="text-gray-500 hover:text-gray-900"><X className="h-5 w-5" /></button>
              </div>
              <div className="space-y-4">
                <div><label className="block text-sm font-medium text-gray-900 mb-2">Tutor Name *</label><input type="text" value={tutorData.name} onChange={(e) => setTutorData({ ...tutorData, name: e.target.value })} placeholder="Enter tutor name" className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900" /></div>
                <div><label className="block text-sm font-medium text-gray-900 mb-2">Email *</label><input type="email" value={tutorData.email} onChange={(e) => setTutorData({ ...tutorData, email: e.target.value })} placeholder="Enter email address" className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900" /></div>
                <div><label className="block text-sm font-medium text-gray-900 mb-2">Phone *</label><input type="tel" value={tutorData.phone} onChange={(e) => setTutorData({ ...tutorData, phone: e.target.value })} placeholder="Enter phone number" className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900" /></div>
              </div>
              <div className="mt-6 flex gap-3">
                <button onClick={() => { setIsCreateTutorOpen(false); setEditingTutorId(null); setTutorData({ id: null, name: "", email: "", phone: "" }); }} className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50" disabled={actionLoading}>Cancel</button>
                <button onClick={handleCreateTutor} className="flex-1 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50" disabled={actionLoading}>{actionLoading ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Saving...</span> : editingTutorId ? "Update" : "Create"}</button>
              </div>
            </div>
          </div>
        )}

        {/* Assign Tutor Modal */}
        {isAssignTutorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-lg">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">{editingAssignmentId ? "Edit Assignment" : "Assign Tutor"}</h3>
                <button onClick={() => { setIsAssignTutorOpen(false); setEditingAssignmentId(null); setAssignmentData({ tutorId: "", assignments: {}, classGrade: "", classSection: "" }); }} className="text-gray-500 hover:text-gray-900"><X className="h-5 w-5" /></button>
              </div>
              <div className="space-y-6">
                <div><label className="block text-sm font-medium text-gray-900 mb-2">Select Tutor *</label><select value={assignmentData.tutorId} onChange={(e) => setAssignmentData({ ...assignmentData, tutorId: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"><option value="">Select a tutor...</option>{tutors.map((tutor) => <option key={tutor.id} value={tutor.id}>{tutor.name}</option>)}</select></div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-3">Assign Subjects</label>
                  {grades.length === 0 ? <p className="text-sm text-gray-500">Create classes first.</p> : (
                    <div className="space-y-4">
                      {grades.map((grade) => (
                        <div key={grade.id} className="border border-gray-200 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-3">{grade.name}</h4>
                          <div className="space-y-3">
                            {grade.sections.map((section) => (
                              <div key={section.id}><p className="text-sm text-gray-600 mb-2">Section {section.name}</p><div className="flex flex-wrap gap-2">{section.subjects.map((subject) => { const key = getAssignmentKey(grade.name, section.name); const isSelected = (assignmentData.assignments[key] || []).includes(subject.name); return <button key={subject.id} onClick={() => toggleSubjectForSection(grade.name, section.name, subject.name)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isSelected ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{subject.name}</button>; })}{section.subjects.length === 0 && <span className="text-xs text-gray-400">No subjects</span>}</div></div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Assign as Class Tutor (Optional)</label>
                  <div className="grid grid-cols-2 gap-4">
                    <select value={assignmentData.classGrade} onChange={(e) => setAssignmentData({ ...assignmentData, classGrade: e.target.value, classSection: "" })} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"><option value="">Select Grade</option>{grades.map((grade) => <option key={grade.id} value={grade.name}>{grade.name}</option>)}</select>
                    <select value={assignmentData.classSection} onChange={(e) => setAssignmentData({ ...assignmentData, classSection: e.target.value })} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none" disabled={!assignmentData.classGrade}><option value="">Select Section</option>{assignmentData.classGrade && grades.find((g) => g.name === assignmentData.classGrade)?.sections.map((section) => <option key={section.id} value={section.name}>Section {section.name}</option>)}</select>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button onClick={() => { setIsAssignTutorOpen(false); setEditingAssignmentId(null); setAssignmentData({ tutorId: "", assignments: {}, classGrade: "", classSection: "" }); }} className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50" disabled={actionLoading}>Cancel</button>
                <button onClick={handleAssignTutor} className="flex-1 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50" disabled={actionLoading}>{actionLoading ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Assigning...</span> : editingAssignmentId ? "Update" : "Assign"}</button>
              </div>
            </div>
          </div>
        )}

        {/* Manage Subjects Modal */}
        {isManageSubjectsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-lg">
              <div className="mb-6 flex items-center justify-between"><div><h3 className="text-lg font-semibold text-gray-900">Manage Subjects</h3><p className="text-sm text-gray-500">{isManageSubjectsOpen.gradeName} - Section {isManageSubjectsOpen.sectionName}</p></div><button onClick={() => { setIsManageSubjectsOpen(null); setNewSubjectName(""); }} className="text-gray-500 hover:text-gray-900"><X className="h-5 w-5" /></button></div>
              <div className="mb-6"><label className="block text-sm font-medium text-gray-900 mb-2">Add New Subject</label><div className="flex gap-2"><input type="text" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} placeholder="Enter subject name" className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900" onKeyDown={(e) => { if (e.key === "Enter") handleAddSubjectToSection(); }} /><button onClick={handleAddSubjectToSection} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50" disabled={actionLoading || !newSubjectName.trim()}>{actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}</button></div></div>
              <div className="mb-6"><label className="block text-sm font-medium text-gray-900 mb-2">Quick Add</label><div className="flex flex-wrap gap-2">{defaultSubjects.map((subject) => { const grade = grades.find((g) => g.id === isManageSubjectsOpen.gradeId); const section = grade?.sections.find((s) => s.id === isManageSubjectsOpen.sectionId); const exists = section?.subjects.some((s) => s.name === subject); return <button key={subject} onClick={() => { if (!exists) setNewSubjectName(subject); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${exists ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "border border-gray-300 bg-white text-gray-600 hover:border-blue-400 hover:bg-blue-50"}`} disabled={exists}>{subject}</button>; })}</div></div>
              <div><label className="block text-sm font-medium text-gray-900 mb-2">Current Subjects</label>{(() => { const grade = grades.find((g) => g.id === isManageSubjectsOpen.gradeId); const section = grade?.sections.find((s) => s.id === isManageSubjectsOpen.sectionId); const subjects = section?.subjects || []; if (subjects.length === 0) return <p className="text-sm text-gray-400 italic py-4 text-center">No subjects added yet</p>; return (<div className="space-y-2">{subjects.map((subject) => (<div key={subject.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200"><div><p className="text-sm font-medium text-gray-900">{subject.name}</p><p className="text-xs text-gray-500">{subject.tutor ? `Assigned to: ${subject.tutor.name}` : "Unassigned"}</p></div><div className="flex items-center gap-2">{!subject.tutor && tutors.length > 0 && (<select className="text-xs border rounded px-2 py-1 bg-white" onChange={(e) => { if (e.target.value) handleAssignTutorToSubject(subject.id, e.target.value); }} defaultValue=""><option value="">Assign tutor...</option>{tutors.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>)}<button onClick={() => handleDeleteSubjectFromSection(subject.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></div></div>))}</div>); })()}</div>
              <div className="mt-6"><button onClick={() => { setIsManageSubjectsOpen(null); setNewSubjectName(""); }} className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">Done</button></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}