import { useCallback, useEffect, useState } from "react";
import { onCoupleActivity } from "./activity";
import { getCouple } from "./api";
import type { CoupleOverview } from "./types";

/** The shared overview, kept fresh when either person changes a mood, a note or the date. */
export function useCouple() {
  const [couple, setCouple] = useState<CoupleOverview | null>(null);
  const [loading, setLoading] = useState(true); // first load only

  const reload = useCallback(() => {
    getCouple()
      .then(setCouple)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
    return onCoupleActivity((a) => {
      if (a.kind === "mood" || a.kind === "note" || a.kind === "together") reload();
    });
  }, [reload]);

  return { couple, loading, setCouple, reload };
}
