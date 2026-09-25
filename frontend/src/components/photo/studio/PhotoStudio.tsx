import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { createPortal } from "react-dom";
import { EMOJI_GROUPS } from "../../rich/emojiData";
import { STICKERS } from "../../rich/stickers";
import { Icon } from "../../ui/Icon";
import { EffectLayer } from "../EffectLayer";
import { customEffect, PHOTO_EFFECTS } from "../effects";
import { FONTS, loadFont } from "../../../lib/fonts";
import type { FontKey } from "../../../features/profile/types";
import { combine, cssFilter } from "./adjust";
import { BORDERS, drawBorder, type BorderId } from "./borders";
import { clearDraft, NO_EDIT, saveDraft, type StudioEdit } from "./draft";
import { BRUSHES, DRAW_COLORS, strokePath, touchesStroke, type Stroke } from "./draw";
import { LookOverlay } from "./LookOverlay";
import { findLook, LOOKS, NO_FINISH, tintsOf, type Finish, type Look } from "./looks";
import { clampPan, decodeSource, drawPhoto, exportPhoto, rotatedSize, type Frame, type Layer, type Source } from "./render";
import { ENHANCE_AMOUNT, MAX_AMOUNT } from "./sharpen";
import { SharpenFilter } from "./SharpenFilter";
import { STUDIO_FONTS, TEXT_LOOKS, textCss, type TextLook } from "./textStyle";

type Tab = "frame" | "filters" | "tune" | "stickers" | "text" | "draw" | "fx";
const TABS: { id: Tab; label: string }[] = [
  { id: "frame", label: "Recadrer" },
  { id: "filters", label: "Filtres" },
  { id: "tune", label: "Réglages" },
  { id: "stickers", label: "Stickers" },
  { id: "text", label: "Texte" },
  { id: "draw", label: "Dessin" },
  { id: "fx", label: "Animation" },
];
const FINISH_SLIDERS: { key: keyof Finish; label: string; min: number }[] = [
  { key: "warmth", label: "Chaleur", min: -1 },
  { key: "fade", label: "Estompé", min: 0 },
  { key: "vignette", label: "Vignette", min: 0 },
  { key: "grain", label: "Grain", min: 0 },
];

const finishOf = (look: Look): Finish => ({ ...NO_FINISH, ...look.finish });
const RATIOS: { id: string; label: string; value: number | null }[] = [
  { id: "orig", label: "Original", value: null },
  { id: "1:1", label: "Carré", value: 1 },
  { id: "4:5", label: "4:5", value: 4 / 5 },
  { id: "16:9", label: "16:9", value: 16 / 9 },
];
const TEXT_COLORS = ["#ffffff", "#ffd45e", "#ff86b8", "#7cc6e8", "#9fe0a4", "#b18cff", "#1a1530"];
const SVG_STICKERS = STICKERS.filter((s) => s.kind === "sticker");
const QUICK_EMOJIS = ["😍", "🥰", "😂", "😎", "🥳", "😘", "🤍", "❤️", "💕", "✨", "🔥", "🌸", "🌈", "⭐", "🎉", "👑", "🐱", "☕", "🌙", "☀️"];

type Gesture = { target: "image" | number; points: Map<number, { x: number; y: number }>; start?: { dist: number; angle: number } };
type HandleDrag = { id: number; cx: number; cy: number; dist: number; angle: number; scale: number; rotation: number };
const PANEL_H = 144; // tools panel height at rest (px)
const PANEL_MIN = 112;
const HISTORY_MAX = 50;
const SETTLE_MS = 500; // a change becomes one undo step once things settle
const sameEdit = (a: StudioEdit, b: StudioEdit) => JSON.stringify(a) === JSON.stringify(b);

/** Settle a turn on the nearest quarter within 5°, so resizing doesn't tilt by accident. */
function snapAngle(deg: number): number {
  const quarter = Math.round(deg / 90) * 90;
  return Math.abs(deg - quarter) < 5 ? quarter : deg;
}

/**
 * Full-screen photo studio: framing, looks (filters, warmth, fade, vignette,
 * grain), a border, stickers/emojis/styled text placed with the fingers (drag,
 * pinch to resize and turn), finger drawing, and an animated effect.
 * Returns a flattened JPEG plus the chosen effect; nothing leaves the device
 * until the caller uploads it. Every change can be undone and redone; with
 * `keepDraft`, the edits are also kept on the device until "Terminé" or
 * "Annuler", to pick up after the app was closed (`initial` restores them).
 */
export function PhotoStudio({
  file,
  initial = NO_EDIT,
  keepDraft = false,
  onDone,
  onCancel,
}: {
  file: File;
  initial?: StudioEdit;
  keepDraft?: boolean;
  onDone: (edited: File, effect: string | null) => void;
  onCancel: () => void;
}) {
  const [src, setSrc] = useState<(Source & { release: () => void }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("frame");
  const [ratioId, setRatioId] = useState(initial.ratioId);
  const [frame, setFrame] = useState<Frame>(initial.frame);
  const [lookId, setLookId] = useState(initial.lookId);
  const [finish, setFinish] = useState<Finish>(initial.finish);
  const [border, setBorder] = useState<BorderId>(initial.border);
  const [thumb, setThumb] = useState<string | null>(null);
  const [sliders, setSliders] = useState(initial.sliders);
  const [sharpness, setSharpness] = useState(initial.sharpness); // 0 = off, see sharpen.ts
  const sharpenId = `mc-sharpen-${useId().replace(/:/g, "")}`;
  const [layers, setLayers] = useState<Layer[]>(initial.layers);
  const [selected, setSelected] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [textColor, setTextColor] = useState(TEXT_COLORS[0]);
  const [textFont, setTextFont] = useState<FontKey>("app");
  const [textLook, setTextLook] = useState<TextLook>("outline");
  const [strokes, setStrokes] = useState<Stroke[]>(initial.strokes);
  const [drawColor, setDrawColor] = useState(DRAW_COLORS[2]);
  const [brush, setBrush] = useState(BRUSHES[1].width);
  const [eraser, setEraser] = useState(false);
  const drawing = useRef<number | null>(null); // id of the stroke being drawn
  const borderRef = useRef<HTMLCanvasElement>(null);
  const [effect, setEffect] = useState<string | null>(initial.effect);
  const [fxEmoji, setFxEmoji] = useState("");
  const [fxMotion, setFxMotion] = useState<"fall" | "rise">("fall");
  const [saving, setSaving] = useState(false);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const handle = useRef<HandleDrag | null>(null);
  const [panelH, setPanelH] = useState(PANEL_H);
  const panelDrag = useRef<{ y: number; h: number } | null>(null);
  const panelMoved = useRef(false);
  // Past the restored layers and strokes, so new ones never share an id.
  const nextId = useRef(Math.max(0, ...initial.layers.map((l) => l.id), ...initial.strokes.map((s) => s.id)) + 1);

  // — Undo / redo: a change becomes one step once things settle (a drag or a slider is one step). —
  const edit: StudioEdit = { ratioId, frame, lookId, finish, border, sliders, sharpness, layers, strokes, effect };
  const history = useRef({ past: [] as StudioEdit[], current: initial, future: [] as StudioEdit[], fileSaved: false });
  const [, setSteps] = useState(0); // re-render when the undo/redo buttons change

  function commit(next: StudioEdit) {
    const h = history.current;
    if (sameEdit(h.current, next)) return;
    h.past = [...h.past, h.current].slice(-HISTORY_MAX);
    h.current = next;
    h.future = [];
    setSteps((n) => n + 1);
    if (keepDraft) {
      void saveDraft(h.fileSaved ? null : file, next);
      h.fileSaved = true;
    }
  }

  useEffect(() => {
    const t = window.setTimeout(() => commit(edit), SETTLE_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratioId, frame, lookId, finish, border, sliders, sharpness, layers, strokes, effect]);

  function apply(e: StudioEdit) {
    history.current.current = e;
    setRatioId(e.ratioId);
    setFrame(e.frame);
    setLookId(e.lookId);
    setFinish(e.finish);
    setBorder(e.border);
    setSliders(e.sliders);
    setSharpness(e.sharpness);
    setLayers(e.layers);
    setStrokes(e.strokes);
    setEffect(e.effect);
    setSteps((n) => n + 1);
    if (keepDraft) void saveDraft(null, e);
  }

  function undo() {
    commit(edit); // a change not settled yet is the step to undo
    const h = history.current;
    const prev = h.past.pop();
    if (!prev) return;
    h.future = [h.current, ...h.future];
    apply(prev);
  }

  function redo() {
    const h = history.current;
    const [next, ...rest] = h.future;
    if (!next) return;
    h.past = [...h.past, h.current];
    h.future = rest;
    apply(next);
  }

  function cancel() {
    if (keepDraft) void clearDraft();
    onCancel();
  }

  useEffect(() => {
    let alive = true;
    let loaded: (Source & { release: () => void }) | null = null;
    decodeSource(file)
      .then((s) => {
        loaded = s;
        if (alive) setSrc(s);
        else s.release();
      })
      .catch(() => setError("Impossible d'ouvrir cette photo."));
    return () => {
      alive = false;
      loaded?.release();
    };
  }, [file]);

  const rot = src ? rotatedSize(src, frame.rotation) : { w: 1, h: 1 };
  const aspect = RATIOS.find((r) => r.id === ratioId)?.value ?? rot.w / rot.h;
  const look = findLook(lookId);
  const adjust = combine(look.adjust, sliders);
  const tints = tintsOf(look, finish);

  // A small square of the photo, to preview each look on it.
  useEffect(() => {
    if (!src) return;
    const c = document.createElement("canvas");
    c.width = c.height = 96;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    drawPhoto(ctx, src, { rotation: 0, zoom: 1, panX: 0, panY: 0 }, 96, 96);
    setThumb(c.toDataURL("image/jpeg", 0.8));
  }, [src]);

  // The border is drawn by the same code as the export, on a canvas over the photo.
  useEffect(() => {
    const c = borderRef.current;
    if (!c || box.w === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.round(box.w * dpr);
    c.height = Math.round(box.h * dpr);
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    drawBorder(ctx, border, c.width, c.height);
  }, [border, box]);

  useEffect(() => {
    STUDIO_FONTS.forEach(loadFont);
  }, []);

  // Fit the frame in the available stage.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const fit = () => {
      // clientWidth/Height include the stage's padding: keep the frame inside it.
      const pad = getComputedStyle(stage);
      const maxW = stage.clientWidth - parseFloat(pad.paddingLeft) - parseFloat(pad.paddingRight);
      const maxH = stage.clientHeight - parseFloat(pad.paddingTop) - parseFloat(pad.paddingBottom);
      const w = Math.min(maxW, maxH * aspect);
      setBox({ w, h: w / aspect });
    };
    fit();
    const obs = new ResizeObserver(fit);
    obs.observe(stage);
    return () => obs.disconnect();
  }, [aspect]);

  // Redraw the preview (colour adjustments are a CSS filter on the canvas).
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !src || box.w === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.round(box.w * dpr);
    c.height = Math.round(box.h * dpr);
    const ctx = c.getContext("2d");
    if (ctx) drawPhoto(ctx, src, frame, c.width, c.height);
  }, [src, frame, box]);

  const updateFrame = useCallback(
    (next: Frame) => setFrame(src ? clampPan(src, next, aspect) : next),
    [src, aspect],
  );

  useEffect(() => {
    if (src) setFrame((f) => clampPan(src, f, aspect));
  }, [aspect, src]);

  function addLayer(kind: Layer["kind"], value: string, color?: string) {
    const id = nextId.current++;
    // Text starts about half the frame wide, whatever its length (then pinch to resize).
    const scale = kind === "text" ? Math.min(0.5, Math.max(0.18, 3 / Math.max(value.length, 4))) : 0.26;
    const text = kind === "text" ? { font: textFont, look: textLook } : {};
    setLayers((ls) => [...ls, { id, kind, value, color, ...text, x: 0.5, y: kind === "text" ? 0.82 : 0.5, scale, rotation: 0 }]);
    setSelected(id);
  }

  /** Text choices also restyle the selected text. */
  function styleText(patch: Partial<Pick<Layer, "color" | "font" | "look">>) {
    const target = layers.find((l) => l.id === selected && l.kind === "text");
    if (target) patchLayer(target.id, patch);
  }

  // — Finger drawing (Dessin tab): points in 0..1 of the frame. —
  function pointAt(e: RPointerEvent<HTMLDivElement>): [number, number] {
    const r = e.currentTarget.getBoundingClientRect();
    return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))];
  }

  function erase([x, y]: [number, number]) {
    setStrokes((ss) => ss.filter((s) => !touchesStroke(s, x, y, box.w, box.h, 12)));
  }

  function drawDown(e: RPointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const p = pointAt(e);
    if (eraser) {
      drawing.current = -1;
      erase(p);
      return;
    }
    const id = nextId.current++;
    drawing.current = id;
    setStrokes((ss) => [...ss, { id, color: drawColor, width: brush, points: [p] }]);
  }

  function drawMove(e: RPointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    const id = drawing.current;
    if (id === null) return;
    const p = pointAt(e);
    if (id === -1) {
      erase(p);
      return;
    }
    setStrokes((ss) =>
      ss.map((s) => {
        if (s.id !== id) return s;
        const [lx, ly] = s.points[s.points.length - 1];
        return Math.hypot((p[0] - lx) * box.w, (p[1] - ly) * box.h) < 2 ? s : { ...s, points: [...s.points, p] };
      }),
    );
  }

  function drawUp(e: RPointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    drawing.current = null;
  }

  const patchLayer = (id: number, patch: Partial<Layer>) => setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  // — Gestures: one finger drags (layer or photo), two fingers pinch/turn. —
  function down(e: RPointerEvent<HTMLDivElement>, target: "image" | number) {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    if (!gesture.current || gesture.current.target !== target) gesture.current = { target, points: new Map() };
    gesture.current.points.set(e.pointerId, { x: e.clientX, y: e.clientY });
    gesture.current.start = undefined;
    setSelected(target === "image" ? null : target);
  }

  function move(e: RPointerEvent<HTMLDivElement>) {
    e.stopPropagation(); // handled once: by the layer, or by the photo under it
    const g = gesture.current;
    if (!g || !g.points.has(e.pointerId)) return;
    const prev = g.points.get(e.pointerId)!;
    g.points.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...g.points.values()];

    if (pts.length >= 2) {
      const [a, b] = pts;
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
      if (!g.start) {
        g.start = { dist, angle };
        return;
      }
      const ratio = dist / g.start.dist;
      const turn = angle - g.start.angle;
      g.start = { dist, angle };
      if (g.target === "image") updateFrame({ ...frame, zoom: Math.min(4, Math.max(1, frame.zoom * ratio)) });
      else {
        const l = layers.find((x) => x.id === g.target);
        if (l) patchLayer(l.id, { scale: Math.min(1.6, Math.max(0.06, l.scale * ratio)), rotation: l.rotation + turn });
      }
      return;
    }

    const dx = (e.clientX - prev.x) / box.w;
    const dy = (e.clientY - prev.y) / box.h;
    if (g.target === "image") updateFrame({ ...frame, panX: frame.panX + dx, panY: frame.panY + dy });
    else {
      const l = layers.find((x) => x.id === g.target);
      if (l) patchLayer(l.id, { x: Math.min(1, Math.max(0, l.x + dx)), y: Math.min(1, Math.max(0, l.y + dy)) });
    }
  }

  function up(e: RPointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    const g = gesture.current;
    if (!g) return;
    g.points.delete(e.pointerId);
    g.start = undefined;
    if (g.points.size === 0) gesture.current = null;
  }

  // — Corner handle of the selected layer: drag to resize and turn it (mouse or one finger). —
  /**
   * Where the handle sits: a corner of the layer, once turned — the
   * bottom-right one, or another inside the photo when the layer hangs over
   * an edge, so the handle stays on screen (any corner resizes the same way).
   */
  function cornerOf(l: Layer) {
    const half = (l.scale * box.w) / 2;
    const a = (l.rotation * Math.PI) / 180;
    const at = (sx: number, sy: number) => ({
      x: l.x * box.w + sx * half * Math.cos(a) - sy * half * Math.sin(a),
      y: l.y * box.h + sx * half * Math.sin(a) + sy * half * Math.cos(a),
    });
    const corners = [at(1, 1), at(-1, 1), at(1, -1), at(-1, -1)];
    const inside = corners.find((c) => c.x >= 0 && c.x <= box.w && c.y >= 0 && c.y <= box.h);
    const c = inside ?? corners[0];
    return { x: Math.min(box.w, Math.max(0, c.x)), y: Math.min(box.h, Math.max(0, c.y)) };
  }

  function handleDown(e: RPointerEvent<HTMLSpanElement>, l: Layer) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const r = e.currentTarget.parentElement!.getBoundingClientRect(); // the frame's area: the layer's centre stays put
    const cx = r.left + l.x * box.w;
    const cy = r.top + l.y * box.h;
    handle.current = {
      id: l.id,
      cx,
      cy,
      dist: Math.max(1, Math.hypot(e.clientX - cx, e.clientY - cy)),
      angle: Math.atan2(e.clientY - cy, e.clientX - cx),
      scale: l.scale,
      rotation: l.rotation,
    };
  }

  function handleMove(e: RPointerEvent<HTMLSpanElement>) {
    e.stopPropagation();
    const h = handle.current;
    if (!h) return;
    const dist = Math.hypot(e.clientX - h.cx, e.clientY - h.cy);
    const turn = ((Math.atan2(e.clientY - h.cy, e.clientX - h.cx) - h.angle) * 180) / Math.PI;
    // Grows by what the finger moves away (not by a ratio): a handle held near the centre stays gentle.
    const scale = h.scale + (Math.SQRT2 * (dist - h.dist)) / box.w;
    patchLayer(h.id, { scale: Math.min(1.6, Math.max(0.06, scale)), rotation: snapAngle(h.rotation + turn) });
  }

  function handleUp(e: RPointerEvent<HTMLSpanElement>) {
    e.stopPropagation();
    handle.current = null;
  }

  // — Tools panel: drag its grip to make it taller or shorter, tap to switch. —
  const panelMax = () => Math.round(window.innerHeight * 0.6);
  const clampPanel = (h: number) => Math.min(panelMax(), Math.max(PANEL_MIN, h));

  function panelDown(e: RPointerEvent<HTMLButtonElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    panelDrag.current = { y: e.clientY, h: panelH };
    panelMoved.current = false;
  }

  function panelMove(e: RPointerEvent<HTMLButtonElement>) {
    const d = panelDrag.current;
    if (!d) return;
    const dy = d.y - e.clientY;
    if (Math.abs(dy) > 4) panelMoved.current = true;
    if (panelMoved.current) setPanelH(clampPanel(d.h + dy));
  }

  async function save() {
    if (!src) return;
    setSaving(true);
    try {
      const svgOf = (id: number) => frameRef.current?.querySelector<SVGSVGElement>(`[data-layer="${id}"] svg`) ?? null;
      const blob = await exportPhoto(src, frame, aspect, adjust, sharpness, layers, svgOf, { tints, finish, border, strokes });
      const name = file.name.replace(/\.[^.]+$/, "") + "-studio.jpg";
      if (keepDraft) void clearDraft();
      onDone(new File([blob], name, { type: "image/jpeg", lastModified: Date.now() }), effect);
    } catch {
      setError("L'enregistrement a échoué, réessaie.");
      setSaving(false);
    }
  }

  const sel = layers.find((l) => l.id === selected) ?? null;

  return createPortal(
    // React events bubble through portals: keep the studio's form submits and
    // key presses from reaching the page that opened it (e.g. the post form).
    <div
      role="dialog"
      aria-label="Studio photo"
      className="fixed inset-0 z-50 flex flex-col bg-bg animate-fade-up"
      onSubmit={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <header className="flex items-center gap-2 border-b border-border px-3 pb-2 pt-[calc(var(--safe-top)+0.5rem)]">
        <button type="button" onClick={cancel} className="rounded-full px-3 py-2 text-sm text-text-muted press hover:text-text">
          Annuler
        </button>
        <h2 className="flex-1 text-center font-display text-lg font-bold">Studio</h2>
        <button
          type="button"
          onClick={undo}
          disabled={history.current.past.length === 0 && sameEdit(history.current.current, edit)}
          aria-label="Annuler la dernière retouche"
          title="Annuler la dernière retouche"
          className="grid h-9 w-9 place-items-center rounded-full text-lg text-text-muted press hover:text-text disabled:opacity-30"
        >
          ↶
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={history.current.future.length === 0}
          aria-label="Rétablir"
          title="Rétablir"
          className="grid h-9 w-9 place-items-center rounded-full text-lg text-text-muted press hover:text-text disabled:opacity-30"
        >
          ↷
        </button>
        <button type="button" onClick={save} disabled={!src || saving} className="rounded-full btn-brand px-4 py-2 text-sm press disabled:opacity-50">
          {saving ? "…" : "Terminé"}
        </button>
      </header>

      <div ref={stageRef} className="relative flex min-h-0 flex-1 items-center justify-center p-3" onPointerDown={() => setSelected(null)}>
        {error && <p className="absolute top-3 text-sm text-danger">{error}</p>}
        {!src && !error && <p className="text-text-muted">Chargement…</p>}
        {src && box.w > 0 && (
          <EffectLayer effect={effect} className="rounded-token shadow-card">
            <div
              ref={frameRef}
              className="relative touch-none select-none overflow-hidden rounded-token"
              style={{ width: box.w, height: box.h, isolation: "isolate" }}
              onPointerDown={(e) => down(e, "image")}
              onPointerMove={move}
              onPointerUp={up}
              onPointerCancel={up}
            >
              {sharpness > 0 && <SharpenFilter id={sharpenId} amount={sharpness} width={box.w} />}
              <canvas
                ref={canvasRef}
                className="h-full w-full"
                style={{ filter: `${sharpness > 0 ? `url(#${sharpenId}) ` : ""}${cssFilter(adjust)}` }}
              />
              <LookOverlay tints={tints} finish={finish} width={box.w} />
              <canvas ref={borderRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />
              {layers.map((l) => {
                const size = l.scale * box.w;
                return (
                  <div
                    key={l.id}
                    data-layer={l.id}
                    onPointerDown={(e) => down(e, l.id)}
                    onPointerMove={move}
                    onPointerUp={up}
                    onPointerCancel={up}
                    className={"absolute grid place-items-center " + (selected === l.id ? "outline-dashed outline-2 outline-white/80" : "")}
                    style={{
                      left: l.x * box.w - size / 2,
                      top: l.y * box.h - size / 2,
                      width: size,
                      height: size,
                      transform: `rotate(${l.rotation}deg)`,
                    }}
                  >
                    {l.kind === "sticker" ? (
                      SVG_STICKERS.find((s) => s.id === l.value)?.render(Math.round(size))
                    ) : l.kind === "emoji" ? (
                      <span className="mc-emoji leading-none" style={{ fontSize: size * 0.85 }}>{l.value}</span>
                    ) : (
                      <span style={textCss(l.color ?? "#ffffff", l.font, l.look ?? "outline", size * 0.3)}>{l.value}</span>
                    )}
                  </div>
                );
              })}
              {strokes.length > 0 && (
                <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${box.w / box.h} 1`} preserveAspectRatio="none" aria-hidden="true">
                  {strokes.map((st) =>
                    st.points.length === 1 ? (
                      <circle key={st.id} cx={st.points[0][0] * (box.w / box.h)} cy={st.points[0][1]} r={(st.width * box.w) / box.h / 2} fill={st.color} />
                    ) : (
                      <path key={st.id} d={strokePath(st, box.w / box.h)} fill="none" stroke={st.color} strokeWidth={(st.width * box.w) / box.h} strokeLinecap="round" strokeLinejoin="round" />
                    ),
                  )}
                </svg>
              )}
              {tab === "draw" && (
                <div
                  className="absolute inset-0 cursor-crosshair"
                  aria-label="Zone de dessin"
                  onPointerDown={drawDown}
                  onPointerMove={drawMove}
                  onPointerUp={drawUp}
                  onPointerCancel={drawUp}
                />
              )}
            </div>
          </EffectLayer>
        )}
        {src && box.w > 0 && sel && (
          // The selected layer's corner handle, over the photo (not inside it) so its edge never cuts it.
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: box.w, height: box.h }}>
            <span
              aria-hidden="true"
              title="Tirer pour agrandir ou tourner"
              onPointerDown={(e) => handleDown(e, sel)}
              onPointerMove={handleMove}
              onPointerUp={handleUp}
              onPointerCancel={handleUp}
              className="pointer-events-auto absolute grid h-8 w-8 cursor-nwse-resize touch-none place-items-center"
              style={{ left: cornerOf(sel).x - 16, top: cornerOf(sel).y - 16 }}
            >
              <span className="h-5 w-5 rounded-full border-2 border-white bg-primary shadow-card" />
            </span>
          </div>
        )}
      </div>

      {sel && (
        <div className="flex items-center justify-center gap-2 px-3 pb-2">
          {[
            { label: "Plus petit", icon: "−", run: () => patchLayer(sel.id, { scale: Math.max(0.06, sel.scale / 1.15) }) },
            { label: "Plus grand", icon: "+", run: () => patchLayer(sel.id, { scale: Math.min(1.6, sel.scale * 1.15) }) },
            { label: "Tourner à gauche", icon: "↺", run: () => patchLayer(sel.id, { rotation: sel.rotation - 15 }) },
            { label: "Tourner à droite", icon: "↻", run: () => patchLayer(sel.id, { rotation: sel.rotation + 15 }) },
          ].map((b) => (
            <button key={b.label} type="button" aria-label={b.label} onClick={b.run} className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-lg press">
              {b.icon}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setLayers((ls) => ls.filter((l) => l.id !== sel.id));
              setSelected(null);
            }}
            className="flex h-10 items-center gap-1 rounded-full border border-border bg-surface px-3 text-sm text-danger press"
          >
            <Icon name="trash" size={16} /> Retirer
          </button>
        </div>
      )}

      <div className="border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]">
        <button
          type="button"
          aria-label={panelH > PANEL_H ? "Réduire les outils" : "Agrandir les outils"}
          title="Tirer vers le haut ou le bas"
          onPointerDown={panelDown}
          onPointerMove={panelMove}
          onPointerUp={() => (panelDrag.current = null)}
          onPointerCancel={() => (panelDrag.current = null)}
          onClick={() => {
            if (panelMoved.current) return; // that was a drag, not a tap
            setPanelH((h) => (h > PANEL_H ? PANEL_H : panelMax()));
          }}
          onKeyDown={(e) => {
            if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
            e.preventDefault();
            setPanelH((h) => clampPanel(h + (e.key === "ArrowUp" ? 48 : -48)));
          }}
          className="flex h-5 w-full cursor-ns-resize touch-none items-center justify-center"
        >
          <span className="h-1.5 w-10 rounded-full bg-border" />
        </button>
        <div role="tablist" className="no-scrollbar flex overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={"shrink-0 flex-1 whitespace-nowrap px-3 py-2.5 text-xs font-semibold " + (tab === t.id ? "text-primary shadow-[inset_0_-2px_0_var(--color-primary)]" : "text-text-muted")}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="overflow-y-auto p-3" style={{ height: panelH, maxHeight: "60dvh" }}>
          {tab === "frame" && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                {RATIOS.map((r) => (
                  <button key={r.id} type="button" onClick={() => setRatioId(r.id)} className={"chip press " + (ratioId === r.id ? "border-primary text-primary" : "")}>
                    {r.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => updateFrame({ ...frame, rotation: (((frame.rotation + 90) % 360) as Frame["rotation"]), panX: 0, panY: 0 })}
                  className="chip press"
                >
                  ↻ Pivoter
                </button>
              </div>
              <label className="flex items-center gap-3 text-xs text-text-muted">
                Zoom
                <input type="range" min={1} max={4} step={0.01} value={frame.zoom} onChange={(e) => updateFrame({ ...frame, zoom: Number(e.target.value) })} className="flex-1 accent-[var(--color-primary)]" />
              </label>
              <p className="text-[11px] text-text-muted">Glisse la photo pour la cadrer, pince pour zoomer.</p>
            </div>
          )}
          {tab === "filters" && (
            <div className="flex flex-col gap-2">
              <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                {LOOKS.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => {
                      setLookId(l.id);
                      setFinish(finishOf(l));
                    }}
                    aria-pressed={lookId === l.id}
                    className={"flex w-16 shrink-0 flex-col items-center gap-1 rounded-token p-1 text-[11px] press " + (lookId === l.id ? "text-primary ring-2 ring-primary" : "text-text-muted")}
                  >
                    <span className="relative block h-12 w-12 overflow-hidden rounded-token-sm bg-surface-2" style={{ isolation: "isolate" }}>
                      {thumb && <img src={thumb} alt="" className="h-full w-full object-cover" style={{ filter: cssFilter(l.adjust) }} />}
                      <LookOverlay tints={tintsOf(l, finishOf(l))} finish={{ ...finishOf(l), grain: 0 }} width={48} />
                    </span>
                    <span className="w-full truncate text-center">{l.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Cadre">
                <span className="text-xs text-text-muted">Cadre :</span>
                {BORDERS.map((b) => (
                  <button key={b.id} type="button" onClick={() => setBorder(b.id)} aria-pressed={border === b.id} className={"chip press text-xs " + (border === b.id ? "border-primary text-primary" : "")}>
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {tab === "tune" && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 text-xs text-text-muted">
                <button
                  type="button"
                  onClick={() => setSharpness((v) => (v > 0 ? 0 : ENHANCE_AMOUNT))}
                  aria-pressed={sharpness > 0}
                  className={"chip shrink-0 press " + (sharpness > 0 ? "border-primary text-primary" : "")}
                >
                  ✨ Améliorer
                </button>
                <label className="flex flex-1 items-center gap-3">
                  <span className="w-14">Netteté</span>
                  <input
                    type="range"
                    min={0}
                    max={MAX_AMOUNT}
                    step={0.05}
                    value={sharpness}
                    onChange={(e) => setSharpness(Number(e.target.value))}
                    className="flex-1 accent-[var(--color-primary)]"
                  />
                </label>
              </div>
              {([
                ["brightness", "Luminosité"],
                ["contrast", "Contraste"],
                ["saturate", "Saturation"],
              ] as const).map(([k, label]) => (
                <label key={k} className="flex items-center gap-3 text-xs text-text-muted">
                  <span className="w-20">{label}</span>
                  <input
                    type="range"
                    min={k === "saturate" ? 0 : 0.5}
                    max={k === "saturate" ? 2 : 1.5}
                    step={0.01}
                    value={sliders[k]}
                    onChange={(e) => setSliders((s) => ({ ...s, [k]: Number(e.target.value) }))}
                    className="flex-1 accent-[var(--color-primary)]"
                  />
                </label>
              ))}
              {FINISH_SLIDERS.map(({ key, label, min }) => (
                <label key={key} className="flex items-center gap-3 text-xs text-text-muted">
                  <span className="w-20">{label}</span>
                  <input
                    type="range"
                    min={min}
                    max={1}
                    step={0.01}
                    value={finish[key]}
                    onChange={(e) => setFinish((f) => ({ ...f, [key]: Number(e.target.value) }))}
                    className="flex-1 accent-[var(--color-primary)]"
                  />
                </label>
              ))}
            </div>
          )}
          {tab === "stickers" && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {SVG_STICKERS.map((s) => (
                  <button key={s.id} type="button" aria-label={s.label} onClick={() => addLayer("sticker", s.id)} className="grid h-14 w-14 shrink-0 place-items-center rounded-token hover:bg-surface-2 press">
                    {s.render(46)}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-10 gap-1">
                {[...QUICK_EMOJIS, ...EMOJI_GROUPS[0].emojis.slice(0, 40)].map((em, i) => (
                  <button key={`${em}-${i}`} type="button" aria-label={em} onClick={() => addLayer("emoji", em)} className="mc-emoji grid h-9 place-items-center rounded-token-sm text-xl hover:bg-surface-2 press">
                    {em}
                  </button>
                ))}
              </div>
            </div>
          )}
          {tab === "text" && (
            <form
              className="flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!text.trim()) return;
                addLayer("text", text.trim().slice(0, 40), textColor);
                setText("");
              }}
            >
              <div className="flex gap-2">
                <input value={text} maxLength={40} onChange={(e) => setText(e.target.value)} placeholder="Ton texte…" className="flex-1 rounded-full border border-border bg-bg-2/60 px-4 py-2 text-text outline-none focus:border-primary/70" />
                <button type="submit" disabled={!text.trim()} className="rounded-full btn-brand px-4 text-sm press disabled:opacity-50">
                  Ajouter
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Couleur ${c}`}
                    onClick={() => {
                      setTextColor(c);
                      styleText({ color: c });
                    }}
                    className={"h-8 w-8 rounded-full border-2 press " + (textColor === c ? "border-primary" : "border-border")}
                    style={{ background: c }}
                  />
                ))}
              </div>
              <div className="no-scrollbar flex gap-2 overflow-x-auto" role="group" aria-label="Style du texte">
                {TEXT_LOOKS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTextLook(t.id);
                      styleText({ look: t.id });
                    }}
                    aria-pressed={textLook === t.id}
                    className={"chip shrink-0 press " + (textLook === t.id ? "border-primary text-primary" : "")}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="no-scrollbar flex gap-2 overflow-x-auto" role="group" aria-label="Police du texte">
                {STUDIO_FONTS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => {
                      setTextFont(f);
                      styleText({ font: f });
                    }}
                    aria-pressed={textFont === f}
                    className={"chip shrink-0 press " + (textFont === f ? "border-primary text-primary" : "")}
                    style={{ fontFamily: f === "app" ? "ui-rounded, system-ui, sans-serif" : FONTS[f].stack ?? undefined }}
                  >
                    {f === "app" ? "Arrondie" : FONTS[f].label}
                  </button>
                ))}
              </div>
            </form>
          )}
          {tab === "draw" && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setEraser(false)} aria-pressed={!eraser} className={"chip press " + (!eraser ? "border-primary text-primary" : "")}>
                  ✏️ Pinceau
                </button>
                <button type="button" onClick={() => setEraser(true)} aria-pressed={eraser} className={"chip press " + (eraser ? "border-primary text-primary" : "")}>
                  🧽 Gomme
                </button>
                <button type="button" onClick={() => setStrokes((ss) => ss.slice(0, -1))} disabled={strokes.length === 0} className="chip press disabled:opacity-40">
                  ↶ Annuler
                </button>
                <button type="button" onClick={() => setStrokes([])} disabled={strokes.length === 0} className="chip press text-danger disabled:opacity-40">
                  Tout effacer
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {DRAW_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Couleur ${c}`}
                    onClick={() => {
                      setDrawColor(c);
                      setEraser(false);
                    }}
                    className={"h-8 w-8 rounded-full border-2 press " + (drawColor === c && !eraser ? "border-primary" : "border-border")}
                    style={{ background: c }}
                  />
                ))}
                {BRUSHES.map((b) => (
                  <button key={b.id} type="button" onClick={() => setBrush(b.width)} aria-pressed={brush === b.width} aria-label={`Trait ${b.label}`} className={"grid h-8 w-8 place-items-center rounded-full border-2 press " + (brush === b.width ? "border-primary" : "border-border")}>
                    <span className="block rounded-full bg-text" style={{ width: 4 + b.width * 300, height: 4 + b.width * 300 }} />
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-text-muted">Dessine avec le doigt sur la photo.</p>
            </div>
          )}
          {tab === "fx" && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setEffect(null)} className={"chip press " + (effect === null ? "border-primary text-primary" : "")}>
                  Aucune
                </button>
                {PHOTO_EFFECTS.map((fx) => (
                  <button key={fx.id} type="button" onClick={() => setEffect(fx.id)} className={"chip press " + (effect === fx.id ? "border-primary text-primary" : "")}>
                    {fx.icon} {fx.label}
                  </button>
                ))}
              </div>
              {/* Any emoji raining down or floating up. */}
              <form
                className="flex flex-wrap items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const custom = customEffect(fxMotion, fxEmoji);
                  if (custom) setEffect(custom);
                }}
              >
                <span className="text-xs text-text-muted">Emoji au choix :</span>
                <input
                  value={fxEmoji}
                  onChange={(e) => {
                    setFxEmoji(e.target.value);
                    const custom = customEffect(fxMotion, e.target.value);
                    if (custom) setEffect(custom);
                  }}
                  maxLength={16}
                  placeholder="🍕"
                  aria-label="Emoji de l'animation"
                  className="mc-emoji w-16 rounded-full border border-border bg-bg-2/60 px-3 py-1.5 text-center text-lg outline-none focus:border-primary/70"
                />
                {(["fall", "rise"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={fxMotion === m}
                    onClick={() => {
                      setFxMotion(m);
                      const custom = customEffect(m, fxEmoji);
                      if (custom) setEffect(custom);
                    }}
                    className={"chip press text-xs " + (fxMotion === m ? "border-primary text-primary" : "")}
                  >
                    {m === "fall" ? "↓ tombe" : "↑ monte"}
                  </button>
                ))}
                {fxEmoji.trim() !== "" && !customEffect(fxMotion, fxEmoji) && <span className="text-xs text-danger">Seulement un emoji</span>}
              </form>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
