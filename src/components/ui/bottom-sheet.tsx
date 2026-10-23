"use client";

import React, { useEffect, ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
}: BottomSheetProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Sheet Container */}
      <div
        className={cn(
          "relative z-10 w-full max-w-lg mx-auto bg-card rounded-t-3xl border-t border-border/80 shadow-2xl flex flex-col max-h-[88dvh] animate-in slide-in-from-bottom duration-300",
          className
        )}
      >
        {/* Handle bar */}
        <div className="w-full flex justify-center pt-3 pb-1 shrink-0" onClick={onClose}>
          <div className="w-12 h-1.5 rounded-full bg-border/80" />
        </div>

        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between px-5 py-3 border-b border-border/40 shrink-0">
            <div>
              {title && <h3 className="text-base sm:text-lg font-semibold text-ink">{title}</h3>}
              {description && <p className="text-xs text-ink-soft mt-0.5">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-ink-soft hover:text-ink hover:bg-lavender transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content with smooth scrolling */}
        <div className="p-5 overflow-y-auto overscroll-contain pb-8 safe-bottom">{children}</div>
      </div>
    </div>
  );
}
