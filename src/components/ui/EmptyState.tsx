"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Empty is a good state when it is explained. Every one of these says what is
 * true, why it is fine, and what to do next - in that order.
 */
export function EmptyState({
  title,
  description,
  action,
  art,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  art?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[22px] border border-dashed border-line-strong bg-surface px-6 py-14 text-center",
        className,
      )}
    >
      {art ? <div className="mb-5 h-28 w-28 opacity-70">{art}</div> : null}
      <h2 className="text-[22px] font-semibold tracking-[-0.02em]">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-sm text-[16px] leading-relaxed text-ink-soft">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
