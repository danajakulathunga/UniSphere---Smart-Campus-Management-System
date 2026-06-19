import React, { useEffect, useMemo, useState } from "react";
import { TrendingUp, ArrowUpRight } from "lucide-react";

const StatCard = ({
  title,
  value,
  subtext,
  icon: Icon,
  tone,
  loading = false,
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  const numericValue = useMemo(() => {
    if (typeof value === "number") return value;
    const parsed = Number(String(value).replace(/[^0-9.-]/g, ""));
    return Number.isNaN(parsed) ? 0 : parsed;
  }, [value]);

  useEffect(() => {
    if (loading) return;

    let frameId;
    const duration = 1000;
    const startTime = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4); // Quartic ease out
      setDisplayValue(Math.round(numericValue * eased));

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [numericValue, loading]);

  if (loading) {
    return (
      <article className="rounded-2xl border border-slate-200 bg-white/50 p-6 shadow-sm backdrop-blur-sm animate-pulse">
        <div className="mb-4 h-12 w-12 rounded-2xl bg-slate-200" />
        <div className="mb-2 h-4 w-24 rounded bg-slate-200" />
        <div className="mb-2 h-10 w-20 rounded bg-slate-300" />
        <div className="h-3 w-28 rounded bg-slate-200" />
      </article>
    );
  }

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-900/10 dark:border-white/5 dark:bg-slate-900/50 dark:hover:bg-slate-900">
      {/* Decorative Gradient Background */}
      <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-10 transition-transform duration-700 group-hover:scale-150 ${tone}`}></div>
      
      <div className="relative z-10">
        <div
          className={`mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 ${tone}`}
        >
          <Icon className="h-6 w-6" />
        </div>
        
        <div className="flex items-center justify-between mb-1">
          <p className="text-[13px] font-bold text-slate-500 uppercase tracking-widest dark:text-slate-400">
            {title}
          </p>
          <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
        </div>
        
        <p className="text-4xl font-black text-slate-900 tracking-tight dark:text-white">
          {displayValue}
        </p>
        
        <div className="mt-4 flex items-center gap-2">
          <div className="flex items-center justify-center h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-600">
            <TrendingUp className="h-3 w-3" />
          </div>
          <p className="text-xs font-bold text-emerald-600 tracking-tight">
            {subtext}
          </p>
        </div>
      </div>
    </article>
  );
};

export default StatCard;
