import React, { useState, useEffect } from "react";
import { 
  GraduationCap, 
  FileUp, 
  FileText, 
  X, 
  MapPin, 
  Calendar, 
  Clock, 
  Info,
  Send,
  Loader2
} from "lucide-react";
import Modal from "./Modal";
import CustomDropdown from "./CustomDropdown";
import RichTextEditor from "./RichTextEditor";
import api from "../services/api";
import { useAlert } from "../context/AlertContext";
import { useAuth } from "../context/AuthContext";
import { formatDate } from "../utils/dateUtils";
import { useTranslation } from "react-i18next";

const ShareSessionModal = ({ isOpen, onClose, booking, onSuccess }) => {
  const { t, i18n } = useTranslation();
  const getLocalizedLocation = (loc) => {
    if (!loc) return "";
    let localized = loc;
    const keyMap = {
      "main building": "main_building",
      "new building": "new_building",
      "foe building": "foe_building",
      "fob building": "fob_building",
      "auditorium": "auditorium"
    };
    const keys = Object.keys(keyMap).sort((a, b) => b.length - a.length);
    for (const k of keys) {
      const regex = new RegExp(k, "gi");
      if (regex.test(localized)) {
        localized = localized.replace(regex, t(keyMap[k]));
      }
    }
    return localized;
  };
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    assignedBatch: "",
    lectureMaterials: [],
    sessionDetails: ""
  });

  useEffect(() => {
    if (isOpen && booking) {
      setFormData({
        assignedBatch: booking.assignedBatch || "",
        lectureMaterials: booking.lectureMaterials || [],
        sessionDetails: booking.sessionDetails || ""
      });
    }
  }, [isOpen, booking]);

  const formatTime = (time) => {
    if (!time) return "";
    try {
      const [h, m] = time.split(":");
      const date = new Date();
      date.setHours(parseInt(h, 10));
      date.setMinutes(parseInt(m, 10));
      const currentLang = i18n.language || "en";
      const dateLocale = currentLang?.startsWith("si") ? "si-LK" : currentLang?.startsWith("ta") ? "ta-LK" : "en-US";
      return date.toLocaleTimeString(dateLocale, {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return time;
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const allowedTypes = [
      'application/pdf', 
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain'
    ];

    files.forEach(file => {
      if (!allowedTypes.includes(file.type)) {
        showAlert("error", t("err_unsupported_file_type", { defaultValue: "{{fileName}} is not a supported file type.", fileName: file.name }));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showAlert("error", t("err_file_too_large", { defaultValue: "{{fileName}} is too large. Max size is 5MB.", fileName: file.name }));
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          lectureMaterials: [...prev.lectureMaterials, reader.result]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeMaterial = (index) => {
    setFormData(prev => ({
      ...prev,
      lectureMaterials: prev.lectureMaterials.filter((_, i) => i !== index)
    }));
  };

  const getBatchOptions = () => {
    if (!user?.batches) return [];
    return user.batches.split(",").map(b => ({
      value: b.trim(),
      label: b.trim()
    }));
  };

  const handleSubmit = async () => {
    if (!formData.assignedBatch) {
      showAlert("error", t("err_select_batch_first", { defaultValue: "Please select a student batch first." }));
      return;
    }

    setIsSubmitting(true);
    try {
      // We use the same update endpoint but only sending the share-related fields
      const payload = {
        ...booking,
        assignedBatch: formData.assignedBatch,
        lectureMaterials: formData.lectureMaterials,
        sessionDetails: formData.sessionDetails
      };

      await api.put(`/bookings/${booking.id}`, payload);
      console.log("Session shared successfully:", payload);
      showAlert("success", t("success_session_shared", { defaultValue: "Session successfully shared with {{batch}} students!", batch: formData.assignedBatch }));
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Failed to share session", err);
      showAlert("error", t("err_failed_share_materials", { defaultValue: "Failed to share materials. Please try again." }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCancelled = booking?.status === "CANCELLED";

  if (!booking) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={booking?.assignedBatch ? t("update_session", { defaultValue: "Update Session" }) : t("share_session", { defaultValue: "Share Session" })}
      subtitle={booking?.assignedBatch ? t("modify_materials_desc", { defaultValue: "Modify materials and update student batch" }) : t("publish_materials_desc", { defaultValue: "Publish materials and notify students" })}
      maxWidth="max-w-2xl"
      footer={
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            className="text-sm font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all"
            onClick={onClose}
          >
            {t("cancel")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || isCancelled}
            className={`flex items-center gap-2 rounded-2xl bg-blue-600 px-8 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500 active:scale-95 ${
              isSubmitting || isCancelled ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {booking?.assignedBatch ? t("update", { defaultValue: "Update" }) : t("share", { defaultValue: "Share" })}
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {isCancelled && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 flex items-center gap-3 dark:bg-rose-900/20 dark:border-rose-500/20">
            <X className="h-5 w-5 text-rose-500" />
            <p className="text-sm font-black text-rose-600 uppercase tracking-widest">{t("msg_session_cancelled", { defaultValue: "This session has been cancelled" })}</p>
          </div>
        )}
        {/* Session Details Header */}
        <div className="rounded-2xl bg-slate-50 p-5 border border-slate-100 dark:bg-white/5 dark:border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900 dark:text-white tracking-tight">{booking.purpose}</h4>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t("session_information", { defaultValue: "Session Information" })}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
              <MapPin className="h-3.5 w-3.5 text-blue-500" />
              {getLocalizedLocation(booking.resourceName)}
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
              <Calendar className="h-3.5 w-3.5 text-blue-500" />
              {formatDate(booking.bookingDate)}
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
              <Clock className="h-3.5 w-3.5 text-blue-500" />
              {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
            </div>
          </div>
        </div>

        {/* Share Controls */}
        <div className="space-y-4">
          <div className="space-y-2">
            <CustomDropdown
              label={t("assign_student_batch", { defaultValue: "Assign to Student Batch" })}
              icon={GraduationCap}
              options={getBatchOptions()}
              value={formData.assignedBatch}
              onChange={(val) => setFormData(prev => ({ ...prev, assignedBatch: val }))}
              placeholder={t("select_batch_placeholder", { defaultValue: "Select a batch to notify (e.g. Y3S2)" })}
            />
          </div>

          <div className="space-y-2">
            <RichTextEditor
              label={t("session_instructions_details", { defaultValue: "Session Instructions & Details" })}
              value={formData.sessionDetails}
              onChange={(val) => setFormData(prev => ({ ...prev, sessionDetails: val }))}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-widest text-blue-600/80 ml-1 block mb-2">{t("lecture_materials", { defaultValue: "Lecture Materials" })}</label>
            <div className="grid grid-cols-2 gap-4">
              <label className="relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50/50 transition-all cursor-pointer group dark:border-white/10">
                <FileUp className="h-8 w-8 text-slate-400 group-hover:text-blue-500 mb-2" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-blue-600">{t("upload_files", { defaultValue: "Upload Files" })}</span>
                <input type="file" multiple className="hidden" onChange={handleFileChange} />
              </label>
              
              <div className="flex flex-col gap-2 overflow-y-auto max-h-[120px] auth-scroll-user pr-2">
                {formData.lectureMaterials.map((mat, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-100 shadow-sm dark:bg-white/5 dark:border-white/10 group">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 truncate">
                        {mat.startsWith("/uploads/") ? mat.split("/").pop() : `${t("attachment", { defaultValue: "Attachment" })} ${idx + 1}`}
                      </span>
                    </div>
                    <button type="button" onClick={() => removeMaterial(idx)} className="text-slate-400 hover:text-rose-500 transition-colors p-1">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {formData.lectureMaterials.length === 0 && (
                  <div className="h-full flex items-center justify-center border-2 border-slate-50 rounded-2xl dark:border-white/5">
                    <span className="text-[10px] font-bold text-slate-400 italic">{t("no_materials_added", { defaultValue: "No materials added" })}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ShareSessionModal;
