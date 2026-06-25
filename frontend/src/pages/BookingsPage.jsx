import React, { useMemo, useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Plus,
  X,
  Filter,
  RefreshCw,
  Calendar,
  Clock,
  MapPin,
  Search,
  ArrowRight,
  ChevronRight,
  User as UserIcon,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ClipboardList,
  MoreVertical,
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import { normalizeRoles, useAuth } from "../context/AuthContext";
import { formatDate } from "../utils/dateUtils";
import { getAssetUrl, getAvatarColor } from "../utils/fileUtils";
import {
  getPrimaryRole,
  getRoleAccent,
  getSidebarItems,
} from "../utils/dashboardConfig";
import CustomDropdown from "../components/CustomDropdown";
import Modal from "../components/Modal";
import { useAlert } from "../context/AlertContext";
import { useSearch } from "../context/SearchContext";
import { generateBookingPDF } from "../utils/pdfGenerator";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import BookingFormModal from "../components/BookingFormModal";
import ShareSessionModal from "../components/ShareSessionModal";
import CustomDatePicker from "../components/CustomDatePicker";

const statusStyles = {
  PENDING:
    "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-500/20",
  APPROVED:
    "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-500/20",
  REJECTED:
    "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-500/20",
  CANCELLED:
    "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-500/20",
};

const BookingsPage = () => {
  const { user, logout } = useAuth();
  const { searchQuery } = useSearch();
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === "si" ? "si-LK" : i18n.language === "ta" ? "ta-LK" : "en-US";
  const roles = normalizeRoles(user?.roles);
  const isUser = roles.includes("USER");
  const isLecturer = roles.includes("LECTURER");
  const isAdmin = roles.includes("ADMIN");
  const primaryRole = getPrimaryRole(roles);
  const accent = getRoleAccent(primaryRole);
  const queryClient = useQueryClient();

  const sidebarItems = useMemo(
    () => getSidebarItems(primaryRole),
    [primaryRole],
  );

  const { showAlert } = useAlert();
  const [decisionReason, setDecisionReason] = useState({});
  const [currentTime, setCurrentTime] = useState(new Date());
  const location = useLocation();
  const navigate = useNavigate();
  const [highlightId, setHighlightId] = useState(null);
  const highlightedRowRef = useRef(null);

  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const [filters, setFilters] = useState(() => {
    const params = new URLSearchParams(location.search);
    return {
      status: params.get("status") || "",
      date: params.get("date") || "",
    };
  });

  // Sync filters when URL params change (e.g., calendar navigation)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const dateParam = params.get("date");
    const statusParam = params.get("status");
    if (dateParam !== null || statusParam !== null) {
      setFilters((prev) => ({
        ...prev,
        date: dateParam || prev.date,
        status: statusParam || prev.status,
      }));
    }
  }, [location.search]);
  const [editingBookingId, setEditingBookingId] = useState(null);
  const [initialBookingData, setInitialBookingData] = useState(null);

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedBookingForShare, setSelectedBookingForShare] = useState(null);

  // Queries
  const { data: resources = [] } = useQuery({
    queryKey: ["resources"],
    queryFn: async () => {
      const res = await api.get("/resources", {
        params: { page: 0, size: 100 },
      });
      return res.data?.content || [];
    },
    enabled: !!user,
  });

  const {
    data: bookings = [],
    isLoading: isBookingsLoading,
    isError: hasError,
  } = useQuery({
    queryKey: ["bookings", isAdmin, filters.status, filters.date, searchQuery],
    queryFn: async () => {
      const endpoint = isAdmin ? "/bookings" : "/bookings/mine";
      const params = {
        page: 0,
        size: 50,
        status: filters.status || undefined,
        date: filters.date || undefined,
        search: searchQuery || undefined,
      };
      const res = await api.get(endpoint, { params });
      return Array.isArray(res.data?.content)
        ? res.data.content
        : Array.isArray(res.data)
          ? res.data
          : [];
    },
    enabled: !!user,
    placeholderData: keepPreviousData,
    refetchInterval: 5000, // Real-time sync every 5 seconds
  });

  const { data: summary = null } = useQuery({
    queryKey: ["bookings-summary"],
    queryFn: async () => {
      const res = await api.get("/bookings/summary");
      return res.data || null;
    },
    enabled: !!user,
  });

  const isLoading = isBookingsLoading;

  const sortedBookings = useMemo(() => {
    return [...bookings].sort((a, b) => {
      const getTs = (bk) => {
        try {
          let y, m, d, h, min;
          if (Array.isArray(bk.bookingDate)) [y, m, d] = bk.bookingDate;
          else [y, m, d] = bk.bookingDate.split("-").map(Number);
          if (Array.isArray(bk.startTime)) [h, min] = bk.startTime;
          else [h, min] = bk.startTime.split(":").map(Number);
          return new Date(y, m - 1, d, h, min).getTime();
        } catch (e) {
          return 0;
        }
      };
      return getTs(b) - getTs(a);
    });
  }, [bookings]);

  // Mutations
  const decisionMutation = useMutation({
    mutationFn: async ({ id, action }) => {
      await api.patch(`/bookings/${id}/${action}`, {
        reason: decisionReason[id] || "System Audit Approval",
      });
    },
    onMutate: async ({ id, action }) => {
      showAlert(
        "success",
        action === "approve"
          ? t("success_booking_approved", { defaultValue: "Booking Approved" })
          : t("success_booking_rejected", { defaultValue: "Booking Rejected" })
      );

      await queryClient.cancelQueries({ queryKey: ["bookings"] });
      const previousBookings = queryClient.getQueryData(["bookings"]);

      if (previousBookings) {
        queryClient.setQueryData(["bookings"], (old) => {
          if (!old?.content) return old;
          return {
            ...old,
            content: old.content.map((b) =>
              b.id === id
                ? {
                    ...b,
                    status: action === "approve" ? "APPROVED" : "REJECTED",
                  }
                : b,
            ),
          };
        });
      }
      return { previousBookings };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["bookings-summary"] });
      queryClient.invalidateQueries({ queryKey: ["my-sessions"] });
    },
    onError: (err, { action }, context) => {
      if (context?.previousBookings) {
        queryClient.setQueryData(["bookings"], context.previousBookings);
      }
      showAlert(
        "error",
        err?.response?.data?.message ||
          (action === "approve"
            ? t("err_approve_booking", { defaultValue: "Failed to approve booking." })
            : t("err_reject_booking", { defaultValue: "Failed to reject booking." })),
      );
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id) => {
      await api.patch(`/bookings/${id}/cancel`);
    },
    onMutate: async (id) => {
      showAlert("success", t("success_booking_cancelled", { defaultValue: "Booking cancelled successfully!" }));

      await queryClient.cancelQueries({ queryKey: ["bookings"] });
      const previousBookings = queryClient.getQueryData(["bookings"]);

      if (previousBookings) {
        queryClient.setQueryData(["bookings"], (old) => {
          if (!old?.content) return old;
          return {
            ...old,
            content: old.content.map((b) =>
              b.id === id ? { ...b, status: "CANCELLED" } : b,
            ),
          };
        });
      }
      return { previousBookings };
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["bookings-summary"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["my-sessions"] });
    },
    onError: (err, _, context) => {
      if (context?.previousBookings) {
        queryClient.setQueryData(["bookings"], context.previousBookings);
      }
      showAlert(
        "error",
        err?.response?.data?.message || t("err_cancel_booking", { defaultValue: "Failed to cancel booking." }),
      );
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get("highlight");
    if (id) {
      setHighlightId(id);

      // Clear the query params via navigate to keep React Router state in sync
      navigate(location.pathname, { replace: true });

      const timer = setTimeout(() => {
        setHighlightId(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [location.search]);

  useEffect(() => {
    if (highlightId && highlightedRowRef.current) {
      highlightedRowRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [highlightId, bookings]);

  const openEditModal = (booking) => {
    setInitialBookingData({
      resourceId: booking.resourceId,
      bookingDate: booking.bookingDate,
      startTime: booking.startTime,
      endTime: booking.endTime,
      purpose: booking.purpose,
    });
    setEditingBookingId(booking.id);
    setBookingModalOpen(true);
  };

  const handleDecision = (id, action) => {
    decisionMutation.mutate({ id, action });
  };

  const cancelBooking = (id) => {
    if (!window.confirm(t("confirm_cancel_booking", { defaultValue: "Are you sure you want to cancel this booking?" })))
      return;
    cancelMutation.mutate(id);
  };

  const resetFilters = () => {
    setFilters({ status: "", date: "" });
  };

  if (!user) return null;

  return (
    <DashboardLayout
      user={user}
      logout={logout}
      title={isUser || isLecturer ? t("my_bookings", { defaultValue: "My Bookings" }) : t("bookings", { defaultValue: "Bookings" })}
      items={sidebarItems}
      displayRole={primaryRole}
      {...accent}
    >
      {/* Search and Filters Section */}
      <section className="relative z-30 rounded-xl bg-white p-5 shadow-sm border border-slate-200 dark:bg-slate-900/50 dark:border-white/5 mb-8">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
          {/* Filters Grid */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <CustomDropdown
              label={t("booking_status", { defaultValue: "Booking Status" })}
              icon={Clock}
              options={[
                {
                  value: "",
                  label: t("all_statuses", { defaultValue: "All Statuses" }),
                  count: summary?.total || 0,
                },
                {
                  value: "PENDING",
                  label: t("pending_requests", { defaultValue: "Pending Requests" }),
                  count: summary?.statusCounts?.PENDING || 0,
                },
                {
                  value: "APPROVED",
                  label: t("approved_bookings", { defaultValue: "Approved Bookings" }),
                  count: summary?.statusCounts?.APPROVED || 0,
                },
                {
                  value: "REJECTED",
                  label: t("rejected_requests", { defaultValue: "Rejected Requests" }),
                  count: summary?.statusCounts?.REJECTED || 0,
                },
                {
                  value: "CANCELLED",
                  label: t("cancelled_bookings", { defaultValue: "Cancelled Bookings" }),
                  count: summary?.statusCounts?.CANCELLED || 0,
                },
              ]}
              value={filters.status}
              onChange={(val) =>
                setFilters((prev) => ({ ...prev, status: val }))
              }
            />

            <CustomDatePicker
              label={t("reservation_date", { defaultValue: "Reservation Date" })}
              value={filters.date}
              onChange={(val) => setFilters((prev) => ({ ...prev, date: val }))}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 xl:ml-16 mb-0.5">
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-[13px] font-bold text-slate-600 transition hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4" />
              {t("reset", { defaultValue: "Reset" })}
            </button>
            {isAdmin && (
              <button
                onClick={() => generateBookingPDF(bookings)}
                disabled={bookings.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-white/5 border-2 border-transparent px-4 py-2 text-[13px] font-bold text-slate-600 dark:text-slate-400 transition-all hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white shadow-sm active:scale-95 disabled:opacity-50"
              >
                <ClipboardList className="h-4 w-4" />
                {t("download_pdf", { defaultValue: "Download PDF" })}
              </button>
            )}
            {(isUser || isLecturer || isAdmin) && (
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-[13px] font-bold text-white shadow-xl shadow-blue-600/20 transition hover:bg-blue-500 whitespace-nowrap"
                onClick={() => {
                  setEditingBookingId(null);
                  setInitialBookingData(null);
                  setBookingModalOpen(true);
                }}
              >
                <Plus className="h-4 w-4" /> {t("new_booking", { defaultValue: "New Booking" })}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Bookings Table Section */}
      <section
        className={`rounded-xl bg-white p-5 sm:p-6 shadow-sm border border-slate-200 dark:bg-slate-900/50 dark:border-white/5 transition-all duration-300 ${isLoading ? "opacity-70 pointer-events-none" : "opacity-100"}`}
      >
        <div className="overflow-x-auto -mx-2 scrollbar-hide">
          <table className="min-w-full border-separate border-spacing-y-2">
            <thead>
              <tr className="text-left">
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-[20%]">
                  {t("resource", { defaultValue: "Resource" })}
                </th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-[15%]">
                  {t("schedule", { defaultValue: "Schedule" })}
                </th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-[15%]">
                  {t("submitted", { defaultValue: "Submitted" })}
                </th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-[20%]">
                  {t("purpose", { defaultValue: "Purpose" })}
                </th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-[10%]">
                  {t("status", { defaultValue: "Status" })}
                </th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center w-[270px] min-w-[270px]">
                  {t("actions", { defaultValue: "Actions" })}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y-0">
              {sortedBookings.map((booking) => {
                const isPending = booking.status === "PENDING";

                // Check if booking has started
                const hasStarted = (() => {
                  try {
                    let y, m, d, h, min;
                    if (Array.isArray(booking.bookingDate))
                      [y, m, d] = booking.bookingDate;
                    else [y, m, d] = booking.bookingDate.split("-").map(Number);

                    if (Array.isArray(booking.startTime))
                      [h, min] = booking.startTime;
                    else [h, min] = booking.startTime.split(":").map(Number);

                    const startDateTime = new Date(y, m - 1, d, h, min);
                    return startDateTime <= currentTime;
                  } catch (e) {
                    return false;
                  }
                })();

                const isEditable =
                  (booking.status === "PENDING" ||
                    booking.status === "APPROVED") &&
                  !hasStarted;
                const isCancellable =
                  (booking.status === "PENDING" ||
                    booking.status === "APPROVED") &&
                  !hasStarted;
                const isHighlighted = highlightId != null && String(highlightId) === String(booking.id);

                return (
                  <tr
                    key={booking.id}
                    ref={isHighlighted ? highlightedRowRef : null}
                    className={`group transition-all duration-500 relative bg-white dark:bg-slate-900/50 ${
                      isHighlighted
                        ? "z-20 scale-[1.01]"
                        : "hover:z-10 hover:scale-[1.005]"
                    }`}
                  >
                    <td
                      className={`px-4 py-3 rounded-l-xl border-y border-l transition-all duration-500 ${
                        isHighlighted
                          ? "border-blue-500"
                          : "border-y-slate-100 border-l-slate-100 dark:border-y-white/5 dark:border-l-white/5 group-hover:border-y-blue-500 group-hover:border-l-blue-500"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-500 ${
                            isHighlighted
                              ? "bg-blue-100 dark:bg-blue-900/40 scale-110"
                              : "bg-slate-100 dark:bg-slate-800 group-hover:scale-110"
                          }`}
                        >
                          <MapPin
                            className={`h-4 w-4 ${isHighlighted ? "text-blue-600" : "text-slate-500"}`}
                          />
                        </div>
                        <div className="flex flex-col min-w-[120px]">
                          <span
                            className={`text-sm font-bold tracking-tight ${isHighlighted ? "text-blue-700 dark:text-blue-400" : "text-slate-900 dark:text-slate-200"}`}
                          >
                            {booking.resourceName}
                          </span>
                          {primaryRole !== "LECTURER" && (
                            <div className="flex items-center gap-2 mt-1">
                              {booking.userProfilePicture ? (
                                <img
                                  src={getAssetUrl(booking.userProfilePicture)}
                                  className="h-5 w-5 rounded-md object-cover ring-1 ring-slate-200 dark:ring-white/10 shadow-sm"
                                  alt={booking.userName}
                                />
                              ) : (
                                <div
                                  className={`h-5 w-5 rounded-md ${getAvatarColor(booking.userName)} flex items-center justify-center text-white text-[8px] font-black`}
                                >
                                  {booking.userName?.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <span className="text-[9px] font-bold text-blue-500/70 uppercase tracking-widest whitespace-nowrap">
                                {booking.userName}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td
                      className={`px-4 py-3 border-y border-x-0 transition-all duration-500 -ml-[1px] ${
                        isHighlighted
                          ? "border-blue-500"
                          : "border-y-slate-100 dark:border-y-white/5 group-hover:border-y-blue-500"
                      }`}
                    >
                      <div className="flex flex-col gap-0.5 min-w-[150px]">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 whitespace-nowrap">
                          <Calendar
                            className={`h-3 w-3 ${isHighlighted ? "text-blue-500" : "text-slate-400"}`}
                          />{" "}
                          {booking.bookingDate}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1 whitespace-nowrap">
                          <Clock className="h-2.5 w-2.5" /> {booking.startTime}{" "}
                          - {booking.endTime}
                        </span>
                      </div>
                    </td>
                    <td
                      className={`px-4 py-3 border-y border-x-0 transition-all duration-500 -ml-[1px] ${
                        isHighlighted
                          ? "border-blue-500"
                          : "border-y-slate-100 dark:border-y-white/5 group-hover:border-y-blue-500"
                      }`}
                    >
                      <div className="flex flex-col gap-0.5 min-w-[100px]">
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                          {formatDate(booking.createdAt, dateLocale)}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1 whitespace-nowrap">
                          <Clock className="h-2.5 w-2.5" />{" "}
                          {booking.createdAt
                            ? new Date(booking.createdAt).toLocaleTimeString(
                                dateLocale,
                                { hour: "2-digit", minute: "2-digit" },
                              )
                            : ""}
                        </span>
                      </div>
                    </td>
                    <td
                      className={`px-4 py-3 border-y border-x-0 transition-all duration-500 -ml-[1px] ${
                        isHighlighted
                          ? "border-blue-500"
                          : "border-y-slate-100 dark:border-y-white/5 group-hover:border-y-blue-500"
                      }`}
                    >
                      <p
                        className={`text-xs font-medium line-clamp-1 ${isHighlighted ? "text-slate-700 dark:text-slate-200" : "text-slate-600 dark:text-slate-400"}`}
                      >
                        {booking.purpose}
                      </p>
                    </td>
                    <td
                      className={`px-4 py-3 border-y border-x-0 transition-all duration-500 -ml-[1px] ${
                        isHighlighted
                          ? "border-blue-500"
                          : "border-y-slate-100 dark:border-y-white/5 group-hover:border-y-blue-500"
                      }`}
                    >
                      <span
                        className={`inline-flex items-center rounded-lg border px-2 py-1 text-[9px] font-black uppercase tracking-widest ${statusStyles[booking.status] || statusStyles.PENDING}`}
                      >
                        {t(booking.status.toLowerCase(), { defaultValue: booking.status })}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-3 border-y rounded-r-xl transition-all duration-500 relative w-[270px] min-w-[270px] ${
                        isHighlighted
                          ? "border-blue-500"
                          : "border-y-slate-100 border-r-slate-100 dark:border-y-white/5 dark:border-r-white/5 group-hover:border-y-blue-500 group-hover:border-r-blue-500"
                      }`}
                    >
                      <div className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 absolute inset-0 px-1">
                        {isAdmin && booking.userId !== user?.id ? (
                          <div className="flex flex-row items-center justify-center gap-1 w-full">
                            <button
                              disabled={!isPending}
                              onClick={() =>
                                handleDecision(booking.id, "approve")
                              }
                              className="table-action-btn text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-600 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              {t("approve", { defaultValue: "Approve" })}
                            </button>
                            <button
                              disabled={!isPending}
                              onClick={() =>
                                handleDecision(booking.id, "reject")
                              }
                              className="table-action-btn text-[9px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-600 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              {t("reject", { defaultValue: "Reject" })}
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-row items-center justify-center gap-1 w-full">
                            <button
                              disabled={
                                !isEditable ||
                                (booking.userId !== user?.id && !isAdmin)
                              }
                              onClick={async () => {
                                setEditingBookingId(booking.id);
                                setInitialBookingData({
                                  resourceId: booking.resourceId,
                                  bookingDate: booking.bookingDate,
                                  startTime: booking.startTime,
                                  endTime: booking.endTime,
                                  purpose: booking.purpose,
                                  capacity: booking.capacity || 1,
                                  // CRITICAL: Preserve shared session data during edit
                                  assignedBatch: booking.assignedBatch || "",
                                  lectureMaterials:
                                    booking.lectureMaterials || [],
                                  sessionDetails: booking.sessionDetails || "",
                                });
                                setBookingModalOpen(true);
                              }}
                              className={`table-action-btn text-[9px] font-black uppercase tracking-widest ${
                                !isEditable
                                  ? "bg-slate-100 text-slate-300 cursor-not-allowed opacity-50"
                                  : "bg-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white dark:bg-white/5 dark:text-slate-400 dark:hover:bg-blue-600 dark:hover:text-white"
                              }`}
                            >
                              {t("edit", { defaultValue: "Edit" })}
                            </button>
                            <button
                              disabled={
                                !isCancellable ||
                                (booking.userId !== user?.id && !isAdmin)
                              }
                              onClick={() => cancelBooking(booking.id)}
                              className={`table-action-btn text-[9px] font-black uppercase tracking-widest ${
                                !isCancellable
                                  ? "bg-rose-50 text-rose-300 cursor-not-allowed opacity-50"
                                  : "bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-600 dark:hover:text-white"
                              }`}
                            >
                              {t("cancel", { defaultValue: "Cancel" })}
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="group-hover:hidden flex items-center justify-center gap-1 text-slate-400 absolute inset-0 transition-opacity duration-300 px-1">
                        <span className="text-[9px] font-black uppercase tracking-widest">
                          {t("actions", { defaultValue: "Actions" })}
                        </span>
                        <MoreVertical className="h-4 w-4" />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {bookings.length === 0 && !isLoading && !hasError && (
                <tr>
                  <td colSpan={5} className="px-4 py-20 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center mb-6 dark:bg-white/5">
                        <Search className="h-10 w-10 text-slate-300" />
                      </div>
                      <h4 className="text-xl font-black text-slate-900 dark:text-white mb-2">
                        {t("no_data", { defaultValue: "No records found" })}
                      </h4>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        {t("adjust_filters_desc", { defaultValue: "Try adjusting your filters or search query" })}
                      </p>
                      <button
                        onClick={resetFilters}
                        className="mt-6 px-6 py-2 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest hover:bg-blue-500 transition-all"
                      >
                        {t("clear_all_filters", { defaultValue: "Clear All Filters" })}
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {hasError && !isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-20 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="h-20 w-20 rounded-[2rem] bg-rose-50 flex items-center justify-center mb-4 dark:bg-rose-900/20">
                        <XCircle className="h-10 w-10 text-rose-500" />
                      </div>
                      <h4 className="text-xl font-black text-slate-900 dark:text-white">
                        {t("connection_error", { defaultValue: "Connection Error" })}
                      </h4>
                      <p className="text-sm font-medium text-slate-500 mt-1 mb-6">
                        {t("err_fetch_data_desc", { defaultValue: "We encountered a temporary server error while fetching your data." })}
                      </p>
                      <button
                        onClick={() =>
                          queryClient.invalidateQueries({
                            queryKey: ["bookings"],
                          })
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                      >
                        <RefreshCw className="h-4 w-4" /> {t("retry_connection", { defaultValue: "Retry Connection" })}
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Booking Modal Overhaul */}
      <BookingFormModal
        isOpen={bookingModalOpen}
        onClose={() => {
          setBookingModalOpen(false);
          setEditingBookingId(null);
        }}
        editingBookingId={editingBookingId}
        initialData={initialBookingData}
        resources={resources}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["bookings"] });
          queryClient.invalidateQueries({ queryKey: ["bookings-summary"] });
          queryClient.invalidateQueries({ queryKey: ["my-sessions"] });
        }}
      />

      <ShareSessionModal
        isOpen={shareModalOpen}
        onClose={() => {
          setShareModalOpen(false);
          setSelectedBookingForShare(null);
        }}
        booking={selectedBookingForShare}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["bookings"] });
          queryClient.invalidateQueries({ queryKey: ["bookings-summary"] });
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          queryClient.invalidateQueries({ queryKey: ["my-sessions"] });
        }}
      />

      {/* Floating Clock Overlay for Modal (Must be after Modal in DOM and higher z-index to avoid blur) */}
      {bookingModalOpen && (
        <div className="fixed top-3 right-3 z-[10000] hidden md:block pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-2xl backdrop-blur-md flex flex-col items-end gap-2">
            <div className="flex items-center gap-2.5">
              <Clock className="h-4 w-4 text-blue-400" />
              <span className="text-lg font-black text-white tabular-nums tracking-tight">
                {currentTime.toLocaleTimeString(dateLocale, {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: true,
                })}
              </span>
            </div>
            <div className="flex items-center gap-2 opacity-80">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                {currentTime.toLocaleDateString(
                  dateLocale,
                  {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }
                )}
              </span>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default BookingsPage;
