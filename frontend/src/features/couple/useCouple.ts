import { useCallback, useEffect, useState } from "react";
import { onCoupleActivity } from "./activity";
import { getCouple } from "./api";
import type { CoupleOverview } from "./types";

/** The shared overview, kept fresh when either person changes a mood, a note or the date. */
export function useCouple() {
  const [couple, setCouple] = useState<CoupleOverview | null>(null);

  const reload = useCallback(() => {
    getCouple().then(setCouple).catch(() => {});
  }, []);

  useEffect(() => {
    reload();
    return onCoupleActivity((a) => {
      if (a.kind === "mood" || a.kind === "note" || a.kind === "together") reload();
    });
  }, [reload]);

  return { couple, setCouple, reload };
}
