import React, { useEffect, useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
// background image removed: bg3.jpeg not present in assets
import {
  decodeJwtPayload,
  getLandingRouteFromToken,
  useAuth,
} from "../context/AuthContext";
import { useAlert } from "../context/AlertContext";
import { useTranslation } from "react-i18next";

import {
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  GraduationCap,
  LayoutDashboard,
  CalendarCheck,
  ClipboardList,
  ChevronDown,
  Check,
} from "lucide-react";
import GoogleAuthButton from "../components/GoogleAuthButton";
import ForgotPasswordModal from "../components/ForgotPasswordModal";
import RoleSelector from "../components/RoleSelector";

const ADMIN_EMAIL_PATTERN = /^admin.*@unisphere\.com$/i;
const TECH_EMAIL_PATTERN = /^tech.*@unisphere\.com$/i;
const LECTURER_EMAIL_PATTERN = /^lec.*@unisphere\.com$/i;
const USER_FORBIDDEN_PREFIX_PATTERN = /^(admin|tech|lec).*/i;
const USER_FORBIDDEN_DOMAIN_PATTERN = /@unisphere\.com$/i;

const REGISTER_ROLE_THEME = {
  USER: {
    selectorActive: "from-[#4338ca] to-[#6366f1]",
    selectorShadow: "shadow-indigo-500/20",
    selectorRing: "ring-indigo-500",
    buttonGradient:
      "from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/30",
    buttonShadow: "shadow-indigo-500/30",
    linkText: "text-indigo-400",
    successBox: "border-indigo-500/20 bg-indigo-500/10 text-indigo-300",
  },
  ADMIN: {
    selectorActive: "from-[#4338ca] to-[#6366f1]",
    selectorShadow: "shadow-indigo-500/20",
    selectorRing: "ring-indigo-500",
    buttonGradient:
      "from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/30",
    buttonShadow: "shadow-indigo-500/30",
    linkText: "text-indigo-400",
    successBox: "border-indigo-500/20 bg-indigo-500/10 text-indigo-300",
  },
  TECHNICIAN: {
    selectorActive: "from-[#4338ca] to-[#6366f1]",
    selectorShadow: "shadow-indigo-500/20",
    selectorRing: "ring-indigo-500",
    buttonGradient:
      "from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/30",
    buttonShadow: "shadow-indigo-500/30",
    linkText: "text-indigo-400",
    successBox: "border-indigo-500/20 bg-indigo-500/10 text-indigo-300",
  },
  LECTURER: {
    selectorActive: "from-purple-600 to-indigo-600",
    selectorShadow: "shadow-purple-500/20",
    selectorRing: "ring-purple-500",
    buttonGradient:
      "from-purple-600 to-indigo-600 shadow-lg shadow-purple-500/30",
    buttonShadow: "shadow-purple-500/30",
    linkText: "text-purple-400",
    successBox: "border-purple-500/20 bg-purple-500/10 text-purple-300",
  },
};

const validateEmailByRole = (role, email, t) => {
  if (!email) return "";
  const normalizedEmail = email.trim();
  if (role === "ADMIN" && !ADMIN_EMAIL_PATTERN.test(normalizedEmail))
    return t("err_admin_email");
  if (role === "TECHNICIAN" && !TECH_EMAIL_PATTERN.test(normalizedEmail))
    return t("err_tech_email");
  if (role === "LECTURER" && !LECTURER_EMAIL_PATTERN.test(normalizedEmail))
    return t("err_lecturer_email");
  if (
    role === "USER" &&
    (USER_FORBIDDEN_PREFIX_PATTERN.test(normalizedEmail) ||
      USER_FORBIDDEN_DOMAIN_PATTERN.test(normalizedEmail))
  )
    return t("err_user_email");
  return "";
};

const getPasswordStrength = (pwd, t) => {
  if (!pwd) return null;

  const hasMinLength = pwd.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(pwd);
  const hasNumber = /\d/.test(pwd);
  const hasSpecial = /[^a-zA-Z0-9]/.test(pwd);

  if (!hasMinLength) {
    return {
      emoji: "😠",
      key: "weak",
      label: t ? t("pwd_weak") : "Weak.",
      description: t ? t("pwd_weak_desc") : "Must contain at least 8 characters",
      colorClass: "bg-red-600",
      widthClass: "w-1/4",
    };
  }
  if (!hasLetter) {
    return {
      emoji: "😐",
      key: "fair",
      label: t ? t("pwd_fair") : "Fair.",
      description: t ? t("pwd_fair_desc") : "Must contain at least 1 letter",
      colorClass: "bg-orange-500",
      widthClass: "w-2/4",
    };
  }
  if (!hasSpecial) {
    return {
      emoji: "😕",
      key: "good",
      label: t ? t("pwd_good") : "Good.",
      description: t ? t("pwd_good_desc") : "Must contain special symbol",
      colorClass: "bg-yellow-500",
      widthClass: "w-3/4",
    };
  }
  return {
    emoji: "😎",
    key: "strong",
    label: t ? t("pwd_strong") : "Strong!",
    description: t ? t("pwd_strong_desc") : "You have a secure password",
    colorClass: "bg-green-500",
    widthClass: "w-full",
  };
};

function LoginForm({ onForgotPasswordClick = () => {}, fixedRole }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { showAlert } = useAlert();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleManualAuth = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const { data } = await api.post("/auth/login", { email, password });
      const decodedToken = decodeJwtPayload(data.token);
      if (!decodedToken) {
        showAlert("error", t("err_role_token"));
        return;
      }
      const resolvedRoute = getLandingRouteFromToken(data.token);
      loginUser(data.token, {
        id: decodedToken.id || data.id,
        name: decodedToken.name || data.name,
        email: decodedToken.email || data.email,
        roles: decodedToken.roles,
      });
      navigate(resolvedRoute, { replace: true });
    } catch (err) {
      if (err.code === "ERR_NETWORK")
        showAlert("error", t("err_network"));
      else if (err.response?.status === 401)
        showAlert("error", t("err_invalid_auth"));
      else if (err.response?.status === 503)
        showAlert("error", t("err_service_unavailable"));
      else
        showAlert(
          "error",
          err.response?.data?.message || t("err_auth_failed"),
        );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <h2
        className="text-center font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-200 via-blue-300 to-indigo-400 drop-shadow-sm mb-1 text-2xl sm:text-[1.85rem] tracking-tight animate-fade-in-up"
        style={{ animationDelay: "100ms" }}
      >
        {t("welcome_back")}
      </h2>
      <p
        className="text-center text-sm text-slate-300/80 font-semibold drop-shadow-sm mb-4 animate-fade-in-up"
        style={{ animationDelay: "150ms" }}
      >
        {t("sign_in_to_account")}
      </p>

      <form onSubmit={handleManualAuth} className="space-y-4">
        <div
          className="relative group animate-fade-in-up"
          style={{ animationDelay: "200ms" }}
        >
          <div
            className={`absolute inset-y-0 left-0 z-10 pl-4 flex items-center pointer-events-none transition-colors duration-300 ${focusedInput === "email" ? "text-blue-600" : "text-slate-400 font-medium"}`}
          >
            <Mail className="h-5 w-5" />
          </div>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
            }}
            onFocus={() => setFocusedInput("email")}
            onBlur={() => setFocusedInput(null)}
            className={`block w-full pl-11 pr-4 py-2.5 bg-white/5 backdrop-blur-sm border-2 rounded-xl text-white !outline-none !ring-0 !ring-offset-0 focus:bg-white/10 transition-all duration-300 peer ${focusedInput === "email" ? "border-blue-500 shadow-lg shadow-blue-500/10" : "border-white/10 shadow-sm"}`}
            autoComplete="email"
          />
          <label
            htmlFor="email"
            className={`absolute left-11 transition-all duration-300 pointer-events-none px-1
              ${focusedInput === "email" || email ? "-top-2.5 text-xs font-bold text-blue-400 rounded-md shadow-sm bg-[#161342]" : "top-3 text-slate-400 font-medium text-sm bg-transparent shadow-none"}`}
          >
            {t("email_address")}
          </label>
        </div>

        <div
          className="relative group animate-fade-in-up"
          style={{ animationDelay: "250ms" }}
        >
          <div
            className={`absolute inset-y-0 left-0 z-10 pl-4 flex items-center pointer-events-none transition-colors duration-300 ${focusedInput === "password" ? "text-blue-600" : "text-slate-400 font-medium"}`}
          >
            <Lock className="h-5 w-5" />
          </div>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
            }}
            onFocus={() => setFocusedInput("password")}
            onBlur={() => setFocusedInput(null)}
            className={`block w-full pl-11 pr-12 py-2.5 bg-white/5 backdrop-blur-sm border-2 rounded-xl text-white !outline-none !ring-0 !ring-offset-0 focus:bg-white/10 transition-all duration-300 peer ${focusedInput === "password" ? "border-blue-500 shadow-lg shadow-blue-500/10" : "border-white/10 shadow-sm"}`}
            autoComplete="current-password"
          />
          <label
            htmlFor="password"
            className={`absolute left-11 transition-all duration-300 pointer-events-none px-1
              ${focusedInput === "password" || password ? "-top-2.5 text-xs font-bold text-blue-400 rounded-md shadow-sm bg-[#161342]" : "top-3 text-slate-400 font-medium text-sm bg-transparent shadow-none"}`}
          >
            {t("password")}
          </label>
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 flex items-center justify-center pr-4 text-slate-400 hover:text-white transition-colors"
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        </div>

        <div
          className="flex justify-end animate-fade-in-up"
          style={{ animationDelay: "300ms" }}
        >
          <button
            type="button"
            onClick={onForgotPasswordClick}
            className="text-xs font-bold text-indigo-300/80 transition drop-shadow-sm hover:text-white hover:underline"
          >
            {t("forgot_password_question")}
          </button>
        </div>

        <div className="animate-fade-in-up" style={{ animationDelay: "350ms" }}>
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-1 w-full flex items-center justify-center space-x-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-indigo-500/40 shadow-lg disabled:cursor-not-allowed disabled:opacity-70 bg-gradient-to-r from-indigo-600 to-purple-600"
          >
            <LogIn className="h-5 w-5" />
            <span>{isSubmitting ? t("signing_in") : t("sign_in")}</span>
          </button>
        </div>
      </form>

      {!["ADMIN", "LECTURER", "TECHNICIAN"].includes(fixedRole) && (
        <>
          <div
            className="flex items-center justify-between mt-5 animate-fade-in-up"
            style={{ animationDelay: "400ms" }}
          >
            <span className="w-1/5 border-b border-white/30 md:w-1/4" />
            <span className="text-center text-xs uppercase tracking-[0.14em] text-slate-200 font-semibold drop-shadow-sm">
              {t("or_continue_with")}
            </span>
            <span className="w-1/5 border-b border-white/30 md:w-1/4" />
          </div>

          <div
            className="mt-4 animate-fade-in-up"
            style={{ animationDelay: "450ms" }}
          >
            <GoogleAuthButton />
          </div>
        </>
      )}

      <div
        className="mt-5 text-center text-sm pt-3 border-t border-white/20 animate-fade-in-up"
        style={{ animationDelay: "500ms" }}
      >
        <p className="text-slate-200 font-semibold drop-shadow-sm">
          {t("dont_have_account")}{" "}
          <Link
            to="/register"
            className="font-bold text-blue-300 transition drop-shadow-sm hover:text-white"
          >
            {t("create_account")}
          </Link>
        </p>
      </div>
    </>
  );
}

function RegisterForm({ fixedRole }) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [registerRole, setRegisterRole] = useState(fixedRole || "USER");
  const { showAlert } = useAlert();
  const [emailValidationError, setEmailValidationError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

  const navigate = useNavigate();
  const strength = getPasswordStrength(password, t);

  useEffect(() => {
    setEmailValidationError(validateEmailByRole(registerRole, email, t));
  }, [registerRole, email, t]);

  const areRegisterPasswordsMatching =
    password.trim().length > 0 &&
    confirmPassword.trim().length > 0 &&
    password === confirmPassword;
  const normalizedRegisterRole = registerRole?.trim?.() || "USER";
  const activeTheme =
    REGISTER_ROLE_THEME[normalizedRegisterRole] || REGISTER_ROLE_THEME.USER;

  const handleRegister = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (password !== confirmPassword) {
      showAlert("error", t("err_password_match"));
      return;
    }
    const roleEmailError = validateEmailByRole(registerRole, email, t);
    if (roleEmailError) {
      setEmailValidationError(roleEmailError);
      showAlert("error", roleEmailError);
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post("/auth/register", {
        name,
        email,
        password,
        role: registerRole,
      });
      showAlert("success", t("success_account_created"));
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      if (err.code === "ERR_NETWORK")
        showAlert("error", t("err_network"));
      else if (err.response?.status === 401)
        showAlert("error", t("err_registration_rejected"));
      else if (err.response?.status === 503)
        showAlert("error", t("err_service_unavail_reg"));
      else
        showAlert(
          "error",
          err.response?.data?.message || t("err_registration_failed"),
        );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <h2 className="text-center font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-200 via-blue-300 to-indigo-400 drop-shadow-sm mb-1 text-2xl sm:text-[1.85rem] tracking-tight">
        {registerRole === "ADMIN" ? t("admin_registration") : t("create_account")}
      </h2>
      <p className="text-center text-sm text-slate-300/80 font-semibold drop-shadow-sm mb-4">
        {registerRole === "ADMIN"
          ? t("admin_registration_sub")
          : t("join_unisphere_today")}
      </p>

      <div>{/* RoleSelector removed as requested */}</div>

      <form onSubmit={handleRegister} className="space-y-3.5">
        <div className="relative group">
          <div
            className={`absolute inset-y-0 left-0 z-10 pl-4 flex items-center pointer-events-none transition-colors duration-300 ${focusedInput === "name" ? activeTheme.linkText : "text-slate-400 font-medium"}`}
          >
            <User className="h-5 w-5" />
          </div>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={() => setFocusedInput("name")}
            onBlur={() => setFocusedInput(null)}
            className={`block w-full pl-11 pr-4 py-2.5 bg-white/5 backdrop-blur-sm border-2 rounded-xl text-white !outline-none !ring-0 !ring-offset-0 focus:bg-white/10 transition-all duration-300 peer ${focusedInput === "name" ? "border-indigo-500 shadow-lg shadow-indigo-500/10" : "border-white/10 shadow-sm"}`}
          />
          <label
            htmlFor="name"
            className={`absolute left-11 transition-all duration-300 pointer-events-none px-1 ${focusedInput === "name" || name ? `-top-2.5 text-xs font-bold ${activeTheme.linkText} rounded-md shadow-sm bg-[#161342]` : "top-3 text-slate-400 font-medium text-sm bg-transparent shadow-none"}`}
          >
            {t("full_name")}
          </label>
        </div>

        <div>
          <div className="relative group">
            <div
              className={`absolute inset-y-0 left-0 z-10 pl-4 flex items-center pointer-events-none transition-colors duration-300 ${focusedInput === "email" ? activeTheme.linkText : "text-slate-400 font-medium"}`}
            >
              <Mail className="h-5 w-5" />
            </div>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
              }}
              onFocus={() => setFocusedInput("email")}
              onBlur={() => setFocusedInput(null)}
              className={`block w-full pl-11 pr-4 py-2.5 bg-white/5 backdrop-blur-sm border-2 rounded-xl text-white !outline-none !ring-0 !ring-offset-0 focus:bg-white/10 transition-all duration-300 peer ${emailValidationError ? "border-red-400 shadow-lg shadow-red-500/10" : focusedInput === "email" ? "border-indigo-500 shadow-lg shadow-indigo-500/10" : "border-white/10 shadow-sm"}`}
            />
            <label
              htmlFor="email"
              className={`absolute left-11 transition-all duration-300 pointer-events-none px-1 ${focusedInput === "email" || email ? `-top-2.5 text-xs font-bold ${activeTheme.linkText} rounded-md shadow-sm bg-[#161342]` : "top-3 text-slate-400 font-medium text-sm bg-transparent shadow-none"}`}
            >
              {registerRole === "ADMIN"
                ? t("admin_email")
                : registerRole === "TECHNICIAN"
                  ? t("technician_email")
                  : registerRole === "LECTURER"
                    ? t("lecturer_email")
                    : t("email_address")}
            </label>
          </div>
          {emailValidationError && (
            <p className="mt-1.5 text-[12px] font-medium text-red-700 drop-shadow-md px-2">
              {emailValidationError}
            </p>
          )}
        </div>

        <div>
          <div className="relative group">
            <div
              className={`absolute inset-y-0 left-0 z-10 pl-4 flex items-center pointer-events-none transition-colors duration-300 ${focusedInput === "password" ? activeTheme.linkText : "text-slate-400 font-medium"}`}
            >
              <Lock className="h-5 w-5" />
            </div>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocusedInput("password")}
              onBlur={() => setFocusedInput(null)}
              className={`block w-full pl-11 pr-12 py-2.5 bg-white/5 backdrop-blur-sm border-2 rounded-xl text-white !outline-none !ring-0 !ring-offset-0 focus:bg-white/10 transition-all duration-300 peer ${areRegisterPasswordsMatching ? "border-emerald-400 shadow-emerald-500/20 shadow-md transform -translate-y-0.5" : focusedInput === "password" ? "border-indigo-500 shadow-lg shadow-indigo-500/10" : "border-white/10 shadow-sm"}`}
            />
            <label
              htmlFor="password"
              className={`absolute left-11 transition-all duration-300 pointer-events-none px-1 ${focusedInput === "password" || password ? `-top-2.5 text-xs font-bold ${areRegisterPasswordsMatching ? "text-emerald-500" : activeTheme.linkText} rounded-md shadow-sm bg-[#161342]` : "top-3 text-slate-400 font-medium text-sm bg-transparent shadow-none"}`}
            >
              {t("password")}
            </label>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center justify-center pr-4 text-slate-400 hover:text-white transition-colors"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
          {password && strength && (
            <div className="mt-1 transition-all duration-300 px-1">
              <div
                className={`h-[3px] transition-all duration-500 rounded-full ${strength.colorClass} ${strength.widthClass}`}
              ></div>
              <div className="flex items-center gap-1.5 mt-1.5 pl-0.5">
                <span className="text-[13px]">
                  {strength.emoji}
                </span>
                <p className="text-[11.5px] text-slate-800 leading-none font-medium">
                  <span className="font-bold text-slate-900">
                    {strength.label}
                  </span>{" "}
                  {strength.description}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="relative group">
          <div
            className={`absolute inset-y-0 left-0 z-10 pl-4 flex items-center pointer-events-none transition-colors duration-300 ${focusedInput === "confirm" ? activeTheme.linkText : "text-slate-400 font-medium"}`}
          >
            <Lock className="h-5 w-5" />
          </div>
          <input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onFocus={() => setFocusedInput("confirm")}
            onBlur={() => setFocusedInput(null)}
            className={`block w-full pl-11 pr-12 py-2.5 bg-white/5 backdrop-blur-sm border-2 rounded-xl text-white !outline-none !ring-0 !ring-offset-0 focus:bg-white/10 transition-all duration-300 peer ${areRegisterPasswordsMatching ? "border-emerald-400 shadow-emerald-500/20 shadow-md transform -translate-y-0.5" : focusedInput === "confirm" ? "border-indigo-500 shadow-lg shadow-indigo-500/10" : "border-white/10 shadow-sm"}`}
          />
          <label
            htmlFor="confirmPassword"
            className={`absolute left-11 transition-all duration-300 pointer-events-none px-1 ${focusedInput === "confirm" || confirmPassword ? `-top-2.5 text-xs font-bold ${areRegisterPasswordsMatching ? "text-emerald-500" : activeTheme.linkText} rounded-md shadow-sm bg-[#161342]` : "top-3 text-slate-400 font-medium text-sm bg-transparent shadow-none"}`}
          >
            {t("confirm_password")}
          </label>
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute inset-y-0 right-0 flex items-center justify-center pr-4 text-slate-400 hover:text-white transition-colors"
          >
            {showConfirmPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || Boolean(emailValidationError)}
          className={`mt-1 w-full flex items-center justify-center space-x-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-all duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 bg-gradient-to-r ${activeTheme.buttonGradient}`}
        >
          <UserPlus className="h-5 w-5" />
          <span>{isSubmitting ? t("creating_account") : t("create_account")}</span>
        </button>
      </form>

      {!["ADMIN", "LECTURER", "TECHNICIAN"].includes(registerRole) && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-3">
            <span className="w-1/5 border-b border-white/30 md:w-1/4" />
            <span className="text-center text-xs uppercase tracking-[0.14em] text-slate-200 font-semibold drop-shadow-sm">
              {t("or_continue_with")}
            </span>
            <span className="w-1/5 border-b border-white/30 md:w-1/4" />
          </div>
          <GoogleAuthButton />
        </div>
      )}

      <div className="mt-4 text-center text-sm pt-3 border-t border-white/20">
        <p className="text-slate-200 font-semibold drop-shadow-sm">
          {t("already_have_account")}{" "}
          <Link
            to="/login"
            className="font-bold text-blue-300 transition drop-shadow-sm hover:text-white"
          >
            {t("sign_in")}
          </Link>
        </p>
      </div>
    </>
  );
}

const AuthPage = ({ fixedRole }) => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const isRegisterMode =
    location.pathname.endsWith("/register") ||
    location.pathname.endsWith("/admin-registration");
  const [signInWipeKey, setSignInWipeKey] = useState(0);
  const [registerWipeKey, setRegisterWipeKey] = useState(0);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef(null);

  const languages = [
    { code: "en", label: "English", badge: "EN" },
    { code: "si", label: "සිංහල", badge: "SI" },
    { code: "ta", label: "தமிழ்", badge: "TA" }
  ];

  const currentLanguage = languages.find(l => l.code === (i18n.language || "en")) || languages[0];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target)) {
        setIsLangDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isRegisterMode) {
      setSignInWipeKey((prev) => prev + 1);
    }
  }, [isRegisterMode]);

  useEffect(() => {
    if (isRegisterMode) {
      setRegisterWipeKey((prev) => prev + 1);
    }
  }, [isRegisterMode]);

  return (
    <div className="h-[100dvh] min-h-[100dvh] relative flex items-center justify-center overflow-hidden font-sans">
      {/* Language Selector in Top Right Corner */}
      <div ref={langDropdownRef} className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
        <button
          onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
          className="flex items-center gap-2.5 h-10 pl-1.5 pr-3.5 rounded-full border border-indigo-500/30 bg-[#0c0a21]/60 text-white hover:bg-[#0c0a21]/80 hover:border-indigo-500/50 transition-all duration-300 focus:outline-none shadow-md backdrop-blur-md"
        >
          <span className="flex items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300 font-extrabold tracking-wider text-[11px] h-7 w-7 shrink-0">
            {currentLanguage.badge}
          </span>
          <span className="font-bold tracking-wide text-xs">
            {currentLanguage.label}
          </span>
          <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-300 ${isLangDropdownOpen ? "rotate-180" : ""}`} />
        </button>

        {isLangDropdownOpen && (
          <div className="absolute right-0 mt-2 w-40 origin-top-right rounded-2xl border border-indigo-500/20 bg-[#0a081d]/95 p-1.5 shadow-[0_10px_35px_rgba(0,0,0,0.6)] backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  i18n.changeLanguage(lang.code);
                  setIsLangDropdownOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-bold transition-all duration-200 ${
                  i18n.language === lang.code
                    ? "bg-indigo-600/20 text-indigo-300"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span>{lang.label}</span>
                {i18n.language === lang.code && (
                  <Check className="h-3.5 w-3.5 text-indigo-400" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      {/* FULL SCREEN BACKGROUND */}
      <div className="fixed inset-0 z-0 select-none pointer-events-none">
        {/* Same background as Landing Page */}
        <div className="landing-page-overlay" />
        <div className="grid-pattern" />

        {/* Decorative ambient blobs optimized for Auth Page */}
        <div className="absolute top-[-10%] right-[-10%] w-[60vh] h-[60vh] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[60vh] h-[60vh] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      </div>

      <div className="w-full h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col md:flex-row items-center justify-between py-4 sm:py-6">
        {/* Static Left Side (Background Text) */}
        <div className="hidden md:block md:w-1/2 lg:pl-8 text-white pr-4 animate-fade-in-up">
          <Link
            to="/"
            className="inline-flex items-center rounded-full border border-[#3B4A89]/60 bg-[#1E2A50]/60 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-blue-100 backdrop-blur-md mb-8 hover:bg-[#1E2A50]/80 transition-all group shadow-lg"
          >
            <GraduationCap className="w-4 h-4 mr-2 text-blue-300 group-hover:-translate-x-1 transition-transform" />
            UniSphere
          </Link>
          <h1 className="text-4xl md:text-5xl lg:text-5xl font-extrabold leading-[1.15] mb-6 tracking-tight drop-shadow-lg text-transparent bg-clip-text bg-gradient-to-r from-sky-200 via-blue-300 to-indigo-400">
            {t("auth_feature_title")}
          </h1>
          <p className="text-lg text-slate-200/90 leading-relaxed mb-8 max-w-lg drop-shadow-md font-medium">
            {t("auth_feature_subtitle")}
          </p>

          <ul className="space-y-4 mb-10">
            {[
              {
                title: t("auth_feat_1_title"),
                desc: t("auth_feat_1_desc"),
                icon: <User className="w-5 h-5 text-blue-400" />,
                glow: "rgba(59,130,246,0.45)",
              },
              {
                title: t("auth_feat_2_title"),
                desc: t("auth_feat_2_desc"),
                icon: <CalendarCheck className="w-5 h-5 text-indigo-400" />,
                glow: "rgba(129,140,248,0.45)",
              },
              {
                title: t("auth_feat_3_title"),
                desc: t("auth_feat_3_desc"),
                icon: <GraduationCap className="w-5 h-5 text-purple-400" />,
                glow: "rgba(192,132,252,0.45)",
              },
              {
                title: t("auth_feat_4_title"),
                desc: t("auth_feat_4_desc"),
                icon: <ClipboardList className="w-5 h-5 text-emerald-400" />,
                glow: "rgba(52,211,153,0.45)",
              },
            ].map((feature, i) => (
              <li
                key={i}
                className="flex items-center text-[0.9rem] text-white bg-white/5 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 max-w-[440px] hover:bg-white/10 hover:border-white/20 transition-all duration-300 group cursor-default shadow-sm hover:shadow-md"
              >
                <div className="mr-4 transition-transform duration-300 group-hover:scale-105 shrink-0">
                  <div
                    className="p-2 rounded-xl bg-white/5 border border-white/10 shadow-lg flex items-center justify-center"
                    style={{ boxShadow: `0 0 12px ${feature.glow}` }}
                  >
                    {feature.icon}
                  </div>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-white tracking-wide group-hover:text-blue-300 transition-colors leading-tight">
                    {feature.title}
                  </span>
                  <span className="text-[11.5px] text-slate-300 font-normal mt-0.5 leading-snug">
                    {feature.desc}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Dynamic Right Side (Form Container) */}
        <div className="w-full md:w-1/2 flex justify-center lg:justify-end">
          {/* Main container with high rounded corners and glassmorphism styling */}
          <div className="w-full max-w-[480px] bg-white/15 backdrop-blur-xl rounded-3xl shadow-[0_20px_50px_-20px_rgba(79,70,229,0.3)] border border-white/20 p-6 sm:p-7 relative overflow-hidden transition-all duration-500 ease-in-out">
            <div className="w-full h-full relative z-10">
              {isRegisterMode ? (
                <div key={registerWipeKey} className="auth-register-wipe">
                  <RegisterForm fixedRole={fixedRole} />
                </div>
              ) : (
                <div key={signInWipeKey} className="auth-signin-wipe">
                  <LoginForm
                    fixedRole={fixedRole}
                    onForgotPasswordClick={() =>
                      setShowForgotPasswordModal(true)
                    }
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(15px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-left {
          0% { opacity: 0; transform: translateX(20px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }
        .animate-fade-in-left {
          animation: fade-in-left 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }
        .auth-signin-wipe {
          animation: auth-wipe-in 920ms ease-out both;
        }
        .auth-register-wipe {
          animation: auth-wipe-in 1220ms ease-out both;
        }
        @keyframes auth-wipe-in {
          from { clip-path: inset(0 0 100% 0); }
          to { clip-path: inset(0 0 0 0); }
        }
      `,
        }}
      />

      <ForgotPasswordModal
        isOpen={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
      />
    </div>
  );
};

export default AuthPage;
