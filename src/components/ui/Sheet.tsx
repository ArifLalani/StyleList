"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * The selection sheet.
 *
 * Slides up from the bottom of a phone and lands as a centred panel on a
 * desktop. It is the only overlay pattern in Style List, so wherever a choice
 * appears - a location, a category, a filter - it appears the same way.
 */

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** A sentence under the title when the choice needs a word of explanation. */
  description?: string;
  children: ReactNode;
  /** Sticky action row at the bottom, e.g. "Show 12 items". */
  footer?: ReactNode;
  size?: "default" | "wide";
}

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "default",
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 animate-[fade-in_0.2s_ease-out_both] bg-ink/25 backdrop-blur-[2px]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "relative flex max-h-[88vh] w-full flex-col bg-surface shadow-[var(--shadow-sheet)] outline-none",
          "animate-[sheet-up_0.34s_var(--ease-out-soft)_both]",
          "rounded-t-[28px] sm:rounded-[26px]",
          size === "wide" ? "sm:max-w-3xl" : "sm:max-w-lg",
          "sm:mx-6 sm:max-h-[84vh]",
        )}
      >
        <div className="flex items-start gap-3 px-5 pt-5 sm:px-7 sm:pt-6">
          <div className="min-w-0 flex-1">
            <h2 className="text-[21px] font-semibold tracking-[-0.02em]">{title}</h2>
            {description ? (
              <p className="mt-1 text-[15px] leading-snug text-ink-soft">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-sunken"
          >
            <X size={22} strokeWidth={2} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-4 pb-5 sm:px-7">
          {children}
        </div>

        {footer ? (
          <div className="border-t border-line bg-surface px-5 pt-4 pb-5 pb-safe sm:px-7 sm:rounded-b-[26px]">
            {footer}
          </div>
        ) : (
          <div className="pb-safe sm:hidden" />
        )}
      </div>
    </div>,
    document.body,
  );
}
