"use client";

import { Check, ChevronRight } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Sheet } from "./Sheet";

/**
 * Choosing things.
 *
 * There are no small dropdown arrows anywhere in Style List. A choice is a
 * large field you tap anywhere on, which opens a sheet of large rows with a
 * clear tick beside the one that is selected.
 */

export interface SelectOption {
  value: string;
  label: string;
  /** A quiet second line, e.g. "4 items here". */
  hint?: string;
  icon?: ReactNode;
  /** A colour circle instead of an icon, for the colour picker. */
  swatch?: string;
  disabled?: boolean;
}

/* ------------------------------------------------------------------ */
/* The field                                                           */
/* ------------------------------------------------------------------ */

export function FieldShell({
  label,
  children,
  onClick,
  className,
  trailing,
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  trailing?: ReactNode;
}) {
  /* A field that opens something always shows the chevron that says so. */
  const marker =
    trailing ??
    (onClick ? <ChevronRight size={20} className="shrink-0 text-ink-mute" strokeWidth={2.2} /> : null);

  const content = (
    <>
      <span className="label-caps block">{label}</span>
      <span className="mt-1 flex items-center gap-3">
        <span className="min-w-0 flex-1 text-left text-[17px] font-medium text-ink">{children}</span>
        {marker}
      </span>
    </>
  );

  if (!onClick) {
    return (
      <div className={cn("w-full rounded-[18px] border border-line bg-surface px-4 py-3", className)}>
        {content}
      </div>
    );
  }


  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-[18px] border border-line bg-surface px-4 py-3 text-left",
        "min-h-16 transition-colors duration-150 hover:border-line-strong hover:bg-[#fcfbfa] active:bg-sunken",
        className,
      )}
    >
      {content}
    </button>
  );
}

export interface SelectorProps {
  label: string;
  value?: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  sheetTitle?: string;
  sheetDescription?: string;
  /** An extra row at the bottom of the sheet, e.g. "Add a location". */
  extraAction?: { label: string; onClick: () => void };
  placeholder?: string;
  className?: string;
}

export function Selector({
  label,
  value,
  options,
  onChange,
  sheetTitle,
  sheetDescription,
  extraAction,
  placeholder = "Choose",
  className,
}: SelectorProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <>
      <FieldShell
        label={label}
        onClick={() => setOpen(true)}
        className={className}
        trailing={<ChevronRight size={20} className="shrink-0 text-ink-mute" strokeWidth={2.2} />}
      >
        <span className="flex items-center gap-2.5">
          {selected?.swatch ? (
            <span
              className="h-5 w-5 shrink-0 rounded-full border border-line-strong"
              style={{ background: selected.swatch }}
            />
          ) : (
            selected?.icon
          )}
          <span className={cn("truncate", !selected && "text-ink-mute")}>
            {selected?.label ?? placeholder}
          </span>
        </span>
      </FieldShell>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={sheetTitle ?? label}
        description={sheetDescription}
      >
        <OptionList
          options={options}
          selected={value ? [value] : []}
          onSelect={(next) => {
            onChange(next);
            setOpen(false);
          }}
        />
        {extraAction ? (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              extraAction.onClick();
            }}
            className="mt-2 flex min-h-14 w-full items-center gap-3 rounded-[16px] border border-dashed border-line-strong px-4 text-[17px] font-medium text-accent transition-colors hover:bg-accent-soft"
          >
            {extraAction.label}
          </button>
        ) : null}
      </Sheet>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* The list of rows inside a sheet                                     */
/* ------------------------------------------------------------------ */

export function OptionList({
  options,
  selected,
  onSelect,
}: {
  options: SelectOption[];
  selected: string[];
  onSelect: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {options.map((option) => {
        const isSelected = selected.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            disabled={option.disabled}
            onClick={() => onSelect(option.value)}
            className={cn(
              "flex min-h-14 w-full items-center gap-3.5 rounded-[16px] px-4 py-2.5 text-left transition-colors duration-150",
              isSelected ? "bg-accent-soft" : "hover:bg-sunken active:bg-[#eceae6]",
              option.disabled && "pointer-events-none opacity-40",
            )}
          >
            {option.swatch ? (
              <span
                className="h-7 w-7 shrink-0 rounded-full border border-line-strong"
                style={{ background: option.swatch }}
              />
            ) : option.icon ? (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center text-ink-soft">
                {option.icon}
              </span>
            ) : null}

            <span className="min-w-0 flex-1">
              <span className="block truncate text-[17px] font-medium">{option.label}</span>
              {option.hint ? (
                <span className="mt-0.5 block truncate text-[14px] text-ink-mute">{option.hint}</span>
              ) : null}
            </span>

            {isSelected ? (
              <Check size={22} strokeWidth={2.6} className="shrink-0 text-accent" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Big visual choices - used for Category on the confirm screen         */
/* ------------------------------------------------------------------ */

export interface ChoiceOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

export function ChoiceGrid({
  options,
  value,
  onChange,
  columns = 3,
}: {
  options: ChoiceOption[];
  value?: string;
  onChange: (value: string) => void;
  columns?: 2 | 3 | 4;
}) {
  return (
    <div
      className={cn(
        "grid gap-2.5",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-3",
        columns === 4 && "grid-cols-2 sm:grid-cols-4",
      )}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "flex min-h-[86px] flex-col items-center justify-center gap-2 rounded-[18px] border px-2 py-3 text-center transition-all duration-150",
              "active:scale-[0.98]",
              isSelected
                ? "border-ink bg-ink text-white shadow-[0_2px_10px_rgba(20,20,24,0.16)]"
                : "border-line bg-surface text-ink hover:border-line-strong hover:bg-[#fcfbfa]",
            )}
          >
            {option.icon ? (
              <span className={cn("h-9 w-9", isSelected ? "opacity-95" : "opacity-80")}>
                {option.icon}
              </span>
            ) : null}
            <span className="text-[14px] font-medium leading-tight">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
