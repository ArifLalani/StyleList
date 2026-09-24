"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Controls";
import { TextField } from "@/components/ui/Field";
import { CategoryArt } from "@/components/ui/ItemImage";
import { LocationIcon } from "@/components/ui/LocationIcon";
import { ChoiceGrid, Selector } from "@/components/ui/Select";
import { Sheet } from "@/components/ui/Sheet";
import { COLORS } from "@/lib/colors";
import { useCloset } from "@/lib/store";
import type {
  Category,
  ClothingItem,
  Condition,
  Pattern,
  Season,
  Status,
} from "@/lib/types";
import { CATEGORIES, CONDITIONS, PATTERNS, SEASONS, STATUSES } from "@/lib/types";

/** Editing an item uses exactly the same controls as adding one. */
export function EditItemSheet({
  item,
  open,
  onClose,
}: {
  item: ClothingItem;
  open: boolean;
  onClose: () => void;
}) {
  const { data, actions } = useCloset();
  const [draft, setDraft] = useState<ClothingItem>(item);
  const [categoryOpen, setCategoryOpen] = useState(false);

  const change = (patch: Partial<ClothingItem>) => setDraft((current) => ({ ...current, ...patch }));

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title="Edit details"
        footer={
          <Button
            size="lg"
            full
            onClick={() => {
              actions.updateItem(item.id, {
                name: draft.name.trim() || item.name,
                category: draft.category,
                brand: draft.brand?.trim() || undefined,
                primaryColor: draft.primaryColor,
                secondaryColor: draft.secondaryColor,
                size: draft.size?.trim() || undefined,
                pattern: draft.pattern,
                material: draft.material?.trim() || undefined,
                locationId: draft.locationId,
                status: draft.status,
                condition: draft.condition,
                season: draft.season,
                favorite: draft.favorite,
                purchaseDate: draft.purchaseDate,
                purchasePrice: draft.purchasePrice,
                notes: draft.notes?.trim() || undefined,
              });
              onClose();
            }}
          >
            Save Changes
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          <TextField
            label="Name"
            value={draft.name}
            onChange={(event) => change({ name: event.target.value })}
          />

          <button
            type="button"
            onClick={() => setCategoryOpen(true)}
            className="min-h-16 w-full rounded-[18px] border border-line bg-surface px-4 py-3 text-left transition-colors hover:border-line-strong"
          >
            <span className="label-caps block">Category</span>
            <span className="mt-1 flex items-center gap-3">
              <span className="h-8 w-8 shrink-0">
                <CategoryArt category={draft.category} color={draft.primaryColor} />
              </span>
              <span className="text-[17px] font-medium">{draft.category}</span>
            </span>
          </button>

          <Selector
            label="Color"
            value={draft.primaryColor}
            onChange={(value) => change({ primaryColor: value })}
            options={COLORS.map((color) => ({ value: color.name, label: color.name, swatch: color.hex }))}
          />
          <Selector
            label="Location"
            value={draft.locationId}
            onChange={(value) => change({ locationId: value })}
            options={data.locations.map((location) => ({
              value: location.id,
              label: location.name,
              icon: <LocationIcon icon={location.icon} />,
            }))}
          />
          <Selector
            label="Status"
            value={draft.status}
            onChange={(value) => change({ status: value as Status })}
            options={STATUSES.map((status) => ({ value: status, label: status }))}
          />
          <TextField
            label="Brand"
            value={draft.brand ?? ""}
            onChange={(event) => change({ brand: event.target.value })}
            placeholder="Nike"
          />
          <TextField
            label="Size"
            value={draft.size ?? ""}
            onChange={(event) => change({ size: event.target.value })}
            placeholder="M"
          />
          <Selector
            label="Second Colour"
            value={draft.secondaryColor ?? "None"}
            onChange={(value) => change({ secondaryColor: value === "None" ? undefined : value })}
            options={[
              { value: "None", label: "None" },
              ...COLORS.map((color) => ({ value: color.name, label: color.name, swatch: color.hex })),
            ]}
          />
          <Selector
            label="Pattern"
            value={draft.pattern ?? "Solid"}
            onChange={(value) => change({ pattern: value as Pattern })}
            options={PATTERNS.map((pattern) => ({ value: pattern, label: pattern }))}
          />
          <Selector
            label="Season"
            value={draft.season}
            onChange={(value) => change({ season: value as Season })}
            options={SEASONS.map((season) => ({ value: season, label: season }))}
          />
          <Selector
            label="Condition"
            value={draft.condition}
            onChange={(value) => change({ condition: value as Condition })}
            options={CONDITIONS.map((condition) => ({ value: condition, label: condition }))}
          />
          <TextField
            label="Material"
            value={draft.material ?? ""}
            onChange={(event) => change({ material: event.target.value })}
            placeholder="Cotton"
          />
          <TextField
            label="Notes"
            value={draft.notes ?? ""}
            onChange={(event) => change({ notes: event.target.value })}
          />
          <div className="rounded-[18px] border border-line bg-surface px-4">
            <Toggle
              checked={draft.favorite}
              onChange={(favorite) => change({ favorite })}
              label="Favorite"
            />
          </div>
        </div>
      </Sheet>

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
            change({ category: value as Category });
            setCategoryOpen(false);
          }}
          options={CATEGORIES.map((category) => ({
            value: category,
            label: category,
            icon: <CategoryArt category={category} color={draft.primaryColor} />,
          }))}
        />
      </Sheet>
    </>
  );
}
