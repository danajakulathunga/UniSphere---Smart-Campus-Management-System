import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";
import { getAssetUrl } from "../utils/fileUtils";
import Modal from "./Modal";
import { useTranslation } from "react-i18next";

const ImageViewerModal = ({ isOpen, onClose, images, initialIndex = 0 }) => {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const imageRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      resetZoom();
    }
  }, [isOpen, initialIndex]);

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleNext = useCallback(
    (e) => {
      e?.stopPropagation();
      if (images.length === 0) return;
      setCurrentIndex((prev) => (prev + 1) % images.length);
      resetZoom();
    },
    [images.length, resetZoom],
  );

  const handlePrev = useCallback(
    (e) => {
      e?.stopPropagation();
      if (images.length === 0) return;
      setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
      resetZoom();
    },
    [images.length, resetZoom],
  );

  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    const delta = e.deltaY * -0.01;
    const newZoom = Math.min(Math.max(zoom + delta, 1), 5);
    setZoom(newZoom);
    if (newZoom === 1) setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || zoom <= 1) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDoubleClick = () => {
    if (zoom > 1) {
      resetZoom();
    } else {
      setZoom(2);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleNext, handlePrev]);

  if (!isOpen || !images || images.length === 0) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("evidence_preview", { defaultValue: "Evidence Preview" })}
      subtitle={t("image_of", { current: currentIndex + 1, total: images.length, defaultValue: `Image ${currentIndex + 1} of ${images.length}` })}
      maxWidth="max-w-4xl"
      scrollable={false}
      cornerClose={true}
      footer={
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={resetZoom}
              className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 transition hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10"
              title={t("reset_view", { defaultValue: "Reset View" })}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t("reset", { defaultValue: "Reset" })}
            </button>
            {zoom > 1 && (
              <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
                Zoom: {Math.round(zoom * 100)}%
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto max-w-[50%] scrollbar-hide">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => {
                  setCurrentIndex(i);
                  resetZoom();
                }}
                className={`h-10 w-10 shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                  i === currentIndex
                    ? "border-blue-500 scale-110 shadow-lg"
                    : "border-transparent opacity-50 hover:opacity-100"
                }`}
              >
                <img
                  src={getAssetUrl(img)}
                  alt="Thumb"
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      }
    >
      <div
        ref={containerRef}
        className="relative aspect-video w-full flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-800/30 rounded-2xl"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="relative flex items-center justify-center transition-transform duration-300 ease-out select-none cursor-move"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
          }}
          onDoubleClick={handleDoubleClick}
        >
          <img
            ref={imageRef}
            src={getAssetUrl(images[currentIndex])}
            alt={`Preview ${currentIndex + 1}`}
            className="max-w-full max-h-[60vh] rounded-lg shadow-xl pointer-events-none transition-all duration-500"
            loading="lazy"
          />
        </div>

        {/* Navigation Arrows inside the image area */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-2xl bg-white/80 dark:bg-slate-900/80 text-slate-900 dark:text-white flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-xl backdrop-blur-md group border border-slate-200 dark:border-white/10"
            >
              <ChevronLeft className="h-6 w-6 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-2xl bg-white/80 dark:bg-slate-900/80 text-slate-900 dark:text-white flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-xl backdrop-blur-md group border border-slate-200 dark:border-white/10"
            >
              <ChevronRight className="h-6 w-6 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </>
        )}
      </div>
    </Modal>
  );
};

export default ImageViewerModal;
