"use client";

import type { ComponentProps, ReactNode } from "react";
import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Text entry. Large, labelled above, with room to breathe - and used as
 * sparingly as possible, because the fastest field is the one the app filled
 * in already.
 */

export function TextField({
  label,
  hint,
  className,
  leading,
  ...rest
}: {
  label: string;
  hint?: string;
  leading?: ReactNode;
  className?: string;
} & Omit<ComponentProps<"input">, "className">) {
  const id = useId();
  return (
    <div className={cn("w-full", className)}>
      <label htmlFor={id} className="label-caps mb-1.5 block">
        {label}
      </label>
      <div className="flex min-h-14 items-center gap-2.5 rounded-[18px] border border-line bg-surface px-4 transition-colors focus-within:border-ink">
        {leading}
        <input
          id={id}
          className="w-full min-w-0 bg-transparent py-3 text-[17px] outline-none placeholder:text-ink-mute"
          {...rest}
        />
      </div>
      {hint ? <p className="mt-1.5 text-[13px] text-ink-mute">{hint}</p> : null}
    </div>
  );
}

export function TextArea({
  label,
  hint,
  className,
  ...rest
}: {
  label: string;
  hint?: string;
  className?: string;
} & Omit<ComponentProps<"textarea">, "className">) {
  const id = useId();
  return (
    <div className={cn("w-full", className)}>
      <label htmlFor={id} className="label-caps mb-1.5 block">
        {label}
      </label>
      <textarea
        id={id}
        rows={3}
        className="w-full rounded-[18px] border border-line bg-surface px-4 py-3 text-[17px] outline-none transition-colors focus:border-ink placeholder:text-ink-mute"
        {...rest}
      />
      {hint ? <p className="mt-1.5 text-[13px] text-ink-mute">{hint}</p> : null}
    </div>
  );
}

/** A group of related fields inside a card, with a quiet heading. */
export function FieldGroup({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      {title ? <h3 className="label-caps">{title}</h3> : null}
      {children}
    </section>
  );
}
