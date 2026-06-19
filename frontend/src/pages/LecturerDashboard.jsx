import React, { useState, useEffect, useMemo } from "react";
import {
  BellRing,
  CalendarCheck2,
  LayoutGrid,
  Wrench,
  ArrowRight,
  Clock,
  MapPin,
  Activity,
  CheckCircle2,
  AlertCircle,
  Calendar,
  ClipboardList,
  BookOpen,
  PlusCircle,
  Zap
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSearch } from "../context/SearchContext";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import { getRoleAccent, getSidebarItems } from "../utils/dashboardConfig";
import { useQuery } from "@tanstack/react-query";
import { DashboardSkeleton } from "../components/Skeleton";
import AnimatedProgressBar from "../components/AnimatedProgressBar";
import CountdownTimer from "../components/CountdownTimer";
import DashboardCalendar from "../components/DashboardCalendar";
import { useTranslation } from "react-i18next";

const stripHtml = (html) => {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
};

const statusStyles = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-500/20",
  APPROVED: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-500/20",
  REJECTED: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-500/20",
  CANCELLED: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-white/10",
};

const LecturerDashboard = () => {
  const { user, logout } = useAuth();
  const { searchQuery } = useSearch();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith("si") ? "si-LK" : i18n.language?.startsWith("ta") ? "ta-LK" : "en-US";
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

  const [currentTime, setCurrentTime] = useState(new Date());
  const [calendarRange, setCalendarRange] = useState({ startDate: "", endDate: "" });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const accent = getRoleAccent("LECTURER");
  const sidebarItems = useMemo(() => getSidebarItems("LECTURER"), []);

  // Fetch lecturer bookings for calendar (visible range only)
  const { data: calendarBookings = [], isLoading: isLoadingCalBookings } = useQuery({
    queryKey: ["lecturer-calendar-bookings", calendarRange.startDate, calendarRange.endDate],
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

  // Fetch all bookings for the lecturer
  const { data: allBookings = [], isLoading: isLoadingBookings } = useQuery({
    queryKey: ["lecturer-all-bookings"],
    queryFn: async () => {
      const res = await api.get("/bookings/mine", {
        params: { page: 0, size: 50 },
      });
      return res.data?.content || [];
    },
    enabled: !!user,
  });

  // Filter Upcoming Schedule (Lectures)
  const upcomingLectures = useMemo(() => {
    return allBookings
      .filter(b => {
        const s = (b.status || "").toUpperCase();
        if (s !== "PENDING" && s !== "APPROVED") return false;

        try {
          let y, m, d, h, min;
          if (Array.isArray(b.bookingDate)) [y, m, d] = b.bookingDate;
          else[y, m, d] = b.bookingDate.split('-').map(Number);
          if (Array.isArray(b.startTime)) [h, min] = b.startTime;
          else[h, min] = b.startTime.split(':').map(Number);

          const bookingDateTime = new Date(y, m - 1, d, h, min, 0);
          return bookingDateTime > currentTime;
        } catch (e) {
          return false;
        }
      })
      .sort((a, b) => {
        const getTs = (bk) => {
          let y, m, d, h, min;
          if (Array.isArray(bk.bookingDate)) [y, m, d] = bk.bookingDate;
          else[y, m, d] = bk.bookingDate.split('-').map(Number);
          if (Array.isArray(bk.startTime)) [h, min] = bk.startTime;
          else[h, min] = bk.startTime.split(':').map(Number);
          return new Date(y, m - 1, d, h, min).getTime();
        };
        return getTs(a) - getTs(b);
      })
      .slice(0, 5);
  }, [allBookings, currentTime]);

  // Fetch Tickets/Incidents reported by lecturer
  const { data: myTickets = [], isLoading: isLoadingTickets } = useQuery({
    queryKey: ["lecturer-tickets"],
    queryFn: async () => {
      const res = await api.get("/tickets/mine", {
        params: { page: 0, size: 5 },
      });
      return res.data?.content || [];
    },
    enabled: !!user,
  });

  // Real-time Campus Status
  const { data: facilityStatus = { available: 0, inUse: 0, maintenance: 0 } } = useQuery({
    queryKey: ["campus-realtime-status"],
    queryFn: async () => {
      const res = await api.get("/bookings/campus-status");
      return res.data || { available: 0, inUse: 0, maintenance: 0 };
    },
    refetchInterval: 30000,
  });

  // Notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ["lecturer-notifications"],
    queryFn: async () => {
      const res = await api.get("/notifications", {
        params: { page: 0, size: 5 },
      });
      return res.data?.content || [];
    },
    enabled: !!user,
  });

  // Announcements query for Notice Board Widget
  const { data: notices = [], isLoading: isLoadingNotices } = useQuery({
    queryKey: ["lecturer-announcements-summary"],
    queryFn: async () => {
      const res = await api.get("/announcements");
      return res.data || [];
    },
    enabled: !!user,
  });

  // Resources for location info
  const { data: resources = [] } = useQuery({
    queryKey: ["all-resources-lecturer"],
    queryFn: async () => {
      const res = await api.get("/resources", { params: { size: 100 } });
      return res.data?.content || [];
    },
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return t("greeting_morning");
    if (hour >= 12 && hour < 17) return t("greeting_afternoon");
    if (hour >= 17 && hour < 21) return t("greeting_evening");
    return t("greeting_night");
  };

  if (!user) return null;

  if (isLoadingBookings || isLoadingTickets) {
    return (
      <DashboardLayout
        user={user}
        logout={logout}
        title={t("dashboard")}
        items={sidebarItems}
        displayRole="LECTURER"
        {...accent}
      >
        <DashboardSkeleton />
      </DashboardLayout>
    );
  }

  const activeBookingsCount = allBookings.filter(b => b.status === "APPROVED").length;
  const activeIncidentsCount = myTickets.filter(t => t.status !== "RESOLVED" && t.status !== "CANCELLED").length;

  return (
    <DashboardLayout
      user={user}
      logout={logout}
      title={t("dashboard")}
      items={sidebarItems}
      displayRole="LECTURER"
      {...accent}
    >
      {/* Welcome Hero Section */}
      <section className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#1E1B4B] via-[#2D1B69] to-[#1E1B4B] p-6 sm:p-8 text-white shadow-2xl mb-6 border border-white/5">
        <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-purple-600/30 to-transparent"></div>
        <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-indigo-500/20 blur-[100px]"></div>

        <div className="absolute top-4 right-6 z-20 hidden md:block">
          <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 shadow-sm backdrop-blur-md flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3 text-purple-400" />
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
            <span className="text-purple-400">{(user.honorific ? user.honorific + " " : "") + user.name}</span>.
          </h2>
          <p className="mt-4 text-base font-medium text-slate-300 leading-relaxed max-w-2xl">
            {t("lecturer_dashboard_hero_subtitle")}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={() => navigate("/resources")}
              className="group flex items-center gap-3 rounded-lg bg-purple-600 px-6 py-2 text-xs font-black text-white transition-all hover:bg-purple-500 hover:shadow-lg hover:shadow-purple-600/30 active:scale-95"
            >
              <CalendarCheck2 className="h-4 w-4" />
              {t("book_hall_lab")}
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

      {/* Quick Stats Grid */}
      <section className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-slate-900/50">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-500/10">
            <BookOpen className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t("upcoming_lectures")}</p>
            <h4 className="text-xl font-black text-slate-900 dark:text-white">{upcomingLectures.length} {t("sessions", { defaultValue: "Sessions" })}</h4>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-slate-900/50">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t("active_bookings")}</p>
            <h4 className="text-xl font-black text-slate-900 dark:text-white">{activeBookingsCount} {t("approved", { defaultValue: "Approved" })}</h4>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-slate-900/50">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-500/10">
            <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t("reported_incidents")}</p>
            <h4 className="text-xl font-black text-slate-900 dark:text-white">{activeIncidentsCount} {t("tickets", { defaultValue: "Tickets" })}</h4>
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <section className="grid gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Calendar Widget */}
          <DashboardCalendar
            events={calendarBookings}
            isLoading={isLoadingCalBookings}
            onMonthChange={(start, end) => setCalendarRange({ startDate: start, endDate: end })}
            userRole="LECTURER"
          />

          {/* Upcoming Schedule */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-slate-900/50">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10">
                  <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{t("upcoming_schedule")}</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{t("academic_timeline")}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {upcomingLectures.length > 0 ? upcomingLectures.map((booking) => {
                const resourceInfo = resources.find(r => r.id === booking.resourceId);
                const locationName = resourceInfo ? getLocalizedLocation(resourceInfo.location) : t("location_pending", { defaultValue: "Location Pending" });

                return (
                  <div 
                    key={booking.id} 
                    onClick={() => navigate(`/my-lectures?highlight=${booking.id}`)}
                    className="group p-5 rounded-xl border border-slate-100 bg-slate-50 dark:bg-white/5 dark:border-white/5 transition-all hover:shadow-lg cursor-pointer"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-slate-800 shadow-sm">
                          <BookOpen className="h-6 w-6 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="text-base font-black text-slate-900 dark:text-white tracking-tight mb-1">
                            {booking.resourceName}
                          </h4>
                          <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {Array.isArray(booking.startTime) ? `${booking.startTime[0]}:${booking.startTime[1].toString().padStart(2, '0')}` : booking.startTime}</span>
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {locationName}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <CountdownTimer dateStr={booking.bookingDate} timeStr={booking.startTime} />
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="py-12 text-center opacity-50">
                  <Calendar className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                  <p className="text-sm font-bold text-slate-400">{t("no_lectures_scheduled")}</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column */}
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

          {/* Active Service Requests Tracker */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-slate-900/50 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-500/10">
                  <Wrench className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{t("active_issues")}</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{t("my_reported_requests")}</p>
                </div>
              </div>
              <button
                onClick={() => navigate("/tickets")}
                className="text-xs font-black text-purple-600 hover:text-purple-500 dark:text-purple-400 dark:hover:text-purple-300 uppercase tracking-widest transition-colors"
              >
                {t("log")}
              </button>
            </div>

            <div className="flex-1 space-y-3">
              {myTickets.filter(t => t.status !== "RESOLVED" && t.status !== "CANCELLED").length > 0 ? 
                myTickets.filter(t => t.status !== "RESOLVED" && t.status !== "CANCELLED").slice(0, 3).map((ticket) => (
                <div key={ticket.id} className="group p-3 rounded-xl bg-slate-50 border border-slate-100 dark:bg-white/5 dark:border-white/5 transition-all hover:shadow-lg">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white tracking-tight mb-1">{ticket.title}</h4>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">#{ticket.id.substring(0, 8)}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${statusStyles[ticket.status] || statusStyles.PENDING}`}>
                      {t(ticket.status.toLowerCase(), { defaultValue: ticket.status.replace('_', ' ') })}
                    </span>
                  </div>
                  <AnimatedProgressBar
                    targetWidth={ticket.status === 'RESOLVED' ? '100%' : ticket.status === 'IN_PROGRESS' ? '60%' : '20%'}
                    colorClass={ticket.status === 'RESOLVED' ? 'bg-emerald-500' : ticket.status === 'IN_PROGRESS' ? 'bg-purple-500' : 'bg-amber-500'}
                  />
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center py-10 opacity-50">
                  <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center dark:bg-white/5 mb-3">
                    <CheckCircle2 className="h-6 w-6 text-slate-300" />
                  </div>
                  <p className="text-xs font-bold text-slate-400 tracking-tight">{t("all_issues_resolved")}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
};

export default LecturerDashboard;
