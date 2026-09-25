import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { ApiError } from "../../lib/api/client";
import { useAuth } from "../auth/useAuth";
import { SpaceSwitcher } from "../profile/SpaceSwitcher";
import { getMyProfile, updateMyProfile } from "../profile/api";
import type { Widget } from "../profile/types";
import { isWideMini, MiniWidget } from "../profile/widgets/MiniWidget";
import { cleanWidget, missingImage, WidgetListEditor } from "../profile/widgets/WidgetEditor";
import { onCoupleActivity } from "./activity";
import { getSharedWidgets, saveSharedWidgets } from "./api";
import { copiesOfLinked } from "./linked";
import { arrange, linkedKey, saveSidebarPrefs, sidebarItems, useMySidebarPrefs, type SidebarItem } from "./sidebar";
import type { SharedWidgets } from "./types";

/**
 * "Ma barre latérale": everything the side menu shows, and my say on it.
 * - Mine only (every device): show the section or not, the order, hide any widget.
 * - The common widgets (both can edit): edit, delete, or empty them all.
 * - My profile's widgets: take them out of the menu (for both).
 * If the other person saves the common widgets meanwhile, nothing is
 * overwritten: this page says so and offers to reload.
 */
export function SharedWidgetsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const prefs = useMySidebarPrefs();
  const [saved, setSaved] = useState<SharedWidgets | null>(null); // what the menus show now
  const [widgets, setWidgets] = useState<Widget[] | null>(null); // the common widgets being edited
  const [version, setVersion] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changedBy, setChangedBy] = useState<string | null>(null); // the other person saved meanwhile
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;

  const apply = useCallback((s: SharedWidgets) => {
    setSaved(s);
    setWidgets(s.widgets);
    setVersion(s.version);
    setDirty(false);
    setChangedBy(null);
  }, []);

  const load = useCallback(() => {
    getSharedWidgets()
      .then(apply)
      .catch(() => setError("Chargement impossible."));
  }, [apply]);

  useEffect(() => {
    load();
    return onCoupleActivity((a) => {
      if (a.kind !== "widgets") return;
      if (a.actorId === user?.id || !dirtyRef.current) {
        // Keep what is being typed in the editor; refresh the rest.
        getSharedWidgets()
          .then((s) => (dirtyRef.current ? setSaved(s) : apply(s)))
          .catch(() => {});
        return;
      }
      setChangedBy(a.actorName);
    });
  }, [load, apply, user?.id]);

  const items = saved ? sidebarItems(saved, user?.id) : [];
  const { shown, hidden } = arrange(items, prefs ?? {});
  const isCopy = copiesOfLinked(saved?.linked ?? []);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setChangedBy((who) => who ?? "L'autre");
      else setError(err instanceof ApiError ? err.message : "Action impossible, réessaie.");
    } finally {
      setBusy(false);
    }
  }

  // — My own menu —
  const savePrefs = (patch: { hidden?: string[]; order?: string[]; off?: boolean }) =>
    run(() => saveSidebarPrefs({ ...prefs, ...patch }, items));

  function move(key: string, by: -1 | 1) {
    const keys = shown.map((it) => it.key);
    const i = keys.indexOf(key);
    const j = i + by;
    if (i < 0 || j < 0 || j >= keys.length) return;
    [keys[i], keys[j]] = [keys[j], keys[i]];
    void savePrefs({ order: [...keys, ...hidden.map((it) => it.key)] });
  }

  const hide = (key: string) => savePrefs({ hidden: [...(prefs?.hidden ?? []), key] });
  const unhide = (key: string) => savePrefs({ hidden: (prefs?.hidden ?? []).filter((k) => k !== key) });

  // — The common widgets (for both) —
  function saveCommon(next: Widget[]) {
    return run(async () => apply(await saveSharedWidgets(next, version)));
  }

  function deleteCommon(item: SidebarItem) {
    if (!saved || item.index === undefined) return;
    if (dirty) {
      setError("Enregistre d'abord tes modifications des widgets communs (plus bas).");
      return;
    }
    if (!window.confirm("Supprimer ce widget commun ? Il disparaîtra aussi de la barre de ton binôme.")) return;
    void saveCommon(saved.widgets.filter((_, i) => i !== item.index));
  }

  function emptyCommon() {
    if (!saved || saved.widgets.length === 0) return;
    if (dirty) {
      setError("Enregistre ou annule d'abord tes modifications des widgets communs.");
      return;
    }
    if (!window.confirm(`Supprimer les ${saved.widgets.length} widgets communs ? Pour vous deux, sans retour.`)) return;
    void saveCommon([]);
  }

  // — My profile's widgets —
  function removeMine(item: SidebarItem) {
    const myId = user?.id;
    if (myId == null) return;
    void run(async () => {
      const p = await getMyProfile();
      const next = p.widgets.map((w) => (w.sidebar && linkedKey(myId, w) === item.key ? { ...w, sidebar: undefined } : w));
      await updateMyProfile(p.theme, next, p.avatarAssetId ?? null, p.bio ?? null, p.coverAssetId ?? null, p.avatarFraming ?? null, p.coverFraming ?? null);
      apply(await getSharedWidgets());
    });
  }

  async function save() {
    if (!widgets) return;
    if (missingImage(widgets)) {
      setError("Un widget Image n'a pas encore de photo. Ajoute une image ou supprime le widget.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      apply(await saveSharedWidgets(widgets.map(cleanWidget), version));
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setChangedBy((who) => who ?? "L'autre");
      else setError(err instanceof ApiError ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  const source = (it: SidebarItem) => (it.source === "common" ? "Commun · vous deux" : it.source === "mine" ? "De mon profil" : `De ${it.ownerName}`);
  const small = "chip press text-xs disabled:opacity-40";
  const off = !!prefs?.off;

  return (
    <div className="flex flex-col gap-4">
    <SpaceSwitcher />
    <div className="grid gap-6 lg:grid-cols-[1fr_16rem]">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Ma barre latérale</h1>
          <p className="text-sm text-text-muted">Tout ce qui s'y affiche, et comment. L'ordre, les widgets masqués et l'affichage ne changent que chez toi.</p>
        </div>

        {changedBy && (
          <div role="status" className="flex flex-wrap items-center gap-2 rounded-token border border-primary/40 bg-primary/10 p-3 text-sm">
            <span>{changedBy} vient de modifier les widgets communs.</span>
            <button type="button" onClick={load} className="chip press hover:border-primary/50">Voir sa version</button>
            <span className="text-xs text-text-muted">(tes changements non enregistrés seront perdus)</span>
          </div>
        )}
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}

        <section className="card flex items-center justify-between gap-3 p-4" aria-label="Affichage">
          <div>
            <h2 className="font-semibold">Afficher les widgets dans ma barre</h2>
            <p className="text-xs text-text-muted">Coupé : la section « Nos petits widgets » disparaît de ta barre (et du menu sur téléphone).</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={!off}
            aria-label="Afficher les widgets dans ma barre"
            disabled={busy || prefs === null}
            onClick={() => void savePrefs({ off: !off })}
            className={"relative h-7 w-12 shrink-0 rounded-full border border-border transition disabled:opacity-50 " + (!off ? "bg-primary" : "bg-bg-2")}
          >
            <span className={"absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all " + (!off ? "left-6" : "left-0.5")} />
          </button>
        </section>

        <Section title={`Dans ma barre (${shown.length})`} hint="Monte, descends ou masque chaque widget. Supprimer un widget commun le retire pour vous deux.">
          {!saved ? (
            <div className="h-20 animate-pulse rounded-token bg-border/50" />
          ) : shown.length === 0 ? (
            <p className="text-sm text-text-muted">Rien dans ta barre pour l'instant.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {shown.map((it, i) => (
                <li key={`${it.key}-${i}`} className="flex flex-wrap items-center gap-2 rounded-token border border-border p-2" aria-label={`${source(it)}, position ${i + 1}`}>
                  <div className="w-28 shrink-0">
                    <MiniWidget widget={it.widget} />
                  </div>
                  <span className="min-w-0 flex-1 text-sm text-text-muted">{source(it)}</span>
                  <span className="flex flex-wrap gap-1">
                    <button type="button" className={small} disabled={busy || i === 0} onClick={() => move(it.key, -1)} aria-label="Monter">↑</button>
                    <button type="button" className={small} disabled={busy || i === shown.length - 1} onClick={() => move(it.key, 1)} aria-label="Descendre">↓</button>
                    <button type="button" className={small} disabled={busy} onClick={() => void hide(it.key)}>Masquer chez moi</button>
                    {it.source === "common" && (
                      <button type="button" className={small + " text-danger"} disabled={busy} onClick={() => deleteCommon(it)}>Supprimer</button>
                    )}
                    {it.source === "mine" && (
                      <button type="button" className={small + " text-danger"} disabled={busy} onClick={() => removeMine(it)}>Retirer de la barre</button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {hidden.length > 0 && (
          <Section title={`Masqués chez moi (${hidden.length})`} hint="Toujours là pour ton binôme ; tu peux les réafficher quand tu veux.">
            <ul className="flex flex-col gap-2">
              {hidden.map((it, i) => (
                <li key={`${it.key}-${i}`} className="flex items-center gap-2 rounded-token border border-dashed border-border p-2 opacity-80">
                  <div className="w-28 shrink-0">
                    <MiniWidget widget={it.widget} />
                  </div>
                  <span className="min-w-0 flex-1 text-sm text-text-muted">{source(it)}</span>
                  <button type="button" className={small} disabled={busy} onClick={() => void unhide(it.key)}>Réafficher</button>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section title="Widgets communs" hint="Les mêmes pour vous deux, et chacun peut les modifier. Pour ceux de ton profil : case « Aussi dans la barre latérale » sur la page Contenu.">
          {widgets ? (
            <WidgetListEditor
              widgets={widgets}
              onChange={(update) => {
                setWidgets((list) => update(list ?? []));
                setDirty(true);
              }}
              onError={setError}
              footer={(w) =>
                isCopy(cleanWidget(w)) && (
                  <p className="mt-2 text-xs text-primary">Doublon : ce widget est déjà montré depuis un profil. Tu peux le supprimer ici.</p>
                )
              }
            />
          ) : (
            <div className="h-24 animate-pulse rounded-token bg-border/50" />
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={save} disabled={saving || !dirty || !!changedBy}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
            {dirty && (
              <Button variant="ghost" onClick={() => saved && apply(saved)}>Annuler</Button>
            )}
            <Button variant="surface" onClick={emptyCommon} disabled={busy || !saved || saved.widgets.length === 0} className="ml-auto">
              <span className="text-danger">Tout vider</span>
            </Button>
          </div>
        </Section>

        <div>
          <Button variant="surface" onClick={() => navigate(-1)}>Retour</Button>
        </div>
      </div>

      <div className="lg:sticky lg:top-8 lg:self-start">
        <p className="mb-2 text-sm text-text-muted">Ma barre</p>
        <div className="card grid grid-cols-2 gap-2 p-3">
          {off ? (
            <p className="col-span-2 text-xs text-text-muted">Section masquée.</p>
          ) : shown.length > 0 ? (
            shown.map((it, i) => (
              <div key={`${it.key}-${i}`} className={`min-w-0 ${isWideMini(it.widget) ? "col-span-2" : ""}`}>
                <MiniWidget widget={it.widget} />
              </div>
            ))
          ) : (
            <p className="col-span-2 text-xs text-text-muted">Rien pour l'instant.</p>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section className="card flex flex-col gap-2 p-4" aria-label={title}>
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="text-xs text-text-muted">{hint}</p>
      </div>
      {children}
    </section>
  );
}
