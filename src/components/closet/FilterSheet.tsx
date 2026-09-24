"use client";

import { Button } from "@/components/ui/Button";
import { OptionList, type SelectOption } from "@/components/ui/Select";
import { Sheet } from "@/components/ui/Sheet";
import { LocationIcon } from "@/components/ui/LocationIcon";
import { COLORS, colorHex } from "@/lib/colors";
import { useCloset } from "@/lib/store";
import type { CategoryGroup, ClothingItem, Season, Status } from "@/lib/types";
import { SEASONS, STATUSES } from "@/lib/types";
import { daysSince, plural } from "@/lib/utils";

/**
 * The detailed filters, kept out of the way until asked for. My Closet shows
 * six large category buttons by default; everything finer lives in here, one
 * clear list per question.
 */

export type ClosetFlag = "favorites" | "never-worn" | "recently-worn";

export interface ClosetFilters {
  group: CategoryGroup | "All";
  search: string;
  locationIds: string[];
  colors: string[];
  brands: string[];
  statuses: Status[];
  seasons: Season[];
  flags: ClosetFlag[];
}

export const EMPTY_FILTERS: ClosetFilters = {
  group: "All",
  search: "",
  locationIds: [],
  colors: [],
  brands: [],
  statuses: [],
  seasons: [],
  flags: [],
};

export function countActiveFilters(filters: ClosetFilters): number {
  return (
    filters.locationIds.length +
    filters.colors.length +
    filters.brands.length +
    filters.statuses.length +
    filters.seasons.length +
    filters.flags.length
  );
}

export function applyFilters(items: ClothingItem[], filters: ClosetFilters, groupOf: (item: ClothingItem) => CategoryGroup): ClothingItem[] {
  const search = filters.search.trim().toLowerCase();
  return items.filter((item) => {
    if (filters.group !== "All" && groupOf(item) !== filters.group) return false;
    if (search) {
      const haystack = [
        item.name,
        item.brand,
        item.category,
        item.primaryColor,
        item.secondaryColor,
        item.subcategory,
        item.material,
        item.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    if (filters.locationIds.length && !filters.locationIds.includes(item.locationId)) return false;
    if (filters.colors.length && !filters.colors.includes(item.primaryColor)) return false;
    if (filters.brands.length && !filters.brands.includes(item.brand ?? "")) return false;
    if (filters.statuses.length && !filters.statuses.includes(item.status)) return false;
    if (filters.seasons.length && !filters.seasons.includes(item.season)) return false;
    for (const flag of filters.flags) {
      if (flag === "favorites" && !item.favorite) return false;
      if (flag === "never-worn" && item.timesWorn > 0) return false;
      if (flag === "recently-worn" && daysSince(item.lastWorn) > 14) return false;
    }
    return true;
  });
}

const FLAG_OPTIONS: SelectOption[] = [
  { value: "favorites", label: "Favorites" },
  { value: "recently-worn", label: "Worn in the last two weeks" },
  { value: "never-worn", label: "Never worn" },
];

export function FilterSheet({
  open,
  onClose,
  filters,
  onChange,
  resultCount,
}: {
  open: boolean;
  onClose: () => void;
  filters: ClosetFilters;
  onChange: (filters: ClosetFilters) => void;
  resultCount: number;
}) {
  const { data } = useCloset();

  const brands = [...new Set(data.items.map((item) => item.brand).filter(Boolean))].sort() as string[];
  const usedColors = new Set(data.items.map((item) => item.primaryColor));

  const toggle = <T extends string>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Filter my clothes"
      size="wide"
      footer={
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={() => onChange({ ...EMPTY_FILTERS, group: filters.group, search: filters.search })}
          >
            Clear all
          </Button>
          <Button size="md" className="flex-1" onClick={onClose}>
            Show {plural(resultCount, "item")}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-7">
        <FilterBlock title="Where it is">
          <OptionList
            options={data.locations.map((location) => ({
              value: location.id,
              label: location.name,
              icon: <LocationIcon icon={location.icon} />,
              hint: plural(
                data.items.filter((item) => item.locationId === location.id).length,
                "item",
              ),
            }))}
            selected={filters.locationIds}
            onSelect={(value) => onChange({ ...filters, locationIds: toggle(filters.locationIds, value) })}
          />
        </FilterBlock>

        <FilterBlock title="Colour">
          <OptionList
            options={COLORS.filter((color) => usedColors.has(color.name)).map((color) => ({
              value: color.name,
              label: color.name,
              swatch: colorHex(color.name),
            }))}
            selected={filters.colors}
            onSelect={(value) => onChange({ ...filters, colors: toggle(filters.colors, value) })}
          />
        </FilterBlock>

        {brands.length ? (
          <FilterBlock title="Brand">
            <OptionList
              options={brands.map((brand) => ({ value: brand, label: brand }))}
              selected={filters.brands}
              onSelect={(value) => onChange({ ...filters, brands: toggle(filters.brands, value) })}
            />
          </FilterBlock>
        ) : null}

        <FilterBlock title="Ready to wear">
          <OptionList
            options={STATUSES.filter((status) =>
              data.items.some((item) => item.status === status),
            ).map((status) => ({ value: status, label: status }))}
            selected={filters.statuses}
            onSelect={(value) =>
              onChange({ ...filters, statuses: toggle(filters.statuses, value as Status) })
            }
          />
        </FilterBlock>

        <FilterBlock title="Season">
          <OptionList
            options={SEASONS.map((season) => ({ value: season, label: season }))}
            selected={filters.seasons}
            onSelect={(value) =>
              onChange({ ...filters, seasons: toggle(filters.seasons, value as Season) })
            }
          />
        </FilterBlock>

        <FilterBlock title="More">
          <OptionList
            options={FLAG_OPTIONS}
            selected={filters.flags}
            onSelect={(value) =>
              onChange({ ...filters, flags: toggle(filters.flags, value as ClosetFlag) })
            }
          />
        </FilterBlock>
      </div>
    </Sheet>
  );
}

function FilterBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="label-caps mb-2">{title}</h3>
      {children}
    </section>
  );
}
