import React, { useState, useEffect, useMemo } from "react";
import { Clock, MapPin, Loader2, Calendar, Plus, Minus, GraduationCap } from "lucide-react";
import Modal from "./Modal";
import CustomDropdown from "./CustomDropdown";
import api from "../services/api";
import { useAlert } from "../context/AlertContext";
import CustomDatePicker from "./CustomDatePicker";
import CustomTimePicker from "./CustomTimePicker";
import { normalizeRoles, useAuth } from "../context/AuthContext";
import { FileUp, FileText, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const BookingFormModal = ({
  isOpen,
  onClose,
  editingBookingId,
  initialData,
  resources,
  onSuccess,
  lockResource = false
}) => {
  const navigate = useNavigate();
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
  const dateLocale = i18n.language?.startsWith("si") ? "si-LK" : i18n.language?.startsWith("ta") ? "ta-LK" : "en-US";
  const { user } = useAuth();
  const roles = normalizeRoles(user?.roles);
  const isLecturer = roles.includes("LECTURER");
  const isAdmin = roles.includes("ADMIN");
  const isPrivileged = isLecturer || isAdmin;

  const { showAlert } = useAlert();
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [currentTimeState, setCurrentTimeState] = useState(new Date());

  const getLocalDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [bookingForm, setBookingForm] = useState({
    resourceId: "",
    bookingDate: getLocalDate(),
    startTime: "",
    endTime: "",
    purpose: "",
    capacity: 1,
  });

  const WORKING_START = "07:00";
  const WORKING_END = "22:30";

  // Keep current time updated every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeState(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setBookingForm({
          resourceId: initialData.resourceId || "",
          bookingDate: initialData.bookingDate || getLocalDate(),
          startTime: initialData.startTime || "",
          endTime: initialData.endTime || "",
          purpose: initialData.purpose || "",
          capacity: initialData.capacity || 1,
        });
      } else {
        setBookingForm({
          resourceId: "",
          bookingDate: getLocalDate(),
          startTime: "",
          endTime: "",
          purpose: "",
          capacity: 1,
        });
      }
      setAvailableSlots([]);
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    if (bookingForm.resourceId && bookingForm.bookingDate) {
      fetchAvailability();
    } else {
      setAvailableSlots([]);
    }
  }, [bookingForm.resourceId, bookingForm.bookingDate]);

  const fetchAvailability = async () => {
    setLoadingAvailability(true);
    try {
      const res = await api.get("/bookings/availability", {
        params: {
          resourceId: bookingForm.resourceId,
          date: bookingForm.bookingDate
        }
      });
      setAvailableSlots(res.data || []);
    } catch (err) {
      console.error("Failed to fetch availability", err);
      setAvailableSlots([]);
    } finally {
      setLoadingAvailability(false);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    
    // Ensure time includes seconds for backend LocalTime parsing
    const formatToSeconds = (time) => time && time.length === 5 ? `${time}:00` : time;
    
    const payload = {
      ...bookingForm,
      startTime: formatToSeconds(bookingForm.startTime),
      endTime: formatToSeconds(bookingForm.endTime)
    };

    setIsSubmitting(true);

    // Zero-latency availability check (Only for NEW bookings to avoid conflict with itself during edit)
    if (!editingBookingId) {
      const isSlotAvailable = processedSlots.some(slot => {
        const slotStart = formatTime(slot.startTime);
        const slotEnd = formatTime(slot.endTime);
        return bookingForm.startTime >= slotStart && bookingForm.endTime <= slotEnd;
      });

      if (!isSlotAvailable) {
        showAlert("error", t("err_slot_unavailable", { defaultValue: "Selected time slot or location is not available. Please choose a different time or resource." }));
        setIsSubmitting(false);
        return;
      }
    }

    // Show success alert immediately for zero-latency feel
    if (isLecturer) {
      if (editingBookingId) {
        showAlert("success", t("success_booking_updated", { defaultValue: "Booking updated and sent for approval" }), () => {
          navigate("/my-lectures");
        });
      } else {
        showAlert("success", t("success_booking_created", { defaultValue: "Booking created successfully!" }), () => {
          navigate("/my-lectures");
        });
      }
    } else {
      if (editingBookingId) {
        showAlert("success", t("success_booking_updated", { defaultValue: "Booking updated and sent for approval" }));
      } else {
        showAlert("success", t("success_booking_created", { defaultValue: "Booking created successfully!" }));
      }
    }
    onClose(); 

    try {
      if (editingBookingId) {
        // PRESERVE shared session data
        const fullPayload = {
          ...payload,
          assignedBatch: initialData?.assignedBatch || "",
          lectureMaterials: initialData?.lectureMaterials || [],
          sessionDetails: initialData?.sessionDetails || ""
        };
        await api.put(`/bookings/${editingBookingId}`, fullPayload);

      } else {
        await api.post("/bookings", payload);
      }
      onSuccess(); // Refresh the list in background
    } catch (err) {
      console.error("Full Error Response:", err);
      const msg = err?.response?.data?.message || err?.response?.data?.error || "";
      const details = err?.response?.data?.details;
      
      // If error, show error alert (replaces the previous success alert)
      if (details) {
         const errorMsgs = Object.values(details).join(", ");
         showAlert("error", `Validation error: ${errorMsgs}`);
      } else if (msg.toLowerCase().includes("conflict") || msg.toLowerCase().includes("not available")) {
        showAlert("error", "Selected time slot or location is not available. Please choose a different time or resource.");
      } else {
        showAlert("error", msg || `Failed to ${editingBookingId ? "update" : "create"} booking.`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIncrementCapacity = () => {
    const selectedResource = resources.find(r => r.id === bookingForm.resourceId);
    if (!selectedResource) {
      showAlert("error", t("err_select_resource_first", { defaultValue: "Please select a resource first." }));
      return;
    }
    if (bookingForm.capacity >= selectedResource.capacity) {
      showAlert("error", t("err_max_capacity", { defaultValue: "Maximum capacity for this resource is {{capacity}}.", capacity: selectedResource.capacity }));
      return;
    }
    setBookingForm(prev => ({ ...prev, capacity: prev.capacity + 1 }));
  };

  const handleDecrementCapacity = () => {
    if (bookingForm.capacity > 1) {
      setBookingForm(prev => ({ ...prev, capacity: prev.capacity - 1 }));
    }
  };

  const handleCapacityChange = (e) => {
    const val = e.target.value === "" ? "" : parseInt(e.target.value);
    const selectedResource = resources.find(r => r.id === bookingForm.resourceId);
    
    if (val === "") {
      setBookingForm(prev => ({ ...prev, capacity: "" }));
      return;
    }

    if (isNaN(val)) return;

    if (!selectedResource) {
      showAlert("error", t("err_select_resource_first", { defaultValue: "Please select a resource first." }));
      setBookingForm(prev => ({ ...prev, capacity: 1 }));
      return;
    }

    if (val > selectedResource.capacity) {
      showAlert("error", t("err_max_capacity", { defaultValue: "Maximum capacity for this resource is {{capacity}}.", capacity: selectedResource.capacity }));
      setBookingForm(prev => ({ ...prev, capacity: selectedResource.capacity }));
      return;
    }

    setBookingForm(prev => ({ ...prev, capacity: val }));
  };

  const handleCapacityBlur = () => {
    if (bookingForm.capacity === "" || bookingForm.capacity < 1) {
      setBookingForm(prev => ({ ...prev, capacity: 1 }));
    }
  };

  const handleTimeChange = (type, val) => {
    if (val < WORKING_START || val > WORKING_END) {
      const formatToAMPM = (time24) => {
        try {
          let [h, m] = time24.split(":");
          let date = new Date();
          date.setHours(parseInt(h, 10));
          date.setMinutes(parseInt(m, 10));
          return date.toLocaleTimeString(dateLocale, {
            hour: "2-digit",
            minute: "2-digit",
          });
        } catch {
          return time24;
        }
      };
      showAlert("error", t("err_working_hours", { defaultValue: "Campus working hours are from {{start}} to {{end}}.", start: formatToAMPM(WORKING_START), end: formatToAMPM(WORKING_END) }));
      return;
    }
    setBookingForm(prev => ({ ...prev, [type]: val }));
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    return timeStr.substring(0, 5);
  };

  const selectSlot = (slot) => {
    setBookingForm(prev => ({
      ...prev,
      startTime: formatTime(slot.startTime),
      endTime: formatTime(slot.endTime) === "23:59" && slot.endTime.includes("59:59") ? "23:59" : formatTime(slot.endTime)
    }));
  };

  // Logic to filter and adjust slots based on current time and working hours
  const processedSlots = useMemo(() => {
    const today = getLocalDate();
    const isToday = bookingForm.bookingDate === today;
    const nowStr = currentTimeState.toTimeString().substring(0, 5); // "HH:MM"

    // If no slots from backend but it's a valid future date, could we assume full working hours?
    // User said: "date ekaka kisima booking ekak nathi nam ihatha time range eka yoda slote eka display karanna"
    // Usually backend returns [00:00-23:59] if no bookings.
    
    return (availableSlots.length > 0 ? availableSlots : [])
      .map(slot => {
        let start = formatTime(slot.startTime);
        let end = formatTime(slot.endTime);

        // Clip to working hours
        if (start < WORKING_START) start = WORKING_START;
        if (end > WORKING_END) end = WORKING_END;

        // Clip to current time if today
        if (isToday && start < nowStr) start = nowStr;

        return { ...slot, startTime: start + ":00", endTime: end + ":00" };
      })
      .filter(slot => {
        const start = formatTime(slot.startTime);
        const end = formatTime(slot.endTime);
        return start < end; // Only keep slots with positive duration
      });
  }, [availableSlots, bookingForm.bookingDate, currentTimeState, WORKING_START, WORKING_END]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingBookingId ? t("update_reservation", { defaultValue: "Update Reservation" }) : t("new_reservation_request", { defaultValue: "New Reservation Request" })}
      subtitle={editingBookingId ? t("modify_booking_desc", { defaultValue: "Modify your existing booking details" }) : t("new_booking_desc", { defaultValue: "Unified Campus Resource Booking" })}
      maxWidth="max-w-xl"
      footer={
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            className="px-8 py-4 text-sm font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all active:scale-95"
            onClick={onClose}
          >
            {t("cancel")}
          </button>
          <button
            form="booking-form"
            type="submit"
            className="rounded-2xl bg-blue-600 px-10 py-4 text-sm font-black text-white shadow-[0_20px_40px_-12px_rgba(37,99,235,0.4)] transition-all hover:bg-blue-500 hover:-translate-y-0.5 active:scale-95"
          >
            {editingBookingId ? t("update_reservation", { defaultValue: "Update Reservation" }) : t("request_reservation", { defaultValue: "Request Reservation" })}
          </button>
        </div>
      }
    >
      <form id="booking-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
            <div className="space-y-2">
              <CustomDropdown
                label={t("available_resource", { defaultValue: "Available Resource" })}
                icon={MapPin}
                disabled={lockResource}
                options={resources
                  .filter(r => r.status === "ACTIVE" && r.availability)
                  .map(r => ({
                    value: r.id,
                    label: `${r.name} (${getLocalizedLocation(r.location)} • ${t("capacity_short", { defaultValue: "Cap" })}: ${r.capacity})`
                  }))}
                value={bookingForm.resourceId}
                onChange={(val) => {
                  const newResource = resources.find(r => r.id === val);
                  let newCap = bookingForm.capacity;
                  if (newResource && newCap > newResource.capacity) {
                    newCap = newResource.capacity || 1;
                  }
                  setBookingForm(prev => ({ ...prev, resourceId: val, capacity: newCap }));
                }}
                placeholder={t("select_facility_placeholder", { defaultValue: "Select a facility to book" })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1 mb-2 block">{t("attendees", { defaultValue: "Attendees" })}</label>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 border-2 border-slate-100 p-1 h-[42px] dark:bg-slate-800/50 dark:border-white/5">
                <button
                  type="button"
                  onClick={handleDecrementCapacity}
                  className="h-full px-3 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 active:scale-95 transition-all dark:bg-slate-900 dark:border-white/10 dark:text-slate-300 dark:hover:bg-slate-800 shadow-sm"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  value={bookingForm.capacity}
                  onChange={handleCapacityChange}
                  onBlur={handleCapacityBlur}
                  className="w-12 bg-transparent text-center text-sm font-bold text-slate-900 dark:text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  onClick={handleIncrementCapacity}
                  className="h-full px-3 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 active:scale-95 transition-all dark:bg-slate-900 dark:border-white/10 dark:text-slate-300 dark:hover:bg-slate-800 shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <CustomDatePicker
              label={t("reservation_date", { defaultValue: "Reservation Date" })}
              value={bookingForm.bookingDate}
              minDate={getLocalDate()}
              onChange={(val) => setBookingForm(prev => ({ ...prev, bookingDate: val }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <CustomTimePicker
                label={t("start")}
                value={bookingForm.startTime}
                onChange={(val) => handleTimeChange("startTime", val)}
                minTime={WORKING_START}
                maxTime={WORKING_END}
              />
              <CustomTimePicker
                label={t("end")}
                value={bookingForm.endTime}
                onChange={(val) => handleTimeChange("endTime", val)}
                minTime={WORKING_START}
                maxTime={WORKING_END}
                align="right"
              />
            </div>
          </div>

          {/* Availability Section */}
          <div className="rounded-2xl bg-slate-50/50 p-5 border border-slate-100 dark:bg-white/5 dark:border-white/10">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Clock className="h-3 w-3" /> {t("available_time_slots", { defaultValue: "Available Time Slots" })}
              </h4>
              {loadingAvailability && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
            </div>

            {!bookingForm.resourceId || !bookingForm.bookingDate ? (
              <p className="text-xs font-bold text-slate-400 italic">{t("select_resource_date_warning", { defaultValue: "Select resource and date to see availability" })}</p>
            ) : loadingAvailability ? (
              <div className="flex items-center gap-2 text-xs font-bold text-blue-500">
                {t("checking_availability", { defaultValue: "Checking real-time availability..." })}
              </div>
            ) : processedSlots.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {processedSlots.map((slot, index) => {
                  const startStr = formatTime(slot.startTime);
                  const endStr = formatTime(slot.endTime);
                  const isSelected = bookingForm.startTime === startStr && bookingForm.endTime === endStr;

                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => selectSlot(slot)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${isSelected
                          ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20"
                          : "bg-white border-slate-200 text-slate-600 hover:border-blue-400 hover:bg-blue-50 dark:bg-slate-900 dark:border-white/10 dark:text-slate-400 dark:hover:bg-blue-900/20"
                        }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black">{startStr} - {endStr}</span>
                      </div>
                      <span className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${isSelected ? "text-blue-100" : "text-slate-400"}`}>
                        {t("available")}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-center dark:bg-rose-900/10 dark:border-rose-500/20">
                <p className="text-xs font-black text-rose-600 uppercase tracking-widest">
                  {bookingForm.bookingDate === getLocalDate()
                    ? t("no_slots_today", { defaultValue: "No available slots for today" })
                    : t("no_slots_date", { defaultValue: "No available time slots for selected date" })}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2 pb-2">
            <label className="text-[11px] font-black uppercase tracking-widest text-blue-600/80 ml-1">{t("booking_purpose", { defaultValue: "Booking Purpose" })}</label>
            <input
              type="text"
              className="w-full rounded-xl bg-white border-2 border-slate-200 px-4 py-2 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all dark:bg-slate-800/50 dark:border-white/10 dark:text-white"
              placeholder={t("placeholder_booking_purpose", { defaultValue: "Briefly describe why you are reserving this resource..." })}
              value={bookingForm.purpose}
              onChange={(e) => setBookingForm(prev => ({ ...prev, purpose: e.target.value }))}
              required
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default BookingFormModal;
