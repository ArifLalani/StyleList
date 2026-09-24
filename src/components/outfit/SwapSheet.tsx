"use client";

import { Check } from "lucide-react";
import { ItemImage } from "@/components/ui/ItemImage";
import { Sheet } from "@/components/ui/Sheet";
import { useCloset } from "@/lib/store";
import type { ClothingItem, OutfitSlot } from "@/lib/types";
import { SLOT_LABEL } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Change one thing.
 *
 * The rest of the outfit stays exactly as it is - this sheet only offers other
 * options for the single piece that was tapped, best first.
 */
export function SwapSheet({
  open,
  onClose,
  slot,
  options,
  currentId,
  onPick,
  onRemove,
}: {
  open: boolean;
  onClose: () => void;
  slot: OutfitSlot | null;
  options: ClothingItem[];
  currentId?: string;
  onPick: (item: ClothingItem) => void;
  onRemove?: () => void;
}) {
  const { data } = useCloset();
  const label = slot ? SLOT_LABEL[slot].toLowerCase() : "";

  return (
    <Sheet
      open={open && Boolean(slot)}
      onClose={onClose}
      size="wide"
      title={`Choose a different ${label}`}
      description={
        options.length
          ? "Only clean clothes that are with you right now."
          : `You have no other clean ${label} options here.`
      }
      footer={
        onRemove && slot !== "top" && slot !== "bottom" ? (
          <button
            type="button"
            onClick={() => {
              onRemove();
              onClose();
            }}
            className="flex min-h-12 w-full items-center justify-center rounded-[15px] text-[16px] font-medium text-ink-soft transition-colors hover:bg-sunken"
          >
            Leave the {label} out
          </button>
        ) : undefined
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {options.map((item) => {
          const location = data.locations.find((entry) => entry.id === item.locationId);
          const isCurrent = item.id === currentId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onPick(item);
                onClose();
              }}
              className={cn(
                "rounded-[20px] border p-2.5 text-left transition-all duration-200",
                isCurrent
                  ? "border-ink bg-sunken"
                  : "border-line bg-surface hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-soft)]",
              )}
            >
              <div className="relative aspect-square overflow-hidden rounded-[15px] bg-sunken p-2.5">
                <ItemImage item={item} />
                {isCurrent ? (
                  <span className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-ink text-white">
                    <Check size={15} strokeWidth={3} />
                  </span>
                ) : null}
              </div>
              <p className="mt-2.5 truncate px-0.5 text-[15px] font-medium">{item.name}</p>
              <p className="mt-0.5 truncate px-0.5 text-[13px] text-ink-mute">{location?.name}</p>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
