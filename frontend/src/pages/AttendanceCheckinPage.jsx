import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Clock,
  User,
  Mail,
  BookOpen,
  ArrowRight,
  GraduationCap
} from "lucide-react";

const AttendanceCheckinPage = () => {
  const { sessionId } = useParams(); // Holds the qrCode UUID token
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith("si") ? "si-LK" : i18n.language?.startsWith("ta") ? "ta-LK" : "en-US";

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [focusedInput, setFocusedInput] = useState(null);

  useEffect(() => {
    const fetchSessionDetails = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/attendance/qr-details/${sessionId}`);
        setSession(data);
        setErrorMsg(null);

        // Auto-fill student info if logged in
        if (user) {
          setStudentName(user.name || "");
          setStudentEmail(user.email || "");
        }
      } catch (err) {
        console.error("Error fetching session details:", err);
        const status = err?.response?.status;
        const msg = err?.response?.data?.message;

        if (status === 403) {
          // Shared batch restriction error
          setErrorMsg(msg || t("err_session_not_shared_batch", { defaultValue: "This lecture session is not shared with your academic batch." }));
        } else {
          // Standard validation mismatch message
          setErrorMsg(t("err_session_not_available", { defaultValue: "This attendance session is no longer available" }));
        }
      } finally {
        setLoading(false);
      }
    };

    if (sessionId && sessionId !== "null") {
      fetchSessionDetails();
    } else {
      setErrorMsg(t("err_session_not_available", { defaultValue: "This attendance session is no longer available" }));
      setLoading(false);
    }
  }, [sessionId, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await api.post("/attendance", {
        qrCode: sessionId,
        studentName,
        studentEmail,
      });
      setIsSubmitted(true);
    } catch (err) {
      console.error("Error submitting attendance:", err);
      const msg = err?.response?.data?.message;
      if (err?.response?.status === 400 && msg?.toLowerCase().includes("already")) {
        setSubmitError(t("attendance_already_recorded", { defaultValue: "Attendance has already been recorded." }));
      } else {
        setSubmitError(msg || t("err_attendance_record_fail", { defaultValue: "Failed to record attendance. Please try again." }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(dateLocale, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return "";
    try {
      const [hours, minutes] = timeString.split(":");
      const date = new Date();
      date.setHours(parseInt(hours, 10));
      date.setMinutes(parseInt(minutes, 10));
      return date.toLocaleTimeString(dateLocale, {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return timeString;
    }
  };

  return (
    <div className="h-[100dvh] min-h-[100dvh] relative flex items-center justify-center overflow-x-hidden font-sans p-4">
      {/* FULL SCREEN BACKGROUND */}
      <div className="fixed inset-0 z-0 select-none pointer-events-none">
        <div className="landing-page-overlay" />
        <div className="grid-pattern" />

        {/* Ambient decorative blobs */}
        <div className="absolute top-[-10%] right-[-10%] w-[60vh] h-[60vh] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[60vh] h-[60vh] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      </div>

      <div className="w-full max-w-[540px] bg-white/15 backdrop-blur-xl rounded-3xl shadow-[0_20px_50px_-20px_rgba(59,130,246,0.35)] border border-white/20 p-6 sm:p-8 relative z-10 transition-all duration-300">
        
        {/* Logo and Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center rounded-full border border-blue-500/20 bg-blue-950/20 px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-200 backdrop-blur-md mb-3">
            <GraduationCap className="w-3.5 h-3.5 mr-1.5 text-blue-300" />
            {t("unisphere")} {t("attendance", { defaultValue: "Attendance" })}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-300/80">{t("msg_validating_qr", { defaultValue: "Validating QR Code..." })}</p>
          </div>
        ) : errorMsg ? (
          <div className="text-center py-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 mb-4 animate-bounce">
              <AlertCircle className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{t("err_verification_failed", { defaultValue: "Verification Failed" })}</h3>
            <p className="text-sm text-slate-300 leading-relaxed font-semibold mb-6">
              {errorMsg}
            </p>
            {user ? (
              <Link
                to="/my-lectures"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 px-5 py-2.5 text-xs font-semibold text-white transition-all active:scale-95 shadow-sm"
              >
                {t("go_my_lectures", { defaultValue: "Go to My Lectures" })}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-xs font-semibold text-white transition-all active:scale-95 shadow-lg shadow-blue-500/20"
              >
                {t("sign_in_unisphere", { defaultValue: "Sign In to UniSphere" })}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        ) : isSubmitted ? (
          <div className="text-center py-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-4 animate-scale-in">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{t("msg_attendance_recorded", { defaultValue: "Attendance Recorded" })}</h3>
            <p className="text-sm text-slate-200/90 font-semibold mb-6 leading-relaxed">
              {t("msg_attendance_recorded_success", { defaultValue: "Attendance recorded successfully for this lecture session" })}
            </p>
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-left space-y-2.5 mb-6 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">{t("lecture_title", { defaultValue: "Lecture Title" })}</span>
                <span className="font-semibold text-white">{session.purpose}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">{t("lecturer")}</span>
                <span className="font-semibold text-white">{session.userName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">{t("student_name", { defaultValue: "Student Name" })}</span>
                <span className="font-semibold text-white">{studentName}</span>
              </div>
            </div>
            {user ? (
              <Link
                to="/my-lectures"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 px-5 py-2.5 text-xs font-semibold text-white transition-all active:scale-95"
              >
                {t("go_my_lectures", { defaultValue: "Go to My Lectures" })}
              </Link>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-xs font-semibold text-white transition-all active:scale-95 shadow-lg shadow-blue-500/20"
              >
                {t("sign_in_unisphere", { defaultValue: "Sign In to UniSphere" })}
              </Link>
            )}
          </div>
        ) : (
          <div>
            {/* Lecture session details */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-5 space-y-3">
              <div className="flex items-start gap-3">
                <BookOpen className="h-4.5 w-4.5 text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[9px] font-semibold uppercase text-slate-400 tracking-wider">{t("lecture_title", { defaultValue: "Lecture Title" })}</p>
                  <h4 className="text-[15px] font-semibold text-white leading-snug">{session.purpose}</h4>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <div>
                    <p className="text-[8px] font-semibold uppercase text-slate-400 tracking-wider">{t("date")}</p>
                    <p className="text-[11px] font-semibold text-slate-200">{formatDate(session.bookingDate)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <div>
                    <p className="text-[8px] font-semibold uppercase text-slate-400 tracking-wider">{t("time")}</p>
                    <p className="text-[11px] font-semibold text-slate-200">{`${formatTime(session.startTime)} - ${formatTime(session.endTime)}`}</p>
                  </div>
                </div>
              </div>

              <div className="pt-2.5 border-t border-white/5 flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                <div>
                  <p className="text-[8px] font-semibold uppercase text-slate-400 tracking-wider">{t("lecturer")}</p>
                  <p className="text-[11px] font-semibold text-slate-200">{t("dr_name", "Dr. {{name}}", { name: session.userName })}</p>
                </div>
              </div>
            </div>

            {/* Attendance form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5 relative">
                <label className="block text-[10px] font-semibold text-slate-300 uppercase tracking-widest pl-1">
                  {t("full_name")}
                </label>
                <div className="relative">
                  <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors ${focusedInput === "name" ? "text-blue-400" : "text-slate-400"}`}>
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    readOnly={!!user}
                    placeholder={t("enter_full_name", { defaultValue: "Enter your full name" })}
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    onFocus={() => setFocusedInput("name")}
                    onBlur={() => setFocusedInput(null)}
                    className={`block w-full pl-10 pr-4 py-2.5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl text-xs text-white font-semibold !outline-none !ring-0 !ring-offset-0 focus:bg-white/10 transition-all ${user ? "cursor-not-allowed border-white/5 text-slate-300 bg-white/5" : focusedInput === "name" ? "border-blue-500/50 shadow-md shadow-blue-500/10" : "border-white/10"}`}
                  />
                </div>
              </div>

              <div className="space-y-1.5 relative">
                <label className="block text-[10px] font-semibold text-slate-300 uppercase tracking-widest pl-1">
                  {t("email_address")}
                </label>
                <div className="relative">
                  <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors ${focusedInput === "email" ? "text-blue-400" : "text-slate-400"}`}>
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    readOnly={!!user}
                    placeholder="student@example.com"
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    onFocus={() => setFocusedInput("email")}
                    onBlur={() => setFocusedInput(null)}
                    className={`block w-full pl-10 pr-4 py-2.5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl text-xs text-white font-semibold !outline-none !ring-0 !ring-offset-0 focus:bg-white/10 transition-all ${user ? "cursor-not-allowed border-white/5 text-slate-300 bg-white/5" : focusedInput === "email" ? "border-blue-500/50 shadow-md shadow-blue-500/10" : "border-white/10"}`}
                  />
                </div>
              </div>

              {submitError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-start gap-2.5 text-xs font-semibold leading-relaxed animate-shake">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !studentName.trim() || !studentEmail.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed py-3 text-xs font-semibold uppercase tracking-widest text-white shadow-xl shadow-blue-600/20 hover:shadow-blue-500/30 transition-all active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("submitting", { defaultValue: "Submitting..." })}
                  </>
                ) : (
                  t("submit_attendance")
                )}
              </button>

              {user && (
                <p className="text-[10px] text-center text-slate-400 font-semibold">
                  {i18n.language?.startsWith("si") ? (
                    <>
                      <span className="text-white font-semibold">{user.name}</span> {t("logged_in_as", "ලෙස ඇතුළු වී ඇත")}
                    </>
                  ) : i18n.language?.startsWith("ta") ? (
                    <>
                      <span className="text-white font-semibold">{user.name}</span> {t("logged_in_as", "ஆக உள்நுழைந்துள்ளார்")}
                    </>
                  ) : (
                    <>
                      {t("logged_in_as", "Logged in as ")} <span className="text-white font-semibold">{user.name}</span>
                    </>
                  )}
                </p>
              )}
            </form>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scale-in {
          0% { transform: scale(0.9); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-scale-in {
          animation: scale-in 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}} />
    </div>
  );
};

export default AttendanceCheckinPage;
