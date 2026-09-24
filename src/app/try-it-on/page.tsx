"use client";

import { ImageIcon, Info } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/layout/AppShell";
import { OutfitFlatLay } from "@/components/outfit/OutfitFlatLay";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { CategoryArt } from "@/components/ui/ItemImage";
import { useToast } from "@/components/ui/Toast";
import { isTryOnAvailable, renderTryOn } from "@/lib/ai/tryOn";
import { getPhoto, photoUrl, putPhoto } from "@/lib/photoStore";
import { useCloset } from "@/lib/store";
import { useOutfitBuilder } from "@/lib/useOutfitBuilder";

/**
 * Try It On.
 *
 * The photo, the outfit and the button are all real. The rendering is not
 * available until an image service is connected, and the page says exactly
 * that instead of showing something that looks like a result.
 */
export default function TryItOnPage() {
  const { data, actions, ready } = useCloset();
  const toast = useToast();
  const builder = useOutfitBuilder();
  const fileInput = useRef<HTMLInputElement>(null);

  const [available, setAvailable] = useState<boolean | null>(null);
  const [photo, setPhoto] = useState<string>();
  const [result, setResult] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void isTryOnAvailable().then(setAvailable);
  }, []);

  useEffect(() => {
    const key = data.profile.tryOnPhotoKey;
    if (!key) return;
    void photoUrl(key).then(setPhoto);
  }, [data.profile.tryOnPhotoKey]);

  if (!ready) return <div className="h-96 animate-pulse rounded-[22px] bg-sunken" />;

  const run = async () => {
    const key = data.profile.tryOnPhotoKey;
    if (!key) return;
    setBusy(true);
    setMessage(undefined);
    const personPhoto = await getPhoto(key);
    if (!personPhoto) {
      setBusy(false);
      setMessage("That photo is no longer on this device.");
      return;
    }
    const outcome = await renderTryOn({
      personPhoto,
      items: builder.items,
      itemImages: [],
    });
    setBusy(false);
    if (outcome.status === "ready") {
      setResult(URL.createObjectURL(outcome.image));
    } else {
      setMessage(outcome.reason);
    }
  };

  return (
    <>
      <PageHeader
        title="Try It On"
        subtitle="See an outfit on you instead of laid flat."
      />

      {available === false ? (
        <div className="mb-6 flex items-start gap-3 rounded-[20px] border border-line bg-accent-soft p-5">
          <Info size={20} strokeWidth={2} className="mt-0.5 shrink-0 text-accent" />
          <div>
            <p className="text-[17px] font-medium">Not connected yet</p>
            <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">
              Showing an outfit on your own photo needs an image service. Style List has everything
              else ready - your photo, the outfit and the hand-off - and will not fake a rendering
              in the meantime. Until then, the flat lay below is the real preview.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Your photo */}
        <section className="card-surface p-5">
          <h2 className="text-[20px] font-semibold tracking-[-0.02em]">Your photo</h2>
          <p className="mt-1 text-[15px] text-ink-soft">
            One full-length photo, standing straight. It stays on this device.
          </p>

          <div className="mt-4 aspect-[3/4] overflow-hidden rounded-[20px] bg-sunken">
            {photo ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={photo} alt="Your photo" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-ink-mute">
                <ImageIcon size={32} strokeWidth={1.6} />
                <p className="text-[15px]">No photo yet</p>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="secondary" size="md" onClick={() => fileInput.current?.click()}>
              {photo ? "Choose a different photo" : "Add a photo of you"}
            </Button>
            {photo ? (
              <Button
                variant="quiet"
                size="md"
                onClick={() => {
                  actions.updateProfile({ tryOnPhotoKey: undefined });
                  setPhoto(undefined);
                  toast("Photo removed", "plain");
                }}
              >
                Remove
              </Button>
            ) : null}
          </div>

          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              const key = `tryon-${Date.now()}`;
              await putPhoto(key, file);
              actions.updateProfile({ tryOnPhotoKey: key });
              setPhoto(URL.createObjectURL(file));
              toast("Photo saved to this device");
            }}
          />
        </section>

        {/* The outfit */}
        <section className="card-surface p-5">
          <h2 className="text-[20px] font-semibold tracking-[-0.02em]">Today&#39;s outfit</h2>
          <p className="mt-1 text-[15px] text-ink-soft">Tap a piece to swap it before you try it on.</p>

          <div className="mt-4">
            {builder.items.length ? (
              <OutfitFlatLay slots={builder.slots} />
            ) : (
              <EmptyState
                className="border-0 bg-transparent py-8"
                title="No outfit yet"
                description="Add some clothes and Style List will put an outfit together."
                art={<CategoryArt category="Hoodie" />}
                action={<ButtonLink href="/add">Add Clothes</ButtonLink>}
              />
            )}
          </div>

          <div className="mt-5">
            <Button
              size="lg"
              full
              disabled={!photo || !builder.items.length || busy}
              onClick={() => void run()}
            >
              {busy ? "Working…" : "Try It On"}
            </Button>
            {message ? (
              <p className="mt-3 text-center text-[15px] text-ink-soft">{message}</p>
            ) : null}
          </div>

          {result ? (
            <div className="mt-5 overflow-hidden rounded-[20px] bg-sunken">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={result} alt="Your outfit, on you" className="w-full object-contain" />
            </div>
          ) : null}
        </section>
      </div>
    </>
  );
}
