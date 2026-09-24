"use client";

import { ChevronDown, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Controls";
import { TextField } from "@/components/ui/Field";
import { CategoryArt } from "@/components/ui/ItemImage";
import { LocationIcon } from "@/components/ui/LocationIcon";
import { ChoiceGrid, Selector } from "@/components/ui/Select";
import { Sheet } from "@/components/ui/Sheet";
import { COLORS } from "@/lib/colors";
import type { ItemSuggestion } from "@/lib/ai/analyzeClothing";
import type {
  Category,
  Condition,
  Location,
  Pattern,
  Season,
  Status,
} from "@/lib/types";
import { CATEGORIES, CONDITIONS, PATTERNS, SEASONS, STATUSES } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The confirm screen.
 *
 * Five things on it, all filled in already. Everything else - brand, size,
 * season, price - waits behind More Details, because none of it is needed to
 * get the item into the closet and start using it.
 */

export interface ItemDraft {
  name: string;
  category: Category;
  subcategory?: string;
  brand?: string;
  primaryColor: string;
  secondaryColor?: string;
  size?: string;
  pattern: Pattern;
  material?: string;
  locationId: string;
  status: Status;
  condition: Condition;
  favorite: boolean;
  season: Season;
  warmth: number;
  dressiness: number;
  purchaseDate?: string;
  purchasePrice?: number;
  notes?: string;
}

export function ConfirmItem({
  draft,
  onChange,
  imageUrl,
  suggestion,
  locations,
  onAddLocation,
  onSave,
  saveLabel = "Add to My Closet",
}: {
  draft: ItemDraft;
  onChange: (patch: Partial<ItemDraft>) => void;
  imageUrl?: string;
  suggestion?: ItemSuggestion;
  locations: Location[];
  onAddLocation: () => void;
  onSave: () => void;
  saveLabel?: string;
}) {
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const lowConfidence = (suggestion?.confidence.category ?? 1) < 0.5;

  return (
    <div className="mx-auto w-full max-w-xl px-5 pb-40 sm:px-8">
      {/* The item */}
      <div className="mt-2 overflow-hidden rounded-[26px] bg-sunken p-6">
        <div className="mx-auto aspect-square w-full max-w-[260px]">
          {imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={imageUrl}
              alt={draft.name}
              className="h-full w-full animate-[settle_0.6s_var(--ease-out-soft)_both] object-contain"
            />
          ) : (
            <CategoryArt category={draft.category} color={draft.primaryColor} />
          )}
        </div>
      </div>

      {suggestion ? (
        <p className="mt-4 flex items-start gap-2 text-[14px] leading-snug text-ink-soft">
          <Sparkles size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-ink-mute" />
          <span>
            {suggestion.source === "assistant"
              ? "Style List read your photo and filled this in."
              : "Filled in from your photo, on this device."}{" "}
            Change anything that looks wrong.
          </span>
        </p>
      ) : null}

      {/* The five things that matter */}
      <div className="mt-5 flex flex-col gap-3">
        <TextField
          label="Name"
          value={draft.name}
          onChange={(event) => onChange({ name: event.target.value })}
          placeholder="Black Essentials Hoodie"
        />

        <div>
          <button
            type="button"
            onClick={() => setCategoryOpen(true)}
            className="min-h-16 w-full rounded-[18px] border border-line bg-surface px-4 py-3 text-left transition-colors hover:border-line-strong active:bg-sunken"
          >
            <span className="label-caps block">Category</span>
            <span className="mt-1 flex items-center gap-3">
              <span className="h-8 w-8 shrink-0">
                <CategoryArt category={draft.category} color={draft.primaryColor} />
              </span>
              <span className="flex-1 text-[17px] font-medium">{draft.category}</span>
              <ChevronDown size={20} className="text-ink-mute" strokeWidth={2.2} />
            </span>
          </button>
          {lowConfidence ? (
            <p className="mt-1.5 px-1 text-[13px] text-warn">
              Style List wasn&#39;t sure about this one. Tap to change it.
            </p>
          ) : null}
        </div>

        <Selector
          label="Color"
          value={draft.primaryColor}
          onChange={(value) => onChange({ primaryColor: value })}
          sheetTitle="What colour is it?"
          options={COLORS.map((color) => ({
            value: color.name,
            label: color.name,
            swatch: color.hex,
          }))}
        />

        <Selector
          label="Location"
          value={draft.locationId}
          onChange={(value) => onChange({ locationId: value })}
          sheetTitle="Where do you keep it?"
          options={locations.map((location) => ({
            value: location.id,
            label: location.name,
            icon: <LocationIcon icon={location.icon} />,
          }))}
          extraAction={{ label: "+ Add Location", onClick: onAddLocation }}
        />

        <Selector
          label="Status"
          value={draft.status}
          onChange={(value) => onChange({ status: value as Status })}
          sheetTitle="Is it ready to wear?"
          options={STATUSES.map((status) => ({ value: status, label: status }))}
        />
      </div>

      {/* More details */}
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setMoreOpen((open) => !open)}
          className="flex min-h-14 w-full items-center justify-between rounded-[18px] px-2 text-left text-[17px] font-medium text-ink-soft transition-colors hover:bg-sunken"
        >
          More Details
          <ChevronDown
            size={20}
            strokeWidth={2.2}
            className={cn("transition-transform duration-200", moreOpen && "rotate-180")}
          />
        </button>

        {moreOpen ? (
          <div className="mt-2 flex animate-[fade-up_0.3s_var(--ease-out-soft)_both] flex-col gap-3">
            <TextField
              label="Brand"
              value={draft.brand ?? ""}
              onChange={(event) => onChange({ brand: event.target.value })}
              placeholder="Nike, Levi's, Essentials"
            />
            <TextField
              label="Size"
              value={draft.size ?? ""}
              onChange={(event) => onChange({ size: event.target.value })}
              placeholder="M, 32, 10"
            />
            <Selector
              label="Second Colour"
              value={draft.secondaryColor ?? "None"}
              onChange={(value) => onChange({ secondaryColor: value === "None" ? undefined : value })}
              sheetTitle="Is there a second colour?"
              options={[
                { value: "None", label: "None" },
                ...COLORS.map((color) => ({
                  value: color.name,
                  label: color.name,
                  swatch: color.hex,
                })),
              ]}
            />
            <Selector
              label="Pattern"
              value={draft.pattern}
              onChange={(value) => onChange({ pattern: value as Pattern })}
              sheetTitle="What does the surface look like?"
              options={PATTERNS.map((pattern) => ({ value: pattern, label: pattern }))}
            />
            <Selector
              label="Season"
              value={draft.season}
              onChange={(value) => onChange({ season: value as Season })}
              sheetTitle="When do you wear it?"
              options={SEASONS.map((season) => ({ value: season, label: season }))}
            />
            <Selector
              label="Condition"
              value={draft.condition}
              onChange={(value) => onChange({ condition: value as Condition })}
              sheetTitle="What condition is it in?"
              options={CONDITIONS.map((condition) => ({ value: condition, label: condition }))}
            />
            <TextField
              label="Material"
              value={draft.material ?? ""}
              onChange={(event) => onChange({ material: event.target.value })}
              placeholder="Cotton, Denim, Wool"
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField
                label="Bought On"
                type="date"
                value={draft.purchaseDate?.slice(0, 10) ?? ""}
                onChange={(event) =>
                  onChange({
                    purchaseDate: event.target.value
                      ? new Date(event.target.value).toISOString()
                      : undefined,
                  })
                }
              />
              <TextField
                label="Price"
                type="number"
                inputMode="decimal"
                value={draft.purchasePrice ?? ""}
                onChange={(event) =>
                  onChange({
                    purchasePrice: event.target.value ? Number(event.target.value) : undefined,
                  })
                }
                placeholder="0"
              />
            </div>
            <TextField
              label="Notes"
              value={draft.notes ?? ""}
              onChange={(event) => onChange({ notes: event.target.value })}
              placeholder="Runs big, gift from Mom"
            />
            <div className="rounded-[18px] border border-line bg-surface px-4">
              <Toggle
                checked={draft.favorite}
                onChange={(favorite) => onChange({ favorite })}
                label="Favorite"
                hint="Style List reaches for favorites first."
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* Sticky save */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-5 pt-4 pb-5 pb-safe backdrop-blur-xl sm:px-8">
        <div className="mx-auto max-w-xl">
          <Button size="lg" full onClick={onSave}>
            {saveLabel}
          </Button>
        </div>
      </div>

      <Sheet
        open={categoryOpen}
        onClose={() => setCategoryOpen(false)}
        title="What kind of item is it?"
        size="wide"
      >
        <ChoiceGrid
          columns={3}
          value={draft.category}
          onChange={(value) => {
            onChange({ category: value as Category });
            setCategoryOpen(false);
          }}
          options={CATEGORIES.map((category) => ({
            value: category,
            label: category,
            icon: <CategoryArt category={category} color={draft.primaryColor} />,
          }))}
        />
      </Sheet>
    </div>
  );
}

/** A tiny sheet for creating a location on the spot. */
export function AddLocationSheet({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState("");
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Add a location"
      description="Anywhere you keep clothes: a home, a car, a suitcase."
      footer={
        <Button
          size="lg"
          full
          disabled={!name.trim()}
          onClick={() => {
            onCreate(name.trim());
            setName("");
            onClose();
          }}
        >
          Save Location
        </Button>
      }
    >
      <TextField
        label="Name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Sister's house"
        autoFocus
      />
    </Sheet>
  );
}
