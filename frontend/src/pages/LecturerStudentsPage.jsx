import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  Users,
  Search,
  Filter,
  Mail,
  RefreshCw,
  XCircle,
  ClipboardList,
  GraduationCap,
  Eye,
  Calendar,
  BookOpen,
  MapPin,
  ShieldCheck,
  User as UserIcon,
  MoreVertical
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import { getAssetUrl, getAvatarColor } from "../utils/fileUtils";
import { formatDate } from "../utils/dateUtils";
import { useAuth } from "../context/AuthContext";
import { useSearch } from "../context/SearchContext";
import {
  getRoleAccent,
  getSidebarItems,
  getPrimaryRole,
} from "../utils/dashboardConfig";
import CustomDropdown from "../components/CustomDropdown";
import { generateLecturerStudentPDF } from "../utils/pdfGenerator";
import Modal from "../components/Modal";
import {
  useQuery,
  keepPreviousData,
} from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

const statusStyles = {
  ACTIVE:
    "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-500/20",
  DISABLED:
    "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-500/20",
};

const LecturerStudentsPage = () => {
  const { t, i18n } = useTranslation();
  const getLocalizedFaculty = (fac) => {
    if (!fac) return "N/A";
    const keyMap = {
      "faculty of computing": "faculty_computing",
      "faculty of engineering": "faculty_engineering",
      "faculty of business": "faculty_business",
      "faculty of science": "faculty_science",
      "faculty of humanities": "faculty_humanities",
      "faculty of humanities & sciences": "faculty_humanities_sciences",
      "faculty of information science": "faculty_information_science",
      "information science": "faculty_information_science",
      "computing": "faculty_computing",
      "engineering": "faculty_engineering",
      "business": "faculty_business",
      "humanities & sciences": "faculty_humanities_sciences"
    };
    const key = keyMap[fac.toLowerCase().trim()];
    if (key) return t(key);
    return fac;
  };

  const getLocalizedYear = (year) => {
    if (!year) return "";
    const keyMap = {
      "1st year": "year_1",
      "2nd year": "year_2",
      "3rd year": "year_3",
      "4th year": "year_4"
    };
    const key = keyMap[year.toLowerCase().trim()];
    if (key) return t(key);
    return year;
  };

  const getLocalizedSemester = (sem) => {
    if (!sem) return "";
    const keyMap = {
      "semester 1": "semester_1",
      "semester 2": "semester_2"
    };
    const key = keyMap[sem.toLowerCase().trim()];
    if (key) return t(key);
    return sem;
  };
  const dateLocale = i18n.language === "si" ? "si-LK" : i18n.language === "ta" ? "ta-LK" : "en-US";
  const { user, logout } = useAuth();
  const { searchQuery } = useSearch(); // Still keeping search logic in case needed in future, but removing UI
  const [batchFilter, setBatchFilter] = useState("ALL");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [highlightId, setHighlightId] = useState(null);
  const highlightedRef = useRef(null);
  const location = useLocation();

  const primaryRole = getPrimaryRole(user?.roles);
  const accent = getRoleAccent(primaryRole);
  const sidebarItems = useMemo(
    () => getSidebarItems(primaryRole),
    [primaryRole],
  );

  // Extract assigned batches for filter options
  const assignedBatchesOptions = useMemo(() => {
    if (!user?.batches) return [];
    return user.batches.split(",").map(b => b.trim()).filter(b => b.length > 0);
  }, [user?.batches]);

  // Query Students (fetch all for lecturer and filter/count locally)
  const {
    data: allStudents = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["lecturer-students", searchQuery],
    queryFn: async () => {
      const params = {
        search: searchQuery || "",
        batchFilter: ""
      };
      const res = await api.get("/students/lecturer", { params });
      return res.data || [];
    },
    enabled: !!user,
    placeholderData: keepPreviousData,
  });

  const students = useMemo(() => {
    if (batchFilter === "ALL") return allStudents;
    return allStudents.filter((s) => {
      const yMatch = s.year ? s.year.match(/\d/) : null;
      const sMatch = s.semester ? s.semester.match(/\d/) : null;
      const batchTag = yMatch ? `Y${yMatch[0]}` : s.year;
      const semTag = sMatch ? `S${sMatch[0]}` : s.semester;
      const studentBatchTag = batchTag + semTag;
      return studentBatchTag === batchFilter;
    });
  }, [allStudents, batchFilter]);

  const batchCounts = useMemo(() => {
    const counts = { ALL: allStudents.length };
    assignedBatchesOptions.forEach((b) => {
      counts[b] = 0;
    });
    allStudents.forEach((s) => {
      const yMatch = s.year ? s.year.match(/\d/) : null;
      const sMatch = s.semester ? s.semester.match(/\d/) : null;
      const batchTag = yMatch ? `Y${yMatch[0]}` : s.year;
      const semTag = sMatch ? `S${sMatch[0]}` : s.semester;
      const studentBatchTag = batchTag + semTag;
      if (counts[studentBatchTag] !== undefined) {
        counts[studentBatchTag]++;
      }
    });
    return counts;
  }, [allStudents, assignedBatchesOptions]);

  const filterOptions = useMemo(() => {
    return [
      { value: "ALL", label: t("all_batches", "All Batches"), count: batchCounts.ALL },
      ...assignedBatchesOptions.map(b => ({
        value: b,
        label: b,
        count: batchCounts[b] || 0,
      }))
    ];
  }, [assignedBatchesOptions, batchCounts, t]);

  // Handle Highlighting and Scrolling
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get("highlight");
    if (id) {
      setHighlightId(id);
      const timer = setTimeout(() => setHighlightId(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [location.search]);

  useEffect(() => {
    if (highlightId && highlightedRef.current) {
      highlightedRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [highlightId, students]);

  const handleOpenDetails = (student) => {
    setSelectedStudent(student);
    setIsModalOpen(true);
  };

  if (!user) return null;

  return (
    <DashboardLayout
      user={user}
      logout={logout}
      title={t("my_students", "My Students")}
      subtitle={t("my_students_subtitle", { count: students.length, defaultValue: `Managing ${students.length} students assigned to my academic batches.` })}
      items={sidebarItems}
      displayRole={t("role_lecturer", "Lecturer")}
      {...accent}
    >
      {/* Premium Filter Card */}
      <section className="relative z-30 rounded-2xl bg-white p-6 shadow-sm border border-slate-200 dark:bg-slate-900/50 dark:border-white/5 mb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex-1 max-w-sm">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2.5 ml-1">
              {t("academic_batch", "Academic Batch")}
            </label>
            <CustomDropdown
              options={filterOptions}
              value={batchFilter}
              onChange={setBatchFilter}
              placeholder={t("all_batches", "All Batches")}
              icon={BookOpen}
            />
          </div>

          <button
            onClick={() => generateLecturerStudentPDF(students)}
            disabled={!students || students.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-white/5 border-2 border-transparent px-4 py-2 text-[13px] font-bold text-slate-600 dark:text-slate-400 transition-all hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white shadow-sm active:scale-95 disabled:opacity-50"
          >
            <ClipboardList className="h-4 w-4" />
            {t("download_pdf", "Download PDF")}
          </button>
        </div>
      </section>

      {/* Students Table Section */}
      <section
        className={`rounded-xl bg-white p-5 sm:p-6 shadow-sm border border-slate-200 dark:bg-slate-900/50 dark:border-white/5 transition-all duration-300 ${isLoading ? "opacity-70 pointer-events-none" : "opacity-100"} mb-16`}
      >
        <div className="overflow-x-auto -mx-2 scrollbar-hide">
          <table className="min-w-full border-separate border-spacing-y-2">
            <thead>
              <tr className="text-left">
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-[30%]">
                  {t("student_info", "Student Info")}
                </th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-[20%]">
                  {t("academic_group", "Academic Group")}
                </th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-[20%]">
                  {t("faculty", "Faculty")}
                </th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-[15%]">
                  {t("status", "Status")}
                </th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center w-[120px] min-w-[120px]">
                  {t("actions", "Actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y-0">
              {students.map((s) => {
                const yMatch = s.year ? s.year.match(/\d/) : null;
                const sMatch = s.semester ? s.semester.match(/\d/) : null;
                const batchTag = yMatch ? `Y${yMatch[0]}` : s.year;
                const semTag = sMatch ? `S${sMatch[0]}` : s.semester;

                return (
                  <tr
                    key={s.id}
                    ref={highlightId === s.id ? highlightedRef : null}
                    className={`group transition-all duration-500 bg-white dark:bg-slate-900/50 relative ${
                      highlightId === s.id
                        ? "z-20 scale-[1.01] shadow-2xl shadow-blue-500/20"
                        : "hover:scale-[1.005]"
                    }`}
                  >
                    <td
                      className={`px-4 py-3 rounded-l-xl border-y border-l transition-all duration-500 ${
                        highlightId === s.id
                          ? "border-blue-500 bg-blue-50/30 dark:bg-blue-500/5"
                          : "border-slate-100 dark:border-white/5 group-hover:border-blue-500"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {s.profilePicture ? (
                          <img
                            src={getAssetUrl(s.profilePicture)}
                            className="h-8 w-8 rounded-lg object-cover ring-2 ring-white dark:ring-slate-800"
                            alt={s.name}
                          />
                        ) : (
                          <div className={`h-8 w-8 rounded-lg ${getAvatarColor(s.name)} flex items-center justify-center text-white text-xs font-bold shadow-lg`}>
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                            {s.name}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            {s.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td
                      className={`px-4 py-3 border-y transition-all duration-500 ${
                        highlightId === s.id
                          ? "border-blue-500 bg-blue-50/30 dark:bg-blue-500/5"
                          : "border-slate-100 dark:border-white/5 group-hover:border-blue-500"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-[9px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20">
                          {batchTag}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20">
                          {semTag}
                        </span>
                      </div>
                    </td>
                    <td
                      className={`px-4 py-3 border-y transition-all duration-500 ${
                        highlightId === s.id
                          ? "border-blue-500 bg-blue-50/30 dark:bg-blue-500/5"
                          : "border-slate-100 dark:border-white/5 group-hover:border-blue-500"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                         <GraduationCap className="h-3 w-3 text-slate-400" />
                         <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight">
                          {s.faculty ? getLocalizedFaculty(s.faculty) : t("n_a", "N/A")}
                        </span>
                      </div>
                    </td>
                    <td
                      className={`px-4 py-3 border-y transition-all duration-500 ${
                        highlightId === s.id
                          ? "border-blue-500 bg-blue-50/30 dark:bg-blue-500/5"
                          : "border-slate-100 dark:border-white/5 group-hover:border-blue-500"
                      }`}
                    >
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${s.enabled ? statusStyles.ACTIVE : statusStyles.DISABLED}`}
                      >
                        {s.enabled ? t("active", "Active") : t("inactive", "Inactive")}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-3 rounded-r-xl border-y border-r transition-all duration-500 relative w-[120px] min-w-[120px] ${
                        highlightId === s.id
                          ? "border-blue-500 bg-blue-50/30 dark:bg-blue-500/5"
                          : "border-slate-100 dark:border-white/5 group-hover:border-blue-500"
                      }`}
                    >
                      {/* Default View (Actions Label) */}
                      <div className="flex items-center justify-center gap-1 text-slate-400 group-hover:opacity-0 transition-opacity duration-300">
                        <span className="text-[9px] font-black uppercase tracking-widest">
                          {t("actions", "Actions")}
                        </span>
                        <MoreVertical className="h-4 w-4" />
                      </div>

                      {/* Hover View (Functional Text Buttons in Row) */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 px-1">
                        <div className="flex flex-row items-center justify-center gap-1 w-full">
                          <button
                            onClick={() => handleOpenDetails(s)}
                            className="table-action-btn text-[9px] font-black uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20"
                          >
                            {t("details", "Details")}
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {students.length === 0 && !isLoading && !isError && (
                <tr>
                  <td colSpan={5} className="px-4 py-20 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center mb-6 dark:bg-white/5">
                        <Users className="h-10 w-10 text-slate-300" />
                      </div>
                      <h4 className="text-xl font-black text-slate-900 dark:text-white mb-2">
                        {t("no_students_found", "No students found")}
                      </h4>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        {t("no_students_found_desc", "No students found for the selected batch/semester.")}
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {isError && (
                <tr>
                  <td colSpan={5} className="px-4 py-20 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="h-20 w-20 rounded-[2rem] bg-rose-50 flex items-center justify-center mb-4 dark:bg-rose-900/20">
                        <XCircle className="h-10 w-10 text-rose-500" />
                      </div>
                      <h4 className="text-xl font-black text-slate-900 dark:text-white">
                        {t("connection_error", "Connection Error")}
                      </h4>
                      <p className="text-sm font-medium text-slate-500 mt-1 mb-6">
                        {t("failed_fetch_students", "Failed to fetch assigned students.")}
                      </p>
                      <button
                        onClick={refetch}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 shadow-lg"
                      >
                        <RefreshCw className="h-4 w-4" /> {t("retry", "Retry")}
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Student Details Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t("student_profile_details", "Student Profile Details")}
      >
        {selectedStudent && (
          <div className="space-y-8 p-1">
            {/* Header / Basic Info */}
            <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-100 dark:border-white/5">
              <div className="relative">
                 {selectedStudent.profilePicture ? (
                    <img
                      src={getAssetUrl(selectedStudent.profilePicture)}
                      className="h-24 w-24 rounded-[2rem] object-cover ring-4 ring-blue-500/10 shadow-xl"
                      alt={selectedStudent.name}
                    />
                  ) : (
                    <div className={`h-24 w-24 rounded-[2rem] ${getAvatarColor(selectedStudent.name)} flex items-center justify-center text-white text-3xl font-black shadow-xl`}>
                      {selectedStudent.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1.5 rounded-xl shadow-lg border-2 border-white dark:border-slate-900">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
              </div>
              <div className="text-center sm:text-left space-y-1">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {selectedStudent.name}
                </h3>
                <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
                    {t("student", "Student")}
                  </span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${selectedStudent.enabled ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"}`}>
                    {selectedStudent.enabled ? t("account_active", "Account Active") : t("account_disabled", "Account Disabled")}
                  </span>
                </div>
              </div>
            </div>

            {/* Detailed Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                    <div className="h-10 w-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
                      <Mail className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("email_address", "Email Address")}</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{selectedStudent.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                    <div className="h-10 w-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
                      <GraduationCap className="h-5 w-5 text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("faculty", "Faculty")}</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{selectedStudent.faculty ? getLocalizedFaculty(selectedStudent.faculty) : t("faculty_information_science", "Information Science")}</p>
                    </div>
                  </div>
               </div>

               <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                    <div className="h-10 w-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
                      <Calendar className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("academic_year", "Academic Year")}</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{selectedStudent.year ? getLocalizedYear(selectedStudent.year) : t("year_3", "3rd Year")}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                    <div className="h-10 w-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
                      <BookOpen className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("semester", "Semester")}</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{selectedStudent.semester ? getLocalizedSemester(selectedStudent.semester) : t("semester_1", "Semester 1")}</p>
                    </div>
                  </div>
               </div>
            </div>

            {/* Footer / Join Date */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 opacity-70" />
                <span className="text-[11px] font-black uppercase tracking-widest">{t("enrollment_status_verified", "Enrollment Status Verified")}</span>
              </div>
              <span className="text-[11px] font-black opacity-50 uppercase tracking-widest">
                {t("joined_with_colon", "Joined: ")}{formatDate(selectedStudent.createdAt, dateLocale)}
              </span>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
};

export default LecturerStudentsPage;
