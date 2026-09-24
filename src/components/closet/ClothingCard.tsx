"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { StatusPill } from "@/components/ui/Controls";
import { ItemImage } from "@/components/ui/ItemImage";
import { LocationIcon } from "@/components/ui/LocationIcon";
import { useCloset } from "@/lib/store";
import type { ClothingItem } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The clothing card: a big picture, the name, where it is, and whether it is
 * ready to wear. Those last two are the questions people actually open the app
 * to answer, so they are on the card rather than one tap away.
 */
export function ClothingCard({
  item,
  className,
  onClick,
}: {
  item: ClothingItem;
  className?: string;
  onClick?: () => void;
}) {
  const { data } = useCloset();
  const location = data.locations.find((entry) => entry.id === item.locationId);

  const body = (
    <>
      <div className="relative aspect-square overflow-hidden rounded-[18px] bg-sunken">
        <div className="absolute inset-0 p-3">
          <ItemImage item={item} className="transition-transform duration-300 ease-[var(--ease-out-soft)] group-hover:scale-[1.035]" />
        </div>
        {item.favorite ? (
          <span className="absolute top-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 backdrop-blur-sm">
            <Heart size={15} strokeWidth={2.4} className="fill-ink text-ink" />
          </span>
        ) : null}
      </div>

      <div className="px-1 pt-3 pb-1">
        <p className="truncate text-[16px] font-medium tracking-[-0.01em]">{item.name}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="flex min-w-0 items-center gap-1.5 text-[14px] text-ink-soft">
            <LocationIcon icon={location?.icon} size={15} className="shrink-0 text-ink-mute" />
            <span className="truncate">{location?.name ?? "Unknown"}</span>
          </span>
          {item.status === "Clean" ? (
            <span className="ml-auto shrink-0 text-[14px] text-good">Clean</span>
          ) : (
            <StatusPill status={item.status} size="sm" className="ml-auto shrink-0" />
          )}
        </div>
      </div>
    </>
  );

  const shell = cn(
    "group block rounded-[22px] border border-line bg-surface p-2.5 text-left",
    "transition-[transform,box-shadow,border-color] duration-200 ease-[var(--ease-out-soft)]",
    "hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-soft)]",
    className,
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={shell}>
        {body}
      </button>
    );
  }

  return (
    <Link href={`/closet/${item.id}`} className={shell}>
      {body}
    </Link>
  );
}

/** The grid used by My Closet and every filtered list of clothes. */
export function ClosetGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
      {children}
    </div>
  );
}

/**
 * A wide row with one clear action. Used by Laundry and Packing, where the
 * point is to work down a list rather than browse pictures.
 */
export function ItemRow({
  item,
  detail,
  action,
  problem,
}: {
  item: ClothingItem;
  detail?: ReactNode;
  action?: ReactNode;
  problem?: string;
}) {
  const { data } = useCloset();
  const location = data.locations.find((entry) => entry.id === item.locationId);

  return (
    <div className="flex items-center gap-4 rounded-[20px] border border-line bg-surface p-3 pr-4">
      <Link
        href={`/closet/${item.id}`}
        className="h-[76px] w-[76px] shrink-0 overflow-hidden rounded-[15px] bg-sunken p-2"
      >
        <ItemImage item={item} />
      </Link>

      <div className="min-w-0 flex-1">
        <Link href={`/closet/${item.id}`} className="block truncate text-[16px] font-medium">
          {item.name}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[14px] text-ink-soft">
          <span className="flex items-center gap-1.5">
            <LocationIcon icon={location?.icon} size={14} className="text-ink-mute" />
            {location?.name}
          </span>
          {detail}
        </div>
        {problem ? <p className="mt-1.5 text-[14px] font-medium text-warn">{problem}</p> : null}
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
