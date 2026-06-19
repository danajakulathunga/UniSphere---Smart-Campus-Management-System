import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import api from "../services/api";
import { useScrollLock } from "../hooks/useScrollLock";
import { useAlert } from "../context/AlertContext";
import { X, Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";

const INITIAL_STATE = {
  step: "email",
  email: "",
  generatedCode: "",
  enteredCode: "",
  newPassword: "",
  confirmPassword: "",
  isSubmitting: false,
};

const RESEND_COOLDOWN_SECONDS = 30;

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

const ForgotPasswordModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  // Use the reusable scroll lock hook
  useScrollLock(isOpen);

  const { showAlert } = useAlert();
  const [state, setState] = useState(INITIAL_STATE);
  const [focusedInput, setFocusedInput] = useState(null);
  const [showPasswords, setShowPasswords] = useState({
    new: false,
    confirm: false
  });
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(0);
  const cooldownTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
    };
  }, []);

  const updateState = (partialState) => {
    setState((prev) => ({ ...prev, ...partialState }));
  };

  const closeModal = () => {
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }

    setResendCooldownSeconds(0);
    setFocusedInput(null);
    setShowPasswords({ new: false, confirm: false });
    setState(INITIAL_STATE);
    onClose();
  };

  const startResendCooldown = () => {
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
    }

    setResendCooldownSeconds(RESEND_COOLDOWN_SECONDS);
    cooldownTimerRef.current = setInterval(() => {
      setResendCooldownSeconds((secondsLeft) => {
        if (secondsLeft <= 1) {
          if (cooldownTimerRef.current) {
            clearInterval(cooldownTimerRef.current);
            cooldownTimerRef.current = null;
          }

          return 0;
        }

        return secondsLeft - 1;
      });
    }, 1000);
  };

  const requestVerificationCode = async () => {
    const { data } = await api.post("/auth/forgot-password", {
      email: state.email,
    });

    const verificationCode = data?.verificationCode;
    if (!verificationCode) {
      throw new Error(t("err_verification_code_gen"));
    }

    updateState({
      generatedCode: String(verificationCode),
      step: "verify",
      enteredCode: "",
    });

    startResendCooldown();

    showAlert("success", t("msg_verification_code_sent") + verificationCode);
  };

  const handleSendVerificationCode = async (e) => {
    e.preventDefault();
    if (state.isSubmitting) return;

    if (!state.email.trim()) {
      showAlert("error", t("err_email_required"));
      return;
    }

    updateState({ isSubmitting: true });

    try {
      await requestVerificationCode();
    } catch (err) {
      showAlert("error", err.response?.data?.message || err.message || t("err_send_verification_code"));
    } finally {
      updateState({ isSubmitting: false });
    }
  };

  const handleResendVerificationCode = async () => {
    if (state.isSubmitting || resendCooldownSeconds > 0) return;

    try {
      await requestVerificationCode();
    } catch (err) {
      showAlert("error", err.response?.data?.message || err.message || t("err_resend_verification_code"));
    } finally {
      updateState({ isSubmitting: false });
    }
  };

  const handleVerifyCode = (e) => {
    e.preventDefault();

    if (state.enteredCode.trim() !== state.generatedCode) {
      showAlert("error", t("err_invalid_verification_code"));
      return;
    }

    updateState({
      step: "reset",
    });
    showAlert("success", t("msg_code_verified"));
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (state.isSubmitting) return;

    // Password strength validation
    const strength = getPasswordStrength(state.newPassword, t);
    if (!strength || strength.key !== "strong") {
      showAlert("error", t("err_password_strength"));
      return;
    }

    if (state.newPassword !== state.confirmPassword) {
      showAlert("error", t("err_password_confirm_match"));
      return;
    }

    updateState({ isSubmitting: true });

    try {
      await api.post("/auth/reset-password", {
        email: state.email,
        verificationCode: state.enteredCode, // Pass verification code instead of currentPassword
        newPassword: state.newPassword,
      });

      showAlert("success", t("msg_password_reset_success"));
      setTimeout(() => {
        closeModal();
      }, 1000);
    } catch (err) {
      showAlert("error", err.response?.data?.message || t("err_reset_password"));
    } finally {
      updateState({ isSubmitting: false });
    }
  };

  let modalTitle = t("request_verification_code");
  let modalDescription = t("verification_description");

  if (state.step === "verify") {
    modalTitle = t("verify_security_code");
    modalDescription = t("code_verification_description");
  } else if (state.step === "reset") {
    modalTitle = t("reset_your_password");
    modalDescription = t("reset_description");
  }

  const strength = getPasswordStrength(state.newPassword, t);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-3xl bg-white/15 backdrop-blur-xl p-8 shadow-[0_20px_50px_-20px_rgba(79,70,229,0.3)] animate-in zoom-in duration-300 border border-white/20 text-white">
        <button
          type="button"
          onClick={closeModal}
          className="absolute right-3 top-3 p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all group active:scale-90"
        >
          <X className="h-5 w-5 transition-transform group-hover:rotate-90" />
        </button>

        <div className="mb-6 text-center">
          <h3 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-200 via-blue-300 to-indigo-400 drop-shadow-sm tracking-tight">{modalTitle}</h3>
          <p className="mt-2 text-sm font-semibold text-slate-300/80 leading-relaxed">{modalDescription}</p>
        </div>

        {state.step === "email" && (
          <form onSubmit={handleSendVerificationCode} className="space-y-5">
            <div className="relative group">
              <input
                id="forgotEmail"
                type="email"
                required
                value={state.email}
                onChange={(e) => updateState({ email: e.target.value })}
                onFocus={() => setFocusedInput("forgotEmail")}
                onBlur={() => setFocusedInput(null)}
                className={`block w-full px-4 py-3 bg-white/5 backdrop-blur-sm border-2 rounded-xl text-white !outline-none !ring-0 transition-all duration-300 peer ${focusedInput === "forgotEmail" ? "border-blue-500 shadow-lg shadow-blue-500/10" : "border-white/10 shadow-sm"}`}
              />
              <label
                htmlFor="forgotEmail"
                className={`absolute left-4 transition-all duration-300 pointer-events-none px-1 ${focusedInput === "forgotEmail" || state.email ? "-top-2.5 text-xs font-bold text-blue-400 rounded-md shadow-sm bg-[#161342]" : "top-3 text-slate-400 font-medium text-sm bg-transparent shadow-none"}`}
              >
                {t("registered_email_address_label")}
              </label>
            </div>
            <button
              type="submit"
              disabled={state.isSubmitting}
              className="w-full flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-indigo-500/40 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed bg-gradient-to-r from-indigo-600 to-purple-600"
            >
              {state.isSubmitting ? t("sending") : t("send_verification_code")}
            </button>
          </form>
        )}

        {state.step === "verify" && (
          <form onSubmit={handleVerifyCode} className="space-y-5">
            <div className="relative group">
              <input
                id="verificationCode"
                type="text"
                required
                maxLength={6}
                value={state.enteredCode}
                onChange={(e) => updateState({ enteredCode: e.target.value })}
                onFocus={() => setFocusedInput("verificationCode")}
                onBlur={() => setFocusedInput(null)}
                className={`block w-full px-4 py-3 bg-white/5 backdrop-blur-sm border-2 rounded-xl text-white !outline-none !ring-0 transition-all duration-300 peer ${focusedInput === "verificationCode" ? "border-blue-500 shadow-lg shadow-blue-500/10" : "border-white/10 shadow-sm"}`}
              />
              <label
                htmlFor="verificationCode"
                className={`absolute left-4 transition-all duration-300 pointer-events-none px-1 ${focusedInput === "verificationCode" || state.enteredCode ? "-top-2.5 text-xs font-bold text-blue-400 rounded-md shadow-sm bg-[#161342]" : "top-3 text-slate-400 font-medium text-sm bg-transparent shadow-none"}`}
              >
                {t("verification_code_field_label")}
              </label>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleResendVerificationCode}
                disabled={state.isSubmitting || resendCooldownSeconds > 0}
                className="text-xs font-bold text-indigo-300/80 transition hover:text-white hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              >
                {resendCooldownSeconds > 0 ? `${t("resend_code")} (${resendCooldownSeconds}s)` : t("resend_code")}
              </button>
            </div>
            <button
              type="submit"
              disabled={state.isSubmitting}
              className="w-full flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-indigo-500/40 shadow-lg bg-gradient-to-r from-indigo-600 to-purple-600"
            >
              {t("verify_code")}
            </button>
          </form>
        )}

        {state.step === "reset" && (
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div className="space-y-2">
              <div className="relative group">
                <input
                  id="forgotNewPassword"
                  type={showPasswords.new ? "text" : "password"}
                  required
                  value={state.newPassword}
                  onChange={(e) => updateState({ newPassword: e.target.value })}
                  onFocus={() => setFocusedInput("forgotNewPassword")}
                  onBlur={() => setFocusedInput(null)}
                  className={`block w-full px-4 py-3 bg-white/5 backdrop-blur-sm border-2 rounded-xl text-white !outline-none !ring-0 transition-all duration-300 peer ${focusedInput === "forgotNewPassword" ? "border-blue-500 shadow-lg shadow-blue-500/10" : "border-white/10 shadow-sm"} pr-12`}
                />
                <label
                  htmlFor="forgotNewPassword"
                  className={`absolute left-4 transition-all duration-300 pointer-events-none px-1 ${focusedInput === "forgotNewPassword" || state.newPassword ? "-top-2.5 text-xs font-bold text-blue-400 rounded-md shadow-sm bg-[#161342]" : "top-3 text-slate-400 font-medium text-sm bg-transparent shadow-none"}`}
                >
                  {t("new_password")}
                </label>
                <button 
                  type="button" 
                  onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })} 
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPasswords.new ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {/* STRENGTH METER */}
              {state.newPassword && (
                <div className="px-1 animate-in fade-in slide-in-from-top-1 duration-300">
                  <div className={`h-1.5 transition-all duration-500 rounded-full ${strength?.colorClass} ${strength?.widthClass}`} />
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm">{strength?.emoji}</span>
                    <p className="text-[11px] font-black text-slate-300 uppercase tracking-tight">
                      <span className="text-white mr-1">{strength?.label}</span>
                      {strength?.description}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="relative group">
              <input
                id="forgotConfirmPassword"
                type={showPasswords.confirm ? "text" : "password"}
                required
                value={state.confirmPassword}
                onChange={(e) => updateState({ confirmPassword: e.target.value })}
                onFocus={() => setFocusedInput("forgotConfirmPassword")}
                onBlur={() => setFocusedInput(null)}
                className={`block w-full px-4 py-3 bg-white/5 backdrop-blur-sm border-2 rounded-xl text-white !outline-none !ring-0 transition-all duration-300 peer ${focusedInput === "forgotConfirmPassword" ? "border-blue-500 shadow-lg shadow-blue-500/10" : "border-white/10 shadow-sm"} pr-12`}
              />
              <label
                htmlFor="forgotConfirmPassword"
                className={`absolute left-4 transition-all duration-300 pointer-events-none px-1 ${focusedInput === "forgotConfirmPassword" || state.confirmPassword ? "-top-2.5 text-xs font-bold text-blue-400 rounded-md shadow-sm bg-[#161342]" : "top-3 text-slate-400 font-medium text-sm bg-transparent shadow-none"}`}
              >
                {t("confirm_new_password")}
              </label>
              <button 
                type="button" 
                onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })} 
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                {showPasswords.confirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            
            <button
              type="submit"
              disabled={state.isSubmitting}
              className="w-full flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-indigo-500/40 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed bg-gradient-to-r from-indigo-600 to-purple-600"
            >
              {state.isSubmitting ? t("updating") : t("reset_password")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

ForgotPasswordModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ForgotPasswordModal;
