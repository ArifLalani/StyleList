"use client";

import { Check, Heart, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/AppShell";
import { OutfitFlatLay } from "@/components/outfit/OutfitFlatLay";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { CategoryArt } from "@/components/ui/ItemImage";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { useCloset } from "@/lib/store";
import type { ClothingItem, Outfit, OutfitSlot } from "@/lib/types";
import { plural, relativeDay } from "@/lib/utils";

/**
 * Saved outfits. Combinations the person already decided they like, so getting
 * dressed becomes one tap on a morning where they would rather not think.
 */
export default function OutfitsPage() {
  const { data, ready } = useCloset();

  if (!ready) return <div className="h-96 animate-pulse rounded-[22px] bg-sunken" />;

  return (
    <>
      <PageHeader
        title="Outfits"
        subtitle={data.outfits.length ? plural(data.outfits.length, "saved outfit") : undefined}
        action={
          <ButtonLink href="/what-to-wear" size="md" variant="secondary">
            Build an Outfit
          </ButtonLink>
        }
      />

      {data.outfits.length === 0 ? (
        <EmptyState
          title="No saved outfits yet"
          description="When Style List suggests something you like, tap Save. It will be waiting here next time."
          art={<CategoryArt category="Sweater" />}
          action={
            <ButtonLink href="/what-to-wear" size="lg" icon={<Sparkles size={19} strokeWidth={2} />}>
              Build an Outfit
            </ButtonLink>
          }
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {data.outfits.map((outfit) => (
            <OutfitCard key={outfit.id} outfit={outfit} />
          ))}
        </div>
      )}
    </>
  );
}

function OutfitCard({ outfit }: { outfit: Outfit }) {
  const { data, actions } = useCloset();
  const toast = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const items = outfit.items
    .map((entry) => data.items.find((item) => item.id === entry.itemId))
    .filter((item): item is ClothingItem => Boolean(item));

  const slots: Partial<Record<OutfitSlot, ClothingItem>> = {};
  for (const entry of outfit.items) {
    const item = items.find((candidate) => candidate.id === entry.itemId);
    if (item) slots[entry.slot] = item;
  }

  const notClean = items.filter((item) => item.status !== "Clean");
  const elsewhere = items.filter(
    (item) => item.status === "Clean" && item.locationId !== data.profile.currentLocationId,
  );

  return (
    <article className="card-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-[21px] font-semibold tracking-[-0.02em]">{outfit.name}</h2>
          <p className="mt-1 text-[14px] text-ink-soft">
            {outfit.timesWorn > 0
              ? `Worn ${plural(outfit.timesWorn, "time")} · ${relativeDay(outfit.lastWorn)}`
              : "Never worn"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => actions.updateOutfit(outfit.id, { favorite: !outfit.favorite })}
          aria-label={outfit.favorite ? "Remove from favorites" : "Add to favorites"}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-sunken"
        >
          <Heart size={19} strokeWidth={2.1} className={outfit.favorite ? "fill-ink text-ink" : ""} />
        </button>
      </div>

      <div className="mt-4">
        <OutfitFlatLay slots={slots} />
      </div>

      {notClean.length || elsewhere.length ? (
        <div className="mt-4 rounded-[16px] bg-warn-soft px-4 py-3 text-[14px] text-warn">
          {notClean.length ? (
            <p>
              {notClean.map((item) => item.name).join(", ")}{" "}
              {notClean.length === 1 ? "needs" : "need"} washing.
            </p>
          ) : null}
          {elsewhere.length ? (
            <p className="mt-0.5">
              {elsewhere.map((item) => item.name).join(", ")} {elsewhere.length === 1 ? "is" : "are"}{" "}
              at {data.locations.find((l) => l.id === elsewhere[0].locationId)?.name}.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <Button
          size="md"
          icon={<Check size={18} strokeWidth={2.4} />}
          onClick={() => {
            actions.wear(
              items.map((item) => item.id),
              { outfitId: outfit.id, outfitName: outfit.name },
            );
            toast(`Wearing ${outfit.name}`);
          }}
        >
          Wear This
        </Button>
        <Button
          variant="quiet"
          size="md"
          className="text-alert"
          icon={<Trash2 size={17} strokeWidth={2} />}
          onClick={() => setDeleteOpen(true)}
        >
          Delete
        </Button>
      </div>

      <Sheet
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={`Delete ${outfit.name}?`}
        description="The clothes stay in your closet. Only this saved combination is removed."
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" size="lg" className="flex-1" onClick={() => setDeleteOpen(false)}>
              Keep It
            </Button>
            <Button
              variant="danger"
              size="lg"
              className="flex-1"
              onClick={() => {
                actions.deleteOutfit(outfit.id);
                toast("Outfit deleted", "plain");
              }}
            >
              Delete
            </Button>
          </div>
        }
      >
        <OutfitFlatLay slots={slots} compact />
      </Sheet>
    </article>
  );
}
