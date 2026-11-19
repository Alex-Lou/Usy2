import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { FramingEditor } from "../../components/photo/FramingEditor";
import { Button } from "../../components/ui/Button";
import { Icon, type IconName } from "../../components/ui/Icon";
import { uploadImage } from "../../lib/api/assets";
import { ApiError } from "../../lib/api/client";
import type { Framing } from "../../lib/framing";
import { useAuth } from "../auth/useAuth";
import { getMyProfile, updateMyProfile } from "./api";
import { emitMyThemeSaved } from "./AppFonts";
import { DangerZone } from "./DangerZone";
import { ExportSetting } from "./ExportSetting";
import { GlassSetting } from "./GlassSetting";
import { NewsSetting } from "./NewsSetting";
import { compact, partsOf, PRESETS, type Parts } from "./partStyle";
import { ProfileBody } from "./ProfileBody";
import { GAPS, MAX_CELLS, widthOf } from "./ProfileGrid";
import { FontRow, StyleControls } from "./StyleControls";
import { withFontChoice } from "./theme";
import type { PartKey, PartStyle, Profile, Theme, Widget, WidgetType } from "./types";
import { WIDGET_LABELS } from "./widgets/registry";
import { cleanWidget, defaultWidget, missingImage, WidgetEditor } from "./widgets/WidgetEditor";

// The profile banner on a phone (ProfileBody: full width × h-56), so the framing shows what the profile will.
const COVER_ASPECT = 1.6;

type Panel = "add" | "look" | "me";
const PANELS: { id: Panel; label: string }[] = [
  { id: "add", label: "Ajouter" },
  { id: "look", label: "Ambiance" },
  { id: "me", label: "Moi" },
];

/** The blocks one can add, in plain words, the most used first. */
const BLOCKS: { type: WidgetType; label: string; icon: IconName }[] = [
  { type: "image", label: "Photo", icon: "images" },
  { type: "richtext", label: "Texte", icon: "file" },
  { type: "quote", label: "Citation", icon: "chat" },
  { type: "pins", label: "Liens", icon: "paperclip" },
  { type: "countdown", label: "Rebours", icon: "calendar" },
  { type: "clock", label: "Horloge", icon: "clock" },
  { type: "mood", label: "Humeur", icon: "smile" },
  { type: "marquee", label: "Bandeau", icon: "menu" },
  { type: "svg", label: "Animation", icon: "sparkles" },
];

const PART_TARGETS: { id: PartKey; label: string }[] = [
  { id: "page", label: "Fond et texte" },
  { id: "header", label: "Présentation" },
  { id: "widgets", label: "Tous les blocs" },
];

interface Draft {
  theme: Theme;
  widgets: Widget[];
  avatarAssetId: number | null;
  coverAssetId: number | null;
  avatarFraming: Framing | null;
  coverFraming: Framing | null;
  bio: string;
}

function draftOf(p: Profile): Draft {
  return {
    theme: { ...withFontChoice(p.theme), parts: partsOf(p.theme) },
    widgets: p.widgets,
    avatarAssetId: p.avatarAssetId ?? null,
    coverAssetId: p.coverAssetId ?? null,
    avatarFraming: p.avatarFraming ?? null,
    coverFraming: p.coverFraming ?? null,
    bio: p.bio ?? "",
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * ✏️ "Mon profil", edited in place: the profile itself (touch the cover or the
 * photo, write the bio, move a block by its handle, grow it by its corner,
 * touch it to change it), and one panel with three choices: Ajouter,
 * Ambiance, Moi. The fine settings are still there, folded away. One draft,
 * saved with one button.
 */
export function MyProfilePage() {
  const { user, refreshUser } = useAuth();
  const [base, setBase] = useState<Profile | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [panel, setPanel] = useState<Panel>("add");
  const [selected, setSelected] = useState<number | null>(null);
  const [photo, setPhoto] = useState<"avatar" | "cover" | null>(null); // its actions in the panel
  const [framing, setFraming] = useState<"avatar" | "cover" | null>(null); // the framing editor open
  const [open, setOpen] = useState(false); // the panel on a phone (folded = only its three choices)

  // On a phone the panel covers the bottom: the block being changed comes up above it.
  useEffect(() => {
    if (selected === null || window.matchMedia("(min-width: 1536px)").matches) return;
    const frame = requestAnimationFrame(() => document.querySelector(`[data-cell="${selected}"]`)?.scrollIntoView({ block: "start", behavior: "smooth" }));
    return () => cancelAnimationFrame(frame);
  }, [selected]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedOnce, setSavedOnce] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    getMyProfile()
      .then((p) => {
        if (cancelled) return;
        setBase(p);
        setDraft(draftOf(p));
      })
      .catch(() => !cancelled && setError("Impossible de charger le profil."));
    return () => {
      cancelled = true;
    };
  }, []);

  // Every change goes through here: the draft moves on, and "Enregistrer" lights up.
  const update = (change: (d: Draft) => Draft) => {
    setDraft((d) => d && change(d));
    setDirty(true);
    setSavedOnce(false);
  };
  const edit = (patch: Partial<Draft>) => update((d) => ({ ...d, ...patch }));
  const setTheme = (patch: Partial<Theme>) => update((d) => ({ ...d, theme: { ...d.theme, ...patch } }));
  const setPart = (part: PartKey, s: PartStyle | undefined) =>
    update((d) => ({ ...d, theme: { ...d.theme, parts: { ...d.theme.parts, [part]: s } } }));
  const setWidgets = (change: (list: Widget[]) => Widget[]) => update((d) => ({ ...d, widgets: change(d.widgets) }));
  const patchWidget = (index: number, p: Partial<Widget>) => setWidgets((list) => list.map((w, i) => (i === index ? ({ ...w, ...p } as Widget) : w)));

  function choose(next: { selected?: number | null; photo?: "avatar" | "cover" | null }) {
    setSelected(next.selected ?? null);
    setPhoto(next.photo ?? null);
    setOpen(next.selected != null || next.photo != null); // « Terminé » folds the panel away again
  }

  /** Sends a photo, then puts it where it goes. */
  async function upload(file: File, apply: (assetId: number) => void) {
    setError(null);
    try {
      apply((await uploadImage(file)).id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Envoi de la photo impossible.");
    }
  }

  function uploadPhoto(file: File, which: "avatar" | "cover") {
    void upload(file, (id) => {
      if (which === "avatar") edit({ avatarAssetId: id, avatarFraming: null });
      else edit({ coverAssetId: id, coverFraming: null });
      setFraming(which); // a new photo: choose its part right away
    });
  }

  function add(type: WidgetType) {
    if (type === "image") {
      imageInput.current?.click(); // the photo first: a Photo block always has one
      return;
    }
    const index = draft?.widgets.length ?? 0;
    setWidgets((list) => [...list, defaultWidget(type)]);
    choose({ selected: index });
  }

  async function save() {
    if (!draft) return;
    if (missingImage(draft.widgets)) {
      setError("Un bloc Photo n'a pas encore d'image : ajoute-la ou supprime le bloc.");
      choose({ selected: draft.widgets.findIndex((w) => w.type === "image" && (!w.assetId || w.assetId <= 0)) });
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const parts = Object.fromEntries(
        Object.entries(draft.theme.parts ?? {}).flatMap(([k, v]) => (compact(v) ? [[k, compact(v)]] : [])),
      ) as Parts;
      const saved = await updateMyProfile(
        { ...draft.theme, mode: "app", parts }, // the old custom colours now live in the parts
        draft.widgets.map((w) => ({ ...cleanWidget(w), style: compact(w.style) })),
        draft.avatarAssetId,
        draft.bio.trim() || null,
        draft.coverAssetId,
        draft.avatarFraming,
        draft.coverFraming,
      );
      setBase(saved);
      setDraft(draftOf(saved));
      setDirty(false);
      setSavedOnce(true);
      emitMyThemeSaved(saved.theme); // "Toute l'app" fonts change right away
      await refreshUser(); // header/avatar reflect the new photo
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  if (!draft || !base) return <div className="p-8 text-text-muted">{error ?? "Chargement…"}</div>;

  const preview: Profile = {
    ...base,
    theme: draft.theme,
    widgets: draft.widgets,
    avatarAssetId: draft.avatarAssetId,
    coverAssetId: draft.coverAssetId,
    avatarFraming: draft.avatarFraming,
    coverFraming: draft.coverFraming,
    bio: draft.bio.trim() || null,
  };
  const block = selected !== null ? draft.widgets[selected] : undefined;

  return (
    <div className={"flex flex-col gap-4 2xl:pb-0 " + (open ? "pb-[52dvh]" : "pb-24")}>
      {/* The bar: back to my profile, then cancel / save. */}
      <div className="sticky top-[var(--topbar-h)] z-20 -mx-1 flex items-center gap-2 rounded-token border border-border bg-surface/95 px-2 py-2 shadow-card backdrop-blur lg:top-[calc(var(--desk-topbar-h)+0.75rem)]">
        <Link to={`/profile/${base.userId}`} className="grid h-9 w-9 place-items-center rounded-full text-text-muted press hover:text-text" aria-label="Retour à mon profil">
          <Icon name="chevronLeft" size={20} />
        </Link>
        <h1 className="min-w-0 flex-1 truncate font-semibold">Modifier</h1>
        {dirty ? (
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setDraft(draftOf(base));
                setDirty(false);
                choose({});
              }}
              className="!px-3 !py-1.5 text-sm"
            >
              Annuler
            </Button>
            <Button onClick={save} disabled={saving} className="!px-4 !py-1.5 text-sm">{saving ? "…" : "Enregistrer"}</Button>
          </>
        ) : savedOnce ? (
          <Link to={`/profile/${base.userId}`} className="chip press text-sm font-semibold text-primary">Enregistré ✓ · Voir</Link>
        ) : (
          <span className="hidden px-2 text-xs sm:inline text-text-muted">Rien n'est visible avant « Enregistrer »</span>
        )}
      </div>

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_22rem] 2xl:items-start">
        <ProfileBody
          profile={preview}
          theme={draft.theme}
          widgets={draft.widgets}
          handle={`@${user?.username ?? ""}`}
          own
          backdrop="inline"
          editing={{
            bio: draft.bio,
            onBio: (bio) => edit({ bio }),
            onPhoto: (which) => choose({ photo: which }),
            grid: {
              selected,
              onSelect: (i) => choose({ selected: i }),
              onMove: (from, to) => {
                setWidgets((list) => {
                  const next = [...list];
                  const [moved] = next.splice(from, 1);
                  next.splice(to, 0, moved);
                  return next;
                });
                setSelected(to);
              },
              onResize: (i, size) => patchWidget(i, { w: size.w, h: size.h }),
            },
          }}
        />

        {/* The panel: a sheet at the bottom on a phone, a column on a computer. */}
        <aside
          aria-label="Modifier"
          className="fixed inset-x-0 lg:left-1/2 lg:right-auto lg:bottom-3 lg:w-[38rem] lg:-translate-x-1/2 lg:rounded-2xl lg:border 2xl:translate-x-0 2xl:w-auto bottom-[var(--tabbar-h)] mc-opaque z-30 max-h-[50dvh] overflow-y-auto rounded-t-2xl border-t border-border bg-surface p-2.5 shadow-card 2xl:sticky 2xl:inset-auto 2xl:top-[calc(var(--desk-topbar-h)+5rem)] 2xl:max-h-[calc(100dvh-var(--desk-topbar-h)-6rem)] 2xl:rounded-token 2xl:border"
        >
          {open && (
            <button type="button" onClick={() => setOpen(false)} className="mx-auto -mt-1 mb-1.5 block py-1.5 2xl:hidden" aria-label="Replier">
              <span className="block h-1.5 w-10 rounded-full bg-border" />
            </button>
          )}

          {photo ? (
            <PhotoPanel
              which={photo}
              hasPhoto={photo === "avatar" ? !!draft.avatarAssetId : !!draft.coverAssetId}
              onUpload={(f) => uploadPhoto(f, photo)}
              onFrame={() => setFraming(photo)}
              onRemove={() => edit(photo === "avatar" ? { avatarAssetId: null } : { coverAssetId: null })}
              onClose={() => choose({})}
            />
          ) : block && selected !== null ? (
            <BlockPanel
              key={selected}
              widget={block}
              inherited={draft.theme.parts?.widgets}
              onPatch={(p) => patchWidget(selected, p)}
              onUpload={(f) => void upload(f, (id) => patchWidget(selected, { assetId: id }))}
              onRemove={() => {
                setWidgets((list) => list.filter((_, i) => i !== selected));
                choose({});
              }}
              onClose={() => choose({})}
            />
          ) : (
            <>
              <div className={"flex rounded-token bg-bg-2 p-1 2xl:mb-3 " + (open ? "mb-3" : "")} role="tablist" aria-label="Modifier">
                {PANELS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="tab"
                    aria-selected={panel === p.id}
                    onClick={() => {
                      // On a phone, the open choice again folds the panel away.
                      setOpen(!(open && panel === p.id));
                      setPanel(p.id);
                    }}
                    className={
                      "flex-1 rounded-token-sm py-2 text-sm font-semibold transition press " +
                      (panel === p.id && open ? "bg-surface-2 text-text shadow-card" : panel === p.id ? "text-text 2xl:bg-surface-2 2xl:shadow-card" : "text-text-muted hover:text-text")
                    }
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className={open ? "" : "hidden 2xl:block"}>
                {panel === "add" && (
                  <>
                    <div className="-mx-2.5 flex gap-2 overflow-x-auto px-2.5 pb-1 2xl:mx-0 2xl:grid 2xl:grid-cols-3 2xl:overflow-visible 2xl:px-0">
                      {BLOCKS.map((b) => (
                        <button key={b.type} type="button" onClick={() => add(b.type)} className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1 rounded-token bg-surface-2 px-1 py-2.5 text-xs font-semibold press hover:text-primary 2xl:w-auto">
                          <Icon name={b.icon} size={20} className="text-primary" />
                          {b.label}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-text-muted">Sur ton profil : la poignée d'un bloc le déplace, son coin l'agrandit, un toucher le modifie.</p>
                  </>
                )}

                {panel === "look" && (
                  <LookPanel
                    theme={draft.theme}
                    onTheme={setTheme}
                    onPart={setPart}
                    onBackgroundPhoto={(f) =>
                      void upload(f, (id) => setPart("page", { ...draft.theme.parts?.page, photoAssetId: id, veil: draft.theme.parts?.page?.veil ?? 40 }))
                    }
                  />
                )}

                {panel === "me" && (
                  <div className="flex flex-col gap-4">
                    <GlassSetting />
                    <NewsSetting />
                    <Link to="/profile/barre" className="card flex items-center justify-between p-4 text-sm font-semibold press hover:border-primary/50">
                      Ma barre latérale
                      <Icon name="chevronDown" size={16} className="-rotate-90 text-text-muted" />
                    </Link>
                    <ExportSetting />
                    <DangerZone />
                  </div>
                )}
              </div>
            </>
          )}
        </aside>
      </div>

      <input
        ref={imageInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          const index = draft.widgets.length;
          void upload(file, (id) => {
            setWidgets((list) => [...list, { type: "image", assetId: id, label: "" }]);
            choose({ selected: index });
          });
        }}
      />

      {framing === "avatar" && draft.avatarAssetId && (
        <FramingEditor
          assetId={draft.avatarAssetId}
          aspect={1}
          round
          initial={draft.avatarFraming}
          title="Cadrer ta photo de profil"
          onCancel={() => setFraming(null)}
          onSave={(f) => {
            edit({ avatarFraming: f });
            setFraming(null);
          }}
        />
      )}
      {framing === "cover" && draft.coverAssetId && (
        <FramingEditor
          assetId={draft.coverAssetId}
          aspect={COVER_ASPECT}
          minZoom={1} // the banner is always filled: no blurred edges
          initial={draft.coverFraming}
          title="Cadrer ta couverture"
          onCancel={() => setFraming(null)}
          onSave={(f) => {
            edit({ coverFraming: f });
            setFraming(null);
          }}
        />
      )}
    </div>
  );
}

/** A panel's title line, with « Terminé » to go back to the three choices. */
function PanelHead({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="font-semibold">{title}</h2>
      <button type="button" onClick={onClose} className="rounded-full bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground press">Terminé</button>
    </div>
  );
}

/** The cover or my photo: change, frame, remove. */
function PhotoPanel({ which, hasPhoto, onUpload, onFrame, onRemove, onClose }: {
  which: "avatar" | "cover";
  hasPhoto: boolean;
  onUpload: (file: File) => void;
  onFrame: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <PanelHead title={which === "avatar" ? "Ma photo" : "Ma couverture"} onClose={onClose} />
      <div className="flex flex-col gap-2">
        <label className="flex cursor-pointer items-center gap-3 rounded-token bg-surface-2 px-3 py-2.5 text-sm font-semibold press">
          <Icon name="camera" size={18} className="text-primary" /> {hasPhoto ? "Changer" : "Choisir une photo"}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
        </label>
        {hasPhoto && (
          <>
            <button type="button" onClick={onFrame} className="flex items-center gap-3 rounded-token bg-surface-2 px-3 py-2.5 text-left text-sm font-semibold press">
              <Icon name="sliders" size={18} className="text-primary" /> Recadrer
            </button>
            <button type="button" onClick={onRemove} className="flex items-center gap-3 rounded-token px-3 py-2.5 text-left text-sm font-semibold text-danger press">
              <Icon name="trash" size={18} /> Retirer
            </button>
          </>
        )}
      </div>
    </>
  );
}

/** One block: its content, its size, its look (folded), and removing it. */
function BlockPanel({ widget, inherited, onPatch, onUpload, onRemove, onClose }: {
  widget: Widget;
  inherited: PartStyle | undefined;
  onPatch: (patch: Partial<Widget>) => void;
  onUpload: (file: File) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const width = widthOf(widget);
  const height = widget.h;
  const step = "grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-sm font-bold press disabled:opacity-30";
  return (
    <>
      <PanelHead title={WIDGET_LABELS[widget.type]} onClose={onClose} />
      <div className="flex flex-col gap-4">
        <WidgetEditor widget={widget} onPatch={onPatch} onUpload={onUpload} />

        <div className="flex flex-col gap-2 text-sm">
          <Row label="Largeur">
            <button type="button" className={step} onClick={() => onPatch({ w: clamp(width - 1, 1, MAX_CELLS) })} disabled={width <= 1} aria-label="Moins large">−</button>
            <span className="w-10 text-center tabular-nums">{width}/{MAX_CELLS}</span>
            <button type="button" className={step} onClick={() => onPatch({ w: clamp(width + 1, 1, MAX_CELLS) })} disabled={width >= MAX_CELLS} aria-label="Plus large">+</button>
          </Row>
          <Row label="Hauteur">
            <button type="button" className={step} onClick={() => onPatch({ h: height && height > 1 ? height - 1 : undefined })} disabled={height === undefined} aria-label="Moins haut">−</button>
            <span className="w-10 text-center tabular-nums">{height ?? "auto"}</span>
            <button type="button" className={step} onClick={() => onPatch({ h: clamp((height ?? 0) + 1, 1, MAX_CELLS) })} disabled={(height ?? 0) >= MAX_CELLS} aria-label="Plus haut">+</button>
          </Row>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={!!widget.sidebar} onChange={(e) => onPatch({ sidebar: e.target.checked || undefined })} className="h-4 w-4 accent-[var(--color-primary)]" />
          Aussi dans la barre latérale <span className="text-xs text-text-muted">(visible par vous deux)</span>
        </label>

        <details className="group">
          <summary className="cursor-pointer list-none text-sm font-semibold text-text-muted hover:text-text">
            <span className="group-open:hidden">Plus d'options ▸</span>
            <span className="hidden group-open:inline">Moins d'options ▾</span>
          </summary>
          <div className="mt-3">
            <StyleControls
              title="L'allure de ce bloc"
              value={widget.style ?? {}}
              inherited={inherited}
              onChange={(s) => onPatch({ style: s })}
              onReset={() => onPatch({ style: undefined })}
            />
          </div>
        </details>

        <button type="button" onClick={onRemove} className="flex items-center justify-center gap-2 rounded-token py-2 text-sm font-semibold text-danger press">
          <Icon name="trash" size={16} /> Supprimer ce bloc
        </button>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-muted">{label}</span>
      <span className="flex items-center gap-1">{children}</span>
    </div>
  );
}

/** The look: a ready-made theme, a photo behind, the spacing; the fine settings folded. */
function LookPanel({ theme, onTheme, onPart, onBackgroundPhoto }: {
  theme: Theme;
  onTheme: (patch: Partial<Theme>) => void;
  onPart: (part: PartKey, s: PartStyle | undefined) => void;
  onBackgroundPhoto: (file: File) => void;
}) {
  const [target, setTarget] = useState<PartKey>("page");
  const page = theme.parts?.page;
  const gap = theme.widgetGap ?? "m";
  return (
    <div className="flex flex-col gap-4">
      <section>
        <h3 className="mb-2 text-xs font-semibold text-text-muted">Thème</h3>
        <div className="flex flex-wrap gap-2">
          <Swatch label="Celui de l'app" background="var(--app-bg)" onClick={() => onTheme({ parts: { page: page?.photoAssetId ? { photoAssetId: page.photoAssetId, veil: page.veil } : undefined } })} />
          {PRESETS.map((p) => (
            <Swatch
              key={p.id}
              label={p.label}
              background={p.swatch}
              onClick={() => onTheme({ parts: { ...p.parts, page: { ...p.parts.page, photoAssetId: page?.photoAssetId, veil: page?.veil } } })}
            />
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold text-text-muted">Photo de fond</h3>
        <div className="flex flex-wrap gap-2">
          <label className="chip cursor-pointer press hover:border-primary/50">
            <Icon name="images" size={14} /> {page?.photoAssetId ? "Changer" : "Choisir une photo"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onBackgroundPhoto(e.target.files[0])} />
          </label>
          {page?.photoAssetId && (
            <button type="button" onClick={() => onPart("page", { ...page, photoAssetId: undefined, veil: undefined })} className="chip press text-danger">
              Retirer
            </button>
          )}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold text-text-muted">Espace entre les blocs</h3>
        <div className="flex rounded-token bg-bg-2 p-1" role="group" aria-label="Espace entre les blocs">
          {GAPS.map((g) => (
            <button
              key={g.id}
              type="button"
              aria-pressed={gap === g.id}
              onClick={() => onTheme({ widgetGap: g.id === "m" ? null : g.id })}
              className={"flex-1 rounded-token-sm py-1.5 text-sm font-semibold press " + (gap === g.id ? "bg-surface-2 text-text shadow-card" : "text-text-muted")}
            >
              {g.label}
            </button>
          ))}
        </div>
      </section>

      <details className="group">
        <summary className="cursor-pointer list-none text-sm font-semibold text-text-muted hover:text-text">
          <span className="group-open:hidden">Plus d'options ▸</span>
          <span className="hidden group-open:inline">Moins d'options ▾</span>
        </summary>
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Partie à régler">
            {PART_TARGETS.map((t) => (
              <button key={t.id} type="button" aria-pressed={target === t.id} onClick={() => setTarget(t.id)} className={"chip press text-xs " + (target === t.id ? "border-primary text-primary" : "text-text-muted")}>
                {t.label}
              </button>
            ))}
          </div>
          <StyleControls
            key={target}
            title={PART_TARGETS.find((p) => p.id === target)!.label}
            page={target === "page"}
            value={theme.parts?.[target] ?? {}}
            onChange={(s) => onPart(target, s)}
            onReset={() => onPart(target, undefined)}
            pageText={target === "page" ? <PageFonts theme={theme} onChange={onTheme} /> : undefined}
          />
        </div>
      </details>
    </div>
  );
}

function Swatch({ label, background, onClick }: { label: string; background: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} className="flex w-16 flex-col items-center gap-1 text-[11px] text-text-muted press">
      <span className="h-12 w-12 rounded-token border border-border" style={{ background }} />
      <span className="line-clamp-1 w-full text-center">{label}</span>
    </button>
  );
}

/** Plus d'options › Fond et texte: the profile's fonts, for the profile or the whole app (for me). */
function PageFonts({ theme, onChange }: { theme: Theme; onChange: (patch: Partial<Theme>) => void }) {
  const scope = theme.fontScope ?? "profile";
  const own = (key: Theme["font"] | null | undefined) => (key && key !== "app" ? key : undefined);
  return (
    <>
      <FontRow label="Police du texte" value={own(theme.font)} defaultLabel="Celle de l'app" onChange={(font) => onChange({ font: font ?? "app", fontScope: scope })} />
      <FontRow
        label="Police des titres"
        value={own(theme.headingFont)}
        defaultLabel="Comme le texte"
        onChange={(headingFont) => onChange({ headingFont: headingFont ?? "app", fontScope: scope })}
      />
      <div className="flex flex-col gap-1.5 text-sm" role="group" aria-label="Appliquer ces polices à">
        <span className="text-text">Appliquer ces polices à</span>
        <div className="flex items-center gap-1 rounded-full border border-border bg-bg-2/60 p-1">
          {(["profile", "app"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange({ fontScope: s })}
              aria-pressed={scope === s}
              className={"flex-1 rounded-full px-3 py-1.5 text-sm font-semibold transition press " + (scope === s ? "seg-on" : "text-text-muted hover:text-text")}
            >
              {s === "profile" ? "Mon profil" : "Toute l'app (pour moi)"}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
