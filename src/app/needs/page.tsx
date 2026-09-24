"use client";

import { Check, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { TextField } from "@/components/ui/Field";
import { CategoryArt } from "@/components/ui/ItemImage";
import { SegmentedControl } from "@/components/ui/Controls";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { findWardrobeGaps } from "@/lib/ai/stylist";
import { useCloset } from "@/lib/store";
import type { NeedItem } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Needs - not Shop.
 *
 * Style List will point out a real hole in a wardrobe, once, quietly. It never
 * links anywhere to buy anything, and the whole page leads with what you
 * already own instead.
 */
export default function NeedsPage() {
  const { data, actions, ready } = useCloset();
  const toast = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"Need" | "Want">("Need");

  const gaps = useMemo(() => findWardrobeGaps(data), [data]);
  const suggestedTitles = new Set(data.needs.map((need) => need.title.toLowerCase()));
  const freshGaps = gaps.filter((gap) => !suggestedTitles.has(gap.title.toLowerCase()));

  if (!ready) return <div className="h-96 animate-pulse rounded-[22px] bg-sunken" />;

  const needs = data.needs.filter((need) => need.kind === "Need" && !need.done);
  const wants = data.needs.filter((need) => need.kind === "Want" && !need.done);
  const done = data.needs.filter((need) => need.done);

  return (
    <>
      <PageHeader
        title="Needs"
        subtitle="Gaps worth filling, and things you would like one day."
        action={
          <Button size="md" onClick={() => setAddOpen(true)} icon={<Plus size={18} strokeWidth={2.4} />}>
            Add Something
          </Button>
        }
      />

      {freshGaps.length ? (
        <section className="mb-7">
          <h2 className="label-caps mb-2.5">Style List noticed</h2>
          <div className="flex flex-col gap-2.5">
            {freshGaps.map((gap) => (
              <div
                key={gap.title}
                className="flex flex-wrap items-center gap-4 rounded-[20px] border border-line bg-accent-soft p-4"
              >
                <div className="h-14 w-14 shrink-0">
                  <CategoryArt category={gap.category} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[17px] font-medium">{gap.title}</p>
                  <p className="mt-0.5 text-[15px] text-ink-soft">{gap.reason}</p>
                </div>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => {
                    actions.addNeed({
                      title: gap.title,
                      kind: "Need",
                      category: gap.category,
                      note: gap.reason,
                      suggested: true,
                    });
                    toast("Added to your needs");
                  }}
                >
                  Add to Needs
                </Button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {needs.length === 0 && wants.length === 0 && done.length === 0 ? (
        <EmptyState
          title="Nothing on your list"
          description="Style List will mention it here if your closet is genuinely missing something. Until then, use what you have."
          art={<CategoryArt category="Jacket" />}
          action={<Button onClick={() => setAddOpen(true)}>Add Something</Button>}
        />
      ) : (
        <div className="flex flex-col gap-8">
          <NeedList title="Need" items={needs} emptyNote="Nothing you actually need right now." />
          <NeedList title="Want" items={wants} emptyNote="Nothing on the wishlist." />
          {done.length ? <NeedList title="Sorted" items={done} emptyNote="" /> : null}
        </div>
      )}

      <Sheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add to your list"
        footer={
          <Button
            size="lg"
            full
            disabled={!title.trim()}
            onClick={() => {
              actions.addNeed({ title: title.trim(), kind });
              setTitle("");
              setAddOpen(false);
              toast("Added to your list");
            }}
          >
            Add to List
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <TextField
            label="What is it?"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Plain white t-shirt"
            autoFocus
          />
          <div>
            <p className="label-caps mb-2">Is this a need or a want?</p>
            <SegmentedControl
              options={[
                { value: "Need", label: "Need" },
                { value: "Want", label: "Want" },
              ]}
              value={kind}
              onChange={setKind}
            />
          </div>
        </div>
      </Sheet>
    </>
  );
}

function NeedList({
  title,
  items,
  emptyNote,
}: {
  title: string;
  items: NeedItem[];
  emptyNote: string;
}) {
  const { actions } = useCloset();

  return (
    <section>
      <h2 className="mb-3 text-[21px] font-semibold tracking-[-0.02em]">{title}</h2>
      {items.length === 0 ? (
        <p className="text-[15px] text-ink-mute">{emptyNote}</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {items.map((need) => (
            <div
              key={need.id}
              className={cn(
                "flex items-center gap-4 rounded-[20px] border border-line bg-surface p-4",
                need.done && "opacity-60",
              )}
            >
              <button
                type="button"
                onClick={() => actions.updateNeed(need.id, { done: !need.done })}
                aria-label={need.done ? "Mark as still needed" : "Mark as sorted"}
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  need.done ? "border-ink bg-ink text-white" : "border-line-strong hover:border-ink",
                )}
              >
                {need.done ? <Check size={20} strokeWidth={3} /> : null}
              </button>
              <div className="min-w-0 flex-1">
                <p className={cn("text-[17px] font-medium", need.done && "line-through")}>
                  {need.title}
                </p>
                {need.note ? <p className="mt-0.5 text-[14px] text-ink-soft">{need.note}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => actions.deleteNeed(need.id)}
                aria-label="Remove"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-mute transition-colors hover:bg-sunken hover:text-alert"
              >
                <Trash2 size={18} strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
