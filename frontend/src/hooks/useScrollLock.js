import { useEffect } from 'react';

/**
 * A reusable hook to lock the background page scrolling when a modal/popup is open.
 * @param {boolean} isOpen - Whether the modal is currently open.
 */
export const useScrollLock = (isOpen) => {
  useEffect(() => {
    if (!isOpen) return;

    // 1. Calculate scrollbar width to prevent layout "jump"
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    
    // 2. Save original styles
    const originalOverflowBody = document.body.style.overflow;
    const originalPaddingBody = document.body.style.paddingRight;
    const originalOverflowHtml = document.documentElement.style.overflow;

    // 3. Apply lock
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${scrollBarWidth}px`;
    document.documentElement.style.overflow = "hidden";
    
    // Cleanup function: Restore original styles when modal closes or unmounts
    return () => {
      document.body.style.overflow = originalOverflowBody;
      document.body.style.paddingRight = originalPaddingBody;
      document.documentElement.style.overflow = originalOverflowHtml;
    };
  }, [isOpen]);
};
