"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import type { Status } from "@/lib/types";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Segmented control - Front / Back, and anywhere else with 2-3 views   */
/* ------------------------------------------------------------------ */

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  size?: "md" | "sm";
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex w-full items-stretch gap-1 rounded-[15px] border border-line bg-sunken p-1",
        className,
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex-1 rounded-[11px] font-medium transition-all duration-200 ease-[var(--ease-out-soft)]",
              size === "md" ? "min-h-11 px-4 text-[15px]" : "min-h-9 px-3 text-[14px]",
              isActive
                ? "bg-surface text-ink shadow-[0_1px_3px_rgba(20,20,24,0.10)]"
                : "text-ink-soft hover:text-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Chips - category rail and active filters                            */
/* ------------------------------------------------------------------ */

export function Chip({
  children,
  active,
  onClick,
  onRemove,
  icon,
  className,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full border text-[15px] font-medium transition-colors duration-150",
        active
          ? "border-ink bg-ink text-white"
          : "border-line bg-surface text-ink hover:border-line-strong hover:bg-[#fcfbfa]",
        className,
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex min-h-11 items-center gap-2 rounded-full px-4",
          onRemove && "pr-1.5",
        )}
      >
        {icon}
        {children}
      </button>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove filter"
          className={cn(
            "mr-1.5 -ml-1 flex h-7 w-7 items-center justify-center rounded-full",
            active ? "hover:bg-white/20" : "hover:bg-sunken",
          )}
        >
          <X size={15} strokeWidth={2.6} />
        </button>
      ) : null}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Status                                                              */
/* ------------------------------------------------------------------ */

const STATUS_TONE: Record<Status, string> = {
  Clean: "bg-good-soft text-good",
  "Needs Washing": "bg-warn-soft text-warn",
  "Dry Cleaning": "bg-warn-soft text-warn",
  Stained: "bg-alert-soft text-alert",
  "Needs Repair": "bg-alert-soft text-alert",
  Packed: "bg-accent-soft text-accent",
  Unavailable: "bg-sunken text-ink-soft",
  Missing: "bg-sunken text-ink-soft",
};

export function StatusPill({
  status,
  size = "md",
  className,
}: {
  status: Status;
  size?: "md" | "sm";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        size === "md" ? "px-2.5 py-1 text-[13px]" : "px-2 py-0.5 text-[12px]",
        STATUS_TONE[status],
        className,
      )}
    >
      {status}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Progress through a multi-step flow                                  */
/* ------------------------------------------------------------------ */

export function StepProgress({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[14px] font-medium text-ink-soft">
        {step} of {total}
      </span>
      <span className="flex items-center gap-1.5" aria-hidden="true">
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300 ease-[var(--ease-out-soft)]",
              index < step ? "w-6 bg-ink" : "w-3 bg-line-strong",
            )}
          />
        ))}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Switch                                                              */
/* ------------------------------------------------------------------ */

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-14 w-full items-center gap-4 rounded-[16px] px-1 text-left transition-colors hover:bg-sunken"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-medium">{label}</span>
        {hint ? <span className="mt-0.5 block text-[14px] text-ink-soft">{hint}</span> : null}
      </span>
      <span
        className={cn(
          "relative h-8 w-[52px] shrink-0 rounded-full transition-colors duration-200",
          checked ? "bg-ink" : "bg-line-strong",
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-all duration-200 ease-[var(--ease-out-soft)]",
            checked ? "left-[23px]" : "left-1",
          )}
        />
      </span>
    </button>
  );
}
