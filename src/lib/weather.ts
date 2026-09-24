"use client";

import type { Weather, WeatherCondition } from "./types";

/**
 * Weather, kept quiet.
 *
 * Style List is not a weather app - the forecast only exists to keep outfit
 * suggestions sensible. There are two honest sources:
 *
 *  - Manual: the person taps today's weather. This is the default, works
 *    offline and needs no permissions.
 *  - Forecast: with the person's permission, the browser's location is sent to
 *    Open-Meteo (a free, key-less public forecast API) and the current reading
 *    is used. Nothing else is sent anywhere.
 */

const WMO_TO_CONDITION: [number[], WeatherCondition][] = [
  [[0, 1], "Sunny"],
  [[2, 3, 45, 48], "Cloudy"],
  [[51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99], "Rain"],
  [[71, 73, 75, 77, 85, 86], "Snow"],
];

function conditionFromCode(code: number, windKph: number): WeatherCondition {
  for (const [codes, condition] of WMO_TO_CONDITION) {
    if (codes.includes(code)) return condition;
  }
  if (windKph > 32) return "Windy";
  return "Cloudy";
}

export interface ForecastResult {
  ok: boolean;
  weather?: Weather;
  error?: string;
}

export async function fetchForecast(): Promise<ForecastResult> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return { ok: false, error: "This browser cannot share a location." };
  }

  let position: GeolocationPosition;
  try {
    position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 10_000,
        maximumAge: 600_000,
      });
    });
  } catch {
    return { ok: false, error: "Location permission was not given." };
  }

  const { latitude, longitude } = position.coords;
  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${latitude.toFixed(3)}&longitude=${longitude.toFixed(3)}` +
    "&current=temperature_2m,weather_code,wind_speed_10m";

  try {
    const response = await fetch(url);
    if (!response.ok) return { ok: false, error: "The forecast service did not answer." };
    const json = (await response.json()) as {
      current?: { temperature_2m?: number; weather_code?: number; wind_speed_10m?: number };
    };
    const current = json.current;
    if (!current || typeof current.temperature_2m !== "number") {
      return { ok: false, error: "The forecast came back empty." };
    }
    return {
      ok: true,
      weather: {
        tempC: Math.round(current.temperature_2m),
        condition: conditionFromCode(current.weather_code ?? 3, current.wind_speed_10m ?? 0),
        source: "forecast",
        updatedAt: new Date().toISOString(),
      },
    };
  } catch {
    return { ok: false, error: "Could not reach the forecast service." };
  }
}

/** Plain-English one-liner shown on Home. */
export function weatherSentence(weather: Weather, units: "C" | "F"): string {
  const temperature =
    units === "C" ? `${Math.round(weather.tempC)}°` : `${Math.round((weather.tempC * 9) / 5 + 32)}°`;
  switch (weather.condition) {
    case "Rain":
      return `${temperature} and raining`;
    case "Snow":
      return `${temperature} and snowing`;
    case "Sunny":
      return `${temperature} and sunny`;
    case "Windy":
      return `${temperature} and windy`;
    default:
      return `${temperature} and cloudy`;
  }
}
