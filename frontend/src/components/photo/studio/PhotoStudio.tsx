import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { createPortal } from "react-dom";
import { EMOJI_GROUPS } from "../../rich/emojiData";
import { STICKERS } from "../../rich/stickers";
import { Icon } from "../../ui/Icon";
import { EffectLayer } from "../EffectLayer";
import { PHOTO_EFFECTS } from "../effects";
import { combine, cssFilter, NEUTRAL, PRESETS } from "./adjust";
import { clampPan, decodeSource, drawPhoto, exportPhoto, rotatedSize, type Frame, type Layer, type Source } from "./render";
import { ENHANCE_AMOUNT, MAX_AMOUNT } from "./sharpen";
import { SharpenFilter } from "./SharpenFilter";

type Tab = "frame" | "filters" | "stickers" | "text" | "fx";
const TABS: { id: Tab; label: string }[] = [
  { id: "frame", label: "Cadre" },
  { id: "filters", label: "Filtres" },
  { id: "stickers", label: "Stickers" },
  { id: "text", label: "Texte" },
  { id: "fx", label: "Animation" },
];
const RATIOS: { id: string; label: string; value: number | null }[] = [
  { id: "orig", label: "Original", value: null },
  { id: "1:1", label: "Carré", value: 1 },
  { id: "4:5", label: "4:5", value: 4 / 5 },
  { id: "16:9", label: "16:9", value: 16 / 9 },
];
const TEXT_COLORS = ["#ffffff", "#ffd45e", "#ff86b8", "#7cc6e8", "#9fe0a4", "#1a1530"];
const SVG_STICKERS = STICKERS.filter((s) => s.kind === "sticker");
const QUICK_EMOJIS = ["😍", "🥰", "😂", "😎", "🥳", "😘", "🤍", "❤️", "💕", "✨", "🔥", "🌸", "🌈", "⭐", "🎉", "👑", "🐱", "☕", "🌙", "☀️"];

type Gesture = { target: "image" | number; points: Map<number, { x: number; y: number }>; start?: { dist: number; angle: number } };

/**
 * Full-screen photo studio: framing, filters, stickers/emojis/text placed with
 * the fingers (drag, pinch to resize and turn), and an animated effect.
 * Returns a flattened JPEG plus the chosen effect; nothing leaves the device
 * until the caller uploads it.
 */
export function PhotoStudio({
  file,
  onDone,
  onCancel,
}: {
  file: File;
  onDone: (edited: File, effect: string | null) => void;
  onCancel: () => void;
}) {
  const [src, setSrc] = useState<(Source & { release: () => void }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("frame");
  const [ratioId, setRatioId] = useState("orig");
  const [frame, setFrame] = useState<Frame>({ rotation: 0, zoom: 1, panX: 0, panY: 0 });
  const [preset, setPreset] = useState("none");
  const [sliders, setSliders] = useState({ brightness: 1, contrast: 1, saturate: 1 });
  const [sharpness, setSharpness] = useState(0); // 0 = off, see sharpen.ts
  const sharpenId = `mc-sharpen-${useId().replace(/:/g, "")}`;
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [textColor, setTextColor] = useState(TEXT_COLORS[0]);
  const [effect, setEffect] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const nextId = useRef(1);

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
  const adjust = combine(PRESETS.find((p) => p.id === preset)?.adjust ?? NEUTRAL, sliders);

  // Fit the frame in the available stage.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const fit = () => {
      const maxW = stage.clientWidth;
      const maxH = stage.clientHeight;
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
    setLayers((ls) => [...ls, { id, kind, value, color, x: 0.5, y: kind === "text" ? 0.82 : 0.5, scale, rotation: 0 }]);
    setSelected(id);
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

  async function save() {
    if (!src) return;
    setSaving(true);
    try {
      const svgOf = (id: number) => frameRef.current?.querySelector<SVGSVGElement>(`[data-layer="${id}"] svg`) ?? null;
      const blob = await exportPhoto(src, frame, aspect, adjust, sharpness, layers, svgOf);
      const name = file.name.replace(/\.[^.]+$/, "") + "-studio.jpg";
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
        <button type="button" onClick={onCancel} className="rounded-full px-3 py-2 text-sm text-text-muted press hover:text-text">
          Annuler
        </button>
        <h2 className="flex-1 text-center font-display text-lg font-bold">Studio</h2>
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
              style={{ width: box.w, height: box.h }}
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
                      <span
                        className="whitespace-nowrap font-extrabold leading-none"
                        style={{ fontSize: size * 0.3, color: l.color, WebkitTextStroke: `${size * 0.3 * 0.08}px rgba(0,0,0,0.55)`, paintOrder: "stroke" }}
                      >
                        {l.value}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </EffectLayer>
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
        <div role="tablist" className="flex">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={"flex-1 py-2.5 text-xs font-semibold " + (tab === t.id ? "text-primary shadow-[inset_0_-2px_0_var(--color-primary)]" : "text-text-muted")}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="h-36 overflow-y-auto p-3">
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
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {PRESETS.map((p) => (
                  <button key={p.id} type="button" onClick={() => setPreset(p.id)} className={"chip shrink-0 press " + (preset === p.id ? "border-primary text-primary" : "")}>
                    {p.label}
                  </button>
                ))}
              </div>
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
              <div className="flex gap-2">
                {TEXT_COLORS.map((c) => (
                  <button key={c} type="button" aria-label={`Couleur ${c}`} onClick={() => setTextColor(c)} className={"h-8 w-8 rounded-full border-2 press " + (textColor === c ? "border-primary" : "border-border")} style={{ background: c }} />
                ))}
              </div>
            </form>
          )}
          {tab === "fx" && (
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
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
