"use client";

import { Camera, ImageIcon, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

/**
 * Taking the photo.
 *
 * Where the browser will give us the camera, this is a live view with a
 * framing guide, and the button takes the picture. Where it will not - a
 * desktop with no camera, a denied permission, an in-app browser - the same
 * button opens the phone's own camera or photo library instead. Either way the
 * person taps one big button and gets a photo, and is never left staring at a
 * broken viewfinder.
 */

type CameraState = "starting" | "live" | "unavailable";

export function CameraCapture({
  title,
  instruction,
  primaryLabel,
  onCapture,
  guide,
  footer,
}: {
  title: string;
  instruction: string;
  primaryLabel: string;
  onCapture: (blob: Blob) => void;
  /** The garment outline drawn inside the framing guide. */
  guide?: React.ReactNode;
  /** An extra action under the two buttons, e.g. "Skip Back Photo". */
  footer?: React.ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<CameraState>("starting");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    /* Some browsers never answer the permission prompt (or answer it in a
       dialog the person has walked away from). Rather than leave someone
       looking at "Opening the camera" forever, give up after a few seconds and
       offer the photo library route, which always works. */
    const giveUp = window.setTimeout(() => {
      if (!cancelled) setState((current) => (current === "starting" ? "unavailable" : current));
    }, 6000);

    const start = async () => {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setState("unavailable");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setState("live");
      } catch {
        if (!cancelled) setState("unavailable");
      }
    };

    void start();
    return () => {
      cancelled = true;
      window.clearTimeout(giveUp);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  const takePhoto = useCallback(async () => {
    const video = videoRef.current;
    if (state !== "live" || !video || !video.videoWidth) {
      fileInputRef.current?.click();
      return;
    }
    setBusy(true);
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setBusy(false);
      return;
    }
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        setBusy(false);
        if (blob) onCapture(blob);
      },
      "image/jpeg",
      0.92,
    );
  }, [onCapture, state]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-5 pt-2 sm:px-8">
        <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.03em] sm:text-[34px]">
          {title}
        </h1>
        <p className="mt-2 max-w-md text-[16px] leading-snug text-ink-soft">{instruction}</p>
      </div>

      <div className="mt-5 flex min-h-0 flex-1 flex-col px-5 sm:px-8">
        <div className="relative mx-auto w-full max-w-xl flex-1 min-h-[220px] max-h-[52vh] sm:max-h-[62vh] overflow-hidden rounded-[26px] bg-[#1b1c20]">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`h-full w-full object-cover transition-opacity duration-500 ${
              state === "live" ? "opacity-100" : "opacity-0"
            }`}
          />

          {/* Framing guide */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-7">
            <div className="relative h-full w-full max-w-[340px]">
              <GuideCorners />
              {guide ? (
                <div className="absolute inset-6 opacity-[0.22]">{guide}</div>
              ) : null}
            </div>
          </div>

          {state !== "live" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
              <Camera size={30} strokeWidth={1.8} className="text-white/70" />
              <p className="max-w-xs text-[15px] leading-snug text-white/80">
                {state === "starting"
                  ? "Opening the camera…"
                  : "Tap the button below to use your camera or pick a photo you already have."}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 px-5 pb-6 pb-safe sm:px-8">
        <Button size="lg" full onClick={takePhoto} disabled={busy} icon={<Camera size={20} strokeWidth={2.2} />}>
          {primaryLabel}
        </Button>
        <Button
          variant="quiet"
          size="md"
          full
          onClick={() => fileInputRef.current?.click()}
          icon={<ImageIcon size={18} strokeWidth={2} />}
        >
          Choose From Photos
        </Button>
        {footer}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        {...(state === "unavailable" ? { capture: "environment" as const } : {})}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onCapture(file);
        }}
      />
    </div>
  );
}

function GuideCorners() {
  const corner = "absolute h-9 w-9 border-white/55";
  return (
    <>
      <span className={`${corner} top-0 left-0 rounded-tl-[14px] border-t-2 border-l-2`} />
      <span className={`${corner} top-0 right-0 rounded-tr-[14px] border-t-2 border-r-2`} />
      <span className={`${corner} bottom-0 left-0 rounded-bl-[14px] border-b-2 border-l-2`} />
      <span className={`${corner} bottom-0 right-0 rounded-br-[14px] border-b-2 border-r-2`} />
    </>
  );
}

/**
 * The photo the person just took, with the two decisions that matter.
 */
export function ReviewShot({
  url,
  title,
  onUse,
  onRetake,
  extraAction,
}: {
  url: string;
  title: string;
  onUse: () => void;
  onRetake: () => void;
  extraAction?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-5 pt-2 sm:px-8">
        <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.03em] sm:text-[34px]">
          {title}
        </h1>
      </div>

      <div className="mt-5 flex min-h-0 flex-1 flex-col px-5 sm:px-8">
        <div className="mx-auto w-full max-w-xl flex-1 min-h-[220px] max-h-[52vh] sm:max-h-[62vh] overflow-hidden rounded-[26px] bg-sunken">
          {/* A local blob URL from the camera. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="The photo you just took" className="h-full w-full object-contain" />
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 px-5 pb-6 pb-safe sm:px-8">
        <Button size="lg" full onClick={onUse}>
          Use Photo
        </Button>
        <Button
          variant="secondary"
          size="md"
          full
          onClick={onRetake}
          icon={<RotateCcw size={18} strokeWidth={2} />}
        >
          Retake
        </Button>
        {extraAction}
      </div>
    </div>
  );
}
