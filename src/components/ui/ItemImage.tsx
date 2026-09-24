"use client";

import { useEffect, useState } from "react";
import { photoUrl } from "@/lib/photoStore";
import { useCloset } from "@/lib/store";
import type { ClothingItem, ImageView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { GarmentArt, shapeForItem } from "./GarmentArt";

/**
 * What an item looks like.
 *
 * A photographed item shows its cleaned-up photo. Anything without a photo
 * shows a drawing built from its category and colours, so the closet always
 * reads as a wardrobe and never as a wall of placeholders.
 */

export function ItemImage({
  item,
  view = "front",
  className,
  settle,
}: {
  item: ClothingItem;
  view?: ImageView;
  className?: string;
  /** Plays the settle-into-place animation, used right after processing. */
  settle?: boolean;
}) {
  const { data } = useCloset();
  const images = data.images.filter((image) => image.itemId === item.id);
  const exact = images.find((image) => image.view === view);
  const fallback = view === "front" ? images[0] : undefined;
  const image = exact ?? fallback;
  const key = image?.processedKey ?? image?.originalKey;

  /* Resolving a photo is asynchronous, so the result is stored with the key it
     belongs to. Anything else is derived, which keeps a stale photo from
     flashing up when the component is handed a different item. */
  const [resolved, setResolved] = useState<{ key: string; url?: string }>();

  useEffect(() => {
    if (!key) return;
    let active = true;
    photoUrl(key).then((url) => {
      if (active) setResolved({ key, url });
    });
    return () => {
      active = false;
    };
  }, [key]);

  const url = resolved && resolved.key === key ? resolved.url : undefined;
  const loading = Boolean(key) && resolved?.key !== key;

  if (key && loading) {
    return <div className={cn("shimmer h-full w-full rounded-[inherit]", className)} />;
  }

  if (key && url) {
    return (
      // A blob URL from the person's own device; next/image would only add a
      // loader in front of something already local.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={item.name}
        className={cn(
          "h-full w-full object-contain",
          settle && "animate-[settle_0.65s_var(--ease-out-soft)_both]",
          className,
        )}
      />
    );
  }

  return (
    <GarmentArt
      shape={shapeForItem(item)}
      primaryColor={item.primaryColor}
      secondaryColor={item.secondaryColor}
      pattern={item.pattern}
      view={view}
      className={cn(settle && "animate-[settle_0.65s_var(--ease-out-soft)_both]", className)}
    />
  );
}

/** Just the drawing - used by the category chooser and empty states. */
export function CategoryArt({
  category,
  color = "Light Grey",
  className,
}: {
  category: ClothingItem["category"];
  color?: string;
  className?: string;
}) {
  return (
    <GarmentArt
      shape={shapeForItem({ category, name: "", subcategory: undefined })}
      primaryColor={color}
      className={className}
    />
  );
}
