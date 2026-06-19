import React, { useMemo, useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import {
  BellRing,
  Plus,
  Trash2,
  Calendar,
  User as UserIcon,
  Search,
  Filter,
  RefreshCw,
  Megaphone,
  AlertTriangle,
  Info,
  Compass,
  Pencil,
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import { normalizeRoles, useAuth } from "../context/AuthContext";
import {
  getPrimaryRole,
  getRoleAccent,
  getSidebarItems,
} from "../utils/dashboardConfig";
import { useSearch } from "../context/SearchContext";
import { useAlert } from "../context/AlertContext";
import Modal from "../components/Modal";
import CustomDropdown from "../components/CustomDropdown";
import RichTextEditor from "../components/RichTextEditor";
import { useTranslation } from "react-i18next";

const typeStyles = {
  URGENT:
    "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-500/20",
  INFO: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-500/20",
  HOLIDAY:
    "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-500/20",
};

const typeIcons = {
  URGENT: AlertTriangle,
  INFO: Info,
  HOLIDAY: Compass,
};

const AnnouncementsPage = () => {
  const { user, logout } = useAuth();
  const { searchQuery } = useSearch();
  const { showAlert } = useAlert();
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith("si") ? "si-LK" : i18n.language?.startsWith("ta") ? "ta-LK" : "en-US";
  const roles = normalizeRoles(user?.roles);
  const isAdmin = roles.includes("ADMIN");
  const isLecturer = roles.includes("LECTURER");
  const primaryRole = getPrimaryRole(roles);
  const accent = getRoleAccent(primaryRole);
  const sidebarItems = useMemo(
    () => getSidebarItems(primaryRole),
    [primaryRole],
  );

  const targetAudienceOptions = useMemo(() => {
    const baseOpts = [
      { value: "ALL", label: t("all_users", { defaultValue: "All Users" }) },
      { value: "STUDENTS", label: t("students", { defaultValue: "Students" }) },
      { value: "LECTURERS", label: t("lecturers", { defaultValue: "Lecturers" }) },
      { value: "TECHNICIANS", label: t("technicians", { defaultValue: "Technicians" }) },
      { value: "ADMINS", label: t("admins", { defaultValue: "Admins" }) },
    ];
    if (isAdmin) return baseOpts.filter((o) => o.value !== "ADMINS");
    if (isLecturer) return baseOpts.filter((o) => o.value !== "LECTURERS");
    return baseOpts;
  }, [isAdmin, isLecturer, t]);

  const location = useLocation();
  const [highlightId, setHighlightId] = useState(null);
  const highlightedRef = useRef(null);

  const queryClient = useQueryClient();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [filterType, setFilterType] = useState("");
  const [editingAnnouncementId, setEditingAnnouncementId] = useState(null);

  const [form, setForm] = useState({
    title: "",
    message: "",
    type: "INFO",
    targetAudience: "ALL",
    batchSemester: "ALL",
  });

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const res = await api.get("/announcements");
      return res.data || [];
    },
    enabled: !!user,
  });

  // Automatically mark unread visible announcements as read
  useEffect(() => {
    if (announcements && announcements.length > 0 && user) {
      announcements.forEach((notice) => {
        if (notice.recipients && notice.recipients.length > 0) {
          const recipientRecord = notice.recipients.find(
            (r) => r.userId === user.id,
          );
          if (recipientRecord && !recipientRecord.read) {
            api.patch(`/announcements/${notice.id}/read`).then(() => {
              queryClient.invalidateQueries({
                queryKey: ["sidebar-announcements"],
              });
              queryClient.invalidateQueries({ queryKey: ["announcements"] });
            });
          }
        }
      });
    }
  }, [announcements, user, queryClient]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get("highlight");
    if (id) {
      setHighlightId(id);
      const timer = setTimeout(() => {
        setHighlightId(null);
      }, 4000);
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
  }, [highlightId, announcements]);

  const createMutation = useMutation({
    mutationFn: async (newNotice) => {
      return await api.post("/announcements", newNotice);
    },
    onSuccess: () => {
      showAlert("success", t("success_announcement_published", { defaultValue: "Announcement published successfully!" }));
      setCreateModalOpen(false);
      setForm({
        title: "",
        message: "",
        type: "INFO",
        targetAudience: "ALL",
        batchSemester: "ALL",
      });
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-announcements"] });
    },
    onError: (err) => {
      showAlert(
        "error",
        err?.response?.data?.message || t("err_post_announcement", { defaultValue: "Failed to post announcement." }),
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, announcement }) => {
      return await api.put(`/announcements/${id}`, announcement);
    },
    onSuccess: () => {
      showAlert("success", t("success_announcement_updated", { defaultValue: "Announcement updated successfully!" }));
      setCreateModalOpen(false);
      setEditingAnnouncementId(null);
      setForm({
        title: "",
        message: "",
        type: "INFO",
        targetAudience: "ALL",
        batchSemester: "ALL",
      });
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-announcements"] });
    },
    onError: (err) => {
      showAlert(
        "error",
        err?.response?.data?.message || t("err_update_announcement", { defaultValue: "Failed to update announcement." }),
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/announcements/${id}`);
    },
    onSuccess: () => {
      showAlert("success", t("success_announcement_deleted", { defaultValue: "Announcement deleted successfully!" }));
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-announcements"] });
    },
    onError: (err) => {
      showAlert(
        "error",
        err?.response?.data?.message || t("err_delete_announcement", { defaultValue: "Failed to delete announcement." }),
      );
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const plainText = form.message.replace(/<[^>]*>/g, "").trim();
    if (!plainText) {
      showAlert("error", t("err_message_empty", { defaultValue: "Message cannot be empty." }));
      return;
    }
    if (editingAnnouncementId) {
      updateMutation.mutate({ id: editingAnnouncementId, announcement: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm(t("confirm_delete_announcement", { defaultValue: "Are you sure you want to delete this announcement?" }))) {
      deleteMutation.mutate(id);
    }
  };

  const handleEditClick = (notice) => {
    setEditingAnnouncementId(notice.id);
    setForm({
      title: notice.title || "",
      message: notice.message || "",
      type: notice.type || "INFO",
      targetAudience: notice.targetAudience || "ALL",
      batchSemester: notice.batchSemester || "ALL",
    });
    setCreateModalOpen(true);
  };

  const handleCloseModal = () => {
    setCreateModalOpen(false);
    setEditingAnnouncementId(null);
    setForm({
      title: "",
      message: "",
      type: "INFO",
      targetAudience: "ALL",
      batchSemester: "ALL",
    });
  };

  const typeCounts = useMemo(() => {
    const counts = { INFO: 0, URGENT: 0, HOLIDAY: 0, total: 0 };
    announcements.forEach((a) => {
      counts.total++;
      if (counts[a.type] !== undefined) {
        counts[a.type]++;
      }
    });
    return counts;
  }, [announcements]);

  const filteredAnnouncements = useMemo(() => {
    let result = announcements;

    if (filterType) {
      result = result.filter((a) => a.type === filterType);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.message
            .toLowerCase()
            .replace(/<[^>]*>/g, "")
            .includes(q) ||
          a.postedBy.toLowerCase().includes(q),
      );
    }

    return result;
  }, [announcements, filterType, searchQuery]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      const day = d.getDate();
      const month = t(`month_${d.getMonth()}`, { defaultValue: d.toLocaleString("en-US", { month: "short" }) });
      const year = d.getFullYear();
      
      let hours = d.getHours();
      const minutes = d.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? t("pm", { defaultValue: "PM" }) : t("am", { defaultValue: "AM" });
      hours = hours % 12;
      hours = hours ? hours : 12;
      const formattedTime = `${hours.toString().padStart(2, "0")}:${minutes} ${ampm}`;
      
      const cleanMonth = month.endsWith(".") ? month.slice(0, -1) : month;
      return t("announcement_date_format", {
        defaultValue: "{{month}} {{day}}, {{year}}, {{time}}",
        month: cleanMonth,
        day,
        year,
        time: formattedTime
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <DashboardLayout
      user={user}
      logout={logout}
      title={t("notice_board", { defaultValue: "Notice Board" })}
      subtitle={t("notice_board_sub", { defaultValue: "Urgent notices, holiday alerts, and campus announcements" })}
      items={sidebarItems}
      displayRole={primaryRole}
      {...accent}
    >
      <div className="space-y-8 animate-reveal">
        {/* Filters and Actions */}
        <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-200 dark:bg-slate-900/50 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="w-full md:w-[240px]">
            <CustomDropdown
              label={t("type", { defaultValue: "Type" })}
              icon={Filter}
              options={[
                { value: "", label: t("all_notices", { defaultValue: "All Notices" }), count: typeCounts.total },
                { value: "INFO", label: t("general_info", { defaultValue: "General Info" }), count: typeCounts.INFO },
                { value: "URGENT", label: t("urgent_alerts", { defaultValue: "Urgent Alerts" }), count: typeCounts.URGENT },
                { value: "HOLIDAY", label: t("holidays", { defaultValue: "Holidays" }), count: typeCounts.HOLIDAY },
              ]}
              value={filterType}
              onChange={setFilterType}
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            {filterType && (
              <button
                onClick={() => setFilterType("")}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-[13px] font-bold text-slate-600 transition hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10"
              >
                <RefreshCw className="h-4 w-4" /> {t("reset", { defaultValue: "Reset" })}
              </button>
            )}
            {(isAdmin || isLecturer) && (
              <button
                onClick={() => setCreateModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-[13px] font-bold text-white shadow-xl shadow-blue-600/20 transition hover:bg-blue-500 whitespace-nowrap"
              >
                <Plus className="h-4 w-4" /> {t("post_announcement", { defaultValue: "Post Announcement" })}
              </button>
            )}
          </div>
        </div>

        {/* Notices Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {isLoading ? (
            <div className="col-span-full text-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                {t("loading", { defaultValue: "Loading..." })}
              </p>
            </div>
          ) : filteredAnnouncements.length === 0 ? (
            <div className="col-span-full py-20 text-center rounded-xl bg-white border-2 border-dashed border-slate-200 dark:bg-slate-900/20 dark:border-white/5">
              <Megaphone className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h4 className="text-xl font-black text-slate-900 dark:text-white mb-2">
                {t("no_announcements", { defaultValue: "No Announcements" })}
              </h4>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {t("no_announcements_desc", { defaultValue: "There are no notices to display at the moment." })}
              </p>
            </div>
          ) : (
            filteredAnnouncements.map((notice) => {
              const Icon = typeIcons[notice.type] || Info;
              return (
                <div
                  key={notice.id}
                  ref={highlightId === notice.id ? highlightedRef : null}
                  className={`rounded-xl border p-6 shadow-sm flex flex-col justify-between hover:scale-[1.01] transition-all duration-500 relative group ${
                    highlightId === notice.id
                      ? "border-blue-500 ring-4 ring-blue-500/20 shadow-2xl scale-[1.02] bg-blue-50/50 dark:bg-blue-900/20 z-10"
                      : "border-slate-200 bg-white dark:border-white/5 dark:bg-slate-900/50"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${typeStyles[notice.type] || typeStyles.INFO}`}
                      >
                        {t(notice.type.toLowerCase(), { defaultValue: notice.type })}
                      </span>
                      {(isAdmin || isLecturer) && (
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEditClick(notice)}
                            className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                            title={t("edit_notice", { defaultValue: "Edit notice" })}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(notice.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                            title={t("delete_notice", { defaultValue: "Delete notice" })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                      {notice.title}
                    </h3>
                    <div
                      className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6 font-medium html-content prose prose-sm dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: notice.message }}
                    />
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-white/5 pt-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <UserIcon className="h-3.5 w-3.5" />
                      <span>
                        {notice.postedBy} ({t(notice.postedByRole.toLowerCase(), { defaultValue: notice.postedByRole })})
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formatDate(notice.createdAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Post Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={handleCloseModal}
        title={
          editingAnnouncementId
            ? t("update_announcement", { defaultValue: "Update Announcement" })
            : t("post_new_announcement", { defaultValue: "Post New Announcement" })
        }
        subtitle={
          editingAnnouncementId
            ? t("modify_announcement_details", { defaultValue: "Modify announcement details" })
            : t("publish_notice_campus_board", { defaultValue: "Publish a notice to the campus board" })
        }
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="rounded-xl px-6 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
              onClick={handleCloseModal}
            >
              {t("discard", { defaultValue: "Discard" })}
            </button>
            <button
              form="create-announcement-form"
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-xl shadow-blue-600/20 transition hover:bg-blue-500 active:scale-95"
            >
              {editingAnnouncementId ? t("update_announcement", { defaultValue: "Update Announcement" }) : t("publish_notice", { defaultValue: "Publish Notice" })}
            </button>
          </div>
        }
      >
        <form
          id="create-announcement-form"
          onSubmit={handleSubmit}
          className="space-y-6 py-4"
        >
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">
              {t("title", { defaultValue: "Title" })}
            </label>
            <input
              className="w-full rounded-xl bg-slate-50 border-2 border-slate-100 px-5 py-3.5 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all dark:bg-slate-800/50 dark:border-white/5 dark:text-white"
              placeholder={t("placeholder_notice_topic", { defaultValue: "Notice topic/heading" })}
              value={form.title}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, title: e.target.value }))
              }
              required
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <CustomDropdown
              label={t("notice_type", { defaultValue: "Notice Type" })}
              padding="px-5 py-3.5"
              options={[
                { value: "INFO", label: t("general_info", { defaultValue: "General Info" }) },
                { value: "URGENT", label: t("urgent_alert", { defaultValue: "Urgent Alert" }) },
                { value: "HOLIDAY", label: t("holiday_notice", { defaultValue: "Holiday notice" }) },
              ]}
              value={form.type}
              onChange={(val) => setForm((prev) => ({ ...prev, type: val }))}
            />

            <CustomDropdown
              label={t("target_audience", { defaultValue: "Target Audience" })}
              padding="px-5 py-3.5"
              options={targetAudienceOptions}
              value={form.targetAudience}
              onChange={(val) =>
                setForm((prev) => ({ ...prev, targetAudience: val }))
              }
            />
          </div>

          {form.targetAudience === "STUDENTS" && (
            <div className="space-y-2">
              <CustomDropdown
                label={t("batch_semester", { defaultValue: "Batch / Semester" })}
                padding="px-5 py-3.5"
                options={[
                  { value: "ALL", label: t("all_students", { defaultValue: "All Students" }) },
                  { value: "Y1S1", label: "Year 1 - Semester 1" },
                  { value: "Y1S2", label: "Year 1 - Semester 2" },
                  { value: "Y2S1", label: "Year 2 - Semester 1" },
                  { value: "Y2S2", label: "Year 2 - Semester 2" },
                  { value: "Y3S1", label: "Year 3 - Semester 1" },
                  { value: "Y3S2", label: "Year 3 - Semester 2" },
                  { value: "Y4S1", label: "Year 4 - Semester 1" },
                  { value: "Y4S2", label: "Year 4 - Semester 2" },
                ]}
                value={form.batchSemester || "ALL"}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, batchSemester: val }))
                }
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">
              {t("message", { defaultValue: "Message" })}
            </label>
            <RichTextEditor
              value={form.message}
              onChange={(val) => setForm((prev) => ({ ...prev, message: val }))}
            />
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
};

export default AnnouncementsPage;
