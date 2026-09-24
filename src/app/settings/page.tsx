"use client";

import { Check, Minus, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { WeatherSheet } from "@/components/home/WeatherSheet";
import { PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/Controls";
import { TextField } from "@/components/ui/Field";
import { FieldShell, OptionList } from "@/components/ui/Select";
import { LocationIcon } from "@/components/ui/LocationIcon";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { aiCapabilities, refreshAiCapabilities, type AiCapabilities } from "@/lib/ai/imageProcessing";
import { useCloset } from "@/lib/store";
import { plural } from "@/lib/utils";
import { weatherSentence } from "@/lib/weather";

/**
 * Settings.
 *
 * Including an honest account of what is doing the work behind the scenes:
 * whether photos are cleaned up on this device or by a connected service, and
 * where the closet is stored.
 */
export default function SettingsPage() {
  const { data, actions, ready } = useCloset();
  const toast = useToast();

  const [capabilities, setCapabilities] = useState<AiCapabilities>();
  const [weatherOpen, setWeatherOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [addLocationOpen, setAddLocationOpen] = useState(false);
  const [newLocation, setNewLocation] = useState("");
  const [resetOpen, setResetOpen] = useState<"empty" | "sample" | null>(null);

  useEffect(() => {
    void aiCapabilities().then(setCapabilities);
  }, []);

  if (!ready) return <div className="h-96 animate-pulse rounded-[22px] bg-sunken" />;

  const here = data.locations.find((l) => l.id === data.profile.currentLocationId);
  const sampleCount = data.items.filter((item) => item.id.startsWith("item_")).length;

  return (
    <>
      <PageHeader title="Settings" />

      <div className="flex max-w-2xl flex-col gap-8">
        {/* You */}
        <Section title="You">
          <TextField
            label="Name"
            value={data.profile.name}
            onChange={(event) => actions.updateProfile({ name: event.target.value })}
            placeholder="Your name"
          />
          <FieldShell label="Where you are now" onClick={() => setLocationOpen(true)}>
            <span className="flex items-center gap-2.5">
              <LocationIcon icon={here?.icon} size={18} className="text-ink-soft" />
              {here?.name ?? "Choose"}
            </span>
          </FieldShell>
          <FieldShell label="Today's weather" onClick={() => setWeatherOpen(true)}>
            {weatherSentence(data.profile.weather, data.profile.units)}
          </FieldShell>
          <div>
            <p className="label-caps mb-2">Temperature</p>
            <SegmentedControl
              options={[
                { value: "C", label: "Celsius" },
                { value: "F", label: "Fahrenheit" },
              ]}
              value={data.profile.units}
              onChange={(units) => actions.updateProfile({ units })}
            />
          </div>
        </Section>

        {/* Locations */}
        <Section title="Locations" description="Everywhere you keep clothes.">
          <div className="flex flex-col gap-2.5">
            {data.locations.map((location) => {
              const count = data.items.filter((item) => item.locationId === location.id).length;
              return (
                <div
                  key={location.id}
                  className="flex min-h-16 items-center gap-3.5 rounded-[18px] border border-line bg-surface px-4"
                >
                  <LocationIcon icon={location.icon} size={20} className="text-ink-soft" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[17px] font-medium">{location.name}</p>
                    <p className="text-[14px] text-ink-mute">{plural(count, "item")}</p>
                  </div>
                  {data.locations.length > 1 ? (
                    <button
                      type="button"
                      aria-label={`Delete ${location.name}`}
                      onClick={() => {
                        actions.deleteLocation(location.id);
                        toast(`${location.name} removed`, "plain");
                      }}
                      className="flex h-11 w-11 items-center justify-center rounded-full text-ink-mute transition-colors hover:bg-sunken hover:text-alert"
                    >
                      <Trash2 size={18} strokeWidth={2} />
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
          <Button
            variant="secondary"
            size="md"
            onClick={() => setAddLocationOpen(true)}
            icon={<Plus size={18} strokeWidth={2.4} />}
          >
            Add Location
          </Button>
        </Section>

        {/* Photos and AI */}
        <Section
          title="Photos"
          description="What happens to a picture after you take it."
        >
          <StatusRow
            label="Cleaning up photos"
            value={
              capabilities?.imageProcessing
                ? `Connected service${capabilities.imageProviderName ? ` (${capabilities.imageProviderName})` : ""}`
                : "On this device"
            }
            note={
              capabilities?.imageProcessing
                ? "Photos are sent to the connected image service, cleaned up and sent back."
                : "Style List separates the item from its background, straightens it and evens out the lighting right here in your browser. Nothing is uploaded. If a photo is too busy to read, your original is kept."
            }
          />
          <StatusRow
            label="Identifying items"
            value={capabilities?.itemAnalysis ? "Claude" : "On this device"}
            note={
              capabilities?.itemAnalysis
                ? "Photos are sent to Claude, which suggests the item type, colours and brand. You always confirm."
                : "Colours are measured from the photo and the type is read from the shape. Brand and material are left blank rather than guessed."
            }
          />
          <StatusRow
            label="Try It On"
            working={Boolean(capabilities?.tryOn)}
            value={capabilities?.tryOn ? "Connected" : "Not connected"}
            note={
              capabilities?.tryOn
                ? "An image service is connected and can render outfits on your photo."
                : "Seeing outfits on yourself needs an image service. Style List shows the flat lay instead rather than faking a result."
            }
          />
          <Button
            variant="quiet"
            size="md"
            onClick={() => {
              refreshAiCapabilities();
              void aiCapabilities().then((next) => {
                setCapabilities(next);
                toast("Checked");
              });
            }}
          >
            Check again
          </Button>
        </Section>

        {/* Data */}
        <Section
          title="Your closet"
          description="Everything lives in this browser on this device. Nothing is sent anywhere unless a service above says otherwise."
        >
          <StatusRow
            label="In your closet"
            value={`${plural(data.items.length, "item")}, ${plural(data.outfits.length, "outfit")}`}
            note={
              sampleCount
                ? `${plural(sampleCount, "item")} came from the sample closet Style List started you with.`
                : undefined
            }
          />
          {sampleCount ? (
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                actions.removeSampleCloset();
                toast("Sample clothes removed");
              }}
            >
              Remove the sample clothes
            </Button>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" size="md" onClick={() => setResetOpen("sample")}>
              Restore sample closet
            </Button>
            <Button variant="danger" size="md" onClick={() => setResetOpen("empty")}>
              Start an empty closet
            </Button>
          </div>
        </Section>

        <p className="pb-4 text-[14px] leading-relaxed text-ink-mute">
          Style List keeps your clothes, outfits and photos on this device. Clearing your browser
          data removes them.
        </p>
      </div>

      {/* Sheets */}
      <WeatherSheet open={weatherOpen} onClose={() => setWeatherOpen(false)} />

      <Sheet
        open={locationOpen}
        onClose={() => setLocationOpen(false)}
        title="Where are you right now?"
      >
        <OptionList
          options={data.locations.map((location) => ({
            value: location.id,
            label: location.name,
            icon: <LocationIcon icon={location.icon} />,
          }))}
          selected={[data.profile.currentLocationId]}
          onSelect={(value) => {
            actions.updateProfile({ currentLocationId: value });
            setLocationOpen(false);
          }}
        />
      </Sheet>

      <Sheet
        open={addLocationOpen}
        onClose={() => setAddLocationOpen(false)}
        title="Add a location"
        footer={
          <Button
            size="lg"
            full
            disabled={!newLocation.trim()}
            onClick={() => {
              actions.addLocation(newLocation.trim());
              toast(`${newLocation.trim()} added`);
              setNewLocation("");
              setAddLocationOpen(false);
            }}
          >
            Save Location
          </Button>
        }
      >
        <TextField
          label="Name"
          value={newLocation}
          onChange={(event) => setNewLocation(event.target.value)}
          placeholder="Sister's house"
          autoFocus
        />
      </Sheet>

      <Sheet
        open={Boolean(resetOpen)}
        onClose={() => setResetOpen(null)}
        title={resetOpen === "empty" ? "Start an empty closet?" : "Restore the sample closet?"}
        description={
          resetOpen === "empty"
            ? "Every item, outfit, trip and photo is removed from this device. This cannot be undone."
            : "Your current clothes, outfits and photos are replaced with the sample closet."
        }
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" size="lg" className="flex-1" onClick={() => setResetOpen(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="lg"
              className="flex-1"
              onClick={() => {
                actions.resetCloset(resetOpen === "empty" ? "empty" : "sample");
                setResetOpen(null);
                toast(resetOpen === "empty" ? "Closet emptied" : "Sample closet restored");
              }}
            >
              {resetOpen === "empty" ? "Empty It" : "Restore"}
            </Button>
          </div>
        }
      >
        <p className="text-[16px] text-ink-soft">
          {plural(data.items.length, "item")} in your closet right now.
        </p>
      </Sheet>
    </>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-[22px] font-semibold tracking-[-0.02em]">{title}</h2>
      {description ? (
        <p className="mt-1 mb-4 text-[15px] leading-snug text-ink-soft">{description}</p>
      ) : (
        <div className="mb-4" />
      )}
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

function StatusRow({
  label,
  value,
  note,
  working = true,
}: {
  label: string;
  value: string;
  note?: string;
  /** False for something that is simply not set up - no tick, no alarm. */
  working?: boolean;
}) {
  return (
    <div className="rounded-[18px] border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[16px] font-medium">{label}</p>
        <p className="flex items-center gap-1.5 text-right text-[15px] text-ink-soft">
          {working ? (
            <Check size={15} strokeWidth={2.6} className="text-good" />
          ) : (
            <Minus size={15} strokeWidth={2.6} className="text-ink-mute" />
          )}
          {value}
        </p>
      </div>
      {note ? <p className="mt-2 text-[14px] leading-relaxed text-ink-mute">{note}</p> : null}
    </div>
  );
}
