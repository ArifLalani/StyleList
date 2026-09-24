<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Style List

An AI-powered personal closet and outfit assistant. See `README.md` for the
product intent and the file map.

## Rules that matter here

- **Honesty about services.** Never present on-device processing as a cloud
  model, and never fake a result a connected service would produce. Each AI
  capability has a real local path and a real remote path behind one interface
  (`lib/ai/*`), and Settings reports which one is actually running.
- **Image processing never redesigns a garment.** Crop, rotate, mask and global
  tone only. If the subject cannot be separated confidently, keep the original
  and say so.
- **One obvious primary action per screen**, in plain language ("Mark Clean",
  not "Process"). Interactive targets are at least 44px, primary actions 56px.
- **No tiny dropdowns.** A choice is a full-width field that opens a `Sheet`
  with large rows and a tick. See `components/ui/Select.tsx`.
- **Progressive disclosure.** The confirm screen asks five things; everything
  else lives behind "More Details".
- **Changing one piece of an outfit changes only that piece.** Only Shuffle
  rebuilds (`lib/useOutfitBuilder.ts`).

## Conventions

- Base CSS belongs in `@layer base` in `globals.css`. Unlayered rules beat every
  Tailwind utility, which silently breaks things like `text-white` on a button.
- Custom utilities use `@utility`, not bare classes.
- Design tokens live in `@theme`: `canvas`, `surface`, `sunken`, `line`, `ink`,
  `ink-soft`, `ink-mute`, `accent`, `good`, `warn`, `alert`. Do not introduce
  new colours without a reason.
- State goes through `useCloset()`; photos through `lib/photoStore.ts`.
- Sheets that hold draft state are mounted only while open, so opening one
  always starts fresh (no reset effects).

## Checks

```bash
npx tsc --noEmit && npm run lint && npm run build
```
