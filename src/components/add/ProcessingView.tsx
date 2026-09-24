"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/Controls";
import { cn } from "@/lib/utils";

/**
 * While the photos are being cleaned up.
 *
 * Plain sentences, no model names, no percentages. The person sees the item
 * taking shape and reads three short lines about what is happening to it.
 */

export interface ProcessStep {
  label: string;
  state: "done" | "active" | "pending";
}

export function ProcessingView({ steps }: { steps: ProcessStep[] }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 pb-16 text-center">
      <div className="relative h-56 w-56 overflow-hidden rounded-[28px] bg-sunken sm:h-64 sm:w-64">
        <div className="shimmer absolute inset-0" />
        <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full p-9 opacity-25">
          <path
            d="M76,48 L50,58 C42,62 37,69 35,78 L25,138 C24,145 27,150 33,152 L49,157 C55,159 60,156 61,150 L66,122 L66,172 C88,179 112,179 134,172 L134,122 L139,150 C140,156 145,159 151,157 L167,152 C173,150 176,145 175,138 L165,78 C163,69 158,62 150,58 L124,48 C116,62 84,62 76,48 Z"
            fill="none"
            stroke="#17181b"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h1 className="mt-9 text-[26px] leading-tight font-semibold tracking-[-0.025em] sm:text-[30px]">
        Getting your item ready&#8230;
      </h1>

      <ul className="mt-7 flex w-full max-w-xs flex-col gap-3.5 text-left">
        {steps.map((step) => (
          <li key={step.label} className="flex items-center gap-3">
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors duration-300",
                step.state === "done" && "bg-ink text-white",
                step.state === "active" && "border-2 border-ink",
                step.state === "pending" && "border-2 border-line-strong",
              )}
            >
              {step.state === "done" ? <Check size={15} strokeWidth={3} /> : null}
              {step.state === "active" ? (
                <span className="h-2 w-2 animate-pulse rounded-full bg-ink" />
              ) : null}
            </span>
            <span
              className={cn(
                "text-[16px] transition-colors duration-300",
                step.state === "pending" ? "text-ink-mute" : "font-medium text-ink",
              )}
            >
              {step.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Before / after                                                      */
/* ------------------------------------------------------------------ */

export type ReviewView = "front" | "back" | "original";

export function ReviewPhotos({
  view,
  onViewChange,
  frontUrl,
  backUrl,
  originalUrl,
  hasBack,
  note,
  onConfirm,
  onRetake,
}: {
  view: ReviewView;
  onViewChange: (view: ReviewView) => void;
  frontUrl?: string;
  backUrl?: string;
  originalUrl?: string;
  hasBack: boolean;
  /** Set when the original photo was kept, with the honest reason. */
  note?: string;
  onConfirm: () => void;
  onRetake: () => void;
}) {
  const url = view === "front" ? frontUrl : view === "back" ? backUrl : originalUrl;

  const options: { value: ReviewView; label: string }[] = [
    { value: "front", label: "Front" },
    ...(hasBack ? [{ value: "back" as ReviewView, label: "Back" }] : []),
    { value: "original", label: "Original" },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-5 pt-2 sm:px-8">
        <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.03em] sm:text-[34px]">
          Here&#39;s your item
        </h1>
        {note ? (
          <p className="mt-2 max-w-md text-[15px] leading-snug text-warn">{note}</p>
        ) : (
          <p className="mt-2 max-w-md text-[16px] leading-snug text-ink-soft">
            Cleaned up and centred, ready for your closet.
          </p>
        )}
      </div>

      <div className="mt-5 flex min-h-0 flex-1 flex-col px-5 sm:px-8">
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col">
          <div className="min-h-[240px] flex-1 overflow-hidden rounded-[26px] bg-sunken p-5">
            {url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={view}
                src={url}
                alt="Your item"
                className="h-full w-full animate-[settle_0.55s_var(--ease-out-soft)_both] object-contain"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[15px] text-ink-mute">
                No photo for this view
              </div>
            )}
          </div>
          <div className="mt-3">
            <SegmentedControl options={options} value={view} onChange={onViewChange} />
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 px-5 pb-6 pb-safe sm:px-8">
        <Button size="lg" full onClick={onConfirm}>
          Looks Good
        </Button>
        <Button variant="quiet" size="md" full onClick={onRetake}>
          Retake Photo
        </Button>
      </div>
    </div>
  );
}
