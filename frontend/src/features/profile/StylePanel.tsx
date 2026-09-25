import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AssetImage } from "../../components/AssetImage";
import { Icon } from "../../components/ui/Icon";
import { uploadImage } from "../../lib/api/assets";
import { ApiError } from "../../lib/api/client";
import { FONT_GROUPS, FONTS } from "../../lib/fonts";
import { mergeStyle } from "./partStyle";
import type { FontKey, PartStyle } from "./types";
import { selectClass } from "./widgets/WidgetEditor";

type Tab = "colors" | "aspect" | "text" | "photo";
const TAB_LABELS: Record<Tab, string> = { colors: "Couleurs", aspect: "Aspect", text: "Texte", photo: "Photo" };

/** Quick colours; any other one through the colour picker. */
const SWATCHES = ["#ffffff", "#fff7f0", "#ffe8d6", "#ffd1dc", "#e0707f", "#b5476b", "#ffd45e", "#9fe0a4", "#7cc6e8", "#b18cff", "#2a1650", "#16301f", "#0e3b53", "#0d0b1a", "#3c332a"];

export const SHEET_MIN = 160;
const sheetMax = () => Math.round(window.innerHeight * 0.85);

/**
 * The bottom sheet that styles one part of the profile, live.
 */
export function StylePanel({
  title,
  page = false,
  value,
  inherited,
  height,
  onHeight,
  onChange,
  onReset,
  onClose,
  pageText,
  footer,
}: {
  title: string;
  page?: boolean;
  /** The part's own choices. */
  value: PartStyle;
  /** What it gets when a field is left unset (a frame: the frames' default). */
  inherited?: PartStyle;
  height: number;
  onHeight: (h: number) => void;
  onChange: (s: PartStyle) => void;
  onReset: () => void;
  onClose: () => void;
  /** The page's Texte tab (its fonts live on the theme). */
  pageText?: ReactNode;
  footer?: ReactNode;
}) {
  const tabs: Tab[] = page ? ["colors", "photo", "text"] : ["colors", "aspect", "text"];
  const [tab, setTab] = useState<Tab>("colors");
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<PartStyle>) => onChange({ ...value, ...patch });
  const shown = mergeStyle(inherited, value); // what the part looks like now

  async function upload(file: File) {
    setError(null);
    try {
      const asset = await uploadImage(file);
      set({ photoAssetId: asset.id, veil: value.veil ?? 40 });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Envoi de la photo impossible.");
    }
  }

  return (
    <Sheet
      title={title}
      height={height}
      onHeight={onHeight}
      onClose={onClose}
      actions={
        <button type="button" onClick={onReset} className="chip press text-xs hover:border-primary/50">↺ Par défaut</button>
      }
    >
      <div role="tablist" className="flex shrink-0 border-b border-border px-2">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={"flex-1 px-3 py-2 text-sm font-semibold " + (tab === t ? "text-primary shadow-[inset_0_-2px_0_var(--color-primary)]" : "text-text-muted")}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        <div className="flex flex-col gap-4">
          {tab === "colors" && (
            <>
              <ColorRow label="Fond" value={value.bg} fallback={inherited?.bg} onChange={(bg) => set({ bg, ...(bg ? {} : { bg2: undefined }) })} />
              {shown.bg && (
                <>
                  <Row label="Dégradé">
                    <Toggle on={!!shown.bg2} onChange={(on) => set({ bg2: on ? (shown.bg2 ?? shiftColor(shown.bg!)) : undefined })} />
                  </Row>
                  {shown.bg2 && <ColorRow label="2ᵉ couleur" value={value.bg2} fallback={inherited?.bg2} onChange={(bg2) => set({ bg2 })} />}
                  <Row label={`Opacité du fond · ${shown.opacity ?? 100} %`}>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={shown.opacity ?? 100}
                      onChange={(e) => set({ opacity: Number(e.target.value) === 100 ? undefined : Number(e.target.value) })}
                      className="w-40 accent-[var(--color-primary)]"
                      aria-label="Opacité du fond"
                    />
                  </Row>
                </>
              )}
              <ColorRow label="Texte" value={value.text} fallback={inherited?.text} onChange={(text) => set({ text })} />
              <ColorRow label="Accent (titres, liens, boutons)" value={value.accent} fallback={inherited?.accent} onChange={(accent) => set({ accent })} />
            </>
          )}

          {tab === "aspect" && (
            <>
              <Choice
                label="Bordure"
                value={value.border}
                options={[["none", "Aucune"], ["thin", "Fine"], ["thick", "Épaisse"]]}
                onChange={(border) => set({ border })}
              />
              {shown.border !== "none" && (
                <ColorRow label="Couleur de la bordure" value={value.borderColor} fallback={inherited?.borderColor} onChange={(borderColor) => set({ borderColor })} />
              )}
              <Choice label="Coins" value={value.radius} options={[["square", "Carrés"], ["soft", "Doux"], ["round", "Ronds"]]} onChange={(radius) => set({ radius })} />
              <Choice label="Ombre" value={value.shadow} options={[["none", "Aucune"], ["soft", "Douce"], ["strong", "Forte"]]} onChange={(shadow) => set({ shadow })} />
              <Row label="Verre dépoli">
                <Toggle on={!!shown.glass} onChange={(on) => set({ glass: on || undefined })} />
              </Row>
            </>
          )}

          {tab === "text" &&
            (pageText ?? (
              <>
                <FontRow value={value.font} onChange={(font) => set({ font })} />
                <Choice label="Taille" value={value.size} options={[["s", "S"], ["m", "M"], ["l", "L"], ["xl", "XL"]]} onChange={(size) => set({ size })} />
                <Row label="Gras">
                  <Toggle on={!!shown.bold} onChange={(on) => set({ bold: on || undefined })} />
                </Row>
                <Choice
                  label="Alignement"
                  value={value.align}
                  options={[["left", "À gauche"], ["center", "Centré"], ["right", "À droite"]]}
                  onChange={(align) => set({ align })}
                />
              </>
            ))}

          {tab === "photo" && (
            <>
              <div className="flex items-center gap-3">
                <div className="h-20 w-32 shrink-0 overflow-hidden rounded-token border border-border bg-bg-2">
                  {value.photoAssetId && <AssetImage key={value.photoAssetId} assetId={value.photoAssetId} className="h-full w-full object-cover" />}
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="chip cursor-pointer press hover:border-primary/50">
                    <Icon name="images" size={14} /> {value.photoAssetId ? "Changer" : "Choisir une photo"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) upload(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {value.photoAssetId && (
                    <button type="button" onClick={() => set({ photoAssetId: undefined, veil: undefined })} className="chip press text-danger hover:border-danger/50">
                      Retirer
                    </button>
                  )}
                </div>
              </div>
              {value.photoAssetId && (
                <Row label={`Voile pour la lisibilité · ${value.veil ?? 0} %`}>
                  <input
                    type="range"
                    min={0}
                    max={90}
                    step={5}
                    value={value.veil ?? 0}
                    onChange={(e) => set({ veil: Number(e.target.value) })}
                    className="w-40 accent-[var(--color-primary)]"
                    aria-label="Voile"
                  />
                </Row>
              )}
              <p className="text-xs text-text-muted">Le voile prend la couleur du fond (onglet Couleurs).</p>
              {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            </>
          )}

          {footer}
        </div>
      </div>
    </Sheet>
  );
}

/**
 * A bottom sheet over the page (the page stays visible and scrollable above
 * it). Drag its grip, or use ↑/↓ on it, to make it taller or shorter.
 */
export function Sheet({
  title,
  height,
  onHeight,
  onClose,
  actions,
  children,
}: {
  title: string;
  height: number;
  onHeight: (h: number) => void;
  onClose: () => void;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [drag, setDrag] = useState<{ y: number; h: number } | null>(null);
  const clampH = (h: number) => Math.min(sheetMax(), Math.max(SHEET_MIN, h));

  return createPortal(
    <div
      role="dialog"
      aria-label={title}
      className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-w-2xl flex-col rounded-t-3xl border border-b-0 border-border bg-surface pb-[env(safe-area-inset-bottom)] text-text shadow-card lg:left-64"
      style={{ height, maxHeight: "85dvh" }}
    >
      <button
        type="button"
        aria-label="Tirer pour agrandir ou réduire"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setDrag({ y: e.clientY, h: height });
        }}
        onPointerMove={(e) => drag && onHeight(clampH(drag.h + drag.y - e.clientY))}
        onPointerUp={() => setDrag(null)}
        onPointerCancel={() => setDrag(null)}
        onKeyDown={(e) => {
          if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
          e.preventDefault();
          onHeight(clampH(height + (e.key === "ArrowUp" ? 48 : -48)));
        }}
        className="flex h-6 w-full shrink-0 cursor-ns-resize touch-none items-center justify-center"
      >
        <span className="h-1.5 w-10 rounded-full bg-border" />
      </button>
      <div className="flex items-center gap-2 px-4 pb-2">
        <h2 className="mr-auto truncate font-semibold">{title}</h2>
        {actions}
        <button type="button" onClick={onClose} aria-label="Fermer" className="grid h-9 w-9 place-items-center rounded-full press hover:bg-surface-2">
          <Icon name="x" size={18} />
        </button>
      </div>
      {children}
    </div>,
    document.body,
  );
}

/** A lighter or darker neighbour, as the gradient's first second colour. */
function shiftColor(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  const to = lum > 128 ? 0 : 255;
  const mix = (c: number) => Math.round(c + (to - c) * 0.3);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(mix);
  return "#" + rgb.map((c) => c.toString(16).padStart(2, "0")).join("");
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-sm text-text">{label}</span>
      {children}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={"relative h-7 w-12 rounded-full border border-border transition " + (on ? "bg-primary" : "bg-bg-2")}
    >
      <span className={"absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all " + (on ? "left-6" : "left-0.5")} />
    </button>
  );
}

/** A colour: quick swatches, the picker for any other, and back to the default. */
function ColorRow({ label, value, fallback, onChange }: { label: string; value?: string; fallback?: string; onChange: (v: string | undefined) => void }) {
  const current = value ?? fallback;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-text">{label}</span>
        <span className="flex items-center gap-2">
          {!value && <span className="text-xs text-text-muted">{fallback ? "hérité" : "par défaut"}</span>}
          {value && (
            <button type="button" onClick={() => onChange(undefined)} className="text-xs text-text-muted underline-offset-2 hover:underline">
              ↺ défaut
            </button>
          )}
          <label className="relative h-8 w-12 cursor-pointer overflow-hidden rounded-token-sm border border-border" style={{ background: current ?? "transparent" }} title="Autre couleur">
            {!current && <span className="grid h-full place-items-center text-xs text-text-muted">+</span>}
            <input type="color" value={current ?? "#ffffff"} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label={`${label} : autre couleur`} />
          </label>
        </span>
      </div>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 no-scrollbar">
        {SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`${label} ${c}`}
            aria-pressed={value === c}
            onClick={() => onChange(c)}
            className={"h-7 w-7 shrink-0 rounded-full border press " + (value === c ? "border-primary ring-2 ring-primary" : "border-border")}
            style={{ background: c }}
          />
        ))}
      </div>
    </div>
  );
}

/** Closed choices, plus "Par défaut" (unset). */
function Choice<T extends string>({ label, value, options, onChange }: { label: string; value?: T; options: [T, string][]; onChange: (v: T | undefined) => void }) {
  return (
    <div className="flex flex-col gap-1.5" role="group" aria-label={label}>
      <span className="text-sm text-text">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {[[undefined, "Par défaut"] as [T | undefined, string], ...options].map(([id, text]) => (
          <button
            key={text}
            type="button"
            aria-pressed={value === id}
            onClick={() => onChange(id)}
            className={"chip press text-sm " + (value === id ? "border-primary bg-surface-2 font-semibold text-primary" : "text-text-muted hover:border-primary/50")}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

export function FontRow({ label = "Police", value, defaultLabel = "Par défaut", onChange }: { label?: string; value?: FontKey | null; defaultLabel?: string; onChange: (f: FontKey | undefined) => void }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-text">{label}</span>
      <select value={value ?? ""} onChange={(e) => onChange((e.target.value || undefined) as FontKey | undefined)} className={selectClass}>
        <option value="">{defaultLabel}</option>
        {FONT_GROUPS.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.keys
              .filter((k) => k !== "app")
              .map((key) => (
                <option key={key} value={key} style={{ fontFamily: FONTS[key].stack ?? undefined }}>
                  {FONTS[key].label}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}
