"use client";

import {
  ChevronRight,
  Grid2x2,
  Heart,
  Luggage,
  Settings,
  Sparkles,
  WashingMachine,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/AppShell";
import { laundryItems, useCloset } from "@/lib/store";
import { plural } from "@/lib/utils";

/** Everything that does not fit on the phone's bottom bar, in one plain list. */
export default function MorePage() {
  const { data, ready } = useCloset();
  const laundry = ready ? laundryItems(data).length : 0;
  const here = data.locations.find((l) => l.id === data.profile.currentLocationId);

  return (
    <>
      <PageHeader title="More" subtitle={here ? `You are at ${here.name}` : undefined} />

      <div className="flex flex-col gap-2.5">
        <MoreLink
          href="/what-to-wear"
          icon={<Sparkles size={21} strokeWidth={1.9} />}
          title="What to Wear"
          hint="Ask for an outfit in your own words"
        />
        <MoreLink
          href="/trips"
          icon={<Luggage size={21} strokeWidth={1.9} />}
          title="Trips"
          hint={data.trips.length ? plural(data.trips.length, "trip") + " planned" : "Plan a trip"}
        />
        <MoreLink
          href="/laundry"
          icon={<WashingMachine size={21} strokeWidth={1.9} />}
          title="Laundry"
          hint={laundry ? `${plural(laundry, "piece")} to deal with` : "Nothing needs washing"}
        />
        <MoreLink
          href="/needs"
          icon={<Heart size={21} strokeWidth={1.9} />}
          title="Needs"
          hint="Gaps worth filling"
        />
        <MoreLink
          href="/try-it-on"
          icon={<Grid2x2 size={21} strokeWidth={1.9} />}
          title="Try It On"
          hint="See an outfit on you"
        />
        <MoreLink
          href="/settings"
          icon={<Settings size={21} strokeWidth={1.9} />}
          title="Settings"
          hint="Locations, weather, your closet data"
        />
      </div>
    </>
  );
}

function MoreLink({
  href,
  icon,
  title,
  hint,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-18 items-center gap-4 rounded-[20px] border border-line bg-surface px-4 py-3.5 transition-colors hover:border-line-strong hover:bg-[#fcfbfa]"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sunken text-ink-soft">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] font-medium">{title}</span>
        <span className="mt-0.5 block truncate text-[14px] text-ink-soft">{hint}</span>
      </span>
      <ChevronRight size={20} strokeWidth={2.2} className="shrink-0 text-ink-mute" />
    </Link>
  );
}
