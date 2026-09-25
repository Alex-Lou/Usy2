import type { BorderId } from "./borders";
import type { Stroke } from "./draw";
import { NO_FINISH, type Finish } from "./looks";
import type { Frame, Layer } from "./render";

/** Everything the studio lets one change on a photo: what undo/redo and a draft keep. */
export interface StudioEdit {
  ratioId: string;
  frame: Frame;
  lookId: string;
  finish: Finish;
  border: BorderId;
  sliders: { brightness: number; contrast: number; saturate: number };
  sharpness: number;
  layers: Layer[];
  strokes: Stroke[];
  effect: string | null;
}

export const NO_EDIT: StudioEdit = {
  ratioId: "orig",
  frame: { rotation: 0, zoom: 1, panX: 0, panY: 0 },
  lookId: "none",
  finish: NO_FINISH,
  border: "none",
  sliders: { brightness: 1, contrast: 1, saturate: 1 },
  sharpness: 0,
  layers: [],
  strokes: [],
  effect: null,
};

// One draft at a time, on this device only (IndexedDB: the photo is too big for localStorage).
// A convenience: every failure is silent, the studio works the same without it.
const DB = "memocat-studio";
const STORE = "draft";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, work: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await open();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = work(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req ? req.result : undefined);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/** Keeps the photo being edited (once) and its latest edits. */
export async function saveDraft(file: File | null, edit: StudioEdit): Promise<void> {
  try {
    await run("readwrite", (s) => {
      if (file) s.put(file, "file");
      s.put(edit, "edit");
    });
  } catch {
    /* no draft, the studio still works */
  }
}

export async function loadDraft(): Promise<{ file: File; edit: StudioEdit } | null> {
  try {
    const blob = await run<Blob>("readonly", (s) => s.get("file"));
    const edit = await run<StudioEdit>("readonly", (s) => s.get("edit"));
    if (!(blob instanceof Blob) || !edit) return null;
    const file = blob instanceof File ? blob : new File([blob], "photo.jpg", { type: blob.type });
    return { file, edit: { ...NO_EDIT, ...edit } }; // a draft from an older version gets the new fields
  } catch {
    return null;
  }
}

export async function clearDraft(): Promise<void> {
  try {
    await run("readwrite", (s) => s.clear());
  } catch {
    /* nothing to clear */
  }
}
