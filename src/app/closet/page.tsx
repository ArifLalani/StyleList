"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { ClosetGrid, ClothingCard } from "@/components/closet/ClothingCard";
import {
  applyFilters,
  countActiveFilters,
  EMPTY_FILTERS,
  FilterSheet,
  type ClosetFilters,
} from "@/components/closet/FilterSheet";
import { PageHeader } from "@/components/layout/AppShell";
import { ButtonLink, Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Controls";
import { EmptyState } from "@/components/ui/EmptyState";
import { CategoryArt } from "@/components/ui/ItemImage";
import { useCloset } from "@/lib/store";
import { CATEGORY_GROUP_OF, CATEGORY_GROUPS, type CategoryGroup } from "@/lib/types";
import { plural } from "@/lib/utils";

/**
 * My Closet - the heart of the app.
 *
 * A search box, six large category buttons, and pictures. Everything more
 * specific waits behind one clearly labelled Filters button.
 */

const GROUPS: (CategoryGroup | "All")[] = ["All", ...CATEGORY_GROUPS];

export default function ClosetPage() {
  const { data, ready } = useCloset();
  const [filters, setFilters] = useState<ClosetFilters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const visible = useMemo(
    () => applyFilters(data.items, filters, (item) => CATEGORY_GROUP_OF[item.category]),
    [data.items, filters],
  );

  const activeCount = countActiveFilters(filters);
  const locationName = (id: string) => data.locations.find((l) => l.id === id)?.name ?? "Unknown";

  if (!ready) return <ClosetSkeleton />;

  return (
    <>
      <PageHeader
        title="My Closet"
        subtitle={
          data.items.length
            ? `${plural(data.items.length, "item")} · ${
                data.items.filter((item) => item.status === "Clean").length
              } ready to wear`
            : undefined
        }
        action={
          <ButtonLink href="/add" size="md">
            Add Clothes
          </ButtonLink>
        }
      />

      {data.items.length === 0 ? (
        <EmptyState
          title="Your closet is empty"
          description="Start by adding your first piece of clothing. Take a photo of the front and the back, and Style List does the rest."
          art={<CategoryArt category="Hoodie" />}
          action={
            <ButtonLink href="/add" size="lg">
              Add Clothes
            </ButtonLink>
          }
        />
      ) : (
        <>
          {/* Search */}
          <div className="flex items-center gap-3">
            <div className="flex min-h-14 flex-1 items-center gap-3 rounded-[18px] border border-line bg-surface px-4 transition-colors focus-within:border-ink">
              <Search size={20} strokeWidth={2} className="shrink-0 text-ink-mute" />
              <input
                value={filters.search}
                onChange={(event) => setFilters({ ...filters, search: event.target.value })}
                placeholder="Search my clothes"
                aria-label="Search my clothes"
                className="w-full bg-transparent py-3 text-[17px] outline-none"
              />
              {filters.search ? (
                <button
                  type="button"
                  onClick={() => setFilters({ ...filters, search: "" })}
                  aria-label="Clear search"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-mute hover:bg-sunken"
                >
                  <X size={18} strokeWidth={2.4} />
                </button>
              ) : null}
            </div>

            <Button
              variant={activeCount ? "primary" : "secondary"}
              size="lg"
              onClick={() => setFiltersOpen(true)}
              icon={<SlidersHorizontal size={19} strokeWidth={2} />}
              className="shrink-0 px-5"
            >
              <span className="hidden sm:inline">Filters</span>
              {activeCount ? <span className="sm:ml-1">({activeCount})</span> : null}
            </Button>
          </div>

          {/* Category rail */}
          <div className="no-scrollbar -mx-5 mt-4 flex gap-2.5 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0">
            {GROUPS.map((group) => (
              <Chip
                key={group}
                active={filters.group === group}
                onClick={() => setFilters({ ...filters, group })}
              >
                {group}
              </Chip>
            ))}
          </div>

          {/* Active filters */}
          {activeCount > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {filters.locationIds.map((id) => (
                <Chip
                  key={id}
                  onRemove={() =>
                    setFilters({
                      ...filters,
                      locationIds: filters.locationIds.filter((entry) => entry !== id),
                    })
                  }
                >
                  {locationName(id)}
                </Chip>
              ))}
              {filters.colors.map((color) => (
                <Chip
                  key={color}
                  onRemove={() =>
                    setFilters({ ...filters, colors: filters.colors.filter((c) => c !== color) })
                  }
                >
                  {color}
                </Chip>
              ))}
              {filters.brands.map((brand) => (
                <Chip
                  key={brand}
                  onRemove={() =>
                    setFilters({ ...filters, brands: filters.brands.filter((b) => b !== brand) })
                  }
                >
                  {brand}
                </Chip>
              ))}
              {filters.statuses.map((status) => (
                <Chip
                  key={status}
                  onRemove={() =>
                    setFilters({
                      ...filters,
                      statuses: filters.statuses.filter((s) => s !== status),
                    })
                  }
                >
                  {status}
                </Chip>
              ))}
              {filters.seasons.map((season) => (
                <Chip
                  key={season}
                  onRemove={() =>
                    setFilters({ ...filters, seasons: filters.seasons.filter((s) => s !== season) })
                  }
                >
                  {season}
                </Chip>
              ))}
              {filters.flags.map((flag) => (
                <Chip
                  key={flag}
                  onRemove={() =>
                    setFilters({ ...filters, flags: filters.flags.filter((f) => f !== flag) })
                  }
                >
                  {flag === "favorites"
                    ? "Favorites"
                    : flag === "never-worn"
                      ? "Never worn"
                      : "Recently worn"}
                </Chip>
              ))}
            </div>
          ) : null}

          {/* Grid */}
          <div className="mt-6">
            {visible.length === 0 ? (
              <EmptyState
                title="Nothing matches"
                description="Try a different category, or clear the filters to see everything in your closet."
                action={
                  <Button
                    variant="secondary"
                    onClick={() => setFilters({ ...EMPTY_FILTERS })}
                  >
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <>
                <p className="mb-4 text-[15px] text-ink-mute">
                  {plural(visible.length, "item")}
                </p>
                <ClosetGrid>
                  {visible.map((item) => (
                    <ClothingCard key={item.id} item={item} />
                  ))}
                </ClosetGrid>
              </>
            )}
          </div>
        </>
      )}

      <FilterSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        onChange={setFilters}
        resultCount={visible.length}
      />
    </>
  );
}

function ClosetSkeleton() {
  return (
    <div className="animate-[fade-in_0.3s_ease-out_both]">
      <div className="mb-7 h-10 w-52 rounded-xl bg-sunken" />
      <div className="h-14 rounded-[18px] bg-sunken" />
      <div className="mt-4 flex gap-2.5">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-11 w-24 rounded-full bg-sunken" />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }, (_, index) => (
          <div key={index} className="aspect-[4/5] rounded-[22px] bg-sunken" />
        ))}
      </div>
    </div>
  );
}
