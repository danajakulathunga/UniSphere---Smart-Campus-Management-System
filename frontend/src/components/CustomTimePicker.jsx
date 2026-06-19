import React, { useState, useRef, useEffect } from "react";
import { Clock } from "lucide-react";
import { useTranslation } from "react-i18next";

const CustomTimePicker = ({ value, onChange, label, minTime, maxTime, align = "left" }) => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse initial value (HH:mm)
  const [hour, setHour] = useState("09");
  const [minute, setMinute] = useState("00");
  const [period, setPeriod] = useState("AM");

  useEffect(() => {
    if (value && value.includes(":")) {
      let [h, m] = value.split(":");
      let hNum = parseInt(h);
      let p = hNum >= 12 ? "PM" : "AM";
      let h12 = hNum % 12;
      if (h12 === 0) h12 = 12;
      setHour(h12.toString().padStart(2, "0"));
      setMinute(m.substring(0, 2));
      setPeriod(p);
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

  const handleSelect = (newH, newM, newP) => {
    let h24 = parseInt(newH);
    if (newP === "PM" && h24 < 12) h24 += 12;
    if (newP === "AM" && h24 === 12) h24 = 0;
    
    const timeStr = `${h24.toString().padStart(2, "0")}:${newM}`;
    onChange(timeStr);
  };

  const getLocalizedPeriod = (p) => {
    if (i18n.language === "si") {
      return p === "AM" ? "පෙ.ව." : "ප.ව.";
    }
    if (i18n.language === "ta") {
      return p === "AM" ? "மு.ப." : "பி.ப.";
    }
    return p;
  };

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));

  return (
    <div className="relative" ref={containerRef}>
      <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1 mb-2 block">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 rounded-2xl bg-slate-50 border-2 border-slate-100 px-4 py-3.5 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all dark:bg-slate-800/50 dark:border-white/5 dark:text-white"
      >
        <span className="whitespace-nowrap flex-1 text-left">{value ? (
            `${hour}:${minute} ${getLocalizedPeriod(period)}`
        ) : "--:--"}</span>
        <Clock className="h-4 w-4 text-slate-400 flex-shrink-0 ml-1" />
      </button>

      {isOpen && (
        <div className={`absolute top-full ${align === "right" ? "right-0" : "left-0"} mt-1 z-[100] bg-white rounded-2xl shadow-2xl border border-slate-100 p-1 flex gap-0.5 animate-modal-content dark:bg-slate-900 dark:border-white/10`}>
          {/* Hours */}
          <div className="flex flex-col max-h-40 overflow-y-auto scrollbar-hide py-0.5">
            {hours.map(h => (
              <button
                key={h}
                type="button"
                onClick={() => { setHour(h); handleSelect(h, minute, period); }}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${hour === h ? "bg-blue-600 text-white" : "hover:bg-blue-50 text-slate-600 dark:text-slate-400 dark:hover:bg-white/5"}`}
              >
                {h}
              </button>
            ))}
          </div>
          
          {/* Divider */}
          <div className="w-px bg-slate-100 dark:bg-white/5 my-1.5" />

          {/* Minutes */}
          <div className="flex flex-col max-h-40 overflow-y-auto scrollbar-hide py-0.5">
            {minutes.map(m => (
              <button
                key={m}
                type="button"
                onClick={() => { setMinute(m); handleSelect(hour, m, period); }}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${minute === m ? "bg-blue-600 text-white" : "hover:bg-blue-50 text-slate-600 dark:text-slate-400 dark:hover:bg-white/5"}`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="w-px bg-slate-100 dark:bg-white/5 my-1.5" />

          {/* Period */}
          <div className="flex flex-col py-0.5">
            {["AM", "PM"].map(p => (
              <button
                key={p}
                type="button"
                onClick={() => { setPeriod(p); handleSelect(hour, minute, p); }}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${period === p ? "bg-blue-600 text-white" : "hover:bg-blue-50 text-slate-600 dark:text-slate-400 dark:hover:bg-white/5"}`}
              >
                {getLocalizedPeriod(p)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomTimePicker;
