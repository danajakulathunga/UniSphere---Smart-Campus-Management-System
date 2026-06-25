import React, { useState, useEffect } from "react";
import { Clock, MapPin, BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";

// Helper to format/parse target date
const parseTargetDateTime = (dateStr, timeStr) => {
  let y, m, d, h = 0, min = 0, s = 0;
  
  if (Array.isArray(dateStr)) {
    [y, m, d] = dateStr;
  } else if (typeof dateStr === 'string') {
    const parts = dateStr.split('-');
    y = parseInt(parts[0], 10);
    m = parseInt(parts[1], 10);
    d = parseInt(parts[2], 10);
  }
  
  if (Array.isArray(timeStr)) {
    h = timeStr[0];
    min = timeStr[1];
    if (timeStr.length > 2) s = timeStr[2];
  } else if (typeof timeStr === 'string') {
    const parts = timeStr.split(':');
    h = parseInt(parts[0], 10);
    min = parseInt(parts[1], 10);
    if (parts.length > 2) s = parseInt(parts[2], 10);
  }
  
  return new Date(y, m - 1, d, h, min, s);
};

const LectureSessionCard = ({ session, onClick }) => {
  const { t } = useTranslation();
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
  const [timeLeft, setTimeLeft] = useState("");
  const [isPast, setIsPast] = useState(false);
  const [isStartingSoon, setIsStartingSoon] = useState(false);
  const [isUnderOneHour, setIsUnderOneHour] = useState(false);

  useEffect(() => {
    const targetDateObj = parseTargetDateTime(session.bookingDate, session.startTime);
    
    const calculateTime = () => {
      const now = new Date().getTime();
      const target = targetDateObj.getTime();
      const difference = target - now;

      if (difference <= 0) {
        setIsPast(true);
        setIsStartingSoon(false);
        setIsUnderOneHour(false);
        setTimeLeft("00 : 00 : 00");
        return;
      }

      setIsPast(false);
      setIsUnderOneHour(difference <= 3600000);
      setIsStartingSoon(difference <= 1800000);

      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      const format = (val) => String(val).padStart(2, '0');
      setTimeLeft(`${format(hours)} : ${format(minutes)} : ${format(seconds)}`);
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [session.bookingDate, session.startTime]);

  return (
    <div 
      onClick={() => onClick(session)}
      className="group flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border border-slate-200 bg-white dark:border-white/5 dark:bg-slate-900/50 shadow-sm transition-all duration-300 hover:shadow-md cursor-pointer w-full gap-4"
    >
      <div className="flex items-center gap-4">
        {/* Book icon box */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-100 shadow-sm dark:bg-slate-800 dark:border-white/5">
          <BookOpen className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        </div>
        {/* Title and details */}
        <div>
          <h4 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
            {session.resourceName}
          </h4>
          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs font-bold text-slate-500">
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>{session.startTime}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              <span>{getLocalizedLocation(session.campusLocation) || t('campus', { defaultValue: 'Campus' })}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-2 sm:mt-0 flex-wrap sm:flex-nowrap">
        {/* Countdown & Starting Soon */}
        <div className="flex items-center gap-3">
          {!isPast && (
            <>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-black ${
                isUnderOneHour 
                  ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-500/20" 
                  : "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-500/20"
              }`}>
                <Clock className={`h-3.5 w-3.5 ${isUnderOneHour ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`} />
                <span>{timeLeft}</span>
              </div>
              {isStartingSoon && (
                <span className="text-xs font-black text-red-600 dark:text-red-400 uppercase tracking-widest animate-pulse">
                  {t("starting_soon", { defaultValue: "Starting Soon" })}
                </span>
              )}
            </>
          )}
          {isPast && (
            <span className="text-[10px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-md bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
              Started
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default LectureSessionCard;
