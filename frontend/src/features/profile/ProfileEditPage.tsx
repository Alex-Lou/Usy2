import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { Input } from "../../components/ui/Input";
import { ApiError } from "../../lib/api/client";
import { getMyProfile, updateMyProfile } from "./api";
import { buildThemeStyle, FONT_LABELS, LAYOUT_LABELS } from "./theme";
import type { FontKey, LayoutKey, Theme, ThemeColors, Widget } from "./types";
import { WidgetRenderer } from "./widgets/WidgetRenderer";

const COLOR_FIELDS: { key: keyof ThemeColors; label: string }[] = [
  { key: "bg", label: "Fond" },
  { key: "surface", label: "Cartes" },
  { key: "primary", label: "Accent" },
  { key: "text", label: "Texte" },
];

function defaultWidget(type: Widget["type"]): Widget {
  switch (type) {
    case "marquee":
      return { type: "marquee", text: "Nouveau texte défilant" };
    case "quote":
      return { type: "quote", text: "Une citation" };
    case "mood":
      return { type: "mood", emoji: "😀", label: "" };
  }
}

const selectClass =
  "w-full rounded-token border border-border bg-bg-2/60 px-3 py-2.5 text-text outline-none focus:border-primary/70";

export function ProfileEditPage() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState<Theme | null>(null);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMyProfile()
      .then((p) => {
        if (!cancelled) {
          setTheme(p.theme);
          setWidgets(p.widgets);
        }
      })
      .catch(() => !cancelled && setError("Impossible de charger le profil."));
    return () => {
      cancelled = true;
    };
  }, []);

  function setColor(key: keyof ThemeColors, value: string) {
    setTheme((t) => (t ? { ...t, colors: { ...t.colors, [key]: value } } : t));
  }

  function moveWidget(index: number, dir: -1 | 1) {
    setWidgets((list) => {
      const next = [...list];
      const target = index + dir;
      if (target < 0 || target >= next.length) return list;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function updateWidget(index: number, patch: Partial<Widget>) {
    setWidgets((list) => list.map((w, i) => (i === index ? ({ ...w, ...patch } as Widget) : w)));
  }

  async function handleSave() {
    if (!theme) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await updateMyProfile(theme, widgets);
      navigate(`/profile/${saved.userId}`, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  if (!theme) return <div className="p-8 text-text-muted">{error ?? "Chargement…"}</div>;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-2xl font-bold animate-fade-up">Personnaliser mon profil</h1>

        <section className="card p-4">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><Icon name="sparkles" size={18} /> Couleurs</h2>
          <div className="grid grid-cols-2 gap-3">
            {COLOR_FIELDS.map(({ key, label }) => (
              <label key={key} className="flex items-center justify-between gap-2 rounded-token-sm border border-border bg-bg-2/40 px-3 py-2 text-sm">
                <span>{label}</span>
                <input type="color" value={theme.colors[key]} onChange={(e) => setColor(key, e.target.value)} className="h-8 w-12 cursor-pointer rounded border border-border bg-transparent" />
              </label>
            ))}
          </div>
        </section>

        <section className="card p-4">
          <h2 className="mb-3 font-semibold">Style</h2>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-text-muted">Police</span>
              <select value={theme.font} onChange={(e) => setTheme({ ...theme, font: e.target.value as FontKey })} className={selectClass}>
                {(Object.keys(FONT_LABELS) as FontKey[]).map((f) => <option key={f} value={f}>{FONT_LABELS[f]}</option>)}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-text-muted">Disposition</span>
              <select value={theme.layout} onChange={(e) => setTheme({ ...theme, layout: e.target.value as LayoutKey })} className={selectClass}>
                {(Object.keys(LAYOUT_LABELS) as LayoutKey[]).map((l) => <option key={l} value={l}>{LAYOUT_LABELS[l]}</option>)}
              </select>
            </label>
          </div>
        </section>

        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Widgets</h2>
            <div className="flex flex-wrap gap-1">
              {(["marquee", "quote", "mood"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setWidgets([...widgets, defaultWidget(t)])} className="chip press hover:border-primary/50">
                  + {t === "marquee" ? "Défilant" : t === "quote" ? "Citation" : "Humeur"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {widgets.length === 0 && <p className="text-sm text-text-muted">Aucun widget. Ajoutes-en un ci-dessus.</p>}
            {widgets.map((w, i) => (
              <div key={i} className="rounded-token border border-border bg-bg-2/40 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">{w.type}</span>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => moveWidget(i, -1)} aria-label="Monter" className="grid h-7 w-7 place-items-center rounded-token-sm border border-border press"><Icon name="arrowUp" size={14} /></button>
                    <button type="button" onClick={() => moveWidget(i, 1)} aria-label="Descendre" className="grid h-7 w-7 place-items-center rounded-token-sm border border-border press"><Icon name="arrowDown" size={14} /></button>
                    <button type="button" onClick={() => setWidgets(widgets.filter((_, j) => j !== i))} aria-label="Supprimer" className="grid h-7 w-7 place-items-center rounded-token-sm text-danger press"><Icon name="x" size={14} /></button>
                  </div>
                </div>
                {(w.type === "marquee" || w.type === "quote") && (
                  <Input value={w.text} maxLength={280} onChange={(e) => updateWidget(i, { text: e.target.value })} />
                )}
                {w.type === "mood" && (
                  <div className="flex gap-2">
                    <Input value={w.emoji} maxLength={8} onChange={(e) => updateWidget(i, { emoji: e.target.value })} className="w-20 text-center" />
                    <Input value={w.label ?? ""} maxLength={40} placeholder="humeur (optionnel)" onChange={(e) => updateWidget(i, { label: e.target.value })} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {error && <p role="alert" className="text-sm text-danger">{error}</p>}

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
          <Button variant="surface" onClick={() => navigate(-1)}>Annuler</Button>
        </div>
      </div>

      <div className="lg:sticky lg:top-8 lg:self-start">
        <p className="mb-2 text-sm text-text-muted">Aperçu</p>
        <div style={buildThemeStyle(theme)} className="card bg-bg p-4 font-sans text-text">
          <div className="flex flex-col gap-3">
            {widgets.length === 0 ? (
              <p className="text-text-muted">L'aperçu apparaîtra ici.</p>
            ) : (
              widgets.map((w, i) => <WidgetRenderer key={i} widget={w} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
