import { colorHarmony, colorOption } from "@/lib/colors";
import type {
  Category,
  ClosetData,
  ClothingItem,
  ID,
  OutfitSlot,
  TripActivity,
  Weather,
} from "@/lib/types";
import { CATEGORIES, SLOT_LABEL, SLOT_OF_CATEGORY } from "@/lib/types";
import { currentSeason, daysSince, hashString } from "@/lib/utils";

/**
 * The stylist.
 *
 * Everything here works from clothes the person actually owns. It reads the
 * closet, the weather, where the person is standing, what is clean and what
 * they wore recently, then scores real items against the request. Nothing is
 * invented: when a slot genuinely cannot be filled it is reported as a gap
 * ("You may need...") rather than quietly suggesting something imaginary.
 */

/* ------------------------------------------------------------------ */
/* Requests                                                            */
/* ------------------------------------------------------------------ */

export interface StyleRequest {
  /** What the person typed, kept so the UI can echo it back. */
  text?: string;
  /** Items that must appear - "build something around my grey sweats". */
  includeItemIds: ID[];
  /** Categories to avoid - "I don't feel like wearing jeans". */
  excludeCategories: Category[];
  /** Categories asked for - "I want to wear a hoodie". */
  requireCategories: Category[];
  /** Colours asked for - "all black". */
  requireColors: string[];
  /** 1 very casual to 5 formal. Undefined means "whatever suits the day". */
  formality?: number;
  /** Force a jacket or coat into the outfit. */
  wantsLayer?: boolean;
  /** Only use clothes at the place the person is right now. */
  onlyHere: boolean;
  occasion?: string;
}

export function emptyRequest(): StyleRequest {
  return {
    includeItemIds: [],
    excludeCategories: [],
    requireCategories: [],
    requireColors: [],
    onlyHere: true,
  };
}

const CATEGORY_WORDS: [RegExp, Category][] = [
  [/\b(t-?shirts?|tees?)\b/, "T-Shirt"],
  [/\b(button[- ]?ups?|dress shirts?|shirts?)\b/, "Shirt"],
  [/\b(hoodies?|hoody)\b/, "Hoodie"],
  [/\b(sweaters?|jumpers?|knits?)\b/, "Sweater"],
  [/\b(jackets?)\b/, "Jacket"],
  [/\b(coats?|overcoats?|parkas?)\b/, "Coat"],
  [/\b(jeans|denim pants)\b/, "Jeans"],
  [/\b(sweat ?pants|sweats|joggers|track ?pants)\b/, "Sweatpants"],
  [/\b(pants|trousers|chinos|cargos?)\b/, "Pants"],
  [/\b(shorts)\b/, "Shorts"],
  [/\b(shoes|sneakers|trainers|runners|loafers|boots|air ?forces?|af1s?)\b/, "Shoes"],
  [/\b(caps?|hats?|beanies?)\b/, "Hat"],
  [/\b(bags?|backpacks?|totes?)\b/, "Bag"],
];

const COLOR_WORDS = [
  "black",
  "white",
  "grey",
  "gray",
  "charcoal",
  "navy",
  "blue",
  "green",
  "olive",
  "beige",
  "cream",
  "brown",
  "tan",
  "red",
  "burgundy",
  "pink",
  "purple",
  "yellow",
  "orange",
];

/**
 * Turns a sentence into constraints. Deliberately a plain-language parser
 * rather than anything statistical: people ask for clothes in a small,
 * predictable vocabulary, and a parser that can be read and corrected beats
 * one that is occasionally surprising.
 */
export function parseStyleRequest(text: string, data: ClosetData): StyleRequest {
  const request = emptyRequest();
  request.text = text;
  const lower = ` ${text.toLowerCase().replace(/[.,!?]/g, " ")} `;

  const negatedRanges = findNegatedRanges(lower);
  const isNegated = (index: number) =>
    negatedRanges.some(([start, end]) => index >= start && index <= end);

  for (const [pattern, category] of CATEGORY_WORDS) {
    const match = pattern.exec(lower);
    if (!match) continue;
    if (isNegated(match.index)) {
      if (!request.excludeCategories.includes(category)) request.excludeCategories.push(category);
    } else if (!request.requireCategories.includes(category)) {
      request.requireCategories.push(category);
    }
  }

  for (const word of COLOR_WORDS) {
    const index = lower.indexOf(` ${word}`);
    if (index === -1 || isNegated(index)) continue;
    const name = word === "gray" ? "Grey" : word[0].toUpperCase() + word.slice(1);
    if (!request.requireColors.includes(name)) request.requireColors.push(name);
  }

  /* Mood and occasion. */
  if (/\b(comfort|comfy|cozy|cosy|lazy|relax|chill|loung)/.test(lower)) request.formality = 1;
  if (/\b(casual|everyday|normal|simple)/.test(lower)) request.formality = 2;
  if (/\b(smart|sharp|nice|dressed up|dress up|dressy|presentable)/.test(lower))
    request.formality = 4;
  if (/\b(formal|wedding|interview|funeral|graduation)/.test(lower)) request.formality = 5;
  if (/\b(work|office|meeting)/.test(lower)) {
    request.formality = Math.max(request.formality ?? 0, 3);
    request.occasion = "Work";
  }
  if (/\b(dinner|date|restaurant)/.test(lower)) {
    request.formality = Math.max(request.formality ?? 0, 3);
    request.occasion = "Dinner";
  }
  if (/\b(going out|night out|party|club|bar|drinks)/.test(lower)) {
    request.formality = Math.max(request.formality ?? 0, 3);
    request.occasion = "Going Out";
  }
  if (/\b(gym|run|workout|training|walk)/.test(lower)) {
    request.formality = 1;
    request.occasion = "Active";
  }
  if (/\b(jacket|coat|layer|cold|chilly|freezing)/.test(lower) && !/\bno (jacket|coat|layer)\b/.test(lower)) {
    request.wantsLayer = true;
  }
  if (/\b(anywhere|any location|all my clothes|wherever)/.test(lower)) request.onlyHere = false;

  /* Specific items by name: "my black air forces", "the grey sweats". */
  for (const item of data.items) {
    const tokens = item.name
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2 && !["the", "and"].includes(token));
    if (!tokens.length) continue;
    const hits = tokens.filter((token) => lower.includes(token)).length;
    const matchesBrand = item.brand ? lower.includes(item.brand.toLowerCase()) : false;
    const strong = hits >= 2 || (hits >= 1 && matchesBrand);
    if (!strong) continue;
    const position = lower.indexOf(tokens.find((t) => lower.includes(t)) ?? "");
    if (isNegated(position)) continue;
    if (!request.includeItemIds.includes(item.id)) request.includeItemIds.push(item.id);
  }

  /* An explicitly named item outranks a generic category ask for that slot. */
  for (const id of request.includeItemIds) {
    const item = data.items.find((i) => i.id === id);
    if (!item) continue;
    request.requireCategories = request.requireCategories.filter(
      (category) => SLOT_OF_CATEGORY[category] !== SLOT_OF_CATEGORY[item.category],
    );
  }

  return request;
}

/** Character ranges that sit inside a "no ..." / "don't want ..." phrase. */
function findNegatedRanges(lower: string): [number, number][] {
  const ranges: [number, number][] = [];
  const patterns = [
    /\bno\b/g,
    /\bnot\b/g,
    /\bwithout\b/g,
    /\bdon'?t (?:feel like |want |wanna )?(?:wearing |wear )?/g,
    /\bdo not (?:feel like |want )?(?:wearing |wear )?/g,
    /\bskip\b/g,
    /\bavoid\b/g,
    /\banything but\b/g,
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(lower)) !== null) {
      ranges.push([match.index, match.index + match[0].length + 26]);
    }
  }
  return ranges;
}

/* ------------------------------------------------------------------ */
/* Suggestions                                                         */
/* ------------------------------------------------------------------ */

export interface OutfitGap {
  slot: OutfitSlot;
  message: string;
}

export interface OutfitSuggestion {
  id: string;
  title: string;
  slots: Partial<Record<OutfitSlot, ClothingItem>>;
  items: ClothingItem[];
  reasons: string[];
  gaps: OutfitGap[];
  score: number;
}

export interface StyleContext {
  data: ClosetData;
  weather: Weather;
  request: StyleRequest;
}

/** Warmth level (1-5) the weather is asking for. */
export function targetWarmth(weather: Weather): number {
  const t = weather.tempC;
  if (t >= 26) return 1;
  if (t >= 20) return 2;
  if (t >= 12) return 3;
  if (t >= 4) return 4;
  return 5;
}

export function availableItems(data: ClosetData, request: StyleRequest): ClothingItem[] {
  return data.items.filter((item) => {
    if (item.status !== "Clean") return false;
    if (request.onlyHere && item.locationId !== data.profile.currentLocationId) return false;
    if (request.excludeCategories.includes(item.category)) return false;
    return true;
  });
}

interface ScoreInput {
  item: ClothingItem;
  context: StyleContext;
  chosen: ClothingItem[];
  /** Nudges the ranking so alternative outfits differ from the first one. */
  seed: number;
  /**
   * Pieces already used by an earlier suggestion. Heavily penalised rather
   * than banned, so a second idea looks different when the closet allows it
   * and still comes out complete when it does not.
   */
  discourage?: Set<ID>;
}

function scoreItem({ item, context, chosen, seed, discourage }: ScoreInput): number {
  const { request, weather, data } = context;
  let score = discourage?.has(item.id) ? -7 : 0;

  /* Weather. The single biggest factor: clothes have to work outside. */
  const target = targetWarmth(weather);
  const warmthGap = Math.abs(item.warmth - target);
  score += (1 - warmthGap / 4) * 3;

  /* Rain and snow change what makes sense on your feet and on top. */
  if (weather.condition === "Rain" || weather.condition === "Snow") {
    const material = (item.material ?? "").toLowerCase();
    if (item.category === "Shoes" && /(suede|canvas|mesh)/.test(material)) score -= 2.2;
    if (item.category === "Shoes" && /(leather|rubber|gore)/.test(material)) score += 0.8;
    if (SLOT_OF_CATEGORY[item.category] === "layer") score += 1;
  }
  if (weather.condition === "Windy" && SLOT_OF_CATEGORY[item.category] === "layer") score += 0.5;

  /* Season. */
  const season = currentSeason();
  if (item.season === season) score += 0.8;
  else if (item.season !== "All Year") score -= 0.6;

  /* Formality. */
  if (request.formality) {
    score += (1 - Math.abs(item.dressiness - request.formality) / 4) * 2.2;
  }

  /* What the person asked for. */
  if (request.requireCategories.includes(item.category)) score += 3.5;
  if (request.requireColors.length) {
    const wanted = request.requireColors.some(
      (color) => color.toLowerCase() === item.primaryColor.toLowerCase(),
    );
    const family = request.requireColors.some(
      (color) => colorOption(color).family === colorOption(item.primaryColor).family,
    );
    if (wanted) score += 3;
    else if (family) score += 0.7;
    else score -= 1.4;
  }

  /* Colour harmony with what is already in the outfit. */
  if (chosen.length) {
    const harmony =
      chosen.reduce((sum, other) => sum + colorHarmony(item.primaryColor, other.primaryColor), 0) /
      chosen.length;
    score += harmony * 2.4;
  }

  /* Favourites, variety and recency. */
  if (item.favorite) score += 0.7;
  const sinceWorn = daysSince(item.lastWorn);
  if (sinceWorn < 2) score -= 1.6;
  else if (sinceWorn < 5) score -= 0.5;
  else if (sinceWorn > 45) score += 0.4;
  if (item.timesWorn === 0) score += 0.3;

  /* Pairings the person actually wears together get a small nudge. */
  if (chosen.length) {
    const together = data.history.filter(
      (entry) =>
        entry.itemIds.includes(item.id) && chosen.some((other) => entry.itemIds.includes(other.id)),
    ).length;
    score += Math.min(1.2, together * 0.4);
  }

  /* Deterministic jitter so "Shuffle" and the alternatives feel alive. */
  score += ((hashString(item.id + seed) % 100) / 100) * 0.8;

  return score;
}

function pickForSlot(
  slot: OutfitSlot,
  pool: ClothingItem[],
  context: StyleContext,
  chosen: ClothingItem[],
  seed: number,
  discourage: Set<ID>,
): ClothingItem | undefined {
  const used = new Set(chosen.map((item) => item.id));
  const candidates = pool
    .filter((item) => SLOT_OF_CATEGORY[item.category] === slot && !used.has(item.id))
    .map((item) => ({ item, score: scoreItem({ item, context, chosen, seed, discourage }) }))
    .sort((a, b) => b.score - a.score);
  return candidates[0]?.item;
}

export function rankForSlot(
  slot: OutfitSlot,
  context: StyleContext,
  chosen: ClothingItem[],
  limit = 12,
): ClothingItem[] {
  const pool = availableItems(context.data, context.request);
  const chosenIds = new Set(chosen.map((item) => item.id));
  return pool
    .filter((item) => SLOT_OF_CATEGORY[item.category] === slot && !chosenIds.has(item.id))
    .map((item) => ({
      item,
      score: scoreItem({ item, context, chosen: chosen.filter((c) => c.id !== item.id), seed: 0 }),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.item);
}

interface BuildOptions {
  title: string;
  seed: number;
  /** Nudges formality for the "Different vibe" option. */
  formalityShift?: number;
  /** Pieces an earlier idea already used. Penalised, never banned. */
  avoidItemIds?: Set<ID>;
  allowAccessory?: boolean;
}

function buildOne(context: StyleContext, options: BuildOptions): OutfitSuggestion {
  const { data, weather } = context;
  const request: StyleRequest = options.formalityShift
    ? {
        ...context.request,
        formality: Math.min(
          5,
          Math.max(1, (context.request.formality ?? 2) + options.formalityShift),
        ),
      }
    : context.request;
  const localContext: StyleContext = { ...context, request };

  const pool = availableItems(data, request);
  const slots: Partial<Record<OutfitSlot, ClothingItem>> = {};
  const chosen: ClothingItem[] = [];
  const gaps: OutfitGap[] = [];
  const discourage = options.avoidItemIds ?? new Set<ID>();

  /* Anything named in the request is placed first and never moved. */
  for (const id of request.includeItemIds) {
    const item = data.items.find((i) => i.id === id);
    if (!item) continue;
    const slot = SLOT_OF_CATEGORY[item.category];
    if (slots[slot]) continue;
    slots[slot] = item;
    chosen.push(item);
  }

  /* A required category fills its slot next, e.g. "I want to wear a hoodie". */
  for (const category of request.requireCategories) {
    const slot = SLOT_OF_CATEGORY[category];
    if (slots[slot]) continue;
    const match = pool
      .filter((item) => item.category === category)
      .map((item) => ({
        item,
        score: scoreItem({ item, context: localContext, chosen, seed: options.seed, discourage }),
      }))
      .sort((a, b) => b.score - a.score)[0]?.item;
    if (match) {
      slots[slot] = match;
      chosen.push(match);
    } else {
      gaps.push({
        slot,
        message: `No clean ${category.toLowerCase()} ${request.onlyHere ? "here" : "in your closet"} right now.`,
      });
    }
  }

  const order: OutfitSlot[] = ["top", "bottom", "shoes"];
  for (const slot of order) {
    if (slots[slot]) continue;
    const item = pickForSlot(slot, pool, localContext, chosen, options.seed, discourage);
    if (item) {
      slots[slot] = item;
      chosen.push(item);
    } else {
      gaps.push({ slot, message: gapMessage(slot, data, request) });
    }
  }

  /* A layer when the weather or the request calls for one. */
  const needsLayer =
    request.wantsLayer ||
    weather.tempC < 14 ||
    weather.condition === "Rain" ||
    weather.condition === "Snow" ||
    weather.condition === "Windy";
  if (needsLayer && !slots.layer) {
    const layer = pickForSlot("layer", pool, localContext, chosen, options.seed, discourage);
    if (layer) {
      slots.layer = layer;
      chosen.push(layer);
    } else if (request.wantsLayer) {
      gaps.push({ slot: "layer", message: gapMessage("layer", data, request) });
    }
  }

  /* An accessory only when it genuinely fits: casual, wanted by this idea, and
     one the person actually reaches for. */
  if (options.allowAccessory && !slots.accessory && (request.formality ?? 2) <= 2) {
    const accessory = pickForSlot("accessory", pool, localContext, chosen, options.seed, discourage);
    if (accessory && accessory.timesWorn > 3) {
      slots.accessory = accessory;
      chosen.push(accessory);
    }
  }

  const score =
    chosen.reduce(
      (sum, item) => sum + scoreItem({ item, context: localContext, chosen: [], seed: options.seed }),
      0,
    ) / Math.max(1, chosen.length);

  return {
    id: `${options.title}-${options.seed}`,
    title: options.title,
    slots,
    items: chosen,
    reasons: explain(chosen, localContext, weather),
    gaps,
    score,
  };
}

function gapMessage(slot: OutfitSlot, data: ClosetData, request: StyleRequest): string {
  const label = SLOT_LABEL[slot].toLowerCase();
  const dirty = data.items.filter(
    (item) => SLOT_OF_CATEGORY[item.category] === slot && item.status !== "Clean",
  ).length;
  const elsewhere = data.items.filter(
    (item) =>
      SLOT_OF_CATEGORY[item.category] === slot &&
      item.status === "Clean" &&
      item.locationId !== data.profile.currentLocationId,
  ).length;

  if (request.onlyHere && elsewhere > 0) {
    const place = data.locations.find(
      (location) =>
        location.id ===
        data.items.find(
          (item) =>
            SLOT_OF_CATEGORY[item.category] === slot &&
            item.status === "Clean" &&
            item.locationId !== data.profile.currentLocationId,
        )?.locationId,
    )?.name;
    return `Your clean ${label} options are at ${place ?? "another location"}.`;
  }
  if (dirty > 0) return `Every ${label} you own needs washing.`;
  return `You may need a ${label}.`;
}

function explain(items: ClothingItem[], context: StyleContext, weather: Weather): string[] {
  const reasons: string[] = [];
  const { request, data } = context;
  const target = targetWarmth(weather);
  const averageWarmth = items.reduce((sum, item) => sum + item.warmth, 0) / Math.max(1, items.length);

  if (weather.condition === "Rain") reasons.push("Keeps you dry in the rain");
  else if (weather.condition === "Snow") reasons.push("Warm enough for the snow");
  else if (target >= 4) reasons.push("Layered up for the cold");
  else if (target <= 2) reasons.push("Light enough for the warm weather");
  else if (Math.abs(averageWarmth - target) < 1) reasons.push("Right weight for today");

  if (request.requireColors.length) {
    reasons.push(`${request.requireColors.join(" and ")}, like you asked`);
  }
  if (request.requireCategories.length) {
    reasons.push(`Built around your ${request.requireCategories[0].toLowerCase()}`);
  }
  if (request.includeItemIds.length) {
    const item = data.items.find((i) => i.id === request.includeItemIds[0]);
    if (item) reasons.push(`Built around your ${item.name.toLowerCase()}`);
  }
  if (request.occasion) reasons.push(`Suits ${request.occasion.toLowerCase()}`);

  const favorites = items.filter((item) => item.favorite).length;
  if (favorites >= 2) reasons.push("Uses pieces you love");

  const unworn = items.filter((item) => daysSince(item.lastWorn) > 30);
  if (unworn.length === 1) reasons.push(`Brings back your ${unworn[0].name.toLowerCase()}`);

  return reasons.slice(0, 3);
}

/**
 * The three ideas shown on What to Wear.
 *
 * Each one is told to avoid what the earlier ones used, but only as a
 * preference: a small closet should still produce three complete outfits, even
 * if two of them share a pair of shoes.
 */
export function suggestOutfits(context: StyleContext): OutfitSuggestion[] {
  /* Anything the person explicitly asked for stays in every idea. */
  const pinned = new Set(context.request.includeItemIds);
  const usedBy = (...outfits: OutfitSuggestion[]) =>
    new Set<ID>(
      outfits
        .flatMap((outfit) => outfit.items)
        .filter((item) => !pinned.has(item.id))
        .map((item) => item.id),
    );

  const recommended = buildOne(context, {
    title: "Recommended",
    seed: 1,
    allowAccessory: true,
  });

  const alternative = buildOne(context, {
    title: "Alternative",
    seed: 7,
    avoidItemIds: usedBy(recommended),
  });

  const differentVibe = buildOne(context, {
    title: "Different vibe",
    seed: 13,
    formalityShift: (context.request.formality ?? 2) >= 3 ? -1 : 1,
    avoidItemIds: usedBy(recommended, alternative),
  });

  return [recommended, alternative, differentVibe];
}

/** A single outfit, used by Home and by Shuffle. */
export function suggestOutfit(context: StyleContext, seed = 1): OutfitSuggestion {
  return buildOne(context, { title: "Today", seed, allowAccessory: true });
}

export function slotsToItems(slots: Partial<Record<OutfitSlot, ClothingItem>>): ClothingItem[] {
  const order: OutfitSlot[] = ["layer", "top", "bottom", "shoes", "accessory"];
  return order.map((slot) => slots[slot]).filter((item): item is ClothingItem => Boolean(item));
}

/** "Black hoodie and grey sweats" - a readable default name for a saved outfit. */
export function describeOutfit(items: ClothingItem[]): string {
  const top = items.find((item) => SLOT_OF_CATEGORY[item.category] === "top");
  const bottom = items.find((item) => SLOT_OF_CATEGORY[item.category] === "bottom");
  if (top && bottom) return `${top.name} and ${bottom.name.toLowerCase()}`;
  if (top) return top.name;
  if (items.length) return items[0].name;
  return "New outfit";
}

/* ------------------------------------------------------------------ */
/* Wardrobe gaps, used by the Needs section                            */
/* ------------------------------------------------------------------ */

export interface WardrobeGap {
  title: string;
  category: Category;
  reason: string;
}

/**
 * Looks for holes a person would actually feel, and nothing else. Style List
 * is not trying to sell anything: no gap is reported unless the closet really
 * cannot cover a normal week.
 */
export function findWardrobeGaps(data: ClosetData): WardrobeGap[] {
  const gaps: WardrobeGap[] = [];
  const clean = data.items.filter((item) => item.status === "Clean");
  const countOf = (predicate: (item: ClothingItem) => boolean) => data.items.filter(predicate).length;

  const layers = countOf((item) => SLOT_OF_CATEGORY[item.category] === "layer");
  if (layers === 0) {
    gaps.push({
      title: "A jacket",
      category: "Jacket",
      reason: "You have nothing to put on over a top when it is cold or wet.",
    });
  }

  const rainShoes = data.items.filter(
    (item) => item.category === "Shoes" && /(leather|rubber|gore)/i.test(item.material ?? ""),
  ).length;
  if (data.items.some((item) => item.category === "Shoes") && rainShoes === 0) {
    gaps.push({
      title: "Shoes that handle rain",
      category: "Shoes",
      reason: "None of your shoes are suited to a wet day.",
    });
  }

  const dressy = countOf((item) => item.dressiness >= 4);
  if (dressy < 2) {
    gaps.push({
      title: "Something smarter",
      category: "Shirt",
      reason: "You would have little to wear to a dinner or an event.",
    });
  }

  const bottoms = clean.filter((item) => SLOT_OF_CATEGORY[item.category] === "bottom").length;
  if (bottoms <= 1 && data.items.length > 4) {
    gaps.push({
      title: "Another pair of pants",
      category: "Pants",
      reason: "Almost everything you wear on the bottom is in the wash.",
    });
  }

  return gaps;
}

/* ------------------------------------------------------------------ */
/* Packing                                                             */
/* ------------------------------------------------------------------ */

export interface PackingSuggestion {
  itemId: ID;
  reason: string;
}

const ACTIVITY_FORMALITY: Record<TripActivity, number> = {
  Casual: 2,
  Dinner: 4,
  Beach: 1,
  Walking: 1,
  Work: 4,
  Event: 5,
  "Going Out": 3,
};

/**
 * Builds a packing list out of clothes the person owns: enough tops for the
 * days away, bottoms that stretch across outfits, one pair of shoes per kind of
 * activity, and a layer if the forecast asks for one. Items that are dirty or
 * at another address still appear, flagged, because knowing you need to wash
 * something is the whole point of packing early.
 */
export function suggestPacking(
  data: ClosetData,
  trip: { days: number; activities: TripActivity[]; expectedWeather: Weather["condition"]; expectedTempC: number },
): PackingSuggestion[] {
  const weather: Weather = {
    tempC: trip.expectedTempC,
    condition: trip.expectedWeather,
    source: "manual",
  };
  const request = emptyRequest();
  request.onlyHere = false;

  const context: StyleContext = { data, weather, request };
  const picks: PackingSuggestion[] = [];
  const used = new Set<ID>();

  const take = (slot: OutfitSlot, count: number, reason: string, formality?: number) => {
    const scoped: StyleContext = {
      ...context,
      request: { ...request, formality },
    };
    const ranked = rankForSlot(slot, scoped, [], 30).filter((item) => !used.has(item.id));
    for (const item of ranked.slice(0, count)) {
      used.add(item.id);
      picks.push({ itemId: item.id, reason });
    }
  };

  const days = Math.max(1, trip.days);
  take("top", Math.min(6, days + 1), "Everyday top");
  take("bottom", Math.min(3, Math.ceil(days / 2)), "Wears more than once");
  take("shoes", 1, "Main shoes");

  for (const activity of trip.activities) {
    const formality = ACTIVITY_FORMALITY[activity];
    if (activity === "Dinner" || activity === "Event" || activity === "Work") {
      take("top", 1, `For ${activity.toLowerCase()}`, formality);
      take("shoes", 1, `For ${activity.toLowerCase()}`, formality);
    }
    if (activity === "Beach") take("bottom", 1, "For the beach", 1);
    if (activity === "Walking") take("shoes", 1, "For walking", 1);
  }

  if (trip.expectedTempC < 16 || trip.expectedWeather === "Rain" || trip.expectedWeather === "Snow") {
    take("layer", 1, trip.expectedWeather === "Rain" ? "For the rain" : "For the cold");
  }

  return picks;
}

export const ALL_CATEGORIES = CATEGORIES;
