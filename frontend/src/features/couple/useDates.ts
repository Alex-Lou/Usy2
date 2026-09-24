import { useCallback, useEffect, useState } from "react";
import { getAllProfiles } from "../profile/api";
import { onCoupleActivity } from "./activity";
import { getEvents, getSharedWidgets } from "./api";
import { countdownsFrom, type Countdown } from "./dates";
import type { CoupleEvent } from "./types";

/**
 * The shared dates plus every countdown widget (both profiles and the side
 * menu), kept in sync when either person changes them.
 */
export function useDates() {
  const [events, setEvents] = useState<CoupleEvent[] | null>(null);
  const [countdowns, setCountdowns] = useState<Countdown[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(() => {
    getEvents()
      .then((all) => {
        setEvents(all);
        setError(null);
      })
      .catch(() => setError("Impossible de charger les dates."));
  }, []);

  const loadCountdowns = useCallback(() => {
    Promise.all([getSharedWidgets().catch(() => null), getAllProfiles().catch(() => [])]).then(([shared, profiles]) =>
      setCountdowns(countdownsFrom([shared?.widgets ?? [], ...profiles.map((p) => p.widgets)])),
    );
  }, []);

  useEffect(() => {
    loadEvents();
    loadCountdowns();
    return onCoupleActivity((a) => {
      if (a.kind === "events") loadEvents();
      else if (a.kind === "widgets") loadCountdowns();
    });
  }, [loadEvents, loadCountdowns]);

  return { events, setEvents, countdowns, error, reload: loadEvents };
}
