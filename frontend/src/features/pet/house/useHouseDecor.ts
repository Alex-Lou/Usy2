import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../../../lib/api/client";
import { getHouse, MAX_PLACED, saveLayout, type House, type Placed, type Scene } from "./houseApi";

export type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * 🏡 The house for the page: loaded once, followed live (/topic/house), and
 * edited as a draft of one scene that saves itself shortly after each change
 * (only over the version it started from; if the other one saved meanwhile,
 * their version comes back and a note says so).
 */
export function useHouseDecor(scene: Scene) {
  const [house, setHouse] = useState<House | null>(null);
  const [draft, setDraft] = useState<Placed[] | null>(null); // non-null while editing
  const [selected, setSelected] = useState<number | null>(null);
  const [save, setSave] = useState<SaveState>("idle");
  const [note, setNote] = useState<string | null>(null);
  const version = useRef(0);
  const dirty = useRef(false);

  useEffect(() => {
    getHouse().then(setHouse).catch(() => setNote("La décoration ne répond pas pour l'instant."));
  }, []);

  /** Someone (maybe on another screen) changed the house: follow, unless a change of mine is on its way. */
  const follow = useCallback((h: House) => {
    setHouse(h);
    if (!dirty.current) {
      version.current = h.layouts[scene].version;
      setDraft((d) => (d ? h.layouts[scene].items : d));
    }
  }, [scene]);

  const start = useCallback(() => {
    if (!house) return;
    version.current = house.layouts[scene].version;
    dirty.current = false;
    setDraft(house.layouts[scene].items);
    setSelected(null);
    setSave("idle");
  }, [house, scene]);

  const edit = useCallback((change: (items: Placed[]) => Placed[]) => {
    dirty.current = true;
    setDraft((d) => (d ? change(d) : d));
  }, []);

  const flush = useCallback(async (items: Placed[], keepEditing: boolean) => {
    setSave("saving");
    try {
      const h = await saveLayout(scene, { version: version.current, items });
      dirty.current = false;
      version.current = h.layouts[scene].version;
      setHouse(h);
      setSave("saved");
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        const h = await getHouse().catch(() => null);
        if (h) {
          dirty.current = false;
          version.current = h.layouts[scene].version;
          setHouse(h);
          if (keepEditing) setDraft(h.layouts[scene].items);
          setSelected(null);
        }
        setNote("La maison venait d'être changée : voici sa dernière version.");
        setSave("idle");
      } else {
        setNote(e instanceof Error && e.message ? e.message : "Pas enregistré, réessaie.");
        setSave("error");
      }
    }
  }, [scene]);

  // Saves a moment after the last change (a drag is one change, not a hundred).
  useEffect(() => {
    if (!draft || !dirty.current) return;
    const id = window.setTimeout(() => void flush(draft, true), 700);
    return () => window.clearTimeout(id);
  }, [draft, flush]);

  /** Leaves edit mode; a change still waiting is saved right away (and shows meanwhile). */
  const stop = useCallback(() => {
    if (draft && dirty.current) {
      const items = draft;
      setHouse((h) => h && { ...h, layouts: { ...h.layouts, [scene]: { ...h.layouts[scene], items } } });
      void flush(items, false);
    }
    setDraft(null);
    setSelected(null);
  }, [draft, flush, scene]);

  useEffect(() => {
    if (!note) return;
    const id = window.setTimeout(() => setNote(null), 4000);
    return () => window.clearTimeout(id);
  }, [note]);

  const place = useCallback((item: string) => {
    let at = -1;
    edit((items) => {
      if (items.length >= MAX_PLACED) {
        setNote(`Pas plus de ${MAX_PLACED} objets dans une pièce.`);
        return items;
      }
      at = items.length;
      // A little off-centre each time, so several new ones don't hide each other.
      const nudge = (items.length % 5) * 0.03;
      return [...items, { item, x: 0.42 + nudge, y: 0.55 + nudge / 2, s: 1, r: 0, f: false }];
    });
    requestAnimationFrame(() => at >= 0 && setSelected(at));
  }, [edit]);

  return { house, setHouse, follow, draft, editing: draft !== null, start, stop, edit, place, selected, setSelected, save, note, setNote };
}
