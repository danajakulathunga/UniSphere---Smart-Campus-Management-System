import React, { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";

export default function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      
      // Show button if scrolled down past 300px
      setIsVisible(scrolled > 300);

      // Calculate progress percentage
      if (scrollHeight > 0) {
        setScrollProgress((scrolled / scrollHeight) * 100);
      } else {
        setScrollProgress(0);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Initial check
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // SVG circular progress calculations
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (scrollProgress / 100) * circumference;

  return (
    <button
      onClick={scrollToTop}
      aria-label="Scroll to top"
      className={`fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-white/90 dark:bg-slate-900/90 border border-slate-200/50 dark:border-slate-800/50 text-indigo-600 dark:text-indigo-400 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] hover:shadow-indigo-500/20 dark:hover:shadow-indigo-500/30 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:scale-110 active:scale-95 group focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
        isVisible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      {/* Scroll Progress Ring */}
      <svg className="absolute -rotate-90 w-full h-full p-1" viewBox="0 0 40 40">
        {/* Track circle */}
        <circle
          className="text-slate-100 dark:text-slate-800/40"
          strokeWidth="2.5"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="20"
          cy="20"
        />
        {/* Progress circle */}
        <circle
          className="text-indigo-600 dark:text-indigo-400 transition-all duration-100"
          strokeWidth="2.5"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="20"
          cy="20"
        />
      </svg>

      {/* Up Arrow Icon */}
      <ArrowUp className="h-5 w-5 relative z-10 transition-transform duration-300 group-hover:-translate-y-0.5" />
    </button>
  );
}
