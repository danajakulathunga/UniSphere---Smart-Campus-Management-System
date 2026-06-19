import React, { useState, useEffect, useRef } from "react";

const AnimatedProgressBar = ({ targetWidth, colorClass, label, title = "", heightClass = "h-1.5" }) => {
  const [animatedWidth, setAnimatedWidth] = useState("0%");
  const containerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              setAnimatedWidth(targetWidth);
            }, 150);
            
            if (containerRef.current) {
              observer.unobserve(containerRef.current);
            }
          }
        });
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
      observer.disconnect();
    };
  }, [targetWidth]);

  return (
    <div className="space-y-2" ref={containerRef}>
      {label && (
        <div className={`flex items-center text-[9px] font-black uppercase tracking-widest text-slate-500 ${title ? 'justify-between' : 'justify-end'}`}>
          {title && <span>{title}</span>}
          <span>{targetWidth}</span>
        </div>
      )}
      <div className={`${heightClass} w-full bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden`}>
        <div
          className={`h-full rounded-full transition-all duration-[1000ms] ease-in-out ${colorClass}`}
          style={{ width: animatedWidth }}
        ></div>
      </div>
    </div>
  );
};

export default AnimatedProgressBar;
