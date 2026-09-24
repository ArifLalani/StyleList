"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { suggestPacking } from "@/lib/ai/stylist";
import { useCloset } from "@/lib/store";
import type { Trip, TripActivity, WeatherCondition } from "@/lib/types";
import { TRIP_ACTIVITIES, WEATHER_CONDITIONS } from "@/lib/types";
import { cn, formatTemp } from "@/lib/utils";

/**
 * Planning a trip: four plain questions, then a packing list made of clothes
 * the person already owns.
 */
export function PlanTripSheet({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (trip: Trip) => void;
}) {
  const { data, actions } = useCloset();
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [days, setDays] = useState(4);
  const [activities, setActivities] = useState<TripActivity[]>(["Casual"]);
  const [condition, setCondition] = useState<WeatherCondition>("Cloudy");
  const [tempC, setTempC] = useState(15);

  const units = data.profile.units;

  const create = () => {
    const packing = suggestPacking(data, {
      days,
      activities,
      expectedWeather: condition,
      expectedTempC: tempC,
    });
    const trip = actions.saveTrip({
      destination: destination.trim() || "My trip",
      startDate: new Date(startDate).toISOString(),
      days,
      activities,
      expectedWeather: condition,
      expectedTempC: tempC,
      items: packing.map((pick) => ({ itemId: pick.itemId, packed: false, reason: pick.reason })),
    });
    onCreated(trip);
    onClose();
    setDestination("");
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      size="wide"
      title="Plan a trip"
      description="Style List will suggest what to pack from your own closet."
      footer={
        <Button size="lg" full onClick={create}>
          Create Packing List
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        <TextField
          label="Where are you going?"
          value={destination}
          onChange={(event) => setDestination(event.target.value)}
          placeholder="Vancouver"
        />

        <TextField
          label="When do you leave?"
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
        />

        <section>
          <h3 className="label-caps mb-2">How many days?</h3>
          <div className="no-scrollbar -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1">
            {[2, 3, 4, 5, 7, 10, 14].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setDays(option)}
                className={cn(
                  "min-h-14 min-w-14 shrink-0 rounded-[16px] border px-4 text-[16px] font-medium transition-colors",
                  days === option
                    ? "border-ink bg-ink text-white"
                    : "border-line bg-surface hover:border-line-strong",
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="label-caps mb-2">What are you doing?</h3>
          <div className="flex flex-wrap gap-2.5">
            {TRIP_ACTIVITIES.map((activity) => {
              const isOn = activities.includes(activity);
              return (
                <button
                  key={activity}
                  type="button"
                  onClick={() =>
                    setActivities((current) =>
                      isOn ? current.filter((entry) => entry !== activity) : [...current, activity],
                    )
                  }
                  className={cn(
                    "min-h-13 rounded-[16px] border px-4 text-[16px] font-medium transition-colors",
                    isOn ? "border-ink bg-ink text-white" : "border-line bg-surface hover:border-line-strong",
                  )}
                >
                  {activity}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className="label-caps mb-2">What is the weather like there?</h3>
          <div className="flex flex-wrap gap-2.5">
            {WEATHER_CONDITIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setCondition(option)}
                className={cn(
                  "min-h-13 rounded-[16px] border px-4 text-[16px] font-medium transition-colors",
                  condition === option
                    ? "border-ink bg-ink text-white"
                    : "border-line bg-surface hover:border-line-strong",
                )}
              >
                {option}
              </button>
            ))}
          </div>
          <div className="no-scrollbar -mx-1 mt-2.5 flex gap-2.5 overflow-x-auto px-1 pb-1">
            {[-5, 0, 5, 10, 15, 20, 25, 30].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setTempC(option)}
                className={cn(
                  "min-h-13 min-w-16 shrink-0 rounded-[16px] border px-3 text-[15px] font-medium transition-colors",
                  tempC === option
                    ? "border-ink bg-ink text-white"
                    : "border-line bg-surface hover:border-line-strong",
                )}
              >
                {formatTemp(option, units)}
              </button>
            ))}
          </div>
        </section>
      </div>
    </Sheet>
  );
}
