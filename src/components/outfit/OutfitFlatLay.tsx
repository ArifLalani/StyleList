"use client";

import { Repeat } from "lucide-react";
import Link from "next/link";
import { ItemImage } from "@/components/ui/ItemImage";
import type { ClothingItem, OutfitSlot } from "@/lib/types";
import { SLOT_LABEL } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * An outfit, laid out flat.
 *
 * Each piece is a big picture with its slot named above it, so "change the
 * shoes" is a single obvious tap on the shoes rather than a menu somewhere.
 */

const ORDER: OutfitSlot[] = ["layer", "top", "bottom", "shoes", "accessory"];

export function OutfitFlatLay({
  slots,
  onSlotTap,
  className,
  compact,
}: {
  slots: Partial<Record<OutfitSlot, ClothingItem>>;
  /** When given, every piece becomes a "change this one" button. */
  onSlotTap?: (slot: OutfitSlot) => void;
  className?: string;
  compact?: boolean;
}) {
  const filled = ORDER.filter((slot) => slots[slot]);

  return (
    <div
      className={cn(
        "grid gap-3",
        compact ? "grid-cols-4" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
        className,
      )}
    >
      {filled.map((slot) => {
        const item = slots[slot];
        if (!item) return null;
        const inner = (
          <>
            <div className="relative aspect-square overflow-hidden rounded-[18px] bg-sunken p-3">
              <ItemImage item={item} />
              {onSlotTap ? (
                <span className="absolute right-2 bottom-2 flex h-9 w-9 items-center justify-center rounded-full bg-surface/95 text-ink shadow-[0_2px_8px_rgba(20,20,24,0.12)] transition-transform duration-200 group-hover:scale-105">
                  <Repeat size={16} strokeWidth={2.2} />
                </span>
              ) : null}
            </div>
            {!compact ? (
              <div className="px-1 pt-2.5">
                <p className="label-caps">{SLOT_LABEL[slot]}</p>
                <p className="mt-1 truncate text-[15px] font-medium">{item.name}</p>
              </div>
            ) : null}
          </>
        );

        if (onSlotTap) {
          return (
            <button
              key={slot}
              type="button"
              onClick={() => onSlotTap(slot)}
              className="group rounded-[20px] text-left transition-transform duration-200 ease-[var(--ease-out-soft)] active:scale-[0.99]"
            >
              {inner}
            </button>
          );
        }

        return (
          <Link
            key={slot}
            href={`/closet/${item.id}`}
            className="group rounded-[20px] text-left transition-transform duration-200 ease-[var(--ease-out-soft)]"
          >
            {inner}
          </Link>
        );
      })}
    </div>
  );
}

/** The small stacked preview used in lists of saved outfits. */
export function OutfitThumbnails({
  items,
  className,
}: {
  items: ClothingItem[];
  className?: string;
}) {
  return (
    <div className={cn("flex gap-2", className)}>
      {items.slice(0, 4).map((item) => (
        <div key={item.id} className="aspect-square flex-1 overflow-hidden rounded-[14px] bg-sunken p-1.5">
          <ItemImage item={item} />
        </div>
      ))}
    </div>
  );
}
