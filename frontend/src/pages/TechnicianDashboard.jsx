import React, { useEffect, useMemo, useState } from "react";
import { LayoutGrid, Wrench, Bell, X, ArrowRight, ShieldCheck, Clock, Settings, ChevronRight, Star, CheckCircle2, AlertCircle, Activity, TrendingUp, MapPin, BellRing } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSearch } from "../context/SearchContext";
import DashboardLayout from "../components/DashboardLayout";
import TicketCard from "../components/TicketCard";
import api from "../services/api";
import { getRoleAccent, getSidebarItems } from "../utils/dashboardConfig";
import Modal from "../components/Modal";
import ImageViewerModal from "../components/ImageViewerModal";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { DashboardSkeleton } from "../components/Skeleton";
import AnimatedProgressBar from "../components/AnimatedProgressBar";
import { formatDate } from "../utils/dateUtils";
import { useTranslation } from "react-i18next";

const stripHtml = (html) => {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
};

const TechnicianDashboard = () => {
  const { user, logout } = useAuth();
  const { searchQuery } = useSearch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteTicket, setNoteTicket] = useState(null);
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [viewerModalOpen, setViewerModalOpen] = useState(false);
  const [viewerImages, setViewerImages] = useState([]);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);

  const accent = getRoleAccent("TECHNICIAN");
  const sidebarItems = useMemo(() => getSidebarItems("TECHNICIAN"), []);



  // Fetch performance summary
  const { data: summaryData, isLoading: isLoadingSummary } = useQuery({
    queryKey: ["technician-summary"],
    queryFn: async () => {
      const res = await api.get("/tickets/summary");
      return res.data;
    },
    enabled: !!user,
  });

  // Fetch active queue (Filtered for non-resolved)
  const { data: activeTicketsRaw = [], isLoading: isLoadingActive, refetch: refetchActive } = useQuery({
    queryKey: ["technician-active-queue", searchQuery],
    queryFn: async () => {
      // Backend doesn't support comma status, so we fetch all and filter or make separate calls.
      // Fetching without status filter to ensure we get everything then filtering on frontend for accuracy.
      const res = await api.get("/tickets/assigned", {
        params: {
          page: 0,
          size: 50,
          search: searchQuery || undefined
        },
      });
      return res.data?.content || [];
    },
    enabled: !!user,
    placeholderData: keepPreviousData,
  });

  const activeTickets = useMemo(() =>
    activeTicketsRaw.filter(t => t.status === "OPEN" || t.status === "IN_PROGRESS"),
    [activeTicketsRaw]);

  // Fetch all resources for health monitor
  const { data: allResources = [], isLoading: isLoadingResources } = useQuery({
    queryKey: ["technician-resource-health"],
    queryFn: async () => {
      const res = await api.get("/resources", { params: { size: 100 } });
      return res.data?.content || [];
    },
  });

  const brokenResources = useMemo(() =>
    allResources.filter(r => r.status === "OUT_OF_SERVICE"),
    [allResources]);

  // Fetch resolution history
  const { data: resolvedTickets = [], isLoading: isLoadingResolved } = useQuery({
    queryKey: ["technician-resolution-history"],
    queryFn: async () => {
      const res = await api.get("/tickets/assigned", {
        params: { page: 0, size: 5, status: "RESOLVED" },
      });
      return res.data?.content || [];
    },
    enabled: !!user,
  });

  // Announcements query for Notice Board Widget
  const { data: notices = [], isLoading: isLoadingNotices } = useQuery({
    queryKey: ["technician-announcements-summary"],
    queryFn: async () => {
      const res = await api.get("/announcements");
      return res.data || [];
    },
    enabled: !!user,
  });

  const updateStatus = async (ticketId, status, resolutionNotes = "") => {
    try {
      await api.patch(`/tickets/${ticketId}/status`, {
        status,
        resolutionNotes,
      });
      refetchActive();
    } catch (error) {
      console.error("Failed to update ticket status", error);
    }
  };

  const allowedTechStatus = (currentStatus) => {
    const options = [currentStatus];
    if (currentStatus === "IN_PROGRESS") {
      options.push("RESOLVED", "REJECTED");
    }
    return [...new Set(options)];
  };

  const openNotesModal = (ticket) => {
    setNoteTicket(ticket);
    setNoteDraft(ticket.resolutionNotes || "");
    setNotesModalOpen(true);
  };

  const openViewer = (images, index = 0) => {
    setViewerImages(images);
    setViewerInitialIndex(index);
    setViewerModalOpen(true);
  };

  const saveResolutionNotes = async () => {
    if (!noteTicket) return;
    await updateStatus(noteTicket.id, noteTicket.status, noteDraft);
    setNotesModalOpen(false);
    setNoteTicket(null);
    setNoteDraft("");
  };

  if (!user) return null;

  if (isLoadingSummary || isLoadingActive || isLoadingResources) {
    return (
      <DashboardLayout
        user={user}
        logout={logout}
        title={t("dashboard")}
        items={sidebarItems}
        displayRole={t("role_technician", { defaultValue: "Systems Technician" })}
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
      displayRole={t("role_technician", { defaultValue: "Systems Technician" })}
      {...accent}
    >
      {/* Welcome Section */}
      <section className="mb-8">
        {/* Welcome Hero Section */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#0F172A] p-6 sm:p-10 text-white shadow-2xl border border-white/5">
          <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-blue-600/30 to-transparent"></div>
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/20 blur-[100px]"></div>

          <div className="relative z-10">
            <h2 className="text-3xl font-black sm:text-4xl tracking-tight leading-tight mb-3">
              {t("ready_to_resolve")}, {(user.honorific ? user.honorific + " " : "") + user.name}.
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-slate-400 text-sm font-medium">
              <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                <TrendingUp className="h-4 w-4 text-blue-400" />
                {summaryData?.resolvedCount || 0} {t("resolved_total")}
              </span>
            </div>
            <p className="mt-6 text-base font-medium text-slate-300 leading-relaxed max-w-xl">
              {t("tech_dashboard_hero_subtitle")}
            </p>
          </div>
        </div>
      </section>

      {/* Stats Quick Links */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
        {[
          {
            title: t("active_tasks"),
            count: activeTickets.length,
            icon: Wrench,
            color: "from-amber-500 to-orange-600",
            bg: "bg-amber-50 dark:bg-amber-900/10",
            border: "border-amber-100 dark:border-amber-500/20",
          },
          {
            title: t("resolved_tasks"),
            count: summaryData?.resolvedCount || 0,
            icon: CheckCircle2,
            color: "from-emerald-500 to-teal-600",
            bg: "bg-emerald-50 dark:bg-emerald-900/10",
            border: "border-emerald-100 dark:border-emerald-500/20",
          },
          {
            title: t("out_of_service"),
            count: brokenResources.length,
            icon: AlertCircle,
            color: "from-rose-500 to-red-600",
            bg: "bg-rose-50 dark:bg-rose-900/10",
            border: "border-rose-100 dark:border-rose-500/20",
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

      {/* Performance Analytics & Priority List */}
      <section className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Performance Stats */}
        <div className="lg:col-span-1 space-y-6">

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
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 dark:bg-white/5 dark:bg-white/5 dark:hover:border-white/10 transition-all cursor-pointer hover:shadow-sm"
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

          {/* Resolution History */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-slate-900/55">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{t("history")}</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{t("recently_resolved")}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {resolvedTickets.slice(0, 5).map((ticket) => (
                <div 
                  key={ticket.id} 
                  onClick={() => navigate(`/tickets?highlight=${ticket.id}`)}
                  className="group p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 transition-all hover:border-emerald-500/30 cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">{ticket.title}</h4>
                    <span className="text-[10px] font-bold text-emerald-500 shrink-0">{t("resolved", { defaultValue: "Resolved" })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                    <Clock className="h-3 w-3" />
                    <span>{formatDate(ticket.updatedAt)}</span>
                  </div>
                </div>
              ))}
              {resolvedTickets.length === 0 && (
                <p className="text-center py-6 text-sm font-bold text-slate-400">{t("no_resolved_history")}</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Maintenance Insights & Resource Health */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Service Queue - Focused List */}
          <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-white/5 dark:bg-slate-900/50">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-500/10">
                  <Wrench className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{t("active_service_queue")}</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{t("prioritized_tasks")}</p>
                </div>
              </div>
              <span className="px-3 py-1.5 rounded-xl bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-[10px] font-black uppercase tracking-widest">
                {activeTickets.length} {t("pending")}
              </span>
            </div>

            <div className="space-y-4">
              {activeTickets.length > 0 ? activeTickets.map((ticket, index) => (
                <div 
                  key={ticket.id} 
                  onClick={() => navigate(`/tickets?highlight=${ticket.id}`)}
                  className="group relative overflow-hidden rounded-xl bg-slate-50 border border-slate-100 p-5 dark:bg-white/5 dark:border-white/5 transition-all hover:shadow-xl hover:border-blue-500/30 cursor-pointer"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${ticket.priority === 'HIGH' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'
                          }`}>
                          {t(ticket.priority.toLowerCase(), { defaultValue: ticket.priority })}
                        </span>
                        <h4 className="text-base font-black text-slate-900 dark:text-white truncate tracking-tight">{ticket.title}</h4>
                      </div>
                      <div className="flex flex-wrap gap-4 text-[11px] font-bold text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-blue-500" />
                          {ticket.location}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {formatDate(ticket.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="py-12 text-center opacity-50">
                  <ShieldCheck className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-sm font-bold text-slate-400">{t("queue_clear")}</p>
                </div>
              )}
            </div>
          </div>

          {/* Campus Resource Health Monitor */}
          <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-white/5 dark:bg-slate-900/50">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-500/10">
                  <Activity className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{t("resource_conditions")}</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{t("critical_system_status")}</p>
                </div>
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("total_campus_assets")}</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {brokenResources.length > 0 ? brokenResources.map((res) => (
                <div key={res.id} className="group p-5 rounded-xl bg-rose-50/50 border border-rose-100 dark:bg-rose-500/5 dark:border-rose-500/20 transition-all hover:shadow-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-10 w-10 rounded-xl bg-rose-100 flex items-center justify-center dark:bg-rose-900/30">
                      <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-rose-200 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 text-[9px] font-black uppercase tracking-widest">
                      {t("broken", { defaultValue: "Broken" })}
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white tracking-tight mb-1">{res.name}</h4>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">{res.location}</p>
                  <div className="pt-3 border-t border-rose-100 dark:border-rose-500/10 flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-rose-600 dark:text-rose-400">{t("needs_maintenance")}</span>
                    <TrendingUp className="h-3 w-3 text-rose-400" />
                  </div>
                </div>
              )) : (
                <div className="col-span-full py-12 text-center bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/20 rounded-xl">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-4" />
                  <h4 className="text-sm font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">{t("all_systems_normal")}</h4>
                  <p className="text-xs font-bold text-emerald-600/60 dark:text-emerald-400/40">{t("no_failures_detected")}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Reusable Modal for Resolution Notes */}
      <Modal
        isOpen={notesModalOpen && !!noteTicket}
        onClose={() => setNotesModalOpen(false)}
        title={t("resolution_audit")}
        subtitle={t("ticket_maintenance_report", { id: noteTicket?.id?.substring(0, 8) })}
      >
        <div className="space-y-8">
          <div className="space-y-4">
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">{t("work_done_steps")}</label>
            <textarea
              className="w-full min-h-[240px] rounded-xl bg-slate-50 border-2 border-slate-100 p-6 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all dark:bg-slate-800/50 dark:border-white/5 dark:text-white"
              placeholder={t("placeholder_resolution_notes")}
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-4 pt-6 border-t border-slate-100 dark:border-white/5">
            <button
              type="button"
              className="rounded-xl px-8 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
              onClick={() => setNotesModalOpen(false)}
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              onClick={saveResolutionNotes}
              className="rounded-xl bg-blue-600 px-10 py-2.5 text-sm font-black text-white shadow-xl shadow-blue-600/20 transition-all hover:bg-blue-500 active:scale-95"
            >
              {t("complete_ticket")}
            </button>
          </div>
        </div>
      </Modal>

      <ImageViewerModal
        isOpen={viewerModalOpen}
        onClose={() => setViewerModalOpen(false)}
        images={viewerImages}
        initialIndex={viewerInitialIndex}
      />
    </DashboardLayout>
  );
};

export default TechnicianDashboard;
