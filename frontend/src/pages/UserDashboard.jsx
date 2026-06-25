import React, { useState, useEffect, useMemo } from "react";
import { BellRing, CalendarCheck2, LayoutGrid, Wrench, ArrowRight, Clock, MapPin, ChevronRight, Activity, CheckCircle2, AlertCircle, Calendar, TrendingUp, Star, User as UserIcon, Building2, GraduationCap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth, normalizeRoles } from "../context/AuthContext";
import { useSearch } from "../context/SearchContext";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import { getRoleAccent, getSidebarItems } from "../utils/dashboardConfig";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { DashboardSkeleton } from "../components/Skeleton";
import Modal from "../components/Modal";
import AnimatedProgressBar from "../components/AnimatedProgressBar";
import CountdownTimer from "../components/CountdownTimer";
import LectureSessionCard from "../components/LectureSessionCard";
import DashboardCalendar from "../components/DashboardCalendar";
import { BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";

const statusStyles = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-500/20",
  APPROVED: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-500/20",
  REJECTED: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-500/20",
  CANCELLED: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-white/10",
};

const stripHtml = (html) => {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
};

const UserDashboard = () => {
  const { user, logout } = useAuth();
  const { searchQuery } = useSearch();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith("si") ? "si-LK" : i18n.language?.startsWith("ta") ? "ta-LK" : "en-US";

  const [currentTime, setCurrentTime] = useState(new Date());
  const [calendarRange, setCalendarRange] = useState({ startDate: "", endDate: "" });
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const isStudent = useMemo(() => {
    return user && normalizeRoles(user.roles).includes("USER");
  }, [user]);

  const isProfileComplete = useMemo(() => {
    if (!isStudent) return true;
    return !!(
      user?.year &&
      user?.semester &&
      user?.faculty &&
      user.year.trim() !== "" &&
      user.semester.trim() !== "" &&
      user.faculty.trim() !== ""
    );
  }, [user, isStudent]);

  useEffect(() => {
    if (isStudent && !isProfileComplete) {
      setIsProfileModalOpen(true);
    }
  }, [isStudent, isProfileComplete]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const accent = getRoleAccent("USER");
  const sidebarItems = useMemo(() => getSidebarItems("USER"), []);

  // Fetch bookings for calendar (visible range only)
  const { data: calendarBookings = [], isLoading: isLoadingCalBookings } = useQuery({
    queryKey: ["user-calendar-bookings", calendarRange.startDate, calendarRange.endDate],
    queryFn: async () => {
      if (!calendarRange.startDate || !calendarRange.endDate) return [];
      const res = await api.get("/bookings/mine", {
        params: {
          page: 0,
          size: 100,
          startDate: calendarRange.startDate,
          endDate: calendarRange.endDate,
        },
      });
      return res.data?.content || [];
    },
    enabled: !!user && !!calendarRange.startDate && !!calendarRange.endDate,
    refetchInterval: 5000,
  });

  // Fetch sessions for calendar (visible range only)
  const { data: calendarSessions = [], isLoading: isLoadingCalSessions } = useQuery({
    queryKey: ["user-calendar-sessions", calendarRange.startDate, calendarRange.endDate, user?.year, user?.semester],
    queryFn: async () => {
      if (!calendarRange.startDate || !calendarRange.endDate) return [];
      const res = await api.get("/bookings/sessions", {
        params: {
          year: user?.year || "Not specified",
          semester: user?.semester || "Not specified",
          startDate: calendarRange.startDate,
          endDate: calendarRange.endDate,
        },
      });
      return res.data || [];
    },
    enabled: !!user && !!calendarRange.startDate && !!calendarRange.endDate && isProfileComplete,
    refetchInterval: 5000,
  });

  const calendarEvents = useMemo(() => {
    return [...calendarBookings, ...calendarSessions];
  }, [calendarBookings, calendarSessions]);

  // Recent Tickets for Tracker
  const { data: myTickets = [], isLoading: isLoadingTickets } = useQuery({
    queryKey: ["user-tickets-summary"],
    queryFn: async () => {
      const res = await api.get("/tickets/mine", {
        params: { page: 0, size: 5 },
      });
      const allTickets = res.data?.content || [];
      // Filter out rejected and resolved tickets for the active tracker
      return allTickets.filter(t => t.status !== "REJECTED" && t.status !== "CANCELLED");
    },
    enabled: !!user,
  });

  // Resources (needed for location info in upcoming bookings)
  const { data: resources = [] } = useQuery({
    queryKey: ["all-resources-summary"],
    queryFn: async () => {
      const res = await api.get("/resources", { params: { size: 100 } });
      return res.data?.content || [];
    },
  });

  // Fetch upcoming sessions for this student's batch
  const { data: batchSessions = [], isLoading: isLoadingSessions } = useQuery({
    queryKey: ["user-batch-sessions", user?.year, user?.semester],
    queryFn: async () => {
      const res = await api.get("/bookings/sessions", {
        params: {
          year: user?.year || "Not specified",
          semester: user?.semester || "Not specified"
        }
      });
      return res.data || [];
    },
    enabled: !!user && isProfileComplete,
  });

  const topSessions = useMemo(() => {
    return batchSessions
      .filter((session) => {
        try {
          let y, m, d, h = 0, min = 0;
          if (Array.isArray(session.bookingDate)) {
            [y, m, d] = session.bookingDate;
          } else if (typeof session.bookingDate === 'string') {
            [y, m, d] = session.bookingDate.split('-').map(Number);
          } else {
            return false;
          }

          if (Array.isArray(session.startTime)) {
            [h, min] = session.startTime;
          } else if (typeof session.startTime === 'string') {
            [h, min] = session.startTime.split(':').map(Number);
          }

          const sessionDateTime = new Date(y, m - 1, d, h, min, 0);
          return sessionDateTime > currentTime;
        } catch (e) {
          return false;
        }
      })
      .map((session) => {
        // Fallback for location info if not in session object (for older data)
        if (!session.campusLocation && resources.length > 0) {
          const resInfo = resources.find((r) => r.id === session.resourceId);
          if (resInfo) {
            return { ...session, campusLocation: resInfo.location };
          }
        }
        return session;
      })
      .slice(0, 5);
  }, [batchSessions, resources, currentTime]);

  // Real-time Campus Status
  const { data: facilityStatus = { available: 0, inUse: 0, maintenance: 0 } } = useQuery({
    queryKey: ["campus-realtime-status"],
    queryFn: async () => {
      const res = await api.get("/bookings/campus-status");
      return res.data || { available: 0, inUse: 0, maintenance: 0 };
    },
    refetchInterval: 30000,
  });

  // Announcements query for Notice Board Widget
  const { data: notices = [], isLoading: isLoadingNotices } = useQuery({
    queryKey: ["user-announcements-summary"],
    queryFn: async () => {
      const res = await api.get("/announcements");
      return res.data || [];
    },
    enabled: !!user,
  });

  // Fetch user's bookings for Active Bookings count
  const { data: myBookings = [] } = useQuery({
    queryKey: ["user-bookings-summary-stats"],
    queryFn: async () => {
      const res = await api.get("/bookings/mine", { params: { page: 0, size: 100 } });
      return res.data?.content || [];
    },
    enabled: !!user,
  });

  const totalBookingsCount = myBookings.length;

  const allowedFacilitiesCount = useMemo(() => {
    return resources.filter(r => r.type === "Sport Arena" || r.type === "Study Rooms").length;
  }, [resources]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return t("greeting_morning");
    if (hour >= 12 && hour < 17) return t("greeting_afternoon");
    if (hour >= 17 && hour < 21) return t("greeting_evening");
    return t("greeting_night");
  };

  if (!user) return null;

  if (isLoadingTickets) {
    return (
      <DashboardLayout
        user={user}
        logout={logout}
        title={t("dashboard")}
        items={sidebarItems}
        displayRole="USER"
        {...accent}
      >
        <DashboardSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      user={user}
      logout={logout}
      title={t("dashboard")}
      items={sidebarItems}
      displayRole="USER"
      {...accent}
    >
      {/* Welcome Hero Section */}
      <section className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] p-6 sm:p-8 text-white shadow-2xl mb-6 border border-white/5">
        <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-blue-600/30 to-transparent"></div>
        <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-blue-500/20 blur-[100px]"></div>

        {/* Compact Clock Overlay */}
        <div className="absolute top-4 right-6 z-20 hidden md:block">
          <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 shadow-sm backdrop-blur-md flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3 text-blue-400" />
              <span className="text-sm font-black text-white tabular-nums tracking-tight">
                {currentTime.toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
              </span>
            </div>
            <div className="flex items-center gap-1.5 opacity-80">
              <Calendar className="h-2.5 w-2.5 text-slate-400" />
              <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">
                {currentTime.toLocaleDateString(dateLocale, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <h2 className="text-3xl font-black sm:text-4xl tracking-tight leading-tight mb-3">
            {getGreeting()}, <br className="sm:hidden" />
            <span className="text-blue-400">{user.name}</span>.
          </h2>
          <p className="mt-4 text-base font-medium text-slate-300 leading-relaxed max-w-2xl">
            {t("user_dashboard_hero_subtitle")}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={() => navigate("/resources")}
              className="group flex items-center gap-3 rounded-lg bg-blue-600 px-6 py-2 text-xs font-black text-white transition-all hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-600/30 active:scale-95"
            >
              <CalendarCheck2 className="h-4 w-4" />
              {t("book_facility")}
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              onClick={() => navigate("/tickets")}
              className="group flex items-center gap-3 rounded-lg bg-white/10 backdrop-blur-md border border-white/10 px-6 py-2 text-xs font-black text-white transition-all hover:bg-white/20 active:scale-95"
            >
              <Wrench className="h-4 w-4" />
              {t("report_issue")}
            </button>
          </div>
        </div>
      </section>

      {/* Stats Quick Links */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
        {[
          {
            title: t("available_facilities"),
            count: allowedFacilitiesCount,
            icon: LayoutGrid,
            color: "from-emerald-500 to-teal-600",
            bg: "bg-emerald-50 dark:bg-emerald-900/10",
            border: "border-emerald-100 dark:border-emerald-500/20",
          },
          {
            title: t("upcoming_lectures"),
            count: topSessions.length,
            icon: BookOpen,
            color: "from-purple-500 to-pink-600",
            bg: "bg-purple-50 dark:bg-purple-900/10",
            border: "border-purple-100 dark:border-purple-500/20",
          },
          {
            title: t("total_bookings"),
            count: totalBookingsCount,
            icon: CalendarCheck2,
            color: "from-blue-500 to-indigo-600",
            bg: "bg-blue-50 dark:bg-blue-900/10",
            border: "border-blue-100 dark:border-blue-500/20",
          },
        ].map((card, i) => (
          <article
            key={i}
            className={`group rounded-xl border ${card.border} ${card.bg} p-5 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-xl relative overflow-hidden`}
          >
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/40 dark:bg-white/5 blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-0.5">
                  {card.title}
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {card.count}
                  </h3>
                </div>
              </div>
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${card.color} text-white shadow-lg shadow-black/10 group-hover:-rotate-6 transition-transform duration-300`}
              >
                <card.icon className="h-5 w-5" />
              </div>
            </div>
          </article>
        ))}
      </section>

      {/* Main Dashboard Content Grid */}
      <section className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: My Day & Campus Status */}
        <div className="lg:col-span-2 space-y-6">
          {/* Calendar Widget */}
          <DashboardCalendar
            events={calendarEvents}
            isLoading={isLoadingCalBookings || isLoadingCalSessions}
            onMonthChange={(start, end) => setCalendarRange({ startDate: start, endDate: end })}
            userRole="USER"
          />

          {/* Upcoming Lectures Section */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-slate-900/50">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/10">
                  <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{t("upcoming_lectures")}</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{t("academic_schedule")}</p>
                </div>
              </div>
              <button
                onClick={() => navigate("/my-lectures")}
                className="text-xs font-black text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 uppercase tracking-widest transition-colors"
              >
                {t("view_more")}
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {topSessions.length > 0 ? (
                topSessions.map(session => (
                  <LectureSessionCard
                    key={session.id}
                    session={session}
                    onClick={() => navigate(`/my-lectures?highlight=${session.id}`)}
                  />
                ))
              ) : (
                <div className="py-10 text-center rounded-2xl bg-slate-50/50 border border-dashed border-slate-200 dark:bg-white/5 dark:border-white/10">
                  <p className="text-xs font-bold text-slate-400 italic">{t("no_upcoming_lectures")}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Notice Board & Ticket Tracker */}
        <div className="space-y-6">
          {/* Notice Board / Announcements Widget */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-slate-900/50 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-500/10">
                  <BellRing className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{t("notice_board")}</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{t("announcements")}</p>
                </div>
              </div>
              <button
                onClick={() => navigate("/announcements")}
                className="text-xs font-black text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 uppercase tracking-widest transition-colors"
              >
                {t("view_all")}
              </button>
            </div>

            <div className="flex-1 space-y-3">
              {isLoadingNotices ? (
                <div className="text-center py-6">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-rose-500 mx-auto"></div>
                </div>
              ) : notices.length > 0 ? (
                notices.slice(0, 3).map((notice) => (
                  <div
                    key={notice.id}
                    onClick={() => navigate(`/announcements?highlight=${notice.id}`)}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 dark:bg-white/5 dark:border-white/5 dark:hover:border-white/10 transition-all cursor-pointer hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                        notice.type === 'URGENT' 
                          ? 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-500/20' 
                          : notice.type === 'HOLIDAY'
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-500/20'
                          : 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-500/20'
                      }`}>
                        {t(notice.type.toLowerCase(), { defaultValue: notice.type })}
                      </span>
                      <span className="text-[8px] font-bold text-slate-400">
                        {notice.createdAt ? (() => {
                          const d = new Date(notice.createdAt);
                          const monthStr = t(`month_${d.getMonth()}`, { defaultValue: d.toLocaleString("en-US", { month: "short" }) });
                          const cleanMonth = monthStr.endsWith(".") ? monthStr.slice(0, -1) : monthStr;
                          return `${cleanMonth} ${d.getDate()}`;
                        })() : ''}
                      </span>
                    </div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white tracking-tight line-clamp-1 mb-1">
                      {notice.title}
                    </h4>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 line-clamp-2">
                      {stripHtml(notice.message)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-10 opacity-50">
                  <p className="text-xs font-bold text-slate-400 italic">{t("no_announcements")}</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-slate-900/50 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-500/10">
                  <Wrench className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{t("active_tickets")}</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{t("service_tracker")}</p>
                </div>
              </div>
              <button
                onClick={() => navigate("/tickets")}
                className="text-xs font-black text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 uppercase tracking-widest transition-colors"
              >
                {t("log")}
              </button>
            </div>

            <div className="flex-1 space-y-3">
              {myTickets.length > 0 ? myTickets.slice(0, 3).map((ticket) => (
                <div key={ticket.id} className="group p-4 rounded-xl bg-slate-50 border border-slate-100 dark:bg-white/5 dark:border-white/5 transition-all hover:shadow-lg">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white tracking-tight mb-1">{ticket.title}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">#{ticket.id.substring(0, 8)}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${statusStyles[ticket.status] || statusStyles.PENDING}`}>
                      {t(ticket.status.toLowerCase(), { defaultValue: ticket.status.replace('_', ' ') })}
                    </span>
                  </div>

                  {/* Status Progress Bar */}
                  <AnimatedProgressBar
                    targetWidth={ticket.status === 'RESOLVED' ? '100%' : ticket.status === 'IN_PROGRESS' ? '50%' : '10%'}
                    colorClass={ticket.status === 'RESOLVED' ? 'bg-emerald-500' : ticket.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-amber-500'}
                    label={true}
                  />
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                  <Wrench className="h-12 w-12 text-slate-300 mb-4" />
                  <p className="text-sm font-bold text-slate-400 tracking-tight">{t("no_active_tickets")}</p>
                </div>
              )}
            </div>

            <button
              onClick={() => navigate("/tickets")}
              className="mt-8 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-black text-white transition-all hover:bg-slate-800 active:scale-95 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              {t("report_new_issue")}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <Modal
        isOpen={isProfileModalOpen}
        onClose={() => {}}
        title={t("first_time_profile_alert_title")}
        maxWidth="max-w-md"
        cornerClose={false}
        showCloseButton={false}
      >
        <div className="flex flex-col items-center text-center p-1 sm:p-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white mb-6 shadow-lg shadow-indigo-500/25 transform hover:scale-105 transition-all duration-300">
            <GraduationCap className="h-8 w-8" />
          </div>
          
          <p 
            className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed mb-6 px-1"
            dangerouslySetInnerHTML={{ __html: t("first_time_profile_alert_msg") }}
          />

          <button
            onClick={() => setIsProfileModalOpen(false)}
            className="w-full inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-xs font-black text-white transition-all hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-600/25 active:scale-95"
          >
            {t("first_time_profile_alert_btn")}
          </button>
        </div>
      </Modal>
    </DashboardLayout>
  );
};

export default UserDashboard;
