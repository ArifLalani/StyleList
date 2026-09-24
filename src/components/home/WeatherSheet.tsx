"use client";

import { CloudSun, MapPin } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { useCloset } from "@/lib/store";
import type { Weather, WeatherCondition } from "@/lib/types";
import { WEATHER_CONDITIONS } from "@/lib/types";
import { cn, formatTemp } from "@/lib/utils";
import { fetchForecast } from "@/lib/weather";

/**
 * Today's weather, set in about two taps.
 *
 * Manual by default so the app works with no permissions at all. The forecast
 * button asks for location and reads a public forecast service - and says so.
 */
export function WeatherSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, actions } = useCloset();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const weather = data.profile.weather;
  const units = data.profile.units;

  const setWeather = (patch: Partial<Weather>) =>
    actions.setWeather({ ...weather, ...patch, source: "manual" });

  const temps = [-10, -5, 0, 5, 10, 15, 20, 25, 30, 35];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Today's weather"
      description="Style List uses this to pick clothes you will be comfortable in."
      footer={
        <Button size="lg" full onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        <section>
          <h3 className="label-caps mb-2">How it feels outside</h3>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
            {WEATHER_CONDITIONS.map((condition) => (
              <button
                key={condition}
                type="button"
                onClick={() => setWeather({ condition: condition as WeatherCondition })}
                className={cn(
                  "min-h-14 rounded-[16px] border text-[15px] font-medium transition-colors",
                  weather.condition === condition
                    ? "border-ink bg-ink text-white"
                    : "border-line bg-surface hover:border-line-strong",
                )}
              >
                {condition}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="label-caps mb-2">Temperature</h3>
          <div className="no-scrollbar -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1">
            {temps.map((temp) => (
              <button
                key={temp}
                type="button"
                onClick={() => setWeather({ tempC: temp })}
                className={cn(
                  "min-h-14 min-w-16 shrink-0 rounded-[16px] border px-3 text-[15px] font-medium transition-colors",
                  Math.round(weather.tempC) === temp
                    ? "border-ink bg-ink text-white"
                    : "border-line bg-surface hover:border-line-strong",
                )}
              >
                {formatTemp(temp, units)}
              </button>
            ))}
          </div>
        </section>

        <section>
          <Button
            variant="secondary"
            size="md"
            full
            disabled={busy}
            icon={<MapPin size={18} strokeWidth={2} />}
            onClick={async () => {
              setBusy(true);
              setError(undefined);
              const result = await fetchForecast();
              setBusy(false);
              if (result.ok && result.weather) actions.setWeather(result.weather);
              else setError(result.error);
            }}
          >
            {busy ? "Checking…" : "Use my location instead"}
          </Button>
          <p className="mt-2 text-[13px] leading-snug text-ink-mute">
            Asks your browser for your location and reads the current conditions from the free
            Open-Meteo forecast service. Nothing else leaves your device.
          </p>
          {error ? <p className="mt-2 text-[14px] text-alert">{error}</p> : null}
          {weather.source === "forecast" ? (
            <p className="mt-2 flex items-center gap-1.5 text-[14px] text-good">
              <CloudSun size={16} strokeWidth={2} />
              Using the current forecast.
            </p>
          ) : null}
        </section>
      </div>
    </Sheet>
  );
}
