import React, { useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { useScrollLock } from "../hooks/useScrollLock";

const Modal = ({ isOpen, onClose, title, subtitle, children, footer, maxWidth = "max-w-2xl", scrollable = true, cornerClose = true, centerTitle = false, showCloseButton = true }) => {
  // Use the reusable scroll lock hook
  useScrollLock(isOpen);

  // Close on ESC key
  const handleKeyDown = useCallback((event) => {
    if (event.key === "Escape") {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    } else {
      window.removeEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-8 overflow-hidden">
      {/* Backdrop with Blur */}
      <div 
        className="fixed inset-0 bg-slate-950/60 animate-modal-backdrop touch-none backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div 
        className={`relative w-full ${maxWidth} max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] border border-slate-200 animate-modal-content dark:bg-slate-900 dark:border-white/10 overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center ${centerTitle ? 'justify-center' : 'justify-between'} border-b border-slate-100 bg-white/80 p-4 sm:p-5 backdrop-blur-xl dark:border-white/5 dark:bg-slate-900/80 sticky top-0 z-10`}>
          <div className={centerTitle ? 'text-center' : ''}>
            <h3 className="text-lg sm:text-xl font-black tracking-tight">
              {title && (
                <>
                  <span className="text-slate-900 dark:text-white">
                    {title.split(' ')[0]}
                  </span>{" "}
                  <span className="text-indigo-600 dark:text-indigo-400">
                    {title.split(' ').slice(1).join(' ')}
                  </span>
                </>
              )}
            </h3>
            {subtitle && (
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 whitespace-nowrap overflow-hidden">
                {subtitle}
              </p>
            )}
          </div>
          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              className={`group ${cornerClose ? "absolute top-3 right-3 z-[20]" : "relative"} flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600 dark:bg-white/5 dark:hover:bg-rose-500/10 dark:hover:text-rose-500`}
            >
              <X className="h-4 w-4 transition-transform group-hover:rotate-90 group-active:scale-90" />
            </button>
          )}
        </div>

        {/* Content Section */}
        <div className={`flex-1 ${scrollable ? "overflow-y-auto scrollbar-hide" : "overflow-visible"} px-6 sm:px-8 py-2 sm:py-3`}>
          <div className="mx-auto w-full">
            {children}
          </div>
        </div>

        {/* Footer - Sticky at bottom */}
        {footer && (
          <div className="border-t border-slate-100 bg-slate-50/80 px-6 sm:px-8 py-4 sm:py-5 backdrop-blur-xl dark:border-white/5 dark:bg-slate-900/80 sticky bottom-0 z-10">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
