"use client";

import {
  Box,
  Building2,
  Car,
  Heart,
  Home,
  Luggage,
  MapPin,
  Package,
  Warehouse,
} from "lucide-react";
import type { ComponentType } from "react";

/** Locations are personal, so the icon set stays human: homes, cars, bags. */
const ICONS: Record<string, ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  apartment: Building2,
  home: Home,
  heart: Heart,
  car: Car,
  box: Box,
  storage: Warehouse,
  suitcase: Luggage,
  package: Package,
  pin: MapPin,
};

export const LOCATION_ICON_KEYS = Object.keys(ICONS);

export function LocationIcon({
  icon,
  size = 20,
  className,
}: {
  icon?: string;
  size?: number;
  className?: string;
}) {
  const Component = ICONS[icon ?? "pin"] ?? MapPin;
  return <Component size={size} strokeWidth={1.9} className={className} />;
}
