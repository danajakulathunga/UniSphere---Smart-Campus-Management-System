import React, { useState, useEffect, useRef } from "react";
import {
  User,
  Bell,
  Monitor,
  Camera,
  Key,
  Check,
  Info,
  Mail,
  Lock,
  ChevronRight,
  Edit3,
  Save,
  X,
  Trash2,
  Eye,
  EyeOff,
  Sun,
  Moon,
  LogOut,
  GraduationCap,
  BookOpen,
  Building2,
  AlignLeft,
  Briefcase,
  Wrench,
  MapPin,
  Hash,
  ClipboardList,
  Star,
  Clock,
  Plus,
  Users,
  Globe,
} from "lucide-react";
import Modal from "./Modal";
import CustomDropdown from "./CustomDropdown";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useAlert } from "../context/AlertContext";
import api from "../services/api";
import { getAssetUrl } from "../utils/fileUtils";
import { useTranslation } from "react-i18next";

const getPasswordStrength = (pwd, t) => {
  if (!pwd) return null;

  const hasMinLength = pwd.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(pwd);
  const hasNumber = /\d/.test(pwd);
  const hasSpecial = /[^a-zA-Z0-9]/.test(pwd);

  if (!hasMinLength) {
    return {
      emoji: "😠",
      label: t ? t("pwd_weak", "Weak.") : "Weak.",
      description: t ? t("pwd_weak_desc", "Must contain at least 8 characters") : "Must contain at least 8 characters",
      colorClass: "bg-red-600",
      widthClass: "w-1/4",
    };
  }
  if (!hasLetter) {
    return {
      emoji: "😐",
      label: t ? t("pwd_fair", "Fair.") : "Fair.",
      description: t ? t("pwd_fair_desc", "Must contain at least 1 letter") : "Must contain at least 1 letter",
      colorClass: "bg-orange-500",
      widthClass: "w-2/4",
    };
  }
  if (!hasSpecial) {
    return {
      emoji: "😕",
      label: t ? t("pwd_good", "Good.") : "Good.",
      description: t ? t("pwd_good_desc", "Must contain special symbol") : "Must contain special symbol",
      colorClass: "bg-yellow-500",
      widthClass: "w-3/4",
    };
  }
  return {
    emoji: "😎",
    label: t ? t("pwd_strong", "Strong!") : "Strong!",
    description: t ? t("pwd_strong_desc", "You have a secure password") : "You have a secure password",
    colorClass: "bg-green-500",
    widthClass: "w-full",
  };
};

const getFacultyKey = (fac) => {
  if (!fac) return "";
  const mapping = {
    "faculty of computing": "faculty_computing",
    "faculty of business": "faculty_business",
    "faculty of engineering": "faculty_engineering",
    "faculty of science": "faculty_science",
    "faculty of humanities": "faculty_humanities",
    "faculty of humanities & sciences": "faculty_humanities_sciences",
    "faculty of information science": "faculty_information_science"
  };
  return mapping[fac.toLowerCase().trim()] || fac;
};

const getYearKey = (yr) => {
  if (!yr) return "";
  const mapping = {
    "1st year": "year_1",
    "2nd year": "year_2",
    "3rd year": "year_3",
    "4th year": "year_4",
  };
  return mapping[yr.toLowerCase().trim()] || yr;
};

const getSemesterKey = (sem) => {
  if (!sem) return "";
  const mapping = {
    "semester 1": "semester_1",
    "semester 2": "semester_2",
  };
  return mapping[sem.toLowerCase().trim()] || sem;
};

const getDesignationKey = (des) => {
  if (!des) return "";
  const mapping = {
    "Lecturer": "designation_lecturer",
    "Senior Lecturer": "designation_senior_lecturer",
    "Professor": "designation_professor",
  };
  return mapping[des] || des;
};

const getTechCategoryKey = (cat) => {
  if (!cat) return "";
  const mapping = {
    "IT Technician": "tech_category_it",
    "Electrical Technician": "tech_category_electrical",
    "Mechanical Technician": "tech_category_mechanical",
    "Maintenance Technician": "tech_category_maintenance",
  };
  return mapping[cat] || cat;
};

const RESEND_COOLDOWN_SECONDS = 30;

const SettingsModal = ({ isOpen, onClose }) => {
  const { t, i18n } = useTranslation();
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { showAlert } = useAlert();
  const [activeSection, setActiveSection] = useState("profile");

  // Profile Settings State
  const [isEditMode, setIsEditMode] = useState(false);
  const [profileData, setProfileData] = useState({
    honorific: user?.honorific || "",
    name: user?.name || "",
    year: user?.year || "",
    semester: user?.semester || "",
    faculty: user?.faculty || "",
    bio: user?.bio || "",
    profilePicture: user?.profilePicture || null,
    // Lecturer Fields
    department: user?.department || "",
    designation: user?.designation || "",
    modules: user?.modules || "",
    batches: user?.batches || "",
    officeLocation: user?.officeLocation || "",
    // Technician Fields
    specialization: user?.specialization || "",
    skills: user?.skills || "",
    assignedAreas: user?.assignedAreas || "",
    employeeId: user?.employeeId || "",
    // Common
    workingHours: user?.workingHours || "",
  });
  const fileInputRef = useRef(null);

  // Password Flow State (Separate Modal)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [focusedInput, setFocusedInput] = useState(null);
  const [pwStep, setPwStep] = useState("email"); // email, verify, reset
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(0);
  const cooldownTimerRef = useRef(null);

  const [pwData, setPwData] = useState({
    email: user?.email || "",
    code: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    generatedCode: "",
  });
  const [isPwSubmitting, setIsPwSubmitting] = useState(false);

  // Notification Settings State (USER ONLY)
  const [notifications, setNotifications] = useState({
    all: true,
    booking: true,
    ticket: true,
    lecture: true,
  });
  const [isNotifSubmitting, setIsNotifSubmitting] = useState(false);

  // Load notification settings from user object
  useEffect(() => {
    if (user?.notificationSettings && isOpen) {
      setNotifications({
        all: user.notificationSettings.all,
        booking: user.notificationSettings.booking,
        ticket: user.notificationSettings.ticket,
        lecture: user.notificationSettings.lecture ?? true,
      });
    }
  }, [user?.notificationSettings, isOpen]);

  const isGoogleUser =
    user?.provider === "GOOGLE" || user?.provider === "google";

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("no-scroll");
    } else {
      document.body.classList.remove("no-scroll");
    }
    return () => document.body.classList.remove("no-scroll");
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setProfileData({
        honorific: user?.honorific || "",
        name: user?.name || "",
        year: user?.year || "",
        semester: user?.semester || "",
        faculty: user?.faculty || "",
        bio: user?.bio || "",
        profilePicture: user?.profilePicture || null,
        department: user?.department || "",
        designation: user?.designation || "",
        modules: user?.modules || "",
        batches: user?.batches || "",
        officeLocation: user?.officeLocation || "",
        specialization: user?.specialization || "",
        skills: user?.skills || "",
        assignedAreas: user?.assignedAreas || "",
        employeeId: user?.employeeId || "",
        workingHours: user?.workingHours || "",
      });
      setIsEditMode(false);
      setActiveSection("profile");
    }
  }, [isOpen]); // Removed user from dependency to prevent reset on save

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
    };
  }, []);

  const isAdmin = user?.roles?.includes("ADMIN") || user?.roles?.includes("ADMINISTRATOR");
  const isTechnician = user?.roles?.includes("TECHNICIAN");
  const showNotifications = !isAdmin && !isTechnician;

  const sections = [
    { id: "profile", label: t("profile_settings"), icon: User },
    { id: "language", label: t("language_settings"), icon: Globe },
    { id: "account", label: t("account_settings"), icon: Lock },
    ...(showNotifications ? [{ id: "notifications", label: t("notification_settings"), icon: Bell }] : []),
    { id: "appearance", label: t("appearance_settings"), icon: Monitor },
  ];

  const handleToggleNotification = async (key) => {
    if (isNotifSubmitting) return;

    const nextState = { ...notifications };
    if (key === "all") {
      const turnOn = !notifications.all;
      nextState.all = turnOn;
      nextState.booking = turnOn;
      nextState.ticket = turnOn;
      nextState.lecture = turnOn;
    } else {
      nextState[key] = !notifications[key];
      // "All" is true ONLY if all sub-categories are true
      nextState.all =
        nextState.booking && nextState.ticket && nextState.lecture;
    }

    // Optimistic update
    setNotifications(nextState);

    setIsNotifSubmitting(true);
    try {
      await api.put("/users/me", {
        notificationSettings: nextState,
      });

      updateUser({
        notificationSettings: nextState,
      });
    } catch (error) {
      console.error("Failed to update notification settings", error);
      showAlert("error", "Failed to update notification preferences");
      // Rollback on error
      setNotifications(notifications);
    } finally {
      setIsNotifSubmitting(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showAlert("error", "Image size must be less than 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData((prev) => ({ ...prev, profilePicture: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePic = () => {
    setProfileData((prev) => ({ ...prev, profilePicture: null }));
    showAlert("success", "Profile picture removed");
  };

  const handleSaveProfile = async () => {
    try {
      const res = await api.put("/users/me", {
        honorific: profileData.honorific,
        name: profileData.name,
        profilePicture: profileData.profilePicture,
        year: profileData.year,
        semester: profileData.semester,
        faculty: profileData.faculty,
        bio: profileData.bio,
        department: profileData.department,
        designation: profileData.designation,
        modules: profileData.modules,
        batches: profileData.batches,
        officeLocation: profileData.officeLocation,
        specialization: profileData.specialization,
        skills: profileData.skills,
        assignedAreas: profileData.assignedAreas,
        employeeId: profileData.employeeId,
        workingHours: profileData.workingHours,
      });

      updateUser({
        ...res.data,
      });

      setIsEditMode(false);
      showAlert("success", t("profile_updated_success", { defaultValue: "Profile updated successfully!" }));
    } catch (error) {
      showAlert(
        "error",
        error.response?.data?.message || "Failed to update profile",
      );
    }
  };

  // Password Flow Handlers
  const startResendCooldown = () => {
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
    }
    setResendCooldownSeconds(RESEND_COOLDOWN_SECONDS);
    cooldownTimerRef.current = setInterval(() => {
      setResendCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleStartPwChange = () => {
    setPwStep("email");
    setPwData({
      ...pwData,
      email: user?.email || "",
      code: "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setShowPasswords({ current: false, new: false, confirm: false });
    setFocusedInput(null);
    setResendCooldownSeconds(0);
    setIsPasswordModalOpen(true);
  };

  const handleRequestCode = async (e) => {
    if (e) e.preventDefault();
    setIsPwSubmitting(true);
    try {
      const { data } = await api.post("/auth/forgot-password", {
        email: pwData.email,
      });
      const code = String(data.verificationCode);
      setPwData({ ...pwData, generatedCode: code });
      setPwStep("verify");
      startResendCooldown();
      showAlert("success", t("msg_verification_code_sent", "Your verification code is: ") + code);
    } catch (error) {
      showAlert(
        "error",
        error.response?.data?.message || t("err_send_verification_code", "Failed to send code"),
      );
    } finally {
      setIsPwSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (isPwSubmitting || resendCooldownSeconds > 0) return;
    await handleRequestCode();
  };

  const handleVerifyCode = (e) => {
    e.preventDefault();
    if (pwData.code === pwData.generatedCode) {
      setPwStep("reset");
      showAlert("success", t("msg_code_verified", "Code verified successfully"));
    } else {
      showAlert("error", t("err_invalid_verification_code", "Invalid verification code"));
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    // Validations from AuthPage
    const strength = getPasswordStrength(pwData.newPassword, t);
    if (!strength || strength.label !== t("pwd_strong", "Strong!")) {
      showAlert(
        "error",
        t("err_password_strength", "Please ensure your new password is 'Strong!' based on the meter."),
      );
      return;
    }

    if (pwData.newPassword !== pwData.confirmPassword) {
      showAlert("error", t("err_password_confirm_match", "Passwords do not match"));
      return;
    }

    setIsPwSubmitting(true);
    try {
      await api.post("/auth/reset-password", {
        email: pwData.email,
        currentPassword: pwData.currentPassword,
        newPassword: pwData.newPassword,
      });
      showAlert("success", t("password_updated_success", "Password updated successfully"));
      setIsPasswordModalOpen(false);
    } catch (error) {
      showAlert(
        "error",
        error.response?.data?.message || t("err_reset_password", "Failed to reset password"),
      );
    } finally {
      setIsPwSubmitting(false);
    }
  };

  const renderProfileSettings = () => {
    const isLecturer = user?.roles?.includes("LECTURER");
    const isTechnician = user?.roles?.includes("TECHNICIAN");
    const isStudent = user?.roles?.includes("USER");
    const isAdmin =
      user?.roles?.includes("ADMIN") || user?.roles?.includes("ADMINISTRATOR");

    return (
      <div className="animate-reveal h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
            <User className="h-4 w-4 text-blue-500" />
            {t("profile_settings", "Profile Settings")}
          </h3>
          <div className="flex items-center gap-2">
            {isEditMode && (
              <button
                onClick={() => {
                  setProfileData({
                    name: user?.name || "",
                    year: user?.year || "",
                    semester: user?.semester || "",
                    faculty: user?.faculty || "",
                    bio: user?.bio || "",
                    profilePicture: user?.profilePicture || null,
                    department: user?.department || "",
                    designation: user?.designation || "",
                    modules: user?.modules || "",
                    batches: user?.batches || "",
                    officeLocation: user?.officeLocation || "",
                    specialization: user?.specialization || "",
                    skills: user?.skills || "",
                    assignedAreas: user?.assignedAreas || "",
                    employeeId: user?.employeeId || "",
                    workingHours: user?.workingHours || "",
                  });
                  setIsEditMode(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all active:scale-95"
              >
                <X className="h-3 w-3" /> {t("cancel", "Cancel")}
              </button>
            )}
            <button
              onClick={() =>
                isEditMode ? handleSaveProfile() : setIsEditMode(true)
              }
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-sm ${isEditMode ? "bg-emerald-600 text-white shadow-emerald-600/10 hover:bg-emerald-500" : "bg-blue-600 text-white shadow-blue-600/10 hover:bg-blue-500"}`}
            >
              {isEditMode ? (
                <>
                  <Save className="h-3 w-3" /> {t("save_changes", "Save Changes")}
                </>
              ) : (
                <>
                  <Edit3 className="h-3 w-3" /> {t("edit_profile", "Edit Profile")}
                </>
              )}
            </button>
          </div>
        </div>

        <div className="space-y-4 overflow-y-auto pr-2 pb-4 auth-scroll-user">
          {/* Header Info Card */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-blue-500/5 dark:to-indigo-500/5 border border-blue-100/50 dark:border-blue-500/10 shadow-sm relative group">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
            <div className="relative shrink-0">
              <div
                onClick={() =>
                  isEditMode && !isGoogleUser && fileInputRef.current?.click()
                }
                className={`h-14 w-14 rounded-xl bg-gradient-to-br ${isLecturer ? "from-purple-500 to-indigo-600" : isTechnician ? "from-indigo-500 to-blue-600" : "from-blue-500 to-indigo-600"} flex items-center justify-center text-white text-xl font-black shadow-lg overflow-hidden border-2 border-white dark:border-slate-800 transition-all ${isEditMode && !isGoogleUser ? "cursor-pointer hover:brightness-110 active:scale-95 ring-4 ring-blue-500/20" : ""}`}
              >
                {profileData.profilePicture ? (
                  <img
                    src={getAssetUrl(profileData.profilePicture)}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  profileData.name?.charAt(0).toUpperCase()
                )}
                {isEditMode && !isGoogleUser && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Camera className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
              {isEditMode && !isGoogleUser && profileData.profilePicture && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemovePic();
                  }}
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-lg bg-rose-500 text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-90 transition-all border-2 border-white dark:border-slate-800"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              )}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>

            <div className="flex-1 min-w-0">
              {isEditMode ? (
                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-1">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-600/70 dark:text-blue-400/70 block mb-1">
                      {t("honorific", "Honorific")}
                    </span>
                    <CustomDropdown
                      options={[
                        { value: "", label: t("none", "None") },
                        { value: "Mr.", label: "Mr." },
                        { value: "Ms.", label: "Ms." },
                        { value: "Dr.", label: "Dr." },
                        { value: "Prof.", label: "Prof." },
                        { value: "Rev.", label: "Rev." },
                      ]}
                      value={profileData.honorific}
                      onChange={(val) =>
                        setProfileData((prev) => ({ ...prev, honorific: val }))
                      }
                      padding="px-3 py-2.5"
                      fontSize="text-sm"
                    />
                  </div>
                  <div className="col-span-3">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-600/70 dark:text-blue-400/70 block mb-1">
                      {t("full_name", "Full Name")}
                    </span>
                    {!isGoogleUser ? (
                      <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) =>
                          setProfileData((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        className="w-full bg-white dark:bg-slate-900/50 border border-blue-200 dark:border-blue-500/20 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 shadow-inner transition-all"
                        placeholder={t("placeholder_enter_fullname", "Enter full name...")}
                      />
                    ) : (
                      <h4 className="h-[46px] flex items-center text-base font-black text-slate-700 dark:text-white tracking-tight truncate px-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                        {profileData.name}
                      </h4>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-600/70 dark:text-blue-400/70 block mb-1">
                    {t("full_identity", "Full Identity")}
                  </span>
                  <h4 className="h-[46px] flex items-center text-base font-black text-slate-700 dark:text-white tracking-tight truncate px-4 bg-white/50 dark:bg-slate-900/30 border border-blue-100/50 dark:border-blue-500/10 rounded-xl">
                    <span className="text-blue-600 dark:text-blue-400 mr-2">
                      {profileData.honorific}
                    </span>
                    {profileData.name}
                  </h4>
                </div>
              )}
            </div>
          </div>

          {/* Core Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* User (Student) Fields */}
            {isStudent && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5 ml-1">
                    <Building2 className="h-3 w-3 text-blue-500" /> {t("faculty", "Faculty")}
                  </label>
                  <div
                    className={`p-2.5 rounded-xl border relative transition-all min-h-[46px] flex items-center ${isEditMode ? "bg-white dark:bg-slate-900/50 border-blue-200 shadow-sm" : "bg-slate-50/50 border-slate-100 dark:bg-white/5 dark:border-white/5"}`}
                  >
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-1/2 bg-blue-500 rounded-r-full"></div>
                    {isEditMode ? (
                      <CustomDropdown
                        options={[
                          {
                            value: "Faculty of Computing",
                            label: t("faculty_computing", "Faculty of Computing"),
                          },
                          {
                            value: "Faculty of Business",
                            label: t("faculty_business", "Faculty of Business"),
                          },
                          {
                            value: "Faculty of Engineering",
                            label: t("faculty_engineering", "Faculty of Engineering"),
                          },
                          {
                            value: "Faculty of Science",
                            label: t("faculty_science", "Faculty of Science"),
                          },
                          {
                            value: "Faculty of Humanities",
                            label: t("faculty_humanities", "Faculty of Humanities"),
                          },
                        ]}
                        value={profileData.faculty}
                        onChange={(val) =>
                          setProfileData((prev) => ({ ...prev, faculty: val }))
                        }
                        placeholder={t("placeholder_select_faculty", "Select Faculty")}
                        padding="px-2 py-0"
                        fontSize="text-xs"
                        transparent={true}
                      />
                    ) : (
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300 px-3">
                        {profileData.faculty ? t(getFacultyKey(profileData.faculty), profileData.faculty) : t("not_specified", "Not specified")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5 ml-1">
                    <Wrench className="h-3 w-3 text-emerald-500" />{" "}
                    {t("specialization", "Specialization")}
                  </label>
                  <div
                    className={`p-2.5 rounded-xl border relative transition-all min-h-[46px] flex items-center ${isEditMode ? "bg-white dark:bg-slate-900/50 border-blue-200 shadow-sm" : "bg-slate-50/50 border-slate-100 dark:bg-white/5 dark:border-white/5"}`}
                  >
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-1/2 bg-emerald-500 rounded-r-full"></div>
                    {isEditMode ? (
                      <input
                        type="text"
                        value={profileData.specialization}
                        onChange={(e) =>
                          setProfileData((prev) => ({
                            ...prev,
                            specialization: e.target.value,
                          }))
                        }
                        className="w-full bg-transparent text-xs font-bold outline-none px-2"
                        placeholder={t("placeholder_specialization_eg", "e.g. Software Engineering")}
                      />
                    ) : (
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300 px-3">
                        {profileData.specialization || t("not_specified", "Not specified")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5 ml-1">
                    <GraduationCap className="h-3 w-3 text-purple-500" />{" "}
                    {t("academic_level", "Academic Level")}
                  </label>
                  <div className="flex gap-2">
                    <div
                      className={`flex-1 p-2.5 rounded-xl border relative transition-all min-h-[46px] flex items-center ${isEditMode ? "bg-white dark:bg-slate-900/50 border-blue-200 shadow-sm" : "bg-slate-50/50 border-slate-100 dark:bg-white/5 dark:border-white/5"}`}
                    >
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-1/2 bg-purple-500 rounded-r-full"></div>
                      {isEditMode ? (
                        <CustomDropdown
                          options={[
                            { value: "1st Year", label: t("year_1", "Year 1") },
                            { value: "2nd Year", label: t("year_2", "Year 2") },
                            { value: "3rd Year", label: t("year_3", "Year 3") },
                            { value: "4th Year", label: t("year_4", "Year 4") },
                          ]}
                          value={profileData.year}
                          onChange={(val) =>
                            setProfileData((prev) => ({ ...prev, year: val }))
                          }
                          placeholder={t("year", "Year")}
                          padding="px-2 py-0"
                          fontSize="text-xs"
                          transparent={true}
                        />
                      ) : (
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 px-3">
                          {profileData.year ? t(getYearKey(profileData.year), profileData.year) : t("year", "Year")}
                        </span>
                      )}
                    </div>
                    <div
                      className={`flex-1 p-2.5 rounded-xl border relative transition-all min-h-[46px] flex items-center ${isEditMode ? "bg-white dark:bg-slate-900/50 border-blue-200 shadow-sm" : "bg-slate-50/50 border-slate-100 dark:bg-white/5 dark:border-white/5"}`}
                    >
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-1/2 bg-blue-500 rounded-r-full"></div>
                      {isEditMode ? (
                        <CustomDropdown
                          options={[
                            { value: "Semester 1", label: t("semester_1", "Sem 1") },
                            { value: "Semester 2", label: t("semester_2", "Sem 2") },
                          ]}
                          value={profileData.semester}
                           onChange={(val) =>
                             setProfileData((prev) => ({
                               ...prev,
                               semester: val,
                             }))
                           }
                          placeholder={t("semester", "Semester")}
                          padding="px-2 py-0"
                          fontSize="text-xs"
                          transparent={true}
                        />
                      ) : (
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 px-3">
                          {profileData.semester ? t(getSemesterKey(profileData.semester), profileData.semester) : t("semester", "Semester")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Lecturer Shared Fields */}
            {isLecturer && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5 ml-1">
                    <Building2 className="h-3 w-3 text-blue-500" /> {t("faculty", "Faculty")}
                  </label>
                  <div
                    className={`p-2.5 rounded-xl border relative transition-all min-h-[46px] flex items-center ${isEditMode ? "bg-white dark:bg-slate-900/50 border-blue-200 shadow-sm" : "bg-slate-50/50 border-slate-100 dark:bg-white/5 dark:border-white/5"}`}
                  >
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-1/2 bg-blue-500 rounded-r-full"></div>
                    {isEditMode ? (
                      <CustomDropdown
                        options={[
                          {
                            value: "Faculty of Computing",
                            label: t("faculty_computing", "Faculty of Computing"),
                          },
                          {
                            value: "Faculty of Business",
                            label: t("faculty_business", "Faculty of Business"),
                          },
                          {
                            value: "Faculty of Engineering",
                            label: t("faculty_engineering", "Faculty of Engineering"),
                          },
                          {
                            value: "Faculty of Science",
                            label: t("faculty_science", "Faculty of Science"),
                          },
                          {
                            value: "Faculty of Humanities",
                            label: t("faculty_humanities", "Faculty of Humanities"),
                          },
                        ]}
                        value={profileData.faculty}
                        onChange={(val) =>
                          setProfileData((prev) => ({ ...prev, faculty: val }))
                        }
                        placeholder={t("placeholder_select_faculty", "Select Faculty")}
                        padding="px-2 py-0"
                        fontSize="text-xs"
                        transparent={true}
                      />
                    ) : (
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300 px-3">
                        {profileData.faculty ? t(getFacultyKey(profileData.faculty), profileData.faculty) : t("not_specified", "Not specified")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5 ml-1">
                    <Briefcase className="h-3 w-3 text-indigo-500" /> {t("department", "Department")}
                  </label>
                  <div
                    className={`p-2.5 rounded-xl border relative transition-all min-h-[46px] flex items-center ${isEditMode ? "bg-white dark:bg-slate-900/50 border-blue-200 shadow-sm" : "bg-slate-50/50 border-slate-100 dark:bg-white/5 dark:border-white/5"}`}
                  >
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-1/2 bg-indigo-500 rounded-r-full"></div>
                    {isEditMode ? (
                      <input
                        type="text"
                        value={profileData.department}
                        onChange={(e) =>
                          setProfileData((prev) => ({
                            ...prev,
                            department: e.target.value,
                          }))
                        }
                        className="w-full bg-transparent text-xs font-bold outline-none px-2"
                        placeholder={t("placeholder_specialization_eg", "e.g. Software Engineering")}
                      />
                    ) : (
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300 px-2">
                        {profileData.department || t("not_specified", "Not specified")}
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Lecturer Specific Fields */}
            {isLecturer && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5 ml-1">
                    <GraduationCap className="h-3 w-3 text-purple-500" />{" "}
                    {t("designation", "Designation")}
                  </label>
                  <div
                    className={`p-2.5 rounded-xl border relative transition-all min-h-[46px] flex items-center ${isEditMode ? "bg-white dark:bg-slate-900/50 border-blue-200 shadow-sm" : "bg-slate-50/50 border-slate-100 dark:bg-white/5 dark:border-white/5"}`}
                  >
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-1/2 bg-purple-500 rounded-r-full"></div>
                    {isEditMode ? (
                      <CustomDropdown
                        options={[
                          { value: "Lecturer", label: t("designation_lecturer", "Lecturer") },
                          {
                            value: "Senior Lecturer",
                            label: t("designation_senior_lecturer", "Senior Lecturer"),
                          },
                          { value: "Professor", label: t("designation_professor", "Professor") },
                        ]}
                        value={profileData.designation}
                        onChange={(val) =>
                          setProfileData((prev) => ({
                            ...prev,
                            designation: val,
                          }))
                        }
                        placeholder={t("select", "Select")}
                        padding="px-2 py-0"
                        fontSize="text-xs"
                        transparent={true}
                      />
                    ) : (
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300 px-3">
                        {profileData.designation ? t(getDesignationKey(profileData.designation), profileData.designation) : t("not_specified", "Not specified")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Batch Tags Card */}
                <div className="md:col-span-2 space-y-2 pt-2">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                      <Users className="h-3 w-3 text-indigo-500" /> {t("assigned_batches", "Assigned Batches")}
                    </label>
                    {isEditMode && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-20">
                          <CustomDropdown
                            options={[
                              { value: "1st Year", label: t("year_1_short", "Y1") },
                              { value: "2nd Year", label: t("year_2_short", "Y2") },
                              { value: "3rd Year", label: t("year_3_short", "Y3") },
                              { value: "4th Year", label: t("year_4_short", "Y4") },
                            ]}
                            value={profileData.year}
                            onChange={(val) =>
                              setProfileData((prev) => ({ ...prev, year: val }))
                            }
                            placeholder={t("year", "Year")}
                            padding="px-2 py-1.5"
                            fontSize="text-[10px]"
                            transparent={false}
                          />
                        </div>
                        <div className="w-20">
                          <CustomDropdown
                            options={[
                              { value: "Semester 1", label: t("semester_1_short", "Sem 1") },
                              { value: "Semester 2", label: t("semester_2_short", "Sem 2") },
                            ]}
                            value={profileData.semester}
                            onChange={(val) =>
                              setProfileData((prev) => ({
                                ...prev,
                                semester: val,
                              }))
                            }
                            placeholder={t("semester", "Semester")}
                            padding="px-2 py-1.5"
                            fontSize="text-[10px]"
                            transparent={false}
                          />
                        </div>
                        <button
                          onClick={() => {
                            if (!profileData.year || !profileData.semester)
                              return;
                            const y = profileData.year.split(" ")[0].charAt(0);
                            const s = profileData.semester.split(" ")[1];
                            const tag = `Y${y}S${s}`;
                            const list = profileData.batches
                              ? profileData.batches
                                  .split(",")
                                  .map((b) => b.trim())
                              : [];
                            if (list.includes(tag)) return;
                            setProfileData((prev) => ({
                              ...prev,
                              batches: [...list, tag].join(", "),
                            }));
                          }}
                          className="h-[34px] px-3 rounded-xl bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest hover:bg-blue-500 active:scale-95 transition-all shadow-md shadow-blue-600/10"
                        >
                          {t("add", "Add")}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50/50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex flex-wrap gap-2.5 min-h-[50px]">
                    {profileData.batches ? (
                      profileData.batches.split(",").map((batch, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-blue-50/50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 text-[10px] font-black text-blue-600 dark:text-blue-400 shadow-sm"
                        >
                          {batch.trim()}
                          {isEditMode && (
                            <button
                              onClick={() => {
                                const list = profileData.batches
                                  .split(",")
                                  .map((b) => b.trim())
                                  .filter((_, i) => i !== idx)
                                  .join(", ");
                                setProfileData((prev) => ({
                                  ...prev,
                                  batches: list,
                                }));
                              }}
                            >
                              <X className="h-3 w-3 hover:text-rose-500 transition-colors" />
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 italic flex items-center h-full">
                        {t("no_batches_assigned", "No batches assigned")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5 ml-1">
                    <BookOpen className="h-3 w-3 text-amber-500" /> {t("modules", "Modules")}
                  </label>
                  <div
                    className={`p-2.5 rounded-xl border relative transition-all ${isEditMode ? "bg-white dark:bg-slate-900/50 border-blue-200" : "bg-slate-50/50 border-slate-100 dark:bg-white/5 dark:border-white/5"}`}
                  >
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-1/2 bg-amber-500 rounded-r-full"></div>
                    {isEditMode ? (
                      <input
                        type="text"
                        value={profileData.modules}
                        onChange={(e) =>
                          setProfileData((prev) => ({
                            ...prev,
                            modules: e.target.value,
                          }))
                        }
                        className="w-full bg-transparent text-xs font-bold outline-none"
                        placeholder={t("placeholder_modules_eg", "e.g. OOP, DBMS")}
                      />
                    ) : (
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        {profileData.modules || t("not_specified", "Not specified")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5 ml-1">
                    <MapPin className="h-3 w-3 text-rose-500" /> {t("office_location", "Office Location")}
                  </label>
                  <div
                    className={`p-2.5 rounded-xl border relative transition-all ${isEditMode ? "bg-white dark:bg-slate-900/50 border-blue-200" : "bg-slate-50/50 border-slate-100 dark:bg-white/5 dark:border-white/5"}`}
                  >
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-1/2 bg-rose-500 rounded-r-full"></div>
                    {isEditMode ? (
                      <input
                        type="text"
                        value={profileData.officeLocation}
                        onChange={(e) =>
                          setProfileData((prev) => ({
                            ...prev,
                            officeLocation: e.target.value,
                          }))
                        }
                        className="w-full bg-transparent text-xs font-bold outline-none"
                        placeholder={t("placeholder_office_eg", "e.g. Level 4")}
                      />
                    ) : (
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        {profileData.officeLocation || t("not_specified", "Not specified")}
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Technician Fields */}
            {isTechnician && (
              <>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5 ml-1">
                    <Wrench className="h-3 w-3 text-indigo-500" /> {t("technical_category", "Technical Category")}
                  </label>
                  <div
                    className={`p-2.5 rounded-xl border relative transition-all min-h-[46px] flex items-center ${isEditMode ? "bg-white dark:bg-slate-900/50 border-blue-200 shadow-sm" : "bg-slate-50/50 border-slate-100 dark:bg-white/5 dark:border-white/5"}`}
                  >
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-1/2 bg-indigo-500 rounded-r-full"></div>
                    {isEditMode ? (
                      <CustomDropdown
                        options={[
                          { value: "IT Technician", label: t("tech_category_it", "IT Technician") },
                          {
                            value: "Electrical Technician",
                            label: t("tech_category_electrical", "Electrical Technician"),
                          },
                          {
                            value: "Mechanical Technician",
                            label: t("tech_category_mechanical", "Mechanical Technician"),
                          },
                          {
                            value: "Maintenance Technician",
                            label: t("tech_category_maintenance", "Maintenance Technician"),
                          },
                        ]}
                        value={profileData.specialization}
                        onChange={(val) =>
                          setProfileData((prev) => ({
                            ...prev,
                            specialization: val,
                          }))
                        }
                        placeholder={t("select", "Select")}
                        padding="px-2 py-0"
                        fontSize="text-xs"
                        transparent={true}
                      />
                    ) : (
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300 px-3">
                        {profileData.specialization ? t(getTechCategoryKey(profileData.specialization), profileData.specialization) : t("not_specified", "Not specified")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5 ml-1">
                    <Hash className="h-3 w-3 text-emerald-500" /> {t("employee_id", "Employee ID")}
                  </label>
                  <div
                    className={`p-2.5 rounded-xl border relative transition-all ${isEditMode ? "bg-white dark:bg-slate-900/50 border-blue-200" : "bg-slate-50/50 border-slate-100 dark:bg-white/5 dark:border-white/5"}`}
                  >
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-1/2 bg-emerald-500 rounded-r-full"></div>
                    {isEditMode ? (
                      <input
                        type="text"
                        value={profileData.employeeId}
                        onChange={(e) =>
                          setProfileData((prev) => ({
                            ...prev,
                            employeeId: e.target.value,
                          }))
                        }
                        className="w-full bg-transparent text-xs font-bold outline-none"
                        placeholder={t("placeholder_employee_eg", "e.g. EMP123")}
                      />
                    ) : (
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        {profileData.employeeId || t("not_specified", "Not specified")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5 ml-1">
                      <ClipboardList className="h-3 w-3 text-amber-500" />{" "}
                      {t("technical_skills", "Technical Skills")}
                    </label>
                    <div
                      className={`p-2.5 rounded-xl border relative transition-all ${isEditMode ? "bg-white dark:bg-slate-900/50 border-blue-200" : "bg-slate-50/50 border-slate-100 dark:bg-white/5 dark:border-white/5"}`}
                    >
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-1/2 bg-amber-500 rounded-r-full"></div>
                      {isEditMode ? (
                        <input
                          type="text"
                          value={profileData.skills}
                          onChange={(e) =>
                            setProfileData((prev) => ({
                              ...prev,
                              skills: e.target.value,
                            }))
                          }
                          className="w-full bg-transparent text-xs font-bold outline-none"
                          placeholder={t("placeholder_skills_eg", "e.g. Networking, Repairing, Electrical")}
                        />
                      ) : (
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                          {profileData.skills || t("not_specified", "Not specified")}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5 ml-1">
                      <MapPin className="h-3 w-3 text-rose-500" /> {t("assigned_areas", "Assigned Areas")}
                    </label>
                    <div
                      className={`p-2.5 rounded-xl border relative transition-all ${isEditMode ? "bg-white dark:bg-slate-900/50 border-blue-200" : "bg-slate-50/50 border-slate-100 dark:bg-white/5 dark:border-white/5"}`}
                    >
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-1/2 bg-rose-500 rounded-r-full"></div>
                      {isEditMode ? (
                        <input
                          type="text"
                          value={profileData.assignedAreas}
                          onChange={(e) =>
                            setProfileData((prev) => ({
                              ...prev,
                              assignedAreas: e.target.value,
                            }))
                          }
                          className="w-full bg-transparent text-xs font-bold outline-none"
                          placeholder={t("placeholder_areas_eg", "e.g. IT Labs, Server Room")}
                        />
                      ) : (
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                          {profileData.assignedAreas || t("not_specified", "Not specified")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {(isLecturer || isTechnician) && (
              <div className="space-y-1 md:col-span-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5 ml-1">
                  <Clock className="h-3 w-3 text-indigo-500" /> {t("working_hours", "Working Hours")}
                </label>
                <div
                  className={`p-2.5 rounded-xl border relative transition-all ${isEditMode ? "bg-white dark:bg-slate-900/50 border-blue-200" : "bg-slate-50/50 border-slate-100 dark:bg-white/5 dark:border-white/5"}`}
                >
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-1/2 bg-indigo-500 rounded-r-full"></div>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={profileData.workingHours}
                      onChange={(e) =>
                        setProfileData((prev) => ({
                          ...prev,
                          workingHours: e.target.value,
                        }))
                      }
                      className="w-full bg-transparent text-xs font-bold outline-none"
                      placeholder={t("placeholder_hours_eg", "e.g. 8:00 AM - 4:00 PM")}
                    />
                  ) : (
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      {profileData.workingHours || t("not_specified", "Not specified")}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-1 md:col-span-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5 ml-1">
                <AlignLeft className="h-3 w-3 text-slate-500" /> {t("bio", "Bio")}
              </label>
              <div
                className={`p-2.5 rounded-xl border relative transition-all ${isEditMode ? "bg-white dark:bg-slate-900/50 border-blue-200" : "bg-slate-50/50 border-slate-100 dark:bg-white/5 dark:border-white/5"}`}
              >
                <div className="absolute left-0 top-4 w-0.5 h-6 bg-slate-400 rounded-r-full"></div>
                {isEditMode ? (
                  <textarea
                    value={profileData.bio}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        bio: e.target.value,
                      }))
                    }
                    className="w-full bg-transparent text-xs font-bold outline-none min-h-[60px] resize-none"
                    placeholder={t("placeholder_bio_eg", "Tell us about yourself...")}
                  />
                ) : (
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300 leading-relaxed">
                    {profileData.bio || t("no_bio_added", "No bio added yet.")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const { logout } = useAuth();

  const renderAccountSettings = () => (
    <div className="animate-reveal h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
          {t("account_settings", "Account Settings")}
        </h3>
      </div>

      <div className="space-y-3 flex-1">
        {/* Email Row */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5 group">
          <div className="flex flex-col">
            <span className="text-[11px] font-black uppercase tracking-widest block mb-1.5">
              {t("email_address", "Email Address")}
            </span>
            <div className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Mail className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
              <span className="text-xs font-bold">{user?.email}</span>
            </div>
          </div>
          <div className="px-2 py-1 rounded-xl bg-emerald-500/10 text-[8px] font-black uppercase tracking-widest text-emerald-600">
            {t("verified", "Verified")}
          </div>
        </div>

        {/* Password Row */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5 transition-all hover:border-slate-200 dark:hover:border-white/10 group">
          <div className="flex flex-col">
            <span className="text-[11px] font-black uppercase tracking-widest block mb-1.5">
              {t("password", "Password")}
            </span>
            <div className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Lock className="h-3.5 w-3.5 text-slate-400 group-hover:text-amber-500 transition-colors" />
              <span className="text-xs font-bold">••••••••••••</span>
            </div>
          </div>
          {!isGoogleUser ? (
            <button
              onClick={handleStartPwChange}
              className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[8px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm active:scale-95"
            >
              {t("update_password", "Update Password")}
            </button>
          ) : (
            <div className="px-2 py-1 rounded-xl bg-blue-500/10 text-[8px] font-black uppercase tracking-widest text-blue-600">
              {t("managed_by_google", "Managed by Google")}
            </div>
          )}
        </div>

        {isGoogleUser && (
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-500/20 flex items-center gap-3">
            <Info className="h-4 w-4 text-blue-600" />
            <p className="text-[10px] font-bold text-blue-800 dark:text-blue-300">
              {t("signed_in_with_google", "Signed in with Google account")}
            </p>
          </div>
        )}
      </div>

      <div className="pt-4 mt-auto border-t border-slate-100 dark:border-white/5">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all font-black text-xs uppercase tracking-widest shadow-sm group"
        >
          <LogOut className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          {t("logout_from_system", "Logout from System")}
        </button>
      </div>
    </div>
  );

  const renderNotificationSettings = () => {
    const isLecturer = user?.roles?.includes("LECTURER");
    const items = [
      {
        id: "all",
        title: t("all_notifications", "All Notifications"),
        desc: t("all_notifications_desc", "Global toggle for all system activities"),
      },
      {
        id: "booking",
        title: t("bookings", "Bookings"),
        desc: t("bookings_notif_desc", "Reservations, approvals, and facility updates"),
      },
      {
        id: "ticket",
        title: t("tickets", "Tickets"),
        desc: t("tickets_notif_desc", "Status changes and technical support"),
      },
      {
        id: "lecture",
        title: t("lectures", "Lectures"),
        desc: t("lectures_notif_desc", "Materials, session updates, and academic alerts"),
      },
    ].filter((item) => !(item.id === "lecture" && isLecturer));

    return (
      <div className="space-y-4 animate-reveal">
        <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight mb-6">
          {t("preferences", "Preferences")}
        </h3>
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-center justify-between p-3 rounded-xl border transition-all ${notifications[item.id] ? "bg-blue-50/50 dark:bg-blue-500/5 border-blue-100 dark:border-blue-500/20" : "bg-slate-50/50 dark:bg-slate-800/40 border-slate-100 dark:border-white/5"}`}
          >
            <div className="flex flex-col">
              <h4 className="text-xs font-black text-slate-900 dark:text-white">
                {item.title}
              </h4>
              <p className="text-[9px] font-bold text-slate-400">{item.desc}</p>
            </div>
            <button
              onClick={() => handleToggleNotification(item.id)}
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${
                notifications[item.id]
                  ? "bg-blue-600"
                  : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <span
                className={`h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${notifications[item.id] ? "translate-x-4" : "translate-x-0"}`}
              />
            </button>
          </div>
        ))}
      </div>
    );
  };

  const renderAppearanceSettings = () => (
    <div className="space-y-3 animate-reveal h-full flex flex-col">
      <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight mb-4">
        {t("visual_theme")}
      </h3>
      <div className="grid grid-cols-1 gap-2.5">
        {[
          { id: "system", title: t("theme_system"), icon: Monitor },
          { id: "light", title: t("theme_light"), icon: Sun },
          { id: "dark", title: t("theme_dark"), icon: Moon },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setTheme(item.id)}
            className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
              theme === item.id
                ? "bg-blue-50 dark:bg-blue-600/10 border-blue-500 shadow-sm"
                : "bg-slate-50/50 dark:bg-slate-800/40 border-slate-100 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20 group"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`h-8 w-8 rounded-xl flex items-center justify-center transition-all ${theme === item.id ? "bg-blue-600 text-white" : "bg-slate-200 dark:bg-white/5 text-slate-400 group-hover:bg-blue-500/10"}`}
              >
                <item.icon className="h-3.5 w-3.5" />
              </div>
              <span
                className={`text-xs font-black transition-colors ${theme === item.id ? "text-blue-600 dark:text-blue-400" : "text-slate-900 dark:text-slate-300"}`}
              >
                {item.title}
              </span>
            </div>
            {theme === item.id && (
              <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center animate-in zoom-in duration-300">
                <Check className="h-3 w-3 text-white" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );

  const renderLanguageSettings = () => {
    const options = [
      { code: "en", label: "English" },
      { code: "si", label: "සිංහල" },
      { code: "ta", label: "தமிழ்" },
    ];

    return (
      <div className="space-y-4 animate-reveal h-full flex flex-col">
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight mb-2">
            {t("language_preferences")}
          </h3>
          <p className="text-xs font-bold text-slate-400 mb-6">
            {t("choose_preferred_language")}
          </p>
        </div>

        <div className="space-y-3">
          {options.map((opt) => {
            const isSelected = i18n.language?.startsWith(opt.code);
            return (
              <button
                key={opt.code}
                type="button"
                onClick={() => i18n.changeLanguage(opt.code)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                  isSelected
                    ? "bg-blue-50/50 dark:bg-blue-600/10 border-blue-500 shadow-sm"
                    : "bg-slate-50/50 dark:bg-slate-800/40 border-slate-100 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/20"
                }`}
              >
                <span className="text-xs font-black text-slate-900 dark:text-slate-300">
                  {opt.label}
                </span>
                <div
                  className={`h-5.5 w-5.5 rounded-full border-2 flex items-center justify-center transition-all ${
                    isSelected
                      ? "border-blue-600 bg-blue-600 text-white animate-in zoom-in duration-300"
                      : "border-slate-300 dark:border-slate-700"
                  }`}
                >
                  {isSelected && (
                    <div className="h-2 w-2 rounded-full bg-white" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const strength = getPasswordStrength(pwData.newPassword, t);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={t("system_setting")}
        subtitle={t("set_preferences_sub")}
        maxWidth="max-w-4xl"
        scrollable={false}
      >
        <div className="flex h-[420px] -mx-6 sm:-mx-8 lg:-mx-10 -my-4 sm:-my-6 rounded-b-2xl overflow-hidden">
          {/* Sidebar */}
          <div className="w-52 shrink-0 border-r border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/50 p-4 flex flex-col gap-1">
            <div className="px-3 mb-4">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                {t("settings")}
              </span>
            </div>
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`group relative flex items-center gap-3 px-3 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                  activeSection === section.id
                    ? "bg-blue-600 text-white shadow-xl shadow-blue-600/20 scale-[1.02] z-10"
                    : "text-slate-500 dark:text-slate-400 hover:bg-blue-600/5 hover:text-blue-600 dark:hover:text-blue-400"
                }`}
              >
                <div
                  className={`shrink-0 transition-transform duration-300 ${activeSection === section.id ? "scale-110" : "group-hover:scale-110"}`}
                >
                  <section.icon
                    className={`h-4 w-4 ${activeSection === section.id ? "text-white" : "text-slate-400 group-hover:text-blue-500 dark:group-hover:text-blue-400"}`}
                  />
                </div>
                <span className="relative z-10">
                  {section.label.split(" ")[0]}
                </span>

                {activeSection === section.id && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-white animate-in slide-in-from-left duration-300"></div>
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden p-6 settings-scroll bg-white dark:bg-[#0F172A]/50 overflow-y-auto">
            {activeSection === "profile" && renderProfileSettings()}
            {activeSection === "language" && renderLanguageSettings()}
            {activeSection === "account" && renderAccountSettings()}
            {activeSection === "notifications" && renderNotificationSettings()}
            {activeSection === "appearance" && renderAppearanceSettings()}
          </div>
        </div>
      </Modal>

      {/* PASSWORD RESET POPUP OVERLAY */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-xl bg-[#f0f2f5] dark:bg-[#1E293B] p-8 shadow-2xl animate-in zoom-in duration-300 border border-transparent dark:border-white/5">
            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(false)}
              className="absolute right-2 top-2 p-2.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all group active:scale-90"
            >
              <X className="h-5 w-5 transition-transform group-hover:rotate-90" />
            </button>

            <div className="mb-6 text-center">
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {pwStep === "email" && t("request_verification_code", "Request Verification Code")}
                {pwStep === "verify" && t("verify_security_code", "Verify Security Code")}
                {pwStep === "reset" && t("reset_your_password", "Reset Your Password")}
              </h3>
              <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                {pwStep === "email" &&
                  t("verification_description", "Enter your registered email to receive a verification code.")}
                {pwStep === "verify" &&
                  t("code_verification_description", "Enter the 6-digit code shown in the popup.")}
                {pwStep === "reset" &&
                  t("reset_description", "Enter your new secure password below to update your account.")}
              </p>
            </div>

            {pwStep === "email" && (
              <form onSubmit={handleRequestCode} className="space-y-5">
                <div className="relative group">
                  <input
                    id="settingsResetEmail"
                    type="email"
                    required
                    value={pwData.email}
                    readOnly
                    className="block w-full px-4 py-4 bg-white dark:bg-slate-900/50 border-2 border-slate-100 dark:border-white/5 rounded-xl text-slate-900 dark:text-white text-sm font-bold shadow-sm outline-none"
                  />
                  <label
                    htmlFor="settingsResetEmail"
                    className="absolute left-4 -top-2.5 px-1 text-xs font-black text-blue-600 bg-white dark:bg-slate-800 rounded shadow-sm"
                  >
                    {t("registered_email_address_label", "Registered Email Address")}
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={isPwSubmitting}
                  className="w-full rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-black text-white transition hover:bg-blue-700 shadow-lg shadow-blue-600/20 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isPwSubmitting ? t("sending", "Sending...") : t("send_verification_code", "Send Verification Code")}
                </button>
              </form>
            )}

            {pwStep === "verify" && (
              <form onSubmit={handleVerifyCode} className="space-y-5">
                <div className="relative group">
                  <input
                    id="settingsVerifyCode"
                    type="text"
                    required
                    maxLength={6}
                    value={pwData.code}
                    onChange={(e) =>
                      setPwData({ ...pwData, code: e.target.value })
                    }
                    onFocus={() => setFocusedInput("settingsVerifyCode")}
                    onBlur={() => setFocusedInput(null)}
                    className="block w-full px-4 py-4 bg-white dark:bg-slate-900/50 border-2 border-slate-100 dark:border-white/5 rounded-xl text-slate-900 dark:text-white text-sm font-bold shadow-sm outline-none focus:border-blue-600 transition-all"
                  />
                  <label
                    htmlFor="settingsVerifyCode"
                    className={`absolute left-4 transition-all duration-300 pointer-events-none px-1 ${focusedInput === "settingsVerifyCode" || pwData.code ? "-top-2.5 text-xs font-black text-blue-600 rounded shadow-sm bg-white dark:bg-slate-800" : "top-4 text-slate-400 text-sm font-bold bg-transparent shadow-none"}`}
                  >
                    {t("verification_code_field_label", "6-Digit Verification Code")}
                  </label>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={isPwSubmitting || resendCooldownSeconds > 0}
                    className="text-xs font-bold text-blue-600 transition hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {resendCooldownSeconds > 0
                      ? `${t("resend_code", "Resend Code")} (${resendCooldownSeconds}s)`
                      : t("resend_code", "Resend Code")}
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-black text-white transition hover:bg-blue-700 shadow-lg shadow-blue-600/20"
                >
                  {t("verify_code", "Verify Code")}
                </button>
              </form>
            )}

            {pwStep === "reset" && (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div className="relative group">
                  <input
                    id="settingsCurrentPassword"
                    type={showPasswords.current ? "text" : "password"}
                    required
                    value={pwData.currentPassword}
                    onChange={(e) =>
                      setPwData({ ...pwData, currentPassword: e.target.value })
                    }
                    onFocus={() => setFocusedInput("settingsCurrentPassword")}
                    onBlur={() => setFocusedInput(null)}
                    className="block w-full px-4 py-4 bg-white dark:bg-slate-900/50 border-2 border-slate-100 dark:border-white/5 rounded-xl text-slate-900 dark:text-white text-sm font-bold shadow-sm outline-none focus:border-blue-600 transition-all pr-12"
                  />
                  <label
                    htmlFor="settingsCurrentPassword"
                    className={`absolute left-4 transition-all duration-300 pointer-events-none px-1 ${focusedInput === "settingsCurrentPassword" || pwData.currentPassword ? "-top-2.5 text-xs font-black text-blue-600 rounded shadow-sm bg-white dark:bg-slate-800" : "top-4 text-slate-400 text-sm font-bold bg-transparent shadow-none"}`}
                  >
                    {t("current_password", "Current Password")}
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setShowPasswords({
                        ...showPasswords,
                        current: !showPasswords.current,
                      })
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswords.current ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="relative group">
                    <input
                      id="settingsNewPassword"
                      type={showPasswords.new ? "text" : "password"}
                      required
                      value={pwData.newPassword}
                      onChange={(e) =>
                        setPwData({ ...pwData, newPassword: e.target.value })
                      }
                      onFocus={() => setFocusedInput("settingsNewPassword")}
                      onBlur={() => setFocusedInput(null)}
                      className="block w-full px-4 py-4 bg-white dark:bg-slate-900/50 border-2 border-slate-100 dark:border-white/5 rounded-xl text-slate-900 dark:text-white text-sm font-bold shadow-sm outline-none focus:border-blue-600 transition-all pr-12"
                    />
                    <label
                      htmlFor="settingsNewPassword"
                      className={`absolute left-4 transition-all duration-300 pointer-events-none px-1 ${focusedInput === "settingsNewPassword" || pwData.newPassword ? "-top-2.5 text-xs font-black text-blue-600 rounded shadow-sm bg-white dark:bg-slate-800" : "top-4 text-slate-400 text-sm font-bold bg-transparent shadow-none"}`}
                    >
                      {t("new_password", "New Password")}
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords({
                          ...showPasswords,
                          new: !showPasswords.new,
                        })
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPasswords.new ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>

                  {/* STRENGTH METER */}
                  {pwData.newPassword && (
                    <div className="px-1 animate-in fade-in slide-in-from-top-1 duration-300">
                      <div
                        className={`h-1.5 transition-all duration-500 rounded-full ${strength?.colorClass} ${strength?.widthClass}`}
                      />
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm">{strength?.emoji}</span>
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-tight">
                          <span className="text-slate-900 dark:text-white mr-1">
                            {strength?.label}
                          </span>
                          {strength?.description}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative group">
                  <input
                    id="settingsConfirmPassword"
                    type={showPasswords.confirm ? "text" : "password"}
                    required
                    value={pwData.confirmPassword}
                    onChange={(e) =>
                      setPwData({ ...pwData, confirmPassword: e.target.value })
                    }
                    onFocus={() => setFocusedInput("settingsConfirmPassword")}
                    onBlur={() => setFocusedInput(null)}
                    className="block w-full px-4 py-4 bg-white dark:bg-slate-900/50 border-2 border-slate-100 dark:border-white/5 rounded-xl text-slate-900 dark:text-white text-sm font-bold shadow-sm outline-none focus:border-blue-600 transition-all pr-12"
                  />
                  <label
                    htmlFor="settingsConfirmPassword"
                    className={`absolute left-4 transition-all duration-300 pointer-events-none px-1 ${focusedInput === "settingsConfirmPassword" || pwData.confirmPassword ? "-top-2.5 text-xs font-black text-blue-600 rounded shadow-sm bg-white dark:bg-slate-800" : "top-4 text-slate-400 text-sm font-bold bg-transparent shadow-none"}`}
                  >
                    {t("confirm_new_password", "Confirm New Password")}
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setShowPasswords({
                        ...showPasswords,
                        confirm: !showPasswords.confirm,
                      })
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswords.confirm ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isPwSubmitting}
                  className="w-full rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-black text-white transition hover:bg-blue-700 shadow-lg shadow-blue-600/20"
                >
                  {isPwSubmitting ? t("resetting", "Resetting...") : t("reset_password", "Reset Password")}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default SettingsModal;
