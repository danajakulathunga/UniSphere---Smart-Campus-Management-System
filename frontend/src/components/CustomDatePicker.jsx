import React, { useState, useRef, useEffect, useMemo } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

const CustomDatePicker = ({ value, onChange, minDate, label }) => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const parseLocalDate = (dateStr) => {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const [viewDate, setViewDate] = useState(value ? parseLocalDate(value) : new Date());
  const selectedDate = value ? parseLocalDate(value) : null;
  if (selectedDate) selectedDate.setHours(0,0,0,0);

  useEffect(() => {
    if (value && isOpen) {
      setViewDate(parseLocalDate(value));
    }
  }, [value, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleDateClick = (day) => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const renderDays = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);
    const days = [];

    // Empty slots for previous month
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-9 w-9" />);
    }

    const minDateObj = parseLocalDate(minDate);
    if (minDateObj) minDateObj.setHours(0,0,0,0);

    for (let d = 1; d <= totalDays; d++) {
      const currentDate = new Date(year, month, d);
      currentDate.setHours(0,0,0,0);
      
      const isToday = currentDate.getTime() === today.getTime();
      const isSelected = selectedDate && currentDate.getTime() === selectedDate.getTime();
      const isDisabled = minDateObj && currentDate < minDateObj;

      days.push(
        <button
          key={d}
          type="button"
          disabled={isDisabled}
          onClick={() => handleDateClick(d)}
          className={`h-8 w-8 flex items-center justify-center rounded-lg text-[11px] font-bold transition-all
            ${isDisabled ? "text-slate-300 cursor-not-allowed" : "hover:bg-blue-50 hover:text-blue-600"}
            ${isToday && !isSelected ? "bg-blue-100 text-blue-700 ring-1 ring-blue-400" : ""}
            ${isSelected ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-105 z-10" : "text-slate-600 dark:text-slate-400"}
          `}
        >
          {d}
        </button>
      );
    }
    return days;
  };

  const currentLang = i18n.language || "en";
  const dateLocale = currentLang === "si" ? "si-LK" : currentLang === "ta" ? "ta-LK" : "en-US";

  const localizedMonthYear = useMemo(() => {
    return viewDate.toLocaleDateString(dateLocale, { month: 'long', year: 'numeric' });
  }, [viewDate, dateLocale]);

  const weekdays = useMemo(() => {
    const baseDate = new Date(2026, 5, 14); // June 14, 2026 is a Sunday
    const list = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      if (currentLang === "en") {
        const enWeekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
        list.push(enWeekdays[i]);
      } else {
        list.push(d.toLocaleDateString(dateLocale, { weekday: 'short' }));
      }
    }
    return list;
  }, [dateLocale, currentLang]);

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between rounded-xl border-2 border-slate-200 bg-slate-50/50 px-4 py-2 text-[13px] font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all dark:bg-slate-800/50 dark:border-white/5 dark:text-white"
      >
        <span>{value || t("select_date", { defaultValue: "Select Date" })}</span>
        <CalendarIcon className="h-4 w-4 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-[100] w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 p-3 animate-modal-content dark:bg-slate-900 dark:border-white/10">
          <div className="flex items-center justify-between mb-3 px-1">
            <h4 className="font-black text-slate-900 dark:text-white text-xs capitalize">
              {localizedMonthYear}
            </h4>
            <div className="flex gap-0.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {weekdays.map((day, idx) => (
              <div key={idx} className="h-8 w-8 flex items-center justify-center text-[9px] font-black uppercase text-slate-400">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {renderDays()}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-50 dark:border-white/5 flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => {
                const d = new Date();
                const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                onChange(todayStr);
                setIsOpen(false);
              }}
              className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700"
            >
              {t("today", { defaultValue: "Today" })}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600"
            >
              {t("close", { defaultValue: "Close" })}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDatePicker;

