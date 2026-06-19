import React, { useMemo, useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  Users,
  Search,
  Filter,
  MoreVertical,
  Trash2,
  UserCheck,
  UserX,
  Eye,
  EyeOff,
  Calendar,
  Mail,
  ShieldCheck,
  RefreshCw,
  XCircle,
  ClipboardList,
  UserPlus,
  Plus,
  Lock,
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

const TECH_EMAIL_PATTERN = /^tech.*@unisphere\.com$/i;
const LECTURER_EMAIL_PATTERN = /^lec.*@unisphere\.com$/i;

const StaffPage = () => {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === "si" ? "si-LK" : i18n.language === "ta" ? "ta-LK" : "en-US";
  const { user, logout } = useAuth();
  const { searchQuery, setSearchQuery } = useSearch();
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const location = useLocation();

  const [roleFilter, setRoleFilter] = useState("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [highlightId, setHighlightId] = useState(null);
  const highlightedRowRef = useRef(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    notificationEmail: "",
    role: "LECTURER",
    temporaryPassword: "",
    honorific: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const primaryRole = getPrimaryRole(user?.roles);
  const accent = getRoleAccent(primaryRole);
  const sidebarItems = useMemo(
    () => getSidebarItems(primaryRole),
    [primaryRole],
  );

  // Real-time validation
  useEffect(() => {
    if (isAddModalOpen) {
      const errors = {};
      const email = formData.email.trim().toLowerCase();
      const pwd = formData.temporaryPassword;

      if (email) {
        if (
          formData.role === "LECTURER" &&
          !LECTURER_EMAIL_PATTERN.test(email)
        ) {
          errors.email = t("err_lecturer_email", "Please use an authorized lecturer email.");
        } else if (
          formData.role === "TECHNICIAN" &&
          !TECH_EMAIL_PATTERN.test(email)
        ) {
          errors.email = t("err_tech_email", "Please use an authorized technician email.");
        }
      }

      if (pwd) {
        const hasLetter = /[a-zA-Z]/.test(pwd);
        const hasNumber = /\d/.test(pwd);
        const hasSpecial = /[^a-zA-Z0-9]/.test(pwd);

        if (pwd.length < 8) {
          errors.temporaryPassword = t("err_password_min_length", "Password must be at least 8 characters.");
        } else if (!hasLetter || !hasNumber || !hasSpecial) {
          errors.temporaryPassword =
            t("err_password_complexity", "Must include letters, numbers, and symbols.");
        }
      }
      setFormErrors((prev) => ({
        ...prev,
        email: errors.email,
        temporaryPassword: errors.temporaryPassword,
      }));
    }
  }, [
    formData.email,
    formData.temporaryPassword,
    formData.role,
    isAddModalOpen,
    t,
  ]);

  // Query Staff
  const {
    data: responseData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["admin-staff", searchQuery, roleFilter],
    queryFn: async () => {
      const params = {
        search: searchQuery || "",
        roles: roleFilter === "ALL" ? "LECTURER,TECHNICIAN" : roleFilter,
        page: 0,
        size: 100,
      };
      // Using the main users endpoint to get counts and correct filtering
      const res = await api.get("/admin/users", { params });
      return res.data;
    },
    enabled: !!user,
    placeholderData: keepPreviousData,
  });

  const staffData = responseData?.content || [];
  const counts = responseData?.counts || {};

  const lecturerCount =
    counts.LECTURER ||
    staffData.filter((u) => u.roles.includes("LECTURER")).length;
  const technicianCount =
    counts.TECHNICIAN ||
    staffData.filter((u) => u.roles.includes("TECHNICIAN")).length;
  const totalStaff = lecturerCount + technicianCount;

  // Handle Highlighting and Scrolling
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get("highlight");
    if (id) {
      setHighlightId(id);
      const timer = setTimeout(() => setHighlightId(null), 5000);
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
  }, [highlightId, staffData]);

  // Mutations
  const createStaffMutation = useMutation({
    mutationFn: async (newData) => {
      await api.post("/admin/users/staff", newData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
      showAlert(
        "success",
        t("msg_staff_created_success", "Staff account created successfully! Notification sent."),
      );
      setIsAddModalOpen(false);
      setFormData({
        name: "",
        email: "",
        notificationEmail: "",
        role: "LECTURER",
        temporaryPassword: "",
        honorific: "",
      });
      setShowPassword(false);
    },
    onError: (err) => {
      showAlert(
        "error",
        err.response?.data?.message || t("err_failed_create_staff", "Failed to create staff account."),
      );
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, enabled }) => {
      await api.put(`/admin/users/${id}/status`, { enabled: !enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
      showAlert("success", t("msg_user_status_updated", "User status updated successfully!"));
    },
    onError: () => showAlert("error", t("err_failed_update_status", "Failed to update user status.")),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/admin/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
      showAlert("success", t("msg_user_deleted", "User deleted successfully!"));
    },
    onError: () => showAlert("error", t("err_failed_delete_user", "Failed to delete user.")),
  });

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = t("err_fullname_required", "Full Name is required");

    if (!formData.email.trim()) {
      errors.email = t("err_system_email_required", "System Email is required");
    } else {
      const email = formData.email.trim().toLowerCase();
      if (formData.role === "LECTURER" && !LECTURER_EMAIL_PATTERN.test(email)) {
        errors.email =
          t("err_lecturer_email_format", "Please use an authorized lecturer email (lec****@unisphere.com).");
      } else if (
        formData.role === "TECHNICIAN" &&
        !TECH_EMAIL_PATTERN.test(email)
      ) {
        errors.email =
          t("err_tech_email_format", "Please use an authorized technician email (tech****@unisphere.com).");
      }
    }

    if (!formData.notificationEmail.trim()) {
      errors.notificationEmail = t("err_notification_email_required", "Notification Email is required");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.notificationEmail)) {
      errors.notificationEmail = t("err_invalid_email_format", "Invalid email format");
    }

    if (!formData.temporaryPassword) {
      errors.temporaryPassword = t("err_temp_password_required", "Temporary Password is required");
    } else {
      const pwd = formData.temporaryPassword;
      const hasLetter = /[a-zA-Z]/.test(pwd);
      const hasNumber = /\d/.test(pwd);
      const hasSpecial = /[^a-zA-Z0-9]/.test(pwd);

      if (pwd.length < 8) {
        errors.temporaryPassword =
          t("err_password_min_length_long", "Password must be at least 8 characters long.");
      } else if (!hasLetter || !hasNumber || !hasSpecial) {
        errors.temporaryPassword =
          t("err_password_complexity_special", "Must include letters, numbers, and special characters.");
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateStaff = (e) => {
    e.preventDefault();
    if (validateForm()) {
      const payload = {
        ...formData,
        name: formData.honorific
          ? `${formData.honorific} ${formData.name}`
          : formData.name,
      };
      createStaffMutation.mutate(payload);
    }
  };

  const handleToggleStatus = (targetUser) => {
    if (
      window.confirm(
        targetUser.enabled
          ? t("confirm_disable_user", "Are you sure you want to disable this user?")
          : t("confirm_enable_user", "Are you sure you want to enable this user?")
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
        t("confirm_delete_user", "Are you sure you want to delete this user? This action cannot be undone.")
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
      title={t("staffs_management", "Staffs Management")}
      subtitle={t("staffs_management_subtitle", "Manage {{count}} registered staff (Lecturers and Technicians) in the system.", { count: totalStaff })}
      items={sidebarItems}
      displayRole={t("system_administrator", "System Administrator")}
      {...accent}
    >
      {/* Actions Section */}
      <section className="rounded-xl bg-white p-5 shadow-sm border border-slate-200 dark:bg-slate-900/50 dark:border-white/5 mb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="w-full md:w-[240px]">
            <CustomDropdown
              label={t("staff_filter", "Staff Filter")}
              icon={Filter}
              options={[
                { value: "ALL", label: t("all_staff", "All Staff"), count: totalStaff },
                { value: "LECTURER", label: t("lecturers", "Lecturers"), count: lecturerCount },
                {
                  value: "TECHNICIAN",
                  label: t("technicians", "Technicians"),
                  count: technicianCount,
                },
              ]}
              value={roleFilter}
              onChange={setRoleFilter}
            />
          </div>
 
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setRoleFilter("ALL");
                setSearchQuery("");
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-[13px] font-bold text-slate-600 transition hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4" />
              {t("reset", "Reset")}
            </button>
            <button
              onClick={() =>
                import("../utils/pdfGenerator").then((m) =>
                  m.generateStaffPDF(staffData || []),
                )
              }
              disabled={!staffData || staffData.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-white/5 border-2 border-transparent px-4 py-2 text-[13px] font-bold text-slate-600 dark:text-slate-400 transition-all hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white shadow-sm disabled:opacity-50"
            >
              <ClipboardList className="h-4 w-4" />
              {t("download_pdf", "Download PDF")}
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-[13px] font-bold text-white transition hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 active:scale-95 whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              {t("add_new_staff", "Add New Staff")}
            </button>
          </div>
        </div>
      </section>
 
      {/* Staff Table Section */}
      <section
        className={`rounded-xl bg-white p-5 sm:p-6 shadow-sm border border-slate-200 dark:bg-slate-900/50 dark:border-white/5 transition-all duration-300 ${isLoading ? "opacity-70 pointer-events-none" : "opacity-100"} mb-16`}
      >
        <div className="overflow-x-auto -mx-2 scrollbar-hide">
          <table className="min-w-full border-separate border-spacing-y-2">
            <thead>
              <tr className="text-left">
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-[35%]">
                  {t("staff_information", "Staff Information")}
                </th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-[15%]">
                  {t("role", "Role")}
                </th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-[15%]">
                  {t("status", "Status")}
                </th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-[15%]">
                  {t("joined", "Joined")}
                </th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center w-[270px] min-w-[270px]">
                  {t("actions", "Actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y-0">
              {staffData.map((u) => (
                <tr
                  key={u.id}
                  ref={u.id === highlightId ? highlightedRowRef : null}
                  className={`group transition-all duration-500 relative hover:scale-[1.005] ${
                    u.id === highlightId 
                      ? "bg-indigo-50/80 dark:bg-indigo-500/10 scale-[1.01] shadow-lg shadow-indigo-500/10 z-10" 
                      : "bg-white dark:bg-slate-900/50"
                  }`}
                >
                  <td className={`px-4 py-3 rounded-l-xl border-y border-l transition-all duration-500 ${
                    u.id === highlightId ? "border-indigo-500" : "border-slate-100 dark:border-white/5 group-hover:border-indigo-500"
                  }`}>
                    <div className="flex items-center gap-3">
                      {u.profilePicture ? (
                        <img
                          src={getAssetUrl(u.profilePicture)}
                          className="h-8 w-8 rounded-lg object-cover ring-2 ring-white dark:ring-slate-800 shadow-md shadow-indigo-600/10"
                          alt={u.name}
                        />
                      ) : (
                        <div className={`h-8 w-8 rounded-lg ${getAvatarColor(u.name)} flex items-center justify-center text-white text-xs font-bold shadow-lg`}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                          {u.name}
                        </span>
                        <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mt-0.5">
                          {u.email}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className={`px-4 py-3 border-y transition-all duration-500 ${
                    u.id === highlightId ? "border-indigo-500" : "border-slate-100 dark:border-white/5 group-hover:border-indigo-500"
                  }`}>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/5 text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10">
                      {u.roles.map((r) => r === "USER" ? t("student") : t(`role_${r.toLowerCase()}`, { defaultValue: r })).join(" / ")}
                    </span>
                  </td>
                  <td className={`px-4 py-3 border-y transition-all duration-500 ${
                    u.id === highlightId ? "border-indigo-500" : "border-slate-100 dark:border-white/5 group-hover:border-indigo-500"
                  }`}>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${u.enabled ? statusStyles.ACTIVE : statusStyles.DISABLED}`}
                    >
                      {u.enabled ? t("active", "Active") : t("disabled", "Disabled")}
                    </span>
                  </td>
                  <td className={`px-4 py-3 border-y transition-all duration-500 ${
                    u.id === highlightId ? "border-indigo-500" : "border-slate-100 dark:border-white/5 group-hover:border-indigo-500"
                  }`}>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      {formatDate(u.createdAt, dateLocale)}
                    </span>
                  </td>
                  <td className={`px-4 py-3 rounded-r-xl border-y border-r transition-all duration-500 relative w-[270px] min-w-[270px] ${
                    u.id === highlightId ? "border-indigo-500" : "border-slate-100 dark:border-white/5 group-hover:border-indigo-500"
                  }`}>
                    <div className="flex items-center justify-center gap-1 text-slate-400 group-hover:opacity-0 transition-opacity duration-300">
                      <span className="text-[9px] font-black uppercase tracking-widest">
                        {t("actions", "Actions")}
                      </span>
                      <MoreVertical className="h-4 w-4" />
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 px-1">
                      <div className="flex flex-row items-center justify-center gap-1 w-full">
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setIsViewModalOpen(true);
                          }}
                          className="table-action-btn text-[9px] font-black uppercase tracking-widest bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20"
                        >
                          {t("details", "Details")}
                        </button>
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`table-action-btn text-[9px] font-black uppercase tracking-widest ${
                            u.enabled
                              ? "bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-600 dark:hover:text-white"
                              : "bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-600 dark:hover:text-white"
                          }`}
                        >
                          {u.enabled ? t("disable", "Disable") : t("enable", "Enable")}
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="table-action-btn text-[9px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-600 dark:hover:text-white"
                        >
                          {t("delete", "Delete")}
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}

              {staffData.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-20 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center mb-6 dark:bg-white/5">
                        <Users className="h-10 w-10 text-slate-300" />
                      </div>
                      <h4 className="text-xl font-black text-slate-900 dark:text-white mb-2">
                        {t("no_staff_accounts", "No staff accounts found")}
                      </h4>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        {t("add_new_staff_desc", "Add new staff members to get started.")}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Add New Staff Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={t("add_new_staff_member", "Add New Staff Member")}
        centerTitle={true}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateStaff} className="space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <CustomDropdown
                label={t("honorific", "Honorific")}
                options={[
                  { value: "Mr.", label: "Mr." },
                  { value: "Mrs.", label: "Mrs." },
                  { value: "Ms.", label: "Ms." },
                  { value: "Dr.", label: "Dr." },
                  { value: "Prof.", label: "Prof." },
                  { value: "Rev.", label: "Rev." },
                ]}
                value={formData.honorific}
                onChange={(val) => setFormData({ ...formData, honorific: val })}
                placeholder={t("title", "Title")}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                {t("full_name", "Full Name")}
              </label>
              <div className="relative">
                <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={t("full_name", "Full Name")}
                  className={`w-full pl-10 pr-4 py-3 bg-slate-50 border-2 rounded-xl outline-none transition-all dark:bg-white/5 ${formErrors.name ? "border-rose-500/50" : "border-transparent focus:border-indigo-500/50"}`}
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              {formErrors.name && (
                <p className="mt-1 text-[10px] font-bold text-rose-500 ml-1">
                  {formErrors.name}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
              {t("system_email", "System Email")}
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="email"
                placeholder={t("email_address", "Email Address")}
                className={`w-full pl-10 pr-4 py-3 bg-slate-50 border-2 rounded-xl outline-none transition-all dark:bg-white/5 ${formErrors.email ? "border-rose-500/50" : "border-transparent focus:border-indigo-500/50"}`}
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            {formErrors.email && (
              <p className="mt-1 text-[10px] font-bold text-rose-500 ml-1">
                {formErrors.email}
              </p>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
              {t("notification_email_label", "Notification Email")}
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="email"
                placeholder={t("email_address", "Email Address")}
                className={`w-full pl-10 pr-4 py-3 bg-slate-50 border-2 rounded-xl outline-none transition-all dark:bg-white/5 ${formErrors.notificationEmail ? "border-rose-500/50" : "border-transparent focus:border-indigo-500/50"}`}
                value={formData.notificationEmail}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    notificationEmail: e.target.value,
                  })
                }
              />
            </div>
            {formErrors.notificationEmail && (
              <p className="mt-1 text-[10px] font-bold text-rose-500 ml-1">
                {formErrors.notificationEmail}
              </p>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
              {t("role", "Role")}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: "LECTURER" })}
                className={`py-3 rounded-xl text-xs font-bold transition-all border-2 ${formData.role === "LECTURER" ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20" : "bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100 dark:bg-white/5 dark:text-slate-400"}`}
              >
                {t("role_lecturer", "Lecturer")}
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: "TECHNICIAN" })}
                className={`py-3 rounded-xl text-xs font-bold transition-all border-2 ${formData.role === "TECHNICIAN" ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20" : "bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100 dark:bg-white/5 dark:text-slate-400"}`}
              >
                {t("role_technician", "Technician")}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
              {t("temporary_password", "Temporary Password")}
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder={t("set_temp_password", "Set temporary password")}
                className={`w-full pl-10 pr-12 py-3 bg-slate-50 border-2 rounded-xl outline-none transition-all dark:bg-white/5 ${formErrors.temporaryPassword ? "border-rose-500/50" : "border-transparent focus:border-indigo-500/50"}`}
                value={formData.temporaryPassword}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    temporaryPassword: e.target.value,
                  })
                }
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-indigo-600 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {formErrors.temporaryPassword && (
              <p className="mt-1 text-[10px] font-bold text-rose-500 ml-1">
                {formErrors.temporaryPassword}
              </p>
            )}
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={createStaffMutation.isPending}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-600/30 hover:bg-indigo-500 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              {createStaffMutation.isPending ? (
                <div className="flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  {t("creating_account", "Creating Account...")}
                </div>
              ) : (
                t("create_account_send_email", "Create Account & Send Email")
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Details Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={t("staff_profile_details", "Staff Profile Details")}
        centerTitle={true}
        maxWidth="max-w-md"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="flex flex-col items-center text-center pt-2">
              {selectedUser.profilePicture ? (
                <img
                  src={getAssetUrl(selectedUser.profilePicture)}
                  className="h-28 w-28 rounded-3xl object-cover mb-4 shadow-2xl shadow-indigo-500/10 border-4 border-white dark:border-slate-800"
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
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mt-1.5 px-4 py-1 bg-indigo-50 dark:bg-indigo-500/10 rounded-full">
                {selectedUser.roles.map((r) => r === "USER" ? t("student") : t(`role_${r.toLowerCase()}`, { defaultValue: r })).join(" / ")}
              </p>
            </div>

            <div className="space-y-4 px-2 pt-4 border-t border-slate-100 dark:border-white/5">
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  {t("system_email", "System Email")}
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
                  {t("notification_email_label", "Notification Email")}
                </span>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                    <Mail className="h-4 w-4 text-slate-500" />
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {selectedUser.notificationEmail || "N/A"}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  {t("account_status", "Account Status")}
                </span>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-4 w-4 text-slate-500" />
                  </div>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${selectedUser.enabled ? statusStyles.ACTIVE : statusStyles.DISABLED}`}
                  >
                    {selectedUser.enabled ? t("active", "Active") : t("disabled", "Disabled")}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  {t("joined_date", "Joined Date")}
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

export default StaffPage;
