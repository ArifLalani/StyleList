"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { ItemImage } from "@/components/ui/ItemImage";
import { Sheet } from "@/components/ui/Sheet";
import { describeOutfit } from "@/lib/ai/stylist";
import { useCloset } from "@/lib/store";
import type { ClothingItem, ID, Status } from "@/lib/types";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Saving an outfit                                                     */
/* ------------------------------------------------------------------ */

export function SaveOutfitSheet({
  open,
  onClose,
  items,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  items: ClothingItem[];
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState("");

  const suggestions = ["Friday Night", "Work", "Dinner", "Lazy Sunday", "Airport Fit"];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Save this outfit"
      description="Give it a name you will recognise later."
      footer={
        <Button
          size="lg"
          full
          onClick={() => {
            onSave(name.trim() || describeOutfit(items));
            onClose();
          }}
        >
          Save Outfit
        </Button>
      }
    >
      <div className="mb-5 grid grid-cols-4 gap-2">
        {items.slice(0, 4).map((item) => (
          <div key={item.id} className="aspect-square rounded-[14px] bg-sunken p-2">
            <ItemImage item={item} />
          </div>
        ))}
      </div>

      <TextField
        label="Name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder={describeOutfit(items)}
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => setName(suggestion)}
            className="min-h-11 rounded-full border border-line bg-surface px-4 text-[15px] font-medium transition-colors hover:border-line-strong"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* How are these clothes?                                              */
/* ------------------------------------------------------------------ */

const ANSWERS: { value: Status; label: string }[] = [
  { value: "Clean", label: "Still Clean" },
  { value: "Needs Washing", label: "Wash" },
  { value: "Dry Cleaning", label: "Dry Clean" },
  { value: "Stained", label: "Stained" },
  { value: "Needs Repair", label: "Needs Repair" },
];

export function WearReviewSheet({
  open,
  onClose,
  itemIds,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  itemIds: ID[];
  onDone: (statuses: Record<ID, Status>) => void;
}) {
  const { data } = useCloset();
  const [answers, setAnswers] = useState<Record<ID, Status>>({});

  const items = itemIds
    .map((id) => data.items.find((item) => item.id === id))
    .filter((item): item is ClothingItem => Boolean(item));

  return (
    <Sheet
      open={open}
      onClose={onClose}
      size="wide"
      title="How are these clothes?"
      description="Tap one answer per item. Anything you wash shows up in Laundry."
      footer={
        <Button
          size="lg"
          full
          onClick={() => {
            onDone(answers);
            onClose();
          }}
        >
          Done
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {items.map((item) => (
          <div key={item.id} className="rounded-[20px] border border-line bg-surface p-3">
            <div className="flex items-center gap-3.5">
              <div className="h-16 w-16 shrink-0 rounded-[14px] bg-sunken p-2">
                <ItemImage item={item} />
              </div>
              <p className="min-w-0 flex-1 truncate text-[16px] font-medium">{item.name}</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {ANSWERS.map((answer) => {
                const isChosen = answers[item.id] === answer.value;
                return (
                  <button
                    key={answer.value}
                    type="button"
                    onClick={() => setAnswers((current) => ({ ...current, [item.id]: answer.value }))}
                    className={cn(
                      "min-h-12 rounded-[14px] border px-4 text-[15px] font-medium transition-colors",
                      isChosen
                        ? "border-ink bg-ink text-white"
                        : "border-line bg-surface hover:border-line-strong",
                    )}
                  >
                    {answer.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Sheet>
  );
}
