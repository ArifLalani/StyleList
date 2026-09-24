"use client";

import {
  ChevronLeft,
  Heart,
  Luggage,
  MapPin,
  Pencil,
  Plus,
  Shirt,
  Trash2,
  WashingMachine,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { EditItemSheet } from "@/components/closet/EditItemSheet";
import { Button } from "@/components/ui/Button";
import { SegmentedControl, StatusPill } from "@/components/ui/Controls";
import { ItemImage } from "@/components/ui/ItemImage";
import { LocationIcon } from "@/components/ui/LocationIcon";
import { OptionList } from "@/components/ui/Select";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { describeOutfit } from "@/lib/ai/stylist";
import { useCloset } from "@/lib/store";
import type { ImageView, Status } from "@/lib/types";
import { LAUNDRY_STATUSES, SLOT_OF_CATEGORY, STATUSES } from "@/lib/types";
import { formatDate, plural, relativeDay } from "@/lib/utils";

/**
 * One item.
 *
 * The two answers people came for are at the top - where it is and whether it
 * can be worn - and the four things they might do next are four large
 * buttons. Everything else is grouped below.
 */

export default function ItemDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { data, actions, ready } = useCloset();

  const item = data.items.find((entry) => entry.id === params.id);
  const [view, setView] = useState<ImageView>("front");
  const [moveOpen, setMoveOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [outfitOpen, setOutfitOpen] = useState(false);
  const [tripOpen, setTripOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const location = data.locations.find((entry) => entry.id === item?.locationId);
  const images = useMemo(
    () => data.images.filter((image) => image.itemId === item?.id),
    [data.images, item?.id],
  );

  if (!ready) {
    return <div className="h-96 animate-pulse rounded-[26px] bg-sunken" />;
  }

  if (!item) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-[24px] font-semibold">That item is no longer in your closet</h1>
        <Link href="/closet" className="mt-4 inline-block text-[16px] font-medium text-accent">
          Back to My Closet
        </Link>
      </div>
    );
  }

  const isDirty = LAUNDRY_STATUSES.includes(item.status);
  const outfitsWithItem = data.outfits.filter((outfit) =>
    outfit.items.some((entry) => entry.itemId === item.id),
  );

  return (
    <>
      <Link
        href="/closet"
        className="mb-5 -ml-2 inline-flex min-h-11 items-center gap-1 rounded-full pr-4 pl-2 text-[16px] font-medium text-ink-soft transition-colors hover:bg-sunken hover:text-ink"
      >
        <ChevronLeft size={20} strokeWidth={2.2} />
        My Closet
      </Link>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
        {/* Picture */}
        <div>
          <div className="overflow-hidden rounded-[26px] bg-sunken p-8">
            <div className="mx-auto aspect-square w-full max-w-[420px]">
              <ItemImage key={view} item={item} view={view} />
            </div>
          </div>
          <div className="mt-3 max-w-[280px]">
            <SegmentedControl
              options={[
                { value: "front", label: "Front" },
                { value: "back", label: "Back" },
              ]}
              value={view}
              onChange={setView}
            />
          </div>
          {view === "back" && !images.some((image) => image.view === "back") && images.length ? (
            <p className="mt-2 text-[14px] text-ink-mute">
              No back photo yet. This is a drawing of the item.
            </p>
          ) : null}
        </div>

        {/* Facts and actions */}
        <div>
          <h1 className="text-[30px] leading-tight font-semibold tracking-[-0.03em] sm:text-[36px]">
            {item.name}
          </h1>
          <p className="mt-2 text-[17px] text-ink-soft">
            {[item.brand, item.category, item.size ? `Size ${item.size}` : undefined]
              .filter(Boolean)
              .join(" · ")}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setMoveOpen(true)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-[15px] font-medium transition-colors hover:border-line-strong"
            >
              <LocationIcon icon={location?.icon} size={17} className="text-ink-soft" />
              {location?.name ?? "Unknown"}
            </button>
            <button type="button" onClick={() => setStatusOpen(true)}>
              <StatusPill status={item.status} className="min-h-11 px-4 text-[15px]" />
            </button>
            {item.favorite ? (
              <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-sunken px-4 text-[15px] font-medium">
                <Heart size={16} strokeWidth={2.4} className="fill-ink text-ink" />
                Favorite
              </span>
            ) : null}
          </div>

          {/* Primary actions. One per row on a phone: full-width targets that
              never wrap their label onto two lines. */}
          <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button
              size="lg"
              onClick={() => {
                actions.wear([item.id]);
                toast(`Wearing your ${item.name.toLowerCase()} today`);
              }}
              icon={<Shirt size={19} strokeWidth={2} />}
            >
              Wear Today
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setOutfitOpen(true)}
              icon={<Plus size={19} strokeWidth={2.2} />}
            >
              Add to Outfit
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setMoveOpen(true)}
              icon={<MapPin size={19} strokeWidth={2} />}
            >
              Move Item
            </Button>
            {isDirty ? (
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  actions.setStatus(item.id, "Clean");
                  toast("Marked clean");
                }}
                icon={<WashingMachine size={19} strokeWidth={2} />}
              >
                Mark Clean
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  actions.setStatus(item.id, "Needs Washing");
                  toast("Added to laundry");
                }}
                icon={<WashingMachine size={19} strokeWidth={2} />}
              >
                Mark Dirty
              </Button>
            )}
          </div>

          {/* Facts */}
          <dl className="mt-8 divide-y divide-line overflow-hidden rounded-[22px] border border-line bg-surface">
            <Fact label="Colour" value={[item.primaryColor, item.secondaryColor].filter(Boolean).join(" and ")} />
            <Fact label="Last worn" value={relativeDay(item.lastWorn)} />
            <Fact label="Times worn" value={String(item.timesWorn)} />
            <Fact label="Season" value={item.season} />
            <Fact label="Condition" value={item.condition} />
            {item.material ? <Fact label="Material" value={item.material} /> : null}
            {item.purchaseDate ? <Fact label="Bought" value={formatDate(item.purchaseDate)} /> : null}
            {item.purchasePrice ? <Fact label="Price" value={`$${item.purchasePrice}`} /> : null}
            {item.notes ? <Fact label="Notes" value={item.notes} /> : null}
          </dl>

          {outfitsWithItem.length ? (
            <div className="mt-6">
              <h2 className="label-caps mb-2">In these outfits</h2>
              <div className="flex flex-wrap gap-2">
                {outfitsWithItem.map((outfit) => (
                  <Link
                    key={outfit.id}
                    href="/outfits"
                    className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-4 text-[15px] font-medium transition-colors hover:border-line-strong"
                  >
                    {outfit.name}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {/* Secondary actions */}
          <div className="mt-8 flex flex-wrap gap-2.5">
            <Button
              variant="quiet"
              size="md"
              onClick={() => setEditOpen(true)}
              icon={<Pencil size={17} strokeWidth={2} />}
            >
              Edit Details
            </Button>
            <Button
              variant="quiet"
              size="md"
              onClick={() => setTripOpen(true)}
              icon={<Luggage size={17} strokeWidth={2} />}
            >
              Add to Trip
            </Button>
            <Button
              variant="quiet"
              size="md"
              onClick={() => {
                actions.toggleFavorite(item.id);
                toast(item.favorite ? "Removed from favorites" : "Added to favorites");
              }}
              icon={<Heart size={17} strokeWidth={2} className={item.favorite ? "fill-ink" : ""} />}
            >
              {item.favorite ? "Unfavorite" : "Favorite"}
            </Button>
            <Button
              variant="quiet"
              size="md"
              onClick={() => setDeleteOpen(true)}
              icon={<Trash2 size={17} strokeWidth={2} />}
              className="text-alert"
            >
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Move */}
      <Sheet
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        title="Where is it now?"
        description="Style List only suggests clothes that are with you."
      >
        <OptionList
          options={data.locations.map((location) => ({
            value: location.id,
            label: location.name,
            icon: <LocationIcon icon={location.icon} />,
            hint: plural(
              data.items.filter((entry) => entry.locationId === location.id).length,
              "item",
            ),
          }))}
          selected={[item.locationId]}
          onSelect={(value) => {
            actions.moveItem(item.id, value);
            setMoveOpen(false);
            toast(`Moved to ${data.locations.find((l) => l.id === value)?.name}`);
          }}
        />
      </Sheet>

      {/* Status */}
      <Sheet open={statusOpen} onClose={() => setStatusOpen(false)} title="Is it ready to wear?">
        <OptionList
          options={STATUSES.map((status) => ({ value: status, label: status }))}
          selected={[item.status]}
          onSelect={(value) => {
            actions.setStatus(item.id, value as Status);
            setStatusOpen(false);
            toast(`Marked ${value.toLowerCase()}`);
          }}
        />
      </Sheet>

      {/* Add to outfit */}
      <Sheet
        open={outfitOpen}
        onClose={() => setOutfitOpen(false)}
        title="Add to an outfit"
        description={
          data.outfits.length ? undefined : "You have no saved outfits yet. Create one with this item."
        }
      >
        {data.outfits.length ? (
          <OptionList
            options={data.outfits.map((outfit) => ({
              value: outfit.id,
              label: outfit.name,
              hint: describeOutfit(
                outfit.items
                  .map((entry) => data.items.find((i) => i.id === entry.itemId))
                  .filter((i): i is NonNullable<typeof i> => Boolean(i)),
              ),
              disabled: outfit.items.some((entry) => entry.itemId === item.id),
            }))}
            selected={outfitsWithItem.map((outfit) => outfit.id)}
            onSelect={(value) => {
              const outfit = data.outfits.find((entry) => entry.id === value);
              if (!outfit) return;
              const slot = SLOT_OF_CATEGORY[item.category];
              actions.updateOutfit(value, {
                items: [...outfit.items.filter((entry) => entry.slot !== slot), { itemId: item.id, slot }],
              });
              setOutfitOpen(false);
              toast(`Added to ${outfit.name}`);
            }}
          />
        ) : null}
        <button
          type="button"
          onClick={() => {
            const outfit = actions.saveOutfit(item.name, [
              { itemId: item.id, slot: SLOT_OF_CATEGORY[item.category] },
            ]);
            setOutfitOpen(false);
            toast(`Created "${outfit.name}"`);
          }}
          className="mt-2 flex min-h-14 w-full items-center rounded-[16px] border border-dashed border-line-strong px-4 text-[17px] font-medium text-accent transition-colors hover:bg-accent-soft"
        >
          + New outfit with this item
        </button>
      </Sheet>

      {/* Add to trip */}
      <Sheet
        open={tripOpen}
        onClose={() => setTripOpen(false)}
        title="Add to a trip"
        description={data.trips.length ? undefined : "You have no trips planned yet."}
      >
        {data.trips.length ? (
          <OptionList
            options={data.trips.map((trip) => ({
              value: trip.id,
              label: trip.destination,
              hint: `${plural(trip.days, "day")} · ${formatDate(trip.startDate)}`,
            }))}
            selected={data.trips
              .filter((trip) => trip.items.some((entry) => entry.itemId === item.id))
              .map((trip) => trip.id)}
            onSelect={(value) => {
              actions.addTripItem(value, item.id, "Added by you");
              setTripOpen(false);
              toast(`Added to ${data.trips.find((t) => t.id === value)?.destination}`);
            }}
          />
        ) : (
          <Link
            href="/trips"
            className="flex min-h-14 w-full items-center rounded-[16px] border border-dashed border-line-strong px-4 text-[17px] font-medium text-accent"
          >
            Plan a trip
          </Link>
        )}
      </Sheet>

      {/* Delete */}
      <Sheet
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={`Delete ${item.name}?`}
        description="This removes the item and its photos from Style List. It cannot be undone."
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
                actions.deleteItem(item.id);
                router.push("/closet");
                toast("Item deleted", "plain");
              }}
            >
              Delete
            </Button>
          </div>
        }
      >
        <div className="mx-auto h-40 w-40 rounded-[20px] bg-sunken p-4">
          <ItemImage item={item} />
        </div>
      </Sheet>

      {editOpen ? <EditItemSheet item={item} open onClose={() => setEditOpen(false)} /> : null}
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 px-4 py-3.5">
      <dt className="text-[15px] text-ink-soft">{label}</dt>
      <dd className="text-right text-[16px] font-medium">{value}</dd>
    </div>
  );
}
