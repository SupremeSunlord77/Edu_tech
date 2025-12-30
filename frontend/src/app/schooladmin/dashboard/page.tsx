"use client";

import { Plus, X, Edit, Trash2, ChevronDown, Users, Loader2, LogOut, User, Mail, Phone } from "lucide-react";
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

interface SectionFormData {
  id?: string;
  name: string;
  subjects: string[];
  isNew?: boolean;
  toDelete?: boolean;
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

  // Delete confirmation modal state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: "class" | "tutor" | "assignment" | null;
    id: string | null;
    name: string;
  }>({ isOpen: false, type: null, id: null, name: "" });

  // Class form data - matching superadmin structure
  const [classData, setClassData] = useState({
    id: null as string | null,
    name: "",
    sectionsData: [{ name: "A", subjects: [], isNew: true }] as SectionFormData[],
  });
  
  const [tutorData, setTutorData] = useState({ id: null as string | null, name: "", email: "", phone: "" });
  const [assignmentData, setAssignmentData] = useState({ 
    tutorId: "", 
    assignments: {} as Record<string, string[]>, 
    classGrade: "", 
    classSection: "" 
  });

  // Modal error states
  const [classModalError, setClassModalError] = useState<string | null>(null);
  const [tutorModalError, setTutorModalError] = useState<string | null>(null);
  const [assignModalError, setAssignModalError] = useState<string | null>(null);

  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingTutorId, setEditingTutorId] = useState<string | null>(null);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  
  // UI state for expandable sections
  const [expandedGrade, setExpandedGrade] = useState<number | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  
  const [savedAssignments, setSavedAssignments] = useState<Assignment[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [toastCounter, setToastCounter] = useState(0);

  const availableSubjects = ["English", "Maths", "Science", "History", "Geography", "Social Studies", "Hindi", "Computer Science", "Physical Education", "Art"];

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
      
      // Try to get full tutor details
      try {
        const tutorsRes = await api.get(`/schools/${schoolId}/tutors`);
        console.log("Full tutors response:", tutorsRes.data);
        setTutors(tutorsRes.data || []);
      } catch {
        // Fallback to dashboard tutors
        console.log("Dashboard tutors:", res.data.tutors);
        setTutors(res.data.tutors || []);
      }
      
      try {
        const assignmentsRes = await api.get(`/schools/${schoolId}/assignments`);
        setSavedAssignments(assignmentsRes.data || []);
      } catch { setSavedAssignments([]); }
    } catch (error: any) {
      showToast("Failed to load school data", "error");
    } finally { setLoading(false); }
  };

  useEffect(() => { if (schoolId) loadDashboard(); }, [schoolId]);

  const handleLogout = () => { 
    localStorage.removeItem("accessToken"); 
    localStorage.removeItem("refreshToken"); 
    router.push("/login"); 
  };

  // Check if tutor is assigned
  const isTutorAssigned = (tutorId: string) => savedAssignments.some((a) => a.tutorId === tutorId);

  // Get unassigned tutors
  const getUnassignedTutors = () => {
    const assignedTutorIds = savedAssignments.map((a) => a.tutorId);
    return tutors.filter((t) => !assignedTutorIds.includes(t.id));
  };

  /* ================= DELETE CONFIRMATION ================= */
  const openDeleteConfirm = (type: "class" | "tutor" | "assignment", id: string, name: string) => {
    setDeleteConfirm({ isOpen: true, type, id, name });
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirm({ isOpen: false, type: null, id: null, name: "" });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm.id) return;
    
    switch (deleteConfirm.type) {
      case "class": await executeDeleteClass(deleteConfirm.id); break;
      case "tutor": await executeDeleteTutor(deleteConfirm.id); break;
      case "assignment": await executeDeleteAssignment(deleteConfirm.id); break;
    }
  };

  /* ================= CLASS OPERATIONS ================= */
  const handleCreateClass = async () => {
    setClassModalError(null);
    if (!classData.name.trim()) { setClassModalError("Please enter a class name"); return; }
    
    const activeSections = classData.sectionsData.filter(s => !s.toDelete);
    if (activeSections.length === 0) { setClassModalError("Please add at least one section"); return; }

    try {
      setActionLoading(true);
      if (editingClassId) {
        // Update grade name
        await api.put(`/schools/${schoolId}/grades/${editingClassId}`, { name: classData.name });

        // Process sections
        for (const sectionData of classData.sectionsData) {
          if (sectionData.toDelete && sectionData.id) {
            await api.delete(`/schools/${schoolId}/grades/sections/${sectionData.id}`);
          } else if (sectionData.isNew && !sectionData.toDelete) {
            await api.post(`/schools/${schoolId}/grades/${editingClassId}/sections`, {
              name: sectionData.name,
              subjects: sectionData.subjects,
            });
          } else if (sectionData.id && !sectionData.toDelete) {
            await api.put(`/schools/${schoolId}/grades/sections/${sectionData.id}/subjects`, {
              subjects: sectionData.subjects,
            });
          }
        }
        showToast("Class updated successfully");
      } else {
        const sections = classData.sectionsData
          .filter(s => !s.toDelete)
          .map((s) => ({ name: s.name, subjects: s.subjects }));
        await api.post(`/schools/${schoolId}/grades`, { gradeName: classData.name, sections });
        showToast("Class created successfully");
      }
      closeClassModal();
      await loadDashboard();
    } catch (error: any) { 
      setClassModalError(error.response?.data?.message || "Failed to save class"); 
    } finally { 
      setActionLoading(false); 
    }
  };

  const executeDeleteClass = async (gradeId: string) => {
    try {
      setActionLoading(true);
      await api.delete(`/schools/${schoolId}/grades/${gradeId}`);
      showToast("Class deleted successfully");
      closeDeleteConfirm();
      await loadDashboard();
    } catch (error: any) {
      showToast(error.response?.data?.message || "Failed to delete class", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditClass = (grade: Grade) => {
    const sectionsData: SectionFormData[] = grade.sections.map((s) => ({
      id: s.id,
      name: s.name,
      subjects: s.subjects.map((sub) => sub.name),
      isNew: false,
      toDelete: false,
    }));

    setClassData({
      id: grade.id,
      name: grade.name,
      sectionsData: sectionsData.length > 0 ? sectionsData : [{ name: "A", subjects: [], isNew: true }],
    });
    setEditingClassId(grade.id);
    setClassModalError(null);
    setIsCreateClassOpen(true);
  };

  /* ================= TUTOR OPERATIONS ================= */
  const handleCreateTutor = async () => {
    setTutorModalError(null);
    if (!tutorData.name.trim()) { setTutorModalError("Please enter tutor name"); return; }
    if (!tutorData.email.trim()) { setTutorModalError("Please enter tutor email"); return; }
    if (!tutorData.phone.trim()) { setTutorModalError("Please enter tutor phone"); return; }
    
    try {
      setActionLoading(true);
      if (editingTutorId) {
        await api.put(`/schools/${schoolId}/tutors/${editingTutorId}`, tutorData);
        showToast("Tutor updated successfully");
      } else {
        const res = await api.post(`/schools/${schoolId}/tutors`, tutorData);
        showToast(`Tutor created! Password: ${res.data.temporaryPassword || 'Check email'}`);
      }
      closeTutorModal();
      await loadDashboard();
    } catch (error: any) { 
      setTutorModalError(error.response?.data?.message || "Failed to save tutor"); 
    } finally { 
      setActionLoading(false); 
    }
  };

  const executeDeleteTutor = async (tutorId: string) => {
    try {
      setActionLoading(true);
      await api.delete(`/schools/${schoolId}/tutors/${tutorId}`);
      showToast("Tutor deleted successfully");
      closeDeleteConfirm();
      await loadDashboard();
    } catch (error: any) {
      showToast(error.response?.data?.message || "Failed to delete tutor", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditTutor = (tutor: Tutor) => {
    setTutorData({ id: tutor.id, name: tutor.name, email: tutor.email || "", phone: tutor.phone || "" });
    setEditingTutorId(tutor.id);
    setTutorModalError(null);
    setIsCreateTutorOpen(true);
  };

  /* ================= ASSIGNMENT OPERATIONS ================= */
  const getAssignmentKey = (gradeName: string, section: string) => `${gradeName}-${section}`;

  const toggleSubjectForSection = (gradeName: string, section: string, subject: string) => {
    const key = getAssignmentKey(gradeName, section);
    const current = assignmentData.assignments[key] || [];
    setAssignmentData({ 
      ...assignmentData, 
      assignments: { 
        ...assignmentData.assignments, 
        [key]: current.includes(subject) ? current.filter((s) => s !== subject) : [...current, subject] 
      } 
    });
  };

  const getSubjectsForSection = (gradeName: string, section: string) => {
    const key = getAssignmentKey(gradeName, section);
    return assignmentData.assignments[key] || [];
  };

  const getSectionsForGrade = (gradeName: string) => {
    const grade = grades.find((g) => g.name === gradeName);
    return grade?.sections.map((s) => s.name) || [];
  };

  const handleAssignTutor = async () => {
    setAssignModalError(null);
    if (!assignmentData.tutorId) { setAssignModalError("Please select a tutor"); return; }
    const hasAny = Object.values(assignmentData.assignments).some((s) => Array.isArray(s) && s.length > 0);
    if (!hasAny && !assignmentData.classGrade) { setAssignModalError("Please assign at least one subject or class tutor role"); return; }
    
    try {
      setActionLoading(true);
      if (editingAssignmentId) {
        await api.put(`/schools/${schoolId}/assignments`, {
          tutorId: assignmentData.tutorId,
          assignments: assignmentData.assignments,
          classGrade: assignmentData.classGrade || undefined,
          classSection: assignmentData.classSection || undefined,
        });
        showToast("Assignment updated successfully");
      } else {
        await api.post(`/schools/${schoolId}/assignments`, {
          tutorId: assignmentData.tutorId,
          assignments: assignmentData.assignments,
          classGrade: assignmentData.classGrade || undefined,
          classSection: assignmentData.classSection || undefined,
        });
        showToast("Tutor assigned successfully");
      }
      closeAssignModal();
      await loadDashboard();
    } catch (error: any) { 
      setAssignModalError(error.response?.data?.message || "Failed to assign tutor"); 
    } finally { 
      setActionLoading(false); 
    }
  };

  const handleEditAssignment = (a: Assignment) => {
    setAssignmentData({ 
      tutorId: a.tutorId, 
      assignments: a.assignments, 
      classGrade: a.classGrade || "", 
      classSection: a.classSection || "" 
    });
    setEditingAssignmentId(a.id);
    setAssignModalError(null);
    setIsAssignTutorOpen(true);
  };

  const executeDeleteAssignment = async (id: string) => {
    try {
      setActionLoading(true);
      await api.delete(`/schools/${schoolId}/assignments/${id}`);
      showToast("Assignment deleted successfully");
      closeDeleteConfirm();
      await loadDashboard();
    } catch (error: any) {
      showToast(error.response?.data?.message || "Failed to delete assignment", "error");
    } finally {
      setActionLoading(false);
    }
  };

  /* ================= SUBJECT OPERATIONS ================= */


  /* ================= SECTION HELPER FUNCTIONS ================= */
  const addMoreSection = () => {
    const sectionLabels = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const activeSectionNames = classData.sectionsData.filter(s => !s.toDelete).map(s => s.name);
    let nextSection = "";
    for (const label of sectionLabels) {
      if (!activeSectionNames.includes(label)) {
        nextSection = label;
        break;
      }
    }
    if (nextSection) {
      setClassData({
        ...classData,
        sectionsData: [...classData.sectionsData, { name: nextSection, subjects: [], isNew: true, toDelete: false }],
      });
    } else {
      setClassModalError("Maximum 8 sections (A-H) allowed");
    }
  };

  const removeSection = (index: number) => {
    const section = classData.sectionsData[index];
    const activeSections = classData.sectionsData.filter(s => !s.toDelete);
    if (activeSections.length <= 1) { setClassModalError("At least one section is required"); return; }
    
    if (section.isNew) {
      setClassData({
        ...classData,
        sectionsData: classData.sectionsData.filter((_, i) => i !== index),
      });
    } else {
      const updatedSections = [...classData.sectionsData];
      updatedSections[index] = { ...updatedSections[index], toDelete: true };
      setClassData({ ...classData, sectionsData: updatedSections });
    }
  };

  const toggleSubjectForSection_ClassForm = (sectionIndex: number, subject: string) => {
    const updatedSections = [...classData.sectionsData];
    const currentSubjects = updatedSections[sectionIndex].subjects;
    updatedSections[sectionIndex] = {
      ...updatedSections[sectionIndex],
      subjects: currentSubjects.includes(subject)
        ? currentSubjects.filter((s) => s !== subject)
        : [...currentSubjects, subject],
    };
    setClassData({ ...classData, sectionsData: updatedSections });
  };

  /* ================= MODAL CLOSE HELPERS ================= */
  const closeClassModal = () => {
    setIsCreateClassOpen(false);
    setEditingClassId(null);
    setClassData({ id: null, name: "", sectionsData: [{ name: "A", subjects: [], isNew: true }] });
    setClassModalError(null);
  };

  const closeTutorModal = () => {
    setIsCreateTutorOpen(false);
    setEditingTutorId(null);
    setTutorData({ id: null, name: "", email: "", phone: "" });
    setTutorModalError(null);
  };

  const closeAssignModal = () => {
    setIsAssignTutorOpen(false);
    setEditingAssignmentId(null);
    setAssignmentData({ tutorId: "", assignments: {}, classGrade: "", classSection: "" });
    setAssignModalError(null);
    setExpandedGrade(null);
    setExpandedSection(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-600">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading school data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[100] space-y-2">
        {toasts.map((toast) => (
          <div key={toast.id} className={`px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${
            toast.type === "success" ? "bg-green-600" : toast.type === "error" ? "bg-red-600" : "bg-blue-600"
          }`}>
            {toast.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="bg-black text-white px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <span className="text-xl font-semibold">🏫 {school?.name || "School Dashboard"}</span>
          {school?.code && <span className="bg-gray-800 text-gray-300 px-3 py-1 rounded text-sm">{school.code}</span>}
        </div>
        <div className="flex items-center gap-4">
          <span className="bg-white text-black px-3 py-1 rounded text-sm font-medium">School Admin</span>
          <button onClick={handleLogout} className="flex items-center gap-2 text-gray-300 hover:text-white text-sm">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-6 sm:px-8 sm:py-10">
        {/* School Header */}
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

        {/* Action Buttons */}
        <div className="mb-8 flex flex-wrap gap-3">
          <button onClick={() => { setClassModalError(null); setIsCreateClassOpen(true); }} className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg hover:bg-gray-800">
            <Plus className="h-4 w-4" /> Create Class
          </button>
          <button onClick={() => { setTutorModalError(null); setEditingTutorId(null); setTutorData({ id: null, name: "", email: "", phone: "" }); setIsCreateTutorOpen(true); }} className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg hover:bg-gray-800">
            <Users className="h-4 w-4" /> Create Tutor
          </button>
          <button onClick={() => { setEditingAssignmentId(null); setAssignmentData({ tutorId: "", assignments: {}, classGrade: "", classSection: "" }); setAssignModalError(null); setIsAssignTutorOpen(true); }} className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg hover:bg-gray-800">
            👤 Assign Tutor
          </button>
        </div>

        {/* ==================== TUTORS SECTION ==================== */}
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Tutors</h2>
            <span className="text-sm text-gray-500">{tutors.length} tutor{tutors.length !== 1 ? 's' : ''}</span>
          </div>

          {tutors.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tutors.map((tutor) => {
                const isAssigned = isTutorAssigned(tutor.id);
                return (
                  <div key={tutor.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">{tutor.name}</h3>
                          {isAssigned ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                              <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
                              Assigned
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-400 font-medium">
                              <span className="h-1.5 w-1.5 rounded-full bg-gray-300"></span>
                              Unassigned
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEditTutor(tutor)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Edit Tutor">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={() => openDeleteConfirm("tutor", tutor.id, tutor.name)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete Tutor">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="h-3.5 w-3.5 text-gray-400" />
                        <span className="truncate">{tutor.email || (tutor as any).emailAddress || (tutor as any).emailId || "No email"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-3.5 w-3.5 text-gray-400" />
                        <span>{tutor.phone || (tutor as any).phoneNumber || (tutor as any).mobile || (tutor as any).contactNumber || "No phone"}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center">
              <User className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">No tutors created yet</p>
              <button onClick={() => { setTutorModalError(null); setEditingTutorId(null); setTutorData({ id: null, name: "", email: "", phone: "" }); setIsCreateTutorOpen(true); }} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-gray-900 hover:text-gray-700">
                <Plus className="h-4 w-4" /> Create your first tutor
              </button>
            </div>
          )}
        </div>

        {/* ==================== ASSIGNED TEACHERS SECTION ==================== */}
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Assigned Teachers</h2>
            <span className="text-sm text-gray-500">{savedAssignments.length} assignment{savedAssignments.length !== 1 ? 's' : ''}</span>
          </div>

          {savedAssignments.length > 0 ? (
            <div className="space-y-3">
              {savedAssignments.map((assignment) => {
                const isExpanded = expandedCardId === assignment.id;
                const assignmentDetails = Object.entries(assignment.assignments).map(([key, subjects]) => ({
                  key,
                  subjects: Array.isArray(subjects) ? subjects : [],
                }));

                return (
                  <div key={assignment.id} className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-5 py-4 flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-gray-900">{assignment.tutorName}</h3>
                        {assignment.classGrade && <p className="text-sm text-gray-500">Class Tutor: {assignment.classGrade} - {assignment.classSection}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEditAssignment(assignment)} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50">
                          <Edit className="h-4 w-4" /> Edit
                        </button>
                        <button onClick={() => openDeleteConfirm("assignment", assignment.id, assignment.tutorName)} className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" /> Delete
                        </button>
                        <button onClick={() => setExpandedCardId(isExpanded ? null : assignment.id)} className="inline-flex items-center rounded-lg border border-gray-300 px-3 py-2 text-gray-600 hover:bg-gray-50">
                          <ChevronDown className={`h-5 w-5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-gray-200 bg-gray-50 px-5 py-4">
                        {assignment.classGrade && assignment.classSection && (
                          <div className="mb-4 p-3 rounded-lg bg-white border border-gray-200">
                            <p className="text-xs font-medium text-gray-500 mb-2">Class Tutor</p>
                            <p className="text-sm font-semibold text-gray-900">{assignment.classGrade} - Section {assignment.classSection}</p>
                          </div>
                        )}
                        {assignmentDetails.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-3">Grade & Section Assignments</p>
                            <div className="space-y-2">
                              {assignmentDetails.map(({ key, subjects }) =>
                                subjects.length > 0 ? (
                                  <div key={key} className="p-3 rounded-lg bg-white border border-gray-200">
                                    <p className="text-sm font-semibold text-gray-900 mb-2">{key}</p>
                                    <div className="flex flex-wrap gap-2">
                                      {subjects.map((subject) => (
                                        <span key={subject} className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">{subject}</span>
                                      ))}
                                    </div>
                                  </div>
                                ) : null
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center">
              <p className="text-sm text-gray-500">No tutors assigned yet</p>
              {tutors.length > 0 && (
                <button onClick={() => { setEditingAssignmentId(null); setAssignmentData({ tutorId: "", assignments: {}, classGrade: "", classSection: "" }); setAssignModalError(null); setIsAssignTutorOpen(true); }} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-gray-900 hover:text-gray-700">
                  <Plus className="h-4 w-4" /> Assign a tutor
                </button>
              )}
            </div>
          )}
        </div>

        {/* ==================== CLASSES & SECTIONS ==================== */}
        <div className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Classes & Sections</h2>
            <span className="text-sm text-gray-500">{grades.length} class{grades.length !== 1 ? 'es' : ''}</span>
          </div>
        </div>

        {grades.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <p className="text-gray-500 mb-4">No classes created yet</p>
            <button onClick={() => { setClassModalError(null); setIsCreateClassOpen(true); }} className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg hover:bg-gray-800">
              <Plus className="h-4 w-4" /> Create First Class
            </button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {grades.map((grade) => (
              <div key={grade.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-gray-900">{grade.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">{grade.sections.length} Sections</span>
                    <button onClick={() => handleEditClass(grade)} className="p-1 text-gray-400 hover:text-gray-600">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button onClick={() => openDeleteConfirm("class", grade.id, grade.name)} className="p-1 text-gray-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {grade.sections.map((section) => {
                  const sectionKey = `grade-${grade.id}-${section.name}`;
                  const isExpanded = expandedSections[sectionKey];

                  return (
                    <div key={section.id} className="mb-3">
                      <button
                        onClick={() => setExpandedSections({ ...expandedSections, [sectionKey]: !isExpanded })}
                        className="w-full rounded-lg bg-gray-50 p-3 text-left hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white text-xs font-medium text-gray-900">{section.name}</div>
                            <div className="flex flex-col">
                              <p className="text-xs text-gray-500">Section</p>
                              <p className="text-sm font-medium text-gray-900">{section.classTutor?.name || "No Class Tutor"}</p>
                            </div>
                          </div>
                          <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="mt-2 ml-3 pl-3 border-l-2 border-gray-200">
                          <p className="text-xs text-gray-500 mb-2">Subjects</p>
                          {section.subjects.length === 0 ? (
                            <p className="text-xs text-gray-400 italic py-2">No subjects added yet</p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {section.subjects.map((subject) => (
                                <div key={subject.id} className="rounded-lg bg-gray-50 px-2.5 py-1.5 border border-gray-200">
                                  <p className="text-xs text-gray-600 font-medium">{subject.name}</p>
                                  <p className="text-xs text-gray-500">{subject.tutor?.name || "Unassigned"}</p>
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

        {/* ==================== CREATE/EDIT CLASS MODAL ==================== */}
        {isCreateClassOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-lg">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">{editingClassId ? "Edit Class" : "Create Class"}</h3>
                <button onClick={closeClassModal} className="text-gray-500 hover:text-gray-900"><X className="h-5 w-5" /></button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Class Name</label>
                  <input
                    type="text"
                    value={classData.name}
                    onChange={(e) => { setClassData({ ...classData, name: e.target.value }); if (classModalError) setClassModalError(null); }}
                    placeholder="Enter class name (e.g., Grade 1)"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-3">Sections & Subjects</label>
                  <div className="space-y-4">
                    {classData.sectionsData.map((section, index) => {
                      if (section.toDelete) return null;
                      return (
                        <div key={`${section.name}-${index}`} className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">Section {section.name}</span>
                              {section.isNew && <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">New</span>}
                            </div>
                            <button onClick={() => removeSection(index)} className="rounded-lg border border-red-300 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50">Remove</button>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-gray-600 mb-2">Select Subjects</p>
                            <div className="grid grid-cols-2 gap-2">
                              {availableSubjects.map((subject) => (
                                <button
                                  key={subject}
                                  onClick={() => toggleSubjectForSection_ClassForm(index, subject)}
                                  className={`py-2 px-3 rounded-lg border-2 text-xs font-medium transition-all ${
                                    section.subjects.includes(subject)
                                      ? "border-blue-600 bg-blue-50 text-blue-700"
                                      : "border-gray-300 bg-white text-gray-600 hover:border-blue-400"
                                  }`}
                                >
                                  {subject}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button onClick={addMoreSection} className="mt-3 w-full rounded-lg border-2 border-dashed border-gray-300 py-2 text-sm font-medium text-gray-600 hover:border-gray-400 hover:text-gray-900">
                    + Add Another Section
                  </button>
                </div>
              </div>

              {classModalError && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0"><svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg></div>
                    <div className="flex-1"><h4 className="text-sm font-medium text-red-800">{editingClassId ? "Update Failed" : "Creation Failed"}</h4><p className="mt-1 text-sm text-red-700">{classModalError}</p></div>
                    <button onClick={() => setClassModalError(null)} className="flex-shrink-0 text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                  </div>
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <button onClick={closeClassModal} className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50" disabled={actionLoading}>Cancel</button>
                <button onClick={handleCreateClass} className="flex-1 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50" disabled={actionLoading}>
                  {actionLoading ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Saving...</span> : editingClassId ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== CREATE/EDIT TUTOR MODAL ==================== */}
        {isCreateTutorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">{editingTutorId ? "Edit Tutor" : "Create Tutor"}</h3>
                <button onClick={closeTutorModal} className="text-gray-500 hover:text-gray-900"><X className="h-5 w-5" /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Name</label>
                  <input type="text" value={tutorData.name} onChange={(e) => { setTutorData({ ...tutorData, name: e.target.value }); if (tutorModalError) setTutorModalError(null); }} placeholder="Enter tutor name" className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Email</label>
                  <input type="email" value={tutorData.email} onChange={(e) => { setTutorData({ ...tutorData, email: e.target.value }); if (tutorModalError) setTutorModalError(null); }} placeholder="Enter email" className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Phone</label>
                  <input type="tel" value={tutorData.phone} onChange={(e) => { setTutorData({ ...tutorData, phone: e.target.value }); if (tutorModalError) setTutorModalError(null); }} placeholder="Enter phone number" className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900" />
                </div>
              </div>

              {tutorModalError && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0"><svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg></div>
                    <div className="flex-1"><h4 className="text-sm font-medium text-red-800">{editingTutorId ? "Update Failed" : "Creation Failed"}</h4><p className="mt-1 text-sm text-red-700">{tutorModalError}</p></div>
                    <button onClick={() => setTutorModalError(null)} className="flex-shrink-0 text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                  </div>
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <button onClick={closeTutorModal} className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50" disabled={actionLoading}>Cancel</button>
                <button onClick={handleCreateTutor} className="flex-1 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50" disabled={actionLoading}>
                  {actionLoading ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Saving...</span> : editingTutorId ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== ASSIGN TUTOR MODAL ==================== */}
        {isAssignTutorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-lg">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">{editingAssignmentId ? "Edit Assignment" : "Assign Tutor"}</h3>
                <button onClick={closeAssignModal} className="text-gray-500 hover:text-gray-900"><X className="h-5 w-5" /></button>
              </div>

              <div className="space-y-6">
                {/* Select Tutor */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Select Tutor</label>
                  {(() => {
                    const availableTutors = editingAssignmentId ? tutors : getUnassignedTutors();
                    if (availableTutors.length === 0 && !editingAssignmentId) {
                      return (
                        <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-4 text-center">
                          <p className="text-sm text-gray-500">All tutors have been assigned</p>
                          <button onClick={() => { closeAssignModal(); setTutorModalError(null); setEditingTutorId(null); setTutorData({ id: null, name: "", email: "", phone: "" }); setIsCreateTutorOpen(true); }} className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-gray-900 hover:text-gray-700">
                            <Plus className="h-4 w-4" /> Create a new tutor
                          </button>
                        </div>
                      );
                    }
                    return (
                      <select value={assignmentData.tutorId} onChange={(e) => { setAssignmentData({ ...assignmentData, tutorId: e.target.value }); if (assignModalError) setAssignModalError(null); }} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900">
                        <option value="">Select a tutor</option>
                        {availableTutors.map((tutor) => (
                          <option key={tutor.id} value={tutor.id}>{tutor.name} {tutor.email ? `(${tutor.email})` : ''}</option>
                        ))}
                      </select>
                    );
                  })()}
                </div>

                {/* Grade & Section Selection - Expandable like superadmin */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-3">Assign Subjects by Grade & Section</label>
                  {grades.length === 0 ? (
                    <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-4 text-center">
                      <p className="text-sm text-gray-500">No classes created yet</p>
                      <button onClick={() => { closeAssignModal(); setClassModalError(null); setIsCreateClassOpen(true); }} className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-gray-900 hover:text-gray-700">
                        <Plus className="h-4 w-4" /> Create a class first
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {grades.map((grade) => (
                        <div key={grade.id} className="border border-gray-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => setExpandedGrade(expandedGrade === grade.order ? null : grade.order)}
                            className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100"
                          >
                            <span className="text-sm font-medium text-gray-900">{grade.name}</span>
                            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${expandedGrade === grade.order ? "rotate-180" : ""}`} />
                          </button>

                          {expandedGrade === grade.order && (
                            <div className="border-t border-gray-200 bg-gray-50 p-3 space-y-2">
                              {grade.sections.map((section) => {
                                const sectionKey = getAssignmentKey(grade.name, section.name);
                                const selectedSubjects = getSubjectsForSection(grade.name, section.name);
                                const isSectionExpanded = expandedSection === sectionKey;

                                return (
                                  <div key={section.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                    <button
                                      onClick={() => setExpandedSection(isSectionExpanded ? null : sectionKey)}
                                      className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-gray-50"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">{section.name}</span>
                                        <span className="text-sm font-medium text-gray-900">Section {section.name}</span>
                                        {selectedSubjects.length > 0 && (
                                          <span className="inline-flex items-center gap-0.5 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">✓ {selectedSubjects.length}</span>
                                        )}
                                      </div>
                                      <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isSectionExpanded ? "rotate-180" : ""}`} />
                                    </button>

                                    {isSectionExpanded && (
                                      <div className="px-3 py-3 bg-gray-50 border-t border-gray-200">
                                        <p className="text-xs font-medium text-gray-600 mb-2">Select Subjects for Section {section.name}</p>
                                        <div className="grid grid-cols-2 gap-2">
                                          {(section.subjects.length > 0 ? section.subjects.map((s) => s.name) : availableSubjects).map((subject) => (
                                            <button
                                              key={subject}
                                              onClick={() => toggleSubjectForSection(grade.name, section.name, subject)}
                                              className={`py-2 px-3 rounded-lg border-2 text-xs font-medium transition-all ${
                                                selectedSubjects.includes(subject)
                                                  ? "border-green-600 bg-green-50 text-green-700"
                                                  : "border-gray-300 bg-white text-gray-600 hover:border-green-400"
                                              }`}
                                            >
                                              {subject}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Class Tutor Assignment */}
                <div className="border-t border-gray-200 pt-4">
                  <label className="block text-sm font-medium text-gray-900 mb-3">Assign as Class Tutor (Optional)</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-2">Class Grade</label>
                      <select value={assignmentData.classGrade} onChange={(e) => setAssignmentData({ ...assignmentData, classGrade: e.target.value, classSection: "" })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600">
                        <option value="">Select Grade</option>
                        {grades.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-2">Section</label>
                      <select value={assignmentData.classSection} onChange={(e) => setAssignmentData({ ...assignmentData, classSection: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600" disabled={!assignmentData.classGrade}>
                        <option value="">Select Section</option>
                        {getSectionsForGrade(assignmentData.classGrade).map((s) => <option key={s} value={s}>Section {s}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {assignModalError && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0"><svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg></div>
                    <div className="flex-1"><h4 className="text-sm font-medium text-red-800">{editingAssignmentId ? "Update Failed" : "Assignment Failed"}</h4><p className="mt-1 text-sm text-red-700">{assignModalError}</p></div>
                    <button onClick={() => setAssignModalError(null)} className="flex-shrink-0 text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                  </div>
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <button onClick={closeAssignModal} className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50" disabled={actionLoading}>Cancel</button>
                <button onClick={handleAssignTutor} className="flex-1 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50" disabled={actionLoading}>
                  {actionLoading ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> {editingAssignmentId ? "Updating..." : "Assigning..."}</span> : editingAssignmentId ? "Update" : "Assign"}
                </button>
              </div>
            </div>
          </div>
        )}



        {/* ==================== DELETE CONFIRMATION MODAL ==================== */}
        {deleteConfirm.isOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-red-100">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                {deleteConfirm.type === "class" && "Delete Class"}
                {deleteConfirm.type === "tutor" && "Delete Tutor"}
                {deleteConfirm.type === "assignment" && "Delete Assignment"}
              </h3>
              
              <p className="text-sm text-gray-600 text-center mb-6">
                {deleteConfirm.type === "class" && (
                  <>Are you sure you want to delete <span className="font-semibold text-gray-900">{deleteConfirm.name}</span>? This will also delete all sections and subject assignments.</>
                )}
                {deleteConfirm.type === "tutor" && (
                  <>Are you sure you want to delete <span className="font-semibold text-gray-900">{deleteConfirm.name}</span>? This will also remove all their assignments.</>
                )}
                {deleteConfirm.type === "assignment" && (
                  <>Are you sure you want to delete the assignment for <span className="font-semibold text-gray-900">{deleteConfirm.name}</span>?</>
                )}
              </p>

              <div className="flex gap-3">
                <button onClick={closeDeleteConfirm} className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors" disabled={actionLoading}>
                  Cancel
                </button>
                <button onClick={handleConfirmDelete} className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50" disabled={actionLoading}>
                  {actionLoading ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /></span> : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}