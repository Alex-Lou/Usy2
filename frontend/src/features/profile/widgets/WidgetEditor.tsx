import type { ReactNode } from "react";
import { AssetImage } from "../../../components/AssetImage";
import { Icon } from "../../../components/ui/Icon";
import { Input } from "../../../components/ui/Input";
import { ApiError } from "../../../lib/api/client";
import { uploadImage } from "../../../lib/api/assets";
import type { Widget, WidgetType } from "../types";
import { PinsEditor } from "./PinsEditor";
import { normalizePinUrl } from "./pinSuggestions";
import { SVG_GROUPS, SVG_LABELS, WIDGET_LABELS } from "./registry";

/**
 * Editing a widget list: used by the profile editor (personal widgets) and by
 * "Nos widgets" (the side menu's shared widgets).
 */

export const WIDGET_TYPES: WidgetType[] = [
  "richtext", "quote", "marquee", "mood", "clock", "countdown", "calendar", "image", "svg", "pins",
];

export function defaultWidget(type: WidgetType): Widget {
  switch (type) {
    case "marquee":
      return { type: "marquee", text: "Bienvenue sur mon espace 💕" };
    case "quote":
      return { type: "quote", text: "Une citation" };
    case "richtext":
      return { type: "richtext", text: "**Coucou** mon amour 💕\nUn *petit* mot ici." };
    case "mood":
      return { type: "mood" };
    case "clock":
      return { type: "clock", label: "" };
    case "calendar":
      return { type: "calendar", label: "" };
    case "countdown":
      return { type: "countdown", date: "2026-12-25", label: "" };
    case "image":
      return { type: "image", assetId: 0, label: "" };
    case "svg":
      return { type: "svg", variant: "heart", label: "" };
    case "pins":
      return { type: "pins", label: "Accès rapides", pins: [{ label: "Pinterest", url: "https://www.pinterest.com" }] };
  }
}

export const selectClass =
  "w-full rounded-token border border-border bg-bg-2/60 px-3 py-2.5 text-text outline-none focus:border-primary/70";

export function cleanWidget(w: Widget): Widget {
  if (w.type !== "pins") return w;
  const pins = w.pins
    .map((p) => ({ url: normalizePinUrl(p.url), label: p.label?.trim() || undefined }))
    .filter((p) => p.url);
  return { ...w, label: w.label?.trim() || undefined, pins };
}

export function WidgetEditor({
  widget,
  onPatch,
  onUpload,
}: {
  widget: Widget;
  onPatch: (patch: Partial<Widget>) => void;
  onUpload: (file: File) => void;
}) {
  switch (widget.type) {
    case "marquee":
      return (
        <div>
          <Input value={widget.text} maxLength={280} onChange={(e) => onPatch({ text: e.target.value })} />
          <p className="mt-1 text-[11px] text-text-muted">Petit bandeau qui défile en haut de ton profil (mot de bienvenue, humeur du moment…).</p>
        </div>
      );
    case "quote":
      return <Input value={widget.text} maxLength={280} onChange={(e) => onPatch({ text: e.target.value })} />;
    case "richtext":
      return (
        <div>
          <textarea
            value={widget.text}
            maxLength={1000}
            rows={3}
            onChange={(e) => onPatch({ text: e.target.value })}
            className="w-full resize-none rounded-token border border-border bg-bg-2/60 px-3 py-2 text-text outline-none focus:border-primary/70"
          />
          <p className="mt-1 text-[11px] text-text-muted">**gras** · *italique* · [lien](https://…) · retours à la ligne</p>
        </div>
      );
    case "mood":
      return <p className="text-xs text-text-muted">Affiche ton humeur du moment. Elle se change en un geste depuis le bandeau « Nous » du fil.</p>;
    case "clock":
    case "calendar":
      return <Input value={widget.label ?? ""} maxLength={40} placeholder="titre (optionnel)" onChange={(e) => onPatch({ label: e.target.value })} />;
    case "countdown":
      return (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input type="date" value={widget.date} onChange={(e) => onPatch({ date: e.target.value })} className={selectClass + " sm:w-44"} />
          <Input value={widget.label ?? ""} maxLength={40} placeholder="titre (ex. Vacances)" onChange={(e) => onPatch({ label: e.target.value })} />
        </div>
      );
    case "image":
      return (
        <div className="flex flex-col gap-2">
          {widget.assetId > 0 ? (
            <AssetImage assetId={widget.assetId} className="max-h-40 w-full rounded-token object-cover" />
          ) : (
            <p className="text-xs text-text-muted">Aucune image choisie.</p>
          )}
          <div className="flex items-center gap-2">
            <label className="chip cursor-pointer press hover:border-primary/50">
              <Icon name="camera" size={14} /> {widget.assetId > 0 ? "Changer" : "Ajouter une image"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUpload(f);
                }}
              />
            </label>
          </div>
          <Input value={widget.label ?? ""} maxLength={40} placeholder="légende (optionnel)" onChange={(e) => onPatch({ label: e.target.value })} />
        </div>
      );
    case "svg":
      return (
        <div className="flex flex-col gap-2 sm:flex-row">
          <select value={widget.variant} onChange={(e) => onPatch({ variant: e.target.value })} className={selectClass + " sm:w-44"}>
            {SVG_GROUPS.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.items.map((v) => <option key={v} value={v}>{SVG_LABELS[v] ?? v}</option>)}
              </optgroup>
            ))}
          </select>
          <Input value={widget.label ?? ""} maxLength={40} placeholder="légende (optionnel)" onChange={(e) => onPatch({ label: e.target.value })} />
        </div>
      );
    case "pins":
      return <PinsEditor label={widget.label} pins={widget.pins} onChange={(p) => onPatch(p)} />;
  }
}

/**
 * A whole widget list: add buttons, then each widget with move / remove and its
 * fields. `onChange` takes an updater (like a state setter), so an image that
 * finishes uploading never undoes edits made meanwhile. `footer` adds
 * something under a widget (e.g. "Partager").
 */
export function WidgetListEditor({
  widgets,
  onChange,
  onError,
  footer,
}: {
  widgets: Widget[];
  onChange: (update: (list: Widget[]) => Widget[]) => void;
  onError: (message: string | null) => void;
  footer?: (widget: Widget, index: number) => ReactNode;
}) {
  function move(index: number, dir: -1 | 1) {
    onChange((list) => {
      const target = index + dir;
      if (target < 0 || target >= list.length) return list;
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function patch(index: number, p: Partial<Widget>) {
    onChange((list) => list.map((w, i) => (i === index ? ({ ...w, ...p } as Widget) : w)));
  }

  async function upload(index: number, file: File) {
    onError(null);
    try {
      const asset = await uploadImage(file);
      patch(index, { assetId: asset.id });
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Envoi de l'image impossible.");
    }
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap gap-1">
        {WIDGET_TYPES.map((t) => (
          <button key={t} type="button" onClick={() => onChange((list) => [...list, defaultWidget(t)])} className="chip press hover:border-primary/50">
            + {WIDGET_LABELS[t]}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {widgets.length === 0 && <p className="text-sm text-text-muted">Aucun widget. Ajoutes-en un ci-dessus.</p>}
        {widgets.map((w, i) => (
          <div key={i} className="rounded-token border border-border bg-bg-2/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">{WIDGET_LABELS[w.type]}</span>
              <div className="flex gap-1">
                <button type="button" onClick={() => move(i, -1)} aria-label="Monter" className="grid h-7 w-7 place-items-center rounded-token-sm border border-border press"><Icon name="arrowUp" size={14} /></button>
                <button type="button" onClick={() => move(i, 1)} aria-label="Descendre" className="grid h-7 w-7 place-items-center rounded-token-sm border border-border press"><Icon name="arrowDown" size={14} /></button>
                <button type="button" onClick={() => onChange((list) => list.filter((_, j) => j !== i))} aria-label="Supprimer" className="grid h-7 w-7 place-items-center rounded-token-sm text-danger press"><Icon name="x" size={14} /></button>
              </div>
            </div>
            <WidgetEditor widget={w} onPatch={(p) => patch(i, p)} onUpload={(f) => upload(i, f)} />
            {footer?.(w, i)}
          </div>
        ))}
      </div>
    </>
  );
}

/** An image widget saved without its photo would be refused by the server. */
export function missingImage(widgets: Widget[]): boolean {
  return widgets.some((w) => w.type === "image" && (!w.assetId || w.assetId <= 0));
}
