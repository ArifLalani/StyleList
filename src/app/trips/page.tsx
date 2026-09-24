"use client";

import { Luggage, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/layout/AppShell";
import { PlanTripSheet } from "@/components/trips/PlanTripSheet";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ItemImage } from "@/components/ui/ItemImage";
import { useCloset } from "@/lib/store";
import { formatDate, plural } from "@/lib/utils";

/** Trips, and how ready each one is. */
export default function TripsPage() {
  const router = useRouter();
  const { data, ready } = useCloset();
  const [planOpen, setPlanOpen] = useState(false);

  if (!ready) return <div className="h-96 animate-pulse rounded-[22px] bg-sunken" />;

  const trips = [...data.trips].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );

  return (
    <>
      <PageHeader
        title="Trips"
        subtitle={trips.length ? plural(trips.length, "trip") + " planned" : undefined}
        action={
          <Button size="md" onClick={() => setPlanOpen(true)} icon={<Plus size={18} strokeWidth={2.4} />}>
            Plan a Trip
          </Button>
        }
      />

      {trips.length === 0 ? (
        <EmptyState
          title="No trips planned"
          description="Tell Style List where you are going and for how long, and it will build a packing list from clothes you already own."
          art={<Luggage size={80} strokeWidth={1} className="h-full w-full text-ink-mute" />}
          action={
            <Button size="lg" onClick={() => setPlanOpen(true)} icon={<Plus size={19} strokeWidth={2.4} />}>
              Plan a Trip
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {trips.map((trip) => {
            const items = trip.items
              .map((entry) => data.items.find((item) => item.id === entry.itemId))
              .filter((item): item is NonNullable<typeof item> => Boolean(item));
            const packed = trip.items.filter((entry) => entry.packed).length;
            const problems = trip.items.filter((entry) => {
              const item = data.items.find((candidate) => candidate.id === entry.itemId);
              return item && !entry.packed && item.status !== "Clean";
            }).length;

            return (
              <Link
                key={trip.id}
                href={`/trips/${trip.id}`}
                className="card-surface block p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-[22px] font-semibold tracking-[-0.02em]">{trip.destination}</h2>
                    <p className="mt-1 text-[15px] text-ink-soft">
                      {formatDate(trip.startDate)} &middot; {plural(trip.days, "day")} &middot;{" "}
                      {trip.activities.join(", ")}
                    </p>
                  </div>
                  <span className="rounded-full bg-sunken px-3 py-1.5 text-[14px] font-medium text-ink-soft">
                    {packed} of {trip.items.length} packed
                  </span>
                </div>

                <div className="mt-4 flex gap-2 overflow-hidden">
                  {items.slice(0, 6).map((item) => (
                    <div
                      key={item.id}
                      className="aspect-square w-[calc((100%-2.5rem)/6)] min-w-14 rounded-[14px] bg-sunken p-1.5"
                    >
                      <ItemImage item={item} />
                    </div>
                  ))}
                </div>

                {problems > 0 ? (
                  <p className="mt-4 rounded-[14px] bg-warn-soft px-4 py-2.5 text-[14px] font-medium text-warn">
                    {plural(problems, "piece")} on this list still needs washing.
                  </p>
                ) : null}
              </Link>
            );
          })}
        </div>
      )}

      <PlanTripSheet
        open={planOpen}
        onClose={() => setPlanOpen(false)}
        onCreated={(trip) => router.push(`/trips/${trip.id}`)}
      />
    </>
  );
}
