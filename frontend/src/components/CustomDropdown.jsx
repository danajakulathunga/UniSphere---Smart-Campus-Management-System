import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";

const CustomDropdown = ({
  options,
  value,
  onChange,
  placeholder = "Select Option",
  label,
  className = "",
  icon: Icon,
  pushContent = false,
  padding = "px-4 py-2",
  fontSize = "text-[13px]",
  disabled = false,
  transparent = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative w-full ${isOpen ? "z-[110]" : "z-10"} ${className}`} ref={dropdownRef}>
      {label && (
        <label className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">
          {label}
        </label>
      )}
      
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between rounded-xl transition-all duration-300 ${
          transparent ? "border-none bg-transparent" : "border-2"
        } ${padding} ${fontSize} font-bold ${
          disabled
            ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-white/5 dark:bg-slate-800/50"
            : isOpen
              ? `${transparent ? "bg-transparent" : "border-blue-500 bg-white dark:bg-slate-900 ring-4 ring-blue-500/10 shadow-lg"}`
              : `${transparent ? "bg-transparent" : "border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-white dark:border-white/5 dark:bg-slate-900/50 dark:hover:bg-slate-900"}`
        } ${selectedOption && !disabled ? "text-slate-900 dark:text-white" : ""}`}
      >
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          {Icon && <Icon className={`h-3.5 w-3.5 shrink-0 ${disabled ? "text-slate-300 dark:text-slate-600" : isOpen ? "text-blue-500" : "text-slate-400"}`} />}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        </div>
        {!disabled && <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180 text-blue-500" : "text-slate-400"}`} />}
      </button>

      <div 
        className={`${pushContent ? "relative mt-2" : "absolute top-[calc(100%+8px)]"} z-[100] w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl transition-all duration-200 origin-top ${
          isOpen 
            ? "opacity-100 scale-100 translate-y-0 h-auto" 
            : "opacity-0 scale-95 -translate-y-2 pointer-events-none h-0 border-none"
        } dark:border-white/10 dark:bg-slate-900`}
      >
        <div className="max-h-60 overflow-y-auto p-2 auth-scroll-user">
          {options.map((option, idx) => (
            <button
              key={`${option.value}-${idx}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-200 ${
                value === option.value
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                  : "text-slate-600 hover:bg-slate-50 hover:translate-x-1 dark:text-slate-300 dark:hover:bg-white/5"
              }`}
            >
              <span className="mr-4 text-left text-[13px] leading-tight py-1">{option.label}</span>
              
              <div className="flex items-center gap-3 shrink-0">
                {option.count !== undefined && (
                  <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-black min-w-[20px] ${
                    value === option.value 
                      ? "bg-white/20 text-white" 
                      : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400"
                  }`}>
                    {option.count}
                  </span>
                )}
              </div>
            </button>
          ))}
          {options.length === 0 && (
            <div className="px-4 py-3 text-xs font-bold text-slate-400 text-center uppercase tracking-widest">
              No options available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomDropdown;
