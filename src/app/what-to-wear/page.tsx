"use client";

import { ArrowRight, Bookmark, Check, Sparkles } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/AppShell";
import { OutfitFlatLay } from "@/components/outfit/OutfitFlatLay";
import { SaveOutfitSheet } from "@/components/outfit/OutfitSheets";
import { SwapSheet } from "@/components/outfit/SwapSheet";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Chip, Toggle } from "@/components/ui/Controls";
import { EmptyState } from "@/components/ui/EmptyState";
import { CategoryArt } from "@/components/ui/ItemImage";
import { useToast } from "@/components/ui/Toast";
import {
  emptyRequest,
  parseStyleRequest,
  rankForSlot,
  slotsToItems,
  suggestOutfits,
  type OutfitSuggestion,
  type StyleContext,
  type StyleRequest,
} from "@/lib/ai/stylist";
import { useCloset } from "@/lib/store";
import type { ClothingItem, ID, OutfitSlot } from "@/lib/types";
import { SLOT_OF_CATEGORY } from "@/lib/types";

/**
 * What to Wear.
 *
 * Ask in your own words, get three real outfits back. What Style List
 * understood is shown as plain chips, so a misread is obvious and fixable
 * rather than mysterious.
 */

const PROMPTS = [
  "Something comfortable",
  "All black",
  "Something casual for dinner",
  "I want to wear a hoodie",
  "Build something around my grey sweats",
  "I don't feel like wearing jeans",
];

export default function WhatToWearPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-[22px] bg-sunken" />}>
      <WhatToWear />
    </Suspense>
  );
}

function WhatToWear() {
  const searchParams = useSearchParams();
  const { data, ready } = useCloset();

  const [text, setText] = useState(searchParams.get("q") ?? "");
  const [submitted, setSubmitted] = useState(searchParams.get("q") ?? "");
  const [onlyHere, setOnlyHere] = useState(true);
  const [round, setRound] = useState(0);

  const request: StyleRequest = useMemo(() => {
    const parsed = submitted.trim() ? parseStyleRequest(submitted, data) : emptyRequest();
    return { ...parsed, onlyHere: parsed.onlyHere && onlyHere };
  }, [submitted, data, onlyHere]);

  const context: StyleContext = useMemo(
    () => ({ data, weather: data.profile.weather, request }),
    [data, request],
  );

  const outfits = useMemo(() => suggestOutfits(context), [context]);
  const understood = useMemo(() => describeUnderstanding(request, data), [request, data]);

  if (!ready) return <div className="h-96 animate-pulse rounded-[22px] bg-sunken" />;

  return (
    <>
      <PageHeader
        title="What to Wear"
        subtitle="Outfits built from the clothes you own."
      />

      {/* Ask */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(text);
          setRound((value) => value + 1);
        }}
        className="flex min-h-16 items-center gap-3 rounded-[20px] border border-line bg-surface px-4 transition-colors focus-within:border-ink"
      >
        <Sparkles size={20} strokeWidth={2} className="shrink-0 text-ink-mute" />
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="What do you feel like wearing?"
          aria-label="What do you feel like wearing?"
          className="w-full bg-transparent py-4 text-[17px] outline-none"
        />
        <button
          type="submit"
          aria-label="Build outfits"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-white transition-transform active:scale-95"
        >
          <ArrowRight size={19} strokeWidth={2.4} />
        </button>
      </form>

      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
        {PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => {
              setText(prompt);
              setSubmitted(prompt);
              setRound((value) => value + 1);
            }}
            className="min-h-11 shrink-0 rounded-full border border-line bg-surface px-4 text-[15px] text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
          >
            {prompt}
          </button>
        ))}
      </div>

      {understood.length ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-[14px] text-ink-mute">Style List understood:</span>
          {understood.map((label) => (
            <Chip key={label} active className="pointer-events-none">
              {label}
            </Chip>
          ))}
        </div>
      ) : null}

      <div className="mt-4 rounded-[18px] border border-line bg-surface px-4">
        <Toggle
          checked={onlyHere}
          onChange={setOnlyHere}
          label={`Only clothes at ${
            data.locations.find((l) => l.id === data.profile.currentLocationId)?.name ?? "my place"
          }`}
          hint="Turn this off to include everything you own, wherever it is."
        />
      </div>

      {/* Results */}
      {data.items.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="Nothing to work with yet"
          description="Add a few pieces and Style List will start putting outfits together."
          art={<CategoryArt category="Hoodie" />}
          action={<ButtonLink href="/add">Add Clothes</ButtonLink>}
        />
      ) : (
        <div className="mt-6 flex flex-col gap-5">
          {outfits.map((outfit) => (
            <OutfitResultCard
              key={`${outfit.id}-${round}-${onlyHere}`}
              outfit={outfit}
              context={context}
            />
          ))}
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* One result                                                          */
/* ------------------------------------------------------------------ */

function OutfitResultCard({
  outfit,
  context,
}: {
  outfit: OutfitSuggestion;
  context: StyleContext;
}) {
  const toast = useToast();
  const { actions } = useCloset();
  const [overrides, setOverrides] = useState<Partial<Record<OutfitSlot, ID | null>>>({});
  const [swapSlot, setSwapSlot] = useState<OutfitSlot | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);

  const slots = useMemo(() => {
    const merged: Partial<Record<OutfitSlot, ClothingItem>> = { ...outfit.slots };
    for (const [slot, id] of Object.entries(overrides) as [OutfitSlot, ID | null][]) {
      if (id === null) delete merged[slot];
      else {
        const item = context.data.items.find((entry) => entry.id === id);
        if (item) merged[slot] = item;
      }
    }
    return merged;
  }, [outfit.slots, overrides, context.data.items]);

  const items = useMemo(() => slotsToItems(slots), [slots]);

  if (!items.length) return null;

  return (
    <article className="card-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[20px] font-semibold tracking-[-0.02em]">{outfit.title}</h2>
        <div className="flex flex-wrap gap-2">
          {outfit.reasons.map((reason) => (
            <span
              key={reason}
              className="rounded-full bg-sunken px-3 py-1.5 text-[13px] text-ink-soft"
            >
              {reason}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <OutfitFlatLay slots={slots} onSlotTap={setSwapSlot} />
      </div>

      {outfit.gaps.length ? (
        <div className="mt-4 rounded-[16px] bg-warn-soft px-4 py-3">
          <p className="text-[14px] font-semibold text-warn">You may need</p>
          {outfit.gaps.map((gap) => (
            <p key={gap.slot} className="mt-0.5 text-[15px] text-ink-soft">
              {gap.message}
            </p>
          ))}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <Button
          size="md"
          icon={<Check size={18} strokeWidth={2.4} />}
          onClick={() => {
            actions.wear(items.map((item) => item.id));
            toast("Nice. Have a good day.");
          }}
        >
          Wear This
        </Button>
        <Button
          variant="secondary"
          size="md"
          icon={<Bookmark size={17} strokeWidth={2} />}
          onClick={() => setSaveOpen(true)}
        >
          Save
        </Button>
        <span className="flex items-center text-[14px] text-ink-mute">
          Tap any piece to change it
        </span>
      </div>

      <SwapSheet
        open={Boolean(swapSlot)}
        onClose={() => setSwapSlot(null)}
        slot={swapSlot}
        currentId={swapSlot ? slots[swapSlot]?.id : undefined}
        options={
          swapSlot
            ? rankForSlot(
                swapSlot,
                context,
                items.filter((item) => item.id !== slots[swapSlot]?.id),
                18,
              )
            : []
        }
        onPick={(item) =>
          setOverrides((current) => ({ ...current, [SLOT_OF_CATEGORY[item.category]]: item.id }))
        }
        onRemove={() =>
          swapSlot && setOverrides((current) => ({ ...current, [swapSlot]: null }))
        }
      />

      {/* Mounted only while open, so the name field starts empty each time. */}
      {saveOpen ? (
        <SaveOutfitSheet
          open
          onClose={() => setSaveOpen(false)}
          items={items}
          onSave={(name) => {
            actions.saveOutfit(
              name,
              items.map((item) => ({ itemId: item.id, slot: SLOT_OF_CATEGORY[item.category] })),
            );
            toast(`Saved "${name}"`);
          }}
        />
      ) : null}
    </article>
  );
}

/* ------------------------------------------------------------------ */

function describeUnderstanding(
  request: StyleRequest,
  data: ReturnType<typeof useCloset>["data"],
): string[] {
  const labels: string[] = [];
  for (const category of request.requireCategories) labels.push(category);
  for (const color of request.requireColors) labels.push(color);
  for (const category of request.excludeCategories) labels.push(`No ${category.toLowerCase()}`);
  for (const id of request.includeItemIds) {
    const item = data.items.find((entry) => entry.id === id);
    if (item) labels.push(item.name);
  }
  if (request.occasion) labels.push(request.occasion);
  if (request.formality === 1) labels.push("Comfortable");
  if (request.formality === 4) labels.push("Dressed up");
  if (request.formality === 5) labels.push("Formal");
  if (request.wantsLayer) labels.push("With a layer");
  return labels;
}
