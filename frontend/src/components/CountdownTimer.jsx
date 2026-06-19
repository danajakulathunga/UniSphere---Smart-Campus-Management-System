import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const CountdownTimer = ({ dateStr, timeStr }) => {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState('');
  const [isStartingSoon, setIsStartingSoon] = useState(false);
  const [isPast, setIsPast] = useState(false);

  useEffect(() => {
    // Expected format: dateStr = [YYYY, MM, DD] or "YYYY-MM-DD"
    // timeStr = "HH:MM" or "HH:MM:SS" or [HH, MM]
    
    let targetDateObj = new Date();
    
    try {
      let y, m, d, h, min, s = 0;
      
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
      
      // Months are 0-indexed in JS Date
      targetDateObj = new Date(y, m - 1, d, h, min, s);
    } catch (e) {
      console.error("Error parsing date/time for countdown", e);
      setTimeLeft("Invalid Date");
      return;
    }

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = targetDateObj.getTime();
      const difference = target - now;

      if (difference <= 0) {
        setIsPast(true);
        setIsStartingSoon(false);
        setTimeLeft("00 : 00 : 00");
        return;
      }

      // Less than 1 hour (3600000 ms) = Starting Soon
      if (difference <= 3600000) {
        setIsStartingSoon(true);
      } else {
        setIsStartingSoon(false);
      }

      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      const format = (val) => String(val).padStart(2, '0');
      setTimeLeft(`${format(hours)} : ${format(minutes)} : ${format(seconds)}`);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [dateStr, timeStr]);

  if (isPast) {
    return (
      <span className="text-[10px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-md bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
        Started
      </span>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className={`text-sm font-semibold uppercase tracking-wider px-3 py-1 rounded-lg ${isStartingSoon ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'} flex items-center gap-2`}>
        <Clock className="h-4 w-4" />
        {timeLeft}
      </span>
      {isStartingSoon && (
        <span className="text-xs font-black text-red-600 dark:text-red-400 uppercase tracking-widest animate-pulse">
          {t("starting_soon", { defaultValue: "Starting Soon" })}
        </span>
      )}
    </div>
  );
};

export default CountdownTimer;
