import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import {
  CalendarCheck2,
  LayoutGrid,
  Wrench,
  Bell,
  BarChart3,
  ArrowRight,
  User as UserIcon,
  ShieldCheck,
  ChevronRight,
  Activity,
  PieChart as PieChartIcon,
  Award,
  Star,
  Clock,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Calendar,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSearch } from "../context/SearchContext";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import CustomDatePicker from "../components/CustomDatePicker";
import { getAssetUrl, getAvatarColor } from "../utils/fileUtils";
import { getRoleAccent, getSidebarItems } from "../utils/dashboardConfig";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { DashboardSkeleton } from "../components/Skeleton";
import DashboardCalendar from "../components/DashboardCalendar";
import { useTranslation } from "react-i18next";

const statusStyles = {
  PENDING:
    "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-500/20",
  APPROVED:
    "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-500/20",
  REJECTED:
    "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-500/20",
  CANCELLED:
    "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-white/10",
};

// Mock Data for Charts
const bookingTrendsData = [
  { name: "Mon", bookings: 12 },
  { name: "Tue", bookings: 19 },
  { name: "Wed", bookings: 15 },
  { name: "Thu", bookings: 25 },
  { name: "Fri", bookings: 22 },
  { name: "Sat", bookings: 8 },
  { name: "Sun", bookings: 14 },
];

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const { searchQuery } = useSearch();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === "si" ? "si-LK" : i18n.language === "ta" ? "ta-LK" : "en-US";

  const [calendarRange, setCalendarRange] = useState({ startDate: "", endDate: "" });
  const [isMounted, setIsMounted] = useState(false);
  const [animatePercent, setAnimatePercent] = useState(0);
  const [hoveredSlice, setHoveredSlice] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const bookingFilterRef = useRef(null);

  useEffect(() => {
    setIsMounted(true);

    const handleClickOutsideFilters = (event) => {
      if (bookingFilterRef.current && !bookingFilterRef.current.contains(event.target)) {
        setShowBookingDateFilter(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutsideFilters);
    return () => document.removeEventListener("mousedown", handleClickOutsideFilters);
  }, []);

  const getNDaysAgo = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const handleMonthChange = useCallback((start, end) => {
    setCalendarRange({ startDate: start, endDate: end });
  }, []);

  const [bookingStartDate, setBookingStartDate] = useState(getNDaysAgo(6));
  const [bookingEndDate, setBookingEndDate] = useState(getTodayStr());
  const [showBookingDateFilter, setShowBookingDateFilter] = useState(false);

  // Trigger animations on date shifts or initial mount
  useEffect(() => {
    if (isMounted) {
      setAnimatePercent(0);
      const animTimer = setTimeout(() => setAnimatePercent(1), 50);
      return () => clearTimeout(animTimer);
    }
  }, [isMounted, bookingStartDate, bookingEndDate]);

  // Fetch bookings for trends (based on selected date filter)
  const { data: trendBookings = [], isLoading: isLoadingTrends } = useQuery({
    queryKey: ["admin-trend-bookings", bookingStartDate, bookingEndDate],
    queryFn: async () => {
      const res = await api.get("/bookings", {
        params: {
          page: 0,
          size: 500,
          startDate: bookingStartDate,
          endDate: bookingEndDate,
        },
      });
      return res.data?.content || [];
    },
    enabled: !!user,
    placeholderData: keepPreviousData,
  });

  // Fetch all tickets for status summary filter
  const { data: allTicketsList = [], isLoading: isLoadingTicketsList, isError: isTicketsError } = useQuery({
    queryKey: ["admin-all-tickets-list"],
    queryFn: async () => {
      const res = await api.get("/tickets", {
        params: {
          page: 0,
          size: 1000,
        },
      });
      return res.data?.content || [];
    },
    enabled: !!user,
    placeholderData: keepPreviousData,
  });

  // Fetch all bookings for calendar (visible range only)
  const { data: calendarBookings = [], isLoading: isLoadingCalBookings } = useQuery({
    queryKey: ["admin-calendar-bookings", calendarRange.startDate, calendarRange.endDate],
    queryFn: async () => {
      if (!calendarRange.startDate || !calendarRange.endDate) return [];
      const res = await api.get("/bookings", {
        params: {
          page: 0,
          size: 200,
          startDate: calendarRange.startDate,
          endDate: calendarRange.endDate,
        },
      });
      return res.data?.content || [];
    },
    enabled: !!user && !!calendarRange.startDate && !!calendarRange.endDate,
    refetchInterval: 5000,
  });

  const { data: resources = [], isLoading: isLoadingResources } = useQuery({
    queryKey: ["admin-resources-all"],
    queryFn: async () => {
      const res = await api.get("/resources", {
        params: { page: 0, size: 100 },
      });
      return res.data?.content || [];
    },
  });

  const { data: ticketsSummary, isLoading: isLoadingTicketsSummary } = useQuery(
    {
      queryKey: ["admin-tickets-summary"],
      queryFn: async () => {
        const res = await api.get("/tickets/summary");
        return res.data;
      },
    },
  );

  const { data: bookingsSummary, isLoading: isLoadingBookingsSummary } =
    useQuery({
      queryKey: ["admin-bookings-summary"],
      queryFn: async () => {
        const res = await api.get("/bookings/summary");
        return res.data;
      },
    });

  const { data: userStats, isLoading: isLoadingUserStats } = useQuery({
    queryKey: ["admin-user-counts"],
    queryFn: async () => {
      const res = await api.get("/admin/users", {
        params: { page: 0, size: 1 },
      });
      return res.data?.counts || {};
    },
  });

  const accent = getRoleAccent("ADMIN");
  const sidebarItems = useMemo(() => getSidebarItems("ADMIN"), []);

  // Real-time Campus Status
  const { data: facilityStatus = { available: 0, inUse: 0, maintenance: 0 } } =
    useQuery({
      queryKey: ["campus-realtime-status-admin"],
      queryFn: async () => {
        const res = await api.get("/bookings/campus-status");
        return res.data || { available: 0, inUse: 0, maintenance: 0 };
      },
      refetchInterval: 30000,
    });

  // Derived Stats
  const stats = useMemo(
    () => ({
      users: (userStats?.USER || 0) + (userStats?.TECHNICIAN || 0),
      resources: resources.length || 0,
      bookings: facilityStatus.inUse || 0,
      tickets: ticketsSummary?.total || 0,
    }),
    [resources, facilityStatus, ticketsSummary, userStats],
  );

  const ticketStatusCounts = useMemo(() => {
    const counts = { OPEN: 0, IN_PROGRESS: 0, RESOLVED: 0, REJECTED: 0 };
    allTicketsList.forEach(t => {
      const status = t.status;
      if (counts[status] !== undefined) {
        counts[status]++;
      }
    });
    return counts;
  }, [allTicketsList]);

  const ticketStatusTotal = useMemo(() => {
    return ticketStatusCounts.OPEN + ticketStatusCounts.IN_PROGRESS + ticketStatusCounts.RESOLVED + ticketStatusCounts.REJECTED;
  }, [ticketStatusCounts]);

  const ticketStatusData = useMemo(() => {
    return [
      { name: t("open"), key: "OPEN", value: ticketStatusCounts.OPEN, fill: "#3b82f6" },
      { name: t("in_progress"), key: "IN_PROGRESS", value: ticketStatusCounts.IN_PROGRESS, fill: "#f97316" },
      { name: t("resolved"), key: "RESOLVED", value: ticketStatusCounts.RESOLVED, fill: "#22c55e" },
      { name: t("rejected"), key: "REJECTED", value: ticketStatusCounts.REJECTED, fill: "#ef4444" },
    ];
  }, [ticketStatusCounts, t]);

  const slices = useMemo(() => {
    if (!ticketStatusTotal) return [];
    const radius = 45;
    const circumference = 2 * Math.PI * radius; // ~282.743
    let accumulatedLength = 0;
    const gap = 5; // Gap size in circumference units

    const activeData = ticketStatusData.filter(d => d.value > 0);

    return activeData.map((item) => {
      const percentage = item.value / ticketStatusTotal;
      const rawLength = percentage * circumference * animatePercent;
      
      const length = activeData.length > 1 ? Math.max(0, rawLength - gap) : rawLength;
      const strokeDashoffset = -accumulatedLength;
      accumulatedLength += percentage * circumference;

      return {
        ...item,
        strokeDasharray: `${length} ${circumference - length}`,
        strokeDashoffset,
      };
    });
  }, [ticketStatusData, ticketStatusTotal, animatePercent]);

  const technicianLeaderboard = useMemo(() => {
    if (!ticketsSummary?.leaderboard) return [];
    return ticketsSummary.leaderboard.map((tech) => ({
      id: tech.id,
      name: tech.name,
      profilePicture: tech.profilePicture,
      avatar: (tech.name || "TC").substring(0, 2).toUpperCase(),
      tickets: tech.tickets,
      rating:
        tech.rating !== undefined && tech.rating !== null ? tech.rating : "0.0",
    }));
  }, [ticketsSummary]);

  const lecturerLeaderboard = useMemo(() => {
    if (!bookingsSummary?.leaderboard) return [];
    return bookingsSummary.leaderboard.map((lec) => ({
      id: lec.id,
      name: lec.name,
      profilePicture: lec.profilePicture,
      avatar: (lec.name || "LC").substring(0, 2).toUpperCase(),
      sessions: lec.sessions,
      rating:
        lec.rating !== undefined && lec.rating !== null ? lec.rating : "0.0",
    }));
  }, [bookingsSummary]);

  const bookingTrendsData = useMemo(() => {
    if (!bookingStartDate || !bookingEndDate) return [];
    const start = new Date(bookingStartDate);
    const end = new Date(bookingEndDate);
    const data = [];
    
    // Generate dates between start and end
    const curr = new Date(start);
    while (curr <= end) {
      const dateStr = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(curr.getDate()).padStart(2, '0')}`;
      const dayName = curr.toLocaleDateString(dateLocale, { weekday: "short" });
      
      // Count bookings for this day
      const count = trendBookings.filter(b => b.bookingDate === dateStr).length;
      
      data.push({
        name: `${dayName} ${curr.getDate()}`,
        dateStr,
        bookings: count
      });
      
      curr.setDate(curr.getDate() + 1);
    }
    return data;
  }, [trendBookings, bookingStartDate, bookingEndDate, dateLocale]);

  if (!user) return null;

  const isLoading =
    isLoadingResources ||
    isLoadingTicketsSummary ||
    isLoadingBookingsSummary ||
    isLoadingUserStats;

  if (isLoading) {
    return (
      <DashboardLayout
        user={user}
        logout={logout}
        title={t("dashboard")}
        items={sidebarItems}
        displayRole={t("role_admin", { defaultValue: "System Administrator" })}
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
      displayRole={t("role_admin", { defaultValue: "System Administrator" })}
      {...accent}
    >
      {/* Admin Hero Section */}
      <section className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-900 via-slate-900 to-[#0F172A] p-6 sm:p-8 text-white shadow-2xl border border-white/5">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-indigo-600/30 to-transparent"></div>
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-indigo-500/20 blur-[100px]"></div>

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-indigo-300 border border-indigo-500/30 mb-3">
            <ShieldCheck className="h-3 w-3" />
            {t("admin_authority")}
          </div>
          <h2 className="text-2xl font-black sm:text-3xl tracking-tight leading-tight">
            {t("unisphere")} <span className="text-indigo-400">{t("administrator_portal", { defaultValue: "Portal" })}</span>.
          </h2>
          <p className="mt-3 text-sm font-medium text-slate-300 leading-relaxed">
            {t("admin_dashboard_hero_subtitle")}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => navigate("/resources")}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-xl shadow-indigo-600/20 transition-all hover:bg-indigo-500 hover:-translate-y-1 active:scale-95"
            >
              {t("manage_assets")}
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Stats Quick Links */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: t("facilities"),
            count: stats.resources,
            icon: LayoutGrid,
            color: "from-emerald-500 to-teal-600",
            bg: "bg-emerald-50 dark:bg-emerald-900/10",
            border: "border-emerald-100 dark:border-emerald-500/20",
          },
          {
            title: t("active_bookings"),
            count: stats.bookings,
            icon: CalendarCheck2,
            color: "from-purple-500 to-pink-600",
            bg: "bg-purple-50 dark:bg-purple-900/10",
            border: "border-purple-100 dark:border-purple-500/20",
          },
          {
            title: t("tickets"),
            count: stats.tickets,
            icon: Wrench,
            color: "from-amber-500 to-orange-600",
            bg: "bg-amber-50 dark:bg-amber-900/10",
            border: "border-amber-100 dark:border-amber-500/20",
          },
          {
            title: t("total_users"),
            count: stats.users,
            icon: UserIcon,
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

      {/* Calendar Section */}
      <section className="my-6">
        <DashboardCalendar
          events={calendarBookings}
          isLoading={isLoadingCalBookings}
          onMonthChange={handleMonthChange}
          userRole="ADMIN"
        />
      </section>

      {/* Analytics Charts Section */}
      <section className="grid gap-4 lg:grid-cols-3">
        {/* Main Trend Chart */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-slate-900/50 flex flex-col h-[350px]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10">
                <Activity className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                  {t("booking_trends")}
                </h3>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 flex flex-wrap items-center gap-1">
                  <span>{t("last_7_days_usage")}</span>
                </p>
              </div>
            </div>

            {/* Date Filtering Popover */}
            <div className="relative" ref={bookingFilterRef}>
              <button
                onClick={() => setShowBookingDateFilter(!showBookingDateFilter)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 dark:text-indigo-400 text-xs font-bold transition-all border border-indigo-100 dark:border-indigo-500/20"
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>{t("filter_date")}</span>
              </button>
              {showBookingDateFilter && (
                <div className="absolute right-0 mt-2 z-50 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl p-4 flex flex-col gap-3">
                  <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                    {t("select_booking_date_range")}
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    <CustomDatePicker
                      value={bookingStartDate}
                      onChange={(date) => setBookingStartDate(date)}
                      label={t("start")}
                    />
                    <CustomDatePicker
                      value={bookingEndDate}
                      onChange={(date) => setBookingEndDate(date)}
                      label={t("end")}
                    />
                  </div>
                  <button
                    onClick={() => setShowBookingDateFilter(false)}
                    className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 rounded-xl transition-all"
                  >
                    {t("apply_filter")}
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 w-full min-h-[250px] relative">
            {isLoadingTrends && trendBookings.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : (
              isMounted && (
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart
                    data={bookingTrendsData}
                    margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorBookings"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#334155"
                      opacity={0.2}
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ className: "fill-slate-500 dark:fill-slate-400 font-semibold text-[10px] sm:text-[11px]" }}
                      dy={10}
                      interval={0}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ className: "fill-slate-500 dark:fill-slate-400 font-semibold text-[10px] sm:text-[11px]" }}
                      dx={-5}
                      width={35}
                      allowDecimals={false}
                    />
                    <RechartsTooltip
                      labelFormatter={(label, payload) => {
                        if (payload && payload.length > 0) {
                          const dateStr = payload[0].payload.dateStr;
                          if (dateStr) {
                            const [year, month, day] = dateStr.split("-").map(Number);
                            const d = new Date(year, month - 1, day);
                            const monthName = d.toLocaleDateString(dateLocale, { month: "short" });
                            return (
                              <span className="flex flex-col gap-1 text-white pb-1">
                                <span className="font-black text-xs">{`${day} ${monthName} ${year}`}</span>
                                <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5 text-indigo-400" />
                                  {i18n.language === "si" ? "පෙ.ව. 12:00" : i18n.language === "ta" ? "12:00 மு.ப" : "12:00 AM"}
                                </span>
                              </span>
                            );
                          }
                        }
                        return label;
                      }}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                        backgroundColor: "rgba(15, 23, 42, 0.9)",
                        color: "#fff",
                      }}
                      itemStyle={{ color: "#fff", fontWeight: "bold" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="bookings"
                      stroke="#6366f1"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorBookings)"
                      isAnimationActive={true}
                      animationDuration={1000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )
            )}
          </div>
        </div>

        {/* Donut Chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-slate-900/50 flex flex-col h-[350px]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
                <PieChartIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                  {t("ticket_status")}
                </h3>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                  {t("global_distribution")}
                </p>
              </div>
            </div>
          </div>

          <div className="relative w-full flex-1 flex flex-col items-center justify-between min-h-0 py-1">
            {isLoadingTicketsList && allTicketsList.length === 0 ? (
              <div className="flex flex-col items-center justify-center w-full h-full animate-pulse">
                <div className="relative flex items-center justify-center w-28 h-28 rounded-full border-[8px] border-slate-200 dark:border-slate-800">
                  <div className="flex flex-col items-center gap-1">
                    <div className="h-2 w-6 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    <div className="h-3.5 w-10 bg-slate-200 dark:bg-slate-800 rounded"></div>
                  </div>
                </div>
              </div>
            ) : isTicketsError ? (
              <div className="flex flex-col items-center justify-center gap-2 text-center p-4">
                <AlertCircle className="h-8 w-8 text-rose-500" />
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {t("err_load_ticket_stats")}
                </p>
              </div>
            ) : ticketStatusTotal === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 text-center p-4">
                <PieChartIcon className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {t("no_ticket_data")}
                </p>
              </div>
            ) : (
              isMounted && (
                <div className="relative w-full h-full flex flex-col items-center justify-between">
                  {/* Interactive SVG Donut Chart */}
                  <div className="relative flex items-center justify-center flex-1 min-h-0 w-full">
                    <svg viewBox="0 0 120 120" className="w-40 h-40 sm:w-44 sm:h-44 md:w-48 md:h-48 lg:w-52 lg:h-52 select-none transition-all duration-300">
                      {slices.map((slice, index) => (
                        <circle
                          key={index}
                          cx="60"
                          cy="60"
                          r="45"
                          fill="transparent"
                          stroke={slice.fill}
                          strokeWidth={hoveredSlice?.key === slice.key ? "16" : "14"}
                          strokeDasharray={slice.strokeDasharray}
                          strokeDashoffset={slice.strokeDashoffset}
                          transform="rotate(-90 60 60)"
                          className="transition-all duration-300 ease-out cursor-pointer"
                          onMouseEnter={(e) => {
                            setHoveredSlice(slice);
                            const rect = e.currentTarget.ownerSVGElement.getBoundingClientRect();
                            setTooltipPos({
                              x: e.clientX - rect.left,
                              y: e.clientY - rect.top
                            });
                          }}
                          onMouseMove={(e) => {
                            const rect = e.currentTarget.ownerSVGElement.getBoundingClientRect();
                            setTooltipPos({
                              x: e.clientX - rect.left,
                              y: e.clientY - rect.top
                            });
                          }}
                          onMouseLeave={() => setHoveredSlice(null)}
                        />
                      ))}
                      <text x="60" y="56" textAnchor="middle" className="fill-slate-400 dark:fill-slate-500 text-[7px] font-bold uppercase tracking-wider">
                        {t("total_tickets")}
                      </text>
                      <text x="60" y="73" textAnchor="middle" className="fill-slate-800 dark:fill-white text-[15px] font-black tracking-tight">
                        {ticketStatusTotal}
                      </text>
                    </svg>
                  </div>

                  {/* Dynamic Legend at the bottom of the card */}
                  <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 mt-2 text-[10px] font-black">
                    <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                      <span className="h-2 w-2 rounded-full bg-[#f97316]" />
                      <span>{t("in_progress")} ({ticketStatusCounts.IN_PROGRESS})</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                      <span className="h-2 w-2 rounded-full bg-[#3b82f6]" />
                      <span>{t("open")} ({ticketStatusCounts.OPEN})</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                      <span className="h-2 w-2 rounded-full bg-[#ef4444]" />
                      <span>{t("rejected")} ({ticketStatusCounts.REJECTED})</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                      <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
                      <span>{t("resolved")} ({ticketStatusCounts.RESOLVED})</span>
                    </div>
                  </div>

                  {/* Tooltip Hover Overlay */}
                  {hoveredSlice && (
                    <div
                      className="absolute z-50 bg-slate-950/95 text-white rounded-xl p-2.5 shadow-2xl border border-white/10 text-[10px] pointer-events-none transition-all duration-75 flex flex-col gap-0.5 min-w-[100px]"
                      style={{
                        left: `${tooltipPos.x + 10}px`,
                        top: `${tooltipPos.y - 50}px`,
                      }}
                    >
                      <div className="font-black flex items-center gap-1.5 text-xs">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: hoveredSlice.fill }} />
                        {hoveredSlice.name}
                      </div>
                      <div className="h-[1px] bg-white/10 my-0.5" />
                      <div className="font-bold text-slate-300">
                        {hoveredSlice.value} {hoveredSlice.value === 1 ? t("ticket", { defaultValue: "Ticket" }) : t("tickets", { defaultValue: "Tickets" })}
                      </div>
                      <div className="font-extrabold text-indigo-400">
                        {((hoveredSlice.value / ticketStatusTotal) * 100).toFixed(1)}%
                      </div>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* Overview & Leaderboard Section */}
      <section className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-stretch">
        {/* Live Facility Status */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-slate-900/50 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
              <LayoutGrid className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {t("facility_status")}
              </h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {t("live_availability")}
              </p>
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center gap-4">
            <div className="flex items-center justify-between p-5 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-500/20">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                <span className="text-[12px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                  {t("available")}
                </span>
              </div>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {facilityStatus.available}
              </span>
            </div>
            <div className="flex items-center justify-between p-5 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-500/20">
              <div className="flex items-center gap-3">
                <Activity className="h-6 w-6 text-blue-500" />
                <span className="text-[12px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                  {t("in_use")}
                </span>
              </div>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {facilityStatus.inUse}
              </span>
            </div>
            <div className="flex items-center justify-between p-5 rounded-xl bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-500/20">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-rose-500" />
                <span className="text-[12px] font-bold uppercase tracking-widest text-rose-600 dark:text-rose-400">
                  {t("maintenance")}
                </span>
              </div>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {facilityStatus.maintenance}
              </span>
            </div>
          </div>
        </div>

        {/* Technician Leaderboard */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-slate-900/50 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-500/10">
              <Award className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {t("top_technicians")}
              </h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {t("weekly_performance")}
              </p>
            </div>
          </div>
          <div className="flex-1 space-y-4">
            {technicianLeaderboard.map((tech, index) => (
              <div
                key={tech.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5 relative overflow-hidden group hover:border-amber-500/30 transition-colors"
              >
                {index === 0 && (
                  <div className="absolute top-0 right-0 w-16 h-16 bg-amber-400/10 rounded-bl-full"></div>
                )}

                {tech.profilePicture ? (
                  <img
                    src={getAssetUrl(tech.profilePicture)}
                    className="flex-shrink-0 h-12 w-12 rounded-full object-cover shadow-md border-2 border-white dark:border-slate-800"
                    alt={tech.name}
                  />
                ) : (
                  <div className={`flex-shrink-0 h-12 w-12 rounded-full ${getAvatarColor(tech.name)} flex items-center justify-center text-white font-black text-sm shadow-md`}>
                    {tech.avatar}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {tech.name}
                  </h4>
                  <p className="text-xs font-medium text-slate-500">
                    {tech.tickets} {t("tickets_resolved", { defaultValue: "Tickets Resolved" })}
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {tech.rating}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {t("rating")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Lecturers Leaderboard */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-slate-900/50 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/10">
              <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {t("top_lecturers")}
              </h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {t("module_evaluations")}
              </p>
            </div>
          </div>
          <div className="flex-1 space-y-4">
            {lecturerLeaderboard.map((lec, index) => (
              <div
                key={lec.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5 relative overflow-hidden group hover:border-blue-500/30 transition-colors"
              >
                {index === 0 && (
                  <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-bl-full"></div>
                )}

                {lec.profilePicture ? (
                  <img
                    src={getAssetUrl(lec.profilePicture)}
                    className="flex-shrink-0 h-12 w-12 rounded-full object-cover shadow-md border-2 border-white dark:border-slate-800"
                    alt={lec.name}
                  />
                ) : (
                  <div className={`flex-shrink-0 h-12 w-12 rounded-full ${getAvatarColor(lec.name)} flex items-center justify-center text-white font-black text-sm shadow-md`}>
                    {lec.avatar}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {lec.name}
                  </h4>
                  <p className="text-xs font-medium text-slate-500">
                    {lec.sessions} {t("lectures_rated", { defaultValue: "Lectures Rated" })}
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {lec.rating}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {t("rating")}
                  </span>
                </div>
              </div>
            ))}
            {lecturerLeaderboard.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center h-full">
                <BookOpen className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t("no_ratings_yet")}</p>
              </div>
            )}
          </div>
        </div>
      </section>

    </DashboardLayout>
  );
};

export default AdminDashboard;
