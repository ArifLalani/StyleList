"use client";

import { Check, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AddLocationSheet,
  ConfirmItem,
  type ItemDraft,
} from "@/components/add/ConfirmItem";
import { CameraCapture, ReviewShot } from "@/components/add/CameraCapture";
import {
  ProcessingView,
  ReviewPhotos,
  type ProcessStep,
  type ReviewView,
} from "@/components/add/ProcessingView";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Toggle, StepProgress } from "@/components/ui/Controls";
import { CategoryArt } from "@/components/ui/ItemImage";
import { useToast } from "@/components/ui/Toast";
import { analyzeClothingItem, type ItemSuggestion } from "@/lib/ai/analyzeClothing";
import {
  processClothingImage,
  type ProcessClothingImageResult,
  type ProcessingStepName,
} from "@/lib/ai/imageProcessing";
import { putPhoto } from "@/lib/photoStore";
import { useCloset } from "@/lib/store";
import type { ClothingImage } from "@/lib/types";
import { uid } from "@/lib/utils";

/**
 * Front. Back. Done.
 *
 * The whole point of Style List: two photos and a confirm screen. Nothing is
 * asked that can be worked out from the picture, the closet or the last item
 * that was added.
 */

type Stage =
  | "front"
  | "front-review"
  | "back"
  | "back-review"
  | "processing"
  | "review"
  | "confirm"
  | "saved";

interface Shot {
  blob: Blob;
  url: string;
}

const STEP_LABELS = ["Removing background", "Straightening item", "Identifying details"];

export default function AddPage() {
  const router = useRouter();
  const toast = useToast();
  const { data, actions } = useCloset();

  const [stage, setStage] = useState<Stage>("front");
  const [front, setFront] = useState<Shot>();
  const [back, setBack] = useState<Shot>();
  const [frontResult, setFrontResult] = useState<ProcessClothingImageResult>();
  const [backResult, setBackResult] = useState<ProcessClothingImageResult>();
  const [processedUrls, setProcessedUrls] = useState<{ front?: string; back?: string }>({});
  const [suggestion, setSuggestion] = useState<ItemSuggestion>();
  const [draft, setDraft] = useState<ItemDraft>();
  const [steps, setSteps] = useState<ProcessStep[]>(
    STEP_LABELS.map((label, index) => ({ label, state: index === 0 ? "active" : "pending" })),
  );
  const [reviewView, setReviewView] = useState<ReviewView>("front");
  const [keepGoing, setKeepGoing] = useState(false);
  const [addLocationOpen, setAddLocationOpen] = useState(false);
  const [savedItemId, setSavedItemId] = useState<string>();
  const [savedCount, setSavedCount] = useState(0);

  const urlsToRevoke = useRef<string[]>([]);
  const trackUrl = useCallback((url: string) => {
    urlsToRevoke.current.push(url);
    return url;
  }, []);

  useEffect(
    () => () => {
      urlsToRevoke.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  /* Where new clothes go by default: wherever the person is now. */
  const defaultLocationId =
    data.profile.currentLocationId ??
    data.locations.find((location) => location.isDefault)?.id ??
    data.locations[0]?.id;

  const resetForNext = useCallback(() => {
    setFront(undefined);
    setBack(undefined);
    setFrontResult(undefined);
    setBackResult(undefined);
    setProcessedUrls({});
    setSuggestion(undefined);
    setDraft(undefined);
    setSavedItemId(undefined);
    setReviewView("front");
    setSteps(STEP_LABELS.map((label, index) => ({ label, state: index === 0 ? "active" : "pending" })));
    setStage("front");
  }, []);

  /* ---------------------------------------------------------------- */
  /* Processing                                                        */
  /* ---------------------------------------------------------------- */

  const advanceStep = useCallback((name: ProcessingStepName) => {
    setSteps((current) => {
      const index =
        name === "Removing background"
          ? 0
          : name === "Straightening item" || name === "Evening out the lighting"
            ? 1
            : name === "Finishing up"
              ? 2
              : 0;
      return current.map((step, position) => ({
        ...step,
        state: position < index ? "done" : position === index ? "active" : "pending",
      }));
    });
  }, []);

  const runProcessing = useCallback(
    async (frontShot: Shot, backShot?: Shot) => {
      setStage("processing");
      const startedAt = Date.now();

      const frontProcessed = await processClothingImage(frontShot.blob, { onStep: advanceStep });
      const backProcessed = backShot
        ? await processClothingImage(backShot.blob)
        : undefined;

      setSteps((current) =>
        current.map((step, index) => ({
          ...step,
          state: index < 2 ? "done" : "active",
        })),
      );

      const read = await analyzeClothingItem({
        processed: frontProcessed.usedOriginal ? undefined : frontProcessed.blob,
        original: frontShot.blob,
      });

      /* Never flash past the state - it reads as a glitch rather than work. */
      const elapsed = Date.now() - startedAt;
      if (elapsed < 1400) await new Promise((resolve) => setTimeout(resolve, 1400 - elapsed));

      setSteps((current) => current.map((step) => ({ ...step, state: "done" })));
      setFrontResult(frontProcessed);
      setBackResult(backProcessed);
      setProcessedUrls({
        front: trackUrl(URL.createObjectURL(frontProcessed.blob)),
        back: backProcessed ? trackUrl(URL.createObjectURL(backProcessed.blob)) : undefined,
      });
      setSuggestion(read);
      setDraft({
        name: read.name,
        category: read.category,
        subcategory: read.subcategory,
        brand: read.brand,
        primaryColor: read.primaryColor,
        secondaryColor: read.secondaryColor,
        pattern: read.pattern,
        material: read.material,
        locationId: defaultLocationId,
        status: "Clean",
        condition: "Good",
        favorite: false,
        season: read.season,
        warmth: read.warmth,
        dressiness: read.dressiness,
      });
      setStage("review");
    },
    [advanceStep, defaultLocationId, trackUrl],
  );

  /* ---------------------------------------------------------------- */
  /* Saving                                                            */
  /* ---------------------------------------------------------------- */

  const save = useCallback(async () => {
    if (!draft || !front) return;
    const itemId = uid("itm");

    const images: Omit<ClothingImage, "id" | "itemId" | "createdAt">[] = [];

    const store = async (
      shot: Shot,
      result: ProcessClothingImageResult | undefined,
      view: "front" | "back",
    ) => {
      const originalKey = `${itemId}-${view}-original`;
      await putPhoto(originalKey, shot.blob);
      let processedKey: string | undefined;
      if (result && !result.usedOriginal) {
        processedKey = `${itemId}-${view}-clean`;
        await putPhoto(processedKey, result.blob);
      }
      images.push({
        view,
        originalKey,
        processedKey,
        processingStatus: processedKey ? "done" : "failed",
        processor: result?.processor ?? "none",
        confidence: result?.confidence,
        width: result?.width,
        height: result?.height,
      });
    };

    await store(front, frontResult, "front");
    if (back) await store(back, backResult, "back");

    actions.addItem(
      {
        id: itemId,
        name: draft.name.trim() || `${draft.primaryColor} ${draft.category}`,
        category: draft.category,
        subcategory: draft.subcategory,
        brand: draft.brand?.trim() || undefined,
        primaryColor: draft.primaryColor,
        secondaryColor: draft.secondaryColor,
        size: draft.size?.trim() || undefined,
        pattern: draft.pattern,
        material: draft.material?.trim() || undefined,
        locationId: draft.locationId,
        status: draft.status,
        condition: draft.condition,
        favorite: draft.favorite,
        season: draft.season,
        warmth: draft.warmth,
        dressiness: draft.dressiness,
        timesWorn: 0,
        purchaseDate: draft.purchaseDate,
        purchasePrice: draft.purchasePrice,
        notes: draft.notes?.trim() || undefined,
      },
      images,
    );

    setSavedItemId(itemId);
    setSavedCount((count) => count + 1);

    if (keepGoing) {
      toast(`${draft.name} added`);
      resetForNext();
    } else {
      setStage("saved");
    }
  }, [actions, back, backResult, draft, front, frontResult, keepGoing, resetForNext, toast]);

  /* ---------------------------------------------------------------- */
  /* Screens                                                           */
  /* ---------------------------------------------------------------- */

  const stepNumber =
    stage === "front" || stage === "front-review"
      ? 1
      : stage === "back" || stage === "back-review"
        ? 2
        : 3;

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      {/* Top bar */}
      {stage !== "saved" ? (
        <div className="flex items-center justify-between gap-4 px-4 pt-3 pt-safe sm:px-7">
          <button
            type="button"
            onClick={() => (savedCount > 0 ? router.push("/closet") : router.back())}
            className="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[16px] font-medium text-ink-soft transition-colors hover:bg-sunken"
          >
            <X size={20} strokeWidth={2.2} />
            Cancel
          </button>
          <StepProgress step={stepNumber} total={3} />
        </div>
      ) : null}

      {stage === "front" ? (
        <>
          <CameraCapture
            title="Take a photo of the front"
            instruction="Lay the item flat or hang it up. Make sure the entire item is visible."
            primaryLabel="Take Front Photo"
            guide={<CategoryArt category="Hoodie" color="White" />}
            onCapture={(blob) => {
              setFront({ blob, url: trackUrl(URL.createObjectURL(blob)) });
              setStage("front-review");
            }}
          />
          <div className="mx-auto w-full max-w-xl px-5 pb-8 sm:px-8">
            <div className="rounded-[18px] border border-line bg-surface px-4">
              <Toggle
                checked={keepGoing}
                onChange={setKeepGoing}
                label="Add several items in a row"
                hint="The camera opens again as soon as each item is saved."
              />
            </div>
          </div>
        </>
      ) : null}

      {stage === "front-review" && front ? (
        <ReviewShot
          url={front.url}
          title="Front photo"
          onUse={() => setStage("back")}
          onRetake={() => {
            setFront(undefined);
            setStage("front");
          }}
        />
      ) : null}

      {stage === "back" ? (
        <CameraCapture
          title="Now take the back"
          instruction="Flip the item over. This helps Style List show the whole piece later."
          primaryLabel="Take Back Photo"
          guide={<CategoryArt category="Hoodie" color="White" />}
          onCapture={(blob) => {
            setBack({ blob, url: trackUrl(URL.createObjectURL(blob)) });
            setStage("back-review");
          }}
          footer={
            <Button
              variant="quiet"
              size="md"
              full
              onClick={() => front && void runProcessing(front)}
            >
              Skip Back Photo
            </Button>
          }
        />
      ) : null}

      {stage === "back-review" && back ? (
        <ReviewShot
          url={back.url}
          title="Back photo"
          onUse={() => front && void runProcessing(front, back)}
          onRetake={() => {
            setBack(undefined);
            setStage("back");
          }}
        />
      ) : null}

      {stage === "processing" ? <ProcessingView steps={steps} /> : null}

      {stage === "review" && front ? (
        <ReviewPhotos
          view={reviewView}
          onViewChange={setReviewView}
          frontUrl={processedUrls.front}
          backUrl={processedUrls.back}
          originalUrl={reviewView === "original" ? front.url : undefined}
          hasBack={Boolean(back)}
          note={
            frontResult?.usedOriginal
              ? "Style List kept your original photo - it couldn't separate the item from the background confidently. You can retake it on a plainer surface, or keep it as it is."
              : undefined
          }
          onConfirm={() => setStage("confirm")}
          onRetake={() => {
            setFront(undefined);
            setBack(undefined);
            setStage("front");
          }}
        />
      ) : null}

      {stage === "confirm" && draft ? (
        <ConfirmItem
          draft={draft}
          onChange={(patch) => setDraft({ ...draft, ...patch })}
          imageUrl={processedUrls.front ?? front?.url}
          suggestion={suggestion}
          locations={data.locations}
          onAddLocation={() => setAddLocationOpen(true)}
          onSave={() => void save()}
        />
      ) : null}

      {stage === "saved" ? (
        <SavedView
          imageUrl={processedUrls.front ?? front?.url}
          name={draft?.name ?? "Your item"}
          itemId={savedItemId}
          onAddAnother={resetForNext}
        />
      ) : null}

      <AddLocationSheet
        open={addLocationOpen}
        onClose={() => setAddLocationOpen(false)}
        onCreate={(name) => {
          const location = actions.addLocation(name);
          setDraft((current) => (current ? { ...current, locationId: location.id } : current));
          toast(`${name} added`);
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Success                                                             */
/* ------------------------------------------------------------------ */

function SavedView({
  imageUrl,
  name,
  itemId,
  onAddAnother,
}: {
  imageUrl?: string;
  name: string;
  itemId?: string;
  onAddAnother: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-10 text-center">
      <div className="relative h-60 w-60 rounded-[28px] bg-sunken p-7">
        {imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imageUrl}
            alt={name}
            className="h-full w-full animate-[settle_0.6s_var(--ease-out-soft)_both] object-contain"
          />
        ) : null}
        <span className="absolute -right-2 -bottom-2 flex h-14 w-14 animate-[pop_0.45s_var(--ease-out-soft)_0.25s_both] items-center justify-center rounded-full bg-ink text-white shadow-[0_8px_24px_rgba(20,20,24,0.28)]">
          <Check size={28} strokeWidth={3} />
        </span>
      </div>

      <h1 className="mt-9 text-[30px] leading-tight font-semibold tracking-[-0.03em]">
        Added to your closet
      </h1>
      <p className="mt-2 text-[17px] text-ink-soft">{name}</p>

      <div className="mt-9 flex w-full max-w-sm flex-col gap-3">
        <Button size="lg" full onClick={onAddAnother}>
          Add Another
        </Button>
        {itemId ? (
          <ButtonLink href={`/closet/${itemId}`} variant="secondary" size="md" full>
            View Item
          </ButtonLink>
        ) : null}
        <Link
          href="/closet"
          className="flex min-h-12 items-center justify-center text-[16px] font-medium text-ink-soft transition-colors hover:text-ink"
        >
          Done
        </Link>
      </div>
    </div>
  );
}
