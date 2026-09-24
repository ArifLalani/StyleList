"use client";

import { Check, ChevronLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ItemRow } from "@/components/closet/ClothingCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ItemImage } from "@/components/ui/ItemImage";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { suggestPacking } from "@/lib/ai/stylist";
import { useCloset } from "@/lib/store";
import { formatDate, plural } from "@/lib/utils";

/**
 * A packing list.
 *
 * Every line is a real item with its real problems shown: needs washing, at
 * Mom's house, already packed. Pack, Replace and Remove are the only three
 * things to do.
 */
export default function TripDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { data, actions, ready } = useCloset();

  const trip = data.trips.find((entry) => entry.id === params.id);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [replacing, setReplacing] = useState<string | null>(null);

  if (!ready) return <div className="h-96 animate-pulse rounded-[22px] bg-sunken" />;

  if (!trip) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-[24px] font-semibold">That trip is gone</h1>
        <Link href="/trips" className="mt-4 inline-block text-[16px] font-medium text-accent">
          Back to Trips
        </Link>
      </div>
    );
  }

  const rows = trip.items
    .map((entry) => ({ entry, item: data.items.find((item) => item.id === entry.itemId) }))
    .filter((row): row is { entry: typeof row.entry; item: NonNullable<typeof row.item> } =>
      Boolean(row.item),
    );

  const packedCount = rows.filter((row) => row.entry.packed).length;
  const notPacked = rows.filter((row) => !row.entry.packed);
  const problems = notPacked.filter(
    (row) =>
      row.item.status !== "Clean" || row.item.locationId !== data.profile.currentLocationId,
  );

  const alreadyIncluded = new Set(trip.items.map((entry) => entry.itemId));
  const candidates = data.items.filter((item) => !alreadyIncluded.has(item.id));

  const problemFor = (row: (typeof rows)[number]) => {
    if (row.item.status !== "Clean") return `${row.item.status} - wash before you go`;
    if (row.item.locationId !== data.profile.currentLocationId) {
      const place = data.locations.find((l) => l.id === row.item.locationId)?.name;
      return `At ${place}`;
    }
    return undefined;
  };

  return (
    <>
      <Link
        href="/trips"
        className="mb-5 -ml-2 inline-flex min-h-11 items-center gap-1 rounded-full pr-4 pl-2 text-[16px] font-medium text-ink-soft transition-colors hover:bg-sunken hover:text-ink"
      >
        <ChevronLeft size={20} strokeWidth={2.2} />
        Trips
      </Link>

      <header className="mb-6">
        <h1 className="text-[32px] leading-tight font-semibold tracking-[-0.03em] sm:text-[38px]">
          {trip.destination}
        </h1>
        <p className="mt-1.5 text-[16px] text-ink-soft">
          {formatDate(trip.startDate)} &middot; {plural(trip.days, "day")} &middot;{" "}
          {trip.expectedWeather.toLowerCase()}, around {Math.round(trip.expectedTempC)}&deg;
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {trip.activities.map((activity) => (
            <span
              key={activity}
              className="rounded-full bg-sunken px-3 py-1.5 text-[14px] font-medium text-ink-soft"
            >
              {activity}
            </span>
          ))}
        </div>
      </header>

      {/* Progress */}
      <div className="card-surface mb-6 p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-[19px] font-semibold tracking-[-0.02em]">
            {packedCount} of {rows.length} packed
          </p>
          {packedCount === rows.length && rows.length > 0 ? (
            <span className="text-[15px] font-medium text-good">All set</span>
          ) : null}
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-sunken">
          <div
            className="h-full rounded-full bg-ink transition-[width] duration-500 ease-[var(--ease-out-soft)]"
            style={{ width: `${rows.length ? (packedCount / rows.length) * 100 : 0}%` }}
          />
        </div>
        {problems.length ? (
          <p className="mt-4 rounded-[14px] bg-warn-soft px-4 py-2.5 text-[14px] font-medium text-warn">
            {plural(problems.length, "piece")} {problems.length === 1 ? "needs" : "need"} sorting
            out before {problems.length === 1 ? "it" : "they"} can go in the bag.
          </p>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Nothing on this list yet"
          description="Style List can suggest what to pack from the clothes you own, or you can pick pieces yourself."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                onClick={() => {
                  const picks = suggestPacking(data, trip);
                  actions.updateTrip(trip.id, {
                    items: picks.map((pick) => ({
                      itemId: pick.itemId,
                      packed: false,
                      reason: pick.reason,
                    })),
                  });
                  toast(`${plural(picks.length, "piece")} suggested`);
                }}
              >
                Build My Packing List
              </Button>
              <Button
                variant="secondary"
                onClick={() => setAddOpen(true)}
                icon={<Plus size={18} strokeWidth={2.4} />}
              >
                Pick Clothes Myself
              </Button>
            </div>
          }
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {rows.map((row) => (
            <ItemRow
              key={row.item.id}
              item={row.item}
              detail={row.entry.reason ? <span>{row.entry.reason}</span> : undefined}
              problem={row.entry.packed ? undefined : problemFor(row)}
              action={
                <div className="flex flex-col items-end gap-1.5">
                  {row.entry.packed ? (
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => actions.setTripItemPacked(trip.id, row.item.id, false)}
                      icon={<Check size={17} strokeWidth={2.6} />}
                    >
                      Packed
                    </Button>
                  ) : (
                    <Button
                      size="md"
                      onClick={() => {
                        actions.setTripItemPacked(trip.id, row.item.id, true);
                        toast(`${row.item.name} packed`);
                      }}
                    >
                      Pack
                    </Button>
                  )}
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setReplacing(row.item.id)}
                      className="min-h-9 rounded-full px-3 text-[14px] font-medium text-ink-soft transition-colors hover:bg-sunken"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        actions.removeTripItem(trip.id, row.item.id);
                        toast("Removed from the list", "plain");
                      }}
                      className="min-h-9 rounded-full px-3 text-[14px] font-medium text-ink-soft transition-colors hover:bg-sunken"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              }
            />
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Button variant="secondary" onClick={() => setAddOpen(true)} icon={<Plus size={18} strokeWidth={2.4} />}>
          Add Something Else
        </Button>
        <Button
          variant="quiet"
          className="text-alert"
          onClick={() => setDeleteOpen(true)}
          icon={<Trash2 size={17} strokeWidth={2} />}
        >
          Delete Trip
        </Button>
      </div>

      {/* Add / replace */}
      <Sheet
        open={addOpen || Boolean(replacing)}
        onClose={() => {
          setAddOpen(false);
          setReplacing(null);
        }}
        size="wide"
        title={replacing ? "Pack something else instead" : "Add to this trip"}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {candidates.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (replacing) actions.removeTripItem(trip.id, replacing);
                actions.addTripItem(trip.id, item.id, replacing ? "Swapped in" : "Added by you");
                setReplacing(null);
                setAddOpen(false);
                toast(`${item.name} added to ${trip.destination}`);
              }}
              className="rounded-[20px] border border-line bg-surface p-2.5 text-left transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-soft)]"
            >
              <div className="aspect-square overflow-hidden rounded-[15px] bg-sunken p-2.5">
                <ItemImage item={item} />
              </div>
              <p className="mt-2.5 truncate px-0.5 text-[15px] font-medium">{item.name}</p>
              <p className="mt-0.5 truncate px-0.5 text-[13px] text-ink-mute">
                {item.status === "Clean" ? "Clean" : item.status}
              </p>
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={`Delete the ${trip.destination} trip?`}
        description="Your clothes stay exactly where they are."
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
                actions.deleteTrip(trip.id);
                router.push("/trips");
              }}
            >
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-[16px] text-ink-soft">
          {plural(rows.length, "piece")} on the packing list.
        </p>
      </Sheet>
    </>
  );
}
