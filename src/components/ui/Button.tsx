"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * One button, four intentions. Every size clears a 48px touch target and the
 * primary sizes clear 56px, because the main action on a screen should be the
 * easiest thing on it to hit.
 */

type Variant = "primary" | "secondary" | "quiet" | "danger";
type Size = "lg" | "md" | "sm";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-ink text-white border border-ink hover:bg-[#25262b] active:bg-[#0e0f12] shadow-[0_1px_2px_rgba(20,20,24,0.16)]",
  secondary:
    "bg-surface text-ink border border-line-strong hover:bg-sunken active:bg-[#eceae6]",
  quiet: "bg-transparent text-ink-soft border border-transparent hover:bg-sunken active:bg-[#eceae6]",
  danger: "bg-surface text-alert border border-[#e7cfce] hover:bg-alert-soft active:bg-[#f3e0df]",
};

const SIZES: Record<Size, string> = {
  lg: "min-h-14 px-7 text-[17px] rounded-[18px] gap-2.5",
  md: "min-h-12 px-5 text-[15px] rounded-[15px] gap-2",
  sm: "min-h-10 px-4 text-[14px] rounded-[12px] gap-1.5",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  children: ReactNode;
  className?: string;
}

function classes({ variant = "primary", size = "lg", full, className }: CommonProps) {
  return cn(
    "inline-flex select-none items-center justify-center font-medium",
    "transition-[transform,background-color,border-color] duration-150 ease-out",
    "active:scale-[0.985] disabled:pointer-events-none disabled:opacity-40",
    VARIANTS[variant],
    SIZES[size],
    full && "w-full",
    className,
  );
}

export function Button({
  variant,
  size,
  full,
  icon,
  iconRight,
  children,
  className,
  ...rest
}: CommonProps & Omit<ComponentProps<"button">, "children" | "className">) {
  return (
    <button
      type="button"
      className={classes({ variant, size, full, className, children })}
      {...rest}
    >
      {icon}
      <span>{children}</span>
      {iconRight}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  full,
  icon,
  iconRight,
  children,
  className,
  ...rest
}: CommonProps & Omit<ComponentProps<typeof Link>, "children" | "className">) {
  return (
    <Link className={classes({ variant, size, full, className, children })} {...rest}>
      {icon}
      <span>{children}</span>
      {iconRight}
    </Link>
  );
}

/**
 * An icon-only control. Deliberately rare: it always carries a real label for
 * screen readers, and it is never the way a primary action is offered.
 */
export function IconButton({
  label,
  children,
  className,
  tone = "default",
  ...rest
}: {
  label: string;
  children: ReactNode;
  className?: string;
  tone?: "default" | "onPhoto";
} & Omit<ComponentProps<"button">, "children" | "className">) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-150",
        "active:scale-[0.96]",
        tone === "default"
          ? "text-ink-soft hover:bg-sunken active:bg-[#eceae6]"
          : "bg-black/45 text-white backdrop-blur-sm hover:bg-black/60",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
