import React, { useEffect, useMemo, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { Bell, Clock, Trash2, CheckCheck, Search } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import { normalizeRoles, useAuth } from "../context/AuthContext";
import {
  getPrimaryRole,
  getRoleAccent,
  getSidebarItems,
} from "../utils/dashboardConfig";
import { useAlert } from "../context/AlertContext";
import { useSearch } from "../context/SearchContext";
import { formatDate } from "../utils/dateUtils";
import { useTranslation } from "react-i18next";

const renderMessage = (msg) => {
  if (!msg) return "";
  const parts = msg.split(/\*\*([^*]+)\*\*/g);
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return (
        <strong key={index} className="font-extrabold text-slate-900 dark:text-white">
          {part}
        </strong>
      );
    }
    return part;
  });
};

const NotificationsPage = () => {
  const { user, logout, refreshUnreadCount } = useAuth();
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === "si" ? "si-LK" : i18n.language === "ta" ? "ta-LK" : "en-US";
  const roles = normalizeRoles(user?.roles);
  const primaryRole = getPrimaryRole(roles);
  const accent = getRoleAccent(primaryRole);
  const sidebarItems = useMemo(
    () => getSidebarItems(primaryRole),
    [primaryRole],
  );

  const { searchQuery } = useSearch();
  const { showAlert } = useAlert();
  const [highlightId, setHighlightId] = useState(null);
  const highlightedRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const isRead = (item) => item.status === "READ" || item.read === true;

  // Query
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await api.get("/notifications", {
        params: { page: 0, size: 100 },
      });
      const data = res.data?.content || [];
      console.log("Updated notifications:", data);
      return data;
    },
    enabled: !!user,
    placeholderData: keepPreviousData,
    refetchInterval: 2000,
  });

  const filteredNotifications = useMemo(() => {
    // First filter by user preferences
    const settings = user?.notificationSettings || { all: true, booking: true, ticket: true, lecture: true };
    
    let list = notifications.filter(n => {
      const title = (n.title || "").toLowerCase();
      const type = n.referenceType || "";
      const nType = n.type || "";

      // Filter Lectures
      if (settings.lecture === false && (nType.startsWith("LECTURE") || title.includes("lecture") || title.includes("materials"))) return false;
      
      // Filter Bookings
      if (!settings.booking && (type === "BOOKING" || title.includes("booking") || title.includes("reservation"))) return false;

      // Filter Tickets
      if (!settings.ticket && (type === "TICKET" || title.includes("ticket") || title.includes("incident"))) return false;

      return true;
    });

    // Then filter by search query
    if (!searchQuery) return list;
    const lowerQuery = searchQuery.toLowerCase();
    return list.filter(n => 
      n.title?.toLowerCase().includes(lowerQuery) || 
      n.message?.toLowerCase().includes(lowerQuery)
    );
  }, [notifications, searchQuery, user?.notificationSettings]);

  const unreadNotifications = useMemo(
    () => filteredNotifications.filter((n) => !isRead(n)),
    [filteredNotifications]
  );
  
  const readNotifications = useMemo(
    () => filteredNotifications.filter((n) => isRead(n)),
    [filteredNotifications]
  );

  // Mutations
  const markReadMutation = useMutation({
    mutationFn: async (id) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      const previousNotifications = queryClient.getQueryData(["notifications"]);
      
      if (previousNotifications) {
        queryClient.setQueryData(["notifications"], (old) => 
          old.map(n => n.id === id ? { ...n, status: "READ", read: true } : n)
        );
      }
      return { previousNotifications };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      refreshUnreadCount();
    },
    onError: (err, _, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(["notifications"], context.previousNotifications);
      }
      showAlert("error", err?.response?.data?.message || t("err_notification_update", { defaultValue: "Failed to update notification." }));
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.patch("/notifications/read-all");
    },
    onMutate: async () => {
      showAlert("success", t("msg_notifications_marked_read", { defaultValue: "All notifications marked as read." }));
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      const previousNotifications = queryClient.getQueryData(["notifications"]);
      
      if (previousNotifications) {
        queryClient.setQueryData(["notifications"], (old) => 
          old.map(n => ({ ...n, status: "READ", read: true }))
        );
      }
      return { previousNotifications };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      refreshUnreadCount();
    },
    onError: (err, _, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(["notifications"], context.previousNotifications);
      }
      showAlert("error", err?.response?.data?.message || t("err_notifications_update", { defaultValue: "Failed to update notifications." }));
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      await api.delete("/notifications");
    },
    onMutate: async () => {
      showAlert("success", t("msg_notifications_cleared", { defaultValue: "All notifications cleared." }));
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      const previousNotifications = queryClient.getQueryData(["notifications"]);
      
      queryClient.setQueryData(["notifications"], []);
      
      return { previousNotifications };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      refreshUnreadCount();
    },
    onError: (err, _, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(["notifications"], context.previousNotifications);
      }
      showAlert("error", err?.response?.data?.message || t("err_notifications_clear", { defaultValue: "Failed to clear notifications." }));
    },
  });

  const markRead = (id) => markReadMutation.mutate(id);
  const markAllRead = () => markAllReadMutation.mutate();
  const clearAll = () => {
    if (!window.confirm(t("confirm_clear_notifications", { defaultValue: "Are you sure you want to clear all notifications? This action cannot be undone." }))) return;
    clearAllMutation.mutate();
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get("highlight");
    if (id) {
      setHighlightId(id);
      const timer = setTimeout(() => setHighlightId(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [location.search]);

  useEffect(() => {
    if (highlightId && highlightedRef.current) {
      highlightedRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightId, notifications]);

  useEffect(() => {
    refreshUnreadCount();
  }, [notifications, refreshUnreadCount]);

  const handleNotificationClick = (item) => {
    if (!isRead(item)) {
      markRead(item.id);
    }

    if (item.type === "LECTURE_SHARED" || item.type === "LECTURE_UPDATED") {
      const targetId = item.lectureSessionId || item.bookingId || item.referenceId;
      if (targetId) {
        navigate(`/my-lectures?highlight=${targetId}&openDetails=true`);
        return;
      }
    }

    if (item.type === "ATTENDANCE_SUBMITTED" || item.type === "ATTENDANCE_RECORDED") {
      const targetId = item.lectureSessionId || item.bookingId || item.referenceId;
      if (targetId) {
        navigate(`/my-lectures?highlight=${targetId}&openAttendance=true`);
        return;
      }
    }

    if (item.referenceType && item.referenceId) {
      const pathMap = {
        BOOKING: "/bookings",
        LECTURE: "/my-lectures",
        TICKET: "/tickets",
        RESOURCE: "/resources",
        USER: "/users",
        ANNOUNCEMENT: "/announcements",
      };
      
      const basePath = pathMap[item.referenceType];
      if (basePath) {
        if (item.referenceType === "USER" && roles.includes("LECTURER")) {
          navigate(`/lecturer/students?highlight=${item.referenceId}`);
        } else {
          navigate(`${basePath}?highlight=${item.referenceId}`);
        }
      }
    }
  };

  const NotificationItem = ({ item }) => {
    const unread = !isRead(item);
    const getEnhancedContent = () => {
      const { title, message, referenceType, referenceId, type } = item;
      let displayMessage = message;
      let contextLine = "";

      // Format Reference Context
      if (referenceType && referenceId) {
        const shortId = referenceId.substring(0, 8).toUpperCase();
        contextLine = `${referenceType} • #${shortId}`;
      }

      // Explicit type handling with dynamic message parsing for translations
      if (type === "USER_REGISTERED") {
        const matchStudent = message?.match(/(.+?) has joined UniSphere - Smart University management System as a Student\./);
        const matchLecturer = message?.match(/(.+?) has been added UniSphere - Smart University management System as a Lecturer\./);
        const matchTechnician = message?.match(/(.+?) has been added UniSphere - Smart University management System as a Technician\./);
        const matchWelcome = message?.match(/Your account has been created successfully\. Please log in using the credentials sent to your email\./);
        const matchLegacy = message?.match(/A new student, (.+?), has registered and requires account validation\./);

        if (matchStudent) {
          displayMessage = t("msg_student_registered", { name: matchStudent[1], defaultValue: message });
        } else if (matchLecturer) {
          displayMessage = t("msg_lecturer_added", { name: matchLecturer[1], defaultValue: message });
        } else if (matchTechnician) {
          displayMessage = t("msg_technician_added", { name: matchTechnician[1], defaultValue: message });
        } else if (matchWelcome) {
          displayMessage = t("msg_welcome_staff", { defaultValue: message });
        } else if (matchLegacy) {
          displayMessage = t("msg_user_registered", { name: matchLegacy[1], defaultValue: message });
        }
      } else if (type === "TICKET_CREATED") {
        const match = message?.match(/(.+?) created a ticket in category (.+?)\./);
        if (match) {
          displayMessage = t("msg_ticket_created", { name: match[1], category: match[2], defaultValue: message });
        }
      } else if (type === "TICKET_UPDATED") {
        const match = message?.match(/Ticket #(.+?) was updated by (.+?)\./);
        if (match) {
          displayMessage = t("msg_ticket_updated", { id: match[1], name: match[2], defaultValue: message });
        }
      } else if (type === "TICKET_ASSIGNED") {
        const match = message?.match(/You have been assigned ticket #(.+?)\./);
        if (match) {
          displayMessage = t("msg_ticket_assigned", { id: match[1], defaultValue: message });
        }
      } else if (type === "TICKET_STATUS_UPDATED") {
        const matchAdmin = message?.match(/Ticket #(.+?) was updated to (.+?) by (.+?)\./);
        const matchUser = message?.match(/Ticket #(.+?) status changed to (.+?)\./);
        const matchCancel = message?.match(/(.+?) cancelled ticket #(.+?)\./);
        if (matchAdmin) {
          const statusKey = matchAdmin[2].toLowerCase().replace(" ", "_");
          displayMessage = t("msg_admin_status_updated", { id: matchAdmin[1], status: t(statusKey), name: matchAdmin[3], defaultValue: message });
        } else if (matchUser) {
          const statusKey = matchUser[2].toLowerCase().replace(" ", "_");
          displayMessage = t("msg_ticket_status_changed", { id: matchUser[1], status: t(statusKey), defaultValue: message });
        } else if (matchCancel) {
          displayMessage = t("msg_ticket_cancelled", { name: matchCancel[1], id: matchCancel[2], defaultValue: message });
        }
      } else if (type === "TICKET_COMMENT_ADDED") {
        const match = message?.match(/(.+?) commented on ticket #(.+?)\./);
        if (match) {
          displayMessage = t("msg_tech_new_comment", { name: match[1], id: match[2], defaultValue: message });
        }
      } else if (type === "BOOKING_CREATED") {
        const match = message?.match(/(.+?) created a booking request for (.+?)\./);
        if (match) {
          displayMessage = t("msg_booking_created", { name: match[1], resource: match[2], defaultValue: message });
        }
      } else if (type === "BOOKING_APPROVED") {
        const match = message?.match(/Your booking for (.+?) has been approved\./);
        if (match) {
          displayMessage = t("msg_booking_confirmed", { resource: match[1], defaultValue: message });
        }
      } else if (type === "BOOKING_REJECTED") {
        const match = message?.match(/Your booking for (.+?) was rejected\. Reason: (.+)/);
        if (match) {
          displayMessage = t("msg_booking_rejected", { resource: match[1], reason: match[2], defaultValue: message });
        }
      } else if (type === "BOOKING_CANCELLED") {
        const match = message?.match(/Booking cancelled by (.+?) for (.+?) on (.+?) at (.+?)\./);
        const matchSimple = message?.match(/Your booking for (.+?) has been cancelled\./);
        if (match) {
          displayMessage = t("msg_booking_cancelled", { name: match[1], resource: match[2], date: match[3], time: match[4], defaultValue: message });
        } else if (matchSimple) {
          displayMessage = t("msg_booking_cancelled_simple", { resource: matchSimple[1], defaultValue: message });
        }
      } else if (type === "LECTURE_SHARED" || type === "LECTURE_UPDATED") {
        const matchDoc = message?.match(/^Lecturer (.+?) shared a lecture session (.+?) scheduled on \*\*(.+?)\*\* at \*\*(.+?)\*\* in \*\*(.+?)\*\*\. The \*\*(.+?)\*\* was attached\.$/);
        const matchNoDoc = message?.match(/^Lecturer (.+?) shared a lecture session (.+?) scheduled on \*\*(.+?)\*\* at \*\*(.+?)\*\* in \*\*(.+?)\*\*\.$/);

        if (matchDoc) {
          displayMessage = t("msg_lecture_shared_doc_enhanced", {
            lecturerName: matchDoc[1],
            lectureName: matchDoc[2],
            date: matchDoc[3],
            time: matchDoc[4],
            location: matchDoc[5],
            documentName: matchDoc[6],
            defaultValue: message
          });
        } else if (matchNoDoc) {
          displayMessage = t("msg_lecture_shared_enhanced", {
            lecturerName: matchNoDoc[1],
            lectureName: matchNoDoc[2],
            date: matchNoDoc[3],
            time: matchNoDoc[4],
            location: matchNoDoc[5],
            defaultValue: message
          });
        } else {
          const matchLegacy = message?.match(/(.+?) is available for your batch/);
          const matchLegacyUpdate = message?.match(/(.+?) has been updated/);
          if (matchLegacy) {
            displayMessage = t("msg_lecture_shared", { purpose: matchLegacy[1], defaultValue: message });
          } else if (matchLegacyUpdate) {
            displayMessage = t("msg_lecture_updated", { purpose: matchLegacyUpdate[1], defaultValue: message });
          }
        }
      } else if (type === "LECTURE_CANCELLED") {
        const match = message?.match(/(.+?) Lecture \((.+?)\) has been canceled/);
        if (match) {
          displayMessage = t("msg_lecture_cancelled", { purpose: match[1], defaultValue: message });
        }
      } else if (type === "STUDENT_BATCH_MATCH") {
        const match = message?.match(/Student (.+?) has joined your batch \((.+?)\)/);
        if (match) {
          displayMessage = t("msg_student_batch_match", { name: match[1], batch: match[2], defaultValue: message });
        }
      } else if (type === "ATTENDANCE_RECORDED" || type === "ATTENDANCE_SUBMITTED") {
        const matchAttendance = message?.match(/^(.+?) has marked attendance for (.+?) session scheduled on (.+?) at (.+?)\.$/);
        if (matchAttendance) {
          displayMessage = t("msg_attendance_submitted_enhanced", {
            studentName: matchAttendance[1],
            lectureName: matchAttendance[2],
            date: matchAttendance[3],
            time: matchAttendance[4],
            defaultValue: message
          });
        } else if (message?.includes("barcode match failed")) {
          displayMessage = t("msg_attendance_match_error", { defaultValue: message });
        }
      } else if (type === "ANNOUNCEMENT_PUBLISHED") {
        displayMessage = message;
      }
      // Role-Based Message Enhancement Fallbacks (if type was not explicitly handled above)
      else if (primaryRole === "USER" || primaryRole === "LECTURER") {
        if (title?.includes("New incident") || title?.includes("Ticket created")) {
          const match = message?.match(/(.+?) created a ticket in category (.+?)\./);
          if (match) {
            displayMessage = t("msg_ticket_created", { name: match[1], category: match[2], defaultValue: message });
          } else {
            displayMessage = message;
          }
        } else if (title?.includes("status") || title?.includes("update")) {
          const matchAdmin = message?.match(/Ticket #(.+?) was updated to (.+?) by (.+?)\./);
          const matchUser = message?.match(/Ticket #(.+?) status changed to (.+?)\./);
          const matchCancel = message?.match(/(.+?) cancelled ticket #(.+?)\./);
          const matchUpdate = message?.match(/Ticket #(.+?) was updated by (.+?)\./);
          
          if (matchAdmin) {
            const statusKey = matchAdmin[2].toLowerCase().replace(" ", "_");
            displayMessage = t("msg_admin_status_updated", { id: matchAdmin[1], status: t(statusKey), name: matchAdmin[3], defaultValue: message });
          } else if (matchUser) {
            const statusKey = matchUser[2].toLowerCase().replace(" ", "_");
            displayMessage = t("msg_ticket_status_changed", { id: matchUser[1], status: t(statusKey), defaultValue: message });
          } else if (matchCancel) {
            displayMessage = t("msg_ticket_cancelled", { name: matchCancel[1], id: matchCancel[2], defaultValue: message });
          } else if (matchUpdate) {
            displayMessage = t("msg_ticket_updated", { id: matchUpdate[1], name: matchUpdate[2], defaultValue: message });
          } else {
            displayMessage = message;
          }
        } else if (title?.toLowerCase().includes("lecture") || title?.toLowerCase().includes("materials")) {
          displayMessage = message;
        } else if (title?.includes("booking") || title?.includes("reservation")) {
          const matchApprove = message?.match(/Your booking for (.+?) has been approved\./);
          const matchReject = message?.match(/Your booking for (.+?) was rejected\. Reason: (.+)/);
          const matchCancel = message?.match(/Booking cancelled by (.+?) for (.+?) on (.+?) at (.+?)\./);
          if (matchApprove) {
            displayMessage = t("msg_booking_confirmed", { resource: matchApprove[1], defaultValue: message });
          } else if (matchReject) {
            displayMessage = t("msg_booking_rejected", { resource: matchReject[1], reason: matchReject[2], defaultValue: message });
          } else if (matchCancel) {
            displayMessage = t("msg_booking_cancelled", { name: matchCancel[1], resource: matchCancel[2], date: matchCancel[3], time: matchCancel[4], defaultValue: message });
          } else {
            displayMessage = message;
          }
        }
      } else if (primaryRole === "ADMIN") {
        if (title?.includes("New incident")) {
          const match = message?.match(/(.+?) created a ticket in category (.+?)\./);
          if (match) {
            displayMessage = t("msg_admin_new_ticket", { name: match[1], category: match[2], defaultValue: message });
          } else {
            displayMessage = message;
          }
        } else if (title?.includes("updated") || title?.includes("status")) {
          const matchAdmin = message?.match(/Ticket #(.+?) was updated to (.+?) by (.+?)\./);
          if (matchAdmin) {
            const statusKey = matchAdmin[2].toLowerCase().replace(" ", "_");
            displayMessage = t("msg_admin_status_updated", { id: matchAdmin[1], status: t(statusKey), name: matchAdmin[3], defaultValue: message });
          } else {
            displayMessage = message;
          }
        }
      } else if (primaryRole === "TECHNICIAN") {
        if (title?.includes("assigned")) {
          const match = message?.match(/You have been assigned ticket #(.+?)\./);
          if (match) {
            displayMessage = t("msg_tech_ticket_assigned", { id: match[1], defaultValue: message });
          } else {
            displayMessage = message;
          }
        } else if (title?.includes("comment") || title?.includes("message")) {
          const match = message?.match(/(.+?) commented on ticket #(.+?)\./);
          if (match) {
            displayMessage = t("msg_tech_new_comment", { name: match[1], id: match[2], defaultValue: message });
          } else {
            displayMessage = message;
          }
        }
      }

      return { displayMessage, contextLine };
    };

    const { displayMessage, contextLine } = getEnhancedContent();

    const formatTimestamp = (dateStr) => {
      if (!dateStr) return "";
      try {
        const date = new Date(dateStr);
        const timePart = date.toLocaleTimeString(dateLocale, {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
        return `${formatDate(dateStr, dateLocale)} • ${timePart}`;
      } catch (e) {
        return dateStr;
      }
    };

    return (
      <article
        key={item.id}
        ref={highlightId === item.id ? highlightedRef : null}
        onClick={() => handleNotificationClick(item)}
        className={`group relative cursor-pointer rounded-xl border p-4 shadow-sm transition-all duration-300 hover:scale-[1.01] hover:z-10 hover:shadow-xl hover:shadow-blue-500/10 ${
          highlightId === item.id 
            ? "border-blue-500 ring-4 ring-blue-500/20 scale-[1.01] bg-blue-50/50 dark:bg-blue-900/20"
            : !unread
              ? "border-slate-100 bg-white/40 dark:border-white/5 dark:bg-slate-900/40 opacity-75"
              : "border-blue-100 bg-blue-50/50 dark:border-blue-500/20 dark:bg-blue-900/20 shadow-blue-500/5"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
              unread 
                ? "bg-blue-600 text-white" 
                : "bg-slate-100 text-slate-400 dark:bg-slate-800"
            }`}>
              {unread ? <Bell className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className={`text-sm font-extrabold tracking-tight transition-colors ${
                  unread ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400"
                }`}>
                  {t(item.title)}
                </h3>
                {unread && (
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse shadow-[0_0_8px_rgba(37,99,235,0.6)]" />
                )}
              </div>
              <p className={`mt-0.5 text-xs font-medium leading-relaxed transition-colors ${
                unread ? "text-slate-700 dark:text-slate-300" : "text-slate-500 dark:text-slate-500"
              }`}>
                {renderMessage(displayMessage)}
              </p>
              {contextLine && (
                <p className="mt-1 text-[10px] font-bold text-blue-600/70 dark:text-blue-400/70 flex items-center gap-1">
                  {contextLine}
                </p>
              )}
              <p className="mt-1.5 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-600">
                {formatTimestamp(item.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unread && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  markRead(item.id);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-600 transition-all hover:bg-blue-600 hover:text-white dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-600 dark:hover:text-white"
                title="Mark as read"
              >
                <CheckCheck className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </article>
    );
  };

  if (!user) return null;

  return (
    <DashboardLayout
      user={user}
      logout={logout}
      title={t("notifications")}
      items={sidebarItems}
      displayRole={primaryRole}
      {...accent}
    >
      <section className="animate-fade-up rounded-xl bg-white/40 p-4 sm:p-5 shadow-sm backdrop-blur-md dark:bg-slate-900/40">
          <div className="flex items-center justify-end gap-2 mb-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-300/80 bg-white/50 px-3 py-1.5 text-[11px] font-bold text-slate-700 shadow-sm backdrop-blur transition-all duration-300 hover:bg-white hover:text-slate-900 hover:shadow-md dark:border-white/20 dark:bg-slate-800/50 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
              onClick={markAllRead}
            >
              {t("mark_all_read")}
            </button>
            <button
              type="button"
              className="group flex items-center gap-1.5 rounded-lg border border-rose-100 bg-rose-50/50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-rose-600 shadow-sm transition-all duration-300 hover:bg-rose-600 hover:text-white hover:shadow-lg hover:shadow-rose-600/20 dark:border-rose-500/20 dark:bg-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-600 dark:hover:text-white"
              onClick={clearAll}
            >
              <Trash2 className="h-3 w-3 transition-transform group-hover:rotate-12" />
              {t("clear_all")}
            </button>
          </div>
        </div>



        <div className="mt-8 space-y-10">
          {/* New Notifications Section */}
          {unreadNotifications.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-5 px-1">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.6)]" />
                <h3 className="text-sm font-black uppercase tracking-[0.25em] text-slate-400">
                  {t("new_activity")} <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] text-blue-600 dark:bg-blue-900/40">{unreadNotifications.length}</span>
                </h3>
              </div>
              
              <div className="grid gap-4">
                {unreadNotifications.map((item) => (
                  <NotificationItem key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}

          {/* Earlier Notifications Section */}
          {readNotifications.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-5 px-1">
                <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                <h3 className="text-sm font-black uppercase tracking-[0.25em] text-slate-400">
                  {t("earlier_history")}
                </h3>
              </div>
              
              <div className="grid gap-4">
                {readNotifications.map((item) => (
                  <NotificationItem key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}

          {/* Skeleton Loaders for Zero-Latency feel if prefetch hasn't finished */}
          {isLoading && (
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl border border-slate-100 bg-white/40 p-5 dark:border-white/5 dark:bg-slate-900/40">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-200 dark:bg-slate-800"></div>
                    <div className="flex-1 space-y-3 py-1">
                      <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-800"></div>
                      <div className="h-3 w-3/4 rounded bg-slate-200 dark:bg-slate-800"></div>
                      <div className="h-3 w-1/4 rounded bg-slate-200 dark:bg-slate-800"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && filteredNotifications.length === 0 && (
            <div className="py-20 text-center border-2 border-dashed border-slate-200/80 rounded-3xl bg-white/30 dark:bg-slate-900/30 dark:border-white/5 transition-all duration-500">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 mb-6 dark:bg-white/5">
                <Search className="h-10 w-10 text-slate-300 dark:text-slate-700" />
              </div>
              <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {searchQuery ? t("no_matches_found", { defaultValue: "No matches found" }) : t("no_notifications", { defaultValue: "No notifications available" })}
              </h4>
              <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400 max-w-[280px] mx-auto">
                {searchQuery 
                  ? t("search_no_match_notif", { query: searchQuery, defaultValue: `Your search for "${searchQuery}" didn't match any notifications.` })
                  : t("check_back_later_notif", { defaultValue: "Check back later for updates on your bookings and service requests." })}
              </p>
            </div>
          )}
        </div>
      </section>
    </DashboardLayout>
  );
};

export default NotificationsPage;
