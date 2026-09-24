/**
 * Style List - core data model.
 *
 * Everything the app knows about a person's wardrobe lives in these types.
 * They are kept plain and serialisable: the prototype persists them in the
 * browser, and the same shapes are what a Supabase/Postgres schema would
 * store later.
 */

export type ID = string;

/* ------------------------------------------------------------------ */
/* Clothing                                                            */
/* ------------------------------------------------------------------ */

/** The categories a person actually uses when talking about their clothes. */
export const CATEGORIES = [
  "T-Shirt",
  "Shirt",
  "Hoodie",
  "Sweater",
  "Jacket",
  "Coat",
  "Jeans",
  "Pants",
  "Sweatpants",
  "Shorts",
  "Shoes",
  "Hat",
  "Bag",
  "Other",
] as const;
export type Category = (typeof CATEGORIES)[number];

/** The five plain-English groups used by the big filter row in My Closet. */
export const CATEGORY_GROUPS = [
  "Tops",
  "Bottoms",
  "Shoes",
  "Outerwear",
  "Accessories",
] as const;
export type CategoryGroup = (typeof CATEGORY_GROUPS)[number];

export const CATEGORY_GROUP_OF: Record<Category, CategoryGroup> = {
  "T-Shirt": "Tops",
  Shirt: "Tops",
  Hoodie: "Tops",
  Sweater: "Tops",
  Jacket: "Outerwear",
  Coat: "Outerwear",
  Jeans: "Bottoms",
  Pants: "Bottoms",
  Sweatpants: "Bottoms",
  Shorts: "Bottoms",
  Shoes: "Shoes",
  Hat: "Accessories",
  Bag: "Accessories",
  Other: "Accessories",
};

/** Where an item sits in an outfit. One item per slot. */
export const OUTFIT_SLOTS = ["top", "bottom", "shoes", "layer", "accessory"] as const;
export type OutfitSlot = (typeof OUTFIT_SLOTS)[number];

export const SLOT_LABEL: Record<OutfitSlot, string> = {
  top: "Top",
  bottom: "Bottom",
  shoes: "Shoes",
  layer: "Layer",
  accessory: "Accessory",
};

export const SLOT_OF_CATEGORY: Record<Category, OutfitSlot> = {
  "T-Shirt": "top",
  Shirt: "top",
  Hoodie: "top",
  Sweater: "top",
  Jacket: "layer",
  Coat: "layer",
  Jeans: "bottom",
  Pants: "bottom",
  Sweatpants: "bottom",
  Shorts: "bottom",
  Shoes: "shoes",
  Hat: "accessory",
  Bag: "accessory",
  Other: "accessory",
};

/** Plain-English status. "Mark Dirty" sets an item to "Needs Washing". */
export const STATUSES = [
  "Clean",
  "Needs Washing",
  "Dry Cleaning",
  "Stained",
  "Needs Repair",
  "Packed",
  "Unavailable",
  "Missing",
] as const;
export type Status = (typeof STATUSES)[number];

/** Statuses that belong in the Laundry section. */
export const LAUNDRY_STATUSES: Status[] = [
  "Needs Washing",
  "Dry Cleaning",
  "Stained",
  "Needs Repair",
];

export const CONDITIONS = ["Like New", "Good", "Worn In", "Damaged"] as const;
export type Condition = (typeof CONDITIONS)[number];

export const SEASONS = ["All Year", "Spring", "Summer", "Fall", "Winter"] as const;
export type Season = (typeof SEASONS)[number];

export const PATTERNS = [
  "Solid",
  "Graphic",
  "Striped",
  "Plaid",
  "Logo",
  "Camo",
] as const;
export type Pattern = (typeof PATTERNS)[number];

export type ImageView = "front" | "back";

export type ProcessingStatus = "pending" | "processing" | "done" | "failed";

/** How a cleaned-up image was produced. Reported honestly in Settings. */
export type ImageProcessor = "on-device" | "remote" | "none";

export interface ClothingImage {
  id: ID;
  itemId: ID;
  view: ImageView;
  /** Key into the local photo store for the untouched camera photo. */
  originalKey: string;
  /** Key into the local photo store for the cleaned-up flat-lay image. */
  processedKey?: string;
  processingStatus: ProcessingStatus;
  processor: ImageProcessor;
  /** 0-1. How cleanly the processor found the garment. */
  confidence?: number;
  width?: number;
  height?: number;
  createdAt: string;
}

export interface ClothingItem {
  id: ID;
  name: string;
  category: Category;
  subcategory?: string;
  brand?: string;
  primaryColor: string;
  secondaryColor?: string;
  size?: string;
  pattern?: Pattern;
  material?: string;
  locationId: ID;
  status: Status;
  condition: Condition;
  favorite: boolean;
  season: Season;
  /** 1 (very light) to 5 (very warm). Drives weather-aware suggestions. */
  warmth: number;
  /** 1 (very casual) to 5 (formal). Drives "more dressed up" requests. */
  dressiness: number;
  timesWorn: number;
  lastWorn?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  notes?: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Places, outfits, history                                            */
/* ------------------------------------------------------------------ */

export interface Location {
  id: ID;
  name: string;
  /** One of the icon keys understood by components/ui/LocationIcon. */
  icon: string;
  /** Home base. New clothes default here. */
  isDefault?: boolean;
}

export interface OutfitItem {
  itemId: ID;
  slot: OutfitSlot;
}

export interface Outfit {
  id: ID;
  name: string;
  items: OutfitItem[];
  occasion?: string;
  favorite: boolean;
  timesWorn: number;
  lastWorn?: string;
  createdAt: string;
  notes?: string;
}

export interface WearHistoryEntry {
  id: ID;
  date: string;
  itemIds: ID[];
  outfitId?: ID;
  outfitName?: string;
  weatherNote?: string;
  /** Set once the person has answered "How are these clothes?". */
  reviewed?: boolean;
}

/* ------------------------------------------------------------------ */
/* Trips                                                               */
/* ------------------------------------------------------------------ */

export const TRIP_ACTIVITIES = [
  "Casual",
  "Dinner",
  "Beach",
  "Walking",
  "Work",
  "Event",
  "Going Out",
] as const;
export type TripActivity = (typeof TRIP_ACTIVITIES)[number];

export interface TripItem {
  itemId: ID;
  packed: boolean;
  /** Why the packing list included it, e.g. "For dinner". */
  reason?: string;
}

export interface Trip {
  id: ID;
  destination: string;
  startDate: string;
  days: number;
  activities: TripActivity[];
  /** The weather the person expects, used to weight the packing list. */
  expectedWeather: WeatherCondition;
  expectedTempC: number;
  items: TripItem[];
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Needs                                                               */
/* ------------------------------------------------------------------ */

export interface NeedItem {
  id: ID;
  title: string;
  kind: "Need" | "Want";
  category?: Category;
  note?: string;
  done: boolean;
  createdAt: string;
  /** True when Style List spotted the gap rather than the person adding it. */
  suggested?: boolean;
}

/* ------------------------------------------------------------------ */
/* Calendar (optional, prepared for a real integration)                */
/* ------------------------------------------------------------------ */

export const EVENT_TYPES = [
  "Dinner",
  "Wedding",
  "Concert",
  "Birthday",
  "Work",
  "Date",
  "Travel",
  "Party",
  "Graduation",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export interface CalendarEvent {
  id: ID;
  title: string;
  type: EventType;
  date: string;
  note?: string;
}

/* ------------------------------------------------------------------ */
/* Weather + profile                                                   */
/* ------------------------------------------------------------------ */

export const WEATHER_CONDITIONS = [
  "Sunny",
  "Cloudy",
  "Rain",
  "Snow",
  "Windy",
] as const;
export type WeatherCondition = (typeof WEATHER_CONDITIONS)[number];

export interface Weather {
  tempC: number;
  condition: WeatherCondition;
  /** Where the reading came from, so the UI never overstates it. */
  source: "manual" | "forecast";
  place?: string;
  updatedAt?: string;
}

export interface UserProfile {
  name: string;
  /** Where the person is right now - drives "can I wear this today?". */
  currentLocationId: ID;
  units: "C" | "F";
  weather: Weather;
  /** Photo key for the future Try It On feature. */
  tryOnPhotoKey?: string;
}

/* ------------------------------------------------------------------ */
/* The whole closet                                                    */
/* ------------------------------------------------------------------ */

export interface ClosetData {
  version: number;
  profile: UserProfile;
  locations: Location[];
  items: ClothingItem[];
  images: ClothingImage[];
  outfits: Outfit[];
  history: WearHistoryEntry[];
  trips: Trip[];
  needs: NeedItem[];
  events: CalendarEvent[];
  /** True until the person adds or removes something themselves. */
  usingSampleCloset: boolean;
}
