"use client";

import {
  Grid2x2,
  Heart,
  House,
  LayoutGrid,
  Luggage,
  MoreHorizontal,
  Plus,
  Settings,
  ShirtIcon,
  Sparkles,
  WashingMachine,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { laundryItems, useCloset } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * The frame.
 *
 * Desktop gets a calm sidebar with room to breathe. Phones get five big
 * targets along the bottom with Add raised in the middle, because adding
 * clothes is the thing people do standing up with one hand.
 *
 * The camera flow takes over the whole screen, so the frame steps out of the
 * way there entirely.
 */

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

const PRIMARY: NavItem[] = [
  { href: "/", label: "Home", icon: <House size={21} strokeWidth={1.9} /> },
  { href: "/closet", label: "My Closet", icon: <LayoutGrid size={21} strokeWidth={1.9} /> },
  { href: "/what-to-wear", label: "What to Wear", icon: <Sparkles size={21} strokeWidth={1.9} /> },
  { href: "/outfits", label: "Outfits", icon: <ShirtIcon size={21} strokeWidth={1.9} /> },
  { href: "/trips", label: "Trips", icon: <Luggage size={21} strokeWidth={1.9} /> },
  { href: "/laundry", label: "Laundry", icon: <WashingMachine size={21} strokeWidth={1.9} /> },
  { href: "/needs", label: "Needs", icon: <Heart size={21} strokeWidth={1.9} /> },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data } = useCloset();
  const laundryCount = laundryItems(data).length;

  /* The add flow is a full-screen experience of its own. */
  if (pathname.startsWith("/add")) return <>{children}</>;

  return (
    <div className="min-h-dvh">
      <Sidebar pathname={pathname} laundryCount={laundryCount} />

      <main className="lg:pl-[268px]">
        <div className="mx-auto w-full max-w-[1200px] px-5 pt-6 pb-32 sm:px-8 lg:pt-10 lg:pb-16">
          {children}
        </div>
      </main>

      <BottomNav pathname={pathname} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Desktop                                                             */
/* ------------------------------------------------------------------ */

function Sidebar({ pathname, laundryCount }: { pathname: string; laundryCount: number }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[268px] flex-col border-r border-line bg-surface px-5 py-7 lg:flex">
      <Link href="/" className="px-2 text-[25px] leading-none tracking-[-0.01em] text-display">
        Style List
      </Link>

      <Link
        href="/add"
        className={cn(
          "mt-7 flex min-h-13 items-center justify-center gap-2 rounded-[16px] bg-ink px-5 py-3.5",
          "text-[16px] font-medium text-white transition-transform duration-150 active:scale-[0.985] hover:bg-[#25262b]",
        )}
      >
        <Plus size={20} strokeWidth={2.4} />
        Add Clothes
      </Link>

      <nav className="mt-7 flex flex-1 flex-col gap-1">
        {PRIMARY.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={isActive(pathname, item.href)}
            badge={item.href === "/laundry" && laundryCount > 0 ? laundryCount : undefined}
          />
        ))}
      </nav>

      <div className="flex flex-col gap-1 border-t border-line pt-4">
        <SidebarLink
          item={{ href: "/try-it-on", label: "Try It On", icon: <Grid2x2 size={21} strokeWidth={1.9} /> }}
          active={isActive(pathname, "/try-it-on")}
        />
        <SidebarLink
          item={{ href: "/settings", label: "Settings", icon: <Settings size={21} strokeWidth={1.9} /> }}
          active={isActive(pathname, "/settings")}
        />
      </div>
    </aside>
  );
}

function SidebarLink({
  item,
  active,
  badge,
}: {
  item: NavItem;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex min-h-12 items-center gap-3.5 rounded-[14px] px-3.5 text-[16px] transition-colors duration-150",
        active
          ? "bg-sunken font-semibold text-ink"
          : "font-medium text-ink-soft hover:bg-[#f7f6f4] hover:text-ink",
      )}
    >
      <span className={cn(active ? "text-ink" : "text-ink-mute")}>{item.icon}</span>
      <span className="flex-1">{item.label}</span>
      {badge ? (
        <span className="rounded-full bg-warn-soft px-2 py-0.5 text-[12px] font-semibold text-warn">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Mobile                                                              */
/* ------------------------------------------------------------------ */

const MOBILE: NavItem[] = [
  { href: "/", label: "Home", icon: <House size={23} strokeWidth={1.9} /> },
  { href: "/closet", label: "Closet", icon: <LayoutGrid size={23} strokeWidth={1.9} /> },
  { href: "/outfits", label: "Outfits", icon: <ShirtIcon size={23} strokeWidth={1.9} /> },
  { href: "/more", label: "More", icon: <MoreHorizontal size={23} strokeWidth={1.9} /> },
];

function BottomNav({ pathname }: { pathname: string }) {
  const [first, second, third, fourth] = MOBILE;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/92 backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-between px-2 pt-1.5 pb-safe">
        <MobileLink item={first} active={isActive(pathname, first.href)} />
        <MobileLink item={second} active={isActive(pathname, second.href)} />

        <Link
          href="/add"
          className="flex w-[74px] flex-col items-center justify-center gap-1 pb-2"
          aria-label="Add Clothes"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink text-white shadow-[0_6px_18px_rgba(20,20,24,0.3)] transition-transform duration-150 active:scale-95">
            <Plus size={26} strokeWidth={2.5} />
          </span>
          <span className="text-[11px] font-semibold text-ink">Add</span>
        </Link>

        <MobileLink item={third} active={isActive(pathname, third.href)} />
        <MobileLink item={fourth} active={isActive(pathname, fourth.href)} />
      </div>
    </nav>
  );
}

function MobileLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex w-[74px] flex-col items-center justify-center gap-1 rounded-[14px] pt-2 pb-2 transition-colors",
        active ? "text-ink" : "text-ink-mute",
      )}
    >
      {item.icon}
      <span className={cn("text-[11px]", active ? "font-semibold" : "font-medium")}>
        {item.label}
      </span>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Page heading                                                        */
/* ------------------------------------------------------------------ */

export function PageHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-6 flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <h1 className="text-[32px] leading-tight font-semibold tracking-[-0.03em] sm:text-[38px]">
          {title}
        </h1>
        {subtitle ? <p className="mt-1.5 text-[16px] text-ink-soft">{subtitle}</p> : null}
      </div>
      {action ? <div className="hidden shrink-0 sm:block">{action}</div> : null}
    </header>
  );
}
