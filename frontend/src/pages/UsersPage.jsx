import React, { useMemo, useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Users,
  Search,
  Filter,
  MoreVertical,
  Trash2,
  UserCheck,
  UserX,
  Eye,
  Calendar,
  Mail,
  ShieldCheck,
  RefreshCw,
  XCircle,
  ClipboardList,
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import { getAssetUrl, getAvatarColor } from "../utils/fileUtils";
import { formatDate } from "../utils/dateUtils";
import { useAuth } from "../context/AuthContext";
import { useSearch } from "../context/SearchContext";
import { useAlert } from "../context/AlertContext";
import {
  getRoleAccent,
  getSidebarItems,
  getPrimaryRole,
} from "../utils/dashboardConfig";
import CustomDropdown from "../components/CustomDropdown";
import Modal from "../components/Modal";
import { generateUserPDF } from "../utils/pdfGenerator";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

const statusStyles = {
  ACTIVE:
    "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-500/20",
  DISABLED:
    "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-500/20",
};

const UsersPage = () => {
  const { user, logout } = useAuth();
  const { searchQuery, setSearchQuery } = useSearch();
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === "si" ? "si-LK" : i18n.language === "ta" ? "ta-LK" : "en-US";

  const [selectedUser, setSelectedUser] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [highlightId, setHighlightId] = useState(null);
  const highlightedRowRef = useRef(null);

  const primaryRole = getPrimaryRole(user?.roles);
  const accent = getRoleAccent(primaryRole);
  const sidebarItems = useMemo(
    () => getSidebarItems(primaryRole),
    [primaryRole],
  );

  // Query Users
  const {
    data: responseData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["admin-users", searchQuery, highlightId],
    queryFn: async () => {
      const params = {
        search: searchQuery || "",
        roles: "USER", // Strictly students
        page: 0,
        size: highlightId ? 1000 : 100,
      };
      const res = await api.get("/admin/users", { params });
      return res.data;
    },
    enabled: !!user,
    placeholderData: keepPreviousData,
  });

  const data = responseData?.content || [];
  const counts = responseData?.counts || {};

  const userCount = counts.USER !== undefined ? counts.USER : data.length;

  // Handle Highlighting from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get("highlight");
    if (id) {
      setHighlightId(id);
      
      // Clean query params
      navigate(location.pathname, { replace: true });

      const timer = setTimeout(() => {
        setHighlightId(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [location.search, navigate, location.pathname]);

  // Reset search query if the highlighted record is not found in the filtered list
  useEffect(() => {
    if (highlightId && responseData) {
      const hasIt = data.some((u) => String(u.id) === String(highlightId));
      if (!hasIt && searchQuery) {
        setSearchQuery("");
      }
    }
  }, [highlightId, data, responseData, searchQuery, setSearchQuery]);

  useEffect(() => {
    if (highlightId && highlightedRowRef.current) {
      highlightedRowRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [highlightId, responseData]);

  // Mutations
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, enabled }) => {
      await api.put(`/admin/users/${id}/status`, { enabled: !enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      showAlert("success", t("msg_user_status_updated", { defaultValue: "User status updated successfully!" }));
    },
    onError: () => showAlert("error", t("err_user_status_update", { defaultValue: "Failed to update user status." })),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/admin/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      showAlert("success", t("msg_user_deleted", { defaultValue: "User deleted successfully!" }));
    },
    onError: () => showAlert("error", t("err_user_delete", { defaultValue: "Failed to delete user." })),
  });

  const handleToggleStatus = (targetUser) => {
    if (
      window.confirm(
        t("confirm_toggle_user", { action: targetUser.enabled ? t("disable") : t("enable"), defaultValue: `Are you sure you want to ${targetUser.enabled ? "disable" : "enable"} this user?` }),
      )
    ) {
      toggleStatusMutation.mutate({
        id: targetUser.id,
        enabled: targetUser.enabled,
      });
    }
  };

  const handleDelete = (id) => {
    if (
      window.confirm(
        t("confirm_delete_user", { defaultValue: "Are you sure you want to delete this user? This action cannot be undone." }),
      )
    ) {
      deleteMutation.mutate(id);
    }
  };

  if (!user) return null;

  return (
    <DashboardLayout
      user={user}
      logout={logout}
      title={t("students_management")}
      subtitle={t("manage_students_subtitle", { count: userCount, defaultValue: `Managing ${userCount} registered students in the system.` })}
      items={sidebarItems}
      displayRole={t("system_administrator", { defaultValue: "System Administrator" })}
      {...accent}
    >
      {/* Users Table Section */}
      {/* Users Table Section */}
      <section
        className={`rounded-xl bg-white p-5 sm:p-6 shadow-sm border border-slate-200 dark:bg-slate-900/50 dark:border-white/5 transition-all duration-300 ${isLoading ? "opacity-70 pointer-events-none" : "opacity-100"} mb-16`}
      >
        <div className="flex justify-end mb-6">
          <button
            onClick={() => generateUserPDF(data || [])}
            disabled={!data || data.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-white/5 border-2 border-transparent px-4 py-2 text-[13px] font-bold text-slate-600 dark:text-slate-400 transition-all hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white shadow-sm active:scale-95 disabled:opacity-50"
          >
            <ClipboardList className="h-4 w-4" />
            {t("download_pdf")}
          </button>
        </div>
        <div className="overflow-x-auto -mx-2 scrollbar-hide">
          <table className="min-w-full border-separate border-spacing-y-2">
            <thead>
              <tr className="text-left">
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-[35%]">
                  {t("user_info")}
                </th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-[15%]">
                  {t("role")}
                </th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-[15%]">
                  {t("status")}
                </th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-[15%]">
                  {t("joined")}
                </th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center w-[270px] min-w-[270px]">
                  {t("actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y-0">
              {(data || []).map((u) => (
                <tr
                  key={u.id}
                  ref={String(highlightId) === String(u.id) ? highlightedRowRef : null}
                  className={`group transition-all duration-700 relative hover:scale-[1.005] ${
                    String(highlightId) === String(u.id)
                      ? "bg-blue-50/80 dark:bg-blue-500/10 shadow-2xl shadow-blue-500/20 z-10 scale-[1.01]"
                      : "bg-white dark:bg-slate-900/50"
                  }`}
                >
                  <td
                    className={`px-4 py-3 rounded-l-xl border-y border-l transition-all duration-500 ${
                      String(highlightId) === String(u.id)
                        ? "border-blue-500"
                        : "border-slate-100 dark:border-white/5 group-hover:border-blue-500"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {u.profilePicture ? (
                        <img
                          src={getAssetUrl(u.profilePicture)}
                          className="h-8 w-8 rounded-lg object-cover ring-2 ring-white dark:ring-slate-800"
                          alt={u.name}
                        />
                      ) : (
                        <div className={`h-8 w-8 rounded-lg ${getAvatarColor(u.name)} flex items-center justify-center text-white text-xs font-bold`}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                          {u.name}
                        </span>
                        <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest mt-0.5">
                          {u.email}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td
                    className={`px-4 py-3 border-y transition-all duration-500 ${
                      String(highlightId) === String(u.id)
                        ? "border-blue-500"
                        : "border-slate-100 dark:border-white/5 group-hover:border-blue-500"
                    }`}
                  >
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/5 text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10">
                      {u.roles.map((r) => r === "USER" ? t("student") : t(`role_${r.toLowerCase()}`, { defaultValue: r })).join(" / ")}
                    </span>
                  </td>
                  <td
                    className={`px-4 py-3 border-y transition-all duration-500 ${
                      String(highlightId) === String(u.id)
                        ? "border-blue-500"
                        : "border-slate-100 dark:border-white/5 group-hover:border-blue-500"
                    }`}
                  >
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${u.enabled ? statusStyles.ACTIVE : statusStyles.DISABLED}`}
                    >
                      {u.enabled ? t("active") : t("disabled")}
                    </span>
                  </td>
                  <td
                    className={`px-4 py-3 border-y transition-all duration-500 ${
                      String(highlightId) === String(u.id)
                        ? "border-blue-500"
                        : "border-slate-100 dark:border-white/5 group-hover:border-blue-500"
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      {formatDate(u.createdAt, dateLocale)}
                    </span>
                  </td>
                  <td
                    className={`px-4 py-3 rounded-r-xl border-y border-r transition-all duration-500 relative w-[270px] min-w-[270px] ${
                      String(highlightId) === String(u.id)
                        ? "border-blue-500"
                        : "border-slate-100 dark:border-white/5 group-hover:border-blue-500"
                    }`}
                  >
                    {/* Default View (Actions Label) */}
                    <div className="flex items-center justify-center gap-1 text-slate-400 group-hover:opacity-0 transition-opacity duration-300">
                      <span className="text-[9px] font-black uppercase tracking-widest">
                        {t("actions")}
                      </span>
                      <MoreVertical className="h-4 w-4" />
                    </div>

                    {/* Hover View (Functional Text Buttons in Row) */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 px-1">
                      <div className="flex flex-row items-center justify-center gap-1 w-full">
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setIsViewModalOpen(true);
                          }}
                          className="table-action-btn text-[9px] font-black uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20"
                        >
                          {t("details")}
                        </button>
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`table-action-btn text-[9px] font-black uppercase tracking-widest ${
                            u.enabled
                              ? "bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-600 dark:hover:text-white"
                              : "bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-600 dark:hover:text-white"
                          }`}
                        >
                          {u.enabled ? t("disable") : t("enable")}
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="table-action-btn text-[9px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-600 dark:hover:text-white"
                        >
                          {t("delete")}
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}

              {(!data || data.length === 0) && !isLoading && !isError && (
                <tr>
                  <td colSpan={5} className="px-4 py-20 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center mb-6 dark:bg-white/5">
                        <Search className="h-10 w-10 text-slate-300" />
                      </div>
                      <h4 className="text-xl font-black text-slate-900 dark:text-white mb-2">
                        {t("no_users_found", { defaultValue: "No users found" })}
                      </h4>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        {t("no_users_filter_desc", { defaultValue: "Try adjusting your search or role filter" })}
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
                        {t("connection_error", { defaultValue: "Connection Error" })}
                      </h4>
                      <p className="text-sm font-medium text-slate-500 mt-1 mb-6">
                        {t("err_user_directory_fail", { defaultValue: "Failed to connect to the user directory service." })}
                      </p>
                      <button
                        onClick={refetch}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                      >
                        <RefreshCw className="h-4 w-4" /> {t("retry", { defaultValue: "Retry" })}
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* View Details Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={t("user_profile_details", { defaultValue: "User Profile Details" })}
        centerTitle={true}
        maxWidth="max-w-md"
      >
        {selectedUser && (
          <div className="space-y-4">
            {/* Centered Profile Header (Clean & Large) */}
            <div className="flex flex-col items-center text-center pt-2">
              {selectedUser.profilePicture ? (
                <img
                  src={getAssetUrl(selectedUser.profilePicture)}
                  className="h-28 w-28 rounded-3xl object-cover mb-4 shadow-2xl shadow-blue-500/10 border-4 border-white dark:border-slate-800"
                  alt={selectedUser.name}
                />
              ) : (
                <div className={`h-28 w-28 rounded-3xl ${getAvatarColor(selectedUser.name)} flex items-center justify-center text-white text-5xl font-black mb-4 shadow-2xl`}>
                  {selectedUser.name.charAt(0).toUpperCase()}
                </div>
              )}
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {selectedUser.name}
              </h3>
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mt-1.5 px-4 py-1 bg-blue-50 dark:bg-blue-500/10 rounded-full">
                {selectedUser.roles.map((r) => r === "USER" ? t("student") : t(`role_${r.toLowerCase()}`, { defaultValue: r })).join(" / ")}
              </p>
            </div>

            {/* Details List (Reverted to Stacked Layout) */}
            <div className="space-y-4 px-2 pt-4 border-t border-slate-100 dark:border-white/5">
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  {t("email_address")}
                </span>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                    <Mail className="h-4 w-4 text-slate-500" />
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {selectedUser.email}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  {t("account_status", { defaultValue: "Account Status" })}
                </span>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-4 w-4 text-slate-500" />
                  </div>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${selectedUser.enabled ? statusStyles.ACTIVE : statusStyles.DISABLED}`}
                  >
                    {selectedUser.enabled ? t("active") : t("disabled")}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  {t("joined_date", { defaultValue: "Joined Date" })}
                </span>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                    <Calendar className="h-4 w-4 text-slate-500" />
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {formatDate(selectedUser.createdAt, dateLocale)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
};

export default UsersPage;
