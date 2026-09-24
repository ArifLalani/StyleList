"use client";

import { Check } from "lucide-react";
import { ItemRow } from "@/components/closet/ClothingCard";
import { PageHeader } from "@/components/layout/AppShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { CategoryArt } from "@/components/ui/ItemImage";
import { useToast } from "@/components/ui/Toast";
import { laundryItems, useCloset } from "@/lib/store";
import { LAUNDRY_STATUSES } from "@/lib/types";
import { plural, relativeDay } from "@/lib/utils";

/**
 * Laundry.
 *
 * A list of what is not wearable and one button per item to fix it. No
 * cycles, no schedules, no laundry "workflow" - just Mark Clean.
 */

const GROUP_COPY: Record<string, { title: string; note: string }> = {
  "Needs Washing": { title: "Needs washing", note: "Straight in the machine." },
  "Dry Cleaning": { title: "Dry cleaning", note: "Drop these off when you can." },
  Stained: { title: "Stained", note: "Treat the mark before washing." },
  "Needs Repair": { title: "Needs repair", note: "A stitch or a zip away from wearable." },
};

export default function LaundryPage() {
  const { data, actions, ready } = useCloset();
  const toast = useToast();

  if (!ready) return <div className="h-96 animate-pulse rounded-[22px] bg-sunken" />;

  const items = laundryItems(data);

  return (
    <>
      <PageHeader
        title="Laundry"
        subtitle={items.length ? plural(items.length, "piece") + " to deal with" : undefined}
        action={
          items.length ? (
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                items.forEach((item) => actions.setStatus(item.id, "Clean"));
                toast(`${plural(items.length, "piece")} marked clean`);
              }}
            >
              Mark All Clean
            </Button>
          ) : undefined
        }
      />

      {items.length === 0 ? (
        <EmptyState
          title="Nothing needs washing"
          description="Everything in your closet is ready to wear."
          art={<CategoryArt category="T-Shirt" color="White" />}
          action={<ButtonLink href="/" variant="secondary">See today&#39;s outfit</ButtonLink>}
        />
      ) : (
        <div className="flex flex-col gap-8">
          {LAUNDRY_STATUSES.map((status) => {
            const group = items.filter((item) => item.status === status);
            if (!group.length) return null;
            const copy = GROUP_COPY[status];
            return (
              <section key={status}>
                <div className="mb-3">
                  <h2 className="text-[21px] font-semibold tracking-[-0.02em]">{copy.title}</h2>
                  <p className="mt-0.5 text-[15px] text-ink-soft">
                    {plural(group.length, "piece")} &middot; {copy.note}
                  </p>
                </div>
                <div className="flex flex-col gap-2.5">
                  {group.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      detail={<span>Last worn {relativeDay(item.lastWorn).toLowerCase()}</span>}
                      action={
                        <Button
                          size="md"
                          icon={<Check size={18} strokeWidth={2.4} />}
                          onClick={() => {
                            actions.setStatus(item.id, "Clean");
                            toast(`${item.name} is clean`);
                          }}
                        >
                          Mark Clean
                        </Button>
                      }
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

