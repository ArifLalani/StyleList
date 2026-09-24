"use client";

import {
  ArrowRight,
  Bookmark,
  Check,
  Luggage,
  Shirt,
  Shuffle,
  Sparkles,
  WashingMachine,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { WeatherSheet } from "@/components/home/WeatherSheet";
import { OutfitFlatLay } from "@/components/outfit/OutfitFlatLay";
import { SaveOutfitSheet, WearReviewSheet } from "@/components/outfit/OutfitSheets";
import { SwapSheet } from "@/components/outfit/SwapSheet";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { CategoryArt } from "@/components/ui/ItemImage";
import { LocationIcon } from "@/components/ui/LocationIcon";
import { OptionList } from "@/components/ui/Select";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { emptyRequest } from "@/lib/ai/stylist";
import { laundryItems, pendingWearReview, useCloset } from "@/lib/store";
import type { OutfitSlot } from "@/lib/types";
import { SLOT_LABEL, SLOT_OF_CATEGORY } from "@/lib/types";
import { useOutfitBuilder } from "@/lib/useOutfitBuilder";
import { formatDate, plural, relativeDay } from "@/lib/utils";
import { weatherSentence } from "@/lib/weather";

/**
 * Home answers one question: what should I wear today?
 *
 * The answer is on screen before anything is tapped, made of clothes that are
 * clean and in the same place as the person.
 */

export default function HomePage() {
  const router = useRouter();
  const toast = useToast();
  const { data, actions, ready } = useCloset();

  const request = useMemo(() => emptyRequest(), []);
  const builder = useOutfitBuilder(request);

  const [ask, setAsk] = useState("");
  const [weatherOpen, setWeatherOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  const [swapSlot, setSwapSlot] = useState<OutfitSlot | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const here = data.locations.find((l) => l.id === data.profile.currentLocationId);
  const laundry = laundryItems(data);
  const review = pendingWearReview(data);
  const nextTrip = [...data.trips].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  )[0];
  const readyHere = data.items.filter(
    (item) => item.status === "Clean" && item.locationId === data.profile.currentLocationId,
  ).length;

  if (!ready) return <HomeSkeleton />;

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  })();

  const hasOutfit = builder.items.length >= 2;

  return (
    <>
      {/* Greeting */}
      <header className="mb-6">
        <p className="text-[15px] font-medium text-ink-mute">
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <h1 className="mt-1 text-[32px] leading-tight font-semibold tracking-[-0.03em] sm:text-[40px]">
          {greeting}
        </h1>

        <div className="mt-4 flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => setWeatherOpen(true)}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-[15px] font-medium transition-colors hover:border-line-strong"
          >
            {weatherSentence(data.profile.weather, data.profile.units)}
          </button>
          <button
            type="button"
            onClick={() => setLocationOpen(true)}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-[15px] font-medium transition-colors hover:border-line-strong"
          >
            <LocationIcon icon={here?.icon} size={16} className="text-ink-soft" />
            At {here?.name ?? "home"}
          </button>
        </div>
      </header>

      {/* Laundry answer from yesterday */}
      {review ? (
        <section className="mb-6 rounded-[22px] border border-line bg-accent-soft p-5">
          <h2 className="text-[19px] font-semibold tracking-[-0.02em]">How are these clothes?</h2>
          <p className="mt-1 text-[15px] text-ink-soft">
            You wore {plural(review.itemIds.length, "piece")}{" "}
            {relativeDay(review.date).toLowerCase()}. Tell Style List what needs washing.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button size="md" onClick={() => setReviewOpen(true)}>
              Answer Now
            </Button>
            <Button
              variant="quiet"
              size="md"
              onClick={() => actions.reviewWear(review.id, {})}
            >
              All still clean
            </Button>
          </div>
        </section>
      ) : null}

      {/* Today's outfit */}
      <section className="card-surface p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-[26px] leading-tight font-semibold tracking-[-0.025em] sm:text-[30px]">
            What should I wear today?
          </h2>
        </div>

        {data.items.length === 0 ? (
          <EmptyState
            className="mt-5 border-0 bg-transparent py-8"
            title="Add some clothes first"
            description="Style List builds outfits from what you actually own. Add a few pieces and it will start suggesting."
            art={<CategoryArt category="Hoodie" />}
            action={<ButtonLink href="/add">Add Clothes</ButtonLink>}
          />
        ) : !hasOutfit ? (
          <div className="mt-5 rounded-[18px] bg-sunken p-6">
            <p className="text-[17px] font-medium">Not enough clean clothes here right now.</p>
            <p className="mt-1.5 text-[15px] text-ink-soft">
              {laundry.length
                ? `${plural(laundry.length, "piece")} in the wash. Mark something clean, or look at everything you own.`
                : "Try switching to another location, or add more clothes."}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <ButtonLink href="/laundry" size="md" variant="secondary">
                Open Laundry
              </ButtonLink>
              <ButtonLink href="/closet" size="md" variant="quiet">
                See My Closet
              </ButtonLink>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-5">
              <OutfitFlatLay slots={builder.slots} onSlotTap={(slot) => setSwapSlot(slot)} />
            </div>

            {builder.reasons.length ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {builder.reasons.map((reason) => (
                  <span
                    key={reason}
                    className="inline-flex items-center gap-1.5 rounded-full bg-sunken px-3 py-1.5 text-[14px] text-ink-soft"
                  >
                    <Sparkles size={14} strokeWidth={2} className="text-ink-mute" />
                    {reason}
                  </span>
                ))}
              </div>
            ) : null}

            {builder.gaps.length ? (
              <div className="mt-4 rounded-[16px] bg-warn-soft px-4 py-3">
                <p className="text-[14px] font-semibold text-warn">You may need</p>
                {builder.gaps.map((gap) => (
                  <p key={gap.slot} className="mt-0.5 text-[15px] text-ink-soft">
                    {gap.message}
                  </p>
                ))}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                className="sm:flex-1"
                icon={<Check size={20} strokeWidth={2.4} />}
                onClick={() => {
                  actions.wear(builder.items.map((item) => item.id));
                  builder.reset();
                  toast("Nice. Have a good day.");
                }}
              >
                Wear This
              </Button>
              <Button variant="secondary" size="lg" onClick={() => setChangeOpen(true)}>
                Change Something
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={builder.shuffle}
                icon={<Shuffle size={18} strokeWidth={2} />}
              >
                Shuffle
              </Button>
              <Button
                variant="quiet"
                size="lg"
                onClick={() => setSaveOpen(true)}
                icon={<Bookmark size={18} strokeWidth={2} />}
              >
                Save
              </Button>
            </div>
          </>
        )}
      </section>

      {/* Ask */}
      <section className="mt-5">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            router.push(`/what-to-wear?q=${encodeURIComponent(ask)}`);
          }}
          className="flex min-h-16 items-center gap-3 rounded-[20px] border border-line bg-surface px-4 transition-colors focus-within:border-ink"
        >
          <Sparkles size={20} strokeWidth={2} className="shrink-0 text-ink-mute" />
          <input
            value={ask}
            onChange={(event) => setAsk(event.target.value)}
            placeholder="What do you feel like wearing?"
            aria-label="What do you feel like wearing?"
            className="w-full bg-transparent py-4 text-[17px] outline-none"
          />
          <button
            type="submit"
            aria-label="Build an outfit"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-white transition-transform active:scale-95"
          >
            <ArrowRight size={19} strokeWidth={2.4} />
          </button>
        </form>
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
          {["Something comfortable", "All black", "Casual for dinner", "I want to wear a hoodie"].map(
            (prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => router.push(`/what-to-wear?q=${encodeURIComponent(prompt)}`)}
                className="min-h-11 shrink-0 rounded-full border border-line bg-surface px-4 text-[15px] text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
              >
                {prompt}
              </button>
            ),
          )}
        </div>
      </section>

      {/* At a glance */}
      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <GlanceCard
          href="/closet"
          icon={<Shirt size={19} strokeWidth={2} />}
          value={String(readyHere)}
          label={`ready to wear at ${here?.name ?? "home"}`}
        />
        <GlanceCard
          href="/laundry"
          icon={<WashingMachine size={19} strokeWidth={2} />}
          value={String(laundry.length)}
          label={laundry.length === 1 ? "piece in the wash" : "pieces in the wash"}
        />
        <GlanceCard
          href="/trips"
          icon={<Luggage size={19} strokeWidth={2} />}
          value={nextTrip ? nextTrip.destination : "None"}
          label={nextTrip ? `trip on ${formatDate(nextTrip.startDate)}` : "trips planned"}
        />
      </section>

      {/* Sheets */}
      <WeatherSheet open={weatherOpen} onClose={() => setWeatherOpen(false)} />

      <Sheet
        open={locationOpen}
        onClose={() => setLocationOpen(false)}
        title="Where are you right now?"
        description="Style List suggests clothes that are in the same place as you."
      >
        <OptionList
          options={data.locations.map((location) => ({
            value: location.id,
            label: location.name,
            icon: <LocationIcon icon={location.icon} />,
            hint: plural(
              data.items.filter((item) => item.locationId === location.id && item.status === "Clean")
                .length,
              "clean item",
            ),
          }))}
          selected={[data.profile.currentLocationId]}
          onSelect={(value) => {
            actions.updateProfile({ currentLocationId: value });
            setLocationOpen(false);
            builder.reset();
          }}
        />
      </Sheet>

      <Sheet
        open={changeOpen}
        onClose={() => setChangeOpen(false)}
        title="What would you like to change?"
      >
        <OptionList
          options={(["top", "bottom", "shoes", "layer", "accessory"] as OutfitSlot[]).map((slot) => ({
            value: slot,
            label: builder.slots[slot]
              ? `Different ${SLOT_LABEL[slot].toLowerCase()}`
              : `Add a ${SLOT_LABEL[slot].toLowerCase()}`,
            hint: builder.slots[slot]?.name,
          }))}
          selected={[]}
          onSelect={(value) => {
            setChangeOpen(false);
            setSwapSlot(value as OutfitSlot);
          }}
        />
      </Sheet>

      <SwapSheet
        open={Boolean(swapSlot)}
        onClose={() => setSwapSlot(null)}
        slot={swapSlot}
        currentId={swapSlot ? builder.slots[swapSlot]?.id : undefined}
        options={swapSlot ? builder.alternativesFor(swapSlot) : []}
        onPick={(item) => builder.swap(SLOT_OF_CATEGORY[item.category], item)}
        onRemove={() => swapSlot && builder.remove(swapSlot)}
      />

      {/* Mounted only while open, so each sheet starts fresh. */}
      {saveOpen ? (
        <SaveOutfitSheet
          open
          onClose={() => setSaveOpen(false)}
          items={builder.items}
          onSave={(name) => {
            actions.saveOutfit(
              name,
              builder.items.map((item) => ({
                itemId: item.id,
                slot: SLOT_OF_CATEGORY[item.category],
              })),
            );
            toast(`Saved "${name}"`);
          }}
        />
      ) : null}

      {review && reviewOpen ? (
        <WearReviewSheet
          open
          onClose={() => setReviewOpen(false)}
          itemIds={review.itemIds}
          onDone={(statuses) => {
            actions.reviewWear(review.id, statuses);
            toast("Thanks - your closet is up to date");
          }}
        />
      ) : null}
    </>
  );
}

function GlanceCard({
  href,
  icon,
  value,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="card-surface flex items-center gap-4 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sunken text-ink-soft">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[20px] font-semibold tracking-[-0.02em]">{value}</span>
        <span className="block truncate text-[14px] text-ink-soft">{label}</span>
      </span>
    </Link>
  );
}

function HomeSkeleton() {
  return (
    <div className="animate-[fade-in_0.3s_ease-out_both]">
      <div className="h-6 w-40 rounded-lg bg-sunken" />
      <div className="mt-3 h-11 w-64 rounded-xl bg-sunken" />
      <div className="mt-8 h-[420px] rounded-[22px] bg-sunken" />
    </div>
  );
}
