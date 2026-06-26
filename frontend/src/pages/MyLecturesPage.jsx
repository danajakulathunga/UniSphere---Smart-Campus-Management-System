import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Search,
  Download,
  FileText,
  User as UserIcon,
  Clock,
  MapPin,
  Calendar,
  ChevronRight,
  Info,
  Filter,
  RefreshCw,
  Loader2,
  MoreVertical,
  Send,
  Share2,
  Star,
  Copy,
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import { formatDate } from "../utils/dateUtils";
import { normalizeRoles, useAuth } from "../context/AuthContext";
import {
  getPrimaryRole,
  getRoleAccent,
  getSidebarItems,
} from "../utils/dashboardConfig";
import { useSearch } from "../context/SearchContext";
import LectureSessionCard from "../components/LectureSessionCard";
import Modal from "../components/Modal";
import ShareSessionModal from "../components/ShareSessionModal";
import CustomDropdown from "../components/CustomDropdown";
import CustomDatePicker from "../components/CustomDatePicker";
import { useAlert } from "../context/AlertContext";
import { generateAttendancePDF } from "../utils/pdfGenerator";
import { useTranslation } from "react-i18next";

const MyLecturesPage = () => {
  const { t, i18n } = useTranslation();
  const getLocalizedLocation = (loc) => {
    if (!loc) return "";
    let localized = loc;
    const keyMap = {
      "main building": "main_building",
      "new building": "new_building",
      "foe building": "foe_building",
      "fob building": "fob_building",
      "auditorium": "auditorium"
    };
    const keys = Object.keys(keyMap).sort((a, b) => b.length - a.length);
    for (const k of keys) {
      const regex = new RegExp(k, "gi");
      if (regex.test(localized)) {
        localized = localized.replace(regex, t(keyMap[k]));
      }
    }
    return localized;
  };
  const dateLocale = i18n.language?.startsWith("si") ? "si-LK" : i18n.language?.startsWith("ta") ? "ta-LK" : "en-US";
  const { user, logout } = useAuth();
  const { searchQuery } = useSearch();
  const { showAlert } = useAlert();
  const roles = normalizeRoles(user?.roles);
  const isLecturer = roles.includes("LECTURER");
  const isAdmin = roles.includes("ADMIN");
  const primaryRole = getPrimaryRole(roles);
  const accent = getRoleAccent(primaryRole);
  const sidebarItems = useMemo(
    () => getSidebarItems(primaryRole),
    [primaryRole],
  );

  const [selectedSession, setSelectedSession] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedBookingForShare, setSelectedBookingForShare] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [activeHighlightId, setActiveHighlightId] = useState(null);
  const [pendingOpenDetailsId, setPendingOpenDetailsId] = useState(null);
  const [pendingOpenAttendanceId, setPendingOpenAttendanceId] = useState(null);

  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [ratingSession, setRatingSession] = useState(null);
  const [ratingValue, setRatingValue] = useState(0);

  const isUser = roles.includes("USER");
  const isProfileComplete = useMemo(() => {
    if (!isUser) return true;
    return !!(
      user?.year &&
      user?.semester &&
      user?.faculty &&
      user.year.trim() !== "" &&
      user.semester.trim() !== "" &&
      user.faculty.trim() !== ""
    );
  }, [user, isUser]);
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading, refetch } = useQuery({
    queryKey: ["my-sessions", user?.year, user?.semester],
    queryFn: async () => {
      const res = await api.get("/bookings/sessions", {
        params: {
          year: user?.year || "Not specified",
          semester: user?.semester || "Not specified",
        },
      });
      return res.data || [];
    },
    enabled: !!user && isProfileComplete,
    refetchInterval: 5000,
  });

  const { data: myAttendances = [] } = useQuery({
    queryKey: ["my-attendances", user?.id],
    queryFn: async () => {
      const res = await api.get("/attendance/my-attendance");
      return res.data || [];
    },
    enabled: !!user && isUser && isProfileComplete,
    refetchInterval: 5000,
  });

  const attendedBookingIds = useMemo(() => {
    return new Set(myAttendances.map((a) => a.bookingId || a.lectureSessionId));
  }, [myAttendances]);

  // Fetch resources for location fallback (for old bookings)
  const { data: resources = [] } = useQuery({
    queryKey: ["all-resources-for-sessions"],
    queryFn: async () => {
      const res = await api.get("/resources", { params: { size: 100 } });
      return res.data?.content || [];
    },
  });

  // Student attendance state
  const [studentAttendanceModalOpen, setStudentAttendanceModalOpen] = useState(false);
  const [studentAttendanceSession, setStudentAttendanceSession] = useState(null);
  const [attendanceScanStep, setAttendanceScanStep] = useState("view_qr"); // "view_qr", "form"
  const [isSubmittingAttendance, setIsSubmittingAttendance] = useState(false);
  const [isRefreshingQr, setIsRefreshingQr] = useState(false);

  // Lecturer attendance state
  const [lecturerAttendanceModalOpen, setLecturerAttendanceModalOpen] = useState(false);
  const [lecturerAttendanceSession, setLecturerAttendanceSession] = useState(null);
  const [attendanceSearchQuery, setAttendanceSearchQuery] = useState("");
  const [attendanceSortConfig, setAttendanceSortConfig] = useState({ key: "studentName", direction: "asc" });
  const [attendancePage, setAttendancePage] = useState(0);
  const attendancePageSize = 5;

  const { data: attendanceSummary = { totalSharedStudents: 0, attendedStudents: 0, attendancePercentage: 0 } } = useQuery({
    queryKey: ["attendance-summary", lecturerAttendanceSession?.id],
    queryFn: async () => {
      const res = await api.get(`/attendance/summary/${lecturerAttendanceSession.id}`);
      return res.data;
    },
    enabled: lecturerAttendanceModalOpen && !!lecturerAttendanceSession,
  });

  const { data: attendanceList = [] } = useQuery({
    queryKey: ["attendance-list", lecturerAttendanceSession?.id],
    queryFn: async () => {
      const res = await api.get(`/attendance/list/${lecturerAttendanceSession.id}`);
      return res.data || [];
    },
    enabled: lecturerAttendanceModalOpen && !!lecturerAttendanceSession,
    refetchInterval: 3000, // Real-time updates!
  });

  const handleSubmitAttendance = async () => {
    setIsSubmittingAttendance(true);
    try {
      await api.post("/attendance", { qrCode: studentAttendanceSession.qrCode });
      showAlert("success", t("success_attendance_recorded", "Attendance recorded successfully."));
      setStudentAttendanceModalOpen(false);
      setStudentAttendanceSession(null);
      queryClient.invalidateQueries(["my-attendances"]);
    } catch (err) {
      const errMsg = err?.response?.data?.message || t("err_failed_submit_attendance", "Failed to submit attendance.");
      showAlert("error", errMsg);
    } finally {
      setIsSubmittingAttendance(false);
    }
  };

  const handleRateSession = async () => {
    if (!ratingSession || ratingValue === 0) return;
    try {
      await api.patch(`/bookings/${ratingSession.id}/rate`, { rating: ratingValue });
      queryClient.invalidateQueries(["my-sessions"]);
      setRatingModalOpen(false);
      setRatingSession(null);
      setRatingValue(0);
      showAlert("success", t("success_lecturer_rated", "Lecturer rated successfully!"));
    } catch (err) {
      console.error("Error submitting lecture rating:", err);
      showAlert("error", err?.response?.data?.message || t("err_failed_submit_rating", "Failed to submit rating."));
    }
  };

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get("highlight");
    const openDetails = params.get("openDetails") === "true";
    const openAttendance = params.get("openAttendance") === "true";

    if (id) {
      setActiveHighlightId(id);
      if (openDetails) {
        setPendingOpenDetailsId(id);
      }
      if (openAttendance) {
        setPendingOpenAttendanceId(id);
      }

      // Clear the query params via navigate to keep React Router state in sync
      navigate(location.pathname, { replace: true });

      const timer = setTimeout(() => setActiveHighlightId(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [location.search, navigate, location.pathname]);

  React.useEffect(() => {
    if (sessions && sessions.length > 0) {
      if (pendingOpenDetailsId) {
        const session = sessions.find((s) => String(s.id) === String(pendingOpenDetailsId));
        if (session) {
          setSelectedSession(session);
        }
        setPendingOpenDetailsId(null);
      }
      if (pendingOpenAttendanceId) {
        const session = sessions.find((s) => String(s.id) === String(pendingOpenAttendanceId));
        if (session) {
          if (isLecturer) {
            setLecturerAttendanceSession(session);
            setLecturerAttendanceModalOpen(true);
            setAttendanceSearchQuery("");
            setAttendancePage(0);
          } else if (isUser) {
            setStudentAttendanceSession(session);
            setStudentAttendanceModalOpen(true);
            setAttendanceScanStep("view_qr");
          }
        }
        setPendingOpenAttendanceId(null);
      }
    }
  }, [sessions, pendingOpenDetailsId, pendingOpenAttendanceId, isLecturer, isUser]);
  const [filters, setFilters] = useState(() => {
    const params = new URLSearchParams(location.search);
    return {
      batch: params.get("batch") || "",
      date: params.get("date") || "",
    };
  });

  // Sync filters when URL params change (e.g., calendar navigation)
  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const dateParam = params.get("date");
    const batchParam = params.get("batch");
    if (dateParam !== null || batchParam !== null) {
      setFilters((prev) => ({
        ...prev,
        date: dateParam || prev.date,
        batch: batchParam || prev.batch,
      }));
    }
  }, [location.search]);

  React.useEffect(() => {
    if (activeHighlightId && sessions.length > 0) {
      const element = document.getElementById(`session-${activeHighlightId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [activeHighlightId, sessions]);

  const batchCounts = useMemo(() => {
    const counts = { total: 0 };
    const batches = ["Y1S1", "Y1S2", "Y2S1", "Y2S2", "Y3S1", "Y3S2", "Y4S1", "Y4S2"];
    batches.forEach(b => {
      counts[b] = 0;
    });

    sessions.forEach((s) => {
      counts.total++;
      if (s.assignedBatch && counts[s.assignedBatch] !== undefined) {
        counts[s.assignedBatch]++;
      }
    });
    return counts;
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    let filtered = sessions;

    // Global search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.purpose.toLowerCase().includes(q) ||
          s.userName.toLowerCase().includes(q) ||
          s.resourceName.toLowerCase().includes(q),
      );
    }

    // Batch filter
    if (filters.batch) {
      filtered = filtered.filter((s) => s.assignedBatch === filters.batch);
    }

    // Date filter
    if (filters.date) {
      filtered = filtered.filter((s) => s.bookingDate === filters.date);
    }

    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.bookingDate + "T" + a.startTime);
      const dateB = new Date(b.bookingDate + "T" + b.startTime);
      return dateB - dateA;
    });
  }, [sessions, searchQuery, filters]);

  const hasStarted = (booking) => {
    if (!booking) return false;
    try {
      let y, m, d, h, min;
      if (Array.isArray(booking.bookingDate)) [y, m, d] = booking.bookingDate;
      else [y, m, d] = booking.bookingDate.split("-").map(Number);
      if (Array.isArray(booking.startTime)) [h, min] = booking.startTime;
      else [h, min] = booking.startTime.split(":").map(Number);

      const start = new Date(y, m - 1, d, h, min);
      return new Date() > start;
    } catch (e) {
      return false;
    }
  };

  const hasFinished = (booking) => {
    if (!booking) return false;
    try {
      let y, m, d, h, min;
      if (Array.isArray(booking.bookingDate)) [y, m, d] = booking.bookingDate;
      else [y, m, d] = booking.bookingDate.split("-").map(Number);
      if (Array.isArray(booking.endTime)) [h, min] = booking.endTime;
      else [h, min] = booking.endTime.split(":").map(Number);

      const end = new Date(y, m - 1, d, h, min);
      return new Date() > end;
    } catch (e) {
      return false;
    }
  };

  const isAttendanceOpen = (booking) => {
    if (!booking) return false;
    try {
      let y, m, d, hS, minS, hE, minE;
      if (Array.isArray(booking.bookingDate)) [y, m, d] = booking.bookingDate;
      else [y, m, d] = booking.bookingDate.split("-").map(Number);
      if (Array.isArray(booking.startTime)) [hS, minS] = booking.startTime;
      else [hS, minS] = booking.startTime.split(":").map(Number);
      if (Array.isArray(booking.endTime)) [hE, minE] = booking.endTime;
      else [hE, minE] = booking.endTime.split(":").map(Number);

      const now = new Date();
      const openFrom = new Date(y, m - 1, d, hS, minS - 5); // 5 min before start
      const closedAfter = new Date(y, m - 1, d, hE, minE + 15); // 15 min after end
      return now >= openFrom && now <= closedAfter;
    } catch (e) {
      return false;
    }
  };

  const getBatchOptions = () => {
    const batches = [
      "Y1S1",
      "Y1S2",
      "Y2S1",
      "Y2S2",
      "Y3S1",
      "Y3S2",
      "Y4S1",
      "Y4S2",
    ];
    return batches.map((b) => ({ value: b, label: b, count: batchCounts[b] || 0 }));
  };

  const formatTime = (time) => {
    if (!time) return "";
    try {
      const [h, m] = time.split(":");
      const date = new Date();
      date.setHours(parseInt(h, 10));
      date.setMinutes(parseInt(m, 10));
      return date.toLocaleTimeString(dateLocale, {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return time;
    }
  };

  const handleDownload = (path) => {
    const fileName = path.split("/").pop();
    const link = document.createElement("a");
    link.href = `${api.defaults.baseURL.replace("/api", "")}${path}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <DashboardLayout
      user={user}
      logout={logout}
      title={t("my_lectures", "My Lectures")}
      subtitle={t("my_lectures_subtitle", "My personalized academic schedule and materials")}
      items={sidebarItems}
      displayRole={primaryRole}
      {...accent}
    >
      <div className="space-y-8 animate-reveal">
        {/* Filter Bar */}
        <div className="relative z-30 rounded-xl bg-white p-5 shadow-sm border border-slate-200 dark:bg-slate-900/50 dark:border-white/5">
          <div className="flex flex-col md:flex-row items-end justify-between gap-6">
            <div className="flex-1 flex flex-col md:flex-row items-center gap-6">
              {/* Batch Filter */}
              <div className="w-full md:w-[240px]">
                <CustomDropdown
                  label={t("academic_batch", "Academic Batch")}
                  icon={BookOpen}
                  options={[
                    { value: "", label: t("all_batches", "All Batches"), count: batchCounts.total },
                    ...getBatchOptions(),
                  ]}
                  value={filters.batch}
                  onChange={(val) =>
                    setFilters((prev) => ({ ...prev, batch: val }))
                  }
                />
              </div>

              {/* Date Filter */}
              <div className="w-full md:w-[240px]">
                <CustomDatePicker
                  label={t("session_date", "Session Date")}
                  value={filters.date}
                  onChange={(val) =>
                    setFilters((prev) => ({ ...prev, date: val }))
                  }
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {(filters.batch || filters.date) && (
                <button
                  onClick={() => setFilters({ batch: "", date: "" })}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-[13px] font-bold text-slate-600 transition hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10 shadow-sm active:scale-95"
                >
                  <RefreshCw className="h-4 w-4" /> {t("reset", "Reset")}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table Section */}
        <section className="rounded-xl bg-white p-5 sm:p-6 shadow-sm border border-slate-200 dark:bg-slate-900/50 dark:border-white/5 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-300">
          <div className="overflow-x-auto -mx-2 scrollbar-hide">
            <table className="min-w-full border-separate border-spacing-y-1">
              <thead>
                <tr className="text-left">
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 w-[30%]">
                    {t("lecture_session", "Lecture Session")}
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 w-[20%]">
                    {t("schedule_info", "Schedule Info")}
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 w-[15%]">
                    {t("location", "Location")}
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 w-[15%]">
                    {t("status", "Status")}
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center w-[20%] min-w-[180px]">
                    {t("actions", "Actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {!isLoading &&
                  filteredSessions.map((session) => (
                    <tr
                      key={session.id}
                      id={`session-${session.id}`}
                      className={`group transition-all duration-500 hover:scale-[1.01] hover:relative hover:z-20 ${activeHighlightId != null && String(activeHighlightId) === String(session.id) ? "relative z-10 scale-[1.01]" : ""}`}
                    >
                      <td
                        className={`px-4 py-2 bg-white/40 backdrop-blur-md border-y border-l rounded-l-xl transition-all duration-500 shadow-sm group-hover:shadow-xl group-hover:shadow-blue-600/5 dark:shadow-none ${activeHighlightId != null && String(activeHighlightId) === String(session.id) ? "border-y-blue-500 border-l-blue-500 bg-blue-50/50 dark:bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.2)]" : "border-slate-100 dark:bg-slate-900/40 dark:border-white/5 group-hover:border-y-blue-500 group-hover:border-l-blue-500"}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 transition-transform duration-500 group-hover:scale-110">
                            <BookOpen className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              {session.purpose}
                              {session.rating && (
                                <span className="inline-flex items-center gap-0.5 text-amber-500 text-xs font-black">
                                  <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                                  {session.rating}
                                </span>
                              )}
                            </p>
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:bg-white/5 dark:text-slate-400">
                              {session.assignedBatch || t("general", "General")}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td
                        className={`px-4 py-2 bg-white/40 backdrop-blur-md border-y transition-all duration-500 shadow-sm group-hover:shadow-xl group-hover:shadow-blue-600/5 dark:shadow-none ${activeHighlightId != null && String(activeHighlightId) === String(session.id) ? "border-y-blue-500 bg-blue-50/50 dark:bg-blue-500/10" : "border-slate-100 dark:bg-slate-900/40 dark:border-white/5 group-hover:border-y-blue-500"}`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                            <Calendar className="h-3.5 w-3.5 text-blue-500" />
                            {formatDate(session.bookingDate, dateLocale)}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                            <Clock className="h-3.5 w-3.5 text-slate-300" />
                            {formatTime(session.startTime)} -{" "}
                            {formatTime(session.endTime)}
                          </div>
                        </div>
                      </td>
                      <td
                        className={`px-4 py-2 bg-white/40 backdrop-blur-md border-y transition-all duration-500 shadow-sm group-hover:shadow-xl group-hover:shadow-blue-600/5 dark:shadow-none ${activeHighlightId != null && String(activeHighlightId) === String(session.id) ? "border-y-blue-500 bg-blue-50/50 dark:bg-blue-500/10" : "border-slate-100 dark:bg-slate-900/40 dark:border-white/5 group-hover:border-y-blue-500"}`}
                      >
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                          <MapPin className="h-3.5 w-3.5 text-slate-300" />
                          {getLocalizedLocation(session.resourceName)}
                          {(session.campusLocation || resources.find(r => r.id === session.resourceId)?.location) && 
                            ` (${getLocalizedLocation(session.campusLocation || resources.find(r => r.id === session.resourceId)?.location)})`}
                        </div>
                      </td>
                      <td
                        className={`px-4 py-2 bg-white/40 backdrop-blur-md border-y transition-all duration-500 shadow-sm group-hover:shadow-xl group-hover:shadow-blue-600/5 dark:shadow-none ${activeHighlightId != null && String(activeHighlightId) === String(session.id) ? "border-y-blue-500 bg-blue-50/50 dark:bg-blue-500/10" : "border-slate-100 dark:bg-slate-900/40 dark:border-white/5 group-hover:border-y-blue-500"}`}
                      >
                        <div className="flex flex-wrap gap-1.5">
                          {session.status === "CANCELLED" ||
                          (session.sessionDetails &&
                            session.sessionDetails
                              .toLowerCase()
                              .includes("canceled")) ? (
                            <span className="inline-flex items-center rounded-lg border px-2 py-1 text-[9px] font-bold uppercase tracking-widest bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-500/20">
                              {t("cancelled", "Canceled")}
                            </span>
                          ) : session.isUpdated ||
                            (session.sessionDetails &&
                              session.sessionDetails
                                .toLowerCase()
                                .includes("updated")) ? (
                            <span className="inline-flex items-center rounded-lg border px-2 py-1 text-[9px] font-bold uppercase tracking-widest bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-500/20">
                              {t("updated", "Updated")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-lg border px-2 py-1 text-[9px] font-bold uppercase tracking-widest bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-500/20">
                              {t("scheduled", "Scheduled")}
                            </span>
                          )}
                        </div>
                      </td>
                      <td
                        className={`px-4 py-2 bg-white/40 backdrop-blur-md border-y border-r rounded-r-xl transition-all duration-500 shadow-sm group-hover:shadow-xl group-hover:shadow-blue-600/5 dark:shadow-none relative w-[180px] min-w-[180px] ${activeHighlightId != null && String(activeHighlightId) === String(session.id) ? "border-y-blue-500 border-r-blue-500 bg-blue-50/50 dark:bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.2)]" : "border-slate-100 dark:bg-slate-900/40 dark:border-white/5 group-hover:border-y-blue-500 group-hover:border-r-blue-500"}`}
                      >
                        <div className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 absolute inset-0 px-1 gap-2">
                          {isLecturer ? (
                            <>
                              {session.userId === user?.id &&
                              !hasStarted(session) &&
                              session.status !== "CANCELLED" ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedBookingForShare(session);
                                    setShareModalOpen(true);
                                  }}
                                  className="table-action-btn !w-auto !flex-initial px-3 bg-blue-600 text-[9px] font-black uppercase tracking-widest text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20"
                                >
                                  {session.assignedBatch ? t("update", "Update") : t("share", "Share")}
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSession(session);
                                  }}
                                  className="table-action-btn !w-auto !flex-initial px-3 bg-blue-600 text-[9px] font-black uppercase tracking-widest text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20"
                                >
                                  {t("details", "Details")}
                                </button>
                              )}
                              {(session.status === "APPROVED" || session.isUpdated) && session.status !== "CANCELLED" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLecturerAttendanceSession(session);
                                    setLecturerAttendanceModalOpen(true);
                                    setAttendanceSearchQuery("");
                                    setAttendancePage(0);
                                  }}
                                  className="table-action-btn !w-auto !flex-initial px-3 bg-violet-600 text-[9px] font-black uppercase tracking-widest text-white hover:bg-violet-500 shadow-lg shadow-violet-600/20"
                                >
                                  {t("attendance", "Attendance")}
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSession(session);
                                }}
                                className="table-action-btn !w-auto !flex-initial px-3 bg-blue-600 text-[9px] font-black uppercase tracking-widest text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20"
                              >
                                {t("details", "Details")}
                              </button>
                                 {isUser && (session.status === "APPROVED" || session.isUpdated) && session.status !== "CANCELLED" && isAttendanceOpen(session) && (
                                   <button
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       
                                       // Local, instant, zero-latency verification check
                                       if (attendedBookingIds.has(session.id)) {
                                         showAlert("info", t("attendance_already_recorded", "Attendance has already been recorded for this lecture session"));
                                         return;
                                       }
 
                                       // Open instantly with zero latency
                                       setStudentAttendanceSession(session);
                                       setStudentAttendanceModalOpen(true);
                                       setAttendanceScanStep("view_qr");
 
                                       // Run check and refresh in the background
                                       (async () => {
                                         try {
                                           const checkRes = await api.get(`/attendance/check/${session.id}`);
                                           if (checkRes.data && checkRes.data.attended) {
                                             setStudentAttendanceModalOpen(false);
                                             setStudentAttendanceSession(null);
                                             // Force refetch local cache
                                             queryClient.invalidateQueries(["my-attendances"]);
                                             showAlert("info", t("attendance_already_recorded", "Attendance has already been recorded for this lecture session"));
                                             return;
                                           }
 
                                           const res = await api.post(`/bookings/${session.id}/refresh-qr`);
                                           setStudentAttendanceSession(res.data);
                                           queryClient.invalidateQueries(["my-sessions"]);
                                         } catch (err) {
                                           console.error("Background check/refresh failed:", err);
                                         }
                                       })();
                                     }}
                                   className="table-action-btn !w-auto !flex-initial px-3 bg-violet-600 text-[9px] font-black uppercase tracking-widest text-white hover:bg-violet-500 shadow-lg shadow-violet-600/20"
                                 >
                                   {t("attendance", "Attendance")}
                                 </button>
                               )}
                              {isUser && (session.status === "APPROVED" || session.isUpdated) && session.status !== "CANCELLED" && hasFinished(session) && (
                                <button
                                  disabled={!!session.rating}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (session.rating) return;
                                    setRatingSession(session);
                                    setRatingValue(0);
                                    setRatingModalOpen(true);
                                  }}
                                  className={`p-1.5 rounded-xl border flex items-center justify-center ${
                                    session.rating
                                      ? "bg-slate-50 border-slate-100 dark:bg-slate-800 dark:border-white/5 cursor-default pointer-events-none"
                                      : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-amber-50 hover:text-amber-500 hover:border-amber-200 dark:bg-white/5 dark:border-white/10 dark:text-slate-400 dark:hover:bg-amber-900/20 dark:hover:text-amber-400 transition-all hover:scale-105 active:scale-95"
                                  }`}
                                  title={session.rating ? t("rated_stars", "Rated {{count}} Stars", { count: session.rating }) : t("rate_this_lecture", "Rate this Lecture")}
                                >
                                  <Star className={`h-4 w-4 ${session.rating ? "text-amber-500 fill-amber-500" : ""}`} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                        <div className="group-hover:hidden flex items-center justify-center gap-1 text-slate-400 absolute inset-0 transition-opacity duration-300 px-1">
                          <span className="text-[9px] font-bold uppercase tracking-widest">
                            {t("actions", "Actions")}
                          </span>
                          <MoreVertical className="h-4 w-4" />
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {isLoading && (
            <div className="p-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                {t("loading_schedule", "Loading your schedule...")}
              </p>
            </div>
          )}

          {!isLoading && filteredSessions.length === 0 && (
            <div className="p-20 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 dark:bg-white/5 mb-6">
                <Calendar className="h-10 w-10 text-slate-200" />
              </div>
              <h4 className="text-xl font-black text-slate-900 dark:text-white mb-2">
                {t("no_matching_lectures", "No Matching Lectures")}
              </h4>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                {t("no_matching_lectures_desc", "We couldn't find any lectures matching your current filters.")}
              </p>
            </div>
          )}
        </section>
      </div>
      {/* Detail Modal */}
      {selectedSession && (
        <Modal
          isOpen={!!selectedSession}
          onClose={() => setSelectedSession(null)}
          title={selectedSession.purpose}
          subtitle={
            primaryRole === "LECTURER"
              ? t("session_details", "Session Details")
              : t("by_lecturer", "By Dr. {{name}}", { name: selectedSession.userName })
          }
          maxWidth="max-w-2xl"
        >
          <div className="space-y-6 py-4">
            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-2 mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <Calendar className="h-3 w-3" /> {t("date", "Date")}
                </div>
                <p className="text-sm font-black text-slate-700 dark:text-slate-200">
                  {formatDate(selectedSession.bookingDate, dateLocale)}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-2 mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <Clock className="h-3 w-3" /> {t("duration", "Duration")}
                </div>
                <p className="text-sm font-black text-slate-700 dark:text-slate-200">
                  {formatTime(selectedSession.startTime)} -{" "}
                  {formatTime(selectedSession.endTime)}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-2 mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <MapPin className="h-3 w-3" /> {t("location", "Location")}
                </div>
                <p className="text-sm font-black text-slate-700 dark:text-slate-200">
                  {getLocalizedLocation(selectedSession.resourceName)}
                  {(selectedSession.campusLocation || resources.find(r => r.id === selectedSession.resourceId)?.location) && 
                    ` - ${getLocalizedLocation(selectedSession.campusLocation || resources.find(r => r.id === selectedSession.resourceId)?.location)}`}
                </p>
              </div>
              {primaryRole !== "LECTURER" && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                  <div className="flex items-center gap-2 mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <UserIcon className="h-3 w-3" /> {t("lecturer", "Lecturer")}
                  </div>
                  <p className="text-sm font-black text-slate-700 dark:text-slate-200">
                    {t("dr_name", "Dr. {{name}}", { name: selectedSession.userName })}
                  </p>
                </div>
              )}
            </div>

            {/* Session Details / Instructions */}
            {selectedSession.sessionDetails && (
              <div className="p-6 rounded-2xl bg-blue-50/30 border border-blue-100 dark:bg-blue-500/5 dark:border-blue-500/20">
                <h4 className="text-[11px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                  <Info className="h-4 w-4" /> {t("lecturer_instructions", "Lecturer Instructions & Details")}
                </h4>
                <div
                  className="prose prose-sm dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 font-medium"
                  dangerouslySetInnerHTML={{
                    __html: selectedSession.sessionDetails,
                  }}
                />
              </div>
            )}

            {/* Materials Section */}
            <div className="space-y-4">
              <h4 className="text-[11px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 flex items-center gap-2">
                <FileText className="h-4 w-4" /> {t("lecture_materials", "Lecture Materials & Resources")}
              </h4>

              <div className="grid gap-3">
                {selectedSession.lectureMaterials &&
                selectedSession.lectureMaterials.length > 0 ? (
                  selectedSession.lectureMaterials.map((path, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-100 shadow-sm dark:bg-slate-800/50 dark:border-white/5 group hover:border-blue-500 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate max-w-[250px]">
                            {path.split("/").pop()}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {t("document_format", "{{ext}} Document", { ext: path.split(".").pop().toUpperCase() })}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownload(path)}
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white transition-all dark:bg-white/5 dark:text-slate-400 dark:hover:bg-blue-600"
                        title={t("download_material", "Download Material")}
                      >
                        <Download className="h-5 w-5" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="p-10 text-center rounded-2xl bg-slate-50 border border-slate-100 dark:bg-white/5 dark:border-white/5">
                    <p className="text-sm font-bold text-slate-400 italic">
                      {t("no_materials_uploaded", "No materials have been uploaded for this session yet.")}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Share Action for Lecturers */}
            {primaryRole === "LECTURER" &&
              selectedSession.userId === user?.id &&
              !hasStarted(selectedSession) &&
              selectedSession.status !== "CANCELLED" && (
                <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                  <button
                    onClick={() => setShareModalOpen(true)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                  >
                    <Send className="h-4 w-4" />
                    {selectedSession.assignedBatch ? t("update", "Update") : t("share", "Share")}
                  </button>
                </div>
              )}
          </div>
        </Modal>
      )}

      <ShareSessionModal
        isOpen={shareModalOpen}
        onClose={() => {
          setShareModalOpen(false);
          setSelectedBookingForShare(null);
        }}
        booking={selectedBookingForShare || selectedSession}
        onSuccess={() => {
          refetch();
          setSelectedSession(null);
        }}
      />

      {/* Lecture Rating Modal */}
      <Modal
        isOpen={ratingModalOpen && !!ratingSession}
        onClose={() => setRatingModalOpen(false)}
        title={t("rate_lecture_lecturer", "Rate Lecture & Lecturer")}
        subtitle={t("rate_session_subtitle", 'Rate the session "{{purpose}}" by Dr. {{name}}', { purpose: ratingSession?.purpose, name: ratingSession?.userName })}
        maxWidth="max-w-md"
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="rounded-xl px-6 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
              onClick={() => setRatingModalOpen(false)}
            >
              {t("cancel", "Cancel")}
            </button>
            <button
              type="button"
              onClick={handleRateSession}
              disabled={ratingValue === 0}
              className="rounded-xl bg-amber-500 px-6 py-3 text-sm font-black text-white shadow-xl shadow-amber-500/20 transition-all hover:bg-amber-400 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t("submit_rating", "Submit Rating")}
            </button>
          </div>
        }
      >
        <div className="flex flex-col items-center justify-center py-4 space-y-4">
          <div className="h-16 w-16 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-xl shadow-md">
            <BookOpen className="h-8 w-8" />
          </div>
          <h4 className="text-lg font-black text-slate-900 dark:text-white text-center">
            {ratingSession?.purpose}
          </h4>
          <p className="text-xs font-medium text-slate-500 text-center max-w-[250px]">
            {t("satisfaction_question", "How satisfied are you with Dr. {{name}}'s lecture session?", { name: ratingSession?.userName })}
          </p>
          <div className="flex items-center gap-1 mt-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRatingValue(star)}
                className="p-1 transition-transform hover:scale-110 active:scale-95"
              >
                <Star
                  className={`h-8 w-8 ${
                    ratingValue >= star
                      ? "text-amber-400 fill-amber-400"
                      : "text-slate-200 dark:text-slate-700 hover:text-amber-200 dark:hover:text-amber-900/50"
                  } transition-colors`}
                />
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* Student Attendance Modal */}
      {studentAttendanceSession && (
        <Modal
          isOpen={studentAttendanceModalOpen}
          onClose={() => {
            setStudentAttendanceModalOpen(false);
            setStudentAttendanceSession(null);
          }}
          title={studentAttendanceSession.purpose}
          subtitle={t("by_lecturer", "By Dr. {{name}}", { name: studentAttendanceSession.userName })}
          maxWidth="max-w-md"
          footer={
            attendanceScanStep === "form" && (
              <div className="flex justify-end gap-3 w-full">
                <button
                  type="button"
                  className="rounded-xl px-6 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                  onClick={() => {
                    setStudentAttendanceModalOpen(false);
                    setStudentAttendanceSession(null);
                  }}
                >
                  {t("cancel", "Cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleSubmitAttendance}
                  disabled={isSubmittingAttendance}
                  className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-xl shadow-blue-600/20 transition-all hover:bg-blue-500 active:scale-95 disabled:opacity-50"
                >
                  {isSubmittingAttendance ? t("submitting", "Submitting...") : t("submit_attendance", "Submit Attendance")}
                </button>
              </div>
            )
          }
        >
          {attendanceScanStep === "view_qr" ? (
            <div className="flex flex-col items-center justify-center py-6 space-y-4">
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm dark:bg-slate-800 dark:border-white/5">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin + "/attendance-checkin/" + studentAttendanceSession.qrCode)}`}
                  alt="Attendance QR Code"
                  className="w-48 h-48 block mx-auto"
                />
              </div>

              {/* QR Actions: Refresh, Copy, Download */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={isRefreshingQr}
                  onClick={async () => {
                    setIsRefreshingQr(true);
                    try {
                      const res = await api.post(`/bookings/${studentAttendanceSession.id}/refresh-qr`);
                      setStudentAttendanceSession(res.data);
                      queryClient.invalidateQueries(["my-sessions"]);
                    } catch (err) {
                      console.error("Error refreshing QR:", err);
                      showAlert("error", t("err_failed_refresh_qr", "Failed to refresh QR Code."));
                    } finally {
                      setIsRefreshingQr(false);
                    }
                  }}
                  className="inline-flex items-center justify-center p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-400 transition-all active:scale-95 shadow-sm disabled:opacity-50"
                  title={t("regenerate_qr", "Regenerate QR Code")}
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshingQr ? "animate-spin text-blue-500" : ""}`} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const checkinUrl = window.location.origin + "/attendance-checkin/" + studentAttendanceSession.qrCode;
                    navigator.clipboard.writeText(checkinUrl);
                    showAlert("success", t("checkin_link_copied", "Check-in link copied to clipboard!"));
                  }}
                  className="inline-flex items-center justify-center p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-400 transition-all active:scale-95 shadow-sm"
                  title={t("copy_link", "Copy Link")}
                >
                  <Copy className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const canvas = document.createElement("canvas");
                      const ctx = canvas.getContext("2d");
                      canvas.width = 400;
                      canvas.height = 480;

                      // Fill background
                      ctx.fillStyle = "#ffffff";
                      ctx.fillRect(0, 0, canvas.width, canvas.height);

                      // Helper function to wrap text
                      function wrapText(context, text, x, y, maxWidth, lineHeight) {
                        const words = text.split(' ');
                        let line = '';
                        let currentY = y;
                        for (let n = 0; n < words.length; n++) {
                          let testLine = line + words[n] + ' ';
                          let metrics = context.measureText(testLine);
                          let testWidth = metrics.width;
                          if (testWidth > maxWidth && n > 0) {
                            context.fillText(line, x, currentY);
                            line = words[n] + ' ';
                            currentY += lineHeight;
                          } else {
                            line = testLine;
                          }
                        }
                        context.fillText(line, x, currentY);
                        return currentY;
                      }

                      // Draw Lecture Title
                      ctx.fillStyle = "#1e293b";
                      ctx.font = "bold 15px sans-serif";
                      ctx.textAlign = "center";
                      const title = studentAttendanceSession.purpose;
                      let nextY = wrapText(ctx, title, 200, 45, 340, 20);

                      // Draw Lecturer Name
                      ctx.fillStyle = "#64748b";
                      ctx.font = "semibold 13px sans-serif";
                      const lecturer = "Dr. " + studentAttendanceSession.userName;
                      ctx.fillText(lecturer, 200, nextY + 22);

                      // Draw QR Code Image
                      const qrImg = new Image();
                      qrImg.crossOrigin = "anonymous";
                      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(window.location.origin + "/attendance-checkin/" + studentAttendanceSession.qrCode)}`;
                      qrImg.src = qrUrl;

                      qrImg.onload = () => {
                        ctx.drawImage(qrImg, 50, nextY + 45, 300, 300);
                        canvas.toBlob((blob) => {
                          const blobUrl = window.URL.createObjectURL(blob);
                          const link = document.createElement("a");
                          link.href = blobUrl;
                          link.download = `attendance-qr-${studentAttendanceSession.purpose.replace(/\s+/g, "-").toLowerCase()}.png`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          window.URL.revokeObjectURL(blobUrl);
                        }, "image/png");
                      };
                    } catch (err) {
                      console.error("Error downloading QR:", err);
                      showAlert("error", t("err_failed_download_qr", "Failed to download QR Code."));
                    }
                  }}
                  className="inline-flex items-center justify-center p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-400 transition-all active:scale-95 shadow-sm"
                  title={t("download_image", "Download Image")}
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>



              <p className="text-xs font-semibold text-slate-500 text-center max-w-[280px]">
                {t("scan_qr_desc", "Scan this QR Code to record your attendance for this session")}
              </p>
            </div>
          ) : (
            <div className="py-4 space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {t("lecture_title", "Lecture Title")}
                </label>
                <input
                  type="text"
                  className="input-field bg-slate-50/50 cursor-default dark:bg-slate-900/50"
                  value={studentAttendanceSession.purpose}
                  readOnly
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {t("session_date", "Session Date")}
                  </label>
                  <input
                    type="text"
                    className="input-field bg-slate-50/50 cursor-default dark:bg-slate-900/50"
                    value={formatDate(studentAttendanceSession.bookingDate, dateLocale)}
                    readOnly
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {t("session_time", "Session Time")}
                  </label>
                  <input
                    type="text"
                    className="input-field bg-slate-50/50 cursor-default dark:bg-slate-900/50"
                    value={`${formatTime(studentAttendanceSession.startTime)} - ${formatTime(studentAttendanceSession.endTime)}`}
                    readOnly
                  />
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Lecturer Attendance Summary Modal */}
      {lecturerAttendanceSession && (
        <Modal
          isOpen={lecturerAttendanceModalOpen}
          onClose={() => {
            setLecturerAttendanceModalOpen(false);
            setLecturerAttendanceSession(null);
          }}
          title={t("attendance_title", "Attendance: {{purpose}}", { purpose: lecturerAttendanceSession.purpose })}
          subtitle={t("batch_subtitle", "Batch: {{batch}}", { batch: lecturerAttendanceSession.assignedBatch || t("general", "General") })}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-6 py-2 text-left">
            {/* Stat Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 dark:bg-blue-950/20 dark:border-blue-500/20 shadow-sm text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">
                  {t("total_shared_students", "Total Shared Students")}
                </p>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  {attendanceSummary.totalSharedStudents}
                </h3>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-500/20 shadow-sm text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">
                  {t("attended_students", "Attended Students")}
                </p>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  {attendanceSummary.attendedStudents}
                </h3>
              </div>
              <div className="p-4 rounded-2xl bg-purple-50 border border-purple-100 dark:bg-purple-950/20 dark:border-purple-500/20 shadow-sm text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">
                  {t("attendance_percentage", "Attendance Percentage")}
                </p>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  {attendanceSummary.attendancePercentage}%
                </h3>
              </div>
            </div>

            {/* Table Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={t("search_student_placeholder", "Search by student name or email...")}
                  className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-xs outline-none bg-slate-50/50 dark:bg-slate-900/50 dark:border-white/5 dark:text-white input-field"
                  value={attendanceSearchQuery}
                  onChange={(e) => {
                     setAttendanceSearchQuery(e.target.value);
                     setAttendancePage(0);
                  }}
                />
              </div>
              <button
                onClick={() => generateAttendancePDF(lecturerAttendanceSession, attendanceList, attendanceSummary)}
                disabled={attendanceList.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 dark:bg-white/5 border-2 border-transparent px-4 py-2.5 text-[12px] font-bold text-slate-600 dark:text-slate-400 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white shadow-sm active:scale-95 disabled:opacity-50 transition-all"
              >
                <Download className="h-4 w-4" />
                {t("download_pdf", "Download PDF")}
              </button>
            </div>

            {/* Attendance Table */}
            <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-900/40 dark:border-white/5 p-4">
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-1">
                  <thead>
                    <tr className="text-left">
                      <th
                        onClick={() => {
                          setAttendanceSortConfig(prev => ({
                            key: "studentName",
                            direction: prev.key === "studentName" && prev.direction === "asc" ? "desc" : "asc"
                          }));
                        }}
                        className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-slate-600 dark:hover:text-white"
                      >
                        {t("name", "Name")} {attendanceSortConfig.key === "studentName" && (attendanceSortConfig.direction === "asc" ? "▲" : "▼")}
                      </th>
                      <th
                        onClick={() => {
                          setAttendanceSortConfig(prev => ({
                            key: "studentEmail",
                            direction: prev.key === "studentEmail" && prev.direction === "asc" ? "desc" : "asc"
                          }));
                        }}
                        className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-slate-600 dark:hover:text-white"
                      >
                        {t("email", "Email")} {attendanceSortConfig.key === "studentEmail" && (attendanceSortConfig.direction === "asc" ? "▲" : "▼")}
                      </th>
                      <th
                        onClick={() => {
                          setAttendanceSortConfig(prev => ({
                            key: "submittedDate",
                            direction: prev.key === "submittedDate" && prev.direction === "asc" ? "desc" : "asc"
                          }));
                        }}
                        className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-slate-600 dark:hover:text-white"
                      >
                        {t("date", "Date")} {attendanceSortConfig.key === "submittedDate" && (attendanceSortConfig.direction === "asc" ? "▲" : "▼")}
                      </th>
                      <th
                        onClick={() => {
                          setAttendanceSortConfig(prev => ({
                            key: "submittedTime",
                            direction: prev.key === "submittedTime" && prev.direction === "asc" ? "desc" : "asc"
                          }));
                        }}
                        className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-slate-600 dark:hover:text-white"
                      >
                        {t("time", "Time")} {attendanceSortConfig.key === "submittedTime" && (attendanceSortConfig.direction === "asc" ? "▲" : "▼")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filtered = attendanceList.filter(record =>
                        record.studentName.toLowerCase().includes(attendanceSearchQuery.toLowerCase()) ||
                        record.studentEmail.toLowerCase().includes(attendanceSearchQuery.toLowerCase())
                      );
                      const sorted = [...filtered].sort((a, b) => {
                        let valA = a[attendanceSortConfig.key] || "";
                        let valB = b[attendanceSortConfig.key] || "";
                        if (typeof valA === 'string') valA = valA.toLowerCase();
                        if (typeof valB === 'string') valB = valB.toLowerCase();
                        if (valA < valB) return attendanceSortConfig.direction === "asc" ? -1 : 1;
                        if (valA > valB) return attendanceSortConfig.direction === "asc" ? 1 : -1;
                        return 0;
                      });
                      const start = attendancePage * attendancePageSize;
                      const paginated = sorted.slice(start, start + attendancePageSize);
                      const totalPages = Math.ceil(sorted.length / attendancePageSize);

                      return (
                        <>
                          {paginated.length > 0 ? (
                            paginated.map((rec) => (
                              <tr key={rec.attendanceId} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                <td className="px-4 py-2 border-y border-l rounded-l-lg border-slate-100 dark:border-white/5 text-xs font-bold text-slate-700 dark:text-slate-200">
                                  {rec.studentName}
                                </td>
                                <td className="px-4 py-2 border-y border-slate-100 dark:border-white/5 text-xs text-slate-500 dark:text-slate-400">
                                  {rec.studentEmail}
                                </td>
                                <td className="px-4 py-2 border-y border-slate-100 dark:border-white/5 text-xs text-slate-600 dark:text-slate-300">
                                  {formatDate(rec.submittedDate, dateLocale)}
                                </td>
                                <td className="px-4 py-2 border-y border-r rounded-r-lg border-slate-100 dark:border-white/5 text-xs text-slate-600 dark:text-slate-300">
                                  {formatTime(rec.submittedTime)}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4} className="px-4 py-8 text-center text-xs text-slate-400 font-bold italic">
                                {t("no_attendance_records", "No attendance records recorded yet.")}
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {(() => {
                const filtered = attendanceList.filter(record =>
                  record.studentName.toLowerCase().includes(attendanceSearchQuery.toLowerCase()) ||
                  record.studentEmail.toLowerCase().includes(attendanceSearchQuery.toLowerCase())
                );
                const totalPages = Math.ceil(filtered.length / attendancePageSize);
                if (totalPages <= 1) return null;
                return (
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-white/5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {t("page_of", "Page {{current}} of {{total}}", { current: attendancePage + 1, total: totalPages })}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAttendancePage(p => Math.max(0, p - 1))}
                        disabled={attendancePage === 0}
                        className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-slate-50 dark:bg-white/5 border rounded-lg text-slate-600 dark:text-slate-400 disabled:opacity-50 active:scale-95 transition-all"
                      >
                        {t("prev", "Prev")}
                      </button>
                      <button
                        onClick={() => setAttendancePage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={attendancePage === totalPages - 1}
                        className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-slate-50 dark:bg-white/5 border rounded-lg text-slate-600 dark:text-slate-400 disabled:opacity-50 active:scale-95 transition-all"
                      >
                        {t("next", "Next")}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
      </Modal>) }
    </DashboardLayout>
  );
};

export default MyLecturesPage;
