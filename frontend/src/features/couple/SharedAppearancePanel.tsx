import { useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { ApiError } from "../../lib/api/client";
import { uploadImage } from "../../lib/api/assets";
import { FONT_GROUPS, FONTS, useFonts } from "../../lib/fonts";
import { READING_SIZES } from "../chat/reading";
import type { FontKey } from "../profile/types";
import { selectClass } from "../profile/widgets/WidgetEditor";
import { ACCENTS, BACKGROUNDS, saveAppearance, setAppearance, useSharedAppearance, type Appearance } from "./appearance";

function FontChoice({ label, value, defaultLabel, onChange }: { label: string; value: FontKey | null; defaultLabel: string; onChange: (f: FontKey | null) => void }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-text-muted">{label}</span>
      <select value={value ?? "app"} onChange={(e) => onChange(e.target.value === "app" ? null : (e.target.value as FontKey))} className={selectClass}>
        {FONT_GROUPS.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.keys.map((key) => (
              <option key={key} value={key}>
                {key === "app" ? defaultLabel : FONTS[key].label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

/**
 * "Pour vous deux": the shared look of the app (fonts, accent colour,
 * background, default font of the messages), editable by both. Each person's
 * own choices still win on their screens.
 */
export function SharedAppearancePanel() {
  const shared = useSharedAppearance();
  const [draft, setDraft] = useState<Appearance>(shared);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  // Follow the shared copy (e.g. the other person saved) unless I am editing.
  useEffect(() => {
    if (!dirty) setDraft(shared);
  }, [shared, dirty]);
  useFonts(draft.font, draft.headingFont, draft.chatFont);

  const edit = (patch: Partial<Appearance>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
    setMessage(null);
  };

  async function uploadBackground(file: File) {
    setBusy(true);
    try {
      const asset = await uploadImage(file);
      edit({ background: "photo", backgroundAssetId: asset.id });
    } catch (e) {
      setMessage({ ok: false, text: e instanceof ApiError ? e.message : "Envoi de la photo impossible." });
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    try {
      const saved = await saveAppearance(draft);
      setAppearance(saved);
      setDraft(saved);
      setDirty(false);
      setMessage({ ok: true, text: "Enregistré pour vous deux." });
    } catch (e) {
      setMessage({ ok: false, text: e instanceof ApiError ? e.message : "Enregistrement impossible." });
    } finally {
      setBusy(false);
    }
  }

  const swatch = "h-8 w-8 rounded-full border-2 press";
  return (
    <section className="card flex flex-col gap-4 border-primary/40 p-4" aria-label="Pour vous deux">
      <div>
        <h2 className="flex items-center gap-2 font-semibold"><Icon name="heart" size={18} /> Pour vous deux</h2>
        <p className="text-xs text-text-muted">
          L'apparence commune de l'app, modifiable par vous deux. Si l'un de vous choisit ses propres polices (« Toute l'app (pour moi) » plus bas, ou « Aa » dans Messages), les siennes passent avant, pour lui seul.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <FontChoice label="Police générale" value={draft.font} defaultLabel="Celle de l'app" onChange={(font) => edit({ font })} />
        <FontChoice label="Police des titres" value={draft.headingFont} defaultLabel="Comme la police générale" onChange={(headingFont) => edit({ headingFont })} />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-text-muted">Couleur principale</span>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Couleur principale">
          <button type="button" onClick={() => edit({ accent: null })} aria-pressed={draft.accent === null} className={"chip press text-xs " + (draft.accent === null ? "border-primary text-primary" : "")}>
            Celle de l'app
          </button>
          {ACCENTS.map((c) => (
            <button key={c} type="button" aria-label={`Couleur ${c}`} aria-pressed={draft.accent === c} onClick={() => edit({ accent: c })} className={swatch + (draft.accent === c ? " border-text" : " border-border")} style={{ background: c }} />
          ))}
          <label className="flex items-center gap-1 text-xs text-text-muted">
            autre
            <input type="color" value={draft.accent ?? "#ff3d9a"} onChange={(e) => edit({ accent: e.target.value })} className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent" aria-label="Autre couleur" />
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-text-muted">Fond d'écran</span>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Fond d'écran">
          <button type="button" onClick={() => edit({ background: null, backgroundAssetId: null })} aria-pressed={draft.background === null} className={"chip press text-xs " + (draft.background === null ? "border-primary text-primary" : "")}>
            Aurore (celui de l'app)
          </button>
          {BACKGROUNDS.map((b) => (
            <button
              key={b.id}
              type="button"
              aria-pressed={draft.background === b.id}
              onClick={() => edit({ background: b.id, backgroundAssetId: null })}
              className={"flex items-center gap-1.5 rounded-full border-2 py-0.5 pl-0.5 pr-2.5 text-xs press " + (draft.background === b.id ? "border-primary text-primary" : "border-border")}
            >
              <span className="h-6 w-6 rounded-full" style={{ background: b.css }} aria-hidden="true" />
              {b.label}
            </button>
          ))}
          <label className={"chip press cursor-pointer text-xs " + (draft.background === "photo" ? "border-primary text-primary" : "")}>
            <Icon name="camera" size={13} /> {draft.background === "photo" ? "Changer la photo" : "Une photo"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && void uploadBackground(e.target.files[0])} />
          </label>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <FontChoice label="Police des messages (par défaut)" value={draft.chatFont} defaultLabel="Celle de l'app" onChange={(chatFont) => edit({ chatFont })} />
        <div className="text-sm">
          <span className="mb-1 block text-text-muted">Taille des messages (par défaut)</span>
          <div className="grid grid-cols-4 gap-1" role="group" aria-label="Taille des messages">
            {READING_SIZES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => edit({ chatSize: s.id === "m" ? null : s.id })}
                aria-pressed={(draft.chatSize ?? "m") === s.id}
                title={s.label}
                className={"rounded-token border py-1.5 font-semibold press " + ((draft.chatSize ?? "m") === s.id ? "border-primary text-primary" : "border-border text-text-muted")}
                style={{ fontSize: s.px }}
              >
                A
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={save} disabled={!dirty || busy}>{busy ? "…" : "Enregistrer pour nous deux"}</Button>
        {dirty && (
          <Button type="button" variant="ghost" onClick={() => { setDraft(shared); setDirty(false); setMessage(null); }}>
            Annuler
          </Button>
        )}
        {message && <p role={message.ok ? "status" : "alert"} className={"text-sm " + (message.ok ? "text-text-muted" : "text-danger")}>{message.text}</p>}
      </div>
    </section>
  );
}
