"use client";

import { useCallback, useMemo, useState } from "react";
import {
  emptyRequest,
  rankForSlot,
  slotsToItems,
  suggestOutfit,
  type OutfitSuggestion,
  type StyleContext,
  type StyleRequest,
} from "./ai/stylist";
import { useCloset } from "./store";
import type { ClothingItem, ID, OutfitSlot } from "./types";

/**
 * Holds one outfit while a person plays with it.
 *
 * The important behaviour lives here: swapping a piece changes that piece and
 * nothing else. Only Shuffle builds a new outfit from scratch.
 */
export function useOutfitBuilder(request: StyleRequest = emptyRequest()) {
  const { data } = useCloset();
  const [seed, setSeed] = useState(1);
  /** null means "the person removed this piece". */
  const [overrides, setOverrides] = useState<Partial<Record<OutfitSlot, ID | null>>>({});

  const context = useMemo<StyleContext>(
    () => ({ data, weather: data.profile.weather, request }),
    [data, request],
  );

  const base: OutfitSuggestion = useMemo(() => suggestOutfit(context, seed), [context, seed]);

  const slots = useMemo(() => {
    const merged: Partial<Record<OutfitSlot, ClothingItem>> = { ...base.slots };
    for (const [slot, id] of Object.entries(overrides) as [OutfitSlot, ID | null][]) {
      if (id === null) delete merged[slot];
      else {
        const item = data.items.find((entry) => entry.id === id);
        if (item) merged[slot] = item;
      }
    }
    return merged;
  }, [base.slots, overrides, data.items]);

  const items = useMemo(() => slotsToItems(slots), [slots]);

  const alternativesFor = useCallback(
    (slot: OutfitSlot) => {
      const others = items.filter((item) => slots[slot]?.id !== item.id);
      return rankForSlot(slot, context, others, 18);
    },
    [context, items, slots],
  );

  const swap = useCallback((slot: OutfitSlot, item: ClothingItem) => {
    setOverrides((current) => ({ ...current, [slot]: item.id }));
  }, []);

  const remove = useCallback((slot: OutfitSlot) => {
    setOverrides((current) => ({ ...current, [slot]: null }));
  }, []);

  const shuffle = useCallback(() => {
    setOverrides({});
    setSeed((current) => current + 1);
  }, []);

  const reset = useCallback(() => {
    setOverrides({});
    setSeed(1);
  }, []);

  return {
    suggestion: base,
    slots,
    items,
    reasons: base.reasons,
    gaps: base.gaps,
    alternativesFor,
    swap,
    remove,
    shuffle,
    reset,
    context,
  };
}
