import React, { useEffect } from "react";
import { CheckCircle2, XCircle, AlertCircle, Trash2, Edit3, Info } from "lucide-react";
import { useAlert } from "../context/AlertContext";
import { useTranslation } from "react-i18next";

const Alert = () => {
  const { t } = useTranslation();
  const { alert, hideAlert } = useAlert();
  const { visible, type, message } = alert;

  useEffect(() => {
    if (visible) {
      // Prevent scrolling
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [visible]);

  if (!visible) return null;

  const styles = {
    success: {
      bg: "bg-white dark:bg-slate-900",
      border: "border-slate-100 dark:border-slate-800",
      titleColor: "text-emerald-600 dark:text-emerald-400",
      textColor: "text-slate-600 dark:text-slate-400",
      iconContainerBg: "bg-emerald-100 dark:bg-emerald-500/20",
      iconComponent: CheckCircle2,
      iconClass: "w-8 h-8 text-emerald-600 dark:text-emerald-400 shrink-0",
      title: "Success",
      buttonBg: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20",
    },
    error: {
      bg: "bg-white dark:bg-slate-900",
      border: "border-slate-100 dark:border-slate-800",
      titleColor: "text-rose-600 dark:text-rose-400",
      textColor: "text-slate-600 dark:text-slate-400",
      iconContainerBg: "bg-rose-100 dark:bg-rose-500/20",
      iconComponent: XCircle,
      iconClass: "w-8 h-8 text-rose-600 dark:text-rose-400 shrink-0",
      title: "Error",
      buttonBg: "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20",
    },
    delete: {
      bg: "bg-white dark:bg-slate-900",
      border: "border-slate-100 dark:border-slate-800",
      titleColor: "text-rose-600 dark:text-rose-400",
      textColor: "text-slate-600 dark:text-slate-400",
      iconContainerBg: "bg-rose-100 dark:bg-rose-500/20",
      iconComponent: Trash2,
      iconClass: "w-8 h-8 text-rose-600 dark:text-rose-400 shrink-0",
      title: "Deleted",
      buttonBg: "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20",
    },
    edit: {
      bg: "bg-white dark:bg-slate-900",
      border: "border-slate-100 dark:border-slate-800",
      titleColor: "text-blue-600 dark:text-blue-400",
      textColor: "text-slate-600 dark:text-slate-400",
      iconContainerBg: "bg-blue-100 dark:bg-blue-500/20",
      iconComponent: Edit3,
      iconClass: "w-8 h-8 text-blue-600 dark:text-blue-400 shrink-0",
      title: "Updated",
      buttonBg: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20",
    },
    warning: {
      bg: "bg-white dark:bg-slate-900",
      border: "border-slate-100 dark:border-slate-800",
      titleColor: "text-amber-600 dark:text-amber-400",
      textColor: "text-slate-600 dark:text-slate-400",
      iconContainerBg: "bg-amber-100 dark:bg-amber-500/20",
      iconComponent: AlertCircle,
      iconClass: "w-8 h-8 text-amber-600 dark:text-amber-400 shrink-0",
      title: "Warning",
      buttonBg: "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20",
    },
    info: {
      bg: "bg-white dark:bg-slate-900",
      border: "border-slate-100 dark:border-slate-800",
      titleColor: "text-indigo-600 dark:text-indigo-400",
      textColor: "text-slate-600 dark:text-slate-400",
      iconContainerBg: "bg-indigo-100 dark:bg-indigo-500/20",
      iconComponent: Info,
      iconClass: "w-8 h-8 text-indigo-600 dark:text-indigo-400 shrink-0",
      title: "Information",
      buttonBg: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20",
    }
  };

  let effectiveType = type;
  if (message) {
    const lowerMsg = message.toLowerCase();
    if (lowerMsg.includes("delete") || lowerMsg.includes("cancel") || lowerMsg.includes("remove")) {
      effectiveType = "delete";
    } else if (lowerMsg.includes("update") || lowerMsg.includes("edit")) {
      effectiveType = "edit";
    }
  }

  const currentStyle = styles[effectiveType] || styles.success;
  const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register' || window.location.pathname === '/';

  const getStyle = (className) => {
    if (!className) return "";
    if (isAuthPage) {
      const classes = className.split(' ');
      const darkClasses = classes.filter(c => c.startsWith('dark:'));
      
      if (darkClasses.length === 0) {
        return className;
      }
      
      const darkBaseClasses = darkClasses.map(c => c.substring(5)); // Remove 'dark:'
      
      const getPrefixType = (cls) => {
        if (cls.startsWith('bg-')) return 'bg';
        if (cls.startsWith('text-')) return 'text';
        if (cls.startsWith('border-')) return 'border';
        return null;
      };
      
      const activeDarkTypes = new Set(darkBaseClasses.map(getPrefixType).filter(Boolean));
      const result = [];
      
      classes.forEach(c => {
        if (c.startsWith('dark:')) {
          result.push(c.substring(5));
        } else {
          const type = getPrefixType(c);
          if (!type || !activeDarkTypes.has(type)) {
            result.push(c);
          }
        }
      });
      
      return result.join(' ');
    }
    return className;
  };

  const IconComp = currentStyle.iconComponent;

  return (
    <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity duration-300"
        onClick={hideAlert}
      />
      
      {/* Alert Box */}
      <div 
        className={`relative w-full max-w-sm overflow-hidden rounded-2xl border ${getStyle(currentStyle.border)} ${getStyle(currentStyle.bg)} shadow-2xl animate-in fade-in zoom-in duration-300`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 sm:p-10">
          <div className="flex flex-col items-center text-center">
            {/* Icon Container */}
            <div className={`mb-6 flex items-center justify-center h-20 w-20 rounded-full ${getStyle(currentStyle.iconContainerBg)} shadow-sm ${getStyle("border border-slate-100 dark:border-white/10")}`}>
              <IconComp className={getStyle(currentStyle.iconClass)} />
            </div>
            
            {/* Text Content */}
            <div className="w-full">
              <h3 className={`text-2xl font-black tracking-tight mb-3 ${getStyle(currentStyle.titleColor)}`}>
                {t(currentStyle.title.toLowerCase(), { defaultValue: currentStyle.title })}
              </h3>
              <p className={`text-[15px] font-bold leading-relaxed ${getStyle(currentStyle.textColor)}`}>
                {message}
              </p>
            </div>

            {/* Action Button */}
            <button
              onClick={hideAlert}
              className={`mt-8 w-full py-4 px-6 rounded-xl text-sm font-bold tracking-wide transition-all shadow-lg active:scale-95 ${getStyle(currentStyle.buttonBg)}`}
            >
              {t("continue", { defaultValue: "Continue" })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Alert;
