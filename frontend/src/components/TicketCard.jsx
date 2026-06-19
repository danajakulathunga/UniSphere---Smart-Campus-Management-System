import React from "react";
import {
  Calendar,
  MapPin,
  Clock,
  User as UserIcon,
  AlertCircle,
  CheckCircle2,
  Clock3,
  XCircle,
  ChevronRight,
  MessageSquare,
  Wrench,
  AlertTriangle,
  Trash2,
  Tag,
  Hash,
  Pencil,
  Image as ImageIcon,
  Eye,
  Star,
} from "lucide-react";
import CustomDropdown from "./CustomDropdown";
import { formatDate } from "../utils/dateUtils";
import { useTranslation } from "react-i18next";

const statusConfig = {
  OPEN: {
    icon: Clock3,
    color: "text-blue-600 bg-blue-50 border-blue-100",
    darkColor: "dark:text-blue-400 dark:bg-blue-500/10 dark:border-blue-500/20",
    label: "Open",
  },
  IN_PROGRESS: {
    icon: Clock,
    color: "text-orange-600 bg-orange-50 border-orange-100",
    darkColor:
      "dark:text-orange-400 dark:bg-orange-500/10 dark:border-orange-500/20",
    label: "In Progress",
  },
  RESOLVED: {
    icon: CheckCircle2,
    color: "text-emerald-600 bg-emerald-50 border-emerald-100",
    darkColor:
      "dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20",
    label: "Resolved",
  },
  REJECTED: {
    icon: AlertTriangle,
    color: "text-rose-600 bg-rose-50 border-rose-100",
    darkColor: "dark:text-rose-400 dark:bg-rose-500/10 dark:border-rose-500/20",
    label: "Rejected",
  },
  CANCELLED: {
    icon: XCircle,
    color: "text-slate-600 bg-slate-50 border-slate-100",
    darkColor:
      "dark:text-slate-400 dark:bg-slate-500/10 dark:border-slate-500/20",
    label: "Cancelled",
  },
};

const priorityConfig = {
  LOW: "bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-800/50 dark:text-slate-400 dark:border-white/5",
  MEDIUM:
    "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-500/20",
  HIGH: "bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-500/20",
  CRITICAL:
    "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-500/20",
};

const TicketCard = ({
  ticket,
  isAdmin,
  isTechnician,
  isUser,
  isLecturer,
  technicians = [],
  statusOptions = [],
  onAssignTechnician,
  onUpdateStatus,
  onDeleteTicket,
  onCancelTicket,
  onOpenComments,
  onOpenNotes,
  onEditTicket,
  onViewImages,
  onRateTicket,
  user,
  isHighlighted = false,
}) => {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === "si" ? "si-LK" : i18n.language === "ta" ? "ta-LK" : "en-US";
  const status = statusConfig[ticket.status] || statusConfig.OPEN;
  const StatusIcon = status.icon;
  const cardRef = React.useRef(null);

  React.useEffect(() => {
    if (isHighlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isHighlighted]);

  return (
    <article
      ref={cardRef}
      className={`group relative flex flex-col rounded-xl border bg-white p-1 shadow-sm transition-all duration-500 overflow-hidden ${
        isHighlighted
          ? "border-blue-500 shadow-2xl shadow-blue-500/20 ring-4 ring-blue-500/10 scale-[1.02] z-10"
          : "border-slate-200 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-900/10 dark:border-white/5"
      } dark:bg-slate-900/50 smooth-hover`}
    >
      {/* Visual Indicator Bar */}
      <div
        className={`absolute top-0 left-0 h-full w-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-l-2xl ${status.color.split(" ")[1]}`}
      ></div>

      <div className="flex flex-col h-full p-3">
        {/* Top Section: Badges & ID */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-full border text-[9px] font-black uppercase tracking-tight shadow-sm transition-transform group-hover:scale-105 ${status.color} ${status.darkColor}`}
            >
              <StatusIcon className="h-3 w-3" />
              {t(ticket.status.toLowerCase(), { defaultValue: status.label })}
            </div>
            <div
              className={`px-2 py-1 rounded-full border text-[9px] font-black uppercase tracking-tight ${priorityConfig[ticket.priority]}`}
            >
              {t(ticket.priority.toLowerCase(), { defaultValue: ticket.priority })}
            </div>
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-100 dark:bg-slate-800/50 dark:border-white/5 shadow-inner">
            <Hash className="h-2.5 w-2.5 text-slate-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              {ticket.id?.substring(0, 8)}
            </span>
          </div>
        </div>

        {/* Middle Section: Title & Description */}
        <div className="space-y-1 mb-2.5">
          <div className="flex items-start justify-between gap-4">
            <h4 className="text-base font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 tracking-tight leading-snug group-hover:from-blue-600 group-hover:to-indigo-500 transition-all duration-300">
              {ticket.title || ticket.category}
            </h4>
          </div>
          <p className="text-[11px] font-medium text-slate-500/90 dark:text-slate-400 leading-relaxed line-clamp-2">
            {ticket.description}
          </p>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 gap-y-1 py-1.5 border-t border-slate-50 dark:border-white/5 relative">
          <div className="flex items-center gap-2.5 relative z-10 p-1 rounded-lg bg-indigo-50/30 border border-transparent transition-all duration-300 hover:bg-indigo-50 hover:border-indigo-100 dark:bg-indigo-500/5 dark:hover:bg-indigo-500/10">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100/50 shadow-inner dark:from-indigo-500/10 dark:to-blue-500/10 dark:border-indigo-500/20">
              <MapPin className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400 dark:text-indigo-400/60 leading-none mb-0.5">
                {t("location", { defaultValue: "Location" })}
              </span>
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">
                {ticket.assetName
                  ? `${ticket.assetName} - ${ticket.location}`
                  : ticket.location}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 relative z-10 p-1 rounded-lg bg-emerald-50/30 border border-transparent transition-all duration-300 hover:bg-emerald-50 hover:border-emerald-100 dark:bg-emerald-500/5 dark:hover:bg-emerald-500/10">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100/50 shadow-inner dark:from-emerald-500/10 dark:to-teal-500/10 dark:border-emerald-500/20">
              <Calendar className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 dark:text-emerald-400/60 leading-none mb-0.5">
                {t("created", { defaultValue: "Created" })}
              </span>
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 truncate">
                {formatDate(ticket.createdAt, dateLocale)}
                <span className="opacity-40">•</span>
                <span>
                  {new Date(ticket.createdAt || Date.now()).toLocaleTimeString(
                    dateLocale,
                    { hour: "2-digit", minute: "2-digit" },
                  )}
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 relative z-10 p-1 rounded-lg bg-purple-50/30 border border-transparent transition-all duration-300 hover:bg-purple-50 hover:border-purple-100 dark:bg-purple-500/5 dark:hover:bg-purple-500/10">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-50 to-fuchsia-50 border border-purple-100/50 shadow-inner dark:from-purple-500/10 dark:to-fuchsia-500/10 dark:border-purple-500/20">
              <UserIcon className="h-3.5 w-3.5 text-purple-500 dark:text-purple-400" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-black uppercase tracking-wider text-purple-400 dark:text-purple-500/60 leading-none mb-0.5">
                {t("assigned_to", { defaultValue: "Assigned To" })}
              </span>
              <span className="text-[11px] font-bold text-purple-700 dark:text-purple-400 truncate">
                {ticket.assignedTechnicianName || t("unassigned", { defaultValue: "Unassigned" })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 relative z-10 p-1 rounded-lg bg-amber-50/30 border border-transparent transition-all duration-300 hover:bg-amber-50 hover:border-amber-100 dark:bg-amber-500/5 dark:hover:bg-amber-500/10">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100/50 shadow-inner dark:from-amber-500/10 dark:to-orange-500/10 dark:border-amber-500/20">
              <Tag className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 dark:text-amber-400/60 leading-none mb-0.5">
                {t("reported_by", { defaultValue: "Reported By" })}
              </span>
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">
                {ticket.userName || "System"}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Section: Actions */}
        <div className="mt-auto space-y-3 pt-2 border-t border-slate-50 dark:border-white/5">
          {/* Dropdowns for Admin/Tech */}
          <div className="flex flex-col gap-3">
            {isAdmin &&
              ticket.status !== "RESOLVED" &&
              ticket.status !== "CANCELLED" && (
                <CustomDropdown
                  label={t("reassign_specialist", { defaultValue: "Reassign Specialist" })}
                  icon={Wrench}
                  options={technicians.map((t) => ({
                    value: t.id,
                    label: t.name,
                  }))}
                  value={ticket.assignedTechnicianId}
                  onChange={(val) => onAssignTechnician(ticket.id, val)}
                  placeholder={t("select_technician", { defaultValue: "Select Technician" })}
                  className="!py-2.5"
                  pushContent={true}
                />
              )}

            {(isAdmin || isTechnician || isUser) &&
              statusOptions.length > 1 && (
                <CustomDropdown
                  label={t("update_workflow", { defaultValue: "Update Workflow" })}
                  icon={Clock}
                  options={(statusOptions || []).map((opt) => ({
                    value: opt,
                    label: t(opt.toLowerCase(), { defaultValue: statusConfig[opt]?.label || opt }),
                  }))}
                  value={ticket.status || "OPEN"}
                  onChange={(val) => onUpdateStatus(ticket.id, val)}
                  className="!py-2.5"
                  pushContent={true}
                />
              )}
          </div>

          {/* Bottom Action Buttons */}
          <div className="flex flex-col gap-2.5 pt-2">
            {/* View & Comments Row */}
            <div className="flex items-center gap-2 w-full">
              <button
                onClick={() => onOpenComments(ticket)}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-slate-500 transition-all hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 hover:shadow-lg hover:shadow-blue-500/20 dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-400 dark:hover:border-blue-500 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 active:scale-95"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                {t("comments", { defaultValue: "Comments" })} ({ticket.commentCount || 0})
              </button>

              {ticket.imageCount > 0 && (
                <button
                  onClick={() => onViewImages(ticket)}
                  className="inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border-2 border-slate-100 bg-white text-blue-600 shadow-sm transition-all hover:border-blue-500 hover:bg-blue-50 hover:shadow-lg active:scale-95 dark:border-white/5 dark:bg-slate-800 dark:text-blue-400"
                  title={`View Evidence (${ticket.imageCount} Images)`}
                >
                  <div className="relative">
                    <ImageIcon className="h-4 w-4" />
                    <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[8px] font-black text-white">
                      {ticket.imageCount}
                    </span>
                  </div>
                </button>
              )}
            </div>

            {/* Actions Row (Edit, Cancel, Rate) */}
            {(isUser ||
              isLecturer ||
              (isAdmin && ticket.userId === user?.id)) && (
              <div className="flex items-center gap-2 w-full">
                {ticket.status === "RESOLVED" && !ticket.technicianRating && (
                  <button
                    onClick={() => onRateTicket(ticket)}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-amber-600 transition-all hover:bg-amber-500 hover:text-white hover:shadow-lg hover:shadow-amber-500/20 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-600"
                    title="Rate Technician"
                  >
                    <Star className="h-4 w-4" />
                    {t("rate_technician", { defaultValue: "Rate Technician" })}
                  </button>
                )}
                {ticket.technicianRating && (
                  <div
                    className="flex-1 flex h-10 px-3 items-center justify-center gap-1 rounded-xl bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                    title={`Rated ${ticket.technicianRating}/5`}
                  >
                    <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                    {ticket.technicianRating} {t("stars", { defaultValue: "Stars" })}
                  </div>
                )}
                {ticket.status === "OPEN" && (
                  <div className="flex items-center gap-2 w-full">
                    <button
                      onClick={() => onEditTicket(ticket)}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-blue-50 text-[10px] font-black uppercase tracking-widest text-blue-600 transition-all hover:bg-blue-600 hover:text-white dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-600 active:scale-95 shadow-sm"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {t("edit")}
                    </button>
                    <button
                      onClick={() => onCancelTicket(ticket.id)}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-rose-50 text-[10px] font-black uppercase tracking-widest text-rose-500 transition-all hover:bg-rose-500 hover:text-white dark:bg-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-600 active:scale-95 shadow-sm"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      {t("cancel")}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

export default TicketCard;
