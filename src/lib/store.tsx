"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import { createEmptyCloset, createSeedCloset } from "./seed";
import { clearPhotos, deletePhoto } from "./photoStore";
import type {
  CalendarEvent,
  ClosetData,
  ClothingImage,
  ClothingItem,
  ID,
  Location,
  NeedItem,
  Outfit,
  OutfitItem,
  Status,
  Trip,
  UserProfile,
  WearHistoryEntry,
  Weather,
} from "./types";
import { LAUNDRY_STATUSES } from "./types";
import { todayISO, uid } from "./utils";

const STORAGE_KEY = "stylelist.closet.v1";

/* ------------------------------------------------------------------ */
/* Reducer                                                             */
/* ------------------------------------------------------------------ */

type Action =
  | { type: "load"; data: ClosetData }
  | { type: "addItem"; item: ClothingItem; images: ClothingImage[] }
  | { type: "updateItem"; id: ID; patch: Partial<ClothingItem> }
  | { type: "deleteItem"; id: ID }
  | { type: "deleteItems"; ids: ID[] }
  | { type: "addImages"; images: ClothingImage[] }
  | { type: "wear"; entry: WearHistoryEntry }
  | { type: "reviewWear"; entryId: ID; statuses: Record<ID, Status> }
  | { type: "saveOutfit"; outfit: Outfit }
  | { type: "updateOutfit"; id: ID; patch: Partial<Outfit> }
  | { type: "deleteOutfit"; id: ID }
  | { type: "addLocation"; location: Location }
  | { type: "updateLocation"; id: ID; patch: Partial<Location> }
  | { type: "deleteLocation"; id: ID }
  | { type: "saveTrip"; trip: Trip }
  | { type: "updateTrip"; id: ID; patch: Partial<Trip> }
  | { type: "deleteTrip"; id: ID }
  | { type: "addNeed"; need: NeedItem }
  | { type: "updateNeed"; id: ID; patch: Partial<NeedItem> }
  | { type: "deleteNeed"; id: ID }
  | { type: "addEvent"; event: CalendarEvent }
  | { type: "deleteEvent"; id: ID }
  | { type: "updateProfile"; patch: Partial<UserProfile> }
  | { type: "reset"; data: ClosetData };

function reducer(state: ClosetData, action: Action): ClosetData {
  switch (action.type) {
    case "load":
    case "reset":
      return action.data;

    case "addItem":
      return {
        ...state,
        items: [action.item, ...state.items],
        images: [...state.images, ...action.images],
      };

    case "updateItem":
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.id ? { ...item, ...action.patch } : item,
        ),
      };

    case "deleteItem":
    case "deleteItems": {
      const ids = new Set(action.type === "deleteItem" ? [action.id] : action.ids);
      return {
        ...state,
        items: state.items.filter((item) => !ids.has(item.id)),
        images: state.images.filter((image) => !ids.has(image.itemId)),
        outfits: state.outfits
          .map((outfit) => ({
            ...outfit,
            items: outfit.items.filter((entry) => !ids.has(entry.itemId)),
          }))
          .filter((outfit) => outfit.items.length > 0),
        trips: state.trips.map((trip) => ({
          ...trip,
          items: trip.items.filter((entry) => !ids.has(entry.itemId)),
        })),
        history: state.history
          .map((entry) => ({
            ...entry,
            itemIds: entry.itemIds.filter((id) => !ids.has(id)),
          }))
          .filter((entry) => entry.itemIds.length > 0),
      };
    }

    case "addImages":
      return { ...state, images: [...state.images, ...action.images] };

    case "wear": {
      const worn = new Set(action.entry.itemIds);
      return {
        ...state,
        history: [action.entry, ...state.history],
        items: state.items.map((item) =>
          worn.has(item.id)
            ? { ...item, timesWorn: item.timesWorn + 1, lastWorn: action.entry.date }
            : item,
        ),
        outfits: action.entry.outfitId
          ? state.outfits.map((outfit) =>
              outfit.id === action.entry.outfitId
                ? { ...outfit, timesWorn: outfit.timesWorn + 1, lastWorn: action.entry.date }
                : outfit,
            )
          : state.outfits,
      };
    }

    case "reviewWear":
      return {
        ...state,
        history: state.history.map((entry) =>
          entry.id === action.entryId ? { ...entry, reviewed: true } : entry,
        ),
        items: state.items.map((item) =>
          action.statuses[item.id] ? { ...item, status: action.statuses[item.id] } : item,
        ),
      };

    case "saveOutfit":
      return { ...state, outfits: [action.outfit, ...state.outfits] };

    case "updateOutfit":
      return {
        ...state,
        outfits: state.outfits.map((outfit) =>
          outfit.id === action.id ? { ...outfit, ...action.patch } : outfit,
        ),
      };

    case "deleteOutfit":
      return { ...state, outfits: state.outfits.filter((outfit) => outfit.id !== action.id) };

    case "addLocation":
      return { ...state, locations: [...state.locations, action.location] };

    case "updateLocation":
      return {
        ...state,
        locations: state.locations.map((location) =>
          location.id === action.id ? { ...location, ...action.patch } : location,
        ),
      };

    case "deleteLocation": {
      const fallback =
        state.locations.find((l) => l.isDefault && l.id !== action.id) ??
        state.locations.find((l) => l.id !== action.id);
      if (!fallback) return state;
      return {
        ...state,
        locations: state.locations.filter((location) => location.id !== action.id),
        items: state.items.map((item) =>
          item.locationId === action.id ? { ...item, locationId: fallback.id } : item,
        ),
        profile:
          state.profile.currentLocationId === action.id
            ? { ...state.profile, currentLocationId: fallback.id }
            : state.profile,
      };
    }

    case "saveTrip":
      return { ...state, trips: [action.trip, ...state.trips] };

    case "updateTrip":
      return {
        ...state,
        trips: state.trips.map((trip) =>
          trip.id === action.id ? { ...trip, ...action.patch } : trip,
        ),
      };

    case "deleteTrip":
      return { ...state, trips: state.trips.filter((trip) => trip.id !== action.id) };

    case "addNeed":
      return { ...state, needs: [action.need, ...state.needs] };

    case "updateNeed":
      return {
        ...state,
        needs: state.needs.map((need) =>
          need.id === action.id ? { ...need, ...action.patch } : need,
        ),
      };

    case "deleteNeed":
      return { ...state, needs: state.needs.filter((need) => need.id !== action.id) };

    case "addEvent":
      return { ...state, events: [...state.events, action.event] };

    case "deleteEvent":
      return { ...state, events: state.events.filter((event) => event.id !== action.id) };

    case "updateProfile":
      return { ...state, profile: { ...state.profile, ...action.patch } };

    default:
      return state;
  }
}

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

export interface ClosetActions {
  addItem: (item: Omit<ClothingItem, "id" | "createdAt"> & { id?: ID }, images?: Omit<ClothingImage, "id" | "itemId" | "createdAt">[]) => ClothingItem;
  updateItem: (id: ID, patch: Partial<ClothingItem>) => void;
  deleteItem: (id: ID) => void;
  removeSampleCloset: () => void;
  moveItem: (id: ID, locationId: ID) => void;
  setStatus: (id: ID, status: Status) => void;
  toggleFavorite: (id: ID) => void;
  wear: (itemIds: ID[], options?: { outfitId?: ID; outfitName?: string; weatherNote?: string }) => void;
  reviewWear: (entryId: ID, statuses: Record<ID, Status>) => void;
  saveOutfit: (name: string, items: OutfitItem[], occasion?: string) => Outfit;
  updateOutfit: (id: ID, patch: Partial<Outfit>) => void;
  deleteOutfit: (id: ID) => void;
  addLocation: (name: string, icon?: string) => Location;
  updateLocation: (id: ID, patch: Partial<Location>) => void;
  deleteLocation: (id: ID) => void;
  saveTrip: (trip: Omit<Trip, "id" | "createdAt">) => Trip;
  updateTrip: (id: ID, patch: Partial<Trip>) => void;
  setTripItemPacked: (tripId: ID, itemId: ID, packed: boolean) => void;
  removeTripItem: (tripId: ID, itemId: ID) => void;
  addTripItem: (tripId: ID, itemId: ID, reason?: string) => void;
  deleteTrip: (id: ID) => void;
  addNeed: (need: Omit<NeedItem, "id" | "createdAt" | "done">) => void;
  updateNeed: (id: ID, patch: Partial<NeedItem>) => void;
  deleteNeed: (id: ID) => void;
  addEvent: (event: Omit<CalendarEvent, "id">) => void;
  deleteEvent: (id: ID) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  setWeather: (weather: Weather) => void;
  resetCloset: (kind: "sample" | "empty") => void;
}

interface ClosetContextValue {
  data: ClosetData;
  ready: boolean;
  actions: ClosetActions;
}

const ClosetContext = createContext<ClosetContextValue | null>(null);

function loadFromStorage(): ClosetData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ClosetData;
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.items)) return null;
    return { ...createEmptyCloset(), ...parsed };
  } catch {
    return null;
  }
}

export function ClosetProvider({ children }: { children: ReactNode }) {
  /* The first render must match the server, so the closet starts from the
     sample data and the browser's own copy is loaded straight afterwards.
      travels with the data so nothing has to guess whether what it
     is looking at is real yet. */
  const [data, dispatch] = useReducer(reducer, null, () => ({
    ...createSeedCloset(),
    hydrated: false,
  }));
  const written = useRef(false);
  const ready = data.hydrated === true;

  useEffect(() => {
    const stored = loadFromStorage();
    dispatch({ type: "load", data: { ...(stored ?? createSeedCloset()), hydrated: true } });
    written.current = true;
  }, []);

  useEffect(() => {
    if (!written.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Storage full or blocked. The session keeps working in memory.
    }
  }, [data]);

  const actions = useMemo<ClosetActions>(() => {
    const addItem: ClosetActions["addItem"] = (input, images = []) => {
      const id = input.id ?? uid("itm");
      const item: ClothingItem = { ...input, id, createdAt: todayISO() };
      const fullImages: ClothingImage[] = images.map((image) => ({
        ...image,
        id: uid("img"),
        itemId: id,
        createdAt: todayISO(),
      }));
      dispatch({ type: "addItem", item, images: fullImages });
      return item;
    };

    return {
      addItem,
      updateItem: (id, patch) => dispatch({ type: "updateItem", id, patch }),
      deleteItem: (id) => dispatch({ type: "deleteItem", id }),
      removeSampleCloset: () => dispatch({ type: "deleteItems", ids: [] }),
      moveItem: (id, locationId) => dispatch({ type: "updateItem", id, patch: { locationId } }),
      setStatus: (id, status) => dispatch({ type: "updateItem", id, patch: { status } }),
      toggleFavorite: (id) => dispatch({ type: "updateItem", id, patch: {} }),
      wear: (itemIds, options = {}) =>
        dispatch({
          type: "wear",
          entry: {
            id: uid("wear"),
            date: todayISO(),
            itemIds,
            outfitId: options.outfitId,
            outfitName: options.outfitName,
            weatherNote: options.weatherNote,
            reviewed: false,
          },
        }),
      reviewWear: (entryId, statuses) => dispatch({ type: "reviewWear", entryId, statuses }),
      saveOutfit: (name, items, occasion) => {
        const outfit: Outfit = {
          id: uid("fit"),
          name,
          items,
          occasion,
          favorite: false,
          timesWorn: 0,
          createdAt: todayISO(),
        };
        dispatch({ type: "saveOutfit", outfit });
        return outfit;
      },
      updateOutfit: (id, patch) => dispatch({ type: "updateOutfit", id, patch }),
      deleteOutfit: (id) => dispatch({ type: "deleteOutfit", id }),
      addLocation: (name, icon = "pin") => {
        const location: Location = { id: uid("loc"), name, icon };
        dispatch({ type: "addLocation", location });
        return location;
      },
      updateLocation: (id, patch) => dispatch({ type: "updateLocation", id, patch }),
      deleteLocation: (id) => dispatch({ type: "deleteLocation", id }),
      saveTrip: (input) => {
        const trip: Trip = { ...input, id: uid("trip"), createdAt: todayISO() };
        dispatch({ type: "saveTrip", trip });
        return trip;
      },
      updateTrip: (id, patch) => dispatch({ type: "updateTrip", id, patch }),
      setTripItemPacked: () => undefined,
      removeTripItem: () => undefined,
      addTripItem: () => undefined,
      deleteTrip: (id) => dispatch({ type: "deleteTrip", id }),
      addNeed: (need) =>
        dispatch({
          type: "addNeed",
          need: { ...need, id: uid("need"), createdAt: todayISO(), done: false },
        }),
      updateNeed: (id, patch) => dispatch({ type: "updateNeed", id, patch }),
      deleteNeed: (id) => dispatch({ type: "deleteNeed", id }),
      addEvent: (event) => dispatch({ type: "addEvent", event: { ...event, id: uid("evt") } }),
      deleteEvent: (id) => dispatch({ type: "deleteEvent", id }),
      updateProfile: (patch) => dispatch({ type: "updateProfile", patch }),
      setWeather: (weather) => dispatch({ type: "updateProfile", patch: { weather } }),
      resetCloset: (kind) => {
        void clearPhotos();
        dispatch({ type: "reset", data: kind === "sample" ? createSeedCloset() : createEmptyCloset() });
      },
    };
  }, []);

  /* A few actions need the current state, so they are rebuilt per render. */
  const boundActions = useMemo<ClosetActions>(
    () => ({
      ...actions,
      toggleFavorite: (id) => {
        const item = data.items.find((i) => i.id === id);
        if (!item) return;
        dispatch({ type: "updateItem", id, patch: { favorite: !item.favorite } });
      },
      deleteItem: (id) => {
        data.images
          .filter((image) => image.itemId === id)
          .forEach((image) => {
            void deletePhoto(image.originalKey);
            if (image.processedKey) void deletePhoto(image.processedKey);
          });
        dispatch({ type: "deleteItem", id });
      },
      removeSampleCloset: () => {
        const ids = data.items.filter((item) => item.id.startsWith("item_")).map((item) => item.id);
        dispatch({ type: "deleteItems", ids });
      },
      setTripItemPacked: (tripId, itemId, packed) => {
        const trip = data.trips.find((t) => t.id === tripId);
        if (!trip) return;
        dispatch({
          type: "updateTrip",
          id: tripId,
          patch: {
            items: trip.items.map((entry) =>
              entry.itemId === itemId ? { ...entry, packed } : entry,
            ),
          },
        });
        /* Packing a clean item marks it Packed; unpacking undoes exactly that.
           An item that needed washing keeps saying so. */
        const item = data.items.find((entry) => entry.id === itemId);
        if (!item) return;
        if (packed && item.status === "Clean") {
          dispatch({ type: "updateItem", id: itemId, patch: { status: "Packed" } });
        } else if (!packed && item.status === "Packed") {
          dispatch({ type: "updateItem", id: itemId, patch: { status: "Clean" } });
        }
      },
      removeTripItem: (tripId, itemId) => {
        const trip = data.trips.find((t) => t.id === tripId);
        if (!trip) return;
        dispatch({
          type: "updateTrip",
          id: tripId,
          patch: { items: trip.items.filter((entry) => entry.itemId !== itemId) },
        });
      },
      addTripItem: (tripId, itemId, reason) => {
        const trip = data.trips.find((t) => t.id === tripId);
        if (!trip || trip.items.some((entry) => entry.itemId === itemId)) return;
        dispatch({
          type: "updateTrip",
          id: tripId,
          patch: { items: [...trip.items, { itemId, packed: false, reason }] },
        });
      },
    }),
    [actions, data.items, data.images, data.trips],
  );

  const value = useMemo(
    () => ({ data, ready, actions: boundActions }),
    [data, ready, boundActions],
  );

  return <ClosetContext.Provider value={value}>{children}</ClosetContext.Provider>;
}

export function useCloset(): ClosetContextValue {
  const context = useContext(ClosetContext);
  if (!context) throw new Error("useCloset must be used inside ClosetProvider");
  return context;
}

/* ------------------------------------------------------------------ */
/* Small selectors used all over the app                               */
/* ------------------------------------------------------------------ */

export function useItem(id: ID | undefined) {
  const { data } = useCloset();
  return useMemo(() => data.items.find((item) => item.id === id), [data.items, id]);
}

export function useLocationName() {
  const { data } = useCloset();
  return useCallback(
    (locationId: ID) => data.locations.find((l) => l.id === locationId)?.name ?? "Unknown",
    [data.locations],
  );
}

export function useItemImages(itemId: ID | undefined) {
  const { data } = useCloset();
  return useMemo(
    () => data.images.filter((image) => image.itemId === itemId),
    [data.images, itemId],
  );
}

export function laundryItems(data: ClosetData): ClothingItem[] {
  return data.items.filter((item) => LAUNDRY_STATUSES.includes(item.status));
}

export function isAvailable(item: ClothingItem): boolean {
  return item.status === "Clean";
}

export function isHere(item: ClothingItem, data: ClosetData): boolean {
  return item.locationId === data.profile.currentLocationId;
}

/** Wear entries from today or yesterday that still need a laundry answer. */
export function pendingWearReview(data: ClosetData): WearHistoryEntry | undefined {
  return data.history.find((entry) => !entry.reviewed);
}
