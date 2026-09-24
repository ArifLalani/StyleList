# Style List

An AI-powered personal closet and outfit assistant.

Style List exists to answer four questions instantly:

1. **What clothes do I own?**
2. **Where are they?**
3. **Can I wear them right now?**
4. **What should I wear?**

Front. Back. Done. Two photos of a piece of clothing, and Style List cleans up
the images, works out what the item is, remembers where it lives, tracks whether
it is available, and uses it when helping you decide what to wear.

---

## Running it

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>. A realistic sample closet is loaded on first
run; Settings offers "Start an empty closet" if you would rather begin from
scratch.

```bash
npm run build && npm run start   # production
npm run lint                     # eslint
npx tsc --noEmit                 # types
```

---

## What is real, and what is waiting for a service

Style List never pretends a service is connected when it is not. Settings shows
the true state of each one.

| Capability | Without any configuration | With a service connected |
| --- | --- | --- |
| Cleaning up photos | Real processing in your browser: the garment is lifted off a plain background, the largest subject is kept, the item is straightened, cropped, centred and the lighting is evened out. If the photo is too busy to read confidently, your original is kept and the app says so. | `POST /api/ai/process-image` forwards the photo to `STYLE_LIST_IMAGE_API_URL` and returns the cleaned image. |
| Identifying an item | Real measurement from the pixels: dominant colours in the app's own colour vocabulary, category from the silhouette, plain/striped/printed from the surface. Brand and material are left blank rather than guessed. | `POST /api/ai/analyze` reads the photo with Claude (`ANTHROPIC_API_KEY`) and returns name, category, colours, pattern, brand, material and season. |
| Weather | You tap today's weather. Works offline, needs no permissions. | With permission, the browser's location is sent to Open-Meteo (free, no key) for the current conditions. |
| Try It On | The UI, the stored photo and the hand-off are all built. No rendering is faked. | `POST /api/ai/try-on` forwards to `STYLE_LIST_TRY_ON_API_URL`. |

Image processing only ever crops, rotates, masks or applies a global tone
curve. Logos, prints, stitching, colours and wear are the photographed ones -
the presentation is cleaned up, the garment is not redesigned.

### Environment variables

All optional. See `.env.example`.

```bash
ANTHROPIC_API_KEY=            # turns on item identification with Claude
STYLE_LIST_IMAGE_API_URL=     # an endpoint accepting multipart "image", returning an image
STYLE_LIST_IMAGE_API_KEY=     # sent as a bearer token, if the service needs one
STYLE_LIST_IMAGE_API_NAME=    # friendly name shown in Settings
STYLE_LIST_TRY_ON_API_URL=    # an endpoint accepting a person photo + garments
STYLE_LIST_TRY_ON_API_KEY=
```

---

## Where things live

```
src/
  app/
    page.tsx              Home - what should I wear today
    closet/               My Closet grid, search, filters, item detail
    add/                  The camera flow: front, back, clean up, confirm, save
    what-to-wear/         Ask in your own words, three outfits back
    outfits/  trips/  laundry/  needs/  settings/  try-it-on/  more/
    api/ai/               status, analyze, process-image, try-on
  components/
    layout/AppShell       Sidebar on desktop, bottom bar on phones
    ui/                   Button, Sheet, Selector, GarmentArt, ItemImage, Toast...
    add/ closet/ outfit/ trips/ home/
  lib/
    types.ts              The data model
    store.tsx             All state, persisted to this browser
    photoStore.ts         Photos in IndexedDB (too big for localStorage)
    seed.ts               The sample closet
    ai/imageProcessing.ts processClothingImage()
    ai/analyzeClothing.ts analyzeClothingItem()
    ai/stylist.ts         The outfit engine and the plain-language parser
    ai/tryOn.ts           The future integration hook
    weather.ts colors.ts utils.ts
```

### Storage

The prototype keeps everything on the device: the closet in `localStorage`
(`stylelist.closet.v1`), photos in IndexedDB (`stylelist-photos`). The shapes in
`lib/types.ts` are what a Supabase/Postgres schema would hold, and
`lib/store.tsx` is the single place that would change.

### Illustrations

An item without a photo is drawn from its category and colours
(`components/ui/GarmentArt.tsx`), so the closet reads as a wardrobe from the
first screen. Photographed items always show their own photo.

---

## The stylist

`lib/ai/stylist.ts` scores clothes you actually own against:

- the weather and the season
- where you are standing right now, and where each item is
- what is clean, in the wash, packed or away
- how formal the occasion is
- colour harmony with the rest of the outfit
- what you wore recently, what you wear together, and what you love

Changing one piece changes **only** that piece - the rest of the outfit is left
exactly as it is. Only Shuffle rebuilds. When a slot genuinely cannot be
filled, it is reported as a gap ("Your clean bottom options are at Storage")
rather than quietly suggesting something you do not own.

It also parses plain English: "all black", "something comfortable", "casual for
dinner", "I don't feel like wearing jeans", "build something around my grey
sweats". What it understood is shown as chips, so a misread is visible and
fixable.
