import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Calendar, ChevronLeft, ChevronRight, X, Clock, User as UserIcon } from "lucide-react";


const getEventDateString = (bookingDate) => {
  if (Array.isArray(bookingDate)) {
    const [y, m, d] = bookingDate;
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  if (typeof bookingDate === "string") {
    return bookingDate.split("T")[0];
  }
  return "";
};

const getEventTimeString = (startTime) => {
  if (Array.isArray(startTime)) {
    const [h, min] = startTime;
    return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  }
  if (typeof startTime === "string") {
    return startTime.substring(0, 5);
  }
  return "";
};

const DashboardCalendar = ({ events = [], isLoading = false, onMonthChange, userRole }) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === "si" ? "si-LK" : i18n.language === "ta" ? "ta-LK" : "en-US";

  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTooltipDate, setActiveTooltipDate] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ top: false }); // true = show above
  const popupRef = useRef(null);
  const gridRef = useRef(null);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const weekdays = useMemo(() => {
    const baseDate = new Date(2026, 5, 15); // June 15, 2026 is a Monday
    const list = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      list.push(d.toLocaleDateString(dateLocale, { weekday: 'short' }));
    }
    return list;
  }, [dateLocale]);

  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const startDayOfWeek = (year, month) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const days = useMemo(() => {
    const totalDays = daysInMonth(currentYear, currentMonth);
    const startOffset = startDayOfWeek(currentYear, currentMonth);
    const prevMonthDaysCount = daysInMonth(currentYear, currentMonth - 1);

    const list = [];

    for (let i = startOffset - 1; i >= 0; i--) {
      const d = prevMonthDaysCount - i;
      const prevDate = new Date(currentYear, currentMonth - 1, d);
      list.push({
        date: prevDate,
        isCurrentMonth: false,
        dayNum: d,
        dateString: `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      });
    }

    for (let i = 1; i <= totalDays; i++) {
      const currDate = new Date(currentYear, currentMonth, i);
      list.push({
        date: currDate,
        isCurrentMonth: true,
        dayNum: i,
        dateString: `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`,
      });
    }

    const totalSlots = 42;
    const remaining = totalSlots - list.length;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(currentYear, currentMonth + 1, i);
      list.push({
        date: nextDate,
        isCurrentMonth: false,
        dayNum: i,
        dateString: `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`,
      });
    }

    return list;
  }, [currentYear, currentMonth]);

  // Trigger data fetching for parent when month changes
  useEffect(() => {
    const startStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
    const endStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    if (onMonthChange) {
      onMonthChange(startStr, endStr);
    }
  }, [currentYear, currentMonth]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    setActiveTooltipDate(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    setActiveTooltipDate(null);
  };

  // Group events by parsed date string
  const eventsByDate = useMemo(() => {
    const groups = {};
    events.forEach((event) => {
      const dateStr = getEventDateString(event.bookingDate);
      if (dateStr) {
        if (!groups[dateStr]) {
          groups[dateStr] = [];
        }
        groups[dateStr].push(event);
      }
    });

    Object.keys(groups).forEach((dateStr) => {
      groups[dateStr].sort((a, b) => {
        const timeA = getEventTimeString(a.startTime);
        const timeB = getEventTimeString(b.startTime);
        return timeA.localeCompare(timeB);
      });
    });

    return groups;
  }, [events]);

  const todayStr = useMemo(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  }, []);

  // Close popup on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setActiveTooltipDate(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleItemClick = (e, item) => {
    e.stopPropagation();
    setActiveTooltipDate(null);
    const dateStr = getEventDateString(item.bookingDate);

    // Admin sees all events as bookings → always navigate to /bookings
    if (userRole === "ADMIN") {
      navigate(`/bookings?highlight=${item.id}&date=${dateStr}`);
    } else if (item.assignedBatch) {
      navigate(`/my-lectures?highlight=${item.id}&date=${dateStr}`);
    } else {
      navigate(`/bookings?highlight=${item.id}&date=${dateStr}`);
    }
  };

  // Determine popup position: show above or below based on row
  const handleCellClick = useCallback((e, dateString, hasEvents, index) => {
    if (!hasEvents) return;
    if (activeTooltipDate === dateString) {
      setActiveTooltipDate(null);
      return;
    }
    // If cell is in first 3 rows (index < 21), show below; else show above
    const row = Math.floor(index / 7);
    setTooltipPos({ top: row >= 3 });
    setActiveTooltipDate(dateString);
  }, [activeTooltipDate]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/5 dark:bg-slate-900/50 flex flex-col w-full select-none">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100 dark:border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/10">
            <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
              {currentDate.toLocaleDateString(dateLocale, { month: 'long' })} {currentYear}
            </h3>
            <p className="text-[8px] font-bold uppercase tracking-widest text-slate-500">
              {t("campus_schedule")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:scale-105 active:scale-95 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10 transition-all duration-150"
            aria-label="Previous Month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:scale-105 active:scale-95 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10 transition-all duration-150"
            aria-label="Next Month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1.5 text-center mb-1">
        {weekdays.map((day) => (
          <div
            key={day}
            className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 py-0.5"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1.5 relative" ref={gridRef}>
        {isLoading ? (
          <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-lg">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          </div>
        ) : null}

        {days.map(({ date, isCurrentMonth, dayNum, dateString }, index) => {
          const dayEvents = eventsByDate[dateString] || [];
          const isToday = dateString === todayStr;

          // For ADMIN, all events are bookings (fetched from /bookings endpoint)
          const treatAllAsBookings = userRole === "ADMIN";
          const lectureCount = treatAllAsBookings ? 0 : dayEvents.filter((e) => e.assignedBatch).length;
          const bookingCount = treatAllAsBookings ? dayEvents.length : dayEvents.filter((e) => !e.assignedBatch).length;
          const hasEvents = dayEvents.length > 0;

          const isTooltipActive = activeTooltipDate === dateString;

          return (
            <div
              key={dateString}
              onClick={(e) => handleCellClick(e, dateString, hasEvents, index)}
              className={`relative min-h-[42px] sm:min-h-[46px] rounded-lg border p-1 flex flex-col justify-between transition-all duration-200 select-none ${
                isCurrentMonth
                  ? `bg-slate-50/50 border-slate-100 dark:bg-white/5 dark:border-white/5 ${hasEvents ? "cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 dark:hover:border-blue-500/50 dark:hover:bg-blue-500/5" : "cursor-default"}`
                  : "bg-transparent border-transparent opacity-30 cursor-default pointer-events-none"
              } ${isToday ? "ring-2 ring-blue-500 dark:ring-blue-400 ring-offset-1 dark:ring-offset-slate-900" : ""}`}
            >
              {/* Day Number */}
              <div className="flex items-center justify-between px-0.5 pt-0.5">
                <span
                  className={`text-[10px] font-black ${
                    isToday
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-slate-700 dark:text-slate-200"
                  }`}
                >
                  {dayNum}
                </span>
              </div>

              {/* Event indicators: badge dot + count number */}
              <div className="flex items-center gap-1 px-0.5 pb-0.5 mt-0.5 flex-wrap">
                {lectureCount > 0 && (
                  <span className="flex items-center gap-0.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-purple-500 flex-shrink-0" />
                    <span className="text-[8px] font-black text-purple-600 dark:text-purple-400 leading-none">
                      {lectureCount}
                    </span>
                  </span>
                )}
                {bookingCount > 0 && (
                  <span className="flex items-center gap-0.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                    <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 leading-none">
                      {bookingCount}
                    </span>
                  </span>
                )}
              </div>

              {/* Click-triggered Popup */}
              {hasEvents && isTooltipActive && (
                <div
                  ref={popupRef}
                  onClick={(e) => e.stopPropagation()}
                  className={`absolute ${
                    tooltipPos.top
                      ? "bottom-full mb-1.5"
                      : "top-full mt-1.5"
                  } left-1/2 -translate-x-1/2 w-64 bg-white text-slate-800 border border-slate-200/80 shadow-2xl rounded-xl p-3 z-[9999] pointer-events-auto dark:bg-slate-900 dark:text-white dark:border-white/10`}
                  style={{ animation: "popupReveal 0.15s ease-out" }}
                >
                  {/* Popup Header */}
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100 dark:border-white/10">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        {date.toLocaleDateString(dateLocale, { month: "short", day: "numeric", weekday: "short" })}
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {lectureCount > 0 && (
                          <span className="flex items-center gap-1 text-[8px] font-black text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-1.5 py-0.5 rounded-md border border-purple-100 dark:border-purple-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                            {lectureCount} {lectureCount > 1 ? t("lectures") : t("lecture")}
                          </span>
                        )}
                        {bookingCount > 0 && (
                          <span className="flex items-center gap-1 text-[8px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {bookingCount} {bookingCount > 1 ? t("bookings") : t("booking")}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Close Button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveTooltipDate(null); }}
                      className="ml-2 flex-shrink-0 h-5 w-5 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-white dark:hover:bg-white/10 transition-all"
                      aria-label="Close"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Event list */}
                  <div className="space-y-1.5 max-h-52 overflow-y-auto scrollbar-hide">
                    {dayEvents.slice(0, 5).map((item) => {
                      const isLecture = !treatAllAsBookings && !!item.assignedBatch;
                      const timeStr = getEventTimeString(item.startTime);
                      const displayTitle = item.purpose || item.resourceName;

                      return (
                        <div
                          key={item.id}
                          onClick={(e) => handleItemClick(e, item)}
                          className={`flex flex-col gap-0.5 p-1.5 rounded-lg border transition-all cursor-pointer text-left ${
                            isLecture
                              ? "bg-purple-50/70 border-purple-100/60 hover:bg-purple-100/80 hover:border-purple-300/60 dark:bg-purple-950/20 dark:border-purple-900/30 dark:hover:bg-purple-950/40 dark:hover:border-purple-700/40"
                              : "bg-emerald-50/70 border-emerald-100/60 hover:bg-emerald-100/80 hover:border-emerald-300/60 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:hover:bg-emerald-950/40 dark:hover:border-emerald-700/40"
                          } group/item`}
                        >
                          <div className="flex items-start gap-1.5">
                            {/* Colored type indicator dot */}
                            <span className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${isLecture ? "bg-purple-500" : "bg-emerald-500"}`} />
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-bold truncate group-hover/item:opacity-80 transition-opacity ${
                                isLecture
                                  ? "text-purple-900 dark:text-purple-200"
                                  : "text-emerald-900 dark:text-emerald-200"
                              }`}>
                                {displayTitle}
                              </p>
                              <div className={`flex items-center gap-1.5 mt-0.5 text-[9px] font-bold ${
                                isLecture
                                  ? "text-purple-600/80 dark:text-purple-400/70"
                                  : "text-emerald-600/80 dark:text-emerald-400/70"
                              }`}>
                                <Clock className="h-2.5 w-2.5" />
                                <span>{timeStr}</span>
                                {item.resourceName && isLecture && (
                                  <span className="truncate">• {item.resourceName}</span>
                                )}
                                {item.resourceName && treatAllAsBookings && (
                                  <span className="truncate">• {item.resourceName}</span>
                                )}
                              </div>
                              {userRole === "ADMIN" && item.userName && (
                                <div className="flex items-center gap-1 mt-0.5 text-[8px] font-bold text-blue-600 dark:text-blue-400/80 uppercase tracking-widest">
                                  <UserIcon className="h-2 w-2" />
                                  <span className="truncate">{item.userName}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {dayEvents.length > 5 && (
                      <div className="text-center pt-1 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        +{dayEvents.length - 5} {t("more", { defaultValue: "more" })}
                      </div>
                    )}
                  </div>

                  {/* Arrow pointer */}
                  {!tooltipPos.top && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-white dark:border-b-slate-900" style={{ marginBottom: "-1px" }} />
                  )}
                  {tooltipPos.top && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white dark:border-t-slate-900" style={{ marginTop: "-1px" }} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-100 dark:border-white/5">
        {userRole !== "ADMIN" && (
          <span className="flex items-center gap-1 text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            <span className="h-2 w-2 rounded-full bg-purple-500" /> {t("lectures")}
          </span>
        )}
        <span className="flex items-center gap-1 text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> {t("bookings")}
        </span>
        <span className="ml-auto text-[9px] font-bold text-slate-400 italic">{t("click_date_view")}</span>
      </div>

      <style>{`
        @keyframes popupReveal {
          from { opacity: 0; transform: translateX(-50%) scale(0.95); }
          to   { opacity: 1; transform: translateX(-50%) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default DashboardCalendar;
